import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = (path) => readFile(new URL(`../src/${path}`, import.meta.url), "utf8");
const editions = async (slug) => Promise.all([
  source(`content/${slug}.ts`),
  source(`content/de/${slug}.ts`),
]);

test("INSPR-545 microsites use the family one-liners and highlighted flow near the hero", async () => {
  for (const slug of ["pharos", "janus", "aithema"]) {
    const [en, de] = await editions(slug);
    assert.match(en, new RegExp(`description: products\\.${slug}\\.oneLiner\\.en`));
    assert.match(de, new RegExp(`description: products\\.${slug}\\.oneLiner\\.de`));
    assert.doesNotMatch(en + de, new RegExp(String.raw`Markus|nixcfg|${["barta", "cm"].join("\\.")}|\b(?:hsb|csb|mbp)\d`, "i"));
  }
  for (const file of ["ProductPage", "AithemaProductPage"]) {
    const page = await source(`components/${file}.astro`);
    const band = page.indexOf("<FamilyBand");
    assert.ok(band > page.indexOf('id="hero-title"'));
    assert.ok(band < page.indexOf('class="proof-console'));
    assert.match(page, /<FamilyBand highlight=\{content\.slug\} locale=\{locale\} \/>|<FamilyBand highlight="aithema" locale=\{locale\} \/>/);
  }
  // The band carries the contract: the standalone fact without a status word,
  // "Planned" only on the connection that is being built. INSPR-554: the status
  // is a plain word in the sentence, not a chip.
  const band = await source("components/FamilyBand.astro");
  assert.match(band, /\{contract\.standalone\[locale\]\}\s+\{contract\.standaloneToday\[locale\]\}\s+<em>\{statusLabels\[contract\.status\]\[locale\]\}:<\/em>\s+\{contract\.planned\[locale\]\}/);
  assert.doesNotMatch(band, /<StatusChip/);
});

test("INSPR-545 Pharos keeps attended provisioning live and dates neither planned integration", async () => {
  const [en, de] = await editions("pharos");
  assert.match(en, /version: "260925163010\.0\.0"/);
  assert.match(de, /import \{ pharosBlob, pharosRelease \} from "\.\.\/pharos"/);
  assert.match(en, /Provisioning is attended, one server at a time\./);
  assert.match(de, /Die Provisionierung erfolgt betreut, ein Server nach dem anderen\./);
  for (const [locale, content] of [["en", en], ["de", de]]) {
    const planned = [...content.matchAll(/\{\s*name: "([^"]+)",\s*status: statusLabels\.planned\.(?:en|de),\s*description:\s*"([^"]+)"/g)];
    assert.equal(planned.length, 2, `${locale}: Paimos tool and temporary VM paths are planned`);
    for (const [, name, description] of planned) assert.doesNotMatch(name + description, /\d{4}-\d{2}|\b20\d{2}\b/);
  }
  assert.doesNotMatch(en, /authorisation|artefact behind/);
  assert.doesNotMatch(de, /title: "Absichern"|durch ein Tor|\bGate\b/);
  assert.match(de, /title: "Freigabe"/);
});

test("INSPR-545 Janus separates human OIDC from planned agent brokering and Paimos", async () => {
  const [en, de] = await editions("janus");
  assert.match(en, /version: "260927081542\.0\.0"/);
  assert.match(de, /import \{ janusRelease \} from "\.\.\/janus"/);
  assert.match(en, /status: `\$\{statusLabels\.live\.en\} for human OIDC oversight`/);
  assert.match(de, /status: `\$\{statusLabels\.live\.de\} für menschliche OIDC-Aufsicht`/);
  assert.match(en, /ZITADEL remains the identity provider for people/);
  assert.match(de, /ZITADEL bleibt der Identitätsanbieter für Menschen/);
  assert.match(en, /name: "Agent and bot identity broker",\s*status: statusLabels\.planned\.en/);
  assert.match(de, /name: "Broker für Agenten- und Bot-Identitäten",\s*status: statusLabels\.planned\.de/);
  for (const [locale, content] of [["en", en], ["de", de]]) {
    assert.match(content, new RegExp(`name: "Paimos[^"\\n]+",\\s*status: statusLabels\\.planned\\.${locale}`));
  }
  assert.doesNotMatch(en + de, /implements durable separation of duties|setzt dauerhafte Funktionstrennung/);
});

test("INSPR-545 Aithema maturity and planned handover remain visible at every detail level", async () => {
  const page = await source("components/AithemaProductPage.astro");
  const hero = page.slice(page.indexOf('class="product-hero page-shell"'), page.indexOf("<FamilyBand"));
  assert.match(hero, /<StatusChip status=\{products\.aithema\.status\} locale=\{locale\} \/>/);
  assert.match(hero, /\{labels\.coreRelease\} \{aithemaReleaseVersion\}; \{products\.aithema\.statusNote\?\.\[locale\]\}/);
  assert.match(hero, /<p><StatusChip status="planned" locale=\{locale\} \/> \{aithemaHandover\[locale\]\}<\/p>/);
  assert.doesNotMatch(hero, /data-depth-min/);
  assert.match(page, /<small>\{products\.aithema\.name\[locale\]\} · \{products\.aithema\.verb\[locale\]\}<\/small>/);
  const [en, de] = await editions("aithema");
  assert.match(en, /aithemaReleaseVersion = "0\.10\.1"/);
  assert.match(en, /Handover of approved requirements to Paimos is planned\./);
  assert.match(en, /Die Übergabe freigegebener Anforderungen an Paimos ist geplant\./);
  assert.match(en, /Aithema is part of INSPR, open source under AGPL-3\.0-only\./);
  assert.match(de, /Aithema ist Teil von INSPR, quelloffen unter AGPL-3\.0-only\./);
  assert.doesNotMatch(en, /organises|artefact behind/);
  assert.doesNotMatch(de, /Anforderungspaket/);
  assert.match(en, /Augmentoring provides the hosted Aithema workspace by invitation and professional requirements support\./);
  assert.match(de, /Augmentoring stellt den gehosteten Aithema-Arbeitsbereich auf Einladung bereit und begleitet Anforderungen professionell\./);
});

test("INSPR-545 German rails, workflow alt text and Janus source label are translated", async () => {
  const page = await source("components/ProductPage.astro");
  const rail = await source("components/InspectableRail.astro");
  const [, janus] = await editions("janus");
  assert.match(page, /gate: "Freigabe"/);
  assert.match(page, /Ein Instrument zur Flottensteuerung/);
  assert.match(page, /Eine Anfrage mit Geheimnisnutzung/);
  assert.match(rail, /counter: "Signal", of: "von"/);
  assert.doesNotMatch(rail, /\sSignal \{String/);
  assert.doesNotMatch(janus, /Envelope|OPEN SOURCE/);
  assert.match(janus, /eyebrow: "QUELLOFFEN"/);
  const header = await source("components/MicrositeHeader.astro");
  assert.match(header, /homeHref \?\? \(locale === "de" \? `\$\{siteUrls\[active\]\}\/de\/`/);
});

// INSPR-555: the owner's antipattern list (guideline GUI-27). No decorative
// event ticker, no big-number stat row, and the operating profile is a plain
// list without a count cell or numbered circles.
test("INSPR-555 product pages drop the ticker, the number row and the numbered profile cells", async () => {
  const [aeon, aeonCss, product, aithema, css] = await Promise.all([
    source("components/AeonPage.astro"),
    source("styles/aeon.css"),
    source("components/ProductPage.astro"),
    source("components/AithemaProductPage.astro"),
    source("styles/microsites.css"),
  ]);
  assert.doesNotMatch(aeon + aeonCss, /aeon-ribbon|event-ribbon|aeon-marquee/);
  assert.doesNotMatch(aeon + aeonCss, /aeon-figures__value/);
  const claimCounts = [];
  for (const slug of ["paimos-aeon", "de/paimos-aeon"]) {
    const content = await source(`content/${slug}.ts`);
    assert.doesNotMatch(content, /ribbon/);
    const figures = content.slice(content.indexOf("  figures: ["), content.indexOf("  theatre: {"));
    // Comment lines may sit between the fields (the OpenAPI link carries one).
    const claims = [...figures.matchAll(/claim:\s*"([^"]+)",\s*linkLabel:\s*"([^"]+)",\s*(?:\/\/[^\n]*\n\s*)*href:\s*([^\n]+),/g)];
    assert.equal(claims.length, (figures.match(/\bclaim:/g) ?? []).length, `${slug}: every claim has a label and a link`);
    assert.ok(claims.length >= 2 && claims.length <= 3, `${slug}: two or three linked claims`);
    claimCounts.push(claims.length);
    for (const [, claim, , href] of claims) {
      assert.match(claim, /\.$/, `${slug}: "${claim}" is a sentence`);
      assert.match(href, /^"#[a-z-]+"$|^blob\("[^"]+"\)$/, `${slug}: ${href} points at the page or the source`);
    }
  }
  assert.equal(claimCounts[0], claimCounts[1], "English and German show the same claims");
  for (const page of [product, aithema]) {
    assert.doesNotMatch(page, /proof-strip__index|content\.proof\.length/);
    assert.match(page, /<ul class="proof-strip" role="list">\s*\{content\.proof\.map\(\(item\) => <li>\{item\}<\/li>\)\}\s*<\/ul>/);
  }
  const proofCss = css.slice(css.indexOf("  .proof-console {"), css.indexOf("  .section {"));
  assert.doesNotMatch(proofCss, /border-radius|box-shadow|backdrop-filter|linear-gradient|:hover|text-transform:\s*uppercase|font-style:\s*italic/);
});
