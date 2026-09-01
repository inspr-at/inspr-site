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

export type AgentIntercomControl = {
  control: string;
  intent: string;
  simpleInbox: AgentIntercomAvailability;
  managedCodex: AgentIntercomAvailability;
  managedClaude: AgentIntercomAvailability;
  unmanaged: AgentIntercomAvailability;
};

export type AgentIntercomAvailability = {
  state: "supported" | "conditional" | "unavailable";
  label: string;
};

export type AgentIntercomContent = {
  eyebrow: string;
  title: string;
  lead: string;
  boundary: string;
  flow: Array<{
    label: string;
    title: string;
    body: string;
    icon: string;
  }>;
  controls: AgentIntercomControl[];
  unmanagedCodexNote: string;
  security: CardItem[];
  recovery: {
    title: string;
    body: string;
    meta: string;
  };
  links: LinkItem[];
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
  agentIntercom?: AgentIntercomContent;
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
