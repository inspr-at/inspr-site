import { productRole } from "./family";

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
  imprint: "https://augmentoring.com/impressum/",
  privacy: "https://augmentoring.com/datenschutz/",
} as const;

// INSPR-524: the business site publishes English editions of its home, legal
// notice and privacy pages under /en/. English INSPR pages link those so a
// reader never lands on a German-only page; German pages keep the German
// originals. Derived from the configurable business origin, never hardcoded.
export const localeUrls = (locale: "en" | "de") =>
  locale === "de"
    ? { business: siteUrls.business, imprint: siteUrls.imprint, privacy: siteUrls.privacy }
    : {
        business: `${siteUrls.business}/en/`,
        imprint: `${siteUrls.business}/en/imprint/`,
        privacy: `${siteUrls.business}/en/privacy/`,
      };

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
