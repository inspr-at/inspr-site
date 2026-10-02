import { productTaxonomy, siteUrls } from "./urls";
import type { PreviewProductContent } from "./types";

export const aithemaContent = {
  slug: "aithema",
  name: "Aithema",
  category: productTaxonomy.aithema,
  canonicalUrl: siteUrls.aithema,
  repositoryUrl: "https://github.com/inspr-at/aithema",
  releaseUrl: "https://github.com/inspr-at/aithema/releases",
  licenseUrl: "https://github.com/inspr-at/aithema/blob/main/LICENSE",
  seo: {
    title: "Aithema | Requirements you approve before work begins",
    description:
      "Aithema turns conversation and files into reviewable requirements. You correct the result and choose whether work should continue.",
  },
  hero: {
    sheet: {
      repo: "github.com/inspr-at/aithema",
      runtime: "Hosted web workspace.",
      gate: "A person reviews the requirement set and chooses Continue; nothing downstream starts on a draft.",
      artefact: "Structured, versioned requirement set with its sources.",
      interfaces: "web workspace",
      maturity: "core released, AGPL-3.0-only; hosted workspace by invitation",
    },
    eyebrow: "Requirements, made reviewable",
    title: "Requirements you approve before work begins.",
    depths: {
      simple:
        "Talk, type or drop in files. Aithema turns that into a clear list of what you need, then waits for you to read it and say Continue.",
      technical:
        "Speech, text and files become a structured, reviewable requirement set. Aithema organises the input; the review and the explicit Continue stay with you, so nothing downstream starts on an unapproved draft.",
    },
    lead:
      "Speak, type or share files. Aithema helps turn that input into clear requirements, then waits for you to review them and choose Continue.",
    alt: "A Requirement Prism resolving diffuse teal and gold light into one precise decision object",
    primaryLabel: "Request access",
  },
  serviceIntro:
    "Augmentoring provides the hosted Aithema workspace by invitation and professional requirements support.",
  proof: [
    "Speak, type or share files",
    "Requirements stay reviewable",
    "A person chooses Continue",
    "Reusable open-source module planned",
  ],
  problem: {
    eyebrow: "Before the build",
    title: "Good work needs a clear starting point.",
    depths: {
      simple:
        "Ideas show up in chats, notes and files. The hard part is making one version out of them that a person can read, fix and approve.",
      technical:
        "Input arrives fragmented across conversations, notes and documents. The work is consolidating it into one versioned, inspectable requirement set that a person can correct and approve before delivery begins.",
    },
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
    handoff: {
      in: "conversation + files",
      out: "approved requirement set",
    },
    eyebrow: "The Aithema path",
    title: "Share. Shape. Review. Continue.",
    depths: {
      simple:
        "Aithema does the sorting and tidying. You make the decision.",
      technical:
        "Aithema carries the consolidation and structuring effort while the approval decision remains a human action with a reviewable artefact behind it.",
    },
    lead:
      "Aithema handles the effort of organizing input while keeping the decision with you.",
    steps: [
      {
        number: "01",
        simple: "Say or write what you need and add helpful files.",
        title: "Share",
        visual: { x: 23, y: 31 },
        body:
          "Explain the need by voice or text, and add the files that carry relevant context.",
        icon: "mic",
        signal: "The source material stays visible to the discussion.",
      },
      {
        number: "02",
        simple: "Turn that input into a clear description you can change.",
        title: "Shape",
        visual: { x: 42, y: 52 },
        body:
          "Aithema organizes the input into requirements that can be read, discussed and changed.",
        icon: "list-tree",
        signal: "A concrete requirement set is ready for review.",
      },
      {
        number: "03",
        simple: "Read the draft and correct anything wrong or missing.",
        title: "Review",
        visual: { x: 64, y: 52 },
        body:
          "Check the wording, assumptions and boundaries. Correct what is wrong or incomplete.",
        icon: "scan-search",
        signal: "Nothing advances merely because a draft exists.",
      },
      {
        number: "04",
        simple: "Continue when the description says what you really want.",
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
    title: "Open core today. Hosted workspace by invitation.",
    lead:
      "Aithema's reusable core is published as open source with tagged releases. The hosted workspace that runs it is available by invitation.",
    items: [
      "The reusable core is public on GitHub as inspr-at/aithema under AGPL-3.0-only, with tagged releases.",
      "Access to the hosted workspace is by invitation; Augmentoring opens it for you.",
      "Aithema supports requirement shaping and review; it does not silently approve or begin implementation.",
      "Integration and self-hosting guidance follows the core's release notes; claims beyond them wait for inspectable evidence.",
    ],
  },
  releasePath: {
    eyebrow: "Open source",
    title: "The reusable core is published.",
    body:
      "Aithema's core is open-source software under AGPL-3.0-only. Read it, run it and change it under those terms; the hosted workspace by invitation is the fastest way to use it today.",
  },
  faq: [
    {
      question: "Can I try Aithema now?",
      answer:
        "Yes, by invitation. Ask Augmentoring for access and you work in the hosted Aithema workspace.",
    },
    {
      question: "Is Aithema open source today?",
      answer:
        "Yes. The reusable core is published on GitHub under AGPL-3.0-only, with tagged releases. The hosted workspace is available by invitation.",
    },
    {
      question: "Does Aithema approve requirements for me?",
      answer:
        "No. Aithema helps shape the input. You review the result, correct it and choose whether to Continue.",
    },
    {
      question: "Who owns Aithema?",
      answer:
        "Aithema is a product by Markus Barta. Augmentoring provides the hosted workspace by invitation and professional services that use it.",
    },
  ],
  finalCta: {
    title: "Need help shaping the first brief?",
    body:
      "Ask for an invitation to the hosted workspace, or work with Augmentoring when the requirements need a professional service path.",
  },
} satisfies PreviewProductContent;
