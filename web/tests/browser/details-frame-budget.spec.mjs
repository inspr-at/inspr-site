// Frame budget of a depth switch (INSPR-497): measured, not eyeballed.
// Records every frame from the click until the switch has landed, at
// desktop and phone sizes, and fails on any frame over 16.7 ms plus a
// small scheduling tolerance, and on any long animation frame. The
// reference machine is mbp2606 Chromium with its GPU; run this file alone
// there (INSPR_FRAME_BUDGET=1, one worker), after one unmeasured warm-up.
import { expect, test } from "@playwright/test";

const FRAME_MS = 1000 / 60;
const TOLERANCE_MS = 4;

const pages = ["/", "/overview/", "/aithema/", "/paimos/", "/pharos/", "/janus/"];
const sizes = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "phone", width: 390, height: 844 },
];
const route = [
  { to: "technical", name: "How" },
  { to: "simple", name: "Why" },
  { to: "standard", name: "What" },
];

test.skip(!process.env.INSPR_FRAME_BUDGET, "frame budgets run on the reference machine only");
// A shared machine's compositor may miss one vsync now and then with an
// idle main thread; an engine that drops frames fails every attempt.
test.describe.configure({ retries: 2 });
// A real click where the control is drawn. Playwright's click() first
// "scrolls into view" and, for a control in the sticky header, moves the
// page half a screen; a reader's click never does.
const tap = async (page, locator) => {
  await locator.waitFor({ state: "visible" });
  const box = await locator.boundingBox();
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
};

test.use({
  reducedMotion: "no-preference",
  // The reference renders with the GPU, as readers' machines do; headless
  // Chromium otherwise rasterises in software (SwiftShader).
  launchOptions: { args: ["--enable-gpu", "--use-angle=metal", "--ignore-gpu-blocklist", "--enable-gpu-rasterization"] },
});

for (const size of sizes) {
  for (const path of pages) {
    test(`${path} at ${size.name}: every switch frame fits the budget`, async ({ page, browserName }, testInfo) => {
      test.skip(browserName !== "chromium", "the reference is Chromium");
      await page.setViewportSize({ width: size.width, height: size.height });
      await page.goto(`${path}?lang=en`, { waitUntil: "networkidle" });
      await page.evaluate(() => document.fonts.ready);
      const gl = await page.evaluate(() => {
        const context = document.createElement("canvas").getContext("webgl");
        const info = context?.getExtension("WEBGL_debug_renderer_info");
        return info ? context.getParameter(info.UNMASKED_RENDERER_WEBGL) : "no webgl";
      });
      console.log(`GL ${gl}`);
      await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight * 0.3, behavior: "instant" }));
      await page.waitForTimeout(600);

      // One walk through the depths first, unmeasured: a fresh browser
      // compiles each GPU pipeline on first use, which says nothing about
      // the switch (readers' browsers keep a shader cache).
      for (const step of route) {
        const settled = page.evaluate(() => new Promise((resolve) => document.addEventListener("inspr:details-settled", resolve, { once: true })));
        if (size.name === "phone") await tap(page, page.getByRole("button", { name: "Choose the page depth" }));
        await tap(page, page.getByRole("radio", { name: step.name }));
        await settled;
        await page.waitForTimeout(300);
      }

      const results = [];
      for (const step of route) {
        // Frames from just before the change until 150 ms after landing.
        await page.evaluate(() => {
          const record = { frames: [], long: [], done: false };
          window.__frames = record;
          let last = null;
          const tick = (now) => {
            if (last !== null) record.frames.push(now - last);
            last = now;
            if (!record.done) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
          if (PerformanceObserver.supportedEntryTypes?.includes("long-animation-frame")) {
            record.observer = new PerformanceObserver((list) => {
              for (const entry of list.getEntries()) {
                record.long.push(Math.round(entry.duration));
                record.blame = [...(record.blame ?? []), ...(entry.scripts ?? []).map((script) => `${script.invoker} ${String(script.sourceURL ?? "").split("/").pop()} ${Math.round(script.duration)}ms`), `render ${Math.round(entry.duration - (entry.renderStart ? entry.renderStart - entry.startTime : 0))}ms style+layout ${Math.round(entry.styleAndLayoutStart ? entry.startTime + entry.duration - entry.styleAndLayoutStart : 0)}ms`];
              }
            });
            record.observer.observe({ type: "long-animation-frame" });
          }
          document.addEventListener("inspr:details-settled", () => {
            window.setTimeout(() => {
              record.done = true;
            }, 150);
          }, { once: true });
        });
        await page.waitForTimeout(120);
        if (size.name === "phone") await tap(page, page.getByRole("button", { name: "Choose the page depth" }));
        await tap(page, page.getByRole("radio", { name: step.name }));
        await page.waitForFunction(() => window.__frames.done, null, { timeout: 5000 });
        const measured = await page.evaluate(() => {
          const record = window.__frames;
          record.observer?.disconnect();
          const frames = record.frames.slice(1);
          const sorted = [...frames].sort((a, b) => a - b);
          return {
            count: frames.length,
            max: Math.max(...frames),
            p95: sorted[Math.floor(sorted.length * 0.95)] ?? 0,
            over: frames.filter((frame) => frame > 1000 / 60 + 4).map((frame) => Math.round(frame * 10) / 10),
            long: record.long,
            blame: record.blame ?? [],
          };
        });
        results.push({ to: step.to, ...measured });
        await page.waitForTimeout(400);
      }
      const summary = results.map((result) =>
        `${result.to}: max ${result.max.toFixed(1)} ms, p95 ${result.p95.toFixed(1)} ms, ${result.count} frames, over ${JSON.stringify(result.over)}, long ${JSON.stringify(result.long)}${result.blame.length ? ` blame ${JSON.stringify(result.blame)}` : ""}`);
      console.log(`FRAMES ${path} ${size.name}\n  ${summary.join("\n  ")}`);
      await testInfo.attach("frames", { body: JSON.stringify(results, null, 2), contentType: "application/json" });
      for (const result of results) {
        expect(result.long, `${result.to}: long animation frames`).toEqual([]);
        expect(result.max, `${result.to}: slowest frame`).toBeLessThanOrEqual(FRAME_MS + TOLERANCE_MS);
      }
    });
  }
}
