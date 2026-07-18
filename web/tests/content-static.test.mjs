import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { stat } from "node:fs/promises";
import test from "node:test";
import {
  createReleaseMetadata,
  releaseManifest,
} from "../release-metadata.mjs";

const sourceUrl = new URL("../src/", import.meta.url);

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

test("interactive explorers use one five-second, pause-only lifecycle", async () => {
  const workflow = await source("components/WorkflowExplorer.astro");
  const surface = await source("components/PaimosProductSurface.astro");

  for (const [name, component] of [["workflow", workflow], ["surface", surface]]) {
    assert.match(component, /STAGE_DURATION = 5000/, `${name} must advance every five seconds`);
    assert.match(component, /\.animate\(/, `${name} must animate elapsed stage time`);
    assert.match(component, /easing: "linear"/, `${name} progress must remain linear`);
    assert.match(component, /pointerenter/, `${name} stages must respond to hover`);
    assert.match(component, /IntersectionObserver/, `${name} must stop work offscreen`);
    assert.match(component, /focusin/, `${name} must hold while keyboard focus is inside`);
    assert.match(component, /focusout/, `${name} must resume after focus leaves`);
    assert.match(
      component,
      /querySelector\(":focus-visible"\)/,
      `${name} must not treat residual pointer focus as an interaction hold`,
    );
    assert.match(component, /AbortController/, `${name} must clean up its interaction listeners`);
    assert.match(component, /animation\.cancel\(\)/, `${name} must release finished animations`);
    assert.match(component, />Pause</, `${name} exposes one stable pause label`);
    assert.doesNotMatch(component, /Play sequence/, `${name} must not expose a play control`);
    assert.doesNotMatch(
      component,
      /Resume automatic progression/,
      `${name} must keep the Pause toggle's accessible name stable`,
    );
  }

  assert.match(workflow, /data-workflow-annotation/);
  assert.match(workflow, /experience\.addEventListener\(\s*"pointerenter"/);
  assert.match(workflow, /observer\.observe\(observedControl\)/);
  assert.match(surface, /interactionArea\.addEventListener\(\s*"pointerenter"/);
  assert.match(surface, /observer\.observe\(observedDetails\)/);
  assert.match(surface, /data-surface-progress/);
  assert.doesNotMatch(
    surface,
    /interactionArea\.contains\(document\.activeElement\)/,
    "surface autoplay must not be locked by residual pointer focus",
  );
  assert.match(surface, /\.product-surface__toggle \{\s*min-height: 2\.75rem;/);
  assert.match(workflow, /\.workflow__toggle \{\s*min-height: 2\.75rem;/);
});

test("workflow stages map their explanation back onto each image", async () => {
  const umbrella = await source("pages/index.astro");
  const janus = await source("content/janus.ts");
  assert.match(umbrella, /visual: \{ x: 18, y: 61 \}/);
  assert.match(janus, /visual: \{ x: 15, y: 50 \}/);
  assert.match(janus, /visual: \{ x: 55, y: 50 \}/);
  assert.match(janus, /visual: \{ x: 80, y: 47 \}/);

  for (const { slug } of products) {
    const content = await source(`content/${slug}.ts`);
    const model = content.slice(content.indexOf("model:"), content.indexOf("featureSections:"));
    assert.match(model, /visual: \{ x: \d+, y: \d+ \}/, `${slug} needs image-linked stages`);
  }
});

test("the identity utility uses the unmodified official ZITADEL mark", async () => {
  const umbrella = await source("pages/index.astro");
  const footer = await source("components/MicrositeFooter.astro");
  const logo = await readFile(
    new URL("assets/brands/zitadel-logo-solo-dark-icon.svg", sourceUrl),
  );
  const digest = createHash("sha256").update(logo).digest("hex");

  assert.equal(digest, "6767d70158d40a666378108c1fc22cfd10f2295615c68c35c104605973e6a07c");
  assert.match(umbrella, /zitadel-logo-solo-dark-icon\.svg/);
  assert.match(umbrella, /alt="ZITADEL logo"/);
  assert.match(umbrella, /Self-hosted/);
  assert.match(umbrella, /powered by ZITADEL/);
  assert.match(footer, /ZITADEL identity/);
});

test("Janus headlines use the precise IBM Plex Sans display family", async () => {
  const layout = await source("layouts/MicrositeLayout.astro");
  const styles = await source("styles/microsites.css");
  const manifest = await readFile(new URL("../package.json", import.meta.url), "utf8");

  assert.match(layout, /@fontsource-variable\/ibm-plex-sans/);
  assert.match(styles, /--font-display: "IBM Plex Sans Variable"/);
  assert.match(manifest, /"@fontsource-variable\/ibm-plex-sans"/);
  assert.doesNotMatch(layout, /@fontsource-variable\/sora/);
  assert.doesNotMatch(manifest, /"@fontsource-variable\/sora"/);
  assert.doesNotMatch(styles, /Unbounded Variable/);
});

test("one validated release identity is visible across the site family", async () => {
  const revision = "0123456789abcdef0123456789abcdef01234567";
  const deployedAt = "2026-07-18T15:30:00Z";
  const releaseId = "20260718T153000Z-0123456789ab";
  const metadata = createReleaseMetadata(
    {
      INSPR_GIT_SHA: revision,
      INSPR_GIT_DIRTY: "0",
      INSPR_RELEASE_ID: releaseId,
      INSPR_DEPLOYED_AT: deployedAt,
    },
    { revision: "ffffffffffffffffffffffffffffffffffffffff", dirty: true },
  );

  assert.equal(metadata.gitRevision, revision.slice(0, 12));
  assert.equal(metadata.gitLabel, revision.slice(0, 12));
  assert.equal(metadata.releaseId, releaseId);
  assert.equal(metadata.deployedAt, deployedAt);
  assert.equal(metadata.isDeployment, true);
  assert.deepEqual(releaseManifest(metadata).deployment, {
    releaseId,
    deployedAt,
  });

  const local = createReleaseMetadata(
    {},
    { revision: "fedcba9876543210fedcba9876543210fedcba98", dirty: true },
  );
  assert.equal(local.releaseId, "local");
  assert.equal(local.deployedAt, null);
  assert.equal(local.gitLabel, "fedcba987654-dirty");
  assert.equal(local.isDeployment, false);

  assert.throws(
    () => createReleaseMetadata(
      { INSPR_RELEASE_ID: releaseId },
      { revision, dirty: false },
    ),
    /must be supplied together/,
  );
  assert.throws(
    () => createReleaseMetadata(
      { INSPR_GIT_DIRTY: "1" },
      { revision, dirty: false },
    ),
    /must be supplied together/,
  );

  const footer = await source("components/MicrositeFooter.astro");
  assert.match(footer, /import \{ releaseMetadata \}/);
  assert.match(footer, /aria-label="Site release"/);
  assert.match(footer, /data-release-id=\{releaseMetadata\.releaseId\}/);
  assert.match(footer, /<dt>Site<\/dt>/);
  assert.match(footer, /<dt>Git<\/dt>/);
  assert.match(footer, /<dt>Release<\/dt>/);
  assert.match(footer, /<dt>Deployed<\/dt>/);

  const manifestWriter = await readFile(
    new URL("../scripts/write-release-manifest.mjs", import.meta.url),
    "utf8",
  );
  const deploy = await readFile(new URL("../../deploy.sh", import.meta.url), "utf8");
  assert.match(manifestWriter, /dist\/release\.json/);
  assert.match(deploy, /INSPR_GIT_SHA="\$GIT_SHA"/);
  assert.match(deploy, /INSPR_RELEASE_ID="\$RELEASE_ID"/);
  assert.match(deploy, /INSPR_DEPLOYED_AT="\$DEPLOYED_AT"/);
  assert.match(deploy, /read_release_manifest/);
  assert.match(deploy, /RELEASE_ID="\$MANIFEST_RELEASE_ID"/);
  assert.match(deploy, /RELEASE_TARGET="builds\/\$RELEASE_ID"/);
  assert.match(deploy, /refusing to deploy a dirty working tree/);
  assert.match(deploy, /source changed during the build; refusing remote writes/);
  assert.match(deploy, /data-release-id=/);
});
