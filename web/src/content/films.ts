import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { filmViews, parseFilmManifest, type FilmView } from "../../film-manifest.mjs";

// INSPR-572: the films paimos.com renders into its HTML come from the
// committed snapshot of VID's public manifest (scripts/sync-film-manifest.mjs
// writes it). No snapshot means no cleared film yet, and paimos.com renders
// without its player. On the page, the player then reads the live manifest
// from the media host and shows what is cleared there, so a newly cleared film
// plays before the next release refreshes the snapshot.
//
// A local build may preview another manifest through PAIMOS_FILM_MANIFEST,
// with films served from this computer; a release build refuses that override.
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

export type Film = FilmView;

const manifest = loadManifest();

/** Where the player looks for the live manifest: next to the films. */
export const filmManifestUrl = manifest ? new URL("manifest.json", manifest.base).href : undefined;

export const films: Film[] = manifest ? filmViews(manifest) : [];
