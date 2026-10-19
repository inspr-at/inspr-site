// INSPR-572: types for film-manifest.mjs (the normalised schema-1 manifest).

export interface FilmRendition {
  file: string;
  width: number;
  height: number;
  fps: number;
  bytes: number;
  sha256: string;
}

export interface FilmFormat extends FilmRendition {
  web?: FilmRendition;
}

export interface FilmWord {
  shot: number;
  kind: string;
  text: string;
  start_s: number;
  end_s: number;
}

export interface FilmEpisode {
  id: string;
  version: number;
  question: string;
  answer: string;
  tagline?: string;
  subline?: string;
  link?: string;
  words: FilmWord[];
  duration_s: number;
  formats: Record<"16x9" | "9x16", FilmFormat>;
  poster: Record<"16x9" | "9x16", string> & Partial<Record<"16x9_small" | "9x16_small", string>>;
  published: string;
}

export interface FilmManifest {
  schema: 1;
  generated: string;
  base: string;
  episodes: FilmEpisode[];
}

export const FILM_MANIFEST_SCHEMA: 1;
export const FILM_ORDER: string[];
export function parseFilmManifest(value: unknown, options?: { allowLoopbackBase?: boolean }): FilmManifest;
export function orderFilms(episodes: FilmEpisode[], order?: string[]): FilmEpisode[];
export function filmUrl(base: string, path: string): string;
