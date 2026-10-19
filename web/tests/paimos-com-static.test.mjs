// INSPR-572: paimos.com, its film manifest contract and its edge.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { FILM_ORDER, filmUrl, orderFilms, parseFilmManifest } from "../film-manifest.mjs";

const webRoot = dirname(fileURLToPath(new URL("../package.json", import.meta.url)));
const read = (path) => readFile(join(webRoot, path), "utf8");
const fixture = async () => JSON.parse(await read("tests/fixtures/film-manifest.json"));

test("the fixture is schema 1 and the carousel order is W05, W16, W09, then the rest", async () => {
  const manifest = parseFilmManifest(await fixture());
  assert.deepEqual(FILM_ORDER, ["W05", "W16", "W09"]);
  assert.deepEqual(orderFilms(manifest.episodes).map((film) => film.id), ["W05", "W16", "W09", "W33"]);
  const w05 = manifest.episodes.find((film) => film.id === "W05");
  assert.equal(w05.formats["9x16"].web.width, 720);
  assert.equal(w05.poster["16x9_small"], "w05/v6/poster-16x9-small.jpg");
  const w16 = manifest.episodes.find((film) => film.id === "W16");
  assert.equal(w16.formats["16x9"].web, undefined, "web renditions are optional");
  assert.equal(w16.poster["16x9_small"], undefined, "small posters are optional");
});

test("the parser normalises: unknown fields never reach the snapshot", async () => {
  const raw = await fixture();
  raw.internal_note = "never";
  raw.episodes[0].panel_score = 9;
  const manifest = parseFilmManifest(raw);
  assert.deepEqual(Object.keys(manifest), ["schema", "generated", "base", "episodes"]);
  assert.ok(!("panel_score" in manifest.episodes[0]));
});

test("the parser fails closed on contract breaks", async () => {
  const cases = [
    ["public_ok is refused", (m) => { m.episodes[0].public_ok = { by: "someone" }; }, /public_ok/],
    ["schema must be 1", (m) => { m.schema = 2; }, /schema/],
    ["base must be https", (m) => { m.base = "http://media.example.com/films/"; }, /https/],
    ["base must end with a slash", (m) => { m.base = "https://media.example.com/films"; }, /end with/],
    ["paths stay in the film's version directory", (m) => { m.episodes[0].formats["16x9"].file = "w05/v5/16x9.mp4"; }, /must start with/],
    ["no parent segments", (m) => { m.episodes[0].poster["16x9"] = "w09/v6/../../w05/v6/x.jpg"; }, /plain relative path/],
    ["no absolute URLs", (m) => { m.episodes[0].poster["9x16"] = "w09/v6/https://evil.example/x.jpg"; }, /plain relative path/],
    ["orientation matches the format", (m) => { Object.assign(m.episodes[0].formats["9x16"], { width: 1920, height: 1080 }); }, /not 9x16/],
    ["sha256 is 64 hex digits", (m) => { m.episodes[0].formats["16x9"].sha256 = "…"; }, /sha256/],
    ["one entry per episode", (m) => { m.episodes.push(structuredClone(m.episodes[0])); }, /appears twice/],
    ["words stay in order", (m) => { m.episodes[0].words.reverse(); }, /out of order/],
    ["both posters are required", (m) => { delete m.episodes[0].poster["9x16"]; }, /poster\.9x16/],
  ];
  for (const [name, mutate, message] of cases) {
    const manifest = await fixture();
    mutate(manifest);
    assert.throws(() => parseFilmManifest(manifest), message, name);
  }
});

test("only a local preview may serve films from this computer", async () => {
  const manifest = await fixture();
  manifest.base = "http://127.0.0.1:8099/films/";
  assert.throws(() => parseFilmManifest(manifest), /https/);
  assert.equal(parseFilmManifest(manifest, { allowLoopbackBase: true }).base, "http://127.0.0.1:8099/films/");
  manifest.base = "http://media.example.com/films/";
  assert.throws(() => parseFilmManifest(manifest, { allowLoopbackBase: true }), /https/);

  const films = await read("src/content/films.ts");
  assert.match(films, /if \(process\.env\.INSPR_RELEASE_ID\) \{\s*throw new Error/, "a release build refuses the preview override");
  assert.match(films, /return snapshot \? parseFilmManifest\(snapshot\) : null;/, "the snapshot never allows a loopback base");
});

test("film URLs resolve under the manifest base", () => {
  assert.equal(filmUrl("https://media.inspr.at/films/", "w05/v6/16x9.mp4"), "https://media.inspr.at/films/w05/v6/16x9.mp4");
  assert.throws(() => filmUrl("https://media.inspr.at/films/", "https://other.example/x.mp4"), /leaves/);
});

test("the film gate needs the CSP that applies to paimos.com to allow the media origin", async () => {
  const root = await mkdtemp(join(tmpdir(), "inspr-film-gate-"));
  const gate = join(webRoot, "scripts/check-film-manifest.mjs");
  const caddyfile = join(webRoot, "../Caddyfile");
  const run = async (base, caddy = caddyfile) => {
    const manifest = await fixture();
    manifest.base = base;
    const snapshot = join(root, `${base.length}.json`);
    await writeFile(snapshot, JSON.stringify(manifest));
    return spawnSync(process.execPath, [gate, snapshot, caddy], { encoding: "utf8" });
  };
  const allowed = await run("https://media.inspr.at/films/");
  assert.equal(allowed.status, 0, allowed.stderr);
  const blocked = await run("https://media.example.com/films/");
  assert.notEqual(blocked.status, 0);
  assert.match(blocked.stderr, /media-src does not allow https:\/\/media\.example\.com/);
});

test("paimos.com is its own host with robots and sitemap, built into paimos-com/", async () => {
  const robots = await read("public/paimos-com/robots.txt");
  const sitemap = await read("public/paimos-com/sitemap.xml");
  assert.match(robots, /Sitemap: https:\/\/paimos\.com\/sitemap\.xml/);
  assert.ok(sitemap.includes("<loc>https://paimos.com/</loc>"));
  assert.match(await read("src/pages/paimos-com/index.astro"), /<PaimosLanding \/>/);
  assert.match(await read("src/content/urls.ts"), /paimosCom: "https:\/\/paimos\.com"/);
  const deploy = await read("../deploy.sh");
  assert.match(deploy, /"paimos-com\/index\.html"/);
  assert.match(deploy, /test -f '\$REMOTE_INCOMING\/paimos-com\/index\.html'/);
  assert.match(await read("scripts/audit-section-patterns.mjs"), /name: "paimos-com"/);
});

test("the edge serves paimos.com, folds www onto the apex and keeps media.inspr.at to films", async () => {
  const caddy = await read("../Caddyfile");
  assert.match(caddy, /@paimos_com host paimos\.com\n\thandle @paimos_com \{\n\t\troot \* \/srv\/releases\/current\/paimos-com/);
  assert.match(caddy, /@paimos_com_www host www\.paimos\.com\n\tredir @paimos_com_www https:\/\/paimos\.com\{uri\} 308/);
  assert.match(caddy, /path \/paimos-com \/paimos-com\/\*\n\t\}\n\tredir @paimos_com_on_www https:\/\/paimos\.com\/ 308/);
  for (const matcher of ["@current_hashed", "@current_public"]) {
    const block = caddy.slice(caddy.indexOf(`${matcher} {`), caddy.indexOf("}", caddy.indexOf(`${matcher} {`)));
    assert.match(block, /janus\.inspr\.at paimos\.com\n/, `${matcher} includes paimos.com`);
  }

  const media = caddy.slice(caddy.indexOf("handle @media_host {"), caddy.indexOf("# INSPR-572: paimos.com, the front door"));
  assert.match(media, /@media_file path_regexp \^\/films\/\[a-z0-9\]\+\/v\[1-9\]\[0-9\]\*\/\[A-Za-z0-9\]\[A-Za-z0-9\._-\]\*\$/);
  assert.match(media, /@media_manifest path \/films\/manifest\.json/);
  assert.match(media, /handle @media_file \{\n\t\t\troot \* \/srv\/media\n\t\t\theader Cache-Control "public, max-age=31536000, immutable"\n\t\t\tfile_server\n/);
  assert.match(media, /handle @media_manifest \{\n\t\t\troot \* \/srv\/media\n\t\t\theader Cache-Control "public, max-age=300"\n\t\t\tfile_server\n/);
  assert.match(media, /handle \{\n\t\t\trespond "404 Not Found" 404/);
  assert.doesNotMatch(media, /browse/);

  // CORP lives outside the deferred shared header block, so the media host
  // can differ; every other host stays same-origin.
  const shared = caddy.match(/\n\theader \{([\s\S]*?)\n\t\}/)[1];
  assert.doesNotMatch(shared, /Cross-Origin-Resource-Policy/);
  assert.match(caddy, /header @not_media_host Cross-Origin-Resource-Policy "same-origin"/);
  assert.match(caddy, /header @media_host Cross-Origin-Resource-Policy "cross-origin"/);
  assert.match(shared, /img-src 'self' data: https:\/\/media\.inspr\.at;/);
  assert.match(shared, /media-src 'self' https:\/\/media\.inspr\.at;/);
  assert.match(caddy, /handle_errors \{\n\t\t# [^\n]+\n\t\theader Cache-Control "no-store"/);
  // The privacy notice says the servers keep no access logs.
  assert.doesNotMatch(caddy, /^\s*log(\s|$)/m);
});

test("the privacy notice names paimos.com and media.inspr.at in both languages", async () => {
  const legal = await read("src/content/legal.ts");
  for (const phrase of [
    "janus.inspr.at, paimos.com and media.inspr.at",
    "janus.inspr.at, paimos.com und media.inspr.at",
    "The films on paimos.com and their preview images come from media.inspr.at",
    "Die Filme auf paimos.com und ihre Vorschaubilder kommen von media.inspr.at",
    "media.inspr.at is not delivered through Cloudflare.",
    "media.inspr.at wird nicht über Cloudflare ausgeliefert.",
  ]) assert.ok(legal.includes(phrase), phrase);
  assert.match(await read("scripts/audit-privacy-facts.mjs"), /\["https:\/\/media\.inspr\.at", "[^"]+"\]/);
});

test("paimos.com copy keeps to the agreed words", async () => {
  const content = await read("src/content/paimos-com.ts");
  const component = await read("src/components/PaimosLanding.astro");
  assert.match(content, /title: "The self-improving software factory\."/);
  assert.ok(!(content + component).includes("—"), "no em dash");
  // Positions, not claims: no compliance, EU or regulation lines before legal sign-off.
  const copy = content.replace(/^\s*\/\/.*$/gm, "");
  assert.doesNotMatch(copy, /GDPR|DSGVO|\bEU\b|Europe|compliance|compliant|AI Act/i);
  assert.match(component, /\{hasFilms && \(/, "the showreel renders only with a cleared film");
  assert.match(component, /preload="none"/);
  assert.match(component, /muted\s+playsinline/);
});
