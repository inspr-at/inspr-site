export const siteUrls = {
  business:
    import.meta.env.PUBLIC_BUSINESS_URL?.replace(/\/$/, "") ||
    "https://amt.inspr.at",
  inspr: "https://www.inspr.at",
  paimos: "https://paimos.inspr.at",
  pharos: "https://pharos.inspr.at",
  janus: "https://janus.inspr.at",
  identity: "https://auth.inspr.at",
  signIn: "https://inspr.at/login",
  agpl: "https://www.gnu.org/licenses/agpl-3.0.html",
  imprint: "https://amt.inspr.at/impressum/",
  privacy: "https://amt.inspr.at/datenschutz/",
} as const;

export const productTaxonomy = {
  inspr: "Technology umbrella",
  paimos: "Project context",
  pharos: "Fleet state and backup evidence",
  janus: "Secret governance",
} as const;

export const productLinks = [
  { label: "INSPR", role: productTaxonomy.inspr, href: siteUrls.inspr },
  { label: "Paimos", role: productTaxonomy.paimos, href: siteUrls.paimos },
  { label: "Pharos", role: productTaxonomy.pharos, href: siteUrls.pharos },
  { label: "Janus", role: productTaxonomy.janus, href: siteUrls.janus },
] as const;
