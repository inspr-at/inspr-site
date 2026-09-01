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
    eyebrow: string;
    title: string;
    lead: string;
    alt: string;
    primaryLabel: string;
    primaryHref: string;
  };
  serviceIntro: string;
  proof: string[];
  specs?: {
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
  problem: {
    eyebrow: string;
    title: string;
    lead: string;
    visualAlt: string;
    visualCaption: string;
    items: CardItem[];
  };
  model: {
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
 * Product content for a working hosted preview whose reusable source release
 * has not shipped yet. Keeping this separate from ProductContent prevents a
 * preview from inheriting repository, license, release, integration or
 * architecture claims that only make sense for released products.
 */
export type PreviewProductContent = {
  slug: "aithema";
  name: string;
  category: string;
  canonicalUrl: string;
  previewUrl: string;
  seo: {
    title: string;
    description: string;
  };
  hero: {
    eyebrow: string;
    title: string;
    lead: string;
    alt: string;
    primaryLabel: string;
  };
  serviceIntro: string;
  proof: string[];
  problem: {
    eyebrow: string;
    title: string;
    lead: string;
    visualAlt: string;
    visualCaption: string;
    items: CardItem[];
  };
  model: {
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
