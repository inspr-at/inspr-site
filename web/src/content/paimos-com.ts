import { paimosAeonContent, paimosRelease } from "./paimos-aeon";
import { siteUrls } from "./urls";

// INSPR-572: paimos.com, the public front door: the tagline, the
// "What if…?" films and a way to learn more. paimos.inspr.at stays the product and specification site,
// and every claim here repeats one it already makes (no compliance, EU or
// competitor lines). English only at launch. The tagline was chosen by Markus.
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
    lead: paimosAeonContent.hero.lead,
    filmsLabel: "Watch the films",
    runningLabel: "See it running",
    runningHref: `${product}/#screens`,
    productLabel: "Learn more",
    sourceLabel: "View the source",
    // Used for the share image while no film is cleared.
    screenAlt: "PAIMOS Delivery in Live mode, with release and change timelines and the current delivery status.",
    pauseMotion: "Pause motion",
    playMotion: "Play motion",
  },
  films: {
    title: "What if…?",
    label: "What if…? films",
    slide: "Question {n} of {total}",
    watch: "Watch",
    transcript: "Transcript",
    previous: "Previous question",
    next: "Next question",
    chapters: "Questions",
    back: "Back to the questions",
    pause: "Pause",
    resume: "Play",
    soundOn: "Sound on",
    soundOff: "Sound off",
    fullscreen: "Full screen",
    exitFullscreen: "Exit full screen",
  },
  nav: {
    films: { label: "Films", href: "#films" },
    product: { label: "Learn more", href: product },
  },
  finalCta: paimosAeonContent.finalCta,
} as const;
