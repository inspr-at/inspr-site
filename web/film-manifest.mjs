// INSPR-572: the public film manifest the paimos.com showreel consumes.
//
// VID produces and versions the "What if…?" films and publishes one manifest
// (schema 1) next to them on the media host. This module is the only reader:
// the sync script, the build and the tests all go through parseFilmManifest,
// so a manifest that does not match the contract fails the build instead of
// rendering half a film. Files under <ep>/v<n>/ are immutable; only the
// manifest changes, and the site picks a change up through a committed,
// normalised snapshot (src/content/films/manifest.json).
//
// Agreed with VID (2026-10-19): the public manifest lists only films Markus
// cleared, and only their newest public version. It carries no names, ticket
// keys or approval records, so a `public_ok` field is refused here. `.web`
// renditions and `*_small` posters are optional additions within schema 1.

export const FILM_MANIFEST_SCHEMA = 1;

// PW decides the carousel order (VID's list order is only a suggestion).
// W05 carries the widest pain, W16 and W09 go deeper. Films not named here
// follow in manifest order.
export const FILM_ORDER = ["W05", "W16", "W09"];

const FORMATS = ["16x9", "9x16"];
const POSTERS = ["16x9", "9x16", "16x9_small", "9x16_small"];
const REQUIRED_POSTERS = ["16x9", "9x16"];

const isObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const isText = (value) => typeof value === "string" && value.trim() !== "";

function fail(where, message) {
  throw new Error(`film manifest: ${where}: ${message}`);
}

function text(value, where) {
  if (!isText(value)) fail(where, "must be a non-empty string");
  return value.trim();
}

function optionalText(value, where) {
  return value === undefined ? undefined : text(value, where);
}

function number(value, where, { min = 0, integer = false } = {}) {
  if (typeof value !== "number" || !Number.isFinite(value)) fail(where, "must be a number");
  if (integer && !Number.isInteger(value)) fail(where, "must be an integer");
  if (value < min) fail(where, `must be at least ${min}`);
  return value;
}

// Every media path is relative to `base` and stays inside the film's own
// immutable version directory, so a manifest can never point a page at a
// different origin or at another film's files.
function mediaPath(value, where, prefix, extensions) {
  const path = text(value, where);
  if (!path.startsWith(prefix)) fail(where, `must start with ${prefix}`);
  if (/[\\?#%]|:\/\/|^\/|(^|\/)\.\.?(\/|$)|\/\//.test(path)) fail(where, "must be a plain relative path");
  if (!extensions.test(path)) fail(where, "has an unsupported file type");
  return path;
}

function rendition(value, where, prefix, orientation) {
  if (!isObject(value)) fail(where, "must be an object");
  const result = {
    file: mediaPath(value.file, `${where}.file`, prefix, /\.mp4$/),
    width: number(value.width, `${where}.width`, { min: 1, integer: true }),
    height: number(value.height, `${where}.height`, { min: 1, integer: true }),
    fps: number(value.fps, `${where}.fps`, { min: 1 }),
    bytes: number(value.bytes, `${where}.bytes`, { min: 1, integer: true }),
    sha256: text(value.sha256, `${where}.sha256`),
  };
  if (!/^[0-9a-f]{64}$/.test(result.sha256)) fail(`${where}.sha256`, "must be 64 lowercase hex digits");
  const landscape = result.width > result.height;
  if ((orientation === "16x9") !== landscape) fail(where, `is not ${orientation}`);
  return result;
}

function parseFilm(value, index, duplicates) {
  const where = `episodes[${index}]`;
  if (!isObject(value)) fail(where, "must be an object");
  if ("public_ok" in value) fail(`${where}.public_ok`, "belongs in VID's internal export, never in the public manifest");

  const id = text(value.id, `${where}.id`);
  if (!/^[A-Z][A-Z0-9]{1,7}$/.test(id)) fail(`${where}.id`, "must look like W05");
  if (duplicates.has(id)) fail(`${where}.id`, `${id} appears twice; only the newest public version belongs here`);
  duplicates.add(id);
  const version = number(value.version, `${where}.version`, { min: 1, integer: true });
  const prefix = `${id.toLowerCase()}/v${version}/`;
  const duration = number(value.duration_s, `${where}.duration_s`);
  if (duration <= 0) fail(`${where}.duration_s`, "must be positive");

  if (!Array.isArray(value.words) || value.words.length === 0) fail(`${where}.words`, "must list the film's words");
  let previousStart = 0;
  const words = value.words.map((word, wordIndex) => {
    const at = `${where}.words[${wordIndex}]`;
    if (!isObject(word)) fail(at, "must be an object");
    const start = number(word.start_s, `${at}.start_s`);
    const end = number(word.end_s, `${at}.end_s`);
    if (end <= start) fail(at, "must end after it starts");
    if (start < previousStart) fail(at, "is out of order");
    if (end > duration + 0.5) fail(at, "ends after the film");
    previousStart = start;
    return {
      shot: number(word.shot, `${at}.shot`, { min: 1, integer: true }),
      kind: text(word.kind, `${at}.kind`),
      text: text(word.text, `${at}.text`),
      start_s: start,
      end_s: end,
    };
  });

  if (!isObject(value.formats)) fail(`${where}.formats`, "must be an object");
  const formats = {};
  for (const format of FORMATS) {
    const at = `${where}.formats.${format}`;
    const entry = value.formats[format];
    formats[format] = rendition(entry, at, prefix, format);
    if (entry.web !== undefined) formats[format].web = rendition(entry.web, `${at}.web`, prefix, format);
  }

  if (!isObject(value.poster)) fail(`${where}.poster`, "must be an object");
  const poster = {};
  for (const key of POSTERS) {
    if (value.poster[key] === undefined && !REQUIRED_POSTERS.includes(key)) continue;
    poster[key] = mediaPath(value.poster[key], `${where}.poster.${key}`, prefix, /\.(jpe?g|png|webp|avif)$/);
  }

  const published = text(value.published, `${where}.published`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(published) || Number.isNaN(Date.parse(`${published}T00:00:00Z`))) {
    fail(`${where}.published`, "must be a YYYY-MM-DD date");
  }

  return {
    id,
    version,
    question: text(value.question, `${where}.question`),
    answer: text(value.answer, `${where}.answer`),
    tagline: optionalText(value.tagline, `${where}.tagline`),
    subline: optionalText(value.subline, `${where}.subline`),
    link: optionalText(value.link, `${where}.link`),
    words,
    duration_s: duration,
    formats,
    poster,
    published,
  };
}

/**
 * Validates a schema-1 manifest and returns it normalised: only the fields the
 * site uses, in a fixed order, so the committed snapshot carries nothing else.
 * A local preview may serve the films from this computer (allowLoopbackBase);
 * a snapshot or a release never can.
 */
export function parseFilmManifest(value, { allowLoopbackBase = false } = {}) {
  if (!isObject(value)) fail("manifest", "must be a JSON object");
  if (value.schema !== FILM_MANIFEST_SCHEMA) fail("schema", `must be ${FILM_MANIFEST_SCHEMA}`);
  const generated = text(value.generated, "generated");
  if (Number.isNaN(Date.parse(generated))) fail("generated", "must be an ISO 8601 timestamp");

  const base = text(value.base, "base");
  let baseUrl;
  try {
    baseUrl = new URL(base);
  } catch {
    fail("base", "must be an absolute URL");
  }
  const loopback = allowLoopbackBase && baseUrl.protocol === "http:" && ["127.0.0.1", "localhost"].includes(baseUrl.hostname);
  if (baseUrl.protocol !== "https:" && !loopback) fail("base", "must use https");
  if (baseUrl.username || baseUrl.password || baseUrl.search || baseUrl.hash) fail("base", "must be a plain URL");
  if (!base.endsWith("/")) fail("base", "must end with /");

  if (!Array.isArray(value.episodes)) fail("episodes", "must be a list");
  const duplicates = new Set();
  const episodes = value.episodes.map((film, index) => parseFilm(film, index, duplicates));
  return { schema: FILM_MANIFEST_SCHEMA, generated, base: baseUrl.href, episodes };
}

/** The films in carousel order: FILM_ORDER first, the rest as listed. */
export function orderFilms(episodes, order = FILM_ORDER) {
  const rank = (film) => {
    const index = order.indexOf(film.id);
    return index === -1 ? order.length : index;
  };
  return episodes
    .map((film, index) => ({ film, index }))
    .sort((a, b) => rank(a.film) - rank(b.film) || a.index - b.index)
    .map(({ film }) => film);
}

/** An absolute URL for a manifest path; parseFilmManifest keeps it under base. */
export function filmUrl(base, path) {
  const url = new URL(path, base);
  if (!url.href.startsWith(base)) throw new Error(`film manifest: ${path} leaves ${base}`);
  return url.href;
}

/**
 * The films as the page shows them, in carousel order: absolute URLs, both
 * renditions per cut (the player picks one per screen), and the transcript as
 * the film's timed words followed by its end card. The build and the page's
 * live refresh share this one mapping.
 */
export function filmViews(manifest) {
  const url = (path) => filmUrl(manifest.base, path);
  const source = (rendition) => ({ src: url(rendition.file), width: rendition.width, height: rendition.height });
  const cut = (format) => ({ full: source(format), web: format.web ? source(format.web) : undefined });
  return orderFilms(manifest.episodes).map((film) => ({
    id: film.id,
    version: film.version,
    question: film.question,
    answer: film.answer,
    words: [
      ...film.words.map((word) => ({ kind: word.kind, text: word.text, start: word.start_s, end: word.end_s })),
      ...[film.tagline, film.subline, film.link]
        .filter((line) => line !== undefined)
        .map((line) => ({ kind: "endcard", text: line })),
    ],
    durationSeconds: film.duration_s,
    published: film.published,
    video: { "16x9": cut(film.formats["16x9"]), "9x16": cut(film.formats["9x16"]) },
    poster: { "16x9": url(film.poster["16x9"]), "9x16": url(film.poster["9x16"]) },
  }));
}
