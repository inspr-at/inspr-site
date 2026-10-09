import { siteUrls } from "../urls";
import { buildOrder, engineJobs } from "../family";
import { paimosRelease } from "../paimos-aeon";
import type { AeonContent } from "../types";

// German edition of the PAIMOS AEON page, served at paimos.inspr.at/de/
// (INSPR-492, INSPR-544). Facts, links, proof paths, icons and structure mirror
// ../paimos-aeon.ts; only language-visible values differ. The release comes
// from the same paimosRelease constant. AEON's web UI is English, so on-screen
// names such as "Decision Desk" stay English, as do the release codenames. Keep
// both files in sync when product claims change.
const repositoryUrl = "https://github.com/inspr-at/paimos";
const tag = paimosRelease.tag;
const blob = (path: string) => `${repositoryUrl}/blob/${tag}/${path}`;

export const paimosAeonContentDe = {
  name: "PAIMOS AEON",
  category: "Agentenorientierte Arbeitsplattform",
  canonicalUrl: `${siteUrls.paimos}/de/`,
  repositoryUrl,
  sourceTreeUrl: `${repositoryUrl}/tree/${tag}`,
  release: {
    name: "AEON",
    codename: paimosRelease.codename,
    label: `Release ${paimosRelease.number}`,
    version: tag,
    publishedAt: paimosRelease.publishedAt,
    publishedLabel: paimosRelease.publishedLabel.de,
    url: `${repositoryUrl}/releases/tag/${tag}`,
  },
  seo: {
    title: "PAIMOS AEON · Ihre Agenten, Ihre Rechner, Ihre Regeln",
    description:
      "Die agentenorientierte Arbeitsplattform, in der Menschen das Sagen behalten: Claude Code, Codex, Cursor und pi starten auf Ihren eigenen Rechnern, jede Sitzung ist in einem Kontrollraum sichtbar, und jede geschützte Entscheidung trifft eine Person.",
  },
  nav: [
    { label: "Bildschirme", href: "#screens" },
    { label: "Kontrollraum", href: "#control-room" },
    { label: "Befugnis", href: "#authority" },
    { label: "Regeln", href: "#rules" },
    { label: "Arbeitssteuerung", href: "#engine" },
    { label: "Architektur", href: "#architecture" },
    { label: "Was kommt", href: "#next" },
  ],
  serviceIntro: "Augmentoring stellt PAIMOS AEON für Teams bereit, integriert und betreibt es.",
  hero: {
    eyebrow: "Teil von INSPR",
    titleLead: "Ihre Agenten. Ihre Rechner.",
    titleAccent: "Ihre Regeln.",
    lead:
      "AEON startet Claude Code, Codex, Cursor und pi auf Ihren eigenen Rechnern, zeigt jede Sitzung in einem Kontrollraum und überlässt jede geschützte Entscheidung einer Person.",
    depths: {
      simple:
        "Mit AEON arbeiten Ihr Team und seine KI-Helfer an denselben Projekten. Die Helfer laufen auf Ihren Computern, Sie sehen, was jeder tut, und Menschen geben die wichtigen Schritte frei.",
      technical: `Release ${paimosRelease.number} „${paimosRelease.codename}“: eine Go-Binärdatei mit eingebetteter Vue-Anwendung, Postgres 18 unter Sicherheit auf Zeilenebene im FORCE-Modus, ein Ereignisprotokoll je Mandant, das nur ergänzt wird, ein Vertrag nach OpenAPI 3.1 und aeon-agentd, das Claude Code, Codex, Cursor und pi auf gekoppelten Rechnern startet.`,
    },
    primaryLabel: "Im Einsatz ansehen",
    primaryHref: "#screens",
    alt: "Abstrakte Projekt-Agora, in der Menschen und KI-Teilnehmer um eine gemeinsame Betriebsfläche stehen",
    chips: [
      { kind: "approval", label: "Braucht Sie", detail: "Eine Person gibt geschützte Schritte frei" },
      { kind: "run", label: "Live-Sitzung", detail: "Modell, Denkaufwand und Fortschritt im Blick" },
      { kind: "event", label: "approval.proposed", detail: "An das Ereignisprotokoll angefügt" },
      { kind: "run", label: "Nachricht gelesen", detail: "Gesendet, zugestellt, gelesen" },
      { kind: "approval", label: "Entscheidungsübersicht („Decision Desk“)", detail: "Offene Entscheidungen warten auf eine Person" },
      { kind: "event", label: "node.moved", detail: "Der Arbeitsbaum aktualisiert sich live" },
      { kind: "run", label: "Nächstes Konto", detail: "Die Arbeit geht weiter, wenn ein Anbieter stoppt" },
      { kind: "event", label: "approval.approved", detail: "Eine Person hat entschieden" },
      { kind: "run", label: "Doktrin festgelegt", detail: "Regeln aus Git, an einem festgelegten Commit" },
    ],
  },
  figures: [
    {
      claim: "Regeln aus sechs Ebenen (Unternehmen, Projekt, Person, Agentenrolle, benannter Agent und Aufgabe) ergeben ein Regelwerk; die Doktrin wird aus Git an einem festgelegten Commit gelesen.",
      linkLabel: "So wirken die Regeln",
      href: "#rules",
    },
    {
      claim: "Menschen und Agenten schreiben in ein fortlaufendes Ereignisprotokoll je Mandant; Einträge werden nur angefügt.",
      linkLabel: "Zur Architektur",
      href: "#architecture",
    },
    {
      claim: "Eine Datei nach OpenAPI 3.1 beschreibt mehr als 500 API-Pfade.",
      linkLabel: "Vertrag lesen",
      href: blob("api/openapi.yaml"),
    },
  ],
  theatre: {
    eyebrow: "Interne Instanz",
    title: "AEON, gebaut mit AEON.",
    lead:
      "Diese Bildschirme stammen von einer internen Instanz, auf der das INSPR-Team AEON mit seinen eigenen Agenten plant, betreibt und ausliefert.",
    note: "Interne Instanz · aufgenommen am 30. September 2026",
    openLabel: "In voller Größe öffnen",
    screens: [
      {
        id: "tickets",
        tab: "Tickets",
        title: "Tickets nach Epic",
        body: "Die offenen Aufgaben von AEON, gruppiert nach Epic, mit Schätzungen der Agenten, Fortschritt und erwarteten Abschlusszeiten.",
        alt: "Die Ticketliste von AEON, gruppiert nach Epic, mit Spalten für Status, Priorität, Zuständige, Schätzung, Fortschritt und erwartetem Abschlusszeitpunkt.",
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
        alt: "Die Nutzungsübersicht von AEON für die letzten sieben Tage: erledigte Tickets, Agentenzeit, Wiederholungen und Tickets nach Agentenzeit.",
      },
    ],
  },
  specs: {
    eyebrow: "Eckdaten",
    title: "Was Sie bekommen.",
    lead: "Neunzehn veröffentlichte Fähigkeiten. Sieben der Bilder sind Illustrationen und als solche gekennzeichnet. Fahren Sie über eine Karte oder tippen Sie darauf, um die Details zu sehen.",
    leadEli10: "Dieselben neunzehn, in einfachen Worten.",
    items: [
      {
        label: "Agenten zuerst",
        icon: "workflow",
        group: "ai",
        note: "Claude Code, Codex, Cursor und pi starten unter Paimos in denselben Projekten wie Personen, jeder mit eigenem Schlüssel und eigenen Scopes. Grok läuft ohne Werkzeuge auf Apple Silicon; Gemini und OpenCode: nur Kopplung, Start geplant.",
        noteEli10: "KI-Helfer mehrerer Hersteller arbeiten in denselben Projekten wie Ihre Leute, und jeder trägt sein eigenes Kennzeichen. Einige kommen vorerst mit weniger Fähigkeiten dazu.",
      },
      {
        label: "Kontrollraum",
        icon: "panels-top-left",
        group: "ai",
        note: "Leitagenten und ausführende Agenten als Baum, Live-Zustand, Modell und Denkaufwand sowie Nachrichten mit Gesendet, Zugestellt und Gelesen.",
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
        label: "Protokoll, das nur ergänzt wird",
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
        note: "Eine Datei nach OpenAPI 3.1 mit mehr als 500 Pfaden, bereitgestellt von einer einzigen Binärdatei, die die Web-Anwendung einbettet.",
        noteEli10: "Alles, was die Anwendung kann, ist in einem öffentlichen Vertrag beschrieben, den auch andere Werkzeuge nutzen können.",
      },
      {
        label: "Gehostet oder selbst gehostet",
        icon: "server",
        group: "ops",
        note: "Nutzen Sie AEON auf einer Instanz, die Augmentoring für Sie betreibt, oder hosten Sie selbst: eine Binärdatei und Postgres 18 mit Ihrer OIDC-Anmeldung.",
        noteEli10: "Wir können es für Sie betreiben, oder Sie betreiben es auf Ihren eigenen Servern. Personen melden sich mit dem Firmenkonto an.",
      },
      {
        label: "AGPL-3.0",
        icon: "badge-check",
        group: "legal",
        note: "AEON unter AGPL-3.0-only prüfen, selbst betreiben, forken und verändern.",
        noteEli10: "Der Quellcode ist offen: Sie können ihn lesen, betreiben und verändern.",
      },
      {
        label: "Entwickelt in Österreich",
        icon: "mountain",
        group: "place",
        note: "Entworfen und gebaut in Graz, Österreich, als Teil der INSPR-Produktfamilie.",
        noteEli10: "Entwickelt in Graz, Österreich, von den Menschen hinter INSPR.",
      },
    ],
    glossary: [
      {
        id: "harness",
        term: "Agentenprogramm",
        matches: ["Agentenprogramm"],
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
        body: "OpenID Connect: das Standardprotokoll für die Anmeldung hinter den meisten Firmenanmeldungen.",
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
      "Leitagenten und ausführende Agenten als Baum, Live-Zustand, Modell und Denkaufwand sowie Nachrichten, die zeigen, wann sie gesendet, zugestellt und gelesen wurden.",
    depths: {
      simple:
        "Ein Bildschirm zeigt jeden KI-Helfer: woran er arbeitet, wem er berichtet und ob er Ihre Nachricht gelesen hat.",
      technical:
        "AgentsView stellt Sitzungen der Agentenprogramme dar, die über das Daemon-Protokoll gemeldet werden, mit Übergabe der Leitung, verwalteter Steuerung (steuern, unterbrechen, stoppen) und Wiederherstellung von Sitzungen; Zustellungen in den Posteingang werden als Gesendet, Zugestellt und Gelesen verfolgt.",
    },
    items: [
      {
        icon: "users-round",
        title: "Leitagenten und ausführende Agenten als Baum",
        body: "Jeder Leitagent mit den ausführenden Agenten, die er gestartet hat, und was jeder gerade tut.",
      },
      {
        icon: "radio-tower",
        title: "Nachrichten mit Empfangsbestätigung",
        body: "Gesendet, Zugestellt, Gelesen. Bei Sitzungen mit Posteingang wird die Zustellung verfolgt, und Hooks für den Posteingang bringen Nachrichten in die Sitzung. Cursor-Sitzungen haben keinen Posteingang und nehmen nur Unterbrechungen an.",
      },
      {
        icon: "sliders-horizontal",
        title: "Steuern, unterbrechen, stoppen",
        body: "Lenken Sie eine verwaltete Sitzung während des Laufs um, oder stoppen Sie sie sauber.",
        caveat: "Steuern: Claude unter macOS. Cursor: nur Unterbrechen",
      },
      {
        icon: "hard-drive",
        title: "Ihre Rechner, Ihre Konten",
        body: "Claude Code, Codex, Cursor und pi starten auf Rechnern, die Sie koppeln, angemeldet mit Ihren eigenen Abos.",
      },
    ],
    screenAlt:
      "Die Sitzungsansicht von AEON im dunklen Modus: Leitagenten mit ihren ausführenden Agenten, jeweils mit Ticket, Modell, Denkaufwand, Fortschritt und Lebenszeichen.",
    pairing: {
      eyebrow: "Kopplung",
      title: "Ein neuer Rechner kommt mit einem Befehl und dem Ja einer Person dazu.",
      steps: [
        { label: "Installieren Sie den signierten, notarisierten Daemon.", command: "brew install inspr-at/tap/aeon-agentd" },
        { label: "Koppeln Sie aus Ihrem Arbeitsordner.", command: "aeon-agentd pair" },
        { label: "Geben Sie den 9-stelligen Code im Browser ein und bestätigen Sie." },
      ],
    },
    harnessMatrix: {
      label: "Agentenprogramme",
      rows: [
        {
          status: "live",
          harnesses: ["Claude Code", "Codex", "Cursor", "pi"],
          note: "Starten unter Paimos auf macOS und Linux. Unterstützt; die Abnahme im Live-Betrieb steht noch aus.",
        },
        {
          status: "partly",
          harnesses: ["Grok"],
          note: "Läuft ohne Werkzeuge auf Apple Silicon: ein Gespräch in einem einzigen Schritt für Prüfungen, kein allgemeiner Entwicklungsagent.",
        },
        {
          status: "planned",
          harnesses: ["Gemini", "OpenCode"],
          note: "Vorerst nur Kopplung. Der Start ist geplant.",
        },
      ],
    },
    proof: [
      { label: "Arbeitsbereich für Agenten", path: "web/src/views/AgentsView.vue" },
      { label: "Verwaltete Steuerung", path: "internal/agentd/managed_control.go" },
      { label: "Adapter für Agentenprogramme", path: "internal/agentd/adapters.go" },
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
        "Ein angefragter Scope muss einem Scope des Schlüssels entsprechen oder ihn in Punktnotation verfeinern. approval.proposed gewährt nichts; approval.approved und die zugehörige Berechtigung werden gemeinsam festgeschrieben; die Datenbank weist Entscheidungen von Agenten zurück, ebenso jede Berechtigung ohne passende freigegebene Anfrage.",
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
        body: "Freigabe und Berechtigung werden in einer Transaktion festgeschrieben.",
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
      { label: "Nutzungsübersicht", path: "internal/usagedashboard" },
    ],
  },
  rules: {
    eyebrow: "Agentenregeln",
    title: "Ein Regelwerk, sechs Ebenen.",
    lead:
      "Unternehmen, Projekt, Person, Rolle, benannter Agent und Aufgabe: sechs Ebenen, zusammengeführt zu einem Regelwerk. Jede Veröffentlichung ist unveränderlich und versioniert, und die Doktrin wird aus Git an einem festgelegten Commit gelesen.",
    depths: {
      simple:
        "Hausregeln für KI-Helfer werden einmal für das Unternehmen geschrieben und für jedes Projekt, jede Person und jede Aufgabe verfeinert. Die wichtigen bleiben fest verankert.",
      technical:
        "Die Regelverarbeitung führt sechs Ebenen zu unveränderlichen, versionierten Veröffentlichungen mit gesperrten Untergrenzen und Byte-Budgets je Ebene zusammen. Die Doktrin aus Git wird bei einem festgelegten Commit gelesen; aeon rules compare und aeon doctor melden Abweichungen gegenüber dem zusammengeführten Regelsatz.",
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
      { title: "Abweichungen erkennen", body: "aeon rules compare und aeon doctor zeigen, wo ein Agentenprogramm von der veröffentlichten Fassung abweicht." },
    ],
    early: "Früh: Regeländerungen als Pull Requests, sobald ein Betreiber sie aktiviert.",
    screenAlt:
      "Die Agentenregeln in AEON: Regelsätze für Unternehmen und Projekt mit ihren Sperren, ein geöffneter Satz gesperrter Kernregeln, das Byte-Budget und die aus Git an einem festgelegten Commit gelesene Doktrin.",
    proof: [
      { label: "Regeln", path: "internal/rules" },
      { label: "Regelvergleich", path: "internal/rulescompare" },
      { label: "README: Agentenregeln", path: "README.md" },
    ],
  },
  engine: {
    eyebrow: "Die Arbeitssteuerung",
    title: "So wird die Arbeit gesteuert.",
    lead:
      "Sechs Aufgaben steuern die Arbeit rund um die Tickets. Zwei sind live, vier sind teilweise live: Jede nennt, wie weit sie ausgeliefert ist.",
    depths: {
      simple:
        "Die Arbeitssteuerung ist der Teil von AEON, der Agenten und Menschen im Takt hält. Einige ihrer Aufgaben funktionieren schon, andere sind noch im Aufbau.",
      technical:
        "Heute live: der Zulassungsregler mit Grenzen je Agentenprogramm, Modellpräferenzen je Art der Arbeit mit Prüfreihenfolge und Prüfschritten, die Entscheidungsübersicht („Decision Desk“) mit dauerhaftem Posteingang sowie Ereignisse mit Zuordnung der Arbeit zu den ausführenden Agenten, Ergebnissen und Berichten zu Sitzungen, Token und Kosten.",
    },
    jobs: engineJobs.map((job) => ({ label: job.label.de, status: job.status, note: job.note.de })),
    flowNote: {
      text: "Der frühere Ablauf ist eingestellt. Der nächste, Flow 2, ist geplant.",
      status: "planned",
    },
  },
  architecture: {
    eyebrow: "Architektur",
    title: "Eine Binärdatei. Eine Datenbank. Ein Ereignisprotokoll.",
    lead: "Wenige bewegliche Teile, und die Garantien liegen in der Datenbank.",
    depths: {
      simple:
        "Unter der Haube ist AEON bewusst einfach: ein Programm, eine Datenbank und eine Aufzeichnung von allem, was geschehen ist.",
      technical:
        "Eine einzelne Go-Binärdatei bettet die Vue-Anwendung ein und stellt den Vertrag nach OpenAPI 3.1 bereit. Postgres 18 mit pgvector hält jede Zeile unter Sicherheit auf Zeilenebene im FORCE-Modus, eine Ereignistabelle, die nur ergänzt wird, speist die Historie und Live-Aktualisierungen per Server-Sent Events, und aeon-agentd spricht ein Daemon-Protokoll mit den Adaptern für Agentenprogramme.",
    },
    diagram: {
      clientsLabel: "Menschen und Werkzeuge",
      clients: ["Browser", "CLI", "HTTP-API"],
      serverLabel: "Ein Server",
      server: ["Eine Go-Binärdatei", "Eingebettete Web-Anwendung", "Vertrag nach OpenAPI 3.1"],
      databaseLabel: "Eine Datenbank",
      database: ["Postgres 18", "Sicherheit auf Zeilenebene (FORCE)", "Ereignisprotokoll, das nur ergänzt wird"],
      daemonLabel: "Ihre Rechner",
      daemon: "aeon-agentd",
      harnesses: ["Claude Code", "Codex", "Cursor", "pi", "Grok (ohne Werkzeuge)"],
      live: "Live-Aktualisierungen",
    },
    notes: [
      {
        title: "Ein Ereignisprotokoll, vollständig erhalten",
        body: "Ein Trigger lässt das Ereignisprotokoll nur wachsen; Historie und Live-Aktualisierungen lesen beide daraus.",
        proof: { label: "Schema des Ereignisprotokolls", path: "internal/db/migrations/0101_relations_events.sql" },
      },
      {
        title: "Mandantentrennung in der Datenbank",
        body: "Sicherheit auf Zeilenebene im FORCE-Modus hält die Mandanten in jeder Tabelle auseinander, unterhalb der Anwendung.",
        proof: { label: "Schema der Mandantentrennung", path: "internal/db/migrations/0003_principals.sql" },
      },
      {
        title: "Schlüssel als Obergrenze",
        body: "Eine Freigabe kann die Scopes eines Schlüssels verfeinern und bleibt innerhalb davon.",
        proof: { label: "Hinweise zum Freigabe-Paket", path: "internal/approvals/doc.go" },
      },
      {
        title: "Vertrag zuerst",
        body: "Eine Datei nach OpenAPI 3.1 beschreibt mehr als 500 Pfade; der Server bettet die Web-Anwendung ein, die er ausliefert.",
        proof: { label: "OpenAPI-Vertrag", path: "api/openapi.yaml" },
      },
    ],
  },
  horizon: {
    eyebrow: "Was kommt",
    title: "In der Reihenfolge, in der wir bauen.",
    lead: "Jeder Schritt nennt, wie weit er ausgeliefert ist. Keiner trägt ein Datum, und nichts Geplantes ist live.",
    order: buildOrder.map((step) => ({
      label: step.label.de,
      status: step.status,
      note: step.statusNote?.de,
    })),
    goodToKnow: {
      title: "Gut zu wissen",
      items: [
        "Diese Agentenprogramme sind unterstützt, und die Abnahme im Live-Betrieb steht noch aus.",
        "Steuerung und Sitzungseinstellungen sind für Claude unter macOS qualifiziert; Cursor unterstützt nur Unterbrechen.",
        "Nur Claude hat eine qualifizierte Verifikation ohne Werkzeuge; Codex und Cursor verbinden sich ohne automatischen Verifikationslauf.",
        "Das Anbinden einer laufenden Sitzung ist früh verfügbar, aus macOS-Terminals.",
        "Tickets, Wissen und Suche laufen über die CLI und die HTTP-API; der MCP-Server ist früh verfügbar.",
        "Regeländerungen als Pull Requests stehen bereit, sobald ein Betreiber sie aktiviert.",
        "Personen melden sich über Ihren OIDC-Identitätsanbieter an.",
      ],
    },
  },
  openSource: {
    eyebrow: "Open Source",
    title: "Open Source, AGPL-3.0.",
    body: `Sie können AEON unter AGPL-3.0-only prüfen, selbst betreiben, forken und verändern. Jeder Quellcode-Link auf dieser Seite zeigt auf den Tag von Release ${paimosRelease.number}.`,
    links: [
      { label: "GitHub-Repository", href: repositoryUrl, external: true },
      { label: `Release ${paimosRelease.number} auf GitHub`, href: `${repositoryUrl}/releases/tag/${tag}`, external: true },
      { label: "Projektlizenz (AGPL-3.0-only)", href: blob("LICENSE"), external: true },
      { label: "Sicherheitsrichtlinie", href: blob("SECURITY.md"), external: true },
      { label: "Agenten-Integration", href: blob("docs/AGENT_INTEGRATION.md"), external: true },
    ],
  },
  faq: [
    {
      question: "Welche Agenten können wir nutzen?",
      answer:
        "Claude Code, Codex, Cursor und pi starten unter Paimos auf macOS und Linux, einschließlich OpenRouter-Modellen über pi. Grok läuft ohne Werkzeuge auf Apple Silicon. Gemini und OpenCode: nur Kopplung, Start geplant. Sie laufen über aeon-agentd auf Rechnern, die Sie koppeln, mit Ihren eigenen Abos.",
    },
    {
      question: "Wo liegen unsere Daten?",
      answer:
        "Dort, wo Sie es entscheiden: auf einer Instanz, die Augmentoring für Sie betreibt, oder selbst gehostet auf Ihrer eigenen Infrastruktur, als eine Server-Binärdatei und eine Postgres-18-Datenbank. In beiden Fällen hält die Sicherheit auf Zeilenebene in der Datenbank die Mandanten auseinander.",
    },
    {
      question: "Kann ein Agent seine eigene Anfrage freigeben?",
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
