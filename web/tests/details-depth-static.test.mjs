import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = (path) => readFile(new URL(`../src/${path}`, import.meta.url), "utf8");
const tags = (text, name = "section") => [...text.matchAll(new RegExp(`<${name}\\b[\\s\\S]*?>`, "g"))].map(([tag]) => tag);
const boundary = (text, marker, max = false, name = "section") => {
  const tag = tags(text, name).find((tag) => tag.includes(marker));
  assert.ok(tag, `${marker} exists`);
  assert.ok(tag.includes('data-depth-min="standard"'), `${marker} folds at Simple`);
  assert.equal(tag.includes('data-depth-max="standard"'), max, `${marker} Technical visibility`);
};

test("the depth engine moves the page by transform and opacity only, from three measured layouts", async () => {
  const [engine, control, css, layout, boot] = await Promise.all([
    source("scripts/details-engine.ts"),
    source("components/DetailsControl.astro"),
    source("styles/details-control.css"),
    source("layouts/MicrositeLayout.astro"),
    readFile(new URL("../public/scripts/details-level.js", import.meta.url), "utf8"),
  ]);
  // First, Final and Mid are measured in one task; Mid holds closing folds
  // and stacks both copy variants, so no gap ever opens between sections.
  for (const token of ["First", "Final", "Mid", "is-holding", "is-swapping", "data-copy-from", "data-details-compact", "data-details-moving", "overflow-anchor", "prefers-reduced-motion"]) {
    assert.ok(engine.includes(token), token);
  }
  // Every keyframe the engine plays is translate or opacity.
  const keyframes = [...engine.matchAll(/animateOn\([^,]+, \[([\s\S]*?)\], \{/g)].map((match) => match[1]);
  assert.ok(keyframes.length >= 6, "the engine plays its motion through animateOn");
  for (const frames of keyframes) {
    // Point literals ({ x, y }) inside the values are offsets, not properties.
    for (const [, key] of frames.matchAll(/\{\s*(\w+):/g)) {
      if (key === "x" || key === "y") continue;
      assert.ok(["translate", "opacity"].includes(key), `keyframe property ${key}`);
    }
  }
  assert.match(engine, /fill: "both", id: MOTION_ID/);
  assert.match(engine, /export const EASE = "cubic-bezier\(0\.45, 0, 0\.55, 1\)";/);
  // The reader keeps their place: the block on the reading line holds,
  // corrected before paint, also after late layout.
  assert.match(engine, /const READING_LINE = 0\.3;/);
  assert.match(engine, /window\.scrollTo\(\{ top: finalScroll, behavior: "instant" \}\)/);
  assert.match(engine, /const STEADY_FRAMES = \d+;/);
  // No layout property transitions anywhere in the depth styles.
  assert.doesNotMatch(css, /transition(?:-property)?:[^;]*\b(height|margin|padding|max-height|max-width|grid-template-rows)\b/);
  assert.match(css, /html\[data-details-level="simple"\] :is\(\[data-depth-min="standard"\], \[data-depth-min="technical"\]\):not\(\.is-holding\),/);
  assert.match(css, /html:not\(\[data-details-level="technical"\]\) \[data-drawer\]:not\(\.is-holding\) \{\s*display: none;/);
  assert.match(css, /\[data-copy-slot="stack"\] \{\s*display: grid;/);
  // A stored depth is on <html> before the first paint.
  assert.match(layout, /<script is:inline src=\{`\/scripts\/details-level\.js\?v=\$\{releaseMetadata\.releaseId\}`\}><\/script>/);
  assert.ok(layout.indexOf("details-level.js") < layout.indexOf("</head>"));
  assert.match(boot, /localStorage\.getItem\("inspr-details-level"\)/);
  assert.match(boot, /root\.setAttribute\("data-details-compact", ""\)/);
  assert.match(control, /import \{ createDepthEngine, EASE, isLevel, LEVELS, type Level \} from "\.\.\/scripts\/details-engine";/);
  assert.match(control, /void engine\.apply\(level, false\);/);
  assert.doesNotMatch(control, /is:inline/);
});

test("depth typography avoids mid-word prose breaks and leaves footers outside the fold mechanic", async () => {
  const feature = await source("components/FeatureExperience.astro");
  assert.match(feature, /\.feature-experience__copy\s*\{[^}]*overflow-wrap: break-word;[^}]*hyphens: manual;/);
  const footer = await source("components/MicrositeFooter.astro");
  assert.doesNotMatch(footer, /data-depth-(?:min|max|layout)/);
  const aithema = await source("components/AithemaProductPage.astro");
  assert.doesNotMatch(aithema.slice(aithema.indexOf('<footer class="site-footer">')), /data-depth-(?:min|max|layout)/);
  const overview = await source("components/OverviewPage.astro");
  assert.doesNotMatch(overview.slice(overview.indexOf('<footer class="overview-footer')), /data-depth-(?:min|max|layout)/);
  const depthStyles = await source("styles/details-control.css");
  assert.doesNotMatch(depthStyles, /html\[data-details-(?:level="simple"|compact)\] \.site-footer/);
  const microsites = await source("styles/microsites.css");
  assert.match(microsites, /h1,\s*h2,\s*h3,\s*h4\s*\{[^}]*text-wrap: balance;/);
  const typography = await source("styles/typography.css");
  assert.match(typography, /h1,\s*h2,\s*h3,\s*h4\s*\{[^}]*text-wrap: balance;/);
});

test("umbrella folds supporting sections and compacts all four linked products in both languages", async () => {
  const page = await source("pages/index.astro");
  for (const marker of ['id="idea"', 'id="principles"', 'id="source"', 'data-section-pattern="faq-accordion"']) boundary(page, marker);
  boundary(page, 'data-section-pattern="identity-bridge"', true);
  boundary(page, 'id="flow"', false, "WorkflowExplorer");
  const heroStart = page.indexOf('class="umbrella-hero page-shell"');
  const hero = page.slice(heroStart, page.indexOf("</section>", heroStart));
  assert.doesNotMatch(hero, /data-depth-(?:min|max|layout)/);
  assert.match(hero, /class="umbrella-hero__visual">/);
  for (const cls of ["umbrella-proof page-shell", "product-story__visual"]) {
    assert.match(page, new RegExp(`class="${cls}" data-depth-min="standard"`));
  }
  assert.match(page, /data-depth-max="simple">\{product\.simple\}/);
  const products = page.slice(page.indexOf("const products = ["), page.indexOf("const proofPoints"));
  assert.equal((products.match(/simple: copy\(/g) ?? []).length, 4);
  assert.match(await source("pages/de/index.astro"), /<Home locale="de" \/>/);
});

test("all six page families keep their essence and preserve technical evidence", async () => {
  const overview = await source("components/OverviewPage.astro");
  assert.match(overview, /class="overview-hero page-shell" data-depth-layout/);
  for (const cls of ["overview-promises", "overview-step__preview", "overview-step__approval", "overview-step__connector", "overview-control", "overview-next page-shell"]) {
    assert.ok(overview.includes(`class="${cls}" data-depth-min="standard"`), cls);
  }
  assert.doesNotMatch(overview, /data-depth-max="standard"/);
  assert.match(await source("components/OverviewStack.astro"), /id="stack"[^>]*data-drawer/);
  for (const slug of ["paimos", "pharos", "janus", "aithema"]) {
    const page = await source(`components/${slug === "aithema" ? "AithemaProductPage" : "ProductPage"}.astro`);
    for (const marker of ['id="why"', 'id="limits"', 'data-section-pattern="faq-accordion"', 'id={`feature-${feature.id}`}']) boundary(page, marker);
    boundary(page, 'data-section-pattern="audience-paths"', true);
    if (slug === "aithema") {
      boundary(page, 'id="release-path"');
      boundary(page, 'data-section-pattern="proof-strip"');
    } else {
      for (const id of ["architecture", "trust", "open-source"]) boundary(page, `id="${id}"`);
      // The specs grid is the shared SpecsGrid component (INSPR-492). It folds
      // at Simple on every product page; only the AEON variant stays visible,
      // because there the header's Details level drives the card text instead.
      assert.match(page, /<SpecsGrid\s/);
      assert.doesNotMatch(page, /<SpecsGrid[^>]*variant=/);
      const grid = await source("components/SpecsGrid.astro");
      const gridTag = tags(grid, "section").find((tag) => tag.includes('id="specs"'));
      assert.ok(gridTag, 'SpecsGrid renders id="specs"');
      assert.match(gridTag, /data-depth-min=\{field \? undefined : "standard"\}/, "specs folds at Simple unless it is the AEON lens");
      assert.match(grid, /const field = variant === "aeon"/);
      boundary(page, 'data-section-pattern="filterable-matrix"');
      assert.match(page, /<div data-depth-min="standard">\{content.slug === "paimos" && <PaimosProductSurface/);
    }
    const heroStart = page.indexOf('class="product-hero page-shell"');
    const hero = page.slice(heroStart, page.indexOf("</section>", heroStart));
    assert.doesNotMatch(hero, /data-depth-(?:min|max|layout)/);
    assert.match(hero, /class="product-hero__visual">/);
    assert.match(page, /<WorkflowExplorer\s+id="model"/);
  }
});

test("Why preserves the What hero layout and typography", async () => {
  const css = await source("styles/details-control.css");
  for (const selector of ["product-hero", "umbrella-hero", "product-hero__copy", "umbrella-hero__copy", "hero-lead", "umbrella-hero__lead", "button-row"]) {
    assert.doesNotMatch(css, new RegExp(`data-details-(?:level="simple"|compact)[^}]*\\.${selector}`), selector);
  }
});

test("all model steps have matching plain EN/DE sentences and compact semantic lists", async () => {
  assert.match(await source("content/types.ts"), /export type StepItem = CardItem & \{\s*simple\?: string;/);
  const workflow = await source("components/WorkflowExplorer.astro");
  assert.match(workflow, /<ol class="workflow__simple" data-depth-max="simple">/);
  assert.match(workflow, /<strong>\{step.title\}<\/strong><p>\{step.simple \?\? step.body\}<\/p>/);
  assert.match(workflow, /class="workflow__experience" data-depth-min="standard"/);
  const newCopy = [];
  for (const slug of ["paimos", "pharos", "janus", "aithema"]) {
    const counts = [];
    for (const locale of ["", "de/"]) {
      const content = await source(`content/${locale}${slug}.ts`);
      // Lead depths predate this task; count only the new model-step fields.
      const sentences = [...content.matchAll(/^        simple: "([^"]+)",$/gm)].map((match) => match[1]);
      const steps = (content.match(/number: "/g) ?? []).length;
      assert.equal(sentences.length, steps, `${locale}${slug}`);
      counts.push(steps);
      newCopy.push(...sentences);
      sentences.forEach((sentence) => assert.equal((sentence.match(/[.!?]/g) ?? []).length, 1, sentence));
    }
    assert.equal(counts[0], counts[1]);
  }
  const umbrella = await source("pages/index.astro");
  newCopy.push(...[...umbrella.matchAll(/simple: copy\("([^"]+)", "([^"]+)"\)/g)].flatMap((match) => [match[1], match[2]]));
  assert.doesNotMatch(newCopy.join("\n"), /https?:|\b(?:hsb|csb|mbp)\d|\b\w+\.(?:com|at|cm|net|internal)\b|netcup|hetzner|storage box|openai|anthropic|aws|azure|\/Users\/|\/home\//i);
});
