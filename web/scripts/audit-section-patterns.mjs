import { readFile } from "node:fs/promises";

const pages = [
  { name: "www", path: new URL("../dist/index.html", import.meta.url), minimum: 9 },
  // Aithema's open-source core is published (INSPR-528), but its integration
  // and architecture rails wait for published evidence from that core. The
  // explicit zero-rail contract keeps every visible section under this audit.
  { name: "aithema", path: new URL("../dist/aithema/index.html", import.meta.url), minimum: 11, expectedRails: 0 },
  { name: "pharos", path: new URL("../dist/pharos/index.html", import.meta.url), minimum: 15, expectedRails: 2 },
  { name: "janus", path: new URL("../dist/janus/index.html", import.meta.url), minimum: 13, expectedRails: 2 },
  // The German product editions render through the same components, so they
  // must satisfy exactly the structural budget of their English originals.
  { name: "aithema-de", path: new URL("../dist/aithema/de/index.html", import.meta.url), minimum: 11, expectedRails: 0 },
  { name: "pharos-de", path: new URL("../dist/pharos/de/index.html", import.meta.url), minimum: 15, expectedRails: 2 },
  { name: "janus-de", path: new URL("../dist/janus/de/index.html", import.meta.url), minimum: 13, expectedRails: 2 },
  // INSPR-492: the AEON page at /paimos tells its own story without the shared
  // inspectable rails; both editions carry the same thirteen visible blocks.
  // INSPR-544: the engine section took the place of the retired Journey.
  { name: "paimos", path: new URL("../dist/paimos/index.html", import.meta.url), minimum: 13, expectedRails: 0 },
  { name: "paimos-de", path: new URL("../dist/paimos/de/index.html", import.meta.url), minimum: 13, expectedRails: 0 },
];

for (const page of pages) {
  const html = await readFile(page.path, "utf8");
  const patterns = [...html.matchAll(/data-section-pattern="([^"]+)"/g)].map((match) => match[1]);
  const sectionTags = html.match(/<section(?:\s[^>]*)?>/g) ?? [];
  const sectionCount = sectionTags.length;
  const counts = new Map();
  for (const pattern of patterns) counts.set(pattern, (counts.get(pattern) ?? 0) + 1);

  if (patterns.length < page.minimum) {
    throw new Error(`${page.name}: only ${patterns.length} of ${page.minimum} expected content blocks declare a presentation pattern`);
  }

  // INSPR-555: every rendered section declares its pattern. A non-section
  // block (a list, a group) may declare one too; the old count equality only
  // held when one unpatterned section and one such block cancelled out.
  const unpatterned = sectionTags.filter((tag) => !tag.includes("data-section-pattern="));
  if (unpatterned.length > 0) {
    throw new Error(`${page.name}: ${unpatterned.length} of ${sectionCount} sections declare no presentation pattern: ${unpatterned.map((tag) => tag.slice(0, 80)).join(" | ")}`);
  }

  const repeated = [...counts].filter(([, count]) => count > 2);
  if (repeated.length > 0) {
    throw new Error(`${page.name}: visible pattern budget exceeded: ${repeated.map(([pattern, count]) => `${pattern}=${count}`).join(", ")}`);
  }

  if (Number.isInteger(page.expectedRails)) {
    const rails = (html.match(/class="inspectable-rail(?:\s|\")/g) ?? []).length;
    if (rails !== page.expectedRails) {
      throw new Error(`${page.name}: expected exactly ${page.expectedRails} inspectable rails, found ${rails}`);
    }
  }

  console.log(`${page.name}: ${sectionCount} sections, ${counts.size} visible patterns, maximum reuse ${Math.max(...counts.values())}`);
}
