import { siteUrls } from "../urls";
import { buildOrder, engineJobs } from "../family";
import { paimosRelease, paimosReleaseUrl, paimosScreenRelease, paimosSourceRef } from "../paimos-aeon";
import type { AeonContent } from "../types";

// German edition of the PAIMOS AEON page, served at paimos.inspr.at/de/
// (INSPR-492, INSPR-544). Facts, links, proof paths, icons and structure mirror
// ../paimos-aeon.ts; only language-visible values differ. The release comes
// from the same paimosRelease constant. INSPR-578: the UI also has German
// workflow and delivery wording; retain English names where the view uses them.
// Source evidence and retained-screen provenance follow the English edition.
const repositoryUrl = "https://github.com/inspr-at/paimos";
const sourceRevision = paimosRelease.sourceRef.slice(0, 8);
// A trailing slash selects a directory; other destinations select files.
const blob = (path: string) => `${repositoryUrl}/${path.endsWith("/") ? "tree" : "blob"}/${paimosSourceRef}/${path}`;

export const paimosAeonContentDe = {
  name: "PAIMOS AEON",
  category: "Agentenorientierte Arbeitsplattform",
  canonicalUrl: `${siteUrls.paimos}/de/`,
  repositoryUrl,
  sourceTreeUrl: `${repositoryUrl}/tree/${paimosSourceRef}`,
  release: {
    name: "AEON",
    codename: paimosRelease.codename,
    label: `Release ${paimosRelease.number}`,
    version: paimosRelease.tag,
    sourceRevision,
    publishedAt: paimosRelease.publishedAt,
    publishedLabel: paimosRelease.publishedLabel?.de,
    url: paimosReleaseUrl,
  },
  seo: {
    title: "PAIMOS AEON · Ihre Agenten, Ihre Rechner, Ihre Regeln",
    description:
      "Die agentenorientierte Arbeitsplattform, in der Menschen das Sagen behalten: Claude Code, Codex, Cursor und pi starten auf Ihren eigenen Rechnern, registrierte Sitzungen sind in einem Kontrollraum sichtbar, und geschützte Entscheidungen trifft eine Person.",
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
      "AEON startet Claude Code, Codex, Cursor und pi auf Ihren eigenen Rechnern, zeigt registrierte Sitzungen in einem Kontrollraum und überlässt geschützte Entscheidungen einer Person.",
    depths: {
      simple:
        "Mit AEON arbeiten Ihr Team und seine KI-Helfer an denselben Projekten. Die Helfer laufen auf Ihren Computern, Sie sehen die gemeldete Arbeit, und Menschen geben die wichtigen Schritte frei.",
      technical: `Release ${paimosRelease.number}${paimosRelease.codename ? ` „${paimosRelease.codename}“` : ""}: eine Go-Binärdatei mit eingebetteter Vue-Anwendung, Postgres 18 unter Sicherheit auf Zeilenebene im FORCE-Modus, eine geschützte Audit-Historie je Mandant, ein Vertrag nach OpenAPI 3.1 und aeon-agentd, das Claude Code, Codex, Cursor und pi auf gekoppelten Rechnern startet.`,
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
      claim: "Menschen und Agenten schreiben in ein Ereignisprotokoll je Mandant, mit geschützter Audit-Historie.",
      linkLabel: "Zur Architektur",
      href: "#architecture",
    },
    {
      claim: "Eine Datei nach OpenAPI 3.1 beschreibt mehr als 500 API-Pfade.",
      linkLabel: "Vertrag lesen",
      href: blob("api/areas/"),
    },
  ],
  theatre: {
    eyebrow: "Echte Bildschirme",
    title: "AEON in echten Ansichten.",
    lead: `Auslieferung, unabhängige Prüfung und Gespräche mit verwalteten Agenten, gezeigt in Ansichten aus Release ${paimosScreenRelease} mit erfundenen Projektdaten.`,
    note: `Echter Bildschirm, Beispieldaten · Version ${paimosScreenRelease}`,
    openLabel: "In voller Größe öffnen",
    screens: [
      {
        id: "delivery",
        tab: "Auslieferung",
        title: "Auslieferung verfolgen",
        body: "Eine Demo-Version 126 auf einer Zeitachse, Spur für Spur: Sie, der Leitagent, Betriebs- und Prüfagenten, der Entwicklungsagent und die CI-Prüfungen. Ein rotes Band markiert den Vorfall seit 20:14 Uhr. Die Zusammenfassung zeigt, was gerade läuft und dass ein störungsfreier Zustand gegen 20:35 Uhr erwartet wird.",
        alt: "PAIMOS Auslieferungsansicht mit Zeitachsen für Auslieferung und Änderungen sowie dem aktuellen Lieferstatus.",
      },
      {
        id: "review",
        tab: "Prüfung",
        title: "Prüfung durch andere Modellfamilie",
        body: "Eine Regel für den Arbeitsbereich: Eine Änderung gilt erst als geprüft, wenn ein Modell einer anderen Familie sie geprüft hat. Der Pull Request zeigt dieselbe Regel als GitHub-Status.",
        alt: "PAIMOS-Prüfrichtlinie mit ausgewählter Prüfung durch eine andere Modellfamilie.",
      },
      {
        id: "chat",
        tab: "Chat",
        title: "Chat mit einem Agenten",
        body: "Ein Gespräch mit dem Leitagenten: ein Codeblock mit Kopierfunktion, eine Lesebestätigung, eine Nachricht für nach diesem Arbeitsschritt und Stoppen mit Esc.",
        alt: "PAIMOS-Chat mit einem Agenten, Lesebestätigung, wartender Nachricht, Codeblock und Stop-Steuerung.",
      },
      {
        id: "attention",
        tab: "Handlungsbedarf",
        title: "Handlungsbedarf",
        body: "Fünf Vorschläge des Autopiloten, nach Projekt gruppiert: drei AEON-Tickets von Neu nach Backlog und zwei PHAROS-Tickets zum Abbrechen. Sie können jeden Vorschlag übernehmen oder verwerfen oder alle Vorschläge eines Projekts übernehmen.",
        alt: "PAIMOS Handlungsbedarf nach Projekt gruppiert, mit vorgeschlagenen Ticketänderungen und Sammelbearbeitung.",
      },
      {
        id: "models",
        tab: "Modelle",
        title: "Ein Standardmodell",
        body: "Ein Standardmodell und Ausnahmen für Oberflächengestaltung (gesperrt), Dokumentation und Texte sowie Konzepte. Die Prüfung durch eine andere Modellfamilie ist ausgewählt; das nächste Entwicklungsmodell für das Backend und sein Prüfmodell sind angegeben.",
        alt: "PAIMOS-Modelleinstellungen mit einem Standardmodell, Ausnahmen nach Aufgabe und unabhängigen Prüfungen.",
      },
      {
        id: "usage",
        tab: "Nutzung",
        title: "Nutzung",
        body: "Ein gemeinsames Wochenkontingent mit 42 % Rest und Rücksetzzeit, zwei angemeldete Rechner und die Wahl zwischen vorsichtiger, ausgewogener oder voller Nutzung mit einer Untergrenze von 10 %.",
        alt: "PAIMOS-Kontonutzung mit vorsichtiger Nutzung, Grenzen, verbleibender Kapazität und Rücksetzzeiten.",
      },
    ],
  },
  specs: {
    eyebrow: "Eckdaten",
    title: "Was Sie bekommen.",
    // INSPR-578: two new cards; round 2 keeps benefits short and details scoped.
    lead: "Einundzwanzig veröffentlichte Fähigkeiten. Sechs der Bilder sind Illustrationen und als solche gekennzeichnet. Fahren Sie über eine Karte oder tippen Sie darauf, um die Details zu sehen.",
    leadEli10: "Dieselben einundzwanzig, in einfachen Worten.",
    items: [
      {
        label: "Agenten zuerst",
        icon: "workflow",
        group: "ai",
        note: "Nutzen Sie Claude Code, Codex, Cursor und pi neben Ihrem Team, mit eigenen Schlüsseln und Berechtigungen. Grok läuft ohne Werkzeuge auf Apple Silicon; Gemini und OpenCode sind für verwaltete Läufe noch nicht verifiziert.",
        noteEli10: "KI-Helfer mehrerer Hersteller arbeiten in denselben Projekten wie Ihre Leute, und jeder trägt sein eigenes Kennzeichen. Einige kommen vorerst mit weniger Fähigkeiten dazu.",
      },
      {
        label: "Kontrollraum",
        icon: "panels-top-left",
        group: "ai",
        note: "Finden Sie registrierte Sitzungen nach Projekt, mit Tickets, Zustand, Modell, Denkaufwand und gespeicherten Gesprächen. Empfangsbestätigungen zeigen, wann Nachrichten gesendet, zugestellt und gelesen wurden.",
        noteEli10: "Finden Sie registrierte Helfer und ihre Gespräche nach Projekt. Sehen Sie, ob eine Nachricht im Posteingang angekommen oder gelesen ist.",
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
        label: "Konten und Modelle",
        icon: "route",
        group: "ai",
        note: "Wählen Sie Kontoberechtigungen, tägliche Prozentpunkte oder volle Nutzung sowie Ausweichmodelle mit Denkaufwand und Wartegründen. Boost gilt für heute; automatische Modellaktualisierungen müssen Sie aktivieren.",
        noteEli10: "Wählen Sie Konten, Tagesnutzung und die Reihenfolge der Modelle. Legen Sie fest, wie viel Denkaufwand die Modelle einsetzen.",
      },
      {
        label: "Verwaltete Regeln",
        icon: "scroll-text",
        group: "ai",
        note: "Regeln bauen vom Unternehmen bis zur Aufgabe aufeinander auf und werden als unveränderliche Versionen mit gesperrten Untergrenzen und Größenbudgets veröffentlicht. Die Doktrin wird bei einem festgelegten Commit aus Git gelesen; Prüfungen erkennen Abweichungen.",
        noteEli10: "Hausregeln bauen vom Unternehmen bis zur Aufgabe aufeinander auf. Wichtige Regeln bleiben gesperrt; eine Prüfung zeigt, wenn ein Helfer eine andere Kopie hat.",
      },
      {
        label: "Prüfung durch andere Modellfamilie",
        icon: "git-compare-arrows",
        group: "ai",
        note: "Legen Sie je Unternehmen oder Projekt die Prüfung durch eine andere Modellfamilie fest. Mit verbundenem GitHub prüft PAIMOS den erfassten Urheber und meldet Zusammenführungen ohne Warteschlange oder verifizierte Prüfung.",
        noteEli10: "Nutzen Sie einen Prüfer aus einer anderen KI-Familie. Mit verbundenem GitHub meldet PAIMOS fehlende Prüfungen oder übersprungene Warteschlangen; automatische Prüfungen und Korrekturen sind in Vorschau.",
      },
      {
        label: "Geschützte Audit-Historie",
        icon: "file-check-2",
        group: "security",
        note: "Die Datenbank schützt die Audit-Historie; ausgewählte Kontoprüfungen und Statusmeldungen können nach 14 Tagen gelöscht werden.",
        noteEli10: "Die geschützte Audit-Historie zeigt, wer was getan hat.",
      },
      {
        label: "Mandantentrennung",
        icon: "lock-keyhole",
        group: "security",
        note: "Sicherheit auf Zeilenebene im FORCE-Modus trennt in Postgres die Mandantendaten, unterhalb der Anwendung.",
        noteEli10: "Die Daten jeder Organisation sind von der Datenbank selbst abgeschottet.",
      },
      {
        label: "Ein Arbeitsbaum",
        icon: "list-tree",
        group: "work",
        note: "Projekte, Epics, Tickets, Releases, Arbeitsaufträge und Wissen sind Knoten in einem Baum mit typisierten Beziehungen. Wo eingerichtet, wird aus einem START-Gespräch ein von einer Person bestätigtes Projekt mit strukturierter Arbeit.",
        noteEli10: "Projekte, Aufgaben und Wissen teilen sich einen Baum, sodass Sie Zusammenhänge sehen. Wo eingerichtet, kann aus einem START-Gespräch nach Bestätigung einer Person ein Projekt werden.",
      },
      {
        // INSPR-578: goals and workflow checks are the two added capabilities.
        label: "Ziele und Fortschritt",
        icon: "circle-dot",
        group: "work",
        note: "Sehen Sie Ziele und Epics mit Fortschrittsverlauf, Ankunftsschätzungen der Agenten, geschätztem Restaufwand und anstehenden Entscheidungen. Meldungen zeigen, von wem sie stammen und wie alt sie sind.",
        noteEli10: "Sehen Sie, wie ein Ziel vorankommt, welche Arbeit noch fehlt und welche Entscheidungen Sie brauchen. Schätzungen und Meldungen zeigen, von wem sie stammen und wie alt sie sind.",
      },
      {
        label: "Arbeitsaufträge",
        icon: "timer",
        group: "work",
        note: "Arbeitsaufträge tragen Obergrenzen für Kosten und Zeit; erledigt heißt: jedes Kriterium erfüllt, Nachweise angehängt und kein Lauf mehr aktiv.",
        noteEli10: "Ein Auftrag für einen Helfer kommt mit Budget und klarer Ziellinie, und mit Nachweis gilt er als erledigt.",
      },
      {
        label: "Prüfungen im Arbeitsablauf",
        icon: "ticket-check",
        group: "work",
        note: "Legen Sie fest, was vor Arbeitsbeginn bereit sein muss und wann eine Aufgabe fertig ist. Agenten müssen diese Prüfungen erfüllen; berechtigte Personen können mit dokumentierter Begründung eine Ausnahme machen.",
        noteEli10: "Legen Sie klare Bedingungen für Arbeitsbeginn und Abschluss fest. Nur eine berechtigte Person darf eine Ausnahme machen und muss den Grund festhalten.",
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
        note: "Sehen Sie Token je Sitzung, Ticket und Epic, mit Preisschätzungen getrennt von der Abo-Nutzung. Der freigegebene Kontingentverlauf zeigt zuletzt gemessenen Verbrauch, Alter und Rücksetzzeiten sowie Verbrauchs- und Auffüllprognosen; alte oder fehlende Daten sind markiert.",
        noteEli10: "Sehen Sie erfassten KI-Verbrauch und Prognosen aus freigegebenen Messungen. Alte oder fehlende Werte bleiben markiert.",
      },
      {
        label: "Auslieferungsübersicht",
        icon: "waypoints",
        group: "ops",
        note: "Sehen Sie Erfolg im ersten Versuch, Entwicklungsrunden, Wartezeit und die Dauer vom ersten Build bis zur Zusammenführung anhand erfasster Schritte. Mit verbundenem GitHub können Sie Auslieferungen verfolgen, nachspielen, Ziele vergleichen und die Live-Bestätigung einer Person getrennt sehen.",
        noteEli10: "Sehen Sie, wie viele Versuche eine Änderung braucht und wo sie wartet. Die Live-Bestätigung einer Person wird getrennt erfasst.",
      },
      {
        label: "Vertrag zuerst",
        icon: "braces",
        group: "ops",
        note: "Eine Datei nach OpenAPI 3.1 mit mehr als 500 Pfaden, bereitgestellt von einer einzigen Binärdatei, die die Web-Anwendung einbettet.",
        noteEli10: "Ein öffentlicher Vertrag beschreibt die HTTP-API, die andere Werkzeuge nutzen können.",
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
        body: "Eine maschinenlesbare Beschreibung von HTTP-API-Endpunkten, sodass andere Werkzeuge sie aufrufen können, ohne zu raten.",
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
    title: "Registrierte Agenten in einer Ansicht.",
    lead:
      "Behalten Sie registrierte Sitzungen, Tickets und Gespräche nach Projekt im Blick. Sehen Sie Leitagenten, ausführende Agenten, Modelle und Denkaufwand sowie Empfangsbestätigungen für Nachrichten im Posteingang.",
    depths: {
      simple:
        "Finden Sie registrierte KI-Helfer nach Projekt: woran sie arbeiten, wem sie berichten, ihre Gespräche und die Steuerungsmöglichkeiten ihrer Sitzung.",
      technical:
        "AgentsView zeigt von aeon-agentd gemeldete Sitzungen. Personen können einen geeigneten Koordinator im eigenen Besitz zum Leitagenten machen; Starts behalten ihre Berechtigungs- und Konfliktprüfungen. Chat-Eingaben und Stoppen hängen von der Sitzung ab.",
    },
    items: [
      {
        icon: "users-round",
        title: "Leitagenten und ausführende Agenten als Baum",
        body: "Sehen Sie registrierte Leitagenten und ausführende Agenten nach Projekt, mit gemeldetem Zustand und Tickets. Sie können einen laufenden Koordinator zum Leitagenten machen.",
      },
      {
        icon: "radio-tower",
        title: "Nachrichten mit Empfangsbestätigung",
        body: "Sehen Sie, wann eine Nachricht gesendet, zugestellt und gelesen wurde. Einige Agenten merken Eingaben für den nächsten Gesprächsschritt vor.",
      },
      {
        icon: "sliders-horizontal",
        title: "Steuern, unterbrechen, stoppen",
        body: "Lenken Sie eine laufende Sitzung um oder stoppen Sie ihren aktuellen Schritt, soweit unterstützt. Claude und Codex übernehmen Eingaben direkt, pi beim nächsten Schritt; einige andere Agenten merken sie für den nächsten Gesprächsschritt vor.",
        caveat: "Vollständige verwaltete Steuerung: Claude unter macOS.",
      },
      {
        icon: "hard-drive",
        title: "Ihre Rechner, Ihre Konten",
        body: "Claude Code, Codex, Cursor und pi starten auf Rechnern, die Sie koppeln, angemeldet mit Ihren eigenen Abos.",
      },
    ],
    screenAlt:
      "Die Sitzungsansicht von AEON im dunklen Modus: Leitagenten mit ihren ausführenden Agenten, mit Ticket, Modell, Denkaufwand und Fortschritt.",
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
          note: "Ohne Werkzeuge auf Apple Silicon für Verifikation und Prüfung in einem Gesprächsschritt. Gewöhnliche Chats können mit vorgemerkten Eingaben weitergehen, wo dies aktiviert ist; der Einsatz als Entwicklungsagent ist noch nicht verifiziert.",
        },
        {
          status: "planned",
          harnesses: ["Gemini", "OpenCode"],
          note: "Adapter verfügbar; für verwaltete Läufe noch nicht verifiziert.",
        },
      ],
    },
    proof: [
      { label: "Arbeitsbereich für Agenten", path: "web/src/views/AgentsView.vue" },
      { label: "Verwaltete Steuerung", path: "internal/agentd/managed_control.go" },
      // INSPR-578: six new proofs for visitor-facing capabilities, without setup gates.
      { label: "Chat-Eingaben", path: "docs/features/chat-live-composer.md" },
      { label: "Ziele und Fortschritt", path: "docs/features/goals-view.md" },
      { label: "Reihenfolge für Ausweichmodelle", path: "docs/features/models-v2-resolver.md" },
      { label: "Tägliche Nutzung", path: "docs/features/agents-daily-plan.md" },
      { label: "Kontingentprognosen", path: "internal/agentaccounts/quota_outlook.go" },
      { label: "Auslieferungsmessungen", path: "docs/features/delivery-page.md" },
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
      { label: "Prüfungen im Arbeitsablauf", path: "internal/workorders/entry_checks.go" },
      { label: "Von Personen bestätigte Projekterstellung", path: "internal/projectdraft/create.go" },
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
    // INSPR-578: round 2 states the preview once and leaves future learning planned.
    learning: "Aus Ergebnissen können Regelvorschläge entstehen, die eine Person freigibt. Routinen sind in Vorschau: Definitionen, Vorlagen und Zuweisungen einrichten, Laufprotokolle ansehen; automatische Läufe sind standardmäßig aus. Bots, die aus früheren Läufen lernen, sind geplant.",
    early: "Früh: Regeländerungen als Pull Requests, sobald ein Betreiber sie aktiviert.",
    screenAlt:
      "Die Agentenregeln in AEON: Regelsätze für Unternehmen und Projekt mit ihren Sperren, ein geöffneter Satz gesperrter Kernregeln, das Byte-Budget und die aus Git an einem festgelegten Commit gelesene Doktrin.",
    proof: [
      { label: "Regeln", path: "internal/rules" },
      { label: "Regelvergleich", path: "internal/rulescompare" },
      { label: "README: Agentenregeln", path: "README.md" },
      { label: "Regelvorschläge aus Ergebnissen", path: "internal/rules/doctrine/analysis_job.go" },
      { label: "Routinen einrichten und begrenzen", path: "docs/features/routines.md" },
      { label: "Routinenprotokolle", path: "docs/features/recurring-work.md" },
    ],
  },
  engine: {
    eyebrow: "Die Arbeitssteuerung",
    title: "So wird die Arbeit gesteuert.",
    lead:
      "Sechs Aufgaben halten die Arbeit in Gang. Vier sind live, zwei sind teilweise live: Jede sagt, wie weit sie ausgeliefert ist.",
    // INSPR-578: explain shadow mode once, scoped to the orchestration still in preview.
    shadow: "Verwaltete Starts und Modellwahl sind live. Warteschlangen, automatische Prüfrunden und Auslieferung laufen als Vorschau im Schattenbetrieb: PAIMOS zeichnet neben Ihrem aktuellen Ablauf auf, was es getan hätte, damit Sie vergleichen können, bevor Sie es je Projekt einschalten.",
    depths: {
      simple:
        "Die Arbeitssteuerung ist der Teil von AEON, der Agenten und Menschen im Takt hält. Einige ihrer Aufgaben funktionieren schon, andere sind noch im Aufbau.",
      technical:
        "Verwaltete Starts setzen Kontoberechtigungen und Tagesgrenzen durch; Models wählt Ausweichmodelle und Denkaufwand. Ziele und Auslieferungsansicht zeigen Fortschritt und erfasste Entwicklungsschritte; die Entscheidungsübersicht im Kopfbereich bündelt Fragen, Freigaben und vorgeschlagene Erkenntnisse, auch am Telefon. Rechnerlastprüfungen sind nach Aktivierung verfügbar und standardmäßig aus; Routinenaktionen für Pull Requests und automatische Warteschlangendurchsetzung bleiben in Vorschau, standardmäßig aus.",
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
        "AEON nutzt ein Programm und eine Datenbank, mit geschützter Audit-Historie.",
      technical:
        "Eine einzelne Go-Binärdatei bettet die Vue-Anwendung ein und stellt den Vertrag nach OpenAPI 3.1 bereit. Postgres 18 mit pgvector hält Mandantendaten unter Sicherheit auf Zeilenebene im FORCE-Modus. Geschützte Audit-Ereignisse speisen Historie und Live-Aktualisierungen per Server-Sent Events; ausgewählte Konto- und Lebenszeichen-Telemetrie kann nach 14 Tagen gelöscht werden. aeon-agentd spricht ein Daemon-Protokoll mit den Adaptern für Agentenprogramme.",
    },
    diagram: {
      clientsLabel: "Menschen und Werkzeuge",
      clients: ["Browser", "CLI", "HTTP-API"],
      serverLabel: "Ein Server",
      server: ["Eine Go-Binärdatei", "Eingebettete Web-Anwendung", "Vertrag nach OpenAPI 3.1"],
      databaseLabel: "Eine Datenbank",
      database: ["Postgres 18", "Sicherheit auf Zeilenebene (FORCE)", "Geschützte Audit-Historie"],
      daemonLabel: "Ihre Rechner",
      daemon: "aeon-agentd",
      harnesses: ["Claude Code", "Codex", "Cursor", "pi", "Grok (ohne Werkzeuge)"],
      live: "Live-Aktualisierungen",
    },
    notes: [
      {
        title: "Geschützte Audit-Historie",
        body: "Die Audit-Historie hält fest, wer was getan hat. Ausgewählte Kontoprüfungen und Statusmeldungen können nach 14 Tagen gelöscht werden.",
        proof: { label: "Schutz der Audit-Historie", path: "internal/db/migrations/1369_telemetry_retention.sql" },
      },
      {
        title: "Mandantentrennung in der Datenbank",
        body: "Sicherheit auf Zeilenebene im FORCE-Modus hält die Mandantendaten auseinander, unterhalb der Anwendung.",
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
        proof: { label: "OpenAPI-Vertrag", path: "api/areas" },
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
        "Vollständige verwaltete Steuerung und Sitzungseinstellungen: Claude unter macOS. Chat-Eingaben und Stoppen hängen von der Sitzung ab.",
        "Claude und Grok auf Apple Silicon unterstützen Verifikation ohne Werkzeuge; Codex und Cursor verbinden sich ohne automatischen Verifikationslauf.",
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
    body: paimosRelease.tag
      ? `Sie können AEON unter AGPL-3.0-only prüfen, selbst betreiben, forken und verändern. Quellcode-Links zeigen auf den Tag von Release ${paimosRelease.number}.`
      : `Sie können AEON unter AGPL-3.0-only prüfen, selbst betreiben, forken und verändern. Quellcode-Links zeigen auf den Quellstand ${sourceRevision}, der die Arbeit für Release ${paimosRelease.number} enthält, bis dessen Release-Tag veröffentlicht ist.`,
    links: [
      { label: "GitHub-Repository", href: repositoryUrl, external: true },
      { label: "Releases auf GitHub", href: paimosReleaseUrl, external: true },
      { label: "Projektlizenz (AGPL-3.0-only)", href: blob("LICENSE"), external: true },
      { label: "Sicherheitsrichtlinie", href: blob("SECURITY.md"), external: true },
      { label: "Agenten-Integration", href: blob("docs/AGENT_INTEGRATION.md"), external: true },
    ],
  },
  faq: [
    {
      question: "Welche Agenten können wir nutzen?",
      answer:
        "Claude Code, Codex, Cursor und pi laufen auf gekoppelten macOS- und Linux-Rechnern mit Ihren Abos; die Abnahme im Live-Betrieb steht noch aus. Grok unterstützt Verifikation und Prüfung ohne Werkzeuge auf Apple Silicon in einem Gesprächsschritt; Adapter für Gemini und OpenCode sind für verwaltete Läufe noch nicht verifiziert. OpenRouter-Modelle sind über pi verfügbar.",
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
