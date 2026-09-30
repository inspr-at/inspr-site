// Immutable release-set manifest for one site release (INSPR-493).
//
// Doctrine (inspr-modules docs/AGENTS-VERSIONING.md, "Ordering, immutability,
// and rollback"): one version identifies one enumerated artifact set through a
// release-set manifest that records source-tree and dependency-lock provenance
// and, for every output, a unique artifact coordinate plus its digest. For
// this static site the coordinate is the file's path inside the release; no
// platform, architecture or variant dimension applies.
//
// A release is the build plus the routing configuration it is served with:
// the manifest also records the Caddyfile (routing and CSP) as the `edge`
// artifact. deploy.sh keeps a copy of it per release outside the served root
// (releases/configs/<id>/Caddyfile), so a rollback restores site and edge
// together.
//
// deploy.sh writes release-set.json into web/dist after the build, verifies
// the uploaded copy and the edge snapshot on the host before sealing, records
// its digest in the host's release ledger, and verifies a release against it
// again before it becomes a rollback target and before any rollback.
//
// Caddy serves /_astro/* from the append-only shared pool
// (releases/assets/_astro), not from the build's own _astro copy. Every
// `_astro/` artifact a release enumerates must therefore also be in the pool
// with the same bytes: verification checks both copies, and a pool asset that
// is missing can be restored from the build's verified bytes.
//
// The pre-migration release has no release set. The first calendar deploy
// records a legacy baseline for it: an external, write-once digest manifest
// (releases/baselines/<id>.json) of its files and its edge snapshot, taken
// under the deployment lock from the live, healthy release.
import { createHash } from "node:crypto";
import { lstatSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { CALENDAR_SCHEME, RELEASE_CHANNEL, validateVersionBlock } from "./calendar-version.mjs";

export const RELEASE_SET_FILE = "release-set.json";
export const RELEASE_SET_SCHEMA = "inspr.site-release-set.v1";
export const BASELINE_SCHEMA = "inspr.site-legacy-baseline.v1";
export const EDGE_PATH = "Caddyfile";
export const LEGACY_VERSION = "legacy";
export const SOURCE_REPOSITORY = "inspr-at/inspr-site";
export const LOCKFILE = "web/package-lock.json";

const SAFE_PATH = /^[A-Za-z0-9._@+~-]+(?:\/[A-Za-z0-9._@+~-]+)*$/;
const SHA256 = /^[a-f0-9]{64}$/;
const SOURCE = /^[a-f0-9]{40}$/;
const RELEASE_ID = /^[a-z0-9][a-z0-9._-]{0,127}$/i;
const CALENDAR = /^[1-9][0-9]{11}\.0\.0$/;

export const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");

function fail(message) {
  throw new Error(`release set: ${message}`);
}

// Every regular file of a release, sorted by path in byte order. Symbolic
// links, devices and unsafe names are refused: a release is plain files only.
export function listArtifacts(root) {
  const artifacts = [];
  const walk = (relative) => {
    for (const name of readdirSync(join(root, relative)).sort()) {
      const path = relative ? `${relative}/${name}` : name;
      if (!SAFE_PATH.test(path) || path.split("/").some((part) => part === "." || part === "..")) {
        fail(`unsafe artifact path ${JSON.stringify(path)}`);
      }
      const stat = lstatSync(join(root, path));
      if (stat.isDirectory()) walk(path);
      else if (stat.isFile()) {
        if (path === RELEASE_SET_FILE) continue;
        const bytes = readFileSync(join(root, path));
        artifacts.push({ path, size: bytes.length, sha256: sha256(bytes) });
      } else fail(`${path} is not a regular file`);
    }
  };
  walk("");
  return artifacts.sort((left, right) => (left.path < right.path ? -1 : left.path > right.path ? 1 : 0));
}

const sameKeys = (value, keys) => value !== null && typeof value === "object"
  && Object.keys(value).sort().join() === [...keys].sort().join();

function validateEdge(edge) {
  if (!sameKeys(edge, ["path", "size", "sha256"]) || edge.path !== EDGE_PATH
    || !Number.isSafeInteger(edge.size) || edge.size < 0 || !SHA256.test(edge.sha256)) {
    fail("the edge configuration (Caddyfile) is not recorded");
  }
}

function validateArtifactList(artifacts, keys) {
  if (!Array.isArray(artifacts) || artifacts.length === 0) fail("no artifacts");
  let previous = "";
  for (const artifact of artifacts) {
    if (!sameKeys(artifact, keys) || !SAFE_PATH.test(artifact.path) || artifact.path === RELEASE_SET_FILE
      || (keys.includes("size") && (!Number.isSafeInteger(artifact.size) || artifact.size < 0))
      || !SHA256.test(artifact.sha256)) {
      fail(`invalid artifact ${JSON.stringify(artifact?.path)}`);
    }
    if (artifact.path <= previous) fail("artifacts must be unique and sorted");
    previous = artifact.path;
  }
}

// Existing release sets are immutable history: a reader accepts the
// deprecated CalVer2 identifier in them (`history`), while a new release set
// must declare CalVer3.
export function validateReleaseSet(set, { history = false } = {}) {
  const keys = ["schema", "releaseId", "deployedAt", "version", "source", "dependencyLock", "toolchain", "edge", "artifacts"];
  if (!sameKeys(set, keys)) fail("unexpected manifest fields");
  if (set.schema !== RELEASE_SET_SCHEMA) fail(`unknown schema ${set.schema}`);
  if (typeof set.releaseId !== "string" || !RELEASE_ID.test(set.releaseId) || set.releaseId === "local") {
    fail("no deployable release id");
  }
  validateVersionBlock(set.version, { deployedAt: set.deployedAt, history });
  if (set.source?.repository !== SOURCE_REPOSITORY || !SOURCE.test(set.source?.revision ?? "") || set.source?.dirty !== false
    || Object.keys(set.source).length !== 3) fail("source provenance must name one clean full commit");
  if (set.dependencyLock?.path !== LOCKFILE || !SHA256.test(set.dependencyLock?.sha256 ?? "")
    || Object.keys(set.dependencyLock).length !== 2) fail("dependency-lock provenance is missing");
  if (typeof set.toolchain?.node !== "string" || Object.keys(set.toolchain).length !== 1) fail("toolchain is missing");
  validateEdge(set.edge);
  validateArtifactList(set.artifacts, ["path", "size", "sha256"]);
  if (!set.artifacts.some((artifact) => artifact.path === "release.json")) fail("release.json is not enumerated");
  return set;
}

// A legacy baseline names one pre-migration release, every file of it with
// the host's SHA-256, and its edge snapshot. It carries no timestamp, so the
// same live release always yields the same bytes and a retried capture is
// idempotent.
export function validateBaseline(baseline) {
  if (!sameKeys(baseline, ["schema", "releaseId", "edge", "artifacts"])) fail("unexpected baseline fields");
  if (baseline.schema !== BASELINE_SCHEMA) fail(`unknown schema ${baseline.schema}`);
  if (typeof baseline.releaseId !== "string" || !RELEASE_ID.test(baseline.releaseId) || baseline.releaseId === "local") {
    fail("no deployable release id");
  }
  validateEdge(baseline.edge);
  validateArtifactList(baseline.artifacts, ["path", "sha256"]);
  return baseline;
}

// Builds the manifest for a finished build in `root` (web/dist). The version,
// release id and timestamp come from its release.json; the full source commit
// and the lockfile bytes come from the deploy transaction.
export function createReleaseSet({ root, sourceRevision, lockfileBytes, edgeBytes, node = process.version }) {
  if (!SOURCE.test(sourceRevision ?? "")) fail("source revision must be a full 40-hex commit");
  const release = JSON.parse(readFileSync(join(root, "release.json"), "utf8"));
  if (release?.schemaVersion !== 2 || !release.version) fail("release.json carries no calendar version");
  if (release.source?.dirty !== false) fail("release.json describes a dirty source tree");
  if (!sourceRevision.startsWith(String(release.source?.git))) fail("release.json names a different source revision");
  const { scheme, value, channel, sequence, anchor } = release.version;
  if (scheme !== CALENDAR_SCHEME || channel !== RELEASE_CHANNEL) fail("release.json declares an unexpected scheme or channel");
  return validateReleaseSet({
    schema: RELEASE_SET_SCHEMA,
    releaseId: release.deployment?.releaseId,
    deployedAt: release.deployment?.deployedAt,
    version: { scheme, value, channel, sequence, anchor },
    source: { repository: SOURCE_REPOSITORY, revision: sourceRevision, dirty: false },
    dependencyLock: { path: LOCKFILE, sha256: sha256(lockfileBytes) },
    toolchain: { node },
    edge: { path: EDGE_PATH, size: edgeBytes?.length, sha256: edgeBytes ? sha256(edgeBytes) : "" },
    artifacts: listArtifacts(root),
  });
}

export const serializeReleaseSet = (set) => `${JSON.stringify(validateReleaseSet(set), null, 2)}\n`;

// Builds the baseline for a live legacy release from the host's listing of
// it (remote_release_listing without a manifest) and its edge snapshot.
export function createBaseline({ listing, releaseId }) {
  const { manifest, files, others, edge, pool } = parseRemoteListing(listing);
  if (manifest.length !== 0) fail("a release with a release set needs no legacy baseline");
  if (others.length) fail(`the release contains non-regular entries: ${others.slice(0, 3).join(", ")}`);
  if (!edge) fail("the release has no edge snapshot");
  // Nothing verifies a legacy build's bytes yet, so a pool that lacks or
  // alters one of its assets is not repaired from them: no baseline.
  for (const [path, digest] of files) {
    if (path.startsWith("_astro/") && pool.get(path) !== digest) {
      fail(`the shared asset pool ${pool.get(path) ? "alters" : "lacks"} ${path} of this release`);
    }
  }
  const artifacts = [...files].map(([path, digest]) => ({ path, sha256: digest }))
    .sort((left, right) => (left.path < right.path ? -1 : left.path > right.path ? 1 : 0));
  return validateBaseline({ schema: BASELINE_SCHEMA, releaseId, edge: { path: EDGE_PATH, ...edge }, artifacts });
}

export const serializeBaseline = (baseline) => `${JSON.stringify(validateBaseline(baseline), null, 2)}\n`;

// Parses what deploy.sh's remote_release_listing prints for one release on
// the host: the manifest bytes (base64), the edge snapshot's SHA-256 and
// size, every non-regular entry, and the host's own SHA-256 of every other
// regular file.
export function parseRemoteListing(text) {
  let manifest = null;
  let edge;
  const files = new Map();
  const pool = new Map();
  const others = [];
  for (const line of String(text ?? "").split("\n")) {
    if (!line) continue;
    if (line.startsWith("manifest ")) {
      if (manifest !== null) fail("listing carries two manifests");
      manifest = Buffer.from(line.slice(9), "base64");
    } else if (line === "manifest-missing") {
      if (manifest !== null) fail("listing carries two manifests");
      manifest = Buffer.alloc(0);
    } else if (line.startsWith("edge")) {
      const match = /^edge ([a-f0-9]{64}) (0|[1-9][0-9]*)$/.exec(line);
      if (edge !== undefined || (!match && line !== "edge-missing")) fail("listing carries an unreadable edge line");
      edge = match ? { sha256: match[1], size: Number(match[2]) } : null;
    } else if (line.startsWith("other ")) {
      others.push(line.slice(6));
    } else if (line.startsWith("pool")) {
      const match = /^pool(?: ([a-f0-9]{64})|-missing) \.\/(_astro\/.+)$/.exec(line);
      if (!match || pool.has(match[2])) fail(`unreadable listing line ${JSON.stringify(line.slice(0, 80))}`);
      pool.set(match[2], match[1] ?? null);
    } else {
      const match = /^file ([a-f0-9]{64}) [ *]\.\/(.+)$/.exec(line);
      if (!match || files.has(match[2])) fail(`unreadable listing line ${JSON.stringify(line.slice(0, 80))}`);
      files.set(match[2], match[1]);
    }
  }
  if (manifest === null) fail("listing carries no manifest");
  if (edge === undefined) fail("listing carries no edge line");
  for (const path of files.keys()) {
    if (path.startsWith("_astro/") && !pool.has(path)) fail(`listing carries no pool line for ${path}`);
  }
  return { manifest, files, others, edge, pool };
}

// Verifies one release on the host against its manifest: a calendar release
// set, or a legacy baseline. `expectedDigest` must come from outside the
// build: the local manifest before sealing, or the ledger entry recorded at
// sealing (or at the baseline capture) before promotion and rollback. The
// edge snapshot and the pool copy of every `_astro/` artifact must match the
// manifest as exactly as every file. With `reportMissingPool`, pool assets
// that are merely missing (the build's own copy verified) are returned for
// restoring instead of failing; an altered pool asset always fails.
export function verifyRelease({ listing, expectedDigest, releaseId, version, reportMissingPool = false }) {
  if (!SHA256.test(expectedDigest ?? "")) fail("no expected release-set digest");
  const { manifest, files, others, edge, pool } = parseRemoteListing(listing);
  if (manifest.length === 0) fail("the build has no release-set.json");
  if (sha256(manifest) !== expectedDigest) fail("release-set.json differs from the recorded digest");
  const parsed = JSON.parse(manifest.toString("utf8"));
  const legacy = parsed?.schema === BASELINE_SCHEMA;
  const set = legacy ? validateBaseline(parsed) : validateReleaseSet(parsed, { history: true });
  const setVersion = legacy ? LEGACY_VERSION : set.version.value;
  if (releaseId !== undefined && set.releaseId !== releaseId) fail(`manifest names release ${set.releaseId}, not ${releaseId}`);
  if (version !== undefined && setVersion !== version) fail(`manifest names version ${setVersion}, not ${version}`);
  if (others.length) fail(`the build contains non-regular entries: ${others.slice(0, 3).join(", ")}`);
  if (!edge) fail("the edge snapshot (Caddyfile) is missing");
  if (edge.sha256 !== set.edge.sha256 || edge.size !== set.edge.size) fail("the edge snapshot differs from the release set");
  const expected = new Map(set.artifacts.map((artifact) => [artifact.path, artifact.sha256]));
  for (const [path, digest] of expected) {
    if (!files.has(path)) fail(`missing artifact ${path}`);
    if (files.get(path) !== digest) fail(`artifact ${path} differs from the release set`);
  }
  for (const path of files.keys()) if (!expected.has(path)) fail(`unlisted artifact ${path}`);
  const missingPool = [];
  for (const [path, digest] of expected) {
    if (!path.startsWith("_astro/")) continue;
    const pooled = pool.get(path);
    if (pooled === null && reportMissingPool) missingPool.push({ path, sha256: digest });
    else if (pooled === null) fail(`shared asset ${path} is missing from the pool`);
    else if (pooled !== digest) fail(`shared asset ${path} in the pool differs from the release set`);
  }
  return { set, missingPool };
}

export const verifyRemoteRelease = (options) => verifyRelease(options).set;

// The host's append-only release ledger (releases/events.tsv), one event per
// line: UTC time, event, release id, version, sequence, manifest digest.
//
// Sealing is two-phase: `pending` records the digest before the upload is
// renamed into builds/, `sealed` confirms it after the rename. An interrupted
// seal therefore leaves either a harmless pending entry (the upload was
// removed; a retry of the same prepared release records the identical entry
// again) or a build whose digest is on record but which is never a rollback
// target. `baseline` records a legacy release's external manifest (version
// `legacy`, sequence 0). Entries for one release never disagree: repeated
// identical records are idempotent, conflicting ones make the ledger invalid.
export const EVENTS = Object.freeze(["pending", "sealed", "baseline", "promoted", "auto-rollback", "rollback"]);
const RECORDS = new Set(["pending", "sealed", "baseline"]);

export function parseEvents(text) {
  const events = String(text ?? "").split("\n").filter(Boolean).map((line) => {
    const fields = line.split("\t");
    const [at, event, releaseId, version, sequence, digest] = fields;
    const legacy = version === LEGACY_VERSION;
    if (fields.length !== 6 || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(at) || !EVENTS.includes(event)
      || !RELEASE_ID.test(releaseId) || !(legacy ? sequence === "0" : CALENDAR.test(version) && /^[1-9][0-9]*$/.test(sequence))
      || (RECORDS.has(event) && (event === "baseline") !== legacy)
      || !SHA256.test(digest)) fail(`unreadable ledger line ${JSON.stringify(line.slice(0, 80))}`);
    return { at, event, releaseId, version, sequence: Number(sequence), digest };
  });
  checkLedger(events);
  return events;
}

function checkLedger(events) {
  const byId = new Map();
  const byVersion = new Map();
  for (const entry of events.filter((candidate) => RECORDS.has(candidate.event))) {
    const identity = `${entry.version}\t${entry.sequence}\t${entry.digest}`;
    if ((byId.get(entry.releaseId) ?? identity) !== identity) fail(`the ledger records ${entry.releaseId} with conflicting digests`);
    byId.set(entry.releaseId, identity);
    if (entry.version === LEGACY_VERSION) continue;
    if ((byVersion.get(entry.version) ?? entry.releaseId) !== entry.releaseId) fail(`the ledger assigns ${entry.version} to two releases`);
    byVersion.set(entry.version, entry.releaseId);
  }
  for (const entry of events.filter((candidate) => !RECORDS.has(candidate.event))) {
    if (byId.get(entry.releaseId) !== `${entry.version}\t${entry.sequence}\t${entry.digest}`) {
      fail(`the ledger's ${entry.event} event for ${entry.releaseId} does not match its seal`);
    }
  }
}

// Whether the ledger stays consistent with one more record. deploy.sh checks
// every record before it appends it, so a conflicting digest or coordinate
// for a release id, or a version for a second release, is refused before it
// is written and the ledger never becomes unreadable.
export function acceptsEvent(events, { event, releaseId, version, sequence, digest }) {
  const at = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
  return parseEvents([...events.map((entry) => [entry.at, entry.event, entry.releaseId, entry.version, entry.sequence, entry.digest].join("\t")),
    [at, event, releaseId, version, sequence, digest].join("\t")].join("\n"));
}

// The confirmed entry (sealed calendar release or legacy baseline) for one
// release id or calendar version, or null when the ledger confirms none.
export function sealedRelease(events, target) {
  if (target === LEGACY_VERSION) fail("a legacy release is selected by its release id");
  checkLedger(events);
  return events.find((entry) => (entry.event === "sealed" || entry.event === "baseline")
    && (entry.releaseId === target || entry.version === target)) ?? null;
}
