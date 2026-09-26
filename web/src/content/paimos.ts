import { productTaxonomy, siteUrls } from "./urls";
import type { ProductContent } from "./types";

// PAIMOS 7, release name AEON (brand.json in the product repository). The
// Aeon codebase takes over inspr-at/paimos at the cutover; the classic code
// moves to inspr-at/paimos-legacy. Every claim below is checked against the
// Aeon source, not carried over from classic Paimos.
const repositoryUrl = "https://github.com/inspr-at/paimos";
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
    note: "The PAIMOS AEON repository declares SPDX license AGPL-3.0-only. Inspect it, self-host it, fork it and modify it under those terms.",
  },
  seo: {
    title: "PAIMOS AEON | Project context for people and AI agents",
    description:
      "Self-hosted, multi-tenant project work for people and AI agents: one work tree, shared project knowledge, scoped agent permissions and an append-only record of what happened.",
  },
  hero: {
    sheet: {
      repo: "github.com/inspr-at/paimos",
      runtime: "Self-hosted: one application container and Postgres, sign-in via OIDC.",
      gate: "Agents ask for each permission; a person approves it before it exists, and the decision is an event in the log.",
      artefact: "Work tree, knowledge, work orders and run records, per tenant and permission-aware.",
      interfaces: "UI, CLI, HTTP API",
      maturity: "Paimos 7 · AEON, released, AGPL-3.0-only",
      command: 'paimos issue create -p PROJ --title "…"',
    },
    eyebrow: "Paimos 7 · AEON",
    title: "One shared project picture.",
    depths: {
      simple:
        "Paimos is project work you run yourself, built for teams where people and AI helpers work side by side. The plan, the background knowledge and the record of what happened live in one place, and a person decides what an agent may do.",
      technical:
        "PAIMOS AEON is self-hosted, multi-tenant project work: one dynamic work tree, a shared knowledge plane, work orders, agent runs and scoped permissions over an append-only event log, exposed through UI, CLI and HTTP API.",
    },
    lead:
      "PAIMOS AEON is the seventh generation of Paimos: self-hosted project work for teams that work with AI agents. People and agents share one work tree and one body of project knowledge, agents ask before they gain a permission, and every change lands in an append-only event log.",
    alt: "Abstract project agora with people and AI participants around a shared operating surface",
    primaryLabel: "See how it works",
    primaryHref: "#model",
  },
  serviceIntro:
    "Augmentoring deploys, integrates and operates Paimos for teams.",
  proof: [
    "Self-hosted",
    "CLI and HTTP API",
    "People and agents in one event log",
    "AGPL source and checksummed releases",
  ],
  specs: {
    eyebrow: "Specs",
    title: "What you actually get.",
    lead:
      "The capability grid at a glance: security posture, operational shape and open surfaces, before the prose spells each one out.",
    leadEli10:
      "The same grid, in plain words: what each promise means for your company, your budget and your legal team. No IT dictionary required. Flip any card.",
    items: [
      {
        label: "Agents first",
        icon: "workflow",
        group: "ai",
        note: "Codex, Claude, Pi, Cursor and Grok sessions work in the same project model as people, each with its own key and scopes.",
        noteEli10:
          "AI helpers from several makers can work in the same projects as your people. Each one has its own badge, so you always know who did what.",
      },
      {
        label: "Scoped permissions",
        icon: "user-round-check",
        group: "security",
        note: "An agent asks for a scope; a person approves or denies it before it expires. The agent's key is always the ceiling.",
        noteEli10:
          "An AI helper has to ask before it gets a new right, and a person says yes or no. It can never ask for more than its badge allows.",
      },
      {
        label: "Self-hostable",
        icon: "server",
        group: "ops",
        note: "One application container and a Postgres database on your own server. Attachments stay on your disk.",
        noteEli10:
          "It runs on your own server, like a coffee machine in your own kitchen. Your data never has to live at somebody else's company.",
      },
      {
        label: "Multi-tenant",
        icon: "layers-3",
        group: "ops",
        note: "Every row carries its tenant, and Postgres row-level security keeps workspaces apart inside one installation.",
        noteEli10:
          "Several teams or companies can share one installation, and the database itself keeps their data apart, not just the app.",
      },
      {
        label: "Event log with undo",
        icon: "rotate-ccw",
        group: "work",
        note: "Every change is an append-only event. Undo writes a compensating event instead of rewriting history.",
        noteEli10:
          "The tool keeps a diary that nobody can tear pages out of. Taking something back adds a new line; the old line stays readable.",
      },
      {
        label: "Zero telemetry",
        icon: "eye-off",
        group: "security",
        note: "No analytics, tracking or phone-home. Agent run counts for tokens and cost stay in your database.",
        noteEli10:
          "The tool does not report home. Nobody, including the makers, sees how your team uses it. Less to explain to privacy officers.",
      },
      {
        label: "Single sign-on",
        icon: "key-round",
        group: "security",
        note: "OIDC with PKCE and a verified ID token. Your identity provider stays the source of truth for people.",
        noteEli10:
          "People sign in with the company account they already have. No new passwords to invent, forget or leak.",
      },
      {
        label: "Access audit",
        icon: "scroll-text",
        group: "security",
        note: "Access changes are recorded as events and can be read back through the audit API.",
        noteEli10:
          "When someone's access changes, the tool writes it down. Later you can check who was allowed to do what, and since when.",
      },
      {
        label: "Knowledge plane",
        icon: "library",
        group: "ai",
        note: "Runbooks, guidelines, memory, external systems and related projects that agents read by slug before they work.",
        noteEli10:
          "The team's how-tos and house rules live next to the work. AI helpers read them first, like a new colleague reading the handbook.",
      },
      {
        label: "Hybrid search",
        icon: "scan-search",
        group: "work",
        note: "German and English full text, fused with optional pgvector similarity, and plain lexical search when no embeddings are configured.",
        noteEli10:
          "Search understands German and English and can also find things that mean the same but are worded differently.",
      },
      {
        label: "Work orders and runs",
        icon: "ticket-check",
        group: "ai",
        note: "Work orders carry acceptance criteria, evidence and a budget. Runs record model, outcome, duration, tokens and cost, never prompt text.",
        noteEli10:
          "Each job for an AI helper has a checklist, a spending limit and proof of what was done. The tool counts the cost without storing what was said.",
      },
      {
        label: "Hours, rates and quotes",
        icon: "timer",
        group: "work",
        note: "Hours, effective hourly rates, cost units and quotes with a public acceptance link and a PDF, in the same system as the work.",
        noteEli10:
          "Time sheets, prices and offers sit next to the work they belong to. A customer can accept an offer through a link, no extra tool needed.",
      },
      {
        label: "Classic import",
        icon: "database-zap",
        group: "ops",
        note: "Imports classic Paimos projects, including knowledge, attachments and offers.",
        noteEli10:
          "Teams that used the earlier Paimos bring their projects, notes, files and offers along instead of starting over.",
      },
      {
        label: "Scriptable",
        icon: "braces",
        group: "work",
        note: "The aeon CLI, which also answers as paimos, and an HTTP API described by one OpenAPI contract.",
        noteEli10:
          "Other software can talk to it automatically. Your IT team can wire it into the tools you already pay for, instead of retyping things.",
      },
      {
        label: "INSPR handoffs",
        icon: "route",
        group: "ai",
        note: "Takes cited requirements intake from Aithema and records stage handoffs to Pharos for deployment and Janus for access.",
        noteEli10:
          "It works hand in hand with its sister products: requirements come in from Aithema, and finished work is handed on to Pharos and Janus with a record.",
      },
      {
        label: "Checksummed releases",
        icon: "file-check-2",
        group: "legal",
        note: "Tagged releases publish binaries with SHA256SUMS and a container image built with provenance attestations.",
        noteEli10:
          "Every release comes with fingerprints, so you can check that what you downloaded is exactly what was built from the source.",
      },
      {
        label: "Fully inspectable",
        icon: "scan-search",
        group: "legal",
        note: "AGPL source and one OpenAPI contract. Nothing about how it works is hidden.",
        noteEli10:
          "Nothing is a black box. Your own experts, or anyone you hire, can read exactly what the software does before you trust it.",
      },
      {
        label: "AGPL-3.0",
        icon: "git-branch",
        group: "legal",
        note: "Inspect, self-host, fork and modify freely. Run a modified service and its users keep the source.",
        noteEli10:
          "A standard open-source licence your legal team can actually read: use it, change it, keep it, and nobody can ever lock you in.",
      },
      {
        label: "Made in Austria",
        icon: "mountain",
        group: "place",
        note: "Designed and built in Austria, in the EU, with real people and EU norms behind your project system.",
        noteEli10:
          "Built in Austria, under EU law: your time zone, your norms, your regulators.",
      },
    ],
    glossary: [
      {
        id: "sso",
        term: "SSO / Single sign-on",
        matches: ["sign in with the company account"],
        body: "One company login for many tools. People stop inventing (and losing) a new password for every app.",
      },
      {
        id: "oidc",
        term: "OIDC",
        matches: ["OIDC"],
        body: "The open standard that makes single sign-on work between your identity system and apps like this one.",
      },
      {
        id: "pkce",
        term: "PKCE",
        matches: ["PKCE"],
        body: "An extra safety step in the login handshake that stops stolen login codes from being reused.",
      },
      {
        id: "id-token",
        term: "ID token",
        matches: ["ID token"],
        body: "The signed statement from your identity provider that says who just signed in. The server checks the signature itself.",
      },
      {
        id: "identity-provider",
        term: "Identity provider",
        matches: ["identity provider"],
        body: "The system that owns your user accounts (like Entra ID or ZITADEL). Apps trust it instead of keeping their own passwords.",
      },
      {
        id: "tenant",
        term: "Tenant",
        matches: ["tenant", "Multi-tenant"],
        body: "One separate workspace inside a shared installation, such as one company or one team, with its own data and people.",
      },
      {
        id: "rls",
        term: "Row-level security",
        matches: ["row-level security"],
        body: "A Postgres feature that checks every single row against the current workspace, so one tenant's query cannot see another tenant's data.",
      },
      {
        id: "event-log",
        term: "Append-only event log",
        matches: ["append-only event", "compensating event"],
        body: "A record where new entries are only ever added. Nothing is edited in place, so history stays complete.",
      },
      {
        id: "scope",
        term: "Scope",
        matches: ["scope", "scopes"],
        body: "One precisely named right, such as reading runs or writing intake. An agent key holds a fixed set of scopes.",
      },
      {
        id: "slug",
        term: "Slug",
        matches: ["slug"],
        body: "A short, stable name for an entry, like deploy-checklist, that agents and links can use instead of a title.",
      },
      {
        id: "pgvector",
        term: "pgvector",
        matches: ["pgvector"],
        body: "A Postgres extension that finds text with similar meaning, not just the same words.",
      },
      {
        id: "postgres",
        term: "Postgres",
        matches: ["Postgres database"],
        body: "PostgreSQL, a widely used open-source database. Paimos stores everything except attachment files in it.",
      },
      {
        id: "container",
        term: "Container",
        matches: ["application container"],
        body: "A standard shipping box for software. If your IT runs containers (most do), they can run this.",
      },
      {
        id: "telemetry",
        term: "Telemetry",
        matches: ["phone-home", "report home"],
        body: "Usage data an app sends back to its maker. Paimos sends none.",
      },
      {
        id: "api",
        term: "API",
        matches: ["HTTP API"],
        body: "The plug socket other software uses to talk to this software automatically. No humans retyping data.",
      },
      {
        id: "openapi",
        term: "OpenAPI",
        matches: ["OpenAPI"],
        body: "A standard, machine-readable description of an API, so tools can check and generate clients from it.",
      },
      {
        id: "cli",
        term: "CLI",
        matches: ["CLI"],
        body: "The command-line interface: how developers and scripts drive the tool with typed commands.",
      },
      {
        id: "sha256sums",
        term: "SHA256SUMS",
        matches: ["SHA256SUMS", "fingerprints"],
        body: "A list of cryptographic fingerprints, one per release file. A changed file no longer matches its fingerprint.",
      },
      {
        id: "provenance",
        term: "Provenance attestation",
        matches: ["provenance attestations"],
        body: "A signed record, attached to the container image, of how and from which source the image was built.",
      },
      {
        id: "agpl",
        term: "AGPL-3.0",
        matches: ["AGPL"],
        body: "A strong open-source licence: anyone may use, read and improve the software, and improvements to a public service must stay open too.",
      },
    ],
  },
  problem: {
    eyebrow: "Why Paimos",
    title: "Fragments break AI work.",
    depths: {
      simple:
        "The ticket, the how-to and the chat with an AI helper each know one part of the story. None of them can tell you who did what, with what permission, and what came back.",
      technical:
        "Tickets carry intent, runbooks carry procedure and chat transcripts carry attempts. No single system records actor, supplied context, granted authority and returned evidence for one unit of work.",
    },
    lead:
      "A ticket says what should change. A runbook says how. A chat window says what an agent tried. None of those systems alone can answer who acted, which context they received, what they were allowed to do and what came back.",
    visualAlt:
      "Separate work, repository, knowledge and evidence stations converging into one shared transparent project ledger used by a person and an AI agent.",
    visualCaption:
      "One project record connects work, context, authority and evidence.",
    items: [
      {
        title: "Context is scattered",
        icon: "unplug",
        body:
          "Requirements, project conventions and operational knowledge often live in different tools or on one developer's machine. Every new agent session starts by reconstructing the project.",
        meta: "The agent sees a task, not the system around it.",
      },
      {
        title: "Authority is implicit",
        icon: "eye-off",
        body:
          "When an agent's rights are whatever its token happens to allow, nobody decided them and nobody can review them. Review and accountability become guesswork.",
        meta: "Permissions need a request, a person and a record.",
      },
      {
        title: "Delivery loses its evidence",
        icon: "file-warning",
        body:
          "Work can move from prompt to result without its criteria, evidence or cost returning to the project record. Done becomes a claim instead of a reviewable state.",
        meta: "The loop is incomplete until evidence comes back.",
      },
    ],
  },
  model: {
    handoff: {
      in: "approved requirement set",
      out: "staged build + evidence",
    },
    eyebrow: "How it works",
    title: "The project is the control plane.",
    depths: {
      simple:
        "Paimos puts the work, the background, what was done and the proof in one place. People and AI helpers look at the same picture, and people decide.",
      technical:
        "Paimos joins the work tree, knowledge, work orders, runs and permissions in one tenant-scoped model over an append-only event log. People plan and approve in the same model agents read from and report back into.",
    },
    lead:
      "Paimos connects work, context, authority and evidence in one permission-aware system. People plan and approve in the same project model that agents read from and report back to.",
    steps: [
      {
        number: "01",
        simple: "Describe the work and agree on a plan before it starts.",
        title: "Plan",
        visual: { x: 24, y: 18 },
        icon: "folder-kanban",
        body:
          "Shape the work in one dynamic tree: epics, tickets and tasks, with kinds and labels your workspace configures. Typed relations, releases and saved views keep a large project legible. Requirements from Aithema arrive as cited drafts that a person accepts.",
        meta: "From accepted requirements to a planned tree",
        signal: "Work tree, relations and releases",
        reference: {
          label: "Planning hierarchy",
          href: docsUrl("PLANNING_HIERARCHY.md"),
          external: true,
        },
      },
      {
        number: "02",
        simple: "Keep the instructions and project knowledge together.",
        title: "Context",
        visual: { x: 22, y: 68 },
        icon: "book-open-check",
        body:
          "Write runbooks, guidelines, memory, external systems and related projects into the project's knowledge plane. Agents read entries by slug, and the graph shows how they connect.",
        meta: "Project knowledge survives the current machine and agent runtime",
        signal: "Knowledge entries, links and graph",
        reference: {
          label: "Agent integration",
          href: docsUrl("AGENT_INTEGRATION.md"),
          external: true,
        },
      },
      {
        number: "03",
        simple: "Give an agent a job, and decide what it may do.",
        title: "Run",
        visual: { x: 50, y: 40 },
        icon: "play",
        body:
          "Put work into a work order with acceptance criteria and a budget. A registered agent session claims the run; when it needs a permission, it asks, and the request waits under Needs you until a person decides.",
        meta: "Explicit authority before work; calm supervision while it runs",
        signal: "Work orders, runs and approvals",
        reference: {
          label: "Agent integration",
          href: docsUrl("AGENT_INTEGRATION.md"),
          external: true,
        },
      },
      {
        number: "04",
        simple: "Review the results and the record of what happened.",
        title: "Evidence",
        visual: { x: 77, y: 69 },
        icon: "file-check-2",
        body:
          "A work order is done only when every criterion is checked, evidence is attached and no run is still live. Run records keep model, outcome, duration, tokens and cost without storing prompt text.",
        meta: "What ran and what returned remain reviewable",
        signal: "Criteria, evidence and run records",
      },
      {
        number: "05",
        simple: "Hand the result on, with a person's approval at each step.",
        title: "Hand off",
        visual: { x: 50, y: 78 },
        icon: "badge-check",
        body:
          "A release moves through its journey from Build to Deploy and Access. Stage handoffs to Pharos and Janus are recorded with their results, and quotes can be accepted by customers through a public link.",
        meta: "Internal truth and the next stage stay connected",
        signal: "Recorded stage handoffs and acceptance",
        reference: {
          label: "Release verification",
          href: docsUrl("RELEASE.md"),
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
          title: "One dynamic work tree",
          icon: "list-tree",
          body:
            "Every item is a node in one tree. Epics, tickets and tasks are kinds your workspace configures, so the model fits the project instead of the other way round.",
          meta: "Kinds and labels are workspace configuration",
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
            "Blocks, relates, implements, cites and duplicates are typed relations rather than prose hidden in a description.",
          meta: "Five work relation types",
        },
        {
          title: "Views for daily work",
          body:
            "Saved filters, sorting and configurable columns over a list or an outline, plus a keyboard search across the workspace.",
          meta: "Saved views and one search",
        },
        {
          title: "Bulk change with recovery",
          body:
            "A bulk edit runs in one transaction, writes one event per item and can be undone as one step while those items are unchanged. Items that cannot change are skipped with a reason.",
          meta: "Transactional bulk operations and explicit skips",
        },
        {
          title: "Releases and journeys",
          body:
            "Releases are part of the tree. A project's journey view shows its stage from Inspire to Live and exactly one next action, derived from recorded decisions rather than guessed.",
          meta: "Eight stages, one next action",
        },
        {
          title: "Hours and business context",
          body:
            "Hours, effective hourly rates, cost units and quotes live in the same system as the work, so effort and commercial state do not need a side spreadsheet.",
          meta: "From effort to accepted quote",
        },
      ],
    },
    {
      id: "agent-context",
      eyebrow: "Context",
      title: "Give agents the project.",
      lead:
        "An agent needs to know which rules apply, what the team already learned and where the work belongs. Paimos exposes that context as structured, permission-aware project data.",
      items: [
        {
          title: "Durable knowledge plane",
          icon: "library",
          body:
            "Runbooks, guidelines, memory, external systems and related projects become project-owned knowledge instead of a loose collection of machine-local files.",
          meta: "Browsable, searchable and linkable",
        },
        {
          title: "Stable names for agents",
          body:
            "Agents read an entry by its kind and slug, for example paimos knowledge get runbook deploy-checklist, so the same reference works from every harness and from the CLI.",
          meta: "One reference, every harness",
          reference: {
            label: "Agent integration",
            href: docsUrl("AGENT_INTEGRATION.md"),
            external: true,
          },
        },
        {
          title: "Knowledge graph",
          icon: "waypoints",
          body:
            "Switch a project's knowledge from entries to a graph to see how runbooks, guidelines, memory and work items link to each other.",
          meta: "Entries and Graph, one switch",
        },
        {
          title: "Hybrid retrieval",
          body:
            "Search fuses German and English full text with optional pgvector similarity. Without an embeddings endpoint it stays lexical and keeps working.",
          meta: "Degrades to full text, never to nothing",
        },
        {
          title: "Cited intake",
          body:
            "Aithema intake arrives as sources, transcript turns and drafts with citations. A proposal never changes the project on its own; a person accepts one draft.",
          meta: "Requirements with their sources attached",
        },
      ],
    },
    {
      id: "execution-control",
      eyebrow: "Execution",
      title: "Authority before action.",
      lead:
        "An agent with a token is not an agent with permission. Paimos keeps keys, scopes, approvals, budgets and runs explicit instead of collapsing them into one ambiguous action.",
      items: [
        {
          title: "Five agent harnesses",
          icon: "workflow",
          body:
            "Codex, Claude, Pi, Cursor and Grok sessions register with the project and show up in the Agents workspace while they work: what they are on, how they pace and what they need from you.",
          meta: "One workspace for every harness",
        },
        {
          title: "Scoped keys and approvals",
          icon: "sliders-horizontal",
          body:
            "An agent key holds a fixed set of scopes. An agent may ask only for a scope within that ceiling, and nothing is granted until a person approves it before it expires. Revoking closes the grant.",
          meta: "The key is the ceiling; a person is the gate",
        },
        {
          title: "Work orders with budgets",
          body:
            "Work orders carry acceptance criteria, evidence and a budget across all their runs. When the budget is spent, new dispatch stops and the order is marked blocked, while the usage already incurred stays on record.",
          meta: "Spending limits that stop the next run",
        },
        {
          title: "Fenced runs",
          body:
            "Runs are queued and claimed by the assigned agent or under a live grant. A claim is fenced, so two workers cannot both believe they own the same run.",
          meta: "One run, one owner",
        },
        {
          title: "Content-free telemetry",
          body:
            "Run records keep requested and effective model, outcome, duration, tokens and cost. They do not store prompts, responses or local environment values.",
          meta: "Enough evidence to review, without turning secrets into logs",
        },
      ],
    },
    {
      id: "customer-delivery",
      eyebrow: "Business",
      title: "Keep the business side connected.",
      lead:
        "Effort, prices and offers should not drift away from the work they describe. Paimos keeps them in the same tenant, under the same permissions.",
      items: [
        {
          title: "Hours and rates",
          icon: "timer",
          body:
            "Record hours per period and see effective hourly rates next to the work they belong to.",
          meta: "Effort in the same model as the work",
        },
        {
          title: "Cost units",
          body:
            "Cost units carry the rates that quotes are priced from. They are not an invoicing system.",
          meta: "A pricing source, stated plainly",
        },
        {
          title: "Quotes with public acceptance",
          icon: "badge-check",
          body:
            "Quotes are drafted, issued and shared through a public link where the customer can read them, download a PDF and accept. Public reads and acceptance are rate-limited.",
          meta: "From issued to accepted without a parallel spreadsheet",
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
          "Give people and agents the same work tree, knowledge and run history. Reduce context reconstruction without turning agent access into an invisible side channel.",
        meta: "Plan, delegate, review and hand off in one project model",
      },
      {
        title: "Delivery and project leads",
        body:
          "Track relations, releases, hours and work-order budgets while agents work, and see the one next action on every project's journey.",
        meta: "Operational delivery without a second reporting truth",
      },
      {
        title: "Client service teams",
        body:
          "Connect work and effort to quotes your customers accept through a link, without giving them access to the internal workspace.",
        meta: "A deliberate path from work to acceptance",
      },
      {
        title: "Platform and security teams",
        body:
          "Keep identity, tenant isolation, agent scopes and approvals under operator control. Inspect the code and verify release checksums before deployment.",
        meta: "Self-hosted control with documented trust boundaries",
      },
    ],
  },
  architecture: {
    eyebrow: "Architecture",
    title: "Compact enough to understand.",
    lead:
      "Paimos favors a small, inspectable operational footprint: one application process and one database, instead of a distributed platform assembled from mandatory services.",
    paragraphs: [
      "A single Go binary serves the Vue application and the JSON API. Postgres 18 with pgvector is the system of record; every row carries its tenant, and row-level security enforces the separation. Migrations are embedded and applied at startup.",
      "Attachments are stored on local disk. People sign in through an OIDC identity provider the server can reach; agents use scoped API keys. An embeddings endpoint and webhook wakes are optional and run only when an operator configures them.",
      "The event log is the history: every change is appended, undo is a compensating event, and the agent inbox and live quote editing stream updates to open pages.",
    ],
    flow: [
      "Browser, CLI and HTTP API",
      "One Go service",
      "Vue interface and JSON API",
      "Postgres 18 with pgvector, row-level security",
      "OIDC for people; optional embeddings and webhooks",
    ],
    facts: [
      "One application process and one database",
      "No mandatory Redis, message queue or object store",
      "Container image and release binaries",
      "Embedded migrations applied at startup",
      "Tenant isolation enforced in the database",
      "Append-only event log with undo",
    ],
  },
  trust: {
    eyebrow: "Trust",
    title: "Trust leaves evidence.",
    lead:
      "Paimos backs public claims with code, tests, release checksums and an explicit list of limits. The goal is reviewable behavior, not compliance theatre.",
    items: [
      {
        title: "Identity and authorization",
        body:
          "People sign in through OIDC with authorization code, PKCE and an ID token the server verifies. Agents use scoped API keys that are stored only as hashes. Every API route declares the permission it needs.",
        meta: "INSPR runs it against ZITADEL",
      },
      {
        title: "Tenant isolation",
        body:
          "Every row carries its tenant, and Postgres row-level security checks each one. Isolation does not depend on the application remembering to filter.",
        meta: "Separation enforced below the application",
      },
      {
        title: "Agent permissions",
        body:
          "An agent proposes only for itself and only within its key. A person decides before the request expires, and approval, denial and revocation are events in the log.",
        meta: "Nothing is granted by default",
      },
      {
        title: "Release integrity",
        body:
          "Tagged releases publish binaries with SHA256SUMS and a container image on GHCR built with provenance attestations. There is no cosign signature or SBOM yet.",
        meta: "A release can be traced back to its source build",
        reference: {
          label: "Release verification",
          href: docsUrl("RELEASE.md"),
          external: true,
        },
      },
      {
        title: "Data control",
        body:
          "Paimos includes no analytics, tracking pixels or telemetry to its maker. Run usage stays in your database, and outbound calls happen only to the identity provider and to the optional services you configure.",
        meta: "Self-hosting keeps the default data path under operator control",
      },
      {
        title: "Stated limits",
        body:
          "Public evidence also states what is not there yet: retention, per-person export and erase, and a full MCP tool set. The limits below are part of the trust story.",
        meta: "Limits remain part of the trust story",
      },
    ],
  },
  integrations: {
    eyebrow: "Integrations",
    title: "Open surfaces first.",
    lead:
      "Paimos exposes its own project model through documented interfaces, then adds focused import, agent and family paths.",
    items: [
      {
        name: "aeon and paimos CLI",
        status: "Built in",
        description:
          "One binary for issues, knowledge, search, projects, relations, attachments and agent sessions. Invoked as paimos, it keeps the classic command shape.",
      },
      {
        name: "HTTP API and OpenAPI",
        status: "Built in",
        description:
          "A JSON API whose contract is one OpenAPI 3.1 file in the source. aeon schema prints the node kinds a running server knows.",
      },
      {
        name: "Generic OIDC",
        status: "Required for people",
        description:
          "Authorization code with PKCE and a verified ID token. INSPR runs it against ZITADEL.",
      },
      {
        name: "Codex, Claude, Pi, Cursor and Grok",
        status: "Agent harnesses",
        description:
          "Local agent sessions register with a project, claim runs, ask for permissions and report content-free telemetry.",
      },
      {
        name: "aeon-agentd",
        status: "Local daemon",
        description:
          "Starts and supervises agent sessions on a developer machine and enrolls one account per harness sign-in for pacing.",
      },
      {
        name: "MCP",
        status: "Early",
        description:
          "A stdio server for interactive agent clients. Today it answers whoami; issue, knowledge and search tools are still arriving, so use the CLI or API for those.",
      },
      {
        name: "Classic Paimos",
        status: "Import",
        description:
          "Imports projects from classic Paimos, including knowledge entries, attachments and offers.",
      },
      {
        name: "Aithema",
        status: "Family",
        description:
          "Stores cited requirements intake: sources, transcript turns and drafts that a person accepts.",
      },
      {
        name: "Pharos and Janus",
        status: "Family",
        description:
          "Stage handoffs record deployment through Pharos and access through Janus, with their results on the release journey.",
      },
      {
        name: "Embeddings endpoint",
        status: "Optional",
        description:
          "Any OpenAI-compatible embeddings endpoint, including one on your own hardware, adds meaning-based search. Without it, search stays full text.",
      },
      {
        name: "Webhook wakes",
        status: "Optional",
        description:
          "Wake an agent's process when a message arrives in its project inbox, instead of polling.",
      },
    ],
  },
  limits: {
    eyebrow: "Operational fit",
    title: "No pretending.",
    lead:
      "A useful deployment decision depends on the boundaries as much as the feature list. These limits describe the current release rather than a future roadmap.",
    items: [
      "People sign in only through an OIDC identity provider the server can reach. There is no local password login, no TOTP and no SAML.",
      "There are no retention windows and no per-person export or erase endpoints yet.",
      "The MCP server is early and answers only whoami today. Use the CLI or HTTP API for issues, knowledge and search.",
      "Customer-facing access is limited to public quote links with acceptance and a PDF. There is no general customer portal in this release.",
      "Aithema intake is an API. There is no voice or microphone interface in the app.",
      "Releases carry SHA256SUMS and build provenance, not cosign signatures or an SBOM.",
      "Paimos has not yet completed an independent third-party security review.",
      "There is no published scale benchmark. Production adoption should validate representative projects, users, agents and attachment volume.",
      "Paimos has a responsive web interface but no native mobile application.",
    ],
  },
  openSource: {
    eyebrow: "Open source",
    title: "Open by architecture, not by campaign.",
    body:
      "PAIMOS AEON is licensed under AGPL-3.0-only. You can inspect it, self-host it, fork it and modify it under those terms. If you operate a modified version as a network service, its users retain the right to receive the corresponding source. Open source is not the hero claim, but it keeps the product, its trust boundaries and its future inspectable.",
    links: [
      {
        label: "GitHub repository",
        href: repositoryUrl,
        external: true,
      },
      {
        label: "Releases and checksums",
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
      question: "What is PAIMOS AEON?",
      answer:
        "The seventh generation of Paimos, released under the name AEON. It replaces the classic Paimos codebase with a multi-tenant Go and Postgres system built for people and agents working together. Classic projects can be imported, including knowledge and attachments.",
    },
    {
      question: "Is Paimos a chatbot inside a project tool?",
      answer:
        "No. Agents participate in the project model with their own keys, scopes and run records, but Paimos remains a project work and context system. Work state, permissions and evidence stay explicit.",
    },
    {
      question: "Can an agent grant itself more rights?",
      answer:
        "No. An agent can only ask for a scope within its key, and a person decides. Approval, denial and revocation are recorded as events.",
    },
    {
      question: "Does Paimos require an AI provider?",
      answer:
        "No. Planning, knowledge, search, hours and quotes work without any model. Agents bring their own harness, and an embeddings endpoint is optional.",
    },
    {
      question: "Can we use our identity provider?",
      answer:
        "Yes, any OIDC provider that supports authorization code with PKCE. INSPR runs it against ZITADEL. There is no local password login and SAML is not supported.",
    },
    {
      question: "Can one installation serve several teams?",
      answer:
        "Yes. Paimos is multi-tenant: every row carries its tenant and Postgres row-level security keeps workspaces apart.",
    },
    {
      question: "Is Paimos cloud-only?",
      answer:
        "No. Paimos is self-hosted: one application container and a Postgres database. It needs a reachable OIDC provider for people to sign in; everything else outside it is optional.",
    },
    {
      question: "What can an agent read from a project?",
      answer:
        "Subject to its key's scopes and the project's permissions, an agent can read the work tree, relations, knowledge entries by slug, search results and its own work orders and runs.",
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
