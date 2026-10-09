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
// A trailing slash selects a directory; other destinations select files.
const blob = (path: string) => `${repositoryUrl}/${path.endsWith("/") ? "tree" : "blob"}/${tag}/${path}`;

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
      claim: "Menschen und Agenten schreiben in ein Ereignisprotokoll je Mandant, das nur ergänzt wird.",
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
    title: `AEON in Version ${paimosRelease.number}.`,
    lead: "Auslieferung, unabhängige Prüfung und Gespräche mit verwalteten Agenten, gezeigt in der veröffentlichten Anwendung mit erfundenen Projektdaten.",
    note: `Echter Bildschirm, Beispieldaten · Version ${paimosRelease.number}`,
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
        body: "Ein Gespräch mit dem Leitagenten des Releases: ein Codeblock mit Kopierfunktion, eine Lesebestätigung für Ihre Nachricht, eine Nachricht in der Warteschlange für nach diesem Arbeitsschritt und Stoppen mit Esc.",
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
        body: "Ein Standardmodell für alle Arbeiten, mit Ausnahmen für Oberflächengestaltung (gesperrt), Dokumentation und Texte sowie Konzepte. Prüfungen gehen immer an eine andere Modellfamilie. Das nächste Modell für die Entwicklung des Backends und das zugehörige Prüfmodell sind angegeben.",
        alt: "PAIMOS-Modelleinstellungen mit einem Standardmodell, Ausnahmen nach Aufgabe und unabhängigen Prüfungen.",
      },
      {
        id: "usage",
        tab: "Nutzung",
        title: "Nutzung",
        body: "Ein gemeinsames Wochenkontingent mit 42 % Rest und Rücksetzzeit, die zwei angemeldeten Rechner und die Wahl zwischen vorsichtiger Nutzung (ausgewählt), ausgewogener Nutzung oder voller Ausschöpfung, mit einer Untergrenze von 10 %.",
        alt: "PAIMOS-Kontonutzung mit vorsichtiger Nutzung, Grenzen, verbleibender Kapazität und Rücksetzzeiten.",
      },
    ],
  },
  specs: {
    eyebrow: "Eckdaten",
    title: "Was Sie bekommen.",
    lead: "Neunzehn veröffentlichte Fähigkeiten. Sechs der Bilder sind Illustrationen und als solche gekennzeichnet. Fahren Sie über eine Karte oder tippen Sie darauf, um die Details zu sehen.",
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
        note: "Leitagenten und ausführende Agenten als Baum, aktueller Zustand, Modell und Denkaufwand. Sprechen Sie mit verwalteten Agenten in einem Chat, der Gesendet, Zugestellt und Gelesen zeigt, Code gut lesbar darstellt und eine Antwort mit Esc stoppt.",
        noteEli10: "Sehen Sie, was jeder Helfer tut, und sprechen Sie mit verwalteten Helfern. Sie sehen, ob Ihre Nachricht angekommen oder gelesen ist, können ihren Code lesen und eine Antwort mit Esc stoppen.",
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
        note: "PAIMOS sieht die Grenzen und Rücksetzzeiten jedes Abos, lässt Sie vorsichtige oder volle Nutzung wählen und übernimmt neuere Versionen Ihrer Modelle automatisch. Nutzungsdaten werden ausgelesen, wo Sie dies aktiviert haben; automatische Modellaktualisierungen müssen Sie ebenfalls aktivieren. Wählen Sie ein Standardmodell und wenige Ausnahmen.",
        noteEli10: "Sehen Sie, wie viel jedes KI-Konto noch übrig hat und wann es wieder aufgefüllt wird. Wählen Sie vorsichtige oder volle Nutzung, ein übliches Modell und wenige Ausnahmen. Aktivieren Sie das Auslesen der Nutzung und automatische Modellaktualisierungen, wenn Sie möchten.",
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
        note: "Sicherheit auf Zeilenebene im FORCE-Modus trennt in Postgres die Mandantendaten, unterhalb der Anwendung.",
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
        note: "Token je Sitzung, Ticket und Epic, mit Schätzungen zu Listenpreisen getrennt von der Abo-Nutzung. Bei aktiviertem Auslesen sehen Sie gemeldete Nutzung, Grenzen und Rücksetzzeiten je Konto, auch zwischen Läufen.",
        noteEli10: "Sehen Sie, wie viel KI jede Aufgabe verbraucht hat und, bei aktiviertem Auslesen, wie viel jedes Konto noch übrig hat und wann es wieder aufgefüllt wird. Schätzungen bleiben klar gekennzeichnet.",
      },
      {
        label: "Auslieferungsübersicht",
        icon: "waypoints",
        group: "ops",
        note: "Sehen Sie je Projekt, wie schnell Änderungen live gehen; verfolgen Sie eine Auslieferung, spielen Sie eine frühere nach oder vergleichen Sie sie mit einem Ziel. Grundlage sind die vom Projekt gemeldeten Daten: automatische Prüfungen und Zusammenführungswarteschlange über GitHub, Auslieferungsschritte, wenn sie gemeldet werden.",
        noteEli10: "Sehen Sie, wie lange Änderungen bis zum Live-Betrieb brauchen. Verfolgen Sie eine Auslieferung, spielen Sie eine frühere nach oder vergleichen Sie sie mit einem Ziel, anhand der Schritte, die Ihr Projekt meldet.",
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
    // INSPR-556: AEON-378/444 live proposals; AEON-680/693 planned routines.
    learning: "Ergebnisse werden bereits zu Regelvorschlägen, die eine Person freigibt (live). Als Nächstes folgen Routinen, die Agenten nach Zeitplan ausführen und aus früheren Läufen lernen (geplant).",
    early: "Früh: Regeländerungen als Pull Requests, sobald ein Betreiber sie aktiviert.",
    screenAlt:
      "Die Agentenregeln in AEON: Regelsätze für Unternehmen und Projekt mit ihren Sperren, ein geöffneter Satz gesperrter Kernregeln, das Byte-Budget und die aus Git an einem festgelegten Commit gelesene Doktrin.",
    proof: [
      { label: "Regeln", path: "internal/rules" },
      { label: "Regelvergleich", path: "internal/rulescompare" },
      { label: "README: Agentenregeln", path: "README.md" },
      { label: "Regelvorschläge aus Ergebnissen", path: "internal/rules/doctrine/analysis_job.go" },
    ],
  },
  engine: {
    eyebrow: "Die Arbeitssteuerung",
    title: "So wird die Arbeit gesteuert.",
    lead:
      "Sechs Aufgaben halten die Arbeit in Gang. Vier sind live, zwei sind teilweise live: Jede sagt, wie weit sie ausgeliefert ist.",
    shadow: "Bevor PAIMOS Starts, Warteschlangen, Modellwahl, Prüfungen oder Auslieferung übernimmt, zeichnet es neben Ihrem aktuellen Ablauf auf, was es getan hätte. So vergleichen Sie, bevor Sie es je Projekt einschalten. Dieser Schattenbetrieb ist eine Vorschau.",
    depths: {
      simple:
        "Die Arbeitssteuerung ist der Teil von AEON, der Agenten und Menschen im Takt hält. Einige ihrer Aufgaben funktionieren schon, andere sind noch im Aufbau.",
      technical:
        "Heute live: Lieferstatus je Ticket und Fristwarnungen mit verbundenem GitHub; Zulassungsregler, Kontogrenzen, Rücksetzzeiten und vorsichtige oder volle Nutzung; ein Standardmodell und wenige Ausnahmen, mit Prüfung durch eine andere Modellfamilie als Unternehmens- oder Projekteinstellung; die Merge-Prüfung; die Entscheidungsübersicht („Decision Desk“) mit dauerhaftem Posteingang; sowie Ereignisse mit Zuordnung der Arbeit, Ergebnissen und Berichten zu Sitzungen, Token und Kosten. Die Entscheidungsübersicht („Decision Desk“) ersetzt den Bereich Braucht Sie bei den Agenten noch nicht. Starts, Warteschlangen, Modellwahl, automatische Prüfrunden und Auslieferung laufen im Schattenbetrieb; Drosselung nach Rechnerlast ist geplant.",
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
        "Eine einzelne Go-Binärdatei bettet die Vue-Anwendung ein und stellt den Vertrag nach OpenAPI 3.1 bereit. Postgres 18 mit pgvector hält Mandantendaten unter Sicherheit auf Zeilenebene im FORCE-Modus, eine Ereignistabelle, die nur ergänzt wird, speist die Historie und Live-Aktualisierungen per Server-Sent Events, und aeon-agentd spricht ein Daemon-Protokoll mit den Adaptern für Agentenprogramme.",
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
        "Steuerung und Sitzungseinstellungen sind für Claude unter macOS qualifiziert; Cursor unterstützt nur Unterbrechen.",
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
