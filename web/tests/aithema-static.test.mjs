import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import test from "node:test";

const webUrl = new URL("../", import.meta.url);
const rootUrl = new URL("../../", import.meta.url);

const webFile = (path) => readFile(new URL(path, webUrl), "utf8");
const rootFile = (path) => readFile(new URL(path, rootUrl), "utf8");

test("Aithema has a canonical product route separate from its hosted preview", async () => {
  const route = await webFile("src/pages/aithema/index.astro");
  const content = await webFile("src/content/aithema.ts");
  const urls = await webFile("src/content/urls.ts");

  assert.match(route, /import AithemaProductPage from "\.\.\/\.\.\/components\/AithemaProductPage\.astro"/);
  assert.match(route, /import \{ aithemaContent \} from "\.\.\/\.\.\/content\/aithema"/);
  assert.match(route, /<AithemaProductPage content=\{aithemaContent\} \/>/);
  assert.match(urls, /aithema: "https:\/\/aithema\.inspr\.at"/);
  assert.match(urls, /aithemaPreview: "https:\/\/start\.augmentoring\.com"/);
  assert.match(content, /canonicalUrl: siteUrls\.aithema/);
  assert.match(content, /previewUrl: siteUrls\.aithemaPreview/);
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
  assert.match(content, /Reusable open-source module planned/);
  assert.match(content, /No Aithema source repository or product license is claimed/);
  assert.match(content, /satisfies PreviewProductContent/);
  assert.doesNotMatch(content, /github\.com/);
  assert.doesNotMatch(content, /AGPL|MIT|repositoryUrl|releaseUrl/);
  assert.match(page, /Use the hosted preview/);
  assert.match(page, /Reusable open-source module planned/);
  assert.doesNotMatch(page, /View the source|Open-source repositories: AGPL|repositoryUrl|licenseUrl/);
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

  assert.match(rootReadme, /`aithema\.inspr\.at`[^\n]*planned[^\n]*pending edge routing and DNS/i);
  assert.doesNotMatch(rootReadme, /\[aithema\.inspr\.at\]\(https:\/\/aithema\.inspr\.at\)/);
  assert.match(rootReadme, /working public preview[\s\S]*start\.augmentoring\.com/);
  assert.match(webReadme, /`\/aithema\/` \| `aithema\.inspr\.at` \(target; edge routing and DNS pending\)/);
  assert.match(webReadme, /preview itself is not built by this repository/);
  assert.match(packageJson, /node --test tests\/\*-static\.test\.mjs/);
  assert.match(sectionAudit, /name: "aithema"[\s\S]*minimum: 11, expectedRails: 0/);
  assert.match(page, /<section\s+class="proof-console page-shell"[\s\S]*data-section-pattern="proof-strip"/);
});
