// INSPR-539: the operator notice and the privacy notice for the INSPR sites.
// Markus Barta is the operator and controller (decision 2026-10-02). The
// statements below only claim what the sites verifiably do: no accounts, no
// cookies set by the pages, no analytics or third-party requests, display
// preferences in local storage only, delivery through Cloudflare, and web
// servers configured without access logs. Re-verify those facts whenever the
// edge, the layout scripts or the hosting change. Not legal advice.

export const operator = {
  name: "Markus Barta",
  email: "markus@barta.com",
  place: { en: "Graz, Austria", de: "Graz, Österreich" },
} as const;

export type LegalLink = { label: string; href: string };
export type LegalBlock = {
  heading: string;
  paragraphs?: string[];
  items?: string[];
  links?: LegalLink[];
  /** Renders the operator name, place and email (email shielded from rewriting). */
  contact?: boolean;
};
export type LegalDocument = {
  seoTitle: string;
  description: string;
  eyebrow: string;
  title: string;
  lead: string;
  contactLabel: string;
  emailLabel: string;
  updated: string;
  blocks: LegalBlock[];
};

const hosts = "www.inspr.at, aithema.inspr.at, paimos.inspr.at, pharos.inspr.at and janus.inspr.at";
const hostsDe = "www.inspr.at, aithema.inspr.at, paimos.inspr.at, pharos.inspr.at und janus.inspr.at";

export const legalContent: Record<"legal" | "privacy", Record<"en" | "de", LegalDocument>> = {
  legal: {
    en: {
      seoTitle: "Legal notice | INSPR",
      description: "Who operates the INSPR websites: Markus Barta, Graz, Austria, with contact details and scope.",
      eyebrow: "Legal notice",
      title: "Who runs these websites.",
      lead: "INSPR is open-source software by Markus Barta. These websites are operated and published by him.",
      contactLabel: "Operator and publisher",
      emailLabel: "Email",
      updated: "Last updated: 2 October 2026",
      blocks: [
        {
          heading: "Operator and publisher",
          paragraphs: ["These websites are operated and published by the person named below, who is also the media owner."],
          contact: true,
        },
        {
          heading: "Scope",
          paragraphs: [`This notice covers ${hosts}.`],
        },
        {
          heading: "Purpose of the websites",
          paragraphs: [
            "The websites inform about INSPR and its products Aithema, Paimos, Pharos and Janus: what they do, where their boundaries are and how to inspect the source.",
          ],
        },
        {
          heading: "Open source",
          paragraphs: [
            "INSPR and its products are open-source software by Markus Barta, licensed AGPL-3.0-only. The source of these websites is published in the repository below.",
          ],
          links: [
            { label: "Source of these websites (GitHub)", href: "https://github.com/inspr-at/inspr-site" },
            { label: "INSPR on GitHub", href: "https://github.com/inspr-at" },
          ],
        },
        {
          heading: "Professional services",
          paragraphs: [
            "Augmentoring GmbH offers architecture, integration, rollout and operating support around the products as a separate company. This notice does not cover its website.",
          ],
          links: [{ label: "augmentoring.com", href: "https://augmentoring.com/en/" }],
        },
      ],
    },
    de: {
      seoTitle: "Impressum | INSPR",
      description: "Wer die INSPR-Websites betreibt: Markus Barta, Graz, Österreich, mit Kontaktdaten und Geltungsbereich.",
      eyebrow: "Impressum",
      title: "Wer diese Websites betreibt.",
      lead: "INSPR ist Open-Source-Software von Markus Barta. Diese Websites werden von ihm betrieben und herausgegeben.",
      contactLabel: "Betreiber und Herausgeber",
      emailLabel: "E-Mail",
      updated: "Stand: 2. Oktober 2026",
      blocks: [
        {
          heading: "Betreiber, Medieninhaber und Herausgeber",
          paragraphs: ["Diese Websites werden von der unten genannten Person betrieben und herausgegeben, die zugleich Medieninhaberin im Sinn des Medienrechts ist."],
          contact: true,
        },
        {
          heading: "Geltungsbereich",
          paragraphs: [`Dieses Impressum gilt für ${hostsDe}.`],
        },
        {
          heading: "Grundlegende Richtung",
          paragraphs: [
            "Die Websites informieren über INSPR und seine Produkte Aithema, Paimos, Pharos und Janus: was sie tun, wo ihre Grenzen liegen und wie Sie den Quellcode prüfen können.",
          ],
        },
        {
          heading: "Open Source",
          paragraphs: [
            "INSPR und seine Produkte sind Open-Source-Software von Markus Barta unter AGPL-3.0-only. Der Quellcode dieser Websites ist im unten verlinkten Repository veröffentlicht.",
          ],
          links: [
            { label: "Quellcode dieser Websites (GitHub)", href: "https://github.com/inspr-at/inspr-site" },
            { label: "INSPR auf GitHub", href: "https://github.com/inspr-at" },
          ],
        },
        {
          heading: "Professionelle Services",
          paragraphs: [
            "Die Augmentoring GmbH bietet als eigenständiges Unternehmen Architektur, Integration, Rollout und Betriebsunterstützung rund um die Produkte an. Dieses Impressum gilt nicht für ihre Website.",
          ],
          links: [{ label: "augmentoring.com", href: "https://augmentoring.com/" }],
        },
      ],
    },
  },
  privacy: {
    en: {
      seoTitle: "Privacy | INSPR",
      description: "What data the INSPR websites process, who is responsible and what rights you have.",
      eyebrow: "Privacy",
      title: "What these websites do with your data.",
      lead: "Very little. This page says what, who is responsible and how to reach them.",
      contactLabel: "Controller",
      emailLabel: "Email",
      updated: "Last updated: 2 October 2026",
      blocks: [
        {
          heading: "Controller",
          paragraphs: [`The controller for the data processing on ${hosts} is:`],
          contact: true,
        },
        {
          heading: "What these websites do not do",
          paragraphs: [
            "There are no accounts, no cookies set by these pages, no analytics or tracking tools and no scripts, fonts or images from third parties. Fonts and images come from the same host as the page.",
          ],
        },
        {
          heading: "Settings stored in your browser",
          paragraphs: [
            "The pages remember your language, colour theme and level of detail in your browser's local storage so that the choice survives a reload. This stays on your device and is never sent to the server. You can delete it in your browser settings.",
          ],
        },
        {
          heading: "Connection data",
          paragraphs: [
            "To deliver a page, your browser sends your IP address, the time, the requested address and technical details such as the browser type. The websites are delivered through Cloudflare, which processes this data to deliver the pages quickly and to protect them from abuse (Art. 6(1)(f) GDPR, legitimate interest in reliable and secure operation). Cloudflare may process data outside the EU; its privacy policy has the details.",
            "The web servers behind Cloudflare are configured without access logs.",
          ],
          links: [{ label: "Cloudflare privacy policy", href: "https://www.cloudflare.com/privacypolicy/" }],
        },
        {
          heading: "Email",
          paragraphs: [
            "If you write to the address above, I process your address and message to answer you (Art. 6(1)(f) GDPR). Email is handled by my email hosting provider. I keep the correspondence only as long as it is needed to answer and follow up, unless a legal duty requires me to keep it.",
          ],
        },
        {
          heading: "Links to other websites",
          paragraphs: [
            "These pages link to GitHub, augmentoring.com and other websites. Their operators are responsible for their own data processing.",
          ],
        },
        {
          heading: "Your rights",
          paragraphs: [
            "You have the right of access, rectification, erasure, restriction of processing, data portability and objection. Write to the address above to use them. You can also complain to the Austrian data protection authority (Datenschutzbehörde).",
          ],
          links: [{ label: "Datenschutzbehörde (dsb.gv.at)", href: "https://www.dsb.gv.at/" }],
        },
      ],
    },
    de: {
      seoTitle: "Datenschutz | INSPR",
      description: "Welche Daten die INSPR-Websites verarbeiten, wer verantwortlich ist und welche Rechte Sie haben.",
      eyebrow: "Datenschutz",
      title: "Was diese Websites mit Ihren Daten tun.",
      lead: "Sehr wenig. Diese Seite sagt, was, wer verantwortlich ist und wie Sie ihn erreichen.",
      contactLabel: "Verantwortlicher",
      emailLabel: "E-Mail",
      updated: "Stand: 2. Oktober 2026",
      blocks: [
        {
          heading: "Verantwortlicher",
          paragraphs: [`Verantwortlich für die Datenverarbeitung auf ${hostsDe} ist:`],
          contact: true,
        },
        {
          heading: "Was diese Websites nicht tun",
          paragraphs: [
            "Es gibt keine Benutzerkonten, keine von diesen Seiten gesetzten Cookies, keine Analyse- oder Tracking-Werkzeuge und keine Skripte, Schriften oder Bilder von Dritten. Schriften und Bilder kommen vom selben Host wie die Seite.",
          ],
        },
        {
          heading: "Einstellungen in Ihrem Browser",
          paragraphs: [
            "Die Seiten merken sich Sprache, Farbschema und Detailstufe im lokalen Speicher Ihres Browsers, damit Ihre Auswahl ein erneutes Laden übersteht. Das bleibt auf Ihrem Gerät und wird nie an den Server gesendet. Sie können es in den Browsereinstellungen löschen.",
          ],
        },
        {
          heading: "Verbindungsdaten",
          paragraphs: [
            "Zur Auslieferung einer Seite sendet Ihr Browser Ihre IP-Adresse, die Uhrzeit, die angeforderte Adresse und technische Angaben wie den Browsertyp. Die Websites werden über Cloudflare ausgeliefert. Cloudflare verarbeitet diese Daten, um die Seiten schnell auszuliefern und vor Missbrauch zu schützen (Art. 6 Abs. 1 lit. f DSGVO, berechtigtes Interesse an zuverlässigem und sicherem Betrieb). Cloudflare kann Daten auch außerhalb der EU verarbeiten; Einzelheiten stehen in der Datenschutzerklärung von Cloudflare.",
            "Die Webserver hinter Cloudflare sind ohne Zugriffsprotokolle konfiguriert.",
          ],
          links: [{ label: "Datenschutzerklärung von Cloudflare", href: "https://www.cloudflare.com/privacypolicy/" }],
        },
        {
          heading: "E-Mail",
          paragraphs: [
            "Wenn Sie an die oben genannte Adresse schreiben, verarbeite ich Ihre Adresse und Nachricht, um Ihnen zu antworten (Art. 6 Abs. 1 lit. f DSGVO). E-Mails werden von meinem E-Mail-Hosting-Anbieter verarbeitet. Ich speichere die Korrespondenz nur so lange, wie sie für Antwort und Rückfragen nötig ist, sofern keine gesetzliche Aufbewahrungspflicht besteht.",
          ],
        },
        {
          heading: "Links zu anderen Websites",
          paragraphs: [
            "Diese Seiten verlinken auf GitHub, augmentoring.com und andere Websites. Deren Betreiber sind für ihre eigene Datenverarbeitung verantwortlich.",
          ],
        },
        {
          heading: "Ihre Rechte",
          paragraphs: [
            "Sie haben das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung der Verarbeitung, Datenübertragbarkeit und Widerspruch. Schreiben Sie dazu an die oben genannte Adresse. Sie können sich außerdem bei der österreichischen Datenschutzbehörde beschweren.",
          ],
          links: [{ label: "Datenschutzbehörde (dsb.gv.at)", href: "https://www.dsb.gv.at/" }],
        },
      ],
    },
  },
};
