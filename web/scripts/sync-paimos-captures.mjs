#!/usr/bin/env node
// PAI-695 — site-owned publication gate for PAIMOS marketing captures.
// With --capture-dir it validates and copies a newly generated set. With
// --check it re-verifies the committed assets, hashes, provenance and the
// hotspot-to-DOM landmark contract used by PaimosProductSurface.astro.

import { createHash } from "node:crypto";
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
  "ui-dashboard.png",
  "ui-issues.png",
  "ui-board.png",
  "ui-search.png",
  "ui-voice-intake.png",
];
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

function verifyCommitted() {
  const manifest = readJson(manifestPath);
  if (manifest.schemaVersion !== 1) fail("unsupported capture manifest schema");
  if (!/^\d+\.\d+\.\d+$/.test(manifest.release)) fail("manifest release is not semver");
  if (!/^[0-9a-f]{40}$/.test(manifest.sourceCommit)) fail("manifest source commit is invalid");
  if (manifest.assets?.length !== assetNames.length) fail("manifest must contain all six captures");
  for (const name of assetNames) {
    const expected = manifest.assets.find((asset) => asset.name === name);
    if (!expected) fail(`manifest is missing ${name}`);
    verifyAsset(join(assetDir, name), expected);
  }
  verifyFraming(manifest.layout);
  console.log(`✓ verified ${assetNames.length} Paimos captures for v${manifest.release}`);
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
  const sourceCommit = valueAfter("--source-commit");
  if (!captureDirArg) fail("--capture-dir is required");
  const captureDir = resolve(captureDirArg);
  if (!/^\d+\.\d+\.\d+$/.test(release)) fail("--release must be semver");
  if (!/^[0-9a-f]{40}$/.test(sourceCommit)) fail("--source-commit must be a full Git object id");

  const layout = readJson(join(captureDir, "capture-surface.json"));
  verifyFraming(layout);
  const assets = assetNames.map((name) => verifyAsset(join(captureDir, name), { name }));
  for (const name of assetNames) copyFileSync(join(captureDir, name), join(assetDir, name));
  writeFileSync(
    manifestPath,
    `${JSON.stringify({ schemaVersion: 1, release, sourceCommit, assets, layout }, null, 2)}\n`,
  );
  verifyCommitted();
}
