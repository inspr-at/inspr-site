// INSPR-572: the build gate for the paimos.com films. It validates the
// committed manifest snapshot and, once it lists a film, requires the edge to
// let paimos.com load that media origin: the Content-Security-Policy that
// applies to the public paimos.com pages must name the
// manifest's origin in media-src and img-src, or every film would be blocked.
// The privacy-facts audit separately refuses a media origin the privacy notice
// does not name.
import { readFile } from "node:fs/promises";
import { parseFilmManifest } from "../film-manifest.mjs";

// Tests pass a snapshot and a Caddyfile; the build uses the committed ones.
const [snapshotArg, caddyfileArg] = process.argv.slice(2);
const snapshotUrl = snapshotArg ?? new URL("../src/content/films/manifest.json", import.meta.url);
const caddyfileUrl = caddyfileArg ?? new URL("../../Caddyfile", import.meta.url);

let raw;
try {
  raw = await readFile(snapshotUrl, "utf8");
} catch (error) {
  if (error.code !== "ENOENT") throw error;
  console.log("film manifest: no snapshot; paimos.com renders without its showreel");
  process.exit(0);
}

const manifest = parseFilmManifest(JSON.parse(raw));
if (manifest.episodes.length === 0) {
  console.log("film manifest: no cleared film; paimos.com renders without its showreel");
  process.exit(0);
}

const origin = new URL(manifest.base).origin;
const caddyfile = await readFile(caddyfileUrl, "utf8");
const block = caddyfile.match(/handle @paimos_com \{([\s\S]*?)\n\t\}/)?.[1];
if (!block) throw new Error("film manifest: the Caddyfile has no `handle @paimos_com` block");
const shared = caddyfile.match(/\n\theader \{([\s\S]*?)\n\t\}/)?.[1] ?? "";
const publicPages = caddyfile.match(/\n\theader @not_paimos_admin \{([\s\S]*?)\n\t\}/)?.[1] ?? "";
const policy = (block.match(/Content-Security-Policy "([^"]+)"/) ?? publicPages.match(/Content-Security-Policy "([^"]+)"/) ?? shared.match(/Content-Security-Policy "([^"]+)"/))?.[1];
if (!policy) throw new Error("film manifest: no Content-Security-Policy applies to paimos.com");
const directive = (name) =>
  policy.split(";").map((part) => part.trim().split(/\s+/)).find(([key]) => key === name)?.slice(1) ?? [];
for (const name of ["media-src", "img-src"]) {
  if (!directive(name).includes(origin)) {
    throw new Error(`film manifest: paimos.com ${name} does not allow ${origin}`);
  }
}
console.log(`film manifest: ${manifest.episodes.length} film(s) from ${origin}, allowed by the paimos.com CSP`);
