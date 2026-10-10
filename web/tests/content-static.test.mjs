import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  mkdir,
  mkdtemp,
  readFile,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import {
  createReleaseMetadata,
  releaseManifest,
} from "../release-metadata.mjs";
import { FIXTURE_REVISION, createCheckout, createHost } from "./support/fake-host.mjs";

const sourceUrl = new URL("../src/", import.meta.url);

const products = [
  {
    slug: "paimos",
    exportName: "paimosContent",
    canonical: "https://paimos.inspr.at",
    licensePattern: /name:\s*"AGPL-3\.0-only"/,
  },
  {
    slug: "pharos",
    exportName: "pharosContent",
    canonical: "https://pharos.inspr.at",
    licensePattern: /name:\s*"AGPL-3\.0-only"/,
  },
  {
    slug: "janus",
    exportName: "janusContent",
    canonical: "https://janus.inspr.at",
    licensePattern: /name:\s*"AGPL-3\.0-only"/,
  },
];

async function source(relativePath) {
  return readFile(new URL(relativePath, sourceUrl), "utf8");
}

function relativeLuminance(hex) {
  const channels = hex.match(/[0-9a-f]{2}/gi).map((channel) => {
    const normalized = Number.parseInt(channel, 16) / 255;
    return normalized <= 0.04045
      ? normalized / 12.92
      : ((normalized + 0.055) / 1.055) ** 2.4;
  });

  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function contrastRatio(foreground, background) {
  const luminances = [relativeLuminance(foreground), relativeLuminance(background)]
    .sort((left, right) => right - left);
  return (luminances[0] + 0.05) / (luminances[1] + 0.05);
}

test("each product route renders its canonical content through ProductPage", async () => {
  const urls = await source("content/urls.ts");

  for (const { slug, exportName, canonical } of products) {
    assert.ok(
      urls.includes(`${slug}: "${canonical}"`),
      `${slug} canonical URL must remain centralized in content/urls.ts`,
    );
    // INSPR-544: /paimos is the AEON page (paimos-aeon-static.test.mjs); the
    // retired ProductPage route for Paimos is gone.
    if (slug === "paimos") continue;
    const route = await source(`pages/${slug}/index.astro`);

    assert.match(
      route,
      /import ProductPage from "\.\.\/\.\.\/components\/ProductPage\.astro";/,
      `${slug} must use the shared product page`,
    );
    assert.match(
      route,
      new RegExp(`import \\{ ${exportName} \\} from "\\.\\.\\/\\.\\.\\/content\\/${slug}";`),
      `${slug} must import its own content`,
    );
    assert.match(
      route,
      new RegExp(`<ProductPage content=\\{${exportName}\\} \\/>`),
      `${slug} must pass its content to ProductPage`,
    );
  }
});

test("business and legal links point at the live Augmentoring site", async () => {
  const urls = await source("content/urls.ts");

  // INSPR-481: amt.inspr.at was the Augmentoring preview host and has no DNS.
  assert.doesNotMatch(urls, /amt\.inspr\.at/);
  assert.match(urls, /"https:\/\/augmentoring\.com",/);
  assert.match(urls, /legal: "https:\/\/www\.inspr\.at\/legal\/",/);
  assert.match(urls, /legalGerman: "https:\/\/www\.inspr\.at\/de\/impressum\/",/);
  assert.match(urls, /privacy: "https:\/\/www\.inspr\.at\/privacy\/",/);
  assert.match(urls, /privacyGerman: "https:\/\/www\.inspr\.at\/de\/datenschutz\/",/);
  assert.doesNotMatch(urls, /augmentoring\.com\/(?:impressum|datenschutz)/);
});

test("microsites keep an accessible mobile section menu", async () => {
  const header = await source("components/MicrositeHeader.astro");
  const styles = await source("styles/microsites.css");

  assert.match(header, /<details class="mobile-navigation" data-mobile-navigation>/);
  assert.match(header, /mobile: "Mobile navigation"/);
  assert.match(header, /aria-label=\{labels\.mobile\}/);
  assert.match(header, /event\.key !== "Escape"/);
  assert.match(styles, /@media \(max-width: 72rem\)[\s\S]*?\.mobile-navigation \{\s*display: block;/);
});

test("the three-engine browser gate stays within the constrained CI runner", async () => {
  const config = await readFile(
    new URL("../playwright.config.mjs", import.meta.url),
    "utf8",
  );
  const workflow = await readFile(
    new URL("../../.github/workflows/ci.yml", import.meta.url),
    "utf8",
  );
  const featureGeometry = await readFile(
    new URL("browser/feature-experience.spec.mjs", import.meta.url),
    "utf8",
  );
  const tableGeometry = await readFile(
    new URL("browser/integration-table.spec.mjs", import.meta.url),
    "utf8",
  );

  assert.match(config, /workers: process\.env\.CI \? 1 : undefined/);
  assert.match(config, /fullyParallel: true/);
  assert.match(config, /retries: process\.env\.CI \? 1 : 0/);
  assert.match(workflow, /npm run test:browser -- --project=chromium/);
  assert.match(workflow, /npm run test:browser -- --project=firefox/);
  for (const shard of [1, 2, 3, 4]) {
    assert.match(
      workflow,
      new RegExp(`npm run test:browser -- --project=webkit --grep-invert @video --shard=${shard}/4`),
    );
  }
  // INSPR-538: Linux WebKit loads pages without <video>; @video tests keep it
  // and run in their own WebKit step.
  assert.match(workflow, /npm run test:browser -- --project=webkit --grep @video\n/);
  for (const spec of ["calendar-version", "feature-experience", "graphics-clipping", "integration-table", "paimos-aeon", "paimos-carousel"]) {
    const source = await readFile(new URL(`browser/${spec}.spec.mjs`, import.meta.url), "utf8");
    assert.match(source, /from "\.\/fixtures\.mjs";/, spec);
  }
  for (const geometryTest of [featureGeometry, tableGeometry]) {
    assert.doesNotMatch(geometryTest, /scrollIntoViewIfNeeded/);
    assert.match(geometryTest, /scrollIntoView\(\{ block: "center", inline: "nearest" \}\)/);
  }
  assert.doesNotMatch(tableGeometry, /expect\.poll/);
  assert.match(tableGeometry, /const scrollPosition = await scroller\.evaluate/);
});

test("the CSP verifier rejects stale pins even when no inline scripts exist", async () => {
  const fixture = await mkdtemp(join(tmpdir(), "inspr-csp-"));

  try {
    await mkdir(join(fixture, "web", "dist"), { recursive: true });
    await mkdir(join(fixture, "site"), { recursive: true });
    await writeFile(join(fixture, "web", "dist", "index.html"), "<!doctype html><title>Current</title>");
    await writeFile(join(fixture, "site", "index.html"), "<!doctype html><title>Archive</title>");
    await writeFile(
      join(fixture, "Caddyfile"),
      "header Content-Security-Policy \"script-src 'self' 'sha256-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA='\"\n",
    );

    const result = spawnSync(
      "python3",
      [fileURLToPath(new URL("../scripts/verify-csp.py", import.meta.url)), "--root", fixture],
      { encoding: "utf8" },
    );

    assert.equal(result.status, 1);
    assert.match(result.stderr, /INFO: no inline scripts found/);
    assert.match(result.stderr, /FAIL: pinned hashes no longer used/);
  } finally {
    await rm(fixture, { recursive: true, force: true });
  }
});

test("the shared Pharos mark is the canonical low-complexity SVG", async () => {
  const mark = await source("assets/products/pharos/mark.svg");

  assert.match(mark, /viewBox="0 0 88 88"/);
  assert.match(mark, /stroke="#d69b31"/);
  assert.doesNotMatch(mark, /<image/);
  assert.ok((mark.match(/<(?:path|rect)\b/g) ?? []).length <= 12);
});

test("the umbrella links its public site, product sources and direct license", async () => {
  const umbrella = await source("pages/index.astro");

  assert.match(umbrella, /const repositoryUrl = "https:\/\/github\.com\/inspr-at\/inspr-site";/);
  assert.match(umbrella, /const productSourcesUrl = `\$\{repositoryUrl\}#product-sources`;/);
  assert.match(umbrella, /const modulesUrl = "https:\/\/github\.com\/inspr-at\/inspr-modules";/);
  assert.doesNotMatch(umbrella, /https:\/\/github\.com\/inspr-at\/inspr(?:["'`/]|$)/);
  assert.match(umbrella, /const siteLicenseUrl = `\$\{repositoryUrl\}\/blob\/main\/LICENSE`/);
  assert.match(umbrella, /licenseName="AGPL-3\.0-only"/);
  assert.match(umbrella, /licenseUrl=\{siteLicenseUrl\}/);
});

test("the handoff guide teaches four stable, keyboard-inspectable questions", async () => {
  const packet = await source("components/SituationPacket.astro");

  assert.match(packet, /role="tablist"/);
  assert.match(packet, /role="tab"/);
  assert.match(packet, /role="tabpanel"/);
  assert.match(packet, /aria-selected/);
  assert.match(packet, /What are we trying to achieve\?/);
  assert.match(packet, /What is true right now\?/);
  assert.match(packet, /What may this task do\?/);
  assert.match(packet, /How do we know it worked\?/);
  assert.match(packet, /One concrete handoff/);
  assert.match(packet, /Why it matters/);
  assert.match(packet, /event\.key === "ArrowRight"/);
  assert.match(packet, /event\.key === "Home"/);
  assert.doesNotMatch(packet, /aria-pressed/);
  assert.doesNotMatch(packet, /data-signal-state/);
  assert.doesNotMatch(packet, /Complete · 4\/4/);
  assert.doesNotMatch(packet, /Ready for bounded work/);
});

test("the frozen archive redirects its historical identity entry before file handling", async () => {
  const caddy = await readFile(new URL("../../Caddyfile", import.meta.url), "utf8");
  const redirectIndex = caddy.indexOf("@archive_enter");
  const archiveIndex = caddy.indexOf("@archive host v1.inspr.at");

  assert.ok(redirectIndex >= 0 && redirectIndex < archiveIndex);
  assert.match(caddy, /redir @archive_enter https:\/\/inspr\.at\/enter 308/);
});

test("apex and identity edge routes enforce HTTPS and HSTS", async () => {
  const compose = await readFile(new URL("../../docker-compose.yml", import.meta.url), "utf8");
  const deploy = await readFile(new URL("../../deploy.sh", import.meta.url), "utf8");

  assert.match(compose, /inspr-edge-hsts\.headers\.stsSeconds=31536000/);
  assert.match(compose, /inspr-edge-hsts\.headers\.stsIncludeSubdomains=true/);
  assert.match(compose, /inspr-edge-hsts\.headers\.stsPreload=true/);
  assert.match(compose, /inspr-apex\.middlewares=inspr-edge-hsts@docker,/);
  assert.match(compose, /inspr-auth\.middlewares=[^\n]*inspr-edge-hsts@docker/);
  assert.match(compose, /zitadel\.middlewares=[^\n]*inspr-edge-hsts@docker/);
  assert.match(compose, /zitadel-http\.rule=Host\(`auth\.inspr\.at`\)/);
  assert.match(compose, /zitadel-http\.middlewares=inspr-sites-https@docker/);
  assert.match(deploy, /identity service HTTPS/);
  assert.match(deploy, /identity HTTP upgrade/);
  assert.match(deploy, /Strict-Transport-Security missing/);
  // The containers are declared in nixcfg (OPS-136): deploy.sh must never
  // reconcile them through the legacy compose project. It may only promote
  // the bind-mounted Caddyfile and restart the stateless edge to re-bind it.
  assert.doesNotMatch(deploy, /docker compose/);
  assert.doesNotMatch(deploy, /LOCAL_COMPOSE_HASH|REMOTE_COMPOSE_HASH/);
  assert.doesNotMatch(deploy, /remote_hash\s+"docker-compose\.yml"/);
  assert.doesNotMatch(deploy, /\$ROOT\/docker-compose\.yml/);
  assert.match(deploy, /docker restart inspr-www/);
  assert.match(deploy, /the Caddyfile of \$CURRENT_RELEASE could not be restored and re-bound/);
  assert.match(deploy, /automatic rollback did not complete \(%s\); the failed %s may still be live and needs operator attention/);
});

test("identity edge rejects the deployed sibling-header spoof contract", () => {
  const contract = spawnSync(
    process.execPath,
    [fileURLToPath(new URL("../../auth/check-edge-contract.mjs", import.meta.url))],
    { encoding: "utf8" },
  );
  assert.equal(contract.status, 0, contract.stderr || contract.stdout);
  assert.match(contract.stdout, /inspr-auth edge contract: ok/);
});

test("identity bootstrap requires environment identity and passwords without embedded credentials", async () => {
  const script = await readFile(new URL("../../auth/bootstrap-zitadel.sh", import.meta.url), "utf8");
  // Boolean assertions keep script contents and any regression values out of failures.
  assert.equal(/^\s*USER_PASSWORD=/m.test(script), false, "bootstrap password must have no assignment/default");
  assert.equal(/\$\{[A-Z_]*PASSWORD:-[^}]+\}/.test(script), false, "password defaults are forbidden");
  for (const key of ["COMPOSE_DIR", "USER_LOGIN_NAME", "USER_FIRST", "USER_LAST", "USER_EMAIL", "USER_PASSWORD", "SMTP_PASSWORD"]) {
    assert.equal(script.includes(': "${' + key + ':?set ' + key + ' '), true, `${key} must be required`);
  }
  assert.equal(/passwordChangeRequired:\s*true/.test(script), true, "import must require a password change");
  assert.equal(/changeRequired:\s*true/.test(script), true, "reset must require a password change");
  assert.equal(/(?:passwordChangeRequired|changeRequired):\s*false/.test(script), false, "password change must not be disabled");
  assert.equal(/^\s*(?:echo|printf|log|die)\b[^\n]*\$(?:USER_PASSWORD\b|\{USER_PASSWORD[}:])/m.test(script), false, "bootstrap password must not be printed");
  const problems = [];
  for (const [index, line] of script.split("\n").entries()) {
    for (const match of line.matchAll(/[A-Za-z0-9._%+-]+@([A-Za-z0-9.-]+\.[A-Za-z]{2,})/g)) {
      if (!/(?:^|\.)example\.(?:com|org|net)$/.test(match[1])) problems.push(`auth/bootstrap-zitadel.sh:${index + 1}`);
    }
  }
  assert.equal(problems.length, 0, problems.join("\n"));
});

test("identity bootstrap help needs no configuration and missing inputs fail before host or network steps", async () => {
  const path = fileURLToPath(new URL("../../auth/bootstrap-zitadel.sh", import.meta.url));
  const root = await mkdtemp(join(tmpdir(), "inspr-bootstrap-inputs-"));
  try {
    const bin = join(root, "bin");
    const steps = join(root, "steps");
    await mkdir(bin);
    for (const command of ["curl", "docker", "jq", "cat", "grep"]) {
      await writeFile(join(bin, command), `#!/bin/bash\nprintf '%s\\n' '${command}' >> '${steps}'\nexit 99\n`, { mode: 0o755 });
    }
    const run = (args, extra = {}) => spawnSync("/bin/bash", [path, ...args], {
      cwd: root,
      encoding: "utf8",
      env: { PATH: `${bin}:${process.env.PATH ?? "/usr/bin:/bin"}`, ...extra },
    });
    for (const flag of ["--help", "-h"]) {
      const result = run([flag]);
      assert.equal(result.status, 0);
      for (const key of ["COMPOSE_DIR", "USER_LOGIN_NAME", "USER_FIRST", "USER_LAST", "USER_EMAIL", "USER_PASSWORD", "SMTP_PASSWORD"]) {
        assert.equal(result.stdout.includes(key), true, `help must document ${key}`);
      }
      assert.equal(result.stdout.includes("--create-user"), true, "help must document explicit user creation");
    }
    const inputs = {
      COMPOSE_DIR: "/srv/web-host/inspr-at", USER_LOGIN_NAME: "demo-user",
      USER_FIRST: "Ada", USER_LAST: "Example", USER_EMAIL: "ada@example.com",
      SMTP_PASSWORD: "synthetic-relay-input",
    };
    for (const key of Object.keys(inputs)) {
      for (const value of [undefined, ""]) {
        const result = run([], { ...inputs, [key]: value });
        assert.equal(result.status, 1);
        assert.equal(result.stderr.includes(`set ${key} `), true, `missing ${key} must fail clearly`);
        assert.equal(result.stdout, "");
        for (const secretKey of ["SMTP_PASSWORD"]) {
          assert.equal(result.stderr.includes(inputs[secretKey]), false, "password inputs must stay redacted");
        }
      }
    }
    for (const value of [undefined, ""]) {
      const result = run(["--reset-password"], { ...inputs, USER_PASSWORD: value });
      assert.equal(result.status, 1);
      assert.equal(result.stderr.includes("set USER_PASSWORD to reset"), true);
      assert.equal(result.stdout, "");
    }
    await assert.rejects(stat(steps), { code: "ENOENT" });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("identity bootstrap credential comments report only file and line", async () => {
  const problemsFor = (text, file) => {
    const problems = [];
    for (const [index, line] of text.split("\n").entries()) {
      if (!/^\s*#/.test(line) || !/password|passwort|secret|token/i.test(line)) continue;
      const errorCodes = new Set(["Token.Invalid"]);
      const quoted = [...line.matchAll(/"([^"]*)"|'([^']*)'/g)]
        .some((match) => !errorCodes.has(match[1] ?? match[2]));
      const credential = line.split(/\s+/).some((word) => word.length >= 8
        && /[A-Za-z]/.test(word) && /[0-9]/.test(word) && /[^A-Za-z0-9]/.test(word));
      if (quoted || credential) problems.push(`${file}:${index + 1}`);
    }
    return problems;
  };
  const file = "auth/bootstrap-zitadel.sh";
  const script = await readFile(new URL("../../auth/bootstrap-zitadel.sh", import.meta.url), "utf8");
  const problems = problemsFor(script, file);
  assert.equal(problems.length, 0, problems.join("\n"));
  for (const comment of ["# password 'example'", '# SECRET "example"', "# passwort Demo7+abc", "# token Demo7+abc"]) {
    assert.deepEqual(problemsFor(`neutral\n${comment}`, "fixture.sh"), ["fixture.sh:2"]);
  }
  assert.deepEqual(problemsFor('# operator-supplied password is accepted\n# token rotation is explicit\n# secret is redacted\n# access-token failure: "Token.Invalid"', "fixture.sh"), []);
});

test("identity bootstrap validates inputs and explicit user creation before any API mutation", async () => {
  const source = await readFile(new URL("../../auth/bootstrap-zitadel.sh", import.meta.url), "utf8");
  assert.equal((source.match(/^USER_SEARCH=/gm) ?? []).length, 1, "the human-user lookup must be reused");
  const root = await mkdtemp(join(tmpdir(), "inspr-bootstrap-preflight-"));
  try {
    const bin = join(root, "bin");
    const compose = join(root, "compose");
    const script = join(root, "bootstrap.sh");
    const calls = join(root, "calls");
    await mkdir(bin);
    await mkdir(join(compose, ".machinekey"), { recursive: true });
    await writeFile(join(compose, ".machinekey", "pat.txt"), "synthetic-bootstrap-input\n");
    await writeFile(script, source);
    // Stubs record operation names only, never headers, payloads or inputs.
    await writeFile(join(bin, "curl"), `#!${process.execPath}
const { appendFileSync } = require("node:fs");
const args = process.argv.slice(2);
const url = args.find((arg) => arg.startsWith("https://"));
if (!url) process.exit(96);
const path = new URL(url).pathname;
const record = (name) => appendFileSync(process.env.BOOTSTRAP_CALL_LOG, name + "\\n");
const json = (value) => process.stdout.write(JSON.stringify(value));
if (path === "/.well-known/openid-configuration") { record("ready"); process.exit(0); }
if (path === "/management/v1/orgs/me") {
  record("org"); json({ org: { id: "fixture-org", name: "Fixture Org" } }); process.exit(0);
}
if (path === "/management/v1/users/_search") {
  record("user-lookup");
  if (!args.includes("x-zitadel-orgid: fixture-org")) process.exit(96);
  const query = JSON.parse(args[args.indexOf("-d") + 1]);
  const lookup = query.queries[0].userNameQuery;
  if (lookup.userName !== process.env.USER_LOGIN_NAME || lookup.method !== "TEXT_QUERY_METHOD_EQUALS") process.exit(96);
  if (process.env.BOOTSTRAP_USER_STATE === "lookup-error") process.exit(22);
  if (process.env.BOOTSTRAP_USER_STATE === "malformed") { process.stdout.write("invalid-json"); process.exit(0); }
  json({ result: process.env.BOOTSTRAP_USER_STATE === "existing" ? [{ id: "existing-user" }] : [] }); process.exit(0);
}
if (path === "/management/v1/projects/_search") {
  record("project-lookup"); json({ result: [{ id: "fixture-project", name: "inspr.at" }] }); process.exit(0);
}
if (path === "/management/v1/projects/fixture-project/apps/_search") {
  record("app-lookup"); json({ result: [{ id: "fixture-app", name: "inspr-www-auth" }] }); process.exit(0);
}
if (path === "/management/v1/projects/fixture-project/apps/fixture-app") {
  record("app-detail"); json({ app: { oidcConfig: { clientId: "fixture-client" } } }); process.exit(0);
}
record(path.endsWith("/_generate_client_secret") ? "rotate-secret" : "mutation");
process.exit(98);
`, { mode: 0o755 });
    await writeFile(join(bin, "jq"), `#!${process.execPath}
const { readFileSync } = require("node:fs");
const args = process.argv.slice(2);
const named = (key) => {
  for (let i = 0; i < args.length; i++) if (args[i] === "--arg" && args[i + 1] === key) return args[i + 2];
};
if (args.includes("-n")) {
  process.stdout.write(JSON.stringify({ queries: [{ userNameQuery: { userName: named("ln"), method: "TEXT_QUERY_METHOD_EQUALS" } }] }));
  process.exit(0);
}
let data;
try { data = JSON.parse(readFileSync(0, "utf8")); } catch { process.exit(3); }
const filter = args.at(-1);
let value;
if (filter === ".org.id") value = data.org.id;
else if (filter === ".org.name") value = data.org.name;
else if (filter === ".result[0].id // empty") value = data.result[0]?.id ?? "";
else if (filter.includes(".result[]?")) value = data.result.find((item) => item.name === named("n"))?.id ?? "";
else if (filter === ".app.oidcConfig.clientId") value = data.app.oidcConfig.clientId;
else process.exit(3);
process.stdout.write(String(value) + "\\n");
`, { mode: 0o755 });
    const inputs = {
      PATH: `${bin}:${process.env.PATH ?? "/usr/bin:/bin"}`, COMPOSE_DIR: compose,
      USER_LOGIN_NAME: "demo-user", USER_FIRST: "Ada", USER_LAST: "Example",
      USER_EMAIL: "ada@example.com", SMTP_PASSWORD: "synthetic-relay-input",
      BOOTSTRAP_CALL_LOG: calls, BOOTSTRAP_USER_STATE: "missing",
    };
    const run = async (flags = [], extra = {}) => {
      await writeFile(calls, "");
      const result = spawnSync("/bin/bash", [script, "--write-env", ...flags], {
        cwd: root, encoding: "utf8", env: { ...inputs, ...extra },
      });
      assert.equal(result.stdout, "");
      assert.equal(result.stderr.includes(inputs.SMTP_PASSWORD), false, "passwords must not appear in diagnostics");
      if (extra.USER_PASSWORD) assert.equal(result.stderr.includes(extra.USER_PASSWORD), false, "passwords must not appear in diagnostics");
      return { result, order: (await readFile(calls, "utf8")).trim().split("\n").filter(Boolean) };
    };
    for (const key of ["COMPOSE_DIR", "USER_LOGIN_NAME", "USER_FIRST", "USER_LAST", "USER_EMAIL", "SMTP_PASSWORD"]) {
      for (const value of [undefined, ""]) {
        const { result, order } = await run([], { [key]: value });
        assert.equal(result.status, 1);
        assert.equal(result.stderr.includes(`set ${key} `), true);
        assert.deepEqual(order, []);
      }
    }
    for (const value of [undefined, "", "synthetic-test-input"]) {
      const { result, order } = await run([], { USER_PASSWORD: value });
      assert.equal(result.status, 1);
      assert.equal(result.stderr.includes("use --create-user"), true);
      assert.deepEqual(order, ["ready", "org", "user-lookup"]);
    }
    for (const value of [undefined, ""]) {
      const creation = await run(["--create-user"], { USER_PASSWORD: value });
      assert.equal(creation.result.status, 1);
      assert.equal(creation.result.stderr.includes("set USER_PASSWORD to create"), true);
      assert.deepEqual(creation.order, ["ready", "org", "user-lookup"]);
      const reset = await run(["--reset-password"], { USER_PASSWORD: value });
      assert.equal(reset.result.status, 1);
      assert.equal(reset.result.stderr.includes("set USER_PASSWORD to reset"), true);
      assert.deepEqual(reset.order, []);
    }
    for (const mode of ["lookup-error", "malformed"]) {
      const { result, order } = await run(["--create-user"], { BOOTSTRAP_USER_STATE: mode, USER_PASSWORD: "synthetic-test-input" });
      assert.notEqual(result.status, 0);
      assert.deepEqual(order, ["ready", "org", "user-lookup"]);
    }
    for (const [mode, flags, password] of [
      ["existing", [], undefined], ["existing", [], ""], ["existing", ["--create-user"], undefined],
      ["existing", ["--reset-password"], "synthetic-test-input"], ["missing", ["--create-user"], "synthetic-test-input"],
    ]) {
      const { result, order } = await run(flags, { BOOTSTRAP_USER_STATE: mode, USER_PASSWORD: password });
      assert.equal(result.status, 98, "validated inputs may reach the intercepted first mutation");
      assert.deepEqual(order, ["ready", "org", "user-lookup", "project-lookup", "app-lookup", "app-detail", "rotate-secret"]);
    }
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("product copy contains no em dashes and no hardcoded business host", async () => {
  for (const { slug } of products) {
    const content = await source(`content/${slug}.ts`);

    assert.ok(!content.includes("\u2014"), `${slug} content contains an em dash`);
    assert.doesNotMatch(
      content,
      /https:\/\/(?:amt\.inspr\.at|augmentoring\.com)/,
      `${slug} must use the centralized business URL instead of a hardcoded host`,
    );
    assert.match(
      content,
      /import \{ productTaxonomy, siteUrls \} from "\.\/urls";/,
      `${slug} must consume centralized site URLs`,
    );
    assert.match(
      content,
      /primaryHref:\s*"#model"/,
      `${slug} hero CTA must target the rendered operating-model section`,
    );
  }
});

test("all product license claims match repository metadata", async () => {
  for (const { slug, licensePattern } of products) {
    const content = await source(`content/${slug}.ts`);
    assert.match(content, licensePattern, `${slug} has an unexpected license claim`);
  }

  for (const { slug } of products) {
    const content = await source(`content/${slug}.ts`);
    assert.match(content, /name:\s*"AGPL-3\.0-only"/);
    assert.doesNotMatch(content, /name:\s*"MIT"/);
  }
});

test("each canonical host publishes its own robots and sitemap pair", async () => {
  const rootRobots = await readFile(new URL("../public/robots.txt", import.meta.url), "utf8");
  const rootSitemap = await readFile(new URL("../public/sitemap.xml", import.meta.url), "utf8");

  assert.match(rootRobots, /https:\/\/www\.inspr\.at\/sitemap\.xml/);
  assert.match(rootSitemap, /<loc>https:\/\/www\.inspr\.at\/<\/loc>/);
  assert.match(rootSitemap, /<loc>https:\/\/www\.inspr\.at\/de\/<\/loc>/);
  assert.match(rootSitemap, /<loc>https:\/\/www\.inspr\.at\/overview\/<\/loc>/);
  assert.match(rootSitemap, /<loc>https:\/\/www\.inspr\.at\/de\/ueberblick\/<\/loc>/);

  for (const { slug, canonical } of products) {
    const robots = await readFile(new URL(`../public/${slug}/robots.txt`, import.meta.url), "utf8");
    const sitemap = await readFile(new URL(`../public/${slug}/sitemap.xml`, import.meta.url), "utf8");

    assert.match(robots, new RegExp(`${canonical.replaceAll(".", "\\.")}\\/sitemap\\.xml`));
    assert.ok(sitemap.includes(`<loc>${canonical}/</loc>`));
  }
});

test("all four microsites render claim visuals and accessible workflow controls", async () => {
  const productPage = await source("components/ProductPage.astro");
  const workflow = await source("components/WorkflowExplorer.astro");
  const umbrella = await source("pages/index.astro");

  assert.match(productPage, /<WorkflowExplorer/);
  assert.match(productPage, /content\.slug === "paimos" && <PaimosProductSurface/);
  assert.match(productPage, /data-integration-filter/);
  assert.match(workflow, /role="tablist"/);
  assert.match(workflow, /aria-selected/);
  assert.match(workflow, /prefers-reduced-motion: reduce/);
  assert.match(workflow, /IntersectionObserver/);
  assert.match(umbrella, /<HomeFlow locale=\{locale\} doctrineHref=\{modulesUrl\} \/>/);

  const assets = [
    "assets/products/inspr/continuity.png",
    "assets/products/paimos/context-ledger.png",
    "assets/products/pharos/fleet-gate.png",
    "assets/products/janus/value-boundary.png",
    "assets/products/paimos/surface-ticket.png",
    "assets/products/paimos/surface-agents.png",
    "assets/products/paimos/surface-knowledge.png",
  ];
  for (const asset of assets) {
    const metadata = await stat(new URL(asset, sourceUrl));
    assert.ok(metadata.size > 10_000, `${asset} must be a real image asset`);
  }
});

test("integration matrices expose a caption and scoped headers", async () => {
  const productPage = await source("components/ProductPage.astro");

  assert.match(productPage, /<caption class="visually-hidden">\{labels\.integrationTableAria\}<\/caption>/);
  assert.equal((productPage.match(/<th scope="col">/g) ?? []).length, 3);
  assert.match(productPage, /<th scope="row">\{item\.name\}<\/th>/);
  assert.match(productPage, /class="table-wrap" role="region" tabindex="0" aria-label=\{labels\.integrationTableAria\}/);
});

test("each product problem section uses a distinct explanatory visual", async () => {
  const productPage = await source("components/ProductPage.astro");
  const problemVisual = await source("components/FractureAtlas.astro");

  const assets = [
    "assets/products/paimos/problem-context.png",
    "assets/products/pharos/problem-evidence.png",
    "assets/products/janus/problem-boundary.png",
  ];
  for (const asset of assets) {
    const metadata = await stat(new URL(asset, sourceUrl));
    assert.ok(metadata.size > 10_000, `${asset} must be a real image asset`);
  }

  assert.match(productPage, /paimos\/problem-context\.png/);
  assert.match(productPage, /pharos\/problem-evidence\.png/);
  assert.match(productPage, /janus\/problem-boundary\.png/);
  assert.match(problemVisual, /<Image/);
  assert.match(problemVisual, /alt=\{alt\}/);
  assert.match(problemVisual, /<figcaption>\{caption\}<\/figcaption>/);
  assert.doesNotMatch(
    problemVisual,
    /Disconnected signals create operational blind spots/,
  );

  for (const { slug } of products) {
    const content = await source(`content/${slug}.ts`);
    assert.match(content, /visualAlt:/);
    assert.match(content, /visualCaption:/);
  }
});

test("all four hero loops preserve the static poster and motion controls", async () => {
  const productPage = await source("components/ProductPage.astro");
  const umbrella = await source("pages/index.astro");
  const heroLoop = await source("components/HeroLoop.astro");

  const mappings = [
    ["inspr", "insprHeroLoop", "inspr/hero-loop.mp4"],
    ["paimos", "paimosHeroLoop", "paimos/hero-loop.mp4"],
    ["pharos", "pharosHeroLoop", "pharos/hero-loop.mp4"],
    ["janus", "janusHeroLoop", "janus/hero-loop.mp4"],
  ];
  for (const [slug, importName, relativeAsset] of mappings) {
    const host = slug === "inspr" ? umbrella : productPage;
    assert.match(host, new RegExp(`import ${importName} from "\\.\\.\/assets\/products\/${relativeAsset}"`));
    const media = await stat(new URL(`assets/products/${relativeAsset}`, sourceUrl));
    assert.ok(media.size >= 250 * 1024, `${slug} hero loop must be a real video`);
    assert.ok(media.size <= 3 * 1024 * 1024, `${slug} hero loop exceeds 3 MiB`);
  }

  assert.match(umbrella, /<HeroLoop[\s\S]*?id="inspr"[\s\S]*?video=\{insprHeroLoop\}/);
  assert.match(productPage, /heroLoop: paimosHeroLoop/);
  assert.match(productPage, /heroLoop: pharosHeroLoop/);
  assert.match(productPage, /heroLoop: janusHeroLoop/);
  assert.match(productPage, /<HeroLoop[\s\S]*?id=\{content\.slug\}[\s\S]*?poster=\{assets\.hero\}[\s\S]*?video=\{assets\.heroLoop\}/);

  assert.match(heroLoop, /autoplay=\{activation === "autoplay"\}/);
  for (const attribute of ["muted", "loop", "playsinline"]) {
    assert.match(heroLoop, new RegExp(`\\n\\s+${attribute}\\n`));
  }
  assert.match(heroLoop, /preload=\{activation === "autoplay" \? "metadata" : "none"\}/);
  assert.match(heroLoop, /poster=\{poster\.src\}/);
  assert.match(heroLoop, /media="\(prefers-reduced-motion: no-preference\)"/);
  assert.match(heroLoop, /<Image[\s\S]*?class="hero-loop__poster"/);
  assert.match(heroLoop, /position: absolute;[\s\S]*?inset: 0;/);
  assert.match(heroLoop, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(heroLoop, /\.hero-loop__video,[\s\S]*?\.hero-loop__control \{[\s\S]*?display: none;/);
  assert.match(heroLoop, /Resume hero animation/);
  assert.match(heroLoop, /IntersectionObserver/);
  assert.doesNotMatch(heroLoop, /is:inline/);
});

test("inspectable rails keep compact desktop labels above minimum contrast", async () => {
  const styles = await source("styles/microsites.css");
  const compactColor = styles.match(/--inspectable-muted: (#[0-9a-f]{6});/i)?.[1];

  assert.equal(compactColor, "#586b79");
  assert.ok(contrastRatio(compactColor, "#fffdf9") >= 4.5);
  assert.ok(contrastRatio(compactColor, "#f8f5ef") >= 4.5);
  assert.match(
    styles,
    /\.inspectable-rail__index \{[\s\S]*?color: var\(--inspectable-muted\);/,
  );
  assert.match(
    styles,
    /\.inspectable-rail__selector-copy small \{[\s\S]*?color: var\(--inspectable-muted\);/,
  );
  assert.match(
    styles,
    /\.inspectable-rail__map-node \{[\s\S]*?color: var\(--inspectable-muted\);/,
  );
  assert.match(
    styles,
    /\.section--ink \.inspectable-rail \{\s*--inspectable-muted: var\(--night-soft\);/,
  );
});

test("Paimos screenshot tabs use neutral tabpanel hosts", async () => {
  const surface = await source("components/PaimosProductSurface.astro");

  assert.match(surface, /<div\s+id=\{`surface-panel-\$\{index\}`\}\s+role="tabpanel"/);
  assert.doesNotMatch(surface, /<article\s+id=\{`surface-panel-/);
  assert.match(surface, /\.product-surface__details \[data-surface-panel\] \{/);
  assert.match(surface, /\.product-surface__details \[data-surface-panel\]\[hidden\] \{/);
  assert.doesNotMatch(surface, /\.product-surface__details article/);
});

test("Paimos public evidence keeps release and capture provenance honest", async () => {
  const content = await source("content/paimos.ts");
  const german = await source("content/de/paimos.ts");
  const productPage = await source("components/ProductPage.astro");
  const surface = await source("components/PaimosProductSurface.astro");

  // INSPR-478: the page presents PAIMOS 7 (AEON). The repository keeps the
  // canonical inspr-at/paimos name, which the Aeon codebase takes over.
  for (const edition of [content, german]) {
    assert.match(edition, /const repositoryUrl = "https:\/\/github\.com\/inspr-at\/paimos";/);
    assert.match(edition, /eyebrow: "Paimos 7 · AEON"/);
    assert.match(edition, /title: "PAIMOS AEON \| /);
    assert.doesNotMatch(edition, /inspr-at\/aeon/);
    assert.doesNotMatch(edition, /—/);
    // Documents the Aeon repository does not ship must not be linked.
    for (const retired of ["IMPLEMENT_THIS_PROVIDERS", "CUSTOMER_PORTAL", "AGENT_INTERFACE", "AGENT_MESSAGE_SECURITY", "api-minimal"]) {
      assert.doesNotMatch(edition, new RegExp(retired));
    }
    // Classic-only claims stay retired.
    for (const classic of [/SQLite/, /cosign-signed/, /CycloneDX/, /Air-gap/, /HubSpot/, /Jira/, /OpenRouter/, /TOTP (?:available|verfügbar)/]) {
      assert.doesNotMatch(edition, classic);
    }
  }
  const linked = [...new Set([...content.matchAll(/docsUrl\("([^"]+)"\)/g)].map(([, name]) => name))].sort();
  assert.deepEqual(linked, ["AGENT_INTEGRATION.md", "PLANNING_HIERARCHY.md", "RELEASE.md"]);

  assert.match(surface, /import captureManifest from .*capture-manifest\.json/);
  for (const name of ["surface-ticket", "surface-agents", "surface-knowledge", "ui-projects", "ui-work-tree", "ui-search", "ui-knowledge-graph", "ui-releases"]) {
    assert.match(surface, new RegExp(`from "\\.\\./assets/products/paimos/${name}\\.png"`));
  }
  assert.match(surface, /const captureRelease = captureManifest\.tag;/);
  assert.match(surface, /figcaption: `Demo workspace, PAIMOS AEON \$\{captureRelease\}: seeded synthetic data\.`/);
  assert.match(surface, /figcaption: `Demo-Arbeitsbereich, PAIMOS AEON \$\{captureRelease\}: synthetisch befüllte Demo-Daten\.`/);
  assert.match(surface, /<figcaption>\{labels\.figcaption\}<\/figcaption>/);
  assert.doesNotMatch(surface, /current build/);
  assert.doesNotMatch(surface, /github\.com\/inspr-at\/paimos\/blob/);
  assert.match(content, /Run records keep requested and effective model, outcome, duration, tokens and cost\. They do not store prompts/);
  assert.match(content, /The MCP server is early and answers only whoami today\./);
  assert.match(content, /There is no local password login, no TOTP and no SAML\./);
  assert.match(productPage, /id="trust"/);
  assert.match(productPage, /id="limits"/);

  // Offline here; npm run build re-proves the public tag.
  const captureCheck = spawnSync(process.execPath, ["scripts/sync-paimos-captures.mjs", "--check", "--offline"], {
    cwd: fileURLToPath(new URL("..", import.meta.url)),
    encoding: "utf8",
  });
  assert.equal(captureCheck.status, 0, captureCheck.stderr || captureCheck.stdout);
});

test("Paimos annotated surface shows one capture per marker", async () => {
  const surface = await source("components/PaimosProductSurface.astro");

  assert.equal(surface.match(/data-surface-frame=\{index\}/g)?.length, 1);
  assert.match(surface, /hidden=\{index !== 0\}/);
  assert.match(surface, /frame\.hidden = Number\(frame\.dataset\.surfaceFrame\) !== activeIndex;/);
  assert.match(surface, /\.product-surface__screen\[hidden\] \{\s*display: none;/);
  for (const number of [1, 2, 3]) {
    assert.match(surface, new RegExp(`\\.product-surface__hotspot--${number} \\{\\s*top: [0-9.]+%;\\s*left: [0-9.]+%;`));
  }
});

test("Paimos capture publication rejects ambiguous or impossible release identities", async () => {
  const captureDir = await mkdtemp(join(tmpdir(), "inspr-paimos-captures-"));
  const script = "scripts/sync-paimos-captures.mjs";
  const cwd = fileURLToPath(new URL("..", import.meta.url));
  const sourceCommit = "a".repeat(40);
  const verifyFailure = (releaseKind, release, expected) => {
    const result = spawnSync(
      process.execPath,
      [script, "--capture-dir", captureDir, "--release-kind", releaseKind, "--release", release, "--source-commit", sourceCommit, "--source-repository", "inspr-at/aeon"],
      { cwd, encoding: "utf8" },
    );
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, expected);
  };

  try {
    verifyFailure("inspr-calendar-v2", "260230120000.0.0", /not a real date and time/);
    verifyFailure("inspr-calendar-v2", "26.09.26.06.46", /not YYMMDDHHMMSS\.0\.0/);
    verifyFailure("inspr-calendar-v2", "260926085451.1.2", /not YYMMDDHHMMSS\.0\.0/);
    verifyFailure("inspr-calendar-v2", "260926085451.00.0", /not YYMMDDHHMMSS\.0\.0/);
    verifyFailure("inspr-calendar-v2", "060926085451.0.0", /not YYMMDDHHMMSS\.0\.0/);
    // INSPR-556: AEON-1032 release 128 declares CalVer3; reject bad
    // coordinates under either identifier and preserve historical CalVer2.
    verifyFailure("inspr-calver-3", "260230120000.0.0", /not a real date and time/);
    verifyFailure("calendar", "260926064658.0.0", /release kind must be inspr-calver-3 or historical inspr-calendar-v2/);
    verifyFailure("semver", "5.17.0", /release kind must be inspr-calver-3 or historical inspr-calendar-v2/);
  } finally {
    await rm(captureDir, { recursive: true, force: true });
  }
});

test("Paimos capture check fails closed on a tampered manifest", async () => {
  const cwd = fileURLToPath(new URL("..", import.meta.url));
  const dir = await mkdtemp(join(tmpdir(), "inspr-paimos-manifest-"));
  const committed = JSON.parse(await source("assets/products/paimos/capture-manifest.json"));
  const check = async (mutate, expected) => {
    const manifest = structuredClone(committed);
    mutate(manifest);
    const path = join(dir, "capture-manifest.json");
    await writeFile(path, JSON.stringify(manifest));
    const result = spawnSync(process.execPath, ["scripts/sync-paimos-captures.mjs", "--check", "--offline", "--manifest", path], { cwd, encoding: "utf8" });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, expected);
  };

  try {
    await check((m) => m.assets.forEach((asset) => delete asset.sha256), /hash is missing from the manifest/);
    await check((m) => m.spares.forEach((asset) => delete asset.sha256), /hash is missing from the manifest/);
    await check((m) => m.videos.forEach((video) => delete video.bytes), /byte size is missing from the manifest/);
    await check((m) => m.videos.forEach((video) => { video.bytes = 0; }), /byte size is missing from the manifest/);
    await check((m) => delete m.layout.observedVersion, /did not report the release being published/);
    await check((m) => { m.release = "260926085452.0.0"; m.tag = "v260926085452.0.0"; }, /did not report the release being published/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("Paimos surface tabs show the screens their landmarks were measured on", async () => {
  const surface = await source("components/PaimosProductSurface.astro");
  const manifest = JSON.parse(await source("assets/products/paimos/capture-manifest.json"));
  const imports = new Map([...surface.matchAll(/import (\w+) from "\.\.\/assets\/products\/paimos\/([\w-]+\.png)";/g)].map(([, b, f]) => [b, f]));
  const details = surface.slice(surface.indexOf("const details = ["), surface.indexOf("\n];", surface.indexOf("const details = [")));
  const shown = [...details.matchAll(/\n    image: (\w+),/g)].map(([, binding]) => imports.get(binding));
  const measured = ["issueContext", "executionControl", "applicableMemories"].map((key) => manifest.layout.landmarks[key].screen);
  assert.deepEqual(shown, measured);
});

test("Paimos product loops stay lazy, bounded and inside the PhotoSwipe gallery", async () => {
  const surface = await source("components/PaimosProductSurface.astro");
  const manifest = JSON.parse(
    await source("assets/products/paimos/capture-manifest.json"),
  );

  assert.equal(manifest.schemaVersion, 4);
  assert.equal(manifest.product, "PAIMOS AEON");
  assert.equal(manifest.releaseKind, "inspr-calendar-v2");
  assert.equal(manifest.data, "synthetic");

  assert.match(surface, /import loopTicketAgents from .*loop-ticket-agents\.mp4/);
  assert.match(surface, /import loopSearchNavigate from .*loop-search-navigate\.mp4/);
  assert.equal(surface.match(/kind: "video" as const/g)?.length, 1);
  assert.equal(surface.match(/id: "(?:ticket-agents|search-navigate)-flow"/g)?.length, 2);
  assert.match(surface, /data-pswp-type=\{view\.kind === "video" \? "video" : undefined\}/);
  assert.match(surface, /loading="lazy"/);
  assert.doesNotMatch(surface, /<video[\s>]/);

  assert.match(surface, /lightbox\.on\("contentLoad"/);
  assert.match(surface, /video\.preload = "none"/);
  assert.match(surface, /lightbox\.on\("contentActivate"/);
  assert.match(surface, /video\.src = content\.data\.videoSrc/);
  assert.match(surface, /lightbox\.on\("contentDeactivate"/);
  assert.match(surface, /lightbox\.on\("contentDestroy"/);
  assert.match(surface, /video\.removeAttribute\("src"\)/);

  assert.match(manifest.release, /^\d{12}\.\d+\.\d+$/);
  assert.equal(manifest.tag, `v${manifest.release}`);
  assert.match(manifest.sourceCommit, /^[0-9a-f]{40}$/);
  assert.deepEqual(
    manifest.videos.map(({ name }) => name),
    ["loop-ticket-agents.mp4", "loop-search-navigate.mp4"],
  );
  assert.ok(manifest.videos.every(({ durationSeconds }) =>
    durationSeconds >= 5 && durationSeconds <= 15
  ));
  assert.ok(manifest.videos.reduce((total, { bytes }) => total + bytes, 0) <= 3 * 1024 * 1024);
});

test("Pharos states release and provider maturity without overclaiming", async () => {
  const pharos = await source("content/pharos.ts");

  assert.match(pharos, /github\.com\/inspr-at\/pharos\/releases/);
  assert.doesNotMatch(pharos, /v0\.1\.4[13]/);
  assert.match(pharos, /status: "Read-only live"/);
  assert.match(pharos, /read-only provider checks are live/);
  assert.match(pharos, /Managed creation stays disabled unless the operator supplies every prerequisite and a bounded authorization/);
  assert.match(pharos, /maturity: "early release, AGPL-3\.0-only"/);
  assert.doesNotMatch(pharos, /status: "Planned"/);
  assert.doesNotMatch(pharos, /connector is implemented and deployed/);
});

test("workflow stages expose icons, evidence signals and source references", async () => {
  for (const { slug } of products) {
    const content = await source(`content/${slug}.ts`);
    const model = content.slice(content.indexOf("model:"), content.indexOf("featureSections:"));

    assert.match(model, /icon:/, `${slug} workflow needs contextual SVG icons`);
    assert.match(model, /signal:/, `${slug} workflow needs a concrete result signal`);
    assert.match(model, /reference:/, `${slug} workflow needs inspectable evidence`);
    assert.match(content, /github\.com\/inspr-at\//, `${slug} evidence must link to source`);
  }
});

test("the July 18 editorial product showcase remains accessible", async () => {
  const umbrella = await source("pages/index.astro");
  const productStart = umbrella.indexOf('<section\n      class="umbrella-products');
  const productEnd = umbrella.indexOf('<section\n      class="identity-utility');
  const showcase = umbrella.slice(productStart, productEnd);

  assert.match(umbrella, /Four tools, each with one clear job\./);
  assert.ok(productStart >= 0 && productEnd > productStart);
  assert.match(showcase, /data-section-pattern="editorial-product-stories"/);
  assert.match(showcase, /class="product-showcase"/);
  assert.match(showcase, /class="product-story-link"/);
  assert.match(showcase, /class="product-story-link"[\s\S]*?<article class:list=/);
  assert.match(showcase, /target="_blank"/);
  assert.match(showcase, /rel="noopener noreferrer"/);
  assert.match(showcase, /aria-labelledby=\{`product-\$\{product\.name\.toLowerCase\(\)\}-link`\}/);
  assert.match(showcase, /opens in a new tab/);
  assert.equal(showcase.match(/href=\{productHref\(product\.href\)\}/g)?.length, 1);
  assert.match(umbrella, /\.product-story-link:focus-visible/);
  assert.doesNotMatch(showcase, /ProductConstellation|product-constellation/);
  assert.doesNotMatch(showcase, /<a class="product-story__visual"/);
  assert.match(umbrella, /name: "Aithema"/);
  assert.match(umbrella, /href: siteUrls\.aithema/);
  assert.match(umbrella, /logo: aithemaLogo/);
  assert.match(umbrella, /hero: aithemaHero/);
  assert.match(showcase, /<p class="product-story__detail">/);
  assert.match(umbrella, /Speak, type or add files; Aithema drafts the requirements\./);
  assert.match(umbrella, /The reusable core is open source, and the hosted workspace is open by invitation/);
  assert.match(umbrella, /hosted workspace is open by invitation/);
  assert.match(umbrella, /Conversation · requirements · Continue/);
  assert.match(showcase, /index % 2 === 0/);
});

test("the INSPR home flow is built from the shared steps and claims no integrated pipeline (INSPR-543)", async () => {
  const [umbrella, flowComponent] = await Promise.all([
    source("pages/index.astro"),
    source("components/HomeFlow.astro"),
  ]);

  // The old four stage cards and their approval signals are gone.
  assert.doesNotMatch(umbrella, /productFlowSteps|WorkflowExplorer|insprContinuity/);
  assert.match(flowComponent, /flow\.steps\.map\(\(step, index\) =>/);
  assert.match(flowComponent, /<StatusChip status=\{step\.status\} locale=\{locale\} \/>/);
  assert.match(flowComponent, /step\.line\[locale\]/);
  assert.match(flowComponent, /products\[step\.product\]\.verb\[locale\]/);
  // The hero is the shared message; the removed pipeline claims stay removed.
  assert.match(umbrella, /<h1 id="hero-title">\{message\.hero\[locale\]\}<\/h1>/);
  assert.match(umbrella, /message\.houseRule\[locale\]/);
  for (const text of [umbrella, flowComponent]) {
    assert.doesNotMatch(text, /Four tools, one path|Every handoff waits for you|blocks on an explicit approval|follow the whole path|You approve each step|Jede Übergabe wartet auf Sie/);
    assert.doesNotMatch(text, /wait for your (?:Continue|review|approval)|Staging waits/);
  }
  // Contract, actors and build order read the shared copy; bots stay planned.
  for (const marker of ["contract.line[locale]", "contract.statusNote[locale]", "actors.map((actor, index)", "buildOrder.map((item, index)"]) {
    assert.ok(umbrella.includes(marker), marker);
  }
});

test("Aithema joins the product family at its public visitor home", async () => {
  const urls = await source("content/urls.ts");
  const footer = await source("components/MicrositeFooter.astro");

  assert.match(urls, /aithema: "https:\/\/aithema\.inspr\.at"/);
  assert.doesNotMatch(urls, new RegExp(String.raw`aithemaPreview|${["start", "augmentoring", "com"].join("\\.")}`));
  assert.match(urls, /aithema: productRole\("aithema"\)/);
  assert.match(urls, /author: "https:\/\/github\.com\/markus-barta"/);
  assert.match(urls, /\{ label: "Aithema", role: productTaxonomy\.aithema, href: siteUrls\.aithema \}/);
  assert.match(footer, /projectLicense: "Project license: AGPL-3\.0-only"/);
  assert.match(footer, /repositories: "Official AGPL-3\.0 text"/);
  assert.match(footer, /\{licenseUrl && \(\s*<a href=\{licenseUrl\}/);
  assert.match(footer, /href=\{siteUrls\.author\}/);
  assert.match(footer, />Markus Barta<\/a> · INSPR/);
  assert.doesNotMatch(footer, /© \{year\} Augmentoring GmbH/);
  assert.doesNotMatch(footer, /All software projects: AGPL-3\.0-only/);

  const aithema = urls.indexOf('{ label: "Aithema"');
  const paimos = urls.indexOf('{ label: "Paimos"');
  const pharos = urls.indexOf('{ label: "Pharos"');
  const janus = urls.indexOf('{ label: "Janus"');
  assert.ok(aithema < paimos && paimos < pharos && pharos < janus);
});

test("the self-hosting answer presents all four products as open source", async () => {
  const umbrella = await source("pages/index.astro");

  assert.match(umbrella, /Yes, all four: Aithema, Paimos, Pharos and Janus are open source and built to self-host/);
  assert.match(umbrella, /All four tools are open for anyone to read and run\./);
  assert.doesNotMatch(umbrella, /module is planned|The fourth is on its way/);
  assert.match(umbrella, /hosted workspace is also available by invitation/);
  assert.doesNotMatch(umbrella, new RegExp(String.raw`${["start", "augmentoring", "com"].join("\\.")}`));
  assert.doesNotMatch(umbrella, /(?:all|every) product is open source/i);
});

test("Aithema metadata names requirements alongside the three established domains", async () => {
  const umbrella = await source("pages/index.astro");

  // INSPR-543: the description is the shared sub-line, not a pipeline claim.
  assert.match(umbrella, /description=\{message\.sub\[locale\]\}/);
  assert.doesNotMatch(umbrella, /A person approves every handoff|Jede Übergabe wird von einem Menschen freigegeben/);
  assert.match(
    umbrella,
    /"Four open INSPR products and a doctrine on one flow from idea to running software"/,
  );
});

test("the local v2 route remains a compatibility alias for the chosen Fable copy", async () => {
  const umbrella = await source("pages/index.astro");
  const v2 = await source("pages/v2/index.astro");

  assert.match(v2, /import Home from "\.\.\/index\.astro"/);
  assert.match(v2, /<Home locale="en" \/>/);
  assert.doesNotMatch(umbrella, /Astro\.props\.edition/);
  // INSPR-543: each product card headline is its shared one-liner.
  assert.match(umbrella, /familyProducts\[product\.key\]\.oneLiner\[locale\]/);
  assert.match(umbrella, /Built so you can say no\./);
  assert.match(umbrella, /ZITADEL is the OIDC identity provider for people across INSPR\./);
  assert.doesNotMatch(umbrella, /planned for later/);
  assert.match(umbrella, /All four products remain open source\./);
  assert.doesNotMatch(umbrella, /Janus enforces which people/);
});

test("Aithema uses the shared product story with a real vector logo and right-side visual", async () => {
  const umbrella = await source("pages/index.astro");
  const logo = await source("assets/products/aithema/logo.svg");

  assert.match(umbrella, /import aithemaHero from "\.\.\/assets\/products\/aithema\/hero\.png"/);
  assert.match(umbrella, /import aithemaLogo from "\.\.\/assets\/products\/aithema\/logo\.svg"/);
  assert.match(umbrella, /class:list=\{\["product-story", \{ "product-story--reverse": index % 2 === 0 \}\]\}/);
  assert.match(umbrella, /\.product-story \{[\s\S]*?grid-template-columns: minmax\(0, 1\.15fr\) minmax\(19rem, 0\.85fr\);/);
  assert.match(umbrella, /\.product-story--reverse \{\s+grid-template-columns: minmax\(19rem, 0\.85fr\) minmax\(0, 1\.15fr\);/);
  assert.match(umbrella, /\.product-story--reverse \.product-story__visual \{\s+order: 2;/);
  assert.match(umbrella, /\.product-story__visual \{[\s\S]*?border: 1px solid rgb\(255 255 255 \/ 0\.82\);[\s\S]*?border-radius: clamp\(1\.4rem, 2\.4vw, 2\.5rem\);/);
  const orderedNames = [...umbrella.matchAll(/\n\s+name: "(Aithema|Paimos|Pharos|Janus)",/g)]
    .map((match) => match[1]);
  assert.deepEqual(orderedNames, ["Aithema", "Paimos", "Pharos", "Janus"]);
  assert.match(logo, /viewBox="0 0 1254 1254"/);
  assert.match(logo, /<title id="aithema-title">Aithema<\/title>/);
  assert.doesNotMatch(logo, /<(?:image|text)\b/);
});

test("interactive explorers use one five-second, pause-only lifecycle", async () => {
  const workflow = await source("components/WorkflowExplorer.astro");
  const surface = await source("components/PaimosProductSurface.astro");

  for (const [name, component] of [["workflow", workflow], ["surface", surface]]) {
    assert.match(component, /STAGE_DURATION = 5000/, `${name} must advance every five seconds`);
    assert.match(component, /\.animate\(/, `${name} must animate elapsed stage time`);
    assert.match(component, /easing: "linear"/, `${name} progress must remain linear`);
    assert.match(component, /pointerenter/, `${name} stages must respond to hover`);
    assert.match(component, /IntersectionObserver/, `${name} must stop work offscreen`);
    assert.match(component, /focusin/, `${name} must hold while keyboard focus is inside`);
    assert.match(component, /focusout/, `${name} must resume after focus leaves`);
    assert.match(
      component,
      /querySelector\(":focus-visible"\)/,
      `${name} must not treat residual pointer focus as an interaction hold`,
    );
    assert.match(component, /AbortController/, `${name} must clean up its interaction listeners`);
    assert.match(component, /animation\.cancel\(\)/, `${name} must release finished animations`);
    assert.match(component, /pause: "Pause"/, `${name} exposes a pause label before interaction`);
    assert.doesNotMatch(component, /Play sequence/, `${name} must not expose a play control`);
    assert.match(
      component,
      /Resume automatic progression/,
      `${name} must expose the resume action while manually paused`,
    );
  }

  assert.match(workflow, /data-workflow-annotation/);
  assert.match(workflow, /experience\.addEventListener\(\s*"pointerenter"/);
  assert.match(workflow, /observer\.observe\(observedControl\)/);
  assert.match(surface, /interactionArea\.addEventListener\(\s*"pointerenter"/);
  assert.match(surface, /observer\.observe\(observedDetails\)/);
  assert.match(surface, /data-surface-progress/);
  assert.doesNotMatch(
    surface,
    /interactionArea\.contains\(document\.activeElement\)/,
    "surface autoplay must not be locked by residual pointer focus",
  );
  assert.match(surface, /\.product-surface__toggle \{\s*min-height: 2\.75rem;/);
  assert.match(workflow, /\.workflow__toggle \{\s*min-height: 2\.75rem;/);
});

test("workflow stages map their explanation back onto each image", async () => {
  const janus = await source("content/janus.ts");
  assert.match(janus, /visual: \{ x: 15, y: 50 \}/);
  assert.match(janus, /visual: \{ x: 55, y: 50 \}/);
  assert.match(janus, /visual: \{ x: 80, y: 47 \}/);

  for (const { slug } of products) {
    const content = await source(`content/${slug}.ts`);
    const model = content.slice(content.indexOf("model:"), content.indexOf("featureSections:"));
    assert.match(model, /visual: \{ x: \d+, y: \d+ \}/, `${slug} needs image-linked stages`);
  }
});

test("the identity utility uses the unmodified official ZITADEL mark", async () => {
  const umbrella = await source("pages/index.astro");
  const footer = await source("components/MicrositeFooter.astro");
  const logo = await readFile(
    new URL("assets/brands/zitadel-logo-solo-dark-icon.svg", sourceUrl),
  );
  const digest = createHash("sha256").update(logo).digest("hex");

  assert.equal(digest, "6767d70158d40a666378108c1fc22cfd10f2295615c68c35c104605973e6a07c");
  assert.match(umbrella, /zitadel-logo-solo-dark-icon\.svg/);
  assert.match(umbrella, /alt="ZITADEL logo"/);
  assert.match(umbrella, /Self-hosted/);
  assert.match(umbrella, /powered by ZITADEL/);
  assert.match(footer, /ZITADEL identity/);
});

test("Janus headlines use editorial Fraunces without changing body or mono faces", async () => {
  const layout = await source("layouts/MicrositeLayout.astro");
  const styles = await source("styles/microsites.css");
  const manifest = await readFile(new URL("../package.json", import.meta.url), "utf8");

  assert.match(layout, /@fontsource-variable\/fraunces\/full\.css/);
  assert.match(
    styles,
    /html\[data-product="janus"\] \{[\s\S]*?--font-display: "Fraunces Variable", Georgia, "Times New Roman", serif;/,
  );
  assert.match(styles, /--font-body: "Inria Sans"/);
  assert.match(styles, /--font-mono: "JetBrains Mono Variable"/);
  assert.match(manifest, /"@fontsource-variable\/fraunces"/);
  assert.doesNotMatch(layout, /@fontsource-variable\/ibm-plex-sans/);
  assert.doesNotMatch(manifest, /"@fontsource-variable\/ibm-plex-sans"/);
  assert.doesNotMatch(layout, /@fontsource-variable\/sora/);
  assert.doesNotMatch(manifest, /"@fontsource-variable\/sora"/);
  assert.doesNotMatch(styles, /Unbounded Variable/);
});

test("one validated release identity is visible across the site family", async () => {
  const revision = "0123456789abcdef0123456789abcdef01234567";
  const deployedAt = "2026-07-18T15:30:00Z";
  const releaseId = "20260718T153000Z-0123456789ab";
  const metadata = createReleaseMetadata(
    {
      INSPR_GIT_SHA: revision,
      INSPR_GIT_DIRTY: "0",
      INSPR_RELEASE_ID: releaseId,
      INSPR_DEPLOYED_AT: deployedAt,
      INSPR_CALENDAR_VERSION: "260718153000.0.0",
      INSPR_RELEASE_SEQUENCE: "1",
      INSPR_CALENDAR_ANCHOR: JSON.stringify({
        legacyScheme: "legacy",
        lastLegacyVersion: null,
        firstCalendarVersion: "260718153000.0.0",
        firstCalendarSequence: 1,
      }),
    },
    { revision: "ffffffffffffffffffffffffffffffffffffffff", dirty: true },
  );

  assert.equal(metadata.gitRevision, revision.slice(0, 12));
  assert.equal(metadata.gitLabel, revision.slice(0, 12));
  assert.equal(metadata.releaseId, releaseId);
  assert.equal(metadata.deployedAt, deployedAt);
  assert.equal(metadata.isDeployment, true);
  assert.deepEqual(releaseManifest(metadata).deployment, {
    releaseId,
    deployedAt,
  });

  const local = createReleaseMetadata(
    {},
    { revision: "fedcba9876543210fedcba9876543210fedcba98", dirty: true },
  );
  assert.equal(local.releaseId, "local");
  assert.equal(local.deployedAt, null);
  assert.equal(local.gitLabel, "fedcba987654-dirty");
  assert.equal(local.isDeployment, false);

  assert.throws(
    () => createReleaseMetadata(
      { INSPR_RELEASE_ID: releaseId },
      { revision, dirty: false },
    ),
    /must be supplied together/,
  );
  assert.throws(
    () => createReleaseMetadata(
      { INSPR_GIT_DIRTY: "1" },
      { revision, dirty: false },
    ),
    /must be supplied together/,
  );

  const footer = await source("components/MicrositeFooter.astro");
  assert.match(footer, /import \{ releaseMetadata \}/);
  assert.match(footer, /releaseAria: "Site release"/);
  assert.match(footer, /aria-label=\{labels\.releaseAria\}/);
  assert.match(footer, /data-release-id=\{releaseMetadata\.releaseId\}/);
  assert.match(footer, /<dt>Site<\/dt>/);
  assert.match(footer, /<dt>Git<\/dt>/);
  assert.match(footer, /release: "Release"/);
  assert.match(footer, /deployed: "Deployed"/);

  const manifestWriter = await readFile(
    new URL("../scripts/write-release-manifest.mjs", import.meta.url),
    "utf8",
  );
  const deploy = await readFile(new URL("../../deploy.sh", import.meta.url), "utf8");
  assert.match(manifestWriter, /dist\/release\.json/);
  assert.match(deploy, /INSPR_GIT_SHA="\$GIT_SHA"/);
  assert.match(deploy, /INSPR_RELEASE_ID="\$RELEASE_ID"/);
  assert.match(deploy, /INSPR_DEPLOYED_AT="\$DEPLOYED_AT"/);
  assert.match(deploy, /read_release_manifest/);
  assert.match(deploy, /RELEASE_ID="\$MANIFEST_RELEASE_ID"/);
  assert.match(deploy, /RELEASE_TARGET="builds\/\$RELEASE_ID"/);
  assert.match(deploy, /refusing to deploy a dirty working tree/);
  assert.match(deploy, /source changed during the build; refusing remote writes/);
  assert.match(deploy, /data-release-id=/);
});

test("deployment host and directory resolution uses literal local settings and environment precedence", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "inspr-deploy-settings-"));
  try {
    const deploy = await readFile(new URL("../../deploy.sh", import.meta.url), "utf8");
    // Execute the real initialization and validation, stopping before any transport.
    const transportStart = deploy.indexOf("\nremote_ssh()");
    assert.ok(transportStart > 0, "the initialization ends before remote transport");
    const initialization = deploy.slice(0, transportStart);
    const script = join(root, "deploy.sh");
    await writeFile(script, `${initialization}\nprintf '%s\\n' "$HOST" "$SSH_PORT" "$SSH_HOST_KEY_ALIAS" "$REMOTE_DIR" "$SSH_HOSTNAME"\n`);
    const local = join(root, ".deploy.local");
    const alternate = join(root, "alternate.local");
    const marker = join(root, "shell-was-executed");
    const run = (extra = {}) => spawnSync("/bin/bash", [script], {
      cwd: root,
      encoding: "utf8",
      env: { PATH: process.env.PATH ?? "/usr/bin:/bin", INSPR_AT_DIR: "/srv/web-host/inspr-at", ...extra },
    });

    await t.test("missing settings fail before transport", () => {
      const result = run();
      assert.equal(result.status, 1);
      assert.match(result.stderr, /set INSPR_AT_HOST to the web host's SSH alias, or put it in \.deploy\.local/);
    });
    await t.test("environment host wins without reading local shell syntax", async () => {
      await writeFile(local, `INSPR_AT_HOST=$(touch ${marker})\n`);
      const result = run({ INSPR_AT_HOST: "environment-host" });
      assert.equal(result.status, 0);
      assert.equal(result.stdout.split("\n")[0], "environment-host");
      await assert.rejects(stat(marker), { code: "ENOENT" });
    });
    await t.test("default local file parses all settings, including a final line without newline", async () => {
      await writeFile(local, "\nINSPR_AT_HOST=web-host\nINSPR_AT_SSH_HOSTNAME=web-host.example.internal\nINSPR_AT_SSH_HOST_KEY_ALIAS=[web-host.example.internal]:2222\nINSPR_AT_SSH_PORT=2222\nINSPR_AT_DIR=/srv/inspr-at");
      const result = run({ INSPR_AT_DIR: undefined });
      assert.equal(result.status, 0, result.stderr);
      assert.deepEqual(result.stdout.trim().split("\n"), ["web-host", "2222", "[web-host.example.internal]:2222", "/srv/inspr-at", "web-host.example.internal"]);
    });
    await t.test("environment directory wins over the local file", async () => {
      await writeFile(local, "INSPR_AT_HOST=web-host\nINSPR_AT_DIR=/srv/local/inspr-at\n");
      const result = run({ INSPR_AT_DIR: "/srv/web-host/inspr-at" });
      assert.equal(result.status, 0, result.stderr);
      assert.equal(result.stdout.trim().split("\n")[3], "/srv/web-host/inspr-at");
    });
    await t.test("environment host requires the directory in the environment too", async () => {
      await writeFile(local, "INSPR_AT_HOST=local-host\nINSPR_AT_DIR=/srv/local/inspr-at\n");
      const result = run({ INSPR_AT_HOST: "environment-host", INSPR_AT_DIR: undefined });
      assert.equal(result.status, 1);
      assert.match(result.stderr, /set INSPR_AT_DIR in the environment to the deploy directory on the web host/);
      assert.doesNotMatch(result.stderr, /\.deploy\.local/);
      assert.equal(result.stdout, "");
    });
    await t.test("environment host never picks up local SSH transport keys", async () => {
      await writeFile(local, "INSPR_AT_HOST=local-host\nINSPR_AT_DIR=/srv/local/inspr-at\nINSPR_AT_SSH_HOSTNAME=local-host.example.internal\nINSPR_AT_SSH_HOST_KEY_ALIAS=[local-host.example.internal]:2222\nINSPR_AT_SSH_PORT=2222\n");
      const result = run({ INSPR_AT_HOST: "environment-host" });
      assert.equal(result.status, 0, result.stderr);
      assert.deepEqual(result.stdout.trim().split("\n"), ["environment-host", "", "", "/srv/web-host/inspr-at"]);
      const withPort = run({ INSPR_AT_HOST: "environment-host", INSPR_AT_SSH_PORT: "2200" });
      assert.equal(withPort.status, 0, withPort.stderr);
      assert.deepEqual(withPort.stdout.trim().split("\n"), ["environment-host", "2200", "", "/srv/web-host/inspr-at"]);
    });
    await t.test("alternate file is used and explicit environment settings win", async () => {
      await writeFile(alternate, "INSPR_AT_HOST=alternate-host\nINSPR_AT_SSH_PORT=2222\nINSPR_AT_DIR=/srv/alternate/inspr-at\n");
      const result = run({ INSPR_AT_DEPLOY_LOCAL: alternate, INSPR_AT_SSH_PORT: "2200" });
      assert.equal(result.status, 0, result.stderr);
      assert.deepEqual(result.stdout.split("\n").slice(0, 2), ["alternate-host", "2200"]);
      assert.equal(result.stdout.trim().split("\n")[3], "/srv/web-host/inspr-at");
      const localDirectory = run({ INSPR_AT_DEPLOY_LOCAL: alternate, INSPR_AT_HOST: "environment-host", INSPR_AT_DIR: undefined });
      assert.equal(localDirectory.status, 1);
      assert.match(localDirectory.stderr, /set INSPR_AT_DIR in the environment to the deploy directory on the web host/);
      assert.doesNotMatch(localDirectory.stderr, /\.deploy\.local/);
      assert.equal(localDirectory.stdout, "");
    });
    await t.test("an explicit missing local path is reported without disclosure", () => {
      const missing = join(root, "missing.local");
      const result = run({ INSPR_AT_DEPLOY_LOCAL: missing });
      assert.equal(result.status, 1);
      assert.match(result.stderr, /INSPR_AT_DEPLOY_LOCAL points to a missing path/);
      assert.ok(!result.stderr.includes(missing));
    });
    await t.test("CRLF lines fail with a specific redacted diagnostic", async () => {
      for (const settings of ["INSPR_AT_HOST=redacted-host\r\n", "\r\nINSPR_AT_HOST=redacted-host\n"]) {
        await writeFile(local, settings);
        const result = run();
        assert.equal(result.status, 1);
        assert.match(result.stderr, /CRLF line endings not allowed/);
        assert.doesNotMatch(result.stderr, /shell syntax|redacted-host/);
      }
    });
    await t.test("duplicate keys fail even when overridden by the environment", async () => {
      for (const [settings, extra] of [
        ["INSPR_AT_HOST=web-host\nINSPR_AT_HOST=duplicate-host\n", {}],
        ["INSPR_AT_HOST=web-host\nINSPR_AT_SSH_PORT=2222\nINSPR_AT_SSH_PORT=2223\n", { INSPR_AT_SSH_PORT: "2200" }],
      ]) {
        await writeFile(local, settings);
        const result = run(extra);
        assert.equal(result.status, 1);
        assert.match(result.stderr, /duplicate deployment local key at line/);
        assert.doesNotMatch(result.stderr, /duplicate-host|2222|2223/);
      }
    });
    await t.test("non-INSPR_AT keys and malformed entries are rejected", async () => {
      for (const entry of ["PATH=/untrusted", "HOST=web-host", "export INSPR_AT_HOST=web-host", "INSPR_AT_HOST", "# shell comment"]) {
        await writeFile(local, `INSPR_AT_HOST=web-host\n${entry}\n`);
        const result = run();
        assert.equal(result.status, 1);
        assert.match(result.stderr, /invalid deployment local key at line 2/);
        assert.doesNotMatch(result.stderr, /\/untrusted/);
      }
    });
    await t.test("shell syntax is rejected without execution or value disclosure", async () => {
      for (const value of [`$(touch ${marker})`, `\`touch ${marker}\``, `web-host;touch ${marker}`, "${HOME}", "'web-host'", "web-host # comment"]) {
        await writeFile(local, `INSPR_AT_HOST=${value}\n`);
        const result = run();
        assert.equal(result.status, 1);
        assert.match(result.stderr, /unsafe deployment local value/);
        assert.ok(!result.stderr.includes(value));
        await assert.rejects(stat(marker), { code: "ENOENT" });
      }
    });
    await t.test("missing local host and explicitly empty environment host fail closed", async () => {
      await writeFile(local, "INSPR_AT_SSH_PORT=2222\n");
      assert.equal(run().status, 1);
      await writeFile(local, "INSPR_AT_HOST=web-host\n");
      assert.equal(run({ INSPR_AT_HOST: "" }).status, 1);
    });
    await t.test("local settings retain existing host and port validation", async () => {
      for (const [settings, message] of [
        ["INSPR_AT_HOST=-unsafe\n", /unsafe INSPR_AT_HOST value/],
        ["INSPR_AT_HOST=web-host\nINSPR_AT_SSH_PORT=65536\n", /SSH_PORT must be between/],
        ["INSPR_AT_HOST=web-host\nINSPR_AT_SSH_HOSTNAME=web-host.example.internal\n", /must be set together/],
        ["INSPR_AT_HOST=web-host\nINSPR_AT_SSH_HOSTNAME=web-host.example.internal\nINSPR_AT_SSH_HOST_KEY_ALIAS=[web-host.example.internal]:2222\nINSPR_AT_SSH_PORT=2223\n", /must match the bracketed/],
      ]) {
        await writeFile(local, settings);
        const result = run();
        assert.equal(result.status, 1);
        assert.match(result.stderr, message);
      }
    });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("missing deployment directory fails before any build or remote step", async () => {
  const root = await mkdtemp(join(tmpdir(), "inspr-deploy-missing-directory-"));
  try {
    const script = join(root, "deploy.sh");
    await writeFile(script, await readFile(new URL("../../deploy.sh", import.meta.url), "utf8"));
    const bin = join(root, "bin");
    const steps = join(root, "steps");
    await mkdir(bin);
    for (const command of ["npm", "node", "ssh", "scp", "rsync", "curl", "docker"]) {
      await writeFile(join(bin, command), `#!/bin/bash\nprintf '%s\\n' '${command}' >> '${steps}'\nexit 99\n`, { mode: 0o755 });
    }
    const run = (extra = {}) => spawnSync("/bin/bash", [script], {
      cwd: root,
      encoding: "utf8",
      env: { PATH: `${bin}:${process.env.PATH ?? "/usr/bin:/bin"}`, INSPR_AT_HOST: "web-host", ...extra },
    });
    const assertMissing = async (extra = {}) => {
      const result = run(extra);
      assert.equal(result.status, 1);
      if (Object.hasOwn(extra, "INSPR_AT_HOST") && extra.INSPR_AT_HOST === undefined) {
        assert.match(result.stderr, /set INSPR_AT_DIR to the deploy directory on the web host, or put it in \.deploy\.local/);
      } else {
        assert.match(result.stderr, /set INSPR_AT_DIR in the environment to the deploy directory on the web host/);
        assert.doesNotMatch(result.stderr, /\.deploy\.local/);
      }
      assert.doesNotMatch(result.stdout, /building Astro|uploading immutable release/);
      await assert.rejects(stat(steps), { code: "ENOENT" });
    };
    await assertMissing();
    await writeFile(join(root, ".deploy.local"), "INSPR_AT_HOST=web-host\n");
    await assertMissing();
    await assertMissing({ INSPR_AT_HOST: undefined });
    await writeFile(join(root, ".deploy.local"), "INSPR_AT_HOST=web-host\nINSPR_AT_DIR=\n");
    await assertMissing();
    await assertMissing({ INSPR_AT_HOST: undefined });
    await writeFile(join(root, ".deploy.local"), "INSPR_AT_HOST=web-host\nINSPR_AT_DIR=/srv/local/inspr-at\n");
    await assertMissing({ INSPR_AT_DIR: "" });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("direct SSH deployment overrides preserve one pinned host identity", async () => {
  const deployUrl = new URL("../../deploy.sh", import.meta.url);
  const deployPath = fileURLToPath(deployUrl);
  const deploy = await readFile(deployUrl, "utf8");

  assert.match(deploy, /INSPR_AT_SSH_HOSTNAME/);
  assert.match(deploy, /INSPR_AT_SSH_HOST_KEY_ALIAS/);
  assert.match(deploy, /StrictHostKeyChecking=yes/);
  assert.match(deploy, /SSH_ARGS\+=\([\s\S]*Hostname=\$SSH_HOSTNAME[\s\S]*HostKeyAlias=\$SSH_HOST_KEY_ALIAS/);
  assert.match(deploy, /SCP_ARGS\+=\([\s\S]*Hostname=\$SSH_HOSTNAME[\s\S]*HostKeyAlias=\$SSH_HOST_KEY_ALIAS/);
  assert.match(deploy, /RSYNC_SSH\+="[^"]*Hostname=\$SSH_HOSTNAME[^"]*HostKeyAlias=\$SSH_HOST_KEY_ALIAS"/);

  const baseEnvironment = {
    INSPR_AT_HOST: "web-host",
    INSPR_AT_DIR: "/srv/web-host/inspr-at",
    PATH: process.env.PATH ?? "/usr/bin:/bin",
  };
  const rejected = [
    {
      environment: { INSPR_AT_SSH_HOSTNAME: "192.0.2.4" },
      message: /must be set together/,
    },
    {
      environment: {
        INSPR_AT_SSH_HOSTNAME: "192.0.2.4;touch-bad",
        INSPR_AT_SSH_HOST_KEY_ALIAS: "web-host.example.internal",
      },
      message: /must be a DNS name or IPv4 address/,
    },
    {
      environment: {
        INSPR_AT_SSH_HOSTNAME: "192.0.2.4",
        INSPR_AT_SSH_HOST_KEY_ALIAS: "-oUnsafeOption",
      },
      message: /contains unsafe characters/,
    },
    {
      environment: {
        INSPR_AT_SSH_HOSTNAME: "192.0.2.4",
        INSPR_AT_SSH_HOST_KEY_ALIAS: "[web-host.example.internal]:0",
      },
      message: /port must be between 1 and 65535/,
    },
    {
      environment: {
        INSPR_AT_SSH_HOSTNAME: "192.0.2.4",
        INSPR_AT_SSH_HOST_KEY_ALIAS: "[web-host.example.internal]:2222",
      },
      message: /SSH_PORT is required for a bracketed/,
    },
    {
      environment: {
        INSPR_AT_SSH_HOSTNAME: "192.0.2.4",
        INSPR_AT_SSH_HOST_KEY_ALIAS: "[web-host.example.internal]:2222",
        INSPR_AT_SSH_PORT: "2223",
      },
      message: /SSH_PORT must match the bracketed/,
    },
  ];

  for (const fixture of rejected) {
    const result = spawnSync("/bin/bash", [deployPath], {
      cwd: fileURLToPath(new URL("../..", import.meta.url)),
      encoding: "utf8",
      env: { ...baseEnvironment, ...fixture.environment },
    });
    assert.equal(result.status, 1);
    assert.match(result.stderr, fixture.message);
    assert.doesNotMatch(result.stdout, /building Astro|uploading immutable release/);
  }

  // A local stand-in host runs deploy.sh's real remote steps. It refuses any
  // command that touches docker-compose.yml (exit 97): static release
  // transport must never inspect or reconcile a historical Compose file. The
  // host Caddyfile differs so the promotion path (scp + validate + restart) runs.
  const host = await createHost();
  await writeFile(join(host.dir, "Caddyfile"), "historical host caddy configuration\n");
  const checkout = await createCheckout(host, {
    release: {
      schemaVersion: 2,
      package: { name: "web", version: "1.0.0" },
      source: { git: FIXTURE_REVISION.slice(0, 12), dirty: false },
      deployment: {
        releaseId: "20260719T000000Z-0123456789ab",
        deployedAt: "2026-07-19T00:00:00Z",
      },
      version: {
        scheme: "inspr-calver-3",
        value: "260719000000.0.0",
        channel: "stable",
        sequence: 1,
        anchor: {
          legacyScheme: "legacy",
          lastLegacyVersion: null,
          firstCalendarVersion: "260719000000.0.0",
          firstCalendarSequence: 1,
        },
      },
    },
  });
  try {
    const transportLog = checkout.transportLog;
    await writeFile(
      join(checkout.root, "docker-compose.yml"),
      "services:\n  legacy-local:\n    image: local-only\n",
    );
    const bracketedAlias = checkout.run({
      INSPR_AT_SSH_HOSTNAME: "192.0.2.4",
      INSPR_AT_SSH_HOST_KEY_ALIAS: "[web-host.example.internal]:2222",
      INSPR_AT_SSH_PORT: "2222",
    });
    assert.equal(
      bracketedAlias.status,
      0,
      `isolated deploy failed:\n${bracketedAlias.stderr}\n${bracketedAlias.stdout}`,
    );

    const records = (await readFile(transportLog, "utf8"))
      .trim()
      .split("\n")
      .map((line) => line.split("\t"));
    const recordsFor = (name) => records
      .filter(([transport]) => transport === name)
      .map(([, ...arguments_]) => arguments_);
    const sshRecords = recordsFor("ssh");
    const scpRecords = recordsFor("scp");
    const rsyncRecords = recordsFor("rsync");
    assert.ok(sshRecords.length > 0, "fixture must exercise SSH");
    assert.ok(scpRecords.length > 0, "fixture must exercise SCP");
    assert.ok(rsyncRecords.length > 0, "fixture must exercise rsync");

    const assertOption = (arguments_, option) => {
      assert.ok(
        arguments_.some((argument, index) => (
          argument === "-o" && arguments_[index + 1] === option
        )),
        `missing SSH option ${option} in ${JSON.stringify(arguments_)}`,
      );
    };
    for (const arguments_ of [...sshRecords, ...scpRecords]) {
      assertOption(arguments_, "StrictHostKeyChecking=yes");
      assertOption(arguments_, "Hostname=192.0.2.4");
      assertOption(arguments_, "HostKeyAlias=[web-host.example.internal]:2222");
    }
    for (const arguments_ of sshRecords) {
      assert.ok(arguments_.some((argument, index) => (
        argument === "-p" && arguments_[index + 1] === "2222"
      )));
      assert.ok(arguments_.includes("web-host"));
    }
    for (const arguments_ of scpRecords) {
      assert.ok(arguments_.some((argument, index) => (
        argument === "-P" && arguments_[index + 1] === "2222"
      )));
      assert.ok(arguments_.some((argument) => argument.startsWith("web-host:")));
    }

    const expectedRsyncShell = [
      "ssh",
      "-o BatchMode=yes",
      "-o ConnectTimeout=10",
      "-o StrictHostKeyChecking=yes",
      "-o Hostname=192.0.2.4",
      "-o HostKeyAlias=[web-host.example.internal]:2222",
      "-p 2222",
    ].join(" ");
    for (const arguments_ of rsyncRecords) {
      const shellIndex = arguments_.indexOf("-e");
      assert.notEqual(shellIndex, -1);
      assert.equal(arguments_[shellIndex + 1], expectedRsyncShell);
      assert.ok(arguments_.some((argument) => argument.startsWith("web-host:")));
    }
  } finally {
    await rm(host.root, { recursive: true, force: true });
    await rm(checkout.root, { recursive: true, force: true });
  }
});

test("every content icon and group resolves in ContextIcon and the tile type", async () => {
  const iconComponent = await source("components/ContextIcon.astro");
  const mapStart = iconComponent.indexOf("const iconMap = {");
  assert.ok(mapStart >= 0, "ContextIcon declares iconMap");
  const mapBlock = iconComponent.slice(mapStart, iconComponent.indexOf("};", mapStart));
  const iconNames = new Set(
    [...mapBlock.matchAll(/^\s*(?:"([^"]+)"|([a-z0-9-]+)):/gm)].map((match) => match[1] ?? match[2]),
  );
  assert.ok(iconNames.size >= 40, `ContextIcon map parsed only ${iconNames.size} names`);

  const types = await source("content/types.ts");
  const groupUnion = types.match(/group:\s*((?:"[a-z]+"\s*\|?\s*)+);/);
  assert.ok(groupUnion, "types.ts declares the specs group union");
  const groups = new Set([...groupUnion[1].matchAll(/"([a-z]+)"/g)].map((match) => match[1]));
  assert.ok(groups.size >= 3, `group union parsed only ${groups.size} members`);

  for (const { slug } of products) {
    const content = await source(`content/${slug}.ts`);
    const icons = [...content.matchAll(/^\s*icon:\s*"([^"]*)"/gm)].map((match) => match[1]);
    assert.ok(icons.length > 0, `${slug} declares contextual icons`);
    for (const icon of icons) {
      assert.ok(iconNames.has(icon), `${slug}: icon "${icon}" is not registered in ContextIcon`);
    }
    for (const [, group] of content.matchAll(/^\s*group:\s*"([^"]*)"/gm)) {
      assert.ok(groups.has(group), `${slug}: group "${group}" is not in the specs group union`);
    }
  }
});

test("English pages link English business and legal pages; German pages stay German (INSPR-524)", async () => {
  const urls = await source("content/urls.ts");
  const footer = await source("components/MicrositeFooter.astro");
  const ribbon = await source("components/ServiceRibbon.astro");
  const aithema = await source("components/AithemaProductPage.astro");
  const header = await source("components/MicrositeHeader.astro");
  const umbrella = await source("pages/index.astro");
  const overview = await source("components/OverviewPage.astro");

  assert.match(urls, /export const localeUrls = \(locale: "en" \| "de"\) =>/);
  assert.match(urls, /locale === "de"\s*\? \{ business: siteUrls\.business, imprint: `\$\{siteUrls\.legalGerman\}\?lang=de`, privacy: `\$\{siteUrls\.privacyGerman\}\?lang=de` \}\s*: \{ business: `\$\{siteUrls\.business\}\/en\/`, imprint: `\$\{siteUrls\.legal\}\?lang=en`, privacy: `\$\{siteUrls\.privacy\}\?lang=en` \}/);
  assert.doesNotMatch(urls, /locale === "en"\s*\?/);

  for (const [name, component] of [["footer", footer], ["aithema", aithema]]) {
    assert.match(component, /const links = localeUrls\(locale\);/, `${name} resolves locale-aware links`);
    assert.match(component, /href=\{links\.imprint\}/, `${name} legal notice link`);
    assert.match(component, /href=\{links\.privacy\}/, `${name} privacy link`);
    assert.match(component, /href=\{links\.business\}/, `${name} services link`);
    assert.doesNotMatch(component, /siteUrls\.(?:imprint|privacy|business)\b/, `${name} must not bypass the locale map`);
  }
  assert.match(ribbon, /href=\{localeUrls\(locale\)\.business\}/);
  assert.doesNotMatch(ribbon, /siteUrls\.business/);
  assert.match(header, /locale === "de" \? `\$\{siteUrls\[active\]\}\/de\/` : siteUrls\[active\]/);
  assert.match(umbrella, /const productHref = \(href: string\) =>\s*locale === "de" \? `\$\{href\}\/de\/\?lang=de` : href;/);
  assert.match(umbrella, /href=\{productHref\(product\.href\)\}/);
  // INSPR-543: the home flow links each product step through the same language-keeping helper.
  const homeFlow = await source("components/HomeFlow.astro");
  assert.match(homeFlow, /const productHref = \(href: string\) => \(locale === "de" \? `\$\{href\}\/de\/\?lang=de` : href\);/);
  assert.match(homeFlow, /href=\{productHref\(siteUrls\[step\.product\]\)\}/);
  assert.match(overview, /href=\{productHref\(step\.href\)\}/);
});

test("Pharos facts are pinned to one verified release (INSPR-532)", async () => {
  const en = await source("content/pharos.ts");
  const de = await source("content/de/pharos.ts");

  assert.match(en, /export const pharosRelease = \{\s*version: "(\d{12})\.0\.0",\s*tag: "v\1\.0\.0",\s*date: "\d{4}-\d{2}-\d{2}",\s*\} as const;/);
  assert.match(en, /export const pharosBlob = `https:\/\/github\.com\/inspr-at\/pharos\/blob\/\$\{pharosRelease\.tag\}`;/);
  assert.match(de, /import \{ pharosBlob, pharosRelease \} from "\.\.\/pharos";/);
  for (const [name, content] of [["en", en], ["de", de]]) {
    assert.doesNotMatch(content, /blob\/main/, `${name} must not link the moving main branch`);
    assert.doesNotMatch(content, /0\.1\.x/, `${name} must not name the retired 0.1.x line`);
    assert.doesNotMatch(content, /pending attended production acceptance|bis zur begleiteten Produktionsabnahme/, `${name} Hetzner wording must match the README`);
    const anchors = content.match(/\$\{pharosBlob\}\/[^`]*#L\d+-L\d+/g) ?? [];
    // Verified by hand against inspr-at/pharos at v260925163010.0.0 (INSPR-532).
    assert.deepEqual(anchors, [
      "${pharosBlob}/crates/pharos-core/src/lib.rs#L3872-L3905",
      "${pharosBlob}/README.md#L42-L48",
      "${pharosBlob}/README.md#L785-L825",
      "${pharosBlob}/README.md#L806-L824",
      "${pharosBlob}/crates/pharos-core/src/lib.rs#L3603-L3624",
      "${pharosBlob}/README.md#L806-L819",
      "${pharosBlob}/crates/pharosd/src/auth.rs#L1066-L1092",
      "${pharosBlob}/nix/modules/pharos-beacon.nix#L239-L270",
    ], `${name} deep links match the verified anchors`);
    assert.match(content, /\$\{pharosRelease\.version\}/, `${name} release statement derives from the pin`);
  }
  assert.deepEqual(en.match(/\$\{pharosBlob\}\/[^`]*/g), de.match(/\$\{pharosBlob\}\/[^`]*/g), "EN and DE link the same pinned targets");
});

test("Janus release line and ZITADEL status are consistent across site and page (INSPR-534)", async () => {
  const en = await source("content/janus.ts");
  const de = await source("content/de/janus.ts");
  const umbrella = await source("pages/index.astro");

  assert.match(en, /export const janusRelease = \{\s*version: "(\d{12})\.0\.0",\s*date: "\d{4}-\d{2}-\d{2}",\s*engineTag: "rust-engine-v\1\.0\.0",\s*envelopeTag: "go-envelope-v\1\.0\.0",\s*\} as const;/);
  assert.match(de, /import \{ janusRelease \} from "\.\.\/janus";/);
  for (const [name, content] of [["en", en], ["de", de]]) {
    assert.doesNotMatch(content, /0\.1\.x/, `${name} must not name the retired 0.1.x line`);
    assert.doesNotMatch(content, /current engine line|aktuellen Engine-Linie|aktive Rust-0\.1\.x/, `${name} must name the release, not an unnamed line`);
    assert.match(content, /\$\{janusRelease\.version\}/, `${name} release statements derive from the pin`);
    assert.match(content, /ZITADEL OIDC/, `${name} keeps the ZITADEL row`);
  }
  // The umbrella must not call ZITADEL sign-in "planned" while the Janus page lists it live;
  // only the broker for agent identities is planned (INSPR-543).
  assert.doesNotMatch(umbrella, /ZITADEL integration are planned|planned for later|für später geplant/);
  assert.equal((umbrella.match(/neun Rollen|nine roles/g) ?? []).length, 4);
  assert.match(umbrella, /Janus as broker for agent identities\./);
  assert.match(umbrella, /Janus als Broker für Agenten-Identitäten\./);
  assert.doesNotMatch(umbrella, /separation of duties|Funktionstrennung/, "the umbrella makes no separation-of-duties claim the Janus sources contradict");
  assert.doesNotMatch(en + de, /implements durable separation of duties|setzt dauerhafte Funktionstrennung/);
  assert.match(en, /status: `\$\{statusLabels\.live\.en\} for human OIDC oversight`/);
  assert.match(en, /maps nine roles from ZITADEL project roles/);
  assert.doesNotMatch(en, /four roles|admin, auditor, operator and viewer/);
  assert.doesNotMatch(de, /vier Rollen|Admin, Auditor, Operator und Viewer/);
  assert.doesNotMatch(umbrella, /four roles|vier Rollen/);
  assert.doesNotMatch(en + de, /until one reviewed|genau ein geprüfter/);
});

test("INSPR publishes its own operator and privacy notices, named for Markus Barta (INSPR-539)", async () => {
  const legal = await source("content/legal.ts");
  const page = await source("components/LegalPage.astro");
  const footer = await source("components/MicrositeFooter.astro");
  const aithema = await source("components/AithemaProductPage.astro");
  const sitemap = await readFile(new URL("../public/sitemap.xml", import.meta.url), "utf8");

  assert.match(legal, /name: "Markus Barta"/);
  assert.match(legal, /email: "[^"@\s]+@[^"@\s]+"/);
  assert.match(legal, /place: \{ en: "Graz, Austria", de: "Graz, Österreich" \}/);
  assert.ok(!legal.includes("\u2014"), "legal copy contains an em dash");
  assert.match(page, /<!--email_off--><a href="mailto:\$\{operator\.email\}">/, "the operator address is shielded from email rewriting");

  const routes = {
    "pages/legal/index.astro": ["legal", "en"],
    "pages/privacy/index.astro": ["privacy", "en"],
    "pages/de/impressum/index.astro": ["legal", "de"],
    "pages/de/datenschutz/index.astro": ["privacy", "de"],
  };
  for (const [route, [kind, locale]] of Object.entries(routes)) {
    const routeSource = await source(route);
    assert.ok(routeSource.includes(`<LegalPage kind="${kind}" locale="${locale}" />`), `${route} renders ${kind} in ${locale}`);
  }
  for (const loc of ["legal/", "de/impressum/", "privacy/", "de/datenschutz/"]) {
    assert.match(sitemap, new RegExp(`<loc>https://www\\.inspr\\.at/${loc.replace("/", "\\/")}</loc>`), `${loc} is in the www sitemap`);
  }

  const overviewPage = await source("components/OverviewPage.astro");
  assert.match(overviewPage, /const legalLinks = localeUrls\(locale\);/);
  assert.match(overviewPage, /<a href=\{legalLinks\.imprint\}>\{copy\("Legal notice", "Impressum"\)\}<\/a>/);
  assert.match(overviewPage, /<a href=\{legalLinks\.privacy\}>\{copy\("Privacy", "Datenschutz"\)\}<\/a>/);

  // Footers link INSPR's own notices as plain links and no longer the Augmentoring ones.
  for (const [name, component] of [["footer", footer], ["aithema", aithema]]) {
    assert.match(component, /<a href=\{links\.imprint\}>\{labels\.legal\}<\/a>/, `${name} legal link`);
    assert.match(component, /<a href=\{links\.privacy\}>\{labels\.privacy\}<\/a>/, `${name} privacy link`);
  }

  // The notices state only what the sites verifiably do.
  for (const claim of [/no cookies set by these pages/, /no analytics or tracking tools/, /local storage/, /Cloudflare/, /configured without access logs/]) {
    assert.match(legal, claim);
  }
  for (const claim of [/keine von diesen Seiten gesetzten Cookies/, /keine Analyse- oder Tracking-Werkzeuge/, /lokalen Speicher/, /Cloudflare/, /ohne Zugriffsprotokolle konfiguriert/]) {
    assert.match(legal, claim);
  }
  assert.doesNotMatch(legal, /Augmentoring GmbH (?:operates|betreibt)/);
  // Local-storage wording must not claim the choice never reaches the server: ?lang= and ?details= travel in links.
  assert.doesNotMatch(legal, /never sent to the server|nie an den Server gesendet/);
  assert.match(legal, /short parameters \(for example \?lang=de\)/);
  assert.match(legal, /kurze Parameter an den Link angehängt \(zum Beispiel \?lang=de\)/);
  for (const claim of [
    "Cloudflare acts as my processor under its standard data processing addendum.",
    "When data is transferred to the United States, Cloudflare relies on its certification under the EU-U.S. Data Privacy Framework and, should that lapse, on the EU Standard Contractual Clauses.",
    "Cloudflare publishes no fixed retention period for visitor connection data; it keeps the data only as long as needed for the purposes of the service, as its privacy policy and data processing addendum describe.",
    "I do not set or control these periods.",
    "For its own security purposes Cloudflare may act as a separate controller; its privacy policy describes this.",
    "Cloudflare handelt als mein Auftragsverarbeiter auf Grundlage seines standardmäßigen Auftragsverarbeitungsvertrags (Data Processing Addendum).",
    "Bei Übermittlungen in die Vereinigten Staaten stützt sich Cloudflare auf seine Zertifizierung unter dem EU-US-Datenschutzrahmen (EU-U.S. Data Privacy Framework) und, sollte diese wegfallen, auf die EU-Standardvertragsklauseln.",
    "Cloudflare veröffentlicht keine feste Speicherfrist für Verbindungsdaten von Besuchern; die Daten werden nur so lange gespeichert, wie es für die Zwecke des Dienstes nötig ist, wie in seiner Datenschutzerklärung und seinem Auftragsverarbeitungsvertrag beschrieben.",
    "Ich lege diese Fristen weder fest noch steuere ich sie.",
    "Für eigene Sicherheitszwecke kann Cloudflare als eigenständiger Verantwortlicher handeln; seine Datenschutzerklärung beschreibt dies.",
  ]) assert.ok(legal.includes(claim), claim);
  assert.doesNotMatch(legal, /authoritative source|maßgeblich für die Schutzmaßnahmen/);
  for (const [privacyLabel, gdprLabel, dpaLabel] of [
    ["Cloudflare privacy policy", "Cloudflare GDPR information", "Cloudflare data processing addendum"],
    ["Datenschutzerklärung von Cloudflare", "DSGVO-Informationen von Cloudflare", "Auftragsverarbeitungsvertrag von Cloudflare"],
  ]) {
    assert.ok(legal.includes(`links: [
            { label: "${privacyLabel}", href: "https://www.cloudflare.com/privacypolicy/" },
            { label: "${gdprLabel}", href: "https://www.cloudflare.com/trust-hub/gdpr/" },
            { label: "${dpaLabel}", href: "https://www.cloudflare.com/cloudflare-customer-dpa/" },
          ]`));
  }
  assert.match(page, /block\.links\.map\(\(link\) =>/);
  assert.match(page, /<a href=\{link\.href\} target="_blank" rel="noopener noreferrer">/);
  // Only storage the built pages really use may be named: language and detail level, not a colour theme.
  assert.doesNotMatch(legal, /colour theme|Farbschema/);
  assert.match(legal, /your language and level of detail in your browser's local storage/);
  assert.match(legal, /Sprache und Detailstufe im lokalen Speicher/);
  assert.match(legal, /Providing this data is technically necessary/);
  assert.match(legal, /Writing to me is voluntary/);
  const css = await source("styles/legal.css");
  assert.match(css, /\.legal-updated \{[^}]*color: var\(--ink-soft\);/, "the updated date meets text contrast");
});

test("operator email keeps a space after its label (INSPR-539)", async () => {
  const page = await readFile(new URL("../src/components/LegalPage.astro", import.meta.url), "utf8");
  assert.match(page, /\{doc\.emailLabel\}:\{" "\}\s*<Fragment set:html=/);
});

test("footer contact hello@inspr.at is a real, shielded mailto (INSPR-525)", async () => {
  const shield = await readFile(new URL("../src/components/ShieldedMailto.astro", import.meta.url), "utf8");
  assert.match(shield, /<!--email_off--><a href="mailto:\$\{address\}">\$\{address\}<\/a><!--\/email_off-->/);
  for (const file of ["MicrositeFooter.astro", "AithemaProductPage.astro"]) {
    const source = await readFile(new URL(`../src/components/${file}`, import.meta.url), "utf8");
    assert.match(source, /<ShieldedMailto address="hello@inspr\.at" \/>/, file);
    assert.doesNotMatch(source, /href="mailto:hello@inspr\.at"/, `${file} renders an unshielded mailto`);
  }
});

test("privacy notice discloses Cloudflare Email Routing for hello@inspr.at (INSPR-525)", async () => {
  const legal = await readFile(new URL("../src/content/legal.ts", import.meta.url), "utf8");
  for (const phrase of [
    "If you write to the address above or to hello@inspr.at",
    "Email to hello@inspr.at is received by Cloudflare Email Routing as my processor and forwarded to a mailbox I use",
    "does not store its content, but it keeps delivery records (time, sender, recipient, subject and delivery status)",
    "Wenn Sie an die oben genannte Adresse oder an hello@inspr.at schreiben",
    "E-Mails an hello@inspr.at nimmt Cloudflare Email Routing als mein Auftragsverarbeiter entgegen",
    "speichert ihren Inhalt nicht, führt aber Zustellprotokolle (Zeitpunkt, Absender, Empfänger, Betreff und Zustellstatus)",
    "https://www.cloudflare.com/developer-platform/products/email-routing/",
    "https://developers.cloudflare.com/email-routing/get-started/email-routing-analytics/",
  ]) assert.ok(legal.includes(phrase), phrase);
});
