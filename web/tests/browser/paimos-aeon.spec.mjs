import { expect, test } from "./fixtures.mjs";

// INSPR-492: the AEON page at /paimos must fit every width, keep its locale
// links under /paimos/ and drive its screen theatre from the keyboard.
const routes = ["/paimos/", "/paimos/de/"];

for (const path of routes) {
  for (const width of [320, 390, 744, 1440]) {
    test(`${path} fits a ${width}px viewport`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(`${path}?lang=${path.includes("/de/") ? "de" : "en"}`, { waitUntil: "domcontentloaded" });
      await page.evaluate(() => document.fonts.ready);
      const geometry = await page.evaluate(() => ({
        viewportWidth: window.innerWidth,
        documentWidth: document.documentElement.scrollWidth,
      }));
      expect(geometry.documentWidth).toBeLessThanOrEqual(geometry.viewportWidth);
    });
  }

  test(`${path} keeps its language switch below /paimos/`, async ({ page }) => {
    await page.goto(`${path}?lang=${path.includes("/de/") ? "de" : "en"}`, { waitUntil: "domcontentloaded" });
    const hrefs = await page.locator("[data-language-choice]").evaluateAll((links) =>
      links.map((link) => new URL(link.getAttribute("href"), window.location.href).pathname),
    );
    expect(hrefs.sort()).toEqual(["/paimos/", "/paimos/de/"]);
    await expect(page.locator('link[rel="alternate"][hreflang="de"]')).toHaveAttribute("href", "https://paimos.inspr.at/de/");
    await expect(page.locator('meta[name="robots"]')).toHaveCount(0);
  });

  test(`${path} moves through the screen theatre by keyboard`, async ({ page }) => {
    await page.goto(`${path}?lang=${path.includes("/de/") ? "de" : "en"}`, { waitUntil: "domcontentloaded" });
    const tabs = page.locator("[data-theatre-tab]");
    await expect(tabs).toHaveCount(4);
    await tabs.first().focus();
    await page.keyboard.press("ArrowRight");
    await expect(tabs.nth(1)).toHaveAttribute("aria-selected", "true");
    await expect(tabs.nth(1)).toBeFocused();
    const panel = await tabs.nth(1).getAttribute("aria-controls");
    await expect(page.locator(`#${panel}`)).toBeVisible();
    await page.keyboard.press("End");
    await expect(tabs.nth(3)).toHaveAttribute("aria-selected", "true");
  });
}

// WCAG 2.2.2: the hero's Pause control must stop every looping animation in
// the hero, including the release plaque's light (review gate, INSPR-492).
test.describe("hero pause", () => {
  // keepVideo: the hero's paused state follows the real video (INSPR-538).
  test.use({ reducedMotion: "no-preference", keepVideo: true });

  test("the visible hero Pause control halts every looping hero animation", async ({ page }) => {
    await page.goto("/paimos/?lang=en", { waitUntil: "domcontentloaded" });
    await page.evaluate(() => document.fonts.ready);
    const runningLoops = () => page.evaluate(() => {
      const hero = document.querySelector(".aeon-hero");
      return document.getAnimations()
        .filter((animation) => {
          const target = animation.effect?.target;
          return target instanceof Element && hero?.contains(target)
            && animation.effect.getTiming().iterations === Infinity
            && animation.playState === "running";
        })
        .map((animation) => `${animation.effect.target.className} ${animation.animationName ?? ""}`);
    });
    // Motion is really running before the reader presses Pause.
    await expect.poll(async () => (await runningLoops()).length).toBeGreaterThan(0);
    const control = page.locator(".aeon-hero .hero-loop__control");
    await page.locator(".aeon-hero__stage").hover();
    await control.click();
    await expect(control).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator(".aeon-hero")).toHaveClass(/is-paused/);
    await expect.poll(runningLoops).toEqual([]);
  });
});

// INSPR-494: the operator rejected slanted accents; nothing on the page may
// render as (synthetic) italic.
test("no text on the AEON page renders in italic", async ({ page }) => {
  await page.goto("/paimos/?lang=en", { waitUntil: "domcontentloaded" });
  const italic = await page.evaluate(() =>
    [...document.querySelectorAll("main *, header *, footer *")]
      .filter((element) => element.childNodes.length && [...element.childNodes].some((node) => node.nodeType === 3 && node.textContent.trim()))
      .filter((element) => getComputedStyle(element).fontStyle !== "normal")
      .map((element) => `${element.tagName.toLowerCase()}.${element.className}: ${element.textContent.trim().slice(0, 40)}`),
  );
  expect(italic).toEqual([]);
});
