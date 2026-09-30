import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

// INSPR-498 round 1. The polish layer is CSS plus one bundled module: no
// inline script, pointer effects gated on a fine pointer, every moving part
// transform, translate or opacity only, and reduced motion respected.
const webUrl = new URL("../", import.meta.url);
const source = (path) => readFile(new URL(`src/${path}`, webUrl), "utf8");

test("the rhythm has two tokens, and anchors key off the section's own padding", async () => {
  const css = await source("styles/aeon-polish.css");
  assert.match(css, /--aeon-space: clamp\(4rem, 7\.5vw, 6\.5rem\);/);
  assert.match(css, /--aeon-space-tight: clamp\(/);
  assert.match(css, /\.aeon \.section\[id\] \{\s*scroll-margin-top: calc\(var\(--aeon-pt\) \* -1\);/);
  for (const id of ["#screens", "#specs", "#next", "#open-source"]) {
    assert.ok(css.includes(`.aeon ${id} {`), `${id} joins a run of plain sections`);
  }
});

test("the rules viewer is sticky only where it fits, and the facts keep a calm measure", async () => {
  const css = await source("styles/aeon-polish.css");
  assert.match(css, /@media \(min-width: 72rem\) and \(min-height: 46rem\) \{[^}]*\.aeon-rules__grid \{\s*align-items: start;/s);
  assert.match(css, /\.aeon-rules__grid > \.aeon-pan \{\s*position: sticky;/);
  assert.match(css, /\.aeon-deep dd \{\s*max-width: 70ch;/);
});

test("pointer effects need a fine pointer and stop under reduced motion", async () => {
  const css = await source("styles/aeon-polish.css");
  assert.match(css, /@media \(hover: hover\) and \(pointer: fine\) \{\s*\.specs--aeon \.specs__face \{/);
  assert.match(css, /@media \(hover: none\), \(pointer: coarse\) \{[^}]*translate: none/s);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
  const script = await source("components/AeonPolish.astro");
  assert.match(script, /matchMedia\("\(hover: hover\) and \(pointer: fine\)"\)/);
  assert.match(script, /if \(fine\.matches && !reduced\.matches\)/);
  assert.match(script, /if \(!reduced\.matches && "IntersectionObserver" in window\)/);
  assert.match(script, /classList\.contains\("is-paused"\)/, "the parallax rests while the hero is paused");
});

test("the hero shows the whole scene; the moving parts are translate, transform or opacity", async () => {
  const css = await source("styles/aeon-polish.css");
  assert.match(css, /\.aeon \.aeon-hero__visual \{\s*aspect-ratio: 16 \/ 9;/);
  const moving = [...css.matchAll(/transition:([^;]+);/g)].map((m) => m[1]).join(" ");
  assert.doesNotMatch(moving, /\b(width|height|top|left|margin|padding)\b/);
});

test("copy buttons carry their command, both languages label them, and the status is a live region", async () => {
  const page = await source("components/AeonPage.astro");
  assert.match(page, /data-copy=\{step\.command\}/);
  assert.match(page, /role="status" aria-live="polite" data-copy-status/);
  for (const label of ["copyCommand", "copied", "theatreHint"]) {
    assert.equal([...page.matchAll(new RegExp(`${label}: "`, "g"))].length, 2, `${label} exists in EN and DE`);
  }
});

test("count-up keeps the real number as text and never writes an inline script", async () => {
  const script = await source("components/AeonPolish.astro");
  assert.match(script, /className = "visually-hidden"/);
  assert.match(script, /setAttribute\("aria-hidden", "true"\)/);
  assert.match(script, /el\.textContent = final/);
  assert.doesNotMatch(script, /is:inline/);
  const page = await source("components/AeonPage.astro");
  assert.match(page, /import AeonPolish from "\.\/AeonPolish\.astro";/);
});

test("German body text hyphenates, code and terms never do", async () => {
  const css = await source("styles/aeon-polish.css");
  assert.match(css, /html\[lang="de"\] \.aeon :is\(h1, h2, h3, h4, p, li, dd, summary, figcaption, small\) \{\s*hyphens: auto;/);
  assert.match(css, /html\[lang="de"\] \.aeon :is\(code, dt,[^)]*\) \{\s*hyphens: manual;/);
});

test("the phone theatre is a window onto a wide screen, sized for it", async () => {
  const page = await source("components/AeonPage.astro");
  assert.match(page, /sizes="\(max-width: 40rem\) 1080px, /);
  const css = await source("styles/aeon-polish.css");
  assert.match(css, /@media \(max-width: 40rem\) \{\s*\.aeon-theatre \.aeon-window \{[^}]*overflow: auto;/s);
  assert.match(css, /width: 1080px;/);
});
