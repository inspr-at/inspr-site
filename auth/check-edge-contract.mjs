import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { BlockList, isIP } from "node:net";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const authDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(authDir, "..");
const contract = JSON.parse(
  await readFile(resolve(authDir, "cloudflare-edge-contract.json"), "utf8"),
);
const compose = await readFile(resolve(repoRoot, "docker-compose.yml"), "utf8");
const configuredPluginRanges = ["172.16.0.0/12", "2400:cb00::/32"];

assert.deepEqual(
  contract.cloudflarewarp.configuredTrustedSourceRanges,
  configuredPluginRanges,
  "cloudflarewarp configured trust ranges differ from the NIX-400 runtime contract",
);

function blockList(ranges) {
  const list = new BlockList();
  for (const cidr of ranges) {
    const [address, prefixText] = cidr.split("/");
    const family = isIP(address) === 6 ? "ipv6" : "ipv4";
    assert.notEqual(isIP(address), 0, `invalid CIDR address: ${cidr}`);
    list.addSubnet(address, Number(prefixText), family);
  }
  return list;
}

const sourceRangeMatch = compose.match(
  /inspr-auth-cloudflare-only\.ipallowlist\.sourcerange=([^\n]+)/,
);
assert.ok(sourceRangeMatch, "inspr-auth Cloudflare ipAllowList is missing");
const deployedRanges = sourceRangeMatch[1].trim().split(",");
assert.deepEqual(
  deployedRanges,
  contract.cloudflareRanges,
  "reference compose CIDRs differ from the pinned Cloudflare source contract",
);

assert.match(
  compose,
  /inspr-auth\.middlewares=inspr-auth-cloudflare-only@docker,cloudflarewarp@file,inspr-auth-edge-token@docker,inspr-edge-hsts@docker/,
  "Cloudflare source filtering must precede header rewriting and attestation",
);
assert.match(compose, /ENTER_EDGE_TOKEN: \$\{ENTER_EDGE_TOKEN:-\}/);
assert.match(
  compose,
  /inspr-auth-edge-token\.headers\.customrequestheaders\.X-Inspr-Edge-Token=\$\{ENTER_EDGE_TOKEN:-\}/,
);

// Reproduce the deployed v1.3.3 defect: csb1 explicitly trusts 172.16/12, so
// a sibling can make the plugin copy an attacker-selected CF-Connecting-IP.
const pluginTrust = blockList(contract.cloudflarewarp.configuredTrustedSourceRanges);
const siblingIP = "172.20.0.44";
const attackerChosenIP = "198.51.100.77";
assert.equal(pluginTrust.check(siblingIP, "ipv4"), true);
const trustedCloudflareIPv6 = "2400:cb00::1";
assert.equal(isIP(trustedCloudflareIPv6), 6);
assert.equal(pluginTrust.check(trustedCloudflareIPv6, "ipv6"), true);
assert.equal(pluginTrust.check("2400:cb01::1", "ipv6"), false);
const rewrittenClientIP = pluginTrust.check(siblingIP, "ipv4")
  ? attackerChosenIP
  : siblingIP;
assert.equal(rewrittenClientIP, attackerChosenIP);

// The new first middleware rejects that sibling before cloudflarewarp executes,
// while preserving both official IPv4 and IPv6 Cloudflare ingress.
const edgeAllowList = blockList(deployedRanges);
assert.equal(edgeAllowList.check(siblingIP, "ipv4"), false);
assert.equal(edgeAllowList.check("173.245.48.1", "ipv4"), true);
assert.equal(edgeAllowList.check("2606:4700::1", "ipv6"), true);

if (process.argv.includes("--online")) {
  const fetchRanges = async (source) => {
    const response = await fetch(source, { signal: AbortSignal.timeout(10_000) });
    assert.equal(response.ok, true, `${source} returned ${response.status}`);
    return (await response.text()).trim().split(/\s+/);
  };
  const officialRanges = [
    ...(await fetchRanges(contract.source.ipv4)),
    ...(await fetchRanges(contract.source.ipv6)),
  ];
  assert.deepEqual(
    contract.cloudflareRanges,
    officialRanges,
    "Cloudflare changed its official ranges; update the pinned contract, compose gate, and NIX-400 together",
  );

  const pluginResponse = await fetch(contract.cloudflarewarp.source, {
    signal: AbortSignal.timeout(10_000),
  });
  assert.equal(
    pluginResponse.ok,
    true,
    `${contract.cloudflarewarp.source} returned ${pluginResponse.status}`,
  );
  const pluginSource = await pluginResponse.text();
  assert.equal(
    createHash("sha256").update(pluginSource).digest("hex"),
    contract.cloudflarewarp.sourceSha256,
    "pinned cloudflarewarp source changed unexpectedly",
  );
  assert.match(pluginSource, /req\.Header\.Set\(xCfTrusted, "yes"\)/);
  assert.match(
    pluginSource,
    /req\.Header\.Set\(xForwardFor, req\.Header\.Get\(cfConnectingIP\)\)/,
  );
  assert.match(
    pluginSource,
    /req\.Header\.Set\(xRealIP, req\.Header\.Get\(cfConnectingIP\)\)/,
  );
}

console.log("inspr-auth edge contract: ok");
