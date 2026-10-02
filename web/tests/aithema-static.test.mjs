import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import test from "node:test";

const webUrl = new URL("../", import.meta.url);
const rootUrl = new URL("../../", import.meta.url);

const webFile = (path) => readFile(new URL(path, webUrl), "utf8");
const rootFile = (path) => readFile(new URL(path, rootUrl), "utf8");

test("Aithema has a canonical product route and no public preview link", async () => {
  const route = await webFile("src/pages/aithema/index.astro");
  const content = await webFile("src/content/aithema.ts");
  const urls = await webFile("src/content/urls.ts");

  assert.match(route, /import AithemaProductPage from "\.\.\/\.\.\/components\/AithemaProductPage\.astro"/);
  assert.match(route, /import \{ aithemaContent \} from "\.\.\/\.\.\/content\/aithema"/);
  assert.match(route, /<AithemaProductPage content=\{aithemaContent\} \/>/);
  assert.match(urls, /aithema: "https:\/\/aithema\.inspr\.at"/);
  assert.doesNotMatch(urls, /aithemaPreview|start\.augmentoring\.com/);
  assert.match(content, /canonicalUrl: siteUrls\.aithema/);
  assert.doesNotMatch(content, /previewUrl|start\.augmentoring\.com/);
});

test("Aithema keeps approval with the person who chooses Continue", async () => {
  const content = await webFile("src/content/aithema.ts");
  const model = content.slice(content.indexOf("model:"), content.indexOf("featureSections:"));

  assert.match(content, /Requirements you approve before work begins\./);
  assert.match(content, /Speak, type or share files\./);
  assert.match(model, /title: "Share"/);
  assert.match(model, /title: "Shape"/);
  assert.match(model, /title: "Review"/);
  assert.match(model, /title: "Continue"/);
  assert.match(model, /Nothing advances merely because a draft exists\./);
  assert.match(model, /Your decision creates the handoff to the next step\./);
  assert.doesNotMatch(content, /automatically approves|auto-approves/i);
  assert.ok(!content.includes("\u2014"), "Aithema copy contains an em dash");
});

test("Aithema states its preview maturity without invented source claims", async () => {
  const content = await webFile("src/content/aithema.ts");
  const page = await webFile("src/components/AithemaProductPage.astro");
  const types = await webFile("src/content/types.ts");

  assert.match(types, /export type PreviewProductContent/);
  assert.match(types, /slug: "aithema"/);
  assert.match(content, /repositoryUrl: "https:\/\/github\.com\/inspr-at\/aithema"/);
  assert.match(content, /releaseUrl: "https:\/\/github\.com\/inspr-at\/aithema\/releases"/);
  assert.match(content, /licenseUrl: "https:\/\/github\.com\/inspr-at\/aithema\/blob\/main\/LICENSE"/);
  assert.match(content, /under AGPL-3\.0-only, with tagged releases/);
  assert.match(content, /satisfies PreviewProductContent/);
  assert.doesNotMatch(content, /module is planned|module planned|is claimed|Not yet\./);
  assert.match(content, /"Reusable core published under AGPL-3\.0-only"/);
  assert.match(page, /Request access/);
  assert.match(page, /Hosted workspace by invitation/);
  assert.match(page, /<nav aria-label=\{labels\.sourceAria\}>[\s\S]*?<p class="footer-text">\{labels\.byInvitation\}<\/p>/);
  assert.doesNotMatch(page, /previewUrl|hosted preview|start\.augmentoring\.com/);
  const overview = await webFile("src/components/OverviewPage.astro");
  const styles = await webFile("src/styles/microsites.css");
  assert.match(overview, /github\.com\/inspr-at\/aithema; hosted workspace by invitation/);
  assert.doesNotMatch(overview, /module is planned|still being built/);
  assert.match(overview, /maturity: copy\("by invitation", "auf Einladung"\)/);
  assert.doesNotMatch(overview, /web preview|Web-Vorschau|hosted preview|gehostete Vorschau/);
  assert.match(styles, /\.site-footer nav a,\s*\.site-footer nav \.footer-text,\s*\.site-footer__group \.footer-text \{[^}]*color: var\(--night-soft\);/);
  assert.match(styles, /\.site-footer nav \.footer-text/);
  assert.match(page, /viewSource: "View the source"/);
  assert.match(page, /license: "Project license: AGPL-3\.0-only"/);
  assert.match(page, /<a href=\{content\.licenseUrl\}/);
  assert.match(page, /<a href=\{content\.repositoryUrl\} target="_blank" rel="noopener noreferrer">GitHub/);
  assert.match(page, /<a href=\{content\.releaseUrl\}/);
  assert.match(page, /<a href=\{siteUrls\.agpl\}/);
  assert.doesNotMatch(page, /modulePlanned|module planned/);
});

test("Aithema uses the approved hero and native Requirement Prism", async () => {
  const page = await webFile("src/components/AithemaProductPage.astro");
  const logo = await webFile("src/assets/products/aithema/logo.svg");
  const hero = await stat(new URL("src/assets/products/aithema/hero.png", webUrl));

  assert.match(page, /import aithemaHero from "\.\.\/assets\/products\/aithema\/hero\.png"/);
  assert.match(page, /import aithemaLogo from "\.\.\/assets\/products\/aithema\/logo\.svg"/);
  assert.ok(hero.size > 100_000, "Aithema hero must be a real editorial image");
  assert.match(logo, /<svg[^>]+viewBox="0 0 1254 1254"/);
  assert.match(logo, /diffuse input becoming a durable requirement/);
  assert.doesNotMatch(logo, /<image|data:image/);
  assert.ok((logo.match(/<(?:path|rect)\b/g) ?? []).length <= 6);
});

test("Aithema publishes host-specific discovery and Caddy routing without crossing the runtime boundary", async () => {
  const robots = await webFile("public/aithema/robots.txt");
  const sitemap = await webFile("public/aithema/sitemap.xml");
  const caddy = await rootFile("Caddyfile");
  const compose = await rootFile("docker-compose.yml");

  assert.match(robots, /Sitemap: https:\/\/aithema\.inspr\.at\/sitemap\.xml/);
  assert.match(sitemap, /<loc>https:\/\/aithema\.inspr\.at\/<\/loc>/);
  assert.match(caddy, /@aithema host aithema\.inspr\.at/);
  assert.match(caddy, /root \* \/srv\/releases\/current\/aithema/);
  assert.match(caddy, /host www\.inspr\.at aithema\.inspr\.at paimos\.inspr\.at/);
  assert.doesNotMatch(compose, /inspr-aithema/);
  assert.doesNotMatch(compose, /Host\(`aithema\.inspr\.at`\)/);
});

test("deployment gates require and probe Aithema while using the current umbrella copy", async () => {
  const deploy = await rootFile("deploy.sh");

  assert.match(deploy, /"aithema\/index\.html"/);
  assert.match(deploy, /test -f '\$REMOTE_INCOMING\/aithema\/index\.html'/);
  assert.match(deploy, /--header='Host: aithema\.inspr\.at'/);
  assert.match(deploy, /probe_page "Aithema microsite" "https:\/\/aithema\.inspr\.at\/" "Requirements you approve before work begins\."/);
  assert.match(deploy, /probe_redirect "Aithema HTTP upgrade" "http:\/\/aithema\.inspr\.at\/"/);
  assert.match(deploy, /probe_page "INSPR umbrella"[^\n]+"Inspiration is the only limit\."/);
  assert.doesNotMatch(deploy, /Ideas should outlive/);
});

test("documentation and test discovery include the Aithema microsite", async () => {
  const rootReadme = await rootFile("README.md");
  const webReadme = await webFile("README.md");
  const packageJson = await webFile("package.json");
  const sectionAudit = await webFile("scripts/audit-section-patterns.mjs");
  const page = await webFile("src/components/AithemaProductPage.astro");

  assert.match(rootReadme, /product page is live at `aithema\.inspr\.at`/i);
  assert.match(rootReadme, /\[aithema\.inspr\.at\]\(https:\/\/aithema\.inspr\.at\) - requirements a person reviews/i);
  assert.doesNotMatch(rootReadme, /planned Aithema product host/i);
  assert.doesNotMatch(rootReadme, /pending edge routing/i);
  assert.match(rootReadme, /hosted Aithema workspace is available\s+by invitation/);
  assert.match(rootReadme, /\[github\.com\/inspr-at\/aithema\]\(https:\/\/github\.com\/inspr-at\/aithema\)/);
  assert.match(rootReadme, /The four open-source product repositories/);
  assert.doesNotMatch(rootReadme, /start\.augmentoring\.com/);
  assert.match(webReadme, /`\/aithema\/` \| `aithema\.inspr\.at`/);
  assert.match(webReadme, /product page is live at[\s\S]*`aithema\.inspr\.at`/i);
  assert.doesNotMatch(webReadme, /edge routing and DNS are in place/i);
  assert.match(webReadme, /workspace itself is not built by this repository/);
  assert.match(webReadme, /links the published core's repository, releases\s+and project license/);
  assert.doesNotMatch(webReadme, /until inspectable product\s+source exists/);
  assert.doesNotMatch(webReadme, /start\.augmentoring\.com/);
  assert.match(packageJson, /node --test tests\/\*-static\.test\.mjs/);
  assert.match(sectionAudit, /name: "aithema"[\s\S]*minimum: 11, expectedRails: 0/);
  assert.match(page, /<section\s+class="proof-console page-shell"[\s\S]*data-section-pattern="proof-strip"/);
});

test("repository landing docs mirror the bilingual four-product story", async () => {
  const [rootReadme, webReadme] = await Promise.all([
    rootFile("README.md"),
    webFile("README.md"),
  ]);

  assert.match(rootReadme, /\[English\]\(https:\/\/www\.inspr\.at\/\)/);
  assert.match(rootReadme, /\[German\]\(https:\/\/www\.inspr\.at\/de\/\)/);

  for (const url of [
    "https://www.inspr.at/overview/",
    "https://www.inspr.at/de/ueberblick/",
    "https://aithema.inspr.at/de/",
    "https://paimos.inspr.at/de/",
    "https://pharos.inspr.at/de/",
    "https://janus.inspr.at/de/",
  ]) {
    assert.match(rootReadme, new RegExp(url.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }

  const sequence = ["aithema.inspr.at", "paimos.inspr.at", "pharos.inspr.at", "janus.inspr.at"];
  const positions = sequence.map((host) => rootReadme.indexOf(`[${host}]`));
  assert.ok(positions.every((position) => position >= 0));
  assert.deepEqual([...positions].sort((a, b) => a - b), positions);
  assert.match(rootReadme, /Augmentoring's professional services fit as a user of the[\s\S]*products rather than their owner/);
  assert.match(rootReadme, /Copyright © 2026 \[Markus Barta\]/);
  assert.match(webReadme, /Copyright © 2026 \[Markus Barta\]/);
});
