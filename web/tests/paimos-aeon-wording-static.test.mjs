import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

// INSPR-498 (wording round 1): the German and English copy of the AEON page
// follows one glossary. These checks pin the decisions so a later edit does
// not bring a false friend or a retired term back. Facts are pinned
// elsewhere; this file is only about words.
const webUrl = new URL("../", import.meta.url);
const source = (path) => readFile(new URL(`src/${path}`, webUrl), "utf8");

const german = () => source("content/de/paimos-aeon.ts");
const english = () => source("content/paimos-aeon.ts");

// JS \b is not Unicode-aware ("zugänglich" would match Zug), so whole words
// are matched with letter look-arounds.
const word = (source) => new RegExp(`(?<![\\p{L}])(?:${source})(?![\\p{L}])`, "u");

// Retired German words, each with the reason and the chosen term.
const retiredGerman = [
  [word("Tor|Tore|Toren"), "Tor (door, goal): the term is Gate"],
  [word("Brief"), "Brief (a letter): the term is Briefing"],
  [word("[Zz]ug|Zuggrenzen"), "Zug (train, chess move): the term is Turn"],
  [/Quittung/, "Quittung (cash-desk receipt): Empfangsbestätigung"],
  [/Denkaufwand/, "Denkaufwand: Reasoning-Aufwand"],
  [/[Gg]eschützt/, "geschützt: freigabepflichtig"],
  [/genehmig/i, "genehmigen: freigeben"],
  [/Bildschirm/, "Bildschirm (monitor): Ansicht"],
  [/Vertrag/, "Vertrag (legal contract): Spezifikation"],
  [word("Abos?"), "Abo: Abonnement"],
  [/Fähigkeit/, "Fähigkeit: Funktion"],
  [/Regel-Ebene|Regelsets?\b/, "Regel-Ebene, Regelset: Regelebene, Regelsatz"],
  [/, genau\b/, 'headings ending in ", genau": "im Detail"'],
  [/Ruhezustand/, "Ruhezustand (hibernation): Schlüsselspeicherung"],
  [/Untergrenze/, "Untergrenze: gesperrte Regel"],
  [/Startzulassung|Cloud-Spur|Autopilot-Spuren/, "lane and launch-admission jargon"],
  [/qualifiz/i, "qualifiziert: not an AEON term"],
  [/Knöpfe/, "Knöpfe: Schaltflächen"],
  [/Fahren Sie über/, "the retired hover and flip wording"],
  [/im FORCE-Modus/, "the FORCE-Modus refrain"],
];

test("the German copy keeps to the glossary", async () => {
  const text = await german();
  const page = await source("components/AeonPage.astro");
  for (const [pattern, reason] of retiredGerman) {
    assert.doesNotMatch(text, pattern, `de content must not contain ${reason}`);
  }
  // The German labels in the page component follow it too.
  const start = page.indexOf('const labels = locale === "de"');
  const labels = page.slice(start, page.indexOf("\n  : {", start));
  for (const [pattern, reason] of retiredGerman.slice(0, 12)) {
    assert.doesNotMatch(labels, pattern, `de labels must not contain ${reason}`);
  }
  assert.match(text, /Gate/, "the gate term is Gate");
  assert.match(text, /Briefing/, "the project brief is a Briefing");
});

test("German quotes UI names and uses one deploy compound style", async () => {
  const text = await german();
  assert.match(text, /„Lost contact“/, "the English UI name is quoted");
  assert.doesNotMatch(text, /Deployment-Karte/, "Deploy-Karte");
  assert.doesNotMatch(text, /Bereitstellung frei/, "the deploy decision is an Deploy-Freigabe");
});

test("Row-Level Security is glossed once in German and named in the glossary", async () => {
  const text = await german();
  const glossed = text.match(/Sicherheit auf Zeilenebene/g) ?? [];
  assert.ok(glossed.length <= 2, "the long German phrase appears only in the gloss and the glossary body");
  assert.match(text, /term: "Row-Level Security"/);
  assert.match(text, /term: "Doktrin"/, "the doctrine glossary entry explains the term");
});

test("the English copy avoids the retired words too", async () => {
  const text = await english();
  assert.doesNotMatch(text, /Hover or tap/, "stale since the carousel replaced the flip");
  assert.doesNotMatch(text, /\blanes?\b/i, "lane is not an AEON term");
  assert.doesNotMatch(text, /qualified/i, "qualified is not an AEON term");
  assert.doesNotMatch(text, /launch admission/i, "launch admission is not an AEON term");
  assert.doesNotMatch(text, /locked floors?/i, "locked rules");
  assert.doesNotMatch(text, /Your agents get smarter/, "the horizon headline must match its list");
  assert.match(text, /term: "Doctrine"/, "the doctrine glossary entry explains the term");
});

test("the hero eyebrow carries no digit in either language", async () => {
  for (const text of [await german(), await english()]) {
    const eyebrow = text.match(/hero: \{\s*eyebrow: "([^"]*)"/)?.[1] ?? "";
    assert.ok(eyebrow.length > 0, "the hero has an eyebrow");
    assert.doesNotMatch(eyebrow, /\d/, "no release-number lookalike in the eyebrow");
  }
});

test("both languages state the heartbeat ETAs and the transport the way the release does", async () => {
  const de = await german();
  const en = await english();
  assert.match(de, /Bereit-ETA \(wann die Arbeit voraussichtlich zur Prüfung bereit ist\)/);
  assert.match(de, /Live-ETA, die nur Koordinatoren setzen/);
  assert.match(en, /A ready ETA says when the work is expected to be ready for review/);
  assert.match(en, /a live ETA is set only by coordinators/);
  assert.match(de, /eingeplante Läufe zu Arbeitsaufträgen und Posteingangs-Nachrichten/);
  assert.match(en, /queued runs of work orders and inbox messages/);
});
