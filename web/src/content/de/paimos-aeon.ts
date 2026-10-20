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
      technical: `Release ${paimosRelease.number}${paimosRelease.codename ? ` „${paimosRelease.codename}“` : ""}: eine Go-Binärdatei mit eingebetteter Vue-Anwendung, Postgres 18 unter Sicherheit auf Zeilenebene im FORCE-Modus, eine geschützte Prüfhistorie je Mandant, ein Vertrag nach OpenAPI 3.1 und aeon-agentd, das Claude Code, Codex, Cursor und pi auf gekoppelten Rechnern startet. Ausgewählte Konto- und Lebenszeichen-Telemetrie kann nach 14 Tagen gelöscht werden.`,
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
      claim: "Menschen und Agenten schreiben in ein Ereignisprotokoll je Mandant. Die Prüfhistorie ist geschützt; ausgewählte Konto- und Lebenszeichen-Telemetrie kann nach 14 Tagen gelöscht werden.",
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
    lead: "Auslieferung, unabhängige Prüfung und Gespräche mit verwalteten Agenten, gezeigt in vorhandenen Aufnahmen mit erfundenen Projektdaten.",
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
        body: "Die Demo aus Release 128 zeigt ein Gespräch mit dem Leitagenten: einen Codeblock mit Kopierfunktion, eine Lesebestätigung, eine Nachricht für nach diesem Arbeitsschritt und Stoppen mit Esc. Das aktuelle Live-Streaming von Antworten muss je Installation aktiviert werden und ist standardmäßig aus; Stoppen braucht einen unterbrechbaren aktiven Schritt.",
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
        body: "Die Aufnahme aus Release 128 zeigt ein Standardmodell und Ausnahmen für Oberflächengestaltung (gesperrt), Dokumentation und Texte sowie Konzepte. Die Prüfung durch eine andere Modellfamilie ist ausgewählt; das nächste Entwicklungsmodell für das Backend und sein Prüfmodell sind angegeben.",
        alt: "PAIMOS-Modelleinstellungen mit einem Standardmodell, Ausnahmen nach Aufgabe und unabhängigen Prüfungen.",
      },
      {
        id: "usage",
        tab: "Nutzung",
        title: "Nutzung",
        body: "Die Aufnahme aus Release 128 zeigt ein gemeinsames Wochenkontingent mit 42 % Rest und Rücksetzzeit, zwei angemeldete Rechner und die früheren Optionen für vorsichtige, ausgewogene oder volle Nutzung mit einer Untergrenze von 10 %.",
        alt: "PAIMOS-Kontonutzung mit vorsichtiger Nutzung, Grenzen, verbleibender Kapazität und Rücksetzzeiten.",
      },
    ],
  },
  specs: {
    eyebrow: "Eckdaten",
    title: "Was Sie bekommen.",
    // INSPR-578: two new cards; existing images keep their provenance.
    lead: "Einundzwanzig veröffentlichte Fähigkeiten. Sechs der Bilder sind Illustrationen und als solche gekennzeichnet. Fahren Sie über eine Karte oder tippen Sie darauf, um die Details zu sehen.",
    leadEli10: "Dieselben einundzwanzig, in einfachen Worten.",
    items: [
      {
        label: "Agenten zuerst",
        icon: "workflow",
        group: "ai",
        note: "Claude Code, Codex, Cursor und pi starten unter Paimos in denselben Projekten wie Personen, jeder mit eigenem Schlüssel und eigenen Scopes. Grok läuft ohne Werkzeuge auf Apple Silicon. Adapter für Gemini und OpenCode sind verfügbar; die Betriebsbereitschaft für verwaltete Läufe und die Verifikation sind noch nicht qualifiziert.",
        noteEli10: "KI-Helfer mehrerer Hersteller arbeiten in denselben Projekten wie Ihre Leute, und jeder trägt sein eigenes Kennzeichen. Einige kommen vorerst mit weniger Fähigkeiten dazu.",
      },
      {
        label: "Kontrollraum",
        icon: "panels-top-left",
        group: "ai",
        note: "Registrierte Sitzungen sind nach Projekt gruppiert und verbinden Zustand, Tickets, Modell, Denkaufwand und gespeicherte Gespräche. Nachrichten im Posteingang zeigen Gesendet, Zugestellt und Gelesen. Live-Streaming von Antworten muss je Installation aktiviert werden und ist standardmäßig aus; Esc/Stoppen braucht einen unterbrechbaren aktiven Schritt.",
        noteEli10: "Finden Sie registrierte Helfer und ihre Gespräche nach Projekt. Empfangsbestätigungen zeigen Zustellung und Lesen. Live-Antworten brauchen eine Installationseinstellung, die standardmäßig aus ist. Stoppen ist für aktive Schritte verfügbar, die sich unterbrechen lassen.",
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
        note: "Legen Sie Kontoberechtigungen und ein Tagestempo in Prozentpunkten oder volle Nutzung fest, mit Boost für heute. Wählen Sie eine Reihenfolge für Ausweichmodelle, den Denkaufwand je Schritt und Einstellungen für bestimmte Situationen; Wartegründe bleiben sichtbar. Konten, Rechner und Kapazität haben getrennte Einstellungen. Automatische Modellaktualisierungen bleiben optional und müssen aktiviert werden.",
        noteEli10: "Wählen Sie, welche Konten ein Projekt nutzen darf, wie viel es täglich nutzt und welche Modelle es der Reihe nach versucht. Legen Sie den Denkaufwand fest und sehen Sie, warum Arbeit warten muss. Neuere Modellversionen werden nur übernommen, wenn Sie dies aktivieren.",
      },
      {
        label: "Verwaltete Regeln",
        icon: "scroll-text",
        group: "ai",
        note: "Regeln bauen vom Unternehmen bis zur Aufgabe aufeinander auf und werden als unveränderliche Versionen mit gesperrten Untergrenzen und Größenbudgets veröffentlicht. Die Doktrin wird bei einem festgelegten Commit aus Git gelesen; Prüfungen erkennen Abweichungen.",
        noteEli10: "Hausregeln bauen vom Unternehmen bis zur Aufgabe aufeinander auf. Wichtige Regeln bleiben gesperrt, Größenlimits halten sie lesbar, und eine Prüfung meldet, wenn ein Helfer eine andere Kopie hat.",
      },
      {
        label: "Prüfung durch andere Modellfamilie",
        icon: "git-compare-arrows",
        group: "ai",
        note: "Wählen Sie je Unternehmen oder Projekt, dass jede Änderung eine Prüfung durch eine andere Modellfamilie braucht; PAIMOS prüft den Urheber anhand seiner eigenen Aufzeichnungen und meldet Zusammenführungen, die die Warteschlange oder eine verifizierte Prüfung übersprungen haben.",
        noteEli10: "Wählen Sie, dass jede Änderung eine Prüfung durch einen Helfer eines anderen KI-Herstellers braucht. Mit verbundenem GitHub prüft PAIMOS, wer sie geschrieben hat, und meldet fehlende Prüfungen oder übersprungene Warteschlangen. Selbstständige Prüfungen und Korrekturen sind noch eine Vorschau.",
      },
      {
        label: "Geschützte Prüfhistorie",
        icon: "file-check-2",
        group: "security",
        note: "Ein Datenbank-Trigger schützt gewöhnliche Prüfereignisse vor Änderungen und Löschungen. Eine eng begrenzte Dienstberechtigung kann Konto-Prüfereignisse und dafür vorgesehene Lebenszeichen-Telemetrie nach 14 Tagen löschen.",
        noteEli10: "Die Datenbank schützt die Prüfhistorie. Ausgewählte Kontoprüfungen und Lebenszeichen können nach 14 Tagen gelöscht werden.",
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
        note: "Ziele und Epics zeigen den Fortschrittsverlauf, von Agenten gesetzte Ankunftszeiten, den geschätzten Restaufwand und anstehende Entscheidungen. Statusnotizen und die Aktualität der Ankunftszeiten zeigen, wer was wann gemeldet hat.",
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
        note: "Legen Sie Prüfungen für Arbeitsbeginn und Abschluss fest, die Agenten erfüllen müssen. Berechtigte Personen können mit dokumentierter Begründung übersteuern. Projektadministratoren entscheiden, ob kopierte Projektregeln spätere Änderungen der Vorgaben des Arbeitsbereichs übernehmen.",
        noteEli10: "Legen Sie fest, was vor Arbeitsbeginn bereit sein muss und wann eine Aufgabe fertig ist. Eine berechtigte Person kann eine Ausnahme machen und muss den Grund festhalten. Änderungen an kopierten Projektprüfungen warten auf die Entscheidung eines Administrators.",
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
        note: "Token je Sitzung, Ticket und Epic halten Listenpreisschätzungen von der Abo-Nutzung getrennt. Unterstützte, freigegebene Kontingentmessungen zeigen den zuletzt gemessenen Verbrauch, Alter und Rücksetzzeiten. Der Messverlauf unterstützt Verbrauchs- und Auffüllprognosen; alte oder fehlende Messungen sind markiert. Starts für Kontingentmessungen im Leerlauf sind für die dokumentierten Claude/Codex-Versionen noch nicht qualifiziert.",
        noteEli10: "Sehen Sie den erfassten KI-Verbrauch und Prognosen aus freigegebenen Messungen. Die Ansicht markiert alte oder fehlende Werte und zeigt Rücksetzzeiten. Frische Messungen ungenutzter Claude/Codex-Konten brauchen noch die Qualifikation.",
      },
      {
        label: "Auslieferungsübersicht",
        icon: "waypoints",
        group: "ops",
        note: "Messen Sie Erfolg im ersten Versuch, Entwicklungsrunden, Wartezeit und die Dauer vom ersten Build bis zur Zusammenführung anhand erfasster Schritte. Verfolgen Sie gemeldete Auslieferungsschritte, spielen Sie sie nach und vergleichen Sie Ziele. Eine spätere Live-Bestätigung wird getrennt erfasst. CI- und Warteschlangendaten brauchen verbundenes GitHub.",
        noteEli10: "Sehen Sie, wie viele Versuche eine Änderung gebraucht hat und wo sie warten musste, anhand der erfassten Schritte. Eine Zusammenführung und die spätere Live-Bestätigung einer Person sind getrennte Fakten.",
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
      "Sitzungen nach Projekt, Leitagenten und ausführende Agenten als Baum, Tickets, Zustand, Modell, Denkaufwand und gespeicherte Gespräche. Nachrichten im Posteingang zeigen, wann sie gesendet, zugestellt und gelesen wurden.",
    depths: {
      simple:
        "Finden Sie registrierte KI-Helfer nach Projekt: woran sie arbeiten, wem sie berichten, ihre Gespräche und die Steuerungsmöglichkeiten ihrer Sitzung.",
      technical:
        "AgentsView zeigt über das Daemon-Protokoll gemeldete Sitzungen. Ein geeigneter laufender Koordinator im eigenen Besitz kann als Leitagent übernommen werden. Von Personen angeforderte Starts in Projekten mit Leitagent behalten Konfliktprüfungen bei. Die Steuerung folgt den gemeldeten Fähigkeiten der Sitzung; gespeicherte Gespräche und Empfangsbestätigungen sind vom optionalen Live-Streaming getrennt, das standardmäßig aus ist.",
    },
    items: [
      {
        icon: "users-round",
        title: "Leitagenten und ausführende Agenten als Baum",
        body: "Registrierte Leitagenten und ihre ausführenden Agenten, nach Projekt mit gemeldetem Zustand und verknüpften Tickets. Geeignete laufende Koordinatoren im eigenen Besitz können als Leitagent übernommen werden.",
      },
      {
        icon: "radio-tower",
        title: "Nachrichten mit Empfangsbestätigung",
        body: "Gesendet, Zugestellt und Gelesen verfolgen die Zustellung im Posteingang. Unterstützte Adapter für gewöhnliche Chats können Eingaben bis zum Ende eines Arbeitsschritts vormerken, auch bei Cursor, wenn die Sitzung dies meldet. Live-Streaming von Antworten muss je Installation aktiviert werden und ist standardmäßig aus.",
      },
      {
        icon: "sliders-horizontal",
        title: "Steuern, unterbrechen, stoppen",
        body: "Chat-Eingaben richten sich nach den Sitzungsfähigkeiten: native Steuerung bei Claude/Codex, Eingaben zum nächsten Agentenschritt bei pi und vorgemerkte ACP-Eingaben. Esc/Stoppen braucht einen unterbrechbaren aktiven Schritt; eine Steuereingabe kann den nächsten Schritt einer pausierenden verwalteten Sitzung starten.",
        caveat: "Eingeschränkte verwaltete Steuerung und Sitzungseinstellungen: Claude unter macOS. Chat-Eingaben haben eigene Fähigkeitsprüfungen.",
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
          note: "Läuft ohne Werkzeuge auf Apple Silicon. Verifikation und Prüfung bleiben auf einen Gesprächsschritt begrenzt; gewöhnliche Chats können mit vorgemerkten Eingaben fortgesetzt werden, wo dies aktiviert ist. Der allgemeine Einsatz als Entwicklungsagent bleibt unqualifiziert.",
        },
        {
          status: "planned",
          harnesses: ["Gemini", "OpenCode"],
          note: "Adapter verfügbar; die Betriebsbereitschaft für verwaltete Läufe und die Verifikation sind noch nicht qualifiziert.",
        },
      ],
    },
    proof: [
      { label: "Arbeitsbereich für Agenten", path: "web/src/views/AgentsView.vue" },
      { label: "Verwaltete Steuerung", path: "internal/agentd/managed_control.go" },
      { label: "Chat-Fähigkeiten", path: "internal/agentd/chat_stream.go" },
      { label: "Vorgaben zur Chat-Aktivierung", path: "internal/config/config.go" },
      { label: "Laufenden Leitagenten übernehmen", path: "docs/features/adopt-running-lead.md" },
      { label: "Von Personen angeforderte Läufe", path: "internal/agentruns/runs.go" },
      { label: "Ziele und Fortschritt", path: "docs/features/goals-view.md" },
      { label: "Reihenfolge für Ausweichmodelle", path: "docs/features/models-v2-resolver.md" },
      { label: "Tagestempo", path: "web/src/components/settings/CapacitySection.vue" },
      { label: "Kontingentverlauf", path: "docs/features/account-quota-history.md" },
      { label: "Kontingentprognosen", path: "internal/agentaccounts/quota_outlook.go" },
      { label: "Auslieferungsmessungen", path: "internal/delivery/building.go" },
      { label: "Live-Bestätigung", path: "internal/delivery/deploy.go" },
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
      { label: "Entscheidungen zu Prüfregeln", path: "docs/features/workspace-definition-decisions.md" },
      { label: "Eingerichtete Projektübernahme", path: "internal/projectdraft/module.go" },
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
    // INSPR-578: preview setup is available; execution and learning stay separate.
    learning: "Regelvorschläge aus Ergebnissen sind live und brauchen die Freigabe einer Person. Routinen-Vorschau: Definitionen, Vorlagen, Zuweisungen und Laufprotokolle sind verfügbar. Automatische Ausführung bleibt bis zur Qualifikation und Zustimmung einer Person aus. Lernen aus früheren Läufen ist geplant.",
    early: "Früh: Regeländerungen als Pull Requests, sobald ein Betreiber sie aktiviert.",
    screenAlt:
      "Die Agentenregeln in AEON: Regelsätze für Unternehmen und Projekt mit ihren Sperren, ein geöffneter Satz gesperrter Kernregeln, das Byte-Budget und die aus Git an einem festgelegten Commit gelesene Doktrin.",
    proof: [
      { label: "Regeln", path: "internal/rules" },
      { label: "Regelvergleich", path: "internal/rulescompare" },
      { label: "README: Agentenregeln", path: "README.md" },
      { label: "Regelvorschläge aus Ergebnissen", path: "internal/rules/doctrine/analysis_job.go" },
      { label: "Routinen einrichten und begrenzen", path: "docs/features/routines.md" },
      { label: "Voraussetzungen für Routinenläufe", path: "docs/features/routine-dispatch.md" },
    ],
  },
  engine: {
    eyebrow: "Die Arbeitssteuerung",
    title: "So wird die Arbeit gesteuert.",
    lead:
      "Sechs Aufgaben halten die Arbeit in Gang. Vier sind live, zwei sind teilweise live: Jede sagt, wie weit sie ausgeliefert ist.",
    shadow: "Verwaltete Starts und die Modellwahl über Models sind verfügbar. Die übergreifende Zulassungssteuerung sowie automatische Prüf- und Auslieferungsabläufe bleiben Vorschau im Schattenbetrieb: Sie zeichnen vorgeschlagene Entscheidungen neben Ihrem Ablauf auf. Auslieferung im Schattenbetrieb führt weder zusammen noch stellt sie bereit.",
    depths: {
      simple:
        "Die Arbeitssteuerung ist der Teil von AEON, der Agenten und Menschen im Takt hält. Einige ihrer Aufgaben funktionieren schon, andere sind noch im Aufbau.",
      technical:
        "Verfügbar: verwaltete Starts mit Zulassungsgrenzen; Kontoberechtigungen, Tagestempo und Reihenfolgen für Ausweichmodelle; Zielfortschritt, Aktualität der Ankunftszeiten und Messungen vom ersten Build bis zur Zusammenführung; die Merge-Prüfung; sowie die Entscheidungsübersicht („Decision Desk“) im Kopfbereich für Fragen, Freigaben, erneute Bestätigungen, vorbereitete Lernergebnisse und Entscheidungen zu Prüfregeln, auch am Telefon. Die frühere Entscheidungswarteschlange bei den Agenten ist ersetzt; Anmeldung und Ticket-Triage bleiben getrennt. Rechnerlastprüfungen für neue Starts sind nach Aktivierung verfügbar und standardmäßig aus. Routinenaktionen für Pull Requests und die Zulassungswarteschlange bleiben eine Vorschau mit Freigabevoraussetzungen; automatische Warteschlangendurchsetzung ist standardmäßig aus.",
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
        "Unter der Haube nutzt AEON ein Programm und eine Datenbank, mit geschützter Prüfhistorie und kürzerer Aufbewahrung ausgewählter Telemetrie.",
      technical:
        "Eine einzelne Go-Binärdatei bettet die Vue-Anwendung ein und stellt den Vertrag nach OpenAPI 3.1 bereit. Postgres 18 mit pgvector hält Mandantendaten unter Sicherheit auf Zeilenebene im FORCE-Modus. Geschützte Prüfereignisse speisen Historie und Live-Aktualisierungen per Server-Sent Events; ausgewählte Konto- und Lebenszeichen-Telemetrie kann nach 14 Tagen gelöscht werden. aeon-agentd spricht ein Daemon-Protokoll mit den Adaptern für Agentenprogramme.",
    },
    diagram: {
      clientsLabel: "Menschen und Werkzeuge",
      clients: ["Browser", "CLI", "HTTP-API"],
      serverLabel: "Ein Server",
      server: ["Eine Go-Binärdatei", "Eingebettete Web-Anwendung", "Vertrag nach OpenAPI 3.1"],
      databaseLabel: "Eine Datenbank",
      database: ["Postgres 18", "Sicherheit auf Zeilenebene (FORCE)", "Geschützte Prüfhistorie"],
      daemonLabel: "Ihre Rechner",
      daemon: "aeon-agentd",
      harnesses: ["Claude Code", "Codex", "Cursor", "pi", "Grok (ohne Werkzeuge)"],
      live: "Live-Aktualisierungen",
    },
    notes: [
      {
        title: "Geschützte Historie, begrenzte Telemetrie",
        body: "Gewöhnliche Prüfereignisse bleiben unveränderlich. Eine eng begrenzte Dienstberechtigung kann Konto-Prüfereignisse und dafür vorgesehene Lebenszeichen-Telemetrie nach 14 Tagen löschen; Historie und Live-Aktualisierungen lesen weiter aus dem Ereignisprotokoll.",
        proof: { label: "Prüfschutz und Telemetrieaufbewahrung", path: "internal/db/migrations/1369_telemetry_retention.sql" },
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
        "Eingeschränkte verwaltete Steuerung und Sitzungseinstellungen sind für Claude unter macOS qualifiziert. Chat-Eingaben folgen den gemeldeten Fähigkeiten: native Steuerung bei Claude/Codex, Eingaben zum nächsten Agentenschritt bei pi und vorgemerkte ACP-Eingaben. Stoppen braucht einen unterbrechbaren aktiven Schritt.",
        "Claude und Grok auf Apple Silicon haben eine qualifizierte Verifikation ohne Werkzeuge; Codex und Cursor verbinden sich ohne automatischen Verifikationslauf.",
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
        "Claude Code, Codex, Cursor und pi starten unter Paimos auf macOS und Linux, einschließlich OpenRouter-Modellen über pi. Die Abnahme im Live-Betrieb steht noch aus. Grok läuft ohne Werkzeuge auf Apple Silicon; Verifikation und Prüfung bleiben auf einen Gesprächsschritt begrenzt, gewöhnliche Chats können mit vorgemerkten Eingaben weitergehen, wo dies aktiviert ist. Adapter für Gemini und OpenCode sind verfügbar; die Betriebsbereitschaft für verwaltete Läufe und die Verifikation sind noch nicht qualifiziert. Agenten laufen über aeon-agentd auf gekoppelten Rechnern mit Ihren eigenen Abos.",
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
