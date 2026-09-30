// Immutable release-set manifest for one site release (INSPR-493).
//
// Doctrine (inspr-modules docs/AGENTS-VERSIONING.md, "Ordering, immutability,
// and rollback"): one version identifies one enumerated artifact set through a
// release-set manifest that records source-tree and dependency-lock provenance
// and, for every output, a unique artifact coordinate plus its digest. For
// this static site the coordinate is the file's path inside the release; no
// platform, architecture or variant dimension applies.
//
// deploy.sh writes release-set.json into web/dist after the build, verifies
// the uploaded copy on the host before sealing, records its digest in the
// host's release ledger, and verifies a build against it again before any
// rollback relinks `current` to that build.
import { createHash } from "node:crypto";
import { lstatSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { CALENDAR_SCHEME, RELEASE_CHANNEL, validateVersionBlock } from "./calendar-version.mjs";

export const RELEASE_SET_FILE = "release-set.json";
export const RELEASE_SET_SCHEMA = "inspr.site-release-set.v1";
export const SOURCE_REPOSITORY = "inspr-at/inspr-site";
export const LOCKFILE = "web/package-lock.json";

const SAFE_PATH = /^[A-Za-z0-9._@+~-]+(?:\/[A-Za-z0-9._@+~-]+)*$/;
const SHA256 = /^[a-f0-9]{64}$/;
const SOURCE = /^[a-f0-9]{40}$/;

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

export function validateReleaseSet(set) {
  const keys = ["schema", "releaseId", "deployedAt", "version", "source", "dependencyLock", "toolchain", "artifacts"];
  if (set === null || typeof set !== "object" || Object.keys(set).sort().join() !== [...keys].sort().join()) {
    fail("unexpected manifest fields");
  }
  if (set.schema !== RELEASE_SET_SCHEMA) fail(`unknown schema ${set.schema}`);
  if (typeof set.releaseId !== "string" || !/^[a-z0-9][a-z0-9._-]{0,127}$/i.test(set.releaseId) || set.releaseId === "local") {
    fail("no deployable release id");
  }
  validateVersionBlock(set.version, { deployedAt: set.deployedAt });
  if (set.source?.repository !== SOURCE_REPOSITORY || !SOURCE.test(set.source?.revision ?? "") || set.source?.dirty !== false
    || Object.keys(set.source).length !== 3) fail("source provenance must name one clean full commit");
  if (set.dependencyLock?.path !== LOCKFILE || !SHA256.test(set.dependencyLock?.sha256 ?? "")
    || Object.keys(set.dependencyLock).length !== 2) fail("dependency-lock provenance is missing");
  if (typeof set.toolchain?.node !== "string" || Object.keys(set.toolchain).length !== 1) fail("toolchain is missing");
  if (!Array.isArray(set.artifacts) || set.artifacts.length === 0) fail("no artifacts");
  let previous = "";
  for (const artifact of set.artifacts) {
    if (Object.keys(artifact ?? {}).sort().join() !== "path,sha256,size"
      || !SAFE_PATH.test(artifact.path) || artifact.path === RELEASE_SET_FILE
      || !Number.isSafeInteger(artifact.size) || artifact.size < 0 || !SHA256.test(artifact.sha256)) {
      fail(`invalid artifact ${JSON.stringify(artifact?.path)}`);
    }
    if (artifact.path <= previous) fail("artifacts must be unique and sorted");
    previous = artifact.path;
  }
  if (!set.artifacts.some((artifact) => artifact.path === "release.json")) fail("release.json is not enumerated");
  return set;
}

// Builds the manifest for a finished build in `root` (web/dist). The version,
// release id and timestamp come from its release.json; the full source commit
// and the lockfile bytes come from the deploy transaction.
export function createReleaseSet({ root, sourceRevision, lockfileBytes, node = process.version }) {
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
    artifacts: listArtifacts(root),
  });
}

export const serializeReleaseSet = (set) => `${JSON.stringify(validateReleaseSet(set), null, 2)}\n`;

// Parses what deploy.sh's remote_release_listing prints for one build
// directory on the host: the release-set bytes (base64), every non-regular
// entry, and the host's own SHA-256 of every other regular file.
export function parseRemoteListing(text) {
  let manifest = null;
  const files = new Map();
  const others = [];
  for (const line of String(text ?? "").split("\n")) {
    if (!line) continue;
    if (line.startsWith("manifest ")) {
      if (manifest !== null) fail("listing carries two manifests");
      manifest = Buffer.from(line.slice(9), "base64");
    } else if (line === "manifest-missing") {
      manifest = Buffer.alloc(0);
    } else if (line.startsWith("other ")) {
      others.push(line.slice(6));
    } else {
      const match = /^file ([a-f0-9]{64}) [ *]\.\/(.+)$/.exec(line);
      if (!match || files.has(match[2])) fail(`unreadable listing line ${JSON.stringify(line.slice(0, 80))}`);
      files.set(match[2], match[1]);
    }
  }
  if (manifest === null) fail("listing carries no manifest");
  return { manifest, files, others };
}

// Verifies one build on the host against its release set. `expectedDigest`
// must come from outside the build: the local manifest before sealing, or
// the host ledger entry recorded at sealing before a rollback.
export function verifyRemoteRelease({ listing, expectedDigest, releaseId, version }) {
  if (!SHA256.test(expectedDigest ?? "")) fail("no expected release-set digest");
  const { manifest, files, others } = parseRemoteListing(listing);
  if (manifest.length === 0) fail("the build has no release-set.json");
  if (sha256(manifest) !== expectedDigest) fail("release-set.json differs from the recorded digest");
  const set = validateReleaseSet(JSON.parse(manifest.toString("utf8")));
  if (releaseId !== undefined && set.releaseId !== releaseId) fail(`manifest names release ${set.releaseId}, not ${releaseId}`);
  if (version !== undefined && set.version.value !== version) fail(`manifest names version ${set.version.value}, not ${version}`);
  if (others.length) fail(`the build contains non-regular entries: ${others.slice(0, 3).join(", ")}`);
  const expected = new Map(set.artifacts.map((artifact) => [artifact.path, artifact.sha256]));
  for (const [path, digest] of expected) {
    if (!files.has(path)) fail(`missing artifact ${path}`);
    if (files.get(path) !== digest) fail(`artifact ${path} differs from the release set`);
  }
  for (const path of files.keys()) if (!expected.has(path)) fail(`unlisted artifact ${path}`);
  return set;
}

// The host's append-only release ledger (releases/events.tsv), one event per
// line: UTC time, event, release id, version, sequence, release-set digest.
// `sealed` records the digest once per release; later events never change it.
export const EVENTS = Object.freeze(["sealed", "promoted", "auto-rollback", "rollback"]);

export function parseEvents(text) {
  return String(text ?? "").split("\n").filter(Boolean).map((line) => {
    const fields = line.split("\t");
    const [at, event, releaseId, version, sequence, digest] = fields;
    if (fields.length !== 6 || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(at) || !EVENTS.includes(event)
      || !SHA256.test(digest)) fail(`unreadable ledger line ${JSON.stringify(line.slice(0, 80))}`);
    return { at, event, releaseId, version, sequence: Number(sequence), digest };
  });
}

// The sealed entry for one release id or calendar version, or null when the
// release predates the ledger (a legacy build).
export function sealedRelease(events, target) {
  const matches = events.filter((entry) => entry.event === "sealed" && (entry.releaseId === target || entry.version === target));
  if (matches.length > 1) fail(`the ledger seals ${target} more than once`);
  return matches[0] ?? null;
}
