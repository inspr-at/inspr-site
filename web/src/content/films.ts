import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { filmUrl, orderFilms, parseFilmManifest } from "../../film-manifest.mjs";

// INSPR-572: the showreel reads the committed snapshot of VID's public manifest
// (scripts/sync-film-manifest.mjs writes it). No snapshot means no cleared film
// yet, and paimos.com renders without its showreel. A local build may preview
// another manifest through PAIMOS_FILM_MANIFEST, with films served from this
// computer, so a person can see cut and page together before clearing a film.
// A release build never does, so what ships is always the reviewed snapshot.
const snapshots = import.meta.glob("./films/manifest.json", { eager: true, import: "default" });

function loadManifest() {
  const override = process.env.PAIMOS_FILM_MANIFEST;
  if (override) {
    if (process.env.INSPR_RELEASE_ID) {
      throw new Error("PAIMOS_FILM_MANIFEST is for local previews; a release reads src/content/films/manifest.json");
    }
    return parseFilmManifest(JSON.parse(readFileSync(resolve(override), "utf8")), { allowLoopbackBase: true });
  }
  const snapshot = snapshots["./films/manifest.json"];
  return snapshot ? parseFilmManifest(snapshot) : null;
}

export interface FilmSource {
  src: string;
  width: number;
  height: number;
}

export interface Film {
  id: string;
  version: number;
  question: string;
  answer: string;
  /** The film's words in order with their timing, then its end card (tagline, subline, link). */
  words: Array<{ kind: string; text: string; start?: number; end?: number }>;
  durationSeconds: number;
  published: string;
  /**
   * Per orientation: the full file and, when VID ships one, the lighter web
   * rendition. The player picks one per screen and connection.
   */
  video: Record<"16x9" | "9x16", { full: FilmSource; web?: FilmSource }>;
  /** Full-size posters: the small ones are thumbnails, too soft for the stage. */
  poster: Record<"16x9" | "9x16", string>;
}

const manifest = loadManifest();

export const filmBase = manifest ? new URL(manifest.base).origin : undefined;

export const films: Film[] = manifest
  ? orderFilms(manifest.episodes).map((film) => {
      const url = (path: string) => filmUrl(manifest.base, path);
      const source = (rendition: { file: string; width: number; height: number }) => ({
        src: url(rendition.file),
        width: rendition.width,
        height: rendition.height,
      });
      const video = (format: "16x9" | "9x16") => {
        const { web } = film.formats[format];
        return { full: source(film.formats[format]), web: web ? source(web) : undefined };
      };
      return {
        id: film.id,
        version: film.version,
        question: film.question,
        answer: film.answer,
        words: [
          ...film.words.map((word) => ({ kind: word.kind, text: word.text, start: word.start_s, end: word.end_s })),
          ...[film.tagline, film.subline, film.link]
            .filter((line): line is string => line !== undefined)
            .map((line) => ({ kind: "endcard", text: line })),
        ],
        durationSeconds: film.duration_s,
        published: film.published,
        video: { "16x9": video("16x9"), "9x16": video("9x16") },
        poster: { "16x9": url(film.poster["16x9"]), "9x16": url(film.poster["9x16"]) },
      };
    })
  : [];
