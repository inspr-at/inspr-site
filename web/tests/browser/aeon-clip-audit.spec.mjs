import { expect, test } from "@playwright/test";

// INSPR-497: switching the detail level must not cut anything off. At every
// level and width, every visible content element of the AEON page lies
// inside every ancestor that clips it (overflow hidden or clip on that axis,
// contain: paint, clip-path), within 1px. The named glass components (the
// release plaque, its version chip, badges and the hero chips) are checked
// with their outer shadows. Scroll containers are not clips: what they hide
// can be scrolled to. Moving or deliberately cropped surfaces are left out:
// the event-ribbon marquee, the pannable rules view, the carousel dialog and
// the decorative light fields.
const pages = [
  { path: "/paimos/", lang: "en" },
  { path: "/paimos/de/", lang: "de" },
];
const levels = ["simple", "standard", "technical"];
const widths = [1440, 744, 390, 320];

const audit = (page, only) =>
  page.evaluate((selector) => {
    const content = [
      "h1", "h2", "h3", "h4", "p", "li", "dt", "dd", "summary", "a", "button", "code", "strong", "img", "video",
      ".aeon-chip", ".aeon-plaque", ".aeon-plaque__chip", ".aeon-badge", ".specs__tile", ".aeon-horizon__release",
      ".aeon-feature", ".aeon-deep", ".aeon-window",
    ].join(",");
    const glass = ".aeon-chip, .aeon-plaque, .aeon-plaque__chip, .aeon-badge";
    const skip = [
      ".aeon-ribbon__track", "[data-specs-carousel]", ".specs__field", ".aeon-pan__viewport",
      ".aeon-plaque-stage__light", ".aeon-authority__field", ".aeon-journey__field", ".visually-hidden",
    ].join(",");
    const name = (el) => {
      const cls = typeof el.className === "string" ? el.className.trim().split(/\s+/).slice(0, 2).join(".") : "";
      return `${el.tagName.toLowerCase()}${el.id ? `#${el.id}` : ""}${cls ? `.${cls}` : ""}`;
    };
    // The outer reach of an element's box-shadows, per side.
    const reach = (el) => {
      const out = { top: 0, right: 0, bottom: 0, left: 0 };
      const value = getComputedStyle(el).boxShadow;
      if (!value || value === "none") return out;
      for (const layer of value.split(/,(?![^(]*\))/)) {
        if (/\binset\b/.test(layer)) continue;
        const [x = 0, y = 0, blur = 0, spread = 0] = [...layer.matchAll(/(-?[\d.]+)px/g)].map((m) => Number(m[1]));
        out.left = Math.max(out.left, blur + spread - x);
        out.right = Math.max(out.right, blur + spread + x);
        out.top = Math.max(out.top, blur + spread - y);
        out.bottom = Math.max(out.bottom, blur + spread + y);
      }
      return out;
    };
    const clips = (style) => {
      const paint = /\b(paint|strict|content)\b/.test(style.contain) || style.clipPath !== "none";
      const axis = (value) => value === "hidden" || value === "clip";
      return { x: paint || axis(style.overflowX), y: paint || axis(style.overflowY) };
    };
    const found = [];
    const root = document.querySelector("main.aeon");
    for (const el of root.querySelectorAll(selector ?? content)) {
      if (el.closest(skip)) continue;
      if (!el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })) continue;
      const box = el.getBoundingClientRect();
      if (box.width < 1 || box.height < 1) continue;
      const pad = el.matches(glass) ? reach(el) : { top: 0, right: 0, bottom: 0, left: 0 };
      const outer = {
        left: box.left - pad.left,
        right: box.right + pad.right,
        top: box.top - pad.top,
        bottom: box.bottom + pad.bottom,
      };
      for (let ancestor = el.parentElement; ancestor && ancestor !== document.body; ancestor = ancestor.parentElement) {
        const style = getComputedStyle(ancestor);
        const clip = clips(style);
        if (!clip.x && !clip.y) continue;
        const frame = ancestor.getBoundingClientRect();
        const inner = {
          left: frame.left + parseFloat(style.borderLeftWidth),
          right: frame.right - parseFloat(style.borderRightWidth),
          top: frame.top + parseFloat(style.borderTopWidth),
          bottom: frame.bottom - parseFloat(style.borderBottomWidth),
        };
        const miss = [];
        if (clip.x && outer.left < inner.left - 1) miss.push(`left ${Math.round(inner.left - outer.left)}px`);
        if (clip.x && outer.right > inner.right + 1) miss.push(`right ${Math.round(outer.right - inner.right)}px`);
        if (clip.y && outer.top < inner.top - 1) miss.push(`top ${Math.round(inner.top - outer.top)}px`);
        if (clip.y && outer.bottom > inner.bottom + 1) miss.push(`bottom ${Math.round(outer.bottom - inner.bottom)}px`);
        if (miss.length) found.push(`${name(el)} cut by ${name(ancestor)}: ${miss.join(", ")}`);
      }
    }
    return [...new Set(found)];
  }, only);

for (const { path, lang } of pages) {
  for (const level of levels) {
    test(`${path} at ${level} cuts nothing off at any width`, async ({ page }) => {
      for (const width of widths) {
        await page.setViewportSize({ width, height: 900 });
        await page.goto(`${path}?lang=${lang}&details=${level}`, { waitUntil: "domcontentloaded" });
        await page.evaluate(() => document.fonts.ready);
        await expect(page.locator("html")).toHaveAttribute("data-details-level", level);
        expect(await audit(page), `${width}px`).toEqual([]);
        // The version chip, revealed by keyboard focus, and its shadow.
        await page.locator("[data-plaque-link]").focus();
        await expect(page.locator("[data-plaque-version]")).toHaveCSS("opacity", "1");
        expect(await audit(page, ".aeon-plaque, .aeon-plaque__chip"), `${width}px, chip shown`).toEqual([]);
      }
    });
  }
}
