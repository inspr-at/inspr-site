import { products, statusLabels } from "../family";
import { siteUrls } from "../urls";
import type { ProductContent } from "../types";
import { pharosBlob, pharosRelease } from "../pharos";

// German edition of the Pharos product page, served at pharos.inspr.at/de/.
// Facts, links, icons and structure mirror ../pharos.ts; only language-visible
// values differ. Keep both files in sync when product claims change.
export const pharosContentDe = {
  slug: "pharos",
  name: "Pharos",
  category: "Serverzustand und Backup-Nachweise",
  canonicalUrl: `${siteUrls.pharos}/de/`,
  repositoryUrl: "https://github.com/inspr-at/pharos",
  releaseUrl: "https://github.com/inspr-at/pharos/releases",
  license: {
    name: "AGPL-3.0-only",
    url: `${pharosBlob}/LICENSE`,
    note: "Das Pharos-Repository deklariert die SPDX-Lizenz AGPL-3.0-only.",
  },
  seo: {
    title: "Pharos | Klarer Flottenbetrieb für Server und Backups",
    description: products.pharos.oneLiner.de,
  },
  hero: {
    sheet: {
      repo: "github.com/inspr-at/pharos",
      runtime: "Rust-Server plus ausgehender Meldedienst auf dem Host; kein eingehender Port am Host.",
      gate: "Backup-Nachweis, Build-Ergebnis, Autorisierung und eine explizite Bestätigung werden festgehalten, bevor der Host etwas anwenden darf.",
      artefact: "Host-Berichte, Backup- und Wiederherstellungsnachweise, das Prüfprotokoll.",
      interfaces: "UI, Meldedienst, OIDC",
      maturity: "frühes Release, AGPL-3.0-only",
    },
    eyebrow: "Pharos / Flottenbetrieb",
    title: "Flottenwahrheit vor Aktion.",
    depths: {
      simple:
        "Pharos zeigt den Menschen, die Ihre Server betreiben, was wirklich los ist: welche Maschinen gesund sind, welche von ihrer Konfiguration abweichen, ob Backups funktioniert haben und was noch zu tun ist. Eine Anfrage sieht nie so aus, als wäre sie schon passiert.",
      technical:
        "Pharos gibt Betreibern einen aktuellen Blick auf Hosts, Konfigurationsabweichungen, Backup-Zustand und Wartung. Beobachteter Zustand, deklarierte Absicht und offene Aktionen bleiben in getrennten Schichten, damit ein Vorschlag nie als Fakt erscheint.",
    },
    lead:
      "Pharos gibt Betriebsteams einen aktuellen Blick auf Server, Konfigurationsabweichungen, Backups und Wartung. Beobachteter Zustand, deklarierte Absicht und offene Arbeit bleiben getrennt. Eine Anfrage wird nie so dargestellt, als wäre sie schon Wirklichkeit geworden.",
    alt: "Ein Leuchtturm über einem ruhigen Netz verbundener Server",
    primaryLabel: "So funktioniert Pharos",
    primaryHref: "#model",
  },
  serviceIntro:
    "Augmentoring stellt Pharos rund um Ihre Infrastruktur bereit und betreibt es.",
  proof: [
    "Selbst gehostete Steuerungsebene",
    "Ausgehender Meldedienst auf dem Host",
    "ZITADEL OIDC",
    "Prüfbare Flotten-Nachweise",
  ],
  problem: {
    eyebrow: "Die Betriebslücke",
    title: "Die Lücken sind das Risiko.",
    depths: {
      simple:
        "Ein Server kann antworten und trotzdem still kaputtgehen. Ein Backup kann Erfolg melden, ohne zu belegen, dass sich etwas wiederherstellen lässt. Ein Knopf zur Bereitstellung kann funktionieren und keine Spur hinterlassen, was geprüft wurde. Pharos hält diese Fakten auseinander, statt sie zu vermischen.",
      technical:
        "Erreichbarkeit ist keine korrekte Konfiguration; ein erfolgreicher Backup-Job ist kein Wiederherstellungsnachweis; eine funktionierende Bereitstellungsaktion ist kein Prüfprotokoll. Pharos modelliert jedes davon als eigenes Signal, statt alles zu einer grünen Lampe zu verschmelzen.",
    },
    lead:
      "Ein Server kann auf einen Ping antworten, während seine Konfiguration abweicht. Ein Backup-Job kann erfolgreich sein, ohne zu belegen, dass sich etwas wiederherstellen lässt. Ein Knopf zur Bereitstellung kann funktionieren und trotzdem keinen belastbaren Nachweis hinterlassen, was geprüft wurde. Pharos führt diese Fakten zusammen, ohne so zu tun, als wären sie dasselbe.",
    visualAlt:
      "Ein Flotten-Observatorium empfängt getrennte Kanäle für Host-Herzschlag, Wiederherstellungs-Validierung und abgesicherte Änderungsnachweise.",
    visualCaption:
      "Herzschlag, Wiederherstellungsnachweis und geprüfte Änderung bleiben getrennte Wahrheiten.",
    items: [
      {
        title: "Zuletzt gesehen heißt nicht live",
        body:
          "Pharos leitet Erreichbarkeit aus serverseitig empfangenen Herzschlägen und dem erwarteten Meldetakt jedes Hosts ab. Historische Signale sind echte Meldungen, keine erzeugte Dekoration.",
        meta: "Live · Veraltet · Ausgefallen · Wartend",
        icon: "radio-tower",
      },
      {
        title: "Ein erfolgreiches Backup ist keine Wiederherstellung",
        body:
          "Backup-Aktualität und Prüfung der Wiederherstellbarkeit bleiben getrennt. Betreiber sehen, ob ein Job lief, ob das Repository geprüft wurde und ob der Wiederherstellungsnachweis noch aktuell ist.",
        meta: "Laufstatus · Repository-Prüfung · Wiederherstellungsnachweis",
        icon: "database-backup",
      },
      {
        title: "Ein Knopf ist kein Änderungsprozess",
        body:
          "Sensible Wartung beginnt mit einer Prüfung. Backup-Bereitschaft, Build-Ergebnisse, Autorisierung und explizite Bestätigung werden festgehalten, bevor der Ziel-Host irgendetwas anwenden darf.",
        meta: "Prüfen · Bestätigen · Anwenden · Verifizieren",
        icon: "shield-check",
      },
    ],
  },
  model: {
    handoff: {
      in: "Staging-Build + Nachweise",
      out: "Release auf deklariertem Host",
    },
    eyebrow: "Betriebsmodell",
    title: "Beobachten. Vergleichen. Freigabe. Verifizieren.",
    depths: {
      simple:
        "Eine einfache Regel: Was wahr ist, was wir wollen und was wir tun, bleibt getrennt. So ist die Flotte leichter zu verstehen und schwerer versehentlich kaputtzumachen.",
      technical:
        "Fakten, Absicht und Aktionen liegen in getrennten Schichten: beobachtete Berichte, deklarierte Konfiguration und abgesicherte Operationen. Die Trennung hält das Flottenmodell lesbar und macht versehentliche Zustandsänderungen strukturell schwer.",
    },
    lead:
      "Pharos folgt einer einfachen Regel: Fakten, Absicht und Aktionen gehören in verschiedene Schichten. Diese Trennung macht die Flotte leichter verständlich und schwerer versehentlich veränderbar.",
    steps: [
      {
        number: "01",
        simple: "Sehen Sie aktuelle Berichte darüber, wie es Ihren Servern geht.",
        title: "Beobachten",
        visual: { x: 30, y: 19 },
        body:
          "Ein kleiner Meldedienst sendet begrenzte, geheimnisfreie Fakten über eine ausgehende Verbindung: Herzschlagtakt, Nix-Aktualität, Kernel-Stand, Dienstzustand, Backup-Stand und optional grobe Standortdaten.",
        icon: "radio-tower",
        signal: "Frische Host-Nachweise, beim Empfang gestempelt.",
        reference: {
          label: "Den Host-Meldevertrag prüfen",
          href: `${pharosBlob}/crates/pharos-core/src/lib.rs#L3872-L3905`,
          external: true,
        },
      },
      {
        number: "02",
        simple: "Vergleichen Sie, was läuft, mit dem, was geplant war.",
        title: "Vergleichen",
        visual: { x: 29, y: 66 },
        body:
          "Pharos hält Laufzeitbeobachtungen getrennt von deklarierter Infrastrukturkonfiguration und Betreiberanfragen. Sie erkennen, was gerade läuft, was deklariert ist und was noch auf die Anwendung wartet.",
        icon: "git-compare-arrows",
        signal: "Beobachtet und deklariert bleiben getrennt.",
        reference: {
          label: "Das Fünf-Zustands-Wahrheitsmodell ansehen",
          href: `${pharosBlob}/README.md#L42-L48`,
          external: true,
        },
      },
      {
        number: "03",
        simple: "Prüfen und beurteilen Sie eine Änderung, bevor sie ausgeführt werden kann.",
        title: "Freigabe",
        visual: { x: 63, y: 50 },
        body:
          "Feste Wartungsabläufe verlangen die relevanten Prüfungen vor der Ausführung. Der Browser erzeugt einen Prüfvorgang; er sendet nie beliebige Befehle an einen Host.",
        icon: "shield-check",
        signal: "Keine Prüfung, keine befristete Ausführungsberechtigung, keine Aktion.",
        reference: {
          label: "Den abgesicherten Ablauf prüfen",
          href: `${pharosBlob}/README.md#L785-L825`,
          external: true,
        },
      },
      {
        number: "04",
        simple: "Prüfen Sie anhand aktueller Berichte, ob die Änderung funktioniert hat.",
        title: "Verifizieren",
        visual: { x: 86, y: 48 },
        body:
          "Nach einem Umschalten oder Neustart wartet Pharos auf frische Host-Nachweise, prüft den laufenden Kernel und gleicht das Ergebnis mit dem ursprünglichen Ablauf ab. Die Wiederherstellung verifiziert den Zustand, ohne die Änderung still zu wiederholen.",
        icon: "badge-check",
        signal: "Eine frische Meldung schließt den Kreis.",
        reference: {
          label: "Verifikation und Wiederherstellung nachvollziehen",
          href: `${pharosBlob}/README.md#L806-L824`,
          external: true,
        },
      },
    ],
    closing:
      "Angefragt, deklariert und angewendet sind drei verschiedene Zustände. Pharos bewahrt diese Unterscheidung vom Einstellungsbildschirm bis zur nächsten Host-Meldung.",
  },
  featureSections: [
    {
      id: "fleet",
      eyebrow: "Flottensicht",
      title: "Ruhig, solange gesund.",
      lead:
        "Flottenkarten und kompakte Zeilen zeigen dieselbe Betriebswahrheit: Host-Identität, Erreichbarkeit, letzte Meldung, Signalhistorie, Abweichungen, Backup-Stand und den Grund, warum ein Host Aufmerksamkeit braucht. Gesunde Systeme bleiben visuell ruhig. Fehlende Nachweise bleiben sichtbar, statt in einen grünen Status verwandelt zu werden.",
      items: [
        {
          title: "Herzschlag-Wahrheit",
          body:
            "Erreichbarkeit wird aus servergestempelten Meldungen und dem deklarierten Takt des Hosts abgeleitet. Wählbare Signalfenster zeigen die echte Eingangs-Historie, ehrliche Lücken eingeschlossen.",
          icon: "radio-tower",
          reference: {
            label: "Den Herzschlag-Vertrag lesen",
            href: `${pharosBlob}/crates/pharos-core/src/lib.rs#L3603-L3624`,
            external: true,
          },
        },
        {
          title: "Aufmerksamkeit ohne Alarmmüdigkeit",
          body:
            "Suche und Sortierung heben Hosts nach Bedarf, Name oder letzter Änderung hervor. Arbeitsplatzrechner dürfen ehrlich offline sein, ohne die Fehlalarme zu erzeugen, die nur von Dauerläufern erwartet werden.",
          icon: "list-filter",
        },
        {
          title: "Eine Flotte mit Ort",
          body:
            "Die optionale Karte kombiniert grobe, quellenbewusste Standortdaten mit gemessener Latenz eingehender Meldungen. Verborgene oder unbekannte Standorte bleiben unbekannt, statt geraten zu werden.",
        },
      ],
    },
    {
      id: "drift",
      eyebrow: "Konfiguration und Abweichungen",
      title: "Abweichungen früh erkennen.",
      lead:
        "Für NixOS-Hosts meldet Pharos, wie alt der aktive Flake-Lock ist, wie weit der Host hinter der deklarierten Konfiguration liegt und ob ein neuerer Kernel bereits vorbereitet ist. Andere Hosts nehmen über den portablen Meldedienst weiter an Erreichbarkeits-, Backup-, Standort- und Dienstmeldungen teil.",
      items: [
        {
          title: "Nix-Aktualität in klarer Sprache",
          body:
            "Betreiber sehen eine knappe Antwort wie das Alter der Lockdatei und die Commits hinter der deklarierten Konfiguration, statt Abweichungen aus einem Checkout und der Bereitstellungshistorie rekonstruieren zu müssen.",
          icon: "git-compare-arrows",
        },
        {
          title: "Laufend versus bereit",
          body:
            "Der Kernel-Stand unterscheidet die aktuell laufende Version von der in der aktiven Systemkonfiguration vorbereiteten. Ein nötiger Neustart ist ein Nachweis, keine Vermutung aus einem Zeitstempel der Bereitstellung.",
          icon: "binary",
        },
        {
          title: "Deklarierte Dienste, Laufzeitbeobachtungen",
          body:
            "Dienstkarten stammen aus einem versionierten deklarierten Manifest. Pharos legt nur begrenzte Laufzeitbeobachtungen und ausgewählte serverseitige Erreichbarkeitsprüfungen darüber, ohne diese Ergebnisse in die Konfigurationsabsicht zurückzuschreiben.",
        },
      ],
    },
    {
      id: "backups",
      eyebrow: "Backup-Stand",
      title: "Ein Lauf ist keine Wiederherstellung.",
      lead:
        "Pharos behandelt den Backup-Stand als Betriebssignal, nicht als Häkchen. Es unterscheidet gesunde, veraltete, fehlgeschlagene, fehlende und unbekannte Backups und verfolgt Validierungsnachweise getrennt vom letzten erfolgreichen Lauf.",
      items: [
        {
          title: "Wiederherstellungsnachweise haben Stufen",
          body:
            "Vorhandensein von Sicherungsständen, Repository-Prüfungen, Tests zum Einhängen oder Auflisten, isolierte Wiederherstellungsstichproben, Prüfsummenvergleiche und dokumentierte Wiederherstellungsübungen bleiben unterschiedliche Nachweisformen.",
          icon: "badge-check",
        },
        {
          title: "Natives Restic, offene Adaptergrenze",
          body:
            "Der Restic-Stand wird direkt erhoben. Borg, Kopia, Sicherungsstände des Anbieters und andere Systeme können über denselben bereinigten Statusdatei- oder Befehlsadapter melden, ohne Backup-Inhalte oder Zugangsdaten zu senden.",
          icon: "database-backup",
        },
        {
          title: "Schutz beginnt bei der Einrichtung",
          body:
            "Teams können festhalten, ob ein Backup erforderlich, extern, aufgeschoben oder bewusst nicht vorhanden ist. NixOS-Abläufe können einen prüfbaren Restic-Einrichtungsvorschlag erzeugen, statt unfertigen Schutz hinter einem abgeschlossenen Einrichtungsstatus zu verstecken.",
        },
      ],
    },
    {
      id: "onboarding",
      eyebrow: "Einrichtung",
      title: "Jeder Host beginnt mit einer Vorprüfung.",
      lead:
        "Die Provisionierung erfolgt betreut, ein Server nach dem anderen. Der Einrichtungsassistent hält jeweils eine Entscheidung im Blick, sichert Zwischenstände und wartet auf erste Host-Nachweise, bevor die Einrichtung als abgeschlossen gilt.",
      items: [
        {
          title: "Bestehende Linux-Server",
          body:
            "Pharos prüft SSH-Route, Betriebssystem, Rechtepfad, freien Speicher und vorhandene Backup-Signale, bevor eine automatisierte Übergabe festgehalten wird. Eine gescheiterte Vorprüfung liefert einen konkreten nächsten Schritt statt einer halben Installation.",
          icon: "server-cog",
        },
        {
          title: "NixOS und portable Pfade",
          body:
            "NixOS-Hosts können das native Modul und den abgesicherten nixos-anywhere-Pfad nutzen. Andere Linux-Hosts verwenden das gehärtete systemd-Installationsprogramm für den Meldedienst mit privater Laufzeit-Token-Datei.",
          icon: "network",
        },
        {
          title: "Anbieter-gestützte Jobs",
          body:
            "Das geprüfte Job-Modell deckt Provisionierung, Ersteinrichtung, ersten Herzschlag und Backup-Stand ab. Authentifizierte Nur-Lese-Anbieterprüfungen sind live; verwaltete Anlage läuft nur mit jeder Voraussetzung und einer begrenzten Autorisierung, und das Aufräumen eines erfassten Servers braucht Betreiberzugriff, eine explizite Bestätigung und einen verifizierten Eigentumsabgleich.",
        },
      ],
    },
    {
      id: "guarded-actions",
      eyebrow: "Abgesicherte Aktionen",
      title: "Änderung durch eine Freigabe.",
      lead:
        "Pharos unterstützt bewusst wenige Betriebsaktionen: Einstellungsänderungen, einen gemeinsamen System-Update-Vorschlag, Update und Neustart pro Host, Wiederherstellung und Host-Stilllegung. Jede beginnt mit einer Prüfung und zeigt einen klaren nächsten Schritt.",
      items: [
        {
          title: "Prüfung vor Ausführung",
          body:
            "Der Ablauf validiert das Ziel, hält geänderte Bereiche fest und verlangt, wo zutreffend, Auswertung über alle Hosts, Ziel-Build, frisches Backup und Nachweise für das Zurücksetzen.",
          icon: "shield-check",
          reference: {
            label: "Die persistierten Ablaufphasen prüfen",
            href: `${pharosBlob}/README.md#L806-L819`,
            external: true,
          },
        },
        {
          title: "Begleitete Änderungsgrenze",
          body:
            "Autorisierung und explizite Bestätigung erfolgen unmittelbar vor einer festen ziel-lokalen Phase. Ein Host-Agent übernimmt nur die geprüfte Phase und kann den Ablauf nicht in einen allgemeinen Befehlskanal verwandeln.",
          icon: "key-round",
        },
        {
          title: "Verifikation nach dem Neustart",
          body:
            "Pharos beobachtet Ausfall und Rückkehr des Herzschlags, verifiziert Kernel und Host-Gesundheit, bewahrt typisierte Fehlernachweise und bietet begrenzte Wiederherstellung, ohne ein erfolgreiches Umschalten oder einen Neustart zu wiederholen.",
        },
        {
          title: "Die Verwaltung stilllegen, nicht die Maschine",
          body:
            "Host entfernen widerruft die Meldeberechtigung und legt eigene Deklarationen und Zugangsdaten über die jeweils zuständigen Systeme still. Server, Platten, Dienste oder Anwendungsdaten werden nicht gelöscht.",
        },
      ],
    },
  ],
  audiences: {
    eyebrow: "Für wen",
    title: "Gebaut für kleine Flotten.",
    lead:
      "Pharos ist dort am nützlichsten, wo eine kleine Gruppe eine gemischte Flotte verantwortet und klare Betriebsnachweise braucht, ohne eine weitere unbeschränkte Automatisierungsfläche einzuführen.",
    items: [
      {
        title: "Kleine Plattform- und Betriebsteams",
        body:
          "Halten Sie kundennahe Server, interne Dienste und Arbeitsplatzrechner in einer ruhigen Ansicht und behalten Sie die explizite Hoheit über Konfiguration und Änderungsfreigabe.",
      },
      {
        title: "Beratungen und verwaltete Umgebungen",
        body:
          "Trennen Sie den Host-Zugriff jeder Person, bewahren Sie Prüfnachweise und machen Sie Backup-Stand und Konfigurationsabweichungen sichtbar, bevor Wartung beginnt.",
      },
      {
        title: "NixOS-lastige Infrastruktur",
        body:
          "Verbinden Sie den deklarierten Infrastrukturzustand mit dem tatsächlich laufenden System, ohne dass eine Übersicht still zur maßgeblichen Quelle wird.",
      },
    ],
  },
  architecture: {
    eyebrow: "Architektur",
    title: "Kleiner Kern. Harte Grenzen.",
    lead:
      "Pharos ist ein Cargo-Workspace mit gemeinsamen Verträgen zwischen Server und Meldedienst. So kann ihr Meldeschema nicht unabhängig auseinanderdriften.",
    paragraphs: [
      "Die Steuerungsebene nutzt axum, servergerendertes HTML und eine kleine JavaScript-Schicht ohne zusätzliches Framework über stabilen JSON-APIs. Ein Meldedienst auf dem Host meldet über eine ausgehende Verbindung, während der Browser das abgeglichene Flottenmodell liest und Prüfvorgänge für die festen Aktionen anlegt, die Pharos kennt.",
      "Versionierte Konfiguration liefert die deklarierte Host- und Dienstabsicht. Janus verantwortet Maschinen-Zugangsdaten und sichere Anbieter-Übergaben. ZITADEL liefert menschliche Identität, während die endgültige Autorisierung pro Host bei Pharos bleibt.",
      "Der Zustand wird heute als JSON persistiert. Das hält die Bereitstellung kompakt und die Backup-Grenze explizit. SQLite bleibt eine bedarfsgetriebene Zukunftsoption, kein Architekturversprechen.",
    ],
    flow: [
      "NixOS- oder Linux-Host",
      "pharos-beacon meldet ausgehend",
      "pharosd: typisierter Zustand und Abläufe",
      "Autorisierte Betreiberübersicht",
    ],
    facts: [
      "Cargo-Workspace, geteilt von Steuerungsebene und Meldedienst",
      "Docker-Compose-Vorlage zum eigenen Betrieb",
      "Natives NixOS-Modul",
      "Portables Linux-systemd-Installationsprogramm",
      "Optionale JSON-Persistenz",
      "Servergerenderte Oberfläche mit kleiner JavaScript-Brücke",
    ],
  },
  trust: {
    eyebrow: "Vertrauensgrenzen",
    title: "Geheimnisse bleiben hinter der Oberfläche.",
    lead:
      "Menschliche Identität, Maschinenidentität, Anbieter-Zugangsdaten und Betriebsnachweise haben getrennte Pfade. Pharos zeigt die Fakten, die ein Betreiber braucht, ohne Geheimniswerte in Browser oder Ablaufhistorie zu bewegen.",
    items: [
      {
        title: "Menschlicher Zugriff",
        body:
          "ZITADEL liefert OIDC-Identität. Pharos wendet seine eigene Betreiber- und Pro-Host-Zugriffsrichtlinie an, mit einer standardmäßig leeren Ansicht für angemeldete Nutzer ohne Berechtigungen.",
        reference: {
          label: "Zugriffsrechte mit standardmäßiger Ablehnung prüfen",
          href: `${pharosBlob}/crates/pharosd/src/auth.rs#L1066-L1092`,
          external: true,
        },
      },
      {
        title: "Maschinenzugriff",
        body:
          "Meldedienst-Tokens pro Host werden einmal ausgegeben und über Hash verifiziert. Janus kann das Token-Material verantworten und wertfreie Prüfdateien für die Steuerungsebene rendern.",
      },
      {
        title: "Wertfreie Abläufe",
        body:
          "Anbieter-Zugangsdaten, rohe Meldedienst-Tokens, Shell-Befehle, Maschinenpfade und Befehlsausgaben sind aus Browser-Zustand, persistierten Jobs und bereinigten Ablaufnachweisen ausgeschlossen.",
      },
      {
        title: "Eingeschränkter Host-Dienst",
        body:
          "Der native Meldedienst läuft als unprivilegierter Systemnutzer mit no-new-privileges, striktem Dateisystemschutz, eingeschränkten Namespaces und einem schmalen Satz an Netzwerk-Adressfamilien.",
        reference: {
          label: "Härtung des Meldedienstes prüfen",
          href: `${pharosBlob}/nix/modules/pharos-beacon.nix#L239-L270`,
          external: true,
        },
      },
    ],
  },
  integrations: {
    eyebrow: "Integrationen",
    title: "Reifegrad bleibt sichtbar.",
    lead:
      "Pharos verwendet Reifegradangaben, damit ein geplanter Konnektor nie wie ein produktionsreifer Pfad aussieht.",
    items: [
      {
        name: "Paimos-Werkzeugvertrag",
        status: statusLabels.planned.de,
        description:
          "Paimos soll Flotten- und Bereitstellungsarbeit über den gemeinsamen Vertrag anfragen. Pharos läuft heute eigenständig.",
      },
      {
        name: "Temporäre CI- und Labor-VMs",
        status: statusLabels.planned.de,
        description:
          "Temporäre virtuelle Maschinen für CI und Laborarbeit sind geplant; die heutige Provisionierung erfolgt betreut, ein Server nach dem anderen.",
      },
      {
        name: "NixOS und deklarative Konfiguration",
        status: "Nativ",
        description:
          "Deklarierter Zustand, Aktualität, Kernel-Stand, Host-Präferenzen und abgesicherte Lebenszyklus-Abläufe.",
      },
      {
        name: "Standard-Linux",
        status: "Nativ",
        description:
          "Portabler ausgehender systemd-Meldedienst mit lokalem privatem Zustand und ohne eingehenden Listener.",
      },
      {
        name: "ZITADEL",
        status: "Nativ",
        description:
          "Menschliche OIDC-Anmeldung. Die endgültige Betreiber- und Host-Autorisierung bleibt in Pharos.",
      },
      {
        name: "Janus",
        status: "Integriert",
        description:
          "Prüfdateien für Meldedienst-Tokens, Stilllegung eigener Zugangsdaten und wertfreie sichere Einrichtungs-Übergaben.",
      },
      {
        name: "Restic",
        status: "Nativ",
        description:
          "Backup-Aktualität, Fehler- und Validierungsstand ohne Backup-Inhalte oder Zugangsdaten.",
      },
      {
        name: "Andere Backup-Systeme",
        status: "Adapter",
        description:
          "Typisierter bereinigter Statusdatei- oder Befehlsvertrag für Borg, Kopia, Sicherungsstände des Anbieters und andere Systeme.",
      },
      {
        name: "Hetzner Cloud",
        status: "Nur-Lese live",
        description:
          "Authentifizierte Verbindungs-, SSH-Schlüssel-, Firewall-, Katalog- und Preisprüfungen sind live und nur lesend. Verwaltete Anlage bleibt deaktiviert, bis der Betreiber jede Voraussetzung und eine begrenzte Autorisierung bereitstellt; dann folgt sie persistierter Prüfung, Autorisierung und einem expliziten Anlegen.",
      },
      {
        name: "netcup",
        status: "Geführt",
        description:
          "Externe Bestellung, gefolgt vom Importpfad für bestehende Hosts. Pharos behauptet keine nicht unterstützte Provisionierungs-API.",
      },
      {
        name: "AWS, Google Cloud und Oracle Cloud",
        status: "Geführt",
        description:
          "Geführter Import eines bestehenden Hosts; Pharos verspricht weder Bestellung, Abrechnung noch Gratis-Kontingente. Ein nativer Konnektor wird erst angeboten, wenn er Berechtigung, Kontingent, Region, Ablauf, Budget und Kapazität live verifiziert.",
      },
    ],
  },
  limits: {
    eyebrow: "Bewusste Grenzen",
    title: "Grenzen mit Absicht.",
    lead:
      "Eine kleinere Betriebsfläche ist leichter zu durchdenken. Pharos konzentriert sich auf Flottenzustand und abgesicherte Änderung, während Spezialsysteme ihre Spezialaufgaben behalten.",
    items: [
      "Pharos ist keine generische Metrik-Plattform, kein Log-Lager, kein System zur Ablaufverfolgung und keine Fernzugriffs-Shell.",
      "Es gibt keinen Kanal für beliebige Befehle. Ziel-Agenten übernehmen nur feste, schema-validierte Ablaufphasen.",
      "Pharos ersetzt keine spezialisierten Systeme zur Überwachung von Containern oder KI-Agenten.",
      "Ein erfolgreicher Backup-Lauf wird ohne separaten Validierungsnachweis nicht als Nachweis der Wiederherstellung dargestellt.",
      "Eine zusammengeführte Deklaration gilt erst als angewendet, wenn der Host den passenden Wert meldet.",
      "Das Entfernen eines Hosts löscht weder Server noch Platten, Dienste oder Anwendungsdaten.",
      "Persistenz ist heute JSON, menschliche Sitzungen liegen im Speicher. Nach einem Server-Neustart ist eine erneute Anmeldung nötig.",
      "Authentifizierte Hetzner-Anbieterprüfungen sind live und nur lesend. Verwaltete Anlage läuft nur mit jeder Voraussetzung und einer begrenzten Autorisierung; netcup, AWS, Google Cloud und Oracle Cloud nutzen geführte Importpfade.",
    ],
  },
  openSource: {
    eyebrow: "Quellcode und eigener Betrieb",
    title: "Betreiben Sie es zu Ihren Bedingungen.",
    body:
      `Das aktuelle Release ${pharosRelease.version} (Kalenderversion, ${pharosRelease.date}) umfasst Steuerungsebene, Meldedienst, Docker-Compose-Vorlage, NixOS-Modul und portables Installationsprogramm. Der vollständige Quellcode und die Release-Nachweise liegen im Pharos-Repository unter AGPL-3.0-only; jeder auf dieser Seite verlinkte Quellcode-Auszug stammt aus diesem Release.`,
    links: [
      {
        label: "Quell-Repository",
        href: "https://github.com/inspr-at/pharos",
        external: true,
      },
      {
        label: "Projektlizenz (AGPL-3.0-only)",
        href: `${pharosBlob}/LICENSE`,
        external: true,
      },
      {
        label: "Offizieller AGPL-Text",
        href: siteUrls.agpl,
        external: true,
      },
      {
        label: "Pharos-Releases",
        href: "https://github.com/inspr-at/pharos/releases",
        external: true,
      },
    ],
  },
  faq: [
    {
      question: "Ist Pharos nur für NixOS?",
      answer:
        "Nein. NixOS erhält die tiefste deklarative Integration, einschließlich Aktualität und abgesicherter Abläufe zum Neubau des Systems. Andere Linux-Systeme können den portablen systemd-Meldedienst für Erreichbarkeits-, Backup-, Standort- und Dienstmeldungen nutzen.",
    },
    {
      question: "Führt Pharos beliebige Befehle auf Hosts aus?",
      answer:
        "Nein. Ziel-Agenten können nur feste, schema-validierte Ablaufphasen übernehmen. Der persistente Ablaufeintrag kann keine Shell-Befehle, Zugangsdaten oder rohen Befehlsausgaben enthalten.",
    },
    {
      question: "Ersetzt Pharos Prometheus, Grafana oder eine Log-Plattform?",
      answer:
        "Nein. Pharos liefert Flottenzustand, Abweichungen, Backup-Nachweise und abgesicherte Betriebsabläufe. Detaillierte Metriken, Aufzeichnungen von Abläufen und Protokolle können in Spezialsystemen bleiben.",
    },
    {
      question: "Führt Pharos meine Backups aus?",
      answer:
        "Pharos kann den Backup-Stand beobachten und bei der Aufnahme neuer Hosts die Backup-Einrichtung begleiten. Restic hat einen nativen Kollektor. Backup-Daten und Zugangsdaten bleiben im Backup-System, nicht in Pharos.",
    },
    {
      question: "Was passiert, wenn ich einen Host entferne?",
      answer:
        "Der Meldezugriff wird widerrufen und Pharos verwaltet den Host nicht weiter. Deklarative und Janus-eigene Einträge folgen ihrem eigenen geprüften Stilllegungspfad. Der Server und seine Anwendungsdaten werden nicht gelöscht.",
    },
    {
      question: "Wie werden Menschen authentifiziert?",
      answer:
        "ZITADEL liefert OIDC-Identität. Pharos wendet danach seine eigene Betreiber- und Pro-Host-Zugriffsrichtlinie an. Die Maschinen-Authentifizierung der Meldedienste ist davon getrennt.",
    },
    {
      question: "Wie steht es um verwaltete Cloud-Provisionierung?",
      answer:
        "Authentifizierte Hetzner-Cloud-Verbindungs-, SSH-Schlüssel-, Firewall-, Katalog- und Preisprüfungen sind live und nur lesend. Verwaltete Anlage läuft nur, wenn der Betreiber jede Voraussetzung und eine begrenzte Autorisierung bereitstellt, über persistierte Prüfung, Autorisierung und ein explizites Anlegen. netcup, AWS, Google Cloud und Oracle Cloud nutzen geführte Importpfade; Pharos verspricht dafür weder Bestellung, Abrechnung noch Gratis-Kontingente.",
    },
    {
      question: "Kann ich Pharos ohne Augmentoring nutzen?",
      answer:
        "Ja. Der selbst gehostete Quellcode und die Vorlagen zur Bereitstellung stehen für sich. Augmentoring ist die klar getrennte Option für professionelle Architektur, Integration, Einführung und Betriebsunterstützung.",
    },
  ],
  finalCta: {
    title: "Pharos an Ihr Betriebsmodell anpassen?",
    body:
      "Augmentoring hilft beim Entwurf der Flottengrenze, integriert bestehende Infrastruktur, stellt die Steuerungsebene bereit und etabliert die Runbooks darum herum.",
  },
} satisfies ProductContent;
