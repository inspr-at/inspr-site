export const siteUrls = {
  business:
    import.meta.env.PUBLIC_BUSINESS_URL?.replace(/\/$/, "") ||
    "https://augmentoring.com",
  inspr: "https://www.inspr.at",
  overview: "https://www.inspr.at/overview/",
  overviewGerman: "https://www.inspr.at/de/ueberblick/",
  paimos: "https://paimos.inspr.at",
  // INSPR-492: the retired Paimos product page, kept below the www host and
  // out of search indexes (noindex, not in productLinks or a sitemap).
  paimosLegacy: "https://www.inspr.at/paimos-legacy/",
  paimosLegacyGerman: "https://www.inspr.at/paimos-legacy/de/",
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
// operator and privacy notices are INSPR's own, one pair per language. Derived
// from the configurable business origin and the www notice URLs, never hardcoded.
export const localeUrls = (locale: "en" | "de") =>
  locale === "de"
    ? { business: siteUrls.business, imprint: siteUrls.legalGerman, privacy: siteUrls.privacyGerman }
    : { business: `${siteUrls.business}/en/`, imprint: siteUrls.legal, privacy: siteUrls.privacy };

export const productTaxonomy = {
  inspr: "Open product family",
  paimos: "Project context",
  pharos: "Fleet state and backup evidence",
  janus: "Secret governance",
  aithema: "Requirements",
} as const;

export const productLinks = [
  { label: "INSPR", role: productTaxonomy.inspr, href: siteUrls.inspr },
  { label: "Aithema", role: productTaxonomy.aithema, href: siteUrls.aithema },
  { label: "Paimos", role: productTaxonomy.paimos, href: siteUrls.paimos },
  { label: "Pharos", role: productTaxonomy.pharos, href: siteUrls.pharos },
  { label: "Janus", role: productTaxonomy.janus, href: siteUrls.janus },
] as const;
