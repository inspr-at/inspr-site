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

test("product technical drawers share typed, public datasheets and localized handoffs", async () => {
  const [types, productPage, aithemaPage, workflow, control, styles, stack, overviewStyles] = await Promise.all([
    source("content/types.ts"),
    source("components/ProductPage.astro"),
    source("components/AithemaProductPage.astro"),
    source("components/WorkflowExplorer.astro"),
    source("components/DetailsControl.astro"),
    source("styles/details-control.css"),
    source("components/OverviewStack.astro"),
    source("styles/overview-details.css"),
  ]);
  assert.match(types, /export type ProductSheet = \{\s*repo: string;\s*runtime: string;\s*gate: string;\s*artefact: string;\s*interfaces: string;\s*maturity: string;\s*command\?: string;\s*\};/);
  assert.match(types, /export type ProductHandoff = \{\s*in: string;\s*out: string;\s*\};/);
  assert.equal((types.match(/hero: \{\s*sheet: ProductSheet;/g) || []).length, 2);
  assert.equal((types.match(/model: \{\s*handoff: ProductHandoff;/g) || []).length, 2);

  const fields = ["repo", "runtime", "gate", "artefact", "interfaces", "maturity"];
  const handoffs = {
    en: ["conversation + files", "approved requirement set", "staged build + evidence", "release on a declared host", "bounded permit"],
    de: ["Gespräch + Dateien", "freigegebener Anforderungssatz", "Staging-Build + Nachweise", "Release auf deklariertem Host", "begrenzte Freigabe"],
  };
  for (const [index, slug] of products.entries()) {
    for (const locale of ["en", "de"]) {
      const text = await source(`content/${locale === "de" ? "de/" : ""}${slug}.ts`);
      const hero = text.match(/^  hero: \{\n([\s\S]*?)^  \},/m)?.[1];
      const model = text.match(/^  model: \{\n([\s\S]*?)^  \},/m)?.[1];
      assert.ok(hero && model, `${slug} ${locale}: hero and model exist`);
      const sheet = hero.match(/^    sheet: \{\n([\s\S]*?)^    \},/m)?.[1];
      const handoff = model.match(/^    handoff: \{\n([\s\S]*?)^    \},/m)?.[1];
      assert.ok(sheet && handoff, `${slug} ${locale}: sheet belongs to hero, handoff to model`);
      for (const field of fields) assert.match(sheet, new RegExp(`^      ${field}: "[^"\\n]+",$`, "m"));
      assert.ok(handoff.includes(`in: "${handoffs[locale][index]}"`));
      assert.ok(handoff.includes(`out: "${handoffs[locale][index + 1]}"`));
      if (slug === "paimos") assert.ok(sheet.includes('command: \'paimos issue create -p PROJ --title "…"\''));
      else assert.doesNotMatch(sheet, /command:/);
      assert.doesNotMatch(sheet + handoff, /\b(hsb|csb|mbp)\d/i, `${slug} ${locale}: no host names`);
      assert.doesNotMatch(sheet + handoff, /barta\.cm|netcup|hetzner|storage box/i, `${slug} ${locale}: no internal domains or providers`);
    }
  }

  for (const page of [productPage, aithemaPage]) {
    assert.match(page, /class="product-hero__copy"[\s\S]*?class="button-row"[\s\S]*?<dl class="product-sheet details-drawer" data-drawer>\s*<div class="details-drawer__inner">/);
    for (const field of fields) assert.ok(page.includes(`<dt>{sheetLabels.${field}}</dt><dd>{content.hero.sheet.${field}}</dd>`));
    assert.match(page, /content\.hero\.sheet\.command &&/);
    assert.match(page, /<WorkflowExplorer[\s\S]*?handoff=\{content\.model\.handoff\}/);
    for (const label of ["Repo", "Laufzeit", "Gate", "Artefakt", "Schnittstellen", "Reife"]) {
      assert.ok(page.includes(`"${label}"`));
    }
  }
  assert.match(workflow, /handoff\?: ProductHandoff;/);
  assert.match(workflow, /<DetailLevels[\s\S]*?\{handoff && \(\s*<dl class="product-handoff details-drawer" data-drawer aria-label=\{labels\.handoff\}>\s*<div class="details-drawer__inner">/);
  assert.match(workflow, /<dt>\{labels\.handoffIn\}<\/dt><dd>\{handoff\.in\}<\/dd>/);
  assert.match(workflow, /<dt>\{labels\.handoffOut\}<\/dt><dd>\{handoff\.out\}<\/dd>/);
  for (const label of ["handoff in", "handoff out", "Übergabe hinein", "Übergabe hinaus"]) assert.ok(workflow.includes(`"${label}"`));

  assert.match(control, /querySelectorAll<HTMLElement>\("\[data-drawer\]"\)/);
  assert.match(control, /drawer\.style\.setProperty\("--drawer-i", String\(index\)\)/);
  assert.doesNotMatch(stack, /--drawer-i/);
  assert.doesNotMatch(control, /is:inline/);
  assert.match(styles, /\.details-drawer,\s*\.overview-drawer \{\s*--drawer-i: 0;\s*display: grid;\s*grid-template-rows: 0fr;\s*opacity: 0;/);
  assert.match(styles, /\.details-drawer__inner,\s*\.overview-drawer__inner \{\s*min-height: 0;\s*overflow: hidden;/);
  assert.match(styles, /html\[data-details-level="technical"\] \.details-drawer,[\s\S]*?grid-template-rows: 1fr;\s*opacity: 1;[\s\S]*?calc\(var\(--drawer-i\) \* 45ms\)/);
  assert.match(styles, /@media \(prefers-reduced-motion: reduce\) \{\s*\.details-drawer,[\s\S]*?html\[data-details-level="technical"\] \.details-drawer,[\s\S]*?transition: none;/);
  assert.match(styles, /@media print \{\s*\.details-drawer,\s*\.overview-drawer \{\s*grid-template-rows: 1fr;\s*opacity: 1;/);
  assert.match(styles, /\.product-sheet,\s*\.product-handoff \{[^}]*margin: 0;\s*padding: 0;\s*border: 0;/);
  assert.doesNotMatch(overviewStyles, /grid-template-rows: [01]fr/);
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

test("the umbrella start page carries the Details slider, depth leads and technical datasheets", async () => {
  const [umbrella, deploy, control, stack] = await Promise.all([
    source("pages/index.astro"),
    rootFile("deploy.sh"),
    source("components/DetailsControl.astro"),
    source("components/OverviewStack.astro"),
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
  for (const slug of products) {
    assert.ok(umbrella.includes(`import { ${slug}Content } from "../content/${slug}";`));
    assert.ok(umbrella.includes(`import { ${slug}ContentDe } from "../content/de/${slug}";`));
    assert.ok(umbrella.includes(`${slug}: (locale === "de" ? ${slug}ContentDe : ${slug}Content).hero.sheet`));
    assert.match(umbrella, new RegExp(`name: "${slug[0].toUpperCase() + slug.slice(1)}",\\s*sheet: sheets\\.${slug},`));
  }
  const spec = umbrella.match(/<dl class="umbrella-spec details-drawer" data-drawer[\s\S]*?<\/dl>/)?.[0];
  assert.ok(spec, "the umbrella has a technical hero spec strip");
  for (const field of ["release", "source", "deployed", "csp", "hsts"]) {
    assert.ok(spec.includes(`data-live="${field}"`));
  }
  assert.match(spec, /AGPL-3\.0-only/);
  assert.match(spec, /copy\("1 build · 5 hostnames · 2 languages", "1 Build · 5 Hostnamen · 2 Sprachen"\)/);
  assert.match(umbrella, /\.umbrella-spec \{\s*margin: 0;\s*padding: 0;\s*border: 0;/);
  assert.match(umbrella, /:global\(html\[data-details-level="technical"\]\) \.umbrella-spec \.details-drawer__inner \{\s*margin-top: 1\.1rem;\s*padding-top: 1\.1rem;\s*border-top: 1px dashed var\(--line\);/);
  const showcase = umbrella.match(/<div class="product-showcase">[\s\S]*?<\/section>/)?.[0];
  assert.ok(showcase);
  assert.match(showcase, /<div class="product-story-item">\s*<a[\s\S]*?<\/a>\s*<dl class="product-sheet details-drawer" data-drawer>\s*<div class="details-drawer__inner">/);
  for (const field of ["repo", "runtime", "gate", "artefact", "interfaces", "maturity"]) {
    assert.ok(showcase.includes(`<dt>{sheetLabels.${field}}</dt><dd>{product.sheet.${field}}</dd>`));
  }
  assert.match(showcase, /product\.sheet\.command &&/);
  assert.match(showcase, /<code class="product-sheet__command">\$ \{product\.sheet\.command\}<\/code>/);
  assert.match(control, /fetch\("\/release\.json"/);
  assert.match(control, /if \(liveLoaded\) return;\s*liveLoaded = true;/);
  assert.match(control, /if \(level === "technical"\) void loadLive\(\);/);
  assert.doesNotMatch(stack, /fetch\("\/release\.json"|loadLive/);
  assert.doesNotMatch(umbrella, /\b(hsb|csb|mbp)\d/i);
  assert.doesNotMatch(umbrella, /barta\.cm|netcup|hetzner|storage box/i);
  assert.match(deploy, /probe_page "INSPR umbrella details control" "https:\/\/www\.inspr\.at\/" "data-details-slider"/);
  assert.match(deploy, /probe_page "INSPR German umbrella details control" "https:\/\/www\.inspr\.at\/de\/" "data-details-slider"/);
});
