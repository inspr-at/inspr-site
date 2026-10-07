/** A string in both site languages; the shared GUI-22 copy is built from these. */
export type Bilingual = { en: string; de: string };

/** How much of a claim has shipped: only "live" may be stated as present. */
export type Status = "live" | "partly" | "planned";

/** One lead in two extra depths; the standard depth is the field itself. */
export type Depths = {
  simple?: string;
  technical?: string;
};

/** The public technical facts shown beneath a product hero. */
export type ProductSheet = {
  repo: string;
  runtime: string;
  gate: string;
  artefact: string;
  interfaces: string;
  maturity: string;
  command?: string;
};

export type ProductHandoff = {
  in: string;
  out: string;
};

export type LinkItem = {
  label: string;
  href: string;
  external?: boolean;
};

export type CardItem = {
  title: string;
  body: string;
  meta?: string;
  icon?: string;
  reference?: LinkItem;
};

export type StepItem = CardItem & {
  simple?: string;
  number: string;
  signal?: string;
  visual?: {
    x: number;
    y: number;
  };
};

export type FeatureSection = {
  id: string;
  eyebrow: string;
  title: string;
  lead: string;
  items: CardItem[];
};

export type IntegrationItem = {
  name: string;
  status: string;
  description: string;
};

/** The capability specs grid: flip cards with a plain-language back side. */
export type SpecsContent = {
  eyebrow: string;
  title: string;
  lead?: string;
  leadEli10?: string;
  items: Array<{
    label: string;
    icon: string;
    note: string;
    noteEli10: string;
    group: "security" | "ops" | "ai" | "legal" | "work" | "place";
  }>;
  glossary?: Array<{
    id: string;
    term: string;
    matches: string[];
    body: string;
  }>;
};

export type ProductContent = {
  slug: "paimos" | "pharos" | "janus";
  name: string;
  category: string;
  canonicalUrl: string;
  repositoryUrl: string;
  releaseUrl?: string;
  license: {
    name: string;
    url: string;
    note?: string;
  };
  seo: {
    title: string;
    description: string;
  };
  hero: {
    sheet: ProductSheet;
    depths?: Depths;
    eyebrow: string;
    title: string;
    lead: string;
    alt: string;
    primaryLabel: string;
    primaryHref: string;
  };
  serviceIntro: string;
  proof: string[];
  specs?: SpecsContent;
  problem: {
    depths?: Depths;
    eyebrow: string;
    title: string;
    lead: string;
    visualAlt: string;
    visualCaption: string;
    items: CardItem[];
  };
  model: {
    handoff: ProductHandoff;
    depths?: Depths;
    eyebrow: string;
    title: string;
    lead: string;
    steps: StepItem[];
    closing?: string;
  };
  featureSections: FeatureSection[];
  audiences: {
    eyebrow: string;
    title: string;
    lead: string;
    items: CardItem[];
  };
  architecture: {
    eyebrow: string;
    title: string;
    lead: string;
    paragraphs: string[];
    flow: string[];
    facts: string[];
  };
  trust: {
    eyebrow: string;
    title: string;
    lead: string;
    items: CardItem[];
  };
  integrations: {
    eyebrow: string;
    title: string;
    lead: string;
    items: IntegrationItem[];
  };
  limits: {
    eyebrow: string;
    title: string;
    lead: string;
    items: string[];
  };
  openSource: {
    eyebrow: string;
    title: string;
    body: string;
    links: LinkItem[];
  };
  faq: Array<{
    question: string;
    answer: string;
  }>;
  finalCta: {
    title: string;
    body: string;
  };
};

/**
 * Product content for Aithema: a published open-source core (repository,
 * license and releases are real, inspectable links) whose hosted workspace is
 * available by invitation. Keeping this separate from ProductContent keeps the
 * integration and architecture rails of the fully self-hosted products out of
 * the page until Aithema publishes that evidence (INSPR-528 follow-up).
 */
export type PreviewProductContent = {
  slug: "aithema";
  name: string;
  category: string;
  canonicalUrl: string;
  repositoryUrl: string;
  releaseUrl: string;
  licenseUrl: string;
  seo: {
    title: string;
    description: string;
  };
  hero: {
    sheet: ProductSheet;
    depths?: Depths;
    eyebrow: string;
    title: string;
    lead: string;
    alt: string;
    primaryLabel: string;
  };
  serviceIntro: string;
  proof: string[];
  problem: {
    depths?: Depths;
    eyebrow: string;
    title: string;
    lead: string;
    visualAlt: string;
    visualCaption: string;
    items: CardItem[];
  };
  model: {
    handoff: ProductHandoff;
    depths?: Depths;
    eyebrow: string;
    title: string;
    lead: string;
    steps: StepItem[];
    closing?: string;
  };
  featureSections: FeatureSection[];
  audiences: {
    eyebrow: string;
    title: string;
    lead: string;
    items: CardItem[];
  };
  limits: {
    eyebrow: string;
    title: string;
    lead: string;
    items: string[];
  };
  releasePath: {
    eyebrow: string;
    title: string;
    body: string;
  };
  faq: Array<{
    question: string;
    answer: string;
  }>;
  finalCta: {
    title: string;
    body: string;
  };
};

/** A source path at the presented release tag that backs a claim. */
export type AeonProof = {
  label: string;
  path: string;
};

export type AeonFeature = {
  icon: string;
  title: string;
  body: string;
  caveat?: string;
};

/** The PAIMOS AEON release page at www.inspr.at/paimos-aeon (INSPR-492). */
export type AeonContent = {
  name: string;
  category: string;
  canonicalUrl: string;
  repositoryUrl: string;
  /** Proof links resolve against this tree URL, pinned to the release tag. */
  sourceTreeUrl: string;
  release: {
    name: string;
    codename: string;
    label: string;
    version: string;
    publishedAt: string;
    publishedLabel: string;
    url: string;
  };
  seo: { title: string; description: string };
  nav: Array<{ label: string; href: string }>;
  serviceIntro: string;
  hero: {
    eyebrow: string;
    titleLead: string;
    titleAccent: string;
    lead: string;
    depths: Depths;
    primaryLabel: string;
    primaryHref: string;
    alt: string;
    chips: Array<{ kind: "approval" | "run" | "event"; label: string; detail: string }>;
    ribbonLabel: string;
    ribbon: string[];
  };
  figures: Array<{ value: string; label: string }>;
  theatre: {
    eyebrow: string;
    title: string;
    lead: string;
    note: string;
    openLabel: string;
    screens: Array<{ id: string; tab: string; title: string; body: string; alt: string }>;
  };
  specs: SpecsContent;
  specGroups: Record<SpecsContent["items"][number]["group"], string>;
  controlRoom: {
    eyebrow: string;
    title: string;
    lead: string;
    depths: Depths;
    items: AeonFeature[];
    screenAlt: string;
    pairing: {
      eyebrow: string;
      title: string;
      steps: Array<{ label: string; command?: string }>;
    };
    /** INSPR-544: which harnesses start under Paimos, grouped by how far each has shipped. */
    harnessMatrix: {
      label: string;
      rows: Array<{ status: Status; harnesses: string[]; note: string }>;
    };
    proof: AeonProof[];
  };
  authority: {
    eyebrow: string;
    title: string;
    titleAccent: string;
    lead: string;
    depths: Depths;
    /**
     * The four stations of the instrument, in order. `actor` names who acts
     * at that station; `tokens` are the scopes, events or files shown as
     * chips. The third station is the human moment.
     */
    steps: Array<{ label: string; title: string; body: string; actor: string; tokens: string[] }>;
    ui: {
      /** Accessible name pattern for a station button; {n} and {total} are replaced. */
      stepOf: string;
      /** Caption under the instrument. */
      caption: string;
      /** The walk control (WCAG 2.2.2): pressed while paused. */
      pause: string;
      resume: string;
    };
    proof: AeonProof[];
  };
  rules: {
    eyebrow: string;
    title: string;
    lead: string;
    depths: Depths;
    /** Section starts in the rules capture, as a fraction of its height. */
    stops: Array<{ label: string; at: number }>;
    points: Array<{ title: string; body: string }>;
    early: string;
    screenAlt: string;
    proof: AeonProof[];
  };
  /** INSPR-544: the engine's six jobs, each with how far it has shipped. */
  engine: {
    eyebrow: string;
    title: string;
    lead: string;
    depths: Depths;
    jobs: Array<{ label: string; status: Status; note: string }>;
    /** The retired flow and the planned Flow 2; the status belongs to Flow 2. */
    flowNote: { text: string; status: Status };
  };
  architecture: {
    eyebrow: string;
    title: string;
    lead: string;
    depths: Depths;
    diagram: {
      clients: string[];
      clientsLabel: string;
      server: string[];
      serverLabel: string;
      database: string[];
      databaseLabel: string;
      daemon: string;
      daemonLabel: string;
      harnesses: string[];
      live: string;
    };
    notes: Array<{ title: string; body: string; proof: AeonProof }>;
  };
  horizon: {
    eyebrow: string;
    title: string;
    lead: string;
    /** The shared build order (family.ts): a status per step, never a date. */
    order: Array<{ label: string; status: Status; note?: string }>;
    goodToKnow: { title: string; items: string[] };
  };
  openSource: { eyebrow: string; title: string; body: string; links: LinkItem[] };
  faq: Array<{ question: string; answer: string }>;
  finalCta: { title: string; body: string };
};
