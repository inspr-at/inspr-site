import { expect, test } from "@playwright/test";

// INSPR-497: the AEON page at three levels. simple is Why, standard is What
// (the page as before), technical is How. Each level shows its own sections
// and exactly one variant of every changing sentence, fits every width, and
// the release plaque names the release and reveals its calendar version only
// on hover, keyboard focus or a first tap, without moving anything.
const pages = [
  { path: "/paimos/", lang: "en" },
  { path: "/paimos/de/", lang: "de" },
];

// What each level shows (true) or hides (false).
const map = {
  simple: { rules: false, architecture: false, ribbon: false, pairing: false, good: false, deep: 0, faq: 4, figures: 3 },
  standard: { rules: true, architecture: true, ribbon: true, pairing: true, good: true, deep: 0, faq: 3, figures: 5 },
  technical: { rules: true, architecture: true, ribbon: true, pairing: true, good: true, deep: 4, faq: 5, figures: 5 },
};

const open = (page, path, lang, level) =>
  page.goto(`${path}?lang=${lang}&details=${level}`, { waitUntil: "domcontentloaded" });

const visible = (page, selector) =>
  page.locator(selector).evaluateAll((nodes) =>
    nodes.filter((node) => node.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })).length,
  );

for (const { path, lang } of pages) {
  for (const [level, expected] of Object.entries(map)) {
    test(`${path} at ${level} shows its sections and one variant per slot`, async ({ page }) => {
      await open(page, path, lang, level);
      await expect(page.locator("html")).toHaveAttribute("data-details-level", level);
      const shown = async (selector, on) => (on ? expect(page.locator(selector)).toBeVisible() : expect(page.locator(selector)).toBeHidden());
      await shown("#rules", expected.rules);
      await shown("#architecture", expected.architecture);
      await shown(".aeon-ribbon", expected.ribbon);
      await shown(".aeon-pairing", expected.pairing);
      await shown(".aeon-good", expected.good);
      expect(await visible(page, ".aeon-deep")).toBe(expected.deep);
      expect(await visible(page, ".faq-list > details")).toBe(expected.faq);
      expect(await visible(page, ".aeon-figures__list > li")).toBe(expected.figures);

      // Every visible slot shows exactly its level's variant, never two.
      const slots = await page.locator("[data-copy-slot]").evaluateAll((nodes, want) =>
        nodes
          .filter((slot) => slot.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true }))
          .map((slot) => ({
            text: slot.textContent.trim().slice(0, 60),
            shown: [...slot.querySelectorAll(":scope > [data-copy-level]")]
              .filter((variant) => variant.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true }))
              .map((variant) => variant.dataset.copyLevel),
            want,
          })),
        level,
      );
      expect(slots.length).toBeGreaterThan(8);
      for (const slot of slots) expect(slot.shown, slot.text).toEqual([level]);
    });

    test(`${path} at ${level} fits 320 to 1440`, async ({ page }) => {
      for (const width of [320, 390, 744, 1440]) {
        await page.setViewportSize({ width, height: 900 });
        await open(page, path, lang, level);
        await page.evaluate(() => document.fonts.ready);
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
        expect(overflow, `${width}px`).toBeLessThanOrEqual(0);
      }
    });
  }

  test(`${path} names the release and reveals its version only on hover or focus`, async ({ page }) => {
    await open(page, path, lang, "standard");
    const plaque = page.locator("[data-plaque]");
    const chip = plaque.locator("[data-plaque-version]");
    await expect(plaque).toContainText("Hinged Hangar");
    await expect(plaque).not.toContainText("14.1");
    await expect(plaque).not.toContainText("Release");
    await expect(chip).toHaveCSS("opacity", "0");
    await expect(plaque.locator("[data-plaque-link]")).toHaveAttribute("aria-label", /260930115354\.0\.0 · 2026-09-30 11:53:54 UTC/);
    const version = chip.locator("[data-calendar-version]");
    const segments = await version.evaluate((el) =>
      ["yy", "mm", "dd", "hh", "mi"].map((key) => el.querySelector(`.${key}`)?.textContent),
    );
    expect(segments).toEqual(["26", "09", "30", "11", "53"]);

    // Revealing the chip moves nothing: the plaque's box and the layout
    // boxes of the hero and the sections after it stay where they were.
    // Layout boxes: the plaque's own, and everything around it. Inside the
    // plaque, hover scales the mark by design; the stage's chips animate.
    const layout = () =>
      page.evaluate(() => [
        document.documentElement.scrollHeight,
        ...[document.querySelector(".aeon-plaque"), ...document.querySelectorAll(".aeon-hero *, main > section")]
          .filter((el) => el instanceof HTMLElement && (el.matches(".aeon-plaque") || !el.closest(".aeon-plaque, .aeon-hero__stage")))
          .map((el) => [el.offsetLeft, el.offsetTop, el.offsetWidth, el.offsetHeight]),
      ]);
    // Page-relative, so a scroll is no shift.
    const rect = () =>
      plaque.evaluate((el) => {
        const r = el.getBoundingClientRect();
        return [r.x + window.scrollX, r.y + window.scrollY, r.width, r.height];
      });
    await plaque.evaluate((el) => el.scrollIntoView({ block: "center", behavior: "instant" }));
    const before = await layout();
    const beforeRect = await rect();
    await plaque.locator("[data-plaque-link]").evaluate((link) => link.focus({ preventScroll: true }));
    await expect(chip).toHaveCSS("opacity", "1");
    expect(await rect()).toEqual(beforeRect);
    expect(await layout()).toEqual(before);
    await page.locator("body").evaluate(() => (document.activeElement instanceof HTMLElement ? document.activeElement.blur() : null));
    await expect(chip).toHaveCSS("opacity", "0");
    await plaque.hover();
    await expect(chip).toHaveCSS("opacity", "1");
    expect(await layout()).toEqual(before);
  });

  test(`${path} keeps the plaque on one row at every width`, async ({ page }) => {
    for (const width of [1440, 744, 390, 320]) {
      await page.setViewportSize({ width, height: 900 });
      await open(page, path, lang, "standard");
      await page.evaluate(() => document.fonts.ready);
      const row = await page.locator("[data-plaque]").evaluate((plaque) => {
        const items = [".aeon-plaque__mark", ".aeon-plaque__name", ".aeon-plaque__codename", ".aeon-plaque__live", ".aeon-plaque__go"]
          .map((selector) => plaque.querySelector(selector).getBoundingClientRect());
        const style = getComputedStyle(plaque);
        const box = plaque.getBoundingClientRect();
        const mark = items[0];
        const centres = items.map((r) => r.top + r.height / 2);
        return {
          spread: Math.max(...centres) - Math.min(...centres),
          height: box.height,
          expected: mark.height + parseFloat(style.paddingTop) + parseFloat(style.paddingBottom) + parseFloat(style.borderTopWidth) * 2,
          inside: items.every((r) => r.left >= box.left - 0.5 && r.right <= box.right + 0.5),
          overflow: document.documentElement.scrollWidth - window.innerWidth,
        };
      });
      expect(row.spread, `${width}px: one row, centred`).toBeLessThanOrEqual(2);
      expect(Math.abs(row.height - row.expected), `${width}px: height of one row`).toBeLessThanOrEqual(2);
      expect(row.inside, `${width}px: every item inside the glass`).toBe(true);
      expect(row.overflow, `${width}px: no page overflow`).toBeLessThanOrEqual(0);
    }
  });
}

for (const { path, lang } of pages) {
  test(`${path} at How prints no version in running text`, async ({ page }) => {
    await open(page, path, lang, "technical");
    const lead = page.locator("#next .section-lead");
    await expect(lead).toBeVisible();
    const text = (await page.locator("main").innerText()) ?? "";
    expect(text).not.toMatch(/260930115354|\b(?:Sequence|Sequenz)\s+\d+/i);
    // The only calendar versions on the page are the plaque's hover chip
    // and the footer's: none sits inside running text.
    const inline = await page.evaluate(() =>
      [...document.querySelectorAll("[data-calendar-version]")].filter((el) => !el.closest("[data-plaque-version], footer")).length,
    );
    expect(inline, "no inline version chip").toBe(0);
  });
}

test.describe("touch", () => {
  test.use({ hasTouch: true, isMobile: true, viewport: { width: 390, height: 844 } });
  test("the first tap on the plaque reveals the version instead of leaving", async ({ page, browserName }) => {
    test.skip(browserName === "firefox", "Firefox has no mobile emulation");
    await open(page, "/paimos/", "en", "standard");
    const plaque = page.locator("[data-plaque]");
    await plaque.scrollIntoViewIfNeeded();
    const url = page.url();
    await plaque.locator("[data-plaque-link]").tap();
    await expect(plaque).toHaveClass(/is-revealed/);
    await expect(plaque.locator("[data-plaque-version]")).toHaveCSS("opacity", "1");
    expect(page.url()).toBe(url);
  });
});
