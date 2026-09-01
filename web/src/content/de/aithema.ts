import { siteUrls } from "../urls";
import type { PreviewProductContent } from "../types";

// German edition of the Aithema product page, served at aithema.inspr.at/de/.
// Facts, links, icons and structure mirror ../aithema.ts; only language-visible
// values differ. Keep both files in sync when product claims change.
export const aithemaContentDe = {
  slug: "aithema",
  name: "Aithema",
  category: "Anforderungen",
  canonicalUrl: `${siteUrls.aithema}/de/`,
  previewUrl: siteUrls.aithemaPreview,
  seo: {
    title: "Aithema | Anforderungen, die Sie vor Arbeitsbeginn freigeben",
    description:
      "Aithema macht aus Gesprächen und Dateien prüfbare Anforderungen. Sie korrigieren das Ergebnis und entscheiden, ob die Arbeit weitergeht.",
  },
  hero: {
    eyebrow: "Anforderungen, prüfbar gemacht",
    title: "Anforderungen, die Sie vor Arbeitsbeginn freigeben.",
    lead:
      "Sprechen, schreiben oder Dateien teilen. Aithema hilft, aus diesem Input klare Anforderungen zu machen, und wartet dann darauf, dass Sie sie prüfen und „Weiter“ wählen.",
    alt: "Ein Anforderungsprisma bündelt diffuses türkis-goldenes Licht zu einem präzisen Entscheidungsobjekt",
    primaryLabel: "Gehostete Vorschau öffnen",
  },
  serviceIntro:
    "Augmentoring stellt die gehostete Aithema-Vorschau bereit und begleitet Anforderungen professionell.",
  proof: [
    "Sprechen, schreiben oder Dateien teilen",
    "Anforderungen bleiben prüfbar",
    "Ein Mensch wählt „Weiter“",
    "Wiederverwendbares Open-Source-Modul geplant",
  ],
  problem: {
    eyebrow: "Vor dem Bau",
    title: "Gute Arbeit braucht einen klaren Anfang.",
    lead:
      "Ideen kommen über Gespräche, Notizen und Dateien. Das Schwierige ist, daraus eine Fassung zu machen, die ein Mensch prüfen, korrigieren und freigeben kann.",
    visualAlt:
      "Ein Anforderungsprisma macht aus diffusem Input eine präzise Anforderung",
    visualCaption:
      "Viele Eingaben werden eine prüfbare Anforderung, keine automatische Entscheidung.",
    items: [
      {
        title: "Gespräche sind schnell",
        body:
          "Wichtige Rahmenbedingungen bleiben unausgesprochen oder gehen zwischen einem Telefonat und dem ersten schriftlichen Briefing verloren.",
        meta: "Festhalten, was gemeint war",
        icon: "mic",
      },
      {
        title: "Dateien tragen verstreuten Kontext",
        body:
          "Beispiele, Vorgaben und frühere Entscheidungen zählen, aber sie kommen selten als ein brauchbares Anforderungspaket an.",
        meta: "Die Belege zusammenführen",
        icon: "library",
      },
      {
        title: "Ein Entwurf ist keine Freigabe",
        body:
          "Generierte Formulierungen können nützlich sein, aber die Person, der das Ergebnis gehört, muss sie korrigieren können, bevor die Arbeit weitergeht.",
        meta: "Die Prüfung bleibt ein menschlicher Schritt",
        icon: "shield-check",
      },
    ],
  },
  model: {
    eyebrow: "Der Aithema-Weg",
    title: "Teilen. Formen. Prüfen. Weiter.",
    lead:
      "Aithema übernimmt die Mühe, Input zu ordnen, und lässt die Entscheidung bei Ihnen.",
    steps: [
      {
        number: "01",
        title: "Teilen",
        visual: { x: 23, y: 31 },
        body:
          "Erklären Sie den Bedarf per Sprache oder Text und ergänzen Sie die Dateien mit dem relevanten Kontext.",
        icon: "mic",
        signal: "Das Ausgangsmaterial bleibt für das Gespräch sichtbar.",
      },
      {
        number: "02",
        title: "Formen",
        visual: { x: 42, y: 52 },
        body:
          "Aithema ordnet den Input zu Anforderungen, die sich lesen, besprechen und ändern lassen.",
        icon: "list-tree",
        signal: "Ein konkretes Anforderungspaket steht zur Prüfung bereit.",
      },
      {
        number: "03",
        title: "Prüfen",
        visual: { x: 64, y: 52 },
        body:
          "Kontrollieren Sie Formulierungen, Annahmen und Grenzen. Korrigieren Sie, was falsch oder unvollständig ist.",
        icon: "scan-search",
        signal: "Nichts geht weiter, nur weil ein Entwurf existiert.",
      },
      {
        number: "04",
        title: "Weiter",
        visual: { x: 82, y: 31 },
        body:
          "Wählen Sie „Weiter“ erst, wenn die Anforderungen die Arbeit beschreiben, die Sie wirklich wollen.",
        icon: "check-circle-2",
        signal: "Ihre Entscheidung erzeugt die Übergabe an den nächsten Schritt.",
      },
    ],
    closing:
      "Aithema hilft beim schwierigen Stück zwischen Idee und brauchbarem Briefing. Es ersetzt nicht die Person, der die Entscheidung gehört.",
  },
  featureSections: [
    {
      id: "input",
      eyebrow: "Input",
      title: "Beginnen Sie mit dem, was Sie schon haben.",
      lead:
        "Eine Anforderung kann als Satz beginnen, als Gespräch oder als Sammlung unterstützender Dateien.",
      items: [
        {
          title: "Sprechen",
          body:
            "Reden Sie den Bedarf in eigenen Worten durch, statt zuerst ein perfektes Briefing vorzubereiten.",
          icon: "mic",
        },
        {
          title: "Schreiben",
          body:
            "Schreiben Sie direkt, wenn Präzision zählt oder Sie die entscheidende Rahmenbedingung schon kennen.",
          icon: "braces",
        },
        {
          title: "Dateien teilen",
          body:
            "Ergänzen Sie das Material, das Beispiele, Grenzen oder frühere Entscheidungen erklärt.",
          icon: "file-check-2",
        },
      ],
    },
    {
      id: "review",
      eyebrow: "Menschliche Kontrolle",
      title: "Die wichtige Entscheidung bleibt sichtbar.",
      lead:
        "Das nützliche Ergebnis ist nicht Text, der fertig aussieht. Es ist ein Anforderungspaket, das Sie verstehen und bewusst verwenden.",
      items: [
        {
          title: "Das Ergebnis prüfen",
          body:
            "Lesen Sie die Anforderungen, bevor sie zur Grundlage späterer Arbeit werden.",
          icon: "eye",
        },
        {
          title: "Den Entwurf korrigieren",
          body:
            "Ändern Sie unklare Formulierungen, fehlenden Kontext und Annahmen, die nicht hineingehören.",
          icon: "sliders-horizontal",
        },
        {
          title: "„Weiter“ wählen",
          body:
            "Die Übergabe passiert, weil Sie sie freigeben, nicht weil das Werkzeug das Ende eines Formulars erreicht hat.",
          icon: "user-round-check",
        },
      ],
    },
  ],
  audiences: {
    eyebrow: "Für wen es hilft",
    title: "Für Menschen, die Absicht in Arbeit übersetzen.",
    lead:
      "Aithema ist immer dann nützlich, wenn die Person, die einen Bedarf beschreibt, und die Person, die ihn umsetzt, einen klareren gemeinsamen Anfang brauchen.",
    items: [
      {
        title: "Menschen mit einer Idee",
        body:
          "Erklären Sie das gewünschte Ergebnis, ohne zuerst zu lernen, wie man eine technische Spezifikation schreibt.",
      },
      {
        title: "Teams, die Anfragen erhalten",
        body:
          "Starten Sie mit prüfbaren Anforderungen, statt Absichten aus verstreuten Nachrichten zu rekonstruieren.",
      },
      {
        title: "Dienstleistungspartner",
        body:
          "Machen Sie die erste Übergabe explizit, bevor Schätzungen, Pläne oder Umsetzung beginnen.",
      },
    ],
  },
  limits: {
    eyebrow: "Aktuelle Grenze",
    title: "Vorschau jetzt. Wiederverwendbares Modul später.",
    lead:
      "Die gehostete Vorschau ist heute verfügbar. Das wiederverwendbare Open-Source-Modul von Aithema ist noch nicht veröffentlicht.",
    items: [
      "Die öffentliche Anwendung läuft derzeit auf start.augmentoring.com.",
      "Vor der Veröffentlichung des wiederverwendbaren Moduls wird kein Aithema-Quell-Repository und keine Produktlizenz behauptet.",
      "Aithema unterstützt das Formen und Prüfen von Anforderungen; es gibt nichts still frei und beginnt keine Umsetzung.",
      "Aussagen zu Release, Integration und Self-Hosting warten auf prüfbare Belege.",
    ],
  },
  releasePath: {
    eyebrow: "Open-Source-Weg",
    title: "Das wiederverwendbare Modul ist geplant.",
    body:
      "Aithema soll ein Open-Source-Template oder -Modul werden. Bis dieses Release existiert, ist die gehostete Vorschau der ehrliche Weg, es zu nutzen.",
  },
  faq: [
    {
      question: "Kann ich Aithema jetzt ausprobieren?",
      answer:
        "Ja. Die öffentliche Vorschau ist auf start.augmentoring.com verfügbar.",
    },
    {
      question: "Ist Aithema heute Open Source?",
      answer:
        "Noch nicht. Ein wiederverwendbares Open-Source-Modul ist geplant, aber vor diesem Release wird kein Aithema-Repository und keine Lizenz präsentiert.",
    },
    {
      question: "Gibt Aithema Anforderungen für mich frei?",
      answer:
        "Nein. Aithema hilft, den Input zu formen. Sie prüfen das Ergebnis, korrigieren es und entscheiden, ob es weitergeht.",
    },
    {
      question: "Wem gehört Aithema?",
      answer:
        "Aithema ist ein Produkt von Markus Barta. Augmentoring stellt die gehostete Vorschau bereit und bietet professionelle Services, die sie nutzen.",
    },
  ],
  finalCta: {
    title: "Hilfe beim ersten Briefing?",
    body:
      "Nutzen Sie die gehostete Vorschau direkt, oder arbeiten Sie mit Augmentoring, wenn die Anforderungen einen professionellen Serviceweg brauchen.",
  },
} satisfies PreviewProductContent;
