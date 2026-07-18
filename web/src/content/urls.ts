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
} as const;

export const productLinks = [
  { label: "INSPR", href: siteUrls.inspr },
  { label: "Paimos", href: siteUrls.paimos },
  { label: "Pharos", href: siteUrls.pharos },
  { label: "Janus", href: siteUrls.janus },
] as const;
