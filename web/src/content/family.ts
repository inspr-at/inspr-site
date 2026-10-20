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
      // INSPR-578: adapters do not establish managed readiness or verification.
      status: "partly",
      statusNote: t(
        "Review gates live; Claude Code, Codex, Cursor and pi start under Paimos, with live acceptance still open. Grok runs tool-free on Apple silicon. Gemini and OpenCode adapters available; managed readiness and verification remain unqualified. Cross-family review setting: live; automatic review rounds: shadow preview",
        "Prüfschritte live; Claude Code, Codex, Cursor und pi starten unter Paimos, die Abnahme im Live-Betrieb steht noch aus. Grok läuft ohne Werkzeuge auf Apple Silicon. Adapter für Gemini und OpenCode verfügbar; Betriebsbereitschaft für verwaltete Läufe und Verifikation bleiben unqualifiziert. Prüfung durch eine andere Modellfamilie als Einstellung: live; automatische Prüfrunden: Vorschau im Schattenbetrieb",
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
        "Recurring tickets live; routine setup and logbooks available; automatic execution preview, off by default, pending qualification and person consent; learning planned",
        "Wiederkehrende Tickets live; Routinen einrichten und Laufprotokolle verfügbar; automatische Ausführung als Vorschau, standardmäßig aus, bis zur Qualifikation und Zustimmung einer Person; Lernen geplant",
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
      "Recurring tickets live; routine setup and logbooks available; automatic execution preview, off by default, pending qualification and person consent; perpetual bots and learning planned",
      "Wiederkehrende Tickets live; Routinen einrichten und Laufprotokolle verfügbar; automatische Ausführung als Vorschau, standardmäßig aus, bis zur Qualifikation und Zustimmung einer Person; dauerhafte Bots und Lernen geplant",
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
      "Managed starts with admission limits, Models routing, goals and delivery measurements, workflow checks, header Decision Desk and reporting: available. Broader admission, automatic review and shipping: shadow preview. Routine PR actions and admission-queue operations: gated preview, off by default",
      "Verwaltete Starts mit Zulassungsgrenzen, Modellwahl über Models, Ziele und Auslieferungsmessungen, Prüfregeln, Entscheidungsübersicht („Decision Desk“) im Kopfbereich und Berichte: verfügbar. Übergreifende Zulassung, automatische Prüfung und Auslieferung: Vorschau im Schattenbetrieb. Routinenaktionen für Pull Requests und Zulassungswarteschlange: Vorschau mit Freigabevoraussetzungen, standardmäßig aus",
    ),
  },
  {
    key: "bots",
    label: t("Bots and Routines", "Bots und Routinen"),
    // INSPR-578: setup and logbooks exist; execution qualification is separate.
    status: "partly",
    statusNote: t(
      "Recurring tickets live; Routines preview: definitions, assignments, templates and logbooks available. Automatic execution remains off pending qualification and person consent; perpetual bots and learning planned",
      "Wiederkehrende Tickets live; Routinen-Vorschau: Definitionen, Zuweisungen, Vorlagen und Laufprotokolle verfügbar. Automatische Ausführung bleibt bis zur Qualifikation und Zustimmung einer Person aus; dauerhafte Bots und Lernen geplant",
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
      "Reported session state, goal progress and ETA freshness are live. With GitHub connected, delivery status and stall alerts use reported steps; build-to-merge measurements show first-try success, rounds and idle time.",
      "Gemeldeter Sitzungszustand, Zielfortschritt und Aktualität der Ankunftszeiten sind live. Mit verbundenem GitHub nutzen Lieferstatus und Fristwarnungen gemeldete Schritte; Messungen vom ersten Build bis zur Zusammenführung zeigen Erfolg im ersten Versuch, Runden und Wartezeit.",
    ),
  },
  {
    key: "admission",
    label: t("Fair admission", "Faire Zulassung"),
    // INSPR-578: actual start checks coexist with the broader shadow projection.
    status: "partly",
    note: t(
      "Managed starts enforce daily limits and account permissions, with model fallbacks. Host-load checks for new starts are available when enabled, off by default. The broader admission projection remains shadow preview.",
      "Verwaltete Starts setzen Tagesgrenzen und Kontoberechtigungen durch und nutzen Ausweichmodelle. Rechnerlastprüfungen für neue Starts sind nach Aktivierung verfügbar und standardmäßig aus. Die übergreifende Zulassungsprojektion bleibt Vorschau im Schattenbetrieb.",
    ),
  },
  {
    key: "rules",
    label: t("Rules as settings", "Regeln als Einstellungen"),
    // INSPR-578: fallback orders and workflow definitions are available settings.
    status: "live",
    note: t(
      "Model fallback orders with per-step reasoning, workflow readiness and completion definitions, and cross-family review settings are live. Permitted people can override workflow checks with a recorded reason. Automatic review and fix rounds remain shadow preview.",
      "Reihenfolgen für Ausweichmodelle mit Denkaufwand je Schritt, Prüfregeln für Arbeitsbeginn und Abschluss sowie Einstellungen zur Prüfung durch eine andere Modellfamilie sind live. Berechtigte Personen können Prüfregeln mit dokumentierter Begründung übersteuern. Automatische Prüf- und Korrekturrunden bleiben Vorschau im Schattenbetrieb.",
    ),
  },
  {
    key: "effects",
    label: t("Effects only through Paimos", "Wirkungen nur über Paimos"),
    // INSPR-578: PR and queue machinery is gated preview, not autonomous shipping.
    status: "partly",
    note: t(
      "With GitHub connected, review status and the merge audit are live. Routine PR actions and admission-queue operations are gated preview, with automatic execution and queue enforcement off by default. Shadow shipping does not merge or deploy; a person's live confirmation is recorded separately.",
      "Mit verbundenem GitHub sind Prüfstatus und Merge-Prüfung live. Routinenaktionen für Pull Requests und die Zulassungswarteschlange sind Vorschau mit Freigabevoraussetzungen; automatische Ausführung und Warteschlangendurchsetzung sind standardmäßig aus. Auslieferung im Schattenbetrieb führt weder zusammen noch stellt sie bereit; die Live-Bestätigung einer Person wird getrennt erfasst.",
    ),
  },
  {
    key: "escalation",
    label: t("Escalation", "Eskalation"),
    // INSPR-578: the header Desk follows the completed Agents cutover.
    status: "live",
    note: t(
      "The header Decision Desk brings questions, approvals, step-ups, prepared lessons and definition decisions together, including on phones. Sign-in chores and ticket triage keep their own surfaces.",
      "Die Entscheidungsübersicht („Decision Desk“) im Kopfbereich bündelt Fragen, Freigaben, erneute Bestätigungen, vorbereitete Lernergebnisse und Entscheidungen zu Prüfregeln, auch am Telefon. Anmeldung und Ticket-Triage behalten eigene Ansichten.",
    ),
  },
  {
    key: "audit",
    label: t("Audit", "Prüfprotokoll"),
    status: "live",
    note: t(
      "Events, worker attribution, outcomes and session, token and cost reporting are live. Ordinary audit history is protected; selected account-probe and heartbeat telemetry can be pruned after 14 days.",
      "Ereignisse, Zuordnung der Arbeit, Ergebnisse sowie Berichte zu Sitzungen, Token und Kosten sind live. Gewöhnliche Prüfhistorie ist geschützt; ausgewählte Konto- und Lebenszeichen-Telemetrie kann nach 14 Tagen gelöscht werden.",
    ),
  },
];

export const trustContexts = t(
  "Personal, INSPR and business work are separate tenants on one platform. Credentials and tickets never cross.",
  "Private Arbeit, INSPR und Geschäftsarbeit sind getrennte Mandanten auf einer Plattform. Zugangsdaten und Tickets wechseln nie die Seite.",
);
