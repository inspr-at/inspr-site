import { siteUrls } from "../urls";
import type { AeonContent } from "../types";

// German edition of the PAIMOS AEON release 14 page, served at
// www.inspr.at/paimos-aeon/de/ (INSPR-492). Facts, links, proof paths, icons
// and structure mirror ../paimos-aeon.ts; only language-visible values differ.
// AEON's web UI is English, so on-screen labels such as "Needs you" and the
// journey stage names stay English, as do the release codenames. Keep both
// files in sync when product claims change.
const repositoryUrl = "https://github.com/inspr-at/paimos";
const tag = "v260930115354.0.0";
const blob = (path: string) => `${repositoryUrl}/blob/${tag}/${path}`;

export const paimosAeonContentDe = {
  name: "PAIMOS AEON",
  category: "Agentenorientierte Arbeitsplattform",
  canonicalUrl: `${siteUrls.paimos}/de/`,
  repositoryUrl,
  sourceTreeUrl: `${repositoryUrl}/tree/${tag}`,
  release: {
    name: "AEON",
    codename: "Hinged Hangar",
    label: "Release 14.1",
    version: tag,
    publishedAt: "2026-09-30T12:51:40Z",
    publishedLabel: "30. September 2026",
    url: `${repositoryUrl}/releases/tag/${tag}`,
  },
  seo: {
    title: "PAIMOS AEON · Ihre Agenten, Ihre Rechner, Ihre Regeln",
    description:
      "Die agentenorientierte Arbeitsplattform, in der Menschen das Sagen behalten: Claude, Codex, Cursor, Grok und pi laufen auf Ihren eigenen Rechnern, jede Sitzung ist in einem Kontrollraum sichtbar, und jede geschützte Entscheidung trifft eine Person.",
  },
  nav: [
    { label: "Bildschirme", href: "#screens" },
    { label: "Kontrollraum", href: "#control-room" },
    { label: "Befugnis", href: "#authority" },
    { label: "Regeln", href: "#rules" },
    { label: "Architektur", href: "#architecture" },
    { label: "Was kommt", href: "#next" },
  ],
  serviceIntro: "Augmentoring stellt PAIMOS AEON für Teams bereit, integriert und betreibt es.",
  hero: {
    eyebrow: "PAIMOS 7",
    titleLead: "Ihre Agenten. Ihre Rechner.",
    titleAccent: "Ihre Regeln.",
    lead:
      "AEON betreibt Claude, Codex, Cursor, Grok und pi auf Ihren eigenen Rechnern, zeigt jede Sitzung in einem Kontrollraum und überlässt jede geschützte Entscheidung einer Person.",
    depths: {
      simple:
        "Mit AEON arbeiten Ihr Team und seine KI-Helfer an denselben Projekten. Die Helfer laufen auf Ihren Computern, Sie sehen, was jeder tut, und Menschen geben die wichtigen Schritte frei.",
      technical:
        "Release 14.1 (v260930115354.0.0): eine Go-Binärdatei mit eingebetteter Vue-Anwendung, Postgres 18 unter Sicherheit auf Zeilenebene im FORCE-Modus, ein Append-only-Ereignisprotokoll je Mandant, ein Vertrag nach OpenAPI 3.1 und aeon-agentd, das fünf Harness-Adapter auf gekoppelten Rechnern steuert.",
    },
    primaryLabel: "Im Einsatz ansehen",
    primaryHref: "#screens",
    alt: "Abstrakte Projekt-Agora, in der Menschen und KI-Teilnehmer um eine gemeinsame Betriebsfläche stehen",
    chips: [
      { kind: "approval", label: "Needs you", detail: "Eine Person gibt geschützte Schritte frei" },
      { kind: "run", label: "Live-Sitzung", detail: "Modell, Denkaufwand und Fortschritt im Blick" },
      { kind: "event", label: "approval.proposed", detail: "An das Ereignisprotokoll angefügt" },
      { kind: "run", label: "Nachricht gelesen", detail: "Gesendet, zugestellt, gelesen" },
      { kind: "approval", label: "Build-Freigabe", detail: "journey.build wartet auf eine Person" },
      { kind: "event", label: "node.moved", detail: "Der Arbeitsbaum aktualisiert sich live" },
      { kind: "run", label: "Nächstes Konto", detail: "Die Arbeit geht weiter, wenn ein Anbieter stoppt" },
      { kind: "event", label: "approval.approved", detail: "Eine Person hat entschieden" },
      { kind: "run", label: "Doktrin gepinnt", detail: "Regeln aus Git, an einem gepinnten Commit" },
    ],
    ribbonLabel: "Append-only-Ereignisprotokoll",
    ribbon: [
      "node.created",
      "node.moved",
      "approval.proposed",
      "approval.approved",
      "journey.build_started",
      "node.updated",
      "journey.release_opened",
      "approval.revoked",
    ],
  },
  figures: [
    { value: "5", label: "Agenten-Harnesses" },
    { value: "6", label: "Regel-Ebenen" },
    { value: "8", label: "Journey-Stufen" },
    { value: "1", label: "Ereignisprotokoll je Mandant" },
    { value: "300+", label: "API-Pfade, ein Vertrag nach OpenAPI 3.1" },
  ],
  theatre: {
    eyebrow: "Live-Instanz",
    title: "AEON, gebaut mit AEON.",
    lead:
      "Diese Bildschirme stammen von aeon.barta.cm, wo das INSPR-Team AEON mit seinen eigenen Agenten plant, betreibt und ausliefert.",
    note: "aeon.barta.cm · aufgenommen am 30. September 2026",
    openLabel: "In voller Größe öffnen",
    screens: [
      {
        id: "tickets",
        tab: "Tickets",
        title: "Tickets nach Epic",
        body: "Das Backlog von AEON, gruppiert nach Epic, mit Schätzungen der Agenten, Fortschritt und ETAs.",
        alt: "Die Ticketliste von AEON, gruppiert nach Epic, mit Spalten für Status, Priorität, Zuständige, Schätzung, Fortschritt und ETA.",
      },
      {
        id: "graph",
        tab: "Graph",
        title: "Tickets, verbunden",
        body: "Offene Tickets, ihre Epics und typisierten Beziehungen als ein Graph.",
        alt: "Die Tickets von AEON als Graph aus Epics, Tickets und ihren Beziehungen.",
      },
      {
        id: "knowledge",
        tab: "Wissen",
        title: "Wissen, verbunden",
        body: "Runbooks, Richtlinien und Entscheidungen, so verknüpft, wie Agenten sie lesen.",
        alt: "Der Wissensgraph von AEON mit verknüpften Runbooks, Richtlinien und Gedächtniseinträgen.",
      },
      {
        id: "usage",
        tab: "Nutzung",
        title: "Nutzung",
        body: "Erledigte Tickets, Agentenzeit und Wiederholungen für das Projekt AEON, Tag für Tag.",
        alt: "Das Nutzungs-Dashboard von AEON für die letzten sieben Tage: erledigte Tickets, Agentenzeit, Wiederholungen und Tickets nach Agentenzeit.",
      },
    ],
  },
  specs: {
    eyebrow: "Eckdaten",
    title: "Was Sie bekommen.",
    lead: "Zwanzig Fähigkeiten, heute verfügbar. Fahren Sie über eine Karte oder tippen Sie darauf, um die Details zu sehen.",
    leadEli10: "Dieselben zwanzig, in einfachen Worten.",
    items: [
      {
        label: "Agenten zuerst",
        icon: "workflow",
        group: "ai",
        note: "Claude, Codex, Cursor, Grok und pi laufen als Harness-Sitzungen in denselben Projekten wie Personen, jede mit eigenem Schlüssel und eigenen Scopes.",
        noteEli10: "KI-Helfer mehrerer Hersteller arbeiten in denselben Projekten wie Ihre Leute, und jeder trägt sein eigenes Kennzeichen.",
      },
      {
        label: "Kontrollraum",
        icon: "panels-top-left",
        group: "ai",
        note: "Leitagenten und Worker als Baum, Live-Zustand, Modell und Denkaufwand sowie Nachrichten mit Gesendet, Zugestellt und Gelesen.",
        noteEli10: "Ein Bildschirm zeigt jeden KI-Helfer: was er gerade tut, wem er berichtet und ob er Ihre Nachricht gelesen hat.",
      },
      {
        label: "Ihre Rechner",
        icon: "hard-drive",
        group: "ops",
        note: "aeon-agentd koppelt einen Rechner über einen Code, den eine Person im Browser bestätigt; die Agenten laufen mit Ihren eigenen Abos.",
        noteEli10: "Die Helfer laufen auf Ihren eigenen Computern und mit Ihren eigenen KI-Abos. Einen Computer zu verbinden braucht das OK einer Person.",
      },
      {
        label: "Abgegrenzte Schlüssel",
        icon: "key-round",
        group: "security",
        note: "Ein Agentenschlüssel ist eine Obergrenze: Jede Anfrage muss einem seiner Scopes entsprechen oder ihn verfeinern.",
        noteEli10: "Jeder Helfer bekommt einen Schlüssel, der nur bestimmte Türen öffnet, und er kann nie mehr öffnen.",
      },
      {
        label: "Freigabe durch Personen",
        icon: "user-round-check",
        group: "security",
        note: "Geschützte Schritte warten auf eine gültige Freigabe, und die Datenbank nimmt eine Entscheidung nur von einer Person an.",
        noteEli10: "Bei wichtigen Schritten muss ein Helfer fragen. Nur eine Person kann ja sagen, und das System selbst prüft das nach.",
      },
      {
        label: "Kapazitätssteuerung",
        icon: "route",
        group: "ai",
        note: "AEON lernt Laufkosten und Anbieterlimits, hält einen Anteil für Sie frei und gibt Arbeit an das nächste Konto weiter, wenn ein Anbieter eines stoppt.",
        noteEli10: "Ist ein KI-Konto aufgebraucht, wandert die Arbeit zum nächsten, und ein Teil der Kapazität bleibt für Sie reserviert.",
      },
      {
        label: "Verwaltete Regeln",
        icon: "scroll-text",
        group: "ai",
        note: "Regeln schichten sich vom Unternehmen bis zur Aufgabe, werden als unveränderliche Versionen veröffentlicht und behalten gesperrte Untergrenzen und Byte-Budgets.",
        noteEli10: "Hausregeln für die Helfer werden einmal geschrieben und versioniert, und die wichtigen bleiben fest verankert.",
      },
      {
        label: "Doktrin aus Git",
        icon: "git-branch",
        group: "ops",
        note: "Die Doktrin wird bei einem festgelegten Commit aus Git gelesen; aeon rules compare und aeon doctor erkennen Abweichungen.",
        noteEli10: "Das Regelwerk liegt in der Versionsverwaltung, und eine Prüfung meldet, wenn ein Helfer mit einer veralteten Kopie arbeitet.",
      },
      {
        label: "Append-only-Protokoll",
        icon: "file-check-2",
        group: "security",
        note: "Jede Änderung wird an ein Ereignisprotokoll je Mandant angefügt; ein Trigger in der Datenbank verweigert nachträgliche Änderungen und Löschungen.",
        noteEli10: "Alles, was passiert, wird der Reihe nach aufgeschrieben, und die Aufzeichnung bleibt genau so, wie sie geschrieben wurde.",
      },
      {
        label: "Mandantentrennung",
        icon: "lock-keyhole",
        group: "security",
        note: "Sicherheit auf Zeilenebene im FORCE-Modus trennt in Postgres die Mandanten in jeder Tabelle, unterhalb der Anwendung.",
        noteEli10: "Die Daten jeder Organisation sind von der Datenbank selbst abgeschottet.",
      },
      {
        label: "Ein Arbeitsbaum",
        icon: "list-tree",
        group: "work",
        note: "Projekte, Epics, Tickets, Releases, Arbeitsaufträge und Wissen sind Knoten in einem Baum mit typisierten Beziehungen.",
        noteEli10: "Alles steht in einem Baum, sodass Sie immer sehen, wie eine Aufgabe mit dem großen Ganzen zusammenhängt.",
      },
      {
        label: "Arbeitsaufträge",
        icon: "timer",
        group: "work",
        note: "Arbeitsaufträge tragen Obergrenzen für Kosten und Zeit; erledigt heißt: jedes Kriterium erfüllt, Nachweise angehängt und kein Lauf mehr aktiv.",
        noteEli10: "Ein Auftrag für einen Helfer kommt mit Budget und klarer Ziellinie, und mit Nachweis gilt er als erledigt.",
      },
      {
        label: "Wissensgraph",
        icon: "network",
        group: "work",
        note: "Wissenseinträge verknüpfen sich über [[slug]]-Verweise und öffnen sich als Graph neben der Arbeit.",
        noteEli10: "Projektwissen wird einmal aufgeschrieben, miteinander verknüpft und als Landkarte gezeigt.",
      },
      {
        label: "Journeys und Freigaben",
        icon: "waypoints",
        group: "work",
        note: "Acht abgeleitete Stufen von Inspire bis Live, mit Freigaben durch Personen und benannten Deploy-Zielen.",
        noteEli10: "Jedes Projekt durchläuft klare Schritte, und eine Person gibt frei, bevor etwas live geht.",
      },
      {
        label: "Klare Nutzung",
        icon: "eye",
        group: "ops",
        note: "Tokens je Sitzung, Ticket und Epic, mit Schätzungen zu Listenpreisen getrennt von der Abo-Nutzung.",
        noteEli10: "Sie sehen, wie viel KI jede Aufgabe verbraucht hat, und Schätzungen sind klar als Schätzungen gekennzeichnet.",
      },
      {
        label: "Live-Aktualisierungen",
        icon: "radio-tower",
        group: "ops",
        note: "Offene Seiten folgen dem Ereignisprotokoll per Server-Sent Events, sodass sich Listen und Gliederung aktualisieren, während gearbeitet wird.",
        noteEli10: "Bildschirme aktualisieren sich von selbst, sobald sich etwas ändert.",
      },
      {
        label: "Vertrag zuerst",
        icon: "braces",
        group: "ops",
        note: "Eine Datei nach OpenAPI 3.1 mit 300+ Pfaden, bereitgestellt von einer einzigen Binärdatei, die die Web-Anwendung einbettet.",
        noteEli10: "Alles, was die Anwendung kann, ist in einem öffentlichen Vertrag beschrieben, den auch andere Werkzeuge nutzen können.",
      },
      {
        label: "Gehostet oder selbst gehostet",
        icon: "server",
        group: "ops",
        note: "Nutzen Sie AEON auf einer Instanz, die Augmentoring für Sie betreibt, oder hosten Sie selbst: eine Binärdatei und Postgres 18 mit Ihrer OIDC-Anmeldung.",
        noteEli10: "Wir können es für Sie betreiben, oder Sie betreiben es auf Ihren eigenen Servern. Personen melden sich mit dem Firmen-Login an.",
      },
      {
        label: "AGPL-3.0",
        icon: "badge-check",
        group: "legal",
        note: "AEON unter AGPL-3.0-only prüfen, selbst betreiben, forken und verändern.",
        noteEli10: "Der Quellcode ist offen: Sie können ihn lesen, betreiben und verändern.",
      },
      {
        label: "Made in Austria",
        icon: "mountain",
        group: "place",
        note: "Entworfen und gebaut in Graz, Österreich, als Teil der INSPR-Produktfamilie.",
        noteEli10: "Gemacht in Graz, Österreich, von den Menschen hinter INSPR.",
      },
    ],
    glossary: [
      {
        id: "harness",
        term: "Harness",
        matches: ["Harness"],
        body: "Das Agentenprogramm, das ein Anbieter ausliefert, etwa Claude Code oder Codex. AEON steuert jedes davon über einen Adapter.",
      },
      {
        id: "rls",
        term: "Sicherheit auf Zeilenebene",
        matches: ["Sicherheit auf Zeilenebene"],
        body: "Eine Funktion von Postgres, die jede Zeile innerhalb der Datenbank nach Mandant filtert, egal was die Anwendung anfragt.",
      },
      {
        id: "oidc",
        term: "OIDC",
        matches: ["OIDC"],
        body: "OpenID Connect: das Standardprotokoll für die Anmeldung hinter den meisten Firmen-Logins.",
      },
      {
        id: "openapi",
        term: "OpenAPI",
        matches: ["OpenAPI 3.1"],
        body: "Eine maschinenlesbare Beschreibung jedes Endpunkts, sodass andere Werkzeuge die API aufrufen können, ohne zu raten.",
      },
    ],
  },
  specGroups: {
    ai: "Agenten",
    security: "Sicherheit",
    ops: "Betrieb",
    work: "Arbeit",
    legal: "Open Source",
    place: "Herkunft",
  },
  controlRoom: {
    eyebrow: "Kontrollraum",
    title: "Alle Agenten in einer Ansicht.",
    lead:
      "Leitagenten und Worker als Baum, Live-Zustand, Modell und Denkaufwand sowie Nachrichten, die zeigen, wann sie gesendet, zugestellt und gelesen wurden.",
    depths: {
      simple:
        "Ein Bildschirm zeigt jeden KI-Helfer: woran er arbeitet, wem er berichtet und ob er Ihre Nachricht gelesen hat.",
      technical:
        "AgentsView stellt Harness-Sitzungen dar, die über das Daemon-Protokoll gemeldet werden, mit Übergabe der Leitung, verwalteter Steuerung (steuern, unterbrechen, stoppen) und Wiederherstellung von Sitzungen; Zustellungen in den Posteingang werden als Gesendet, Zugestellt und Gelesen verfolgt.",
    },
    items: [
      {
        icon: "users-round",
        title: "Leitagenten und Worker als Baum",
        body: "Jeder Leitagent mit den Workern, die er gestartet hat, und was jeder gerade tut.",
      },
      {
        icon: "radio-tower",
        title: "Nachrichten mit Empfangsbestätigung",
        body: "Gesendet, Zugestellt, Gelesen. Die Zustellung ist garantiert, und Posteingangs-Hooks bringen Nachrichten in die Sitzung.",
      },
      {
        icon: "sliders-horizontal",
        title: "Steuern, unterbrechen, stoppen",
        body: "Lenken Sie eine verwaltete Sitzung während des Laufs um, oder stoppen Sie sie sauber.",
        caveat: "Qualifiziert für Claude unter macOS",
      },
      {
        icon: "hard-drive",
        title: "Ihre Rechner, Ihre Konten",
        body: "Claude, Codex, Cursor, Grok und pi laufen auf Rechnern, die Sie koppeln, angemeldet mit Ihren eigenen Abos.",
      },
    ],
    screenAlt:
      "Die Sitzungsansicht von AEON im dunklen Modus: Leitagenten mit ihren Workern, jeweils mit Ticket, Modell, Denkaufwand, Fortschritt und Lebenszeichen.",
    pairing: {
      eyebrow: "Kopplung",
      title: "Ein neuer Rechner kommt mit einem Befehl und dem Ja einer Person dazu.",
      steps: [
        { label: "Installieren Sie den signierten, notarisierten Daemon.", command: "brew install inspr-at/tap/aeon-agentd" },
        { label: "Koppeln Sie aus Ihrem Arbeitsordner.", command: "aeon-agentd pair" },
        { label: "Geben Sie den 9-stelligen Code im Browser ein und bestätigen Sie." },
      ],
      harnessesLabel: "Harnesses",
      harnesses: ["Claude", "Codex", "Cursor", "Grok", "pi"],
    },
    proof: [
      { label: "Arbeitsbereich für Agenten", path: "web/src/views/AgentsView.vue" },
      { label: "Verwaltete Steuerung", path: "internal/agentd/managed_control.go" },
      { label: "Harness-Adapter", path: "internal/agentd/adapters.go" },
      { label: "Agenten-Integration", path: "docs/AGENT_INTEGRATION.md" },
    ],
  },
  authority: {
    eyebrow: "Befugnis",
    title: "Agenten schlagen vor. Menschen entscheiden.",
    titleAccent: "Die Datenbank setzt es durch.",
    lead:
      "Ein Schlüssel legt die Obergrenze jedes Agenten fest. Geschützte Schritte werden zu Freigabeanfragen, und nur eine Person kann daraus eine Berechtigung machen.",
    depths: {
      simple:
        "Ein Helfer kann um mehr bitten, und nur eine Person kann ja sagen. Die Datenbank prüft, dass es wirklich eine Person war.",
      technical:
        "Ein angefragter Scope muss einem Scope des Schlüssels entsprechen oder ihn in Punktnotation verfeinern. approval.proposed gewährt nichts; approval.approved und die zugehörige Berechtigung werden gemeinsam festgeschrieben; die Datenbank weist Entscheidungen von Agenten zurück, ebenso jede Berechtigung ohne passende genehmigte Anfrage.",
    },
    steps: [
      {
        label: "Obergrenze",
        title: "Der Schlüssel setzt das Limit",
        body: "Scopes wie harness.read oder knowledge.write begrenzen jede Anfrage.",
        actor: "Der API-Schlüssel",
        tokens: ["harness.read", "knowledge.write"],
      },
      {
        label: "Vorschlag",
        title: "Der Agent fragt",
        body: "Ein geschützter Schritt wird zu einem Vorschlag und landet im Protokoll. Er gewährt nichts.",
        actor: "Ein Agent",
        tokens: ["approval.proposed"],
      },
      {
        label: "Entscheidung",
        title: "Eine Person entscheidet",
        body: "Genehmigung und Berechtigung werden in einer Transaktion festgeschrieben.",
        actor: "Eine Person",
        tokens: ["approval.approved"],
      },
      {
        label: "Durchsetzung",
        title: "Die Datenbank hält die Linie",
        body: "Nur die Entscheidung einer Person zu einer passenden Freigabe wird zur Berechtigung.",
        actor: "Die Datenbank",
        tokens: ["0202_agent_approvals.sql"],
      },
    ],
    ui: {
      stepOf: "Schritt {n} von {total}",
      caption: "Einer der vier ist eine Person. Die anderen drei können nicht ja sagen.",
      pause: "Pausieren",
      resume: "Fortsetzen",
    },
    proof: [
      { label: "Freigaben", path: "internal/approvals/doc.go" },
      { label: "Durchsetzung der Freigaben", path: "internal/db/migrations/0202_agent_approvals.sql" },
      { label: "Kapazität", path: "internal/capacity" },
      { label: "Nutzungs-Dashboard", path: "internal/usagedashboard" },
    ],
  },
  rules: {
    eyebrow: "Agentenregeln",
    title: "Ein Regelwerk, sechs Ebenen.",
    lead:
      "Unternehmen, Projekt, Person, Rolle, benannter Agent und Aufgabe: sechs Ebenen, zusammengeführt zu einem Regelwerk. Jede Veröffentlichung ist unveränderlich und versioniert, und die Doktrin wird aus Git an einem gepinnten Commit gelesen.",
    depths: {
      simple:
        "Hausregeln für KI-Helfer werden einmal für das Unternehmen geschrieben und für jedes Projekt, jede Person und jede Aufgabe verfeinert. Die wichtigen bleiben fest verankert.",
      technical:
        "internal/rules führt sechs Ebenen zu unveränderlichen, versionierten Veröffentlichungen mit gesperrten Untergrenzen und Byte-Budgets je Ebene zusammen. Die Doktrin aus Git wird bei einem festgelegten Commit gelesen; aeon rules compare und aeon doctor melden Abweichungen gegenüber dem zusammengeführten Regelsatz.",
    },
    stops: [
      { label: "Unternehmen", at: 0.045 },
      { label: "Projekt", at: 0.436 },
      { label: "Person", at: 0.554 },
      { label: "Rolle und Agent", at: 0.578 },
      { label: "Budget", at: 0.601 },
      { label: "Doktrin", at: 0.624 },
    ],
    points: [
      { title: "Gesperrte Untergrenzen", body: "Eine höhere Ebene kann eine Regel für alle Ebenen darunter sperren." },
      { title: "Byte-Budgets", body: "Jede Ebene hat ein Größenbudget, damit lesbar bleibt, was ein Agent lädt." },
      { title: "Abweichungen erkennen", body: "aeon rules compare und aeon doctor zeigen, wo ein Harness von der veröffentlichten Fassung abweicht." },
    ],
    early: "Früh: Regeländerungen als Pull Requests, sobald ein Betreiber sie aktiviert.",
    screenAlt:
      "Die Agentenregeln in AEON: Regelsets für Unternehmen und Projekt mit ihren Sperren, ein geöffnetes Set gesperrter Kernel-Regeln, das Byte-Budget und die aus Git gepinnte Doktrin.",
    proof: [
      { label: "Regeln", path: "internal/rules" },
      { label: "Regelvergleich", path: "internal/rulescompare" },
      { label: "README: Agentenregeln", path: "README.md" },
    ],
  },
  delivery: {
    eyebrow: "Lieferung",
    title: "Acht Stufen von der Idee bis live.",
    lead:
      "Jedes Projekt folgt einer Journey. Die Stufe ergibt sich aus festgehaltenen Entscheidungen, und jede Freigabe erteilt eine Person.",
    depths: {
      simple:
        "Ein Projekt durchläuft acht Schritte. An jedem Tor sagt eine Person ja, bevor es weitergeht, und nichts anderes kann es bewegen.",
      technical:
        "Die Stufe ist eine Projektion, abgeleitet aus dem akzeptierten Brief, der menschlichen Shape-Entscheidung, der vereinbarten Anforderungsrevision, dem aktuellen Release-Zustand und den gültigen Freigaben der Tore. Ein Heartbeat, ein Timer oder eine Stufenangabe eines Clients bewegt die Leiste nie.",
    },
    stages: [
      {
        name: "Inspire",
        summary: "Die Aufnahme beginnt. Ein Brief wird mit Zitaten seiner Quellen entworfen, und nur eine Person kann ihn akzeptieren. Der akzeptierte Brief ist der erste Fakt, den die Ableitung der Stufe liest.",
        decides: "Eine Person akzeptiert den Brief.",
        action: "confirm_brief",
      },
      {
        name: "Shape",
        gate: true,
        scope: "journey.shape",
        summary: "Die Shape-Entscheidung ist ein menschliches Tor: weiter, Umfang reduzieren, parken oder verwerfen. Ein geparktes oder verworfenes Projekt behält die Stufe Shape und kann wieder geöffnet werden.",
        decides: "Eine Person entscheidet über die Form.",
        action: "decide",
        note: "Das persönliche Profil überspringt Shape, sobald ein Brief bestätigt ist.",
      },
      {
        name: "Requirements",
        gate: true,
        scope: "revisionsgebundener Anforderungs-Scope",
        summary: "Funktionale Anforderungen sind Anforderungsknoten. Die Vereinbarung erzeugt ein Epic je Anforderung und kann Tickets aus akzeptierten Vorschlägen erzeugen. Ein manuelles Ticket, das den vereinbarten Umfang ändert, bleibt markiert, bis die Anforderungen erneut vereinbart sind.",
        decides: "Eine Person vereinbart die Anforderungsrevision.",
        action: "approve_requirements",
      },
      {
        name: "Plan",
        summary: "Ein Release wird eröffnet, und der Plan speichert die geordnete Ticketmenge. Tickets können auch im Backlog des Projekts bleiben, ohne Teil eines Releases zu sein.",
        decides: "Abgeleitet aus dem Release. Kein Tor.",
        action: "start_build",
      },
      {
        name: "Build",
        gate: true,
        scope: "journey.build",
        summary: "Der Build-Start braucht ein freigegebenes Tor. Während der Build läuft, ist passives Warten die einzige Aktion. Sind die Tickets des Releases fertig, kann es Kandidat werden, und die Kandidatenprüfung ist ein eigenes Tor für eine Person.",
        decides: "Eine Person gibt Build-Start und Kandidat frei.",
        action: "approve_candidate",
        note: "Enterprise ergänzt eine separate Prüfung des Kandidaten durch eine andere Person als Builder und Autor.",
      },
      {
        name: "Deploy",
        gate: true,
        scope: "journey.deploy",
        summary: "Pharos verantwortet Deploy. Es prüft die Identität des geprüften Artefakts, aktuelles Backup und Bereitschaft und verbraucht eine Startzulassung, bevor sich ein Host ändert. Die Freigabe nennt ihr Ziel, und ein Tor kann erneuert werden.",
        decides: "Eine Person gibt die Bereitstellung frei.",
        action: "approve_deploy",
      },
      {
        name: "Access",
        gate: true,
        scope: "journey.access",
        summary: "Janus verantwortet Access. Apply folgt auf eine erfolgreiche Bereitstellung, verbraucht eine von einer Person freigegebene, begrenzte Erlaubnis und meldet nur, ob der Zugang autorisiert ist und Zugangsdaten bereitstehen.",
        decides: "Eine Person gibt die Erlaubnis frei.",
        action: "approve_permit",
        note: "Access wird nur übersprungen, wenn das Release keine ausdrückliche Zugangsänderung enthält.",
      },
      {
        name: "Live",
        summary: "Das Release ist live und hat eine öffentliche Versionshistorie. Startet das nächste Release, wird Live zum Zustand des vorherigen Releases, während Plan aktuell ist, und die Historie bleibt erhalten.",
        decides: "Abgeleitet aus dem Release. Kein Tor.",
        action: "plan_next_release",
      },
    ],
    gateLabel: "Freigabe durch eine Person",
    ui: {
      stageOf: "Stufe {n} von {total}",
      decides: "Wer entscheidet",
      gate: "Tor",
      noGate: "Kein Tor",
      nextAction: "Nächste Aktion",
      pause: "Pausieren",
      resume: "Fortsetzen",
    },
    proof: [
      { label: "Planungshierarchie", path: "docs/PLANNING_HIERARCHY.md" },
      { label: "Journey", path: "internal/journey" },
      { label: "Versionshistorie", path: "internal/releasehistory" },
      { label: "Release-Verifikation", path: "scripts/verify-release.mjs" },
    ],
  },
  architecture: {
    eyebrow: "Architektur",
    title: "Eine Binärdatei. Eine Datenbank. Ein Ereignisprotokoll.",
    lead: "Wenige bewegliche Teile, und die Garantien liegen in der Datenbank.",
    depths: {
      simple:
        "Unter der Haube ist AEON bewusst einfach: ein Programm, eine Datenbank und eine Aufzeichnung von allem, was geschehen ist.",
      technical:
        "Eine einzelne Go-Binärdatei bettet die Vue-Anwendung ein und stellt den Vertrag nach OpenAPI 3.1 bereit. Postgres 18 mit pgvector hält jede Zeile unter Sicherheit auf Zeilenebene im FORCE-Modus, eine Append-only-Ereignistabelle speist die Historie und Live-Aktualisierungen per Server-Sent Events, und aeon-agentd spricht ein Daemon-Protokoll mit fünf Harness-Adaptern.",
    },
    diagram: {
      clientsLabel: "Menschen und Werkzeuge",
      clients: ["Browser", "CLI", "HTTP-API"],
      serverLabel: "Ein Server",
      server: ["Eine Go-Binärdatei", "Eingebettete Web-Anwendung", "Vertrag nach OpenAPI 3.1"],
      databaseLabel: "Eine Datenbank",
      database: ["Postgres 18", "Sicherheit auf Zeilenebene (FORCE)", "Append-only-Ereignisprotokoll"],
      daemonLabel: "Ihre Rechner",
      daemon: "aeon-agentd",
      harnesses: ["Claude", "Codex", "Cursor", "Grok", "pi"],
      live: "Live-Aktualisierungen",
    },
    notes: [
      {
        title: "Ein Ereignisprotokoll, vollständig erhalten",
        body: "Ein Trigger lässt das Ereignisprotokoll nur wachsen; Historie und Live-Aktualisierungen lesen beide daraus.",
        proof: { label: "0101_relations_events.sql", path: "internal/db/migrations/0101_relations_events.sql" },
      },
      {
        title: "Mandantentrennung in der Datenbank",
        body: "Sicherheit auf Zeilenebene im FORCE-Modus hält die Mandanten in jeder Tabelle auseinander, unterhalb der Anwendung.",
        proof: { label: "0003_principals.sql", path: "internal/db/migrations/0003_principals.sql" },
      },
      {
        title: "Schlüssel als Obergrenze",
        body: "Eine Freigabe kann die Scopes eines Schlüssels verfeinern und bleibt innerhalb davon.",
        proof: { label: "approvals/doc.go", path: "internal/approvals/doc.go" },
      },
      {
        title: "Vertrag zuerst",
        body: "Eine Datei nach OpenAPI 3.1 beschreibt 300+ Pfade; der Server bettet die Web-Anwendung ein, die er ausliefert.",
        proof: { label: "api/openapi.yaml", path: "api/openapi.yaml" },
      },
    ],
  },
  horizon: {
    eyebrow: "Was kommt",
    title: "Heute live. Als Nächstes werden Ihre Agenten klüger.",
    lead: "Release 14.1 ist seit 30. September live. Was folgt, kann sich bis zum Release noch ändern.",
    releases: [
      {
        label: "Release 15",
        status: "coming",
        statusLabel: "Als Nächstes",
        when: "In Arbeit",
        items: [
          { title: "Immer eine ETA", body: "Jedes Ticket und jeder laufende Agent zeigt eine Schätzung und eine Live-ETA, gemeldet von den Agenten selbst." },
          { title: "Doktrin-Eingang", body: "Findet ein Agent eine bessere Regel, schlägt er sie vor: Sie sehen einen Punkt, prüfen den Diff und übernehmen sie mit einem Klick nach Git." },
          { title: "Ihre Marke im Header", body: "Logo und Kurzname Ihrer Organisation im Header von AEON." },
          { title: "Größere Regeldateien", body: "Agentenregeln bis 500 KB, mit Tipps für bewährte Praxis." },
        ],
      },
      {
        label: "Release 16",
        status: "planned",
        statusLabel: "Geplant",
        when: "",
        items: [
          { title: "Modellübergreifende Prüfung", body: "Jede Änderung eines Agenten prüft eine andere KI-Familie, bevor sie zusammengeführt werden kann; das Urteil steht am Ticket." },
          { title: "Autopilot-Spuren", body: "AEON wählt, schätzt und vergibt das nächste Ticket an den besten verfügbaren Agenten innerhalb Ihres Budgets und hält an, wo eine Person entscheiden muss." },
          { title: "Mehr Harnesses", body: "Gemini CLI und OpenCode, auch mit offenen Modellen, kommen zu Claude, Codex, Cursor, Grok und pi dazu." },
          { title: "Mit jeder laufenden Sitzung sprechen", body: "Senden Sie eine Nachricht direkt aus AEON in eine angebundene Claude- oder Codex-Sitzung." },
          { title: "Tempostufen je Agent", body: "Standard, Schnell und, wo Anbieter es anbieten, Ultra." },
        ],
      },
      {
        label: "Release 17",
        status: "planned",
        statusLabel: "Geplant",
        when: "",
        items: [
          { title: "Mit AEON sprechen", body: "Sprache: Tickets diktieren, Agenten lenken und hören, wo Sie gebraucht werden." },
          { title: "Morgenbriefing", body: "Was Ihre Agenten über Nacht ausgeliefert haben, wo Sie gebraucht werden und was es gekostet hat, jede Zeile mit ihrer Quelle verlinkt." },
          { title: "Freigeben unterwegs", body: "Push-Benachrichtigungen und Freigaben per Face ID vom Telefon." },
          { title: "Agenten, die immer laufen", body: "Die Arbeit geht in einer sicheren Cloud-Spur weiter, während Ihr Laptop schläft, innerhalb Ihres Budgets und Ihrer Regeln." },
        ],
      },
    ],
    goodToKnow: {
      title: "Gut zu wissen",
      items: [
        "Steuerung und Sitzungseinstellungen sind für Claude unter macOS qualifiziert.",
        "Das Anbinden einer laufenden Sitzung ist früh verfügbar und funktioniert seit Release 14.1 aus jedem macOS-Terminal.",
        "Tickets, Wissen und Suche laufen über die CLI und die HTTP-API; der MCP-Server ist früh verfügbar.",
        "Regeländerungen als Pull Requests stehen bereit, sobald ein Betreiber sie aktiviert.",
        "Personen melden sich über Ihren OIDC-Identitätsanbieter an.",
      ],
    },
  },
  openSource: {
    eyebrow: "Open Source",
    title: "Open Source, AGPL-3.0.",
    body:
      "Sie können AEON unter AGPL-3.0-only prüfen, selbst betreiben, forken und verändern. Jeder Quellcode-Link auf dieser Seite zeigt auf den Tag von Release 14.1.",
    links: [
      { label: "GitHub-Repository", href: repositoryUrl, external: true },
      { label: "Release 14.1 auf GitHub", href: `${repositoryUrl}/releases/tag/${tag}`, external: true },
      { label: "Projektlizenz (AGPL-3.0-only)", href: blob("LICENSE"), external: true },
      { label: "Sicherheitsrichtlinie", href: blob("SECURITY.md"), external: true },
      { label: "Agenten-Integration", href: blob("docs/AGENT_INTEGRATION.md"), external: true },
    ],
  },
  faq: [
    {
      question: "Welche Agenten können wir nutzen?",
      answer:
        "Claude, Codex, Cursor, Grok und pi, einschließlich OpenRouter-Modellen über pi. Sie laufen über aeon-agentd auf Rechnern, die Sie koppeln, mit Ihren eigenen Abos.",
    },
    {
      question: "Wo liegen unsere Daten?",
      answer:
        "Dort, wo Sie es entscheiden: auf einer Instanz, die Augmentoring für Sie betreibt, oder selbst gehostet auf Ihrer eigenen Infrastruktur, als eine Server-Binärdatei und eine Postgres-18-Datenbank. In beiden Fällen hält die Sicherheit auf Zeilenebene in der Datenbank die Mandanten auseinander.",
    },
    {
      question: "Kann ein Agent seine eigene Anfrage genehmigen?",
      answer:
        "Nein. Ein Agent schlägt vor; die Datenbank nimmt eine Entscheidung nur von einer Person zu einer gültigen Freigabeanfrage an, und jede Freigabe bleibt innerhalb der Scopes des Agentenschlüssels.",
    },
  ],
  finalCta: {
    title: "Betreiben Sie AEON auf Ihre Weise.",
    body:
      "Hosten Sie es selbst aus dem öffentlichen Quellcode, oder lassen Sie es von Augmentoring für Ihr Team bereitstellen, integrieren und betreiben.",
  },
} satisfies AeonContent;
