import { siteUrls } from "./urls";
import { buildOrder, engineJobs } from "./family";
import type { AeonContent } from "./types";

// INSPR-544: PAIMOS AEON as the one released product on this page. Every claim
// comes from the AEON lead's release brief and is checked against the source at
// the release tag; proof paths resolve against `sourceTreeUrl`. Planned work
// appears only through the shared build order, with a status and no date. Left
// out on purpose: the business module, MCP issue and knowledge tools (early),
// embedding-ranked search and voice. Screens come from an internal instance and
// keep their capture date, not a host or a version.
const repositoryUrl = "https://github.com/inspr-at/paimos";

// INSPR-529: the one place that names the presented release. A new release is
// one edit here; every label, link and proof path below follows it.
export const paimosRelease = {
  number: "123",
  codename: "Coral Cargo",
  tag: "v261005070923.0.0",
  publishedAt: "2026-10-05",
  publishedLabel: { en: "5 October 2026", de: "5. Oktober 2026" },
};

const tag = paimosRelease.tag;
const blob = (path: string) => `${repositoryUrl}/blob/${tag}/${path}`;

export const paimosAeonContent = {
  name: "PAIMOS AEON",
  category: "Agents-first work platform",
  canonicalUrl: siteUrls.paimos,
  repositoryUrl,
  sourceTreeUrl: `${repositoryUrl}/tree/${tag}`,
  release: {
    name: "AEON",
    codename: paimosRelease.codename,
    label: `Release ${paimosRelease.number}`,
    version: tag,
    publishedAt: paimosRelease.publishedAt,
    publishedLabel: paimosRelease.publishedLabel.en,
    url: `${repositoryUrl}/releases/tag/${tag}`,
  },
  seo: {
    title: "PAIMOS AEON · Your agents, your machines, your rules",
    description:
      "The agents-first work platform where people stay in charge: start Claude Code, Codex, Cursor and pi on your own machines, see every session in one control room, and leave every gated decision to a person.",
  },
  nav: [
    { label: "Screens", href: "#screens" },
    { label: "Control room", href: "#control-room" },
    { label: "Authority", href: "#authority" },
    { label: "Rules", href: "#rules" },
    { label: "Engine", href: "#engine" },
    { label: "Architecture", href: "#architecture" },
    { label: "What is coming", href: "#next" },
  ],
  serviceIntro: "Augmentoring deploys, integrates and operates PAIMOS AEON for teams.",
  hero: {
    eyebrow: "Part of INSPR",
    titleLead: "Your agents. Your machines.",
    titleAccent: "Your rules.",
    lead:
      "AEON starts Claude Code, Codex, Cursor and pi on your own computers, shows every session in one control room, and leaves every gated decision to a person.",
    depths: {
      simple:
        "AEON lets your team and its AI helpers work on the same projects. The helpers run on your computers, you see what each one does, and people approve the important steps.",
      technical: `Release ${paimosRelease.number} (${tag}): one Go binary with an embedded Vue app, Postgres 18 under FORCE row-level security, an append-only event log per tenant, one OpenAPI 3.1 contract, and aeon-agentd starting Claude Code, Codex, Cursor and pi on paired machines.`,
    },
    primaryLabel: "See it running",
    primaryHref: "#screens",
    alt: "Abstract project agora with people and AI participants around a shared operating surface",
    chips: [
      { kind: "approval", label: "Needs you", detail: "A person approves gated steps" },
      { kind: "run", label: "Live session", detail: "Model, effort and progress in view" },
      { kind: "event", label: "approval.proposed", detail: "Appended to the event log" },
      { kind: "run", label: "Message read", detail: "Sent, delivered, read" },
      { kind: "approval", label: "Decision Desk", detail: "Open decisions wait for a person" },
      { kind: "event", label: "node.moved", detail: "The work tree updates live" },
      { kind: "run", label: "Next account", detail: "Work moves on when a vendor stops one" },
      { kind: "event", label: "approval.approved", detail: "A person decided" },
      { kind: "run", label: "Doctrine pinned", detail: "Rules read from git at a pinned commit" },
    ],
    ribbonLabel: "Append-only event log",
    ribbon: [
      "node.created",
      "node.moved",
      "approval.proposed",
      "approval.approved",
      "node.updated",
      "approval.revoked",
    ],
  },
  figures: [
    { value: "4", label: "harnesses that start under Paimos" },
    { value: "6", label: "rule layers" },
    { value: "6", label: "engine jobs, two of them live" },
    { value: "1", label: "event log per tenant" },
    { value: "300+", label: "API paths, one OpenAPI 3.1 contract" },
  ],
  theatre: {
    eyebrow: "Internal instance",
    title: "AEON, built with AEON.",
    lead:
      "These screens come from an internal instance, where the INSPR team plans, runs and ships AEON with its own agents.",
    note: "Internal instance · captured 30 September 2026",
    openLabel: "Open full size",
    screens: [
      {
        id: "tickets",
        tab: "Tickets",
        title: "Tickets by epic",
        body: "The AEON backlog grouped by epic, with agent estimates, progress and ETAs.",
        alt: "The AEON ticket list grouped by epic, with status, priority, assignee, estimate, progress and ETA columns.",
      },
      {
        id: "graph",
        tab: "Graph",
        title: "Tickets, connected",
        body: "Open tickets, their epics and typed relations as one graph.",
        alt: "The AEON tickets shown as a graph of epics, tickets and their relations.",
      },
      {
        id: "knowledge",
        tab: "Knowledge",
        title: "Knowledge, connected",
        body: "Runbooks, guidelines and decisions, linked the way agents read them.",
        alt: "The AEON knowledge graph of linked runbooks, guidelines and memory entries.",
      },
      {
        id: "usage",
        tab: "Usage",
        title: "Usage",
        body: "Tickets done, agent time and retries for the AEON project, day by day.",
        alt: "The AEON usage dashboard for the last seven days: tickets done, agent time, retries and tickets by agent time.",
      },
    ],
  },
  specs: {
    eyebrow: "Specs",
    title: "What you get.",
    lead: "Nineteen released capabilities. Seven of the images are illustrations and say so. Hover or tap a card for the detail.",
    leadEli10: "The same nineteen, in plain words.",
    items: [
      {
        label: "Agents first",
        icon: "workflow",
        group: "ai",
        note: "Claude Code, Codex, Cursor and pi start under Paimos in the same projects as people, each under its own key and scopes. Grok runs tool-free on Apple silicon; Gemini and OpenCode pair only.",
        noteEli10: "AI helpers from several makers work in the same projects as your people, and each one wears its own badge. A few join with fewer abilities for now.",
      },
      {
        label: "Control room",
        icon: "panels-top-left",
        group: "ai",
        note: "Lead and worker trees, live state, model and effort, and messages marked Sent, Delivered and Read.",
        noteEli10: "One screen shows every AI helper: what it is doing, who it reports to and whether it read your message.",
      },
      {
        label: "Your machines",
        icon: "hard-drive",
        group: "ops",
        note: "aeon-agentd pairs a computer with a code a person approves in the browser; agents run on your own subscriptions.",
        noteEli10: "The helpers run on your own computers and your own AI subscriptions. Connecting a computer needs a person's OK.",
      },
      {
        label: "Scoped keys",
        icon: "key-round",
        group: "security",
        note: "An agent key is a ceiling: every request must match one of its scopes or refine it.",
        noteEli10: "Every helper gets a key that only opens certain doors, and it can never open more.",
      },
      {
        label: "Person approvals",
        icon: "user-round-check",
        group: "security",
        note: "Gated steps wait for a live approval, and the database accepts a decision only from a person.",
        noteEli10: "For important steps, a helper has to ask. Only a person can say yes, and the system itself checks that.",
      },
      {
        label: "Capacity routing",
        icon: "route",
        group: "ai",
        note: "AEON learns run costs and vendor limits, keeps a share for you and hands work to the next account when a vendor stops one.",
        noteEli10: "If one AI account runs out, the work moves to the next one, and some capacity stays reserved for you.",
      },
      {
        label: "Governed rules",
        icon: "scroll-text",
        group: "ai",
        note: "Rules layer from company to task, publish as immutable versions and keep locked floors and byte budgets.",
        noteEli10: "House rules for the helpers are written once and versioned, and the important ones stay locked in place.",
      },
      {
        label: "Git-backed doctrine",
        icon: "git-branch",
        group: "ops",
        note: "Doctrine is read from git at a pinned commit; aeon rules compare and aeon doctor detect drift.",
        noteEli10: "The rulebook lives in version control, and a check tells you when a helper works from an outdated copy.",
      },
      {
        label: "Append-only log",
        icon: "file-check-2",
        group: "security",
        note: "Every change is appended to one event log per tenant; a database trigger refuses updates and deletes.",
        noteEli10: "Everything that happens is written down in order, and the record stays exactly as it was written.",
      },
      {
        label: "Tenant isolation",
        icon: "lock-keyhole",
        group: "security",
        note: "FORCE row-level security in Postgres separates tenants on every table, below the application.",
        noteEli10: "Each organisation's data is walled off by the database itself.",
      },
      {
        label: "One work tree",
        icon: "list-tree",
        group: "work",
        note: "Projects, epics, tickets, releases, work orders and knowledge are nodes in one tree with typed relations.",
        noteEli10: "Everything lives in one tree, so you always see how a task connects to the bigger picture.",
      },
      {
        label: "Work orders",
        icon: "timer",
        group: "work",
        note: "Work orders carry cost and time ceilings; done means every criterion met, evidence attached and no live run.",
        noteEli10: "A job for a helper comes with a budget and a finish line, and it counts as done with proof.",
      },
      {
        label: "Knowledge graph",
        icon: "network",
        group: "work",
        note: "Knowledge entries link with [[slug]] references and open as a graph beside the work.",
        noteEli10: "Project know-how is written once, linked together and shown as a map.",
      },
      {
        label: "Clear usage",
        icon: "eye",
        group: "ops",
        note: "Tokens per session, ticket and epic, with list-price estimates kept apart from subscription use.",
        noteEli10: "You see how much AI each task used, and estimates are clearly marked as estimates.",
      },
      {
        label: "Live updates",
        icon: "radio-tower",
        group: "ops",
        note: "Open pages follow the event log through server-sent events, so lists and the outline update as work happens.",
        noteEli10: "Screens update by themselves the moment something changes.",
      },
      {
        label: "Contract first",
        icon: "braces",
        group: "ops",
        note: "One OpenAPI 3.1 file with 300+ paths, served by a single binary that embeds the web app.",
        noteEli10: "Everything the app can do is described in one public contract that other tools can use.",
      },
      {
        label: "Hosted or self-hosted",
        icon: "server",
        group: "ops",
        note: "Run AEON on an instance Augmentoring operates for you, or self-host one binary and Postgres 18 with your OIDC sign-in.",
        noteEli10: "We can run it for you, or you run it on your own servers. People sign in with your company login.",
      },
      {
        label: "AGPL-3.0",
        icon: "badge-check",
        group: "legal",
        note: "Inspect, self-host, fork and modify AEON under AGPL-3.0-only.",
        noteEli10: "The source is open: you can read it, run it and change it.",
      },
      {
        label: "Made in Austria",
        icon: "mountain",
        group: "place",
        note: "Designed and built in Graz, Austria, as part of the INSPR product family.",
        noteEli10: "Made in Graz, Austria, by the people behind INSPR.",
      },
    ],
    glossary: [
      {
        id: "harness",
        term: "Harness",
        matches: ["harness"],
        body: "The agent program a vendor ships, such as Claude Code or Codex. AEON drives each one through an adapter.",
      },
      {
        id: "rls",
        term: "Row-level security",
        matches: ["row-level security"],
        body: "A Postgres feature that filters every row by tenant inside the database, whatever the application asks for.",
      },
      {
        id: "oidc",
        term: "OIDC",
        matches: ["OIDC"],
        body: "OpenID Connect: the standard sign-in protocol behind most company logins.",
      },
      {
        id: "openapi",
        term: "OpenAPI",
        matches: ["OpenAPI 3.1"],
        body: "A machine-readable description of every endpoint, so other tools can call the API without guessing.",
      },
    ],
  },
  specGroups: {
    ai: "Agents",
    security: "Security",
    ops: "Operations",
    work: "Work",
    legal: "Open source",
    place: "Origin",
  },
  controlRoom: {
    eyebrow: "Control room",
    title: "Every agent in one view.",
    lead:
      "Lead and worker trees, live state, model and effort, and messages that show when they were sent, delivered and read.",
    depths: {
      simple:
        "One screen shows every AI helper: what it works on, who it reports to, and whether it read your message.",
      technical:
        "AgentsView renders harness sessions reported over the daemon protocol, with lead handover, managed control (steer, interrupt, stop) and session recovery; inbox deliveries are tracked as Sent, Delivered and Read.",
    },
    items: [
      {
        icon: "users-round",
        title: "Lead and worker trees",
        body: "Every lead with the workers it started, and what each one is doing now.",
      },
      {
        icon: "radio-tower",
        title: "Messages with receipts",
        body: "Sent, Delivered, Read. For sessions with an inbox, delivery is tracked and inbox hooks carry messages into the session. Cursor sessions have no inbox and take interrupts only.",
      },
      {
        icon: "sliders-horizontal",
        title: "Steer, interrupt, stop",
        body: "Redirect a managed session while it runs, or stop it cleanly.",
        caveat: "Steering: Claude on macOS. Cursor: interrupt only",
      },
      {
        icon: "hard-drive",
        title: "Your machines, your accounts",
        body: "Claude Code, Codex, Cursor and pi start on computers you pair, signed in to your own subscriptions.",
      },
    ],
    screenAlt:
      "The AEON sessions view in dark mode: lead agents with their workers, each with ticket, model, effort, progress and heartbeat.",
    pairing: {
      eyebrow: "Pairing",
      title: "A new computer joins with one command and a person's yes.",
      steps: [
        { label: "Install the signed, notarized daemon.", command: "brew install inspr-at/tap/aeon-agentd" },
        { label: "Pair from your working folder.", command: "aeon-agentd pair" },
        { label: "Enter the 9-digit code in the browser and approve." },
      ],
    },
    harnessMatrix: {
      label: "Harnesses",
      rows: [
        {
          status: "live",
          harnesses: ["Claude Code", "Codex", "Cursor", "pi"],
          note: "Start under Paimos on macOS and Linux. Supported; live acceptance is still open.",
        },
        {
          status: "partly",
          harnesses: ["Grok"],
          note: "Runs tool-free on Apple silicon: a single-turn conversation for verification and review, not a general builder.",
        },
        {
          status: "planned",
          harnesses: ["Gemini", "OpenCode"],
          note: "Pairing only for now. Starting them is planned.",
        },
      ],
    },
    proof: [
      { label: "Agents workspace", path: "web/src/views/AgentsView.vue" },
      { label: "Managed control", path: "internal/agentd/managed_control.go" },
      { label: "Harness adapters", path: "internal/agentd/adapters.go" },
      { label: "Agent integration", path: "docs/AGENT_INTEGRATION.md" },
    ],
  },
  authority: {
    eyebrow: "Authority",
    title: "Agents propose. People decide.",
    titleAccent: "The database enforces it.",
    lead:
      "A key sets each agent's ceiling. Gated steps become approval requests, and only a person can turn one into a grant.",
    depths: {
      simple:
        "A helper can ask for more, and only a person can say yes. The database checks that it really was a person.",
      technical:
        "A requested scope must equal a key scope or be a dotted refinement of one. approval.proposed grants nothing; approval.approved and its grant commit together; the database rejects agent decisions and any grant without a matching approved request.",
    },
    steps: [
      {
        label: "Ceiling",
        title: "The key sets the limit",
        body: "Scopes such as harness.read or knowledge.write bound every request.",
        actor: "The API key",
        tokens: ["harness.read", "knowledge.write"],
      },
      {
        label: "Proposal",
        title: "The agent asks",
        body: "A gated step becomes a proposal, written to the log. It grants nothing.",
        actor: "An agent",
        tokens: ["approval.proposed"],
      },
      {
        label: "Decision",
        title: "A person decides",
        body: "Approval and grant commit in one transaction.",
        actor: "A person",
        tokens: ["approval.approved"],
      },
      {
        label: "Enforcement",
        title: "The database holds the line",
        body: "Only a person's decision on a matching approval becomes a grant.",
        actor: "The database",
        tokens: ["0202_agent_approvals.sql"],
      },
    ],
    ui: {
      stepOf: "Step {n} of {total}",
      caption: "One of the four is a person. The other three cannot say yes.",
      pause: "Pause",
      resume: "Resume",
    },
    proof: [
      { label: "Approvals", path: "internal/approvals/doc.go" },
      { label: "Approval enforcement", path: "internal/db/migrations/0202_agent_approvals.sql" },
      { label: "Capacity", path: "internal/capacity" },
      { label: "Usage dashboard", path: "internal/usagedashboard" },
    ],
  },
  rules: {
    eyebrow: "Agent rules",
    title: "One rulebook, six layers.",
    lead:
      "Company, project, person, role, named agent and task: six layers, merged into one rulebook. Every publication is immutable and versioned, and doctrine is read from git at a pinned commit.",
    depths: {
      simple:
        "House rules for AI helpers are written once for the company and refined for each project, person and task. The important ones stay locked in place.",
      technical:
        "The rules engine merges six layers into immutable, versioned publications with locked floors and per-layer byte budgets. Git-backed doctrine is read at a pinned commit; aeon rules compare and aeon doctor report drift against the merged set.",
    },
    stops: [
      { label: "Company", at: 0.045 },
      { label: "Project", at: 0.436 },
      { label: "Person", at: 0.554 },
      { label: "Role and agent", at: 0.578 },
      { label: "Budget", at: 0.601 },
      { label: "Doctrine", at: 0.624 },
    ],
    points: [
      { title: "Locked floors", body: "A higher layer can lock a rule for every layer below it." },
      { title: "Byte budgets", body: "Each layer has a size budget, so what an agent loads stays readable." },
      { title: "Drift detection", body: "aeon rules compare and aeon doctor show where a harness differs from what was published." },
    ],
    early: "Early access: rule edits as pull requests, once an operator enables them.",
    screenAlt:
      "The AEON agent rules view: company and project rule sets with their locks, one opened set of locked kernel rules, the byte budget and doctrine pinned from git.",
    proof: [
      { label: "Rules", path: "internal/rules" },
      { label: "Rules compare", path: "internal/rulescompare" },
      { label: "README: Agent rules", path: "README.md" },
    ],
  },
  // INSPR-544: the retired Journey gives way to the engine, told from the
  // shared engine jobs. Flow 2 is planned and carries no date.
  engine: {
    eyebrow: "The engine",
    title: "The engine that runs the work.",
    lead:
      "Six jobs run the work around the tickets. Two are live, four are partly live: each one says how far it has shipped.",
    depths: {
      simple:
        "The engine is the part of AEON that keeps agents and people in step. Some of its jobs already work; others are still being built.",
      technical:
        "Live today: the admission dial with per-harness limits, model preferences by type of work with review order and review gates, the Decision Desk with a durable inbox, and events with worker attribution, outcomes and session, token and cost reporting.",
    },
    jobs: engineJobs.map((job) => ({ label: job.label.en, status: job.status, note: job.note.en })),
    flowNote: {
      text: "The earlier flow is retired. The next one, Flow 2, is planned.",
      status: "planned",
    },
  },
  architecture: {
    eyebrow: "Architecture",
    title: "One binary. One database. One log.",
    lead: "Few moving parts, and the guarantees live in the database.",
    depths: {
      simple:
        "Under the hood, AEON is deliberately simple: one program, one database, and a record of everything that happened.",
      technical:
        "A single Go binary embeds the Vue app and serves the OpenAPI 3.1 contract. Postgres 18 with pgvector holds every row under FORCE row-level security, an append-only event table drives history and server-sent live updates, and aeon-agentd speaks one daemon protocol to the harness adapters.",
    },
    diagram: {
      clientsLabel: "People and tools",
      clients: ["Browser", "CLI", "HTTP API"],
      serverLabel: "One server",
      server: ["Single Go binary", "Embedded web app", "OpenAPI 3.1 contract"],
      databaseLabel: "One database",
      database: ["Postgres 18", "FORCE row-level security", "Append-only event log"],
      daemonLabel: "Your machines",
      daemon: "aeon-agentd",
      harnesses: ["Claude Code", "Codex", "Cursor", "pi", "Grok (tool-free)"],
      live: "Live updates",
    },
    notes: [
      {
        title: "One log, kept whole",
        body: "A trigger lets the event log only grow; history and live updates both read from it.",
        proof: { label: "Event log schema", path: "internal/db/migrations/0101_relations_events.sql" },
      },
      {
        title: "Tenancy in the database",
        body: "FORCE row-level security on every table keeps tenants apart below the application.",
        proof: { label: "Tenancy schema", path: "internal/db/migrations/0003_principals.sql" },
      },
      {
        title: "Keys as ceilings",
        body: "An approval can refine a key's scopes and stays within them.",
        proof: { label: "Approvals package notes", path: "internal/approvals/doc.go" },
      },
      {
        title: "Contract first",
        body: "One OpenAPI 3.1 file describes 300+ paths; the server embeds the web app it serves.",
        proof: { label: "OpenAPI contract", path: "api/openapi.yaml" },
      },
    ],
  },
  horizon: {
    eyebrow: "What is coming",
    title: "In the order we build it.",
    lead: "Each step says how far it has shipped. None carries a date, and nothing planned is live.",
    order: buildOrder.map((step) => ({
      label: step.label.en,
      status: step.status,
      note: step.statusNote?.en,
    })),
    goodToKnow: {
      title: "Good to know",
      items: [
        "These harnesses are supported, and live acceptance is still open.",
        "Steering and session settings are qualified for Claude on macOS; Cursor supports interrupt only.",
        "Claude is the only harness with qualified tool-free verification; Codex and Cursor connect without an automatic verification run.",
        "Attaching a running session is in early access, from macOS terminals.",
        "Issues, knowledge and search run through the CLI and HTTP API; the MCP server is in early access.",
        "Rule edits as pull requests are available once an operator enables them.",
        "People sign in through your OIDC identity provider.",
      ],
    },
  },
  openSource: {
    eyebrow: "Open source",
    title: "Open source, AGPL-3.0.",
    body: `Inspect, self-host, fork and modify AEON under AGPL-3.0-only. Every source link on this page points at the release ${paimosRelease.number} tag.`,
    links: [
      { label: "GitHub repository", href: repositoryUrl, external: true },
      { label: `Release ${paimosRelease.number} on GitHub`, href: `${repositoryUrl}/releases/tag/${tag}`, external: true },
      { label: "Project license (AGPL-3.0-only)", href: blob("LICENSE"), external: true },
      { label: "Security policy", href: blob("SECURITY.md"), external: true },
      { label: "Agent integration", href: blob("docs/AGENT_INTEGRATION.md"), external: true },
    ],
  },
  faq: [
    {
      question: "Which agents can we use?",
      answer:
        "Claude Code, Codex, Cursor and pi start under Paimos on macOS and Linux, including OpenRouter models through pi. Grok runs tool-free on Apple silicon. Gemini and OpenCode pair only; starting them is planned. They run through aeon-agentd on computers you pair, with your own subscriptions.",
    },
    {
      question: "Where does our data live?",
      answer:
        "Where you decide: on an instance Augmentoring operates for you, or self-hosted on your own infrastructure as one server binary and a Postgres 18 database. Either way, row-level security in the database keeps tenants apart.",
    },
    {
      question: "Can an agent approve its own request?",
      answer:
        "No. An agent proposes; the database accepts a decision only from a person on a live approval, and every approval stays within the agent key's scopes.",
    },
  ],
  finalCta: {
    title: "Run AEON your way.",
    body:
      "Self-host it from the public source, or let Augmentoring deploy, integrate and operate it for your team.",
  },
} satisfies AeonContent;
