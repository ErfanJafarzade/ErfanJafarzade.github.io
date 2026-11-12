/**
 * Page behaviour: reveal animation, horizontal scrolling, the HUD
 * (progress bar, level counter, active nav) and the colour theme switcher.
 * Background music lives in music.js.
 */
const root = document.documentElement;
const track = document.getElementById("track");
const levels = [...track.children];
const progressFill = document.getElementById("progress-fill");
const backdropLines = document.getElementById("backdrop-lines");
const levelCounter = document.getElementById("level-counter");
const themeButton = document.getElementById("theme");
// The desktop nav and the mobile dock each hold one link per level.
const navLinks = [...document.querySelectorAll("nav a")];

const GRID_SIZE = 64; // keep in sync with the grid background-size in the CSS
const PARALLAX = 0.35; // how fast the grid drifts compared to the page
const THEMES = ["", "amber", "terminal"]; // '' is the default neon palette
const THEME_KEY = "ej-theme";

let currentLevel = 0;
let pendingFrame;
let themeIndex = 0;

const pad = (n) => String(n).padStart(2, "0");

/* Reveal: fade each level's content in the first time it comes into view. */
function setUpReveal() {
  root.classList.add("js-enabled");

  if (!("IntersectionObserver" in window)) {
    levels.forEach((level) => level.classList.add("is-visible"));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) entry.target.classList.add("is-visible");
      });
    },
    { root: track, threshold: 0.4 },
  );
  levels.slice(1).forEach((level) => observer.observe(level));

  // The first level waits for the loading splash to fade out.
  setTimeout(() => levels[0].classList.add("is-visible"), 900);
}

/* HUD: progress bar, level counter, active nav link, drifting grid. */
function updateHud() {
  const pageWidth = track.clientWidth;
  const maxScroll = track.scrollWidth - pageWidth;
  const x = track.scrollLeft;
  const index = Math.min(levels.length - 1, Math.round(x / pageWidth));

  progressFill.style.width = `${maxScroll > 0 ? (x / maxScroll) * 100 : 0}%`;
  backdropLines.style.setProperty("--scroll-x", `${-((x * PARALLAX) % GRID_SIZE)}px`);
  levelCounter.textContent = `${pad(index + 1)}/${pad(levels.length)}`;

  navLinks.forEach((link, i) => {
    if (i % levels.length === index) link.setAttribute("aria-current", "true");
    else link.removeAttribute("aria-current");
  });

  if (x > 20) root.classList.add("has-scrolled"); // hides the "swipe" cue
  if (index !== currentLevel) {
    currentLevel = index;
    music.blip();
  }
}

track.addEventListener(
  "scroll",
  () => {
    cancelAnimationFrame(pendingFrame);
    pendingFrame = requestAnimationFrame(updateHud);
  },
  { passive: true },
);
addEventListener("resize", updateHud);

/* Mouse wheel scrolls sideways, unless the level itself needs vertical scrolling. */
track.addEventListener(
  "wheel",
  (event) => {
    const isHorizontal = Math.abs(event.deltaX) > Math.abs(event.deltaY);
    if (event.ctrlKey || isHorizontal) return;

    const level = event.target.closest(".level");
    if (level && level.scrollHeight > level.clientHeight + 2) return;

    event.preventDefault();
    const lineHeight = event.deltaMode ? 32 : 1;
    track.scrollBy({ left: event.deltaY * lineHeight, behavior: "instant" });
  },
  { passive: false },
);

/* Keyboard: arrows and page keys move one level, Home/End jump to the ends. */
addEventListener("keydown", (event) => {
  if (event.target.closest?.("button")) return;

  const page = track.clientWidth;
  const steps = { ArrowRight: page, PageDown: page, ArrowLeft: -page, PageUp: -page };

  if (event.key in steps) {
    event.preventDefault();
    track.scrollBy({ left: steps[event.key], behavior: "smooth" });
  } else if (event.key === "Home") {
    event.preventDefault();
    track.scrollTo({ left: 0, behavior: "smooth" });
  } else if (event.key === "End") {
    event.preventDefault();
    track.scrollTo({ left: track.scrollWidth, behavior: "smooth" });
  }
});

/* Theme switcher: cycles palettes and remembers the choice. */
function applyTheme() {
  const name = THEMES[themeIndex];
  if (name) root.setAttribute("data-theme", name);
  else root.removeAttribute("data-theme");
}

try {
  themeIndex = Math.max(0, THEMES.indexOf(localStorage.getItem(THEME_KEY) || ""));
} catch {
  /* storage can be blocked; fall back to the default palette */
}
applyTheme();

themeButton.addEventListener("click", () => {
  themeIndex = (themeIndex + 1) % THEMES.length;
  applyTheme();
  try {
    localStorage.setItem(THEME_KEY, THEMES[themeIndex]);
  } catch {
    /* ignore */
  }
});

setUpReveal();
updateHud();
track.focus({ preventScroll: true });
