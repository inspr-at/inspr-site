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

assert.equal(
  contract.cloudflarewarp.disableDefault,
  false,
  "cloudflarewarp must retain its pinned built-in Cloudflare ranges",
);
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

// disableDefault=false makes cloudflarewarp append every range returned by
// its pinned ips.CFIPs() source to the two explicitly configured ranges.
// Prove the complete effective set, not one representative IPv6 prefix.
const effectivePluginTrust = blockList([
  ...contract.cloudflarewarp.configuredTrustedSourceRanges,
  ...contract.cloudflareRanges,
]);
for (const address of [
  "173.245.48.1",
  "2400:cb00::1",
  "2606:4700::1",
  "2803:f800::1",
  "2405:b500::1",
  "2405:8100::1",
  "2a06:98c0::1",
  "2c0f:f248::1",
]) {
  const family = isIP(address) === 6 ? "ipv6" : "ipv4";
  assert.equal(
    effectivePluginTrust.check(address, family),
    true,
    `cloudflarewarp effective trust omitted ${address}`,
  );
}
assert.equal(contract.traefik.observedVersion, "v3.7.12");
assert.equal(
  contract.traefik.backendHeaderShape,
  "X-Real-IP=client; X-Forwarded-For=client, cloudflare-edge",
);

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
  assert.match(pluginSource, /if !config\.DisableDefaultCFIPs/);
  assert.match(pluginSource, /for _, v := range ips\.CFIPs\(\)/);
  assert.match(
    pluginSource,
    /req\.Header\.Set\(xForwardFor, req\.Header\.Get\(cfConnectingIP\)\)/,
  );
  assert.match(
    pluginSource,
    /req\.Header\.Set\(xRealIP, req\.Header\.Get\(cfConnectingIP\)\)/,
  );
  assert.match(pluginSource, /req\.Header\.Set\(xCfTrusted, "no"\)/);
  assert.match(pluginSource, /req\.Header\.Del\(cfConnectingIP\)/);

  const defaultRangeResponse = await fetch(
    contract.cloudflarewarp.defaultRangeSource,
    { signal: AbortSignal.timeout(10_000) },
  );
  assert.equal(
    defaultRangeResponse.ok,
    true,
    `${contract.cloudflarewarp.defaultRangeSource} returned ${defaultRangeResponse.status}`,
  );
  const defaultRangeSource = await defaultRangeResponse.text();
  assert.equal(
    createHash("sha256").update(defaultRangeSource).digest("hex"),
    contract.cloudflarewarp.defaultRangeSourceSha256,
    "pinned cloudflarewarp default range source changed unexpectedly",
  );
  const pluginDefaultRanges = [...defaultRangeSource.matchAll(/"([^"\\]+\/\d+)"/g)].map(
    (match) => match[1],
  );
  assert.deepEqual(
    pluginDefaultRanges,
    contract.cloudflareRanges,
    "cloudflarewarp built-in ranges differ from the pinned Cloudflare contract",
  );

  const fetchPinnedSource = async (source, expectedHash, label) => {
    const response = await fetch(source, { signal: AbortSignal.timeout(10_000) });
    assert.equal(response.ok, true, `${source} returned ${response.status}`);
    const body = await response.text();
    assert.equal(
      createHash("sha256").update(body).digest("hex"),
      expectedHash,
      `${label} source changed unexpectedly`,
    );
    return body;
  };
  const fastProxySource = await fetchPinnedSource(
    contract.traefik.fastProxySource,
    contract.traefik.fastProxySourceSha256,
    "Traefik fast proxy",
  );
  const httpUtilProxySource = await fetchPinnedSource(
    contract.traefik.httpUtilProxySource,
    contract.traefik.httpUtilProxySourceSha256,
    "Traefik httputil proxy",
  );
  const forwardedHeadersSource = await fetchPinnedSource(
    contract.traefik.forwardedHeadersSource,
    contract.traefik.forwardedHeadersSourceSha256,
    "Traefik forwarded-headers middleware",
  );
  for (const [label, source] of [
    ["fast proxy", fastProxySource],
    ["httputil proxy", httpUtilProxySource],
  ]) {
    assert.match(
      source,
      /strings\.Join\(prior, ", "\) \+ ", " \+ clientIP/,
      `${label} no longer appends its immediate peer to X-Forwarded-For`,
    );
  }
  assert.match(
    forwardedHeadersSource,
    /if unsafeHeader\(outreq\.Header\)\.Get\(xRealIP\) == ""/,
    "Traefik no longer preserves cloudflarewarp's X-Real-IP",
  );
  assert.match(
    forwardedHeadersSource,
    /unsafeHeader\(outreq\.Header\)\.Set\(xRealIP, clientIP\)/,
  );
}

console.log("inspr-auth edge contract: ok");
