#!/usr/bin/env node
// PAI-695, INSPR-478: site-owned publication gate for PAIMOS AEON marketing
// captures. With --capture-dir it proves the public release tag, validates
// and copies a newly generated set. With --check it re-verifies the committed
// assets, hashes, provenance and the hotspot-to-landmark contract used by
// PaimosProductSurface.astro.

import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const webRoot = resolve(scriptDir, "..");
const assetDir = join(webRoot, "src/assets/products/paimos");
const componentPath = join(webRoot, "src/components/PaimosProductSurface.astro");
const manifestPath = join(assetDir, "capture-manifest.json");
// Annotated surfaces: each tab of PaimosProductSurface.astro shows one
// screen, and hotspot N must land on landmark N of screen N.
const surfaces = [
  { name: "surface-ticket.png", landmark: "issueContext" },
  { name: "surface-agents.png", landmark: "executionControl" },
  { name: "surface-knowledge.png", landmark: "applicableMemories" },
];
const galleryNames = [
  "ui-projects.png",
  "ui-work-tree.png",
  "ui-search.png",
  "ui-knowledge-graph.png",
  "ui-releases.png",
];
const assetNames = [...surfaces.map(({ name }) => name), ...galleryNames];
// Dark renditions are kept as spare assets; the page shows the light set.
const spareDir = "dark";
const videoNames = ["loop-ticket-agents.mp4", "loop-search-navigate.mp4"];
const sourceRepositories = ["inspr-at/aeon", "inspr-at/paimos"];

function fail(message) {
  throw new Error(`Paimos capture gate: ${message}`);
}

function sha256(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function pngDimensions(path) {
  const bytes = readFileSync(path);
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  if (bytes.length < 24 || !bytes.subarray(0, 8).equals(signature)) {
    fail(`${path} is not a PNG`);
  }
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
}

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    fail(`cannot read ${path}: ${error.message}`);
  }
}

// Aeon releases are tagged vYYMMDDHHMMSS.0.0 (INSPR Calendar Versioning v2;
// aeon scripts/verify-release.mjs fixes the suffix). The tag is stored
// verbatim; it is never inferred.
function verifyRelease(releaseKind, release) {
  if (releaseKind !== "inspr-calendar-v2") fail("release kind must be inspr-calendar-v2");
  // Same grammar as aeon scripts/verify-release.mjs validCalendarVersion.
  const match = release.match(/^([1-9][0-9])(0[1-9]|1[0-2])(0[1-9]|[12][0-9]|3[01])([01][0-9]|2[0-3])([0-5][0-9])([0-5][0-9])\.0\.0$/);
  if (!match) fail("release is not YYMMDDHHMMSS.0.0");
  const [, yy, month, day, hour, minute, second] = match.map(Number);
  const instant = new Date(Date.UTC(2000 + yy, month - 1, day, hour, minute, second));
  if (
    instant.getUTCFullYear() !== 2000 + yy ||
    instant.getUTCMonth() !== month - 1 ||
    instant.getUTCDate() !== day ||
    instant.getUTCHours() !== hour ||
    instant.getUTCMinutes() !== minute ||
    instant.getUTCSeconds() !== second
  ) {
    fail("release is not a real date and time");
  }
}

// The importer proves that the public tag exists and names the captured commit.
function verifyPublicTag(repository, tag, sourceCommit) {
  const result = spawnSync(
    "git",
    ["ls-remote", `https://github.com/${repository}.git`, `refs/tags/${tag}`, `refs/tags/${tag}^{}`],
    { encoding: "utf8" },
  );
  if (result.error || result.status !== 0) {
    fail(`cannot read tags of ${repository}: ${result.error?.message ?? result.stderr.trim()}`);
  }
  const refs = new Map(
    result.stdout.trim().split("\n").filter(Boolean).map((line) => line.split("\t").reverse()),
  );
  const commit = refs.get(`refs/tags/${tag}^{}`) ?? refs.get(`refs/tags/${tag}`);
  if (!commit) fail(`${repository} has no public tag ${tag}`);
  if (commit !== sourceCommit) fail(`${tag} resolves to ${commit}, not ${sourceCommit}`);
}

// The component must show surface N in tab N, or hotspot N would annotate
// the wrong screen even though its coordinates still match.
function verifyScreenOrder(source) {
  const imports = new Map(
    [...source.matchAll(/import (\w+) from "\.\.\/assets\/products\/paimos\/([\w-]+\.png)";/g)]
      .map(([, binding, file]) => [binding, file]),
  );
  const start = source.indexOf("const details = [");
  const end = source.indexOf("\n];", start);
  if (start < 0 || end < 0) fail("component details are missing");
  const shown = [...source.slice(start, end).matchAll(/\n    image: (\w+),/g)].map(([, binding]) => imports.get(binding));
  const expected = surfaces.map(({ name }) => name);
  if (JSON.stringify(shown) !== JSON.stringify(expected)) {
    fail(`component shows ${JSON.stringify(shown)}, expected ${JSON.stringify(expected)}`);
  }
}

function desktopHotspots() {
  const source = readFileSync(componentPath, "utf8");
  verifyScreenOrder(source);
  const contractStart = source.indexOf("/* Hotspot framing contract:");
  const contractEnd = source.indexOf(".product-surface__frame figcaption", contractStart);
  if (contractStart < 0 || contractEnd < 0) fail("component framing contract is missing");
  const contract = source.slice(contractStart, contractEnd);
  return surfaces.map((_, index) => {
    const number = index + 1;
    const rule = contract.match(
      new RegExp(`\\.product-surface__hotspot--${number}\\s*\\{[^}]*top:\\s*([0-9.]+)%[^}]*left:\\s*([0-9.]+)%`, "s"),
    );
    if (!rule) fail(`desktop hotspot ${number} position is missing`);
    return { y: Number(rule[1]) / 100, x: Number(rule[2]) / 100 };
  });
}

function verifyFraming(layout) {
  if (layout?.schemaVersion !== 2) fail("unsupported layout metadata schema");
  const viewport = layout.viewport;
  if (viewport?.width !== 1600 || viewport?.height !== 1000 || viewport?.deviceScaleFactor !== 2) {
    fail("capture viewport must be 1600×1000 @2x");
  }
  if (layout.theme !== "light") fail("the published surfaces must be the light theme");

  const hotspots = desktopHotspots();
  for (const [index, { name, landmark }] of surfaces.entries()) {
    const box = layout.landmarks?.[landmark];
    if (box?.screen !== name) fail(`landmark ${landmark} must be measured on ${name}`);
    if (![box.x, box.y, box.width, box.height].every(Number.isFinite)) {
      fail(`landmark ${landmark} is missing`);
    }
    if (box.x < 0 || box.y < 0 || box.x + box.width > 1 || box.y + box.height > 1) {
      fail(`landmark ${landmark} lies outside ${name}`);
    }
    const point = hotspots[index];
    const padding = 0.04;
    const inside =
      point.x >= box.x - padding &&
      point.x <= box.x + box.width + padding &&
      point.y >= box.y - padding &&
      point.y <= box.y + box.height + padding;
    if (!inside) fail(`hotspot ${index + 1} no longer lands on ${landmark}`);
  }
}

function requireDigest(expected) {
  if (!/^[0-9a-f]{64}$/.test(expected.sha256 ?? "")) fail(`${expected.name} hash is missing from the manifest`);
}

function verifyAsset(path, expected, committed = false) {
  if (committed) requireDigest(expected);
  const dimensions = pngDimensions(path);
  if (dimensions.width !== 3200 || dimensions.height !== 2000) {
    fail(`${expected.name} must be 3200×2000 (got ${dimensions.width}×${dimensions.height})`);
  }
  const digest = sha256(path);
  if (expected.sha256 && digest !== expected.sha256) fail(`${expected.name} hash does not match manifest`);
  return { name: expected.name, ...dimensions, sha256: digest };
}

function verifyVideo(path, expected, committed = false) {
  if (committed) {
    requireDigest(expected);
    if (!Number.isInteger(expected.bytes) || expected.bytes <= 0) fail(`${expected.name} byte size is missing from the manifest`);
  }
  const bytes = readFileSync(path);
  const ftyp = bytes.indexOf(Buffer.from("ftyp"));
  const moov = bytes.indexOf(Buffer.from("moov"));
  const mdat = bytes.indexOf(Buffer.from("mdat"));
  if (ftyp < 0 || moov < 0 || mdat < 0 || moov > mdat) {
    fail(`${expected.name} must be a fast-start MP4`);
  }

  const probe = spawnSync(
    "ffprobe",
    [
      "-v", "error",
      "-show_entries", "stream=codec_type,codec_name,profile,pix_fmt,width,height,r_frame_rate:format=duration",
      "-of", "json",
      path,
    ],
    { encoding: "utf8" },
  );
  if (probe.error || probe.status !== 0) {
    fail(`${expected.name} ffprobe failed: ${probe.error?.message ?? probe.stderr.trim()}`);
  }
  const media = JSON.parse(probe.stdout);
  const videoStreams = media.streams.filter((stream) => stream.codec_type === "video");
  const audioStreams = media.streams.filter((stream) => stream.codec_type === "audio");
  const video = videoStreams[0];
  const durationSeconds = Number.parseFloat(media.format.duration);
  if (
    videoStreams.length !== 1 ||
    audioStreams.length !== 0 ||
    video?.codec_name !== "h264" ||
    video?.profile !== "Main" ||
    video?.pix_fmt !== "yuv420p" ||
    video?.width !== 1280 ||
    video?.height !== 800 ||
    video?.r_frame_rate !== "24/1" ||
    !Number.isFinite(durationSeconds) ||
    durationSeconds < 5 ||
    durationSeconds > 15
  ) {
    fail(
      `${expected.name} violates the 1280×800 H.264, 24 fps, 5–15 second, no-audio contract: ` +
      JSON.stringify({ videoStreams, audioStreams, durationSeconds }),
    );
  }
  if (bytes.length < 64 * 1024 || bytes.length > 2 * 1024 * 1024) {
    fail(`${expected.name} must stay between 64 KiB and 2 MiB`);
  }

  const digest = sha256(path);
  if (expected.sha256 && digest !== expected.sha256) fail(`${expected.name} hash does not match manifest`);
  if ((committed || expected.bytes !== undefined) && bytes.length !== expected.bytes) {
    fail(`${expected.name} byte size does not match manifest`);
  }
  return {
    name: expected.name,
    width: video.width,
    height: video.height,
    durationSeconds: Number(durationSeconds.toFixed(3)),
    bytes: bytes.length,
    sha256: digest,
  };
}

function verifyCommitted(path = manifestPath, remote = false) {
  const manifest = readJson(path);
  if (manifest.schemaVersion !== 4) fail("unsupported capture manifest schema");
  if (manifest.product !== "PAIMOS AEON") fail("captures must come from PAIMOS AEON");
  if (!sourceRepositories.includes(manifest.sourceRepository)) fail("unknown source repository");
  verifyRelease(manifest.releaseKind, manifest.release);
  if (manifest.tag !== `v${manifest.release}`) fail("tag must be v<release>");
  if (!/^[0-9a-f]{40}$/.test(manifest.sourceCommit)) fail("manifest source commit is invalid");
  if (manifest.data !== "synthetic") fail("captures must use synthetic demo data");
  if (manifest.layout?.observedVersion !== manifest.release) {
    fail("the captured instance did not report the release being published");
  }
  if (remote) verifyPublicTag(manifest.sourceRepository, manifest.tag, manifest.sourceCommit);
  if (manifest.assets?.length !== assetNames.length) fail(`manifest must contain all ${assetNames.length} captures`);
  for (const name of assetNames) {
    const expected = manifest.assets.find((asset) => asset.name === name);
    if (!expected) fail(`manifest is missing ${name}`);
    verifyAsset(join(assetDir, name), expected, true);
  }
  if (manifest.spares?.length !== assetNames.length) fail("manifest must list a dark spare for every capture");
  for (const name of assetNames) {
    const expected = manifest.spares.find((asset) => asset.name === `${spareDir}/${name}`);
    if (!expected) fail(`manifest is missing ${spareDir}/${name}`);
    verifyAsset(join(assetDir, spareDir, name), expected, true);
  }
  if (manifest.videos?.length !== videoNames.length) fail("manifest must contain both product loops");
  const videos = videoNames.map((name) => {
    const expected = manifest.videos.find((video) => video.name === name);
    if (!expected) fail(`manifest is missing ${name}`);
    return verifyVideo(join(assetDir, name), expected, true);
  });
  const videoBytes = videos.reduce((total, video) => total + video.bytes, 0);
  if (videoBytes > 3 * 1024 * 1024) fail("combined product loops exceed the 3 MiB page-weight budget");
  verifyFraming(manifest.layout);
  console.log(
    `✓ verified ${assetNames.length} stills + ${assetNames.length} dark spares + ` +
    `${videoNames.length} product loops for ${manifest.sourceRepository}@${manifest.tag}`,
  );
}

function valueAfter(flag) {
  const index = process.argv.indexOf(flag);
  return index >= 0 ? process.argv[index + 1] : "";
}

if (process.argv.includes("--check")) {
  // The public tag is re-proved against the recorded commit on every check,
  // so the build (CI and deploy.sh) cannot publish a false provenance.
  // --offline exists only for hermetic unit tests of the other rules.
  verifyCommitted(valueAfter("--manifest") || manifestPath, !process.argv.includes("--offline"));
} else {
  const captureDirArg = valueAfter("--capture-dir");
  const release = valueAfter("--release");
  const releaseKind = valueAfter("--release-kind");
  const sourceCommit = valueAfter("--source-commit");
  const sourceRepository = valueAfter("--source-repository");
  if (!captureDirArg) fail("--capture-dir is required");
  const captureDir = resolve(captureDirArg);
  verifyRelease(releaseKind, release);
  if (!/^[0-9a-f]{40}$/.test(sourceCommit)) fail("--source-commit must be a full Git object id");
  if (!sourceRepositories.includes(sourceRepository)) {
    fail(`--source-repository must be one of ${sourceRepositories.join(", ")}`);
  }
  const tag = `v${release}`;
  verifyPublicTag(sourceRepository, tag, sourceCommit);

  const layout = readJson(join(captureDir, "capture-surface.json"));
  verifyFraming(layout);
  if (layout.observedVersion !== release) {
    fail(`the captured instance reported ${layout.observedVersion ?? "no version"}, not ${release}`);
  }
  const assets = assetNames.map((name) => verifyAsset(join(captureDir, name), { name }));
  const spares = assetNames.map((name) => ({
    ...verifyAsset(join(captureDir, spareDir, name), { name }),
    name: `${spareDir}/${name}`,
  }));
  const videos = videoNames.map((name) => verifyVideo(join(captureDir, name), { name }));
  mkdirSync(join(assetDir, spareDir), { recursive: true });
  for (const name of assetNames) {
    copyFileSync(join(captureDir, name), join(assetDir, name));
    copyFileSync(join(captureDir, spareDir, name), join(assetDir, spareDir, name));
  }
  for (const name of videoNames) copyFileSync(join(captureDir, name), join(assetDir, name));
  writeFileSync(
    manifestPath,
    `${JSON.stringify({
      schemaVersion: 4,
      product: "PAIMOS AEON",
      sourceRepository,
      releaseKind,
      release,
      tag,
      sourceCommit,
      data: "synthetic",
      assets,
      spares,
      videos,
      layout,
    }, null, 2)}\n`,
  );
  verifyCommitted();
}
