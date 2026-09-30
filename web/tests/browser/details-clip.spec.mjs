// A depth switch cuts nothing off (INSPR-497): on sampled frames mid-switch
// and after landing, no element on screen is clipped by an ancestor whose
// overflow is not visible, beyond what the page clips by design in its
// settled states (1 px tolerance). The landed page also clips exactly as a
// fresh load at that depth does.
import { expect, test } from "@playwright/test";

const pages = ["/overview/", "/aithema/", "/pharos/", "/janus/"];
const steps = [
  ["How", "technical"],
  ["Why", "simple"],
  ["What", "standard"],
];

test.use({ reducedMotion: "no-preference" });

// A real click where the control is drawn. Playwright's click() first
// "scrolls into view" and, for a control in the sticky header, moves the
// page half a screen; a reader's click never does.
const tap = async (page, locator) => {
  await locator.waitFor({ state: "visible" });
  const box = await locator.boundingBox();
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
};

// Installs window.__clipScan(): element path → pixels clipped, for every
// element on screen that an overflow ancestor cuts by more than a pixel.
const installScanner = (page) => page.addInitScript(() => {
  const pathOf = (element) => {
    const parts = [];
    for (let node = element; node && node !== document.body; node = node.parentElement) {
      parts.unshift(Array.prototype.indexOf.call(node.parentElement?.children ?? [], node));
    }
    return parts.join("/");
  };
  window.__clipScan = () => {
    const found = {};
    const clipCache = new Map();
    const clipOf = (element) => {
      if (clipCache.has(element)) return clipCache.get(element);
      const style = getComputedStyle(element);
      const x = style.overflowX !== "visible";
      const y = style.overflowY !== "visible";
      const clip = x || y ? { rect: element.getBoundingClientRect(), x, y } : null;
      clipCache.set(element, clip);
      return clip;
    };
    const width = window.innerWidth;
    const height = window.innerHeight;
    for (const element of document.querySelectorAll("main *, footer *")) {
      if (element.closest("[data-specs-carousel], .details-switch")) continue;
      const rect = element.getBoundingClientRect();
      if (rect.width < 1 || rect.height < 1) continue;
      if (rect.bottom <= 0 || rect.top >= height || rect.right <= 0 || rect.left >= width) continue;
      const style = getComputedStyle(element);
      if (style.visibility === "hidden") continue;
      // Content inside a fully transparent ancestor is not seen.
      let seen = true;
      for (let node = element; node && node !== document.body; node = node.parentElement) {
        if (Number(getComputedStyle(node).opacity) < 0.02) {
          seen = false;
          break;
        }
      }
      if (!seen) continue;
      let worst = 0;
      for (let ancestor = element.parentElement; ancestor && ancestor !== document.body; ancestor = ancestor.parentElement) {
        const clip = clipOf(ancestor);
        if (!clip) continue;
        if (clip.x) worst = Math.max(worst, clip.rect.left - rect.left, rect.right - clip.rect.right);
        if (clip.y) worst = Math.max(worst, clip.rect.top - rect.top, rect.bottom - clip.rect.bottom);
      }
      if (worst > 1) found[pathOf(element)] = Math.round(worst);
    }
    return found;
  };
});

for (const path of pages) {
  test(`${path}: nothing is cut off during or after a switch`, async ({ page, context }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await installScanner(page);
    await page.goto(`${path}?lang=en`, { waitUntil: "networkidle" });
    await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight * 0.3, behavior: "instant" }));
    await page.waitForTimeout(900);

    for (const [name, level] of steps) {
      const before = await page.evaluate(() => window.__clipScan());
      // Mid-switch scans on a few frames while the switch runs.
      await page.evaluate(() => {
        const samples = [];
        window.__clipSamples = samples;
        window.__clipDone = false;
        document.addEventListener("inspr:details-moving", () => {
          let frame = 0;
          const tick = () => {
            frame += 1;
            if ([3, 8, 14, 22].includes(frame)) samples.push({ frame, clipped: window.__clipScan() });
            if (document.documentElement.hasAttribute("data-details-moving") || frame < 3) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        }, { once: true });
        document.addEventListener("inspr:details-settled", () => {
          requestAnimationFrame(() => {
            window.__clipDone = true;
          });
        }, { once: true });
      });
      await tap(page, page.getByRole("radio", { name }));
      await page.waitForFunction(() => window.__clipDone, null, { timeout: 6000 });
      // The page's own reveal-on-scroll settles before the landed scan.
      await page.waitForTimeout(900);
      const after = await page.evaluate(() => window.__clipScan());
      const samples = await page.evaluate(() => window.__clipSamples);

      const allowed = { ...before };
      for (const [key, value] of Object.entries(after)) allowed[key] = Math.max(allowed[key] ?? 0, value);
      const cut = [];
      for (const sample of samples) {
        for (const [key, value] of Object.entries(sample.clipped)) {
          if (value > (allowed[key] ?? 0) + 1) cut.push(`frame ${sample.frame}: ${key} by ${value}px`);
        }
      }
      expect(cut, `${path} to ${name}: clipped mid-switch`).toEqual([]);

      // The landed page clips exactly as a fresh load at that depth.
      const scroll = await page.evaluate(() => window.scrollY);
      const fresh = await context.newPage();
      await fresh.setViewportSize({ width: 1440, height: 900 });
      await installScanner(fresh);
      await fresh.goto(`${path}?lang=en&details=${level}`, { waitUntil: "networkidle" });
      await fresh.evaluate((top) => window.scrollTo({ top, behavior: "instant" }), scroll);
      await fresh.waitForTimeout(900);
      const reference = await fresh.evaluate(() => window.__clipScan());
      await fresh.close();
      const residue = Object.entries(after)
        .filter(([key, value]) => value > (reference[key] ?? 0) + 1)
        .map(([key, value]) => `${key} by ${value}px`);
      expect(residue, `${path} at ${name}: clipped after landing`).toEqual([]);
      await page.waitForTimeout(300);
    }
  });
}
