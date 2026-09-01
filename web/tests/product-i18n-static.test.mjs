import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const webUrl = new URL("../", import.meta.url);
const rootUrl = new URL("../../", import.meta.url);
const webFile = (path) => readFile(new URL(path, webUrl), "utf8");
const rootFile = (path) => readFile(new URL(path, rootUrl), "utf8");
const source = (path) => webFile(`src/${path}`);

// The released products rendered through the shared ProductPage. Aithema is
// asserted separately because its preview model carries fewer claims.
const products = [
  {
    slug: "paimos",
    exportName: "paimosContentDe",
    host: "paimos.inspr.at",
    germanHero: "Ein gemeinsames Projektbild.",
  },
  {
    slug: "pharos",
    exportName: "pharosContentDe",
    host: "pharos.inspr.at",
    germanHero: "Flottenwahrheit vor Aktion.",
  },
  {
    slug: "janus",
    exportName: "janusContentDe",
    host: "janus.inspr.at",
    germanHero: "Geheimnisse nutzen. Werte verbergen.",
  },
];

const countMatches = (text, pattern) => (text.match(pattern) ?? []).length;

test("each product host serves a German edition through the shared page components", async () => {
  for (const { slug, exportName } of products) {
    const route = await source(`pages/${slug}/de/index.astro`);
    assert.match(
      route,
      /import ProductPage from "\.\.\/\.\.\/\.\.\/components\/ProductPage\.astro";/,
      `${slug} German route must use the shared product page`,
    );
    assert.match(
      route,
      new RegExp(`import \\{ ${exportName} \\} from "\\.\\.\\/\\.\\.\\/\\.\\.\\/content\\/de\\/${slug}";`),
      `${slug} German route must import its German content`,
    );
    assert.match(
      route,
      new RegExp(`<ProductPage content=\\{${exportName}\\} locale="de" \\/>`),
      `${slug} German route must render ProductPage in German`,
    );
  }

  const aithemaRoute = await source("pages/aithema/de/index.astro");
  assert.match(aithemaRoute, /import AithemaProductPage from "\.\.\/\.\.\/\.\.\/components\/AithemaProductPage\.astro";/);
  assert.match(aithemaRoute, /import \{ aithemaContentDe \} from "\.\.\/\.\.\/\.\.\/content\/de\/aithema";/);
  assert.match(aithemaRoute, /<AithemaProductPage content=\{aithemaContentDe\} locale="de" \/>/);
});

test("German product content keeps canonical /de/ URLs and the shared copy rules", async () => {
  for (const { slug } of products) {
    const content = await source(`content/de/${slug}.ts`);

    assert.match(
      content,
      new RegExp(`canonicalUrl: \`\\$\\{siteUrls\\.${slug}\\}/de/\``),
      `${slug} German canonical must live under /de/ on the product host`,
    );
    assert.match(content, /import \{ siteUrls \} from "\.\.\/urls";/);
    assert.ok(!content.includes("—"), `${slug} German content contains an em dash`);
    assert.doesNotMatch(
      content,
      /https:\/\/(?:amt\.inspr\.at|augmentoring\.com)/,
      `${slug} German content must not hardcode the business host`,
    );
    assert.match(content, /name:\s*"AGPL-3\.0-only"/);
    assert.doesNotMatch(content, /name:\s*"MIT"/);
    assert.match(content, /primaryHref:\s*"#model"/);
    assert.match(content, new RegExp(`github\\.com/inspr-at/${slug}`));
    assert.match(content, /satisfies ProductContent/);

    const model = content.slice(content.indexOf("model:"), content.indexOf("featureSections:"));
    assert.match(model, /icon:/, `${slug} German workflow needs contextual SVG icons`);
    assert.match(model, /signal:/, `${slug} German workflow needs a concrete result signal`);
    assert.match(model, /reference:/, `${slug} German workflow needs inspectable evidence`);
    assert.match(model, /visual: \{ x: \d+, y: \d+ \}/, `${slug} German workflow needs image-linked stages`);
  }

  const aithema = await source("content/de/aithema.ts");
  assert.match(aithema, /canonicalUrl: `\$\{siteUrls\.aithema\}\/de\/`/);
  assert.match(aithema, /previewUrl: siteUrls\.aithemaPreview/);
  assert.match(aithema, /satisfies PreviewProductContent/);
  assert.match(aithema, /start\.augmentoring\.com/);
  assert.ok(!aithema.includes("—"), "Aithema German content contains an em dash");
  assert.doesNotMatch(aithema, /github\.com/);
  assert.doesNotMatch(aithema, /AGPL|MIT|repositoryUrl|releaseUrl/);
});

test("German product content mirrors the English structure claim for claim", async () => {
  const structuralMarkers = [
    [/^\s*question:/gm, "faq questions"],
    [/^\s*number: "/gm, "workflow steps"],
    [/^\s*status: "/gm, "integration maturity labels"],
    [/^\s*icon: "/gm, "contextual icons"],
    [/^\s*reference: \{/gm, "evidence references"],
    [/^\s*visual: \{/gm, "image-linked stages"],
  ];

  for (const { slug } of products) {
    const english = await source(`content/${slug}.ts`);
    const german = await source(`content/de/${slug}.ts`);
    for (const [pattern, description] of structuralMarkers) {
      assert.equal(
        countMatches(german, pattern),
        countMatches(english, pattern),
        `${slug}: German edition must keep the same number of ${description}`,
      );
    }
  }

  // The Paimos specs grid and glossary must not silently lose tiles.
  const paimosEnglish = await source("content/paimos.ts");
  const paimosGerman = await source("content/de/paimos.ts");
  assert.equal(
    countMatches(paimosGerman, /^\s*noteEli10:/gm),
    countMatches(paimosEnglish, /^\s*noteEli10:/gm),
  );
  assert.equal(
    countMatches(paimosGerman, /^\s*matches: \[/gm),
    countMatches(paimosEnglish, /^\s*matches: \[/gm),
  );

  const aithemaEnglish = await source("content/aithema.ts");
  const aithemaGerman = await source("content/de/aithema.ts");
  assert.equal(
    countMatches(aithemaGerman, /^\s*question:/gm),
    countMatches(aithemaEnglish, /^\s*question:/gm),
  );
  assert.equal(
    countMatches(aithemaGerman, /^\s*number: "/gm),
    countMatches(aithemaEnglish, /^\s*number: "/gm),
  );
});

test("every German content icon and group resolves in ContextIcon and the tile type", async () => {
  const iconComponent = await source("components/ContextIcon.astro");
  const mapStart = iconComponent.indexOf("const iconMap = {");
  assert.ok(mapStart >= 0, "ContextIcon declares iconMap");
  const mapBlock = iconComponent.slice(mapStart, iconComponent.indexOf("};", mapStart));
  const iconNames = new Set(
    [...mapBlock.matchAll(/^\s*(?:"([^"]+)"|([a-z0-9-]+)):/gm)].map((match) => match[1] ?? match[2]),
  );

  const types = await source("content/types.ts");
  const groupUnion = types.match(/group:\s*((?:"[a-z]+"\s*\|?\s*)+);/);
  assert.ok(groupUnion, "types.ts declares the specs group union");
  const groups = new Set([...groupUnion[1].matchAll(/"([a-z]+)"/g)].map((match) => match[1]));

  for (const slug of ["paimos", "pharos", "janus", "aithema"]) {
    const content = await source(`content/de/${slug}.ts`);
    const icons = [...content.matchAll(/^\s*icon:\s*"([^"]*)"/gm)].map((match) => match[1]);
    assert.ok(icons.length > 0, `${slug} German content declares contextual icons`);
    for (const icon of icons) {
      assert.ok(iconNames.has(icon), `${slug} de: icon "${icon}" is not registered in ContextIcon`);
    }
    for (const [, group] of content.matchAll(/^\s*group:\s*"([^"]*)"/gm)) {
      assert.ok(groups.has(group), `${slug} de: group "${group}" is not in the specs group union`);
    }
  }
});

test("product pages expose the shared locale contract with alternates and a language switch", async () => {
  const productPage = await source("components/ProductPage.astro");
  const aithemaPage = await source("components/AithemaProductPage.astro");

  for (const page of [productPage, aithemaPage]) {
    assert.match(page, /const locale: "en" \| "de" = Astro\.props\.locale === "de" \? "de" : "en";/);
    assert.match(page, /alternateEnglish=\{englishUrl\}/);
    assert.match(page, /alternateGerman=\{germanUrl\}/);
    assert.match(page, /detectLocale=\{locale === "en"\}/);
    assert.match(page, /locale=\{locale\}/);
  }

  assert.match(productPage, /const englishUrl = siteUrls\[content\.slug\];/);
  assert.match(productPage, /const germanUrl = `\$\{englishUrl\}\/de\/`;/);
  assert.match(productPage, /languageLinks=\{\{ en: "\/", de: "\/de\/" \}\}/);
  assert.match(productPage, /<ServiceRibbon text=\{content\.serviceIntro\} locale=\{locale\} \/>/);
  assert.match(productPage, /content\.slug === "paimos" && <PaimosProductSurface locale=\{locale\} \/>/);
  assert.match(productPage, /<MicrositeFooter[\s\S]*?locale=\{locale\}/);
  assert.match(productPage, /<WorkflowExplorer[\s\S]*?locale=\{locale\}/);
  assert.match(productPage, /<HeroLoop[\s\S]*?locale=\{locale\}/);
  assert.match(productPage, /<InspectableRail[\s\S]*?locale=\{locale\}/);
  assert.match(productPage, /<FeatureExperience[\s\S]*?locale=\{locale\}/);
  assert.match(productPage, /<AudiencePaths[\s\S]*?locale=\{locale\}/);
  assert.match(productPage, /<FractureAtlas[\s\S]*?locale=\{locale\}/);
  assert.match(productPage, /<ConstraintRegister[\s\S]*?locale=\{locale\}/);
  assert.match(productPage, /<ProvenanceReceipt[\s\S]*?locale=\{locale\}/);

  // Aithema's bespoke header carries the same accessible DE | EN switch.
  assert.match(aithemaPage, /class="language-switch"/);
  assert.match(aithemaPage, /data-language-choice="de"/);
  assert.match(aithemaPage, /data-language-choice="en"/);
  assert.match(aithemaPage, /url\.searchParams\.set\("lang", choice\)/);
  assert.match(aithemaPage, /aria-current=\{locale === "de" \? "page" : undefined\}/);
  assert.match(aithemaPage, /aria-current=\{locale === "en" \? "page" : undefined\}/);
});

test("no product UI chrome or accessible label stays untranslated in German", async () => {
  const productPage = await source("components/ProductPage.astro");
  for (const phrase of [
    'navWhy: "Warum"',
    'navSource: "Quellcode"',
    'viewSource: "Quellcode ansehen"',
    'proofAria: "Produktmerkmale"',
    'specsShuffle: "Eckdaten-Raster mischen"',
    'capabilityRailLabel: "Das Fähigkeitssystem nachverfolgen"',
    'trustRailLabel: "Jede durchgesetzte Grenze prüfen"',
    'integrationFilterAria: "Integrationen nach Reifegrad filtern"',
    'integrationTableAria: "Integrationsmatrix"',
    'policyPlane: "Richtlinien- und Aufsichtsebene"',
    'faqTitle: "Bevor Sie es einführen."',
  ]) {
    assert.ok(productPage.includes(phrase), `missing German ProductPage label: ${phrase}`);
  }

  const componentLabels = [
    ["components/ConstraintRegister.astro", "Deklarierte Produktgrenzen"],
    ["components/AudiencePaths.astro", "Betriebsperspektiven"],
    ["components/FractureAtlas.astro", "Problemkarte"],
    ["components/InspectableRail.astro", "Betriebssignal"],
    ["components/ProvenanceReceipt.astro", "INSPR / QUELLENBELEG"],
    ["components/FeatureExperience.astro", "ein gemeinsames Betriebsbild"],
    ["components/PaimosProductSurface.astro", "Automatischen Ablauf pausieren"],
    ["components/AithemaProductPage.astro", "Aithema-Verfügbarkeit"],
  ];
  for (const [path, phrase] of componentLabels) {
    const component = await source(path);
    assert.ok(component.includes(phrase), `${path} is missing German label: ${phrase}`);
  }

  // The shared client scripts stay locale-neutral: labels travel on data
  // attributes rendered by the page.
  const surface = await source("components/PaimosProductSurface.astro");
  assert.match(surface, /data-pause-label=\{labels\.pause\}/);
  assert.match(surface, /root\.dataset\.resumeAccessibleLabel/);
  assert.match(productPage, /data-label-flip=\{labels\.specsFlipAll\}/);
  assert.match(productPage, /data-count-label=\{labels\.integrationShown\}/);
  const specsPin = await webFile("public/scripts/specs-pin.js");
  assert.match(specsPin, /dataset\.labelUnflip/);
  assert.match(specsPin, /dataset\.labelFlip/);
  const matrixScript = productPage.slice(productPage.indexOf("initIntegrationMatrices"));
  assert.match(matrixScript, /count\?\.dataset\.countLabel/);
});

test("host discovery, deployment gates and audits cover the German editions", async () => {
  const deploy = await rootFile("deploy.sh");
  const audit = await webFile("scripts/audit-section-patterns.mjs");

  for (const { slug, host, germanHero } of products) {
    const sitemap = await webFile(`public/${slug}/sitemap.xml`);
    const robots = await webFile(`public/${slug}/robots.txt`);
    assert.ok(sitemap.includes(`<loc>https://${host}/</loc>`));
    assert.ok(sitemap.includes(`<loc>https://${host}/de/</loc>`));
    assert.equal(countMatches(robots, /Sitemap:/g), 1);

    assert.ok(deploy.includes(`"${slug}/de/index.html"`), `${slug} German page must be a required build output`);
    assert.ok(
      deploy.includes(`test -f '$REMOTE_INCOMING/${slug}/de/index.html'`),
      `${slug} German page must be verified after upload`,
    );
    assert.ok(
      deploy.includes(`probe_page "${slug[0].toUpperCase()}${slug.slice(1)} German microsite" "https://${host}/de/" "${germanHero}"`),
      `${slug} German page must be probed after promotion`,
    );

    const german = await source(`content/de/${slug}.ts`);
    assert.ok(german.includes(germanHero), `${slug} German hero must match the deploy probe phrase`);
    assert.match(audit, new RegExp(`name: "${slug}-de"`));
  }

  const aithemaSitemap = await webFile("public/aithema/sitemap.xml");
  assert.ok(aithemaSitemap.includes("<loc>https://aithema.inspr.at/de/</loc>"));
  assert.match(deploy, /required_documents\+=\("aithema\/index\.html" "aithema\/de\/index\.html"\)/);
  assert.match(
    deploy,
    /probe_page "Aithema German microsite" "https:\/\/aithema\.inspr\.at\/de\/" "Anforderungen, die Sie vor Arbeitsbeginn freigeben\."/,
  );
  const aithemaGerman = await source("content/de/aithema.ts");
  assert.ok(aithemaGerman.includes("Anforderungen, die Sie vor Arbeitsbeginn freigeben."));
  assert.match(audit, /name: "aithema-de"/);
});

test("German cross-host product links land on the sibling German edition", async () => {
  const header = await source("components/MicrositeHeader.astro");
  const footer = await source("components/MicrositeFooter.astro");
  const aithemaPage = await source("components/AithemaProductPage.astro");

  for (const component of [header, footer, aithemaPage]) {
    assert.match(
      component,
      /locale === "de" \? `\$\{href\}\/de\/\?lang=de` : href/,
      "product links must carry the German choice across hosts",
    );
    assert.match(component, /productHref\(item\.href\)/);
  }
});
