import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

// INSPR-544 (INSPR-529, 530, 531): the Paimos page tells the truth. One release,
// no retired Journey, no host names, the harness matrix as released, the
// engine and the build order with a status and no dates.
const webUrl = new URL("../", import.meta.url);
const source = (path) => readFile(new URL(`src/${path}`, webUrl), "utf8");

const editions = [
  { locale: "en", content: "content/paimos-aeon.ts" },
  { locale: "de", content: "content/de/paimos-aeon.ts" },
];

test("one constant names the presented release (INSPR-529)", async () => {
  const english = await source("content/paimos-aeon.ts");
  const release = english.match(/export const paimosRelease = \{([\s\S]*?)\n\};/)?.[1] ?? "";
  assert.match(release, /number: "128"/);
  assert.match(release, /codename: "Hidden Helium"/);
  assert.match(release, /tag: "v261009095632\.0\.0"/);
  assert.equal((english.match(/v26\d{10}\.0\.0/g) ?? []).length, 1, "the tag literal appears exactly once");
  const german = await source("content/de/paimos-aeon.ts");
  assert.match(german, /import \{ paimosRelease \} from "\.\.\/paimos-aeon";/);
  assert.doesNotMatch(german, /v26\d{10}\.0\.0/, "the German edition holds no tag literal");
  for (const { locale, content } of editions) {
    const text = await source(content);
    assert.doesNotMatch(text, /PAIMOS 7|Release 14|Hinged Hangar|260930115354/, `${locale}: no other release is named`);
    assert.match(text, /releases\/tag\/\$\{tag\}/, `${locale}: the release links to its GitHub release page`);
  }
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
  assert.equal(live, 2, "two engine jobs are live");
  assert.equal(partly, 4, "four engine jobs are partly live");
  assert.match(await source("content/paimos-aeon.ts"), /Two are live, four are partly live/);
  assert.match(await source("content/de/paimos-aeon.ts"), /Zwei sind live, vier sind teilweise live/);
});

test("no host name appears on the page, in captions or in content comments", async () => {
  const files = ["components/AeonPage.astro", "content/paimos-aeon.ts", "content/de/paimos-aeon.ts"];
  for (const file of files) {
    assert.doesNotMatch(await source(file), /barta|\.cm\b|aeon\.[a-z]+\.[a-z]+/i, `${file}: no host or personal name`);
  }
  for (const { locale, content } of editions) {
    const text = await source(content);
    assert.match(text, /note: "(Internal instance|Interne Instanz) · (captured 30 September 2026|aufgenommen am 30\. September 2026)"/, `${locale}: provenance names the capture date only`);
  }
  const page = await source("components/AeonPage.astro");
  assert.match(page, /frame: "Paimos"/);
  assert.match(page, /<span>\{labels\.frame\}<\/span>/);
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
    assert.equal(items, 19, `${locale}: 19 released capabilities`);
  }
  assert.match(await source("content/paimos-aeon.ts"), /lead: "Nineteen released capabilities\./);
  assert.match(await source("content/de/paimos-aeon.ts"), /lead: "Neunzehn veröffentlichte Fähigkeiten\./);

  // Seven of the retained images are generated illustrations, and the lead says so.
  const manifest = JSON.parse(await source("assets/products/paimos-aeon/capture-manifest.json"));
  const retained = manifest.files.filter((file) => file.name.startsWith("specs/") && !file.name.startsWith("specs/14-"));
  assert.equal(retained.length, 19);
  assert.equal(retained.filter((file) => file.kind === "generated").length, 7);
  assert.match(await source("content/paimos-aeon.ts"), /Seven of the images are illustrations/);
  assert.match(await source("content/de/paimos-aeon.ts"), /Sieben der Bilder sind Illustrationen/);

  // The lens skips the retired Journey capture and keeps it out of the bundle.
  const page = await source("components/AeonPage.astro");
  assert.match(page, /retiredLensKeys = new Set\(\["14"\]\)/);
  assert.match(page, /"!\.\.\/assets\/products\/paimos-aeon\/specs\/14-\*"/);
});

test("German terms: Freigabe for gate and approval, a translated chip, no English origin label (INSPR-530)", async () => {
  const german = await source("content/de/paimos-aeon.ts");
  assert.doesNotMatch(german, /Needs you|Made in Austria|genehmig|Genehmig|\bTor\b|\bTore\b/, "no untranslated chip, label or second term for gate");
  assert.match(german, /label: "Braucht Sie"/);
  assert.match(german, /label: "Entwickelt in Österreich"/);
  assert.match(german, /place: "Herkunft"/);
  assert.match(german, /Kann ein Agent seine eigene Anfrage freigeben\?/);
});
