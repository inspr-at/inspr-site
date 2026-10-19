// INSPR-572: copy VID's public film manifest into the committed snapshot.
//
//   node scripts/sync-film-manifest.mjs <https-url | path> [--check-media]
//
// The manifest is validated and normalised (film-manifest.mjs) before
// anything is written, so the snapshot only ever holds the fields the site
// renders. --check-media sends a HEAD request for every video and poster and
// compares each video's Content-Length with the manifest; it downloads nothing.
// Commit the snapshot and deploy; the films themselves never enter git.
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { filmUrl, parseFilmManifest } from "../film-manifest.mjs";

const [source, ...flags] = process.argv.slice(2);
if (!source || flags.some((flag) => flag !== "--check-media")) {
  console.error("usage: node scripts/sync-film-manifest.mjs <https-url | path> [--check-media]");
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

if (flags.includes("--check-media")) {
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

const target = new URL("../src/content/films/manifest.json", import.meta.url);
await mkdir(new URL(".", target), { recursive: true });
await writeFile(target, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`film manifest: ${manifest.episodes.length} film(s) written to src/content/films/manifest.json`);
