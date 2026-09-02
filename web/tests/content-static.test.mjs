import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  chmod,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
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

function relativeLuminance(hex) {
  const channels = hex.match(/[0-9a-f]{2}/gi).map((channel) => {
    const normalized = Number.parseInt(channel, 16) / 255;
    return normalized <= 0.04045
      ? normalized / 12.92
      : ((normalized + 0.055) / 1.055) ** 2.4;
  });

  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function contrastRatio(foreground, background) {
  const luminances = [relativeLuminance(foreground), relativeLuminance(background)]
    .sort((left, right) => right - left);
  return (luminances[0] + 0.05) / (luminances[1] + 0.05);
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

test("microsites keep an accessible mobile section menu", async () => {
  const header = await source("components/MicrositeHeader.astro");
  const styles = await source("styles/microsites.css");

  assert.match(header, /<details class="mobile-navigation" data-mobile-navigation>/);
  assert.match(header, /mobile: "Mobile navigation"/);
  assert.match(header, /aria-label=\{labels\.mobile\}/);
  assert.match(header, /event\.key !== "Escape"/);
  assert.match(styles, /@media \(max-width: 72rem\)[\s\S]*?\.mobile-navigation \{\s*display: block;/);
});

test("the three-engine browser gate stays within the constrained CI runner", async () => {
  const config = await readFile(
    new URL("../playwright.config.mjs", import.meta.url),
    "utf8",
  );
  const workflow = await readFile(
    new URL("../../.github/workflows/ci.yml", import.meta.url),
    "utf8",
  );

  assert.match(config, /workers: process\.env\.CI \? 1 : undefined/);
  assert.match(config, /fullyParallel: true/);
  assert.match(config, /retries: process\.env\.CI \? 1 : 0/);
  assert.match(workflow, /npm run test:browser -- --project=chromium/);
  assert.match(workflow, /npm run test:browser -- --project=firefox/);
  for (const shard of [1, 2, 3, 4]) {
    assert.match(
      workflow,
      new RegExp(`npm run test:browser -- --project=webkit --shard=${shard}/4`),
    );
  }
});

test("the CSP verifier rejects stale pins even when no inline scripts exist", async () => {
  const fixture = await mkdtemp(join(tmpdir(), "inspr-csp-"));

  try {
    await mkdir(join(fixture, "web", "dist"), { recursive: true });
    await mkdir(join(fixture, "site"), { recursive: true });
    await writeFile(join(fixture, "web", "dist", "index.html"), "<!doctype html><title>Current</title>");
    await writeFile(join(fixture, "site", "index.html"), "<!doctype html><title>Archive</title>");
    await writeFile(
      join(fixture, "Caddyfile"),
      "header Content-Security-Policy \"script-src 'self' 'sha256-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA='\"\n",
    );

    const result = spawnSync(
      "python3",
      [fileURLToPath(new URL("../scripts/verify-csp.py", import.meta.url)), "--root", fixture],
      { encoding: "utf8" },
    );

    assert.equal(result.status, 1);
    assert.match(result.stderr, /INFO: no inline scripts found/);
    assert.match(result.stderr, /FAIL: pinned hashes no longer used/);
  } finally {
    await rm(fixture, { recursive: true, force: true });
  }
});

test("the shared Pharos mark is the canonical low-complexity SVG", async () => {
  const mark = await source("assets/products/pharos/mark.svg");

  assert.match(mark, /viewBox="0 0 88 88"/);
  assert.match(mark, /stroke="#d69b31"/);
  assert.doesNotMatch(mark, /<image/);
  assert.ok((mark.match(/<(?:path|rect)\b/g) ?? []).length <= 12);
});

test("the umbrella links its public site, product sources and direct license", async () => {
  const umbrella = await source("pages/index.astro");

  assert.match(umbrella, /const repositoryUrl = "https:\/\/github\.com\/inspr-at\/inspr-site";/);
  assert.match(umbrella, /const productSourcesUrl = `\$\{repositoryUrl\}#product-sources`;/);
  assert.match(umbrella, /const modulesUrl = "https:\/\/github\.com\/inspr-at\/inspr-modules";/);
  assert.doesNotMatch(umbrella, /https:\/\/github\.com\/inspr-at\/inspr(?:["'`/]|$)/);
  assert.match(umbrella, /const siteLicenseUrl = `\$\{repositoryUrl\}\/blob\/main\/LICENSE`/);
  assert.match(umbrella, /licenseName="AGPL-3\.0-only"/);
  assert.match(umbrella, /licenseUrl=\{siteLicenseUrl\}/);
});

test("the handoff guide teaches four stable, keyboard-inspectable questions", async () => {
  const packet = await source("components/SituationPacket.astro");

  assert.match(packet, /role="tablist"/);
  assert.match(packet, /role="tab"/);
  assert.match(packet, /role="tabpanel"/);
  assert.match(packet, /aria-selected/);
  assert.match(packet, /What are we trying to achieve\?/);
  assert.match(packet, /What is true right now\?/);
  assert.match(packet, /What may this task do\?/);
  assert.match(packet, /How do we know it worked\?/);
  assert.match(packet, /One concrete handoff/);
  assert.match(packet, /Why it matters/);
  assert.match(packet, /event\.key === "ArrowRight"/);
  assert.match(packet, /event\.key === "Home"/);
  assert.doesNotMatch(packet, /aria-pressed/);
  assert.doesNotMatch(packet, /data-signal-state/);
  assert.doesNotMatch(packet, /Complete · 4\/4/);
  assert.doesNotMatch(packet, /Ready for bounded work/);
});

test("the frozen archive redirects its historical identity entry before file handling", async () => {
  const caddy = await readFile(new URL("../../Caddyfile", import.meta.url), "utf8");
  const redirectIndex = caddy.indexOf("@archive_enter");
  const archiveIndex = caddy.indexOf("@archive host v1.inspr.at");

  assert.ok(redirectIndex >= 0 && redirectIndex < archiveIndex);
  assert.match(caddy, /redir @archive_enter https:\/\/inspr\.at\/enter 308/);
});

test("apex and identity edge routes enforce HTTPS and HSTS", async () => {
  const compose = await readFile(new URL("../../docker-compose.yml", import.meta.url), "utf8");
  const deploy = await readFile(new URL("../../deploy.sh", import.meta.url), "utf8");

  assert.match(compose, /inspr-edge-hsts\.headers\.stsSeconds=31536000/);
  assert.match(compose, /inspr-edge-hsts\.headers\.stsIncludeSubdomains=true/);
  assert.match(compose, /inspr-edge-hsts\.headers\.stsPreload=true/);
  assert.match(compose, /inspr-apex\.middlewares=inspr-edge-hsts@docker,/);
  assert.match(compose, /inspr-auth\.middlewares=[^\n]*inspr-edge-hsts@docker/);
  assert.match(compose, /zitadel\.middlewares=[^\n]*inspr-edge-hsts@docker/);
  assert.match(compose, /zitadel-http\.rule=Host\(`auth\.inspr\.at`\)/);
  assert.match(compose, /zitadel-http\.middlewares=inspr-sites-https@docker/);
  assert.match(deploy, /identity service HTTPS/);
  assert.match(deploy, /identity HTTP upgrade/);
  assert.match(deploy, /Strict-Transport-Security missing/);
  // The containers are declared in nixcfg (OPS-136): deploy.sh must never
  // reconcile them through the legacy compose project. It may only promote
  // the bind-mounted Caddyfile and restart the stateless edge to re-bind it.
  assert.doesNotMatch(deploy, /docker compose/);
  assert.doesNotMatch(deploy, /LOCAL_COMPOSE_HASH|REMOTE_COMPOSE_HASH/);
  assert.doesNotMatch(deploy, /remote_hash\s+"docker-compose\.yml"/);
  assert.doesNotMatch(deploy, /\$ROOT\/docker-compose\.yml/);
  assert.match(deploy, /docker restart inspr-www/);
  assert.match(deploy, /automatic web edge rollback needs operator attention/);
});

test("identity edge rejects the deployed sibling-header spoof contract", () => {
  const contract = spawnSync(
    process.execPath,
    [fileURLToPath(new URL("../../auth/check-edge-contract.mjs", import.meta.url))],
    { encoding: "utf8" },
  );
  assert.equal(contract.status, 0, contract.stderr || contract.stdout);
  assert.match(contract.stdout, /inspr-auth edge contract: ok/);
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
      /import \{ productTaxonomy, siteUrls \} from "\.\/urls";/,
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
  assert.match(rootSitemap, /<loc>https:\/\/www\.inspr\.at\/de\/<\/loc>/);
  assert.match(rootSitemap, /<loc>https:\/\/www\.inspr\.at\/overview\/<\/loc>/);
  assert.match(rootSitemap, /<loc>https:\/\/www\.inspr\.at\/de\/ueberblick\/<\/loc>/);

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
  assert.match(umbrella, /The work moves\. You decide when\./);

  const assets = [
    "assets/products/inspr/continuity.png",
    "assets/products/paimos/context-ledger.png",
    "assets/products/pharos/fleet-gate.png",
    "assets/products/janus/value-boundary.png",
    "assets/products/paimos/product-surface.png",
    "assets/products/paimos/ui-agent-mode.png",
  ];
  for (const asset of assets) {
    const metadata = await stat(new URL(asset, sourceUrl));
    assert.ok(metadata.size > 10_000, `${asset} must be a real image asset`);
  }
});

test("integration matrices expose a caption and scoped headers", async () => {
  const productPage = await source("components/ProductPage.astro");

  assert.match(productPage, /<caption class="visually-hidden">\{labels\.integrationTableAria\}<\/caption>/);
  assert.equal((productPage.match(/<th scope="col">/g) ?? []).length, 3);
  assert.match(productPage, /<th scope="row">\{item\.name\}<\/th>/);
  assert.match(productPage, /class="table-wrap" role="region" tabindex="0" aria-label=\{labels\.integrationTableAria\}/);
});

test("each product problem section uses a distinct explanatory visual", async () => {
  const productPage = await source("components/ProductPage.astro");
  const problemVisual = await source("components/FractureAtlas.astro");

  const assets = [
    "assets/products/paimos/problem-context.png",
    "assets/products/pharos/problem-evidence.png",
    "assets/products/janus/problem-boundary.png",
  ];
  for (const asset of assets) {
    const metadata = await stat(new URL(asset, sourceUrl));
    assert.ok(metadata.size > 10_000, `${asset} must be a real image asset`);
  }

  assert.match(productPage, /paimos\/problem-context\.png/);
  assert.match(productPage, /pharos\/problem-evidence\.png/);
  assert.match(productPage, /janus\/problem-boundary\.png/);
  assert.match(problemVisual, /<Image/);
  assert.match(problemVisual, /alt=\{alt\}/);
  assert.match(problemVisual, /<figcaption>\{caption\}<\/figcaption>/);
  assert.doesNotMatch(
    problemVisual,
    /Disconnected signals create operational blind spots/,
  );

  for (const { slug } of products) {
    const content = await source(`content/${slug}.ts`);
    assert.match(content, /visualAlt:/);
    assert.match(content, /visualCaption:/);
  }
});

test("all four hero loops preserve the static poster and motion controls", async () => {
  const productPage = await source("components/ProductPage.astro");
  const umbrella = await source("pages/index.astro");
  const heroLoop = await source("components/HeroLoop.astro");

  const mappings = [
    ["inspr", "insprHeroLoop", "inspr/hero-loop.mp4"],
    ["paimos", "paimosHeroLoop", "paimos/hero-loop.mp4"],
    ["pharos", "pharosHeroLoop", "pharos/hero-loop.mp4"],
    ["janus", "janusHeroLoop", "janus/hero-loop.mp4"],
  ];
  for (const [slug, importName, relativeAsset] of mappings) {
    const host = slug === "inspr" ? umbrella : productPage;
    assert.match(host, new RegExp(`import ${importName} from "\\.\\.\/assets\/products\/${relativeAsset}"`));
    const media = await stat(new URL(`assets/products/${relativeAsset}`, sourceUrl));
    assert.ok(media.size >= 250 * 1024, `${slug} hero loop must be a real video`);
    assert.ok(media.size <= 3 * 1024 * 1024, `${slug} hero loop exceeds 3 MiB`);
  }

  assert.match(umbrella, /<HeroLoop[\s\S]*?id="inspr"[\s\S]*?video=\{insprHeroLoop\}/);
  assert.match(productPage, /heroLoop: paimosHeroLoop/);
  assert.match(productPage, /heroLoop: pharosHeroLoop/);
  assert.match(productPage, /heroLoop: janusHeroLoop/);
  assert.match(productPage, /<HeroLoop[\s\S]*?id=\{content\.slug\}[\s\S]*?poster=\{assets\.hero\}[\s\S]*?video=\{assets\.heroLoop\}/);

  assert.match(heroLoop, /autoplay=\{activation === "autoplay"\}/);
  for (const attribute of ["muted", "loop", "playsinline"]) {
    assert.match(heroLoop, new RegExp(`\\n\\s+${attribute}\\n`));
  }
  assert.match(heroLoop, /preload=\{activation === "autoplay" \? "metadata" : "none"\}/);
  assert.match(heroLoop, /poster=\{poster\.src\}/);
  assert.match(heroLoop, /media="\(prefers-reduced-motion: no-preference\)"/);
  assert.match(heroLoop, /<Image[\s\S]*?class="hero-loop__poster"/);
  assert.match(heroLoop, /position: absolute;[\s\S]*?inset: 0;/);
  assert.match(heroLoop, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(heroLoop, /\.hero-loop__video,[\s\S]*?\.hero-loop__control \{[\s\S]*?display: none;/);
  assert.match(heroLoop, /Resume hero animation/);
  assert.match(heroLoop, /IntersectionObserver/);
  assert.doesNotMatch(heroLoop, /is:inline/);
});

test("inspectable rails keep compact desktop labels above minimum contrast", async () => {
  const styles = await source("styles/microsites.css");
  const compactColor = styles.match(/--inspectable-muted: (#[0-9a-f]{6});/i)?.[1];

  assert.equal(compactColor, "#586b79");
  assert.ok(contrastRatio(compactColor, "#fffdf9") >= 4.5);
  assert.ok(contrastRatio(compactColor, "#f8f5ef") >= 4.5);
  assert.match(
    styles,
    /\.inspectable-rail__index \{[\s\S]*?color: var\(--inspectable-muted\);/,
  );
  assert.match(
    styles,
    /\.inspectable-rail__selector-copy small \{[\s\S]*?color: var\(--inspectable-muted\);/,
  );
  assert.match(
    styles,
    /\.inspectable-rail__map-node \{[\s\S]*?color: var\(--inspectable-muted\);/,
  );
  assert.match(
    styles,
    /\.section--ink \.inspectable-rail \{\s*--inspectable-muted: var\(--night-soft\);/,
  );
});

test("Paimos screenshot tabs use neutral tabpanel hosts", async () => {
  const surface = await source("components/PaimosProductSurface.astro");

  assert.match(surface, /<div\s+id=\{`surface-panel-\$\{index\}`\}\s+role="tabpanel"/);
  assert.doesNotMatch(surface, /<article\s+id=\{`surface-panel-/);
  assert.match(surface, /\.product-surface__details \[data-surface-panel\] \{/);
  assert.match(surface, /\.product-surface__details \[data-surface-panel\]\[hidden\] \{/);
  assert.doesNotMatch(surface, /\.product-surface__details article/);
});

test("Paimos public evidence keeps release and capture provenance honest", async () => {
  const content = await source("content/paimos.ts");
  const productPage = await source("components/ProductPage.astro");
  const surface = await source("components/PaimosProductSurface.astro");

  assert.match(surface, /import captureManifest from .*capture-manifest\.json/);
  assert.match(surface, /import uiAgentMode from .*ui-agent-mode\.png/);
  assert.match(surface, /title: "Agent Mode"/);
  assert.match(surface, /const captureRelease = `v\$\{captureManifest\.release\}`;/);
  assert.match(surface, /figcaption: `Demo workspace, Paimos \$\{captureRelease\} — seeded synthetic data\.`/);
  assert.match(surface, /figcaption: `Demo-Arbeitsbereich, Paimos \$\{captureRelease\}: synthetisch befüllte Demo-Daten\.`/);
  assert.match(surface, /<figcaption>\{labels\.figcaption\}<\/figcaption>/);
  assert.match(surface, /Demo workspace, Paimos \$\{captureRelease\}/);
  assert.match(surface, /Demo-Arbeitsbereich, Paimos \$\{captureRelease\}/);
  assert.doesNotMatch(surface, /current build/);
  assert.match(surface, /seeded synthetic data/);
  assert.match(content, /runner-declared before\/after commit range beside the outcome/);
  assert.match(content, /repository authority remains local/);
  assert.match(content, /label: "Agent run evidence"[\s\S]*?docsUrl\("AGENT_INTEGRATION\.md"\)/);
  assert.match(content, /title: "Durable agent handoffs"/);
  assert.match(content, /Sender allowlists, typed action holds and an untrusted-data frame/);
  assert.match(content, /label: "Agent message security"[\s\S]*?docsUrl\("AGENT_MESSAGE_SECURITY\.md"\)/);
  assert.match(productPage, /id="trust"/);
  assert.match(productPage, /id="limits"/);

  const captureCheck = spawnSync(process.execPath, ["scripts/sync-paimos-captures.mjs", "--check"], {
    cwd: fileURLToPath(new URL("..", import.meta.url)),
    encoding: "utf8",
  });
  assert.equal(captureCheck.status, 0, captureCheck.stderr || captureCheck.stdout);
});

test("Paimos product loops stay lazy, bounded and inside the PhotoSwipe gallery", async () => {
  const surface = await source("components/PaimosProductSurface.astro");
  const manifest = JSON.parse(
    await source("assets/products/paimos/capture-manifest.json"),
  );

  assert.match(surface, /import loopIssueWorkbench from .*loop-issue-workbench\.mp4/);
  assert.match(surface, /import loopSearchNavigate from .*loop-search-navigate\.mp4/);
  assert.equal(surface.match(/kind: "video" as const/g)?.length, 1);
  assert.equal(surface.match(/id: "(?:issue-workbench|search-navigate)-flow"/g)?.length, 2);
  assert.match(surface, /data-pswp-type=\{view\.kind === "video" \? "video" : undefined\}/);
  assert.match(surface, /loading="lazy"/);
  assert.doesNotMatch(surface, /<video[\s>]/);

  assert.match(surface, /lightbox\.on\("contentLoad"/);
  assert.match(surface, /video\.preload = "none"/);
  assert.match(surface, /lightbox\.on\("contentActivate"/);
  assert.match(surface, /video\.src = content\.data\.videoSrc/);
  assert.match(surface, /lightbox\.on\("contentDeactivate"/);
  assert.match(surface, /lightbox\.on\("contentDestroy"/);
  assert.match(surface, /video\.removeAttribute\("src"\)/);

  assert.equal(manifest.schemaVersion, 2);
  assert.match(manifest.release, /^\d+\.\d+\.\d+$/);
  assert.match(manifest.sourceCommit, /^[0-9a-f]{40}$/);
  assert.deepEqual(
    manifest.videos.map(({ name }) => name),
    ["loop-issue-workbench.mp4", "loop-search-navigate.mp4"],
  );
  assert.ok(manifest.videos.every(({ durationSeconds }) =>
    durationSeconds >= 5 && durationSeconds <= 15
  ));
  assert.ok(manifest.videos.reduce((total, { bytes }) => total + bytes, 0) <= 3 * 1024 * 1024);
});

test("Pharos states release and provider maturity without overclaiming", async () => {
  const pharos = await source("content/pharos.ts");

  assert.match(pharos, /github\.com\/inspr-at\/pharos\/releases/);
  assert.doesNotMatch(pharos, /v0\.1\.4[13]/);
  assert.match(pharos, /status: "Read-only live"/);
  assert.match(pharos, /read-only provider checks are live/);
  assert.match(pharos, /Managed execution is disabled pending attended production acceptance/);
  assert.doesNotMatch(pharos, /connector is implemented and deployed/);
});

test("workflow stages expose icons, evidence signals and source references", async () => {
  for (const { slug } of products) {
    const content = await source(`content/${slug}.ts`);
    const model = content.slice(content.indexOf("model:"), content.indexOf("featureSections:"));

    assert.match(model, /icon:/, `${slug} workflow needs contextual SVG icons`);
    assert.match(model, /signal:/, `${slug} workflow needs a concrete result signal`);
    assert.match(model, /reference:/, `${slug} workflow needs inspectable evidence`);
    assert.match(content, /github\.com\/inspr-at\//, `${slug} evidence must link to source`);
  }
});

test("the July 18 editorial product showcase remains accessible", async () => {
  const umbrella = await source("pages/index.astro");
  const productStart = umbrella.indexOf('<section\n      class="umbrella-products');
  const productEnd = umbrella.indexOf('<section\n      class="identity-utility');
  const showcase = umbrella.slice(productStart, productEnd);

  assert.match(umbrella, /Four tools, each with one clear job\./);
  assert.ok(productStart >= 0 && productEnd > productStart);
  assert.match(showcase, /data-section-pattern="editorial-product-stories"/);
  assert.match(showcase, /class="product-showcase"/);
  assert.match(showcase, /class="product-story-link"/);
  assert.match(showcase, /class="product-story-link"[\s\S]*?<article class:list=/);
  assert.match(showcase, /target="_blank"/);
  assert.match(showcase, /rel="noopener noreferrer"/);
  assert.match(showcase, /aria-labelledby=\{`product-\$\{product\.name\.toLowerCase\(\)\}-link`\}/);
  assert.match(showcase, /opens in a new tab/);
  assert.equal(showcase.match(/href=\{product\.href\}/g)?.length, 1);
  assert.match(umbrella, /\.product-story-link:focus-visible/);
  assert.doesNotMatch(showcase, /ProductConstellation|product-constellation/);
  assert.doesNotMatch(showcase, /<a class="product-story__visual"/);
  assert.match(umbrella, /name: "Aithema"/);
  assert.match(umbrella, /href: siteUrls\.aithema/);
  assert.match(umbrella, /logo: aithemaLogo/);
  assert.match(umbrella, /hero: aithemaHero/);
  assert.match(showcase, /<p class="product-story__detail">/);
  assert.match(umbrella, /Speak, type or add files; Aithema drafts the requirements\./);
  assert.match(umbrella, /a reusable open-source module is planned/);
  assert.match(umbrella, /start\.augmentoring\.com/);
  assert.match(umbrella, /Conversation · requirements · Continue/);
  assert.match(showcase, /index % 2 === 0/);
});

test("the INSPR product flow stays ordered, human-approved and ownership-led", async () => {
  const umbrella = await source("pages/index.astro");
  const flowStart = umbrella.indexOf("const productFlowSteps = [");
  const flowEnd = umbrella.indexOf("];", flowStart);
  const flow = umbrella.slice(flowStart, flowEnd);

  assert.ok(flowStart >= 0 && flowEnd > flowStart);
  const orderedSteps = [...flow.matchAll(/title: copy\("(Aithema|Paimos|Pharos|Janus) ·/g)]
    .map((match) => match[1]);
  assert.deepEqual(orderedSteps, ["Aithema", "Paimos", "Pharos", "Janus"]);
  assert.match(flow, /The requirements wait for your Continue\./);
  assert.match(flow, /Staging waits for your review\./);
  assert.match(flow, /Production waits for your approval\./);
  assert.match(flow, /Access changes wait for your approval\./);
  assert.match(flow, /Broader permissions, users, roles and ZITADEL integration are planned for later\./);
  assert.doesNotMatch(flow, /title: "(?:Intent|Context|Bounded action|Evidence)"/);
  assert.match(umbrella, /Inspiration is the only limit\./);
  assert.match(umbrella, /At the end, everything is yours: the requirements, the source, the infrastructure, the permissions and the evidence behind every decision\./);
});

test("Aithema joins the product family at its public visitor home", async () => {
  const urls = await source("content/urls.ts");
  const footer = await source("components/MicrositeFooter.astro");

  assert.match(urls, /aithema: "https:\/\/aithema\.inspr\.at"/);
  assert.match(urls, /aithemaPreview: "https:\/\/start\.augmentoring\.com"/);
  assert.match(urls, /aithema: "Requirements"/);
  assert.match(urls, /author: "https:\/\/github\.com\/markus-barta"/);
  assert.match(urls, /\{ label: "Aithema", role: productTaxonomy\.aithema, href: siteUrls\.aithema \}/);
  assert.match(footer, /Open-source repositories: AGPL-3\.0-only/);
  assert.match(footer, /href=\{siteUrls\.author\}/);
  assert.match(footer, />Markus Barta<\/a> · INSPR/);
  assert.doesNotMatch(footer, /© \{year\} Augmentoring GmbH/);
  assert.doesNotMatch(footer, /All software projects: AGPL-3\.0-only/);

  const aithema = urls.indexOf('{ label: "Aithema"');
  const paimos = urls.indexOf('{ label: "Paimos"');
  const pharos = urls.indexOf('{ label: "Pharos"');
  const janus = urls.indexOf('{ label: "Janus"');
  assert.ok(aithema < paimos && paimos < pharos && pharos < janus);
});

test("the self-hosting answer separates today's open repositories from Aithema's planned release", async () => {
  const umbrella = await source("pages/index.astro");

  assert.match(umbrella, /Paimos, Pharos and Janus, yes: they are open source and built to self-host/);
  assert.match(umbrella, /Aithema's reusable module is planned/);
  assert.match(umbrella, /public preview at start\.augmentoring\.com/);
  assert.doesNotMatch(umbrella, /(?:all|every) product is open source/i);
});

test("Aithema metadata names requirements alongside the three established domains", async () => {
  const umbrella = await source("pages/index.astro");

  assert.match(
    umbrella,
    /Aithema shapes requirements, Paimos gives agents a project, Pharos deploys with a verified backup, Janus governs access\. A person approves every handoff\./,
  );
  assert.match(
    umbrella,
    /"The four INSPR products connected from requirements to governed operation"/,
  );
});

test("the local v2 route remains a compatibility alias for the chosen Fable copy", async () => {
  const umbrella = await source("pages/index.astro");
  const v2 = await source("pages/v2/index.astro");

  assert.match(v2, /import Home from "\.\.\/index\.astro"/);
  assert.match(v2, /<Home locale="en" \/>/);
  assert.doesNotMatch(umbrella, /Astro\.props\.edition/);
  assert.match(umbrella, /Give agents a project, not a prompt\./);
  assert.match(umbrella, /Pick the server\. Prove the backup\. Then deploy\./);
  assert.match(umbrella, /The work moves\. You decide when\./);
  assert.match(umbrella, /Built so you can say no\./);
  assert.match(umbrella, /Broader permissions, users, roles and ZITADEL integration are planned for later\./);
  assert.match(umbrella, /Aithema's reusable module is planned to join them\./);
  assert.doesNotMatch(umbrella, /Janus enforces which people/);
});

test("Aithema uses the shared product story with a real vector logo and right-side visual", async () => {
  const umbrella = await source("pages/index.astro");
  const logo = await source("assets/products/aithema/logo.svg");

  assert.match(umbrella, /import aithemaHero from "\.\.\/assets\/products\/aithema\/hero\.png"/);
  assert.match(umbrella, /import aithemaLogo from "\.\.\/assets\/products\/aithema\/logo\.svg"/);
  assert.match(umbrella, /class:list=\{\["product-story", \{ "product-story--reverse": index % 2 === 0 \}\]\}/);
  assert.match(umbrella, /\.product-story \{[\s\S]*?grid-template-columns: minmax\(0, 1\.15fr\) minmax\(19rem, 0\.85fr\);/);
  assert.match(umbrella, /\.product-story--reverse \{\s+grid-template-columns: minmax\(19rem, 0\.85fr\) minmax\(0, 1\.15fr\);/);
  assert.match(umbrella, /\.product-story--reverse \.product-story__visual \{\s+order: 2;/);
  assert.match(umbrella, /\.product-story__visual \{[\s\S]*?border: 1px solid rgb\(255 255 255 \/ 0\.82\);[\s\S]*?border-radius: clamp\(1\.4rem, 2\.4vw, 2\.5rem\);/);
  const orderedNames = [...umbrella.matchAll(/\n\s+name: "(Aithema|Paimos|Pharos|Janus)",/g)]
    .map((match) => match[1]);
  assert.deepEqual(orderedNames, ["Aithema", "Paimos", "Pharos", "Janus"]);
  assert.match(logo, /viewBox="0 0 1254 1254"/);
  assert.match(logo, /<title id="aithema-title">Aithema<\/title>/);
  assert.doesNotMatch(logo, /<(?:image|text)\b/);
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
    assert.match(component, /pause: "Pause"/, `${name} exposes a pause label before interaction`);
    assert.doesNotMatch(component, /Play sequence/, `${name} must not expose a play control`);
    assert.match(
      component,
      /Resume automatic progression/,
      `${name} must expose the resume action while manually paused`,
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

test("Janus headlines use editorial Fraunces without changing body or mono faces", async () => {
  const layout = await source("layouts/MicrositeLayout.astro");
  const styles = await source("styles/microsites.css");
  const manifest = await readFile(new URL("../package.json", import.meta.url), "utf8");

  assert.match(layout, /@fontsource-variable\/fraunces\/full\.css/);
  assert.match(
    styles,
    /html\[data-product="janus"\] \{[\s\S]*?--font-display: "Fraunces Variable", Georgia, "Times New Roman", serif;/,
  );
  assert.match(styles, /--font-body: "Inria Sans"/);
  assert.match(styles, /--font-mono: "JetBrains Mono Variable"/);
  assert.match(manifest, /"@fontsource-variable\/fraunces"/);
  assert.doesNotMatch(layout, /@fontsource-variable\/ibm-plex-sans/);
  assert.doesNotMatch(manifest, /"@fontsource-variable\/ibm-plex-sans"/);
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
  assert.match(footer, /releaseAria: "Site release"/);
  assert.match(footer, /aria-label=\{labels\.releaseAria\}/);
  assert.match(footer, /data-release-id=\{releaseMetadata\.releaseId\}/);
  assert.match(footer, /<dt>Site<\/dt>/);
  assert.match(footer, /<dt>Git<\/dt>/);
  assert.match(footer, /release: "Release"/);
  assert.match(footer, /deployed: "Deployed"/);

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

test("direct SSH deployment overrides preserve one pinned host identity", async () => {
  const deployUrl = new URL("../../deploy.sh", import.meta.url);
  const deployPath = fileURLToPath(deployUrl);
  const deploy = await readFile(deployUrl, "utf8");

  assert.match(deploy, /INSPR_AT_SSH_HOSTNAME/);
  assert.match(deploy, /INSPR_AT_SSH_HOST_KEY_ALIAS/);
  assert.match(deploy, /StrictHostKeyChecking=yes/);
  assert.match(deploy, /SSH_ARGS\+=\([\s\S]*Hostname=\$SSH_HOSTNAME[\s\S]*HostKeyAlias=\$SSH_HOST_KEY_ALIAS/);
  assert.match(deploy, /SCP_ARGS\+=\([\s\S]*Hostname=\$SSH_HOSTNAME[\s\S]*HostKeyAlias=\$SSH_HOST_KEY_ALIAS/);
  assert.match(deploy, /RSYNC_SSH\+="[^"]*Hostname=\$SSH_HOSTNAME[^"]*HostKeyAlias=\$SSH_HOST_KEY_ALIAS"/);

  const baseEnvironment = {
    PATH: process.env.PATH ?? "/usr/bin:/bin",
  };
  const rejected = [
    {
      environment: { INSPR_AT_SSH_HOSTNAME: "100.64.0.4" },
      message: /must be set together/,
    },
    {
      environment: {
        INSPR_AT_SSH_HOSTNAME: "100.64.0.4;touch-bad",
        INSPR_AT_SSH_HOST_KEY_ALIAS: "csb1.ts.barta.cm",
      },
      message: /must be a DNS name or IPv4 address/,
    },
    {
      environment: {
        INSPR_AT_SSH_HOSTNAME: "100.64.0.4",
        INSPR_AT_SSH_HOST_KEY_ALIAS: "-oUnsafeOption",
      },
      message: /contains unsafe characters/,
    },
    {
      environment: {
        INSPR_AT_SSH_HOSTNAME: "100.64.0.4",
        INSPR_AT_SSH_HOST_KEY_ALIAS: "[csb1.ts.barta.cm]:0",
      },
      message: /port must be between 1 and 65535/,
    },
    {
      environment: {
        INSPR_AT_SSH_HOSTNAME: "100.64.0.4",
        INSPR_AT_SSH_HOST_KEY_ALIAS: "[csb1.ts.barta.cm]:2222",
      },
      message: /SSH_PORT is required for a bracketed/,
    },
    {
      environment: {
        INSPR_AT_SSH_HOSTNAME: "100.64.0.4",
        INSPR_AT_SSH_HOST_KEY_ALIAS: "[csb1.ts.barta.cm]:2222",
        INSPR_AT_SSH_PORT: "2223",
      },
      message: /SSH_PORT must match the bracketed/,
    },
  ];

  for (const fixture of rejected) {
    const result = spawnSync("/bin/bash", [deployPath], {
      cwd: fileURLToPath(new URL("../..", import.meta.url)),
      encoding: "utf8",
      env: { ...baseEnvironment, ...fixture.environment },
    });
    assert.equal(result.status, 1);
    assert.match(result.stderr, fixture.message);
    assert.doesNotMatch(result.stdout, /building Astro|uploading immutable release/);
  }

  const fixtureRoot = await mkdtemp(join(tmpdir(), "inspr-deploy-transport-"));
  try {
    const fakeBin = join(fixtureRoot, "fake-bin");
    const transportLog = join(fixtureRoot, "transport.log");
    const gitRevision = "0123456789abcdef0123456789abcdef01234567";
    const releaseId = "20260719T000000Z-0123456789ab";
    const fixtureDirectories = [
      fakeBin,
      join(fixtureRoot, "site"),
      join(fixtureRoot, "web", "dist", "_astro"),
      join(fixtureRoot, "web", "dist", "overview"),
      join(fixtureRoot, "web", "dist", "de", "ueberblick"),
      join(fixtureRoot, "web", "dist", "paimos", "de"),
      join(fixtureRoot, "web", "dist", "pharos", "de"),
      join(fixtureRoot, "web", "dist", "janus", "de"),
    ];
    await Promise.all(
      fixtureDirectories.map((directory) => mkdir(directory, { recursive: true })),
    );

    await Promise.all([
      writeFile(join(fixtureRoot, "deploy.sh"), deploy),
      writeFile(join(fixtureRoot, "Caddyfile"), "fixture caddy configuration\n"),
      // Deliberately differs from the historical remote hash below. Static
      // release transport must not inspect or reconcile either snapshot.
      writeFile(
        join(fixtureRoot, "docker-compose.yml"),
        "services:\n  legacy-local:\n    image: local-only\n",
      ),
      writeFile(join(fixtureRoot, "site", "index.html"), "fixture archive\n"),
      writeFile(join(fixtureRoot, "web", "dist", "index.html"), "fixture umbrella\n"),
      writeFile(join(fixtureRoot, "web", "dist", "overview", "index.html"), "fixture overview\n"),
      writeFile(join(fixtureRoot, "web", "dist", "de", "ueberblick", "index.html"), "fixture german overview\n"),
      writeFile(join(fixtureRoot, "web", "dist", "paimos", "index.html"), "fixture paimos\n"),
      writeFile(join(fixtureRoot, "web", "dist", "paimos", "de", "index.html"), "fixture german paimos\n"),
      writeFile(join(fixtureRoot, "web", "dist", "pharos", "index.html"), "fixture pharos\n"),
      writeFile(join(fixtureRoot, "web", "dist", "pharos", "de", "index.html"), "fixture german pharos\n"),
      writeFile(join(fixtureRoot, "web", "dist", "janus", "index.html"), "fixture janus\n"),
      writeFile(join(fixtureRoot, "web", "dist", "janus", "de", "index.html"), "fixture german janus\n"),
      writeFile(join(fixtureRoot, "web", "dist", "_astro", "fixture.css"), "body{}\n"),
      writeFile(
        join(fixtureRoot, "web", "dist", "release.json"),
        `${JSON.stringify({
          schemaVersion: 1,
          package: { version: "1.0.0" },
          source: { git: gitRevision.slice(0, 12), dirty: false },
          deployment: {
            releaseId,
            deployedAt: "2026-07-19T00:00:00Z",
          },
        })}\n`,
      ),
    ]);

    // The fake host advertises a deliberately divergent historical Compose
    // hash if queried. The deploy must ignore it while still exercising the
    // Caddyfile promotion path (scp + validate + restart).
    const remoteComposeHash = createHash("sha256")
      .update("services:\n  legacy-remote:\n    image: remote-only\n")
      .digest("hex");
    const loggingTransport = (name, respond = "cat >/dev/null") => `#!/bin/sh
printf '%s' '${name}' >> "$TRANSPORT_LOG"
for argument in "$@"; do
  printf '\\t%s' "$argument" >> "$TRANSPORT_LOG"
done
printf '\\n' >> "$TRANSPORT_LOG"
${respond}
`;
    const sshResponder = `command=$(cat)
case "$command" in
  *docker-compose.yml*) printf '%s\\n' '${remoteComposeHash}'; exit 97 ;;
esac`;
    for (const transport of ["ssh", "scp", "rsync"]) {
      const executable = join(fakeBin, transport);
      await writeFile(
        executable,
        loggingTransport(transport, transport === "ssh" ? sshResponder : undefined),
      );
      await chmod(executable, 0o755);
    }

    const fakeGit = join(fakeBin, "git");
    await writeFile(
      fakeGit,
      `#!/bin/sh
case "$*" in
  *rev-parse*) printf '%s\\n' '${gitRevision}' ;;
  *status*) exit 0 ;;
  *) exit 92 ;;
esac
`,
    );
    await chmod(fakeGit, 0o755);

    const fakePython = join(fakeBin, "python3");
    await writeFile(fakePython, "#!/bin/sh\nexit 0\n");
    await chmod(fakePython, 0o755);

    const bracketedAlias = spawnSync("/bin/bash", [join(fixtureRoot, "deploy.sh")], {
      cwd: fixtureRoot,
      encoding: "utf8",
      env: {
        ...baseEnvironment,
        PATH: `${fakeBin}:${baseEnvironment.PATH}`,
        TRANSPORT_LOG: transportLog,
        INSPR_AT_SSH_HOSTNAME: "100.64.0.4",
        INSPR_AT_SSH_HOST_KEY_ALIAS: "[csb1.ts.barta.cm]:2222",
        INSPR_AT_SSH_PORT: "2222",
        SKIP_BUILD: "1",
        SKIP_PROBE: "1",
      },
    });
    assert.equal(
      bracketedAlias.status,
      0,
      `isolated deploy failed:\n${bracketedAlias.stderr}\n${bracketedAlias.stdout}`,
    );

    const records = (await readFile(transportLog, "utf8"))
      .trim()
      .split("\n")
      .map((line) => line.split("\t"));
    const recordsFor = (name) => records
      .filter(([transport]) => transport === name)
      .map(([, ...arguments_]) => arguments_);
    const sshRecords = recordsFor("ssh");
    const scpRecords = recordsFor("scp");
    const rsyncRecords = recordsFor("rsync");
    assert.ok(sshRecords.length > 0, "fixture must exercise SSH");
    assert.ok(scpRecords.length > 0, "fixture must exercise SCP");
    assert.ok(rsyncRecords.length > 0, "fixture must exercise rsync");

    const assertOption = (arguments_, option) => {
      assert.ok(
        arguments_.some((argument, index) => (
          argument === "-o" && arguments_[index + 1] === option
        )),
        `missing SSH option ${option} in ${JSON.stringify(arguments_)}`,
      );
    };
    for (const arguments_ of [...sshRecords, ...scpRecords]) {
      assertOption(arguments_, "StrictHostKeyChecking=yes");
      assertOption(arguments_, "Hostname=100.64.0.4");
      assertOption(arguments_, "HostKeyAlias=[csb1.ts.barta.cm]:2222");
    }
    for (const arguments_ of sshRecords) {
      assert.ok(arguments_.some((argument, index) => (
        argument === "-p" && arguments_[index + 1] === "2222"
      )));
      assert.ok(arguments_.includes("csb1"));
    }
    for (const arguments_ of scpRecords) {
      assert.ok(arguments_.some((argument, index) => (
        argument === "-P" && arguments_[index + 1] === "2222"
      )));
      assert.ok(arguments_.some((argument) => argument.startsWith("csb1:")));
    }

    const expectedRsyncShell = [
      "ssh",
      "-o BatchMode=yes",
      "-o ConnectTimeout=10",
      "-o StrictHostKeyChecking=yes",
      "-o Hostname=100.64.0.4",
      "-o HostKeyAlias=[csb1.ts.barta.cm]:2222",
      "-p 2222",
    ].join(" ");
    for (const arguments_ of rsyncRecords) {
      const shellIndex = arguments_.indexOf("-e");
      assert.notEqual(shellIndex, -1);
      assert.equal(arguments_[shellIndex + 1], expectedRsyncShell);
      assert.ok(arguments_.some((argument) => argument.startsWith("csb1:")));
    }
  } finally {
    await rm(fixtureRoot, { recursive: true, force: true });
  }
});

test("every content icon and group resolves in ContextIcon and the tile type", async () => {
  const iconComponent = await source("components/ContextIcon.astro");
  const mapStart = iconComponent.indexOf("const iconMap = {");
  assert.ok(mapStart >= 0, "ContextIcon declares iconMap");
  const mapBlock = iconComponent.slice(mapStart, iconComponent.indexOf("};", mapStart));
  const iconNames = new Set(
    [...mapBlock.matchAll(/^\s*(?:"([^"]+)"|([a-z0-9-]+)):/gm)].map((match) => match[1] ?? match[2]),
  );
  assert.ok(iconNames.size >= 40, `ContextIcon map parsed only ${iconNames.size} names`);

  const types = await source("content/types.ts");
  const groupUnion = types.match(/group:\s*((?:"[a-z]+"\s*\|?\s*)+);/);
  assert.ok(groupUnion, "types.ts declares the specs group union");
  const groups = new Set([...groupUnion[1].matchAll(/"([a-z]+)"/g)].map((match) => match[1]));
  assert.ok(groups.size >= 3, `group union parsed only ${groups.size} members`);

  for (const { slug } of products) {
    const content = await source(`content/${slug}.ts`);
    const icons = [...content.matchAll(/^\s*icon:\s*"([^"]*)"/gm)].map((match) => match[1]);
    assert.ok(icons.length > 0, `${slug} declares contextual icons`);
    for (const icon of icons) {
      assert.ok(iconNames.has(icon), `${slug}: icon "${icon}" is not registered in ContextIcon`);
    }
    for (const [, group] of content.matchAll(/^\s*group:\s*"([^"]*)"/gm)) {
      assert.ok(groups.has(group), `${slug}: group "${group}" is not in the specs group union`);
    }
  }
});
