import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

// INSPR-498: the rotating glass AEON mark. It is decorative, compositor-only
// motion with a visible pause and a static reduced-motion pose, placed only
// on generated scenes whose centre is open, and it costs no other page
// anything.
const webUrl = new URL("../", import.meta.url);
const source = (path) => readFile(new URL(`src/${path}`, webUrl), "utf8");

const animatedProperties = (css) => {
  const names = new Set();
  for (const [, body] of css.matchAll(/@keyframes\s+[\w-]+\s*\{((?:[^{}]|\{[^{}]*\})*)\}/g)) {
    for (const [, property] of body.matchAll(/([a-z-]+)\s*:/g)) names.add(property);
  }
  return names;
};

test("every keyframe of the mark animates transform or opacity only", async () => {
  const css = await source("styles/aeon-mark.css");
  const properties = animatedProperties(css);
  assert.ok(properties.size >= 2, "the mark has keyframes");
  for (const property of properties) {
    assert.ok(["transform", "opacity"].includes(property), `keyframes animate ${property}`);
  }
  assert.ok((css.match(/@keyframes/g) ?? []).length >= 5, "turn, float, sheen, breathe, shadow");
});

test("reduced motion stops every animation and the pointer tilt", async () => {
  const css = await source("styles/aeon-mark.css");
  const block = css.slice(css.indexOf("@media (prefers-reduced-motion: reduce)"));
  assert.match(block, /animation:\s*none\s*!important/);
  assert.match(block, /\.aeon-mark__tilt\s*\{[^}]*transform:\s*none/);
  assert.match(css, /transform:\s*rotateY\(-28deg\)/, "a static three-quarter pose exists");
});

test("the mark stands still when paused, off the current slide or in a closed carousel", async () => {
  const css = await source("styles/aeon-mark.css");
  assert.match(css, /\[data-motion="paused"\] \.aeon-mark \*/);
  assert.match(css, /\.specs__slide:not\(\.is-current\) \.aeon-mark \*/);
  assert.match(css, /\.specs__carousel:not\(\.is-open\) \.aeon-mark \*/);
  assert.match(css, /animation-play-state:\s*paused/);
  assert.doesNotMatch(css, /will-change/, "the compositor promotes the animated layers itself");
  assert.doesNotMatch(css, /italic/);
});

test("the component is decorative markup with no script of its own", async () => {
  const component = await source("components/AeonGlassMark.astro");
  assert.match(component, /aria-hidden="true"/);
  assert.match(component, /data-aeon-mark/);
  assert.doesNotMatch(component, /<script/, "the tilt lives in AeonPage's module script");
  assert.doesNotMatch(component, /import\s+"[^"]*aeon-mark\.css"/, "a page that imports SpecsGrid pays nothing");
  assert.doesNotMatch(component, /on(click|load|pointer)\w*=/i);
});

test("only the AEON page loads the mark's styles and tilt, and only behind the lens", async () => {
  const page = await source("components/AeonPage.astro");
  assert.match(page, /import "\.\.\/styles\/aeon-mark\.css";/);
  assert.match(page, /const initGlassMarks = \(\) => \{/);
  assert.match(page, /initGlassMarks\(\);/);
  const grid = await source("components/SpecsGrid.astro");
  assert.match(grid, /lens\.markSrc && lens\.marks\?\.includes\(pad\(i \+ 1\)\)/);
  for (const file of ["ProductPage.astro", "OverviewPage.astro", "AithemaProductPage.astro"]) {
    assert.doesNotMatch(await source(`components/${file}`), /aeon-mark|AeonGlassMark/, `${file} is untouched`);
  }
});

test("the mark goes only on generated scenes with an open centre, never on a live screen", async () => {
  const page = await source("components/AeonPage.astro");
  const slugs = page.match(/const markSlugs = new Set\(\[([^\]]+)\]\)/)?.[1].match(/"([^"]+)"/g)?.map((s) => s.slice(1, -1)) ?? [];
  assert.deepEqual(slugs.sort(), ["capacity-routing", "contract-first", "made-in-austria", "tenant-isolation", "work-orders"]);
  assert.match(page, /lensImages\[i\]\?\.kind === "art"/, "a live screen never gets the mark");
  const manifest = JSON.parse(await source("assets/products/paimos-aeon/capture-manifest.json"));
  for (const slug of slugs) {
    const file = manifest.files.find((entry) => entry.name.startsWith("specs/") && entry.name.includes(`-${slug}.`));
    assert.ok(file, `${slug} is in the capture manifest`);
    assert.equal(file.kind, "generated", `${slug} is a generated scene`);
  }
});

test("the carousel's pause button has a label in both editions and follows the WCAG 2.2.2 contract", async () => {
  const page = await source("components/AeonPage.astro");
  for (const label of ["Bewegung anhalten", "Bewegung fortsetzen", "Pause motion", "Play motion"]) {
    assert.ok(page.includes(`"${label}"`), `${label} exists`);
  }
  const grid = await source("components/SpecsGrid.astro");
  assert.match(grid, /data-carousel-motion/);
  assert.match(page, /carousel\.dataset\.motion = "paused"/);
  assert.match(page, /const moving = !reduced && Boolean\(slides\.get\(id\)\?\.querySelector\("\[data-aeon-mark\]"\)\)/);
});
