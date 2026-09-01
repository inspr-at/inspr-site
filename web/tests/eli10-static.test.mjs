import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const sourceUrl = new URL("../src/", import.meta.url);

async function source(relativePath) {
  return readFile(new URL(relativePath, sourceUrl), "utf8");
}

test("ELI10 presents the promise and human-controlled product path", async () => {
  const page = await source("pages/eli10/index.astro");

  assert.match(page, /Inspiration is<br \/>the only limit\./);
  assert.match(page, /The tools handle the difficult parts\./);
  assert.match(page, /You decide at every handoff/);
  assert.match(page, /the work remains yours/);

  const names = [...page.matchAll(/name: "(Aithema|Paimos|Pharos|Janus)"/g)]
    .map((match) => match[1]);
  assert.deepEqual(names, ["Aithema", "Paimos", "Pharos", "Janus"]);
  assert.equal((page.match(/handoff: /g) || []).length, 4);
});

test("ELI10 keeps current and future product claims accurate", async () => {
  const page = await source("pages/eli10/index.astro");

  assert.match(page, /waits for you to press Continue/);
  assert.match(page, /staged version you can try before it goes live/);
  assert.match(page, /proves there is a backup, then waits before production/);
  assert.match(page, /permits you approved/);
  assert.match(page, /rotates access keys without ever revealing them/);
  assert.match(page, /reusable open-source module is planned/);
  assert.match(page, /Augmentoring provides professional services only/);
  assert.doesNotMatch(page, /users, roles|ZITADEL integration/i);
});

test("ELI10 has a bounded responsive layout and accessible navigation", async () => {
  const [page, styles] = await Promise.all([
    source("pages/eli10/index.astro"),
    source("styles/eli10.css"),
  ]);

  assert.match(page, /class="eli-skip" href="#main-content"/);
  assert.match(page, /aria-labelledby="path-title"/);
  assert.match(page, /aria-label="The INSPR promise"/);
  assert.match(styles, /max-height: 824px/);
  assert.match(styles, /min-height: 700px/);
  assert.match(styles, /@media \(max-width: 680px\)/);
  assert.match(styles, /@media \(prefers-reduced-motion: reduce\)/);
  assert.doesNotMatch(styles, /animation:/);
});
