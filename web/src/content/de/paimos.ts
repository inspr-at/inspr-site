import { siteUrls } from "../urls";
import type { ProductContent } from "../types";

const repositoryUrl = "https://github.com/inspr-at/paimos";
const docsUrl = (document: string) =>
  `${repositoryUrl}/blob/main/docs/${document}`;

// German edition of the Paimos product page, served at paimos.inspr.at/de/.
// This edition is PAIMOS AEON, release Paimos 7. Facts, links, icons and
// structure mirror ../paimos.ts; only language-visible values differ.
// Keep both files in sync when product claims change.
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
    note: "Das Repository von PAIMOS AEON deklariert die SPDX-Lizenz AGPL-3.0-only. Sie können es prüfen, selbst betreiben, forken und unter diesen Bedingungen verändern.",
  },
  seo: {
    title: "PAIMOS AEON | Projektkontext für Menschen und KI-Agenten",
    description:
      "Selbst gehostete, mehrmandantenfähige Projektarbeit für Menschen und KI-Agenten: ein Arbeitsbaum, gemeinsames Projektwissen, abgegrenzte Agentenberechtigungen und eine Append-only-Aufzeichnung dessen, was geschehen ist.",
  },
  hero: {
    sheet: {
      repo: "github.com/inspr-at/paimos",
      runtime: "Selbst gehostet: ein Anwendungscontainer und Postgres, Anmeldung per OIDC.",
      gate: "Ein Agent arbeitet innerhalb der Scopes seines Schlüssels. Geschützte Schritte brauchen eine Freigabe, die eine Person genehmigt, und die Entscheidung ist ein Ereignis im Protokoll.",
      artefact: "Arbeitsbaum, Wissen, Arbeitsaufträge und Laufaufzeichnungen, je Mandant und berechtigungsbewusst.",
      interfaces: "UI, CLI, HTTP-API",
      maturity: "Paimos 7 · AEON, veröffentlicht, AGPL-3.0-only",
      command: 'paimos issue create -p PROJ --title "…"',
    },
    eyebrow: "Paimos 7 · AEON",
    title: "Ein gemeinsames Projektbild.",
    depths: {
      simple:
        "Paimos ist Projektarbeit, die Sie selbst betreiben, gebaut für Teams, in denen Menschen und KI-Helfer nebeneinander arbeiten. Plan, Hintergrundwissen und die Aufzeichnung dessen, was geschehen ist, liegen an einem Ort, und eine Person entscheidet, was ein Agent tun darf.",
      technical:
        "PAIMOS AEON ist selbst gehostete, mehrmandantenfähige Projektarbeit: ein dynamischer Arbeitsbaum, eine gemeinsame Wissensebene, Arbeitsaufträge, Agentenläufe und abgegrenzte Berechtigungen über einem Append-only-Ereignisprotokoll, erreichbar über UI, CLI und HTTP-API.",
    },
    lead:
      "PAIMOS AEON ist die siebte Generation von Paimos: selbst gehostete Projektarbeit für Teams, die mit KI-Agenten arbeiten. Menschen und Agenten teilen einen Arbeitsbaum und einen Bestand an Projektwissen, Agenten arbeiten mit abgegrenzten Schlüsseln und fragen vor geschützten Schritten eine Person, und jede Änderung landet in einem Append-only-Ereignisprotokoll.",
    alt: "Abstrakte Projekt-Agora, in der Menschen und KI-Teilnehmer um eine gemeinsame Betriebsfläche stehen",
    primaryLabel: "So funktioniert es",
    primaryHref: "#model",
  },
  serviceIntro:
    "Augmentoring stellt Paimos für Teams bereit, integriert und betreibt es.",
  proof: [
    "Selbst gehostet",
    "CLI und HTTP-API",
    "Menschen und Agenten in einem Ereignisprotokoll",
    "AGPL-Quellcode und Releases mit Prüfsummen",
  ],
  specs: {
    eyebrow: "Eckdaten",
    title: "Was Sie tatsächlich bekommen.",
    lead:
      "Das Fähigkeitsraster auf einen Blick: Sicherheitslage, betriebliche Form und offene Schnittstellen, bevor der Fließtext jede einzeln ausformuliert.",
    leadEli10:
      "Dasselbe Raster in einfachen Worten: was jede Zusage für Ihr Unternehmen, Ihr Budget und Ihre Rechtsabteilung bedeutet. Ganz ohne IT-Wörterbuch. Drehen Sie eine beliebige Karte um.",
    items: [
      {
        label: "Agenten zuerst",
        icon: "workflow",
        group: "ai",
        note: "Sitzungen von Codex, Claude, Pi, Cursor und Grok arbeiten im selben Projektmodell wie Personen, jede mit eigenem Schlüssel und eigenen Scopes.",
        noteEli10:
          "KI-Helfer mehrerer Hersteller können in denselben Projekten arbeiten wie die Menschen in Ihrem Team. Jeder hat ein eigenes Kennzeichen, sodass Sie immer wissen, wer was getan hat.",
      },
      {
        label: "Abgegrenzte Berechtigungen",
        icon: "user-round-check",
        group: "security",
        note: "Jeder Agentenschlüssel trägt feste Scopes, die die Obergrenze bilden. Geschützte Schritte brauchen eine Freigabe, die der Agent anfragt und eine Person vor dem Ablauf genehmigt.",
        noteEli10:
          "Jeder KI-Helfer hat ein Kennzeichen, das festlegt, was er darf. Für die heiklen Schritte muss er fragen, und eine Person sagt ja oder nein. Er bekommt nie mehr, als sein Kennzeichen erlaubt.",
      },
      {
        label: "Selbst betreibbar",
        icon: "server",
        group: "ops",
        note: "Ein Anwendungscontainer und eine Postgres-Datenbank auf Ihrem eigenen Server. Anhänge bleiben auf Ihrer Festplatte.",
        noteEli10:
          "Es läuft auf Ihrem eigenen Server, wie die Kaffeemaschine in der eigenen Küche. Ihre Daten müssen nie bei einer fremden Firma wohnen.",
      },
      {
        label: "Mehrmandantenfähig",
        icon: "layers-3",
        group: "ops",
        note: "Jede Zeile ist pro Mandant geführt, und die Sicherheit auf Zeilenebene von Postgres hält Arbeitsbereiche innerhalb einer Installation auseinander.",
        noteEli10:
          "Mehrmandantenfähig heißt: Mehrere Teams oder Unternehmen können eine Installation teilen, und die Datenbank selbst hält ihre Daten auseinander, nicht nur die Anwendung.",
      },
      {
        label: "Ereignisprotokoll mit Rückgängig",
        icon: "rotate-ccw",
        group: "work",
        note: "Jede Änderung ist ein Append-only-Ereignis. Rückgängig schreibt ein ausgleichendes Ereignis, statt die Historie umzuschreiben.",
        noteEli10:
          "Das Werkzeug führt ein Tagebuch, aus dem niemand Seiten herausreißen kann. Etwas zurücknehmen fügt eine neue Zeile an. Die alte Zeile bleibt lesbar.",
      },
      {
        label: "Keine Telemetrie",
        icon: "eye-off",
        group: "security",
        note: "Keine Analytik, kein Tracking, kein Nachhausetelefonieren. Zählungen von Agentenläufen zu Tokens und Kosten bleiben in Ihrer Datenbank.",
        noteEli10:
          "Das Werkzeug meldet nichts nach Hause. Niemand, auch die Hersteller nicht, sieht, wie Ihr Team es nutzt. Gegenüber Datenschutzbeauftragten bleibt weniger zu erklären.",
      },
      {
        label: "Single Sign-on",
        icon: "key-round",
        group: "security",
        note: "OIDC mit PKCE und einem geprüften ID-Token. Ihr Identitätsanbieter bleibt die maßgebliche Quelle für Personen.",
        noteEli10:
          "Personen melden sich mit dem Firmenkonto an, das sie bereits haben. Keine neuen Passwörter, die man erfindet, vergisst oder preisgibt.",
      },
      {
        label: "Zugriffsaudit",
        icon: "scroll-text",
        group: "security",
        note: "Zugriffsänderungen werden als Ereignisse festgehalten und lassen sich über die Audit-API wieder auslesen.",
        noteEli10:
          "Wenn sich der Zugriff einer Person ändert, schreibt das Werkzeug es auf. Später können Sie nachsehen, wer was tun durfte und seit wann.",
      },
      {
        label: "Wissensebene",
        icon: "library",
        group: "ai",
        note: "Runbooks, Richtlinien, Erinnerungen, externe Systeme und verwandte Projekte, die Agenten vor der Arbeit per Slug lesen.",
        noteEli10:
          "Die Anleitungen und Hausregeln des Teams stehen neben der Arbeit. KI-Helfer lesen sie zuerst, wie ein neuer Kollege das Handbuch liest.",
      },
      {
        label: "Hybride Suche",
        icon: "scan-search",
        group: "work",
        note: "Volltext auf Deutsch und Englisch, verbunden mit optionaler Ähnlichkeit über pgvector, und reine lexikalische Suche, wenn keine Embeddings konfiguriert sind.",
        noteEli10:
          "Die Suche versteht Deutsch und Englisch und findet auch, was dasselbe bedeutet, aber anders formuliert ist.",
      },
      {
        label: "Arbeitsaufträge und Läufe",
        icon: "ticket-check",
        group: "ai",
        note: "Arbeitsaufträge tragen Abnahmekriterien, Nachweise und ein Budget. Läufe halten Modell, Ergebnis, Dauer, Tokens und Kosten fest, nie den Prompt-Text.",
        noteEli10:
          "Jeder Auftrag für einen KI-Helfer hat eine Prüfliste, eine Ausgabengrenze und einen Nachweis, was erledigt wurde. Das Werkzeug zählt die Kosten, ohne zu speichern, was gesagt wurde.",
      },
      {
        label: "Stunden, Sätze und Angebote",
        icon: "timer",
        group: "work",
        note: "Stunden, effektive Stundensätze, Kosteneinheiten und Angebote mit einem öffentlichen Abnahmelink und einem PDF, im selben System wie die Arbeit.",
        noteEli10:
          "Stundenlisten, Preise und Angebote stehen neben der Arbeit, zu der sie gehören. Ein Kunde kann ein Angebot über einen Link annehmen, ohne ein weiteres Werkzeug.",
      },
      {
        label: "Import aus dem klassischen Paimos",
        icon: "database-zap",
        group: "ops",
        note: "Importiert Projekte aus dem klassischen Paimos, einschließlich Wissen, Anhänge und Angebote.",
        noteEli10:
          "Teams, die das frühere Paimos verwendet haben, bringen ihre Projekte, Notizen, Dateien und Angebote mit, statt von vorn zu beginnen.",
      },
      {
        label: "Skriptbar",
        icon: "braces",
        group: "work",
        note: "Die aeon CLI, die auch als paimos antwortet, und eine HTTP-API, beschrieben durch einen Vertrag nach OpenAPI.",
        noteEli10:
          "Andere Software kann automatisch mit Paimos sprechen. Ihre IT kann es mit den Werkzeugen verdrahten, die Sie schon bezahlen, statt Dinge abzutippen.",
      },
      {
        label: "INSPR-Übergaben",
        icon: "route",
        group: "ai",
        note: "Nimmt belegte Anforderungseingänge aus Aithema entgegen und hält Stufenübergaben an Pharos für die Bereitstellung und an Janus für den Zugang fest.",
        noteEli10:
          "Es arbeitet mit den Schwesterprodukten zusammen: Anforderungen kommen aus Aithema, und erledigte Arbeit geht mit einer Aufzeichnung an Pharos und Janus weiter.",
      },
      {
        label: "Releases mit Prüfsummen",
        icon: "file-check-2",
        group: "legal",
        note: "Getaggte Releases veröffentlichen Binärdateien mit SHA256SUMS und ein Container-Image, gebaut mit Provenienz-Attestierungen.",
        noteEli10:
          "Jedes Release trägt Fingerabdrücke, damit Sie prüfen können, dass das Heruntergeladene genau dem entspricht, was aus dem Quellcode gebaut wurde.",
      },
      {
        label: "Vollständig prüfbar",
        icon: "scan-search",
        group: "legal",
        note: "Quellcode unter AGPL und ein Vertrag nach OpenAPI. Nichts an der Funktionsweise ist verborgen.",
        noteEli10:
          "Nichts ist eine Blackbox. Ihre eigenen Fachleute, oder wen immer Sie beauftragen, können vor dem Vertrauen genau nachlesen, was die Software tut.",
      },
      {
        label: "AGPL-3.0",
        icon: "git-branch",
        group: "legal",
        note: "Frei prüfen, selbst betreiben, forken und verändern. Die Nutzer eines veränderten Dienstes behalten den Quellcode.",
        noteEli10:
          "Eine Standard-Open-Source-Lizenz, die Ihre Rechtsabteilung tatsächlich lesen kann: nutzen, ändern, behalten, und niemand kann Sie je einsperren.",
      },
      {
        label: "Made in Austria",
        icon: "mountain",
        group: "place",
        note: "Entworfen und gebaut in Österreich, in der EU, mit echten Menschen und EU-Normen hinter Ihrem Projektsystem.",
        noteEli10:
          "Gebaut in Österreich, unter EU-Recht: Ihre Zeitzone, Ihre Normen, Ihre Aufsichtsbehörden.",
      },
    ],
    glossary: [
      {
        id: "sso",
        term: "SSO / Single Sign-on",
        matches: ["melden sich mit dem Firmenkonto an"],
        body: "Ein Firmen-Login für viele Werkzeuge. Niemand muss für jede Anwendung ein neues Passwort erfinden und dann verlieren.",
      },
      {
        id: "oidc",
        term: "OIDC",
        matches: ["OIDC"],
        body: "Der offene Standard, der Single Sign-on zwischen Ihrem Identitätssystem und Anwendungen wie dieser möglich macht.",
      },
      {
        id: "pkce",
        term: "PKCE",
        matches: ["PKCE"],
        body: "Ein zusätzlicher Sicherheitsschritt im Login-Ablauf, der verhindert, dass gestohlene Login-Codes wiederverwendet werden.",
      },
      {
        id: "id-token",
        term: "ID-Token",
        matches: ["ID-Token"],
        body: "Die signierte Aussage Ihres Identitätsanbieters darüber, wer sich gerade angemeldet hat. Der Server prüft die Signatur selbst.",
      },
      {
        id: "identity-provider",
        term: "Identitätsanbieter",
        matches: ["Identitätsanbieter"],
        body: "Das System, dem Ihre Benutzerkonten gehören (etwa Entra ID oder ZITADEL). Anwendungen vertrauen ihm, statt eigene Passwörter zu verwahren.",
      },
      {
        id: "tenant",
        term: "Mandant",
        matches: ["Mandant", "Mehrmandantenfähig"],
        body: "Ein eigener Arbeitsbereich in einer gemeinsamen Installation, etwa ein Unternehmen oder ein Team, mit eigenen Daten und eigenen Personen.",
      },
      {
        id: "rls",
        term: "Sicherheit auf Zeilenebene",
        matches: ["Sicherheit auf Zeilenebene"],
        body: "Eine Funktion von Postgres, die jede einzelne Zeile gegen den aktuellen Arbeitsbereich prüft, sodass die Abfrage eines Mandanten die Daten eines anderen Mandanten nicht sieht.",
      },
      {
        id: "event-log",
        term: "Append-only-Ereignisprotokoll",
        matches: ["Append-only-Ereignis", "ausgleichendes Ereignis"],
        body: "Eine Aufzeichnung, in der neue Einträge nur angefügt werden. Nichts wird an Ort und Stelle geändert, die Historie bleibt vollständig.",
      },
      {
        id: "scope",
        term: "Scope",
        matches: ["Scope", "Scopes"],
        body: "Ein genau benanntes Recht, etwa Läufe lesen oder Eingang schreiben. Ein Agentenschlüssel hält eine feste Menge von Scopes.",
      },
      {
        id: "slug",
        term: "Slug",
        matches: ["Slug"],
        body: "Ein kurzer, stabiler Name für einen Eintrag, etwa deploy-checklist, den Agenten und Links statt eines Titels verwenden können.",
      },
      {
        id: "pgvector",
        term: "pgvector",
        matches: ["pgvector"],
        body: "Eine Erweiterung für Postgres, die Text mit ähnlicher Bedeutung findet, nicht nur dieselben Wörter.",
      },
      {
        id: "postgres",
        term: "Postgres",
        matches: ["Postgres-Datenbank"],
        body: "PostgreSQL, eine weit verbreitete Open-Source-Datenbank. Paimos speichert darin alles außer den Anhangsdateien.",
      },
      {
        id: "container",
        term: "Container",
        matches: ["Anwendungscontainer"],
        body: "Eine genormte Transportkiste für Software. Wenn Ihre IT Container betreibt (die meisten tun das), kann sie auch dieses System betreiben.",
      },
      {
        id: "telemetry",
        term: "Telemetrie",
        matches: ["Nachhausetelefonieren", "meldet nichts nach Hause"],
        body: "Nutzungsdaten, die eine Anwendung an ihren Hersteller sendet. Paimos sendet keine.",
      },
      {
        id: "api",
        term: "API",
        matches: ["HTTP-API"],
        body: "Die Steckdose, über die andere Software automatisch mit dieser Software spricht. Kein Mensch muss Daten abtippen.",
      },
      {
        id: "openapi",
        term: "OpenAPI",
        matches: ["OpenAPI"],
        body: "Eine standardisierte, maschinenlesbare Beschreibung einer API, sodass Werkzeuge sie prüfen und Clients daraus erzeugen können.",
      },
      {
        id: "cli",
        term: "CLI",
        matches: ["CLI"],
        body: "Die Kommandozeile: der Weg, auf dem Entwickler und Skripte das Werkzeug mit getippten Befehlen steuern.",
      },
      {
        id: "sha256sums",
        term: "SHA256SUMS",
        matches: ["SHA256SUMS", "Fingerabdrücke"],
        body: "Eine Liste kryptografischer Fingerabdrücke, einer je Release-Datei. Eine veränderte Datei passt nicht mehr zu ihrem Fingerabdruck.",
      },
      {
        id: "provenance",
        term: "Provenienz-Attestierung",
        matches: ["Provenienz-Attestierungen"],
        body: "Eine Aufzeichnung am Container-Image, wie und aus welchem Quellcode das Image gebaut wurde.",
      },
      {
        id: "agpl",
        term: "AGPL-3.0",
        matches: ["AGPL"],
        body: "Eine starke Open-Source-Lizenz: Alle dürfen die Software nutzen, lesen und verbessern, und Verbesserungen an einem öffentlichen Dienst müssen offen bleiben.",
      },
    ],
  },
  problem: {
    eyebrow: "Warum Paimos",
    title: "Fragmente brechen KI-Arbeit.",
    depths: {
      simple:
        "Das Ticket, die Anleitung und der Chat mit einem KI-Helfer kennen je einen Teil der Geschichte. Keines davon kann Ihnen sagen, wer was getan hat, mit welcher Erlaubnis, und was zurückkam.",
      technical:
        "Tickets tragen die Absicht, Runbooks das Verfahren und Chat-Transkripte die Versuche. Kein einzelnes System zeichnet für eine Arbeitseinheit Akteur, gelieferten Kontext, erteilte Befugnis und zurückgegebene Nachweise auf.",
    },
    lead:
      "Ein Ticket sagt, was sich ändern soll. Ein Runbook sagt, wie. Ein Chatfenster sagt, was ein Agent versucht hat. Keines dieser Systeme allein kann beantworten, wer gehandelt hat, welchen Kontext es erhalten hat, was es tun durfte und was zurückkam.",
    visualAlt:
      "Getrennte Stationen für Arbeit, Repository, Wissen und Nachweise laufen in einem gemeinsamen transparenten Projektregister zusammen, genutzt von einer Person und einem KI-Agenten.",
    visualCaption:
      "Eine Projektaufzeichnung verbindet Arbeit, Kontext, Befugnis und Nachweise.",
    items: [
      {
        title: "Kontext ist verstreut",
        icon: "unplug",
        body:
          "Anforderungen, Projektkonventionen und Betriebswissen liegen oft in verschiedenen Werkzeugen oder auf dem Rechner einer einzelnen Person. Jede neue Agentensitzung beginnt damit, das Projekt zu rekonstruieren.",
        meta: "Der Agent sieht eine Aufgabe, nicht das System darum herum.",
      },
      {
        title: "Befugnis ist implizit",
        icon: "eye-off",
        body:
          "Wenn die Rechte eines Agenten das sind, was sein Token gerade erlaubt, hat sie niemand entschieden und niemand kann sie nachprüfen. Prüfung und Verantwortung werden zum Ratespiel.",
        meta: "Befugnis braucht eine Grenze, eine Person und eine Aufzeichnung.",
      },
      {
        title: "Lieferung verliert ihre Nachweise",
        icon: "file-warning",
        body:
          "Arbeit kann vom Prompt zum Ergebnis gelangen, ohne dass Kriterien, Nachweise oder Kosten in die Projektaufzeichnung zurückkehren. Erledigt wird zur Behauptung statt zu einem prüfbaren Zustand.",
        meta: "Der Kreis ist unvollständig, bis Nachweise zurückkommen.",
      },
    ],
  },
  model: {
    handoff: {
      in: "freigegebener Anforderungssatz",
      out: "Staging-Build + Nachweise",
    },
    eyebrow: "So funktioniert es",
    title: "Das Projekt ist die Steuerungsebene.",
    depths: {
      simple:
        "Paimos legt die Arbeit, den Hintergrund, das Getane und den Beleg an einen Ort. Menschen und KI-Helfer sehen dasselbe Bild, und Menschen entscheiden.",
      technical:
        "Paimos verbindet Arbeitsbaum, Wissen, Arbeitsaufträge, Läufe und Berechtigungen in einem mandantenbezogenen Modell über einem Append-only-Ereignisprotokoll. Menschen planen und geben in demselben Modell frei, aus dem Agenten lesen und in das sie zurückberichten.",
    },
    lead:
      "Paimos verbindet Arbeit, Kontext, Befugnis und Nachweise in einem berechtigungsbewussten System. Menschen planen und geben in demselben Projektmodell frei, aus dem Agenten lesen und in das sie zurückberichten.",
    steps: [
      {
        number: "01",
        simple: "Beschreiben Sie die Arbeit und stimmen Sie einem Plan zu, bevor sie beginnt.",
        title: "Planen",
        visual: { x: 24, y: 18 },
        icon: "folder-kanban",
        body:
          "Formen Sie die Arbeit in einem dynamischen Baum: Epics, Tickets und Aufgaben, mit Arten und Bezeichnungen, die Ihr Arbeitsbereich festlegt. Typisierte Beziehungen, Releases und gespeicherte Ansichten halten ein großes Projekt lesbar. Anforderungen aus Aithema treffen als Entwürfe mit Belegen ein, die eine Person annimmt.",
        meta: "Von angenommenen Anforderungen zu einem geplanten Baum",
        signal: "Arbeitsbaum, Beziehungen und Releases",
        reference: {
          label: "Planungshierarchie",
          href: docsUrl("PLANNING_HIERARCHY.md"),
          external: true,
        },
      },
      {
        number: "02",
        simple: "Halten Sie die Anleitungen und das Projektwissen zusammen.",
        title: "Kontext",
        visual: { x: 22, y: 68 },
        icon: "book-open-check",
        body:
          "Schreiben Sie Runbooks, Richtlinien, Erinnerungen, externe Systeme und verwandte Projekte in die Wissensebene des Projekts. Agenten lesen Einträge per Slug, und der Graph zeigt, wie sie verbunden sind.",
        meta: "Projektwissen überlebt den aktuellen Rechner und die aktuelle Agentenlaufzeit",
        signal: "Wissenseinträge, Verknüpfungen und Graph",
        reference: {
          label: "Agenten-Integration",
          href: docsUrl("AGENT_INTEGRATION.md"),
          external: true,
        },
      },
      {
        number: "03",
        simple: "Geben Sie einem Agenten einen Auftrag, und entscheiden Sie, was er tun darf.",
        title: "Ausführen",
        visual: { x: 50, y: 40 },
        icon: "play",
        body:
          "Legen Sie die Arbeit in einen Arbeitsauftrag mit Abnahmekriterien und einem Budget. Eine registrierte Agentensitzung beansprucht den Lauf und arbeitet innerhalb der Scopes ihres Schlüssels. Für einen geschützten Schritt fragt sie eine Freigabe an, und die Anfrage wartet unter Needs you, bis eine Person entscheidet.",
        meta: "Explizite Befugnis vor der Arbeit, ruhige Aufsicht, solange der Lauf dauert",
        signal: "Arbeitsaufträge, Läufe und Freigaben",
        reference: {
          label: "Agenten-Integration",
          href: docsUrl("AGENT_INTEGRATION.md"),
          external: true,
        },
      },
      {
        number: "04",
        simple: "Prüfen Sie die Ergebnisse und die Aufzeichnung dessen, was geschehen ist.",
        title: "Nachweise",
        visual: { x: 77, y: 69 },
        icon: "file-check-2",
        body:
          "Ein Arbeitsauftrag ist erst erledigt, wenn jedes Kriterium abgehakt ist, Nachweise angehängt sind und kein Lauf mehr aktiv ist. Laufaufzeichnungen halten Modell, Ergebnis, Dauer, Tokens und Kosten fest, ohne den Prompt-Text zu speichern.",
        meta: "Was lief und was zurückkam, bleibt prüfbar",
        signal: "Kriterien, Nachweise und Laufaufzeichnungen",
      },
      {
        number: "05",
        simple: "Geben Sie das Ergebnis weiter, mit der Freigabe einer Person bei jedem Schritt.",
        title: "Übergabe",
        visual: { x: 50, y: 78 },
        icon: "badge-check",
        body:
          "Ein Release bewegt sich auf seinem Weg von Build über Deploy bis Access. Stufenübergaben an Pharos und Janus werden mit ihren Ergebnissen festgehalten, und Kunden können Angebote über einen öffentlichen Link annehmen.",
        meta: "Interne Wahrheit und die nächste Stufe bleiben verbunden",
        signal: "Festgehaltene Stufenübergaben und Annahme",
        reference: {
          label: "Release-Verifikation",
          href: docsUrl("RELEASE.md"),
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
          title: "Ein dynamischer Arbeitsbaum",
          icon: "list-tree",
          body:
            "Jeder Eintrag ist ein Knoten in einem Baum. Epics, Tickets und Aufgaben sind Arten, die Ihr Arbeitsbereich festlegt, sodass das Modell zum Projekt passt, nicht umgekehrt.",
          meta: "Arten und Bezeichnungen sind Konfiguration des Arbeitsbereichs",
          reference: {
            label: "Planungshierarchie",
            href: docsUrl("PLANNING_HIERARCHY.md"),
            external: true,
          },
        },
        {
          title: "Beziehungen mit Bedeutung",
          icon: "git-compare-arrows",
          body:
            "Blockiert, bezieht sich, setzt um, zitiert und dupliziert sind typisierte Beziehungen, keine Prosa, die in einer Beschreibung versteckt ist.",
          meta: "Fünf Beziehungstypen für die Arbeit",
        },
        {
          title: "Ansichten für die tägliche Arbeit",
          body:
            "Gespeicherte Filter, Sortierung und einstellbare Spalten für eine Liste oder eine Gliederung, dazu eine Tastatursuche über den ganzen Arbeitsbereich.",
          meta: "Gespeicherte Ansichten und eine Suche",
        },
        {
          title: "Massenänderung mit Rückweg",
          body:
            "Eine Massenbearbeitung läuft in einer Transaktion, schreibt je Eintrag ein Ereignis und lässt sich als ein Schritt rückgängig machen, solange diese Einträge unverändert sind. Einträge, die sich nicht ändern lassen, werden mit einer Begründung übersprungen.",
          meta: "Transaktionale Massenoperationen und explizite Überspringungen",
        },
        {
          title: "Releases und Wege",
          body:
            "Releases sind Teil des Baums. Die Wegansicht eines Projekts zeigt seine Stufe von Inspire bis Live und genau eine nächste Aktion, abgeleitet aus festgehaltenen Entscheidungen und nicht geraten.",
          meta: "Acht Stufen, eine nächste Aktion",
        },
        {
          title: "Stunden und kaufmännischer Kontext",
          body:
            "Stunden, effektive Stundensätze, Kosteneinheiten und Angebote stehen im selben System wie die Arbeit, sodass Aufwand und kaufmännischer Stand keine Nebentabelle brauchen.",
          meta: "Vom Aufwand zum angenommenen Angebot",
        },
      ],
    },
    {
      id: "agent-context",
      eyebrow: "Kontext",
      title: "Geben Sie Agenten das Projekt.",
      lead:
        "Ein Agent muss wissen, welche Regeln gelten, was das Team schon gelernt hat und wohin die Arbeit gehört. Paimos stellt diesen Kontext als strukturierte, berechtigungsbewusste Projektdaten bereit.",
      items: [
        {
          title: "Dauerhafte Wissensebene",
          icon: "library",
          body:
            "Runbooks, Richtlinien, Erinnerungen, externe Systeme und verwandte Projekte werden projekteigenes Wissen statt einer losen Sammlung maschinenlokaler Dateien.",
          meta: "Durchstöberbar, durchsuchbar und verknüpfbar",
        },
        {
          title: "Stabile Namen für Agenten",
          body:
            "Agenten lesen einen Eintrag über seine Art und seinen Slug, zum Beispiel paimos knowledge get runbook deploy-checklist --project KEY, sodass derselbe Verweis aus jedem Harness und aus der CLI funktioniert.",
          meta: "Ein Verweis, jedes Harness",
          reference: {
            label: "Agenten-Integration",
            href: docsUrl("AGENT_INTEGRATION.md"),
            external: true,
          },
        },
        {
          title: "Wissensgraph",
          icon: "waypoints",
          body:
            "Wechseln Sie beim Wissen eines Projekts von den Einträgen zum Graphen, um zu sehen, wie Runbooks, Richtlinien, Erinnerungen und Arbeitseinträge einander verknüpfen.",
          meta: "Einträge und Graph, ein Schalter",
        },
        {
          title: "Hybrider Abruf",
          body:
            "Die Suche führt deutschen und englischen Volltext mit optionaler Ähnlichkeit über pgvector zusammen. Ohne Embeddings-Endpunkt bleibt sie lexikalisch und funktioniert weiter.",
          meta: "Volltextsuche bleibt immer verfügbar",
        },
        {
          title: "Belegter Eingang",
          body:
            "Der Eingang aus Aithema trifft als Quellen, Transkriptabschnitte und Entwürfe mit Belegen ein. Ein Vorschlag ändert das Projekt nie von allein. Eine Person nimmt einen Entwurf an.",
          meta: "Anforderungen mit ihren Quellen",
        },
      ],
    },
    {
      id: "execution-control",
      eyebrow: "Ausführung",
      title: "Befugnis vor Aktion.",
      lead:
        "Ein Agent mit einem Token ist kein Agent mit einer Berechtigung. Paimos hält Schlüssel, Scopes, Freigaben, Budgets und Läufe explizit, statt sie zu einer mehrdeutigen Aktion zu verschmelzen.",
      items: [
        {
          title: "Fünf Agenten-Harnesses",
          icon: "workflow",
          body:
            "Sitzungen von Codex, Claude, Pi, Cursor und Grok registrieren sich beim Projekt und erscheinen während der Arbeit im Arbeitsbereich für Agenten: woran sie arbeiten, in welchem Tempo sie vorankommen und was sie von Ihnen brauchen.",
          meta: "Ein Arbeitsbereich für jeden Harness",
        },
        {
          title: "Abgegrenzte Schlüssel und Freigaben",
          icon: "sliders-horizontal",
          body:
            "Ein Agentenschlüssel hält eine feste Menge von Scopes, die bei jedem Aufruf zusammen mit den Berechtigungen seiner Rolle geprüft werden. Geschützte Schritte, etwa den Lauf eines anderen Agenten zu beanspruchen, Anforderungen vorzuschlagen oder ein Tor im Ablauf zu passieren, brauchen zusätzlich eine Freigabe: Der Agent fragt innerhalb seines Schlüssels an, eine Person genehmigt vor dem Ablauf der Anfrage, und der Widerruf schließt die Freigabe.",
          meta: "Der Schlüssel ist die Obergrenze; eine Person gibt die heiklen Schritte frei",
        },
        {
          title: "Arbeitsaufträge mit Budgets",
          body:
            "Arbeitsaufträge tragen Abnahmekriterien, Nachweise und ein Budget über alle ihre Läufe. Ist das Budget aufgebraucht, stoppt die weitere Zuweisung und der Auftrag wird als blockiert markiert. Die bereits entstandene Nutzung bleibt in der Aufzeichnung.",
          meta: "Ausgabengrenzen, die den nächsten Lauf stoppen",
        },
        {
          title: "Abgegrenzte Läufe",
          body:
            "Läufe werden eingereiht und vom zugewiesenen Agenten oder unter einer aktiven Freigabe beansprucht. Der Anspruch ist abgegrenzt, sodass nicht zwei Bearbeiter glauben können, denselben Lauf zu besitzen.",
          meta: "Ein Lauf, ein Inhaber",
        },
        {
          title: "Inhaltsfreie Telemetrie",
          body:
            "Laufaufzeichnungen halten das angeforderte und das wirksame Modell, das Ergebnis, die Dauer, die Tokens und die Kosten fest. Sie speichern keine Prompts, keine Antworten und keine lokalen Umgebungswerte.",
          meta: "Genug Nachweis zum Prüfen, ohne Geheimnisse zu Protokollen zu machen",
        },
      ],
    },
    {
      id: "customer-delivery",
      eyebrow: "Kaufmännisches",
      title: "Das Kaufmännische bleibt verbunden.",
      lead:
        "Aufwand, Preise und Angebote sollen nicht von der Arbeit abdriften, die sie beschreiben. Paimos hält sie im selben Mandanten und unter denselben Berechtigungen.",
      items: [
        {
          title: "Stunden und Sätze",
          icon: "timer",
          body:
            "Erfassen Sie Stunden je Zeitraum und sehen Sie effektive Stundensätze neben der Arbeit, zu der sie gehören.",
          meta: "Aufwand im selben Modell wie die Arbeit",
        },
        {
          title: "Kosteneinheiten",
          body:
            "Kosteneinheiten tragen die Sätze, aus denen die Preise der Angebote kommen. Sie sind kein System für die Rechnungsstellung.",
          meta: "Eine Preisquelle, klar benannt",
        },
        {
          title: "Angebote mit öffentlicher Annahme",
          icon: "badge-check",
          body:
            "Angebote werden entworfen, ausgestellt und über einen öffentlichen Link geteilt, auf dem der Kunde sie lesen, ein PDF herunterladen und annehmen kann. Öffentliches Lesen und die Annahme sind in der Häufigkeit begrenzt.",
          meta: "Von ausgestellt zu angenommen, ohne parallele Tabelle",
        },
      ],
    },
  ],
  audiences: {
    eyebrow: "Für Teams",
    title: "Schnell arbeiten. Verantwortlich bleiben.",
    lead:
      "Paimos ist dort am nützlichsten, wo Softwarelieferung, KI-gestützte Arbeit und Kundenverantwortung zusammentreffen. Jede Rolle sieht dieselbe Projektwahrheit aus einem anderen betrieblichen Blickwinkel.",
    items: [
      {
        title: "Engineering-Teams",
        body:
          "Geben Sie Menschen und Agenten denselben Arbeitsbaum, dasselbe Wissen und dieselbe Laufhistorie. Weniger Rekonstruktion von Kontext, ohne den Zugang der Agenten zu einem unsichtbaren Seitenkanal zu machen.",
        meta: "Planen, delegieren, prüfen und übergeben in einem Projektmodell",
      },
      {
        title: "Delivery- und Projektleitung",
        body:
          "Verfolgen Sie Beziehungen, Releases, Stunden und die Budgets der Arbeitsaufträge, während Agenten arbeiten, und sehen Sie auf dem Weg jedes Projekts die eine nächste Aktion.",
        meta: "Operative Lieferung ohne zweite Berichtswahrheit",
      },
      {
        title: "Kundenbetreuung",
        body:
          "Verbinden Sie Arbeit und Aufwand mit Angeboten, die Ihre Kunden über einen Link annehmen, ohne ihnen Zugang zum internen Arbeitsbereich zu geben.",
        meta: "Ein bewusster Weg von der Arbeit zur Annahme",
      },
      {
        title: "Plattform- und Sicherheitsteams",
        body:
          "Halten Sie Identität, Mandantentrennung, Scopes der Agenten und Freigaben in Betreiberhand. Prüfen Sie den Code und verifizieren Sie die Prüfsummen eines Releases vor der Bereitstellung.",
        meta: "Selbst gehostete Kontrolle mit dokumentierten Vertrauensgrenzen",
      },
    ],
  },
  architecture: {
    eyebrow: "Architektur",
    title: "Kompakt genug zum Verstehen.",
    lead:
      "Paimos bevorzugt einen kleinen, prüfbaren Betriebs-Fußabdruck: ein Anwendungsprozess und eine Datenbank, statt einer verteilten Plattform aus Pflichtdiensten.",
    paragraphs: [
      "Eine einzelne Go-Binärdatei stellt die Vue-Anwendung und die JSON-API bereit. Postgres 18 mit pgvector ist die maßgebliche Datenhaltung. Jede Zeile trägt ihren Mandanten, und die Sicherheit auf Zeilenebene setzt die Trennung durch. Die Migrationen sind eingebettet und werden beim Start angewendet.",
      "Anhänge werden auf der lokalen Festplatte gespeichert. Personen melden sich über einen OIDC-Identitätsanbieter an, den der Server erreichen kann. Agenten nutzen abgegrenzte API-Schlüssel. Ein Embeddings-Endpunkt und Webhook-Weckrufe sind optional und laufen nur, wenn ein Betreiber sie konfiguriert.",
      "Das Ereignisprotokoll ist die Historie: Jede Änderung wird angefügt, Rückgängig ist ein ausgleichendes Ereignis, und der Posteingang der Agenten sowie die laufende Bearbeitung von Angeboten übertragen Aktualisierungen an geöffnete Seiten.",
    ],
    flow: [
      "Browser, CLI und HTTP-API",
      "Ein Go-Dienst",
      "Vue-Oberfläche und JSON-API",
      "Postgres 18 mit pgvector, Sicherheit auf Zeilenebene",
      "OIDC für Personen; optionale Embeddings und Webhooks",
    ],
    facts: [
      "Ein Anwendungsprozess und eine Datenbank",
      "Kein verpflichtendes Redis, keine Message-Queue, kein Objektspeicher",
      "Container-Image und Release-Binärdateien",
      "Eingebettete Migrationen beim Start",
      "Mandantentrennung in der Datenbank durchgesetzt",
      "Append-only-Ereignisprotokoll mit Rückgängig",
    ],
  },
  trust: {
    eyebrow: "Vertrauen",
    title: "Vertrauen hinterlässt Nachweise.",
    lead:
      "Paimos belegt öffentliche Aussagen mit Code, Tests, Release-Prüfsummen und einer expliziten Liste der Grenzen. Das Ziel ist prüfbares Verhalten, kein Compliance-Theater.",
    items: [
      {
        title: "Identität und Autorisierung",
        body:
          "Personen melden sich über OIDC an, mit Authorization Code, PKCE und einem ID-Token, den der Server prüft. Agenten nutzen abgegrenzte API-Schlüssel, die nur als Hashes gespeichert sind. Jede API-Route deklariert die Berechtigung, die sie braucht.",
        meta: "INSPR betreibt es mit ZITADEL",
      },
      {
        title: "Mandantentrennung",
        body:
          "Jede Zeile trägt ihren Mandanten, und die Sicherheit auf Zeilenebene von Postgres prüft jede Zeile. Die Trennung bleibt bestehen, auch wenn die Anwendung das Filtern vergisst.",
        meta: "Trennung unterhalb der Anwendung durchgesetzt",
      },
      {
        title: "Berechtigungen der Agenten",
        body:
          "Der alltägliche Zugriff ergibt sich aus den Scopes des Agentenschlüssels, geschnitten mit seiner Rolle. Für geschützte Schritte beantragt ein Agent eine Freigabe nur für sich selbst und nur innerhalb seines Schlüssels. Eine Person entscheidet, bevor die Anfrage abläuft. Genehmigung, Ablehnung und Widerruf sind Ereignisse im Protokoll.",
        meta: "Geschützte Schritte werden nie standardmäßig gewährt",
      },
      {
        title: "Release-Integrität",
        body:
          "Getaggte Releases veröffentlichen Binärdateien mit SHA256SUMS und ein Container-Image auf GHCR, gebaut mit Provenienz-Attestierungen. Eine cosign-Signatur oder eine SBOM gibt es noch nicht.",
        meta: "Ein Release lässt sich auf den Build aus dem Quellcode zurückverfolgen",
        reference: {
          label: "Release-Verifikation",
          href: docsUrl("RELEASE.md"),
          external: true,
        },
      },
      {
        title: "Datenkontrolle",
        body:
          "Paimos enthält keine Analytik, keine Tracking-Pixel und keine Telemetrie an den Hersteller. Die Nutzung der Läufe bleibt in Ihrer Datenbank, und ausgehende Aufrufe gehen nur an den Identitätsanbieter und an die optionalen Dienste, die Sie konfigurieren.",
        meta: "Selbstbetrieb hält den Standard-Datenpfad in Betreiberhand",
      },
      {
        title: "Benannte Grenzen",
        body:
          "Die öffentlichen Nachweise benennen auch, was noch fehlt: Aufbewahrung, Export und Löschung pro Person und ein vollständiger Satz an MCP-Werkzeugen. Die unten genannten Grenzen sind Teil der Vertrauensgeschichte.",
        meta: "Grenzen bleiben Teil der Vertrauensgeschichte",
      },
    ],
  },
  integrations: {
    eyebrow: "Integrationen",
    title: "Offene Schnittstellen zuerst.",
    lead:
      "Paimos legt sein Projektmodell über dokumentierte Schnittstellen offen und ergänzt danach gezielte Pfade für Import, Agenten und die Produktfamilie.",
    items: [
      {
        name: "aeon und paimos CLI",
        status: "Eingebaut",
        description:
          "Eine Binärdatei für Tickets, Wissen, Suche, Projekte, Beziehungen, Anhänge und Agentensitzungen. Aufgerufen als paimos, behält es die klassische Befehlsform.",
      },
      {
        name: "HTTP-API und OpenAPI",
        status: "Eingebaut",
        description:
          "Eine JSON-API, deren Vertrag eine OpenAPI-3.1-Datei im Quellcode ist. aeon schema gibt die Knotenarten aus, die ein laufender Server kennt.",
      },
      {
        name: "Generisches OIDC",
        status: "Für Personen erforderlich",
        description:
          "Authorization Code mit PKCE und einem geprüften ID-Token. INSPR betreibt es mit ZITADEL.",
      },
      {
        name: "Codex, Claude, Pi, Cursor und Grok",
        status: "Agenten-Harnesses",
        description:
          "Lokale Agentensitzungen registrieren sich bei einem Projekt, beanspruchen Läufe, fragen Berechtigungen an und melden inhaltsfreie Telemetrie.",
      },
      {
        name: "aeon-agentd",
        status: "Lokaler Daemon",
        description:
          "Startet und beaufsichtigt Agentensitzungen auf einem Entwicklerrechner und meldet je Harness-Anmeldung ein Konto für das Arbeitstempo an.",
      },
      {
        name: "MCP",
        status: "Früh",
        description:
          "Ein stdio-Server für interaktive Agenten-Clients. Heute antwortet er mit whoami. Werkzeuge für Tickets, Wissen und Suche kommen noch. Dafür nutzen Sie die CLI oder die API.",
      },
      {
        name: "Klassisches Paimos",
        status: "Import",
        description:
          "Importiert Projekte aus dem klassischen Paimos, einschließlich Wissenseinträgen, Anhängen und Angeboten.",
      },
      {
        name: "Aithema",
        status: "Familie",
        description:
          "Speichert belegte Anforderungseingänge: Quellen, Transkriptabschnitte und Entwürfe, die eine Person annimmt.",
      },
      {
        name: "Pharos und Janus",
        status: "Familie",
        description:
          "Stufenübergaben zeichnen die Bereitstellung über Pharos und den Zugang über Janus auf, mit den Ergebnissen auf dem Weg des Releases.",
      },
      {
        name: "Embeddings-Endpunkt",
        status: "Optional",
        description:
          "Ein OpenAI-kompatibler Embeddings-Endpunkt, der Vektoren mit 1.536 Dimensionen liefert, auch einer auf Ihrer eigenen Hardware, ergänzt die Suche nach Bedeutung. Ohne ihn bleibt die Suche Volltext.",
      },
      {
        name: "Webhook-Weckrufe",
        status: "Optional",
        description:
          "Weckt den Prozess eines Agenten, wenn in seinem Projekt-Posteingang eine Nachricht eintrifft, statt regelmäßig nachzufragen.",
      },
    ],
  },
  limits: {
    eyebrow: "Betriebliche Eignung",
    title: "Nichts vorgaukeln.",
    lead:
      "Eine brauchbare Entscheidung für den Einsatz hängt an den Grenzen genauso wie an der Funktionsliste. Diese Grenzen beschreiben das aktuelle Release und keine künftige Roadmap.",
    items: [
      "Personen melden sich nur über einen OIDC-Identitätsanbieter an, den der Server erreichen kann. Lokale Anmeldung mit Passwort, TOTP und SAML gibt es nicht.",
      "Aufbewahrungsfristen und Endpunkte für Export oder Löschung pro Person gibt es noch nicht.",
      "Der MCP-Server ist früh und antwortet heute nur mit whoami. Für Tickets, Wissen und Suche nutzen Sie die CLI oder die HTTP-API.",
      "Kunden können die an sie gerichteten Angebote lesen, annehmen und herunterladen, über einen öffentlichen Link oder angemeldet als Empfänger. Ein allgemeines Kundenportal gibt es in diesem Release nicht.",
      "Der Eingang aus Aithema ist eine API. Eine Oberfläche für Sprache oder Mikrofon gibt es in der Anwendung nicht.",
      "Releases tragen SHA256SUMS und eine Build-Provenienz, keine cosign-Signaturen und keine SBOM.",
      "Paimos hat noch keine unabhängige Sicherheitsprüfung durch Dritte abgeschlossen.",
      "Es gibt keinen veröffentlichten Skalierungs-Benchmark. Eine Produktionsübernahme sollte repräsentative Projekte, Nutzerzahlen, Agenten und das Anhangsvolumen prüfen.",
      "Paimos hat eine responsive Weboberfläche, aber keine native Mobil-App.",
    ],
  },
  openSource: {
    eyebrow: "Open Source",
    title: "Offen durch Architektur, nicht durch Kampagne.",
    body:
      "PAIMOS AEON steht unter AGPL-3.0-only. Sie können es prüfen, selbst betreiben, forken und unter diesen Bedingungen verändern. Wenn Sie eine veränderte Fassung als Netzwerkdienst betreiben, behalten dessen Nutzer das Recht, den zugehörigen Quellcode zu erhalten. Open Source ist nicht die Hauptaussage. Es hält das Produkt, seine Vertrauensgrenzen und seine Zukunft prüfbar.",
    links: [
      {
        label: "GitHub-Repository",
        href: repositoryUrl,
        external: true,
      },
      {
        label: "Releases und Prüfsummen",
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
      question: "Was ist PAIMOS AEON?",
      answer:
        "Die siebte Generation von Paimos, veröffentlicht unter dem Namen AEON. Diese Generation ersetzt die Codebasis des klassischen Paimos durch ein mehrmandantenfähiges System aus Go und Postgres, gebaut für Menschen und Agenten, die gemeinsam arbeiten. Projekte des klassischen Paimos lassen sich importieren, samt Wissen und Anhängen.",
    },
    {
      question: "Ist Paimos ein Chatbot in einem Projektwerkzeug?",
      answer:
        "Nein. Agenten nehmen am Projektmodell teil, mit eigenen Schlüsseln, Scopes und Laufaufzeichnungen, doch Paimos bleibt ein System für Projektarbeit und Kontext. Arbeitsstand, Berechtigungen und Nachweise bleiben explizit.",
    },
    {
      question: "Kann ein Agent sich selbst mehr Rechte geben?",
      answer:
        "Nein. Schlüssel und Rolle eines Agenten legen fest, was er darf. Für geschützte Schritte kann er nur eine Freigabe innerhalb seines Schlüssels anfragen, und eine Person entscheidet. Genehmigung, Ablehnung und Widerruf werden als Ereignisse festgehalten.",
    },
    {
      question: "Braucht Paimos einen KI-Anbieter?",
      answer:
        "Nein. Planung, Wissen, Suche, Stunden und Angebote funktionieren ohne jedes Modell. Agenten bringen ihren eigenen Harness mit, und ein Embeddings-Endpunkt ist optional.",
    },
    {
      question: "Können wir unseren Identitätsanbieter verwenden?",
      answer:
        "Ja, jeden OIDC-Anbieter, der Authorization Code mit PKCE unterstützt. INSPR betreibt es mit ZITADEL. Eine lokale Anmeldung mit Passwort gibt es nicht, und SAML wird nicht unterstützt.",
    },
    {
      question: "Kann eine Installation mehreren Teams dienen?",
      answer:
        "Ja. Paimos ist mehrmandantenfähig: Jede Zeile trägt ihren Mandanten, und die Sicherheit auf Zeilenebene von Postgres hält die Arbeitsbereiche auseinander.",
    },
    {
      question: "Ist Paimos nur in der Cloud verfügbar?",
      answer:
        "Nein. Paimos ist selbst gehostet: ein Anwendungscontainer und eine Postgres-Datenbank. Für die Anmeldung von Personen braucht es einen erreichbaren OIDC-Anbieter. Alles Weitere außerhalb davon ist optional.",
    },
    {
      question: "Was kann ein Agent aus einem Projekt lesen?",
      answer:
        "Im Rahmen der Scopes seines Schlüssels und der Berechtigungen des Projekts kann ein Agent den Arbeitsbaum, die Beziehungen, Wissenseinträge per Slug, Suchergebnisse sowie seine eigenen Arbeitsaufträge und Läufe lesen.",
    },
    {
      question: "Wie verhält sich der kommerzielle Weg zum offenen Produkt?",
      answer:
        "Das Repository bleibt das Produkt. Augmentoring kann Architektur, Einführung, Integration und laufenden Betrieb rund um dieselbe offene Codebasis leisten, ohne sie durch eine geschlossene Ausgabe zu ersetzen.",
    },
  ],
  finalCta: {
    title: "Betreiben Sie es auf Ihre Weise.",
    body:
      "Stellen Sie Paimos aus dem öffentlichen Quellcode bereit und behalten Sie das gesamte Betriebsmodell unter Ihrer Kontrolle. Wenn Sie Architektur, Einführung, Integration oder laufenden Betrieb brauchen, bietet Augmentoring den kommerziellen Weg rund um dasselbe offene Produkt.",
  },
} satisfies ProductContent;
