import { siteUrls } from "./urls";
import type { ProductContent } from "./types";

export const pharosContent = {
  slug: "pharos",
  name: "Pharos",
  category: "Fleet operations",
  canonicalUrl: siteUrls.pharos,
  repositoryUrl: "https://github.com/markus-barta/pharos",
  releaseUrl: "https://github.com/markus-barta/pharos/releases/tag/v0.1.41",
  license: {
    name: "AGPL-3.0-only",
    url: "https://github.com/markus-barta/pharos/blob/main/LICENSE",
    note: "The Pharos repository declares SPDX license AGPL-3.0-only.",
  },
  seo: {
    title: "Pharos - Clear fleet operations for servers and backups",
    description:
      "Pharos is a self-hosted fleet operations control plane for server liveness, configuration drift, backup evidence and guarded maintenance workflows.",
  },
  hero: {
    eyebrow: "PHAROS / FLEET OPERATIONS",
    title: "Fleet truth before action.",
    lead:
      "Pharos gives operations teams a current view of servers, configuration drift, backups and maintenance. It keeps observed state, declared intent and pending work separate, so a request is never presented as if it had already become reality.",
    alt: "A lighthouse overlooking a calm network of connected fleet nodes",
    primaryLabel: "Explore how Pharos works",
    primaryHref: "#model",
  },
  serviceIntro:
    "Augmentoring deploys and operates Pharos around your infrastructure.",
  proof: [
    "Self-hosted control plane",
    "Outbound host beacon",
    "ZITADEL OIDC",
    "AGPL-3.0-only",
  ],
  problem: {
    eyebrow: "THE OPERATING GAP",
    title: "The gaps are the risk.",
    lead:
      "A server can answer a ping while its configuration is drifting. A backup job can succeed without proving that anything can be restored. A deployment button can work while leaving no trustworthy record of what was reviewed. Pharos brings those facts together without pretending they are the same thing.",
    items: [
      {
        title: "Last seen is not the same as live",
        body:
          "Pharos derives liveness from server-received heartbeats and each host's expected reporting cadence. Historic signals are real reports, not generated decoration.",
        meta: "Live · Stale · Down · Awaiting",
        icon: "radio-tower",
      },
      {
        title: "A successful backup is not a recovery",
        body:
          "Backup freshness and restore validation remain separate. Operators can see whether a job ran, whether the repository was checked and whether recovery evidence is still current.",
        meta: "Run state · Repository check · Restore evidence",
        icon: "database-backup",
      },
      {
        title: "A button is not a change process",
        body:
          "Sensitive maintenance begins with review. Backup readiness, build results, authorization and explicit confirmation are recorded before the target host can apply anything.",
        meta: "Review · Confirm · Apply · Verify",
        icon: "shield-check",
      },
    ],
  },
  model: {
    eyebrow: "OPERATING MODEL",
    title: "Observe. Compare. Gate. Verify.",
    lead:
      "Pharos is built around a simple rule: facts, intent and actions belong to different layers. Keeping those layers separate makes the fleet easier to understand and harder to change by accident.",
    steps: [
      {
        number: "01",
        title: "Observe",
        visual: { x: 30, y: 19 },
        body:
          "A small beacon sends bounded, non-secret facts over an outbound connection: heartbeat cadence, Nix freshness, kernel posture, service state, backup posture and optional coarse location.",
        icon: "radio-tower",
        signal: "Fresh host evidence, stamped on receipt.",
        reference: {
          label: "Inspect the host report contract",
          href: "https://github.com/markus-barta/pharos/blob/main/crates/pharos-core/src/lib.rs#L206-L250",
          external: true,
        },
      },
      {
        number: "02",
        title: "Compare",
        visual: { x: 29, y: 66 },
        body:
          "Pharos keeps runtime observations separate from nixcfg declarations and operator requests. You can tell what is running now, what has been declared and what is still waiting to be applied.",
        icon: "git-compare-arrows",
        signal: "Observed and declared remain separate.",
        reference: {
          label: "See the five-state truth model",
          href: "https://github.com/markus-barta/pharos/blob/main/README.md#L37-L47",
          external: true,
        },
      },
      {
        number: "03",
        title: "Gate",
        visual: { x: 63, y: 50 },
        body:
          "Fixed maintenance workflows require the relevant checks before execution. The browser creates a review record; it never sends arbitrary commands to a host.",
        icon: "shield-check",
        signal: "No review, no lease, no action.",
        reference: {
          label: "Review the guarded workflow",
          href: "https://github.com/markus-barta/pharos/blob/main/README.md#L323-L340",
          external: true,
        },
      },
      {
        number: "04",
        title: "Verify",
        visual: { x: 86, y: 48 },
        body:
          "After a switch or restart, Pharos waits for fresh host evidence, checks the running kernel and reconciles the result with the original workflow. Recovery verifies state without silently replaying the change.",
        icon: "badge-check",
        signal: "A fresh report closes the loop.",
        reference: {
          label: "Trace verification and recovery",
          href: "https://github.com/markus-barta/pharos/blob/main/README.md#L329-L340",
          external: true,
        },
      },
    ],
    closing:
      "Requested, declared and applied are three different states. Pharos preserves that distinction from the settings screen to the next host report.",
  },
  featureSections: [
    {
      id: "fleet",
      eyebrow: "FLEET VISIBILITY",
      title: "Quiet when healthy.",
      lead:
        "Fleet cards and compact rows show the same operational truth: host identity, liveness, last report, signal history, drift, backup posture and the reason a host needs attention. Healthy systems stay visually calm. Missing evidence remains visible instead of being converted into a green status.",
      items: [
        {
          title: "Heartbeat truth",
          body:
            "Liveness is derived from server-stamped reports and the host's declared cadence. Selectable signal windows show real arrival history, including honest gaps.",
          icon: "radio-tower",
          reference: {
            label: "Read the heartbeat contract",
            href: "https://github.com/markus-barta/pharos/blob/main/crates/pharos-core/src/lib.rs#L219-L246",
            external: true,
          },
        },
        {
          title: "Attention without alarm fatigue",
          body:
            "Search and sorting surface hosts by need, name or last change. Workstations can remain honestly offline without producing the false down alerts expected only from always-on servers.",
          icon: "list-filter",
        },
        {
          title: "A fleet you can place",
          body:
            "The optional map combines coarse, source-aware location with measured inbound report latency. Hidden or unknown location stays unknown rather than being guessed.",
        },
      ],
    },
    {
      id: "drift",
      eyebrow: "CONFIGURATION AND DRIFT",
      title: "See drift early.",
      lead:
        "For NixOS hosts, Pharos reports how old the active flake lock is, how far the host is behind nixcfg and whether a newer kernel is already staged. Non-Nix hosts still participate in liveness, backup, location and service reporting through the portable beacon.",
      items: [
        {
          title: "Nix freshness in plain language",
          body:
            "Operators see a concise answer such as flake.lock age and commits behind nixcfg instead of having to reconstruct drift from a checkout and deployment history.",
          icon: "git-compare-arrows",
        },
        {
          title: "Running versus ready",
          body:
            "Kernel posture distinguishes the version currently running from the version staged in the active system configuration. A restart requirement is evidence, not an inference from a deployment timestamp.",
          icon: "binary",
        },
        {
          title: "Declared services, runtime observations",
          body:
            "Service cards come from a versioned declared manifest. Pharos overlays only bounded runtime observations and selected server-side reachability checks without writing those results back into configuration intent.",
        },
      ],
    },
    {
      id: "backups",
      eyebrow: "BACKUP POSTURE",
      title: "A run is not recovery.",
      lead:
        "Pharos treats backup posture as an operating signal, not a checkbox. It distinguishes healthy, stale, failed, missing and unknown backups, then tracks validation evidence separately from the last successful run.",
      items: [
        {
          title: "Restore evidence has levels",
          body:
            "Snapshot existence, repository checks, mount or list tests, isolated restore samples, checksum comparisons and recorded recovery drills remain distinct forms of evidence.",
          icon: "badge-check",
        },
        {
          title: "Native Restic, open adapter boundary",
          body:
            "Restic posture is collected directly. Borg, Kopia, provider snapshots and other systems can report through the same sanitized status-file or command adapter contract without sending backup contents or credentials.",
          icon: "database-backup",
        },
        {
          title: "Protection begins during onboarding",
          body:
            "Teams can record whether backup is required, external, deferred or intentionally absent. NixOS flows can produce a reviewable Restic enrollment proposal instead of hiding unfinished protection behind a completed setup state.",
        },
      ],
    },
    {
      id: "onboarding",
      eyebrow: "ONBOARDING",
      title: "Every host starts with preflight.",
      lead:
        "The setup assistant keeps one decision in view at a time, records safe progress and waits for first-host evidence before treating onboarding as complete.",
      items: [
        {
          title: "Existing Linux servers",
          body:
            "Pharos checks the SSH route, operating system, privilege path, available disk and existing backup signals before recording an automated handoff. Failed preflight produces a concrete next action instead of a partial install.",
          icon: "server-cog",
        },
        {
          title: "NixOS and portable paths",
          body:
            "NixOS hosts can use the native module and guarded nixos-anywhere path. Other Linux hosts can use the hardened systemd beacon installer with a private runtime token file.",
          icon: "network",
        },
        {
          title: "Provider-backed jobs",
          body:
            "The reviewed job model covers provisioning, bootstrap, first heartbeat and backup posture. Authenticated read-only provider checks are live; managed create and cleanup execution stays disabled pending attended production acceptance.",
        },
      ],
    },
    {
      id: "guarded-actions",
      eyebrow: "GUARDED ACTIONS",
      title: "Change through a gate.",
      lead:
        "Pharos supports a deliberately small set of operational actions: settings changes, a shared system-update proposal, per-host update and restart, recovery and host retirement. Each begins with review and exposes one clear next step.",
      items: [
        {
          title: "Review before execution",
          body:
            "The workflow validates the target, records changed areas and requires all-host evaluation, target build, fresh backup and rollback evidence where applicable.",
          icon: "shield-check",
          reference: {
            label: "Inspect the persisted action stages",
            href: "https://github.com/markus-barta/pharos/blob/main/README.md#L323-L340",
            external: true,
          },
        },
        {
          title: "Attended change boundary",
          body:
            "Authorization and explicit confirmation happen immediately before a fixed target-local phase. A host agent claims only the reviewed phase and cannot turn the workflow into a general command channel.",
          icon: "key-round",
        },
        {
          title: "Verification after restart",
          body:
            "Pharos observes loss and return of heartbeat, verifies kernel and host health, preserves typed failure evidence and offers bounded recovery without repeating a successful switch or reboot.",
        },
        {
          title: "Retire management, not the machine",
          body:
            "Remove host revokes reporting and retires owned declarations and credentials through their respective systems. It does not delete the server, disks, services or application data.",
        },
      ],
    },
  ],
  audiences: {
    eyebrow: "WHO IT SERVES",
    title: "Built for small fleets.",
    lead:
      "Pharos is most useful where a small group owns a mixed fleet and needs clear operating evidence without introducing another unrestricted automation surface.",
    items: [
      {
        title: "Small platform and operations teams",
        body:
          "Keep client-facing servers, internal services and workstations in one calm view while retaining explicit ownership of configuration and change approval.",
      },
      {
        title: "Consultancies and managed environments",
        body:
          "Separate each person's host access, preserve review evidence and make backup and drift posture visible before maintenance begins.",
      },
      {
        title: "NixOS-heavy infrastructure",
        body:
          "Connect declared nixcfg state with the system that is actually running, without letting a dashboard silently become the source of truth.",
      },
    ],
  },
  architecture: {
    eyebrow: "ARCHITECTURE",
    title: "Small core. Hard boundaries.",
    lead:
      "Pharos is a Rust workspace with shared contracts between server and beacon, preventing their report schema from drifting independently.",
    paragraphs: [
      "The control plane uses axum, server-rendered HTML and a small vanilla JavaScript layer over stable JSON APIs. A host beacon reports through an outbound connection, while the browser reads the reconciled fleet model and creates review records for the fixed actions Pharos understands.",
      "nixcfg supplies declared host and service intent. Janus owns machine credentials and secure provider handoffs. ZITADEL supplies human identity, while Pharos retains the final per-host authorization decision.",
      "State is persisted as JSON today. That keeps deployment compact and the backup boundary explicit. SQLite remains a demand-driven future option rather than an architectural promise.",
    ],
    flow: [
      "NixOS or Linux host",
      "pharos-beacon outbound report",
      "pharosd typed state and workflows",
      "authorized operator dashboard",
    ],
    facts: [
      "Rust workspace shared by control plane and beacon",
      "Self-host Docker Compose template",
      "Native NixOS module",
      "Portable Linux systemd installer",
      "Optional JSON persistence",
      "Server-rendered UI with a small JavaScript bridge",
    ],
  },
  trust: {
    eyebrow: "TRUST BOUNDARIES",
    title: "Secrets stay behind the surface.",
    lead:
      "Human identity, machine identity, provider credentials and operational evidence have separate paths. Pharos exposes the facts an operator needs without moving secret values into the browser or workflow history.",
    items: [
      {
        title: "Human access",
        body:
          "ZITADEL provides OIDC identity. Pharos applies its own operator and per-host access policy, with an empty view by default for authenticated users who have no grants.",
        reference: {
          label: "Inspect fail-closed access grants",
          href: "https://github.com/markus-barta/pharos/blob/main/crates/pharosd/src/auth.rs#L293-L329",
          external: true,
        },
      },
      {
        title: "Machine access",
        body:
          "Per-host beacon tokens are returned once and verified by hash. Janus can own token material and render value-free verifier sidecars for the control plane.",
      },
      {
        title: "Value-free workflows",
        body:
          "Provider credentials, raw beacon tokens, shell commands, machine paths and command output are excluded from browser state, persisted jobs and sanitized workflow evidence.",
      },
      {
        title: "Restricted host service",
        body:
          "The native beacon runs as an unprivileged system user with no-new-privileges, strict filesystem protection, restricted namespaces and a narrow set of network address families.",
        reference: {
          label: "Inspect beacon hardening",
          href: "https://github.com/markus-barta/pharos/blob/main/nix/modules/pharos-beacon.nix#L172-L197",
          external: true,
        },
      },
    ],
  },
  integrations: {
    eyebrow: "INTEGRATIONS",
    title: "Maturity stays visible.",
    lead:
      "Pharos uses maturity labels so a planned connector never looks like a production-ready path.",
    items: [
      {
        name: "NixOS and nixcfg",
        status: "Native",
        description:
          "Declared state, freshness, kernel posture, host preferences and guarded lifecycle workflows.",
      },
      {
        name: "Standard Linux",
        status: "Native",
        description:
          "Portable outbound systemd beacon with local private state and no inbound listener.",
      },
      {
        name: "ZITADEL",
        status: "Native",
        description:
          "Human OIDC login. Final operator and host authorization remains in Pharos.",
      },
      {
        name: "Janus",
        status: "Integrated",
        description:
          "Beacon-token sidecars, owned credential retirement and value-free secure setup handoffs.",
      },
      {
        name: "Restic",
        status: "Native",
        description:
          "Backup freshness, failure and validation posture without backup contents or credentials.",
      },
      {
        name: "Other backup systems",
        status: "Adapter",
        description:
          "Typed sanitized status-file or command contract for Borg, Kopia, provider snapshots and other engines.",
      },
      {
        name: "Hetzner Cloud",
        status: "Read-only live",
        description:
          "Authenticated connection, SSH key, firewall, catalog and price checks are live and read-only. Managed execution is disabled pending attended production acceptance.",
      },
      {
        name: "netcup",
        status: "Guided",
        description:
          "External ordering followed by the existing-host import path. Pharos does not claim an unsupported provisioning API.",
      },
      {
        name: "AWS, Google Cloud and Oracle Cloud",
        status: "Planned",
        description:
          "Future connectors must verify live eligibility, quota, region, expiry, budget and capacity instead of promising generic free infrastructure.",
      },
    ],
  },
  limits: {
    eyebrow: "DELIBERATE LIMITS",
    title: "Boundaries by design.",
    lead:
      "A smaller operating surface is easier to reason about. Pharos focuses on fleet posture and guarded change while specialist systems keep their specialist jobs.",
    items: [
      "Pharos is not a generic metrics platform, log warehouse, tracing backend or remote shell.",
      "There is no arbitrary command channel. Target agents claim only fixed, schema-validated workflow phases.",
      "Pharos does not replace container-level or AI-agent observability from the retired FleetCom system.",
      "A successful backup run is not presented as restore proof without separate validation evidence.",
      "A merged declaration is not shown as applied until the host reports the matching value.",
      "Removing a host does not delete its server, disks, services or application data.",
      "Persistence is JSON today, and human sessions are in memory. A server restart requires users to sign in again.",
      "Authenticated Hetzner provider checks are live and read-only. Managed execution is disabled pending attended production acceptance; other cloud connectors are guided or planned.",
    ],
  },
  openSource: {
    eyebrow: "SOURCE AND SELF-HOSTING",
    title: "Run it on your terms.",
    body:
      "The latest tagged release is v0.1.41, while current main declares v0.1.43. The control plane, beacon, Docker Compose template, NixOS module and portable installer live in the Pharos source repository under AGPL-3.0-only. Inspect the operating boundaries and adapt the system to your infrastructure under those terms.",
    links: [
      {
        label: "Source repository",
        href: "https://github.com/markus-barta/pharos",
        external: true,
      },
      {
        label: "Project license (AGPL-3.0-only)",
        href: "https://github.com/markus-barta/pharos/blob/main/LICENSE",
        external: true,
      },
      {
        label: "Official AGPL text",
        href: siteUrls.agpl,
        external: true,
      },
      {
        label: "Latest tagged release v0.1.41",
        href: "https://github.com/markus-barta/pharos/releases/tag/v0.1.41",
        external: true,
      },
    ],
  },
  faq: [
    {
      question: "Is Pharos only for NixOS?",
      answer:
        "No. NixOS receives the deepest declarative integration, including freshness and guarded rebuild workflows. Other Linux systems can use the portable systemd beacon for liveness, backup, location and service posture.",
    },
    {
      question: "Does Pharos execute arbitrary commands on hosts?",
      answer:
        "No. Target agents can claim only fixed, schema-validated workflow phases. The persistent workflow record cannot contain shell commands, credential values or raw command output.",
    },
    {
      question: "Does Pharos replace Prometheus, Grafana or a log platform?",
      answer:
        "No. Pharos provides fleet posture, drift, backup evidence and guarded operational workflows. Detailed metrics, traces and logs can remain in specialist systems.",
    },
    {
      question: "Does Pharos run my backups?",
      answer:
        "Pharos can observe backup posture and support enrollment during onboarding. Restic has a native collector. Backup data and credentials stay in the backup system, not in Pharos.",
    },
    {
      question: "What happens when I remove a host?",
      answer:
        "Reporting access is revoked and Pharos stops managing the host. Declarative and Janus-owned records follow their own reviewed retirement path. The server and its application data are not deleted.",
    },
    {
      question: "How are people authenticated?",
      answer:
        "ZITADEL provides OIDC identity. Pharos then applies its own operator and per-host access policy. Machine authentication for beacons is separate.",
    },
    {
      question: "What is the status of managed cloud provisioning?",
      answer:
        "Authenticated Hetzner Cloud connection, SSH key, firewall, catalog and price checks are live and read-only. Managed create and cleanup execution is disabled pending attended production acceptance. netcup is a guided import path. AWS, Google Cloud and Oracle Cloud connectors are planned.",
    },
    {
      question: "Can I use Pharos without Augmentoring?",
      answer:
        "Yes. The self-hosted source and deployment templates stand on their own. Augmentoring is the clearly separated option for professional architecture, integration, rollout and operating support.",
    },
  ],
  finalCta: {
    title: "Want Pharos adapted to your operating model?",
    body:
      "Augmentoring can help design the fleet boundary, integrate existing infrastructure, deploy the control plane and establish the operational runbooks around it.",
  },
} satisfies ProductContent;
