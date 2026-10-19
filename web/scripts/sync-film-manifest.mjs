// INSPR-572: VID's public film manifest, checked or copied into the site.
//
//   node scripts/sync-film-manifest.mjs <https-url | path> [--validate] [--check-media] [--only W05,W16]
//
//   --validate     check the manifest against schema 1 and write nothing. VID
//                  runs this on an export before OPS syncs it; it needs no
//                  installed dependencies.
//   --check-media  send a HEAD request for every video and poster and compare
//                  each video's Content-Length with the manifest; downloads
//                  nothing.
//   --only         keep only these films (ids), for a snapshot that must hold
//                  exactly the films Markus cleared.
//
// Without --validate the manifest is validated, normalised (film-manifest.mjs)
// and written to src/content/films/manifest.json, which holds only the fields
// the site renders. Commit it and release; the films never enter git.
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { filmUrl, parseFilmManifest } from "../film-manifest.mjs";

const args = process.argv.slice(2);
const source = args.find((arg) => !arg.startsWith("--") && args[args.indexOf(arg) - 1] !== "--only");
const validateOnly = args.includes("--validate");
const checkMedia = args.includes("--check-media");
const onlyIndex = args.indexOf("--only");
const only = onlyIndex === -1 ? null : (args[onlyIndex + 1] ?? "").split(",").map((id) => id.trim()).filter(Boolean);
const known = new Set(["--validate", "--check-media", "--only"]);
if (!source || args.some((arg) => arg.startsWith("--") && !known.has(arg)) || (only && only.length === 0)) {
  console.error("usage: node scripts/sync-film-manifest.mjs <https-url | path> [--validate] [--check-media] [--only W05,W16]");
  process.exit(2);
}

async function read(location) {
  if (/^https:\/\//.test(location)) {
    const response = await fetch(location, { signal: AbortSignal.timeout(20_000) });
    if (!response.ok) throw new Error(`${location}: HTTP ${response.status}`);
    return response.text();
  }
  if (/^[a-z]+:\/\//i.test(location)) throw new Error(`${location}: only https URLs or local paths`);
  return readFile(location, "utf8");
}

const manifest = parseFilmManifest(JSON.parse(await read(source)));
if (only) {
  const missing = only.filter((id) => !manifest.episodes.some((film) => film.id === id));
  if (missing.length > 0) throw new Error(`film manifest: --only names films the manifest lacks: ${missing.join(", ")}`);
  manifest.episodes = manifest.episodes.filter((film) => only.includes(film.id));
}
const summary = manifest.episodes.map((film) => `${film.id} v${film.version}`).join(", ") || "no films";

if (checkMedia) {
  const problems = [];
  for (const film of manifest.episodes) {
    const files = [];
    for (const format of Object.values(film.formats)) {
      files.push({ path: format.file, bytes: format.bytes });
      if (format.web) files.push({ path: format.web.file, bytes: format.web.bytes });
    }
    for (const path of Object.values(film.poster)) files.push({ path });
    for (const file of files) {
      const url = filmUrl(manifest.base, file.path);
      const response = await fetch(url, { method: "HEAD", signal: AbortSignal.timeout(20_000) });
      const length = Number(response.headers.get("content-length"));
      if (!response.ok) problems.push(`${url}: HTTP ${response.status}`);
      else if (file.bytes !== undefined && length !== file.bytes) problems.push(`${url}: ${length} bytes, manifest says ${file.bytes}`);
    }
  }
  if (problems.length > 0) throw new Error(`film media check failed:\n${problems.join("\n")}`);
  console.log("film media: every file answers with the manifest's size");
}

if (validateOnly) {
  console.log(`film manifest: valid schema 1 (${summary}); nothing written`);
  process.exit(0);
}

const target = new URL("../src/content/films/manifest.json", import.meta.url);
await mkdir(new URL(".", target), { recursive: true });
await writeFile(target, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`film manifest: ${summary} written to src/content/films/manifest.json`);
