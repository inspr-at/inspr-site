// INSPR-498: a capture's box states its own aspect ratio, so layout is
// settled before any lazy image arrives. Without it, the box is sized from
// the width and height attributes and, once the file loads, from the ratio of
// the chosen rendition: a fraction of a pixel that moves every section below
// it across a rounding step (the plaque reveal test saw a section 1px lower).
// Browser tests run on mbp2606 only.
import { expect, test } from "@playwright/test";

const setLevel = (page, level) =>
  page.addInitScript((value) => localStorage.setItem("inspr-details-level", value), level);

test.describe("layout is settled before the images arrive", () => {
  test.use({ viewport: { width: 1280, height: 720 } });
  for (const [path, lang] of [["/paimos/", "en"], ["/paimos/de/", "de"]]) {
    test(`${path}: loading every lazy image changes no section height`, async ({ page }) => {
      await setLevel(page, "standard");
      await page.goto(`${path}?lang=${lang}`, { waitUntil: "networkidle" });
      await page.evaluate(() => document.fonts.ready);
      const heights = () =>
        page.evaluate(() => [...document.querySelectorAll("main > section")].map((s) => Number(s.getBoundingClientRect().height.toFixed(3))));
      const before = await heights();
      const pending = await page.evaluate(() => [...document.images].filter((img) => !img.complete).length);
      await page.evaluate(async () => {
        const images = [...document.images];
        for (const img of images) img.loading = "eager";
        await Promise.all(images.map((img) => img.decode().catch(() => undefined)));
      });
      await page.waitForTimeout(400);
      const after = await heights();
      expect(pending, "the page still has images to load, so the test means something").toBeGreaterThan(0);
      expect(after).toEqual(before);
    });
  }
});
