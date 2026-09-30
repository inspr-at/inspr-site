import { siteUrls } from "../urls";
import type { AeonContent } from "../types";

// German edition of the PAIMOS AEON page, served at
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
    version: tag,
    publishedAt: "2026-09-30T12:51:40Z",
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
        "Ihre Mitarbeitenden und Ihre KI-Agenten arbeiten an denselben Projekten. Die Agenten laufen auf Ihren eigenen Rechnern und Konten, Sie sehen, was jeder tut, und geschützte Schritte warten auf die Entscheidung einer Person.",
      technical:
        "Hinged Hangar: eine Go-Binärdatei mit eingebetteter Vue-Anwendung, Postgres 18 unter Sicherheit auf Zeilenebene im FORCE-Modus, ein Append-only-Ereignisprotokoll je Mandant, ein Vertrag nach OpenAPI 3.1 und aeon-agentd, das fünf Harness-Adapter auf gekoppelten Rechnern steuert.",
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
    { value: "1", label: "Ereignisprotokoll je Mandant", depthMin: "standard" },
    { value: "300+", label: "API-Pfade, ein Vertrag nach OpenAPI 3.1", depthMin: "standard" },
  ],
  theatre: {
    eyebrow: "Live-Instanz",
    title: "AEON, gebaut mit AEON.",
    lead:
      "Diese Bildschirme stammen von aeon.barta.cm, wo das INSPR-Team AEON mit seinen eigenen Agenten plant, betreibt und ausliefert.",
    depths: {
      simple: "So sieht AEON im Alltag aus: Das INSPR-Team plant, betreibt und liefert AEON selbst damit aus, gemeinsam mit seinen eigenen Agenten.",
      technical: "Aufgenommen in der Live-Instanz: die Vue-3-Anwendung, eingebettet in die Go-Binärdatei. Tickets und Wissenseinträge sind Knoten eines Baums, gezeichnet aus GET /api/tickets/graph und GET /api/knowledge/graph; die Nutzung liegt unter /agents/usage.",
    },
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
    leadEli10: "Zwanzig Fähigkeiten, heute verfügbar. Öffnen Sie eine Karte, um zu sehen, was jede für Sie leistet.",
    leadHow: "Zwanzig Fähigkeiten in Hinged Hangar. Öffnen Sie eine Karte für den Mechanismus dahinter.",
    items: [
      {
        label: "Agenten zuerst",
        icon: "workflow",
        group: "ai",
        note: "Claude, Codex, Cursor, Grok und pi laufen als Harness-Sitzungen in denselben Projekten wie Personen, jede mit eigenem Schlüssel und eigenen Scopes.",
        noteEli10: "KI-Agenten mehrerer Anbieter arbeiten in Ihren Projekten neben Ihren Mitarbeitenden, jeder unter seiner eigenen Identität.",
        noteHow: "Harness-Sitzungen registrieren sich unter POST /api/projects/{id}/harness-sessions mit einem Worker-Lease. Unterstützte Harnesses: codex, claude, pi, cursor und grok, jedes mit eigenem, abgegrenztem Schlüssel.",
      },
      {
        label: "Kontrollraum",
        icon: "panels-top-left",
        group: "ai",
        note: "Leitagenten und Worker als Baum, Live-Zustand, Modell und Denkaufwand sowie Nachrichten mit Gesendet, Zugestellt und Gelesen.",
        noteEli10: "Ein Bildschirm zeigt jeden Agenten: woran er arbeitet, wem er berichtet und ob er Ihre Nachricht gelesen hat.",
        noteHow: "/agents listet jede Sitzung. Heartbeats tragen Phase, Aktivität, Notiz, Fortschritt von 0 bis 100 sowie Bereit- und Live-ETAs; nach dem Live-Fenster von 2 Minuten zeigt eine stumme, nicht verwaltete Sitzung Lost contact.",
      },
      {
        label: "Ihre Rechner",
        icon: "hard-drive",
        group: "ops",
        note: "aeon-agentd koppelt einen Rechner über einen Code, den eine Person im Browser bestätigt; die Agenten laufen mit Ihren eigenen Abos.",
        noteEli10: "Die Agenten laufen auf Ihren eigenen Rechnern und KI-Abos. Ein neuer Rechner kommt erst dazu, wenn eine Person zustimmt.",
        noteHow: "aeon-agentd pair --url <origin> zeigt einen 9-stelligen Code, der nach 10 Minuten abläuft. Eine Person mit account.manage gibt ihn frei; der Daemon erzeugt seine Zugangsdaten lokal, und der Server speichert nur Hashes.",
      },
      {
        label: "Abgegrenzte Schlüssel",
        icon: "key-round",
        group: "security",
        note: "Ein Agentenschlüssel ist eine Obergrenze: Jede Anfrage muss einem seiner Scopes entsprechen oder ihn verfeinern.",
        noteEli10: "Jeder Agent erhält einen Schlüssel mit festen Grenzen und kann nie darüber hinausgreifen.",
        noteHow: "Die wirksame Berechtigung ist die Schnittmenge aus den Scopes des Schlüssels und der Rolle im Workspace. Eine leere Scope-Liste gewährt nichts, und eine Route ohne Zuordnung antwortet mit 403.",
      },
      {
        label: "Freigabe durch Personen",
        icon: "user-round-check",
        group: "security",
        note: "Geschützte Schritte warten auf eine gültige Freigabe, und die Datenbank nimmt eine Entscheidung nur von einer Person an.",
        noteEli10: "Wichtige Schritte warten auf eine Person. Nur Menschen können sie freigeben, und das System selbst setzt das durch.",
        noteHow: "Agenten schlagen nur vor. approvals.decide ist für Agentenschlüssel nie vergebbar, und die Datenbank weist die Entscheidung eines Agenten zurück.",
      },
      {
        label: "Kapazitätssteuerung",
        icon: "route",
        group: "ai",
        note: "AEON lernt Laufkosten und Anbieterlimits, hält einen Anteil für Sie frei und gibt Arbeit an das nächste Konto weiter, wenn ein Anbieter eines stoppt.",
        noteEli10: "Erreicht ein KI-Konto sein Limit, geht die Arbeit beim nächsten weiter, und ein Teil der Kapazität bleibt für Sie reserviert.",
        noteHow: "AEON lernt Laufkosten und Anbieterlimits, hält einen Anteil für Sie frei und gibt Arbeit an das nächste Konto weiter, wenn ein Anbieter eines stoppt.",
      },
      {
        label: "Verwaltete Regeln",
        icon: "scroll-text",
        group: "ai",
        note: "Regeln schichten sich vom Unternehmen bis zur Aufgabe, werden als unveränderliche Versionen veröffentlicht, behalten gesperrte Untergrenzen und teilen sich ein gemeinsames Byte-Budget.",
        noteEli10: "Ihre Regeln für Agenten werden einmal geschrieben und versioniert, und die entscheidenden bleiben gesperrt.",
        noteHow: "Die Rangfolge lautet Unternehmen, Projekt, Person, Agentenrolle, benannter Agent, Aufgabe. Der höchste Treffer gewinnt, ein Gleichstand führt zur Ablehnung, und eine tiefere Ebene ersetzt nie eine gesperrte Regel. Regelsätze werden unter einer Kalenderversion veröffentlicht und lassen sich wiederherstellen.",
      },
      {
        label: "Doktrin aus Git",
        icon: "git-branch",
        group: "ops",
        note: "Die Doktrin wird bei einem festgelegten Commit aus Git gelesen, und aeon rules compare vergleicht die Anweisungen, die ein Harness geladen hat, mit den zusammengeführten Regeln.",
        noteEli10: "Das Regelwerk liegt in der Versionsverwaltung, und AEON zeigt, wenn ein Agent mit einer veralteten Kopie arbeitet.",
        noteHow: "Die Doktrin wird aus Git an einem gepinnten Commit gelesen. Ein Harness erhält die zusammengeführten Regeln über paimos session start --rules-receive, das eine vom Worker gemeldete Quittung schickt: ein Nachweis der Zustellung, nicht der Befolgung. aeon rules compare vergleicht die geladenen Anweisungen mit den zusammengeführten Regeln.",
      },
      {
        label: "Append-only-Protokoll",
        icon: "file-check-2",
        group: "security",
        note: "Jede Änderung wird an ein Ereignisprotokoll je Mandant angefügt; ein Trigger in der Datenbank verweigert nachträgliche Änderungen und Löschungen.",
        noteEli10: "Alles, was geschieht, wird der Reihe nach festgehalten, und nachträglich lässt sich nichts daran ändern.",
        noteHow: "Ereignisse bilden ein Append-only-Protokoll je Mandant, angefügt in derselben Transaktion wie jede Änderung, mit Rückgängig-Funktion.",
      },
      {
        label: "Mandantentrennung",
        icon: "lock-keyhole",
        group: "security",
        note: "Sicherheit auf Zeilenebene im FORCE-Modus trennt in Postgres die Mandanten in jeder Tabelle, unterhalb der Anwendung.",
        noteEli10: "Die Daten jeder Organisation hält die Datenbank selbst getrennt.",
        noteHow: "Jede Zeile trägt tenant_id unter erzwungener Sicherheit auf Zeilenebene, und der Produktivbetrieb braucht eine Datenbankrolle ohne Superuser-Rechte.",
      },
      {
        label: "Ein Arbeitsbaum",
        icon: "list-tree",
        group: "work",
        note: "Projekte, Epics, Tickets, Releases, Arbeitsaufträge und Wissen sind Knoten in einem Baum mit typisierten Beziehungen.",
        noteEli10: "Alle Arbeit steht in einer Struktur, sodass jede Aufgabe zeigt, wie sie mit dem großen Ganzen zusammenhängt.",
        noteHow: "Knoten bilden einen Baum mit mandantendefinierten Arten. Beziehungen: blocks, relates, implements, cites und duplicates.",
      },
      {
        label: "Arbeitsaufträge",
        icon: "timer",
        group: "work",
        note: "Arbeitsaufträge tragen Obergrenzen für Kosten und Zeit; erledigt heißt: jedes Kriterium erfüllt, Nachweise angehängt und kein Lauf mehr aktiv.",
        noteEli10: "Jeder Auftrag an einen Agenten hat ein Budget und ein klares Ziel, und er gilt erst mit Nachweis als erledigt.",
        noteHow: "Arbeitsaufträge tragen Obergrenzen für Kosten und Zeit; erledigt heißt: jedes Kriterium erfüllt, Nachweise angehängt und kein Lauf mehr aktiv.",
      },
      {
        label: "Wissensgraph",
        icon: "network",
        group: "work",
        note: "Wissenseinträge verknüpfen sich über [[slug]]-Verweise und öffnen sich als Graph neben der Arbeit.",
        noteEli10: "Projektwissen wird einmal festgehalten, miteinander verknüpft und als Landkarte gezeigt.",
        noteHow: "Wissenseinträge sind Knoten der Arten memory, runbook, guideline, external-system und related-project; der Graph kommt aus GET /api/knowledge/graph.",
      },
      {
        label: "Journeys und Freigaben",
        icon: "waypoints",
        group: "work",
        note: "Acht abgeleitete Stufen von Inspire bis Live, mit Freigaben durch Personen.",
        noteEli10: "Jedes Projekt durchläuft klare Stufen, und eine Person gibt frei, bevor etwas live geht.",
        noteHow: "Acht abgeleitete Stufen von Inspire bis Live, mit Toren, die eine Person freigibt. Die Durchsetzung von Deploy-Zielen ist in diesem Release noch nicht enthalten.",
      },
      {
        label: "Klare Nutzung",
        icon: "eye",
        group: "ops",
        note: "Tokens je Sitzung, Ticket und Epic, mit Schätzungen zu Listenpreisen getrennt von der Abo-Nutzung.",
        noteEli10: "Sie sehen, wie viel KI jede Aufgabe verbraucht hat, und Schätzungen sind klar als Schätzungen gekennzeichnet.",
        noteHow: "Die Nutzung liegt unter /agents/usage: Tokens je Sitzung, Ticket und Epic, mit Schätzungen zu Listenpreisen getrennt von der Abo-Nutzung.",
      },
      {
        label: "Live-Aktualisierungen",
        icon: "radio-tower",
        group: "ops",
        note: "Offene Seiten folgen dem Ereignisprotokoll per Server-Sent Events, sodass sich Listen und Gliederung aktualisieren, während gearbeitet wird.",
        noteEli10: "Bildschirme aktualisieren sich, sobald sich etwas ändert, ohne neu zu laden.",
        noteHow: "Offene Seiten folgen dem Ereignisprotokoll per Server-Sent Events, sodass sich Listen und Gliederung aktualisieren, während gearbeitet wird.",
      },
      {
        label: "Vertrag zuerst",
        icon: "braces",
        group: "ops",
        note: "Eine Datei nach OpenAPI 3.1 mit 300+ Pfaden, bereitgestellt von einer einzigen Binärdatei, die die Web-Anwendung einbettet.",
        noteEli10: "Alles, was AEON kann, ist in einer öffentlichen Schnittstelle beschrieben, die Ihre anderen Werkzeuge nutzen können.",
        noteHow: "Eine Go-Binärdatei, gestartet mit paimos serve, bettet die Vue-3-Anwendung ein und stellt einen Vertrag nach OpenAPI 3.1 bereit; die CLI deckt Issues, Wissen, Suche, Beziehungen, Harness-Sitzungen und mehr ab.",
      },
      {
        label: "Gehostet oder selbst gehostet",
        icon: "server",
        group: "ops",
        note: "Nutzen Sie AEON auf einer Instanz, die Augmentoring für Sie betreibt, oder hosten Sie selbst: eine Binärdatei und Postgres 18 mit Ihrer OIDC-Anmeldung.",
        noteEli10: "Augmentoring kann AEON für Sie betreiben, oder Sie betreiben es auf Ihren eigenen Servern. Angemeldet wird mit Ihrem Firmen-Login.",
        noteHow: "Gehostet von Augmentoring oder selbst betrieben aus dem Image ghcr.io/inspr-at/aeon:<version> (kein latest-Tag), konfiguriert über AEON_*-Variablen mit Pflichtangabe AEON_DATABASE_URL, auf Postgres 18 mit pgvector. Angemeldet wird per OIDC (Zitadel).",
      },
      {
        label: "AGPL-3.0",
        icon: "badge-check",
        group: "legal",
        note: "AEON unter AGPL-3.0-only prüfen, selbst betreiben, forken und verändern.",
        noteEli10: "Der Quellcode ist offen: Sie können ihn lesen, betreiben und verändern.",
        noteHow: "AGPL-3.0-only. Ein annotierter Tag baut das GHCR-Image und ein GitHub-Release im Entwurf mit SHA256SUMS, veröffentlicht erst nach der Live-Prüfung.",
      },
      {
        label: "Made in Austria",
        icon: "mountain",
        group: "place",
        note: "Entworfen und gebaut in Graz, Österreich, als Teil der INSPR-Produktfamilie.",
        noteEli10: "Entworfen und gebaut in Graz, Österreich, vom Team hinter INSPR.",
        noteHow: "Entworfen und gebaut in Graz, Österreich, als Teil der INSPR-Produktfamilie.",
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
        "Eine Ansicht zeigt jeden Agenten bei der Arbeit: was er gerade tut, wem er berichtet und ob er Ihre Nachricht gelesen hat.",
      technical:
        "AgentsView stellt Harness-Sitzungen dar, die über das Daemon-Protokoll gemeldet werden, mit Übergabe der Leitung, verwalteter Steuerung (steuern, unterbrechen, stoppen) und Wiederherstellung von Sitzungen; Zustellungen in den Posteingang werden als Gesendet, Zugestellt und Gelesen verfolgt.",
    },
    deep: {
      title: "Sitzungen und Kopplung, genau",
      items: [
        { term: "/agents", body: "Die Seite Agents listet jede Harness-Sitzung; die Nutzung liegt unter /agents/usage." },
        { term: "Heartbeat", body: "Jeder Heartbeat trägt Phase, Aktivität, Notiz, Fortschritt von 0 bis 100 sowie Bereit- und Live-ETAs. Das Live-Fenster beträgt 2 Minuten; eine stumme, nicht verwaltete Sitzung zeigt Lost contact." },
        { term: "Worker-Lease", body: "Jede Generation hält einen Worker-Lease. Eltern- und Kindsitzungen verbinden sich über --parent-session, Umhängen und Übergabe der Leitung." },
        { term: "aeon-agentd pair", body: "Zeigt einen 9-stelligen Code, der nach 10 Minuten abläuft. Eine Person mit account.manage gibt ihn frei und wählt ein bis fünf Konten. Der Code dient nur der Anzeige: Einlösen braucht ein Gerätegeheimnis, geprüft über seinen Hash." },
        { term: "Transport", body: "Der Daemon holt sich Aufträge per HTTPS vom Server, unverschlüsseltes HTTP nur auf Loopback. Die lokale Steuerung läuft über einen Unix-Socket nur für den Besitzer, mit einem Bearer-Token." },
        { term: "Telemetrie", body: "Ohne Inhalte: keine Tokens der Anbieter, keine rohen Anbieterdaten, und Sitzungs-IDs der Anbieter bleiben lokal." },
        { term: "Verwaltete Läufe", body: "Ein verwalteter Lauf erhält einen eigenen MCP-Server mit aeon_comment, aeon_status, aeon_request_approval und aeon_terminal." },
        { term: "Nachrichten", body: "Mindestens einmal, mit Quittungen: Gelesen heißt, die Sitzung hat den Empfang bestätigt, Beantwortet, dass eine angenommene Antwort vorliegt. Hooks stellen an Zuggrenzen zu; der verwaltete agentd-Pfad stellt auch mitten im Zug und im Leerlauf zu." },
        { term: "aeon hook", body: "aeon hook claude|codex <event> für PostToolUse, UserPromptSubmit und Stop, eingerichtet mit aeon hook install." },
      ],
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
        body: "Nachrichten erreichen die Sitzung mindestens einmal, mit Quittungen für gelesen und beantwortet; Posteingangs-Hooks bringen sie hinein.",
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
        { label: "Installieren Sie den Daemon. Unter macOS ist er signiert (Developer ID, Hardened Runtime) und notarisiert.", command: "brew install inspr-at/tap/aeon-agentd" },
        { label: "Koppeln Sie aus Ihrem Arbeitsordner.", command: "aeon-agentd pair --url <origin>" },
        { label: "Eine Person bestätigt den 9-stelligen Code innerhalb von 10 Minuten im Browser." },
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
        "Agenten können um mehr bitten, aber nur eine Person kann zustimmen, und die Datenbank prüft, dass es wirklich eine Person war.",
      technical:
        "Ein angefragter Scope muss einem Scope des Schlüssels entsprechen oder ihn in Punktnotation verfeinern. approval.proposed gewährt nichts; approval.approved und die zugehörige Berechtigung werden gemeinsam festgeschrieben; die Datenbank weist Entscheidungen von Agenten zurück, ebenso jede Berechtigung ohne passende genehmigte Anfrage.",
    },
    deep: {
      title: "Schlüssel und Freigaben, genau",
      items: [
        { term: "Wirksame Berechtigung", body: "Die Scopes des Schlüssels, geschnitten mit der Rolle im Workspace. Eine leere Scope-Liste gewährt nichts; eine Route ohne Zuordnung antwortet mit 403." },
        { term: "Nie für Agenten", body: "harness.watch, rules.publish, harness.force_stop, harness.recover, die Berechtigungen zur Verwaltung von Mitgliedern, Rollen und Schlüsseln, keys.read, settings.manage, audit.read, approvals.decide und approvals.decide_high sowie die Portal-Berechtigungen." },
        { term: "Entscheidungen", body: "Agenten schlagen Freigaben nur vor. Eine Person entscheidet, und die Datenbank weist die Entscheidung eines Agenten zurück." },
        { term: "Schlüssel im Ruhezustand", body: "Gespeichert als Präfix plus Hash. Die CLI liest einen Schlüssel aus einer Datei oder von stdin, gibt ihn nie aus und legt ihn mit Modus 0600 ab." },
      ],
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
        "Regeln für Agenten werden einmal für das Unternehmen geschrieben und für jedes Projekt, jede Person und jede Aufgabe verfeinert, und die entscheidenden bleiben gesperrt.",
      technical:
        "internal/rules führt sechs Ebenen zu versionierten Veröffentlichungen mit gesperrten Regeln und einem gemeinsamen Byte-Budget zusammen; ein Harness erhält den zusammengeführten Satz über paimos session start --rules-receive.",
    },
    deep: {
      title: "Zusammenführung der Regeln, genau",
      items: [
        { term: "Rangfolge", body: "Unternehmen, Projekt, Person, Agentenrolle, benannter Agent, Aufgabe. Der höchste Treffer gewinnt, ein Gleichstand führt zur Ablehnung, und eine tiefere Ebene ersetzt nie eine gesperrte Regel." },
        { term: "Veröffentlichen", body: "Regelsätze entstehen als Entwurf, werden unter einer Kalenderversion veröffentlicht, und jede Veröffentlichung lässt sich wiederherstellen." },
        { term: "Budget", body: "Der zusammengeführte Satz hat standardmäßig ein Budget von 12.000 Bytes und höchstens 64.000." },
        { term: "session start", body: "paimos session start --rules-preview zeigt den zusammengeführten Satz vorab; --rules-receive schreibt die Datei und schickt eine vom Worker gemeldete Quittung, die die Zustellung festhält, nicht die Befolgung." },
        { term: "rules compare", body: "aeon rules compare vergleicht die Anweisungen, die ein Harness geladen hat, mit den zusammengeführten Regeln. Weder der Vergleich noch die Quittung belegt, dass das Modell sie befolgt." },
        { term: "Ziele", body: "claude-code, codex, grok, pi und cursor." },
        { term: "Geplant", body: "Vorschläge für Regeländerungen als Pull Requests; sie brauchen eine GitHub App." },
      ],
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
      { title: "Byte-Budget", body: "Ein gemeinsames Budget, standardmäßig 12.000 Bytes und höchstens 64.000, hält lesbar, was ein Agent lädt." },
      { title: "Abweichungen erkennen", body: "aeon rules compare vergleicht die Anweisungen, die ein Harness geladen hat, mit den zusammengeführten Regeln." },
    ],
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
        "Jedes Projekt durchläuft acht Stufen. An jedem Tor gibt eine Person frei, bevor es weitergeht, und nichts anderes kann es bewegen.",
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
        "AEON ist bewusst einfach gebaut: ein Programm, eine Datenbank und eine lückenlose Aufzeichnung dessen, was geschehen ist.",
      technical:
        "Eine einzelne Go-Binärdatei bettet die Vue-Anwendung ein und stellt den Vertrag nach OpenAPI 3.1 bereit. Postgres 18 mit pgvector hält jede Zeile unter Sicherheit auf Zeilenebene im FORCE-Modus, eine Append-only-Ereignistabelle speist die Historie und Live-Aktualisierungen per Server-Sent Events, und aeon-agentd spricht ein Daemon-Protokoll mit fünf Harness-Adaptern.",
    },
    deep: {
      title: "Stack und Betrieb, genau",
      items: [
        { term: "paimos serve", body: "Eine Go-Binärdatei mit eingebetteter Vue-3-Anwendung. Migrationen sind eingebettet und werden beim Start angewendet." },
        { term: "aeon-agentd", body: "Ein eigener lokaler Supervisor auf jedem gekoppelten Rechner, ausgeliefert als Release-Dateien paimos-agentd. Der macOS-Daemon ist signiert (Developer ID, Hardened Runtime) und notarisiert; der Linux-Build ist statisch gelinkt." },
        { term: "Postgres 18", body: "Mit pgvector. Jede Zeile trägt tenant_id unter erzwungener Sicherheit auf Zeilenebene; der Produktivbetrieb braucht eine Rolle ohne Superuser-Rechte." },
        { term: "Suche", body: "Hybride Rangfolge aus lexikalischer und Vektorsuche über einen HNSW-Index auf pgvector halfvec(1536); rein lexikalisch, solange AEON_EMBEDDING_URL nicht gesetzt ist." },
        { term: "Selbst betreiben", body: "Das Image ghcr.io/inspr-at/aeon:<version>, ohne latest-Tag, konfiguriert über AEON_*-Variablen. AEON_DATABASE_URL ist Pflicht; Anhänge liegen unter AEON_FILES_DIR." },
        { term: "Anmeldung und Geheimnisse", body: "Personen melden sich per OIDC (Zitadel) an, ein Mandant je Sitzung. Servergeheimnisse kommen aus Dateien, und außerhalb der Entwicklung ist die Session-Schlüsseldatei Pflicht. Die Web-Anwendung lädt keine Analyse-Werkzeuge und keine Laufzeit-Ressourcen Dritter." },
        { term: "Releases", body: "INSPR-CalVer3 (YYMMDDhhmmss.0.0): dieses Release ist {version}, Kanal stable, Sequenz 113. Ein annotierter Tag baut das GHCR-Image und ein GitHub-Release im Entwurf mit SHA256SUMS; der Entwurf wird erst nach der Live-Prüfung veröffentlicht, was auch den Homebrew-Tap aktualisiert." },
      ],
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
    lead: "Hinged Hangar ist seit 30. September live. Was folgt, kann sich bis zum Release noch ändern.",
    depths: {
      simple: "Hinged Hangar ist heute live. Das kommt als Nächstes, und Pläne können sich bis zum Release noch ändern.",
      technical: "Hinged Hangar ist {version}, Kanal stable, Sequenz 113. Was folgt, sind erfasste Tickets, keine Zusagen. Noch nicht enthalten: die meisten MCP-Werkzeuge, die Durchsetzung von Deploy-Zielen und Doktrin-Vorschläge als Pull Requests.",
    },
    releases: [
      {
        label: "Intact Ion",
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
        label: "Danach",
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
        label: "Später",
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
        "Das Anbinden einer laufenden Sitzung ist früh verfügbar und funktioniert jetzt aus jedem macOS-Terminal.",
        "Tickets, Wissen und Suche laufen über die CLI und die HTTP-API.",
        "Personen melden sich über Ihren OIDC-Identitätsanbieter an.",
      ],
    },
  },
  openSource: {
    eyebrow: "Open Source",
    title: "Open Source, AGPL-3.0.",
    body:
      "Sie können AEON unter AGPL-3.0-only prüfen, selbst betreiben, forken und verändern. Jeder Quellcode-Link auf dieser Seite zeigt auf den Tag dieses Releases.",
    depths: {
      simple: "Der gesamte Quellcode ist unter einer Open-Source-Lizenz öffentlich: Sie können ihn prüfen, selbst betreiben und verändern.",
      technical: "AGPL-3.0-only. Ein annotierter Tag baut das GHCR-Image und ein GitHub-Release im Entwurf mit SHA256SUMS, veröffentlicht erst nach der Live-Prüfung. Jeder Quellcode-Link auf dieser Seite ist auf den Tag dieses Releases festgelegt.",
    },
    links: [
      { label: "GitHub-Repository", href: repositoryUrl, external: true },
      { label: "Hinged Hangar auf GitHub", href: `${repositoryUrl}/releases/tag/${tag}`, external: true },
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
      depths: {
        simple: "Die führenden KI-Coding-Agenten: Claude, Codex, Cursor, Grok und pi. Sie laufen auf Rechnern, die Sie verbinden, mit Ihren eigenen Abos.",
        technical: "Die Harnesses codex, claude, pi, cursor und grok, gesteuert von aeon-agentd auf gekoppelten Rechnern; jede Sitzung registriert sich mit einem Worker-Lease. Codex und Cursor lassen sich nur verbinden, ohne automatische Prüfung. pi erreicht OpenRouter-Modelle (vendor/model[:variant]) nach aeon-agentd add-harness --harness pi --provider openrouter, das den Schlüssel prüft, ohne Tokens zu verbrauchen.",
      },
    },
    {
      question: "Wo liegen unsere Daten?",
      answer:
        "Dort, wo Sie es entscheiden: auf einer Instanz, die Augmentoring für Sie betreibt, oder selbst gehostet auf Ihrer eigenen Infrastruktur, als eine Server-Binärdatei und eine Postgres-18-Datenbank. In beiden Fällen hält die Sicherheit auf Zeilenebene in der Datenbank die Mandanten auseinander.",
      depths: {
        simple: "Dort, wo Sie es entscheiden: bei Augmentoring als Betreiber oder auf Ihren eigenen Servern. In beiden Fällen hält die Datenbank die Daten jeder Organisation getrennt.",
        technical: "Gehostet von Augmentoring oder selbst betrieben aus ghcr.io/inspr-at/aeon:<version> auf Postgres 18 mit pgvector. Jede Zeile trägt tenant_id unter erzwungener Sicherheit auf Zeilenebene, und der Produktivbetrieb braucht eine Datenbankrolle ohne Superuser-Rechte.",
      },
    },
    {
      question: "Kann ein Agent seine eigene Anfrage genehmigen?",
      answer:
        "Nein. Ein Agent schlägt vor; die Datenbank nimmt eine Entscheidung nur von einer Person zu einer gültigen Freigabeanfrage an, und jede Freigabe bleibt innerhalb der Scopes des Agentenschlüssels.",
      depths: {
        simple: "Nein. Agenten können nur fragen. Freigeben kann nur eine Person, und die Datenbank setzt das durch.",
        technical: "Nein. approvals.decide ist für Agentenschlüssel nie vergebbar: Agenten schlagen nur vor, und die Datenbank weist die Entscheidung eines Agenten zurück.",
      },
    },
    {
      // Nur bei Warum: die erste Frage von Entscheidern.
      question: "Brauchen wir eigene Server?",
      answer:
        "Nein. Augmentoring kann AEON für Ihr Team bereitstellen, integrieren und betreiben. Wenn Sie möchten, betreiben Sie es selbst aus dem öffentlichen Quellcode.",
      depths: {
        simple:
          "Nein. Augmentoring kann AEON für Ihr Team bereitstellen, integrieren und betreiben. Wenn Sie möchten, betreiben Sie es selbst aus dem öffentlichen Quellcode.",
        technical:
          "Nein. Augmentoring kann AEON für Ihr Team bereitstellen, integrieren und betreiben. Wenn Sie möchten, betreiben Sie es selbst aus dem öffentlichen Quellcode.",
      },
      depthMax: "simple",
    },
    {
      // Nur bei Wie.
      question: "Liefert AEON einen MCP-Server?",
      answer: "Teilweise. paimos mcp ist ein stdio-Server, in dem in diesem Release nur whoami funktioniert; seine Werkzeuge für Issues, Wissen und Suche fehlen noch. Verwaltete Läufe erhalten einen eigenen MCP-Server mit aeon_comment, aeon_status, aeon_request_approval und aeon_terminal.",
      depths: {
        simple: "Teilweise. paimos mcp ist ein stdio-Server, in dem in diesem Release nur whoami funktioniert; seine Werkzeuge für Issues, Wissen und Suche fehlen noch. Verwaltete Läufe erhalten einen eigenen MCP-Server mit aeon_comment, aeon_status, aeon_request_approval und aeon_terminal.",
        technical: "Teilweise. paimos mcp ist ein stdio-Server, in dem in diesem Release nur whoami funktioniert; seine Werkzeuge für Issues, Wissen und Suche fehlen noch. Verwaltete Läufe erhalten einen eigenen MCP-Server mit aeon_comment, aeon_status, aeon_request_approval und aeon_terminal.",
      },
      depthMin: "technical",
    },
    {
      // Nur bei Wie.
      question: "Was sendet der Daemon an den Server?",
      answer: "Telemetrie ohne Inhalte: keine Tokens der Anbieter, keine rohen Anbieterdaten, und Sitzungs-IDs der Anbieter bleiben lokal. Der Daemon erzeugt seine Zugangsdaten lokal, und der Server speichert nur Hashes.",
      depths: {
        simple: "Telemetrie ohne Inhalte: keine Tokens der Anbieter, keine rohen Anbieterdaten, und Sitzungs-IDs der Anbieter bleiben lokal. Der Daemon erzeugt seine Zugangsdaten lokal, und der Server speichert nur Hashes.",
        technical: "Telemetrie ohne Inhalte: keine Tokens der Anbieter, keine rohen Anbieterdaten, und Sitzungs-IDs der Anbieter bleiben lokal. Der Daemon erzeugt seine Zugangsdaten lokal, und der Server speichert nur Hashes.",
      },
      depthMin: "technical",
    },
  ],
  finalCta: {
    title: "Betreiben Sie AEON auf Ihre Weise.",
    body:
      "Hosten Sie es selbst aus dem öffentlichen Quellcode, oder lassen Sie es von Augmentoring für Ihr Team bereitstellen, integrieren und betreiben.",
  },
} satisfies AeonContent;
