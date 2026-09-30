// The reader keeps their place (INSPR-497): a depth switch never scrolls
// what the reader is looking at. The block under the reading line (30 % of
// the screen below the sticky header) stays within a pixel on every frame
// and after landing; the scroll changes in one jump, never an eased glide.
import { expect, test } from "@playwright/test";

const pages = [
  { path: "/paimos/", spots: { specs: "#specs", faq: ".faq" } },
  { path: "/pharos/", spots: { specs: "#capabilities, #specs, .specs", faq: ".faq" } },
  { path: "/overview/", spots: { specs: "#path", faq: ".overview-next" } },
];
const sizes = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "phone", width: 390, height: 844 },
];
// Every direction between the three depths, in one walk from What.
const walk = [
  ["How", "technical"],
  ["Why", "simple"],
  ["What", "standard"],
  ["Why", "simple"],
  ["How", "technical"],
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

// Records the switch the next choice starts: the anchor, its target top,
// its top on every frame, and the scroll on every frame.
const record = (page) => page.evaluate(() => {
  const trace = { anchor: null, at: null, fallback: false, tops: [], scrolls: [window.scrollY], heights: [document.documentElement.scrollHeight], after: null, done: false };
  window.__trace = trace;
  document.addEventListener("inspr:details-moving", (event) => {
    const anchor = event.detail?.anchor;
    trace.anchor = anchor?.element ?? null;
    trace.at = anchor?.at ?? null;
    trace.fallback = Boolean(anchor?.fallback);
    const sample = () => {
      trace.scrolls.push(window.scrollY);
      trace.heights.push(document.documentElement.scrollHeight);
      // The per-frame check covers the frames of the motion itself.
      if (trace.anchor && document.documentElement.hasAttribute("data-details-moving")) trace.tops.push(trace.anchor.getBoundingClientRect().top);
      if (!trace.done) requestAnimationFrame(sample);
    };
    sample();
  }, { once: true });
  document.addEventListener("inspr:details-settled", () => {
    trace.atCommit = trace.anchor ? trace.anchor.getBoundingClientRect().top : null;
    trace.heightAtCommit = document.documentElement.scrollHeight;
    requestAnimationFrame(() => {
      trace.oneFrame = trace.anchor ? trace.anchor.getBoundingClientRect().top : null;
      requestAnimationFrame(() => {
        trace.after = trace.anchor ? trace.anchor.getBoundingClientRect().top : null;
        trace.scrolls.push(window.scrollY);
        trace.heights.push(document.documentElement.scrollHeight);
        trace.heightAfter = document.documentElement.scrollHeight;
        trace.done = true;
      });
    });
  }, { once: true });
});

const result = (page) => page.evaluate(() => {
  const trace = window.__trace;
  const distinct = trace.scrolls.filter((value, index, all) => index === 0 || Math.abs(value - all[index - 1]) > 0.5);
  // A correction is allowed where the page itself changed height (a block
  // that lays out late); an eased scroll would step without one.
  const heightSteps = trace.heights.filter((value, index, all) => index > 0 && Math.abs(value - all[index - 1]) > 0.5).length;
  return {
    anchored: Boolean(trace.anchor),
    label: trace.anchor ? `${trace.anchor.tagName}.${String(trace.anchor.className).slice(0, 40)}` : null,
    fallback: trace.fallback,
    at: trace.at,
    worst: trace.at === null || trace.fallback ? 0 : Math.max(0, ...trace.tops.map((top) => Math.abs(top - trace.at))),
    after: trace.after === null || trace.at === null ? 0 : Math.abs(trace.after - trace.at),
    scrollSteps: distinct.length - 1,
    heightSteps,
    firstScroll: trace.scrolls[0],
    lastScroll: trace.scrolls.at(-1),
    // Pinned at the page bottom: the page got too short to hold the block.
    atBottom: trace.scrolls.at(-1) >= (trace.heightAfter ?? 0) - window.innerHeight - 1,
    lowered: trace.after === null || trace.at === null ? 0 : trace.after - trace.at,
    detail: JSON.stringify({
      at: trace.at && Math.round(trace.at),
      tops: trace.tops.filter((_, i) => i % 4 === 0).map(Math.round),
      atCommit: trace.atCommit && Math.round(trace.atCommit),
      oneFrame: trace.oneFrame && Math.round(trace.oneFrame),
      after: trace.after && Math.round(trace.after),
      scrolls: distinct.map(Math.round),
      heights: [trace.heightAtCommit, trace.heightAfter],
    }),
  };
});

// The rule: at the top the page top stays; pinned at the page bottom the
// block can only sit lower than its place, never higher; otherwise it keeps
// its place within a pixel after landing and, unless it replaces a block
// that folded away, on every frame. The scroll moves once, never eased.
const check = (r, label) => {
  if (!r.anchored) {
    expect(r.firstScroll, label).toBeLessThanOrEqual(2);
    expect(r.lastScroll, label).toBeLessThanOrEqual(2);
  } else if (r.atBottom && r.lowered > 1) {
    expect(r.lowered, `${label}: pinned at the bottom`).toBeGreaterThan(0);
  } else {
    expect(r.after, `${label}: after landing`).toBeLessThanOrEqual(1);
    expect(r.worst, `${label}: on the worst frame`).toBeLessThanOrEqual(1);
  }
  expect(r.scrollSteps, `${label}: the scroll jumps once, plus once per late relayout`).toBeLessThanOrEqual(1 + r.heightSteps);
};

const choose = async (page, size, name) => {
  if (size.name === "phone") await tap(page, page.getByRole("button", { name: "Choose the page depth" }));
  await tap(page, page.getByRole("radio", { name }));
};

// Puts a spot on the reading line; the hero means the very top.
const place = (page, spot) => page.evaluate((selector) => {
  if (!selector) {
    window.scrollTo({ top: 0, behavior: "instant" });
    return true;
  }
  const target = [...document.querySelectorAll(selector)].find((element) => element.getClientRects().length > 0);
  if (!target) return false;
  const header = document.querySelector(".site-header")?.getBoundingClientRect().bottom ?? 0;
  const line = header + (window.innerHeight - header) * 0.3;
  const box = target.getBoundingClientRect();
  window.scrollTo({ top: window.scrollY + box.top + Math.min(box.height / 2, 200) - line, behavior: "instant" });
  return true;
}, spot);

for (const size of sizes) {
  for (const { path, spots } of pages) {
    const positions = {
      hero: null,
      specs: spots.specs,
      faq: spots.faq,
      "hidden at Why": 'main [data-depth-min="standard"]:not([data-depth-min] [data-depth-min])',
    };
    for (const [spot, selector] of Object.entries(positions)) {
      test(`${path} ${size.name}, ${spot}: the reader's block holds through every switch`, async ({ page }) => {
        await page.setViewportSize({ width: size.width, height: size.height });
        await page.goto(`${path}?lang=en`, { waitUntil: "networkidle" });
        const placed = await place(page, selector);
        test.skip(!placed, `${spot} is not on ${path}`);
        await page.waitForTimeout(900);
        for (const [name, level] of walk) {
          await record(page);
          await choose(page, size, name);
          await page.waitForFunction(() => window.__trace.done, null, { timeout: 6000 });
          const r = await result(page);
          const label = `${name} (${level}) anchored on ${r.label}${r.fallback ? " via fallback" : ""} ${r.detail}`;
          check(r, label);
          await page.waitForTimeout(250);
        }
      });
    }
  }
}

test("rapid reversals do not add up", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/pharos/?lang=en", { waitUntil: "networkidle" });
  await place(page, "#capabilities, #specs, .specs");
  await page.waitForTimeout(900);
  await record(page);
  const settled = page.evaluate(() => new Promise((resolve) => {
    let last = null;
    document.addEventListener("inspr:details-settled", (event) => {
      last = event.detail?.level;
      if (last === "simple") resolve(last);
    });
  }));
  await tap(page, page.getByRole("radio", { name: "Why" }));
  await page.waitForTimeout(120);
  await tap(page, page.getByRole("radio", { name: "How" }));
  await page.waitForTimeout(120);
  await tap(page, page.getByRole("radio", { name: "Why" }));
  await settled;
  await page.waitForTimeout(200);
  const drift = await page.evaluate(() => {
    const trace = window.__trace;
    if (!trace.anchor || trace.fallback || !trace.anchor.isConnected || trace.anchor.getClientRects().length === 0) return 0;
    return Math.abs(trace.anchor.getBoundingClientRect().top - trace.at);
  });
  expect(drift).toBeLessThanOrEqual(1);
});

test.describe("reduced motion", () => {
  test("the correction is instant and exact", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/pharos/?lang=en", { waitUntil: "networkidle" });
    await place(page, "#capabilities, #specs, .specs");
    await page.waitForTimeout(900);
    for (const [name] of walk) {
      await record(page);
      await tap(page, page.getByRole("radio", { name }));
      await page.waitForFunction(() => window.__trace.done, null, { timeout: 4000 });
      const r = await result(page);
      check(r, `${name} ${r.detail}`);
    }
  });
});

test("in-page navigation reaches a section folded away at Why", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/pharos/?lang=en&details=simple", { waitUntil: "networkidle" });
  const link = await page.evaluate(() => {
    for (const anchor of document.querySelectorAll('.site-nav a[href^="#"]')) {
      const target = document.getElementById(anchor.getAttribute("href").slice(1));
      if (target && target.getClientRects().length === 0) return anchor.getAttribute("href");
    }
    return null;
  });
  test.skip(!link, "no folded destination in the navigation");
  await page.locator(`.site-nav a[href="${link}"]`).click();
  await expect(page.getByRole("radio", { name: "What" })).toHaveAttribute("aria-checked", "true");
  await expect.poll(() => page.evaluate((id) => {
    const box = document.getElementById(id).getBoundingClientRect();
    return box.top < window.innerHeight && box.bottom > 0;
  }, link.slice(1)), { timeout: 6000 }).toBe(true);
});
