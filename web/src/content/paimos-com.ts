import { paimosAeonContent, paimosRelease } from "./paimos-aeon";
import { siteUrls } from "./urls";

// INSPR-572: paimos.com, the public front door: one screen with the tagline
// and one button that plays the "What if…?" films. paimos.inspr.at stays the
// product and specification site, and every claim here repeats one it already
// makes (no compliance, EU or competitor lines). English only at launch. The
// tagline was chosen by Markus.
const product = siteUrls.paimos;

export const paimosComContent = {
  name: paimosAeonContent.name,
  category: paimosAeonContent.category,
  canonicalUrl: `${siteUrls.paimosCom}/`,
  repositoryUrl: paimosAeonContent.repositoryUrl,
  licenseUrl: `${paimosAeonContent.repositoryUrl}/blob/${paimosRelease.tag}/LICENSE`,
  seo: {
    title: "PAIMOS · The self-improving software factory",
    description:
      "PAIMOS AEON starts Claude Code, Codex, Cursor and pi on your own computers, shows every session in one control room, and leaves every gated decision to a person. Open source under AGPL-3.0-only.",
  },
  hero: {
    eyebrow: "PAIMOS AEON · Open source",
    title: "The self-improving software factory.",
    accent: "You decide. PAIMOS learns.",
    // Without a cleared film the one button leads to the product site.
    learnLabel: "Learn more",
    // The share image while no film is cleared.
    screenAlt: "PAIMOS Delivery in Live mode, with release and change timelines and the current delivery status.",
  },
  player: {
    watch: "Watch now",
    label: "What if…? films",
    play: "Play",
    pause: "Pause",
    seek: "Position in the films",
    film: "Film {n} of {total}",
    soundOn: "Turn sound on",
    soundOff: "Turn sound off",
    transcript: "Transcript",
    transcriptTitle: "What the films say",
    fullscreen: "Full screen",
    exitFullscreen: "Exit full screen",
    previous: "Previous film",
    next: "Next film",
    close: "Close the films",
  },
  nav: {
    product: { label: "Learn more", href: product },
  },
  finalCta: paimosAeonContent.finalCta,
} as const;
