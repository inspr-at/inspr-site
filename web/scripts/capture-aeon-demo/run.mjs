#!/usr/bin/env node
// SPDX-License-Identifier: AGPL-3.0-only
// Required local file: INSPR_CAPTURE_DENYLIST or ~/.inspr/capture-denylist.json.
// Format: names, hostPatterns, domains, companies arrays of strings or objects.
// Literal objects use {value, replacement?}; hostPatterns use {pattern, replacement?}.
// It stays on the operator machine outside every repo and must never be committed.
// Fixtures only: never production data, a fleet host, browser chrome or an instance URL.
// Run natively outside the Codex sandbox (NIX-445); obtain Opus visual QA before publishing.
// The copied AGPL spec imports AGPL test fixtures from the PAIMOS checkout at run time.
// Usage: node web/scripts/capture-aeon-demo/run.mjs <paimos-checkout> <output-dir>
// CAPTURE_ONLY selects comma-separated scenes; AEON_CAPTURE_CHROME selects installed Chrome.
import { copyFileSync, existsSync, mkdirSync, readFileSync, realpathSync } from "node:fs";
import { loadCaptureDenylist, createCaptureSanitizer } from "./privacy.mjs";
import { execFileSync, spawnSync } from "node:child_process";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const args = process.argv.slice(2);
if (args.length === 1 && args[0] === "--help") {
  console.log("Usage: node run.mjs <paimos-checkout> <output-dir>\nRun outside the Codex sandbox, locally with installed Chrome. Opus visual QA is required before publishing.");
  process.exit(0);
}
if (args.length !== 2) throw new Error("Expected a PAIMOS checkout path and an output directory; see --help");
const checkout = realpathSync(resolve(args[0]));
const web = join(checkout, "web");
const output = resolve(args[1]);
const denylist = loadCaptureDenylist({ repositoryRoots: [fileURLToPath(new URL("../../../", import.meta.url)), checkout] });
createCaptureSanitizer(denylist); // Validate replacements before copying or building.
const chrome = process.env.AEON_CAPTURE_CHROME || [
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome",
  "/usr/bin/google-chrome-stable",
].find(existsSync);
if (!chrome || !existsSync(chrome)) throw new Error("Installed Google Chrome was not found; set AEON_CAPTURE_CHROME to its executable");
const inside = relative(checkout, output);
if (!inside.startsWith(`..${sep}`) && inside !== ".." && !inside.startsWith(sep)) {
  throw new Error("Choose an output directory outside the PAIMOS checkout; Vite replaces its output");
}
for (const file of ["src/App.vue", "tests/work-fixtures.ts", "node_modules/vite/bin/vite.js", "node_modules/@playwright/test/cli.js"]) {
  if (!existsSync(join(web, file))) throw new Error(`PAIMOS checkout is missing web/${file}`);
}
// Read provenance from the supplied checkout, never from this site repository.
const tag = execFileSync("git", ["describe", "--tags", "--exact-match", "HEAD"], { cwd: checkout, encoding: "utf8" }).trim();
const commit = execFileSync("git", ["rev-parse", "HEAD"], { cwd: checkout, encoding: "utf8" }).trim();
if (!tag || !/^[a-f0-9]{40}$/.test(commit)) throw new Error("PAIMOS release provenance is missing or invalid");
const source = dirname(fileURLToPath(import.meta.url));
const target = join(web, "tests/site-capture");
// Refuse to overwrite a different existing spec or config in the supplied checkout.
for (const name of ["capture.spec.ts", "capture.config.ts", "privacy.mjs"]) {
  if (existsSync(join(target, name)) && !readFileSync(join(target, name)).equals(readFileSync(join(source, name)))) {
    throw new Error(`Existing ${name} differs; use a fresh disposable PAIMOS checkout`);
  }
}
mkdirSync(target, { recursive: true });
mkdirSync(join(output, "out"), { recursive: true });
for (const name of ["capture.spec.ts", "capture.config.ts", "privacy.mjs"]) copyFileSync(join(source, name), join(target, name));
const childEnv = {
  ...process.env,
  VITE_CACHE_DIR: join(output, "vite-cache"),
  INSPR_CAPTURE_DENYLIST: denylist.path,
  AEON_CAPTURE_TAG: tag,
  AEON_CAPTURE_COMMIT: commit,
  AEON_CAPTURE_WEB: web,
  AEON_CAPTURE_CHECKOUT: checkout,
  AEON_CAPTURE_RUNNER: fileURLToPath(import.meta.url),
  AEON_CAPTURE_OUTPUT: output,
  AEON_CAPTURE_CHROME: chrome,
};
function run(script, scriptArgs, cwd) {
  const result = spawnSync(process.execPath, [join(web, script), ...scriptArgs], { cwd, env: childEnv, stdio: "inherit" });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
run("node_modules/vite/bin/vite.js", ["build", "--outDir", join(output, "site"), "--configLoader", "runner"], web);
run("node_modules/@playwright/test/cli.js", ["test", "-c", join(target, "capture.config.ts")], output);
if (!existsSync(join(output, "frames.json"))) throw new Error("Capture did not write frames.json");
console.log(`Demo PNGs and frames.json written to ${output}. Obtain Opus visual QA before publishing.`);
