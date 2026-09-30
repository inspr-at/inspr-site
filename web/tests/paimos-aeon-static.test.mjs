import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

// INSPR-492: /paimos is the PAIMOS AEON page. The same files serve
// paimos.inspr.at/ (canonical) and www.inspr.at/paimos/, so its locale and
// home links are relative. The retired ProductPage lives at /paimos-legacy,
// out of search indexes, and the old /paimos-aeon preview URL redirects.
const webUrl = new URL("../", import.meta.url);
const webFile = (path) => readFile(new URL(path, webUrl), "utf8");
const source = (path) => webFile(`src/${path}`);

const editions = [
  { locale: "en", route: "pages/paimos/index.astro", content: "content/paimos-aeon.ts", exportName: "paimosAeonContent", canonical: /canonicalUrl: siteUrls\.paimos,/ },
  { locale: "de", route: "pages/paimos/de/index.astro", content: "content/de/paimos-aeon.ts", exportName: "paimosAeonContentDe", canonical: /canonicalUrl: `\$\{siteUrls\.paimos\}\/de\/`,/ },
];

test("both /paimos editions render their own content through AeonPage", async () => {
  for (const { locale, route, exportName } of editions) {
    const page = await source(route);
    assert.match(page, /import AeonPage from "[./]+components\/AeonPage\.astro";/);
    assert.match(page, new RegExp(`import \\{ ${exportName} \\} from "[./]+content\\/(de\\/)?paimos-aeon";`));
    const expected = locale === "de"
      ? new RegExp(`<AeonPage content=\\{${exportName}\\} locale="de" />`)
      : new RegExp(`<AeonPage content=\\{${exportName}\\} />`);
    assert.match(page, expected, `${locale} route must render AeonPage`);
  }
});

test("the AEON page is canonical on the product host and indexable", async () => {
  const page = await source("components/AeonPage.astro");
  assert.match(page, /const englishUrl = siteUrls\.paimos;/);
  assert.match(page, /const germanUrl = `\$\{siteUrls\.paimos\}\/de\/`;/);
  assert.doesNotMatch(page, /robots=/, "the product page is indexable");
  const urls = await source("content/urls.ts");
  assert.match(urls, /paimos: "https:\/\/paimos\.inspr\.at",/);
});

test("locale, hreflang and the brand link work under both hosts", async () => {
  const page = await source("components/AeonPage.astro");
  assert.match(page, /const localLinks = locale === "de" \? \{ en: "\.\.\/", de: "\.\/", home: "\.\/" \} : \{ en: "\.\/", de: "de\/", home: "\.\/" \};/);
  assert.match(page, /alternateEnglish=\{englishUrl\}/);
  assert.match(page, /alternateGerman=\{germanUrl\}/);
  assert.match(page, /localePaths=\{\{ en: localLinks\.en, de: localLinks\.de \}\}/);
  assert.match(page, /languageLinks=\{\{ en: localLinks\.en, de: localLinks\.de \}\}/);
  assert.match(page, /homeHref=\{localLinks\.home\}/);
  const header = await source("components/MicrositeHeader.astro");
  assert.ok(header.includes("if (!/^(https?:)?\\//.test(href)) return `${href}?lang=${choice}`;"), "relative language links keep their path");
  assert.match(header, /href=\{homeHref \?\? siteUrls\[active\]\}/);
});

test("the retired Paimos page lives at /paimos-legacy, noindex and unlisted", async () => {
  const urls = await source("content/urls.ts");
  assert.match(urls, /paimosLegacy: "https:\/\/www\.inspr\.at\/paimos-legacy\/"/);
  assert.match(urls, /paimosLegacyGerman: "https:\/\/www\.inspr\.at\/paimos-legacy\/de\/"/);
  const productLinks = urls.slice(urls.indexOf("export const productLinks"));
  assert.doesNotMatch(productLinks, /paimosLegacy/, "the legacy page is not in the product navigation");
  for (const file of ["public/sitemap.xml", "public/robots.txt", "public/paimos/sitemap.xml"]) {
    assert.doesNotMatch(await webFile(file), /paimos-legacy/, `${file} must not list the legacy page`);
  }
  const productPage = await source("components/ProductPage.astro");
  assert.match(productPage, /robots=\{mount \? "noindex, follow" : undefined\}/);
  const layout = await source("layouts/MicrositeLayout.astro");
  assert.match(layout, /\{robots && <meta name="robots" content=\{robots\} \/>\}/);
});

test("the old /paimos-aeon preview URL redirects to /paimos/", async () => {
  const config = await webFile("astro.config.mjs");
  assert.match(config, /'\/paimos-aeon': '\/paimos\/'/);
  assert.match(config, /'\/paimos-aeon\/de': '\/paimos\/de\/'/);
  assert.match(config, /assetsInlineLimit: 0/, "the CSP-relevant build setting stays");
});

test("both editions declare their canonical, the release tag and no stray claims", async () => {
  const forbidden = [
    [/—/, "an em dash"],
    [/TALKBOX/i, "an operator session"],
    [/from-classic|classic import/i, "classic Paimos"],
    [/\bquotes?\b|\bAngebot/i, "the business module"],
    [/pm\.augmentoring|pm\.barta/i, "an internal instance"],
    [/semantic search|semantische Suche/i, "semantic search as live"],
    [/\/blob\/main\//, "a link that is not pinned to the release tag"],
  ];
  for (const { locale, content, exportName, canonical } of editions) {
    const text = await source(content);
    assert.match(text, new RegExp(`export const ${exportName} = \\{`));
    assert.match(text, canonical, `${locale} canonical`);
    assert.match(text, /const tag = "v260930115354\.0\.0";/, `${locale} presents the Hinged Hangar tag`);
    assert.match(text, /\} satisfies AeonContent;/);
    for (const [pattern, reason] of forbidden) {
      assert.doesNotMatch(text, pattern, `${locale} content must not contain ${reason}`);
    }
  }
});

test("every AEON icon and group resolves in ContextIcon and the specs union", async () => {
  const iconComponent = await source("components/ContextIcon.astro");
  const mapStart = iconComponent.indexOf("const iconMap = {");
  const mapBlock = iconComponent.slice(mapStart, iconComponent.indexOf("};", mapStart));
  const iconNames = new Set(
    [...mapBlock.matchAll(/^\s*(?:"([^"]+)"|([a-z0-9-]+)):/gm)].map((match) => match[1] ?? match[2]),
  );
  const types = await source("content/types.ts");
  const groups = new Set([...types.match(/group:\s*((?:"[a-z]+"\s*\|?\s*)+);/)[1].matchAll(/"([a-z]+)"/g)].map((m) => m[1]));
  for (const { locale, content } of editions) {
    const text = await source(content);
    const icons = [...text.matchAll(/^\s*icon:\s*"([^"]*)"/gm)].map((match) => match[1]);
    assert.ok(icons.length >= 20, `${locale} declares its icons`);
    for (const icon of icons) assert.ok(iconNames.has(icon), `${locale}: icon "${icon}" is not registered`);
    for (const [, group] of text.matchAll(/^\s*group:\s*"([^"]*)"/gm)) {
      assert.ok(groups.has(group), `${locale}: group "${group}" is not in the specs union`);
    }
  }
});

test("the German edition mirrors the English proof paths exactly", async () => {
  const paths = async (file) => [...(await source(file)).matchAll(/path: "([^"]+)"/g)].map((m) => m[1]);
  const english = await paths("content/paimos-aeon.ts");
  assert.ok(english.length >= 15, "every section keeps its proof links");
  assert.deepEqual(await paths("content/de/paimos-aeon.ts"), english);
});

test("every capture is recorded with its release, source and redaction policy", async () => {
  const manifest = JSON.parse(await source("assets/products/paimos-aeon/capture-manifest.json"));
  assert.equal(manifest.tag, "v260930115354.0.0");
  assert.match(manifest.commit, /^[0-9a-f]{40}$/);
  assert.equal(manifest.source, "https://aeon.barta.cm");
  assert.match(manifest.sourceVersionCheck, /260930115354\.0\.0/);
  assert.equal(typeof manifest.syntheticData, "boolean");
  assert.match(manifest.redaction, /e-mail/);
  const page = await source("components/AeonPage.astro");
  const imports = [...page.matchAll(/from "\.\.\/assets\/products\/paimos-aeon\/([\w-]+\.png)";/g)].map((m) => m[1]);
  assert.ok(imports.length >= 3 && imports.length <= 7, "the page shows a handful of live screens");
  const recorded = new Set(manifest.files.map((file) => file.name));
  for (const name of imports) assert.ok(recorded.has(name), `${name} is missing from the capture manifest`);
});

test("the capture gate covers every published AEON image with a digest", async () => {
  const { spawnSync } = await import("node:child_process");
  const result = spawnSync(process.execPath, ["scripts/check-aeon-captures.mjs"], { cwd: new URL("../", import.meta.url), encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
  const manifest = JSON.parse(await source("assets/products/paimos-aeon/capture-manifest.json"));
  const specs = manifest.files.filter((file) => file.name.startsWith("specs/"));
  assert.equal(specs.length, 20, "one lens image per capability");
  for (const file of manifest.files) assert.match(file.sha256, /^[0-9a-f]{64}$/, `${file.name} digest`);
  const pkg = JSON.parse(await webFile("package.json"));
  assert.match(pkg.scripts["captures:check"], /check-aeon-captures\.mjs/, "the build runs the AEON capture gate");
});
