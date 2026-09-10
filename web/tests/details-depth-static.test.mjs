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

test("shared depth folds measure live pixels, guard completion, reverse and initialize before drawers", async () => {
  const control = await source("components/DetailsControl.astro");
  for (const token of ["[data-depth-min], [data-depth-max]", "getBoundingClientRect", "scrollHeight", "transitionend", 'event.propertyName === "height"', "prefers-reduced-motion", "pending.get(element)?.()", "is-folding", "is-folded", "element.inert = closed"]) assert.ok(control.includes(token), token);
  assert.ok(control.indexOf("foldTo(level, false);") < control.indexOf('querySelectorAll<HTMLElement>("[data-drawer]")'));
  assert.ok(control.indexOf("const snapshots =") < control.indexOf('root.setAttribute("data-details-level", next)'));
  assert.match(control, /const FOLD_STAGGER_MS = 25;/);
  assert.match(control, /const FOLD_STAGGER_CAP = 8;/);
  assert.match(control, /Math\.min\(activeIndex, FOLD_STAGGER_CAP\) \* FOLD_STAGGER_MS/);
  assert.match(control, /Math\.max\(snapshots\[index\]\.height, target\.height\)/);
  assert.match(control, /Math\.min\(height, FOLD_HEIGHT_CAP_PX\) \/ FOLD_HEIGHT_CAP_PX/);
  assert.match(control, /style\.transitionDuration = `\$\{duration\}ms`/);
  assert.match(control, /setTimeout\(finish, duration \+ delay \+ FOLD_TIMEOUT_BUFFER_MS\)/);
  assert.match(control, /String\(Math\.min\(index, 8\)\)/);
  assert.doesNotMatch(control, /is:inline/);
  const css = await source("styles/details-control.css");
  assert.match(css, /transition-property: height, opacity, margin-block-start, margin-block-end, padding-block-start, padding-block-end;/);
  assert.match(css, /transition-timing-function: cubic-bezier\(0\.22, 1, 0\.36, 1\)/);
  assert.match(css, /\.is-folding[^}]*margin-block: 0;[^}]*padding-block: 0;/);
  assert.match(css, /\.is-folded[^}]*display: none;/);
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
  assert.doesNotMatch(depthStyles, /html\[data-details-level="simple"\] \.site-footer/);
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
      for (const id of ["specs", "architecture", "trust", "open-source"]) boundary(page, `id="${id}"`);
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

test("Simple preserves the Standard hero layout and typography", async () => {
  const css = await source("styles/details-control.css");
  for (const selector of ["product-hero", "umbrella-hero", "product-hero__copy", "umbrella-hero__copy", "hero-lead", "umbrella-hero__lead", "button-row"]) {
    assert.doesNotMatch(css, new RegExp(`data-details-level="simple"[^}]*\\.${selector}`), selector);
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
