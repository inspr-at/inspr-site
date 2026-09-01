import { productTaxonomy, siteUrls } from "./urls";
import type { PreviewProductContent } from "./types";

export const aithemaContent = {
  slug: "aithema",
  name: "Aithema",
  category: productTaxonomy.aithema,
  canonicalUrl: siteUrls.aithema,
  previewUrl: siteUrls.aithemaPreview,
  seo: {
    title: "Aithema | Requirements you approve before work begins",
    description:
      "Aithema turns conversation and files into reviewable requirements. You correct the result and choose whether work should continue.",
  },
  hero: {
    eyebrow: "Requirements, made reviewable",
    title: "Requirements you approve before work begins.",
    lead:
      "Speak, type or share files. Aithema helps turn that input into clear requirements, then waits for you to review them and choose Continue.",
    alt: "A Requirement Prism resolving diffuse teal and gold light into one precise decision object",
    primaryLabel: "Open the hosted preview",
  },
  serviceIntro:
    "Augmentoring provides the hosted Aithema preview and professional requirements support.",
  proof: [
    "Speak, type or share files",
    "Requirements stay reviewable",
    "A person chooses Continue",
    "Reusable open-source module planned",
  ],
  problem: {
    eyebrow: "Before the build",
    title: "Good work needs a clear starting point.",
    lead:
      "Ideas arrive through conversations, notes and files. The difficult part is turning them into one version that a person can inspect, correct and approve.",
    visualAlt:
      "A Requirement Prism turning diffuse input into one precise requirement",
    visualCaption:
      "Many inputs become one reviewable requirement, not an automatic decision.",
    items: [
      {
        title: "Conversation moves quickly",
        body:
          "Important constraints can remain implied or disappear between a call and the first written brief.",
        meta: "Capture what was meant",
        icon: "mic",
      },
      {
        title: "Files hold scattered context",
        body:
          "Examples, policies and earlier decisions matter, but they rarely arrive as one usable requirement set.",
        meta: "Bring the evidence together",
        icon: "library",
      },
      {
        title: "A draft is not approval",
        body:
          "Generated wording can be useful, but the person who owns the outcome must be able to correct it before work continues.",
        meta: "Review remains a human step",
        icon: "shield-check",
      },
    ],
  },
  model: {
    eyebrow: "The Aithema path",
    title: "Share. Shape. Review. Continue.",
    lead:
      "Aithema handles the effort of organizing input while keeping the decision with you.",
    steps: [
      {
        number: "01",
        title: "Share",
        visual: { x: 23, y: 31 },
        body:
          "Explain the need by voice or text, and add the files that carry relevant context.",
        icon: "mic",
        signal: "The source material stays visible to the discussion.",
      },
      {
        number: "02",
        title: "Shape",
        visual: { x: 42, y: 52 },
        body:
          "Aithema organizes the input into requirements that can be read, discussed and changed.",
        icon: "list-tree",
        signal: "A concrete requirement set is ready for review.",
      },
      {
        number: "03",
        title: "Review",
        visual: { x: 64, y: 52 },
        body:
          "Check the wording, assumptions and boundaries. Correct what is wrong or incomplete.",
        icon: "scan-search",
        signal: "Nothing advances merely because a draft exists.",
      },
      {
        number: "04",
        title: "Continue",
        visual: { x: 82, y: 31 },
        body:
          "Choose Continue only when the requirements describe the work you actually want.",
        icon: "check-circle-2",
        signal: "Your decision creates the handoff to the next step.",
      },
    ],
    closing:
      "Aithema helps with the hard part between an idea and a usable brief. It does not replace the person who owns the decision.",
  },
  featureSections: [
    {
      id: "input",
      eyebrow: "Input",
      title: "Start with what you already have.",
      lead:
        "A requirement can begin as a sentence, a conversation or a set of supporting files.",
      items: [
        {
          title: "Speak",
          body:
            "Talk through the need in your own words instead of preparing a perfect brief first.",
          icon: "mic",
        },
        {
          title: "Type",
          body:
            "Write directly when precision matters or when you already know the essential constraint.",
          icon: "braces",
        },
        {
          title: "Share files",
          body:
            "Add the material that explains examples, boundaries or earlier decisions.",
          icon: "file-check-2",
        },
      ],
    },
    {
      id: "review",
      eyebrow: "Human control",
      title: "Keep the important choice visible.",
      lead:
        "The useful output is not text that looks finished. It is a requirement set you understand and choose to use.",
      items: [
        {
          title: "Inspect the result",
          body:
            "Read the requirements before they become the basis for later work.",
          icon: "eye",
        },
        {
          title: "Correct the draft",
          body:
            "Change unclear wording, missing context and assumptions that do not belong.",
          icon: "sliders-horizontal",
        },
        {
          title: "Choose Continue",
          body:
            "The handoff happens because you approve it, not because the tool reached the end of a form.",
          icon: "user-round-check",
        },
      ],
    },
  ],
  audiences: {
    eyebrow: "Who it helps",
    title: "For people turning intent into work.",
    lead:
      "Aithema is useful whenever the person describing a need and the person delivering it need a clearer shared starting point.",
    items: [
      {
        title: "People with an idea",
        body:
          "Explain the outcome without first learning how to write a technical specification.",
      },
      {
        title: "Teams receiving requests",
        body:
          "Begin with reviewable requirements instead of reconstructing intent from scattered messages.",
      },
      {
        title: "Service partners",
        body:
          "Make the first handoff explicit before estimates, plans or implementation begin.",
      },
    ],
  },
  limits: {
    eyebrow: "Current boundary",
    title: "Preview now. Reusable module later.",
    lead:
      "The hosted preview is available today. The reusable open-source Aithema module has not been released yet.",
    items: [
      "The public experience currently runs at start.augmentoring.com.",
      "No Aithema source repository or product license is claimed before the reusable module ships.",
      "Aithema supports requirement shaping and review; it does not silently approve or begin implementation.",
      "Published release, integration and self-hosting claims will wait for inspectable evidence.",
    ],
  },
  releasePath: {
    eyebrow: "Open-source path",
    title: "The reusable module is planned.",
    body:
      "Aithema is intended to become an open-source template or module. Until that release exists, the hosted preview is the honest way to use it.",
  },
  faq: [
    {
      question: "Can I try Aithema now?",
      answer:
        "Yes. The working public preview is available at start.augmentoring.com.",
    },
    {
      question: "Is Aithema open source today?",
      answer:
        "Not yet. A reusable open-source module is planned, but no Aithema repository or license is presented before that release exists.",
    },
    {
      question: "Does Aithema approve requirements for me?",
      answer:
        "No. Aithema helps shape the input. You review the result, correct it and choose whether to Continue.",
    },
    {
      question: "Who owns Aithema?",
      answer:
        "Aithema is a product by Markus Barta. Augmentoring provides the hosted preview and professional services that use it.",
    },
  ],
  finalCta: {
    title: "Need help shaping the first brief?",
    body:
      "Use the hosted preview directly, or work with Augmentoring when the requirements need a professional service path.",
  },
} satisfies PreviewProductContent;
