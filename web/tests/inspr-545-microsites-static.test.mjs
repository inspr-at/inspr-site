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
    assert.doesNotMatch(en + de, /Markus|nixcfg|barta\.cm|\b(?:hsb|csb|mbp)\d/i);
  }
  for (const file of ["ProductPage", "AithemaProductPage"]) {
    const page = await source(`components/${file}.astro`);
    const band = page.indexOf("<FamilyBand");
    assert.ok(band > page.indexOf('id="hero-title"'));
    assert.ok(band < page.indexOf('class="proof-console'));
    assert.match(page, /<FamilyBand highlight=\{content\.slug\} locale=\{locale\} \/>|<FamilyBand highlight="aithema" locale=\{locale\} \/>/);
  }
  // The band carries the contract: the standalone fact without a chip, the
  // Planned chip only on the connection that is being built.
  const band = await source("components/FamilyBand.astro");
  assert.match(band, /\{contract\.standalone\[locale\]\}\s*<StatusChip status=\{contract\.status\} locale=\{locale\} \/>\s*\{contract\.statusNote\[locale\]\}/);
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
