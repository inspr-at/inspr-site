import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const sourceUrl = new URL("../src/", import.meta.url);
const rootUrl = new URL("../../", import.meta.url);

const source = (relativePath) => readFile(new URL(relativePath, sourceUrl), "utf8");
const rootFile = (relativePath) => readFile(new URL(relativePath, rootUrl), "utf8");

const products = ["aithema", "paimos", "pharos", "janus"];

test("every product microsite carries the Details slider before its language switch", async () => {
  const [productPage, aithemaPage, header] = await Promise.all([
    source("components/ProductPage.astro"),
    source("components/AithemaProductPage.astro"),
    source("components/MicrositeHeader.astro"),
  ]);
  assert.match(productPage, /detailsSlider=\{\{[\s\S]*?label: "Details",[\s\S]*?\{ id: "simple", label: labels\.detailsSimple \},[\s\S]*?\{ id: "standard", label: "Standard" \},[\s\S]*?\{ id: "technical", label: labels\.detailsTechnical \},/);
  assert.match(header, /<DetailsControl[\s\S]*?\{languageLinks && \(/);
  assert.match(aithemaPage, /<DetailsControl[\s\S]*?label="Details"[\s\S]*?<nav class="language-switch"/);
  for (const page of [productPage, aithemaPage]) {
    assert.match(page, /detailsSimple: "Einfach"/);
    assert.match(page, /detailsTechnical: "Technisch"/);
    assert.match(page, /detailsSimple: "Simple"/);
    assert.match(page, /detailsTechnical: "Technical"/);
    assert.doesNotMatch(page, /developer|sysop|nerd/i);
  }
});

test("product hero, problem and model leads ship in three depths on both editions", async () => {
  const [productPage, aithemaPage, workflow, types] = await Promise.all([
    source("components/ProductPage.astro"),
    source("components/AithemaProductPage.astro"),
    source("components/WorkflowExplorer.astro"),
    source("content/types.ts"),
  ]);
  assert.match(types, /export type Depths = \{\s*simple\?: string;\s*technical\?: string;\s*\};/);
  assert.equal((types.match(/depths\?: Depths;/g) || []).length, 6);
  for (const page of [productPage, aithemaPage]) {
    assert.match(page, /class="hero-lead"><DetailLevels simple=\{content\.hero\.depths\?\.simple \?\? content\.hero\.lead\} standard=\{content\.hero\.lead\} technical=\{content\.hero\.depths\?\.technical \?\? content\.hero\.lead\} \/>/);
    assert.match(page, /class="section-lead"><DetailLevels simple=\{content\.problem\.depths\?\.simple \?\? content\.problem\.lead\}/);
    assert.match(page, /lead=\{content\.model\.lead\}\s*leadDepths=\{content\.model\.depths\}/);
  }
  assert.match(workflow, /leadDepths\?: \{ simple\?: string; technical\?: string \};/);
  assert.match(workflow, /<DetailLevels simple=\{leadDepths\?\.simple \?\? lead\} standard=\{lead\} technical=\{leadDepths\?\.technical \?\? lead\} \/>/);

  for (const slug of products) {
    const english = await source(`content/${slug}.ts`);
    const german = await source(`content/de/${slug}.ts`);
    for (const [name, text] of [["en", english], ["de", german]]) {
      const depths = (text.match(/^    depths: \{$/gm) || []).length;
      assert.equal(depths, 3, `${slug} ${name}: hero, problem and model carry depths`);
      assert.equal((text.match(/^      simple:$/gm) || []).length, 3, `${slug} ${name}: three simple variants`);
      assert.equal((text.match(/^      technical:$/gm) || []).length, 3, `${slug} ${name}: three technical variants`);
      const depthCopy = [...text.matchAll(/^    depths: \{\n([\s\S]*?)^    \},$/gm)].map((match) => match[1]).join("\n");
      assert.doesNotMatch(depthCopy, /\b(hsb|csb|mbp)\d/i, `${slug} ${name}: no host names in depth copy`);
      assert.doesNotMatch(depthCopy, /barta\.cm|netcup|hetzner|storage box/i, `${slug} ${name}: no providers or internal domains in depth copy`);
    }
  }
});

test("the depth travels across the family's hosts and every product host is probed", async () => {
  const [control, deploy] = await Promise.all([
    source("components/DetailsControl.astro"),
    rootFile("deploy.sh"),
  ]);
  assert.match(control, /url\.hostname === "inspr\.at" \|\| url\.hostname\.endsWith\("\.inspr\.at"\)/);
  assert.match(control, /url\.searchParams\.set\(linkParam, level\)/);
  for (const slug of products) {
    assert.match(deploy, new RegExp(`probe_page "[A-Za-z]+ details control" "https://${slug}\\.inspr\\.at/" "data-details-slider"`));
    assert.match(deploy, new RegExp(`probe_page "[A-Za-z]+ German details control" "https://${slug}\\.inspr\\.at/de/" "data-details-slider"`));
  }
});

test("the umbrella start page carries the Details slider and six leads in three depths", async () => {
  const [umbrella, deploy] = await Promise.all([
    source("pages/index.astro"),
    rootFile("deploy.sh"),
  ]);
  assert.match(umbrella, /import DetailLevels from "\.\.\/components\/DetailLevels\.astro"/);
  assert.match(umbrella, /languageLinks=\{\{ en: "\/", de: "\/de\/" \}\}\s*detailsSlider=\{\{[\s\S]*?label: "Details",[\s\S]*?\{ id: "technical", label: copy\("Technical", "Technisch"\) \},/);
  assert.equal((umbrella.match(/<DetailLevels/g) || []).length, 5);
  assert.match(umbrella, /leadDepths=\{\{\s*simple: copy\(/);
  for (const phrase of [
    "Say what you want to build. Four tools take it from there, one step at a time, and each step waits for your yes.",
    "Sagen Sie, was Sie bauen wollen. Vier Werkzeuge übernehmen es von da an, Schritt für Schritt, und jeder Schritt wartet auf Ihr Ja.",
    "Every handoff is an explicit human approval gate.",
    "Jede Übergabe ist ein explizites menschliches Freigabe-Gate.",
    "Three of the four tools are open for anyone to read and run. The fourth is on its way.",
    "Drei der vier Werkzeuge sind offen, jeder kann sie lesen und betreiben. Das vierte ist unterwegs.",
  ]) {
    assert.ok(umbrella.includes(phrase), `missing umbrella depth copy: ${phrase}`);
  }
  assert.doesNotMatch(umbrella, /\b(hsb|csb|mbp)\d/i);
  assert.doesNotMatch(umbrella, /barta\.cm|netcup|hetzner|storage box/i);
  assert.match(deploy, /probe_page "INSPR umbrella details control" "https:\/\/www\.inspr\.at\/" "data-details-slider"/);
  assert.match(deploy, /probe_page "INSPR German umbrella details control" "https:\/\/www\.inspr\.at\/de\/" "data-details-slider"/);
});
