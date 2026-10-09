import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

// INSPR-492: /paimos is the PAIMOS AEON page. The same files serve
// paimos.inspr.at/ (canonical) and www.inspr.at/paimos/, so its locale and
// home links are relative. The retired ProductPage at /paimos-legacy is gone
// (INSPR-531), and the old /paimos-aeon preview URL redirects.
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
  assert.match(header, /href=\{homeHref \?\? \(locale === "de" \? `\$\{siteUrls\[active\]\}\/de\/` : siteUrls\[active\]\)\}/);
});

test("the retired Paimos page at /paimos-legacy is gone (INSPR-531)", async () => {
  const urls = await source("content/urls.ts");
  assert.doesNotMatch(urls, /paimosLegacy/, "the legacy URLs are removed");
  for (const route of ["pages/paimos-legacy/index.astro", "pages/paimos-legacy/de/index.astro"]) {
    await assert.rejects(source(route), { code: "ENOENT" }, `${route} is deleted`);
  }
  for (const file of ["public/sitemap.xml", "public/robots.txt", "public/paimos/sitemap.xml", "scripts/audit-section-patterns.mjs", "scripts/audit-hero-loops.mjs"]) {
    assert.doesNotMatch(await webFile(file), /paimos-legacy/, `${file} must not name the legacy page`);
  }
  assert.doesNotMatch(await webFile("../deploy.sh"), /paimos-legacy\/(de\/)?index\.html|paimos-legacy\/"/, "deploy.sh neither requires nor probes the legacy page");
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
    [/semantic search|semantische Suche/i, "semantic search as live"],
    [/\/blob\/main\//, "a link that is not pinned to the release tag"],
  ];
  for (const { locale, content, exportName, canonical } of editions) {
    const text = await source(content);
    assert.match(text, new RegExp(`export const ${exportName} = \\{`));
    assert.match(text, canonical, `${locale} canonical`);
    // INSPR-544: the release comes from the one paimosRelease constant.
    assert.match(text, /const tag = paimosRelease\.tag;/, `${locale} reads the release tag from paimosRelease`);
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
    assert.ok(icons.length >= 19, `${locale} declares its icons`);
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
  // INSPR-556: release-128 demos; legacy per-file records stay unchanged.
  assert.equal(manifest.tag, "v261009095632.0.0");
  assert.match(manifest.commit, /^[0-9a-f]{40}$/);
  assert.equal(manifest.source, "release-128 web UI with the repository's fictional test fixtures");
  assert.match(manifest.sourceVersionCheck, /verified release-128 source commit/);
  assert.equal(manifest.syntheticData, true);
  assert.equal(manifest.legacyCapture.tag, "v260930115354.0.0");
  assert.equal(typeof manifest.syntheticData, "boolean");
  assert.match(manifest.redaction, /sanitized before rendering/);
  assert.match(manifest.legacyCapture.redaction, /e-mail/);
  const page = await source("components/AeonPage.astro");
  const imports = [...page.matchAll(/from "\.\.\/assets\/products\/paimos-aeon\/([\w-]+\.png)";/g)].map((m) => m[1]);
  assert.ok(imports.length === 8, "six demo frames, plus the retained control and rules screens");
  const recorded = new Set(manifest.files.map((file) => file.name));
  for (const name of imports) assert.ok(recorded.has(name), `${name} is missing from the capture manifest`);
});

test("the capture gate covers every published AEON image with a digest", async () => {
  const { spawnSync } = await import("node:child_process");
  const result = spawnSync(process.execPath, ["scripts/check-aeon-captures.mjs"], { cwd: new URL("../", import.meta.url), encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
  const manifest = JSON.parse(await source("assets/products/paimos-aeon/capture-manifest.json"));
  const specs = manifest.files.filter((file) => file.name.startsWith("specs/"));
  // INSPR-544: capture 14 shows the retired Journey; it stays recorded but the
  // page leaves it out, so 19 capabilities use 19 of the 20 recorded images.
  assert.equal(specs.length, 20, "the manifest keeps every recorded lens image");
  for (const file of manifest.files) assert.match(file.sha256, /^[0-9a-f]{64}$/, `${file.name} digest`);
  const pkg = JSON.parse(await webFile("package.json"));
  assert.match(pkg.scripts["captures:check"], /check-aeon-captures\.mjs/, "the build runs the AEON capture gate");
});

// Repository paths belong in hyperlink destinations only, never in visible
// copy or link labels.
const visiblePath = /\b(?:internal|cmd|api)\/[a-z]/;

test("the Paimos content shows no repository paths outside link destinations", async () => {
  for (const file of ["content/paimos-aeon.ts", "content/de/paimos-aeon.ts"]) {
    const visible = (await source(file))
      .split("\n")
      .map((line) => line.replace(/\bpath:\s*"[^"]*"/g, 'path: ""').replace(/\bhref:.*$/, "href: _"))
      .join("\n");
    assert.doesNotMatch(visible, visiblePath, `${file} leaks a repository path into visible text`);
  }
});

test("the built Paimos pages render no repository path as visible text", async (t) => {
  for (const page of ["dist/paimos/index.html", "dist/paimos/de/index.html"]) {
    let html;
    try {
      html = await webFile(page);
    } catch {
      t.diagnostic(`${page} is not built; the content check above still covers the source`);
      continue;
    }
    const text = html
      .replace(/<(script|style)\b[\s\S]*?<\/\1>/g, " ")
      .replace(/<[^>]+>/g, " ");
    assert.doesNotMatch(text, visiblePath, `${page} shows a repository path`);
  }
});

// INSPR-556: exercise the new safety boundary with altered provenance and
// geometry, rather than merely pinning the new happy-path copy.
test("demo captures reject false release, fixture, safety and pixel provenance", async () => {
  const { demoProblems } = await import("../scripts/check-aeon-captures.mjs");
  const manifest = JSON.parse(await source("assets/products/paimos-aeon/capture-manifest.json"));
  const file = manifest.files.find((file) => file.name === "delivery.png");
  const bytes = await readFile(new URL(`src/assets/products/paimos-aeon/${file.name}`, webUrl));
  assert.deepEqual(demoProblems(manifest, file, bytes), []);
  for (const [field, value, reason] of [
    ["syntheticData", false, /synthetic data/],
    ["sourceRepository", "unknown/repo", /source repository/],
    ["releaseKind", "semver", /release kind/],
    ["tag", "v261009095633.0.0", /tag\/version/],
    ["commit", "a".repeat(40), /source commit/],
    ["route", "https://example.com", /relative app route/],
    ["fixtures", [], /named repository fixtures/],
    ["fixtures", ["../private.env"], /named repository fixtures/],
    ["safety", "", /safety record/],
    ["crop", { x: 1599, y: 0, width: 1528, height: 849 }, /fit the viewport/],
    ["width", 1, /PNG dimensions/],
    ["viewport", { width: 1600, height: 1100 }, /frame viewport/],
    ["viewport", { width: 1600, height: 1000 }, /fit the viewport/],
    ["deviceScaleFactor", 1, /frame viewport/],
  ]) {
    assert.match(demoProblems(manifest, { ...file, [field]: value }, bytes).join("\n"), reason, field);
  }
  const impossible = { ...file, tag: "v260230095632.0.0", version: "260230095632.0.0" };
  assert.match(demoProblems({ ...manifest, tag: impossible.tag }, impossible, bytes).join("\n"), /real calendar instant/);
  const corrupt = Buffer.from(bytes);
  corrupt[0] = 0;
  assert.match(demoProblems(manifest, file, corrupt).join("\n"), /must be a PNG/);
});

// Derive product origins from the public URL registry; W3C is the SVG namespace.
test("absolute URLs in AEON content and built pages use public hosts", async (t) => {
  const urlPattern = /https?:\/\/[^\s"'<>`]+/g;
  const registry = await source("content/urls.ts");
  const hosts = new Set(["github.com", "gnu.org", "www.w3.org", ...[...registry.matchAll(urlPattern)].map(([url]) => new URL(url).hostname)]);
  const publicHost = (host) => hosts.has(host) || host === "inspr.at" || host.endsWith(".inspr.at");
  for (const suffix of ["cm", "lan", "ng", "net"]) assert.equal(publicHost(`private.${suffix}`), false);
  for (const file of ["src/content/paimos-aeon.ts", "src/content/de/paimos-aeon.ts", "dist/paimos/index.html", "dist/paimos/de/index.html"]) {
    let text;
    try { text = await webFile(file); } catch (error) {
      if (!file.startsWith("dist/") || error.code !== "ENOENT") throw error;
      t.diagnostic(`${file} is not built; public-host checks still cover source`);
      continue;
    }
    for (const [url] of text.matchAll(urlPattern)) assert.ok(publicHost(new URL(url).hostname), `${file} contains a non-public URL host`);
    for (const [host] of text.matchAll(/\b(?:[a-z0-9-]+\.)+(?:cm|lan|ng)\b/gi)) assert.ok(publicHost(host.toLowerCase()), `${file} contains a non-public domain`);
  }
});

test("the home-page bot status distinguishes released recurring tickets from planned bots", async () => {
  const family = await source("content/family.ts");
  const bots = family.slice(family.indexOf('key: "bots"'), family.indexOf('key: "bots"') + 700);
  assert.match(bots, /status: "planned"/);
  assert.match(bots, /Recurring tickets live; bots and Routines planned/);
  assert.match(bots, /Wiederkehrende Tickets live; Bots und Routinen geplant/);
  assert.doesNotMatch(bots, /First adapter live|Erster Adapter live/);
});

test("the 19 capability cards keep distinct review and delivery icons", async () => {
  for (const file of ["content/paimos-aeon.ts", "content/de/paimos-aeon.ts"]) {
    const text = await source(file);
    const cards = text.slice(text.indexOf("items: ["), text.indexOf("glossary: ["));
    const icons = [...cards.matchAll(/icon: "([^"]+)"/g)].map((match) => match[1]);
    assert.equal(icons.length, 19);
    for (const icon of ["git-compare-arrows", "waypoints"]) assert.equal(icons.filter((name) => name === icon).length, 1);
    assert.match(cards, /label: "(?:Accounts and models|Konten und Modelle)"/);
  }
});
