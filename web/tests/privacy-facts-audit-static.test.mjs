import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const webRoot = dirname(fileURLToPath(new URL("../package.json", import.meta.url)));
const audit = join(webRoot, "scripts/audit-privacy-facts.mjs");

async function runFixture(files) {
  // Keep each isolated fixture in the OS temp area, never in the checkout.
  const root = await mkdtemp(join(tmpdir(), "inspr-privacy-audit-"));
  for (const [name, content] of Object.entries({ "index.html": "<!doctype html><title>Fixture</title>", ...files })) {
    const path = join(root, name);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, content);
  }
  return spawnSync(process.execPath, [audit, root], { cwd: webRoot, encoding: "utf8" });
}

test("build audits privacy facts immediately after CSP (INSPR-539)", async () => {
  const pkg = JSON.parse(await readFile(join(webRoot, "package.json"), "utf8"));
  assert.match(pkg.scripts.build, /python3 scripts\/verify-csp\.py && node scripts\/audit-privacy-facts\.mjs/);
});

test("privacy audit passes family origins, navigation, data URLs and the two resolved storage keys", async () => {
  const urls = await readFile(join(webRoot, "src/content/urls.ts"), "utf8");
  const urlsBlock = urls.match(/export const siteUrls = \{([\s\S]*?)\} as const;/)[1];
  const family = [...urlsBlock.matchAll(/\b(?:inspr|paimos|pharos|janus|aithema): "([^"]+)"/g)].map((match) => match[1]);
  assert.equal(family.length, 5);
  const result = await runFixture({
    "index.html": `<a href="https://external.example/">Navigation</a>
      <script src="/scripts/app.js"></script><link rel="stylesheet" href="styles.css">
      <link rel="preload" as="font" href="fonts/local.woff2">
      <link rel="canonical" href="https://external.example/">
      <img src="data:image/svg+xml,%3Csvg%3E" srcset="data:image/png;base64,AAAA 1x, /local.png 2x">
      <style>.local { background:url('/local.png') }</style><div style="background:url(&quot;/local.png&quot;)"></div>`,
    "aithema/de/index.html": family.map((origin) => `<img src="${origin}/local.png">`).join(""),
    "styles.css": `@import './another.css'; .icon { background:url(data:image/png;base64,AAAA) }`,
    "scripts/app.js": 'var a=`inspr-language`,b=`inspr-details-level`;localStorage.getItem(a);window.localStorage.setItem(b,"standard");localStorage["inspr-language"]="en";fetch("/release.json");fetch("https://www.inspr.at/release.json");',
  });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout.trim(), "Privacy facts audit passed: 2 pages, 1 CSS files, 1 JS files, 0 unloaded allow-listed; storage keys: inspr-details-level, inspr-language");
});

for (const [name, files, message, value] of [
  ["third-party script", { "index.html": '<script src="https://tracker.example/app.js"></script>' }, /third-party or unsupported script src/, "https://tracker.example/app.js"],
  ["duplicate source attributes", { "index.html": '<script src="https://tracker.example/app.js" src="/safe.js"></script>' }, /third-party or unsupported script src/, "https://tracker.example/app.js"],
  ["HTML numeric URL entity", { "index.html": '<script src="https&#58//tracker.example/app.js"></script>' }, /third-party or unsupported script src/, "https://tracker.example/app.js"],
  ["third-party CSS url", { "nested/style.css": '.a{background:url(https://tracker.example/pixel)}' }, /third-party or unsupported CSS url\(\)/, "https://tracker.example/pixel"],
  ["document.cookie", { "app.js": 'document.cookie="visitor=1";' }, /cookies forbidden/, "document.cookie"],
  ["sessionStorage", { "app.js": 'sessionStorage.setItem("id","1");' }, /storage API forbidden/, "sessionStorage"],
  ["unexpected storage key", { "app.js": 'const key="visitor-id";localStorage.setItem(key,"1");' }, /unexpected localStorage key/, "visitor-id"],
  ["theme storage key", { "app.js": 'localStorage.getItem("inspr-theme")' }, /theme storage key forbidden/, "inspr-theme"],
  ["legacy details key written", { "app.js": 'localStorage.setItem("inspr-details","1");' }, /unexpected localStorage key/, "inspr-details"],
  ["unloaded theme switch referenced by a page", { "index.html": '<script src="/scripts/theme-switch.js"></script>', "scripts/theme-switch.js": 'localStorage.setItem("inspr-theme","dark");' }, /allow-listed unloaded asset is referenced/, "scripts/theme-switch.js"],
  ["unresolved storage key", { "app.js": 'localStorage.getItem(computeKey());' }, /unresolved localStorage key/, "computeKey()"],
  ["shadowed function parameter", { "app.js": 'const key="inspr-language";function read(key){localStorage.getItem(key)}' }, /unresolved localStorage key/, "key"],
  ["shadowed arrow parameter", { "app.js": 'const key="inspr-language";const read=key=>localStorage.getItem(key);' }, /unresolved localStorage key/, "key"],
  ["changed binding", { "app.js": 'let key="inspr-language";key+="-visitor";localStorage.getItem(key);' }, /unresolved localStorage key/, "key"],
  ["shadowed method parameter", { "app.js": 'const key="inspr-language";const obj={read(key){localStorage.getItem(key)}};' }, /unresolved localStorage key/, "key"],
  ["destructured key", { "app.js": 'const key="inspr-language";{const {key}=settings;localStorage.getItem(key)}' }, /unresolved localStorage key/, "key"],
  ["cookieStore", { "app.js": 'cookieStore.set("id","1")' }, /cookies forbidden/, "cookieStore"],
  ["inline cookie access", { "index.html": '<script>window["document"]["cookie"]="id=1";</script>' }, /cookies forbidden/, "document.cookie"],
  ["third-party inline style", { "index.html": '<div style="background:url(https://tracker.example/pixel)"></div>' }, /third-party or unsupported CSS url/, "https://tracker.example/pixel"],
  ["CSS import", { "styles.css": '@import "https://tracker.example/style.css";' }, /third-party or unsupported CSS @import/, "https://tracker.example/style.css"],
  ["CSS escaped scheme", { "styles.css": '.a{background:url(\\68 ttps://tracker.example/pixel)}' }, /third-party or unsupported CSS url/, "https://tracker.example/pixel"],
  ["srcset", { "index.html": '<img srcset="/local.png 1x, //tracker.example/pixel 2x">' }, /third-party or unsupported img srcset/, "//tracker.example/pixel"],
  ["refresh", { "index.html": '<meta http-equiv="refresh" content="0; URL=https://tracker.example/">' }, /third-party or unsupported meta refresh URL/, "https://tracker.example/"],
  ["fetch", { "app.js": 'fetch("https://tracker.example/api")' }, /third-party or unsupported fetch URL/, "https://tracker.example/api"],
  ["XHR", { "app.js": 'const x=new XMLHttpRequest();x.open("GET","https://tracker.example/api")' }, /third-party or unsupported XMLHttpRequest.open URL/, "https://tracker.example/api"],
  ["beacon", { "app.js": 'navigator.sendBeacon("https://tracker.example/api","")' }, /third-party or unsupported sendBeacon URL/, "https://tracker.example/api"],
  ["WebSocket", { "app.js": 'new WebSocket("wss://tracker.example/api")' }, /third-party or unsupported WebSocket URL/, "wss://tracker.example/api"],
  ["EventSource", { "app.js": 'new EventSource("https://tracker.example/api")' }, /third-party or unsupported EventSource URL/, "https://tracker.example/api"],
  ["module import", { "app.js": 'import {thing} from "https://tracker.example/module.js";' }, /third-party or unsupported module import URL/, "https://tracker.example/module.js"],
  ["optional fetch", { "app.js": 'window.fetch?.("https://tracker.example/api")' }, /third-party or unsupported fetch URL/, "https://tracker.example/api"],
  ["dynamic fetch", { "app.js": 'fetch(window.location.pathname)' }, /non-literal fetch URL requires review/, "window.location.pathname"],
  ["dynamic template fetch", { "app.js": 'fetch(`https://${host}/api`)' }, /non-literal fetch URL requires review/, '`https://${host}/api`'],
  ["storage in template interpolation", { "app.js": 'const s=`${localStorage.getItem("visitor-id")}`;' }, /unexpected localStorage key/, "visitor-id"],
  ["indexedDB", { "app.js": 'indexedDB.open("visitors")' }, /storage API forbidden/, "indexedDB"],
  ["cache storage", { "app.js": 'caches.open("visitors")' }, /storage API forbidden/, "caches.open"],
  ["service worker", { "app.js": 'navigator.serviceWorker.register("/sw.js")' }, /storage API forbidden/, "navigator.serviceWorker.register"],
]) {
  test(`privacy audit rejects ${name} with the file and value`, async () => {
    const result = await runFixture(files);
    assert.equal(result.status, 1, result.stdout + result.stderr);
    assert.match(result.stderr, message);
    assert.ok(result.stderr.includes(JSON.stringify(value)), result.stderr);
    assert.ok(result.stderr.includes(`${Object.keys(files)[0]}:`), result.stderr);
    assert.doesNotMatch(result.stdout, /passed/);
  });
}

test("the reviewed same-origin HEAD request has a narrow allow-list", async () => {
  const result = await runFixture({
    "_astro/DetailsControl.astro_astro_type_script_index_0_lang.fixture.js": 'fetch(window.location.pathname,{method:"HEAD"})',
  });
  assert.equal(result.status, 0, result.stderr);
});

test("privacy audit allows reading the legacy details key and tolerates the unloaded theme switch only while no page loads it (INSPR-539)", async () => {
  const result = await runFixture({
    "scripts/app.js": 'if(localStorage.getItem("inspr-details")==="1"){localStorage.setItem("inspr-details-level","technical")}',
    "scripts/theme-switch.js": 'var KEY="inspr-theme";localStorage.setItem(KEY,"dark");',
  });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout.trim(), "Privacy facts audit passed: 1 pages, 0 CSS files, 1 JS files, 1 unloaded allow-listed; storage keys: inspr-details, inspr-details-level");
});
