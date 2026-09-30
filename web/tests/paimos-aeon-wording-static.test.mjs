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
  [/gültige[nr]? Freigabe/, "gültige Freigabe: a live approval is an aktive Freigabe"],
  [/Build-Freigabe|Journeys und Freigaben|Freigabe durch eine Person/, "Freigabe where the checkpoint is a Gate"],
  [/gepinn/, "gepinnt: the commit is festgelegt, in one word order"],
  [/Fester Commit|Hinweispunkt|Arbeitsstruktur/, "retired coinages"],
  [/geparkt|parken/, "parken: zurückstellen"],
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
  assert.match(text, /„Read“ heißt, dass die Sitzung den Empfang bestätigt hat, „Answered“, dass/, "the receipt labels are quoted English UI names");
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
  assert.match(de, /Live-ETA, die nur Koordinatoren festlegen/);
  assert.match(en, /A ready ETA says when the work is expected to be ready for review/);
  assert.match(en, /a live ETA is set only by coordinators/);
  assert.match(de, /anstehende Läufe von Arbeitsaufträgen und Posteingangs-Nachrichten per HTTPS vom Server und übernimmt sie; reines HTTP gibt es nur auf dem Loopback/);
  assert.match(en, /queued runs of work orders and inbox messages/);
});

// AEON-LEAD's verification (tag v260930115354.0.0), INSPR-498: two claims were
// narrower than the copy said.
const stage = (text, name, next) => {
  const start = text.indexOf(`name: "${name}"`);
  const end = text.indexOf(`name: "${next}"`);
  assert.ok(start > 0 && end > start, `the ${name} stage is in the content`);
  return text.slice(start, end);
};

test("the Deploy stage makes no capacity or launch-admission claim", async () => {
  for (const [language, text] of [["de", await german()], ["en", await english()]]) {
    const deploy = stage(text, "Deploy", "Access");
    assert.doesNotMatch(deploy, /Kapazit|capacity/i, `${language}: the capacity check is for agent runs on accounts, never for a Deploy`);
    assert.doesNotMatch(deploy, /Startzulassung|launch admission/i, `${language}: no launch admission in the Deploy stage`);
    assert.doesNotMatch(deploy, /ändert sich ein Host|does a host change/i, `${language}: no host change as the consequence of a check`);
  }
  const de = stage(await german(), "Deploy", "Access");
  const en = stage(await english(), "Deploy", "Access");
  assert.match(de, /Freigabe einer Person, gebunden an das Release/);
  assert.match(de, /ein externer Ausführer \(etwa Pharos\) lässt ihn zu und führt ihn genau einmal aus/);
  assert.match(de, /bietet Journey die Erneuerung an, die eine Person bestätigt/);
  assert.match(en, /only with a person's approval, bound to the release/);
  assert.match(en, /an external executor \(such as Pharos\) admits it and carries it out exactly once/);
  assert.match(en, /Journey offers renewal, which a person confirms/);
});

test("steering and session settings are claimed only for runs AEON started, on macOS", async () => {
  const de = await german();
  const en = await english();
  // The sentence, the card caveat and the control room text all name the runs.
  assert.match(de, /für von AEON gestartete Claude-Läufe unter macOS/i);
  assert.match(de, /Derzeit für von AEON gestartete Claude-Läufe unter macOS/i);
  assert.match(en, /Claude runs started by AEON on macOS/i);
  assert.match(en, /Currently for Claude runs started by AEON on macOS/i);
  for (const [language, text] of [["de", de], ["en", en]]) {
    assert.doesNotMatch(text, /Steuerung und Sitzungseinstellungen sind derzeit für Claude unter macOS|Steering and session settings are currently available for Claude on macOS/,
      `${language}: the unqualified steering sentence is retired`);
    assert.doesNotMatch(text, /Early Access|early access/, `${language}: attaching a session is no early-access feature claim`);
    assert.doesNotMatch(text, /jedem macOS-Terminal|any macOS terminal/, `${language}: no claim about any macOS terminal`);
    assert.doesNotMatch(text, /verwaltete Sitzung während|managed session while/, `${language}: no steering of arbitrary sessions`);
  }
  // Attaching is watch-only, and talking to attached sessions is disabled.
  assert.match(de, /zum Mitlesen anhängen; Nachrichten an angehängte Sitzungen sind derzeit deaktiviert/);
  assert.match(en, /can be attached to watch; sending messages to attached sessions is currently disabled/);
});

test("the doctrine inbox and rule-edit pull requests stay a roadmap item", async () => {
  for (const [language, text, inbox, planned] of [
    ["de", await german(), /Posteingang für Doktrin-Vorschläge/, /term: "Geplant", body: "Vorschläge für Regeländerungen als Pull Requests/],
    ["en", await english(), /Doctrine inbox/, /term: "planned", body: "Rule-edit proposals as pull requests/],
  ]) {
    const horizon = text.indexOf("horizon: {");
    assert.ok(horizon > 0, `${language}: the horizon section exists`);
    const inboxAt = text.search(inbox);
    assert.ok(inboxAt > horizon, `${language}: the inbox is only in the roadmap`);
    // Any pull-request wording is either the How-level planned item or the roadmap.
    for (const match of text.matchAll(/[Pp]ull [Rr]equests?/g)) {
      const at = match.index ?? 0;
      assert.ok(at > horizon || planned.test(text.slice(Math.max(0, at - 70), at + 90)), `${language}: pull requests outside the roadmap must be the planned item`);
    }
  }
});

// Grok's native German read, INSPR-498.
test("the German FAQ speaks to the reader, and the pinned commit has one phrase", async () => {
  const text = await german();
  const questions = [...text.matchAll(/question: "([^"]*)"/g)].map((match) => match[1]);
  assert.ok(questions.length >= 5, "the FAQ has its questions");
  for (const question of questions) {
    assert.doesNotMatch(question, /\b(wir|uns|unser\w*)\b/i, `"${question}" addresses the reader with Sie`);
  }
  assert.match(text, /label: "Doktrin festgelegt"/);
  const phrase = text.match(/Die Doktrin wird an einem festgelegten Commit aus Git gelesen/g) ?? [];
  assert.ok(phrase.length >= 3, "the chip, the doctrine card and the rules lead say it the same way");
  assert.doesNotMatch(text, /aus Git an einem festgelegten Commit/, "one word order");
});

test("German numbers and units are held together by a narrow no-break space", async () => {
  const text = await german();
  assert.doesNotMatch(text, /\d (Minuten|Bytes|KB)\b/, "a number is never parted from its unit");
  assert.match(text, /2\u202fMinuten/);
  assert.match(text, /12\.000\u202fBytes/);
  assert.match(text, /500\u202fKB/);
});

test("the tenant-isolation card names forced Row-Level Security as the English twin does", async () => {
  const de = await german();
  const en = await english();
  assert.match(en, /FORCE row-level security in Postgres separates tenants/);
  assert.match(de, /Erzwungene Row-Level Security \(Sicherheit auf Zeilenebene, FORCE\) hält in Postgres die Mandanten in jeder Tabelle auseinander/);
});

// The 2x recapture (INSPR-498): captions say only what the frames show.
const card = (text, label) => {
  const start = text.indexOf(`label: "${label}",`);
  assert.ok(start > 0, `the card ${label} exists`);
  const end = text.indexOf("\n      },", start);
  return text.slice(start, end);
};

test("the recaptured slides are captioned with what their frames show", async () => {
  const de = await german();
  const en = await english();
  const approvals = card(en, "Person approvals");
  assert.match(approvals, /note: "A person decides every gated step, and every decision stays on record\."/);
  assert.doesNotMatch(approvals, /revok/i, "no claim of revocation in general");
  assert.match(card(de, "Freigabe durch Personen"), /note: "Eine Person entscheidet jeden freigabepflichtigen Schritt, und jede Entscheidung bleibt festgehalten\."/);
  assert.match(card(en, "Journeys and gates"), /note: "An example journey for a Pharos release:/);
  assert.match(card(de, "Journeys und Gates"), /note: "Eine Beispiel-Journey für ein Pharos-Release:/);
  const live = card(en, "Live updates");
  assert.match(live, /note: "Progress and ETAs update as agents report\."/);
  assert.match(card(de, "Live-Aktualisierungen"), /note: "Fortschritt und ETAs aktualisieren sich, sobald Agenten berichten\."/);
  for (const text of [card(en, "Live updates").split("noteHow")[0], card(de, "Live-Aktualisierungen").split("noteHow")[0]]) {
    assert.doesNotMatch(text, /instant|streaming|the moment|sobald sich etwas ändert/i, "no claim of streaming or instant updates");
  }
});

test("the slides that changed carry an image description in both languages", async () => {
  const en = await english();
  const de = await german();
  assert.match(card(en, "Knowledge graph"), /alt: "The PAIMOS project's knowledge graph of linked runbooks, guidelines and memory entries, as the AEON Knowledge view shows it\."/);
  assert.match(card(de, "Wissensgraph"), /alt: "Der Wissensgraph des Projekts PAIMOS mit verknüpften Runbooks, Richtlinien und Memory-Einträgen, wie ihn die Wissensansicht von AEON zeigt\."/);
  for (const [text, labels] of [[en, ["Person approvals", "Knowledge graph", "Journeys and gates", "Live updates", "AGPL-3.0"]], [de, ["Freigabe durch Personen", "Wissensgraph", "Journeys und Gates", "Live-Aktualisierungen", "AGPL-3.0"]]]) {
    for (const label of labels) assert.match(card(text, label), /\n        alt: "[^"]{40,}",/, `${label} has an image description`);
  }
  assert.match(card(en, "AGPL-3.0"), /GNU Affero General Public License v3\.0/);
  assert.match(card(en, "Journeys and gates"), /Release 27/);
});

// AEON-LEAD (tag v260930115354.0.0): "No heartbeat" and "Lost contact" are two
// states that follow one another. The 2-minute live window is a separate fact
// (what counts as live) and never the lost-contact threshold.
const stringsOf = (text) => [...text.matchAll(/"((?:[^"\\]|\\.)*)"/g)].map((match) => match[1]);

test("no string couples Lost contact with the 2-minute live window", async () => {
  for (const [language, text] of [["de", await german()], ["en", await english()]]) {
    const coupled = stringsOf(text).filter((value) => /Lost contact/.test(value) && /\b2[\s ](minutes|Minuten)|live window|Live-Fenster|2-minute/i.test(value));
    assert.deepEqual(coupled, [], `${language}: Lost contact is not tied to the live window`);
  }
});

test("No heartbeat comes first, Lost contact is the closed state, at every level", async () => {
  const de = await german();
  const en = await english();
  // How: the card and the heartbeat fact name both states, in order, with the default.
  for (const [language, text, first, outside, byDefault] of [
    ["de", de, /zeigt zuerst „No heartbeat“\. Läuft sie außerhalb von AEON und meldet sich weiterhin nicht, schließt AEON sie nach einer einstellbaren Zeit \(standardmäßig 15 Minuten\) als „Lost contact“; ihr nächster Heartbeat holt sie zurück\./, /außerhalb von AEON/, /standardmäßig 15 Minuten/],
    ["en", en, /first shows “No heartbeat”\. If it runs outside AEON and stays silent, AEON closes it as “Lost contact” after a set time \(15 minutes by default\); its next heartbeat brings it back\./, /outside AEON/, /15 minutes by default/],
  ]) {
    assert.match(text, first, `${language}: the control-room How note`);
    assert.match(text, outside);
    assert.match(text, byDefault);
    assert.ok((text.match(/„?“?No heartbeat[“”]?/g) ?? []).length >= 2, `${language}: the heartbeat fact names No heartbeat too`);
  }
  assert.match(de, /Das Live-Fenster von 2 Minuten bestimmt, was als live gilt\./);
  assert.match(en, /The live window is 2 minutes: that is what counts as live\./);
  assert.match(de, /Verwaltete Läufe werden so nie geschlossen; ihr Daemon meldet den Verlust selbst\./);
  assert.match(en, /Managed runs are never closed this way; their daemon reports the loss itself\./);
  // What and Why: the short and the plain form, no threshold and no colour.
  assert.match(en, /A silent session is flagged, and closed as “Lost contact” if it runs outside AEON\./);
  assert.match(en, /Silent agents are flagged, never hidden\./);
  assert.match(de, /Meldet sich eine Sitzung nicht mehr, wird sie markiert und, wenn sie außerhalb von AEON läuft, als „Lost contact“ geschlossen\./);
  assert.match(de, /Agenten, die nichts mehr melden, werden markiert, nie versteckt\./);
  for (const text of [de, en]) {
    const colours = stringsOf(text).filter((value) => /(No heartbeat|Lost contact)/.test(value) && /\b(red|rot|rote[rn]?|grey|gray|grau)\b/i.test(value));
    assert.deepEqual(colours, [], "the states are not described by a colour");
  }
});
