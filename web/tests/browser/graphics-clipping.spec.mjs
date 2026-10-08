import { expect, test } from "./fixtures.mjs";

// INSPR-492: no drawn graphic may be cut off by its own SVG viewBox. Every
// visible shape, including half its stroke, must fit inside the viewBox; we
// never rely on `overflow: visible` to show geometry that lies outside it.
const routes = ["/paimos/", "/paimos/de/"];

for (const path of routes) {
  test(`${path} draws every SVG shape inside its viewBox`, async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto(`${path}?lang=${path.includes("/de/") ? "de" : "en"}`, { waitUntil: "domcontentloaded" });
    const clipped = await page.evaluate(() => {
      const found = [];
      for (const svg of document.querySelectorAll("svg[viewBox]")) {
        const box = svg.viewBox.baseVal;
        if (!box || !box.width || !box.height) continue;
        for (const shape of svg.querySelectorAll("path, circle, ellipse, rect, line, polyline, polygon")) {
          if (shape.closest("defs, clipPath, mask, symbol, pattern")) continue;
          let bounds;
          try {
            bounds = shape.getBBox();
          } catch {
            continue;
          }
          // Hidden shapes report an empty box; they cannot be clipped.
          if (bounds.width === 0 && bounds.height === 0) continue;
          const style = getComputedStyle(shape);
          const half = style.stroke !== "none" ? (Number.parseFloat(style.strokeWidth) || 0) / 2 : 0;
          const tolerance = 0.25;
          if (
            bounds.x - half < box.x - tolerance ||
            bounds.y - half < box.y - tolerance ||
            bounds.x + bounds.width + half > box.x + box.width + tolerance ||
            bounds.y + bounds.height + half > box.y + box.height + tolerance
          ) {
            found.push(`${svg.getAttribute("class") ?? svg.parentElement?.className}: ${(shape.getAttribute("d") ?? shape.tagName).slice(0, 48)}`);
          }
        }
      }
      return [...new Set(found)];
    });
    expect(clipped).toEqual([]);
  });
}
