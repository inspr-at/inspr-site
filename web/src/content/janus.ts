import { siteUrls } from "./urls";
import type { ProductContent } from "./types";

const repositoryUrl = "https://github.com/markus-barta/janus";
const releaseUrl =
  "https://github.com/markus-barta/janus/releases/tag/rust-engine-v0.1.6";

export const janusContent = {
  slug: "janus",
  name: "Janus",
  category: "Secret governance for human and agent systems",
  canonicalUrl: siteUrls.janus,
  repositoryUrl,
  releaseUrl,
  license: {
    name: "GNU Affero General Public License v3.0 only",
    url: siteUrls.agpl,
    note: "The Janus repository declares SPDX license AGPL-3.0-only.",
  },
  seo: {
    title: "Janus - Secret governance for AI agents, services and people | INSPR",
    description:
      "Janus lets AI agents request secret-backed work through opaque references, policy-bound permits and reviewed execution paths without exposing credentials to the model.",
  },
  hero: {
    eyebrow: "SECRET GOVERNANCE FOR HUMAN AND AGENT SYSTEMS",
    title: "Let agents request secret-backed work without handing them the secret.",
    lead:
      "Janus separates what may be used, who may request it and where it may go. Humans and AI work with opaque references and narrow, policy-bound permits. Secret values stay inside reviewed execution paths.",
    alt: "A translucent Janus gate with two profiles separating a protected credential from approved human, service and agent workflows.",
    primaryLabel: "Explore the model",
    primaryHref: "#model",
  },
  serviceIntro:
    "Augmentoring provides supported Janus architecture, rollout and operations.",
  proof: [
    "AGPL-3.0-only",
    "Released Rust engine",
    "Reference-only MCP",
    "Signed releases with SBOM and provenance",
  ],
  problem: {
    eyebrow: "THE PROBLEM",
    title: "Secret access is too broad a primitive for agents.",
    lead:
      "A service may genuinely need a deployment credential. An AI agent rarely needs to read it. Yet many integrations still hand automation a reusable token, an environment variable or a generic vault read tool.",
    items: [
      {
        title: "Access and intent collapse into one operation",
        body:
          "Once an agent can retrieve a credential, a legitimate task and an unintended destination are separated only by instructions. Prompt injection, a bad tool call or an over-scoped workload can turn useful automation into credential disclosure.",
      },
      {
        title: "Long-lived credentials outlive the job",
        body:
          "A PAT or environment variable placed directly in a workload can be reused beyond the request that justified it. The system loses the connection between purpose, actor, destination and time.",
      },
      {
        title: "Audit logs often record access, not use",
        body:
          "Knowing that a value was read does not answer which reviewed command received it, which consumer depended on it or whether the requested destination matched policy.",
      },
      {
        title: "Backend choice becomes architecture",
        body:
          "When policy is embedded in one vendor's paths, tokens and clients, changing custody systems becomes a security redesign. Janus keeps the governance contract above the backend.",
      },
    ],
  },
  model: {
    eyebrow: "THE JANUS MODEL",
    title: "Reference. Permit. Execute.",
    lead:
      "Janus turns one broad secret-read capability into three narrow and independently testable decisions.",
    steps: [
      {
        number: "01",
        title: "SecretRef",
        body:
          "An opaque reference identifies one manifest-declared secret. It contains no value, avoids exposing backend paths and grants no authority by itself.",
        meta: "Stable identifier, not a credential",
      },
      {
        number: "02",
        title: "UsePermit",
        body:
          "A short-lived permit approves one profile-bound use. It is checked against the principal, scope, executor, destination, profile, expiry, classification and lifecycle state.",
        meta: "Narrow, bound and optionally single-use",
      },
      {
        number: "03",
        title: "Approved path",
        body:
          "A reviewed command, private service handoff or future purpose-built connector receives the value internally. The requesting agent cannot choose a new sink or retrieve the literal.",
        meta: "Policy owns the execution boundary",
      },
    ],
    closing:
      "A reference is not a credential. A permit is not authority for arbitrary work. The executor checks both again before a secret value is read.",
  },
  featureSections: [
    {
      id: "capabilities",
      eyebrow: "CAPABILITIES",
      title: "Narrow by design. Useful in practice.",
      lead:
        "The released Rust engine combines reference-only discovery with policy-bound execution, lifecycle controls and a native encrypted store.",
      items: [
        {
          title: "Reference-only MCP",
          body:
            "Janus Warden exposes exactly four tools: list safe descriptors, describe a reference, request an approved use and check health. There is no reveal, set, delete, rotate or raw-resolve MCP tool.",
          meta: "list_secrets · describe_secret · request_use · health",
        },
        {
          title: "Manifest allowlist",
          body:
            "Only secrets declared in the reviewed manifest enter the broker. Model-facing responses use curated labels and opaque references instead of raw names and backend paths.",
          meta: "Default deny outside the catalog",
        },
        {
          title: "Reviewed execution",
          body:
            "Managed-command profiles own the executable, exact allowed arguments, environment binding, executor, destination, runtime limits and consumer metadata. A preflight validates the profile without a permit or secret read.",
          meta: "Policy fields do not come from the caller",
        },
        {
          title: "Private service handoff",
          body:
            "Janus can atomically render a private environment file and an optional SHA-256 sidecar for one reviewed consumer. The caller cannot supply the output path, variable name, destination or raw value.",
          meta: "Permit-bound and value-free in command output",
        },
      ],
    },
    {
      id: "lifecycle",
      eyebrow: "LIFECYCLE",
      title: "Govern the credential after the first successful use.",
      lead:
        "A safe use path is incomplete without ownership, rotation, retirement and evidence that survives the operation.",
      items: [
        {
          title: "Ownership and classification",
          body:
            "Owner, class, scope, safe label and lifecycle metadata are evaluated before normal use. Missing ownership or classification blocks approved-use paths instead of becoming an undocumented exception.",
          meta: "Normal · high-value · break-glass policy classes",
        },
        {
          title: "Explicit lifecycle",
          body:
            "Janus models draft, active, rotating, deprecated, disabled, pending-delete and destroyed states. Disabled or retired material cannot silently return to a normal use path.",
          meta: "Transitions are reasoned and audited",
        },
        {
          title: "Rotation with rollback",
          body:
            "Generated credentials can be prepared with encrypted rollback material, validated, reloaded into declared consumers and committed. Failed validation or reload restores the previous material.",
          meta: "Plan · prepare · validate · reload · commit",
        },
        {
          title: "Retirement and reconciliation",
          body:
            "Value-free tombstones preserve retirement evidence. Finalization and read-only reconciliation distinguish complete state, pending work and drift. Release v0.1.6 applies this contract to Pharos beacon credentials.",
          meta: "Provider deletion remains an explicit separate operation",
        },
      ],
    },
    {
      id: "oversight",
      eyebrow: "HUMAN OVERSIGHT",
      title: "A control room that does not need the decryption key.",
      lead:
        "The live Go envelope is a separate, metadata-only oversight plane. It gives people operational context without turning the browser into another secret-bearing surface.",
      items: [
        {
          title: "Role-gated workspace",
          body:
            "The deployed envelope uses admin, auditor, operator and viewer roles across the catalog, request, access, ledger, assurance and settings surfaces.",
          meta: "Zitadel OIDC with explicit role bindings",
        },
        {
          title: "Value-free evidence",
          body:
            "Descriptors, action receipts, posture views and audit rows omit secret values. Sensitive operations are blocked when readiness or local audit storage is degraded.",
          meta: "Every public outcome states value_returned: false",
        },
        {
          title: "Hash-linked local ledger",
          body:
            "Audit entries include request correlation, severity and previous-event linkage. The envelope verifies the local chain and exposes redacted evidence to the auditor role.",
          meta: "Evidence, not raw debug output",
        },
        {
          title: "No reveal path today",
          body:
            "The live web container has no decryption identity and cannot reveal a secret. Human reveal remains deliberately deferred until it can be implemented without inverting that trust boundary.",
          meta: "Current oversight is metadata-only",
        },
      ],
    },
  ],
  audiences: {
    eyebrow: "REAL WORKFLOWS",
    title: "What Janus is built to mediate",
    lead:
      "The strongest Janus use cases are concrete, repeatable workflows where the caller needs an outcome, not possession of a credential.",
    items: [
      {
        title: "Run a fixed deployment",
        body:
          "An agent requests a named deployment profile. Janus validates the permit and exact arguments, injects the credential only inside the reviewed executor and returns a scrubbed outcome.",
        meta: "For platform and release teams",
      },
      {
        title: "Provision a service",
        body:
          "An operator preflights a service handoff, issues an approval and a single-use permit, then renders a private environment file at the profile-owned path.",
        meta: "For service and infrastructure owners",
      },
      {
        title: "Rotate a generated credential",
        body:
          "Janus prepares encrypted rollback material, writes the replacement, runs declared validation, reloads known consumers and commits only after the workflow succeeds.",
        meta: "For security-sensitive operations",
      },
      {
        title: "Retire a machine credential",
        body:
          "A host-specific credential moves through disablement and destruction evidence while generated outputs are removed and reconciliation reports incomplete or drifting state.",
        meta: "Implemented for Pharos beacons in v0.1.6",
      },
    ],
  },
  architecture: {
    eyebrow: "ARCHITECTURE",
    title: "One policy model, two deliberately separated planes.",
    lead:
      "The Rust engine handles references, policy, permits, storage, execution, rotation and lifecycle. The Go envelope is the live human oversight layer.",
    paragraphs: [
      "AI clients reach Janus through Warden over MCP stdio. Warden returns model-safe descriptors and can request a permit, but it never returns a secret literal and never accepts a caller-selected destination, executor or lifetime.",
      "Janusd consumes reviewed profiles and locally handed-off permits for managed commands, private environment files, approvals, rotation and lifecycle operations. The value crosses only into the approved executor or service artifact.",
      "The public oversight plane stays separate from secret handling. It can explain catalog posture, access, requests and evidence without receiving the age identity required to decrypt stored material.",
    ],
    flow: [
      "Agent or operator intent",
      "Opaque SecretRef",
      "Principal, scope and lifecycle checks",
      "Reviewed profile and approval",
      "Short-lived UsePermit",
      "Approved executor",
      "Encrypted backend or service consumer",
      "Value-free outcome and evidence",
    ],
    facts: [
      "The live Go envelope is metadata-only and does not execute with secret values.",
      "The released Rust engine provides the MCP, age, approval, execution, rotation and lifecycle slices.",
      "MCP transport is local stdio today. HTTP and multi-tenant Warden operation are not shipped.",
      "The architecture complements custody systems rather than rebuilding dynamic secrets, PKI or leasing.",
    ],
  },
  trust: {
    eyebrow: "TRUST MODEL",
    title: "Security expressed as boundaries that can be tested.",
    lead:
      "Janus avoids relying on a prompt to protect a secret. The control sits in types, reviewed configuration, execution bindings and negative-path tests.",
    items: [
      {
        title: "No secret value through MCP",
        body:
          "Warden returns curated metadata and opaque identifiers. Its smoke and test fixtures assert that model-facing output contains neither fixture literals nor raw secret names.",
      },
      {
        title: "The caller does not define policy",
        body:
          "Destination, executor, egress mode, executable, allowed arguments and TTL come from reviewed profiles. Unknown, disabled, mismatched or incomplete profiles fail closed.",
      },
      {
        title: "Permits are narrow",
        body:
          "Permits are short-lived, can be single-use and are bound to the principal chain, scope, secret, profile, executor and destination. Execution re-checks those bindings before reading a value.",
      },
      {
        title: "Private local handoff",
        body:
          "Permit, approval, lifecycle, tombstone and rendered service files use private paths, reject unsafe identifiers and use atomic replacement where the contract requires it.",
      },
      {
        title: "Recoverable age custody",
        body:
          "The native age backend supports multiple recipients, private atomic writes, recoverability checks, recipient changes and full-store re-encryption without returning plaintext in administrative outcomes.",
      },
      {
        title: "Release evidence",
        body:
          "Engine and envelope images are keyless-signed, accompanied by SPDX SBOMs and published with build-provenance attestations. Release CI smokes the exact published engine digest.",
      },
    ],
  },
  integrations: {
    eyebrow: "INTEGRATIONS",
    title: "Consolidate the interface, not the storage vendor.",
    lead:
      "The manifest, references, policy, permits and evidence stay stable while custody and consumers can vary by deployment. Status labels distinguish implemented paths from roadmap intent.",
    items: [
      {
        name: "age",
        status: "Released",
        description:
          "Native encrypted storage with multiple recipients, atomic private writes, recoverability checks, re-encryption and generated-rotation rollback.",
      },
      {
        name: "secretspec",
        status: "Released",
        description:
          "A reviewed manifest acts as the allowlist, with a wrapped adapter keeping backend-specific types outside the Janus core contract.",
      },
      {
        name: "Model Context Protocol",
        status: "Released",
        description:
          "A local stdio Warden implemented with rmcp exposes model-safe discovery and permit requests without a raw value operation.",
      },
      {
        name: "Nix and NixOS",
        status: "Released",
        description:
          "The public flake packages janusd and janus-warden. Signed multi-architecture container images are published through the same assurance gate.",
      },
      {
        name: "Zitadel OIDC",
        status: "Live in oversight plane",
        description:
          "The deployed Go envelope uses OIDC, nonce, PKCE and explicit role bindings for human access. Broader invited-user automation is still being hardened.",
      },
      {
        name: "Pharos",
        status: "Released in v0.1.6",
        description:
          "A concrete credential-retirement contract handles one Pharos beacon credential with durable lifecycle state, value-free evidence and reconciliation.",
      },
      {
        name: "OpenBao and centralized custody",
        status: "Planned",
        description:
          "Centralized leases, dynamic secrets and hardware-backed custody belong behind the Janus broker boundary, but a general OpenBao integration is not shipped.",
      },
      {
        name: "GitHub App workflow dispatch",
        status: "Planned",
        description:
          "A purpose-built connector is designed to mint short-lived installation access and dispatch one reviewed workflow without placing a reusable PAT in the workload.",
      },
    ],
  },
  limits: {
    eyebrow: "CURRENT STATUS",
    title: "Useful now, explicit about what comes next.",
    lead:
      "Janus is an early product with deployed and released components. It is not presented as a finished general-purpose enterprise secrets platform.",
    items: [
      "The live Go web envelope is an oversight plane. It brokers no secret values and is not yet converged with the Rust engine.",
      "The current web interface cannot reveal secrets. Human reveal remains deferred because the web container intentionally has no decryption identity.",
      "The released Warden uses local MCP stdio. HTTP transport and multi-tenant remote operation are not shipped.",
      "Native age storage and the secretspec adapter are implemented. General OpenBao, OS keyring, Pass, KMS and HSM integrations remain planned or deployment-specific.",
      "The live envelope has four roles: admin, auditor, operator and viewer. The broader separation-of-duties model in the design is not fully implemented.",
      "The engine provides local value-free audit contracts and durable local registries, but remote append-only audit and SIEM export are not shipped.",
      "Janus is not a human password manager and does not provide browser autofill, mobile clients or password synchronization.",
      "Production adoption should start with explicit workflows, a reviewed threat model, recovery evidence and named operational ownership.",
    ],
  },
  openSource: {
    eyebrow: "OPEN SOURCE",
    title: "Inspectable, self-hostable and backed by release evidence.",
    body:
      "Janus is public under the GNU Affero General Public License v3.0 only. The source, tests, release workflows, image signatures, SPDX SBOMs and build-provenance attestations are available for review. The current public engine release is v0.1.6.",
    links: [
      {
        label: "GitHub repository",
        href: repositoryUrl,
        external: true,
      },
      {
        label: "Rust engine v0.1.6",
        href: releaseUrl,
        external: true,
      },
      {
        label: "GNU AGPL v3.0",
        href: siteUrls.agpl,
        external: true,
      },
    ],
  },
  faq: [
    {
      question: "Does Janus replace Vault or OpenBao?",
      answer:
        "No. Vault-class products are secret engines and custody systems. Janus is the policy, approved-use and oversight boundary above a backend. A future OpenBao integration should preserve the same agent-facing rules rather than expose a general vault read path.",
    },
    {
      question: "Can an AI agent read a secret through Janus?",
      answer:
        "Not through Warden. The MCP surface has no reveal or raw-resolve operation. An approved executor may use a value internally for a reviewed task, but the model receives only safe metadata, an opaque reference, permit status and a value-free outcome.",
    },
    {
      question: "Can existing services still receive environment variables?",
      answer:
        "Yes. Janus supports a permit-bound environment-file handoff where the reviewed profile owns the destination path and variable name. The file is private, written atomically and omitted from command output and audit evidence.",
    },
    {
      question: "Can the web interface reveal secrets?",
      answer:
        "Not today. The live oversight envelope intentionally has no decryption identity. Human reveal remains deferred until it can be implemented without weakening that boundary.",
    },
    {
      question: "Which storage backends are ready?",
      answer:
        "Native age storage and a wrapped secretspec adapter are implemented. General OpenBao, OS keyring, Pass, KMS and HSM integrations remain planned or deployment-specific.",
    },
    {
      question: "How does Janus handle rotation?",
      answer:
        "For internally generated credentials with declared consumers, Janus can prepare encrypted rollback material, write a replacement, validate it, reload consumers and commit only after success. External credentials that Janus cannot mint or validate remain manual rather than being presented as one-click safe.",
    },
    {
      question: "Is Janus production-ready?",
      answer:
        "The oversight envelope is deployed, and the Rust engine has signed releases with working MCP, storage, execution and lifecycle slices. Janus is still early. A production rollout should be scoped to explicit workflows, identity, custody, recovery and accountable operations.",
    },
    {
      question: "How is Janus licensed?",
      answer:
        "The repository declares AGPL-3.0-only. You can inspect, self-host and modify the software under the terms of the GNU Affero General Public License v3.0.",
    },
  ],
  finalCta: {
    title: "Build the boundary around your real workflows.",
    body:
      "Augmentoring can map secret consumers, define approved-use profiles, integrate identity and custody, deploy Janus and operate the resulting system with your team.",
  },
} satisfies ProductContent;
