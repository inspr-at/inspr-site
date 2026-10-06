import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

// INSPR-543 (slice W of INSPR-540): the home page and the overview tell the shared GUI-22
// story truthfully, in both languages, from the single family.ts source.
const sourceUrl = new URL("../src/", import.meta.url);
const source = (relativePath) => readFile(new URL(relativePath, sourceUrl), "utf8");
const family = await import(new URL("content/family.ts", sourceUrl));

const surfaces = [
  "pages/index.astro",
  "components/HomeFlow.astro",
  "components/OverviewPage.astro",
  "components/OverviewStack.astro",
];

test("no surface claims an integrated, human-gated four-tool pipeline", async () => {
  const claims = [
    /Four tools, one path/i,
    /Vier Werkzeuge, ein Weg/i,
    /a review at every handoff/i,
    /Every handoff waits for you/i,
    /Jede Übergabe wartet auf Sie/i,
    /blocks on an explicit (?:human )?approval/i,
    /follow the whole path/i,
    /You approve each step/i,
    /Sie geben jeden Schritt frei/i,
    /Four tools take it from there/i,
    /staged (?:build|result)|Staging-Build/i,
    /Aithema · Requirements|Paimos · Build|Pharos · Deploy|Janus · Enforce/,
  ];
  for (const path of [...surfaces, "content/paimos.ts", "content/de/paimos.ts"]) {
    const text = await source(path);
    for (const claim of claims) assert.doesNotMatch(text, claim, `${path}: ${claim}`);
  }
});

test("Paimos content marks intake and handoffs planned and drops the retired Journey", async () => {
  for (const [name, path] of [["en", "content/paimos.ts"], ["de", "content/de/paimos.ts"]]) {
    const text = await source(path);
    assert.doesNotMatch(text, /journey|Weg des Releases|Wegansicht|Inspire/i, `${name}: no Journey stages`);
    assert.doesNotMatch(text, /Five agent harnesses|Fünf Agenten-Harnesses/, `${name}: no five-harness claim`);
    assert.match(text, /status: "(?:Planned|Geplant)"/, `${name}: Aithema, Pharos and Janus integrations are planned`);
  }
  const en = await source("content/paimos.ts");
  assert.match(en, /title: "Cited intake \(planned\)"/);
  assert.match(en, /Claude Code, Codex, Cursor and pi start under Paimos on macOS and Linux/);
  assert.match(en, /Grok runs tool-free on Apple silicon; Gemini and OpenCode pair only/);
  const de = await source("content/de/paimos.ts");
  assert.match(de, /Claude Code, Codex, Cursor und pi starten unter Paimos \(macOS und Linux\)/);
  assert.match(de, /Gemini und OpenCode sind nur gekoppelt/);
});

test("the home and the overview read the shared message, flow, statuses and one-liners", async () => {
  const [home, overview, flowComponent] = await Promise.all([
    source("pages/index.astro"),
    source("components/OverviewPage.astro"),
    source("components/HomeFlow.astro"),
  ]);

  assert.match(home, /message\.hero\[locale\]/);
  assert.match(home, /message\.sub\[locale\]/);
  assert.match(home, /message\.houseRule\[locale\]/);
  assert.match(home, /familyProducts\[product\.key\]\.oneLiner\[locale\]/);
  assert.match(home, /productRole\("aithema", locale\)/);
  assert.match(home, /<StatusChip status=\{familyProducts\[product\.key\]\.status\}/);
  assert.match(home, /AGPL-3\.0-only/);
  assert.match(flowComponent, /flow\.steps\.map/);
  assert.match(overview, /flow\.steps\.find/);

  // The stage names and question words are not typed out a second time.
  const labelPairs = family.flow.steps.map((step) => `copy("${step.label.en}", "${step.label.de}")`);
  for (const [name, text] of [["home", home], ["overview", overview], ["flow", flowComponent]]) {
    for (const pair of labelPairs) assert.ok(!text.includes(pair), `${name} repeats ${pair}`);
    assert.doesNotMatch(text, /Why · What · Where|Wofür · Was · Wo/, `${name} repeats the question words`);
  }

  // Contract, actors and the build order show their status; planned items carry no dates.
  assert.match(home, /<StatusChip status=\{contract\.status\}/);
  assert.match(home, /<StatusChip status=\{actor\.status\}/);
  assert.match(home, /<StatusChip status=\{item\.status\}/);
  assert.equal(family.contract.status, "planned");
  for (const text of [home, overview]) assert.doesNotMatch(text, /\b20\d\d-\d\d-\d\d\b|\bQ[1-4] 20\d\d\b/);
});

test("the overview states the engine's six jobs, the house rule and the trust contexts with their status", async () => {
  const overview = await source("components/OverviewPage.astro");
  assert.match(overview, /engineJobs\.map\(\(job, index\) =>/);
  assert.match(overview, /<StatusChip status=\{job\.status\} locale=\{locale\} \/>/);
  assert.match(overview, /message\.houseRule\[locale\]/);
  assert.match(overview, /Desired state lives in git, the products reconcile it, and drift becomes visible\./);
  assert.match(overview, /Der Sollzustand liegt in Git, die Produkte gleichen ihn ab, und Abweichungen werden sichtbar\./);
  assert.match(overview, /trustContexts\[locale\]/);
  assert.match(overview, /<StatusChip status=\{contract\.status\} locale=\{locale\} \/>/);
  assert.match(overview, /Aithema, Paimos, Pharos and Janus are open source under AGPL-3\.0-only\./);
  assert.match(overview, /The Doctrine is AGPL-3\.0-only too\./);
  assert.match(overview, /Auch die Doktrin steht unter AGPL-3\.0-only\./);
  assert.match(overview, /broker for agent identities planned/);
});

test("the stack states the verified facts: inspr.at DNS declared, the rest planned, provisioning attended", async () => {
  const stack = await source("components/OverviewStack.astro");
  assert.match(stack, /the DNS of inspr\.at and the OIDC identity provider behind every sign-in/);
  assert.match(stack, /das DNS von inspr\.at und der OIDC-Identitätsanbieter hinter jeder Anmeldung/);
  assert.match(stack, /planned: copy\("the second DNS zone and git-host settings"/);
  assert.match(stack, /planned: copy\("mesh access rules \(ACLs\) in OpenTofu"/);
  assert.match(stack, /Pharos provisioning is attended, one server at a time/);
  assert.match(stack, /planned: copy\("ephemeral CI and lab VMs provisioned through Pharos"/);
  assert.match(stack, /<StatusChip status="planned" locale=\{locale\} \/>/);

  // Retired claims, private repository names and folder or key layouts stay out.
  for (const retired of [
    /DNS still by hand/i,
    /noch von Hand/i,
    /on-demand VMs via Pharos provisioning/i,
    /inspr-services/,
    /secrets folder|Secrets-Ordner/i,
    /one key per host|ein Schlüssel pro Host/i,
    /Headscale|1Password/,
    /strict CSP on every response|strikte CSP auf jeder Antwort/i,
    /host configuration, one/i,
  ]) {
    assert.doesNotMatch(stack, retired, `${retired}`);
  }
  assert.match(stack, /strict CSP on every content page/);
  assert.match(stack, /INSPR-Module/);
});

test("no placeholder token shows at any detail level and no personal name is a product byline", async () => {
  for (const path of surfaces) {
    const text = await source(path);
    assert.doesNotMatch(text, /data-live=|reading…|wird gelesen|>…</, `${path}: no placeholder tokens`);
    assert.doesNotMatch(text, /"…"/, `${path}: no ellipsis placeholder value`);
  }
  const home = await source("pages/index.astro");
  assert.doesNotMatch(home, /Markus|Barta/);
  const overview = await source("components/OverviewPage.astro");
  // Copyright and legal attribution stay in the footer line only.
  assert.equal((overview.match(/Markus Barta/g) ?? []).length, 1);
  assert.match(overview, /<footer class="overview-footer page-shell">\s*<p>© \{new Date\(\)\.getUTCFullYear\(\)\} <a href=\{siteUrls\.author\} rel="me">Markus Barta<\/a>/);
  assert.doesNotMatch(await source("components/OverviewStack.astro"), /Markus|Barta/);
});

test("the German edition has no untranslated stage names, gate labels or INSPR modules", async () => {
  const [home, overview, stack] = await Promise.all(["pages/index.astro", "components/OverviewPage.astro", "components/OverviewStack.astro"].map(source));
  for (const [name, text] of [["home", home], ["overview", overview], ["stack", stack]]) {
    assert.match(text, /INSPR-Module|Doktrin/, `${name} names the doctrine in German`);
    assert.doesNotMatch(text, /Self-hosted by Design|gate: "Gate"|repo: copy\("repo", "Repo"\)/, `${name}: English compounds`);
  }
  assert.match(home, /copy\("INSPR modules", "INSPR-Module"\)/);
  assert.match(overview, /gate: copy\("gate", "Freigabe"\)/);
});
