import { productRole } from "./family";

export const siteUrls = {
  business:
    import.meta.env.PUBLIC_BUSINESS_URL?.replace(/\/$/, "") ||
    "https://augmentoring.com",
  inspr: "https://www.inspr.at",
  overview: "https://www.inspr.at/overview/",
  overviewGerman: "https://www.inspr.at/de/ueberblick/",
  paimos: "https://paimos.inspr.at",
  pharos: "https://pharos.inspr.at",
  janus: "https://janus.inspr.at",
  aithema: "https://aithema.inspr.at",
  identity: "https://auth.inspr.at",
  author: "https://github.com/markus-barta",
  agpl: "https://www.gnu.org/licenses/agpl-3.0.html",
  // INSPR-539: the operator and privacy notices are INSPR's own, published once
  // on the www host and linked from every host's footer.
  legal: "https://www.inspr.at/legal/",
  legalGerman: "https://www.inspr.at/de/impressum/",
  privacy: "https://www.inspr.at/privacy/",
  privacyGerman: "https://www.inspr.at/de/datenschutz/",
} as const;

// INSPR-524, INSPR-539: English pages link the English business home; the
// operator and privacy notices are INSPR's own, one pair per language. The
// notice links carry ?lang= because a language stored on the www host would
// otherwise redirect the arrival to the other edition. Derived from the
// configurable business origin and the www notice URLs, never hardcoded.
export const localeUrls = (locale: "en" | "de") =>
  locale === "de"
    ? { business: siteUrls.business, imprint: `${siteUrls.legalGerman}?lang=de`, privacy: `${siteUrls.privacyGerman}?lang=de` }
    : { business: `${siteUrls.business}/en/`, imprint: `${siteUrls.legal}?lang=en`, privacy: `${siteUrls.privacy}?lang=en` };

// INSPR-542: each product role is "‹Verb›: ‹short role›", derived from the
// shared GUI-22 copy in family.ts; the INSPR entry stays the umbrella.
export const productTaxonomy = {
  inspr: "Open product family",
  paimos: productRole("paimos"),
  pharos: productRole("pharos"),
  janus: productRole("janus"),
  aithema: productRole("aithema"),
};

export const productTaxonomyDe = {
  inspr: "Offene Produktfamilie",
  paimos: productRole("paimos", "de"),
  pharos: productRole("pharos", "de"),
  janus: productRole("janus", "de"),
  aithema: productRole("aithema", "de"),
};

export const productLinks = [
  { label: "INSPR", role: productTaxonomy.inspr, href: siteUrls.inspr },
  { label: "Aithema", role: productTaxonomy.aithema, href: siteUrls.aithema },
  { label: "Paimos", role: productTaxonomy.paimos, href: siteUrls.paimos },
  { label: "Pharos", role: productTaxonomy.pharos, href: siteUrls.pharos },
  { label: "Janus", role: productTaxonomy.janus, href: siteUrls.janus },
] as const;
