import { expect, test } from "@playwright/test";

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
