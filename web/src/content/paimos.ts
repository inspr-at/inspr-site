import { productTaxonomy, siteUrls } from "./urls";
import type { ProductContent } from "./types";

const repositoryUrl = "https://github.com/markus-barta/paimos";
const docsUrl = (document: string) =>
  `${repositoryUrl}/blob/main/docs/${document}`;

export const paimosContent = {
  slug: "paimos",
  name: "Paimos",
  category: productTaxonomy.paimos,
  canonicalUrl: siteUrls.paimos,
  repositoryUrl,
  releaseUrl: `${repositoryUrl}/releases`,
  license: {
    name: "AGPL-3.0-only",
    url: `${repositoryUrl}/blob/main/LICENSE`,
    note: "The Paimos repository declares SPDX license AGPL-3.0-only. Inspect it, self-host it, fork it and modify it under those terms.",
  },
  seo: {
    title: "Paimos | Project context for people and AI agents",
    description:
      "Self-hosted project management that keeps work, repository context, AI execution controls, run evidence and customer acceptance in one project picture.",
  },
  hero: {
    eyebrow: "Project context, shared",
    title: "One shared project picture.",
    lead:
      "Paimos is self-hosted project management for engineering and delivery teams that work with AI agents. It keeps issues, repository context, operating knowledge, execution choices and run evidence together, so an agent can act with context and a human can see what happened.",
    alt: "Abstract project agora with people and AI participants around a shared operating surface",
    primaryLabel: "See how it works",
    primaryHref: "#model",
  },
  serviceIntro:
    "Augmentoring deploys, integrates and operates Paimos for teams.",
  proof: [
    "Self-hosted",
    "CLI, MCP and REST",
    "Human and agent work in one history",
    "Inspectable source and release evidence",
  ],
  specs: {
    eyebrow: "Specs",
    title: "What you actually get.",
    lead:
      "The capability grid at a glance: security posture, operational guarantees and open surfaces, before the prose spells each one out.",
    items: [
      {
        label: "Enterprise-capable",
        icon: "layers-3",
        note: "SSO, audit, retention and project permissions ship in the core — no enterprise add-ons to license.",
      },
      {
        label: "Self-hostable",
        icon: "server",
        note: "One container on your own server. Your data and its whole path stay under your control.",
      },
      {
        label: "Air-gap friendly",
        icon: "unplug",
        note: "The core runs with zero outbound calls. Only optional hosted AI ever needs the internet.",
      },
      {
        label: "Zero telemetry",
        icon: "eye-off",
        note: "No analytics, tracking or phone-home. Nothing about your usage leaves your instance.",
      },
      {
        label: "NIS2-aligned",
        icon: "shield-check",
        note: "Access control, audit, incident metadata and retention map to NIS2 practices — real controls, not a certificate.",
      },
      {
        label: "GDPR-conscious",
        icon: "lock-keyhole",
        note: "Per-person export and erase endpoints, operator-set retention. Built to respect the people in your data.",
      },
      {
        label: "Made in Austria",
        icon: "mountain",
        note: "Designed and built in Austria, in the EU — real people and EU norms behind your project OS.",
      },
      {
        label: "Audit trails",
        icon: "scroll-text",
        note: "Access changes, AI calls and agent runs keep reviewable metadata. You can always answer who did what.",
      },
      {
        label: "Single sign-on",
        icon: "key-round",
        note: "Generic OIDC with PKCE, ZITADEL-validated. Your identity provider stays the source of truth.",
      },
      {
        label: "SBOM + signed releases",
        icon: "file-check-2",
        note: "Every tagged image is cosign-signed with a CycloneDX SBOM. Trace any release back to its source.",
      },
      {
        label: "Fully inspectable",
        icon: "scan-search",
        note: "AGPL source, an open API and a self-describing schema. Nothing about how it works is hidden.",
      },
      {
        label: "AGPL-3.0",
        icon: "git-branch",
        note: "Inspect, self-host, fork and modify freely. Run a modified service and its users keep the source.",
      },
      {
        label: "Restore-tested",
        icon: "database-backup",
        note: "Backup and restore are documented and exercised, not assumed. Recovery is a drill, not a hope.",
      },
      {
        label: "Scriptable API",
        icon: "braces",
        note: "Typed CLI, MCP and a JSON REST API with dry-runs. Drive the whole project model from anywhere.",
      },
      {
        label: "Built-in AI assist",
        icon: "sparkles",
        note: "Thirteen focused actions — refine, translate, estimate, summarise. On when you want it, off by default.",
      },
      {
        label: "Code-aware agents",
        icon: "workflow",
        note: "Agents receive linked repos, knowledge and issue-to-file anchors. They act with project context, not blind.",
      },
      {
        label: "Local draft providers",
        icon: "hard-drive",
        note: "Point at Ollama or any OpenAI-compatible endpoint. Keep model inference on your own hardware.",
      },
    ],
  },
  problem: {
    eyebrow: "Why Paimos",
    title: "Fragments break AI work.",
    lead:
      "A ticket says what should change. The repository says where. A runbook says how. A chat window says what an agent tried. None of those systems alone can answer who acted, which context they received, what authority they had and what came back.",
    visualAlt:
      "Separate work, repository, knowledge and evidence stations converging into one shared transparent project ledger used by a person and an AI agent.",
    visualCaption:
      "One project record connects work, context, execution and evidence.",
    items: [
      {
        title: "Context is scattered",
        icon: "unplug",
        body:
          "Requirements, code, runbooks, project conventions and operational knowledge often live in different tools or on one developer's machine. Every new run starts by reconstructing the project.",
        meta: "The agent sees a task, not the system around it.",
      },
      {
        title: "Execution is opaque",
        icon: "eye-off",
        body:
          "A model draft, a local coding agent and a deploy-capable runner have very different authority. When those differences are hidden behind one generic AI button, review and accountability become guesswork.",
        meta: "Provider, context and capability need to be explicit.",
      },
      {
        title: "Delivery loses its evidence",
        icon: "file-warning",
        body:
          "Work can move from prompt to pull request without its tests, version, decisions or customer-facing result returning to the project record. Done becomes a claim instead of a reviewable state.",
        meta: "The loop is incomplete until evidence comes back.",
      },
    ],
  },
  model: {
    eyebrow: "How it works",
    title: "The project is the control plane.",
    lead:
      "Paimos connects work, context, execution and evidence in one permission-aware system. People plan and review in the same project model that agents read from and report back to.",
    steps: [
      {
        number: "01",
        title: "Plan",
        visual: { x: 24, y: 18 },
        icon: "folder-kanban",
        body:
          "Structure work as epics, tickets and tasks. Add typed dependencies, sprints, releases, estimates, time and customer-facing delivery state.",
        meta: "One hierarchy for human and agent work",
        signal: "Hierarchy, dependencies and delivery state",
        reference: {
          label: "Planning hierarchy",
          href: docsUrl("PLANNING_HIERARCHY.md"),
          external: true,
        },
      },
      {
        number: "02",
        title: "Context",
        visual: { x: 22, y: 68 },
        icon: "book-open-check",
        body:
          "Link repositories and durable knowledge. Add runbooks, guidelines, external systems, agent definitions and issue-to-file anchors.",
        meta: "Project knowledge survives the current machine and agent runtime",
        signal: "Repositories, knowledge and code anchors",
        reference: {
          label: "Agent integration",
          href: docsUrl("AGENT_INTEGRATION.md"),
          external: true,
        },
      },
      {
        number: "03",
        title: "Run",
        visual: { x: 50, y: 40 },
        icon: "play",
        body:
          "Choose the provider, execution profile, effort, prompt preset, context pack and agent before work begins. Capability stays visible before authority is granted.",
        meta: "Draft, edit, test and deploy remain distinct actions",
        signal: "Explicit provider, profile and capability",
        reference: {
          label: "Execution providers",
          href: docsUrl("IMPLEMENT_THIS_PROVIDERS.md"),
          external: true,
        },
      },
      {
        number: "04",
        title: "Evidence",
        visual: { x: 77, y: 69 },
        icon: "file-check-2",
        body:
          "Keep run status, provider identity, safe provenance, test results, version and optional deploy outcome attached to the project history.",
        meta: "What ran and what returned remain reviewable",
        signal: "Status, tests, version and safe provenance",
        reference: {
          label: "Agent interface",
          href: docsUrl("AGENT_INTERFACE.md"),
          external: true,
        },
      },
      {
        number: "05",
        title: "Accept",
        visual: { x: 50, y: 78 },
        icon: "badge-check",
        body:
          "Publish only selected work to the customer portal, produce delivery reports and close the loop with explicit acceptance.",
        meta: "Internal truth and customer communication stay connected",
        signal: "Selected delivery and explicit acceptance",
        reference: {
          label: "Customer portal",
          href: docsUrl("CUSTOMER_PORTAL.md"),
          external: true,
        },
      },
    ],
    closing:
      "Agent runtimes can change. The durable project context, permissions and evidence remain in Paimos.",
  },
  featureSections: [
    {
      id: "structured-work",
      eyebrow: "Work",
      title: "Structure, without theatre.",
      lead:
        "Paimos provides enough structure for real delivery without turning the tool into a process consultancy. The work model is explicit, searchable and usable from the interface, CLI or API.",
      items: [
        {
          title: "A hierarchy that stays legible",
          icon: "list-tree",
          body:
            "Epics, tickets and tasks form the core hierarchy. Sprints, releases and cost units add planning and commercial context without forcing every project into the same ceremony.",
          meta: "Epic, ticket, task, sprint, release and cost unit",
          reference: {
            label: "Planning hierarchy",
            href: docsUrl("PLANNING_HIERARCHY.md"),
            external: true,
          },
        },
        {
          title: "Relations with meaning",
          icon: "git-compare-arrows",
          body:
            "Groups, sprint membership, dependencies, impacts, follow-ups, blocks and related links are typed relations rather than prose hidden in a description.",
          meta: "Seven relation types with directional rendering",
        },
        {
          title: "Views for daily work",
          body:
            "Saved filters, configurable columns, sorting, full-text search, pinned views and partial issue-key matching keep large project histories usable.",
          meta: "Per-user views and filter persistence",
        },
        {
          title: "Bulk change with recovery",
          body:
            "Atomic create and update operations support structured automation. Undo and redo use mutation history and conflict detection instead of silently overwriting newer work.",
          meta: "Transactional bulk operations and explicit conflicts",
        },
        {
          title: "Effort, time and delivery state",
          body:
            "Estimates, time entries, accruals, rate and budget fields, releases and the delivery-to-acceptance lifecycle keep implementation and commercial progress in the same model.",
          meta: "From backlog to accepted and invoiced",
        },
      ],
    },
    {
      id: "agent-context",
      eyebrow: "Context",
      title: "Give agents the project.",
      lead:
        "A coding agent needs to know which repository matters, which rules apply and where the change belongs. Paimos exposes that context as structured, permission-aware project data.",
      items: [
        {
          title: "Linked repositories",
          icon: "git-branch",
          body:
            "Projects carry their repository inventory and default branches, so an agent can resolve the correct source before it starts searching or editing.",
          meta: "Multi-repository project context",
        },
        {
          title: "Durable knowledge plane",
          icon: "library",
          body:
            "Memories, runbooks, guidelines, external systems and related projects become project-owned knowledge instead of a loose collection of machine-local files.",
          meta: "Browsable, searchable and reusable context",
        },
        {
          title: "Canonical agent definitions",
          body:
            "Project agents carry descriptions, bootstrap steps and non-negotiable rules. Adapter tooling can render those definitions for different agent harnesses without duplicating the source.",
          meta: "Project metadata upstream of the current runtime",
        },
        {
          title: "Issue-to-file anchors",
          body:
            "Repository scanners can attach issues to concrete files and symbols. Staleness checks and provenance help agents distinguish declared context from derived context.",
          meta: "The ticket can point at the code it governs",
        },
        {
          title: "Graph and mixed retrieval",
          body:
            "Lexical, local-vector and graph paths compose into one retrieval surface with ranked hits and provenance. Retrieval degrades to the remaining strategies when vectors are absent.",
          meta: "Context retrieval with inspectable strategy metadata",
        },
      ],
    },
    {
      id: "execution-control",
      eyebrow: "Execution",
      title: "Authority before action.",
      lead:
        "A hosted model draft is not a local agent with repository access. Paimos keeps provider, model, context, execution location and capability visible instead of collapsing them into one ambiguous action.",
      items: [
        {
          title: "Built-in AI assistance",
          icon: "sparkles",
          body:
            "Thirteen actions cover tasks such as text refinement, translation, specification, subtask generation, effort estimation, duplicate detection and customer or executive summaries.",
          meta: "Admin-tunable prompts with usage and cost metadata",
        },
        {
          title: "Shared execution controls",
          icon: "sliders-horizontal",
          body:
            "Profiles, effort, prompt presets and context packs use the same concepts across in-app AI actions and Implement-this runs. Project defaults and policies can narrow the available choices.",
          meta: "One control vocabulary across actions and runs",
        },
        {
          title: "Trusted local runners",
          body:
            "Claude Code and Codex runners operate in an explicitly selected local checkout. They may edit and test when their advertised capability allows it. Each workstation opts in and processes one job at a time.",
          meta: "Local repository authority remains local",
          reference: {
            label: "Provider boundaries",
            href: docsUrl("IMPLEMENT_THIS_PROVIDERS.md"),
            external: true,
          },
        },
        {
          title: "Draft providers stay drafts",
          body:
            "OpenRouter and OpenAI-compatible local endpoints can prepare plans or review notes. They cannot claim repository edits, local tests or deployment authority.",
          meta: "Suggestion and execution remain separate trust boundaries",
        },
        {
          title: "Deploy remains deliberate",
          body:
            "Deployment is available only through a trusted local runner and requires independent runner flags, a deploy command and a run-level target. It is never implied by choosing a model.",
          meta: "Three explicit gates before deploy",
        },
        {
          title: "Safe provenance",
          body:
            "Run records capture provider, model, profile, effort, prompt reference, context source, agent, runner, status, tests and version without logging prompt bodies, response bodies, API keys or local environment values.",
          meta: "Enough evidence to review, without turning secrets into logs",
        },
      ],
    },
    {
      id: "customer-delivery",
      eyebrow: "Delivery",
      title: "Keep delivery connected.",
      lead:
        "Internal implementation and customer communication should not drift into separate realities. Paimos turns selected project state into a deliberate, reviewable customer surface.",
      items: [
        {
          title: "Visibility is opt-in",
          icon: "eye",
          body:
            "Internal editors explicitly mark which issues are customer-visible. Hidden issues return no identifying detail through portal endpoints, while customer-submitted requests are visible by design.",
          meta: "Internal knowledge stays internal unless deliberately published",
        },
        {
          title: "A focused external portal",
          icon: "panels-top-left",
          body:
            "External users see the projects and issues they are allowed to access, can submit requests and can review delivery state without entering the internal workspace.",
          meta: "Project access plus explicit issue visibility",
        },
        {
          title: "Reports built from project state",
          body:
            "Project reports can combine selected issues, technical or customer-facing summaries and configurable columns into stable JSON and PDF snapshots.",
          meta: "A delivery record derived from the same system of work",
        },
        {
          title: "Acceptance leaves evidence",
          body:
            "Short links and QR codes lead to explicit acceptance. Included delivery items can be accepted as a batch, and a signed report artifact can remain attached to the snapshot.",
          meta: "From delivered to accepted without a parallel spreadsheet",
          reference: {
            label: "Customer portal",
            href: docsUrl("CUSTOMER_PORTAL.md"),
            external: true,
          },
        },
      ],
    },
  ],
  audiences: {
    eyebrow: "For teams",
    title: "Move fast. Stay accountable.",
    lead:
      "Paimos is most useful where software delivery, AI-assisted work and client responsibility meet. Each role sees the same project truth from a different operational angle.",
    items: [
      {
        title: "Engineering teams",
        body:
          "Give people and agents the same work hierarchy, repository context and execution history. Reduce context reconstruction without turning AI access into an invisible side channel.",
        meta: "Plan, implement, test and review in one project model",
      },
      {
        title: "Delivery and project leads",
        body:
          "Track dependencies, effort, time, releases and customer-visible outcomes while keeping internal notes, runbooks and unresolved work out of the external portal.",
        meta: "Operational delivery without a second reporting truth",
      },
      {
        title: "Client service teams",
        body:
          "Connect implementation work to customer requests, reports and acceptance. Preserve a clear boundary between internal execution context and selected external communication.",
        meta: "A deliberate path from work to acceptance",
      },
      {
        title: "Platform and security teams",
        body:
          "Keep identity, project permissions, audit, retention, provider policy and deployment choices under operator control. Inspect the code and verify release artifacts before deployment.",
        meta: "Self-hosted control with documented trust boundaries",
      },
    ],
  },
  architecture: {
    eyebrow: "Architecture",
    title: "Compact enough to understand.",
    lead:
      "Paimos favors a small, inspectable operational footprint over a distributed platform assembled from mandatory services.",
    paragraphs: [
      "A single Go process serves the Vue application and JSON API on one port. SQLite in WAL mode is the system of record, with additive migrations applied at startup.",
      "S3-compatible storage is optional for attachments, and SMTP is optional for password reset email. OIDC and model providers enter the system only when an operator configures them. Missing optional services degrade their feature instead of preventing the core application from starting.",
      "This default is straightforward to deploy, back up and restore. It is a single-node architecture today, not a multi-node high-availability control plane.",
    ],
    flow: [
      "Browser, CLI, MCP and REST",
      "One Go service",
      "Vue interface and JSON API",
      "SQLite in WAL mode",
      "Optional S3, SMTP, OIDC and model providers",
    ],
    facts: [
      "One application process and one primary data file",
      "No mandatory Redis, message queue or external database",
      "Docker Compose deployment path",
      "Automatic additive schema migrations",
      "Optional services fail gracefully",
      "Operator-controlled branding and identity settings",
    ],
  },
  trust: {
    eyebrow: "Trust",
    title: "Trust leaves evidence.",
    lead:
      "Paimos backs public claims with code, tests, signed artifacts, runbooks and an explicit list of limits. The goal is reviewable behavior, not compliance theatre.",
    items: [
      {
        title: "Identity and local authorization",
        body:
          "Generic OIDC with authorization code and PKCE handles identity. Verified-email matching and invite-only provisioning are the default. Roles and project permissions stay local, with local login and TOTP available as an alternative.",
        meta: "ZITADEL is the validated reference identity provider",
      },
      {
        title: "Audit and retention",
        body:
          "Session mutations are audited by default. Access changes, incidents, AI calls and agent runs have reviewable metadata, while retention windows and per-subject export and erase paths remain operator-controlled.",
        meta: "Bodies and secrets are excluded from AI audit records",
      },
      {
        title: "Release integrity",
        body:
          "Tagged container images are signed keylessly with cosign through GitHub OIDC. CycloneDX SBOMs for Go and frontend dependencies are attached as attestations against the same image digest.",
        meta: "A release can be traced back to source and dependency evidence",
        reference: {
          label: "Release verification",
          href: docsUrl("RELEASE.md"),
          external: true,
        },
      },
      {
        title: "Data control",
        body:
          "Paimos includes no analytics, tracking pixels, forced telemetry or mandatory cloud dependency. Hosted AI providers receive project content only when an operator enables and selects them.",
        meta: "Self-hosting keeps the default data path under operator control",
      },
      {
        title: "Security controls with concrete scope",
        body:
          "Project access checks, CSRF protection, rate-limited authentication, hashed API keys, hardened attachment serving, retention sweeps and GDPR export and erase endpoints are part of the shipped implementation.",
        meta: "NIS2-aligned controls and GDPR-conscious operations, not certification claims",
      },
      {
        title: "Operational proof",
        body:
          "Backup, restore, upgrade and incident paths are documented and exercised. Public evidence also states where the current reference base or review coverage is still small.",
        meta: "Limits remain part of the trust story",
      },
    ],
  },
  integrations: {
    eyebrow: "Integrations",
    title: "Open surfaces first.",
    lead:
      "Paimos exposes its own project model through documented interfaces, then adds focused import and provider paths where teams already have operational systems.",
    items: [
      {
        name: "paimos CLI",
        status: "Built in",
        description:
          "Typed commands, file-first multiline inputs, JSON output, dry runs, idempotent transitions and declarative bulk apply for agents, scripts and CI.",
      },
      {
        name: "MCP",
        status: "Built in",
        description:
          "A curated stdio facade for interactive agent clients. Bulk workflows remain in the CLI so tool context stays bounded.",
      },
      {
        name: "REST, OpenAPI and schema",
        status: "Built in",
        description:
          "A JSON API, OpenAPI document and self-describing schema expose routes, enums, transitions and field shapes to first-party and external clients.",
      },
      {
        name: "Generic OIDC",
        status: "Supported",
        description:
          "Authorization code with PKCE, verified-email matching and local project authorization. ZITADEL is the validated reference provider.",
      },
      {
        name: "Jira",
        status: "Import",
        description:
          "Project discovery, field and relation mapping, previews and asynchronous issue import into a new or existing Paimos project.",
      },
      {
        name: "Mite",
        status: "Import",
        description:
          "DE and AT-oriented time-entry import with user mapping, preview, resume date and cleanup support.",
      },
      {
        name: "HubSpot",
        status: "Reference CRM",
        description:
          "Customer and contact import, remote search, manual re-sync and deep links. Paimos does not write changes back to HubSpot.",
      },
      {
        name: "HTTP CRM sidecar",
        status: "Extensible",
        description:
          "An HMAC-signed JSON contract lets an operator bridge another CRM from any language for import, sync, search and deep links.",
      },
      {
        name: "CSV",
        status: "Built in",
        description:
          "Per-project and cross-project import and export, with validation before data is committed.",
      },
      {
        name: "S3-compatible storage",
        status: "Optional",
        description:
          "MinIO or another compatible object store can hold attachments. The attachment surface disables cleanly when storage is not configured.",
      },
      {
        name: "SMTP",
        status: "Optional",
        description:
          "Outbound email supports password-reset delivery. The core project system does not depend on an email service.",
      },
      {
        name: "OpenRouter",
        status: "Optional draft provider",
        description:
          "Hosted models can provide in-app assistance and draft plans. They receive only the context selected for that request and have no local shell or deploy path.",
      },
      {
        name: "OpenAI-compatible local models",
        status: "Optional draft provider",
        description:
          "Ollama, LM Studio, llama.cpp or an internal gateway can provide draft assistance through a compatible chat-completions endpoint.",
      },
      {
        name: "Claude Code and Codex",
        status: "Trusted local runners",
        description:
          "Developer-owned runners can claim explicitly targeted work in an allowlisted local checkout, edit files, run tests and report the result back.",
      },
    ],
  },
  limits: {
    eyebrow: "Operational fit",
    title: "No pretending.",
    lead:
      "A useful deployment decision depends on the boundaries as much as the feature list. These limits describe the current product rather than a future roadmap.",
    items: [
      "The default deployment is a compact single-node Go and SQLite system. It is not a multi-node high-availability control plane.",
      "Hosted and local-model providers are draft-only. Repository edits, tests and deployment require an explicitly trusted local runner.",
      "Deployment is local-runner-only and triple-gated. Selecting a model never grants deploy authority.",
      "One generic OIDC provider is supported. SAML is not. The current OIDC implementation trusts the TLS-protected userinfo round trip rather than verifying the ID token locally through JWKS.",
      "Only the latest release receives security fixes. There is no LTS program.",
      "Paimos has not yet completed an independent third-party security review.",
      "The documented evidence base currently contains one active production proving ground and one historical second-operator deployment.",
      "There is no published scale benchmark. Production adoption should validate representative projects, users, concurrency and attachment volume.",
      "CRM synchronization is pull and import based. CRM-to-Paimos webhooks are not supported, and one generic HTTP CRM sidecar can be configured per deployment.",
      "Paimos has a responsive web interface but no native mobile application.",
    ],
  },
  openSource: {
    eyebrow: "Open source",
    title: "Open by architecture, not by campaign.",
    body:
      "Paimos is licensed under AGPL-3.0-only. You can inspect it, self-host it, fork it and modify it under those terms. If you operate a modified version as a network service, its users retain the right to receive the corresponding source. Open source is not the hero claim, but it keeps the product, its trust boundaries and its future inspectable.",
    links: [
      {
        label: "GitHub repository",
        href: repositoryUrl,
        external: true,
      },
      {
        label: "Releases and verification",
        href: `${repositoryUrl}/releases`,
        external: true,
      },
      {
        label: "Project license (AGPL-3.0-only)",
        href: `${repositoryUrl}/blob/main/LICENSE`,
        external: true,
      },
      {
        label: "Security policy",
        href: `${repositoryUrl}/blob/main/SECURITY.md`,
        external: true,
      },
      {
        label: "Official AGPL text",
        href: siteUrls.agpl,
        external: true,
      },
    ],
  },
  faq: [
    {
      question: "Is Paimos a chatbot inside a project tool?",
      answer:
        "No. AI actions and agents participate in the project model, but Paimos remains a project management and context system. Work state, permissions, provider choices and evidence stay explicit.",
    },
    {
      question: "Can an AI model change a repository automatically?",
      answer:
        "Hosted and local-model providers are draft-only. Repository edits and tests require a trusted local runner. Deployment requires additional independent opt-ins and a run-level target.",
    },
    {
      question: "Does Paimos require an AI provider?",
      answer:
        "No. AI assistance is off by default. Core project management, context, reporting, API and portal functions work without a hosted or local model provider.",
    },
    {
      question: "Can we use our identity provider?",
      answer:
        "Paimos supports one generic OIDC provider using authorization code and PKCE. ZITADEL is the validated reference. Local login and TOTP remain available. SAML is not currently supported.",
    },
    {
      question: "Can customers see internal work?",
      answer:
        "Not unless an internal editor explicitly marks it customer-visible. Customer-submitted requests are visible by design. Other portal visibility is opt-in, and hidden issue endpoints avoid disclosing the issue's existence.",
    },
    {
      question: "Is Paimos cloud-only?",
      answer:
        "No. Paimos is self-hosted and has no mandatory SaaS dependency. S3-compatible attachments, SMTP, OIDC and model providers are optional operator choices.",
    },
    {
      question: "What can an agent read from a project?",
      answer:
        "Subject to the caller's project access, an agent can read issues, linked repositories, knowledge entries, canonical agent definitions, issue-to-file anchors, graph relationships and ranked mixed-context retrieval results.",
    },
    {
      question: "What scale does Paimos support?",
      answer:
        "Paimos is designed as a compact single-node system. There is no published performance envelope yet, so a production rollout should test representative data volume, user concurrency and attachment usage.",
    },
    {
      question: "How does the commercial path relate to the open product?",
      answer:
        "The repository remains the product. Augmentoring can provide architecture, rollout, integration and ongoing operations around that same open codebase without replacing it with a closed edition.",
    },
  ],
  finalCta: {
    title: "Run it your way.",
    body:
      "Deploy Paimos from the public source and keep the complete operating model under your control. If you need architecture, rollout, integration or ongoing operations, Augmentoring provides the commercial path around the same open product.",
  },
} satisfies ProductContent;
