import { siteUrls } from "../urls";
import type { ProductContent } from "../types";

const repositoryUrl = "https://github.com/inspr-at/janus";
const releaseUrl = "https://github.com/inspr-at/janus/releases";

// German edition of the Janus product page, served at janus.inspr.at/de/.
// Facts, links, icons and structure mirror ../janus.ts; only language-visible
// values differ. Keep both files in sync when product claims change.
export const janusContentDe = {
  slug: "janus",
  name: "Janus",
  category: "Governance für Geheimnisse",
  canonicalUrl: `${siteUrls.janus}/de/`,
  repositoryUrl,
  releaseUrl,
  license: {
    name: "AGPL-3.0-only",
    url: `${repositoryUrl}/blob/main/LICENSE`,
    note: "Das Janus-Repository deklariert die SPDX-Lizenz AGPL-3.0-only.",
  },
  seo: {
    title: "Janus | Governance für Geheimnisse: KI-Agenten, Dienste und Menschen | INSPR",
    description:
      "Mit Janus fordern KI-Agenten geheimnisgestützte Arbeit über opake Referenzen, richtliniengebundene Freigaben und geprüfte Ausführungspfade an, ohne dass Zugangsdaten das Modell erreichen.",
  },
  hero: {
    eyebrow: "GOVERNANCE FÜR GEHEIMNISSE IN MENSCH- UND AGENTENSYSTEMEN",
    title: "Geheimnisse nutzen. Werte verbergen.",
    lead:
      "Janus trennt, was verwendet werden darf, wer es anfordern darf und wohin es gehen darf. Menschen und KI arbeiten mit opaken Referenzen und engen, richtliniengebundenen Freigaben. Geheimniswerte bleiben in geprüften Ausführungspfaden.",
    alt: "Ein durchscheinendes Janus-Tor mit zwei Profilen trennt ein geschütztes Zugangsdatum von freigegebenen Mensch-, Dienst- und Agenten-Abläufen.",
    primaryLabel: "Das Modell erkunden",
    primaryHref: "#model",
  },
  serviceIntro:
    "Augmentoring bietet begleitete Janus-Architektur, Rollout und Betrieb.",
  proof: [
    "Veröffentlichte Rust-Engine",
    "MCP nur mit Referenzen",
    "Signierte Releases mit SBOM und Provenienz",
    "Wertfreie Aufsicht",
  ],
  problem: {
    eyebrow: "DAS PROBLEM",
    title: "Agenten sollten keine Zugangsdaten halten.",
    lead:
      "Ein Dienst braucht vielleicht wirklich ein Deployment-Zugangsdatum. Ein KI-Agent muss es selten lesen. Trotzdem geben viele Integrationen der Automatisierung noch ein wiederverwendbares Token, eine Umgebungsvariable oder ein generisches Vault-Lesewerkzeug.",
    visualAlt:
      "Ein KI-Agent legt einem transparenten Richtlinien-Tor eine opake Referenz vor, während das Zugangsdatum versiegelt bleibt und nur ein freigegebener Dienst einen engen Ausführungspfad erhält.",
    visualCaption:
      "Der Agent trägt eine Referenz. Die Richtlinie steuert die Nutzung. Der Wert bleibt versiegelt.",
    items: [
      {
        icon: "key-round",
        title: "Zugriff und Absicht fallen zu einer Operation zusammen",
        body:
          "Sobald ein Agent ein Zugangsdatum abrufen kann, trennt nur noch die Instruktion eine legitime Aufgabe von einem unbeabsichtigten Ziel. Prompt-Injection, ein schlechter Tool-Aufruf oder ein überberechtigter Workload machen aus nützlicher Automatisierung eine Geheimnispreisgabe.",
      },
      {
        icon: "timer-off",
        title: "Langlebige Zugangsdaten überleben den Auftrag",
        body:
          "Ein PAT oder eine Umgebungsvariable direkt im Workload lässt sich über die begründende Anfrage hinaus wiederverwenden. Das System verliert die Verbindung zwischen Zweck, Akteur, Ziel und Zeit.",
      },
      {
        icon: "scroll-text",
        title: "Audit-Logs erfassen oft den Zugriff, nicht die Nutzung",
        body:
          "Zu wissen, dass ein Wert gelesen wurde, beantwortet nicht, welcher geprüfte Befehl ihn erhielt, welcher Konsument davon abhing oder ob das angefragte Ziel der Richtlinie entsprach.",
      },
      {
        icon: "database-zap",
        title: "Die Backend-Wahl wird zur Architektur",
        body:
          "Steckt die Richtlinie in den Pfaden, Tokens und Clients eines Anbieters, wird jeder Wechsel des Verwahrsystems zum Sicherheitsumbau. Janus hält den Governance-Vertrag oberhalb des Backends.",
      },
    ],
  },
  model: {
    eyebrow: "DAS JANUS-MODELL",
    title: "Referenz. Freigabe. Ausführung.",
    lead:
      "Janus zerlegt eine breite Geheimnis-Lesebefugnis in drei enge und unabhängig testbare Entscheidungen.",
    steps: [
      {
        number: "01",
        icon: "list-tree",
        title: "SecretRef",
        visual: { x: 15, y: 50 },
        body:
          "Eine opake Referenz bezeichnet genau ein im Manifest deklariertes Geheimnis. Sie enthält keinen Wert, verrät keine Backend-Pfade und verleiht für sich keine Befugnis.",
        meta: "Stabiler Bezeichner, kein Zugangsdatum",
        signal: "Opake Identität ohne Wert und ohne Befugnis",
        reference: {
          label: "Den SecretRef-Typ prüfen",
          href: `${repositoryUrl}/blob/main/crates/janus-core/src/refs.rs`,
          external: true,
        },
      },
      {
        number: "02",
        icon: "ticket-check",
        title: "UsePermit",
        visual: { x: 55, y: 50 },
        body:
          "Eine kurzlebige Freigabe genehmigt eine profilgebundene Nutzung. Sie wird gegen Principal, Geltungsbereich, Executor, Ziel, Profil, Ablauf, Klassifizierung und Lebenszyklus-Zustand geprüft.",
        meta: "Eng, gebunden und optional einmalig",
        signal: "Ein Principal, ein Zweck, ein Ziel, eine Lebensdauer",
        reference: {
          label: "Die Freigabe-Richtlinie prüfen",
          href: `${repositoryUrl}/blob/main/crates/janus-core/src/policy.rs`,
          external: true,
        },
      },
      {
        number: "03",
        icon: "workflow",
        title: "Freigegebener Pfad",
        visual: { x: 80, y: 47 },
        body:
          "Ein geprüfter Befehl, eine private Dienstübergabe oder ein künftiger zweckgebundener Konnektor erhält den Wert intern. Der anfragende Agent kann kein neues Ziel wählen und das Klartext-Geheimnis nicht abrufen.",
        meta: "Die Richtlinie besitzt die Ausführungsgrenze",
        signal: "Der Wert wandert nur innerhalb des geprüften Executors",
        reference: {
          label: "Die Executor-Grenze prüfen",
          href: `${repositoryUrl}/blob/main/crates/janus-executor/src/lib.rs`,
          external: true,
        },
      },
    ],
    closing:
      "Eine Referenz ist kein Zugangsdatum. Eine Freigabe ist keine Befugnis für beliebige Arbeit. Der Executor prüft beides erneut, bevor ein Geheimniswert gelesen wird.",
  },
  featureSections: [
    {
      id: "capabilities",
      eyebrow: "FÄHIGKEITEN",
      title: "Eine bewusst begrenzte Oberfläche.",
      lead:
        "Die veröffentlichte Rust-Engine verbindet Entdeckung nur über Referenzen mit richtliniengebundener Ausführung, Lebenszyklus-Kontrollen und einem nativen verschlüsselten Speicher.",
      items: [
        {
          icon: "scan-search",
          title: "MCP nur mit Referenzen",
          body:
            "Janus Warden bietet genau vier Werkzeuge: sichere Deskriptoren auflisten, eine Referenz beschreiben, eine freigegebene Nutzung anfordern und den Zustand prüfen. Es gibt kein MCP-Werkzeug für Reveal, Set, Delete, Rotate oder rohes Auflösen.",
          meta: "list_secrets · describe_secret · request_use · health",
          reference: {
            label: "Die Warden-Werkzeuggrenze prüfen",
            href: `${repositoryUrl}/blob/main/crates/janus-warden/src/lib.rs`,
            external: true,
          },
        },
        {
          icon: "shield-check",
          title: "Manifest-Erlaubnisliste",
          body:
            "Nur im geprüften Manifest deklarierte Geheimnisse gelangen in den Broker. Antworten an das Modell verwenden kuratierte Labels und opake Referenzen statt roher Namen und Backend-Pfade.",
          meta: "Außerhalb des Katalogs gilt: standardmäßig verweigern",
        },
        {
          title: "Geprüfte Ausführung",
          body:
            "Managed-Command-Profile besitzen die ausführbare Datei, die exakt erlaubten Argumente, die Umgebungsbindung, Executor, Ziel, Laufzeitgrenzen und Konsumenten-Metadaten. Ein Preflight validiert das Profil ohne Freigabe und ohne Geheimnislesen.",
          meta: "Richtlinienfelder kommen nicht vom Aufrufer",
        },
        {
          title: "Private Dienstübergabe",
          body:
            "Janus kann atomar eine private Umgebungsdatei und einen optionalen SHA-256-Sidecar für einen geprüften Konsumenten rendern. Der Aufrufer kann weder Ausgabepfad noch Variablennamen, Ziel oder Rohwert vorgeben.",
          meta: "Freigabegebunden und wertfrei in der Befehlsausgabe",
        },
      ],
    },
    {
      id: "lifecycle",
      eyebrow: "LEBENSZYKLUS",
      title: "Jeden Lebenszyklus-Zustand regeln.",
      lead:
        "Ein sicherer Nutzungspfad ist unvollständig ohne Verantwortung, Rotation, Stilllegung und Nachweise, die die Operation überdauern.",
      items: [
        {
          icon: "user-round-check",
          title: "Verantwortung und Klassifizierung",
          body:
            "Verantwortliche Person, Klasse, Geltungsbereich, sicheres Label und Lebenszyklus-Metadaten werden vor der normalen Nutzung ausgewertet. Fehlende Verantwortung oder Klassifizierung blockiert freigegebene Nutzungspfade, statt zur undokumentierten Ausnahme zu werden.",
          meta: "Richtlinienklassen: normal · hochwertig · Break-glass",
        },
        {
          icon: "rotate-ccw",
          title: "Expliziter Lebenszyklus",
          body:
            "Janus modelliert die Zustände Entwurf, aktiv, rotierend, veraltet, deaktiviert, zur Löschung vorgemerkt und vernichtet. Deaktiviertes oder stillgelegtes Material kann nicht still in einen normalen Nutzungspfad zurückkehren.",
          meta: "Übergänge sind begründet und auditiert",
        },
        {
          title: "Rotation mit Rollback",
          body:
            "Generierte Zugangsdaten können mit verschlüsseltem Rollback-Material vorbereitet, validiert, in deklarierte Konsumenten geladen und festgeschrieben werden. Scheitert Validierung oder Reload, wird das vorherige Material wiederhergestellt.",
          meta: "Planen · vorbereiten · validieren · neu laden · festschreiben",
          reference: {
            label: "Den Rotationsvertrag prüfen",
            href: `${repositoryUrl}/blob/main/crates/janus-core/src/rotation.rs`,
            external: true,
          },
        },
        {
          title: "Stilllegung und Abgleich",
          body:
            "Wertfreie Tombstones bewahren Stilllegungsnachweise. Finalisierung und nur lesender Abgleich unterscheiden vollständigen Zustand, offene Arbeit und Drift. Die aktuelle Rust-Engine-Release-Linie wendet diesen Vertrag auf Pharos-Beacon-Zugangsdaten an.",
          meta: "Löschung beim Anbieter bleibt eine explizite eigene Operation",
        },
      ],
    },
    {
      id: "oversight",
      eyebrow: "MENSCHLICHE AUFSICHT",
      title: "Aufsicht ohne Entschlüsselung.",
      lead:
        "Die produktive Go-Hülle ist eine separate Aufsichtsebene nur für Metadaten. Sie gibt Menschen Betriebskontext, ohne den Browser zu einer weiteren geheimnistragenden Oberfläche zu machen.",
      items: [
        {
          icon: "badge-check",
          title: "Rollengeschützter Arbeitsbereich",
          body:
            "Die produktive Hülle verwendet die Rollen Admin, Auditor, Operator und Viewer über Katalog-, Anfrage-, Zugriffs-, Register-, Assurance- und Einstellungsflächen hinweg.",
          meta: "ZITADEL OIDC mit expliziten Rollenbindungen",
        },
        {
          icon: "scroll-text",
          title: "Wertfreie Nachweise",
          body:
            "Deskriptoren, Aktionsbelege, Zustandsansichten und Audit-Zeilen enthalten keine Geheimniswerte. Sensible Operationen werden blockiert, wenn Bereitschaft oder lokaler Audit-Speicher beeinträchtigt sind.",
          meta: "Jedes öffentliche Ergebnis nennt value_returned: false",
        },
        {
          title: "Hash-verkettetes lokales Register",
          body:
            "Audit-Einträge enthalten Anfrage-Korrelation, Schweregrad und die Verknüpfung zum vorherigen Ereignis. Die Hülle verifiziert die lokale Kette und zeigt der Auditor-Rolle geschwärzte Nachweise.",
          meta: "Nachweise, keine rohe Debug-Ausgabe",
          reference: {
            label: "Die Audit-Kettenintegrität prüfen",
            href: `${repositoryUrl}/blob/main/go-envelope/audit.go`,
            external: true,
          },
        },
        {
          title: "Heute kein Reveal-Pfad",
          body:
            "Der produktive Web-Container hat keine Entschlüsselungsidentität und kann kein Geheimnis offenlegen. Menschliches Reveal bleibt bewusst aufgeschoben, bis es sich umsetzen lässt, ohne diese Vertrauensgrenze umzukehren.",
          meta: "Die aktuelle Aufsicht arbeitet nur mit Metadaten",
        },
      ],
    },
  ],
  audiences: {
    eyebrow: "ECHTE ABLÄUFE",
    title: "Ergebnisse statt Zugangsdaten.",
    lead:
      "Die stärksten Janus-Anwendungsfälle sind konkrete, wiederholbare Abläufe, in denen der Aufrufer ein Ergebnis braucht, nicht den Besitz eines Zugangsdatums.",
    items: [
      {
        title: "Ein festes Deployment ausführen",
        body:
          "Ein Agent fordert ein benanntes Deployment-Profil an. Janus validiert Freigabe und exakte Argumente, injiziert das Zugangsdatum nur innerhalb des geprüften Executors und liefert ein bereinigtes Ergebnis zurück.",
        meta: "Für Plattform- und Release-Teams",
      },
      {
        title: "Einen Dienst ausstatten",
        body:
          "Ein Operator führt den Preflight einer Dienstübergabe aus, erteilt eine Genehmigung und eine Einmal-Freigabe und rendert dann eine private Umgebungsdatei am profilgebundenen Pfad.",
        meta: "Für Dienst- und Infrastrukturverantwortliche",
      },
      {
        title: "Ein generiertes Zugangsdatum rotieren",
        body:
          "Janus bereitet verschlüsseltes Rollback-Material vor, schreibt den Ersatz, führt die deklarierte Validierung aus, lädt bekannte Konsumenten neu und schreibt erst nach erfolgreichem Ablauf fest.",
        meta: "Für sicherheitskritische Operationen",
      },
      {
        title: "Ein Maschinen-Zugangsdatum stilllegen",
        body:
          "Ein hostgebundenes Zugangsdatum durchläuft Deaktivierungs- und Vernichtungsnachweise, während generierte Ausgaben entfernt werden und der Abgleich unvollständigen oder driftenden Zustand meldet.",
        meta: "Umgesetzt für Pharos-Beacon-Zugangsdaten",
      },
    ],
  },
  architecture: {
    eyebrow: "ARCHITEKTUR",
    title: "Zwei Ebenen. Eine Richtlinie.",
    lead:
      "Die Rust-Engine übernimmt Referenzen, Richtlinie, Freigaben, Speicherung, Ausführung, Rotation und Lebenszyklus. Die Go-Hülle ist die produktive menschliche Aufsichtsschicht.",
    paragraphs: [
      "KI-Clients erreichen Janus über Warden per MCP-stdio. Warden liefert modellsichere Deskriptoren und kann eine Freigabe anfordern, gibt aber nie ein Klartext-Geheimnis zurück und akzeptiert nie ein vom Aufrufer gewähltes Ziel, einen Executor oder eine Lebensdauer.",
      "Janusd verarbeitet geprüfte Profile und lokal übergebene Freigaben für verwaltete Befehle, private Umgebungsdateien, Genehmigungen, Rotation und Lebenszyklus-Operationen. Der Wert wandert nur in den freigegebenen Executor oder das Dienst-Artefakt.",
      "Die öffentliche Aufsichtsebene bleibt von der Geheimnisverarbeitung getrennt. Sie kann Katalogzustand, Zugriff, Anfragen und Nachweise erklären, ohne die age-Identität zu erhalten, die zum Entschlüsseln gespeicherten Materials nötig wäre.",
    ],
    flow: [
      "Absicht von Agent oder Operator",
      "Opake SecretRef",
      "Principal-, Geltungsbereichs- und Lebenszyklus-Prüfungen",
      "Geprüftes Profil und Genehmigung",
      "Kurzlebige UsePermit",
      "Freigegebener Executor",
      "Verschlüsseltes Backend oder Dienst-Konsument",
      "Wertfreies Ergebnis und Nachweise",
    ],
    facts: [
      "Die produktive Go-Hülle arbeitet nur mit Metadaten und führt nichts mit Geheimniswerten aus.",
      "Die veröffentlichte Rust-Engine liefert MCP-, age-, Genehmigungs-, Ausführungs-, Rotations- und Lebenszyklus-Bausteine.",
      "MCP-Transport ist heute lokales stdio. HTTP und mandantenfähiger Warden-Betrieb sind nicht ausgeliefert.",
      "Die Architektur ergänzt Verwahrsysteme, statt dynamische Geheimnisse, PKI oder Leasing nachzubauen.",
    ],
  },
  trust: {
    eyebrow: "VERTRAUENSMODELL",
    title: "Jede Grenze testen.",
    lead:
      "Janus verlässt sich nicht auf einen Prompt, um ein Geheimnis zu schützen. Die Kontrolle sitzt in Typen, geprüfter Konfiguration, Ausführungsbindungen und Negativpfad-Tests.",
    items: [
      {
        title: "Kein Geheimniswert über MCP",
        body:
          "Warden liefert kuratierte Metadaten und opake Bezeichner. Seine Smoke- und Test-Fixtures stellen sicher, dass modellgerichtete Ausgaben weder Fixture-Klartexte noch rohe Geheimnisnamen enthalten.",
      },
      {
        title: "Der Aufrufer definiert keine Richtlinie",
        body:
          "Ziel, Executor, Egress-Modus, ausführbare Datei, erlaubte Argumente und TTL kommen aus geprüften Profilen. Unbekannte, deaktivierte, unpassende oder unvollständige Profile schlagen geschlossen fehl.",
      },
      {
        title: "Freigaben sind eng",
        body:
          "Freigaben sind kurzlebig, können einmalig sein und sind an Principal-Kette, Geltungsbereich, Geheimnis, Profil, Executor und Ziel gebunden. Die Ausführung prüft diese Bindungen erneut, bevor ein Wert gelesen wird.",
      },
      {
        title: "Private lokale Übergabe",
        body:
          "Freigaben, Genehmigungen, Lebenszyklus, Tombstones und gerenderte Dienstdateien nutzen private Pfade, weisen unsichere Bezeichner ab und ersetzen atomar, wo der Vertrag es verlangt.",
      },
      {
        title: "Wiederherstellbare age-Verwahrung",
        body:
          "Das native age-Backend unterstützt mehrere Empfänger, private atomare Schreibvorgänge, Wiederherstellbarkeitsprüfungen, Empfängerwechsel und die Neuverschlüsselung des gesamten Speichers, ohne in administrativen Ergebnissen Klartext zurückzugeben.",
      },
      {
        title: "Release-Nachweise",
        body:
          "Engine- und Hüllen-Images sind schlüssellos signiert, von SPDX-SBOMs begleitet und mit Build-Provenienz-Attestierungen veröffentlicht. Die Release-CI testet genau den veröffentlichten Engine-Digest.",
        reference: {
          label: "Das Release-Assurance-Gate prüfen",
          href: `${repositoryUrl}/blob/main/scripts/assure-engine-release.sh`,
          external: true,
        },
      },
    ],
  },
  integrations: {
    eyebrow: "INTEGRATIONEN",
    title: "Ein Richtlinienvertrag. Explizite Backends.",
    lead:
      "Manifest, Referenzen, Richtlinie, Freigaben und Nachweise bleiben stabil, während Verwahrung und Konsumenten je Deployment variieren können. Status-Labels trennen umgesetzte Pfade von Roadmap-Absicht.",
    items: [
      {
        name: "age",
        status: "Veröffentlicht",
        description:
          "Native verschlüsselte Speicherung mit mehreren Empfängern, atomaren privaten Schreibvorgängen, Wiederherstellbarkeitsprüfungen, Neuverschlüsselung und Rollback für generierte Rotation.",
      },
      {
        name: "secretspec",
        status: "Veröffentlicht",
        description:
          "Ein geprüftes Manifest dient als Erlaubnisliste; ein gekapselter Adapter hält Backend-spezifische Typen aus dem Janus-Kernvertrag heraus.",
      },
      {
        name: "Model Context Protocol",
        status: "Veröffentlicht",
        description:
          "Ein lokaler stdio-Warden auf Basis von rmcp bietet modellsichere Entdeckung und Freigabe-Anfragen ohne Operation für Rohwerte.",
      },
      {
        name: "Nix und NixOS",
        status: "Veröffentlicht",
        description:
          "Der öffentliche Flake paketiert janusd und janus-warden. Signierte Multi-Architektur-Container-Images erscheinen über dasselbe Assurance-Gate.",
      },
      {
        name: "ZITADEL OIDC",
        status: "Live in der Aufsichtsebene",
        description:
          "Die produktive Go-Hülle verwendet OIDC, Nonce, PKCE und explizite Rollenbindungen für menschlichen Zugriff. Die breitere Automatisierung eingeladener Nutzer wird noch gehärtet.",
      },
      {
        name: "Pharos",
        status: "In der aktuellen Engine-Linie veröffentlicht",
        description:
          "Ein konkreter Stilllegungsvertrag behandelt ein Pharos-Beacon-Zugangsdatum mit dauerhaftem Lebenszyklus-Zustand, wertfreien Nachweisen und Abgleich.",
      },
      {
        name: "OpenBao und zentrale Verwahrung",
        status: "Geplant",
        description:
          "Zentrale Leases, dynamische Geheimnisse und hardwaregestützte Verwahrung gehören hinter die Janus-Broker-Grenze, aber eine allgemeine OpenBao-Integration ist nicht ausgeliefert.",
      },
      {
        name: "GitHub-App-Workflow-Dispatch",
        status: "Geplant",
        description:
          "Ein zweckgebundener Konnektor soll kurzlebigen Installationszugriff ausstellen und einen geprüften Workflow auslösen, ohne ein wiederverwendbares PAT in den Workload zu legen.",
      },
    ],
  },
  limits: {
    eyebrow: "AKTUELLER STAND",
    title: "Was ausgeliefert ist. Was nicht.",
    lead:
      "Janus ist ein frühes Produkt mit produktiven und veröffentlichten Komponenten. Es wird nicht als fertige Allzweck-Unternehmensplattform für Geheimnisse dargestellt.",
    items: [
      "Die produktive Go-Web-Hülle ist eine Aufsichtsebene. Sie vermittelt keine Geheimniswerte und ist mit der Rust-Engine noch nicht zusammengeführt.",
      "Die aktuelle Weboberfläche kann keine Geheimnisse offenlegen. Menschliches Reveal bleibt aufgeschoben, weil der Web-Container bewusst keine Entschlüsselungsidentität besitzt.",
      "Der veröffentlichte Warden nutzt lokales MCP-stdio. HTTP-Transport und mandantenfähiger Fernbetrieb sind nicht ausgeliefert.",
      "Native age-Speicherung und der secretspec-Adapter sind umgesetzt. Allgemeine Integrationen für OpenBao, OS-Schlüsselbund, Pass, KMS und HSM bleiben geplant oder deploymentspezifisch.",
      "Die produktive Hülle kennt vier Rollen: Admin, Auditor, Operator und Viewer. Das breitere Funktionstrennungsmodell des Entwurfs ist noch nicht vollständig umgesetzt.",
      "Die Engine liefert lokale wertfreie Audit-Verträge und dauerhafte lokale Register, aber entferntes Nur-Anfügen-Audit und SIEM-Export sind nicht ausgeliefert.",
      "Janus ist kein Passwortmanager für Menschen und bietet weder Browser-Autofill noch Mobil-Clients oder Passwort-Synchronisation.",
      "Eine Produktionsübernahme sollte mit expliziten Abläufen, einem geprüften Bedrohungsmodell, Wiederherstellungsnachweisen und benannter Betriebsverantwortung beginnen.",
    ],
  },
  openSource: {
    eyebrow: "OPEN SOURCE",
    title: "Jede Schicht prüfen.",
    body:
      "Janus ist öffentlich unter AGPL-3.0-only. Quellcode, Tests, Release-Workflows, Image-Signaturen, SPDX-SBOMs und Build-Provenienz-Attestierungen stehen für die aktive Rust-0.1.x-Engine-Linie und die Go-Aufsichtshülle bereit.",
    links: [
      {
        label: "GitHub-Repository",
        href: repositoryUrl,
        external: true,
      },
      {
        label: "Janus-Releases",
        href: releaseUrl,
        external: true,
      },
      {
        label: "Projektlizenz (AGPL-3.0-only)",
        href: `${repositoryUrl}/blob/main/LICENSE`,
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
      question: "Ersetzt Janus Vault oder OpenBao?",
      answer:
        "Nein. Produkte der Vault-Klasse sind Geheimnis-Engines und Verwahrsysteme. Janus ist die Richtlinien-, Nutzungs- und Aufsichtsgrenze oberhalb eines Backends. Eine künftige OpenBao-Integration soll dieselben agentengerichteten Regeln bewahren, statt einen allgemeinen Vault-Lesepfad zu öffnen.",
    },
    {
      question: "Kann ein KI-Agent über Janus ein Geheimnis lesen?",
      answer:
        "Nicht über Warden. Die MCP-Oberfläche hat keine Reveal- oder Rohauflösungs-Operation. Ein freigegebener Executor darf einen Wert intern für eine geprüfte Aufgabe nutzen, aber das Modell erhält nur sichere Metadaten, eine opake Referenz, den Freigabestatus und ein wertfreies Ergebnis.",
    },
    {
      question: "Können bestehende Dienste weiterhin Umgebungsvariablen erhalten?",
      answer:
        "Ja. Janus unterstützt eine freigabegebundene Übergabe per Umgebungsdatei, bei der das geprüfte Profil Zielpfad und Variablennamen besitzt. Die Datei ist privat, wird atomar geschrieben und taucht weder in Befehlsausgaben noch in Audit-Nachweisen auf.",
    },
    {
      question: "Kann die Weboberfläche Geheimnisse offenlegen?",
      answer:
        "Heute nicht. Die produktive Aufsichtshülle hat bewusst keine Entschlüsselungsidentität. Menschliches Reveal bleibt aufgeschoben, bis es sich umsetzen lässt, ohne diese Grenze zu schwächen.",
    },
    {
      question: "Welche Speicher-Backends sind bereit?",
      answer:
        "Native age-Speicherung und ein gekapselter secretspec-Adapter sind umgesetzt. Allgemeine Integrationen für OpenBao, OS-Schlüsselbund, Pass, KMS und HSM bleiben geplant oder deploymentspezifisch.",
    },
    {
      question: "Wie geht Janus mit Rotation um?",
      answer:
        "Für intern generierte Zugangsdaten mit deklarierten Konsumenten kann Janus verschlüsseltes Rollback-Material vorbereiten, einen Ersatz schreiben, ihn validieren, Konsumenten neu laden und erst nach Erfolg festschreiben. Externe Zugangsdaten, die Janus weder ausstellen noch validieren kann, bleiben manuell, statt als Ein-Klick-sicher dargestellt zu werden.",
    },
    {
      question: "Ist Janus produktionsreif?",
      answer:
        "Die Aufsichtshülle ist im Einsatz, und die Rust-Engine hat signierte Releases mit funktionierenden MCP-, Speicher-, Ausführungs- und Lebenszyklus-Bausteinen. Janus ist noch früh. Ein Produktions-Rollout sollte auf explizite Abläufe, Identität, Verwahrung, Wiederherstellung und verantwortlichen Betrieb zugeschnitten sein.",
    },
    {
      question: "Wie ist Janus lizenziert?",
      answer:
        "Das Repository deklariert AGPL-3.0-only. Sie können die Software unter diesen Bedingungen prüfen, selbst betreiben und verändern.",
    },
  ],
  finalCta: {
    title: "Die Grenze um echte Abläufe bauen.",
    body:
      "Augmentoring kann Geheimnis-Konsumenten erfassen, Nutzungsprofile definieren, Identität und Verwahrung integrieren, Janus bereitstellen und das entstehende System gemeinsam mit Ihrem Team betreiben.",
  },
} satisfies ProductContent;
