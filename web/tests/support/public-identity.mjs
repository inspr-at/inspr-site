import { lstatSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { operator } from "../../src/content/legal.ts";
import { loadCaptureDenylist } from "../../scripts/capture-aeon-demo/privacy.mjs";

export const repositoryRoot = fileURLToPath(new URL("../../../", import.meta.url));
const ipv4 = /(?<![a-z0-9_.])(?:\d{1,3}\.){3}\d{1,3}(?![a-z0-9_.])/gi;
const privateAddress = (address) => {
  const octets = address.split(".").map(Number);
  return octets.every((part) => part <= 255) && (
    octets[0] === 10 || (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31)
    || (octets[0] === 192 && octets[1] === 168)
    || (octets[0] === 100 && octets[1] >= 64 && octets[1] <= 127)
  );
};
// Exact network declarations only, never all addresses inside those networks.
const allowedCidrs = new Set(["10.0.0.0/8", "172.16.0.0/12", "192.168.0.0/16"]);
// Synthetic security fixtures: the sibling must be inside the plugin's trust
// range to reproduce its defect. These exceptions never apply to URL hosts.
const fixtureAddresses = new Map([
  ["auth/check-edge-contract.mjs", new Set([[172, 20, 0, 44].join(".")])],
  ["auth/main_test.go", new Set([[172, 20, 0, 5], [172, 20, 0, 6], [10, 0, 0, 2], [10, 0, 0, 3]].map((parts) => parts.join(".")))],
]);

// Public authorship/contact, the business link and named product integrations
// are intentional public facts, not operator infrastructure identities.
// Read their existing declarations rather than duplicate personal literals.
const urls = readFileSync(new URL("../../src/content/urls.ts", import.meta.url), "utf8");
const businessHost = new URL(urls.match(/business:[\s\S]*?"(https:\/\/[^\"]+)"/)[1]).hostname;
const authorHandle = urls.match(/author: "https:\/\/github\.com\/([^\"]+)"/)[1];
const publicLiterals = new Map([
  ["names", new Set([operator.name, ...operator.name.split(/\s+/), authorHandle].map((value) => value.toLowerCase()))],
  ["domains", new Set([operator.email.split("@")[1], businessHost, `www.${businessHost}`].map((value) => value.toLowerCase()))],
  ["companies", new Set([businessHost.split(".")[0].toLowerCase(), "hetzner", "hetzner cloud", "netcup", "aws", "google", "google cloud", "oracle", "oracle cloud"])],
]);

export function isAllowedPublicDomain(line, match, allowlist = publicLiterals.get("domains")) {
  // Check the full hostname, not an allowlisted suffix of a private subdomain.
  const prefix = line.slice(0, match.index).match(/[a-z0-9_-]+(?:\.[a-z0-9_-]+)*\.?$/i)?.[0] ?? "";
  const suffix = line.slice(match.index + match[0].length).match(/^(?:\.[a-z0-9_-]+)+/i)?.[0] ?? "";
  return allowlist.has((prefix + match[0] + suffix).toLowerCase());
}

export function loadPublicIdentityDenylist({ path = process.env.INSPR_IDENTITY_DENYLIST || join(homedir(), ".inspr", "capture-denylist.json"), required = Boolean(process.env.INSPR_IDENTITY_DENYLIST), repositoryRoots = [repositoryRoot] } = {}) {
  try { lstatSync(path); } catch (error) {
    if (error.code === "ENOENT" && !required) return null;
    throw new Error("Public identity denylist is missing or unreadable");
  }
  // The capture loader validates the shared format and refuses in-repo files.
  return loadCaptureDenylist({ path, repositoryRoots });
}

export function publicIdentityProblems(text, { file = "content", denylist = null } = {}) {
  const problems = [];
  for (const [index, line] of text.split("\n").entries()) {
    const rules = new Set();
    if (/\.ts\.(?:net|[a-z0-9-]+\.[a-z]{2,})(?![a-z0-9-])/i.test(line)) rules.add("mesh-host-domain");
    if (/(?<![a-z0-9_-])(?:[a-z0-9_-]+\.)+lan(?![a-z0-9_-])/i.test(line)) rules.add("local-host-domain");
    for (const match of line.matchAll(ipv4)) {
      if (!privateAddress(match[0])) continue;
      const prefix = line.slice(0, match.index);
      if (/(?:[a-z][a-z0-9+.-]*:)?\/\/(?:[^\s/"'<>]*@)?$/i.test(prefix)) {
        rules.add("private-ip-url");
        continue;
      }
      const cidr = match[0] + (line.slice(match.index + match[0].length).match(/^\/\d+(?![a-z0-9_.])/i)?.[0] ?? "");
      if (!allowedCidrs.has(cidr) && !fixtureAddresses.get(file)?.has(match[0])) rules.add("private-ip-address");
    }
    for (const { kind, pattern } of denylist?.rules ?? []) {
      // Literal domain entries such as a local suffix must not match code words.
      const start = kind === "names" || kind === "companies" ? "(?<![a-z0-9_-])" : "";
      const end = kind === "hostPatterns" ? "(?![a-z0-9])" : "(?![a-z0-9_-])";
      const bounded = new RegExp(`${start}(?:${pattern.source})${end}`, "gi");
      const haystack = kind === "hostPatterns" ? line.replace(/_/g, " ") : line;
      for (const match of haystack.matchAll(bounded)) {
        const allowed = kind === "domains" ? isAllowedPublicDomain(line, match) : publicLiterals.get(kind)?.has(match[0].toLowerCase());
        if (!allowed) rules.add(`operator-${kind}`);
      }
    }
    for (const rule of rules) problems.push(`${file}:${index + 1}: ${rule}`);
  }
  return problems;
}

export const isLockfile = (file) => /(?:^|\/)(?:[^/]*\.lock|(?:package-lock|npm-shrinkwrap)\.json|pnpm-lock\.yaml)$/.test(file);
export function trackedText(bytes) {
  if (bytes.includes(0)) return null;
  try { return new TextDecoder("utf-8", { fatal: true }).decode(bytes); } catch { return null; }
}
