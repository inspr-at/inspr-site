#!/usr/bin/env node
// INSPR-481: link check for the built site family.
import { readdir, readFile } from "node:fs/promises";
import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Crawl web/dist for <a href> and <link rel="canonical"|"alternate">.
// Internal targets must exist in the build. Host roots follow the Caddyfile:
// www.inspr.at and inspr.at use dist/, each product host uses dist/<product>/,
// and /_astro/*, /scripts/* plus the shared root icons are served from dist/
// on every current host. try_files is {path}, {path}.html, {path}/index.html.
// Redirects that Caddy applies before those files (apex, /eli10, /v1) are
// followed. /v1 leaves the family for v1.inspr.at, which is not in dist.
// --external probes every other URL once.

const DIST_DIR = fileURLToPath(new URL("../dist/", import.meta.url));
const TIMEOUT_MS = 15_000;
const CONCURRENCY = 4;
const HOST_CONCURRENCY = 2;
const RATE_LIMIT_RETRIES = 4;
// An honest agent string: some hosts (gnu.org) reject a spoofed browser.
const USER_AGENT = "inspr-site-link-check (+https://www.inspr.at)";

const FAMILY_HOSTS = new Set([
  "www.inspr.at",
  "inspr.at",
  "aithema.inspr.at",
  "paimos.inspr.at",
  "pharos.inspr.at",
  "janus.inspr.at",
]);

const PRODUCT_ROOTS = {
  "aithema.inspr.at": "aithema",
  "paimos.inspr.at": "paimos",
  "pharos.inspr.at": "pharos",
  "janus.inspr.at": "janus",
};

const SHARED_EXACT = new Set(["/favicon.svg", "/favicon.ico", "/og.jpg"]);

const externalMode = process.argv.includes("--external");

function decodeEntities(value) {
  return value.replace(/&(#x[0-9a-fA-F]+|#[0-9]+|[a-zA-Z]+);/g, (all, entity) => {
    const named = { amp: "&", lt: "<", gt: ">", quot: "\"", apos: "'" };
    if (named[entity]) return named[entity];
    if (entity[0] !== "#") return all;
    const hex = entity[1] === "x" || entity[1] === "X";
    const code = Number.parseInt(entity.slice(hex ? 2 : 1), hex ? 16 : 10);
    return Number.isFinite(code) ? String.fromCodePoint(code) : all;
  });
}

function stripNonDocument(html) {
  return html
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "");
}

function attributes(source) {
  const attrs = {};
  const re = /([^\s=/<>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
  for (const match of source.matchAll(re)) {
    const raw = match[2] ?? match[3] ?? match[4] ?? "";
    attrs[match[1].toLowerCase()] = decodeEntities(raw);
  }
  return attrs;
}

function extractLinks(html) {
  const links = [];
  const re = /<(a|link)\b([^>]*)>/gi;
  for (const match of html.matchAll(re)) {
    const tag = match[1].toLowerCase();
    const attrs = attributes(match[2]);
    if (!attrs.href) continue;
    if (tag === "a") {
      links.push({ href: attrs.href, kind: "a" });
      continue;
    }
    const rel = new Set((attrs.rel ?? "").toLowerCase().split(/\s+/).filter(Boolean));
    if (rel.has("canonical")) links.push({ href: attrs.href, kind: "canonical" });
    else if (rel.has("alternate")) links.push({ href: attrs.href, kind: "alternate" });
  }
  return links;
}

function collectIds(html) {
  const ids = new Set();
  const re = /\sid\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/gi;
  for (const match of html.matchAll(re)) {
    const id = decodeEntities(match[1] ?? match[2] ?? match[3] ?? "");
    if (id) ids.add(id);
  }
  return ids;
}

function pathnameForHtml(relPosix) {
  if (relPosix === "index.html") return "/";
  if (relPosix.endsWith("/index.html")) return `/${relPosix.slice(0, -"index.html".length)}`;
  return `/${relPosix}`;
}

function pageLocation(relPosix) {
  for (const product of Object.values(PRODUCT_ROOTS)) {
    const prefix = `${product}/`;
    if (relPosix === `${product}/index.html` || relPosix.startsWith(prefix)) {
      const under = relPosix.slice(prefix.length);
      return `https://${product}.inspr.at${pathnameForHtml(under)}`;
    }
  }
  return `https://www.inspr.at${pathnameForHtml(relPosix)}`;
}

function redirectOnce(url) {
  const host = url.hostname.toLowerCase();
  const pathname = url.pathname;
  if (host === "inspr.at") {
    const next = new URL(url.href);
    next.hostname = "www.inspr.at";
    return next;
  }
  if (host === "www.inspr.at" && (pathname === "/v1" || pathname.startsWith("/v1/"))) {
    const next = new URL(url.href);
    next.hostname = "v1.inspr.at";
    return next;
  }
  if (host === "www.inspr.at" && (pathname === "/eli10" || pathname.startsWith("/eli10/"))) {
    const next = new URL("https://www.inspr.at/overview/");
    next.hash = url.hash;
    return next;
  }
  return null;
}

function followSiteRedirects(url) {
  let current = url;
  for (let hop = 0; hop < 5; hop += 1) {
    const next = redirectOnce(current);
    if (!next || next.href === current.href) break;
    current = next;
  }
  return current;
}

function classify(href, base) {
  let url;
  try {
    url = new URL(href, base);
  } catch {
    return { kind: "invalid" };
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return { kind: "skip" };
  url = followSiteRedirects(url);
  if (!FAMILY_HOSTS.has(url.hostname.toLowerCase())) return { kind: "external", url };
  return { kind: "internal", url };
}

function isFile(filePath) {
  try {
    return statSync(filePath).isFile();
  } catch {
    return false;
  }
}

function isDir(filePath) {
  try {
    return statSync(filePath).isDirectory();
  } catch {
    return false;
  }
}

function insideRoot(root, filePath) {
  const resolvedRoot = path.resolve(root);
  const resolvedFile = path.resolve(filePath);
  return resolvedFile === resolvedRoot || resolvedFile.startsWith(`${resolvedRoot}${path.sep}`);
}

function hostRoot(url) {
  const pathname = url.pathname;
  const shared = SHARED_EXACT.has(pathname) || pathname.startsWith("/_astro/") || pathname.startsWith("/scripts/");
  if (shared) return DIST_DIR;
  const product = PRODUCT_ROOTS[url.hostname.toLowerCase()];
  return product ? path.join(DIST_DIR, product) : DIST_DIR;
}

function locate(url) {
  let decoded;
  try {
    decoded = decodeURIComponent(url.pathname);
  } catch {
    return null;
  }
  const parts = decoded.split("/").filter(Boolean);
  if (parts.includes("..")) return null;
  const root = hostRoot(url);
  const exact = parts.join("/");
  const candidates = decoded.endsWith("/") || exact === ""
    ? [path.join(root, exact, "index.html")]
    : [
        path.join(root, exact),
        path.join(root, `${exact}.html`),
        path.join(root, exact, "index.html"),
      ];

  for (const candidate of candidates) {
    if (!insideRoot(root, candidate)) return null;
    if (isFile(candidate)) return candidate;
    if (isDir(candidate)) {
      const index = path.join(candidate, "index.html");
      if (isFile(index) && insideRoot(root, index)) return index;
      // try_files stops on the directory; file_server then has nothing to serve.
      return null;
    }
  }
  return null;
}

const idCache = new Map();

function idsFor(filePath) {
  const cached = idCache.get(filePath);
  if (cached) return cached;
  const ids = collectIds(stripNonDocument(readFileSync(filePath, "utf8")));
  idCache.set(filePath, ids);
  return ids;
}

function fragmentId(url) {
  if (!url.hash || url.hash === "#") return null;
  const raw = url.hash.slice(1);
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

async function listPages() {
  const entries = await readdir(DIST_DIR, { recursive: true });
  const pages = [];
  for (const entry of entries) {
    const rel = entry.split(path.sep).join("/");
    if (!rel.endsWith(".html")) continue;
    const file = path.join(DIST_DIR, entry);
    if (!isFile(file)) continue;
    pages.push({ rel, file, publicUrl: pageLocation(rel) });
  }
  pages.sort((a, b) => a.rel.localeCompare(b.rel));
  return pages;
}

function addExternal(bucket, url, pageRel) {
  const probe = new URL(url.href);
  probe.hash = "";
  const key = probe.href;
  let item = bucket.get(key);
  if (!item) {
    item = { url: key, pages: new Set() };
    bucket.set(key, item);
  }
  item.pages.add(pageRel);
}

async function mapPool(items, limit, fn) {
  const results = new Array(items.length);
  let cursor = 0;
  async function worker() {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await fn(items[index]);
    }
  }
  const workers = Math.min(limit, items.length);
  await Promise.all(Array.from({ length: workers }, () => worker()));
  return results;
}

async function requestOnce(target, method) {
  try {
    const response = await fetch(target, {
      method,
      redirect: "follow",
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: {
        "user-agent": USER_AGENT,
        accept: "*/*",
      },
    });
    await response.body?.cancel().catch(() => {});
    return { status: response.status, finalUrl: response.url || target, error: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { status: 0, finalUrl: target, error: message };
  }
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const hostActive = new Map();
const hostWaiters = new Map();

async function withHostLimit(target, fn) {
  const host = hostOf(target);
  if ((hostActive.get(host) ?? 0) >= HOST_CONCURRENCY) {
    await new Promise((resolve) => {
      const queue = hostWaiters.get(host) ?? [];
      queue.push(resolve);
      hostWaiters.set(host, queue);
    });
  }
  hostActive.set(host, (hostActive.get(host) ?? 0) + 1);
  try {
    return await fn();
  } finally {
    hostActive.set(host, hostActive.get(host) - 1);
    const next = hostWaiters.get(host)?.shift();
    if (next) next();
  }
}

async function probe(target) {
  return withHostLimit(target, async () => {
    let via = "HEAD";
    let result = await requestOnce(target, "HEAD");
    // 405/403, or a HEAD connection that never returned a status, falls back to GET.
    if (result.error || result.status === 405 || result.status === 403) {
      via = "GET";
      result = await requestOnce(target, "GET");
    }
    // GitHub answers a burst of HEADs with 429. The URL is retried before it counts as a failure.
    for (let attempt = 1; result.status === 429 && attempt <= RATE_LIMIT_RETRIES; attempt += 1) {
      await delay(800 * attempt + Math.floor(Math.random() * 400));
      result = await requestOnce(target, via);
    }
    return { ...result, via };
  });
}

function pageList(pages) {
  return [...pages].sort().join(", ");
}

function hostOf(value) {
  try {
    return new URL(value).hostname.toLowerCase();
  } catch {
    return "";
  }
}

async function main() {
  if (!existsSync(DIST_DIR)) {
    console.error("web/dist is missing. Build first with: npx astro build");
    process.exit(1);
  }

  const pages = await listPages();
  const failures = [];
  const notes = [];
  const externals = new Map();
  let linkCount = 0;
  let skipped = 0;

  for (const page of pages) {
    const html = stripNonDocument(await readFile(page.file, "utf8"));
    for (const link of extractLinks(html)) {
      linkCount += 1;
      const resolved = classify(link.href, page.publicUrl);
      if (resolved.kind === "skip") {
        skipped += 1;
        continue;
      }
      if (resolved.kind === "invalid") {
        failures.push({
          key: `invalid ${link.href}`,
          line: `invalid href ${JSON.stringify(link.href)}`,
          pages: new Set([page.rel]),
        });
        continue;
      }
      if (resolved.kind === "external") {
        if (link.href.startsWith("/") || !/^https?:/i.test(link.href)) {
          notes.push(`${page.rel} ${link.href} -> ${resolved.url.href}`);
        }
        addExternal(externals, resolved.url, page.rel);
        continue;
      }

      const file = locate(resolved.url);
      const fragment = fragmentId(resolved.url);
      if (!file) {
        const key = `missing ${resolved.url.href}`;
        const existing = failures.find((item) => item.key === key);
        if (existing) existing.pages.add(page.rel);
        else {
          failures.push({
            key,
            line: `no file in dist for ${resolved.url.href}`,
            pages: new Set([page.rel]),
          });
        }
        continue;
      }
      if (fragment) {
        if (!file.endsWith(".html") && !file.endsWith(".htm")) {
          const key = `fragment-nonhtml ${resolved.url.href}`;
          const existing = failures.find((item) => item.key === key);
          if (existing) existing.pages.add(page.rel);
          else {
            failures.push({
              key,
              line: `fragment #${fragment} is on a non-HTML file ${path.relative(DIST_DIR, file)}`,
              pages: new Set([page.rel]),
            });
          }
          continue;
        }
        const ids = idsFor(file);
        if (!ids.has(fragment)) {
          const key = `fragment ${resolved.url.href}`;
          const existing = failures.find((item) => item.key === key);
          if (existing) existing.pages.add(page.rel);
          else {
            failures.push({
              key,
              line: `fragment #${fragment} has no matching id in ${path.relative(DIST_DIR, file).split(path.sep).join("/")}`,
              pages: new Set([page.rel]),
            });
          }
        }
      }
    }
  }

  console.log("internal pages:");
  for (const page of pages) console.log(`  ${page.rel}  ${page.publicUrl}`);
  if (notes.length > 0) {
    console.log("internal redirects that leave the site family:");
    for (const note of notes) console.log(`  NOTE ${note}`);
  }
  if (failures.length > 0) {
    for (const failure of failures) {
      console.log(`FAIL ${failure.line}`);
      console.log(`  from: ${pageList(failure.pages)}`);
    }
  }
  console.log(`internal: ${pages.length} pages, ${linkCount} links, ${skipped} non-http skipped, ${failures.length} failures`);

  let externalFailures = 0;
  let externalWarnings = 0;
  if (externalMode) {
    const targets = [...externals.values()].sort((a, b) => a.url.localeCompare(b.url));
    console.log(`external: probing ${targets.length} URLs`);
    const results = await mapPool(targets, CONCURRENCY, async (target) => ({
      target,
      result: await probe(target.url),
    }));
    for (const { target, result } of results) {
      const finalHost = hostOf(result.finalUrl);
      const startHost = hostOf(target.url);
      const hostChanged = finalHost !== "" && startHost !== "" && finalHost !== startHost;
      const ok = !result.error && result.status >= 200 && result.status < 300;
      const label = ok ? (hostChanged ? "WARN" : "OK") : "FAIL";
      if (!ok) externalFailures += 1;
      if (hostChanged) externalWarnings += 1;
      const statusText = result.error ? `error via ${result.via}` : `${result.status} via ${result.via}`;
      console.log(`${label} ${statusText}  ${target.url}`);
      if (result.error) console.log(`  error: ${result.error}`);
      console.log(`  final: ${result.finalUrl}`);
      if (hostChanged) console.log(`  host: ${startHost} -> ${finalHost}`);
      console.log(`  from: ${pageList(target.pages)}`);
    }
    console.log(`external: ${targets.length} URLs, ${externalFailures} failures, ${externalWarnings} host-redirect warnings`);
  }

  if (failures.length > 0 || externalFailures > 0) process.exit(1);
}

await main();
