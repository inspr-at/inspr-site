import { expect, test } from "@playwright/test";

const routes = ["/paimos/", "/paimos/de/", "/pharos/", "/pharos/de/"];

for (const path of routes) {
  test(`${path} owns its 744px table overflow`, async ({ page }) => {
    await page.setViewportSize({ width: 744, height: 1024 });
    await page.goto(path, { waitUntil: "domcontentloaded" });
    await page.evaluate(() => document.fonts.ready);

    const scroller = page.locator("[data-integration-matrix] .table-wrap");
    await scroller.evaluate((element) => {
      element.scrollIntoView({ block: "center", inline: "nearest" });
    });

    const geometry = await scroller.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      return {
        viewportWidth: window.innerWidth,
        documentWidth: document.documentElement.scrollWidth,
        left: rect.left,
        right: rect.right,
        clientWidth: element.clientWidth,
        scrollWidth: element.scrollWidth,
        tabIndex: element.tabIndex,
      };
    });

    expect(geometry.documentWidth).toBeLessThanOrEqual(geometry.viewportWidth);
    expect(geometry.left).toBeGreaterThanOrEqual(0);
    expect(geometry.right).toBeLessThanOrEqual(geometry.viewportWidth);
    expect(geometry.scrollWidth).toBeGreaterThan(geometry.clientWidth);
    expect(geometry.tabIndex).toBe(0);

    await scroller.focus();
    await expect(scroller).toBeFocused();
    const scrollPosition = await scroller.evaluate((element) => {
      element.scrollLeft = element.scrollWidth - element.clientWidth;
      return element.scrollLeft;
    });
    expect(scrollPosition).toBeGreaterThan(0);
  });
}
