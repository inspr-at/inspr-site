// The header on phones (INSPR-497, QA finding M5): every control is a
// 44 px target, nothing overlaps, nothing is cut off, nothing overflows,
// at 320, 390 and 744 px, in English and German.
import { expect, test } from "@playwright/test";

const pages = [
  { path: "/", lang: "en" },
  { path: "/de/", lang: "de" },
  { path: "/overview/", lang: "en" },
  { path: "/aithema/", lang: "en" },
  { path: "/paimos/", lang: "en" },
  { path: "/paimos/de/", lang: "de" },
  { path: "/pharos/", lang: "en" },
  { path: "/janus/", lang: "en" },
];

const TARGET = 44;

for (const width of [320, 390, 744]) {
  for (const { path, lang } of pages) {
    test(`${path} at ${width}px: the header fits, every control a 44 px target`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      await page.goto(`${path}?lang=${lang}`, { waitUntil: "networkidle" });
      const report = await page.evaluate((target) => {
        const bar = document.querySelector(".site-header__bar");
        const barBox = bar.getBoundingClientRect();
        const visible = (element) => {
          const box = element.getBoundingClientRect();
          if (box.width < 1 || box.height < 1) return false;
          for (let node = element; node && node !== document.body; node = node.parentElement) {
            const style = getComputedStyle(node);
            if (style.display === "none" || style.visibility === "hidden") return false;
          }
          // Panels of closed menus and screen-reader-only hints are not drawn.
          if (element.closest("details:not([open]) > :not(summary)")) return false;
          if (getComputedStyle(element).clipPath === "inset(50%)") return false;
          return true;
        };
        const controls = [...bar.querySelectorAll("a, button, summary")].filter(visible);
        const small = controls
          .map((element) => ({ element, box: element.getBoundingClientRect() }))
          .filter(({ box }) => box.width < target - 0.5 || box.height < target - 0.5)
          .map(({ element, box }) => `${element.tagName}.${String(element.className).slice(0, 30)} "${(element.getAttribute("aria-label") ?? element.textContent ?? "").trim().slice(0, 20)}" ${Math.round(box.width)}x${Math.round(box.height)}`);
        // The top-level pieces of the bar: the brand and each visible action.
        const pieces = [bar.querySelector(".site-brand"), ...bar.querySelectorAll(".site-header__actions > *"), bar.querySelector(".site-nav")]
          .filter((element) => element && visible(element))
          .map((element) => ({ name: `${element.tagName}.${String(element.className).split(" ")[0]}`, box: element.getBoundingClientRect() }));
        const overlaps = [];
        for (let i = 0; i < pieces.length; i += 1) {
          for (let j = i + 1; j < pieces.length; j += 1) {
            const a = pieces[i].box;
            const b = pieces[j].box;
            const x = Math.min(a.right, b.right) - Math.max(a.left, b.left);
            const y = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
            if (x > 1 && y > 1) overlaps.push(`${pieces[i].name} x ${pieces[j].name}`);
          }
        }
        const outside = pieces
          .filter(({ box }) => box.left < barBox.left - 0.5 || box.right > barBox.right + 0.5)
          .map(({ name }) => name);
        return {
          small,
          overlaps,
          outside,
          overflow: document.documentElement.scrollWidth - window.innerWidth,
          barHeight: Math.round(barBox.height),
          headerHeight: Math.round(document.querySelector(".site-header").getBoundingClientRect().height),
        };
      }, TARGET);
      console.log(`HEADER ${path} ${width}px bar ${report.barHeight}px header ${report.headerHeight}px`);
      if (width < 700) expect(report.small, "controls under 44 px").toEqual([]);
      expect(report.overlaps, "overlapping pieces").toEqual([]);
      expect(report.outside, "pieces past the bar's edge").toEqual([]);
      expect(report.overflow, "horizontal overflow").toBeLessThanOrEqual(0);
    });
  }
}
