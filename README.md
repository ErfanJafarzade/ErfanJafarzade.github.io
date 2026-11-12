# erfanjafarzade.github.io

Personal site: a horizontally scrolling, pixel-game styled portfolio. Plain HTML, CSS and JavaScript, no build step.

```
index.html       page content (one <section> per level)
css/style.css    layout, themes, animations
js/main.js       scrolling, HUD, reveal animation, theme switcher
js/music.js      chiptune background music (Web Audio, no audio files)
```

## Deploy

Commit everything to the root of the `erfanjafarzade.github.io` repo. GitHub Pages serves `index.html` automatically.

## Editing

- Content lives in `index.html`. Research cards are the `SLOT` boxes in the research section.
- Colors are custom properties at the top of `css/style.css`. The amber and terminal palettes are the `[data-theme]` blocks.
- Music: tune and tempo are at the top of `js/music.js`; master volume is `VOLUME`.
