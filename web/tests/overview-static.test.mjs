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

test("Overview path cards preview the matching approved loops on deliberate interaction", async () => {
  const [component, heroLoop, styles] = await Promise.all([
    source("components/OverviewPage.astro"),
    source("components/HeroLoop.astro"),
    source("styles/overview.css"),
  ]);

  const products = ["aithema", "paimos", "pharos", "janus"];
  for (const slug of products) {
    assert.match(
      component,
      new RegExp(`import ${slug}Hero from "\\.\\.\\/assets\\/products\\/${slug}\\/hero\\.png"`),
    );
    assert.match(
      component,
      new RegExp(`import ${slug}HeroLoop from "\\.\\.\\/assets\\/products\\/${slug}\\/hero-loop\\.mp4"`),
    );
    assert.match(
      component,
      new RegExp(`id: "${slug}" as const,[\\s\\S]*?hero: ${slug}Hero,[\\s\\S]*?video: ${slug}HeroLoop`),
    );
  }

  assert.match(component, /<a[\s\S]*?class="overview-step"[\s\S]*?href=\{step\.href\}[\s\S]*?data-product=\{step\.id\}[\s\S]*?data-hero-loop-interaction/);
  assert.doesNotMatch(component, /<h3[^>]*><a/);
  assert.match(component, /aria-labelledby=\{`overview-step-\$\{step\.id\}-title`\}/);
  assert.match(component, /aria-describedby=\{`overview-step-\$\{step\.id\}-role overview-step-\$\{step\.id\}-body overview-step-\$\{step\.id\}-approval`\}/);
  assert.match(component, /<HeroLoop[\s\S]*?id=\{step\.id\}[\s\S]*?activation="hover"[\s\S]*?showControl=\{false\}[\s\S]*?loading="lazy"/);
  assert.match(heroLoop, /preload=\{activation === "autoplay" \? "metadata" : "none"\}/);
  assert.match(heroLoop, /interactionRoot\.addEventListener\("pointerenter"/);
  assert.match(heroLoop, /interactionRoot\.addEventListener\("pointerleave"/);
  assert.match(heroLoop, /interactionRoot\.addEventListener\("focusin"/);
  assert.match(heroLoop, /interactionRoot\.addEventListener\("focusout"/);
  assert.match(heroLoop, /event\.pointerType === "touch"/);
  assert.match(heroLoop, /window\.matchMedia\("\(hover: none\), \(pointer: coarse\)"\)/);
  assert.match(heroLoop, /!coarsePointer\.matches/);
  assert.match(heroLoop, /document\.addEventListener\("keydown"/);
  assert.match(heroLoop, /event\.key !== "Escape"/);
  assert.match(heroLoop, /interactionDismissed = true/);
  assert.match(heroLoop, /video\.currentTime = 0/);
  assert.match(heroLoop, /toggleAttribute\("data-hero-loop-active", interactionActive\(\)\)/);
  assert.match(styles, /\.overview-step__preview \{[\s\S]*?position: absolute;[\s\S]*?opacity: 0;[\s\S]*?pointer-events: none;/);
  assert.doesNotMatch(styles, /\.overview-step__preview::after/);
  assert.match(styles, /\.overview-step\[data-product="pharos"\] :is\(\.hero-loop__poster, \.hero-loop__video\) \{\s*object-position: left center;/);
  assert.match(styles, /\.overview-step__content > \* \{\s*position: relative;\s*z-index: 1;/);
  assert.match(styles, /\.overview-step__approval \{[\s\S]*?position: absolute;[\s\S]*?right: 1\.2rem;[\s\S]*?left: 1\.2rem;/);
  assert.doesNotMatch(styles, /\.overview-step__content\s*\{[^}]*min-height:/);
  assert.match(styles, /\.overview-step \{[\s\S]*?cursor: pointer;[\s\S]*?text-decoration: none;/);
  assert.match(styles, /\.overview-step\[data-hero-loop-active\] h3 \{[\s\S]*?color: white;[\s\S]*?text-shadow: 0 1px 5px/);
  assert.match(styles, /\.overview-step\[data-hero-loop-active\] \.overview-step__top img \{[\s\S]*?filter: brightness\(0\) invert\(1\);[\s\S]*?opacity: 0\.5;/);
  assert.match(component, /class="overview-control__step" data-control-step=\{step\.id\} aria-hidden="true"/);
  assert.match(component, /class="overview-control__number">\{step\.number\}/);
  assert.match(component, /class="overview-control__approval">[\s\S]*?user-round-check[\s\S]*?\{step\.approval\}/);
  assert.match(styles, /\.overview-path:has\(\.overview-step\[data-hero-loop-active\]\) \.overview-control__default/);
  assert.match(styles, /@media \(prefers-reduced-motion: reduce\)[\s\S]*?\.overview-step__preview,[\s\S]*?transition: none;/);
  assert.match(
    component,
    /sizes="\(min-width: 90rem\) 17\.5rem, \(min-width: 72rem\) calc\(20\.5vw - 1\.5rem\), \(min-width: 56rem\) calc\(\(100vw - 12rem\) \/ 4\), \(min-width: 40rem\) calc\(\(100vw - 7\.5rem\) \/ 2\), calc\(100vw - 5\.5rem\)"/,
  );
});

test("Overview path intro stays on one line only at approved wide desktop widths", async () => {
  const styles = await source("styles/overview.css");

  assert.match(
    styles,
    /@media \(min-width: 90rem\) \{[\s\S]*?\.overview-path__header \{[\s\S]*?grid-template-columns: minmax\(0, 1fr\) max-content;[\s\S]*?\.overview-path__header > p \{[\s\S]*?white-space: nowrap;/,
  );
  const responsiveStyles = styles.slice(styles.indexOf("@media (max-width: 56rem)"));
  assert.match(responsiveStyles, /\.overview-path__header \{[\s\S]*?grid-template-columns: 1fr;/);
  assert.doesNotMatch(responsiveStyles, /white-space: nowrap/);
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
  assert.match(overview, /current: true/);
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
  assert.match(header, /aria-current=\{item\.current \? "page" : undefined\}/);
  assert.match(styles, /\.site-nav \{[\s\S]*?min-height: 2\.65rem;[\s\S]*?align-items: center;/);
  assert.match(styles, /\.site-nav a,[\s\S]*?\.quiet-link \{[\s\S]*?display: inline-flex;[\s\S]*?min-height: 2\.65rem;[\s\S]*?align-items: center;/);
  assert.match(styles, /\.language-switch \{[\s\S]*?min-height: 2\.65rem;[\s\S]*?align-items: center;/);
  assert.match(styles, /\.language-switch a \{[\s\S]*?min-height: 2\.65rem;[\s\S]*?place-items: center;/);
  assert.match(styles, /\.product-switcher summary,[\s\S]*?\.header-action \{[\s\S]*?align-items: center;[\s\S]*?min-height: 2\.65rem;/);
  const tabletStyles = styles.slice(
    styles.indexOf("@media (max-width: 72rem)"),
    styles.indexOf("@media (max-width: 52rem)"),
  );
  assert.match(tabletStyles, /\.header-action \{\s*display: none;/);
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
