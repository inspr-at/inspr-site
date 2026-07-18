import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { stat } from "node:fs/promises";
import test from "node:test";

const sourceUrl = new URL("../src/", import.meta.url);
const contentUrl = new URL("content/", sourceUrl);

const products = [
  {
    slug: "paimos",
    exportName: "paimosContent",
    canonical: "https://paimos.inspr.at",
    licensePattern: /name:\s*"AGPL-3\.0-only"/,
  },
  {
    slug: "pharos",
    exportName: "pharosContent",
    canonical: "https://pharos.inspr.at",
    licensePattern: /name:\s*"AGPL-3\.0-only"/,
  },
  {
    slug: "janus",
    exportName: "janusContent",
    canonical: "https://janus.inspr.at",
    licensePattern: /name:\s*"AGPL-3\.0-only"/,
  },
];

async function source(relativePath) {
  return readFile(new URL(relativePath, sourceUrl), "utf8");
}

test("each product route renders its canonical content through ProductPage", async () => {
  const urls = await source("content/urls.ts");

  for (const { slug, exportName, canonical } of products) {
    const route = await source(`pages/${slug}/index.astro`);

    assert.match(
      route,
      /import ProductPage from "\.\.\/\.\.\/components\/ProductPage\.astro";/,
      `${slug} must use the shared product page`,
    );
    assert.match(
      route,
      new RegExp(`import \\{ ${exportName} \\} from "\\.\\.\\/\\.\\.\\/content\\/${slug}";`),
      `${slug} must import its own content`,
    );
    assert.match(
      route,
      new RegExp(`<ProductPage content=\\{${exportName}\\} \\/>`),
      `${slug} must pass its content to ProductPage`,
    );
    assert.ok(
      urls.includes(`${slug}: "${canonical}"`),
      `${slug} canonical URL must remain centralized in content/urls.ts`,
    );
  }
});

test("product copy contains no em dashes and no hardcoded business host", async () => {
  for (const { slug } of products) {
    const content = await source(`content/${slug}.ts`);

    assert.ok(!content.includes("\u2014"), `${slug} content contains an em dash`);
    assert.doesNotMatch(
      content,
      /https:\/\/(?:amt\.inspr\.at|augmentoring\.com)/,
      `${slug} must use the centralized business URL instead of a hardcoded host`,
    );
    assert.match(
      content,
      /import \{ siteUrls \} from "\.\/urls";/,
      `${slug} must consume centralized site URLs`,
    );
    assert.match(
      content,
      /primaryHref:\s*"#model"/,
      `${slug} hero CTA must target the rendered operating-model section`,
    );
  }
});

test("all product license claims match repository metadata", async () => {
  for (const { slug, licensePattern } of products) {
    const content = await source(`content/${slug}.ts`);
    assert.match(content, licensePattern, `${slug} has an unexpected license claim`);
  }

  for (const { slug } of products) {
    const content = await source(`content/${slug}.ts`);
    assert.match(content, /name:\s*"AGPL-3\.0-only"/);
    assert.doesNotMatch(content, /name:\s*"MIT"/);
  }
});

test("each canonical host publishes its own robots and sitemap pair", async () => {
  const rootRobots = await readFile(new URL("../public/robots.txt", import.meta.url), "utf8");
  const rootSitemap = await readFile(new URL("../public/sitemap.xml", import.meta.url), "utf8");

  assert.match(rootRobots, /https:\/\/www\.inspr\.at\/sitemap\.xml/);
  assert.match(rootSitemap, /<loc>https:\/\/www\.inspr\.at\/<\/loc>/);

  for (const { slug, canonical } of products) {
    const robots = await readFile(new URL(`../public/${slug}/robots.txt`, import.meta.url), "utf8");
    const sitemap = await readFile(new URL(`../public/${slug}/sitemap.xml`, import.meta.url), "utf8");

    assert.match(robots, new RegExp(`${canonical.replaceAll(".", "\\.")}\\/sitemap\\.xml`));
    assert.ok(sitemap.includes(`<loc>${canonical}/</loc>`));
  }
});

test("all four microsites render claim visuals and accessible workflow controls", async () => {
  const productPage = await source("components/ProductPage.astro");
  const workflow = await source("components/WorkflowExplorer.astro");
  const umbrella = await source("pages/index.astro");

  assert.match(productPage, /<WorkflowExplorer/);
  assert.match(productPage, /content\.slug === "paimos" && <PaimosProductSurface/);
  assert.match(productPage, /data-integration-filter/);
  assert.match(workflow, /role="tablist"/);
  assert.match(workflow, /aria-selected/);
  assert.match(workflow, /prefers-reduced-motion: reduce/);
  assert.match(workflow, /IntersectionObserver/);
  assert.match(umbrella, /title="Continuity is the advantage\."/);

  const assets = [
    "assets/products/inspr/continuity.png",
    "assets/products/paimos/context-ledger.png",
    "assets/products/pharos/fleet-gate.png",
    "assets/products/janus/value-boundary.png",
    "assets/products/paimos/product-surface.png",
  ];
  for (const asset of assets) {
    const metadata = await stat(new URL(asset, sourceUrl));
    assert.ok(metadata.size > 10_000, `${asset} must be a real image asset`);
  }
});

test("workflow stages expose icons, evidence signals and source references", async () => {
  for (const { slug } of products) {
    const content = await source(`content/${slug}.ts`);
    const model = content.slice(content.indexOf("model:"), content.indexOf("featureSections:"));

    assert.match(model, /icon:/, `${slug} workflow needs contextual SVG icons`);
    assert.match(model, /signal:/, `${slug} workflow needs a concrete result signal`);
    assert.match(model, /reference:/, `${slug} workflow needs inspectable evidence`);
    assert.match(content, /github\.com\/markus-barta\//, `${slug} evidence must link to source`);
  }
});

test("the positive INSPR product constellation remains present", async () => {
  const umbrella = await source("pages/index.astro");

  assert.match(umbrella, /Three focused tools\. One coherent way of working\./);
  assert.match(umbrella, /class="product-showcase"/);
  assert.match(umbrella, /class:list=\{\["product-story"/);
  assert.match(umbrella, /Explore \{product\.name\}/);
});
