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
      // INSPR-578: round 2 keeps shared notes short; the product page holds support details.
      status: "partly",
      statusNote: t(
        "Claude Code, Codex, Cursor and pi supported; cross-family review settings live; automatic review rounds in preview",
        "Claude Code, Codex, Cursor und pi unterstützt; Einstellungen zur Prüfung durch andere Modellfamilien live; automatische Prüfrunden in Vorschau",
      ),
    },
    productStep("deploy", t("Deploy", "Bereitstellung"), "pharos"),
    productStep("access", t("Access", "Zugriff"), "janus"),
    {
      key: "learn",
      label: t("Learn", "Lernen"),
      who: t("Routines", "Routinen"),
      line: t(
        "Set up recurring work and inspect its run logbooks.",
        "Wiederkehrende Arbeit einrichten und ihre Laufprotokolle ansehen.",
      ),
      status: "partly",
      // INSPR-578: routine setup is available; automatic execution stays preview.
      statusNote: t(
        "Recurring tickets live; Routines in preview, automatic runs off by default; bots and learning planned",
        "Wiederkehrende Tickets live; Routinen in Vorschau, automatische Läufe standardmäßig aus; Bots und Lernen geplant",
      ),
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
    // INSPR-578: perpetual bots stay planned despite available routine setup.
    statusNote: t(
      "Recurring tickets live; Routines in preview, automatic runs off by default; bots and learning planned",
      "Wiederkehrende Tickets live; Routinen in Vorschau, automatische Läufe standardmäßig aus; Bots und Lernen geplant",
    ),
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
      "Managed starts, model routing, goals, workflow checks and Decision Desk live; automatic queueing, review rounds and shipping in preview",
      "Verwaltete Starts, Modellwahl, Ziele, Arbeitsablaufprüfungen und Entscheidungsübersicht live; automatische Warteschlangen, Prüfrunden und Auslieferung in Vorschau",
    ),
  },
  {
    key: "bots",
    label: t("Bots and Routines", "Bots und Routinen"),
    // INSPR-578: setup and logbooks exist; automatic runs remain a default-off preview.
    status: "partly",
    statusNote: t(
      "Recurring tickets live; Routines in preview, automatic runs off by default; bots and learning planned",
      "Wiederkehrende Tickets live; Routinen in Vorschau, automatische Läufe standardmäßig aus; Bots und Lernen geplant",
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
    // INSPR-578: goal freshness and build measurements extend reported state.
    status: "live",
    note: t(
      "Reported session state, goal progress and arrival estimates live; delivery metrics use recorded steps, with GitHub connected.",
      "Gemeldeter Sitzungszustand, Zielfortschritt und Ankunftsschätzungen live; Auslieferungsmessungen nutzen erfasste Schritte, mit verbundenem GitHub.",
    ),
  },
  {
    key: "admission",
    label: t("Fair admission", "Faire Zulassung"),
    // INSPR-578: the engine section explains the preview; this note names the live checks.
    status: "partly",
    note: t(
      "Daily limits, account permissions and model fallbacks live; checks for busy computers available, off by default.",
      "Tagesgrenzen, Kontoberechtigungen und Ausweichmodelle live; Prüfungen auf Rechnerlast verfügbar, standardmäßig aus.",
    ),
  },
  {
    key: "rules",
    label: t("Rules as settings", "Regeln als Einstellungen"),
    // INSPR-578: fallback orders and workflow definitions are available settings.
    status: "live",
    note: t(
      "Model fallback orders, reasoning levels, workflow checks and cross-family review settings live; automatic review and fix rounds in preview.",
      "Ausweichmodelle, Denkaufwand, Arbeitsablaufprüfungen und Einstellungen zur Prüfung durch eine andere Modellfamilie live; automatische Prüf- und Korrekturrunden in Vorschau.",
    ),
  },
  {
    key: "effects",
    label: t("Effects only through Paimos", "Wirkungen nur über Paimos"),
    // INSPR-578: preview actions retain their default-off status.
    status: "partly",
    note: t(
      "Review status and merge audit live with GitHub; routine PR actions and automatic queueing in preview, off by default.",
      "Prüfstatus und Merge-Prüfung mit GitHub live; Routinenaktionen für Pull Requests und automatische Warteschlangen in Vorschau, standardmäßig aus.",
    ),
  },
  {
    key: "escalation",
    label: t("Escalation", "Eskalation"),
    // INSPR-578: the header Desk follows the completed Agents cutover.
    status: "live",
    note: t(
      "Questions, approvals and suggested lessons together in the header Decision Desk, also on phones.",
      "Fragen, Freigaben und vorgeschlagene Erkenntnisse in der Entscheidungsübersicht im Kopfbereich, auch am Telefon.",
    ),
  },
  {
    key: "audit",
    label: t("Audit", "Audit-Historie"),
    status: "live",
    note: t(
      "Protected audit history with worker attribution, outcomes, and reports on sessions, tokens and costs.",
      "Geschützte Audit-Historie mit Zuordnung der Arbeit, Ergebnissen sowie Berichten zu Sitzungen, Token und Kosten.",
    ),
  },
];

export const trustContexts = t(
  "Personal, INSPR and business work are separate tenants on one platform. Credentials and tickets never cross.",
  "Private Arbeit, INSPR und Geschäftsarbeit sind getrennte Mandanten auf einer Plattform. Zugangsdaten und Tickets wechseln nie die Seite.",
);
