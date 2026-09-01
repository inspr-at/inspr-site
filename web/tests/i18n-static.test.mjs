import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const webRoot = new URL("../", import.meta.url);
const rootUrl = new URL("../../", import.meta.url);
const source = (relativePath) => readFile(new URL(`src/${relativePath}`, webRoot), "utf8");
const rootFile = (relativePath) => readFile(new URL(relativePath, rootUrl), "utf8");

async function runLocalePreference({
  currentLocale = "en",
  detectLocale = true,
  languages = ["en"],
  storedLocale = null,
  search = "",
  hash = "",
  storageThrows = false,
} = {}) {
  const code = await readFile(new URL("public/scripts/locale-preference.js", webRoot), "utf8");
  const storage = new Map(storedLocale ? [["inspr-language", storedLocale]] : []);
  const links = [];
  let replacedWith = null;
  let historyReplacement = null;

  class HTMLScriptElement {}
  const currentScript = new HTMLScriptElement();
  currentScript.dataset = {
    currentLocale,
    englishPath: "/",
    germanPath: "/de/",
    detectLocale: String(detectLocale),
  };

  const document = {
    currentScript,
    querySelectorAll() {
      return links;
    },
  };
  const pathname = currentLocale === "de" ? "/de/" : "/";
  const window = {
    document,
    location: {
      pathname,
      search,
      hash,
      href: `https://product.test${pathname}${search}${hash}`,
      replace(target) {
        replacedWith = target;
      },
    },
    localStorage: {
      getItem(key) {
        if (storageThrows) throw new Error("storage unavailable");
        return storage.get(key) ?? null;
      },
      setItem(key, value) {
        if (storageThrows) throw new Error("storage unavailable");
        storage.set(key, value);
      },
    },
    history: {
      replaceState(_state, _title, target) {
        historyReplacement = target;
      },
    },
    addEventListener(event, callback) {
      if (event === "DOMContentLoaded") callback();
    },
  };

  vm.runInNewContext(code, {
    Array,
    document,
    HTMLScriptElement,
    navigator: { language: languages[0], languages },
    String,
    URL,
    URLSearchParams,
    window,
  });

  const addLanguageLink = (choice, href = null) => {
    const handlers = {};
    const attributes = { href };
    const link = {
      addEventListener(event, callback) {
        handlers[event] = callback;
      },
      getAttribute(name) {
        if (name === "data-language-choice") return choice;
        return attributes[name] ?? null;
      },
      setAttribute(name, value) {
        attributes[name] = value;
      },
    };
    links.push(link);
    const click = () => handlers.click?.();
    click.link = link;
    return click;
  };

  return {
    get replacedWith() {
      return replacedWith;
    },
    get historyReplacement() {
      return historyReplacement;
    },
    storage,
    addLanguageLink,
    rerunDomReady() {
      // The production listener runs once the links exist in the parsed body.
      document.querySelectorAll = () => links;
      vm.runInNewContext(code, {
        Array,
        document,
        HTMLScriptElement,
        navigator: { language: languages[0], languages },
        String,
        URL,
        URLSearchParams,
        window,
      });
    },
  };
}

test("homepage locale routes expose static metadata and an accessible switch", async () => {
  const homepage = await source("pages/index.astro");
  const germanRoute = await source("pages/de/index.astro");
  const compatibilityRoute = await source("pages/v2/index.astro");
  const layout = await source("layouts/MicrositeLayout.astro");
  const header = await source("components/MicrositeHeader.astro");
  const aithema = await source("components/AithemaProductPage.astro");
  const styles = await source("styles/microsites.css");
  const caddy = await rootFile("Caddyfile");
  const legacyEditions = caddy.slice(
    caddy.indexOf("@legacy_editions"),
    caddy.indexOf("# Defence in depth"),
  );

  assert.match(germanRoute, /<Home locale="de" \/>/);
  assert.match(compatibilityRoute, /<Home locale="en" \/>/);
  assert.match(homepage, /const germanUrl = `\$\{siteUrls\.inspr\}\/de\/`/);
  assert.match(homepage, /alternateEnglish=\{englishUrl\}/);
  assert.match(homepage, /alternateGerman=\{germanUrl\}/);
  assert.match(layout, /<html lang=\{locale\}/);
  assert.match(layout, /rel="alternate" hreflang="en"/);
  assert.match(layout, /rel="alternate" hreflang="de"/);
  assert.match(layout, /rel="alternate" hreflang="x-default"/);
  assert.match(layout, /src=\{`\/scripts\/locale-preference\.js\?v=\$\{releaseMetadata\.releaseId\}`\}/);
  assert.doesNotMatch(layout, /set:html=/);

  assert.match(header, /class="language-switch"/);
  assert.match(header, /class="site-brand"[^>]*aria-label=\{name\}/);
  assert.match(aithema, /class="site-brand"[^>]*aria-label=\{content\.name\}/);
  assert.match(header, /aria-label=\{labels\.languages\}/);
  assert.match(header, /aria-current=\{locale === "de" \? "page"/);
  assert.match(header, /aria-current=\{locale === "en" \? "page"/);
  assert.match(header, /data-language-choice="de"/);
  assert.match(header, /data-language-choice="en"/);
  assert.match(header, /url\.searchParams\.set\("lang", choice\)/);
  assert.match(styles, /\.language-switch a:focus-visible/);
  assert.match(styles, /\.language-switch a \{[\s\S]*?min-width: 1\.5rem/);
  assert.match(styles, /@media \(max-width: 27rem\) \{[\s\S]*?\.site-brand span \{[\s\S]*?display: none/);
  assert.match(
    styles,
    /@media \(max-width: 21rem\) \{[\s\S]*?\.mobile-navigation summary,[\s\S]*?\.product-switcher summary \{[\s\S]*?gap: 0\.35rem;[\s\S]*?padding-inline: 0\.5rem;/,
  );
  assert.match(legacyEditions, /path \/v1 \/v1\/\*/);
  assert.doesNotMatch(legacyEditions, /\/v2/);
});

test("German homepage copy is complete across editorial and interactive surfaces", async () => {
  const homepage = await source("pages/index.astro");
  const situation = await source("components/SituationPacket.astro");
  const workflow = await source("components/WorkflowExplorer.astro");
  const heroLoop = await source("components/HeroLoop.astro");
  const principles = await source("components/PrincipleFieldNotes.astro");
  const footer = await source("components/MicrositeFooter.astro");

  for (const phrase of [
    "Inspiration ist die einzige Grenze.",
    "Am Anfang steht ein Gespräch. Am Ende stehen klare Anforderungen.",
    "Geben Sie Agenten ein Projekt, nicht nur einen Prompt.",
    "Server wählen. Backup prüfen. Dann bereitstellen.",
    "Bestimmen Sie, was handeln darf. Geheimnisse bleiben verborgen.",
    "Die Arbeit kommt voran. Sie bestimmen, wann.",
    "Quellcode, Daten, Server und Nachweise bleiben bei Ihnen.",
    "Aithemas wiederverwendbares Modul ist geplant",
    "Umfassendere Berechtigungen, Benutzer, Rollen und die ZITADEL-Integration sind für später geplant",
  ]) {
    assert.ok(homepage.includes(phrase), `missing German homepage copy: ${phrase}`);
  }

  assert.match(homepage, /<SituationPacket locale=\{locale\} \/>/);
  assert.match(homepage, /<PrincipleFieldNotes principles=\{principles\} locale=\{locale\} \/>/);
  assert.match(homepage, /<HeroLoop[\s\S]*?locale=\{locale\}/);
  assert.match(homepage, /<WorkflowExplorer[\s\S]*?locale=\{locale\}/);
  assert.match(homepage, /<MicrositeFooter[\s\S]*?locale=\{locale\}/);
  assert.match(situation, /Vier Fragen verhindern vermeidbares Rätselraten\./);
  assert.match(workflow, /Automatischen Ablauf pausieren/);
  assert.match(heroLoop, /Hero-Animation pausieren/);
  assert.match(principles, /avoids: "Vermeidet"/);
  assert.match(footer, /Professioneller Weg/);

  const products = homepage.slice(homepage.indexOf("const products = ["), homepage.indexOf("const proofPoints"));
  assert.doesNotMatch(products, /—/);
  assert.match(homepage, /locale === "de" \? `\$\{product\.name\} ansehen` : `Explore \$\{product\.name\}`/);
});

test("browser preference selects German only when it precedes English", async () => {
  const germanFirst = await runLocalePreference({ languages: ["de-AT", "en-GB"] });
  assert.equal(germanFirst.replacedWith, "/de/");

  const englishFirst = await runLocalePreference({ languages: ["en-GB", "de-AT"] });
  assert.equal(englishFirst.replacedWith, null);

  const unsupportedBeforeGerman = await runLocalePreference({ languages: ["fr-FR", "de-DE", "en"] });
  assert.equal(unsupportedBeforeGerman.replacedWith, "/de/");
});

test("an explicit language choice persists and overrides browser language", async () => {
  const storedEnglish = await runLocalePreference({
    currentLocale: "de",
    detectLocale: false,
    languages: ["de-AT", "en"],
    storedLocale: "en",
  });
  assert.equal(storedEnglish.replacedWith, "/");

  const manual = await runLocalePreference({ languages: ["en"] });
  const clickGerman = manual.addLanguageLink("de");
  manual.rerunDomReady();
  clickGerman();
  assert.equal(manual.storage.get("inspr-language"), "de");
});

test("automatic locale redirect preserves the current query and hash", async () => {
  const run = await runLocalePreference({
    languages: ["de-AT"],
    search: "?ref=mail",
    hash: "#model",
  });
  assert.equal(run.replacedWith, "/de/?ref=mail#model");
});

test("a language switch click carries the section hash and query to the alternate locale", async () => {
  const run = await runLocalePreference({
    currentLocale: "en",
    detectLocale: false,
    languages: ["en"],
    search: "?ref=mail",
    hash: "#trust",
  });
  const clickGerman = run.addLanguageLink("de", "/de/?lang=de");
  run.rerunDomReady();
  clickGerman();
  assert.equal(run.storage.get("inspr-language"), "de");
  assert.equal(clickGerman.link.getAttribute("href"), "/de/?lang=de&ref=mail#trust");
});

test("an explicit language arrival works when localStorage is unavailable", async () => {
  const manualEnglish = await runLocalePreference({
    currentLocale: "en",
    detectLocale: true,
    languages: ["de-AT", "en"],
    search: "?lang=en",
    storageThrows: true,
  });

  assert.equal(manualEnglish.replacedWith, null);
  assert.equal(manualEnglish.historyReplacement, null);
});

test("locale preference uses localStorage without cookies and stays external under CSP self", async () => {
  const script = await readFile(new URL("public/scripts/locale-preference.js", webRoot), "utf8");
  const layout = await source("layouts/MicrositeLayout.astro");
  const caddy = await rootFile("Caddyfile");
  const astroConfig = await readFile(new URL("astro.config.mjs", webRoot), "utf8");

  assert.match(script, /localStorage\.getItem\(storageKey\)/);
  assert.match(script, /localStorage\.setItem\(storageKey, choice\)/);
  assert.doesNotMatch(script, /document\.cookie/);
  assert.match(layout, /<script[\s\S]*?is:inline[\s\S]*?src=\{`\/scripts\/locale-preference\.js\?v=/);
  assert.match(caddy, /script-src 'self'/);
  assert.match(caddy, /object-src 'none'/);
  assert.match(caddy, /frame-ancestors 'none'/);
  assert.match(caddy, /base-uri 'self'/);
  assert.match(caddy, /form-action 'self'/);
  assert.equal(
    (caddy.match(/sha256-[A-Za-z0-9+/=]+/g) ?? []).length,
    4,
    "CSP must retain only the four frozen-archive script pins",
  );
  assert.match(astroConfig, /assetsInlineLimit: 0/);
});
