// INSPR-498 round 1: anchors under the sticky header, the German header and
// headings at narrow widths, the sticky rules viewer, copy buttons, count-up,
// the section rhythm, the hero frame, the phone theatre, and the pointer
// effects. Browser tests run on mbp2606 only.
import { mkdirSync } from "node:fs";
import { expect, test } from "@playwright/test";

// With INSPR_SHOTS set (the mbp2606 helper passes it through) a few frames
// are kept for review.
const shot = async (page, name, options = {}) => {
  if (!process.env.INSPR_SHOTS) return;
  mkdirSync("test-results/shots", { recursive: true });
  await page.screenshot({ path: `test-results/shots/${name}.png`, ...options });
};

const setLevel = (page, level) =>
  page.addInitScript((value) => localStorage.setItem("inspr-details-level", value), level);

// A smooth scroll may start a beat late (Firefox): wait a moment first, then
// until the position has held still for a third of a second.
const stable = async (page) => {
  await page.waitForTimeout(300);
  let last = -1;
  let still = 0;
  for (let i = 0; i < 60 && still < 4; i += 1) {
    const now = await page.evaluate(() => Math.round(window.scrollY));
    still = now === last ? still + 1 : 0;
    last = now;
    await page.waitForTimeout(90);
  }
};

const shotOf = async (locator, name) => {
  if (!process.env.INSPR_SHOTS) return;
  mkdirSync("test-results/shots", { recursive: true });
  await locator.screenshot({ path: `test-results/shots/${name}.png` });
};

// The pixel width of the candidate the browser chose (naturalWidth is the
// density-corrected size for a w-descriptor image, not its pixels).
const chosenPixels = (el) => {
  const url = el.currentSrc;
  const hit = el.srcset.split(",").map((entry) => entry.trim().split(/\s+/)).find(([u]) => url.endsWith(u.split("/").pop()));
  return hit ? Number.parseInt(hit[1], 10) : 0;
};

test.describe("anchors land under the sticky header", () => {
  test.use({ viewport: { width: 1440, height: 900 } });
  for (const level of ["standard", "technical"]) {
    for (const lang of ["en", "de"]) {
      test(`${lang} at ${level}: every nav jump shows the section's first line`, async ({ page }) => {
        await setLevel(page, level);
        await page.goto(lang === "de" ? "/paimos/de/?lang=de" : "/paimos/?lang=en", { waitUntil: "networkidle" });
        const hrefs = await page.$$eval('.site-nav a[href^="#"]', (links) => links.map((a) => a.getAttribute("href")));
        expect(hrefs.length).toBeGreaterThanOrEqual(5);
        for (const href of hrefs) {
          await page.click(`.site-nav a[href="${href}"]`);
          await stable(page);
          const geometry = await page.evaluate((id) => {
            const section = document.querySelector(id);
            const first = section?.querySelector(".eyebrow, h2");
            const bar = document.querySelector(".site-header__bar").getBoundingClientRect();
            return { top: first?.getBoundingClientRect().top ?? null, bar: bar.bottom };
          }, href);
          expect(geometry.top, `${href}: first line exists`).not.toBeNull();
          expect(geometry.top, `${href}: first line is under the header`).toBeGreaterThanOrEqual(geometry.bar - 1);
          expect(geometry.top, `${href}: first line is on screen`).toBeLessThan(260);
        }
      });
    }
  }
});

test.describe("German at narrow widths", () => {
  for (const width of [1440, 1024, 744, 390, 320]) {
    test(`header tagline and headings fit at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/paimos/de/?lang=de", { waitUntil: "networkidle" });
      const report = await page.evaluate(() => {
        const tagline = document.querySelector(".site-brand small");
        const tagVisible = tagline && tagline.getBoundingClientRect().width > 0 && getComputedStyle(tagline).display !== "none";
        const cut = [...document.querySelectorAll("h1, h2, h3")]
          .filter((el) => el.getBoundingClientRect().width > 0 && el.scrollWidth > el.clientWidth + 1)
          .map((el) => el.textContent.trim().slice(0, 40));
        return {
          lang: document.documentElement.lang,
          tagline: tagline?.textContent.trim(),
          tagVisible,
          tagCut: tagVisible ? tagline.scrollWidth > tagline.clientWidth + 1 : false,
          cut,
          pageOverflow: document.documentElement.scrollWidth > window.innerWidth + 1,
          leadHyphens: getComputedStyle(document.querySelector(".aeon-hero__lead")).hyphens,
          codeHyphens: getComputedStyle(document.querySelector("code")).hyphens,
        };
      });
      expect(report.lang).toBe("de");
      expect(report.tagCut, `tagline "${report.tagline}" is cut`).toBe(false);
      expect(report.cut, "headings that overflow their box").toEqual([]);
      expect(report.pageOverflow).toBe(false);
      expect(report.leadHyphens).toBe("auto");
      expect(report.codeHyphens).toBe("manual");
    });
  }
});

test.describe("the rules viewer follows the reading", () => {
  test.use({ viewport: { width: 1440, height: 900 } });
  for (const level of ["standard", "technical"]) {
    test(`sticky at ${level}`, async ({ page }) => {
      await setLevel(page, level);
      await page.goto("/paimos/?lang=en", { waitUntil: "networkidle" });
      const sticky = await page.evaluate(() => getComputedStyle(document.querySelector(".aeon-rules__grid > .aeon-pan")).position);
      expect(sticky).toBe("sticky");
      const box = await page.evaluate(() => {
        const grid = document.querySelector(".aeon-rules__grid").getBoundingClientRect();
        const copy = document.querySelector(".aeon-rules__grid > div:first-child").getBoundingClientRect();
        const pan = document.querySelector(".aeon-rules__grid > .aeon-pan").getBoundingClientRect();
        return { top: grid.top + window.scrollY, height: grid.height, copyTaller: copy.height > pan.height + 80 };
      });
      // The viewer has room to travel only where the reading column is the
      // taller one (How); at What the grid is exactly as tall as the viewer.
      if (!box.copyTaller) return;
      // A third of the way through the rules section.
      await page.evaluate((y) => window.scrollTo({ top: y, behavior: "instant" }), box.top + box.height * 0.3 - 120);
      await page.waitForTimeout(250);
      const pan = await page.evaluate(() => {
        const r = document.querySelector(".aeon-rules__grid > .aeon-pan").getBoundingClientRect();
        const bar = document.querySelector(".site-header__bar").getBoundingClientRect();
        return { top: r.top, bottom: r.bottom, bar: bar.bottom, viewport: window.innerHeight };
      });
      expect(pan.top).toBeGreaterThanOrEqual(pan.bar);
      expect(pan.bottom).toBeLessThanOrEqual(pan.viewport + 1);
      await shot(page, `sticky-pan-${level}`);
    });
  }
});

test.describe("command copy buttons", () => {
  for (const lang of ["en", "de"]) {
    test(`${lang}: copy, confirm, announce`, async ({ page, context, browserName }) => {
      if (browserName === "chromium") await context.grantPermissions(["clipboard-read", "clipboard-write"]);
      await page.goto(lang === "de" ? "/paimos/de/?lang=de" : "/paimos/?lang=en", { waitUntil: "networkidle" });
      const button = page.locator(".aeon-copy").first();
      await button.scrollIntoViewIfNeeded();
      const command = await button.getAttribute("data-copy");
      expect(command).toMatch(/^brew install /);
      await expect(button).toHaveAttribute("aria-label", new RegExp(command.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
      const size = await button.evaluate((el) => {
        const after = getComputedStyle(el, "::after");
        const box = el.getBoundingClientRect();
        return { w: box.width + parseFloat(after.left) * -2, h: box.height + parseFloat(after.top) * -2 };
      });
      expect(size.w).toBeGreaterThanOrEqual(40);
      expect(size.h).toBeGreaterThanOrEqual(40);
      await button.click();
      await expect(button).toHaveClass(/is-copied/);
      await shotOf(page.locator(".aeon-terminal"), `copy-${lang}`);
      await expect(page.locator("[data-copy-status]")).toHaveText(lang === "de" ? "Kopiert" : "Copied");
      if (browserName === "chromium") expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(command);
      await expect(button).not.toHaveClass(/is-copied/, { timeout: 4000 });
    });
  }
});

test.describe("count-up", () => {
  test.describe("with motion", () => {
    test.use({ reducedMotion: "no-preference" });
    test("counts up once, keeps the real number for assistive technology", async ({ page }) => {
      await page.goto("/paimos/?lang=en", { waitUntil: "networkidle" });
      const first = page.locator(".aeon-figures__value").first();
      await first.scrollIntoViewIfNeeded();
      const mid = await page.evaluate(async () => {
        const el = document.querySelector(".aeon-figures__value");
        el.scrollIntoView({ block: "center", behavior: "instant" });
        await new Promise((r) => setTimeout(r, 260));
        return { html: el.innerHTML, hidden: el.querySelector("[aria-hidden='true']") !== null, sr: el.querySelector(".visually-hidden")?.textContent };
      });
      // Mid-run: an aria-hidden counter, and the final number in a visually hidden span.
      if (mid.hidden) expect(mid.sr).toBe("5");
      await page.waitForTimeout(1600);
      const finals = await page.$$eval(".aeon-figures__value", (els) => els.map((el) => el.textContent.trim()));
      expect(finals.slice(0, 3)).toEqual(["5", "6", "8"]);
      const last = page.locator(".aeon-figures__value").last();
      await last.scrollIntoViewIfNeeded();
      await page.waitForTimeout(1600);
      await expect(last).toHaveText("300+");
    });
  });

  test.describe("reduced motion", () => {
    test("leaves the numbers alone", async ({ page }) => {
    // The context option is not honoured on every host; the page method is.
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/paimos/?lang=en", { waitUntil: "networkidle" });
    const state = await page.$$eval(".aeon-figures__value", (els) => els.map((el) => ({ text: el.textContent.trim(), wrapped: el.children.length })));
    expect(state.map((s) => s.text)).toEqual(["5", "6", "8", "1", "300+"]);
    expect(state.every((s) => s.wrapped === 0)).toBe(true);
    });
  });
});

test.describe("rhythm", () => {
  test.use({ viewport: { width: 1440, height: 900 } });
  test("plain sections meet with one tight gap, bands keep their space", async ({ page }) => {
    await setLevel(page, "standard");
    await page.goto("/paimos/?lang=en", { waitUntil: "networkidle" });
    const pad = await page.evaluate(() => {
      const read = (selector) => {
        const el = document.querySelector(selector);
        const cs = getComputedStyle(el);
        return { top: parseFloat(cs.paddingTop), bottom: parseFloat(cs.paddingBottom) };
      };
      return { screens: read("#screens"), specs: read("#specs"), next: read("#next"), source: read("#open-source"), faq: read(".aeon .faq"), control: read("#control-room"), rules: read("#rules"), arch: read("#architecture") };
    });
    const one = 6.5 * 16;
    expect(pad.screens.bottom + pad.specs.top).toBeLessThanOrEqual(one * 1.15);
    expect(pad.next.bottom + pad.source.top).toBeLessThanOrEqual(one * 1.15);
    expect(pad.source.bottom + pad.faq.top).toBeLessThanOrEqual(one * 1.15);
    for (const band of [pad.control, pad.rules, pad.arch]) {
      expect(band.top).toBeCloseTo(one, 0);
      expect(band.bottom).toBeCloseTo(one, 0);
    }
  });

  test("at Why, authority and delivery meet with one tight gap", async ({ page }) => {
    await setLevel(page, "simple");
    await page.goto("/paimos/?lang=en", { waitUntil: "networkidle" });
    const sum = await page.evaluate(() => {
      const a = getComputedStyle(document.querySelector(".aeon-authority"));
      const b = getComputedStyle(document.querySelector(".aeon-journey"));
      return parseFloat(a.paddingBottom) + parseFloat(b.paddingTop);
    });
    expect(sum).toBeLessThanOrEqual(6.5 * 16 * 1.15);
  });
});

test("the hero shows the whole scene in a 16:9 frame", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/paimos/?lang=en", { waitUntil: "networkidle" });
  const ratio = await page.evaluate(() => {
    const r = document.querySelector(".aeon-hero__visual").getBoundingClientRect();
    return r.width / r.height;
  });
  expect(ratio).toBeGreaterThan(16 / 9 - 0.03);
  expect(ratio).toBeLessThan(16 / 9 + 0.03);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await shot(page, "hero-1440");
});

test.describe("the phone theatre", () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });
  test("a screen is a window you drag across; the hint fades after the first drag", async ({ page }) => {
    await page.goto("/paimos/?lang=en", { waitUntil: "networkidle" });
    const shownImage = page.locator(".aeon-theatre__panel:not([hidden]) .aeon-window img");
    await shownImage.scrollIntoViewIfNeeded();
    await shownImage.evaluate((el) => el.decode());
    const report = await page.evaluate(() => {
      const win = document.querySelector(".aeon-theatre__panel:not([hidden]) .aeon-window");
      const img = win.querySelector("img");
      const hint = document.querySelector(".aeon-theatre__panel:not([hidden]) .aeon-theatre__pan-hint");
      const zoom = win.querySelector(".aeon-shot__zoom");
      return {
        overflow: getComputedStyle(win).overflow,
        pannable: win.scrollWidth > win.clientWidth + 200,
        imgWidth: img.getBoundingClientRect().width,
        hint: getComputedStyle(hint).display,
        zoom: getComputedStyle(zoom).display,
        pageOverflow: document.documentElement.scrollWidth > window.innerWidth + 1,
      };
    });
    expect(report.overflow).toContain("auto");
    expect(report.pannable).toBe(true);
    expect(report.imgWidth).toBeGreaterThanOrEqual(1000);
    expect(report.hint).toBe("block");
    expect(report.zoom).toBe("none");
    expect(report.pageOverflow).toBe(false);
    await page.evaluate(() => {
      document.querySelector(".aeon-theatre__panel:not([hidden]) .aeon-window").scrollLeft = 300;
    });
    await expect(page.locator(".aeon-theatre__panel:not([hidden]) .aeon-theatre__pan-hint")).toHaveClass(/is-used/);
    await page.evaluate(() => {
      document.querySelector(".aeon-theatre__panel:not([hidden]) .aeon-window").scrollLeft = 160;
      document.querySelector(".aeon-theatre__panel:not([hidden])").scrollIntoView({ block: "center", behavior: "instant" });
    });
    await page.waitForTimeout(300);
    await shot(page, "theatre-390");
  });
});

test.describe("pointer effects", () => {
  test.use({ viewport: { width: 1440, height: 900 }, reducedMotion: "no-preference" });

  test("the hero drifts against the pointer and rests while it is paused", async ({ page, browserName }) => {
    test.skip(browserName === "webkit", "WebKit runs in CI only");
    await page.goto("/paimos/?lang=en", { waitUntil: "networkidle" });
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
    const box = await page.locator(".aeon-hero").boundingBox();
    await page.mouse.move(box.x + box.width * 0.9, box.y + box.height * 0.2);
    await page.waitForTimeout(900);
    const moved = await page.evaluate(() => getComputedStyle(document.querySelector(".aeon-hero__visual")).translate);
    expect(moved).not.toBe("none");
    expect(moved).not.toBe("0px");
    await page.locator(".hero-loop__control").first().click();
    await page.mouse.move(box.x + box.width * 0.1, box.y + box.height * 0.6);
    await page.waitForTimeout(900);
    const rest = await page.evaluate(() => getComputedStyle(document.querySelector(".aeon-hero__visual")).translate);
    expect(rest).toBe("none");
  });

  test("a capability tile catches a light that follows the pointer", async ({ page }) => {
    await page.goto("/paimos/?lang=en", { waitUntil: "networkidle" });
    const face = page.locator("#specs .specs__tile .specs__face").nth(2);
    await face.scrollIntoViewIfNeeded();
    await page.waitForTimeout(1500);
    const box = await face.boundingBox();
    await page.mouse.move(box.x + box.width * 0.3, box.y + box.height * 0.4);
    await page.waitForTimeout(300);
    const vars = await face.evaluate((el) => ({ mx: el.style.getPropertyValue("--mx"), my: el.style.getPropertyValue("--my") }));
    expect(parseFloat(vars.mx)).toBeGreaterThan(0);
    expect(parseFloat(vars.my)).toBeGreaterThan(0);
  });
});

test.describe("the rules viewer is crisp on retina", () => {
  for (const [scale, minRatio] of [[1, 1], [2, 1.8]]) {
    test.describe(`at ${scale}x`, () => {
      test.use({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: scale });
      test(`the image carries at least ${minRatio} pixels per device pixel`, async ({ page }) => {
        await setLevel(page, "standard");
        await page.goto("/paimos/?lang=en", { waitUntil: "networkidle" });
        const img = page.locator(".aeon-pan__image");
        await page.locator(".aeon-pan__window").scrollIntoViewIfNeeded();
        // The reveal fade has to be over before the frame is judged.
        if (await page.evaluate(() => document.documentElement.classList.contains("aeon-reveal-ready"))) {
          await expect(page.locator(".aeon-pan")).toHaveClass(/is-in/);
        }
        await page.waitForTimeout(1400);
        await img.evaluate((el) => el.decode());
        const m = await img.evaluate((el, pick) => ({ pixels: new Function(`return (${pick})`)()(el), shown: el.getBoundingClientRect().width }), chosenPixels.toString());
        expect(m.pixels / (m.shown * scale), `${m.pixels}px candidate for ${m.shown}px at ${scale}x`).toBeGreaterThanOrEqual(0.9);
        expect(m.pixels / m.shown, "never less than one candidate pixel per css pixel").toBeGreaterThanOrEqual(minRatio * 0.9);
        await shotOf(page.locator(".aeon-pan__window"), `rules-viewer-${scale}x`);
      });
    });
  }

  test.describe("phones", () => {
    test.use({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, hasTouch: true });
    test("the wide track takes a sharp candidate", async ({ page }) => {
      await setLevel(page, "standard");
      await page.goto("/paimos/?lang=en", { waitUntil: "networkidle" });
      const img = page.locator(".aeon-pan__image");
      await page.locator(".aeon-pan__window").scrollIntoViewIfNeeded();
      await page.waitForTimeout(600);
      await img.evaluate((el) => el.decode());
      const m = await img.evaluate((el, pick) => ({ pixels: new Function(`return (${pick})`)()(el), shown: el.getBoundingClientRect().width }), chosenPixels.toString());
      expect(m.pixels / (m.shown * 3), `${m.pixels}px candidate for ${m.shown}px at 3x`).toBeGreaterThanOrEqual(0.7);
    });
  });
});
