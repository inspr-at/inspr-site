import { expect, test } from "@playwright/test";

const routes = [
  { path: "/paimos/", selector: "#feature-agent-context .feature-experience--evidence-stack" },
  { path: "/paimos/de/", selector: "#feature-agent-context .feature-experience--evidence-stack" },
  { path: "/pharos/", selector: "#feature-backups .feature-experience--evidence-stack" },
  { path: "/pharos/de/", selector: "#feature-backups .feature-experience--evidence-stack" },
];

const viewports = [
  { width: 744, height: 1024 },
  { width: 820, height: 1180 },
  { width: 1180, height: 820 },
];

for (const route of routes) {
  for (const viewport of viewports) {
    test(`${route.path} contains the stagger at ${viewport.width}x${viewport.height}`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.goto(route.path, { waitUntil: "domcontentloaded" });
      await page.evaluate(() => document.fonts.ready);

      const experience = page.locator(route.selector);
      await experience.evaluate((element) => {
        element.scrollIntoView({ block: "center", inline: "nearest" });
      });
      await experience.locator("article").last().hover();

      const geometry = await experience.evaluate((element) => {
        const container = element.getBoundingClientRect();
        const cards = [...element.querySelectorAll("article")].map((card) => {
          const rect = card.getBoundingClientRect();
          return { left: rect.left, right: rect.right };
        });
        return {
          viewportWidth: window.innerWidth,
          documentWidth: document.documentElement.scrollWidth,
          container: { left: container.left, right: container.right },
          cards,
        };
      });

      expect(geometry.documentWidth).toBeLessThanOrEqual(geometry.viewportWidth);
      for (const card of geometry.cards) {
        expect(card.left).toBeGreaterThanOrEqual(geometry.container.left - 1);
        expect(card.right).toBeLessThanOrEqual(geometry.container.right + 1);
      }
    });
  }
}
