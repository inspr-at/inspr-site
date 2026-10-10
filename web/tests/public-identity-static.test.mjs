import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { operator } from "../src/content/legal.ts";
import { isAllowedPublicDomain, isLockfile, loadPublicIdentityDenylist, publicIdentityProblems, repositoryRoot, trackedText } from "./support/public-identity.mjs";

test("tracked public text carries no private infrastructure identity", (t) => {
  const denylist = loadPublicIdentityDenylist();
  if (!denylist) t.diagnostic("Operator denylist absent: skipped operator rules only; generic CI identity rules remain active.");
  const files = execFileSync("git", ["ls-files", "-z"], { cwd: repositoryRoot, encoding: "utf8" }).split("\0").filter(Boolean);
  const problems = [];
  let scanned = 0;
  for (const file of files) {
    if (isLockfile(file)) continue;
    const text = trackedText(readFileSync(join(repositoryRoot, file)));
    if (text === null) continue;
    scanned += 1;
    problems.push(...publicIdentityProblems(text, { file, denylist }));
  }
  t.diagnostic(`Scanned ${scanned} tracked text files; binary files and lockfiles skipped.`);
  // Never pass source text or matches to an assertion: failures stay redacted.
  assert.equal(problems.length, 0, problems.join("\n"));
});

test("generic rules catch private hosts and redact their values", () => {
  const address = [10, 23, 45, 67].join(".");
  const samples = [
    ["mesh-host-domain", ["node", "ts", "sample", "invalid"].join(".")],
    ["mesh-host-domain", ["node", "ts", "net"].join(".")],
    ["local-host-domain", ["node", "lan"].join(".")],
    ["private-ip-address", address],
    ["private-ip-url", `https://${address}:8443/path`],
    ["private-ip-url", `http://user@${address}/`],
    ["private-ip-url", `//${address}/`],
  ];
  for (const [rule, value] of samples) {
    const problems = publicIdentityProblems(`neutral\n${value}`, { file: "fixture.txt" });
    assert.ok(problems.includes(`fixture.txt:2: ${rule}`));
    assert.ok(problems.every((problem) => !problem.includes(value)));
  }
  for (const octets of [[172, 16, 1, 2], [172, 31, 1, 2], [192, 168, 1, 2], [100, 64, 0, 1], [100, 127, 255, 254]]) {
    assert.equal(publicIdentityProblems(octets.join(".")).length, 1);
  }
  for (const octets of [[100, 63, 255, 254], [100, 128, 0, 1]]) assert.deepEqual(publicIdentityProblems(octets.join(".")), []);
  assert.ok(publicIdentityProblems(`https://${[100, 64, 0, 1].join(".")}/`).some((problem) => problem.endsWith("private-ip-url")));
  assert.deepEqual(publicIdentityProblems("navigator.language .language-switch 192.0.2.1 172.32.0.1 127.0.0.1"), []);
});

test("public business domains allow only the exact hostname and www", () => {
  const allowlist = new Set(["public.example.com", "www.public.example.com"]);
  for (const [host, allowed] of [
    ["public.example.com", true], ["www.public.example.com", true],
    ["internal.public.example.com", false], ["internal.www.public.example.com", false],
    ["otherpublic.example.com", false], ["public.example.com.internal", false],
  ]) {
    const line = `https://${host}/`;
    const match = /public\.example\.com/i.exec(line);
    assert.equal(isAllowedPublicDomain(line, match, allowlist), allowed);
  }
});

test("email rules allow only legal declarations and approved public domains", () => {
  const personal = ["ada.person", "mail-provider.net"].join("@");
  for (const file of ["fixture.txt", "web/src/content/legal.ts.bak", "other/legal.ts"]) {
    assert.deepEqual(publicIdentityProblems(`neutral\n${personal}`, { file }), [`${file}:2: non-example-email`]);
  }
  assert.deepEqual(publicIdentityProblems(personal, { file: "web/src/content/legal.ts" }), []);
  assert.deepEqual(publicIdentityProblems(operator.email, { file: "fixture.txt" }), ["fixture.txt:1: non-example-email"]);
  assert.deepEqual(publicIdentityProblems(operator.email, { file: "web/src/content/legal.ts" }), []);
  for (const domain of [
    "example.com", "example.org", "example.test", "example.invalid", "demo.example.com",
    "inspr.at", "auth.inspr.at", "nested.auth.inspr.at", "demo.localhost.zitadel",
    "github.com", "users.noreply.github.com",
  ]) {
    const email = ["support", domain].join("@");
    assert.deepEqual(publicIdentityProblems(`mailto:${email}`, { file: "fixture.txt" }), []);
    assert.deepEqual(publicIdentityProblems(email.toUpperCase(), { file: "fixture.txt" }), []);
  }
  assert.deepEqual(publicIdentityProblems("hello@inspr.at", { file: "fixture.txt" }), []);
  for (const domain of [
    "otherexample.com", "example.com.evil.net", "otherinspr.at", "inspr.at.evil.net",
    "localhost.zitadel", "otherlocalhost.zitadel", "demo.localhost.zitadel.evil.net",
    "private.github.com", "othergithub.com", "users.noreply.github.com.evil.net",
  ]) {
    assert.deepEqual(publicIdentityProblems(["role", domain].join("@"), { file: "fixture.txt" }), ["fixture.txt:1: non-example-email"]);
  }
  // Built assets use multiple @ separators, not mailbox addresses.
  assert.deepEqual(publicIdentityProblems('/_astro/index@dark@abc123.css', { file: "fixture.html" }), []);
});

test("imprint domain denylist allowance is restricted to its legal declaration", () => {
  const domain = operator.email.split("@")[1];
  const denylist = { rules: [{ kind: "domains", pattern: new RegExp(domain.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i") }] };
  assert.deepEqual(publicIdentityProblems(domain, { file: "fixture.txt", denylist }), ["fixture.txt:1: operator-domains"]);
  assert.deepEqual(publicIdentityProblems(domain, { file: "web/src/content/legal.ts", denylist }), []);
});

test("project and GitHub mailboxes have narrow public allowances", () => {
  for (const local of ["hello", "admin", "no-reply", "noreply", "support", "security", "postmaster"]) {
    for (const domain of ["inspr.at", "auth.inspr.at"]) {
      assert.deepEqual(publicIdentityProblems([local, domain].join("@")), []);
    }
  }
  for (const domain of ["inspr.at", "auth.inspr.at", "github.com"]) {
    assert.deepEqual(publicIdentityProblems(["ada.person", domain].join("@"), { file: "fixture.txt" }), ["fixture.txt:1: non-example-email"]);
  }
  assert.deepEqual(publicIdentityProblems(["noreply", "github.com"].join("@"), { file: "fixture.txt" }), ["fixture.txt:1: non-example-email"]);
  assert.deepEqual(publicIdentityProblems(["support", "github.com"].join("@")), []);
  for (const local of ["demo-user", "12345+demo-user", "12345+demo[bot]"]) {
    const email = [local, "users.noreply.github.com"].join("@");
    assert.deepEqual(publicIdentityProblems(`Signed-off-by: Demo <${email}>`), []);
  }
  assert.deepEqual(publicIdentityProblems(["12345+demo[bot]", "evil.com"].join("@"), { file: "fixture.txt" }), ["fixture.txt:1: non-example-email"]);
});

test("escaped email addresses and domains are scanned without leaking values", () => {
  const email = ["ada.person", "mail-provider.net"].join("@");
  const escaped = email.replace(/\./g, "\\.");
  assert.deepEqual(publicIdentityProblems(`neutral\n${escaped}`, { file: "fixture.txt" }), ["fixture.txt:2: non-example-email"]);
  assert.deepEqual(publicIdentityProblems(escaped, { file: "web/src/content/legal.ts" }), []);
  assert.deepEqual(publicIdentityProblems(`${email} ${escaped}`, { file: "fixture.txt" }), ["fixture.txt:1: non-example-email"]);
  const domain = "corp.invalid";
  const denylist = { rules: [{ kind: "domains", pattern: /corp\.invalid/i }] };
  assert.deepEqual(publicIdentityProblems(domain.replace(/\./g, "\\."), { file: "fixture.txt", denylist }), ["fixture.txt:1: operator-domains"]);
});

test("email domain ends cannot backtrack or hide behind punctuation", () => {
  for (const [local, domain] of [
    ["_x", "evil.com_"], ["x", "evil.com@"], ["x", "inspr.at.evil_com"],
    ["hello", "inspr.at.evil_com"], ["support", "github.com.evil_com"],
  ]) {
    assert.deepEqual(publicIdentityProblems([local, domain].join("@"), { file: "fixture.txt" }), ["fixture.txt:1: non-example-email"]);
  }
  assert.deepEqual(publicIdentityProblems(["x", "evil.com."].join("@"), { file: "fixture.txt" }), ["fixture.txt:1: non-example-email"]);
  assert.deepEqual(publicIdentityProblems("Contact hello@inspr.at."), []);
});

test("home paths are rejected with only file, line and rule reported", () => {
  for (const base of ["home", "Users"]) {
    const path = ["", base, "ada-demo", "x"].join("/");
    assert.deepEqual(publicIdentityProblems(`neutral\n${path}`, { file: "fixture.txt" }), ["fixture.txt:2: home-path"]);
    const bare = ["", base, "x-demo"].join("/");
    for (const source of [`HOME=${bare}`, `cd ${bare} &&`, bare]) {
      assert.deepEqual(publicIdentityProblems(source, { file: "fixture.txt" }), ["fixture.txt:1: home-path"]);
    }
  }
  for (const path of ["/srv/web-host/inspr-at", "/home", "/home/", "/Users"]) {
    assert.deepEqual(publicIdentityProblems(path), []);
  }
});

test("CIDR and synthetic fixture allowances are exact and never permit private URLs", () => {
  const cidrs = "10.0.0.0/8 172.16.0.0/12 192.168.0.0/16";
  assert.deepEqual(publicIdentityProblems(cidrs, { file: "Caddyfile" }), []);
  const sibling = [172, 20, 0, 44].join(".");
  assert.deepEqual(publicIdentityProblems(sibling, { file: "auth/check-edge-contract.mjs" }), []);
  assert.equal(publicIdentityProblems(sibling, { file: "unrelated.txt" }).length, 1);
  assert.equal(publicIdentityProblems([172, 20, 0, 45].join("."), { file: "auth/check-edge-contract.mjs" }).length, 1);
  assert.ok(publicIdentityProblems(`http://${sibling}/`, { file: "auth/check-edge-contract.mjs" }).some((problem) => problem.endsWith("private-ip-url")));
  assert.ok(publicIdentityProblems(`https://${cidrs.split(" ")[0]}`).some((problem) => problem.endsWith("private-ip-url")));
  assert.equal(publicIdentityProblems([10, 0, 0, 0].join(".")).length, 1);
  assert.equal(publicIdentityProblems(`${[10, 0, 0, 0].join(".")}/8suffix`).length, 1);
});

test("optional denylist uses the capture format and rejects explicit missing or invalid configuration", () => {
  const root = mkdtempSync(join(tmpdir(), "public-identity-"));
  try {
    const path = join(root, "denylist.json");
    assert.equal(loadPublicIdentityDenylist({ path, required: false }), null);
    assert.throws(() => loadPublicIdentityDenylist({ path, required: true }), /missing or unreadable/);
    writeFileSync(path, JSON.stringify({
      names: ["Demo Person"], hostPatterns: ["\\bfixture-host-\\d+\\b"],
      domains: ["corp.invalid"], companies: ["Example Industries"],
    }));
    const denylist = loadPublicIdentityDenylist({ path });
    const problems = publicIdentityProblems("Demo Person fixture-host-7 corp.invalid Example Industries", { file: "fixture.txt", denylist });
    assert.deepEqual(problems.sort(), ["companies", "domains", "hostPatterns", "names"].map((kind) => `fixture.txt:1: operator-${kind}`).sort());
    for (const host of ["fixture-host-7_net", "fixture-host-7-smtp-1"]) {
      assert.deepEqual(publicIdentityProblems(host, { file: "fixture.txt", denylist }), ["fixture.txt:1: operator-hostPatterns"]);
    }
    assert.deepEqual(publicIdentityProblems("corp.invalidSuffix", { denylist }), []);
    assert.throws(() => loadPublicIdentityDenylist({ path, repositoryRoots: [root] }), /outside the repositories/);
    for (const content of ["{", "{}", JSON.stringify({ names: [], hostPatterns: [], domains: [], companies: [] })]) {
      writeFileSync(path, content);
      assert.throws(() => loadPublicIdentityDenylist({ path }), /Capture denylist/);
    }
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("text selection skips binary files and lockfiles", () => {
  assert.equal(trackedText(Buffer.from([65, 0, 66])), null);
  assert.equal(trackedText(Buffer.from([255, 254])), null);
  assert.equal(trackedText(Buffer.from("plain text")), "plain text");
  for (const file of ["devenv.lock", "web/package-lock.json", "yarn.lock", "pnpm-lock.yaml", "npm-shrinkwrap.json"]) assert.equal(isLockfile(file), true);
  assert.equal(isLockfile("web/src/content/family.ts"), false);
});
