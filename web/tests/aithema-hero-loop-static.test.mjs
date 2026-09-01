import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import test from "node:test";

const webUrl = new URL("../", import.meta.url);
const webFile = (path) => readFile(new URL(path, webUrl), "utf8");

test("Aithema uses its approved still as the accessible hero-loop fallback", async () => {
  const page = await webFile("src/components/AithemaProductPage.astro");
  const heroLoop = await webFile("src/components/HeroLoop.astro");
  const audit = await webFile("scripts/audit-hero-loops.mjs");
  const mediaUrl = new URL("src/assets/products/aithema/hero-loop.mp4", webUrl);
  const media = await stat(mediaUrl);
  const mediaDigest = createHash("sha256").update(await readFile(mediaUrl)).digest("hex");

  assert.match(page, /import HeroLoop from "\.\/HeroLoop\.astro"/);
  assert.match(page, /import aithemaHeroLoop from "\.\.\/assets\/products\/aithema\/hero-loop\.mp4"/);
  assert.match(
    page,
    /<HeroLoop\s+id="aithema"\s+poster=\{aithemaHero\}\s+video=\{aithemaHeroLoop\}\s+alt=\{content\.hero\.alt\}/,
  );
  assert.match(heroLoop, /id: "inspr" \| "aithema" \| "paimos" \| "pharos" \| "janus"/);
  assert.match(heroLoop, /poster=\{poster\.src\}/);
  assert.match(heroLoop, /media="\(prefers-reduced-motion: no-preference\)"/);
  assert.match(heroLoop, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(
    audit,
    /slug: "aithema",[\s\S]*html: "aithema\/index\.html",[\s\S]*expectedDuration: 5\.042,[\s\S]*expectedProfile: "High",[\s\S]*requiresFastStart: true/,
  );
  assert.ok(media.size >= 250 * 1024 && media.size <= 3 * 1024 * 1024);
  assert.equal(mediaDigest, "2aa8bf68d4020070a8081b5041ebce0054034c5571887f39a1ad431fe0173e39");
});
