import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import ts from "typescript";
import { captureTextProblems, createCaptureSanitizer, loadCaptureDenylist, emailPattern, ipv4Pattern, hostPattern, domainPattern } from "../scripts/capture-aeon-demo/privacy.mjs";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const captureDir = "scripts/capture-aeon-demo/";
const temporary = mkdtempSync(join(tmpdir(), "aeon-capture-privacy-test-"));
const fixturePath = join(temporary, "denylist.json");
writeFileSync(fixturePath, JSON.stringify({
  names: [{ value: "Jane Roe", replacement: "Demo Person" }],
  hostPatterns: [{ pattern: "\\bbuild-host-\\d+\\b", replacement: "demo-host" }],
  domains: [{ value: "corp.invalid", replacement: "demo.example.com" }],
  companies: [{ value: "Example Industries", replacement: "Demo Company" }],
}));
const fixture = loadCaptureDenylist({ path: fixturePath });

test("the durable demo capture route requires private configuration and uses installed Chrome", async () => {
  const [runner, spec, config, privacy] = await Promise.all([
    read(`${captureDir}run.mjs`), read(`${captureDir}capture.spec.ts`), read(`${captureDir}capture.config.ts`), read(`${captureDir}privacy.mjs`),
  ]);
  for (const source of [runner, spec, config, privacy]) {
    assert.match(source, /SPDX-License-Identifier: AGPL-3\.0-only/);
    assert.match(source, /never production data, a fleet host, browser chrome or an instance URL/);
    assert.match(source, /outside the Codex sandbox \(NIX-445\)/);
    assert.match(source, /Opus visual QA before publishing/);
    assert.match(source, /INSPR_CAPTURE_DENYLIST or ~\/\.inspr\/capture-denylist\.json/);
    assert.match(source, /names, hostPatterns, domains, companies arrays/);
    assert.match(source, /never (?:be )?commit/);
    assert.doesNotMatch(source, /\/private\/tmp\/claude|\.\.\/paimos-128/);
  }
  assert.match(runner, /copyFileSync\(join\(source, name\), join\(target, name\)\)/);
  assert.match(runner, /"capture\.spec\.ts", "capture\.config\.ts", "privacy\.mjs"/);
  assert.match(runner, /"build", "--outDir", join\(output, "site"\), "--configLoader", "runner"/);
  assert.match(runner, /node_modules\/@playwright\/test\/cli\.js/);
  assert.match(config, /executablePath:chrome/);
  assert.doesNotMatch(runner, /playwright install|ssh|git /);
  assert.ok(runner.indexOf("loadCaptureDenylist({") < runner.indexOf("mkdirSync(target"));
  assert.match(spec, /const denylist = loadCaptureDenylist\(\)/);
  assert.match(spec, /captureTextProblems\(await page\.locator\('body'\)\.innerText\(\), denylist\)/);
  assert.match(spec, /json:sanitize\(response\.json\)/);
  assert.match(spec, /if\(path\.startsWith\('\/api\/'\)\) return route\.fulfill\(\{status:501/);
  assert.match(spec, /page\.screenshot/);
});

test("the local denylist blocks synthetic identities before capture and replaces them before rendering", () => {
  const sanitize = createCaptureSanitizer(fixture);
  const cases = [
    ["Jane Roe", "Demo Person"], ["build-host-7", "demo-host"],
    ["corp.invalid", "demo.example.com"], ["Example Industries", "Demo Company"],
  ];
  for (const [input, expected] of cases) {
    assert.ok(captureTextProblems(input, fixture).length, "an unchanged denylisted value must fail the guard");
    assert.equal(sanitize(input), expected);
    assert.deepEqual(captureTextProblems(sanitize(input), fixture), []);
  }
  assert.deepEqual(sanitize({ person: "jane roe", nested: ["BUILD-HOST-77", { company: "Example Industries" }] }), {
    person: "Demo Person", nested: ["demo-host", { company: "Demo Company" }],
  });
});

test("generic email, IPv4, domain and host guards catch values absent from the denylist", () => {
  const sanitize = createCaptureSanitizer(fixture);
  const address = [203, 0, 113, 7].join(".");
  const email = "contact" + "@" + ["outside", "example", "net"].join(".");
  const domain = ["tenant", "example", "net"].join(".");
  const host = "box" + 731;
  for (const input of [address, email, domain, host, `https://${domain}/status`]) {
    assert.ok(captureTextProblems(input, fixture).length, "generic private text must fail the body guard");
    assert.notEqual(sanitize(input), input);
    assert.deepEqual(captureTextProblems(sanitize(input), fixture), []);
  }
  assert.equal(sanitize(email), "capture@example.com");
  const exampleEmails = ["jane@example.com", "jane" + "@" + "sample.test", "jane" + "@" + "sample.invalid"];
  for (const input of exampleEmails) {
    assert.equal(sanitize(input), input);
    assert.deepEqual(captureTextProblems(input, fixture), []);
  }
  assert.ok(captureTextProblems("jane" + "@" + "corp.invalid", fixture).length, "an explicit denylist overrides fictional-domain email allowances");
  for (const input of ["example.com", "demo.example.org", "github.com", "paimos.inspr.at", "sha256", "arm64", "amd64", "qwen3"]) {
    assert.equal(sanitize(input), input);
    assert.deepEqual(captureTextProblems(input, fixture), []);
  }
  assert.deepEqual(sanitize({ permissions: ["delivery.read", domain, email], title: "delivery.read" }), {
    permissions: ["delivery.read", "demo.example.com", "capture@example.com"], title: "demo.example.com",
  }, "protocol permissions must still authorize the fixture UI; display text stays guarded");
});

test("denylist loading fails closed on missing, empty, malformed and invalid configuration", () => {
  const invalid = join(temporary, "invalid.json");
  assert.throws(() => loadCaptureDenylist({ path: join(temporary, "missing.json") }), /missing or unreadable.*capture is disabled/);
  for (const text of ["", "{}", "null", "[]", "not JSON", JSON.stringify(Object.fromEntries(["names", "hostPatterns", "domains", "companies"].map((key) => [key, []])))]) {
    writeFileSync(invalid, text);
    assert.throws(() => loadCaptureDenylist({ path: invalid }), /Capture denylist.*capture is disabled/);
  }
  for (const entry of ["[", "", ".*"]) {
    writeFileSync(invalid, JSON.stringify({ names: [], hostPatterns: [entry], domains: [], companies: [] }));
    assert.throws(() => loadCaptureDenylist({ path: invalid }), /Capture denylist.*capture is disabled/);
  }
  assert.throws(() => loadCaptureDenylist({ path: fixturePath, repositoryRoots: [temporary] }), /outside the repositories/);
  assert.throws(() => createCaptureSanitizer({ rules: [] }), /empty.*capture is disabled/);
  assert.throws(() => captureTextProblems("fictional", { rules: [] }), /empty.*capture is disabled/);
});

test("denylist supports shorthand entries and rejects unsafe replacements", () => {
  const path = join(temporary, "shorthand.json");
  const config = { names: ["Jane Roe"], hostPatterns: ["build-host-\\d+"], domains: ["corp.invalid"], companies: ["Example Industries"] };
  writeFileSync(path, JSON.stringify(config));
  assert.equal(createCaptureSanitizer(loadCaptureDenylist({ path }))("Jane Roe"), "Demo Person");
  config.names = [{ value: "Jane Roe", replacement: "corp.invalid" }];
  writeFileSync(path, JSON.stringify(config));
  assert.throws(() => createCaptureSanitizer(loadCaptureDenylist({ path })), /unsafe replacement/);
});

test("the runner fails before any copy or build without its local denylist", () => {
  const output = join(temporary, "output");
  const result = spawnSync(process.execPath, [new URL(`../${captureDir}run.mjs`, import.meta.url).pathname, temporary, output], {
    encoding: "utf8", env: { ...process.env, INSPR_CAPTURE_DENYLIST: join(temporary, "missing.json") },
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /missing or unreadable.*capture is disabled/);
  assert.equal(existsSync(join(temporary, "web")), false);
  assert.equal(existsSync(output), false);
});

test("public capture sources contain no literal addresses, private URL domains or unexpected name/host tokens", () => {
  const root = new URL(`../${captureDir}`, import.meta.url);
  const files = readdirSync(root).map((name) => new URL(name, root));
  files.push(new URL(import.meta.url));
  const syntheticAndProductNames = new Set([
    "Jane Roe", "Demo Person", "Demo Company", "Example Industries", "Acme Studio",
    "Google Chrome", "Claude Fable", "Codex Seatbelt", "Example Cloud",
    "Die Freigabe", "Pull Request", "Installed Google", "Obtain Opus",
  ]);
  for (const file of files) {
    const source = readFileSync(file, "utf8");
    // Normalize escaped dots too, so spelling an address in a regex is not an escape hatch.
    const text = source.replace(/\\\./g, ".");
    for (const match of text.matchAll(new RegExp(emailPattern))) {
      assert.match(match[0].split("@").at(-1), /(?:^|\.)example\.(?:com|org)$|\.(?:test|invalid)$/, "source email must be fictional");
    }
    assert.doesNotMatch(text, ipv4Pattern, "source must not contain IPv4 literals");
    assert.doesNotMatch(text, hostPattern, "source must not contain private host literals");
    for (const match of text.matchAll(/https?:\/\/([a-z0-9.-]+)/gi)) {
      assert.deepEqual(captureTextProblems(match[1], fixture), [], "source URL host must be public or local");
    }
    for (const match of text.matchAll(/\b[A-Z][a-z]+ [A-Z][a-z]+\b/g)) {
      assert.ok(syntheticAndProductNames.has(match[0]), "unexpected name-shaped source text");
    }
  }
});

test("the source audit also rejects private domain literals in strings, regexes and comments", () => {
  const publicCodeTerms = new Set([
    "entry.group.key", "collapsed.has", "words.stop", "m.id", "button.group", "section.delivery", "section.pane",
    "delivery.delivered", "textarea.field", "page.locator", "response.json", "path.startsWith", "route.fulfill",
    "page.screenshot", "content.theatre.screens.find", "screen.id", "demo.screen", "screen.body", "lens.images", "specs.items",
  ]);
  const syntheticDomains = new Set(["corp.invalid", "sample.test", "sample.invalid"]);
  const audit = (source) => {
    const parsed = ts.createSourceFile("source.ts", source, ts.ScriptTarget.Latest, true);
    const literals = [];
    const visit = (node) => {
      for (const range of [...(ts.getLeadingCommentRanges(source, node.pos) ?? []), ...(ts.getTrailingCommentRanges(source, node.end) ?? [])]) literals.push(source.slice(range.pos, range.end));
      if (ts.isStringLiteralLike(node) || ts.isRegularExpressionLiteral(node) ||
          [ts.SyntaxKind.TemplateHead, ts.SyntaxKind.TemplateMiddle, ts.SyntaxKind.TemplateTail].includes(node.kind)) literals.push(node.text);
      ts.forEachChild(node, visit);
    };
    visit(parsed);
    const problems = [];
    for (const literal of literals) {
      for (const match of literal.replace(/\\\./g, ".").matchAll(new RegExp(domainPattern))) {
        const value = match[0];
        // Reviewed source filenames, permission syntax and UI selectors are
        // code, while every other dotted literal must be public or synthetic.
        if (/\.(?:mjs|ts|vue|js|json|html|txt|py|png|astro|app)$/i.test(value) ||
            /^[a-z_]+\.(?:read|manage)$/.test(value) || publicCodeTerms.has(value) || syntheticDomains.has(value)) continue;
        if (captureTextProblems(value, fixture).length) problems.push("non-public domain literal");
      }
    }
    return problems;
  };
  const privateDomain = ["outside", "example", "net"].join(".");
  for (const source of [`const label = '${privateDomain}'`, `const pattern = /${privateDomain.replaceAll(".", "\\.")}/`, `// ${privateDomain}`]) {
    assert.ok(audit(source).length, "the generic audit must catch domain literals outside URLs");
  }
  const root = new URL(`../${captureDir}`, import.meta.url);
  for (const file of [...readdirSync(root).map((name) => new URL(name, root)), new URL(import.meta.url)]) {
    assert.deepEqual(audit(readFileSync(file, "utf8")), [], "public source must have no private domain literals");
  }
});

test("demo lens captions share the theatre bodies without changing capability claims", async () => {
  const [page, grid] = await Promise.all([read("src/components/AeonPage.astro"), read("src/components/SpecsGrid.astro")]);
  assert.match(page, /content\.theatre\.screens\.find\(\(screen\) => screen\.id === demo\.screen\)/);
  assert.match(page, /body: screen\.body/);
  for (const variant of ["note", "noteEli10"]) {
    assert.ok(grid.includes(`lens.images[i]?.body ?? specs.items[i]?.${variant}`));
  }
  assert.doesNotMatch(page, /name: "attention-preview\.png"/);
});
