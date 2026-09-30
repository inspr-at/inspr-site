import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

// INSPR-497: the AEON page at three levels. simple is Why (results, for
// readers without a technical background), standard is What (the page as
// before and the edition without JavaScript), technical is How (depth for
// developers and IT). These tests pin the level map documented at the top of
// AeonPage.astro, the copy slots, the three-level content in both editions
// and the plaque's marketing name with its version chip.
const webUrl = new URL("../", import.meta.url);
const source = (path) => readFile(new URL(`src/${path}`, webUrl), "utf8");
const editions = [
  { locale: "en", file: "content/paimos-aeon.ts" },
  { locale: "de", file: "content/de/paimos-aeon.ts" },
];

// The opening tag of the element that carries a class or id, attributes only.
const tagOf = (text, needle) => {
  const at = text.indexOf(needle);
  assert.ok(at >= 0, `missing ${needle}`);
  const start = text.lastIndexOf("<", at);
  return text.slice(start, text.indexOf(">", at) + 1);
};

test("the level map: what Why hides, and where How adds verified facts", async () => {
  const page = await source("components/AeonPage.astro");
  // Hidden at Why, shown from What up.
  for (const needle of ['id="rules"', 'id="architecture"', 'class="aeon-ribbon"', 'class="aeon-pairing"', 'class="aeon-good"', 'class="aeon-proof aeon-proof--ink"']) {
    assert.match(tagOf(page, needle), /data-depth-min="standard"/, `${needle} is hidden at Why`);
  }
  // Shown at every level.
  for (const id of ["screens", "control-room", "next", "open-source"]) {
    assert.doesNotMatch(tagOf(page, `id="${id}"`), /data-depth-m(in|ax)=/, `#${id} shows at every level`);
  }
  for (const needle of ['class="aeon-hero"', 'class="aeon-figures page-shell"', 'class="section page-shell faq"']) {
    assert.doesNotMatch(tagOf(page, needle), /data-depth-m(in|ax)=/, `${needle} shows at every level`);
  }
  // Figures and FAQ items carry their own range and glide when neighbours change.
  assert.match(page, /<li data-reveal data-flip data-depth-min=\{figure\.depthMin\}>/);
  assert.match(page, /<details data-flip data-depth-min=\{item\.depthMin\} data-depth-max=\{item\.depthMax\}>/);
  // How: verified facts under control room, rules and architecture, and authority.
  assert.equal([...page.matchAll(/<AeonDeep deep=\{content\.(controlRoom|rules|architecture)\.deep\}/g)].length, 3);
  const authority = await source("components/AeonAuthority.astro");
  assert.match(authority, /<AeonDeep deep=\{content\.deep\} id="authority-deep" version=\{version\} locale=\{locale\} \/>/);
  assert.match(authority, /<p class="aeon-proof" data-depth-min="standard">/);
  const journey = await source("components/AeonJourney.astro");
  assert.match(journey, /<p class="aeon-proof" data-depth-min="standard">/);
  assert.match(journey, /<p class="aeon-stage__summary aeon-stage__detail" data-depth-min="standard">\s*<DetailLevels/);
  const deep = await source("components/AeonDeep.astro");
  assert.match(deep, /data-depth-min="technical"/, "the How facts show at How only");
  // The map is documented where the markup lives.
  assert.match(page, /INSPR-497: the page at three levels/);
  assert.match(page, /section\s+Why\s+What\s+How/);
});

test("every changing sentence sits in exactly one copy slot with one child per level", async () => {
  // DetailLevels renders the slot itself, so an outer [data-copy-slot] around
  // it would nest two slots and leave the outer one without variants.
  for (const file of ["components/AeonPage.astro", "components/AeonAuthority.astro", "components/AeonJourney.astro"]) {
    const text = await source(file);
    const uses = [...text.matchAll(/<DetailLevels/g)].length;
    const doubled = [...text.matchAll(/data-copy-slot>\s*<DetailLevels/g)].length;
    assert.ok(uses > 0, `${file} uses DetailLevels`);
    assert.equal(doubled, 0, `${file}: no [data-copy-slot] wraps a DetailLevels`);
  }
  const grid = await source("components/SpecsGrid.astro");
  assert.match(grid, /specs__slide-note" id=\{`specs-slide-note-\$\{pad\(i \+ 1\)\}`\}>\s*<DetailLevels/);
  assert.match(grid, /\{specs\.lead && field && \(\s*<p class="section-lead">\s*<DetailLevels/);
  assert.doesNotMatch(grid, /data-copy-slot>\s*<DetailLevels/, "SpecsGrid: no doubled slot");
  // The other pages keep their ELI10 toggle markup unchanged.
  assert.match(grid, /\{specs\.lead && !field && \(\s*<p class="section-lead">\s*<span class="specs__variant specs__variant--tech">/);
  const levels = await source("components/DetailLevels.astro");
  for (const level of ["simple", "standard", "technical"]) assert.match(levels, new RegExp(`data-copy-level="${level}"`));
});

test("both editions carry Why, What and How for every slot, and no placeholders", async () => {
  for (const { locale, file } of editions) {
    const text = await source(file);
    assert.doesNotMatch(text, /"[^"\n]*TODO[^"\n]*"/, `${locale}: no placeholder copy`);
    // Every depths block has a Why and a How sentence of its own.
    const blocks = [...text.matchAll(/depths: \{\n\s+simple:\s*\n?\s*"([^"]+)",\n\s+technical:\s*\n?\s*"([^"]+)",/g)];
    // Nine sections (hero, screens, control room, authority, rules, delivery,
    // architecture, what is coming, open source) and six FAQ items.
    assert.equal(blocks.length, 15, `${locale}: every section and every FAQ item has depths`);
    for (const [, why, how] of blocks) {
      assert.ok(why.length > 20 && how.length > 20, `${locale}: a full sentence at Why and How`);
    }
    // The capability cards: twenty, each with a Why and a How note.
    const notes = [...text.matchAll(/noteEli10: "([^"]+)",\n\s+noteHow: "([^"]+)",/g)];
    assert.equal(notes.length, 20, `${locale}: twenty cards with Why and How notes`);
    assert.match(text, /leadHow: "[^"]{30,}"/, `${locale}: a How lead for the specs`);
    // How: four blocks of verified facts, each with several rows.
    const deeps = [...text.matchAll(/deep: \{\n\s+title: "([^"]+)",\n\s+items: \[\n((?:\s+\{ term: "[^"]+", body: "[^"]+" \},\n)+)/g)];
    assert.equal(deeps.length, 4, `${locale}: control room, authority, rules and architecture`);
    for (const [, , rows] of deeps) assert.ok(rows.match(/term:/g).length >= 4, `${locale}: at least four facts per block`);
    // The FAQ: one question only at Why, two only at How.
    assert.equal((text.match(/depthMax: "simple"/g) ?? []).length, 1, `${locale}: one Why-only question`);
    assert.equal((text.match(/depthMin: "technical"/g) ?? []).length, 2, `${locale}: two How-only questions`);
    assert.equal((text.match(/depthMin: "standard"/g) ?? []).length, 2, `${locale}: two figures from What up`);
    // The Deploy stage: its target line shows from What up, recorded, not enforced.
    const detail = text.match(/detail: \{\n\s+standard: "([^"]+)",\n\s+technical:\s*\n?\s*"([^"]+)",/);
    assert.ok(detail, `${locale}: the Deploy stage has a target line`);
    assert.match(detail[2], /not yet enforced|noch nicht durchgesetzt/, `${locale}: How says the target is not enforced`);
    assert.doesNotMatch(text, /The approval names its target|Die Freigabe nennt ihr Ziel/, `${locale}: no unqualified target claim`);
  }
});

test("no release numbers reach the reader: marketing names, and the version on hover", async () => {
  for (const { locale, file } of editions) {
    const text = await source(file);
    assert.doesNotMatch(text, /\bR\d{2}\b|14\.1|Release 1\d/i, `${locale}: no release numbers in visible copy`);
    // Running text carries no version at all: no {version} token, no raw
    // coordinate, no sequence number. A raw version stays only where a
    // command or image tag needs it (`:<version>`). The plaque's hover chip
    // and the footer chip are not running text. Strings only: the tag
    // constant is code.
    const strings = text.replace(/const tag = "v260930115354\.0\.0";/, "");
    assert.doesNotMatch(strings, /"[^"\n]*260930115354[^"\n]*"/, `${locale}: no raw version in running text`);
    assert.doesNotMatch(text, /\{version\}/, `${locale}: no inline version chip in running text`);
    assert.doesNotMatch(strings, /"[^"\n]*\b\d{12}\.0\.0\b[^"\n]*"/, `${locale}: no raw coordinate in any string`);
    assert.doesNotMatch(strings, /\b(?:Sequence|Sequenz)\s+\d+\b/i, `${locale}: no sequence number in running text`);
    assert.doesNotMatch(strings, /\b(?:sequence|Sequenz)\s*113\b/i, `${locale}: sequence 113 is not printed`);
    assert.match(text, /codename: "Hinged Hangar"/);
    assert.match(text, /label: "Intact Ion"/, `${locale}: the next release by its name`);
    assert.doesNotMatch(text, /label: "Release \d/);
  }
  const types = await source("content/types.ts");
  assert.doesNotMatch(types.slice(types.indexOf("export type AeonContent")), /publishedLabel|^\s+label: string;\n\s+version: string;/m);
  const text = await source("components/AeonText.astro");
  assert.match(text, /text\.split\("\{version\}"\)/);
  assert.match(text, /<CalendarVersion value=\{version\} scheme="inspr-calver-3" locale=\{locale\} \/>/);
  const deep = await source("components/AeonDeep.astro");
  assert.match(deep, /<dd><AeonText text=\{item\.body\}/);
  const plaque = await source("components/AeonReleasePlaque.astro");
  assert.match(plaque, /import CalendarVersion from "\.\/CalendarVersion\.astro";/, "the one calendar-version adapter draws the version");
  assert.match(plaque, /<CalendarVersion value=\{version\} scheme="inspr-calver-3" locale=\{locale\} \/>/);
  assert.doesNotMatch(plaque, /release\.label|<code>\{release\.version\}<\/code>|publishedLabel/, "no release label or raw tag on the plaque");
  assert.match(plaque, /const ariaLabel = `\$\{label\}: \$\{release\.name\} \$\{release\.codename\}, \$\{live\}, \$\{version\} · \$\{utc\}`;/, "the link names the version and its UTC time");
  assert.match(plaque, /<span class="aeon-plaque__version" data-plaque-version inert>/, "the floating chip is inert");
  // The version chip is no nested control: the link is a sibling stretched over the glass.
  assert.match(plaque, /<div class="aeon-plaque" data-plaque>/);
  assert.match(plaque, /<a class="aeon-plaque__link" href=\{release\.url\}[^>]*><\/a>/);
  const css = await source("styles/aeon-plaque.css");
  const row = css.slice(css.indexOf("  .aeon-plaque {"), css.indexOf("  .aeon-plaque-stage.has-lens"));
  assert.match(row, /display: inline-flex;/, "one row");
  assert.match(row, /flex-wrap: nowrap;/);
  assert.doesNotMatch(css, /grid-area/, "no grid rows left");
  const chip = css.slice(css.indexOf("  .aeon-plaque__version {"), css.indexOf("  .aeon-plaque__chip {"));
  assert.match(chip, /position: absolute;/, "the chip floats; revealing it moves nothing");
  assert.match(chip, /pointer-events: none;/);
  assert.match(chip, /transition:\s*opacity 280ms [^,]*,\s*transform 280ms [^;]*;/, "reveal with eased opacity and transform only");
  assert.match(chip, /\.aeon-plaque:is\(:hover, :focus-within, \.is-revealed\) \.aeon-plaque__version/);
  assert.match(css, /\.aeon-hero\.is-paused \.aeon-plaque__version \{\s*transition: none;/);
});
