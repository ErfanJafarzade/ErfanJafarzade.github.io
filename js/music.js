/**
 * Background chiptune, synthesised live with the Web Audio API (no audio files).
 * Starts on the first user gesture (browsers block autoplay) unless the visitor
 * muted it before. Exposes `music.blip()` for the level-change sound.
 */
const music = (() => {
  const BPM = 112;
  const STEP = 60 / BPM / 2; // one eighth note, in seconds
  const VOLUME = 0.12;
  const LOOKAHEAD = 0.25; // seconds scheduled ahead of the audio clock
  const STORAGE_KEY = "ej-music";
  const START_KEYS = ["ArrowRight", "ArrowLeft", "Enter", " "];
  const button = document.getElementById("music");

  // Lead melody as MIDI notes, 0 = rest. Eight bars of eight steps in A minor.
  const MELODY = [
    [69, 0, 72, 0, 76, 0, 72, 69], // Am
    [65, 0, 69, 0, 72, 0, 69, 65], // F
    [67, 0, 72, 0, 76, 0, 79, 76], // C
    [74, 0, 71, 0, 67, 0, 71, 74], // G
    [69, 72, 76, 0, 81, 0, 76, 72], // Am
    [77, 0, 72, 0, 69, 0, 72, 77], // F
    [74, 0, 79, 0, 74, 0, 71, 67], // G
    [76, 0, 80, 0, 83, 0, 80, 76], // E, leads back to Am
  ].flat();
  const BASS_ROOTS = [45, 41, 48, 43, 45, 41, 43, 40]; // one root per bar

  let ctx, master, noise, timer;
  let playing = false;
  let muted = false;
  let nextTime = 0;
  let step = 0;

  const midiToHz = (note) => 440 * 2 ** ((note - 69) / 12);

  function setup() {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return false;

    ctx = new AudioCtx();
    master = ctx.createGain();
    master.gain.value = 0;

    const softener = ctx.createBiquadFilter(); // takes the edge off the square waves
    softener.type = "lowpass";
    softener.frequency.value = 3200;
    master.connect(softener);
    softener.connect(ctx.destination);

    noise = ctx.createBuffer(1, ctx.sampleRate * 0.2, ctx.sampleRate);
    const samples = noise.getChannelData(0);
    for (let i = 0; i < samples.length; i++) samples[i] = Math.random() * 2 - 1;
    return true;
  }

  function fadeTo(volume, seconds) {
    const now = ctx.currentTime;
    master.gain.cancelScheduledValues(now);
    master.gain.setValueAtTime(master.gain.value, now);
    master.gain.linearRampToValueAtTime(volume, now + seconds);
  }

  function playTone(type, frequency, time, duration, volume) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = frequency;
    gain.gain.setValueAtTime(volume, time);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
    osc.connect(gain);
    gain.connect(master);
    osc.start(time);
    osc.stop(time + duration + 0.02);
  }

  function playKick(time) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.setValueAtTime(140, time);
    osc.frequency.exponentialRampToValueAtTime(40, time + 0.1);
    gain.gain.setValueAtTime(0.8, time);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.14);
    osc.connect(gain);
    gain.connect(master);
    osc.start(time);
    osc.stop(time + 0.16);
  }

  function playHat(time) {
    const source = ctx.createBufferSource();
    const highpass = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    source.buffer = noise;
    highpass.type = "highpass";
    highpass.frequency.value = 7000;
    gain.gain.setValueAtTime(0.18, time);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.04);
    source.connect(highpass);
    highpass.connect(gain);
    gain.connect(master);
    source.start(time);
    source.stop(time + 0.05);
  }

  // Queue every step that falls inside the lookahead window.
  function scheduleAhead() {
    while (nextTime < ctx.currentTime + LOOKAHEAD) {
      const position = step % MELODY.length;
      const bar = position >> 3;
      const beat = position & 7;

      if (MELODY[position])
        playTone("square", midiToHz(MELODY[position]), nextTime, STEP * 1.6, 0.3);
      if (beat % 2 === 0) {
        const octave = beat === 6 ? 12 : 0;
        playTone("triangle", midiToHz(BASS_ROOTS[bar] + octave), nextTime, STEP * 1.8, 0.8);
      }
      if (beat === 0 || beat === 4) playKick(nextTime);
      if (beat % 2 === 1) playHat(nextTime);

      nextTime += STEP;
      step++;
    }
  }

  function setPlaying(value) {
    playing = value;
    button.setAttribute("aria-pressed", String(value));
    button.classList.remove("is-prompting");
  }

  function start() {
    if (!ctx && !setup()) return;
    ctx.resume();
    nextTime = ctx.currentTime + 0.05;
    clearInterval(timer);
    timer = setInterval(scheduleAhead, 60);
    fadeTo(VOLUME, 0.6);
    setPlaying(true);
  }

  function stop() {
    setPlaying(false);
    if (!ctx) return;
    fadeTo(0, 0.3);
    setTimeout(() => {
      if (!playing) {
        clearInterval(timer);
        ctx.suspend();
      }
    }, 350);
  }

  function remember(isMuted) {
    try {
      if (isMuted) localStorage.setItem(STORAGE_KEY, "off");
      else localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* storage can be blocked; the preference just won't persist */
    }
  }

  try {
    muted = localStorage.getItem(STORAGE_KEY) === "off";
  } catch {
    /* ignore */
  }
  if (muted) button.classList.remove("is-prompting");

  button.addEventListener("click", () => {
    if (playing) stop();
    else start();
    remember(!playing);
  });

  // Browsers only allow audio after a user gesture, so wait for the first one.
  function onFirstGesture(event) {
    if (event.type === "keydown" && !START_KEYS.includes(event.key)) return;
    removeEventListener("pointerdown", onFirstGesture);
    removeEventListener("keydown", onFirstGesture);
    if (event.target.closest?.("#music")) return; // the button's own click handles it
    if (!muted && !playing) start();
  }
  addEventListener("pointerdown", onFirstGesture);
  addEventListener("keydown", onFirstGesture);

  document.addEventListener("visibilitychange", () => {
    if (!ctx || !playing) return;
    if (document.hidden) ctx.suspend();
    else ctx.resume();
  });

  return {
    blip() {
      if (playing) playTone("square", midiToHz(88), ctx.currentTime, 0.07, 0.3);
    },
  };
})();
