#!/usr/bin/env node
// INSPR-492: every image published by the PAIMOS AEON page must be recorded in
// its capture manifest with a matching SHA-256 digest and a provenance kind.
// Missing, extra or modified files fail the build.
import { createHash } from "node:crypto";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../src/assets/products/paimos-aeon/", import.meta.url));
const manifestPath = join(root, "capture-manifest.json");
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
  const digest = createHash("sha256").update(readFileSync(join(root, name))).digest("hex");
  if (digest !== file.sha256) problems.push(`${name}: digest changed (${digest.slice(0, 12)} vs ${String(file.sha256).slice(0, 12)})`);
  if (!["live", "generated", "public-web"].includes(file.kind)) problems.push(`${name}: unknown kind ${file.kind}`);
  if (file.kind === "live" && !(file.route && file.version && file.redaction)) problems.push(`${name}: live capture needs route, version and redaction`);
  if (file.kind === "generated" && !(file.generator && file.subject)) problems.push(`${name}: generated image needs generator and subject`);
  if (file.kind === "public-web" && !(file.source && file.note)) problems.push(`${name}: public web capture needs source and note`);
}

if (problems.length) {
  console.error(`AEON capture manifest check failed:\n  ${problems.join("\n  ")}`);
  process.exit(1);
}
console.log(`AEON captures: ${recorded.size} files recorded, digests match`);
