// Release sets, the deployment lock and verified rollback (INSPR-493).
// The deploy tests run the real deploy.sh against tests/support/fake-host.mjs,
// whose fault injection covers every failure window of the transaction.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, readlinkSync } from "node:fs";
import { appendFile, chmod, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import {
  BASELINE_SCHEMA,
  LOCKFILE,
  RELEASE_SET_SCHEMA,
  createBaseline,
  createReleaseSet,
  parseEvents,
  sealedRelease,
  serializeBaseline,
  serializeReleaseSet,
  sha256,
  verifyRemoteRelease,
} from "../release-set.mjs";
import { FIXTURE_REVISION, createCheckout, createHost, seedBuild } from "./support/fake-host.mjs";

const repositoryRoot = fileURLToPath(new URL("../../", import.meta.url));
const deploySource = readFileSync(join(repositoryRoot, "deploy.sh"), "utf8");

const cleanups = [];
test.after(async () => {
  for (const path of cleanups) await rm(path, { recursive: true, force: true });
});
async function fixture(options) {
  const host = await createHost();
  const checkout = await createCheckout(host, options);
  cleanups.push(host.root, checkout.root);
  return { host, checkout };
}

const current = (host) => readlinkSync(join(host.releases, "current"));
const events = (host) => parseEvents(readFileSync(join(host.releases, "events.tsv"), "utf8"));
const builds = (host) => readdirSync(join(host.releases, "builds")).sort();
const liveCaddyfile = (host) => readFileSync(join(host.dir, "Caddyfile"), "utf8");
const lockHeld = (host) => existsSync(join(host.releases, ".deploy.lock"));
const ok = (result, label) => assert.equal(result.status, 0, `${label}\n${result.stderr}\n${result.stdout}`);
const failed = (result, pattern, label) => {
  assert.equal(result.status, 1, `${label} must fail\n${result.stderr}\n${result.stdout}`);
  assert.match(result.stderr, pattern, label);
  assert.doesNotMatch(result.stdout, /deployment complete|rolled back to/, `${label} must not report success`);
};
const waitFor = async (path) => {
  for (let waited = 0; !existsSync(path); waited += 1) {
    assert.ok(waited < 300, `${path} never appeared`);
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
};

// Runs deploy.sh's own remote_release_listing function against a local
// directory, so the listing format is tested exactly as the host prints it.
function listing(directory, manifest, edge) {
  const definition = /^remote_release_listing\(\) \{\n[\s\S]*?\n\}\n/m.exec(deploySource)[0];
  const script = `set -euo pipefail
remote_ssh() { printf '%s\\n' "$1" | bash -se; }
${definition}
remote_release_listing "$1" "$2" "$3"`;
  const result = spawnSync("/bin/bash", ["-c", script, "listing", directory, manifest, edge], { encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
  return result.stdout;
}

const release = {
  schemaVersion: 2,
  package: { name: "web", version: "0.0.1" },
  source: { git: FIXTURE_REVISION.slice(0, 12), dirty: false },
  deployment: { releaseId: "20260930T154712Z-0123456789ab", deployedAt: "2026-09-30T15:47:12Z" },
  version: {
    scheme: "inspr-calver-3",
    value: "260930154712.0.0",
    channel: "stable",
    sequence: 1,
    anchor: { legacyScheme: "legacy", lastLegacyVersion: null, firstCalendarVersion: "260930154712.0.0", firstCalendarSequence: 1 },
  },
};

test("a release set enumerates every artifact with source and lockfile provenance", async () => {
  const root = await mkdtemp(join(tmpdir(), "inspr-release-set-"));
  cleanups.push(root);
  await mkdir(join(root, "_astro"), { recursive: true });
  await writeFile(join(root, "index.html"), "<p>home</p>\n");
  await writeFile(join(root, "_astro", "site.css"), "body{}\n");
  await writeFile(join(root, "release.json"), JSON.stringify(release));
  const lockfileBytes = Buffer.from('{"lockfileVersion":3}\n');
  const edgeBytes = Buffer.from(":80 {}\n");
  const set = createReleaseSet({ root, sourceRevision: FIXTURE_REVISION, lockfileBytes, edgeBytes, node: "v24.0.0" });
  assert.equal(set.schema, RELEASE_SET_SCHEMA);
  assert.deepEqual(set.edge, { path: "Caddyfile", size: edgeBytes.length, sha256: sha256(edgeBytes) });
  assert.throws(() => createReleaseSet({ root, sourceRevision: FIXTURE_REVISION, lockfileBytes }), /edge configuration \(Caddyfile\) is not recorded/);
  assert.equal(set.releaseId, release.deployment.releaseId);
  assert.deepEqual(set.version, release.version);
  assert.deepEqual(set.source, { repository: "inspr-at/inspr-site", revision: FIXTURE_REVISION, dirty: false });
  assert.deepEqual(set.dependencyLock, { path: LOCKFILE, sha256: sha256(lockfileBytes) });
  assert.deepEqual(set.artifacts.map((artifact) => artifact.path), ["_astro/site.css", "index.html", "release.json"]);
  assert.equal(set.artifacts[1].sha256, sha256("<p>home</p>\n"));
  assert.equal(set.artifacts[1].size, 12);

  assert.throws(() => createReleaseSet({ root, sourceRevision: "f".repeat(40), lockfileBytes, edgeBytes }), /different source revision/);
  assert.throws(() => createReleaseSet({ root, sourceRevision: "0123456789ab", lockfileBytes, edgeBytes }), /full 40-hex commit/);
  await writeFile(join(root, "release.json"), JSON.stringify({ ...release, version: null }));
  assert.throws(() => createReleaseSet({ root, sourceRevision: FIXTURE_REVISION, lockfileBytes, edgeBytes }), /no calendar version/);
  await writeFile(join(root, "release.json"), JSON.stringify(release));
  await symlink("index.html", join(root, "link.html"));
  assert.throws(() => createReleaseSet({ root, sourceRevision: FIXTURE_REVISION, lockfileBytes, edgeBytes }), /not a regular file/);
});

test("the host listing verifies a build and its Caddyfile exactly against its release set", async () => {
  const root = await mkdtemp(join(tmpdir(), "inspr-release-listing-"));
  cleanups.push(root);
  const build = join(root, "build");
  const edge = join(root, "configs", "Caddyfile");
  await mkdir(join(build, "de"), { recursive: true });
  await mkdir(join(root, "configs"), { recursive: true });
  await writeFile(join(build, "index.html"), "home\n");
  await writeFile(join(build, "de", "index.html"), "start\n");
  await writeFile(join(build, "release.json"), JSON.stringify(release));
  await writeFile(edge, ":80 {}\n");
  const bytes = Buffer.from(serializeReleaseSet(createReleaseSet({
    root: build, sourceRevision: FIXTURE_REVISION, lockfileBytes: Buffer.from("{}"), edgeBytes: Buffer.from(":80 {}\n"),
  })));
  await writeFile(join(build, "release-set.json"), bytes);
  const digest = sha256(bytes);
  const manifest = join(build, "release-set.json");
  const hostListing = () => listing(build, manifest, edge);
  const verify = () => verifyRemoteRelease({ listing: hostListing(), expectedDigest: digest, releaseId: release.deployment.releaseId, version: "260930154712.0.0" });
  assert.equal(verify().artifacts.length, 3);

  assert.throws(() => verifyRemoteRelease({ listing: hostListing(), expectedDigest: "0".repeat(64) }), /differs from the recorded digest/);
  assert.throws(() => verifyRemoteRelease({ listing: hostListing(), expectedDigest: digest, version: "260930154713.0.0" }), /not 260930154713/);

  // The Caddyfile snapshot is part of the release.
  await appendFile(edge, "# drift\n");
  assert.throws(verify, /edge snapshot differs from the release set/);
  await rm(edge);
  assert.throws(verify, /edge snapshot \(Caddyfile\) is missing/);
  await writeFile(edge, ":80 {}\n");

  await appendFile(join(build, "de", "index.html"), "x");
  assert.throws(verify, /artifact de\/index\.html differs/);
  await writeFile(join(build, "de", "index.html"), "start\n");
  await writeFile(join(build, "extra.html"), "extra\n");
  assert.throws(verify, /unlisted artifact extra\.html/);
  await rm(join(build, "extra.html"));
  await rm(join(build, "index.html"));
  assert.throws(verify, /missing artifact index\.html/);
  await writeFile(join(build, "index.html"), "home\n");
  await symlink("/etc/hosts", join(build, "hosts"));
  assert.throws(verify, /non-regular entries/);
  await rm(join(build, "hosts"));
  await rm(join(build, "release-set.json"));
  assert.throws(verify, /no release-set\.json/);
});

test("the ledger seals in two phases and never disagrees about a release", () => {
  const digest = "a".repeat(64);
  const id = "20260930T154712Z-0123456789ab";
  const line = (event, releaseId = id, version = "260930154712.0.0", sequence = 1, sha = digest) =>
    `2026-09-30T15:47:13Z\t${event}\t${releaseId}\t${version}\t${sequence}\t${sha}`;
  const ledger = parseEvents([line("pending"), line("sealed"), line("promoted")].join("\n"));
  assert.equal(sealedRelease(ledger, "260930154712.0.0").releaseId, id);
  assert.equal(sealedRelease(ledger, id).digest, digest);
  assert.equal(sealedRelease(ledger, "20260930T144629Z-095391814e7b"), null);

  // Only `sealed` confirms: an interrupted seal leaves a pending entry that
  // selects nothing, and an identical retry is idempotent.
  assert.equal(sealedRelease(parseEvents(line("pending")), id), null);
  assert.equal(sealedRelease(parseEvents([line("pending"), line("pending"), line("sealed")].join("\n")), id).digest, digest);

  // Conflicting records for one release, or one version for two releases.
  assert.throws(() => parseEvents([line("pending"), line("sealed", id, "260930154712.0.0", 1, "b".repeat(64))].join("\n")), /conflicting digests/);
  assert.throws(() => parseEvents([line("sealed"), line("sealed", "20260930T154713Z-0123456789ab")].join("\n")), /assigns 260930154712\.0\.0 to two releases/);
  assert.throws(() => parseEvents([line("sealed"), line("promoted", id, "260930154712.0.0", 1, "b".repeat(64))].join("\n")), /does not match its seal/);

  // A legacy baseline is confirmed under its release id only.
  const legacyId = "20260930T144629Z-095391814e7b";
  const legacy = parseEvents([line("baseline", legacyId, "legacy", 0), line("auto-rollback", legacyId, "legacy", 0)].join("\n"));
  assert.equal(sealedRelease(legacy, legacyId).event, "baseline");
  assert.throws(() => sealedRelease(legacy, "legacy"), /selected by its release id/);
  assert.throws(() => parseEvents(line("sealed", legacyId, "legacy", 0)), /unreadable ledger line/);
  assert.throws(() => parseEvents(line("baseline", legacyId, "260930154712.0.0", 1)), /unreadable ledger line/);
  assert.throws(() => parseEvents("2026-09-30T15:47:13Z\tsealed\tx\ty\t1\tnot-a-digest"), /unreadable ledger line/);
});

test("a legacy baseline records a pre-migration release and its Caddyfile deterministically", async () => {
  const root = await mkdtemp(join(tmpdir(), "inspr-baseline-"));
  cleanups.push(root);
  const build = join(root, "build");
  const edge = join(root, "Caddyfile");
  await mkdir(join(build, "de"), { recursive: true });
  await writeFile(join(build, "index.html"), "legacy home\n");
  await writeFile(join(build, "de", "index.html"), "legacy start\n");
  await writeFile(edge, "legacy edge\n");
  const id = "20260930T144629Z-095391814e7b";
  const baseline = createBaseline({ listing: listing(build, "", edge), releaseId: id });
  assert.equal(baseline.schema, BASELINE_SCHEMA);
  assert.deepEqual(baseline.artifacts.map((artifact) => artifact.path), ["de/index.html", "index.html"]);
  assert.equal(baseline.edge.sha256, sha256("legacy edge\n"));
  const bytes = serializeBaseline(baseline);
  assert.equal(serializeBaseline(createBaseline({ listing: listing(build, "", edge), releaseId: id })), bytes, "a retried capture is identical");

  const manifest = join(root, "baseline.json");
  await writeFile(manifest, bytes);
  const verify = () => verifyRemoteRelease({ listing: listing(build, manifest, edge), expectedDigest: sha256(bytes), releaseId: id, version: "legacy" });
  assert.equal(verify().artifacts.length, 2);
  // Nothing in a legacy build is exempt, not even a stray release-set.json.
  await writeFile(join(build, "release-set.json"), "{}\n");
  assert.throws(verify, /unlisted artifact release-set\.json/);
  await rm(join(build, "release-set.json"));
  await appendFile(join(build, "index.html"), "altered\n");
  assert.throws(verify, /artifact index\.html differs/);
  assert.throws(() => createBaseline({ listing: listing(build, "", join(root, "missing")), releaseId: id }), /no edge snapshot/);
});

test("deploy.sh seals a verified release set with its Caddyfile and records it in the ledger", async () => {
  const { host, checkout } = await fixture();
  ok(checkout.run(), "deploy");
  const { deployment, version } = await checkout.release();
  const target = `builds/${deployment.releaseId}`;
  assert.equal(current(host), target);
  const set = JSON.parse(readFileSync(join(host.releases, target, "release-set.json"), "utf8"));
  assert.equal(set.version.value, version.value);
  assert.equal(set.source.revision, FIXTURE_REVISION);
  assert.ok(set.artifacts.some((artifact) => artifact.path === "paimos/index.html"));
  // The Caddyfile it is served with is recorded and kept outside the build.
  const snapshot = readFileSync(join(host.releases, "configs", deployment.releaseId, "Caddyfile"));
  assert.equal(set.edge.sha256, sha256(snapshot));
  assert.equal(sha256(snapshot), sha256(liveCaddyfile(host)));
  assert.equal(existsSync(join(host.releases, target, "Caddyfile")), false, "the Caddyfile is never served");
  const sealed = sealedRelease(events(host), version.value);
  assert.equal(sealed.digest, sha256(readFileSync(join(host.releases, target, "release-set.json"))));
  assert.deepEqual(events(host).map((entry) => entry.event), ["pending", "sealed", "promoted"]);
  assert.equal(lockHeld(host), false);
});

test("an upload altered on the host before sealing is refused", async () => {
  const { host, checkout } = await fixture();
  const result = checkout.run({ FAKE_TAMPER_INCOMING: "index.html" });
  failed(result, /does not match its release set/, "tampered upload");
  assert.deepEqual(builds(host), []);
  assert.equal(existsSync(join(host.releases, "events.tsv")), false);
  assert.equal(readdirSync(host.releases).some((name) => name.startsWith(".incoming-")), false);
  assert.equal(readdirSync(join(host.releases, "configs")).length, 0);
  assert.equal(lockHeld(host), false);
});

test("overlapping deployments serialize on the host lock", async () => {
  const { host, checkout: first } = await fixture();
  const second = await createCheckout(host);
  cleanups.push(second.root);
  const gate = join(host.root, "gate");

  // The first run holds the lock inside its upload until the gate opens.
  const running = first.start({ FAKE_RSYNC_GATE: gate });
  await waitFor(`${gate}.waiting`);
  const blocked = second.run();
  failed(blocked, /another deployment holds .*\.deploy\.lock \(.*:.*\)/, "concurrent deployment");
  assert.doesNotMatch(blocked.stdout, /uploading immutable release/);
  assert.ok(lockHeld(host), "the refused run leaves the holder's lock alone");

  await writeFile(gate, "");
  ok(await running, "first deployment");
  assert.equal(lockHeld(host), false);

  // The refused build reserved against the same history: it is stale now.
  failed(second.run({ SKIP_BUILD: "1" }), /is not the channel's next release/, "stale build");

  ok(second.run(), "fresh second deployment");
  const sealed = events(host).filter((entry) => entry.event === "sealed");
  assert.deepEqual(sealed.map((entry) => entry.sequence), [1, 2]);
  assert.equal(new Set(sealed.map((entry) => entry.version)).size, 2);
  assert.equal(builds(host).length, 2);
});

test("a lock left behind is reported, never broken", async () => {
  const { host, checkout } = await fixture();
  await mkdir(join(host.releases, ".deploy.lock"));
  await writeFile(join(host.releases, ".deploy.lock", "owner"), "ghost:4242:20260930T000000Z-aaaaaaaaaaaa:20260930T000000Z\n");
  failed(checkout.run(), /another deployment holds .*ghost:4242.*remove that directory by hand/, "stale lock");
  assert.equal(readFileSync(join(host.releases, ".deploy.lock", "owner"), "utf8").trim(), "ghost:4242:20260930T000000Z-aaaaaaaaaaaa:20260930T000000Z");
  assert.deepEqual(builds(host), []);
});

test("a lock this run cannot release fails the run, and the release stays live", async () => {
  // Unreachable host at release time.
  {
    const { host, checkout } = await fixture();
    const result = checkout.run({ FAKE_SSH_FAIL: "*rmdir -- *" });
    failed(result, /is live, but the deployment lock was not released/, "SSH failure");
    assert.equal(current(host), `builds/${(await checkout.release()).deployment.releaseId}`);
    assert.equal(events(host).at(-1).event, "promoted");
    assert.ok(lockHeld(host));
  }
  // Another owner, or a lock directory that is not empty, at release time.
  for (const [label, tamper] of [
    ["owner mismatch", (lock) => writeFile(join(lock, "owner"), "ghost:4242:x:y\n")],
    ["rmdir failure", (lock) => writeFile(join(lock, "stray"), "")],
  ]) {
    const { host, checkout } = await fixture();
    const gate = join(host.root, "gate");
    const running = checkout.start({ FAKE_RSYNC_GATE: gate });
    await waitFor(`${gate}.waiting`);
    await tamper(join(host.releases, ".deploy.lock"));
    await writeFile(gate, "");
    const result = await running;
    failed(result, /deployment lock .* was not released/, label);
    assert.equal(events(host).at(-1).event, "promoted", `${label}: the probed release is not rolled back`);
    assert.ok(lockHeld(host), `${label}: the lock is left for the operator`);
  }
  // The rollback path fails the same way.
  const { host, checkout } = await fixture();
  ok(checkout.run(), "first deployment");
  const first = await checkout.release();
  ok(checkout.run(), "second deployment");
  failed(checkout.run({ ROLLBACK_TO: first.version.value, FAKE_SSH_FAIL: "*rmdir -- *" }), /rolled back to .*, but the deployment lock was not released/, "rollback lock");
  assert.equal(current(host), `builds/${first.deployment.releaseId}`);
});

test("a failed promotion restores the verified previous release and its Caddyfile", async () => {
  const { host, checkout } = await fixture();
  ok(checkout.run(), "first deployment");
  const first = `builds/${(await checkout.release()).deployment.releaseId}`;
  const firstCaddyfile = liveCaddyfile(host);

  // The candidate also changes the Caddyfile; both are restored.
  await writeFile(join(checkout.root, "Caddyfile"), "candidate caddy configuration\n");
  const result = checkout.run({ FAKE_CONTAINER_UNHEALTHY: "1", FAKE_HEALTHY_CURRENT: first });
  failed(result, /restored builds\/.* and its Caddyfile \(release set verified\)/, "unhealthy candidate");
  assert.doesNotMatch(result.stderr, /restored release failed the internal container check/);
  assert.equal(current(host), first);
  assert.equal(liveCaddyfile(host), firstCaddyfile);
  const rollback = events(host).at(-1);
  assert.equal(rollback.event, "auto-rollback");
  assert.equal(`builds/${rollback.releaseId}`, first);
  assert.equal(lockHeld(host), false);
});

test("a live release that is no exact rollback target stops the deploy before any change", async () => {
  const { host, checkout } = await fixture();
  ok(checkout.run(), "first deployment");
  const first = `builds/${(await checkout.release()).deployment.releaseId}`;
  const sealedBefore = events(host).length;

  // An altered live build: nothing is uploaded, sealed or switched.
  await appendFile(join(host.releases, first, "index.html"), "altered\n");
  const altered = checkout.run();
  failed(altered, /the live release .* does not match its recorded digest; it is not a verified rollback target, so nothing was changed/, "altered live build");
  assert.doesNotMatch(altered.stdout, /uploading immutable release/);
  assert.equal(current(host), first);
  assert.equal(builds(host).length, 1);
  assert.equal(events(host).length, sealedBefore);
  assert.doesNotMatch(readFileSync(checkout.transportLog, "utf8"), /docker\trestart/);
  assert.equal(lockHeld(host), false);

  // A hand-edited live Caddyfile: the release cannot be restored exactly.
  const { host: drifted, checkout: second } = await fixture();
  ok(second.run(), "first deployment");
  await appendFile(join(drifted.dir, "Caddyfile"), "# edited by hand\n");
  failed(second.run(), /the live Caddyfile differs from the one recorded for .*nothing was changed/, "edge drift");
  assert.equal(builds(drifted).length, 1);
});

test("the rollback re-verifies the previous release and never relinks an altered one", async () => {
  // Defense in depth: the previous release is altered after the pre-check,
  // while the candidate is live. It is not relinked.
  const { host, checkout } = await fixture();
  ok(checkout.run(), "first deployment");
  const first = `builds/${(await checkout.release()).deployment.releaseId}`;
  const result = checkout.run({ FAKE_CONTAINER_UNHEALTHY: "1", FAKE_DOCKER_TAMPER: join(host.releases, first, "index.html") });
  failed(result, /does not match its recorded digest; current was NOT relinked/, "altered during the deploy");
  assert.notEqual(current(host), first);
});

test("the first calendar deployment records a legacy baseline and can return to it exactly", async () => {
  const { host, checkout } = await fixture();
  const legacyId = "20260930T144629Z-095391814e7b";
  await seedBuild(host, legacyId, {
    schemaVersion: 1,
    package: { name: "web", version: "0.0.1" },
    source: { git: "095391814e7b", dirty: false },
    deployment: { releaseId: legacyId, deployedAt: "2026-09-30T14:46:29Z" },
  });
  await symlink(`builds/${legacyId}`, join(host.releases, "current"));
  await writeFile(join(host.dir, "Caddyfile"), "legacy caddy configuration\n");
  const legacy = `builds/${legacyId}`;

  // A failed first calendar deploy restores the legacy release and Caddyfile,
  // verified against the baseline recorded before anything changed.
  const failedFirst = checkout.run({ FAKE_CONTAINER_UNHEALTHY: "1", FAKE_HEALTHY_CURRENT: legacy });
  failed(failedFirst, /restored builds\/20260930T144629Z-095391814e7b and its Caddyfile \(release set verified\)/, "failed first calendar deploy");
  assert.equal(current(host), legacy);
  assert.equal(liveCaddyfile(host), "legacy caddy configuration\n");
  const baselineBytes = readFileSync(join(host.releases, "baselines", `${legacyId}.json`));
  const baseline = events(host).find((entry) => entry.event === "baseline");
  assert.deepEqual([baseline.releaseId, baseline.version, baseline.sequence, baseline.digest], [legacyId, "legacy", 0, sha256(baselineBytes)]);
  assert.equal(readFileSync(join(host.releases, "configs", legacyId, "Caddyfile"), "utf8"), "legacy caddy configuration\n");

  // The baseline is captured once; the next deploy verifies against it.
  ok(checkout.run(), "first calendar deployment");
  assert.equal(events(host).filter((entry) => entry.event === "baseline").length, 1);
  assert.equal(liveCaddyfile(host), "fixture caddy configuration\n");

  // Back to the legacy release by its id, site and Caddyfile together.
  ok(checkout.run({ ROLLBACK_TO: legacyId }), "rollback to legacy");
  assert.equal(current(host), legacy);
  assert.equal(liveCaddyfile(host), "legacy caddy configuration\n");
  const rollback = events(host).at(-1);
  assert.deepEqual([rollback.event, rollback.releaseId, rollback.version], ["rollback", legacyId, "legacy"]);

  // An altered legacy build is no longer a rollback target.
  ok(checkout.run(), "second calendar deployment");
  await appendFile(join(host.releases, legacy, "index.html"), "altered\n");
  failed(checkout.run({ ROLLBACK_TO: legacyId }), /does not match its sealed release set; refusing to roll back/, "altered legacy build");
});

test("ROLLBACK_TO returns production to one exact verified release and its Caddyfile", async () => {
  const { host, checkout } = await fixture();
  ok(checkout.run(), "first deployment");
  const first = await checkout.release();
  await writeFile(join(checkout.root, "Caddyfile"), "second caddy configuration\n");
  ok(checkout.run(), "second deployment");
  const second = await checkout.release();
  assert.equal(liveCaddyfile(host), "second caddy configuration\n");
  const sealedBefore = events(host).filter((entry) => entry.event === "sealed");

  ok(checkout.run({ ROLLBACK_TO: first.version.value }), "rollback");
  assert.equal(current(host), `builds/${first.deployment.releaseId}`);
  assert.equal(liveCaddyfile(host), "fixture caddy configuration\n", "the Caddyfile returns with the release");
  assert.equal(readlinkSync(join(host.releases, "previous")), `builds/${second.deployment.releaseId}`);
  const rollback = events(host).at(-1);
  assert.deepEqual([rollback.event, rollback.version, rollback.sequence], ["rollback", first.version.value, 1]);
  assert.equal(rollback.digest, sealedRelease(events(host), first.version.value).digest);
  // Ordering is untouched: no new build, version or sequence.
  assert.deepEqual(events(host).filter((entry) => entry.event === "sealed"), sealedBefore);
  assert.equal(builds(host).length, 2);

  failed(checkout.run({ ROLLBACK_TO: first.version.value }), /is already current/, "rollback to current");
  failed(checkout.run({ ROLLBACK_TO: "260101000000.0.0" }), /is not a sealed calendar release/, "unknown version");
  failed(checkout.run({ ROLLBACK_TO: "26.09.30" }), /canonical calendar version/, "non-canonical version");

  await appendFile(join(host.releases, `builds/${second.deployment.releaseId}`, "release.json"), " ");
  failed(checkout.run({ ROLLBACK_TO: second.version.value }), /does not match its sealed release set; refusing to roll back/, "tampered target");
  assert.equal(current(host), `builds/${first.deployment.releaseId}`);

  // A rollback that fails its health check restores what was live, site
  // and Caddyfile.
  ok(checkout.run(), "third deployment");
  const third = `builds/${(await checkout.release()).deployment.releaseId}`;
  const reverted = checkout.run({ ROLLBACK_TO: first.version.value, FAKE_CONTAINER_UNHEALTHY: "1", FAKE_HEALTHY_CURRENT: third });
  failed(reverted, /the requested rollback to .* was reverted/, "unhealthy rollback");
  assert.equal(current(host), third);
  assert.equal(liveCaddyfile(host), "second caddy configuration\n");
  assert.equal(lockHeld(host), false);
});

test("an interrupted seal before the rename leaves a pending entry that a retry completes", async () => {
  const { host, checkout } = await fixture();
  ok(checkout.run(), "first deployment");
  const first = await checkout.release();
  failed(checkout.run({ FAKE_SSH_FAIL: "*mv -T '*/configs/.incoming-*" }), /unable to seal builds\/.*pending ledger entry confirms nothing/, "interrupted seal");
  const second = await checkout.release();
  assert.equal(current(host), `builds/${first.deployment.releaseId}`);
  assert.deepEqual(builds(host), [first.deployment.releaseId]);
  assert.equal(existsSync(join(host.releases, "configs", second.deployment.releaseId)), false);
  assert.equal(readdirSync(host.releases).some((name) => name.startsWith(".incoming-")), false);
  assert.deepEqual(events(host).slice(3).map((entry) => entry.event), ["pending"]);
  assert.equal(sealedRelease(events(host), second.version.value), null);

  // Retrying the same prepared release records the identical pending entry
  // and seals it; the ledger stays consistent and rollback still works.
  ok(checkout.run({ SKIP_BUILD: "1" }), "retry");
  assert.equal(current(host), `builds/${second.deployment.releaseId}`);
  assert.deepEqual(events(host).slice(3).map((entry) => entry.event), ["pending", "pending", "sealed", "promoted"]);
  assert.equal(sealedRelease(events(host), second.version.value).releaseId, second.deployment.releaseId);
  ok(checkout.run({ ROLLBACK_TO: first.version.value }), "rollback after the retry");

  // Interrupted between the two renames: the Caddyfile snapshot is renamed,
  // the build is not. Cleanup removes both, so the retry succeeds too.
  const { host: split, checkout: splitCheckout } = await fixture();
  ok(splitCheckout.run(), "first deployment");
  const gate = join(split.root, "gate");
  const running = splitCheckout.start({ FAKE_RSYNC_GATE: gate });
  await waitFor(`${gate}.waiting`);
  await chmod(join(split.releases, "builds"), 0o555);
  await writeFile(gate, "");
  const splitResult = await running;
  await chmod(join(split.releases, "builds"), 0o755);
  failed(splitResult, /unable to seal/, "split seal");
  assert.match(splitResult.stderr, /CLEANUP.*removed unsealed upload/);
  assert.equal(readdirSync(join(split.releases, "configs")).length, 1, "only the live release's snapshot remains");
  ok(splitCheckout.run({ SKIP_BUILD: "1" }), "retry after a split seal");
});

test("an interrupted seal after the rename never promotes and never reuses its version", async () => {
  const { host, checkout } = await fixture();
  ok(checkout.run(), "first deployment");
  const first = await checkout.release();
  failed(checkout.run({ FAKE_SSH_FAIL: "*'sealed'*" }), /its seal could not be confirmed/, "unconfirmed seal");
  const orphan = await checkout.release();
  assert.ok(builds(host).includes(orphan.deployment.releaseId), "the renamed build stays in place");
  assert.equal(current(host), `builds/${first.deployment.releaseId}`);
  assert.equal(sealedRelease(events(host), orphan.version.value), null);

  failed(checkout.run({ SKIP_BUILD: "1" }), /is not the channel's next release|already exists/, "retry of the orphan");
  failed(checkout.run({ ROLLBACK_TO: orphan.version.value }), /is not a sealed calendar release/, "rollback to the orphan");

  ok(checkout.run(), "fresh deployment");
  const fresh = await checkout.release();
  assert.equal(fresh.version.sequence, orphan.version.sequence + 1);
  assert.equal(current(host), `builds/${fresh.deployment.releaseId}`);
});

test("a promotion event that cannot be recorded rolls the deployment back", async () => {
  const { host, checkout } = await fixture();
  ok(checkout.run(), "first deployment");
  const first = `builds/${(await checkout.release()).deployment.releaseId}`;
  const result = checkout.run({ FAKE_SSH_FAIL: "*'promoted'*" });
  failed(result, /the promotion event could not be recorded/, "missing promotion event");
  assert.match(result.stderr, /restored builds\/.* and its Caddyfile \(release set verified\)/);
  assert.equal(current(host), first);
  assert.equal(events(host).at(-1).event, "auto-rollback");
  assert.equal(lockHeld(host), false);
});

test("deploy.sh holds the lock from the final history check through sealing, promotion and its event", () => {
  const order = [
    "acquire_deploy_lock \"$RELEASE_ID\"",
    "calendar-reservation.mjs\" verify",
    "secure_current_release\n\n# A non-symlink",
    "rsync -az --delay-updates -e",
    "release-set.mjs\" verify \"$RELEASE_SET_DIGEST\"",
    "record_release_event pending",
    "mv '$REMOTE_INCOMING' '$REMOTE_RELEASE'",
    "record_release_event sealed",
    "stage_edge \"$RELEASE_ID\"",
    "check_promoted_release\n",
    "record_release_event promoted",
    "PROMOTION_STARTED=0\nrelease_deploy_lock ||",
    "trap - EXIT INT TERM\nok \"deployment complete",
  ].map((needle) => {
    const index = deploySource.lastIndexOf(needle);
    assert.ok(index > 0, needle);
    return index;
  });
  assert.deepEqual([...order].sort((left, right) => left - right), order);
  assert.match(deploySource, /release_deploy_lock \|\| \{ \[ "\$status" -ne 0 \] \|\| status=1; \}\n  exit "\$status"\n\}/);
  assert.doesNotMatch(deploySource, /rm -rf[^\n]*deploy\.lock/);
});
