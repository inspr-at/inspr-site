#!/usr/bin/env node
// PAI-695 — site-owned publication gate for PAIMOS marketing captures.
// With --capture-dir it validates and copies a newly generated set. With
// --check it re-verifies the committed assets, hashes, provenance and the
// hotspot-to-DOM landmark contract used by PaimosProductSurface.astro.

import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { copyFileSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const webRoot = resolve(scriptDir, "..");
const assetDir = join(webRoot, "src/assets/products/paimos");
const componentPath = join(webRoot, "src/components/PaimosProductSurface.astro");
const manifestPath = join(assetDir, "capture-manifest.json");
const assetNames = [
  "product-surface.png",
  "ui-session-home.png",
  "ui-agent-mode.png",
  "ui-issues.png",
  "ui-board.png",
  "ui-search.png",
  "ui-voice-intake.png",
];
const videoNames = ["loop-issue-workbench.mp4", "loop-search-navigate.mp4"];
const landmarkOrder = ["issueContext", "executionControl", "applicableMemories"];

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

function verifyRelease(releaseKind, release) {
  if (releaseKind === "semver") {
    if (!/^\d+\.\d+\.\d+$/.test(release)) fail("legacy release is not semver");
    return;
  }
  if (releaseKind !== "calendar") fail("release kind must be semver or calendar");
  const match = release.match(/^(\d{2})\.(\d{2})\.(\d{2})(?:\.(\d{2})\.(\d{2}))?$/);
  if (!match) fail("calendar release is not yy.mm.dd[.hh.mm]");
  const [, yy, month, day, hour = "00", minute = "00"] = match;
  const instant = new Date(Date.UTC(2000 + Number(yy), Number(month) - 1, Number(day), Number(hour), Number(minute)));
  if (
    instant.getUTCFullYear() !== 2000 + Number(yy) ||
    instant.getUTCMonth() !== Number(month) - 1 ||
    instant.getUTCDate() !== Number(day) ||
    instant.getUTCHours() !== Number(hour) ||
    instant.getUTCMinutes() !== Number(minute)
  ) {
    fail("calendar release is not a real date and time");
  }
}

function desktopHotspots() {
  const source = readFileSync(componentPath, "utf8");
  const contractStart = source.indexOf("/* Hotspot framing contract:");
  const contractEnd = source.indexOf(".product-surface__frame figcaption", contractStart);
  if (contractStart < 0 || contractEnd < 0) fail("component framing contract is missing");
  const contract = source.slice(contractStart, contractEnd);
  return [1, 2, 3].map((number) => {
    const rule = contract.match(
      new RegExp(`\\.product-surface__hotspot--${number}\\s*\\{[^}]*top:\\s*([0-9.]+)%[^}]*left:\\s*([0-9.]+)%`, "s"),
    );
    if (!rule) fail(`desktop hotspot ${number} position is missing`);
    return { y: Number(rule[1]) / 100, x: Number(rule[2]) / 100 };
  });
}

function verifyFraming(layout) {
  if (layout?.schemaVersion !== 1) fail("unsupported layout metadata schema");
  const viewport = layout.viewport;
  if (viewport?.width !== 1600 || viewport?.height !== 1000 || viewport?.deviceScaleFactor !== 2) {
    fail("capture viewport must be 1600×1000 @2x");
  }
  if (layout.framing?.anchor !== "TASKS") fail("TASKS framing anchor is missing");
  if (layout.framing.tasksTop < 0.04 || layout.framing.tasksTop > 0.12) {
    fail(`TASKS framing drifted to ${(layout.framing.tasksTop * 100).toFixed(1)}%`);
  }

  const hotspots = desktopHotspots();
  for (const [index, name] of landmarkOrder.entries()) {
    const box = layout.landmarks?.[name];
    if (![box?.x, box?.y, box?.width, box?.height].every(Number.isFinite)) {
      fail(`landmark ${name} is missing`);
    }
    const point = hotspots[index];
    const xPadding = 0.04;
    const yPadding = name === "applicableMemories" ? 0.09 : 0.075;
    const inside =
      point.x >= box.x - xPadding &&
      point.x <= box.x + box.width + xPadding &&
      point.y >= box.y - yPadding &&
      point.y <= box.y + box.height + yPadding;
    if (!inside) {
      fail(`hotspot ${index + 1} no longer lands on ${name}`);
    }
  }
}

function verifyAsset(path, expected) {
  const dimensions = pngDimensions(path);
  if (dimensions.width !== 3200 || dimensions.height !== 2000) {
    fail(`${expected.name} must be 3200×2000 (got ${dimensions.width}×${dimensions.height})`);
  }
  const digest = sha256(path);
  if (expected.sha256 && digest !== expected.sha256) fail(`${expected.name} hash does not match manifest`);
  return { name: expected.name, ...dimensions, sha256: digest };
}

function verifyVideo(path, expected) {
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
  if (expected.bytes && bytes.length !== expected.bytes) fail(`${expected.name} byte size does not match manifest`);
  return {
    name: expected.name,
    width: video.width,
    height: video.height,
    durationSeconds: Number(durationSeconds.toFixed(3)),
    bytes: bytes.length,
    sha256: digest,
  };
}

function verifyCommitted() {
  const manifest = readJson(manifestPath);
  if (manifest.schemaVersion !== 3) fail("unsupported capture manifest schema");
  verifyRelease(manifest.releaseKind, manifest.release);
  if (!/^[0-9a-f]{40}$/.test(manifest.sourceCommit)) fail("manifest source commit is invalid");
  if (manifest.assets?.length !== assetNames.length) fail(`manifest must contain all ${assetNames.length} captures`);
  for (const name of assetNames) {
    const expected = manifest.assets.find((asset) => asset.name === name);
    if (!expected) fail(`manifest is missing ${name}`);
    verifyAsset(join(assetDir, name), expected);
  }
  if (manifest.videos?.length !== videoNames.length) fail("manifest must contain both product loops");
  const videos = videoNames.map((name) => {
    const expected = manifest.videos.find((video) => video.name === name);
    if (!expected) fail(`manifest is missing ${name}`);
    return verifyVideo(join(assetDir, name), expected);
  });
  const videoBytes = videos.reduce((total, video) => total + video.bytes, 0);
  if (videoBytes > 3 * 1024 * 1024) fail("combined product loops exceed the 3 MiB page-weight budget");
  verifyFraming(manifest.layout);
  console.log(`✓ verified ${assetNames.length} stills + ${videoNames.length} product loops for v${manifest.release}`);
}

function valueAfter(flag) {
  const index = process.argv.indexOf(flag);
  return index >= 0 ? process.argv[index + 1] : "";
}

if (process.argv.includes("--check")) {
  verifyCommitted();
} else {
  const captureDirArg = valueAfter("--capture-dir");
  const release = valueAfter("--release");
  const releaseKind = valueAfter("--release-kind");
  const sourceCommit = valueAfter("--source-commit");
  if (!captureDirArg) fail("--capture-dir is required");
  const captureDir = resolve(captureDirArg);
  verifyRelease(releaseKind, release);
  if (!/^[0-9a-f]{40}$/.test(sourceCommit)) fail("--source-commit must be a full Git object id");

  const layout = readJson(join(captureDir, "capture-surface.json"));
  verifyFraming(layout);
  const assets = assetNames.map((name) => verifyAsset(join(captureDir, name), { name }));
  const videos = videoNames.map((name) => verifyVideo(join(captureDir, name), { name }));
  for (const name of assetNames) copyFileSync(join(captureDir, name), join(assetDir, name));
  for (const name of videoNames) copyFileSync(join(captureDir, name), join(assetDir, name));
  writeFileSync(
    manifestPath,
    `${JSON.stringify({ schemaVersion: 3, releaseKind, release, sourceCommit, assets, videos, layout }, null, 2)}\n`,
  );
  verifyCommitted();
}
