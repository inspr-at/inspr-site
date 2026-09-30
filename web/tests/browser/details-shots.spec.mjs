// Visual record of the Details switch (INSPR-497) for review: the header
// control per site and size, the phone popover, the note, and frames
// taken mid-switch. Runs only with INSPR_SHOTS=1; the images land in
// test-results/shots.
import { test } from "@playwright/test";

test.skip(!process.env.INSPR_SHOTS, "review shots only on request");

// A real click where the control is drawn. Playwright's click() first
// "scrolls into view" and, for a control in the sticky header, moves the
// page half a screen; a reader's click never does.
const tap = async (page, locator) => {
  await locator.waitFor({ state: "visible" });
  const box = await locator.boundingBox();
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
};

const shot = (page, name, options = {}) => page.screenshot({ path: `test-results/shots/${name}.png`, ...options });

const headers = [
  { path: "/", name: "umbrella" },
  { path: "/de/", name: "umbrella-de" },
  { path: "/overview/", name: "overview" },
  { path: "/aithema/", name: "aithema" },
  { path: "/paimos/", name: "paimos" },
  { path: "/paimos/de/", name: "paimos-de" },
  { path: "/pharos/", name: "pharos" },
  { path: "/janus/", name: "janus" },
];

for (const width of [1440, 1180, 900, 390, 320]) {
  for (const { path, name } of headers) {
    test(`header ${name} at ${width}`, async ({ page, browserName }) => {
      test.skip(browserName !== "chromium");
      await page.setViewportSize({ width, height: 700 });
      await page.goto(`${path}${path.includes("/de/") ? "?lang=de" : "?lang=en"}`, { waitUntil: "networkidle" });
      await shot(page, `header-${name}-${width}`, { clip: { x: 0, y: 0, width, height: 150 } });
    });
  }
}

test.describe("states", () => {
  test.use({ reducedMotion: "no-preference" });

  test("note after a change, desktop", async ({ page, browserName }) => {
    test.skip(browserName !== "chromium");
    await page.setViewportSize({ width: 1440, height: 800 });
    await page.goto("/paimos/?lang=en", { waitUntil: "networkidle" });
    await tap(page, page.getByRole("radio", { name: "How" }));
    await page.waitForTimeout(700);
    await shot(page, "note-how-1440", { clip: { x: 700, y: 0, width: 740, height: 200 } });
    await page.getByRole("radio", { name: "Why" }).hover();
    await page.waitForTimeout(400);
    await shot(page, "hover-why-1440", { clip: { x: 700, y: 0, width: 740, height: 200 } });
  });

  test("phone popover", async ({ page, browserName }) => {
    test.skip(browserName !== "chromium");
    for (const width of [390, 320]) {
      await page.setViewportSize({ width, height: 700 });
      await page.goto("/pharos/?lang=en", { waitUntil: "networkidle" });
      await tap(page, page.getByRole("button", { name: "Choose the page depth" }));
      await page.waitForTimeout(400);
      await shot(page, `popover-${width}`, { clip: { x: 0, y: 0, width, height: 420 } });
    }
  });

  for (const { path, name, to } of [
    { path: "/overview/", name: "overview", to: "How" },
    { path: "/pharos/", name: "pharos", to: "Why" },
    { path: "/", name: "umbrella", to: "Why" },
  ]) {
    test(`mid-switch frames ${name} to ${to}`, async ({ page, browserName }) => {
      test.skip(browserName !== "chromium");
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto(`${path}?lang=en`, { waitUntil: "networkidle" });
      await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight * 0.25, behavior: "instant" }));
      await page.waitForTimeout(500);
      await shot(page, `switch-${name}-${to}-0000`);
      await tap(page, page.getByRole("radio", { name: to }));
      for (const at of [120, 260, 420, 600, 900]) {
        await page.waitForTimeout(at === 120 ? 120 : at - [120, 260, 420, 600, 900][[120, 260, 420, 600, 900].indexOf(at) - 1]);
        await shot(page, `switch-${name}-${to}-${String(at).padStart(4, "0")}`);
      }
    });
  }
});
