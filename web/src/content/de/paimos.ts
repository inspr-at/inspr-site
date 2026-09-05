import { siteUrls } from "../urls";
import type { ProductContent } from "../types";

const repositoryUrl = "https://github.com/inspr-at/paimos";
const docsUrl = (document: string) =>
  `${repositoryUrl}/blob/main/docs/${document}`;

// German edition of the Paimos product page, served at paimos.inspr.at/de/.
// Facts, links, icons and structure mirror ../paimos.ts; only language-visible
// values differ. Keep both files in sync when product claims change.
export const paimosContentDe = {
  slug: "paimos",
  name: "Paimos",
  category: "Projektkontext",
  canonicalUrl: `${siteUrls.paimos}/de/`,
  repositoryUrl,
  releaseUrl: `${repositoryUrl}/releases`,
  license: {
    name: "AGPL-3.0-only",
    url: `${repositoryUrl}/blob/main/LICENSE`,
    note: "Das Paimos-Repository deklariert die SPDX-Lizenz AGPL-3.0-only. Sie können den Code prüfen, selbst betreiben, forken und unter diesen Bedingungen verändern.",
  },
  seo: {
    title: "Paimos | Projektkontext für Menschen und KI-Agenten",
    description:
      "Selbst gehostetes Projektmanagement, das Arbeit, Repository-Kontext, KI-Ausführungskontrollen, Laufnachweise und Kundenabnahme in einem Projektbild zusammenhält.",
  },
  hero: {
    eyebrow: "Projektkontext, geteilt",
    title: "Ein gemeinsames Projektbild.",
    lead:
      "Paimos ist selbst gehostetes Projektmanagement für Engineering- und Delivery-Teams, die mit KI-Agenten arbeiten. Es hält Tickets, Repository-Kontext, Betriebswissen, Ausführungsentscheidungen und Laufnachweise zusammen. So kann ein Agent mit Kontext handeln, und ein Mensch sieht, was passiert ist.",
    alt: "Abstrakte Projekt-Agora, in der Menschen und KI-Teilnehmer um eine gemeinsame Arbeitsfläche stehen",
    primaryLabel: "So funktioniert es",
    primaryHref: "#model",
  },
  serviceIntro:
    "Augmentoring stellt Paimos für Teams bereit, integriert und betreibt es.",
  proof: [
    "Selbst gehostet",
    "CLI, MCP und REST",
    "Mensch und Agent in einer Historie",
    "Prüfbarer Quellcode und Release-Nachweise",
  ],
  specs: {
    eyebrow: "Eckdaten",
    title: "Was Sie tatsächlich bekommen.",
    lead:
      "Das Fähigkeitsraster auf einen Blick: Sicherheitslage, betriebliche Garantien und offene Schnittstellen, bevor der Fließtext jede Zusage im Detail erklärt.",
    leadEli10:
      "Dasselbe Raster in einfachen Worten: was jede Zusage für Ihr Unternehmen, Ihr Budget und Ihre Rechtsabteilung bedeutet. Ganz ohne IT-Wörterbuch. Drehen Sie einfach eine Karte um.",
    items: [
      {
        label: "Spracheingabe",
        icon: "mic",
        group: "ai",
        note: "Sprechen Sie eine Änderung durch; Spezifikation, Auswirkungen auf bestehende Arbeit und der Ticket-Entwurf entstehen beim Reden. Danach korrigieren Sie und legen das Ticket ab.",
        noteEli10:
          "Sie sagen einfach laut, was Sie wollen. Das Werkzeug schreibt die Beschreibung, zeigt, was sonst noch betroffen ist, und macht daraus eine ordentliche Aufgabe, die Sie vor dem Speichern korrigieren können.",
      },
      {
        label: "Unternehmenstauglich",
        icon: "layers-3",
        group: "ops",
        note: "SSO, Audit, Aufbewahrung und Projektberechtigungen sind Teil des Kerns, ohne separat lizenzierte Enterprise-Zusätze.",
        noteEli10:
          "Die Konzernfunktionen (Firmen-Login, Änderungsprotokolle und Zugriffsregeln) sind schon eingebaut. Es gibt keine teure 'Enterprise-Edition', die man später kaufen müsste.",
      },
      {
        label: "Selbst betreibbar",
        icon: "server",
        group: "ops",
        note: "Ein Container auf Ihrem eigenen Server. Ihre Daten und ihr gesamter Weg bleiben unter Ihrer Kontrolle.",
        noteEli10:
          "Es läuft auf Ihrem eigenen Server, wie die Kaffeemaschine in der eigenen Küche. Ihre Daten müssen nie bei einer fremden Firma wohnen.",
      },
      {
        label: "Air-Gap-freundlich",
        icon: "unplug",
        group: "ops",
        note: "Der Kern läuft ohne ausgehende Verbindungen. Nur optionale gehostete KI braucht überhaupt Internet.",
        noteEli10:
          "Es funktioniert auch mit gezogenem Internetstecker. Nichts im Kern braucht heimlich 'die Cloud', was in strengen oder isolierten Netzen hilfreich ist.",
      },
      {
        label: "Keine Telemetrie",
        icon: "eye-off",
        group: "security",
        note: "Keine Analytik, kein Tracking, kein Nachhausetelefonieren. Nichts über Ihre Nutzung verlässt Ihre Instanz.",
        noteEli10:
          "Das Werkzeug meldet nichts nach Hause. Niemand, auch nicht die Hersteller, sieht, wie Ihr Team es nutzt. Weniger Erklärungsbedarf gegenüber Datenschutzbeauftragten.",
      },
      {
        label: "NIS2-orientiert",
        icon: "shield-check",
        group: "security",
        note: "Zugriffskontrolle, Audit, Vorfalls-Metadaten und Aufbewahrung folgen NIS2-Praxis: echte Kontrollen, kein Zertifikat.",
        noteEli10:
          "Gebaut entlang der neuen EU-Cybersicherheitsregeln für wichtige Unternehmen. Ihre Sicherheits- und Rechtsprüfungen starten bei 'passt größtenteils' statt bei 'oje'.",
      },
      {
        label: "DSGVO-bewusst",
        icon: "lock-keyhole",
        group: "security",
        note: "Export- und Lösch-Endpunkte pro Person, Aufbewahrung durch den Betreiber gesteuert. Gebaut mit Respekt vor den Menschen in Ihren Daten.",
        noteEli10:
          "Personenbezogene Daten lassen sich pro Person exportieren oder löschen, so wie es das EU-Datenschutzrecht erwartet. Datenschutz ist eingebaut, nicht angeschraubt.",
      },
      {
        label: "Made in Austria",
        icon: "mountain",
        group: "place",
        note: "Entworfen und gebaut in Österreich, in der EU, mit echten Menschen und EU-Normen hinter Ihrem Projekt-Betriebssystem.",
        noteEli10:
          "Gebaut in Österreich, unter EU-Recht: Ihre Zeitzone, Ihre Normen, Ihre Aufsichtsbehörden. Support, der an Ihrem Vormittag antwortet, nicht um drei Uhr früh.",
      },
      {
        label: "Audit-Protokolle",
        icon: "scroll-text",
        group: "security",
        note: "Zugriffsänderungen, KI-Aufrufe und Agentenläufe behalten prüfbare Metadaten. Sie können immer beantworten, wer was getan hat.",
        noteEli10:
          "Das Werkzeug führt Tagebuch: wer wann was geändert hat, auch die KI. Wenn jemand fragt 'wer war das?', haben Sie die Antwort.",
      },
      {
        label: "Single Sign-on",
        icon: "key-round",
        group: "security",
        note: "Generisches OIDC mit PKCE, mit ZITADEL validiert. Ihr Identitätsanbieter bleibt die maßgebliche Quelle.",
        noteEli10:
          "Alle melden sich mit dem Firmenkonto an, das sie ohnehin schon haben. Keine neuen Passwörter, die man erfinden, vergessen oder verlieren könnte.",
      },
      {
        label: "SBOM + signierte Releases",
        icon: "file-check-2",
        group: "legal",
        note: "Jedes getaggte Image ist cosign-signiert und trägt eine CycloneDX-SBOM. Jedes Release lässt sich bis zur Quelle zurückverfolgen.",
        noteEli10:
          "Jedes Release kommt mit versiegelter Zutatenliste und fälschungssicherer Signatur, wie eine Medikamentenpackung für Software. Auditoren lieben das.",
      },
      {
        label: "Vollständig prüfbar",
        icon: "scan-search",
        group: "legal",
        note: "AGPL-Quellcode, eine offene API und ein selbstbeschreibendes Schema. Nichts an der Funktionsweise ist verborgen.",
        noteEli10:
          "Nichts ist eine Blackbox. Ihre eigenen Fachleute, oder wen immer Sie beauftragen, können vor dem Vertrauen genau nachlesen, was die Software tut.",
      },
      {
        label: "AGPL-3.0",
        icon: "git-branch",
        group: "legal",
        note: "Frei prüfen, selbst betreiben, forken und verändern. Wer einen veränderten Dienst betreibt, muss dessen Nutzern den Quellcode zugänglich halten.",
        noteEli10:
          "Eine Standard-Open-Source-Lizenz, die Ihre Rechtsabteilung tatsächlich lesen kann: nutzen, ändern, behalten, und niemand kann Sie je einsperren.",
      },
      {
        label: "Restore-getestet",
        icon: "database-backup",
        group: "ops",
        note: "Backup und Wiederherstellung sind dokumentiert und geübt, nicht angenommen. Wiederherstellung ist eine Übung, keine Hoffnung.",
        noteEli10:
          "Wir machen nicht nur Backups, wir üben auch das Zurückspielen. Feuerprobe statt Feuerhoffnung. Ihre Daten überstehen schlechte Tage.",
      },
      {
        label: "Skriptbare API",
        icon: "braces",
        group: "work",
        note: "Typisierte CLI, MCP und eine JSON-REST-API mit Probeläufen. Das gesamte Projektmodell lässt sich von überall steuern.",
        noteEli10:
          "Andere Software kann automatisch mit Paimos sprechen. Ihre IT kann es mit den Werkzeugen verdrahten, die Sie schon bezahlen, statt Dinge abzutippen.",
      },
      {
        label: "Eingebaute KI-Hilfe",
        icon: "sparkles",
        group: "ai",
        note: "Dreizehn fokussierte Aktionen: verfeinern, übersetzen, schätzen und zusammenfassen. An, wenn Sie es wollen, standardmäßig aus.",
        noteEli10:
          "Hilfreiche KI-Knöpfe zum Zusammenfassen, Übersetzen und Schätzen bleiben AUS, bis Sie es anders entscheiden. Sie bestimmen, wann KI Ihre Daten berührt.",
      },
      {
        label: "Code-bewusste Agenten",
        icon: "workflow",
        group: "ai",
        note: "Agenten erhalten verknüpfte Repositories, Wissen und Ticket-zu-Datei-Anker. Sie handeln mit Projektkontext, nicht blind.",
        noteEli10:
          "Die KI-Helfer bekommen den echten Kontext des Projekts (welcher Code, welche Regeln, welche Historie). Sie arbeiten wie eingewiesene Kollegen, nicht wie ratende Praktikanten.",
      },
      {
        label: "Lokale Entwurfsanbieter",
        icon: "hard-drive",
        group: "ai",
        note: "Zeigen Sie auf Ollama oder einen beliebigen OpenAI-kompatiblen Endpunkt. Die Modellinferenz bleibt auf Ihrer eigenen Hardware.",
        noteEli10:
          "Die KI kann auch auf Ihren eigenen Maschinen laufen. Ideen und Entwürfe müssen das Haus nie verlassen. Datensouveränitäts-Fans nicken zustimmend.",
      },
      {
        label: "Kundenportal",
        icon: "panels-top-left",
        group: "work",
        note: "Kunden sehen genau das, was Sie veröffentlichen, reichen Anfragen ein und nehmen Lieferungen ab. Interne Arbeit bleibt intern.",
        noteEli10:
          "Ein aufgeräumtes Fenster für Ihre Kunden: Sie sehen nur, was Sie freischalten, und können fertige Arbeit direkt dort abnehmen. Interner Austausch bleibt intern.",
      },
      {
        label: "Zeit & Budgets",
        icon: "timer",
        group: "work",
        note: "Schätzungen, Zeitbuchungen, Abgrenzungen und Budgets leben auf denselben Tickets wie die Arbeit: ein Modell vom Aufwand bis zur Rechnung.",
        noteEli10:
          "Stunden, Schätzungen und Budgets stehen auf denselben Tickets wie die Arbeit selbst. Eine Wahrheit von der ersten Schätzung bis zur letzten Rechnung, ohne Neben-Tabelle.",
      },
      {
        label: "Undo & Redo",
        icon: "rotate-ccw",
        group: "work",
        note: "Massenänderungen sind transaktional mit vollständiger Änderungshistorie. Änderungen sind umkehrbar, und Konflikte werden sichtbar statt überschrieben.",
        noteEli10:
          "Große Änderungen lassen sich zurücknehmen. Eine falsche Massenbearbeitung ist ein 'Hoppla', keine Katastrophe. Bearbeiten zwei Personen dasselbe, gibt es eine Warnung statt stillen Datenverlusts.",
      },
    ],
    glossary: [
      {
        id: "sso",
        term: "SSO / Single Sign-on",
        matches: ["SSO", "Single Sign-on", "Firmenkonto", "Firmen-Login"],
        body: "Ein Firmen-Login für viele Werkzeuge. Niemand muss mehr für jede App ein neues Passwort erfinden (und verlieren).",
      },
      {
        id: "oidc",
        term: "OIDC",
        matches: ["OIDC"],
        body: "Der offene Standard, der Single Sign-on zwischen Ihrem Identitätssystem und Apps wie dieser möglich macht.",
      },
      {
        id: "pkce",
        term: "PKCE",
        matches: ["PKCE"],
        body: "Ein zusätzlicher Sicherheitsschritt im Login-Ablauf, der verhindert, dass gestohlene Login-Codes wiederverwendet werden.",
      },
      {
        id: "zitadel",
        term: "ZITADEL",
        matches: ["ZITADEL"],
        body: "Ein Open-Source-Identitätsanbieter: der 'Wer sind Sie?'-Dienst. Er ist das Referenzsystem, gegen das Paimos getestet wird.",
      },
      {
        id: "identity-provider",
        term: "Identitätsanbieter",
        matches: ["Identitätsanbieter"],
        body: "Das System, dem Ihre Benutzerkonten gehören (etwa Entra ID oder ZITADEL). Apps vertrauen ihm, statt eigene Passwörter zu horten.",
      },
      {
        id: "sbom",
        term: "SBOM",
        matches: ["SBOM", "Zutatenliste"],
        body: "Software Bill of Materials: die vollständige Zutatenliste einer Software. Sie wissen genau, was drinsteckt.",
      },
      {
        id: "cosign",
        term: "cosign",
        matches: ["cosign-signiert", "fälschungssicherer Signatur"],
        body: "Ein Werkzeug, das Software-Releases kryptografisch versiegelt. Manipuliert jemand das Release, bricht das Siegel.",
      },
      {
        id: "cyclonedx",
        term: "CycloneDX",
        matches: ["CycloneDX"],
        body: "Das Standardformat für solche Software-Zutatenlisten, damit Audit-Werkzeuge sie automatisch lesen können.",
      },
      {
        id: "agpl",
        term: "AGPL-3.0",
        matches: ["AGPL"],
        body: "Eine starke Open-Source-Lizenz: Alle dürfen die Software nutzen, lesen und verbessern, und Verbesserungen an einem öffentlichen Dienst müssen offen bleiben.",
      },
      {
        id: "nis2",
        term: "NIS2",
        matches: ["NIS2"],
        body: "Die EU-Cybersicherheitsrichtlinie für wichtige Organisationen. Sie verlangt belegbare Sicherheitspraxis, keine Versprechen.",
      },
      {
        id: "gdpr",
        term: "DSGVO",
        matches: ["DSGVO", "EU-Datenschutzrecht"],
        body: "Das Datenschutzrecht der EU. Menschen dürfen unter anderem eine Kopie ihrer Daten oder deren Löschung verlangen.",
      },
      {
        id: "telemetry",
        term: "Telemetrie",
        matches: ["Telemetrie", "Nachhausetelefonieren", "meldet nichts nach Hause"],
        body: "Nutzungsdaten, die eine App an ihren Hersteller sendet. Paimos sendet keine.",
      },
      {
        id: "air-gap",
        term: "Air-Gap",
        matches: ["Air-Gap", "gezogenem Internetstecker"],
        body: "Der Betrieb eines Systems ohne Verbindung zum offenen Internet, üblich in Hochsicherheitsumgebungen.",
      },
      {
        id: "container",
        term: "Container",
        matches: ["Container"],
        body: "Eine genormte Transportkiste für Software. Wenn Ihre IT Container betreibt (die meisten tun das), kann sie auch dieses System betreiben.",
      },
      {
        id: "api",
        term: "API",
        matches: ["API", "REST"],
        body: "Die Steckdose, über die andere Software automatisch mit dieser Software spricht. Kein Mensch muss Daten abtippen.",
      },
      {
        id: "cli",
        term: "CLI",
        matches: ["CLI"],
        body: "Die Kommandozeile: der Weg, auf dem Entwickler und Skripte das Werkzeug mit getippten Befehlen steuern.",
      },
      {
        id: "mcp",
        term: "MCP",
        matches: ["MCP"],
        body: "Model Context Protocol: der Standardstecker, über den KI-Assistenten Werkzeuge wie dieses sicher nutzen können.",
      },
      {
        id: "ollama",
        term: "Ollama",
        matches: ["Ollama", "OpenAI-kompatiblen Endpunkt"],
        body: "Software, mit der KI-Modelle auf den eigenen Rechnern laufen statt gemietet in einer fremden Cloud.",
      },
      {
        id: "inference",
        term: "Inferenz",
        matches: ["Modellinferenz"],
        body: "Der Moment, in dem ein KI-Modell tatsächlich 'denkt'. Wo das passiert, entscheidet, wohin Ihre Daten reisen.",
      },
      {
        id: "retention",
        term: "Aufbewahrung",
        matches: ["Aufbewahrung"],
        body: "Wie lange Daten behalten werden, bevor sie gelöscht werden. Hier legen Sie als Betreiber diese Fristen fest.",
      },
      {
        id: "mutation-history",
        term: "Änderungshistorie",
        matches: ["Änderungshistorie"],
        body: "Ein Protokoll jeder vorgenommenen Änderung. Genau das macht sicheres Undo und Redo möglich.",
      },
    ],
  },
  problem: {
    eyebrow: "Warum Paimos",
    title: "Fragmente brechen KI-Arbeit.",
    lead:
      "Ein Ticket sagt, was sich ändern soll. Das Repository sagt, wo. Ein Runbook sagt, wie. Ein Chatfenster sagt, was ein Agent versucht hat. Keines dieser Systeme allein kann beantworten, wer gehandelt hat, welchen Kontext es gab, welche Befugnis bestand und was zurückkam.",
    visualAlt:
      "Getrennte Stationen für Arbeit, Repository, Wissen und Nachweise laufen in einem gemeinsamen transparenten Projektregister zusammen, genutzt von einem Menschen und einem KI-Agenten.",
    visualCaption:
      "Ein Projektregister verbindet Arbeit, Kontext, Ausführung und Nachweise.",
    items: [
      {
        title: "Kontext ist verstreut",
        icon: "unplug",
        body:
          "Anforderungen, Code, Runbooks, Projektkonventionen und Betriebswissen leben oft in verschiedenen Werkzeugen oder auf dem Rechner einer einzelnen Person. Jeder neue Lauf beginnt damit, das Projekt zu rekonstruieren.",
        meta: "Der Agent sieht eine Aufgabe, nicht das System darum herum.",
      },
      {
        title: "Ausführung ist undurchsichtig",
        icon: "eye-off",
        body:
          "Ein Modellentwurf, ein lokaler Coding-Agent und ein Runner mit Deploy-Rechten haben sehr unterschiedliche Befugnisse. Verschwinden diese Unterschiede hinter einem generischen KI-Knopf, werden Prüfung und Verantwortung zum Ratespiel.",
        meta: "Anbieter, Kontext und Befugnis müssen explizit sein.",
      },
      {
        title: "Lieferung verliert ihre Nachweise",
        icon: "file-warning",
        body:
          "Arbeit kann vom Prompt zum Pull Request wandern, ohne dass Tests, Version, Entscheidungen oder das kundenwirksame Ergebnis in die Projektakte zurückkehren. 'Fertig' wird zur Behauptung statt zu einem prüfbaren Zustand.",
        meta: "Der Kreis schließt sich erst, wenn Nachweise zurückkommen.",
      },
    ],
  },
  model: {
    eyebrow: "So funktioniert es",
    title: "Das Projekt ist die Steuerungsebene.",
    lead:
      "Paimos verbindet Arbeit, Kontext, Ausführung und Nachweise in einem berechtigungsbewussten System. Menschen planen und prüfen im selben Projektmodell, aus dem Agenten lesen und in das sie zurückberichten.",
    steps: [
      {
        number: "01",
        title: "Planen",
        visual: { x: 24, y: 18 },
        icon: "folder-kanban",
        body:
          "Beginnen Sie sprechend oder schreibend. Die Spracheingabe macht aus einer gesprochenen Idee eine lebende Spezifikation mit den Auswirkungen auf bestehende Arbeit daneben und legt das Ticket ab, sobald Sie zufrieden sind. Von dort: Epics, Tickets und Aufgaben mit typisierten Abhängigkeiten, Sprints, Releases, Schätzungen, Zeit und kundenwirksamem Lieferstatus.",
        meta: "Von gesprochener Absicht zum abgelegten Ticket",
        signal: "Hierarchie, Abhängigkeiten und Lieferstatus",
        reference: {
          label: "Planungshierarchie",
          href: docsUrl("PLANNING_HIERARCHY.md"),
          external: true,
        },
      },
      {
        number: "02",
        title: "Kontext",
        visual: { x: 22, y: 68 },
        icon: "book-open-check",
        body:
          "Verknüpfen Sie Repositories und dauerhaftes Wissen. Ergänzen Sie Runbooks, Richtlinien, externe Systeme, Agentendefinitionen und Ticket-zu-Datei-Anker.",
        meta: "Projektwissen überlebt den aktuellen Rechner und die aktuelle Agentenlaufzeit",
        signal: "Repositories, Wissen und Code-Anker",
        reference: {
          label: "Agenten-Integration",
          href: docsUrl("AGENT_INTEGRATION.md"),
          external: true,
        },
      },
      {
        number: "03",
        title: "Ausführen",
        visual: { x: 50, y: 40 },
        icon: "play",
        body:
          "Wählen Sie Anbieter, Ausführungsprofil, Aufwand, Prompt-Voreinstellung, Kontextpaket und Agent, bevor die Arbeit beginnt. Wechseln Sie dann in den Agent Mode und begleiten Sie aktive Lieferungen per Sprache oder Text, während Projektumfang, kontextbezogene Befehle und Befugnis sichtbar bleiben.",
        meta: "Explizite Befugnis vor der Arbeit; ruhige Aufsicht währenddessen",
        signal: "Anbieter, Profil, Befugnis und aktueller Lieferstatus",
        reference: {
          label: "Ausführungsanbieter",
          href: docsUrl("IMPLEMENT_THIS_PROVIDERS.md"),
          external: true,
        },
      },
      {
        number: "04",
        title: "Nachweise",
        visual: { x: 77, y: 69 },
        icon: "file-check-2",
        body:
          "Laufstatus, Anbieteridentität, sichere Provenienz, Testergebnisse, Version und optionales Deploy-Ergebnis bleiben an der Projekthistorie hängen.",
        meta: "Was lief und was zurückkam, bleibt prüfbar",
        signal: "Status, Tests, Version und sichere Provenienz",
        reference: {
          label: "Agenten-Schnittstelle",
          href: docsUrl("AGENT_INTERFACE.md"),
          external: true,
        },
      },
      {
        number: "05",
        title: "Abnehmen",
        visual: { x: 50, y: 78 },
        icon: "badge-check",
        body:
          "Veröffentlichen Sie nur ausgewählte Arbeit im Kundenportal, erzeugen Sie Lieferberichte und schließen Sie den Kreis mit expliziter Abnahme.",
        meta: "Interne Wahrheit und Kundenkommunikation bleiben verbunden",
        signal: "Ausgewählte Lieferung und explizite Abnahme",
        reference: {
          label: "Kundenportal",
          href: docsUrl("CUSTOMER_PORTAL.md"),
          external: true,
        },
      },
    ],
    closing:
      "Agentenlaufzeiten können wechseln. Der dauerhafte Projektkontext, die Berechtigungen und die Nachweise bleiben in Paimos.",
  },
  featureSections: [
    {
      id: "structured-work",
      eyebrow: "Arbeit",
      title: "Struktur ohne Theater.",
      lead:
        "Paimos bietet genug Struktur für echte Lieferung, ohne das Werkzeug in eine Prozessberatung zu verwandeln. Das Arbeitsmodell ist explizit, durchsuchbar und über Oberfläche, CLI oder API nutzbar.",
      items: [
        {
          title: "Eine Hierarchie, die lesbar bleibt",
          icon: "list-tree",
          body:
            "Epics, Tickets und Aufgaben bilden die Kernhierarchie. Sprints, Releases und Kostenstellen ergänzen Planungs- und kaufmännischen Kontext, ohne jedes Projekt in dieselbe Zeremonie zu zwingen.",
          meta: "Epic, Ticket, Aufgabe, Sprint, Release und Kostenstelle",
          reference: {
            label: "Planungshierarchie",
            href: docsUrl("PLANNING_HIERARCHY.md"),
            external: true,
          },
        },
        {
          title: "Ein Projektlebenszyklus mit Biss",
          body:
            "Aktive Projekte bleiben in der täglichen Arbeitsfläche. Eingefrorene Projekte bewahren bestehende Arbeit, nehmen aber nichts Neues an; archivierte Projekte bleiben als abgeschlossene Historie erreichbar, statt die aktuelle Planung zu verstellen.",
          meta: "Aktiv als Standard; eingefroren und archiviert nur durch explizite Entscheidung",
          reference: {
            label: "Agenten-Schnittstelle",
            href: docsUrl("AGENT_INTERFACE.md"),
            external: true,
          },
        },
        {
          title: "Beziehungen mit Bedeutung",
          icon: "git-compare-arrows",
          body:
            "Gruppen, Sprint-Zugehörigkeit, Abhängigkeiten, Auswirkungen, Folgeaufgaben, Blockaden und verwandte Verknüpfungen sind typisierte Beziehungen statt Prosa in einer Beschreibung.",
          meta: "Sieben Beziehungstypen mit gerichteter Darstellung",
        },
        {
          title: "Ansichten für den Alltag",
          body:
            "Gespeicherte Filter, konfigurierbare Spalten, Sortierung, Volltextsuche, angeheftete Ansichten und Teiltreffer bei Ticket-Schlüsseln halten große Projekthistorien benutzbar.",
          meta: "Ansichten und Filter bleiben pro Person erhalten",
        },
        {
          title: "Massenänderung mit Rückweg",
          body:
            "Atomare Anlege- und Änderungsoperationen tragen strukturierte Automatisierung. Undo und Redo nutzen Änderungshistorie und Konflikterkennung, statt neuere Arbeit still zu überschreiben.",
          meta: "Transaktionale Massenoperationen und explizite Konflikte",
        },
        {
          title: "Aufwand, Zeit und Lieferstatus",
          body:
            "Schätzungen, Zeitbuchungen, Abgrenzungen, Satz- und Budgetfelder, Releases und der Weg von Lieferung zu Abnahme halten Umsetzung und kaufmännischen Fortschritt im selben Modell.",
          meta: "Vom Backlog bis abgenommen und verrechnet",
        },
      ],
    },
    {
      id: "agent-context",
      eyebrow: "Kontext",
      title: "Geben Sie Agenten das Projekt.",
      lead:
        "Ein Coding-Agent muss wissen, welches Repository zählt, welche Regeln gelten und wohin die Änderung gehört. Paimos stellt diesen Kontext als strukturierte, berechtigungsbewusste Projektdaten bereit.",
      items: [
        {
          title: "Verknüpfte Repositories",
          icon: "git-branch",
          body:
            "Projekte führen ihr Repository-Inventar und die Standard-Branches. Ein Agent kann die richtige Quelle auflösen, bevor er zu suchen oder zu ändern beginnt.",
          meta: "Projektkontext über mehrere Repositories",
        },
        {
          title: "Dauerhafte Wissensebene",
          icon: "library",
          body:
            "Erinnerungen, Runbooks, Richtlinien, externe Systeme und verwandte Projekte werden projekteigenes Wissen statt einer losen Sammlung maschinenlokaler Dateien.",
          meta: "Durchstöberbar, durchsuchbar und wiederverwendbar",
        },
        {
          title: "Kanonische Agentendefinitionen",
          body:
            "Projekt-Agenten tragen Beschreibungen, Bootstrap-Schritte und nicht verhandelbare Regeln. Adapter-Werkzeuge können diese Definitionen für verschiedene Agentenumgebungen rendern, ohne die Quelle zu duplizieren.",
          meta: "Projekt-Metadaten oberhalb der aktuellen Laufzeit",
        },
        {
          title: "Dauerhafte Agenten-Übergaben",
          body:
            "Claude-Code-, Codex- und optionale Grok-Build-Sitzungen können projektbezogene Nachrichten über ein dauerhaftes Register austauschen, während die herstellereigenen Endpunkte der Zustellweg bleiben. Absender-Erlaubnislisten, typisierte Aktionssperren und ein Rahmen für nicht vertrauenswürdige Daten halten jeden zugestellten Inhalt in einer expliziten Sicherheitsgrenze.",
          meta: "Zuordenbare Verläufe, ohne Paimos zum Inferenz-Proxy zu machen",
          reference: {
            label: "Agenten-Nachrichtensicherheit",
            href: docsUrl("AGENT_MESSAGE_SECURITY.md"),
            external: true,
          },
        },
        {
          title: "Explizite Orchestrator-Einrichtung",
          body:
            "Ist für ein Projekt kein Orchestrator verknüpft, kann ein berechtigter Super-Admin den lokalen CLI-Alias und den kanonischen Agenten wählen und dann einen vollständig sichtbaren Terminal-Befehl ohne Geheimnisse kopieren. Hat das Projekt noch keinen kanonischen Agenten, öffnet eine Aktion den vorhandenen Agenten-Editor in einem neuen Tab; die ursprüngliche Ansicht wartet auf eine ausdrückliche Aktualisierung. Nicht verfügbare Abfragen bieten nur einen erneuten Versuch, konfigurierte Projekte können das Gesprächsfenster öffnen, ohne etwas zu senden. Der Browser führt den Befehl nie aus, erhält kein Geheimnis und errät keinen Agenten.",
          meta: "Ein ehrlicher nächster Schritt für jeden Einrichtungszustand",
          reference: {
            label: "API der Orchestrator-Verknüpfung",
            href: docsUrl("api-minimal.md#instance-orchestrator-pin"),
            external: true,
          },
        },
        {
          title: "Ticket-zu-Datei-Anker",
          body:
            "Repository-Scanner können Tickets an konkrete Dateien und Symbole heften. Aktualitätsprüfungen und Provenienz helfen Agenten, deklarierten von abgeleitetem Kontext zu unterscheiden.",
          meta: "Das Ticket kann auf den Code zeigen, den es regelt",
        },
        {
          title: "Graph- und Mischabruf",
          body:
            "Lexikalische, lokal-vektorielle und Graph-Pfade fügen sich zu einer Abrufoberfläche mit gereihten Treffern und Provenienz. Fehlen Vektoren, greifen die verbleibenden Strategien weiter.",
          meta: "Kontextabruf mit prüfbaren Strategie-Metadaten",
        },
      ],
    },
    {
      id: "execution-control",
      eyebrow: "Ausführung",
      title: "Befugnis vor Aktion.",
      lead:
        "Ein gehosteter Modellentwurf ist kein lokaler Agent mit Repository-Zugriff. Paimos hält Anbieter, Modell, Kontext, Ausführungsort und Befugnis sichtbar, statt sie zu einer mehrdeutigen Aktion zu verschmelzen.",
      items: [
        {
          title: "Eingebaute KI-Unterstützung",
          icon: "sparkles",
          body:
            "Dreizehn Aktionen decken Aufgaben wie Textverfeinerung, Übersetzung, Spezifikation, Teilaufgaben-Erzeugung, Aufwandsschätzung, Duplikaterkennung sowie Kunden- oder Management-Zusammenfassungen ab.",
          meta: "Vom Admin steuerbare Prompts mit Nutzungs- und Kostendaten",
        },
        {
          title: "Gemeinsame Ausführungskontrollen",
          icon: "sliders-horizontal",
          body:
            "Profile, Aufwand, Prompt-Voreinstellungen und Kontextpakete verwenden dieselben Konzepte für In-App-KI-Aktionen und Implement-this-Läufe. Projektvorgaben und Richtlinien können die verfügbaren Optionen einschränken.",
          meta: "Ein Steuerungsvokabular für Aktionen und Läufe",
        },
        {
          title: "Vertrauenswürdige lokale Runner",
          body:
            "Claude-Code- und Codex-Runner arbeiten in einem explizit gewählten lokalen Checkout. Sie dürfen bearbeiten und testen, wenn ihre ausgewiesene Befugnis das erlaubt. Abgeschlossene Läufe können Repository, Branch und den vom Runner gemeldeten Commit-Bereich neben dem Ergebnis ausweisen.",
          meta: "Code-Nachweise kehren zurück; die Repository-Hoheit bleibt lokal",
          reference: {
            label: "Nachweise aus Agentenläufen",
            href: docsUrl("AGENT_INTEGRATION.md"),
            external: true,
          },
        },
        {
          title: "Entwurfsanbieter bleiben Entwurf",
          body:
            "OpenRouter und OpenAI-kompatible lokale Endpunkte können Pläne oder Review-Notizen vorbereiten. Sie können keine Repository-Änderungen, lokalen Tests oder Deploy-Befugnisse beanspruchen.",
          meta: "Vorschlag und Ausführung bleiben getrennte Vertrauensgrenzen",
        },
        {
          title: "Deploy bleibt eine bewusste Entscheidung",
          body:
            "Bereitstellung ist nur über einen vertrauenswürdigen lokalen Runner möglich und verlangt unabhängige Runner-Flags, einen Deploy-Befehl und ein Ziel auf Laufebene. Sie folgt nie stillschweigend aus der Modellwahl.",
          meta: "Drei explizite Tore vor dem Deploy",
        },
        {
          title: "Sichere Provenienz",
          body:
            "Laufaufzeichnungen erfassen Anbieter, Modell, Profil, Aufwand, Prompt-Referenz, Kontextquelle, Agent, Runner, Status, Tests und Version, ohne Prompt-Inhalte, Antwortinhalte, API-Schlüssel oder lokale Umgebungswerte zu protokollieren.",
          meta: "Genug Nachweis zum Prüfen, ohne Geheimnisse zu Logs zu machen",
        },
      ],
    },
    {
      id: "customer-delivery",
      eyebrow: "Lieferung",
      title: "Lieferung bleibt verbunden.",
      lead:
        "Interne Umsetzung und Kundenkommunikation dürfen nicht in getrennte Wirklichkeiten driften. Paimos macht aus ausgewähltem Projektstand eine bewusste, prüfbare Kundenoberfläche.",
      items: [
        {
          title: "Sichtbarkeit ist Opt-in",
          icon: "eye",
          body:
            "Interne Bearbeiter markieren explizit, welche Tickets kundensichtbar sind. Verborgene Tickets geben über Portal-Endpunkte keine identifizierenden Details preis; von Kunden eingereichte Anfragen sind bewusst sichtbar.",
          meta: "Internes Wissen bleibt intern, bis es bewusst veröffentlicht wird",
        },
        {
          title: "Ein fokussiertes externes Portal",
          icon: "panels-top-left",
          body:
            "Externe Nutzer sehen die Projekte und Tickets, auf die sie Zugriff haben, können Anfragen einreichen und den Lieferstatus prüfen, ohne den internen Arbeitsbereich zu betreten.",
          meta: "Projektzugriff plus explizite Ticket-Sichtbarkeit",
        },
        {
          title: "Berichte aus dem Projektstand",
          body:
            "Projektberichte kombinieren ausgewählte Tickets, technische oder kundengerechte Zusammenfassungen und konfigurierbare Spalten zu stabilen JSON- und PDF-Ständen.",
          meta: "Ein Liefernachweis aus demselben System wie die Arbeit",
        },
        {
          title: "Abnahme hinterlässt Nachweise",
          body:
            "Kurzlinks und QR-Codes führen zur expliziten Abnahme. Enthaltene Lieferpositionen lassen sich gesammelt abnehmen, und ein signierter Bericht kann am Stand hängen bleiben.",
          meta: "Von geliefert zu abgenommen ohne Parallel-Tabelle",
          reference: {
            label: "Kundenportal",
            href: docsUrl("CUSTOMER_PORTAL.md"),
            external: true,
          },
        },
      ],
    },
  ],
  audiences: {
    eyebrow: "Für Teams",
    title: "Schnell arbeiten. Verantwortlich bleiben.",
    lead:
      "Paimos ist dort am nützlichsten, wo Softwarelieferung, KI-gestützte Arbeit und Kundenverantwortung zusammentreffen. Jede Rolle sieht dieselbe Projektwahrheit aus einem anderen Blickwinkel.",
    items: [
      {
        title: "Engineering-Teams",
        body:
          "Geben Sie Menschen und Agenten dieselbe Arbeitshierarchie, denselben Repository-Kontext und dieselbe Ausführungshistorie. Weniger Kontext-Rekonstruktion, ohne KI-Zugriff zum unsichtbaren Seitenkanal zu machen.",
        meta: "Planen, umsetzen, testen und prüfen in einem Projektmodell",
      },
      {
        title: "Delivery- und Projektleitung",
        body:
          "Verfolgen Sie Abhängigkeiten, Aufwand, Zeit, Releases und kundensichtbare Ergebnisse, während interne Notizen, Runbooks und offene Arbeit dem externen Portal fernbleiben.",
        meta: "Operative Lieferung ohne zweite Berichtswahrheit",
      },
      {
        title: "Kundenbetreuung",
        body:
          "Verbinden Sie Umsetzungsarbeit mit Kundenanfragen, Berichten und Abnahme. Die Grenze zwischen internem Ausführungskontext und ausgewählter externer Kommunikation bleibt klar.",
        meta: "Ein bewusster Weg von der Arbeit zur Abnahme",
      },
      {
        title: "Plattform- und Sicherheitsteams",
        body:
          "Identität, Projektberechtigungen, Audit, Aufbewahrung, Anbieter-Richtlinien und Deploy-Entscheidungen bleiben in Betreiberhand. Prüfen Sie den Code und verifizieren Sie Release-Artefakte vor der Bereitstellung.",
        meta: "Selbst gehostete Kontrolle mit dokumentierten Vertrauensgrenzen",
      },
    ],
  },
  architecture: {
    eyebrow: "Architektur",
    title: "Kompakt genug zum Verstehen.",
    lead:
      "Paimos bevorzugt einen kleinen, prüfbaren Betriebs-Fußabdruck gegenüber einer verteilten Plattform aus Pflichtdiensten.",
    paragraphs: [
      "Ein einzelner Go-Prozess liefert die Vue-Anwendung und die JSON-API auf einem Port. SQLite im WAL-Modus ist die maßgebliche Datenhaltung, mit additiven Migrationen beim Start.",
      "S3-kompatibler Speicher ist optional für Anhänge, SMTP optional für Passwort-Reset-Mails. OIDC und Modellanbieter kommen nur ins System, wenn ein Betreiber sie konfiguriert. Fehlende optionale Dienste schalten ihr Feature ab, statt den Start der Kernanwendung zu verhindern.",
      "Dieser Standard ist einfach zu betreiben, zu sichern und wiederherzustellen. Es ist heute eine Ein-Knoten-Architektur, keine hochverfügbare Mehr-Knoten-Steuerungsebene.",
    ],
    flow: [
      "Browser, CLI, MCP und REST",
      "Ein Go-Dienst",
      "Vue-Oberfläche und JSON-API",
      "SQLite im WAL-Modus",
      "Optional S3, SMTP, OIDC und Modellanbieter",
    ],
    facts: [
      "Ein Anwendungsprozess und eine primäre Datendatei",
      "Kein verpflichtendes Redis, keine Message-Queue, keine externe Datenbank",
      "Deployment-Pfad über Docker Compose",
      "Automatische additive Schema-Migrationen",
      "Optionale Dienste fallen kontrolliert aus",
      "Branding- und Identitätseinstellungen in Betreiberhand",
    ],
  },
  trust: {
    eyebrow: "Vertrauen",
    title: "Vertrauen hinterlässt Nachweise.",
    lead:
      "Paimos belegt öffentliche Aussagen mit Code, Tests, signierten Artefakten, Runbooks und einer expliziten Liste der Grenzen. Das Ziel ist prüfbares Verhalten, kein Compliance-Theater.",
    items: [
      {
        title: "Identität und lokale Autorisierung",
        body:
          "Generisches OIDC mit Authorization Code und PKCE übernimmt die Identität. Abgleich über verifizierte E-Mail und Einladung als einziger Weg sind der Standard. Rollen und Projektberechtigungen bleiben lokal; lokaler Login und TOTP stehen als Alternative bereit.",
        meta: "ZITADEL ist der validierte Referenz-Identitätsanbieter",
      },
      {
        title: "Audit und Aufbewahrung",
        body:
          "Sitzungsänderungen werden standardmäßig auditiert. Zugriffsänderungen, Vorfälle, KI-Aufrufe und Agentenläufe tragen prüfbare Metadaten, während Aufbewahrungsfristen sowie Export- und Löschpfade pro Person in Betreiberhand bleiben.",
        meta: "Inhalte und Geheimnisse bleiben aus KI-Audit-Einträgen draußen",
      },
      {
        title: "Release-Integrität",
        body:
          "Getaggte Container-Images werden schlüssellos mit cosign über GitHub OIDC signiert. CycloneDX-SBOMs für Go- und Frontend-Abhängigkeiten hängen als Attestierungen am selben Image-Digest.",
        meta: "Ein Release lässt sich zu Quell- und Abhängigkeitsnachweisen zurückverfolgen",
        reference: {
          label: "Release-Verifikation",
          href: docsUrl("RELEASE.md"),
          external: true,
        },
      },
      {
        title: "Datenkontrolle",
        body:
          "Paimos enthält keine Analytik, keine Tracking-Pixel, keine erzwungene Telemetrie und keine verpflichtende Cloud-Abhängigkeit. Gehostete KI-Anbieter erhalten Projektinhalte nur, wenn ein Betreiber sie aktiviert und auswählt.",
        meta: "Self-Hosting hält den Standard-Datenpfad in Betreiberhand",
      },
      {
        title: "Sicherheitskontrollen mit konkretem Umfang",
        body:
          "Projektzugriffsprüfungen, CSRF-Schutz, ratenbegrenzte Anmeldung, gehashte API-Schlüssel, gehärtete Anhang-Auslieferung, Aufbewahrungsläufe sowie DSGVO-Export- und Lösch-Endpunkte sind Teil der ausgelieferten Implementierung.",
        meta: "NIS2-orientierte Kontrollen und DSGVO-bewusster Betrieb, keine Zertifizierungsbehauptungen",
      },
      {
        title: "Betrieblicher Beleg",
        body:
          "Backup-, Restore-, Upgrade- und Vorfallspfade sind dokumentiert und geübt. Die öffentlichen Nachweise benennen auch, wo die aktuelle Referenzbasis oder Review-Abdeckung noch klein ist.",
        meta: "Grenzen bleiben Teil der Vertrauensgeschichte",
      },
    ],
  },
  integrations: {
    eyebrow: "Integrationen",
    title: "Offene Schnittstellen zuerst.",
    lead:
      "Paimos legt sein Projektmodell über dokumentierte Schnittstellen offen und ergänzt gezielte Import- und Anbieterpfade dort, wo Teams bereits Systeme im Einsatz haben.",
    items: [
      {
        name: "paimos CLI",
        status: "Eingebaut",
        description:
          "Typisierte Befehle, dateibasierte Mehrzeileneingaben, JSON-Ausgabe, Probeläufe, idempotente Übergänge und deklaratives Massen-Apply für Agenten, Skripte und CI.",
      },
      {
        name: "MCP",
        status: "Eingebaut",
        description:
          "Eine kuratierte stdio-Fassade für interaktive Agenten-Clients. Massenabläufe bleiben in der CLI, damit der Werkzeugkontext begrenzt bleibt.",
      },
      {
        name: "REST, OpenAPI und Schema",
        status: "Eingebaut",
        description:
          "JSON-API, OpenAPI-Dokument und selbstbeschreibendes Schema legen Routen, Enums, Übergänge und Feldformen für eigene und externe Clients offen.",
      },
      {
        name: "Generisches OIDC",
        status: "Unterstützt",
        description:
          "Authorization Code mit PKCE, Abgleich über verifizierte E-Mail und lokale Projektautorisierung. ZITADEL ist der validierte Referenzanbieter.",
      },
      {
        name: "Jira",
        status: "Import",
        description:
          "Projekterkennung, Feld- und Beziehungszuordnung, Vorschau und asynchroner Ticket-Import in ein neues oder bestehendes Paimos-Projekt.",
      },
      {
        name: "Mite",
        status: "Import",
        description:
          "Auf DE und AT ausgerichteter Zeitbuchungs-Import mit Benutzerzuordnung, Vorschau, Fortsetzungsdatum und Aufräumfunktionen.",
      },
      {
        name: "HubSpot",
        status: "Referenz-CRM",
        description:
          "Kunden- und Kontaktimport, Remote-Suche, manueller Neuabgleich und Direktlinks. Paimos schreibt keine Änderungen nach HubSpot zurück.",
      },
      {
        name: "HTTP-CRM-Sidecar",
        status: "Erweiterbar",
        description:
          "Ein HMAC-signierter JSON-Vertrag lässt Betreiber ein anderes CRM aus beliebiger Sprache anbinden: Import, Abgleich, Suche und Direktlinks.",
      },
      {
        name: "CSV",
        status: "Eingebaut",
        description:
          "Import und Export pro Projekt und projektübergreifend, mit Validierung, bevor Daten übernommen werden.",
      },
      {
        name: "S3-kompatibler Speicher",
        status: "Optional",
        description:
          "MinIO oder ein anderer kompatibler Objektspeicher kann Anhänge halten. Ohne konfigurierten Speicher schaltet sich die Anhangsfunktion sauber ab.",
      },
      {
        name: "SMTP",
        status: "Optional",
        description:
          "Ausgehende E-Mail trägt die Passwort-Reset-Zustellung. Das Kernsystem hängt nicht von einem Maildienst ab.",
      },
      {
        name: "OpenRouter",
        status: "Optionaler Entwurfsanbieter",
        description:
          "Gehostete Modelle können In-App-Hilfe leisten und Pläne entwerfen. Sie erhalten nur den für die Anfrage gewählten Kontext und haben keinen lokalen Shell- oder Deploy-Pfad.",
      },
      {
        name: "OpenAI-kompatible lokale Modelle",
        status: "Optionaler Entwurfsanbieter",
        description:
          "Ollama, LM Studio, llama.cpp oder ein internes Gateway können Entwurfsunterstützung über einen kompatiblen Chat-Completions-Endpunkt liefern.",
      },
      {
        name: "Claude Code und Codex",
        status: "Vertrauenswürdige lokale Runner",
        description:
          "Entwicklereigene Runner können explizit zugewiesene Arbeit in einem freigegebenen lokalen Checkout übernehmen, Dateien bearbeiten, Tests ausführen und das Ergebnis zurückmelden.",
      },
    ],
  },
  limits: {
    eyebrow: "Betriebliche Eignung",
    title: "Nichts vorgaukeln.",
    lead:
      "Eine brauchbare Deployment-Entscheidung hängt an den Grenzen genauso wie an der Funktionsliste. Diese Grenzen beschreiben das aktuelle Produkt, keine künftige Roadmap.",
    items: [
      "Das Standard-Deployment ist ein kompaktes Ein-Knoten-System aus Go und SQLite. Es ist keine hochverfügbare Mehr-Knoten-Steuerungsebene.",
      "Gehostete und lokale Modellanbieter sind reine Entwurfsanbieter. Repository-Änderungen, Tests und Deployment verlangen einen explizit vertrauenswürdigen lokalen Runner.",
      "Deployment läuft nur über lokale Runner und ist dreifach abgesichert. Die Modellwahl verleiht nie Deploy-Befugnis.",
      "Ein generischer OIDC-Anbieter wird unterstützt, SAML nicht. Die aktuelle OIDC-Implementierung vertraut dem TLS-geschützten Userinfo-Austausch, statt das ID-Token lokal über JWKS zu prüfen.",
      "Nur das jeweils neueste Release erhält Sicherheitskorrekturen. Ein LTS-Programm gibt es nicht.",
      "Paimos hat noch keine unabhängige Sicherheitsprüfung durch Dritte abgeschlossen.",
      "Die dokumentierte Nachweisbasis umfasst derzeit eine aktive Produktionsumgebung und ein historisches Deployment eines zweiten Betreibers.",
      "Es gibt keinen veröffentlichten Skalierungs-Benchmark. Eine Produktionsübernahme sollte repräsentative Projekte, Nutzerzahlen, Parallelität und Anhangsvolumen prüfen.",
      "CRM-Abgleich funktioniert über Pull und Import. Webhooks vom CRM zu Paimos werden nicht unterstützt, und pro Deployment lässt sich ein generisches HTTP-CRM-Sidecar konfigurieren.",
      "Paimos hat eine responsive Weboberfläche, aber keine native Mobil-App.",
    ],
  },
  openSource: {
    eyebrow: "Open Source",
    title: "Offen durch Architektur, nicht durch Kampagne.",
    body:
      "Paimos steht unter AGPL-3.0-only. Sie können es prüfen, selbst betreiben, forken und unter diesen Bedingungen verändern. Wer eine veränderte Version als Netzwerkdienst betreibt, muss dessen Nutzern den zugehörigen Quellcode zugänglich halten. Open Source ist nicht die Heldengeschichte, aber es hält das Produkt, seine Vertrauensgrenzen und seine Zukunft prüfbar.",
    links: [
      {
        label: "GitHub-Repository",
        href: repositoryUrl,
        external: true,
      },
      {
        label: "Releases und Verifikation",
        href: `${repositoryUrl}/releases`,
        external: true,
      },
      {
        label: "Projektlizenz (AGPL-3.0-only)",
        href: `${repositoryUrl}/blob/main/LICENSE`,
        external: true,
      },
      {
        label: "Sicherheitsrichtlinie",
        href: `${repositoryUrl}/blob/main/SECURITY.md`,
        external: true,
      },
      {
        label: "Offizieller AGPL-Text",
        href: siteUrls.agpl,
        external: true,
      },
    ],
  },
  faq: [
    {
      question: "Ist Paimos ein Chatbot in einem Projektwerkzeug?",
      answer:
        "Nein. KI-Aktionen und Agenten arbeiten im Projektmodell mit, aber Paimos bleibt ein Projektmanagement- und Kontextsystem. Arbeitsstand, Berechtigungen, Anbieterwahl und Nachweise bleiben explizit.",
    },
    {
      question: "Kann ein KI-Modell ein Repository automatisch ändern?",
      answer:
        "Gehostete und lokale Modellanbieter sind reine Entwurfsanbieter. Repository-Änderungen und Tests verlangen einen vertrauenswürdigen lokalen Runner. Deployment verlangt zusätzliche unabhängige Freischaltungen und ein Ziel auf Laufebene.",
    },
    {
      question: "Braucht Paimos einen KI-Anbieter?",
      answer:
        "Nein. KI-Unterstützung ist standardmäßig aus. Projektmanagement, Kontext, Berichte, API und Portal funktionieren ohne gehosteten oder lokalen Modellanbieter.",
    },
    {
      question: "Können wir unseren Identitätsanbieter verwenden?",
      answer:
        "Paimos unterstützt einen generischen OIDC-Anbieter mit Authorization Code und PKCE. ZITADEL ist die validierte Referenz. Lokaler Login und TOTP bleiben verfügbar. SAML wird derzeit nicht unterstützt.",
    },
    {
      question: "Können Kunden interne Arbeit sehen?",
      answer:
        "Nur wenn interne Bearbeiter sie explizit kundensichtbar markieren. Von Kunden eingereichte Anfragen sind bewusst sichtbar. Andere Portal-Sichtbarkeit ist Opt-in, und Endpunkte verborgener Tickets vermeiden es, deren Existenz preiszugeben.",
    },
    {
      question: "Ist Paimos nur in der Cloud verfügbar?",
      answer:
        "Nein. Paimos ist selbst gehostet und hat keine verpflichtende SaaS-Abhängigkeit. S3-kompatible Anhänge, SMTP, OIDC und Modellanbieter sind optionale Betreiberentscheidungen.",
    },
    {
      question: "Was kann ein Agent aus einem Projekt lesen?",
      answer:
        "Im Rahmen des Projektzugriffs des Aufrufenden kann ein Agent Tickets, verknüpfte Repositories, Wissenseinträge, kanonische Agentendefinitionen, Ticket-zu-Datei-Anker, Graph-Beziehungen und gereihte Mischabruf-Ergebnisse lesen.",
    },
    {
      question: "Welche Größenordnung unterstützt Paimos?",
      answer:
        "Paimos ist als kompaktes Ein-Knoten-System ausgelegt. Es gibt noch keine veröffentlichte Leistungskurve; ein Produktions-Rollout sollte repräsentative Datenmengen, Parallelität und Anhangsnutzung testen.",
    },
    {
      question: "Wie verhält sich der kommerzielle Weg zum offenen Produkt?",
      answer:
        "Das Repository bleibt das Produkt. Augmentoring kann Architektur, Rollout, Integration und laufenden Betrieb rund um denselben offenen Code anbieten, ohne ihn durch eine geschlossene Ausgabe zu ersetzen.",
    },
  ],
  finalCta: {
    title: "Betreiben Sie es auf Ihre Art.",
    body:
      "Setzen Sie Paimos aus dem öffentlichen Quellcode auf und behalten Sie das gesamte Betriebsmodell in der eigenen Hand. Wenn Sie Architektur, Rollout, Integration oder laufenden Betrieb brauchen, bietet Augmentoring den kommerziellen Weg rund um dasselbe offene Produkt.",
  },
} satisfies ProductContent;
