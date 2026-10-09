import type { Bilingual, Status } from "./types";

// INSPR-542: the single source of every shared GUI-22 string (INSPR-540):
// the message, the product question words, the flow, the contract, the actors and the build
// order, in English and German. Sites and docs read from here so one edit
// updates every page. urls.ts derives productTaxonomy from this file, so this
// file cannot import urls.ts (a cycle): resolve a product host with
// siteUrls[key] for aithema, paimos, pharos and janus.
// Only shipped features are "live". No names, hosts, internal domains or paths.

export type { Bilingual, Status };

export type Locale = "en" | "de";

const t = (en: string, de: string): Bilingual => ({ en, de });

export const message = {
  hero: t(
    "From idea to running software. People decide; machines keep the books.",
    "Von der Idee zur laufenden Software. Menschen entscheiden, Maschinen führen Buch.",
  ),
  sub: t(
    "Four open products and one doctrine. Each answers one question: why we need it, what the work is, where it runs, who may use what, how agents behave.",
    "Vier offene Produkte und eine Doktrin. Jedes beantwortet eine Frage: wofür wir es brauchen, was zu tun ist, wo es läuft, wer was darf, wie Agenten arbeiten.",
  ),
  houseRule: t(
    "Everything that can be declared is declared. What remains is creative work, decisions and judgment.",
    "Alles, was sich deklarieren lässt, ist deklariert. Was bleibt, sind kreative Arbeit, Entscheidungen und Urteilsvermögen.",
  ),
};

export const statusLabels: Record<Status, Bilingual> = {
  live: t("Live", "Live"),
  partly: t("Partly live", "Teilweise live"),
  planned: t("Planned", "Geplant"),
};

export const productKeys = ["aithema", "paimos", "pharos", "janus", "doctrine"] as const;
export type ProductKey = (typeof productKeys)[number];

export type FamilyProduct = {
  key: ProductKey;
  /** Public wordmark; Doctrine is the only name that differs by language. */
  name: Bilingual;
  /** The question the product answers (owner decision, 2026-10-06): Why, What, Where, Who, How. */
  verb: Bilingual;
  /** Short role, shown after the question word: "‹Verb› · ‹role›". */
  role: Bilingual;
  oneLiner: Bilingual;
  status: Status;
  /** What is live, partly live or planned beyond the chip; the chip word is not repeated. */
  statusNote?: Bilingual;
};

export const products: Record<ProductKey, FamilyProduct> = {
  aithema: {
    key: "aithema",
    name: t("Aithema", "Aithema"),
    verb: t("Why", "Wofür"),
    role: t("Requirements", "Anforderungen"),
    oneLiner: t(
      "Conversation and files become requirements you approve.",
      "Aus Gespräch und Dateien werden Anforderungen, die Sie freigeben.",
    ),
    status: "live",
    // INSPR-540: verified 2026-10-06 (requirements core and workspace done,
    // core release 0.10.1, hosted workspace login-gated and unlinked).
    statusNote: t(
      "Open source (AGPL); hosted workspace by invitation",
      "Open Source (AGPL); gehosteter Arbeitsbereich auf Einladung",
    ),
  },
  paimos: {
    key: "paimos",
    name: t("Paimos", "Paimos"),
    verb: t("What", "Was"),
    role: t("Plan and engine", "Planung und Arbeitssteuerung"),
    oneLiner: t(
      "Projects, tickets and knowledge, plus the engine that runs the work.",
      "Projekte, Tickets und Wissen sowie die Steuerung der Arbeit.",
    ),
    status: "live",
    statusNote: t("Engine partly live", "Arbeitssteuerung teilweise live"),
  },
  pharos: {
    key: "pharos",
    name: t("Pharos", "Pharos"),
    verb: t("Where", "Wo"),
    role: t("Fleet and deploy", "Flotte und Bereitstellung"),
    oneLiner: t(
      "Fleet truth, backup evidence, guarded deploys, provisioning.",
      "Flottenzustand, Backup-Nachweise, abgesicherte Bereitstellungen, Provisionierung.",
    ),
    status: "live",
    statusNote: t(
      "Provisioning attended, one server at a time",
      "Provisionierung betreut, ein Server nach dem anderen",
    ),
  },
  janus: {
    key: "janus",
    name: t("Janus", "Janus"),
    verb: t("Who", "Wer"),
    role: t("Access to secrets", "Zugriff auf Geheimnisse"),
    oneLiner: t(
      "A bounded permit to use a secret; the value never appears. Roles, delegation, value-free audit.",
      "Eine begrenzte Freigabe für ein Geheimnis; der Wert erscheint nie. Rollen, Delegation, Audit ohne Werte.",
    ),
    status: "live",
    statusNote: t(
      "Nine roles; broker for agent identities planned",
      "Neun Rollen; Broker für Agenten-Identitäten geplant",
    ),
  },
  doctrine: {
    key: "doctrine",
    name: t("Doctrine", "Doktrin"),
    verb: t("How", "Wie"),
    role: t("Agent doctrine", "Agenten-Doktrin"),
    oneLiner: t(
      "Kernel, domain packs, inspr CLI; calendar versions, signed releases.",
      "Kernregeln, Regeln für einzelne Fachgebiete, inspr CLI; Kalenderversionen, signierte Releases.",
    ),
    status: "live",
  },
};

/** "‹Verb› · ‹short role›", the role line shown for a product. */
export const productRole = (key: ProductKey, locale: Locale = "en") =>
  `${products[key].verb[locale]} · ${products[key].role[locale]}`;

// Flow (owner decision, 2026-10-06): plain activities; the product badges carry the
// question words.
export const flowKeys = ["idea", "requirements", "plan", "build", "deploy", "access", "learn"] as const;
export type FlowKey = (typeof flowKeys)[number];

export type FlowStep = {
  key: FlowKey;
  /** Step label: an activity, never a product name. */
  label: Bilingual;
  who: Bilingual;
  line: Bilingual;
  /** The product that owns this step; absent on Idea, Build and Learn. */
  product?: Exclude<ProductKey, "doctrine">;
  status?: Status;
  statusNote?: Bilingual;
};

// A product step takes its label, line and status from the product itself.
const productStep = (
  key: FlowKey,
  label: Bilingual,
  product: Exclude<ProductKey, "doctrine">,
): FlowStep => ({
  key,
  label,
  who: products[product].name,
  line: products[product].oneLiner,
  product,
  status: products[product].status,
  statusNote: products[product].statusNote,
});

export const flow: {
  steps: FlowStep[];
  /** The Doctrine row that runs underneath every step. The band writes it as
   * one sentence: "‹lead›: ‹Doctrine›, ‹gloss›." (INSPR-554). */
  underneath: { label: Bilingual; product: "doctrine"; lead: Bilingual; gloss: Bilingual };
} = {
  steps: [
    {
      key: "idea",
      label: t("Idea", "Idee"),
      who: t("You", "Sie"),
      line: t("You bring the idea.", "Sie bringen die Idee."),
    },
    productStep("requirements", t("Requirements", "Anforderungen"), "aithema"),
    productStep("plan", t("Plan", "Planung"), "paimos"),
    {
      key: "build",
      label: t("Build", "Entwicklung"),
      who: t("Builders", "Agenten"),
      line: t(
        "Short-lived coding agents, each in its own worktree; another model family reviews.",
        "Kurzlebige Entwicklungsagenten, jeder in einer eigenen Arbeitskopie des Repositorys; eine andere Modellfamilie prüft.",
      ),
      // INSPR-556: AEON-851 ships the setting; AEON-890 previews automated
      // review rounds. Pairing-only agents keep this step partly live.
      status: "partly",
      statusNote: t(
        "Review gates live; Claude Code, Codex, Cursor and pi start under Paimos, Grok runs tool-free; Gemini and OpenCode pairing only. Cross-family review as a company or project setting: live; automatic review rounds: preview",
        "Prüfschritte live; Claude Code, Codex, Cursor und pi starten unter Paimos, Grok läuft ohne Werkzeuge; Gemini und OpenCode: nur Kopplung, Start geplant. Prüfung durch eine andere Modellfamilie als Unternehmens- oder Projekteinstellung: live; automatische Prüfrunden: Vorschau",
      ),
    },
    productStep("deploy", t("Deploy", "Bereitstellung"), "pharos"),
    productStep("access", t("Access", "Zugriff"), "janus"),
    {
      key: "learn",
      label: t("Learn", "Lernen"),
      who: t("Routines", "Routinen"),
      line: t(
        "Recurring runs feed what was learned back into knowledge.",
        "Wiederkehrende Läufe führen Erkenntnisse ins Wissen zurück.",
      ),
      status: "partly",
      statusNote: t("Scheduler live; Routines planned", "Zeitplanung live; Routinen geplant"),
    },
  ],
  underneath: {
    label: t("Underneath", "Darunter"),
    product: "doctrine",
    lead: t("Underneath every step", "Unter jedem Schritt"),
    gloss: t("how agents work", "wie Agenten arbeiten"),
  },
};

// What runs standalone today, separate from what is planned, so the band can
// put "Planned:" in front of the planned part only (INSPR-554).
const standaloneToday = t(
  "Pharos and Janus run standalone today.",
  "Pharos und Janus laufen heute eigenständig.",
);

export const contract: {
  label: Bilingual;
  steps: Bilingual[];
  line: Bilingual;
  standalone: Bilingual;
  status: Status;
  statusNote: Bilingual;
  /** statusNote split in two: the fact today, and the planned part after "Planned:". */
  standaloneToday: Bilingual;
  planned: Bilingual;
} = {
  label: t("One contract", "Ein Vertrag"),
  steps: [
    t("Request", "Anfrage"),
    t("Policy", "Richtlinie"),
    t("Approval where needed", "Freigabe, wo nötig"),
    t("Execution", "Ausführung"),
    t("Receipt", "Beleg"),
  ],
  line: t(
    "Request → policy → approval where needed → execution → receipt.",
    "Anfrage → Richtlinie → Freigabe, wo nötig → Ausführung → Beleg.",
  ),
  standalone: t("Every product also runs on its own.", "Jedes Produkt läuft auch für sich."),
  status: "planned",
  statusNote: t(
    `${standaloneToday.en} Connecting them to Paimos through this contract is being built.`,
    `${standaloneToday.de} Ihre Anbindung an Paimos über diesen Vertrag ist im Aufbau.`,
  ),
  standaloneToday,
  planned: t(
    "connecting them to Paimos through this contract.",
    "ihre Anbindung an Paimos über diesen Vertrag.",
  ),
};

export type ActorKey = "builders" | "bots" | "people";

export const actors: Array<{
  key: ActorKey;
  name: Bilingual;
  line: Bilingual;
  status?: Status;
  statusNote?: Bilingual;
}> = [
  {
    key: "builders",
    name: t("Builders", "Agenten"),
    line: t("Builders write code and hand it over.", "Entwicklungsagenten schreiben Code und übergeben ihn."),
    status: "live",
    statusNote: t(
      "Claude Code, Codex, Cursor and pi start under Paimos",
      "Claude Code, Codex, Cursor und pi starten unter Paimos",
    ),
  },
  {
    key: "bots",
    name: t("Perpetual bots", "Dauerhafte Bots"),
    line: t(
      "Perpetual bots run Routines and ask before acting outward.",
      "Dauerhafte Bots führen Routinen aus und fragen, bevor sie nach außen handeln.",
    ),
    status: "planned",
    statusNote: t("First adapter live", "Erster Adapter live"),
  },
  {
    key: "people",
    name: t("People", "Menschen"),
    line: t(
      "People own policy, GO, taste and acceptance.",
      "Menschen verantworten Regeln, Freigabe, Geschmack und Abnahme.",
    ),
  },
];

export const buildOrder: Array<{
  key: "engine" | "bots" | "tools" | "flow2" | "voice";
  label: Bilingual;
  status: Status;
  statusNote?: Bilingual;
}> = [
  {
    key: "engine",
    label: t("The engine for builders", "Die Arbeitssteuerung für Entwicklungsagenten"),
    status: "partly",
    statusNote: t(
      "Delivery status per ticket and stall alerts, admission dial, cross-family review setting, Decision Desk and inbox, audit: live. Starts, queueing, model routing, reviews and shipping: shadow preview. Pull requests and merges through Paimos: planned",
      "Lieferstatus je Ticket und Fristwarnungen, Zulassungsregler, Prüfung durch andere Modellfamilie, Entscheidungsübersicht („Decision Desk“) und Posteingang, Prüfprotokoll: live. Starts, Warteschlangen, Modellwahl, Prüfungen und Auslieferung: Vorschau im Schattenbetrieb. Änderungsanträge und Zusammenführungen über Paimos: geplant",
    ),
  },
  {
    key: "bots",
    label: t("Bots and Routines", "Bots und Routinen"),
    // INSPR-556: AEON-573 live recurring tickets; AEON-680/693 planned routines.
    status: "planned",
    statusNote: t(
      "Recurring tickets on a schedule or on events are live; Routines that run agents on a schedule and learn from earlier runs are planned",
      "Wiederkehrende Tickets nach Zeitplan oder Ereignissen live; Routinen, die Agenten nach Zeitplan ausführen und aus früheren Läufen lernen, geplant",
    ),
  },
  {
    key: "tools",
    label: t("Pharos and Janus as tools", "Pharos und Janus als Werkzeuge"),
    status: "planned",
    statusNote: t("Both products live standalone", "Beide Produkte laufen live eigenständig"),
  },
  {
    key: "flow2",
    label: t("INSPR Flow 2", "INSPR Flow 2"),
    status: "planned",
    statusNote: t("The old flow (Journey) is retired", "Der alte Ablauf (Journey) ist eingestellt"),
  },
  {
    key: "voice",
    label: t("Voice and Aithema intake", "Sprache und Aithema-Übernahme"),
    status: "planned",
  },
];

export const engineJobs: Array<{
  key: "state" | "admission" | "rules" | "effects" | "escalation" | "audit";
  label: Bilingual;
  status: Status;
  note: Bilingual;
}> = [
  {
    key: "state",
    label: t("State and deadlines", "Zustand und Fristen"),
    // INSPR-556: AEON-848/849.
    status: "live",
    note: t(
      "Per-session state, delivery status per ticket and stall alerts are live, with GitHub connected.",
      "Sitzungszustand, Lieferstatus je Ticket und Fristwarnungen sind live, mit verbundenem GitHub.",
    ),
  },
  {
    key: "admission",
    label: t("Fair admission", "Faire Zulassung"),
    // INSPR-556: AEON-864/880/883/886/887.
    status: "partly",
    note: t(
      "The admission dial, per-harness limits, account limits, reset times and careful or full use are live; start decisions run in shadow mode (preview). Host-load throttling is planned.",
      "Zulassungsregler, Grenzen je Agentenprogramm, Kontogrenzen, Rücksetzzeiten und vorsichtige oder volle Nutzung sind live; Startentscheidungen laufen im Schattenbetrieb (Vorschau). Drosselung nach Rechnerlast ist geplant.",
    ),
  },
  {
    key: "rules",
    label: t("Rules as settings", "Regeln als Einstellungen"),
    // INSPR-556: AEON-851/890/1011.
    status: "live",
    note: t(
      "One default model and a few exceptions, review gates and cross-family review as a company or project setting are live. Automatic review and fix rounds are preview, in shadow mode.",
      "Ein Standardmodell und wenige Ausnahmen, Prüfschritte und die Prüfung durch eine andere Modellfamilie als Unternehmens- oder Projekteinstellung sind live. Automatische Prüf- und Korrekturrunden sind eine Vorschau im Schattenbetrieb.",
    ),
  },
  {
    key: "effects",
    label: t("Effects only through Paimos", "Wirkungen nur über Paimos"),
    // INSPR-556: AEON-852/891.
    status: "partly",
    note: t(
      "The GitHub App can post the cross-family review status, and the merge audit flags skipped queues or missing verified reviews (live with GitHub connected). Pull requests and merges through Paimos remain planned; shipping runs in shadow mode (preview).",
      "Die GitHub-App kann den Status der Prüfung durch eine andere Modellfamilie setzen. Das Prüfprotokoll meldet übersprungene Zusammenführungswarteschlangen oder fehlende verifizierte Prüfungen (live mit verbundenem GitHub). Änderungsanträge und Zusammenführungen über Paimos bleiben geplant; Auslieferung läuft im Schattenbetrieb (Vorschau).",
    ),
  },
  {
    key: "escalation",
    label: t("Escalation", "Eskalation"),
    // INSPR-556: AEON-569 cutover pending.
    status: "live",
    note: t(
      "The Decision Desk and its durable inbox are live. It does not yet replace Needs you on Agents.",
      "Die Entscheidungsübersicht („Decision Desk“) und ihr dauerhafter Posteingang sind live. Sie ersetzt den Bereich Braucht Sie bei den Agenten noch nicht.",
    ),
  },
  {
    key: "audit",
    label: t("Audit", "Prüfprotokoll"),
    status: "live",
    note: t(
      "Events, worker attribution, outcomes and session, token and cost reporting are live.",
      "Ereignisse, Zuordnung der Arbeit zu den ausführenden Agenten, Ergebnisse sowie Berichte zu Sitzungen, Token und Kosten sind live.",
    ),
  },
];

export const trustContexts = t(
  "Personal, INSPR and business work are separate tenants on one platform. Credentials and tickets never cross.",
  "Private Arbeit, INSPR und Geschäftsarbeit sind getrennte Mandanten auf einer Plattform. Zugangsdaten und Tickets wechseln nie die Seite.",
);
