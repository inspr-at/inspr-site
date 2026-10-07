import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const sourceUrl = new URL("../src/", import.meta.url);
const source = (relativePath) => readFile(new URL(relativePath, sourceUrl), "utf8");

// family.ts is typed TypeScript; node strips the types when it imports it
// (the same way the other tests read the content modules as text).
const family = await import(new URL("content/family.ts", sourceUrl));

const productKeys = ["aithema", "paimos", "pharos", "janus", "doctrine"];

test("the flow has the seven steps in order, with Doctrine underneath", () => {
  assert.deepEqual(family.flow.steps.map((step) => step.key), [
    "idea", "requirements", "plan", "build", "deploy", "access", "learn",
  ]);
  assert.deepEqual(family.flowKeys, family.flow.steps.map((step) => step.key));
  assert.equal(family.flow.underneath.product, "doctrine");
  for (const step of family.flow.steps) {
    for (const field of [step.label, step.who, step.line]) {
      assert.ok(field.en.trim() && field.de.trim(), `${step.key} has English and German copy`);
    }
  }
});

test("the flow labels are plain activities in English and German", () => {
  assert.deepEqual(family.flow.steps.map((step) => step.label.en), ["Idea", "Requirements", "Plan", "Build", "Deploy", "Access", "Learn"]);
  assert.deepEqual(family.flow.steps.map((step) => step.label.de), ["Idee", "Anforderungen", "Planung", "Entwicklung", "Bereitstellung", "Zugriff", "Lernen"]);
});

test("the five product question words are pinned in English and German", () => {
  assert.deepEqual(productKeys.map((key) => family.products[key].verb.en), ["Why", "What", "Where", "Who", "How"]);
  assert.deepEqual(productKeys.map((key) => family.products[key].verb.de), ["Wofür", "Was", "Wo", "Wer", "Wie"]);
  assert.equal(family.products.doctrine.name.en, "Doctrine");
  assert.equal(family.products.doctrine.name.de, "Doktrin");
  assert.equal(family.productRole("paimos"), "What · Plan and engine");
  assert.equal(family.productRole("janus", "de"), "Wer · Zugriff auf Geheimnisse");
});

test("every product has a one-liner in both languages", () => {
  for (const key of productKeys) {
    for (const locale of ["en", "de"]) {
      const line = family.products[key].oneLiner[locale];
      assert.ok(line.trim().length > 10, `${key} ${locale} one-liner is not empty`);
      assert.doesNotMatch(line, /TODO/i, `${key} ${locale} one-liner has no TODO`);
    }
  }
});

test("every status is live, partly or planned, and the labels cover all three", () => {
  const allowed = new Set(["live", "partly", "planned"]);
  assert.deepEqual(Object.keys(family.statusLabels).sort(), ["live", "partly", "planned"]);
  assert.equal(family.statusLabels.partly.de, "Teilweise live");
  const statuses = [
    ...Object.values(family.products).map((product) => product.status),
    ...family.flow.steps.map((step) => step.status).filter(Boolean),
    family.contract.status,
    ...family.actors.map((actor) => actor.status).filter(Boolean),
    ...family.buildOrder.map((item) => item.status),
    ...family.engineJobs.map((job) => job.status),
  ];
  for (const status of statuses) assert.ok(allowed.has(status), `${status} is a known status`);
});

test("the engine's six jobs, the build order and the actors are complete", () => {
  assert.deepEqual(family.engineJobs.map((job) => job.key), [
    "state", "admission", "rules", "effects", "escalation", "audit",
  ]);
  assert.deepEqual(family.engineJobs.map((job) => job.status), [
    "partly", "partly", "partly", "partly", "live", "live",
  ]);
  assert.equal(family.buildOrder.length, 5);
  assert.deepEqual(family.actors.map((actor) => actor.key), ["builders", "bots", "people"]);
  assert.equal(family.actors.find((actor) => actor.key === "bots").status, "planned");
  assert.equal(family.contract.steps.length, 5);
  assert.equal(
    family.contract.steps.map((step) => step.en.toLowerCase()).join(" → ") + ".",
    family.contract.line.en.toLowerCase(),
  );
});

test("family.ts carries no host names, internal domains or personal names", async () => {
  const text = await source("content/family.ts");
  assert.doesNotMatch(text, /barta\.cm|csb|hsb|mbp|\.lan\b/i);
  assert.doesNotMatch(text, /\bmarkus\b|\bbarta\b/i);
  assert.doesNotMatch(text, /TODO/);
});

test("productTaxonomy derives from family.ts and keeps the umbrella descriptor", async () => {
  const urls = await source("content/urls.ts");
  assert.match(urls, /import \{ productRole \} from "\.\/family";/);
  assert.match(urls, /inspr: "Open product family"/);
  for (const key of ["paimos", "pharos", "janus", "aithema"]) {
    assert.match(urls, new RegExp(`${key}: productRole\\("${key}"\\)`));
    assert.match(urls, new RegExp(`${key}: productRole\\("${key}", "de"\\)`));
  }
});

test("the band and chip are static: no script, no external resources", async () => {
  const [band, chip, header] = await Promise.all([
    source("components/FamilyBand.astro"),
    source("components/StatusChip.astro"),
    source("components/MicrositeHeader.astro"),
  ]);
  for (const component of [band, chip]) {
    assert.doesNotMatch(component, /<script|https?:\/\/|@import|url\(/);
  }
  assert.match(band, /locale\?: "en" \| "de"/);
  assert.match(header, /products\[active\]\.name\[locale\]\} · \$\{products\[active\]\.verb\[locale\]\}/);
});
