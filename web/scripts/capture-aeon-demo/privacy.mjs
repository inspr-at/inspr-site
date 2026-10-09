// SPDX-License-Identifier: AGPL-3.0-only
// Fixtures only: never production data, a fleet host, browser chrome or an instance URL.
// Run natively outside the Codex sandbox (NIX-445); obtain Opus visual QA before publishing.
// Required local file: INSPR_CAPTURE_DENYLIST or ~/.inspr/capture-denylist.json.
// Format: names, hostPatterns, domains, companies arrays of strings or objects.
// Literal objects use {value, replacement?}; hostPatterns use {pattern, replacement?}.
// This file stays on the operator machine, outside every repo; never commit it.
import { readFileSync, realpathSync } from "node:fs";
import { homedir } from "node:os";
import { isAbsolute, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const emailPattern = /\b[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Z0-9-]+(?:\.[A-Z0-9-]+)+\b/gi;
export const ipv4Pattern = /\b(?:\d{1,3}\.){3}\d{1,3}\b/g;
export const domainPattern = /\b(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,63}\b/gi;
export const hostPattern = /\b(?!(?:sha256|arm64|amd64|qwen3|woff2|utf8|ipv4)\b)[a-z]{2,4}\d+\b/gi;
const publicDomains = new Set(["example.com", "example.org", "github.com", "inspr.at", "www.inspr.at", "paimos.inspr.at", "pharos.inspr.at", "janus.inspr.at", "aithema.inspr.at"]);
const defaults = { names: "Demo Person", hostPatterns: "demo-host", domains: "demo.example.com", companies: "Demo Company" };
const fail = (reason) => new Error(`Capture denylist ${reason}. Set INSPR_CAPTURE_DENYLIST to a non-empty local JSON file outside the repositories; capture is disabled.`);
const escape = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const allowedDomain = (domain) => publicDomains.has(domain.toLowerCase()) || /(?:^|\.)example\.(?:com|org)$/i.test(domain);
const allowedEmail = (email) => /(?:^|\.)example\.com$|\.(?:test|invalid)$/i.test(email.split("@").at(-1));
const matches = (pattern, text) => new RegExp(pattern.source, pattern.flags).test(text);

export function loadCaptureDenylist({ path = process.env.INSPR_CAPTURE_DENYLIST || join(homedir(), ".inspr", "capture-denylist.json"), repositoryRoots = [fileURLToPath(new URL("../../../", import.meta.url))] } = {}) {
  let file;
  try { file = realpathSync(resolve(path)); } catch { throw fail("is missing or unreadable"); }
  for (const root of repositoryRoots) {
    const offset = relative(realpathSync(root), file);
    if (offset === "" || (!isAbsolute(offset) && offset !== ".." && !offset.startsWith("../"))) throw fail("must stay outside the repositories");
  }
  let data;
  try { data = JSON.parse(readFileSync(file, "utf8")); } catch { throw fail("is unreadable or invalid JSON"); }
  if (!data || typeof data !== "object" || Array.isArray(data)) throw fail("has an invalid format");
  const rules = [];
  for (const [kind, fallback] of Object.entries(defaults)) {
    if (!Array.isArray(data[kind])) throw fail(`needs a ${kind} array`);
    for (const entry of data[kind]) {
      const key = kind === "hostPatterns" ? "pattern" : "value";
      const value = typeof entry === "string" ? entry : entry?.[key];
      const replacement = typeof entry === "object" && entry?.replacement !== undefined ? entry.replacement : fallback;
      if (typeof value !== "string" || !value.trim() || typeof replacement !== "string" || !replacement.trim()) throw fail(`has an invalid ${kind} entry`);
      let pattern;
      try { pattern = new RegExp(kind === "hostPatterns" ? value : escape(value), "gi"); } catch { throw fail(`has an invalid ${kind} pattern`); }
      if (matches(pattern, "")) throw fail(`has an empty-match ${kind} pattern`);
      rules.push({ kind, pattern, replacement });
    }
  }
  if (!rules.length) throw fail("is empty");
  return { path: file, rules };
}

function mapNonEmail(text, transform) {
  let result = "", cursor = 0;
  for (const match of text.matchAll(new RegExp(emailPattern))) {
    result += transform(text.slice(cursor, match.index)) + (allowedEmail(match[0]) ? match[0] : "capture@example.com");
    cursor = match.index + match[0].length;
  }
  return result + transform(text.slice(cursor));
}

export function captureTextProblems(text, denylist) {
  if (!denylist?.rules?.length) throw fail("is empty");
  const problems = new Set();
  for (const { kind, pattern } of denylist.rules) if (matches(pattern, text)) problems.add(`denylisted ${kind}`);
  if (matches(ipv4Pattern, text)) problems.add("IPv4 address");
  if (matches(hostPattern, text)) problems.add("host-like token");
  for (const match of text.matchAll(new RegExp(emailPattern))) if (!allowedEmail(match[0])) problems.add("non-fictional email");
  mapNonEmail(text, (part) => {
    for (const match of part.matchAll(new RegExp(domainPattern))) if (!allowedDomain(match[0])) problems.add("non-public domain");
    return part;
  });
  return [...problems];
}

export function createCaptureSanitizer(denylist, onReplacement = () => {}) {
  if (!denylist?.rules?.length) throw fail("is empty");
  for (const { replacement } of denylist.rules) if (captureTextProblems(replacement, denylist).length) throw fail("has an unsafe replacement");
  const sanitizeText = (text, permission = false) => {
    let next = text;
    for (const { kind, pattern, replacement } of denylist.rules) {
      next = next.replace(pattern, () => { onReplacement(kind, replacement); return replacement; });
    }
    next = next.replace(ipv4Pattern, "demo-address").replace(hostPattern, "demo-host");
    next = mapNonEmail(next, (part) => part.replace(domainPattern, (domain) => allowedDomain(domain) ? domain : "demo.example.com"));
    // A permission identifier is protocol data, never a display domain. Apply
    // the local denylist regardless, and preserve only valid permission syntax.
    if (permission && /^[a-z_]+\.(?:read|write|move|delete|act|control|claim|decide|send|manage|recover|force_stop|decide_high|issue|approve|report|refresh|portal_read|portal_accept)$/.test(text) && !denylist.rules.some(({ pattern }) => matches(pattern, text))) return text;
    if (next !== text) onReplacement("generic fixture text", next);
    return next;
  };
  const sanitize = (value, permission = false) => {
    if (typeof value === "string") return sanitizeText(value, permission);
    if (Array.isArray(value)) return value.map((item) => sanitize(item, permission));
    if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, sanitize(item, key === "permissions")]));
    return value;
  };
  return sanitize;
}
