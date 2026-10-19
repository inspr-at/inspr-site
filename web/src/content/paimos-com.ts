import { paimosAeonContent, paimosRelease } from "./paimos-aeon";
import { siteUrls } from "./urls";

// INSPR-572: paimos.com, the public front door: a short pitch and the
// "What if…?" films. paimos.inspr.at stays the product and specification site,
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
    productLabel: "How it works",
    sourceLabel: "View the source",
    screenCaption: `Real screen, demo data · release ${paimosRelease.number}`,
    screenAlt: "PAIMOS Delivery in Live mode, with release and change timelines and the current delivery status.",
  },
  films: {
    eyebrow: "What if…?",
    title: "One question, one film.",
    lead: "Each film asks one question and answers it with AEON's own screens. They play without sound until you turn it on.",
    listLabel: "Films",
    transcript: "Transcript",
    play: "Play film",
    pause: "Pause",
    resume: "Play",
    soundOn: "Sound on",
    soundOff: "Sound off",
    previous: "Previous film",
    next: "Next film",
    of: "{n} of {total}",
  },
  answers: {
    eyebrow: "What changes",
    title: "Many agents. One place to decide.",
    items: [
      {
        kicker: "Decision Desk",
        title: "Agents ask. People decide.",
        body: "Questions and approvals from your agents wait on one desk, for a person. Decide once, or always.",
        linkLabel: "How authority works",
        href: `${product}/#authority`,
      },
      {
        kicker: "Rules",
        title: "One rulebook, six layers.",
        body: "Company, project, person, role, named agent and task merge into one versioned rulebook. A higher layer can lock a rule for every layer below it.",
        linkLabel: "How the rules work",
        href: `${product}/#rules`,
      },
      {
        kicker: "Pace",
        title: "You set the pace.",
        body: "The admission dial sets how many agents run at once, with limits per harness and per account, reset times, and careful or full use.",
        linkLabel: "How the engine runs",
        href: `${product}/#engine`,
      },
    ],
  },
  facts: {
    eyebrow: "What it is",
    title: "One binary. One database. One log.",
    items: [
      { term: "Open source", detail: "AGPL-3.0-only. Inspect, self-host, fork and modify AEON." },
      {
        term: "Self-hosted or operated for you",
        detail: "One server binary and a Postgres 18 database on your own infrastructure, or an instance Augmentoring operates for you.",
      },
      { term: "Your machines", detail: "aeon-agentd starts Claude Code, Codex, Cursor and pi on computers you pair." },
      { term: "One log", detail: "People and agents write to one append-only event log per tenant." },
    ],
    linkLabel: "Read the product page",
  },
  nav: {
    films: { label: "Films", href: "#films" },
    answers: { label: "What changes", href: "#answers" },
    facts: { label: "What it is", href: "#what" },
    product: { label: "Product", href: product },
  },
  finalCta: paimosAeonContent.finalCta,
} as const;
