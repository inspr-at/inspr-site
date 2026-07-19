import { readFile } from "node:fs/promises";

const pages = [
  { name: "www", path: new URL("../dist/index.html", import.meta.url), minimum: 9 },
  { name: "paimos", path: new URL("../dist/paimos/index.html", import.meta.url), minimum: 15 },
  { name: "pharos", path: new URL("../dist/pharos/index.html", import.meta.url), minimum: 15 },
  { name: "janus", path: new URL("../dist/janus/index.html", import.meta.url), minimum: 13 },
];

for (const page of pages) {
  const html = await readFile(page.path, "utf8");
  const patterns = [...html.matchAll(/data-section-pattern="([^"]+)"/g)].map((match) => match[1]);
  const sectionCount = (html.match(/<section(?:\s|>)/g) ?? []).length;
  const counts = new Map();
  for (const pattern of patterns) counts.set(pattern, (counts.get(pattern) ?? 0) + 1);

  if (patterns.length < page.minimum) {
    throw new Error(`${page.name}: only ${patterns.length} of ${page.minimum} expected content blocks declare a presentation pattern`);
  }

  if (patterns.length !== sectionCount) {
    throw new Error(`${page.name}: ${sectionCount} sections render, but ${patterns.length} declare a presentation pattern`);
  }

  const repeated = [...counts].filter(([, count]) => count > 2);
  if (repeated.length > 0) {
    throw new Error(`${page.name}: visible pattern budget exceeded: ${repeated.map(([pattern, count]) => `${pattern}=${count}`).join(", ")}`);
  }

  if (page.name !== "www") {
    const rails = (html.match(/class="inspectable-rail(?:\s|\")/g) ?? []).length;
    if (rails !== 2) {
      throw new Error(`${page.name}: expected exactly two inspectable rails, found ${rails}`);
    }
  }

  console.log(`${page.name}: ${sectionCount} sections, ${counts.size} visible patterns, maximum reuse ${Math.max(...counts.values())}`);
}
