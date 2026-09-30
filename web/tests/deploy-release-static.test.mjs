// Release sets, the deployment lock and verified rollback (INSPR-493).
// The deploy tests run the real deploy.sh against tests/support/fake-host.mjs.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, readlinkSync } from "node:fs";
import { appendFile, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import {
  LOCKFILE,
  RELEASE_SET_SCHEMA,
  createReleaseSet,
  parseEvents,
  sealedRelease,
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
const ok = (result, label) => assert.equal(result.status, 0, `${label}\n${result.stderr}\n${result.stdout}`);

// Runs deploy.sh's own remote_release_listing function against a local
// directory, so the listing format is tested exactly as the host prints it.
function listing(directory) {
  const definition = /^remote_release_listing\(\) \{\n[\s\S]*?\n\}\n/m.exec(deploySource)[0];
  const script = `set -euo pipefail
remote_ssh() { printf '%s\\n' "$1" | bash -se; }
${definition}
remote_release_listing "$1"`;
  const result = spawnSync("/bin/bash", ["-c", script, "listing", directory], { encoding: "utf8" });
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
  const set = createReleaseSet({ root, sourceRevision: FIXTURE_REVISION, lockfileBytes, node: "v24.0.0" });
  assert.equal(set.schema, RELEASE_SET_SCHEMA);
  assert.equal(set.releaseId, release.deployment.releaseId);
  assert.deepEqual(set.version, release.version);
  assert.deepEqual(set.source, { repository: "inspr-at/inspr-site", revision: FIXTURE_REVISION, dirty: false });
  assert.deepEqual(set.dependencyLock, { path: LOCKFILE, sha256: sha256(lockfileBytes) });
  assert.deepEqual(set.artifacts.map((artifact) => artifact.path), ["_astro/site.css", "index.html", "release.json"]);
  assert.equal(set.artifacts[1].sha256, sha256("<p>home</p>\n"));
  assert.equal(set.artifacts[1].size, 12);

  assert.throws(() => createReleaseSet({ root, sourceRevision: "f".repeat(40), lockfileBytes }), /different source revision/);
  assert.throws(() => createReleaseSet({ root, sourceRevision: "0123456789ab", lockfileBytes }), /full 40-hex commit/);
  await writeFile(join(root, "release.json"), JSON.stringify({ ...release, version: null }));
  assert.throws(() => createReleaseSet({ root, sourceRevision: FIXTURE_REVISION, lockfileBytes }), /no calendar version/);
  await writeFile(join(root, "release.json"), JSON.stringify(release));
  await symlink("index.html", join(root, "link.html"));
  assert.throws(() => createReleaseSet({ root, sourceRevision: FIXTURE_REVISION, lockfileBytes }), /not a regular file/);
});

test("the host listing verifies a build exactly against its release set", async () => {
  const root = await mkdtemp(join(tmpdir(), "inspr-release-listing-"));
  cleanups.push(root);
  const build = join(root, "build");
  await mkdir(join(build, "de"), { recursive: true });
  await writeFile(join(build, "index.html"), "home\n");
  await writeFile(join(build, "de", "index.html"), "start\n");
  await writeFile(join(build, "release.json"), JSON.stringify(release));
  const bytes = Buffer.from(serializeReleaseSet(createReleaseSet({
    root: build, sourceRevision: FIXTURE_REVISION, lockfileBytes: Buffer.from("{}"),
  })));
  await writeFile(join(build, "release-set.json"), bytes);
  const digest = sha256(bytes);
  const verify = () => verifyRemoteRelease({ listing: listing(build), expectedDigest: digest, releaseId: release.deployment.releaseId, version: "260930154712.0.0" });
  assert.equal(verify().artifacts.length, 3);

  assert.throws(() => verifyRemoteRelease({ listing: listing(build), expectedDigest: "0".repeat(64) }), /differs from the recorded digest/);
  assert.throws(() => verifyRemoteRelease({ listing: listing(build), expectedDigest: digest, version: "260930154713.0.0" }), /not 260930154713/);

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

test("the ledger records one sealed digest per release", () => {
  const digest = "a".repeat(64);
  const ledger = parseEvents([
    `2026-09-30T15:47:13Z\tsealed\t20260930T154712Z-0123456789ab\t260930154712.0.0\t1\t${digest}`,
    `2026-09-30T15:47:20Z\tpromoted\t20260930T154712Z-0123456789ab\t260930154712.0.0\t1\t${digest}`,
  ].join("\n"));
  assert.equal(sealedRelease(ledger, "260930154712.0.0").releaseId, "20260930T154712Z-0123456789ab");
  assert.equal(sealedRelease(ledger, "20260930T154712Z-0123456789ab").digest, digest);
  assert.equal(sealedRelease(ledger, "20260930T144629Z-095391814e7b"), null);
  assert.throws(() => sealedRelease([...ledger, ledger[0]], "260930154712.0.0"), /more than once/);
  assert.throws(() => parseEvents("2026-09-30T15:47:13Z\tsealed\tx\ty\t1\tnot-a-digest"), /unreadable ledger line/);
});

test("deploy.sh seals a verified release set and records it in the ledger", async () => {
  const { host, checkout } = await fixture();
  ok(checkout.run(), "deploy");
  const { deployment, version } = await checkout.release();
  const target = `builds/${deployment.releaseId}`;
  assert.equal(current(host), target);
  const set = JSON.parse(readFileSync(join(host.releases, target, "release-set.json"), "utf8"));
  assert.equal(set.version.value, version.value);
  assert.equal(set.source.revision, FIXTURE_REVISION);
  assert.ok(set.artifacts.some((artifact) => artifact.path === "paimos/index.html"));
  const sealed = sealedRelease(events(host), version.value);
  assert.equal(sealed.digest, sha256(readFileSync(join(host.releases, target, "release-set.json"))));
  assert.deepEqual(events(host).map((entry) => entry.event), ["sealed", "promoted"]);
  assert.equal(existsSync(join(host.releases, ".deploy.lock")), false);
});

test("an upload altered on the host before sealing is refused", async () => {
  const { host, checkout } = await fixture();
  const result = checkout.run({ FAKE_TAMPER_INCOMING: "index.html" });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /does not match its release set/);
  assert.deepEqual(builds(host), []);
  assert.equal(existsSync(join(host.releases, "events.tsv")), false);
  assert.equal(readdirSync(host.releases).some((name) => name.startsWith(".incoming-")), false);
  assert.equal(existsSync(join(host.releases, ".deploy.lock")), false);
});

test("overlapping deployments serialize on the host lock", async () => {
  const { host, checkout: first } = await fixture();
  const second = await createCheckout(host);
  cleanups.push(second.root);
  const gate = join(host.root, "gate");

  // The first run holds the lock inside its upload until the gate opens.
  const running = first.start({ FAKE_RSYNC_GATE: gate });
  for (let waited = 0; !existsSync(`${gate}.waiting`); waited += 1) {
    assert.ok(waited < 300, "the first deployment never reached its upload");
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  const blocked = second.run();
  assert.equal(blocked.status, 1);
  assert.match(blocked.stderr, /another deployment holds .*\.deploy\.lock \(.*:.*\)/);
  assert.doesNotMatch(blocked.stdout, /uploading immutable release/);
  assert.ok(existsSync(join(host.releases, ".deploy.lock")), "the refused run leaves the holder's lock alone");

  await writeFile(gate, "");
  ok(await running, "first deployment");
  assert.equal(existsSync(join(host.releases, ".deploy.lock")), false);

  // The refused build reserved against the same history: it is stale now.
  const stale = second.run({ SKIP_BUILD: "1" });
  assert.equal(stale.status, 1);
  assert.match(stale.stderr, /is not the channel's next release/);

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
  const result = checkout.run();
  assert.equal(result.status, 1);
  assert.match(result.stderr, /another deployment holds .*ghost:4242.*remove that directory by hand/);
  assert.equal(readFileSync(join(host.releases, ".deploy.lock", "owner"), "utf8").trim(), "ghost:4242:20260930T000000Z-aaaaaaaaaaaa:20260930T000000Z");
  assert.deepEqual(builds(host), []);
});

test("a failed promotion rolls back only to a verified release set", async () => {
  const { host, checkout } = await fixture();
  ok(checkout.run(), "first deployment");
  const first = `builds/${(await checkout.release()).deployment.releaseId}`;

  const failed = checkout.run({ FAKE_CONTAINER_UNHEALTHY: "1" });
  assert.equal(failed.status, 1);
  assert.match(failed.stderr, /restored builds\/.* \(release set verified\)/);
  assert.equal(current(host), first);
  const rollback = events(host).at(-1);
  assert.equal(rollback.event, "auto-rollback");
  assert.equal(`builds/${rollback.releaseId}`, first);
  assert.equal(existsSync(join(host.releases, ".deploy.lock")), false);

  // An altered build is never relinked; the operator decides.
  await appendFile(join(host.releases, first, "index.html"), "altered\n");
  const refused = checkout.run({ FAKE_CONTAINER_UNHEALTHY: "1" });
  assert.equal(refused.status, 1);
  assert.match(refused.stderr, /does not match its sealed release set; current was NOT relinked/);
  assert.notEqual(current(host), first);
});

test("a failed first calendar deployment still restores the legacy release", async () => {
  const { host, checkout } = await fixture();
  const legacyId = "20260930T144629Z-095391814e7b";
  await seedBuild(host, legacyId, {
    schemaVersion: 1,
    package: { name: "web", version: "0.0.1" },
    source: { git: "095391814e7b", dirty: false },
    deployment: { releaseId: legacyId, deployedAt: "2026-09-30T14:46:29Z" },
  });
  await symlink(`builds/${legacyId}`, join(host.releases, "current"));
  const failed = checkout.run({ FAKE_CONTAINER_UNHEALTHY: "1" });
  assert.equal(failed.status, 1);
  assert.match(failed.stderr, /predates release sets; relinking it unverified/);
  assert.equal(current(host), `builds/${legacyId}`);
});

test("ROLLBACK_TO returns production to one exact verified release", async () => {
  const { host, checkout } = await fixture();
  ok(checkout.run(), "first deployment");
  const first = await checkout.release();
  ok(checkout.run(), "second deployment");
  const second = await checkout.release();
  const sealedBefore = events(host).filter((entry) => entry.event === "sealed");

  ok(checkout.run({ ROLLBACK_TO: first.version.value }), "rollback");
  assert.equal(current(host), `builds/${first.deployment.releaseId}`);
  assert.equal(readlinkSync(join(host.releases, "previous")), `builds/${second.deployment.releaseId}`);
  const rollback = events(host).at(-1);
  assert.deepEqual([rollback.event, rollback.version, rollback.sequence], ["rollback", first.version.value, 1]);
  assert.equal(rollback.digest, sealedRelease(events(host), first.version.value).digest);
  // Ordering is untouched: no new build, version or sequence.
  assert.deepEqual(events(host).filter((entry) => entry.event === "sealed"), sealedBefore);
  assert.equal(builds(host).length, 2);

  const again = checkout.run({ ROLLBACK_TO: first.version.value });
  assert.equal(again.status, 1);
  assert.match(again.stderr, /is already current/);

  const unknown = checkout.run({ ROLLBACK_TO: "260101000000.0.0" });
  assert.equal(unknown.status, 1);
  assert.match(unknown.stderr, /is not a sealed calendar release/);
  assert.equal(checkout.run({ ROLLBACK_TO: "26.09.30" }).status, 1);

  await appendFile(join(host.releases, `builds/${second.deployment.releaseId}`, "release.json"), " ");
  const tampered = checkout.run({ ROLLBACK_TO: second.version.value });
  assert.equal(tampered.status, 1);
  assert.match(tampered.stderr, /does not match its sealed release set; refusing to roll back/);
  assert.equal(current(host), `builds/${first.deployment.releaseId}`);

  // A rollback that fails its health check restores what was live.
  ok(checkout.run(), "third deployment");
  const third = await checkout.release();
  const reverted = checkout.run({ ROLLBACK_TO: first.version.value, FAKE_CONTAINER_UNHEALTHY: "1" });
  assert.equal(reverted.status, 1);
  assert.match(reverted.stderr, /the requested rollback to .* was reverted/);
  assert.equal(current(host), `builds/${third.deployment.releaseId}`);
  assert.equal(existsSync(join(host.releases, ".deploy.lock")), false);
});

test("deploy.sh holds the lock from the final history check through sealing and promotion", () => {
  const order = [
    "acquire_deploy_lock \"$RELEASE_ID\"",
    "calendar-reservation.mjs\" verify",
    "rsync -az --delay-updates -e",
    "release-set.mjs\" verify \"$RELEASE_SET_DIGEST\"",
    "record_release_event sealed",
    "mv '$REMOTE_INCOMING' '$REMOTE_RELEASE'",
    "check_promoted_release\n",
    "record_release_event promoted",
    "release_deploy_lock\ntrap - EXIT INT TERM\nok \"deployment complete",
  ].map((needle) => {
    const index = deploySource.lastIndexOf(needle);
    assert.ok(index > 0, needle);
    return index;
  });
  assert.deepEqual([...order].sort((left, right) => left - right), order);
  assert.match(deploySource, /release_deploy_lock\n  exit "\$status"\n\}/);
  assert.doesNotMatch(deploySource, /rm -rf[^\n]*deploy\.lock/);
});
