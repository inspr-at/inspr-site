import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const sourceUrl = new URL("../src/", import.meta.url);
const rootUrl = new URL("../../", import.meta.url);

const source = (relativePath) => readFile(new URL(relativePath, sourceUrl), "utf8");
const rootFile = (relativePath) => readFile(new URL(relativePath, rootUrl), "utf8");

test("Overview replaces the public ELI10 framing with bilingual canonical routes", async () => {
  const [component, english, german, legacy, caddy, deploy] = await Promise.all([
    source("components/OverviewPage.astro"),
    source("pages/overview/index.astro"),
    source("pages/de/ueberblick/index.astro"),
    source("pages/eli10/index.astro"),
    rootFile("Caddyfile"),
    rootFile("deploy.sh"),
  ]);

  assert.match(english, /<OverviewPage locale="en" \/>/);
  assert.match(german, /<OverviewPage locale="de" \/>/);
  assert.match(component, /const englishUrl = siteUrls\.overview/);
  assert.match(component, /const germanUrl = siteUrls\.overviewGerman/);
  assert.match(component, /alternateEnglish=\{englishUrl\}/);
  assert.match(component, /alternateGerman=\{germanUrl\}/);
  assert.match(component, /detectLocale=\{locale === "en"\}/);
  assert.doesNotMatch(component, /ELI10/i);
  assert.match(legacy, /noindex, follow/);
  assert.match(legacy, /Continue to the INSPR Overview/);
  assert.match(caddy, /path \/eli10 \/eli10\/ \/eli10\/\*/);
  assert.match(caddy, /redir @legacy_overview https:\/\/www\.inspr\.at\/overview\/ 308/);
  assert.match(deploy, /"overview\/index\.html"/);
  assert.match(deploy, /"de\/ueberblick\/index\.html"/);
  assert.match(deploy, /probe_page "INSPR overview"/);
  assert.match(deploy, /probe_page "INSPR German overview"/);
  assert.match(deploy, /probe_redirect "legacy ELI10 redirect"/);
});

test("Overview presents the human-approved product path truthfully in both languages", async () => {
  const component = await source("components/OverviewPage.astro");

  for (const phrase of [
    "From an idea to something that ",
    "Von einer Idee zu etwas, das ",
    "One path. Four tools. You approve.",
    "Ein Weg. Vier Werkzeuge. Sie geben frei.",
    "Conversation and files become clear requirements.",
    "Projekt und Spezifikationen steuern die Umsetzung mit Agenten.",
    "Choose a server, verify its backup and deploy to production.",
    "Freigaben werden durchgesetzt und Zugriffe sicher rotiert.",
    "Nothing moves forward without you.",
    "Ohne Sie geht nichts weiter.",
  ]) {
    assert.ok(component.includes(phrase), `missing overview copy: ${phrase}`);
  }

  const names = [...component.matchAll(/name: "(Aithema|Paimos|Pharos|Janus)"/g)]
    .map((match) => match[1]);
  assert.deepEqual(names, ["Aithema", "Paimos", "Pharos", "Janus"]);
  assert.equal((component.match(/approval: copy\(/g) || []).length, 4);
  assert.doesNotMatch(component, /manage users|user management|role management|ZITADEL integration/i);
  assert.match(component, /Aithema's module is planned\./);
  assert.match(component, /Aithemas Modul ist geplant\./);
});

test("Overview is discoverable from the full site and returns deliberately to it", async () => {
  const [overview, homepage, footer, urls] = await Promise.all([
    source("components/OverviewPage.astro"),
    source("pages/index.astro"),
    source("components/MicrositeFooter.astro"),
    source("content/urls.ts"),
  ]);

  assert.match(urls, /overview: "https:\/\/www\.inspr\.at\/overview\/"/);
  assert.match(urls, /overviewGerman: "https:\/\/www\.inspr\.at\/de\/ueberblick\/"/);
  assert.match(homepage, /copy\("Overview", "Überblick"\)/);
  assert.match(footer, /labels\.overview/);
  assert.match(overview, /primaryAction=\{\{ label: copy\("Full site", "Website"\), href: fullSiteUrl \}\}/);
  assert.match(overview, /Explore the full site/);
  assert.match(overview, /Ganze Website ansehen/);
});

test("Shared header controls use one vertical alignment contract", async () => {
  const [header, styles] = await Promise.all([
    source("components/MicrositeHeader.astro"),
    source("styles/microsites.css"),
  ]);

  assert.match(header, /showProductSwitcher\?: boolean/);
  assert.match(header, /primaryAction\?: \{ label: string; href: string \}/);
  assert.match(header, /class="header-action"/);
  assert.match(header, /class="mobile-navigation__primary"/);
  assert.match(styles, /\.site-nav \{[\s\S]*?min-height: 2\.65rem;[\s\S]*?align-items: center;/);
  assert.match(styles, /\.site-nav a,[\s\S]*?\.quiet-link \{[\s\S]*?display: inline-flex;[\s\S]*?min-height: 2\.65rem;[\s\S]*?align-items: center;/);
  assert.match(styles, /\.language-switch \{[\s\S]*?min-height: 2\.65rem;[\s\S]*?align-items: center;/);
  assert.match(styles, /\.language-switch a \{[\s\S]*?min-height: 2\.65rem;[\s\S]*?place-items: center;/);
  assert.match(styles, /\.product-switcher summary,[\s\S]*?\.header-action \{[\s\S]*?align-items: center;[\s\S]*?min-height: 2\.65rem;/);
  assert.match(styles, /@media \(max-width: 72rem\) \{[\s\S]*?\.header-action \{\s*display: none;/);
});

test("Overview keeps a bounded, friendly and responsive two-screen structure", async () => {
  const [page, styles] = await Promise.all([
    source("components/OverviewPage.astro"),
    source("styles/overview.css"),
  ]);

  assert.match(page, /class="overview-promises"/);
  assert.match(page, /class="overview-steps"/);
  assert.match(page, /class="overview-next page-shell"/);
  assert.match(page, /class="overview-threshold__aperture"/);
  assert.match(styles, /min-height: min\(49rem, calc\(100svh - 7\.2rem\)\)/);
  assert.match(styles, /grid-template-columns: repeat\(4, minmax\(0, 1fr\)\)/);
  assert.match(styles, /@media \(max-width: 40rem\)/);
  assert.match(styles, /@media \(prefers-reduced-motion: reduce\)/);
  assert.doesNotMatch(styles, /animation:/);
});
