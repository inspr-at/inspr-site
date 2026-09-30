// Verifies the vendored INSPR calendar-version presentation bundle (INSPR-493).
//
// The expected source commit, config digest and manifest digest are the
// checked-in literals in calendar-version-bundle-pin.json, reviewed apart from
// the candidate bytes; nothing here derives a pin from the files it checks.
// The manifest digest pins every per-file size and SHA-256 it lists. Missing,
// extra, altered, non-regular and untracked payloads fail the build. Bundled
// JavaScript is only read and hashed here, never executed.
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { lstatSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { CALENDAR_SCHEME } from "../calendar-version.mjs";

export const BUNDLE_DIRECTORY = "src/vendor/calendar-version-display";
export const PIN_PATH = "scripts/calendar-version-bundle-pin.json";
// The file set scripts/versioning-bundle.mjs emits at the pinned commit.
export const BUNDLE_FILES = Object.freeze([
  "display.json",
  "manifest.json",
  "package.json",
  "presentation.js",
  "schemes.json",
  "version-interaction.js",
  "version.js",
]);
const SCHEME_LABEL = "INSPR-CalVer3";

const webRoot = fileURLToPath(new URL("../", import.meta.url));
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
const same = (left, right) => JSON.stringify(left) === JSON.stringify(right);

function gitTracking(root, paths) {
  const git = (...args) => execFileSync("git", ["-C", root, ...args], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
    env: { PATH: process.env.PATH, GIT_CONFIG_NOSYSTEM: "1", GIT_TERMINAL_PROMPT: "0" },
  });
  try {
    if (git("rev-parse", "--is-inside-work-tree").trim() !== "true") return null;
  } catch {
    return null; // An exported source tree has no index to consult.
  }
  const tracked = new Set(git("ls-files", "-z", "--", ...paths).split("\0").filter(Boolean));
  return paths.filter((path) => !tracked.has(path));
}

export function verifyCalendarVersionBundle({ root = webRoot, pinPath = PIN_PATH, requireTracked = true } = {}) {
  const fail = (why) => {
    throw new Error(`calendar-version bundle: ${why}`);
  };
  const pin = JSON.parse(readFileSync(join(root, pinPath), "utf8"));
  if (!same(Object.keys(pin).sort(), ["configSha256", "manifestSha256", "repository", "revision", "schema"])
    || pin.repository !== "inspr-at/inspr"
    || !/^[a-f0-9]{40}$/.test(pin.revision)
    || !/^[a-f0-9]{64}$/.test(pin.configSha256)
    || !/^[a-f0-9]{64}$/.test(pin.manifestSha256)
    || typeof pin.schema !== "string") fail("invalid pin");

  const directory = join(root, BUNDLE_DIRECTORY);
  const present = readdirSync(directory).sort();
  if (!same(present, BUNDLE_FILES)) fail(`file set differs: ${present.join(", ")}`);
  for (const file of BUNDLE_FILES) {
    if (!lstatSync(join(directory, file)).isFile()) fail(`${file} is not a regular file`);
  }

  const manifestBytes = readFileSync(join(directory, "manifest.json"));
  if (sha256(manifestBytes) !== pin.manifestSha256) fail("manifest digest differs from the pin");
  const manifest = JSON.parse(manifestBytes.toString("utf8"));
  if (manifest.repository !== pin.repository
    || manifest.revision !== pin.revision
    || manifest.expectedConfigSha256 !== pin.configSha256
    || manifest.schema !== pin.schema
    || manifest.mode !== "build-time-only"
    || manifest.runtimeConsumers !== false) fail("manifest does not name the pinned source");
  const listed = manifest.files.map((entry) => entry.outputPath).sort();
  if (!same(listed, BUNDLE_FILES.filter((file) => file !== "manifest.json"))) fail("manifest file list differs");
  for (const entry of manifest.files) {
    const bytes = readFileSync(join(directory, entry.outputPath));
    if (bytes.length !== entry.size || sha256(bytes) !== entry.sha256) fail(`${entry.outputPath} differs from the manifest`);
  }
  const displayBytes = readFileSync(join(directory, "display.json"));
  if (sha256(displayBytes) !== pin.configSha256) fail("display config differs from the pin");

  // The pinned presentation must describe the scheme this site declares.
  const display = JSON.parse(displayBytes.toString("utf8"));
  const schemes = JSON.parse(readFileSync(join(directory, "schemes.json"), "utf8"));
  if (display.scheme !== CALENDAR_SCHEME || schemes.current !== CALENDAR_SCHEME) {
    fail(`pinned presentation is not for ${CALENDAR_SCHEME}`);
  }
  if (schemes.labels?.[CALENDAR_SCHEME] !== SCHEME_LABEL) fail(`scheme label is not ${SCHEME_LABEL}`);

  let tracking = "skipped (no Git index)";
  if (requireTracked) {
    const paths = [pinPath, ...BUNDLE_FILES.map((file) => `${BUNDLE_DIRECTORY}/${file}`)];
    const untracked = gitTracking(root, paths);
    if (untracked?.length) fail(`untracked payload: ${untracked.join(", ")}`);
    if (untracked) tracking = "tracked";
  }
  return {
    source: `${pin.repository}@${pin.revision}`,
    schema: pin.schema,
    files: BUNDLE_FILES.length,
    tracking,
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    const result = verifyCalendarVersionBundle();
    console.log(`calendar-version bundle verified: ${result.source} (${result.schema}, ${result.files} files, ${result.tracking})`);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
