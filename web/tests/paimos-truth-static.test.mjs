import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";

// INSPR-544 (INSPR-529, 530, 531): the Paimos page tells the truth. One release,
// no retired Journey, no host names, the harness matrix as released, the
// engine and the build order with a status and no dates.
const webUrl = new URL("../", import.meta.url);
const source = (path) => readFile(new URL(`src/${path}`, webUrl), "utf8");

const editions = [
  { locale: "en", content: "content/paimos-aeon.ts" },
  { locale: "de", content: "content/de/paimos-aeon.ts" },
];

// INSPR-578: evaluate the content with public URL fixtures, including a future
// tag set in the one release object. No browser or PAIMOS checkout is needed.
const contentModules = async (english) => {
  english ??= await source("content/paimos-aeon.ts");
  const family = await import(new URL("src/content/family.ts", webUrl));
  const captureManifest = JSON.parse(await source("assets/products/paimos-aeon/capture-manifest.json"));
  const siteUrls = { paimos: "https://paimos.example", paimosCom: "https://paimos.example.com" };
  const evaluate = (text, imports) => {
    const exports = {};
    const { outputText } = ts.transpileModule(text, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } });
    runInNewContext(outputText, { exports, require: (name) => {
      assert.ok(Object.hasOwn(imports, name), `unexpected content import: ${name}`);
      return imports[name];
    } });
    return exports;
  };
  const shared = evaluate(english, {
    "./urls": { siteUrls }, "./family": family,
    "../assets/products/paimos-aeon/capture-manifest.json": captureManifest,
  });
  const german = evaluate(await source("content/de/paimos-aeon.ts"), {
    "../urls": { siteUrls }, "../family": family, "../paimos-aeon": shared,
  });
  const frontDoor = evaluate(await source("content/paimos-com.ts"), {
    "./urls": { siteUrls }, "./paimos-aeon": shared,
  });
  return { ...shared, german: german.paimosAeonContentDe, frontDoor: frontDoor.paimosComContent };
};

test("one constant names release 138, with source evidence and no invented release metadata (INSPR-578)", async () => {
  const english = await source("content/paimos-aeon.ts");
  const release = english.match(/export const paimosRelease: PaimosRelease = \{([\s\S]*?)\n\};/)?.[1] ?? "";
  assert.match(release, /number: "138"/);
  assert.match(release, /sourceRef: "[0-9a-f]{40}"/);
  assert.doesNotMatch(release, /\b(?:tag|codename|publishedAt|publishedLabel):/, "unpublished metadata is absent");
  assert.equal((english.match(/number: "138"/g) ?? []).length, 1, "one presented-release literal");
  assert.equal((english.match(/[0-9a-f]{40}/g) ?? []).length, 1, "the source revision literal appears exactly once");
  const german = await source("content/de/paimos-aeon.ts");
  assert.match(german, /import \{ paimosRelease,.*\} from "\.\.\/paimos-aeon";/);
  assert.doesNotMatch(german, /v26\d{10}\.0\.0|[0-9a-f]{40}/, "the German edition holds no tag or SHA literal");
  const { paimosRelease, paimosAeonContent, german: de, frontDoor } = await contentModules(english);
  assert.equal(paimosRelease.sourceRef.slice(0, 8), "c52e27a6");
  const sourceUrls = (value) => JSON.stringify(value).match(/https:\/\/github\.com\/inspr-at\/paimos\/(?:blob|tree)\/[^" ]+/g) ?? [];
  for (const content of [paimosAeonContent, de]) {
    assert.equal(content.release.label, "Release 138");
    for (const field of ["codename", "version", "publishedAt", "publishedLabel"]) assert.equal(content.release[field], undefined);
    assert.equal(content.release.sourceRevision, paimosRelease.sourceRef.slice(0, 8));
    assert.equal(content.release.url, `${content.repositoryUrl}/releases`);
    assert.doesNotMatch(JSON.stringify(content), /releases\/tag\//, "no tag link before a tag exists");
    assert.ok(sourceUrls(content).length >= 5, "the tree, API and open-source proofs are pinned");
    for (const url of sourceUrls(content)) assert.ok(url.includes(`/${paimosRelease.sourceRef}`), url);
  }
  assert.equal(frontDoor.licenseUrl, `${paimosAeonContent.repositoryUrl}/blob/${paimosRelease.sourceRef}/LICENSE`);
  for (const { locale, content } of editions) {
    const text = await source(content);
    assert.doesNotMatch(text, /PAIMOS 7|Release 14|Hinged Hangar|Hidden Helium|260930115354/, `${locale}: no stale release identity`);
    assert.match(text, /label: "Releases (on|auf) GitHub", href: paimosReleaseUrl/, `${locale}: neutral release-list label`);
  }
});

test("setting publication fields in paimosRelease re-pins both editions and licenses (INSPR-578)", async () => {
  const tag = "v261101120000.0.0"; // Synthetic future metadata, never published.
  const english = (await source("content/paimos-aeon.ts")).replace(
    'number: "138",',
    `number: "138", tag: "${tag}", codename: "Test Fixture", publishedAt: "2026-11-01", publishedLabel: { en: "Test date", de: "Testdatum" },`,
  );
  const { paimosAeonContent, german, frontDoor } = await contentModules(english);
  for (const content of [paimosAeonContent, german]) {
    assert.equal(content.sourceTreeUrl, `${content.repositoryUrl}/tree/${tag}`);
    assert.equal(content.release.url, `${content.repositoryUrl}/releases/tag/${tag}`);
    assert.equal(content.release.codename, "Test Fixture");
    assert.equal(content.release.publishedAt, "2026-11-01");
    for (const link of content.openSource.links.filter((link) => /\/(blob|tree)\//.test(link.href))) assert.ok(link.href.includes(`/${tag}/`));
    assert.match(content.openSource.body, /Tag|tag/);
    assert.doesNotMatch(content.hero.depths.technical, /undefined/);
  }
  assert.equal(frontDoor.licenseUrl, `${paimosAeonContent.repositoryUrl}/blob/${tag}/LICENSE`);
  assert.equal(paimosAeonContent.release.publishedLabel, "Test date");
  assert.equal(german.release.publishedLabel, "Testdatum");
});

test("the plaque omits unavailable fields and joins a clean accessible name (INSPR-578)", async () => {
  const plaque = await source("components/AeonReleasePlaque.astro");
  const { paimosAeonContent, german } = await contentModules();
  const aria = plaque.match(/const ariaLabel = ([\s\S]*?);/)[1];
  for (const release of [paimosAeonContent.release, german.release]) {
    assert.equal(runInNewContext(aria, { label: "Release", release, live: "Live" }), `Release: AEON, Release 138, ${release.sourceRevision}, Live`);
  }
  assert.match(plaque, /release\.codename && <span class="aeon-plaque__codename"/);
  assert.match(plaque, /release\.publishedAt && release\.publishedLabel && <time/);
  assert.match(plaque, /<code>\{release\.sourceRevision\}<\/code>/);
  const page = await source("components/AeonPage.astro");
  assert.match(page, /licenseUrl=\{proofHref\(\{ label: "License", path: "LICENSE" \}\)\}/);
  const overview = await source("pages/index.astro");
  const label = overview.match(/paimos: (\[`Release [^\n]+)/)[1].replace(/,$/, "");
  assert.equal(runInNewContext(label, { paimosRelease: { number: "138" } }), "Release 138");
});

test("plain capability copy preserves measured data and honest preview statuses (INSPR-578)", async () => {
  const { paimosAeonContent, german } = await contentModules();
  for (const content of [paimosAeonContent, german]) {
    assert.doesNotMatch(content.hero.lead, /every session|jede Sitzung/);
    const card = (en, de) => content.specs.items.find((item) => item.label === en || item.label === de);
    // INSPR-578 round 2: omit streaming and idle-launch claims, retaining their truth boundary.
    assert.doesNotMatch(JSON.stringify(content), /streaming|Live-Streaming/i);
    assert.match(content.controlRoom.items[2].body, /where supported|soweit unterstützt/);
    assert.match(content.controlRoom.items[2].body, /some other agents|einige andere Agenten/);
    assert.match(content.controlRoom.items[2].caveat, /Claude (on|unter) macOS/);
    assert.match(card("Clear usage", "Klare Nutzung").note, /last measured|zuletzt gemessenen/);
    assert.match(card("Clear usage", "Klare Nutzung").note, /old or missing|alte oder fehlende/);
    assert.doesNotMatch(card("Clear usage", "Klare Nutzung").note, /idle|Leerlauf|between runs|zwischen Läufen/i);
    assert.match(card("Accounts and models", "Konten und Modelle").note, /opt-in|müssen Sie aktivieren/);
    assert.match(card("Protected audit history", "Geschützte Audit-Historie").note, /14 days|14 Tagen/);
    assert.match(content.controlRoom.harnessMatrix.rows[0].note, /live acceptance is still open|Abnahme im Live-Betrieb steht noch aus/);
    assert.match(content.controlRoom.harnessMatrix.rows[2].note, /Adapters available|Adapter verfügbar/);
    assert.match(content.controlRoom.harnessMatrix.rows[2].note, /not yet verified for managed runs|für verwaltete Läufe noch nicht verifiziert/);
    assert.match(content.rules.learning, /preview|Vorschau/);
    assert.match(content.rules.learning, /automatic runs are off by default|automatische Läufe sind standardmäßig aus/);
    assert.match(content.rules.learning, /Bots that learn from earlier runs are planned|Bots, die aus früheren Läufen lernen, sind geplant/);
    assert.match(card("One work tree", "Ein Arbeitsbaum").note, /Where configured|Wo eingerichtet/);
    assert.match(card("One work tree", "Ein Arbeitsbaum").note, /person-confirmed|von einer Person bestätigtes/);
    assert.doesNotMatch(content.specs.items.map((item) => item.label).join(" "), /Routines|Routinen/, "routine preview is outside the capability count");
  }
});

test("visitor copy is short, with retention and technical terms in their intended places (INSPR-578 round 2)", async () => {
  const { paimosAeonContent, german } = await contentModules();
  const banned = /\b(?:unqualified|qualification|advertised|interruptible|yielded|ACP|heartbeat|telemetry|narrow service authority|projection|machinery|gated preview|shadow preview|step-ups?|installation opt-in|unqualifiziert\w*|qualifiziert\w*|Qualifikation\w*|Lebenszeichen\w*|Telemetrie\w*|unterbrechbar\w*|pausierend\w*|Freigabevoraussetzungen|Projektion\w*|Schattenbetrieb)\b/i;
  const copy = (value, path = "") => typeof value === "string" ? [[path, value]]
    : value && typeof value === "object" ? Object.entries(value).flatMap(([key, child]) =>
      ["path", "href", "url", "sourceTreeUrl", "repositoryUrl", "canonicalUrl"].includes(key) ? [] : copy(child, path ? `${path}.${key}` : key)) : [];
  for (const [locale, content] of [["en", paimosAeonContent], ["de", german]]) {
    const sentences = (text) => [...new Intl.Segmenter(locale, { granularity: "sentence" }).segment(text)].length;
    const words = (text) => text.trim().split(/\s+/).length;
    for (const item of content.specs.items) {
      assert.ok(sentences(item.note) <= 2 && words(item.note) <= 40, `${locale}: ${item.label} note is short`);
      assert.ok(sentences(item.noteEli10) <= 2 && words(item.noteEli10) <= 30, `${locale}: ${item.label} plain note is short`);
    }
    for (const [path, text] of copy(content)) {
      if (!path.endsWith(".technical") && path !== "engine.shadow") assert.doesNotMatch(text, banned, `${locale}: ${path}`);
      if (path.endsWith(".simple")) assert.ok(sentences(text) <= 2, `${locale}: ${path} is short`);
    }
    assert.deepEqual(copy(content).filter(([, text]) => /14 (days|Tagen)/.test(text)).map(([path]) => path).sort(), [
      "architecture.depths.technical", "architecture.notes.0.body", "specs.items.8.note",
    ], `${locale}: retention has three deliberate homes`);
    assert.ok(sentences(content.faq[0].answer) <= 3, `${locale}: harness FAQ is short`);
    assert.ok(content.controlRoom.proof.length <= 10, `${locale}: at most six additions to the four original control proofs`);
    assert.doesNotMatch(content.controlRoom.proof.map((proof) => proof.path).join(" "), /internal\/config|internal\/agentruns|CapacitySection|internal\/delivery\/deploy/);
    assert.match(content.engine.shadow, /records next to your current process|zeichnet neben Ihrem aktuellen Ablauf auf/);
    assert.match(content.engine.shadow, /shadow mode|Schattenbetrieb/);
    assert.doesNotMatch(content.engine.shadow, /does not merge or deploy|führt weder zusammen/);
  }
  assert.doesNotMatch(JSON.stringify(german), /Prüfhistorie|Prüfprotokoll|Prüfereignisse/);
});

test("the retired Journey is gone from the page, its styles and its content (INSPR-544)", async () => {
  await assert.rejects(source("components/AeonJourney.astro"), { code: "ENOENT" });
  await assert.rejects(source("styles/aeon-journey.css"), { code: "ENOENT" });
  const page = await source("components/AeonPage.astro");
  assert.doesNotMatch(page, /AeonJourney|stagesAria|aeon-journey|journey-rail|journey-stage/);
  for (const { locale, content } of editions) {
    const text = await source(content);
    assert.doesNotMatch(text, /journey\.|Journeys? (and|und)|eight stages|acht Stufen|Journey-Stufen|delivery:/i, `${locale}: no Journey vocabulary`);
  }
});

test("the engine section is built from the shared engine jobs with status chips", async () => {
  const page = await source("components/AeonPage.astro");
  assert.match(page, /<FamilyBand locale=\{locale\} highlight="paimos" \/>/);
  assert.match(page, /id="engine"[^>]*data-section-pattern="engine-jobs"/);
  assert.match(page, /content\.engine\.jobs\.map[\s\S]*?<StatusChip status=\{job\.status\} locale=\{locale\} \/>/);
  assert.match(page, /content\.horizon\.order\.map[\s\S]*?<StatusChip status=\{step\.status\} locale=\{locale\} \/>/);
  for (const { locale, content } of editions) {
    const text = await source(content);
    assert.match(text, /import \{ buildOrder, engineJobs \} from "(\.\.\/)?\.\/family"|import \{ buildOrder, engineJobs \} from "\.\.\/family"/, `${locale}: reads the shared family copy`);
    assert.match(text, new RegExp(`engineJobs\\.map\\(\\(job\\) => \\(\\{ label: job\\.label\\.${locale}, status: job\\.status, note: job\\.note\\.${locale} \\}\\)\\)`));
    assert.match(text, new RegExp(`buildOrder\\.map\\(\\(step\\) => \\(\\{[\\s\\S]*?step\\.label\\.${locale}[\\s\\S]*?step\\.statusNote\\?\\.${locale}`));
    assert.match(text, /flowNote: \{[\s\S]*?status: "planned"/, `${locale}: Flow 2 is marked planned`);
    assert.doesNotMatch(text, /Release 1[5-7]|\b20\d\d-\d\d-\d\d\b.*\b(plan|geplant)/i, `${locale}: planned work carries no release or date`);
  }
  // The lead counts the jobs; keep it in step with family.ts.
  const family = await source("content/family.ts");
  const jobs = family.slice(family.indexOf("export const engineJobs"), family.indexOf("export const trustContexts"));
  const live = (jobs.match(/status: "live"/g) ?? []).length;
  const partly = (jobs.match(/status: "partly"/g) ?? []).length;
  // INSPR-556: AEON-848/849 and AEON-851 ship state/deadlines and rules settings.
  assert.equal(live, 4, "four engine jobs are live");
  assert.equal(partly, 2, "admission and effects are partly live (AEON-887/891 shadow)");
  assert.match(await source("content/paimos-aeon.ts"), /Four are live, two are partly live/);
  assert.match(await source("content/de/paimos-aeon.ts"), /Vier sind live, zwei sind teilweise live/);
});

test("no host name appears on the page, in captions or in content comments", async () => {
  const files = ["components/AeonPage.astro", "content/paimos-aeon.ts", "content/de/paimos-aeon.ts"];
  for (const file of files) {
    assert.doesNotMatch(await source(file), /barta|\.cm\b|aeon\.[a-z]+\.[a-z]+/i, `${file}: no host or personal name`);
  }
  for (const { locale, content } of editions) {
    const text = await source(content);
    // INSPR-556: release-128 fixture screens replace internal theatre captures.
    assert.match(text, /note: `(Real screen, demo data|Echter Bildschirm, Beispieldaten) · (release|Version) \$\{paimosScreenRelease\}`/, `${locale}: theatre provenance follows captures`);
    assert.doesNotMatch(text, /title: `[^`]*\$\{paimosRelease\.number\}[^`]*\.`/, `${locale}: theatre title makes no current-release claim`);
  }
  const { paimosAeonContent, german } = await contentModules();
  assert.equal(paimosAeonContent.theatre.note, "Real screen, demo data · release 128");
  assert.equal(german.theatre.note, "Echter Bildschirm, Beispieldaten · Version 128");
  const page = await source("components/AeonPage.astro");
  assert.match(page, /frame: "Paimos"/);
  // INSPR-556 / GUI-27: show the actual crop without decorative browser chrome.
  assert.match(page, /class="aeon-theatre__image aeon-shot"/);
});

test("the harness matrix and the capability count tell what is released (INSPR-530)", async () => {
  for (const { locale, content } of editions) {
    const text = await source(content);
    for (const name of ["Claude Code", "Codex", "Cursor", "pi", "Grok", "Gemini", "OpenCode"]) {
      assert.ok(text.includes(name), `${locale}: ${name} is named`);
    }
    assert.match(text, /harnessMatrix: \{[\s\S]*?status: "live"[\s\S]*?status: "partly"[\s\S]*?status: "planned"/, `${locale}: three support levels`);
    assert.match(text, /Apple [Ss]ilicon|Apple silicon/);
    assert.doesNotMatch(text, /proven at scale|im großen Maßstab bewährt/i, `${locale}: supported, never proven at scale`);
    assert.doesNotMatch(text, /Claude, Codex, Cursor, Grok (and|und) pi/, `${locale}: no unqualified five-harness list`);
    assert.doesNotMatch(text, /available today|heute verfügbar/i, `${locale}: no "available today"`);
    const items = (text.match(/^\s*group:\s*"/gm) ?? []).length;
    assert.equal(items, 21, `${locale}: 21 released capabilities`);
  }
  assert.match(await source("content/paimos-aeon.ts"), /lead: "Twenty-one released capabilities\./);
  assert.match(await source("content/de/paimos-aeon.ts"), /lead: "Einundzwanzig veröffentlichte Fähigkeiten\./);

  // INSPR-556: demo model settings replace the generated capacity scene;
  // five changed lenses use matching real demo frames, leaving six illustrations.
  const manifest = JSON.parse(await source("assets/products/paimos-aeon/capture-manifest.json"));
  const changedKeys = ["02", "06", "08", "15", "16"];
  const retained = manifest.files.filter((file) => file.name.startsWith("specs/") && !["14", ...changedKeys].some((key) => file.name.startsWith(`specs/${key}-`)));
  assert.equal(retained.length + changedKeys.length, 19, "nineteen distinct retained images serve twenty-one cards");
  assert.equal(retained.filter((file) => file.kind === "generated").length, 6);
  assert.match(await source("content/paimos-aeon.ts"), /Six of the images are illustrations/);
  assert.match(await source("content/de/paimos-aeon.ts"), /Sechs der Bilder sind Illustrationen/);
  const page = await source("components/AeonPage.astro");
  assert.match(page, /retiredLensKeys = new Set\(\["14"\]\)/);
  assert.match(page, /key === "11" \? \[key, "goals"\] : key === "12" \? \[key, "checks"\]/);
  assert.match(page, /Related screen: the work tree with epics, tickets, estimates and ETAs/);
  assert.match(page, /Related screen: company agent rules, with enabled sets and locked rules/);
  assert.match(page, /lensKey === "checks" \? "07"/);
  assert.doesNotMatch(page, /not pictured here|nicht abgebildet/);
  for (const key of ["14", ...changedKeys]) assert.ok(page.includes(`"!../assets/products/paimos-aeon/specs/${key}-*"`), `${key}: unused lens is not bundled`);
  for (const name of ["chat.png", "models.png", "ticket-delivery-review.png", "accounts-usage.png", "delivery.png"]) {
    assert.equal(manifest.files.find((file) => file.name === name)?.kind, "demo");
  }
});

test("German terms: Freigabe for gate and approval, a translated chip, no English origin label (INSPR-530)", async () => {
  const german = await source("content/de/paimos-aeon.ts");
  assert.doesNotMatch(german, /Needs you|Made in Austria|genehmig|Genehmig|\bTor\b|\bTore\b/, "no untranslated chip, label or second term for gate");
  assert.match(german, /label: "Braucht Sie"/);
  assert.match(german, /label: "Entwickelt in Österreich"/);
  assert.match(german, /place: "Herkunft"/);
  assert.match(german, /Kann ein Agent seine eigene Anfrage freigeben\?/);
});
