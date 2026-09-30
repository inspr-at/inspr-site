import { siteUrls } from "./urls";
import type { AeonContent } from "./types";

// INSPR-492: PAIMOS AEON "Hinged Hangar" (stable 113, tag
// v260930115354.0.0, merge ea5328e7). Every claim comes from the AEON lead's release brief and
// is checked against the source at that tag; proof paths resolve against
// `sourceTreeUrl`. What comes next appears only as coming work, from filed
// AEON tickets. Left out
// on purpose: the business module and voice. MCP and vector-ranked search
// appear only at How, with the fact sheet's qualifiers (INSPR-497). Screens
// come from aeon.barta.cm.
//
// INSPR-497: three levels. Each field is What (the page as it was); the
// `depths` beside it carry Why (outcomes for decision makers, nothing that
// What does not already claim) and How (technical depth, only from the AEON
// lead's verified fact sheet for this tag). `deep` blocks show at How only.
const repositoryUrl = "https://github.com/inspr-at/paimos";
const tag = "v260930115354.0.0";
const blob = (path: string) => `${repositoryUrl}/blob/${tag}/${path}`;

export const paimosAeonContent = {
  name: "PAIMOS AEON",
  category: "Agents-first work platform",
  canonicalUrl: siteUrls.paimos,
  repositoryUrl,
  sourceTreeUrl: `${repositoryUrl}/tree/${tag}`,
  release: {
    name: "AEON",
    codename: "Hinged Hangar",
    version: tag,
    publishedAt: "2026-09-30T12:51:40Z",
    url: `${repositoryUrl}/releases/tag/${tag}`,
  },
  seo: {
    title: "PAIMOS AEON · Your agents, your machines, your rules",
    description:
      "The agents-first work platform where people stay in charge: run Claude, Codex, Cursor, Grok and pi on your own machines, see every session in one control room, and leave every gated decision to a person.",
  },
  nav: [
    { label: "Screens", href: "#screens" },
    { label: "Control room", href: "#control-room" },
    { label: "Authority", href: "#authority" },
    { label: "Rules", href: "#rules" },
    { label: "Architecture", href: "#architecture" },
    { label: "What is coming", href: "#next" },
  ],
  serviceIntro: "Augmentoring deploys, integrates and operates PAIMOS AEON for teams.",
  hero: {
    eyebrow: "PAIMOS",
    titleLead: "Your agents. Your machines.",
    titleAccent: "Your rules.",
    lead:
      "AEON runs Claude, Codex, Cursor, Grok and pi on your own computers, shows every session in one control room, and leaves every gated decision to a person.",
    depths: {
      simple:
        "Your people and your AI agents work on the same projects. The agents run on your own computers and accounts, you see what each one does, and the steps you gate wait for a person's decision.",
      technical:
        "Hinged Hangar: one Go binary with an embedded Vue app, Postgres 18 under FORCE row-level security, an append-only event log per tenant, one OpenAPI 3.1 contract, and aeon-agentd driving five harness adapters on paired machines.",
    },
    primaryLabel: "See it running",
    primaryHref: "#screens",
    alt: "Abstract project agora with people and AI participants around a shared operating surface",
    chips: [
      { kind: "approval", label: "Needs you", detail: "A person approves gated steps" },
      { kind: "run", label: "Live session", detail: "Model, effort and progress in view" },
      { kind: "event", label: "approval.proposed", detail: "Appended to the event log" },
      { kind: "run", label: "Message read", detail: "Sent, delivered, read" },
      { kind: "approval", label: "Build gate", detail: "journey.build waits for a person" },
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
      "journey.build_started",
      "node.updated",
      "journey.release_opened",
      "approval.revoked",
    ],
  },
  figures: [
    { value: "5", label: "agent harnesses" },
    { value: "6", label: "rule layers" },
    { value: "8", label: "journey stages" },
    { value: "1", label: "append-only event log per tenant", depthMin: "standard" },
    { value: "300+", label: "API paths, one OpenAPI 3.1 contract", depthMin: "standard" },
  ],
  theatre: {
    eyebrow: "Live instance",
    title: "AEON, built with AEON.",
    lead:
      "These screens come from aeon.barta.cm, where the INSPR team plans, runs and ships AEON with its own agents.",
    depths: {
      simple: "This is AEON in daily use: the INSPR team plans, runs and ships AEON itself on it, together with its own agents.",
      technical: "Captured from the live instance: the Vue 3 app embedded in the Go binary. Tickets and knowledge entries are nodes of one tree, drawn from GET /api/tickets/graph and GET /api/knowledge/graph; usage lives at /agents/usage.",
    },
    note: "aeon.barta.cm · captured 30 September 2026",
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
    lead: "Twenty capabilities, available today. Hover or tap a card for the detail.",
    leadEli10: "Twenty capabilities, available today. Open a card to see what each one does for you.",
    leadHow: "Twenty capabilities in Hinged Hangar. Open a card for the mechanism behind each.",
    items: [
      {
        label: "Agents first",
        icon: "workflow",
        group: "ai",
        note: "Claude, Codex, Cursor, Grok and pi run as harness sessions in the same projects as people, each under its own key and scopes.",
        noteEli10: "AI agents from several vendors work in your projects next to your people, each under its own identity.",
        noteHow: "Harness sessions register at POST /api/projects/{id}/harness-sessions with a worker lease. Supported harnesses: codex, claude, pi, cursor and grok, each under its own scoped key.",
      },
      {
        label: "Control room",
        icon: "panels-top-left",
        group: "ai",
        note: "Lead and worker trees, live state, model and effort, and messages marked Sent, Delivered and Read.",
        noteEli10: "One screen shows every agent: what it works on, who it reports to and whether it has read your message.",
        noteHow: "/agents lists every session. Heartbeats carry phase, activity, note, progress 0 to 100 and ready and live ETAs; after the 2-minute live window a silent unmanaged session shows Lost contact.",
      },
      {
        label: "Your machines",
        icon: "hard-drive",
        group: "ops",
        note: "aeon-agentd pairs a computer with a code a person approves in the browser; agents run on your own subscriptions.",
        noteEli10: "Agents run on your own computers and AI subscriptions. A new computer joins only after a person approves it.",
        noteHow: "aeon-agentd pair --url <origin> shows a 9-digit code that expires after 10 minutes. A person with account.manage approves it; the daemon creates its credentials locally, and the server stores only hashes.",
      },
      {
        label: "Scoped keys",
        icon: "key-round",
        group: "security",
        note: "An agent key is a ceiling: every request must match one of its scopes or refine it.",
        noteEli10: "Each agent gets a key with fixed limits, and it can never reach beyond them.",
        noteHow: "Effective permission is the intersection of the key's scopes and the workspace role. An empty scope list grants nothing, and a route without a mapping returns 403.",
      },
      {
        label: "Person approvals",
        icon: "user-round-check",
        group: "security",
        note: "Gated steps wait for a live approval, and the database accepts a decision only from a person.",
        noteEli10: "Important steps wait for a person. Only people can approve them, and the system itself enforces that.",
        noteHow: "Agents only propose. approvals.decide is never grantable to an agent key, and the database rejects an agent's decision.",
      },
      {
        label: "Capacity routing",
        icon: "route",
        group: "ai",
        note: "AEON learns run costs and vendor limits, keeps a share for you and hands work to the next account when a vendor stops one.",
        noteEli10: "When one AI account reaches its limit, the work moves on to the next, and part of the capacity stays reserved for you.",
        noteHow: "AEON learns run costs and vendor limits, keeps a share for you and hands work to the next account when a vendor stops one.",
      },
      {
        label: "Governed rules",
        icon: "scroll-text",
        group: "ai",
        note: "Rules layer from company to task, publish as immutable versions, keep locked floors and share one merged byte budget.",
        noteEli10: "Your rules for agents are written once and versioned, and the critical ones stay locked.",
        noteHow: "Precedence runs company, project, person, agent role, named agent, task. The highest match wins, ties fail closed, and a lower layer never replaces a locked rule. Sets publish under a calendar version and can be restored.",
      },
      {
        label: "Git-backed doctrine",
        icon: "git-branch",
        group: "ops",
        note: "Doctrine is read from git at a pinned commit, and aeon rules compare compares the instructions a harness loaded with the merged rules.",
        noteEli10: "The rulebook lives in version control, and AEON shows when an agent works from an outdated copy.",
        noteHow: "Doctrine is read from git at a pinned commit. A harness receives the merged rules through paimos session start --rules-receive, which posts a worker-reported receipt: proof of delivery, not of obedience. aeon rules compare compares the loaded instructions with the merged rules.",
      },
      {
        label: "Append-only log",
        icon: "file-check-2",
        group: "security",
        note: "Every change is appended to one event log per tenant; a database trigger refuses updates and deletes.",
        noteEli10: "Everything that happens is recorded in order, and the record cannot be changed afterwards.",
        noteHow: "Events form an append-only log per tenant, appended in the same transaction as each change, with undo.",
      },
      {
        label: "Tenant isolation",
        icon: "lock-keyhole",
        group: "security",
        note: "FORCE row-level security in Postgres separates tenants on every table, below the application.",
        noteEli10: "Each organisation's data is kept apart by the database itself.",
        noteHow: "Every row carries tenant_id under forced row-level security, and production needs a non-superuser database role.",
      },
      {
        label: "One work tree",
        icon: "list-tree",
        group: "work",
        note: "Projects, epics, tickets, releases, work orders and knowledge are nodes in one tree with typed relations.",
        noteEli10: "All work lives in one structure, so every task shows how it connects to the bigger picture.",
        noteHow: "Nodes form one tree with tenant-defined kinds. Relations: blocks, relates, implements, cites and duplicates.",
      },
      {
        label: "Work orders",
        icon: "timer",
        group: "work",
        note: "Work orders carry cost and time ceilings; done means every criterion met, evidence attached and no live run.",
        noteEli10: "Every job for an agent has a budget and a clear finish line, and it counts as done only with evidence.",
        noteHow: "Work orders carry cost and time ceilings; done means every criterion met, evidence attached and no live run.",
      },
      {
        label: "Knowledge graph",
        icon: "network",
        group: "work",
        note: "Knowledge entries link with [[slug]] references and open as a graph beside the work.",
        noteEli10: "Project knowledge is written once, linked together and shown as a map.",
        noteHow: "Knowledge entries are nodes of the kinds memory, runbook, guideline, external-system and related-project; the graph comes from GET /api/knowledge/graph.",
      },
      {
        label: "Journeys and gates",
        icon: "waypoints",
        group: "work",
        note: "Eight derived stages from Inspire to Live, with person-approved gates.",
        noteEli10: "Every project moves through clear stages, and a person signs off before anything goes live.",
        noteHow: "Eight derived stages from Inspire to Live, with person-approved gates. Deploy-target enforcement is not shipped in this release.",
      },
      {
        label: "Clear usage",
        icon: "eye",
        group: "ops",
        note: "Tokens per session, ticket and epic, with list-price estimates kept apart from subscription use.",
        noteEli10: "You see how much AI each task used, and estimates are clearly marked as estimates.",
        noteHow: "Usage lives at /agents/usage: tokens per session, ticket and epic, with list-price estimates kept apart from subscription use.",
      },
      {
        label: "Live updates",
        icon: "radio-tower",
        group: "ops",
        note: "Open pages follow the event log through server-sent events, so lists and the outline update as work happens.",
        noteEli10: "Screens update the moment something changes, without reloading.",
        noteHow: "Open pages follow the event log through server-sent events, so lists and the outline update as work happens.",
      },
      {
        label: "Contract first",
        icon: "braces",
        group: "ops",
        note: "One OpenAPI 3.1 file with 300+ paths, served by a single binary that embeds the web app.",
        noteEli10: "Everything AEON can do is described in one public interface that your other tools can use.",
        noteHow: "One Go binary, started with paimos serve, embeds the Vue 3 web app and serves one OpenAPI 3.1 contract; the CLI covers issues, knowledge, search, relations, harness sessions and more.",
      },
      {
        label: "Hosted or self-hosted",
        icon: "server",
        group: "ops",
        note: "Run AEON on an instance Augmentoring operates for you, or self-host one binary and Postgres 18 with your OIDC sign-in.",
        noteEli10: "Augmentoring can run AEON for you, or you run it on your own servers. People sign in with your company login.",
        noteHow: "Hosted by Augmentoring, or self-hosted from the image ghcr.io/inspr-at/aeon:<version> (no latest tag), configured through AEON_* variables with AEON_DATABASE_URL required, on Postgres 18 with pgvector. People sign in with OIDC (Zitadel).",
      },
      {
        label: "AGPL-3.0",
        icon: "badge-check",
        group: "legal",
        note: "Inspect, self-host, fork and modify AEON under AGPL-3.0-only.",
        noteEli10: "The source is open: you can read it, run it and change it.",
        noteHow: "AGPL-3.0-only. An annotated tag builds the GHCR image and a draft GitHub release with SHA256SUMS, published only after live verification.",
      },
      {
        label: "Made in Austria",
        icon: "mountain",
        group: "place",
        note: "Designed and built in Graz, Austria, as part of the INSPR product family.",
        noteEli10: "Designed and built in Graz, Austria, by the team behind INSPR.",
        noteHow: "Designed and built in Graz, Austria, as part of the INSPR product family.",
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
        "One view shows every agent at work: what it is doing, who it reports to, and whether it has read your message.",
      technical:
        "AgentsView renders harness sessions reported over the daemon protocol, with lead handover, managed control (steer, interrupt, stop) and session recovery; inbox deliveries are tracked as Sent, Delivered and Read.",
    },
    deep: {
      title: "Sessions and pairing, precisely",
      items: [
        { term: "/agents", body: "The Agents page lists every harness session; usage lives at /agents/usage." },
        { term: "heartbeat", body: "Each heartbeat carries phase, activity, note, progress 0 to 100 and ready and live ETAs. The live window is 2 minutes; a silent unmanaged session shows Lost contact." },
        { term: "worker lease", body: "Each generation holds a worker lease. Parent and child sessions link through --parent-session, reparenting and lead handover." },
        { term: "aeon-agentd pair", body: "Shows a 9-digit code that expires after 10 minutes. A person with account.manage approves it and picks one to five accounts. The code is display-only: redemption needs a device secret, checked by hash." },
        { term: "transport", body: "The daemon pulls from the server over HTTPS, plain HTTP only on loopback. Local control runs over an owner-only Unix socket with a bearer token." },
        { term: "telemetry", body: "Content-free: no vendor tokens, no raw vendor payloads, and vendor session ids stay local." },
        { term: "managed runs", body: "A managed run gets a run-local MCP server with aeon_comment, aeon_status, aeon_request_approval and aeon_terminal." },
        { term: "messages", body: "At least once, with receipts: Read means the session acknowledged receipt, Answered that an accepted reply exists. Hooks deliver at turn boundaries; the managed agentd path also delivers mid-turn and when idle." },
        { term: "aeon hook", body: "aeon hook claude|codex <event> for PostToolUse, UserPromptSubmit and Stop, installed with aeon hook install." },
      ],
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
        body: "Messages reach the session at least once, with read and answered receipts; inbox hooks carry them in.",
      },
      {
        icon: "sliders-horizontal",
        title: "Steer, interrupt, stop",
        body: "Redirect a managed session while it runs, or stop it cleanly.",
        caveat: "Qualified for Claude on macOS",
      },
      {
        icon: "hard-drive",
        title: "Your machines, your accounts",
        body: "Claude, Codex, Cursor, Grok and pi run on computers you pair, signed in to your own subscriptions.",
      },
    ],
    screenAlt:
      "The AEON sessions view in dark mode: lead agents with their workers, each with ticket, model, effort, progress and heartbeat.",
    pairing: {
      eyebrow: "Pairing",
      title: "A new computer joins with one command and a person's yes.",
      steps: [
        { label: "Install the daemon. On macOS it is signed (Developer ID, hardened runtime) and notarized.", command: "brew install inspr-at/tap/aeon-agentd" },
        { label: "Pair from your working folder.", command: "aeon-agentd pair --url <origin>" },
        { label: "A person approves the 9-digit code in the browser within 10 minutes." },
      ],
      harnessesLabel: "Harnesses",
      harnesses: ["Claude", "Codex", "Cursor", "Grok", "pi"],
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
        "Agents can ask for more, but only a person can say yes, and the database verifies that it really was a person.",
      technical:
        "A requested scope must equal a key scope or be a dotted refinement of one. approval.proposed grants nothing; approval.approved and its grant commit together; the database rejects agent decisions and any grant without a matching approved request.",
    },
    deep: {
      title: "Keys and approvals, precisely",
      items: [
        { term: "effective permission", body: "The key's scopes intersected with the workspace role. An empty scope list grants nothing; a route without a mapping returns 403." },
        { term: "never for agents", body: "harness.watch, rules.publish, harness.force_stop, harness.recover, the members, roles and keys management permissions, keys.read, settings.manage, audit.read, approvals.decide and approvals.decide_high, and the portal permissions." },
        { term: "decisions", body: "Agents only propose approvals. A person decides, and the database rejects an agent's decision." },
        { term: "keys at rest", body: "Stored as prefix plus hash. The CLI reads a key from a file or stdin, never echoes it, and stores it with mode 0600." },
      ],
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
        "Rules for agents are written once for the company and refined for each project, person and task, and the critical ones stay locked.",
      technical:
        "The rules module merges six layers into versioned publications with locked rules and one merged byte budget; a harness receives the merged set through paimos session start --rules-receive.",
    },
    deep: {
      title: "Rule merging, precisely",
      items: [
        { term: "precedence", body: "Company, project, person, agent role, named agent, task. The highest match wins, ties fail closed, and a lower layer never replaces a locked rule." },
        { term: "publishing", body: "Rule sets are drafted, then published under a calendar version, and every publication can be restored." },
        { term: "budget", body: "The merged set has a budget of 12,000 bytes by default and at most 64,000." },
        { term: "session start", body: "paimos session start --rules-preview previews the merged set; --rules-receive writes the file and posts a worker-reported receipt, which records delivery, not that the model obeyed." },
        { term: "rules compare", body: "aeon rules compare compares the instructions a harness loaded with the merged rules. Neither it nor the receipt proves that the model follows them." },
        { term: "targets", body: "claude-code, codex, grok, pi and cursor." },
        { term: "planned", body: "Rule-edit proposals as pull requests; they need a GitHub App." },
      ],
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
      { title: "Byte budget", body: "One merged budget, 12,000 bytes by default and at most 64,000, keeps what an agent loads readable." },
      { title: "Drift detection", body: "aeon rules compare compares the instructions a harness loaded with the merged rules." },
    ],
    screenAlt:
      "The AEON agent rules view: company and project rule sets with their locks, one opened set of locked kernel rules, the byte budget and doctrine pinned from git.",
    proof: [
      { label: "Rules", path: "internal/rules" },
      { label: "Rules compare", path: "internal/rulescompare" },
      { label: "README: Agent rules", path: "README.md" },
    ],
  },
  delivery: {
    eyebrow: "Delivery",
    title: "Eight stages from idea to live.",
    lead:
      "Every project follows one journey. The stage is derived from recorded decisions, and a person approves each gate.",
    depths: {
      simple:
        "Every project moves through eight stages. At each gate a person approves before it moves on, and nothing else can move it.",
      technical:
        "The stage is a projection derived from the accepted brief, the human Shape decision, the agreed requirements revision, the current release state and live gate approvals. A heartbeat, a timer or a stage string from a client never moves the rail.",
    },
    stages: [
      {
        name: "Inspire",
        summary: "Intake begins. A brief is drafted with citations to its sources, and accepting it is a person-only step. The accepted brief is the first fact the stage derivation reads.",
        decides: "A person accepts the brief.",
        action: "confirm_brief",
      },
      {
        name: "Shape",
        gate: true,
        scope: "journey.shape",
        summary: "The Shape decision is a human gate: go, reduce scope, park or drop. A parked or dropped project keeps the Shape stage and can be reopened.",
        decides: "A person decides the shape.",
        action: "decide",
        note: "The personal profile skips Shape after a brief is confirmed.",
      },
      {
        name: "Requirements",
        gate: true,
        scope: "revision-bound requirements scope",
        summary: "Functional requirements are requirement nodes. Agreement creates one epic per requirement and can generate tickets from accepted suggestions. A manual ticket that changes agreed scope stays marked until requirements are agreed again.",
        decides: "A person agrees the requirements revision.",
        action: "approve_requirements",
      },
      {
        name: "Plan",
        summary: "A release is opened and the plan stores the ordered ticket set. Tickets can also stay in the project backlog without being in a release.",
        decides: "Derived from the release. No gate.",
        action: "start_build",
      },
      {
        name: "Build",
        gate: true,
        scope: "journey.build",
        summary: "Build start needs an approved gate. While the build runs, a passive wait is the only action. Once the release's tickets are finished it can become a candidate, and candidate review is a person gate of its own.",
        decides: "A person approves the build start and the candidate.",
        action: "approve_candidate",
        note: "Enterprise adds a separate reviewer for the candidate, a different person from the builder and the author.",
      },
      {
        name: "Deploy",
        gate: true,
        scope: "journey.deploy",
        summary: "Pharos owns Deploy. It checks the reviewed artifact identity, current backup and readiness, and consumes one launch admission before a host changes. A gate can be renewed.",
        detail: {
          standard: "A deploy approval can name its target.",
          technical:
            "A deploy approval can name its target (hosts or environment, service, change, optionally an image). The deployment card and the approval history show it as named by the agent; it is recorded, not yet enforced.",
        },
        decides: "A person approves the deployment.",
        action: "approve_deploy",
      },
      {
        name: "Access",
        gate: true,
        scope: "journey.access",
        summary: "Janus owns Access. Apply follows a successful deployment and consumes a person-approved bounded permit, then reports only whether access is authorized and credentials are ready.",
        decides: "A person approves the permit.",
        action: "approve_permit",
        note: "Access is skipped only when the release has no explicit access change.",
      },
      {
        name: "Live",
        summary: "The release is live with a public release history. When the next release starts, Live becomes the prior release state while Plan is current, and history is preserved.",
        decides: "Derived from the release. No gate.",
        action: "plan_next_release",
      },
    ],
    gateLabel: "Person-approved gate",
    ui: {
      stageOf: "Stage {n} of {total}",
      decides: "Who decides",
      gate: "Gate",
      noGate: "No gate",
      nextAction: "Next action",
      pause: "Pause",
      resume: "Resume",
    },
    proof: [
      { label: "Planning hierarchy", path: "docs/PLANNING_HIERARCHY.md" },
      { label: "Journey", path: "internal/journey" },
      { label: "Release history", path: "internal/releasehistory" },
      { label: "Release verification", path: "scripts/verify-release.mjs" },
    ],
  },
  architecture: {
    eyebrow: "Architecture",
    title: "One binary. One database. One log.",
    lead: "Few moving parts, and the guarantees live in the database.",
    depths: {
      simple:
        "AEON is deliberately simple: one program, one database and a complete record of what happened.",
      technical:
        "A single Go binary embeds the Vue app and serves the OpenAPI 3.1 contract. Postgres 18 with pgvector holds every row under FORCE row-level security, an append-only event table drives history and server-sent live updates, and aeon-agentd speaks one daemon protocol to five harness adapters.",
    },
    deep: {
      title: "Stack and operations, precisely",
      items: [
        { term: "paimos serve", body: "One Go binary with the Vue 3 web app embedded. Migrations are embedded and applied at startup." },
        { term: "aeon-agentd", body: "A separate local supervisor on each paired machine, shipped as the paimos-agentd release assets. The macOS daemon is signed (Developer ID, hardened runtime) and notarized; the Linux build is static." },
        { term: "Postgres 18", body: "With pgvector. Every row carries tenant_id under forced row-level security; production needs a non-superuser role." },
        { term: "search", body: "Hybrid lexical and vector ranking over a pgvector halfvec(1536) HNSW index; lexical only unless AEON_EMBEDDING_URL is set." },
        { term: "self-hosting", body: "The image ghcr.io/inspr-at/aeon:<version>, with no latest tag, configured through AEON_* variables. AEON_DATABASE_URL is required; attachments live under AEON_FILES_DIR." },
        { term: "sign-in and secrets", body: "People sign in with OIDC (Zitadel), one tenant per session. Server secrets come from files, and the session key file is required outside development. The web app loads no analytics and no third-party runtime assets." },
        { term: "releases", body: "INSPR-CalVer3 (YYMMDDhhmmss.0.0): this release is {version}, channel stable, sequence 113. An annotated tag builds the GHCR image and a draft GitHub release with SHA256SUMS; the draft is published only after live verification, which also updates the Homebrew tap." },
      ],
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
      harnesses: ["Claude", "Codex", "Cursor", "Grok", "pi"],
      live: "Live updates",
    },
    notes: [
      {
        title: "One log, kept whole",
        body: "A trigger lets the event log only grow; history and live updates both read from it.",
        proof: { label: "0101_relations_events.sql", path: "internal/db/migrations/0101_relations_events.sql" },
      },
      {
        title: "Tenancy in the database",
        body: "FORCE row-level security on every table keeps tenants apart below the application.",
        proof: { label: "0003_principals.sql", path: "internal/db/migrations/0003_principals.sql" },
      },
      {
        title: "Keys as ceilings",
        body: "An approval can refine a key's scopes and stays within them.",
        proof: { label: "approvals/doc.go", path: "internal/approvals/doc.go" },
      },
      {
        title: "Contract first",
        body: "One OpenAPI 3.1 file describes 300+ paths; the server embeds the web app it serves.",
        proof: { label: "api/openapi.yaml", path: "api/openapi.yaml" },
      },
    ],
  },
  horizon: {
    eyebrow: "What is coming",
    title: "Shipped today. Your agents get smarter next.",
    lead: "Hinged Hangar went live on 30 September. What follows can still change before it lands.",
    depths: {
      simple: "Hinged Hangar is live today. This is what comes next, and plans can still change before a release lands.",
      technical: "Hinged Hangar is {version}, channel stable, sequence 113. What follows are filed tickets, not commitments. Not shipped yet: most MCP tools, deploy-target enforcement and doctrine pull-request proposals.",
    },
    releases: [
      {
        label: "Intact Ion",
        status: "coming",
        statusLabel: "Next",
        when: "In progress",
        items: [
          { title: "Always an ETA", body: "Every ticket and every running agent shows an estimate and a live ETA, reported by the agents themselves." },
          { title: "Doctrine inbox", body: "When an agent finds a better rule, it proposes it: you see a dot, review the diff and promote it to git in one click." },
          { title: "Your brand in the header", body: "Your organisation's logo and short name in AEON's header." },
          { title: "Larger rule files", body: "Agent rule files up to 500 KB, with best-practice tips." },
        ],
      },
      {
        label: "Later",
        status: "planned",
        statusLabel: "Planned",
        when: "",
        items: [
          { title: "Cross-model review", body: "Every change an agent makes is reviewed by a different AI family before it can merge; the verdict shows on the ticket." },
          { title: "Autopilot lanes", body: "AEON picks, sizes and dispatches the next ticket to the best available agent within your budget, and stops where a person must decide." },
          { title: "More harnesses", body: "Gemini CLI and OpenCode, including open models, join Claude, Codex, Cursor, Grok and pi." },
          { title: "Talk to any running session", body: "Send a message into an attached Claude or Codex session straight from AEON." },
          { title: "Speed tiers per agent", body: "Default, Fast and, where vendors offer it, Ultra." },
        ],
      },
      {
        label: "Further out",
        status: "planned",
        statusLabel: "Planned",
        when: "",
        items: [
          { title: "Talk to AEON", body: "Voice: dictate tickets, steer agents and hear what needs you." },
          { title: "Morning briefing", body: "What your agents shipped overnight, what needs you and what it cost, every line linked to its source." },
          { title: "Approve on the go", body: "Push notifications and Face ID approvals from your phone." },
          { title: "Always-on agents", body: "Work continues in a secure cloud lane while your laptop sleeps, within your budget and rules." },
        ],
      },
    ],
    goodToKnow: {
      title: "Good to know",
      items: [
        "Steering and session settings are qualified for Claude on macOS.",
        "Attaching a running session is in early access and now works from any macOS terminal.",
        "Issues, knowledge and search run through the CLI and HTTP API.",
        "People sign in through your OIDC identity provider.",
      ],
    },
  },
  openSource: {
    eyebrow: "Open source",
    title: "Open source, AGPL-3.0.",
    body:
      "Inspect, self-host, fork and modify AEON under AGPL-3.0-only. Every source link on this page points at this release's tag.",
    depths: {
      simple: "The full source is public under an open-source license: you can inspect it, run it yourself and change it.",
      technical: "AGPL-3.0-only. An annotated tag builds the GHCR image and a draft GitHub release with SHA256SUMS, published only after live verification. Every source link on this page is pinned to this release's tag.",
    },
    links: [
      { label: "GitHub repository", href: repositoryUrl, external: true },
      { label: "Hinged Hangar on GitHub", href: `${repositoryUrl}/releases/tag/${tag}`, external: true },
      { label: "Project license (AGPL-3.0-only)", href: blob("LICENSE"), external: true },
      { label: "Security policy", href: blob("SECURITY.md"), external: true },
      { label: "Agent integration", href: blob("docs/AGENT_INTEGRATION.md"), external: true },
    ],
  },
  faq: [
    {
      question: "Which agents can we use?",
      answer:
        "Claude, Codex, Cursor, Grok and pi, including OpenRouter models through pi. They run through aeon-agentd on computers you pair, with your own subscriptions.",
      depths: {
        simple: "The major AI coding agents: Claude, Codex, Cursor, Grok and pi. They run on computers you connect, with your own subscriptions.",
        technical: "The harnesses codex, claude, pi, cursor and grok, driven by aeon-agentd on paired machines; each session registers with a worker lease. Codex and Cursor are connect-only, without automatic verification. pi reaches OpenRouter models (vendor/model[:variant]) after aeon-agentd add-harness --harness pi --provider openrouter, which checks the key without spending tokens.",
      },
    },
    {
      question: "Where does our data live?",
      answer:
        "Where you decide: on an instance Augmentoring operates for you, or self-hosted on your own infrastructure as one server binary and a Postgres 18 database. Either way, row-level security in the database keeps tenants apart.",
      depths: {
        simple: "Where you decide: with Augmentoring as your operator, or on your own servers. Either way, each organisation's data is kept apart in the database.",
        technical: "Hosted by Augmentoring, or self-hosted from ghcr.io/inspr-at/aeon:<version> on Postgres 18 with pgvector. Every row carries tenant_id under forced row-level security, and production needs a non-superuser database role.",
      },
    },
    {
      question: "Can an agent approve its own request?",
      answer:
        "No. An agent proposes; the database accepts a decision only from a person on a live approval, and every approval stays within the agent key's scopes.",
      depths: {
        simple: "No. Agents can only ask. Only a person can approve, and the database enforces that.",
        technical: "No. approvals.decide is never grantable to an agent key: agents only propose, and the database rejects an agent's decision.",
      },
    },
    {
      // Why only: the first question a decision maker asks.
      question: "Do we need our own servers?",
      answer:
        "No. Augmentoring can deploy, integrate and operate AEON for your team. If you prefer, you can run it yourselves from the public source.",
      depths: {
        simple:
          "No. Augmentoring can deploy, integrate and operate AEON for your team. If you prefer, you can run it yourselves from the public source.",
        technical:
          "No. Augmentoring can deploy, integrate and operate AEON for your team. If you prefer, you can run it yourselves from the public source.",
      },
      depthMax: "simple",
    },
    {
      // How only.
      question: "Does AEON ship an MCP server?",
      answer: "Partly. paimos mcp is a stdio server in which only whoami works in this release; its issue, knowledge and search tools are not there yet. Managed runs get a run-local MCP server with aeon_comment, aeon_status, aeon_request_approval and aeon_terminal.",
      depths: {
        simple: "Partly. paimos mcp is a stdio server in which only whoami works in this release; its issue, knowledge and search tools are not there yet. Managed runs get a run-local MCP server with aeon_comment, aeon_status, aeon_request_approval and aeon_terminal.",
        technical: "Partly. paimos mcp is a stdio server in which only whoami works in this release; its issue, knowledge and search tools are not there yet. Managed runs get a run-local MCP server with aeon_comment, aeon_status, aeon_request_approval and aeon_terminal.",
      },
      depthMin: "technical",
    },
    {
      // How only.
      question: "What does the daemon send to the server?",
      answer: "Content-free telemetry: no vendor tokens, no raw vendor payloads, and vendor session ids stay local. The daemon creates its credentials locally, and the server stores only hashes.",
      depths: {
        simple: "Content-free telemetry: no vendor tokens, no raw vendor payloads, and vendor session ids stay local. The daemon creates its credentials locally, and the server stores only hashes.",
        technical: "Content-free telemetry: no vendor tokens, no raw vendor payloads, and vendor session ids stay local. The daemon creates its credentials locally, and the server stores only hashes.",
      },
      depthMin: "technical",
    },
  ],
  finalCta: {
    title: "Run AEON your way.",
    body:
      "Self-host it from the public source, or let Augmentoring deploy, integrate and operate it for your team.",
  },
} satisfies AeonContent;
