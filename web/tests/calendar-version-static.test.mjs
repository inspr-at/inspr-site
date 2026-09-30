// INSPR Calendar Versioning for the site release (INSPR-493): pin literals,
// vendored bundle verification, the coordinate grammar, release.json scheme
// metadata, deploy.sh reservation and the one footer adapter.
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import {
  cp,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  symlink,
  unlink,
  writeFile,
} from "node:fs/promises";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import {
  CALENDAR_SCHEME,
  calendarVersionFromUtc,
  compareCalendarVersions,
  isCalendarVersion,
  parseReleaseInventory,
  reserveCalendarVersion,
  verifyReleaseAgainstInventory,
} from "../calendar-version.mjs";
import { createReleaseMetadata, releaseManifest } from "../release-metadata.mjs";
import {
  BUNDLE_DIRECTORY,
  BUNDLE_FILES,
  PIN_PATH,
  verifyCalendarVersionBundle,
} from "../scripts/verify-calendar-version-bundle.mjs";
import { createCheckout, createHost, seedBuild } from "./support/fake-host.mjs";

const webRoot = fileURLToPath(new URL("../", import.meta.url));
const repositoryRoot = fileURLToPath(new URL("../../", import.meta.url));
const read = (relative) => readFile(join(webRoot, relative), "utf8");

// Reviewed literals. Changing the pin is a deliberate consumer upgrade and
// must change these too; nothing here is computed from the vendored bytes.
const PINNED = Object.freeze({
  repository: "inspr-at/inspr",
  revision: "01b3080948c21899cbbacbfa3447da6799af1b56",
  schema: "inspr.calver-display.v3",
  configSha256: "bf6aa144cd73dc97dc941f0f0914138b04ae0a28fbead5123465b15b1f2a2fd9",
  manifestSha256: "d4dcb8c05d0fcad7d60183156166c5a30f21e6abc1ac0c274ee3e0791e5ea912",
});

const anchorFor = (firstCalendarVersion, lastLegacyVersion = null) => ({
  legacyScheme: "legacy",
  lastLegacyVersion,
  firstCalendarVersion,
  firstCalendarSequence: 1,
});
const legacyManifest = (releaseId, deployedAt) => ({
  schemaVersion: 1,
  package: { name: "web", version: "0.0.1" },
  source: { git: releaseId.slice(-12), dirty: false },
  deployment: { releaseId, deployedAt },
});
const calendarManifest = (value, sequence, anchor, scheme = CALENDAR_SCHEME) => ({
  schemaVersion: 2,
  package: { name: "web", version: "0.0.1" },
  source: { git: "0123456789ab", dirty: false },
  deployment: {
    releaseId: `20${value.slice(0, 6)}T${value.slice(6, 12)}Z-0123456789ab`,
    deployedAt: `20${value.slice(0, 2)}-${value.slice(2, 4)}-${value.slice(4, 6)}T${value.slice(6, 8)}:${value.slice(8, 10)}:${value.slice(10, 12)}Z`,
  },
  version: { scheme, value, channel: "stable", sequence, anchor },
});
const withoutScheme = (manifest) => {
  const { scheme: _absent, ...version } = manifest.version;
  return { ...manifest, version };
};
const inventoryText = (manifests) =>
  manifests.map((manifest, index) => `--- build-${index}\n${JSON.stringify(manifest, null, 2)}\n`).join("");
const entries = (manifests) => parseReleaseInventory(inventoryText(manifests));

test("the presentation pin is the reviewed set of literals", async () => {
  const pin = JSON.parse(await read(PIN_PATH));
  assert.deepEqual(pin, PINNED);
  const manifest = JSON.parse(await read(`${BUNDLE_DIRECTORY}/manifest.json`));
  assert.equal(manifest.revision, PINNED.revision);
  assert.equal(manifest.expectedConfigSha256, PINNED.configSha256);
  assert.equal(manifest.schema, PINNED.schema);

  // The verifier reads expectations from the pin file only.
  const verifier = await read("scripts/verify-calendar-version-bundle.mjs");
  assert.match(verifier, /readFileSync\(join\(root, pinPath\)/);
  assert.doesNotMatch(verifier, /writeFile/);
  assert.doesNotMatch(verifier, /import\(/, "bundled JavaScript is never executed by the check");

  const manifestScripts = JSON.parse(await read("package.json")).scripts;
  assert.match(manifestScripts.build, /^npm run calendar-version:check && /);
  assert.equal(manifestScripts["calendar-version:check"], "node scripts/verify-calendar-version-bundle.mjs");
});

test("the vendored bundle verifies against the pin", () => {
  const result = verifyCalendarVersionBundle();
  assert.equal(result.source, `${PINNED.repository}@${PINNED.revision}`);
  assert.equal(result.files, 7);
});

test("missing, extra, altered, non-regular and untracked payloads are rejected", async () => {
  const fixture = await mkdtemp(join(tmpdir(), "inspr-calendar-bundle-"));
  const bundle = join(fixture, BUNDLE_DIRECTORY);
  const reset = async () => {
    await rm(join(fixture, "src"), { recursive: true, force: true });
    await mkdir(join(fixture, "scripts"), { recursive: true });
    await cp(join(webRoot, BUNDLE_DIRECTORY), bundle, { recursive: true });
    await cp(join(webRoot, PIN_PATH), join(fixture, PIN_PATH));
  };
  const rejects = (message, options = {}) =>
    assert.throws(() => verifyCalendarVersionBundle({ root: fixture, requireTracked: false, ...options }), message);
  try {
    await reset();
    assert.equal(verifyCalendarVersionBundle({ root: fixture, requireTracked: false }).files, 7);

    await unlink(join(bundle, "version.js"));
    rejects(/file set differs/);

    await reset();
    await writeFile(join(bundle, "extra.js"), "export {};\n");
    rejects(/file set differs/);

    await reset();
    const renderer = await readFile(join(bundle, "version.js"));
    await writeFile(join(bundle, "version.js"), Buffer.concat([renderer, Buffer.from("\n")]));
    rejects(/version\.js differs from the manifest/);

    await reset();
    const display = JSON.parse(await readFile(join(bundle, "display.json"), "utf8"));
    display.weights.ss = 1;
    await writeFile(join(bundle, "display.json"), JSON.stringify(display));
    rejects(/display\.json differs from the manifest/);

    await reset();
    const manifest = await readFile(join(bundle, "manifest.json"), "utf8");
    await writeFile(join(bundle, "manifest.json"), manifest.replace('"consumers": []', '"consumers": ["x"]'));
    rejects(/manifest digest differs from the pin/);

    await reset();
    await unlink(join(bundle, "schemes.json"));
    await symlink(join(webRoot, BUNDLE_DIRECTORY, "schemes.json"), join(bundle, "schemes.json"));
    rejects(/schemes\.json is not a regular file/);

    await reset();
    await writeFile(join(fixture, PIN_PATH), JSON.stringify({ ...PINNED, revision: "f".repeat(40) }));
    rejects(/manifest does not name the pinned source/);

    await reset();
    await writeFile(join(fixture, PIN_PATH), JSON.stringify({ ...PINNED, manifestSha256: "0".repeat(64) }));
    rejects(/manifest digest differs from the pin/);

    await reset();
    await writeFile(join(fixture, PIN_PATH), JSON.stringify({ ...PINNED, extra: true }));
    rejects(/invalid pin/);

    // Untracked payloads fail wherever a Git index exists.
    await reset();
    const git = (...args) => execFileSync("git", ["-C", fixture, ...args], { stdio: "ignore" });
    git("init", "-q");
    assert.throws(() => verifyCalendarVersionBundle({ root: fixture }), /untracked payload/);
    git("add", "--", PIN_PATH, BUNDLE_DIRECTORY);
    assert.equal(verifyCalendarVersionBundle({ root: fixture }).tracking, "tracked");
  } finally {
    await rm(fixture, { recursive: true, force: true });
  }
});

test("the pinned bundle presents the declared scheme with the doctrine label", async () => {
  const display = JSON.parse(await read(`${BUNDLE_DIRECTORY}/display.json`));
  const schemes = JSON.parse(await read(`${BUNDLE_DIRECTORY}/schemes.json`));
  assert.equal(display.scheme, CALENDAR_SCHEME);
  assert.equal(schemes.current, CALENDAR_SCHEME);
  assert.equal(schemes.labels[CALENDAR_SCHEME], "INSPR-CalVer3");
  assert.deepEqual((await readdir(join(webRoot, BUNDLE_DIRECTORY))).sort(), [...BUNDLE_FILES]);
});

test("the calendar grammar accepts real UTC coordinates only", () => {
  for (const valid of ["260909113550.0.0", "261231235959.0.0", "280229120000.0.0", "991231235959.0.0", "100101000000.0.0"]) {
    assert.equal(isCalendarVersion(valid), true, valid);
  }
  for (const invalid of [
    "26.09.09", "26.09.09.11.35.50", "5.21.0", "0.0.1", "20260909113550.0.0", "2609091135.0.0",
    "260909113550", "260909113550.0.1", "260909113550.1.0", "260909113550.0.0-rc1",
    "260909113550.0.0+g39d0b59", "260909240000.0.0", "260909116000.0.0", "260229120000.0.0",
    "260431120000.0.0", "090909113550.0.0", "v260909113550.0.0", " 260909113550.0.0",
    "20260930T144629Z-095391814e7b", "", null, 260909113550,
  ]) {
    assert.equal(isCalendarVersion(invalid), false, String(invalid));
  }
  assert.equal(calendarVersionFromUtc("2026-09-30T15:47:12Z"), "260930154712.0.0");
  for (const timestamp of ["2026-09-30T15:47:12.5Z", "2026-09-30T15:47:12+02:00", "2026-02-29T12:00:00Z", "2009-12-31T23:59:59Z", "2100-01-01T00:00:00Z"]) {
    assert.throws(() => calendarVersionFromUtc(timestamp), timestamp);
  }
  assert.equal(compareCalendarVersions("260930154712.0.0", "260930154711.0.0"), 1);
  assert.equal(compareCalendarVersions("260930154712.0.0", "260930154712.0.0"), 0);
  // Mixed eras never compare as strings: legacy identifiers have no calendar order.
  assert.throws(() => compareCalendarVersions("20260930T144629Z-095391814e7b", "260930154712.0.0"));
  assert.throws(() => compareCalendarVersions("0.0.1", "260930154712.0.0"));
});

test("release.json declares the scheme explicitly and a local build carries no version", () => {
  const deployment = {
    INSPR_GIT_SHA: "0123456789abcdef0123456789abcdef01234567",
    INSPR_GIT_DIRTY: "0",
    INSPR_RELEASE_ID: "20260930T154712Z-0123456789ab",
    INSPR_DEPLOYED_AT: "2026-09-30T15:47:12Z",
    INSPR_CALENDAR_VERSION: "260930154712.0.0",
    INSPR_RELEASE_SEQUENCE: "1",
    INSPR_CALENDAR_ANCHOR: JSON.stringify(anchorFor("260930154712.0.0", "20260930T144629Z-095391814e7b")),
  };
  const fallback = { revision: "ffffffffffffffffffffffffffffffffffffffff", dirty: false };
  const manifest = releaseManifest(createReleaseMetadata(deployment, fallback));
  assert.equal(manifest.schemaVersion, 2);
  assert.deepEqual(manifest.deployment, { releaseId: deployment.INSPR_RELEASE_ID, deployedAt: deployment.INSPR_DEPLOYED_AT });
  assert.equal(manifest.package.version, "0.0.1");
  assert.deepEqual(manifest.version, {
    scheme: "inspr-calver-3",
    value: "260930154712.0.0",
    channel: "stable",
    sequence: 1,
    anchor: anchorFor("260930154712.0.0", "20260930T144629Z-095391814e7b"),
  });

  const local = createReleaseMetadata({}, fallback);
  assert.equal(local.calendarVersion, null);
  assert.equal(releaseManifest(local).version, null);
  assert.equal(releaseManifest(local).deployment.releaseId, "local");

  const rejected = [
    [{ ...deployment, INSPR_CALENDAR_VERSION: undefined }, /supplied together/],
    [{ INSPR_CALENDAR_VERSION: "260930154712.0.0" }, /supplied together/],
    [{ ...deployment, INSPR_CALENDAR_VERSION: "260930154713.0.0", INSPR_CALENDAR_ANCHOR: JSON.stringify(anchorFor("260930154713.0.0")) }, /not the deployment timestamp's reservation/],
    [{ ...deployment, INSPR_CALENDAR_VERSION: "26.09.30.15.47.12" }, /invalid calendar version/],
    [{ ...deployment, INSPR_CALENDAR_VERSION: "260930154712.0.0-rc1" }, /invalid calendar version/],
    [{ ...deployment, INSPR_RELEASE_SEQUENCE: "0" }, /positive integer/],
    [{ ...deployment, INSPR_RELEASE_SEQUENCE: "2" }, /disagree with the migration anchor/],
    [{ ...deployment, INSPR_CALENDAR_ANCHOR: "{" }, /JSON migration anchor/],
    [{ ...deployment, INSPR_CALENDAR_ANCHOR: JSON.stringify({ ...anchorFor("260930154712.0.0"), legacyScheme: "semver" }) }, /legacy scheme/],
  ];
  for (const [environment, message] of rejected) {
    assert.throws(() => createReleaseMetadata(environment, fallback), message);
  }
});

test("reservations continue the channel, survive rollbacks and fail closed", () => {
  const now = "2026-09-30T15:47:12Z";
  assert.deepEqual(reserveCalendarVersion({ deployedAt: now, entries: [] }), {
    version: "260930154712.0.0",
    sequence: 1,
    anchor: anchorFor("260930154712.0.0"),
  });

  // The first calendar release anchors on the latest legacy release.
  const legacy = [
    legacyManifest("20260930T144629Z-095391814e7b", "2026-09-30T14:46:29Z"),
    legacyManifest("20260929T101010Z-aaaaaaaaaaaa", "2026-09-29T10:10:10Z"),
  ];
  assert.deepEqual(reserveCalendarVersion({ deployedAt: now, entries: entries(legacy) }), {
    version: "260930154712.0.0",
    sequence: 1,
    anchor: anchorFor("260930154712.0.0", "20260930T144629Z-095391814e7b"),
  });

  // Later releases carry the anchor; the sequence follows the highest build,
  // so a rollback to an older build never reuses a sequence or version.
  const anchor = anchorFor("260930154712.0.0", "20260930T144629Z-095391814e7b");
  const history = [
    ...legacy,
    calendarManifest("260930154712.0.0", 1, anchor),
    calendarManifest("261001090000.0.0", 2, anchor),
  ];
  assert.deepEqual(reserveCalendarVersion({ deployedAt: "2026-10-02T08:00:00Z", entries: entries(history) }), {
    version: "261002080000.0.0",
    sequence: 3,
    anchor,
  });

  // Same second: retry in the next second. Far ahead: a skewed clock.
  const collide = (deployedAt) => {
    try {
      reserveCalendarVersion({ deployedAt, entries: entries(history) });
    } catch (error) {
      return error.code;
    }
    return "reserved";
  };
  assert.equal(collide("2026-10-01T09:00:00Z"), "retry");
  assert.equal(collide("2026-10-01T08:59:58Z"), "retry");
  assert.equal(collide("2026-09-30T20:00:00Z"), "clock");
  assert.equal(collide("2026-10-01T09:00:01Z"), "reserved");
  assert.throws(
    () => reserveCalendarVersion({ deployedAt: "2026-09-30T14:00:00Z", entries: entries(legacy) }),
    /not later than the last legacy deployment/,
  );

  // History may carry the deprecated CalVer2 identifier; a new release may not.
  const calver2 = [calendarManifest("260930154712.0.0", 1, anchor, "inspr-calendar-v2")];
  assert.equal(reserveCalendarVersion({ deployedAt: "2026-10-02T08:00:00Z", entries: entries(calver2) }).sequence, 2);
  assert.throws(
    () => verifyReleaseAgainstInventory(calendarManifest("261002080000.0.0", 2, anchor, "inspr-calendar-v2"), entries(calver2)),
    /unknown or absent version scheme/,
  );

  // Absent, unknown and inconsistent history fails closed.
  const broken = [
    [[{ ...calendarManifest("260930154712.0.0", 1, anchor), version: null }], /declares no version scheme/],
    [[calendarManifest("260930154712.0.0", 1, anchor, "inspr-calendar-v9")], /unknown or absent version scheme/],
    [[withoutScheme(calendarManifest("260930154712.0.0", 1, anchor))], /unknown or absent version scheme/],
    [[{ schemaVersion: 3 }], /unknown release manifest schema/],
    [[calendarManifest("261001090000.0.0", 1, anchorFor("261001090000.0.0")), calendarManifest("260930154712.0.0", 2, anchorFor("261001090000.0.0"))], /disagree with the migration anchor|not strictly ordered/],
    [[calendarManifest("260930154712.0.0", 1, anchor), calendarManifest("261001090000.0.0", 2, anchorFor("260930154712.0.0"))], /more than one migration anchor/],
  ];
  for (const [manifests, message] of broken) {
    assert.throws(() => reserveCalendarVersion({ deployedAt: "2026-10-02T08:00:00Z", entries: entries(manifests) }), message);
  }
  assert.throws(() => parseReleaseInventory("{}\n"), /malformed/);

  // A built manifest must be exactly the next reservation.
  const next = calendarManifest("261002080000.0.0", 3, anchor);
  assert.equal(verifyReleaseAgainstInventory(next, entries(history)).sequence, 3);
  assert.throws(() => verifyReleaseAgainstInventory({ ...next, version: { ...next.version, sequence: 4 } }, entries(history)), /next sequence 3/);
  assert.throws(() => verifyReleaseAgainstInventory(calendarManifest("261002080000.0.0", 3, anchorFor("260930154712.0.0")), entries(history)), /anchor differs/);
  assert.throws(() => verifyReleaseAgainstInventory({ ...next, schemaVersion: 1 }, entries(history)), /schema version 2/);
});

test("the reservation CLI speaks deploy.sh's contract", () => {
  const cli = join(webRoot, "scripts", "calendar-reservation.mjs");
  const run = (args, input) => spawnSync(process.execPath, [cli, ...args], { input, encoding: "utf8" });
  const reserved = run(["reserve", "2026-09-30T15:47:12Z"], inventoryText([legacyManifest("20260930T144629Z-095391814e7b", "2026-09-30T14:46:29Z")]));
  assert.equal(reserved.status, 0, reserved.stderr);
  const [version, sequence, anchor] = reserved.stdout.trim().split("\t");
  assert.equal(version, "260930154712.0.0");
  assert.equal(sequence, "1");
  assert.deepEqual(JSON.parse(anchor), anchorFor("260930154712.0.0", "20260930T144629Z-095391814e7b"));

  const history = inventoryText([calendarManifest("260930154712.0.0", 1, anchorFor("260930154712.0.0"))]);
  assert.equal(run(["reserve", "2026-09-30T15:47:12Z"], history).status, 3);
  assert.equal(run(["reserve", "2026-09-29T15:47:12Z"], history).status, 1);
  assert.equal(run(["reserve", "not-a-time"], "").status, 1);
  assert.equal(run(["unknown"], "").status, 1);
});

test("deploy.sh reserves the coordinate from its timestamp and passes it to the build", async () => {
  const deploy = await readFile(join(repositoryRoot, "deploy.sh"), "utf8");
  assert.match(deploy, /read_release_inventory\(\) \{/);
  assert.match(deploy, /calendar-reservation\.mjs" reserve "\$DEPLOYED_AT"/);
  assert.match(deploy, /\[ "\$reservation_status" = "3" \]/);
  assert.match(deploy, /INSPR_CALENDAR_VERSION="\$CALENDAR_VERSION"/);
  assert.match(deploy, /INSPR_RELEASE_SEQUENCE="\$RELEASE_SEQUENCE"/);
  assert.match(deploy, /INSPR_CALENDAR_ANCHOR="\$CALENDAR_ANCHOR"/);
  assert.match(deploy, /calendar-reservation\.mjs" verify "\$ROOT\/web\/dist\/release\.json"/);
  assert.match(deploy, /release\.json" '"scheme": "inspr-calver-3"' "application\/json"/);
  assert.match(deploy, /data-calendar-version=\\"\$CALENDAR_VERSION\\"/);
  // The coordinate and the release ID come from one timestamp.
  const reserve = deploy.indexOf('reserve "$DEPLOYED_AT"');
  assert.ok(reserve > 0 && reserve < deploy.indexOf('RELEASE_TIMESTAMP="${DEPLOYED_AT//[-:]/}"'));

  // Continue a calendar channel; the host's newest coordinate is one second
  // ahead of this clock, so the reservation waits for a later second.
  const ahead = new Date(Math.floor(Date.now() / 1000) * 1000 + 1000);
  const aheadVersion = calendarVersionFromUtc(ahead.toISOString().replace(/\.\d{3}Z$/, "Z"));
  const anchor = anchorFor("260930154712.0.0", "20260930T144629Z-095391814e7b");
  const host = await createHost();
  await seedBuild(host, "20260930T144629Z-095391814e7b", legacyManifest("20260930T144629Z-095391814e7b", "2026-09-30T14:46:29Z"));
  await seedBuild(host, "calendar-1", calendarManifest("260930154712.0.0", 1, anchor));
  await seedBuild(host, "calendar-7", calendarManifest(aheadVersion, 7, anchor));
  const checkout = await createCheckout(host);
  try {
    const result = checkout.run();
    assert.equal(result.status, 0, `${result.stderr}\n${result.stdout}`);
    const { version, deployment } = await checkout.release();
    assert.equal(version.scheme, "inspr-calver-3");
    assert.equal(version.sequence, 8);
    assert.deepEqual(version.anchor, anchor);
    assert.equal(compareCalendarVersions(version.value, aheadVersion), 1);
    assert.equal(version.value, calendarVersionFromUtc(deployment.deployedAt));
    assert.equal(deployment.releaseId.slice(0, 16), deployment.deployedAt.replace(/[-:]/g, ""));
    assert.match(result.stdout, /reserved calendar version \d{12}\.0\.0 \(inspr-calver-3, sequence 8\)/);
  } finally {
    await rm(host.root, { recursive: true, force: true });
    await rm(checkout.root, { recursive: true, force: true });
  }
});

test("deploy.sh refuses a manifest that is not the channel's next release before any upload", async () => {
  const host = await createHost();
  await seedBuild(host, "calendar-1", calendarManifest("260720000000.0.0", 1, anchorFor("260720000000.0.0")));
  const checkout = await createCheckout(host, { release: calendarManifest("260719000000.0.0", 1, anchorFor("260719000000.0.0")) });
  try {
    const result = checkout.run();
    assert.equal(result.status, 1);
    assert.match(result.stderr, /is not the channel's next release/);
    const log = await readFile(checkout.transportLog, "utf8");
    assert.match(log, /^ssh/m);
    assert.doesNotMatch(log, /^(rsync|scp)/m);
    assert.doesNotMatch(result.stdout, /uploading immutable release/);
    assert.equal(existsSync(join(host.releases, ".deploy.lock")), false, "the lock is released on failure");
  } finally {
    await rm(host.root, { recursive: true, force: true });
    await rm(checkout.root, { recursive: true, force: true });
  }
});

test("every release footer shows the version through the one adapter", async () => {
  const adapter = await read("src/components/CalendarVersion.astro");
  assert.match(adapter, /from "\.\.\/vendor\/calendar-version-display\/version\.js"/);
  assert.match(adapter, /from "\.\.\/vendor\/calendar-version-display\/display\.json"/);
  assert.match(adapter, /mode: "pretty"/);
  assert.match(adapter, /interactive: true/);
  assert.match(adapter, /"--calendar-version-brand", "--secondary"/);
  assert.match(adapter, /unknown version scheme/);
  assert.doesNotMatch(adapter, /is:inline|set:html/);

  const components = await readdir(join(webRoot, "src", "components"));
  for (const name of components.filter((file) => file.endsWith(".astro"))) {
    const source = await read(`src/components/${name}`);
    if (name !== "CalendarVersion.astro") {
      assert.doesNotMatch(source, /calendar-version-display/, `${name} must use the CalendarVersion adapter`);
    }
    if (source.includes("data-release-id=")) {
      assert.match(source, /import CalendarVersion from "\.\/CalendarVersion\.astro"/, name);
      assert.match(source, /<CalendarVersion\s+value=\{releaseMetadata\.calendarVersion\}\s+scheme=\{releaseMetadata\.versionScheme\}/, name);
      assert.match(source, /releaseMetadata\.calendarVersion && releaseMetadata\.versionScheme && \(/, name);
    }
  }
  for (const footer of ["src/components/MicrositeFooter.astro", "src/components/AithemaProductPage.astro"]) {
    assert.match(await read(footer), /<dt>Version<\/dt>/, footer);
  }
  // The overview (/overview/, /de/ueberblick/) has its own footer and the same adapter.
  const overview = await read("src/components/OverviewPage.astro");
  assert.match(overview, /<footer class="overview-footer page-shell">[\s\S]*<CalendarVersion[\s\S]*<\/footer>/);
  assert.match(overview, /<span>Version<\/span>/);
  const deploy = await readFile(join(repositoryRoot, "deploy.sh"), "utf8");
  for (const url of ["https://www.inspr.at/", "https://paimos.inspr.at/", "https://aithema.inspr.at/", "https://www.inspr.at/overview/", "https://www.inspr.at/de/ueberblick/"]) {
    assert.ok(deploy.includes(`"${url}" "data-calendar-version=\\"$CALENDAR_VERSION\\""`), `deploy.sh probes the version in ${url}`);
  }
  assert.match(await read("src/styles/overview.css"), /\.overview-footer__release \{[^}]*--calendar-version-brand: var\(--accent\);/);

  // Every served footer is one of these three; the retired section footers
  // are not imported anywhere.
  const served = new Set(["src/components/MicrositeFooter.astro", "src/components/AithemaProductPage.astro", "src/components/OverviewPage.astro"]);
  const astroFiles = execFileSync("git", ["-C", webRoot, "ls-files", "-co", "--exclude-standard", "src"], { encoding: "utf8" })
    .split("\n").filter((file) => file.endsWith(".astro"));
  const sources = new Map(await Promise.all(astroFiles.map(async (file) => [file, await read(file)])));
  for (const [file, source] of sources) {
    if (!source.includes("<footer") || served.has(file)) continue;
    const name = file.split("/").pop();
    const importers = [...sources].filter(([, other]) => other.includes(`/${name}"`)).map(([other]) => other);
    assert.deepEqual(importers, [], `${file} renders a footer without the release version`);
  }

  // Retired labels never appear on a surface.
  const pages = execFileSync("git", ["-C", webRoot, "ls-files", "-co", "--exclude-standard", "src"], { encoding: "utf8" })
    .split("\n")
    .filter((file) => /\.(astro|ts|mjs|css)$/.test(file) && !file.startsWith("src/vendor/"));
  for (const file of pages) {
    assert.doesNotMatch(await read(file), /INSPR-VER[12]\b/, file);
  }
});
