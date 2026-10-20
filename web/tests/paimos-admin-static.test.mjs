import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const rootFile = (path) => readFile(new URL(`../../${path}`, import.meta.url), "utf8");

test("paimos admin verifies before any private file handling and has no public fallback", async () => {
  const caddy = await rootFile("Caddyfile");
  const paimos = caddy.match(/handle @paimos_com \{([\s\S]*?)\n\t\}/)?.[1];
  assert.ok(paimos, "paimos.com has its own host handle");
  assert.match(caddy, /@paimos_com host paimos\.com/);
  const admin = paimos.match(/handle @paimos_admin \{([\s\S]*?)\n\t\t\}/)?.[1];
  assert.ok(admin, "admin is isolated inside the paimos.com handle");
  assert.match(admin, /route \{/);
  assert.match(admin, /forward_auth inspr-auth:8080 \{\s*uri \/admin\/_auth\/verify/);
  const gate = admin.indexOf("forward_auth ");
  for (const operation of ["uri strip_prefix /admin", "root * /srv/admin", "try_files {path} {path}/index.html", "file_server"]) {
    assert.ok(admin.indexOf(operation) > gate, `${operation} follows verification`);
  }
  // Page loads go to sign-in; background requests (the studio's poll) get a plain 401.
  assert.match(admin, /@denied status 401\s*handle_response @denied \{\s*@navigation expression `\{http\.request\.header\.Sec-Fetch-Mode\} == "navigate" \|\| \(\{http\.request\.header\.Sec-Fetch-Mode\} == "" && \{http\.request\.header\.Accept\}\.contains\("text\/html"\)\)`\s*redir @navigation \/admin\/login 302\s*respond "401 Unauthorized" 401/);
  assert.doesNotMatch(admin, /redir \* \/admin\/login/);
  assert.equal((caddy.match(/\/srv\/admin/g) ?? []).length, 1, "the private tree has a single root behind the gate");
  assert.doesNotMatch(admin, /\/srv\/releases|handle_errors|handle_path|copy_headers/);
  assert.match(paimos, /handle \{\s*root \* \/srv\/releases\/current\/paimos-com/);
  assert.match(caddy, /@paimos_admin \{\s*host paimos\.com\s*path \/admin \/admin\/\*/);
  assert.match(caddy, /handle_errors \{[\s\S]*respond "\{err\.status_code\} \{err\.status_text\}" \{err\.status_code\}/);
});

test("admin auth endpoints preserve Host and replace forwarded headers in both proxy calls", async () => {
  const caddy = await rootFile("Caddyfile");
  assert.match(caddy, /@admin_auth path \/admin\/login \/admin\/callback \/admin\/logout\s*handle @admin_auth \{\s*request_header -Forwarded\s*request_header -X-Forwarded-\*\s*reverse_proxy inspr-auth:8080/);
  assert.match(caddy, /route \{\s*request_header -Forwarded\s*request_header -X-Forwarded-\*\s*forward_auth inspr-auth:8080/);
  const proxies = [...caddy.matchAll(/(?:reverse_proxy|forward_auth) inspr-auth:8080 \{([\s\S]*?)\n\t{3,4}\}/g)];
  assert.equal(proxies.length, 2);
  for (const [, proxy] of proxies) {
    assert.match(proxy, /header_up X-Forwarded-For \{remote_host\}/);
    assert.match(proxy, /header_up X-Forwarded-Host \{http\.request\.hostport\}/);
    assert.match(proxy, /header_up X-Forwarded-Proto https/);
    assert.match(proxy, /header_up X-Forwarded-Method \{method\}/);
    assert.match(proxy, /header_up X-Forwarded-Uri \{uri\}/);
    assert.doesNotMatch(proxy, /header_up Host|copy_headers/);
  }
});

test("all admin responses including errors carry private policies without weakening script CSP", async () => {
  const caddy = await rootFile("Caddyfile");
  const shared = caddy.match(/\n\theader \{([\s\S]*?)\n\t\}/)?.[1];
  assert.ok(shared);
  assert.doesNotMatch(shared, /Referrer-Policy|Content-Security-Policy/, "differing policies stay out of the deferred shared block");
  assert.match(caddy, /header @not_paimos_admin \{\s*Referrer-Policy "strict-origin-when-cross-origin"/);
  assert.match(caddy, /@not_paimos_admin \{\s*not \{\s*host paimos\.com\s*path \/admin \/admin\/\*\s*\}/);
  for (const matcher of ["paimos_admin", "admin_error"]) {
    const policies = caddy.match(new RegExp(`header @${matcher} \\{([\\s\\S]*?)\\n\\t{1,2}\\}`))?.[1];
    assert.ok(policies, `${matcher} has response policies`);
    assert.match(policies, /X-Robots-Tag "noindex, nofollow, noarchive"/);
    assert.match(policies, /Cache-Control "private, no-store"/);
    assert.match(policies, /Referrer-Policy "same-origin"/);
    assert.match(policies, /script-src 'self';/);
    assert.doesNotMatch(policies, /script-src[^;]*unsafe-inline|script-src[^;]*sha256/);
  }
  assert.match(caddy, /header @paimos_admin \{[\s\S]*?\n\t\tdefer\n\t\}/);
  assert.match(caddy, /@admin_error \{\s*host paimos\.com\s*expression `\{http\.request\.orig_uri\.path\}/);
  const robots = await rootFile("web/public/paimos-com/robots.txt");
  assert.match(robots, /^Disallow: \/admin\/$/m);
  assert.doesNotMatch(await rootFile("web/public/paimos-com/sitemap.xml"), /\/admin/);
});

test("privacy describes the invited admin area and necessary cookie in both languages", async () => {
  const legal = await rootFile("web/src/content/legal.ts");
  for (const phrase of [
    "On the public pages there are no accounts, no cookies set by these pages",
    "The sign-in area at paimos.com/admin/ is for invited people only.",
    "Signing in goes through ZITADEL at auth.inspr.at.",
    "one strictly necessary, encrypted session cookie, limited to /admin on paimos.com",
    "for up to five minutes", "for up to eight hours or until you sign out",
    "only your ZITADEL subject identifier and expiry",
    "The public pages still set no cookies.",
    "Auf den öffentlichen Seiten gibt es keine Benutzerkonten, keine von diesen Seiten gesetzten Cookies",
    "Der Anmeldebereich unter paimos.com/admin/ ist nur für eingeladene Personen bestimmt.",
    "Die Anmeldung erfolgt über ZITADEL unter auth.inspr.at.",
    "ein einziges, unbedingt erforderliches, verschlüsseltes Sitzungscookie, beschränkt auf /admin auf paimos.com",
    "für bis zu fünf Minuten", "für bis zu acht Stunden oder bis zur Abmeldung",
    "nur Ihre ZITADEL-Kennung (sub) und die Ablaufzeit",
    "Die öffentlichen Seiten setzen weiterhin keine Cookies.",
    "Last updated: 19 October 2026", "Stand: 19. Oktober 2026",
  ]) assert.ok(legal.includes(phrase), phrase);
  assert.doesNotMatch(legal, /\u2014/);
  const privacy = legal.slice(legal.indexOf("  privacy: {"));
  const [en, de] = privacy.split("    de: {");
  for (const field of ["heading:", "paragraphs:", "contact:", "links:"]) {
    assert.equal(en.split(field).length, de.split(field).length, `${field} parity`);
  }
});

test("the bare /admin path gains its slash before verification (INSPR-576 review)", async () => {
  const caddy = await readFile(new URL("../../Caddyfile", import.meta.url), "utf8");
  assert.match(caddy, /redir \/admin \/admin\/ 308\n\t\thandle @paimos_admin \{/);
});
