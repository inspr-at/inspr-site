import { siteUrls } from "./urls";
import { buildOrder, engineJobs } from "./family";
import type { AeonContent } from "./types";
import captureManifest from "../assets/products/paimos-aeon/capture-manifest.json";

// INSPR-544: PAIMOS AEON as the one released product on this page. Every claim
// comes from the AEON lead's release brief and is checked against the source at
// the pinned source; proof paths resolve against `sourceTreeUrl`. Planned work
// appears only through the shared build order, with a status and no date. Left
// out on purpose: the business module, MCP issue and knowledge tools (early),
// embedding-ranked search and voice. INSPR-556: release-128 demo screens keep
// their release and fixture provenance; older screens keep their own capture date.
const repositoryUrl = "https://github.com/inspr-at/paimos";

type PaimosRelease = {
  number: string;
  sourceRef: string;
  codename?: string;
  tag?: string;
  publishedAt?: string;
  publishedLabel?: { en: string; de: string };
};

// INSPR-578: present release 138 with separate source evidence until its tag
// exists. Re-pin in this object alone: add tag, codename and publication fields;
// source links, release links and both editions follow without consumer edits.
export const paimosRelease: PaimosRelease = {
  number: "138",
  sourceRef: "c52e27a68e4785f911e9ac64d90508ad738a584c",
};

export const paimosSourceRef = paimosRelease.tag ?? paimosRelease.sourceRef;
export const paimosReleaseUrl = paimosRelease.tag
  ? `${repositoryUrl}/releases/tag/${paimosRelease.tag}`
  : `${repositoryUrl}/releases`;
const sourceRevision = paimosRelease.sourceRef.slice(0, 8);
// INSPR-578: changing the presented release cannot update retained images.
export const paimosScreenRelease = captureManifest.source.match(/^release-(\d+) /)?.[1];
if (!paimosScreenRelease) throw new Error("INSPR-578: demo captures need a recorded release");
// A trailing slash selects a directory; other destinations select files.
const blob = (path: string) => `${repositoryUrl}/${path.endsWith("/") ? "tree" : "blob"}/${paimosSourceRef}/${path}`;

export const paimosAeonContent = {
  name: "PAIMOS AEON",
  category: "Agents-first work platform",
  canonicalUrl: siteUrls.paimos,
  repositoryUrl,
  sourceTreeUrl: `${repositoryUrl}/tree/${paimosSourceRef}`,
  release: {
    name: "AEON",
    codename: paimosRelease.codename,
    label: `Release ${paimosRelease.number}`,
    version: paimosRelease.tag,
    sourceRevision,
    publishedAt: paimosRelease.publishedAt,
    publishedLabel: paimosRelease.publishedLabel?.en,
    url: paimosReleaseUrl,
  },
  seo: {
    title: "PAIMOS AEON · Your agents, your machines, your rules",
    description:
      "The agents-first work platform where people stay in charge: start Claude Code, Codex, Cursor and pi on your own machines, see registered sessions in one control room, and leave gated decisions to a person.",
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
      "AEON starts Claude Code, Codex, Cursor and pi on your own computers, shows registered sessions in one control room, and leaves gated decisions to a person.",
    depths: {
      simple:
        "AEON lets your team and its AI helpers work on the same projects. The helpers run on your computers, you see their reported work, and people approve the important steps.",
      technical: `Release ${paimosRelease.number}${paimosRelease.codename ? ` “${paimosRelease.codename}”` : ""}: one Go binary with an embedded Vue app, Postgres 18 under FORCE row-level security, protected audit history per tenant, one OpenAPI 3.1 contract, and aeon-agentd starting Claude Code, Codex, Cursor and pi on paired machines. Selected probe and heartbeat telemetry can be pruned after 14 days.`,
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
  },
  figures: [
    {
      claim: "Rules from six scopes (company, project, person, agent role, named agent and task) merge into one rulebook; doctrine is read from git at a pinned commit.",
      linkLabel: "How the rules work",
      href: "#rules",
    },
    {
      claim: "People and agents write to one event log per tenant. Audit history is protected; selected probe and heartbeat telemetry can be pruned after 14 days.",
      linkLabel: "See the architecture",
      href: "#architecture",
    },
    {
      claim: "One OpenAPI 3.1 file describes more than 500 API paths.",
      linkLabel: "Read the contract",
      // The contract is generated; link to its committed per-area sources.
      href: blob("api/areas/"),
    },
  ],
  theatre: {
    eyebrow: "Real screens",
    title: "AEON in real screens.",
    lead: "Delivery, independent review and conversations with managed agents, shown in retained screens with fictional project data.",
    note: `Real screen, demo data · release ${paimosScreenRelease}`,
    openLabel: "Open full size",
    screens: [
      {
        id: "delivery",
        tab: "Delivery",
        title: "Live delivery",
        body: "A demo release 126 on one timeline, lane by lane: you, the lead, ops and reviewer agents, the builder and the checks. A red band marks the incident since 20:14, and the summary says what runs now and that healthy is expected around 20:35.",
        alt: "PAIMOS Delivery in Live mode, with release and change timelines and the current delivery status.",
      },
      {
        id: "review",
        tab: "Review",
        title: "Cross-family review",
        body: "A workspace rule that a change counts as reviewed only when a model of another family reviewed it. The pull request shows the same rule as a GitHub status.",
        alt: "PAIMOS cross-family review policy with a reviewer from another model family selected.",
      },
      {
        id: "chat",
        tab: "Chat",
        title: "Chat with an agent",
        body: "The release-128 demo shows a conversation with the lead: a code block with Copy, a Read receipt, a message queued for after this turn, and Stop on Esc. Current live reply streaming is installation opt-in, off by default; Stop needs an interruptible active step.",
        alt: "PAIMOS agent chat with a read receipt, a queued message, a code block and Stop control.",
      },
      {
        id: "attention",
        tab: "Needs attention",
        title: "Needs attention",
        body: "Five autopilot suggestions grouped by project: three AEON tickets from New to Backlog and two PHAROS tickets to cancel. Apply or dismiss each one, or apply all for a project.",
        alt: "PAIMOS Needs attention grouped by project, with suggested ticket changes and bulk triage.",
      },
      {
        id: "models",
        tab: "Models",
        title: "One default model",
        body: "The release-128 screen shows a default model, exceptions for UI design (locked), docs and copy, and concepts. Cross-family review is selected, and the next backend build and its reviewer are named.",
        alt: "PAIMOS Models settings with one default model, task exceptions and independent reviews.",
      },
      {
        id: "usage",
        tab: "Usage",
        title: "Usage",
        body: "The release-128 screen shows a shared weekly quota with 42% left and its reset time, two signed-in computers, and the older Careful, Balanced and Max out choices with a 10% floor.",
        alt: "PAIMOS account usage with a careful-use policy, limits, remaining capacity and reset times.",
      },
    ],
  },
  specs: {
    eyebrow: "Specs",
    title: "What you get.",
    // INSPR-578: two new cards; existing images keep their provenance.
    lead: "Twenty-one released capabilities. Six of the images are illustrations and say so. Hover or tap a card for the detail.",
    leadEli10: "The same twenty-one, in plain words.",
    items: [
      {
        label: "Agents first",
        icon: "workflow",
        group: "ai",
        note: "Claude Code, Codex, Cursor and pi start under Paimos in the same projects as people, each under its own key and scopes. Grok runs tool-free on Apple silicon. Gemini and OpenCode adapters are available; managed readiness and verification remain unqualified.",
        noteEli10: "AI helpers from several makers work in the same projects as your people, and each one wears its own badge. A few join with fewer abilities for now.",
      },
      {
        label: "Control room",
        icon: "panels-top-left",
        group: "ai",
        note: "Project-grouped registered sessions bring state, tickets, model, effort and saved conversations together. Inbox messages show sent, delivered and read. Live reply streaming is installation opt-in, off by default; Esc/Stop needs an interruptible active step.",
        noteEli10: "Find registered helpers and their conversations by project. Message receipts show delivery and reading. Live replies need an installation setting, off by default. Stop is available for an active step that accepts interruption.",
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
        label: "Accounts and models",
        icon: "route",
        group: "ai",
        note: "Set account permissions and a daily pace in percentage points or Use everything, with Boost for today. Choose model fallback orders, per-step reasoning levels and situation-specific choices, with visible wait reasons. Accounts, Computers and Capacity have separate settings. Automatic model updates remain opt-in.",
        noteEli10: "Choose which accounts a project may use, how much to use each day, and which models to try in order. Set how hard each model thinks and see why work must wait. Newer model versions are adopted only if you enable that setting.",
      },
      {
        label: "Governed rules",
        icon: "scroll-text",
        group: "ai",
        note: "Rules layer from company to task, publish as immutable versions with locked floors and byte budgets, and doctrine is read from git at a pinned commit, with drift checks.",
        noteEli10: "House rules build on each other, from company to task. Important rules stay locked, size limits keep them readable, and a check tells you when a helper has a different copy.",
      },
      {
        label: "Cross-family review",
        icon: "git-compare-arrows",
        group: "ai",
        note: "Choose per company or project that every change needs a review from another model family; PAIMOS checks the author from its own records and flags merges that skipped the queue or a verified review.",
        noteEli10: "Choose that each change needs a check by a helper from another AI maker. With GitHub connected, PAIMOS checks who wrote it and flags missing review or queue steps. Running the reviews and fixes itself is still a preview.",
      },
      {
        label: "Protected audit history",
        icon: "file-check-2",
        group: "security",
        note: "A database trigger protects ordinary audit events against updates and deletes. Narrow service authority can prune account-probe events and qualifying heartbeat telemetry after 14 days.",
        noteEli10: "The database protects the audit trail. Selected account checks and heartbeat records can be removed after 14 days.",
      },
      {
        label: "Tenant isolation",
        icon: "lock-keyhole",
        group: "security",
        note: "FORCE row-level security in Postgres separates tenant data, below the application.",
        noteEli10: "Each organisation's data is walled off by the database itself.",
      },
      {
        label: "One work tree",
        icon: "list-tree",
        group: "work",
        note: "Projects, epics, tickets, releases, work orders and knowledge are nodes in one tree with typed relations. Where configured, a START conversation becomes a person-confirmed project with structured work.",
        noteEli10: "Projects, tasks and knowledge share a tree, so you can see how work connects. Where set up, a START conversation can become a project after a person confirms it.",
      },
      {
        // INSPR-578: goals and workflow checks are the two added capabilities.
        label: "Goals and progress",
        icon: "circle-dot",
        group: "work",
        note: "See goals and epics with progress history, agent-set ETAs, remaining work estimates and decisions waiting on a person. Status notes and ETA freshness show who reported what and when.",
        noteEli10: "See how a goal is moving, what work remains and which decisions need you. Estimates and updates show who set them and how old they are.",
      },
      {
        label: "Work orders",
        icon: "timer",
        group: "work",
        note: "Work orders carry cost and time ceilings; done means every criterion met, evidence attached and no live run.",
        noteEli10: "A job for a helper comes with a budget and a finish line, and it counts as done with proof.",
      },
      {
        label: "Workflow checks",
        icon: "ticket-check",
        group: "work",
        note: "Set readiness and completion checks that agents must satisfy. Permitted people can override with a recorded reason. Project administrators decide whether copied project checks adopt later workspace changes.",
        noteEli10: "Set what must be ready before work starts and what counts as finished. A person with permission can make an exception and must record why. Changes to copied project checks wait for an administrator's decision.",
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
        note: "Tokens per session, ticket and epic keep list-price estimates apart from subscription use. Supported, shared quota readings show last-measured use, age and reset times. Measured history supports consumption and refill forecasts, with stale or missing readings marked. Idle quota launches for the documented Claude/Codex versions remain unqualified.",
        noteEli10: "See recorded AI use and forecasts from shared measurements. The view marks old or missing readings and shows when an account resets. Fresh measurements of idle Claude/Codex accounts still need qualification.",
      },
      {
        label: "Delivery dashboard",
        icon: "waypoints",
        group: "ops",
        note: "Measure first-try success, build rounds, idle time and build-to-merge lead time from recorded steps. Follow or replay reported delivery steps, compare targets, and keep separately recorded live confirmation distinct from merge. CI and merge-queue data need GitHub connected.",
        noteEli10: "See how many tries a change took and where it waited, using the steps your project records. Merged work and a person's later confirmation that it is live are separate facts.",
      },
      {
        label: "Contract first",
        icon: "braces",
        group: "ops",
        note: "One OpenAPI 3.1 file with more than 500 paths, served by a single binary that embeds the web app.",
        noteEli10: "A public contract describes the HTTP API that other tools can use.",
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
        body: "A machine-readable description of HTTP API endpoints, so other tools can call them without guessing.",
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
    title: "Registered agents in one view.",
    lead:
      "Sessions grouped by project, lead and worker trees, tickets, state, model, effort and saved conversations. Inbox messages show when they were sent, delivered and read.",
    depths: {
      simple:
        "Find registered AI helpers by project: what they work on, who they report to, their conversations and the controls their sessions offer.",
      technical:
        "AgentsView renders sessions reported over the daemon protocol. An eligible, owned running coordinator can be adopted as lead. Person-requested starts in lead projects retain conflict checks. Controls follow advertised session capabilities; saved conversations and inbox receipts are separate from opt-in live reply streaming, which defaults off.",
    },
    items: [
      {
        icon: "users-round",
        title: "Lead and worker trees",
        body: "Registered leads and their workers, grouped by project with reported state and linked tickets. Eligible owned running coordinators can be adopted as lead.",
      },
      {
        icon: "radio-tower",
        title: "Messages with receipts",
        body: "Sent, Delivered, Read track inbox delivery. Supported ordinary chat adapters can queue input at a turn boundary, including Cursor where advertised. Live reply streaming is installation opt-in, off by default.",
      },
      {
        icon: "sliders-horizontal",
        title: "Steer, interrupt, stop",
        body: "Available chat input follows session capabilities: Claude/Codex native steering, pi next-step input and queued ACP input. Esc/Stop requires an interruptible active step; steering can start the next step of a yielded managed session.",
        caveat: "Restricted managed control and session settings: Claude on macOS. Chat input has separate capability checks.",
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
          note: "Runs tool-free on Apple silicon. Verification and review stay single-turn; ordinary chat can continue with queued input where enabled. General builder support remains unqualified.",
        },
        {
          status: "planned",
          harnesses: ["Gemini", "OpenCode"],
          note: "Adapters available; managed readiness and verification remain unqualified.",
        },
      ],
    },
    proof: [
      { label: "Agents workspace", path: "web/src/views/AgentsView.vue" },
      { label: "Managed control", path: "internal/agentd/managed_control.go" },
      { label: "Chat capabilities", path: "internal/agentd/chat_stream.go" },
      { label: "Chat rollout defaults", path: "internal/config/config.go" },
      { label: "Adopt a running lead", path: "docs/features/adopt-running-lead.md" },
      { label: "Person-requested runs", path: "internal/agentruns/runs.go" },
      { label: "Goals and progress", path: "docs/features/goals-view.md" },
      { label: "Model fallback orders", path: "docs/features/models-v2-resolver.md" },
      { label: "Daily pace", path: "web/src/components/settings/CapacitySection.vue" },
      { label: "Quota history", path: "docs/features/account-quota-history.md" },
      { label: "Quota forecasts", path: "internal/agentaccounts/quota_outlook.go" },
      { label: "Delivery measurements", path: "internal/delivery/building.go" },
      { label: "Live confirmation", path: "internal/delivery/deploy.go" },
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
      { label: "Workflow checks", path: "internal/workorders/entry_checks.go" },
      { label: "Definition decisions", path: "docs/features/workspace-definition-decisions.md" },
      { label: "Configured project intake", path: "internal/projectdraft/module.go" },
      { label: "Person-confirmed project creation", path: "internal/projectdraft/create.go" },
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
    // INSPR-578: preview setup is available; execution and learning stay separate.
    learning: "Rule proposals from outcomes are live and need a person's approval. Routines preview: definitions, templates, assignments and run logbooks are available. Automatic execution remains off pending qualification and person consent. Learning from earlier runs is planned.",
    early: "Early access: rule edits as pull requests, once an operator enables them.",
    screenAlt:
      "The AEON agent rules view: company and project rule sets with their locks, one opened set of locked kernel rules, the byte budget and doctrine pinned from git.",
    proof: [
      { label: "Rules", path: "internal/rules" },
      { label: "Rules compare", path: "internal/rulescompare" },
      { label: "README: Agent rules", path: "README.md" },
      { label: "Rule proposals from outcomes", path: "internal/rules/doctrine/analysis_job.go" },
      { label: "Routine setup and limits", path: "docs/features/routines.md" },
      { label: "Routine execution gates", path: "docs/features/routine-dispatch.md" },
    ],
  },
  // INSPR-544: the retired Journey gives way to the engine, told from the
  // shared engine jobs. Flow 2 is planned and carries no date.
  engine: {
    eyebrow: "The engine",
    title: "The engine that runs the work.",
    lead:
      "Six jobs run the work around the tickets. Four are live, two are partly live: each one says how far it has shipped.",
    shadow: "Managed starts and Models routing are available. The broader admission controller and automatic review and shipping orchestration remain shadow preview: they record proposed decisions beside your process. Shadow shipping does not merge or deploy.",
    depths: {
      simple:
        "The engine is the part of AEON that keeps agents and people in step. Some of its jobs already work; others are still being built.",
      technical:
        "Available: managed starts with admission limits; account permissions, daily pace and model fallback orders; goal progress, ETA freshness and build-to-merge measurements; the merge audit; and the header Decision Desk for questions, approvals, step-ups, prepared lessons and definition decisions, including on phones. The former Agents decision queue has been replaced; sign-in chores and ticket triage remain separate. Host-load checks for new starts are available when enabled, off by default. Routine PR actions and admission-queue machinery remain gated preview; automatic queue enforcement defaults off.",
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
        "Under the hood, AEON uses one program and one database, with protected audit history and shorter retention for selected telemetry.",
      technical:
        "A single Go binary embeds the Vue app and serves the OpenAPI 3.1 contract. Postgres 18 with pgvector holds tenant data under FORCE row-level security. Protected audit events drive history and server-sent live updates; selected account-probe and heartbeat telemetry can be pruned after 14 days. aeon-agentd speaks one daemon protocol to the harness adapters.",
    },
    diagram: {
      clientsLabel: "People and tools",
      clients: ["Browser", "CLI", "HTTP API"],
      serverLabel: "One server",
      server: ["Single Go binary", "Embedded web app", "OpenAPI 3.1 contract"],
      databaseLabel: "One database",
      database: ["Postgres 18", "FORCE row-level security", "Protected audit history"],
      daemonLabel: "Your machines",
      daemon: "aeon-agentd",
      harnesses: ["Claude Code", "Codex", "Cursor", "pi", "Grok (tool-free)"],
      live: "Live updates",
    },
    notes: [
      {
        title: "Protected history, bounded telemetry",
        body: "Ordinary audit events remain append-only. Narrow service authority can prune account-probe events and qualifying heartbeat telemetry after 14 days; history and live updates still read from the event log.",
        proof: { label: "Audit protection and telemetry retention", path: "internal/db/migrations/1369_telemetry_retention.sql" },
      },
      {
        title: "Tenancy in the database",
        body: "FORCE row-level security keeps tenant data apart below the application.",
        proof: { label: "Tenancy schema", path: "internal/db/migrations/0003_principals.sql" },
      },
      {
        title: "Keys as ceilings",
        body: "An approval can refine a key's scopes and stays within them.",
        proof: { label: "Approvals package notes", path: "internal/approvals/doc.go" },
      },
      {
        title: "Contract first",
        body: "One OpenAPI 3.1 file describes more than 500 paths; the server embeds the web app it serves.",
        proof: { label: "OpenAPI contract", path: "api/areas" },
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
        "Restricted managed control and session settings are qualified for Claude on macOS. Chat input follows advertised capabilities: Claude/Codex native steering, pi next-step input and queued ACP input. Stop needs an interruptible active step.",
        "Claude and Grok on Apple silicon have qualified tool-free verification; Codex and Cursor connect without an automatic verification run.",
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
    body: paimosRelease.tag
      ? `Inspect, self-host, fork and modify AEON under AGPL-3.0-only. Source links point at the release ${paimosRelease.number} tag.`
      : `Inspect, self-host, fork and modify AEON under AGPL-3.0-only. Source links point at revision ${sourceRevision}, which contains the release ${paimosRelease.number} work, until its release tag is published.`,
    links: [
      { label: "GitHub repository", href: repositoryUrl, external: true },
      { label: "Releases on GitHub", href: paimosReleaseUrl, external: true },
      { label: "Project license (AGPL-3.0-only)", href: blob("LICENSE"), external: true },
      { label: "Security policy", href: blob("SECURITY.md"), external: true },
      { label: "Agent integration", href: blob("docs/AGENT_INTEGRATION.md"), external: true },
    ],
  },
  faq: [
    {
      question: "Which agents can we use?",
      answer:
        "Claude Code, Codex, Cursor and pi start under Paimos on macOS and Linux, including OpenRouter models through pi. Live acceptance is still open. Grok runs tool-free on Apple silicon; verification and review stay single-turn, while ordinary chat can continue with queued input where enabled. Gemini and OpenCode adapters are available; managed readiness and verification remain unqualified. Agents run through aeon-agentd on paired computers with your own subscriptions.",
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
