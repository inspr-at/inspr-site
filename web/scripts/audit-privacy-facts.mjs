// INSPR-539: audit shipped bytes, including unreferenced public assets, across
// every host/locale directory. This static gate does not attest edge behavior.
import { readFile, readdir } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const webRoot = dirname(fileURLToPath(new URL("../package.json", import.meta.url)));
const distRoot = resolve(process.argv[2] ?? join(webRoot, "dist"));
const allowedStorage = new Set(["inspr-language", "inspr-details-level"]);
// Reviewed legacy key: DetailsControl reads the pre-INSPR-528 "inspr-details"
// flag once to carry an old choice over. Reading is allowed; writing is not.
const legacyReadOnlyStorage = new Set(["inspr-details"]);
// Reviewed unloaded asset: the retired theme switch still ships as a public
// file, but no page loads it, so it stores nothing in a visitor's browser. It is
// tolerated only while no built file references it; the moment a page does,
// the audit fails and the notice must be revisited.
const unloadedAllowList = new Map([
  ["scripts/theme-switch.js", "retired theme switch, loaded by no page"],
]);
const unloadedMentions = new Map();
const foundStorage = new Set();
const violations = new Set();
const counts = { pages: 0, css: 0, js: 0, unloaded: 0 };

// Reviewed non-literal request: DetailsControl's HEAD request reads the current
// page's response headers. location.pathname is necessarily on the same origin.
// Scope by emitted component name AND exact token expression, never a wildcard.
const requestAllowList = [
  { file: /^_astro\/DetailsControl\.astro_astro_type_script_index_0_lang\.[\w-]+\.js$/, api: "fetch", expression: "window.location.pathname" },
];
// No computed storage mappings are needed: emitted keys are literals or bindings.

const urlsSource = await readFile(join(webRoot, "src/content/urls.ts"), "utf8");
const urlsBlock = urlsSource.match(/export const siteUrls = \{([\s\S]*?)\} as const;/)?.[1];
const familyBlock = urlsSource.match(/export const productLinks = \[([\s\S]*?)\] as const;/)?.[1];
const familyKeys = [...(familyBlock ?? "").matchAll(/href:\s*siteUrls\.(\w+)/g)].map((match) => match[1]);
const familyOrigins = new Set(familyKeys.map((key) => {
  const value = urlsBlock?.match(new RegExp(`\\b${key}:\\s*["']([^"']+)["']`))?.[1];
  if (!value) throw new Error(`Cannot derive family origin from siteUrls.${key}`);
  return new URL(value).origin;
}));
if (familyOrigins.size !== 5) throw new Error("Expected five family origins in siteUrls/productLinks");

function fail(file, message, value) {
  violations.add(`${file}: ${message}: ${JSON.stringify(value)}`);
}
function decodeHtml(value) {
  return value.replace(/&(?:#(x[\da-f]+|\d+);?|(amp|quot|apos|lt|gt|colon|sol|Tab|NewLine);)/gi, (entity, numeric, named) => {
    if (numeric) {
      const code = numeric[0].toLowerCase() === "x" ? parseInt(numeric.slice(1), 16) : Number(numeric);
      return code <= 0x10ffff ? String.fromCodePoint(code) : "\ufffd";
    }
    return { amp: "&", quot: '"', apos: "'", lt: "<", gt: ">", colon: ":", sol: "/", tab: "\t", newline: "\n" }[named.toLowerCase()];
  });
}
function auditUrl(file, value, context, webSocket = false) {
  const url = value.trim().replace(/[\u0000-\u0020]/g, "");
  if (!url || /^data:/i.test(url)) return;
  try {
    const parsed = new URL(webSocket ? url.replace(/^ws:/i, "http:").replace(/^wss:/i, "https:") : url, [...familyOrigins][0]);
    if (familyOrigins.has(parsed.origin)) return;
  } catch { /* Invalid resource URLs also fail closed. */ }
  fail(file, `third-party or unsupported ${context}`, value);
}
function auditCss(file, css) {
  const clean = css.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\\([\da-f]{1,6})\s?|\\([^\r\n])/gi, (_, hex, char) => hex ? String.fromCodePoint(parseInt(hex, 16) || 0xfffd) : char);
  for (const match of clean.matchAll(/url\(\s*(?:"([^"\n]*)"|'([^'\n]*)'|([^)]*))\s*\)/gi)) {
    auditUrl(file, match[1] ?? match[2] ?? match[3], "CSS url()");
  }
  for (const match of clean.matchAll(/@import\s*(?:"([^"]*)"|'([^']*)')/gi)) {
    auditUrl(file, match[1] ?? match[2], "CSS @import");
  }
}
function auditSrcset(file, value, context) {
  // Like HTML's srcset parser, a data URL may contain commas. Other URL tokens
  // end at a comma or whitespace; descriptors extend to the next separator.
  let rest = value.trim();
  while (rest) {
    rest = rest.replace(/^[,\s]+/, "");
    if (!rest) break;
    const url = rest.match(/^data:\S+|^[^,\s]+/i)?.[0] ?? "";
    auditUrl(file, url.replace(/,+$/, ""), context);
    rest = rest.slice(url.length);
    if (rest.startsWith(",")) continue;
    const comma = rest.indexOf(",");
    rest = comma < 0 ? "" : rest.slice(comma + 1);
  }
}

// Small conservative JS lexer: comments and regex literals are not executable
// identifiers; strings (including minifier backticks and escapes) are decoded.
// Unsupported/dynamic storage expressions fail rather than being evaluated.
function tokenize(source, stopAtBrace = false) {
  const tokens = [];
  const templates = [];
  const tokenPattern = /\s+|\/\/[^\n]*|\/\*[\s\S]*?\*\/|(?:[A-Za-z_$][\w$]*)|(?:\d+(?:\.\d+)?)|===|!==|=>|\?\?=|&&=|\|\|=|[+*/%&|^-]=|\?\.|==|!=|\+\+|--|&&|\|\||\?\?|[\s\S]/gy;
  let position = 0, braceDepth = 0;
  while (position < source.length) {
    tokenPattern.lastIndex = position;
    const raw = tokenPattern.exec(source)[0];
    const start = position;
    position += raw.length;
    if (/^\s|^\/\//.test(raw) || raw.startsWith("/*")) continue;
    if (["'", '"', "`"].includes(raw)) {
      let value = "", dynamic = false;
      while (position < source.length && source[position] !== raw) {
        let char = source[position++];
        if (char === "\\") {
          char = source[position++];
          if (char === "u" || char === "x") {
            const braced = char === "u" && source[position] === "{";
            const length = braced ? source.indexOf("}", position) - position - 1 : char === "u" ? 4 : 2;
            const hex = source.slice(position + (braced ? 1 : 0), position + length + (braced ? 1 : 0));
            value += String.fromCodePoint(parseInt(hex, 16));
            position += length + (braced ? 2 : 0);
          } else value += ({ n: "\n", r: "\r", t: "\t", b: "\b", f: "\f", v: "\v", "0": "\0", "\n": "" }[char] ?? char);
        } else if (raw === "`" && char === "$" && source[position] === "{") {
          dynamic = true;
          // Balance the interpolation with this same lexer, so nested strings
          // and object braces don't hide executable storage/network calls.
          const inner = tokenize(source.slice(position + 1), true);
          let depth = 1, closing;
          for (const token of inner.tokens) {
            if (token.value === "{") depth++;
            if (token.value === "}" && --depth === 0) { closing = token; break; }
          }
          if (!closing) throw new Error("Unclosed template interpolation");
          templates.push(source.slice(position + 1, position + 1 + closing.start));
          position += closing.end + 1;
        } else value += char;
      }
      position++;
      tokens.push({ value: dynamic ? source.slice(start, position) : value, type: dynamic ? "dynamic" : "string", start, end: position });
    } else if (raw === "/" && (!tokens.length || /^(?:[=(:,;!&|?{\[]|return|case|=>)$/.test(tokens.at(-1).value))) {
      let inClass = false;
      while (position < source.length) {
        const char = source[position++];
        if (char === "\\") position++;
        else if (char === "[") inClass = true;
        else if (char === "]") inClass = false;
        else if (char === "/" && !inClass) break;
      }
      while (/[a-z]/i.test(source[position] ?? "") && position < source.length) position++;
      tokens.push({ value: "<regex>", type: "regex", start, end: position });
    } else {
      tokens.push({ value: raw, type: /^[A-Za-z_$]/.test(raw) ? "identifier" : "punctuation", start, end: position });
      if (raw === "{") braceDepth++;
      if (raw === "}" && braceDepth-- === 0 && stopAtBrace) break;
    }
  }
  return { tokens, templates };
}
function structure(tokens) {
  const pairs = new Map(), stack = [], root = { parent: null, bindings: new Map() };
  let scope = root;
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    token.scope = scope;
    if (token.type !== "punctuation") continue;
    if (["(", "[", "{"].includes(token.value)) {
      stack.push(i);
      if (token.value === "{") scope = { parent: scope, bindings: new Map() };
    } else if ([")", "]", "}"].includes(token.value)) {
      const opening = stack.pop();
      if (opening === undefined) continue;
      pairs.set(opening, i); pairs.set(i, opening);
      if (token.value === "}") scope = scope.parent ?? root;
    }
  }
  const expressionEnd = (start) => {
    let end = start;
    while (end < tokens.length && !(tokens[end].type === "punctuation" && [",", ";", ")", "]", "}"].includes(tokens[end].value))) {
      if (tokens[end].type === "punctuation" && pairs.has(end) && ["(", "[", "{"].includes(tokens[end].value)) end = pairs.get(end);
      end++;
    }
    return end;
  };
  const arrows = [];
  for (let i = 0; i < tokens.length; i++) {
    if (tokens[i].type !== "punctuation" || tokens[i].value !== "=>") continue;
    const start = tokens[i - 1]?.value === ")" ? pairs.get(i - 1) + 1 : i - 1;
    const parameters = tokens.slice(start, i).filter((t) => t.type === "identifier").map((t) => t.value);
    const end = tokens[i + 1]?.value === "{" ? pairs.get(i + 1) : expressionEnd(i + 1);
    arrows.push({ start: i + 1, end, parameters });
  }
  // Ordinary function parameters shadow outer constants as well.
  for (let i = 0; i < tokens.length; i++) {
    if (tokens[i].type !== "identifier" || tokens[i].value !== "function") continue;
    const opening = tokens[i + 1]?.value === "(" ? i + 1 : i + 2;
    const closing = pairs.get(opening), body = closing + 1;
    if (tokens[body]?.value !== "{") continue;
    const scope = tokens[body + 1]?.scope;
    for (const parameter of tokens.slice(opening + 1, closing).filter((token) => token.type === "identifier")) {
      scope?.bindings.set(parameter.value, { expression: [], index: opening, scope, writes: 0 });
    }
  }
  // Method/catch parameters also shadow constants. Treat any non-control
  // parameter list before a block conservatively; this may request review of
  // unsupported syntax rather than falsely resolve an outer storage key.
  for (let i = 0; i < tokens.length; i++) {
    if (tokens[i].value !== ")" || tokens[i + 1]?.value !== "{" || !pairs.has(i)) continue;
    const opening = pairs.get(i), before = tokens[opening - 1]?.value;
    if (["if", "while", "for", "switch", "with"].includes(before)) continue;
    const scope = tokens[i + 2]?.scope;
    for (const parameter of tokens.slice(opening + 1, i).filter((token) => token.type === "identifier")) {
      scope?.bindings.set(parameter.value, { expression: [], index: opening, scope, writes: 0 });
    }
  }
  // Declarations may be comma-separated, as in Vite's var r=`key`,i=`key`.
  for (let i = 0; i < tokens.length; i++) {
    if (tokens[i].type !== "identifier" || !["const", "let", "var"].includes(tokens[i].value)) continue;
    let cursor = i + 1;
    if (["{", "["].includes(tokens[cursor]?.value) && pairs.has(cursor)) {
      for (const name of tokens.slice(cursor + 1, pairs.get(cursor)).filter((token) => token.type === "identifier")) {
        name.scope.bindings.set(name.value, { expression: [], index: cursor, scope: name.scope, writes: 0 });
        // The pattern's braces are not a lexical scope: register its binding
        // on the declaration's scope, so it blocks any outer constant.
        tokens[i].scope.bindings.set(name.value, { expression: [], index: cursor, scope: tokens[i].scope, writes: 0 });
      }
    }
    while (tokens[cursor]?.type === "identifier") {
      const name = tokens[cursor], hasValue = tokens[cursor + 1]?.value === "=";
      const end = hasValue ? expressionEnd(cursor + 2) : cursor + 1;
      const expression = hasValue ? tokens.slice(cursor + 2, end) : [];
      const binding = { expression, index: cursor, scope: name.scope, writes: 0 };
      if (name.scope.bindings.has(name.value)) binding.writes++;
      name.scope.bindings.set(name.value, binding);
      cursor = end;
      if (tokens[cursor]?.value !== ",") break;
      cursor++;
    }
  }
  function bindingAt(name, index) {
    if (arrows.some((arrow) => index >= arrow.start && index < arrow.end && arrow.parameters.includes(name))) return null;
    for (let scope = tokens[index]?.scope; scope; scope = scope.parent) {
      if (scope.bindings.has(name)) return scope.bindings.get(name);
    }
    return null;
  }
  for (let i = 0; i < tokens.length; i++) {
    if (tokens[i].type !== "identifier" || !/^(?:=|[+*/%&|^-]=|\?\?=|&&=|\|\|=|\+\+|--)$/.test(tokens[i + 1]?.value ?? "")) continue;
    const binding = bindingAt(tokens[i].value, i);
    if (binding && binding.index !== i) binding.writes++;
  }
  function constant(expression, index, seen = new Set()) {
    if (expression.length !== 1) return null;
    const token = expression[0];
    if (token.type === "string") return token.value;
    if (token.type !== "identifier" || seen.has(token.value)) return null;
    const binding = bindingAt(token.value, index);
    if (!binding || binding.writes) return null;
    seen.add(token.value);
    return constant(binding.expression, binding.index, seen);
  }
  return { pairs, expressionEnd, constant };
}
function auditJs(file, source) {
  const { tokens, templates } = tokenize(source);
  const { pairs, expressionEnd, constant } = structure(tokens);
  const text = (slice) => slice.map((token) => token.type === "string" ? JSON.stringify(token.value) : token.value).join("");
  const word = (index, name) => tokens[index]?.value === name && (tokens[index].type === "identifier" || tokens[index - 1]?.value === "[");
  function member(index) {
    if ([".", "?."].includes(tokens[index]?.value)) return { name: tokens[index + 1]?.value, next: index + 2 };
    if (tokens[index]?.value === "[" && tokens[index + 1]?.type === "string" && tokens[index + 2]?.value === "]") return { name: tokens[index + 1].value, next: index + 3 };
    return null;
  }
  function argument(opening, offset = 0) {
    let start = opening + 1;
    for (let count = 0; count < offset; count++) start = expressionEnd(start) + 1;
    return tokens.slice(start, expressionEnd(start));
  }
  function request(api, opening, offset = 0) {
    const expression = argument(opening, offset), value = text(expression);
    if (expression.length === 1 && expression[0].type === "string") {
      // ws(s) uses the corresponding HTTP origin for family comparison.
      auditUrl(file, expression[0].value, `${api} URL`, api === "WebSocket");
    } else if (!requestAllowList.some((entry) => entry.file.test(file) && entry.api === api && entry.expression === value)) {
      fail(file, `non-literal ${api} URL requires review`, value || "<missing URL>");
    }
  }
  const xhrPresent = tokens.some((_, index) => word(index, "XMLHttpRequest"));
  let xhrOpenFound = false;
  for (let i = 0; i < tokens.length; i++) {
    const afterWord = tokens[i - 1]?.value === "[" ? i + 2 : i + 1;
    if (word(i, "document") && member(afterWord)?.name === "cookie") fail(file, "cookies forbidden", "document.cookie");
    if (word(i, "cookieStore")) fail(file, "cookies forbidden", "cookieStore");
    for (const name of ["sessionStorage", "indexedDB"]) if (word(i, name)) fail(file, "storage API forbidden", name);
    if (word(i, "caches") && member(afterWord)?.name === "open") fail(file, "storage API forbidden", "caches.open");
    if (word(i, "serviceWorker") && member(afterWord)?.name === "register") fail(file, "storage API forbidden", "navigator.serviceWorker.register");
    if (word(i, "localStorage")) {
      const after = tokens[i - 1]?.value === "[" ? i + 2 : i + 1;
      const property = member(after);
      if (property && ["getItem", "setItem", "removeItem"].includes(property.name) && tokens[property.next]?.value === "(") {
        const expression = argument(property.next), key = constant(expression, i);
        if (key === null) fail(file, "unresolved localStorage key", text(expression));
        else {
          foundStorage.add(key);
          if (/theme/i.test(key)) fail(file, "theme storage key forbidden", key);
          else if (legacyReadOnlyStorage.has(key) && property.name !== "setItem") { /* reviewed legacy read */ }
          else if (!allowedStorage.has(key)) fail(file, "unexpected localStorage key", key);
        }
      } else if (tokens[after]?.value === "[") {
        const expression = tokens.slice(after + 1, pairs.get(after)), key = constant(expression, i);
        if (key === null) fail(file, "unresolved localStorage key", text(expression));
        else {
          foundStorage.add(key);
          if (/theme/i.test(key)) fail(file, "theme storage key forbidden", key);
          else if (!allowedStorage.has(key)) fail(file, "unexpected localStorage key", key);
        }
      } else if (property && !["clear", "key", "length"].includes(property.name)) {
        foundStorage.add(property.name);
        fail(file, /theme/i.test(property.name) ? "theme storage key forbidden" : "unexpected localStorage key", property.name);
      } else fail(file, "unresolved localStorage access", text(tokens.slice(i, i + 5)));
    }
    const callOpening = tokens[afterWord]?.value === "?." ? afterWord + 1 : afterWord;
    if (["fetch", "sendBeacon", "WebSocket", "EventSource", "import"].some((name) => word(i, name)) && tokens[callOpening]?.value === "(") request(tokens[i].value, callOpening);
    if (tokens[i].type === "identifier" && ["import", "export"].includes(tokens[i].value) && tokens[i + 1]?.value !== "(") {
      const end = tokens.findIndex((token, index) => index > i && token.value === ";");
      const statement = tokens.slice(i + 1, end < 0 ? tokens.length : end);
      const from = statement.findIndex((token) => token.type === "identifier" && token.value === "from");
      const url = from >= 0 ? statement[from + 1] : statement[0];
      if (url?.type === "string") auditUrl(file, url.value, "module import URL");
    }
    if (xhrPresent && word(i, "open") && [".", "?.", "["].includes(tokens[i - 1]?.value) && tokens[afterWord]?.value === "(") {
      xhrOpenFound = true; request("XMLHttpRequest.open", afterWord, 1);
    }
  }
  if (xhrPresent && !xhrOpenFound) fail(file, "unresolved XMLHttpRequest URL requires review", "XMLHttpRequest");
  for (const expression of templates) auditJs(file, expression);
}
function auditHtml(file, html) {
  // Only resource-bearing tags; ordinary anchors/canonical/alternate links may
  // point outside the family. Ignore comments and raw script/style bodies.
  const clean = html.replace(/<!--[\s\S]*?-->/g, "");
  const tags = clean.replace(/<(script|style)\b([^>]*)>[\s\S]*?<\/\1\s*>/gi, "<$1$2>");
  for (const match of tags.matchAll(/<([a-z][\w:-]*)\b((?:"[^"]*"|'[^']*'|[^'">])*)>/gi)) {
    const tag = match[1].toLowerCase(), attrs = new Map();
    for (const attr of match[2].matchAll(/([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g)) {
      const name = attr[1].toLowerCase();
      if (!attrs.has(name)) attrs.set(name, decodeHtml(attr[2] ?? attr[3] ?? attr[4] ?? ""));
    }
    const attributes = ({ script: ["src"], img: ["src", "srcset"], source: ["src", "srcset"], video: ["src", "poster"], audio: ["src", "poster"], iframe: ["src"], object: ["data"], embed: ["src"] })[tag] ?? [];
    if (tag === "link" && (attrs.get("rel") ?? "").split(/\s+/).some((rel) => /^(?:stylesheet|preload|modulepreload|.*icon|manifest|.*font.*|prefetch|preconnect|dns-prefetch)$/i.test(rel))) attributes.push("href");
    for (const attr of attributes) {
      if (!attrs.has(attr)) continue;
      if (attr === "srcset") auditSrcset(file, attrs.get(attr), `${tag} ${attr}`);
      else auditUrl(file, attrs.get(attr), `${tag} ${attr}`);
    }
    if (tag === "meta" && /^refresh$/i.test(attrs.get("http-equiv") ?? "")) {
      const target = attrs.get("content")?.match(/;\s*url\s*=\s*([\s\S]+)/i)?.[1]?.replace(/^(['"])([\s\S]*)\1$/, "$2");
      if (target) auditUrl(file, target, "meta refresh URL");
    }
    if (tag === "base" && attrs.has("href")) auditUrl(file, attrs.get("href"), "base href");
    if (attrs.has("srcdoc")) auditHtml(file, attrs.get("srcdoc"));
    if (attrs.has("style")) auditCss(file, attrs.get("style"));
    for (const [name, value] of attrs) if (/^on/i.test(name)) auditJs(file, value);
  }
  for (const match of clean.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style\s*>/gi)) auditCss(file, match[1]);
  for (const match of clean.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script\s*>/gi)) auditJs(file, match[1]);
}
async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  entries.sort((a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0);
  for (const entry of entries) {
    const path = join(directory, entry.name), file = relative(distRoot, path).split("\\").join("/");
    if (entry.isDirectory()) await walk(path);
    else if (/\.(?:html|css|m?js)$/i.test(entry.name)) {
      const source = await readFile(path, "utf8");
      for (const unloaded of unloadedAllowList.keys()) {
        if (file !== unloaded && source.includes(unloaded.split("/").pop())) unloadedMentions.set(unloaded, file);
      }
      if (unloadedAllowList.has(file)) { counts.unloaded++; continue; }
      try {
        if (/\.html$/i.test(entry.name)) { counts.pages++; auditHtml(file, source); }
        else if (/\.css$/i.test(entry.name)) { counts.css++; auditCss(file, source); }
        else { counts.js++; auditJs(file, source); }
      } catch (error) { fail(file, "cannot statically audit", error.message); }
    }
  }
}
try {
  await walk(distRoot);
  if (!counts.pages) fail(".", "missing built HTML pages", distRoot);
  for (const [unloaded, by] of unloadedMentions) fail(by, "allow-listed unloaded asset is referenced", unloaded);
} catch (error) { fail(".", "cannot read build output", error.message); }
if (violations.size) {
  for (const violation of [...violations].sort()) console.error(violation);
  process.exitCode = 1;
} else console.log(`Privacy facts audit passed: ${counts.pages} pages, ${counts.css} CSS files, ${counts.js} JS files, ${counts.unloaded} unloaded allow-listed; storage keys: ${[...foundStorage].sort().join(", ") || "none"}`);
