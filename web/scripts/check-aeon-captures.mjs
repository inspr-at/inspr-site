#!/usr/bin/env node
// INSPR-492 / INSPR-556: every published image retains a matching digest and
// provenance. Demo frames additionally bind release, source commit and fixtures.
// Missing, extra or modified files still fail the build, including unused files.
import { createHash } from "node:crypto";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../src/assets/products/paimos-aeon/", import.meta.url));
const manifestPath = join(root, "capture-manifest.json");
const sha = /^[0-9a-f]{64}$/;
const commit = /^[0-9a-f]{40}$/;
const pngSignature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

// Exported for mutation checks: fixture claims cannot become live-instance
// claims, and a PNG must agree with its recorded crop and @2x viewport.
export function demoProblems(manifest, file, bytes) {
  const problems = [];
  const reject = (condition, message) => { if (!condition) problems.push(`${file.name}: ${message}`); };
  reject(manifest.syntheticData === true && file.syntheticData === true, "demo capture needs synthetic data");
  reject(manifest.sourceRepository === "inspr-at/paimos" && file.sourceRepository === manifest.sourceRepository, "demo source repository must match PAIMOS");
  reject(["inspr-calver-3", "inspr-calendar-v2"].includes(file.releaseKind) && file.releaseKind === manifest.releaseKind, "demo release kind must match");
  reject(/^v[1-9][0-9]{11}\.0\.0$/.test(file.tag) && file.tag === manifest.tag && file.version === file.tag.slice(1), "demo release tag/version must match");
  const version = String(file.version).match(/^(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})\.0\.0$/);
  const date = version && new Date(Date.UTC(2000 + +version[1], +version[2] - 1, +version[3], +version[4], +version[5], +version[6]));
  reject(version && date.toISOString().replace(/\D/g, "").slice(2, 14) === version.slice(1).join(""), "demo release must be a real calendar instant");
  reject(commit.test(file.commit) && file.commit === manifest.commit, "demo source commit must match");
  reject(typeof file.route === "string" && file.route.startsWith("/") && !file.route.startsWith("//"), "demo capture needs a relative app route");
  reject(Array.isArray(file.fixtures) && file.fixtures.length > 0 && file.fixtures.every((fixture) => typeof fixture === "string" && /^[\w-]+(?:-fixtures\.ts|\.spec\.ts)(?:: [\w /-]+)?$/.test(fixture)) && new Set(file.fixtures).size === file.fixtures.length, "demo capture needs named repository fixtures");
  reject(typeof file.safety === "string" && file.safety.trim().length > 0, "demo capture needs a safety record");
  reject(file.theme === "light" || file.theme === "dark", "demo capture needs a theme");
  const viewport = file.viewport;
  reject(manifest.viewport?.width === 1600 && manifest.viewport?.height === 1000 && manifest.viewport?.deviceScaleFactor === 2, "demo default viewport must be 1600×1000 @2x");
  reject(viewport?.width === 1600 && [1000, 1200].includes(viewport?.height) && file.deviceScaleFactor === 2, "demo frame viewport must be 1600×1000 or 1600×1200 @2x");
  const crop = file.crop;
  const validCrop = crop && [crop.x, crop.y, crop.width, crop.height].every(Number.isFinite) && crop.x >= 0 && crop.y >= 0 && crop.width > 0 && crop.height > 0 && crop.x + crop.width <= viewport?.width && crop.y + crop.height <= viewport?.height;
  reject(validCrop, "demo crop must fit the viewport");
  const isPng = bytes.length >= 24 && bytes.subarray(0, 8).equals(pngSignature);
  reject(isPng, "demo image must be a PNG");
  if (isPng) {
    const width = bytes.readUInt32BE(16), height = bytes.readUInt32BE(20);
    reject(width === file.width && height === file.height && validCrop && width === crop.width * 2 && height === crop.height * 2, "demo PNG dimensions must match its @2x crop");
  }
  return problems;
}

export function verifyAeonCaptures(verifyTag) {
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  const walk = (dir) => readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    return statSync(path).isDirectory() ? walk(path) : [relative(root, path)];
  });
  const onDisk = new Set(walk(root).filter((path) => path !== "capture-manifest.json" && !path.startsWith(".")));
  const recorded = new Map(manifest.files.map((file) => [file.name, file]));
  const problems = [];
  if (recorded.size !== manifest.files.length) problems.push("the manifest lists a file name more than once");
  for (const path of onDisk) if (!recorded.has(path)) problems.push(`${path}: published but not in the manifest`);
  for (const [name, file] of recorded) {
    if (!onDisk.has(name)) { problems.push(`${name}: in the manifest but missing`); continue; }
    const bytes = readFileSync(join(root, name));
    const digest = createHash("sha256").update(bytes).digest("hex");
    if (!sha.test(file.sha256) || digest !== file.sha256) problems.push(`${name}: digest changed (${digest.slice(0, 12)} vs ${String(file.sha256).slice(0, 12)})`);
    if (!["live", "demo", "generated", "public-web"].includes(file.kind)) problems.push(`${name}: unknown kind ${file.kind}`);
    if (file.kind === "live" && !(file.route && file.version && file.redaction)) problems.push(`${name}: live capture needs route, version and redaction`);
    if (file.kind === "generated" && !(file.generator && file.subject)) problems.push(`${name}: generated image needs generator and subject`);
    if (file.kind === "public-web" && !(file.source && file.note)) problems.push(`${name}: public web capture needs source and note`);
    if (file.kind === "demo") problems.push(...demoProblems(manifest, file, bytes));
  }
  if (problems.length) throw new Error(`AEON capture manifest check failed:\n  ${problems.join("\n  ")}`);
  if (verifyTag) {
    const releases = new Map(manifest.files.filter((file) => file.kind === "demo").map((file) => [`${file.sourceRepository}@${file.tag}`, file]));
    for (const file of releases.values()) verifyTag(file.sourceRepository, file.tag, file.commit);
  }
  console.log(`AEON captures: ${recorded.size} files recorded, digests and provenance match`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { verifyAeonCaptures(); } catch (error) { console.error(error.message); process.exit(1); }
}
