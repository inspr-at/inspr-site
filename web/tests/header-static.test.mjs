import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const sourceUrl = new URL("../src/", import.meta.url);
const source = (relativePath) => readFile(new URL(relativePath, sourceUrl), "utf8");

test("the shared header sticks and floats after a little scroll, without reflow", async () => {
  const [styles, motion, header, aithema] = await Promise.all([
    source("styles/microsites.css"),
    source("components/SiteHeaderMotion.astro"),
    source("components/MicrositeHeader.astro"),
    source("components/AithemaProductPage.astro"),
  ]);
  assert.match(styles, /\.site-header \{\s*position: sticky;\s*top: 0;\s*z-index: 20;/);
  assert.match(styles, /\.site-header\[data-floating\] \.site-header__bar \{[\s\S]*?transform: translateY\(-0\.4rem\) scale\(0\.965\);/);
  assert.match(styles, /\.site-header__bar \{[\s\S]*?transform-origin: 50% 0;[\s\S]*?transition:\s*transform 0\.65s cubic-bezier\(0\.22, 1, 0\.36, 1\),/);
  // Only paint properties animate; no size or spacing changes between states.
  const floating = styles.match(/\.site-header\[data-floating\] \.site-header__bar \{([\s\S]*?)\}/)[1];
  assert.doesNotMatch(floating, /padding|min-height|height|margin|font-size/);
  assert.match(styles, /@media \(prefers-reduced-motion: reduce\) \{\s*\.site-header__bar \{\s*transition: none;/);
  assert.match(motion, /const liftAt = 72;[\s\S]*?const restAt = 20;/);
  assert.match(motion, /requestAnimationFrame\(update\)/);
  assert.match(motion, /\{ passive: true \}/);
  assert.match(header, /<\/header>\s*<SiteHeaderMotion \/>/);
  assert.match(aithema, /<\/header>\s*<SiteHeaderMotion \/>/);
  // Every entry of the family renders one of these two headers.
  const overviewPage = await source("components/OverviewPage.astro");
  const productPage = await source("components/ProductPage.astro");
  const umbrella = await source("pages/index.astro");
  for (const page of [overviewPage, productPage, umbrella]) assert.match(page, /<MicrositeHeader/);
});
