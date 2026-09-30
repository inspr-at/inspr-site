// The Why · What · How switch and the depth engine (INSPR-497): one
// labelled choice on all five sites, a stored depth painted before the
// first frame, and a switch whose every frame is transform and opacity.
import { expect, test } from "@playwright/test";

const sites = [
  { path: "/", name: "umbrella" },
  { path: "/overview/", name: "overview" },
  { path: "/aithema/", name: "aithema" },
  { path: "/paimos/", name: "paimos" },
  { path: "/pharos/", name: "pharos" },
  { path: "/janus/", name: "janus" },
];

const level = (page) => page.evaluate(() => document.documentElement.getAttribute("data-details-level"));

// A real click where the control is drawn. Playwright's click() first
// "scrolls into view" and, for a control in the sticky header, moves the
// page half a screen; a reader's click never does.
const tap = async (page, locator) => {
  await locator.waitFor({ state: "visible" });
  const box = await locator.boundingBox();
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
};

// Clicks a choice and resolves once the engine has landed.
const choose = async (page, name) => {
  const settled = page.evaluate(() => new Promise((resolve) => {
    document.addEventListener("inspr:details-settled", (event) => resolve(event.detail?.level), { once: true });
  }));
  await tap(page, page.getByRole("radio", { name }));
  return settled;
};

test.describe("the switch", () => {
  for (const { path, name } of sites) {
    test(`${name}: a labelled radio group, Why · What · How`, async ({ page }) => {
      await page.goto(`${path}?lang=en`);
      const group = page.getByRole("radiogroup", { name: "Page depth" });
      await expect(group).toBeVisible();
      const radios = group.getByRole("radio");
      await expect(radios).toHaveText([/^Why/, /^What/, /^How/]);
      await expect(group.getByRole("radio", { name: "What" })).toHaveAttribute("aria-checked", "true");
      await expect(group.getByRole("radio", { name: "What" })).toHaveAttribute("tabindex", "0");
      await expect(group.getByRole("radio", { name: "Why" })).toHaveAttribute("tabindex", "-1");
      await expect(page.locator("[data-details-slider]")).toHaveCount(1);
      expect(await page.locator(".details-switch").innerText()).not.toMatch(/simple|developer|sysop|nerd/i);
    });
  }

  test("German names and hints", async ({ page }) => {
    await page.goto("/de/?lang=de");
    const group = page.getByRole("radiogroup", { name: "Seitentiefe" });
    await expect(group.getByRole("radio")).toHaveText([/^Warum/, /^Was/, /^Wie/]);
    await expect(group.getByRole("radio", { name: "Wie" })).toHaveAccessibleDescription(/technischen Details/);
  });

  test("keyboard: arrows choose, Home and End jump, focus follows", async ({ page }) => {
    await page.goto("/pharos/?lang=en");
    const group = page.getByRole("radiogroup", { name: "Page depth" });
    await group.getByRole("radio", { name: "What" }).focus();
    await page.keyboard.press("ArrowRight");
    await expect(group.getByRole("radio", { name: "How" })).toBeFocused();
    await expect(group.getByRole("radio", { name: "How" })).toHaveAttribute("aria-checked", "true");
    await expect.poll(() => level(page)).toBe("technical");
    await page.keyboard.press("Home");
    await expect(group.getByRole("radio", { name: "Why" })).toBeFocused();
    await expect.poll(() => level(page)).toBe("simple");
    await page.keyboard.press("End");
    await expect.poll(() => level(page)).toBe("technical");
    await page.keyboard.press("ArrowLeft");
    await expect.poll(() => level(page)).toBe("standard");
    await expect(page.locator("[data-details-status]")).toHaveText(/^What/);
  });

  test("a change says what the page now shows, then lets go", async ({ page }) => {
    await page.goto("/aithema/?lang=en");
    await choose(page, "How");
    const note = page.locator("[data-details-note]");
    await expect(note).toHaveText(/^How/);
    await expect(page.locator(".details-switch")).toHaveClass(/has-note/);
    await expect(note).toHaveCSS("pointer-events", "none");
    await expect(page.locator(".details-switch")).not.toHaveClass(/has-note/, { timeout: 5000 });
  });

  test("the phone form: glyph and name, a popover with hints", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 640 });
    await page.goto("/paimos/?lang=en");
    const toggle = page.getByRole("button", { name: "Choose the page depth" });
    await expect(toggle).toBeVisible();
    await expect(toggle).toContainText("What");
    await expect(page.getByRole("radiogroup")).toBeHidden();
    await toggle.click();
    const group = page.getByRole("radiogroup", { name: "Page depth" });
    await expect(group).toBeVisible();
    await expect(toggle).toHaveAttribute("aria-expanded", "true");
    await expect(group.getByText("Results and value, fewer technical details")).toBeVisible();
    const box = await group.boundingBox();
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(320);
    await group.getByRole("radio", { name: "How" }).click();
    await expect(group).toBeHidden();
    await expect(toggle).toBeFocused();
    await expect(toggle).toContainText("How");
    await expect.poll(() => level(page)).toBe("technical");
    await toggle.click();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("radiogroup")).toBeHidden();
    await expect(toggle).toBeFocused();
    await toggle.click();
    await page.locator("h1").first().click({ position: { x: 2, y: 2 } });
    await expect(page.getByRole("radiogroup")).toBeHidden();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
  });
});

test.describe("arrival", () => {
  test("a stored depth is on <html> before the body exists", async ({ page }) => {
    await page.addInitScript(() => {
      try {
        localStorage.setItem("inspr-details-level", "technical");
      } catch { /* ignore */ }
      new MutationObserver((_, observer) => {
        if (!document.body) return;
        window.__levelAtBody = document.documentElement.getAttribute("data-details-level");
        observer.disconnect();
      }).observe(document, { childList: true, subtree: true });
    });
    await page.goto("/pharos/?lang=en");
    expect(await page.evaluate(() => window.__levelAtBody)).toBe("technical");
    await expect(page.getByRole("radio", { name: "How" })).toHaveAttribute("aria-checked", "true");
  });

  test("?details= lands the depth and leaves the address clean", async ({ page }) => {
    await page.goto("/janus/?lang=en&details=simple");
    await expect.poll(() => level(page)).toBe("simple");
    await expect(page.getByRole("radio", { name: "Why" })).toHaveAttribute("aria-checked", "true");
    expect(new URL(page.url()).searchParams.has("details")).toBe(false);
    expect(await page.evaluate(() => document.documentElement.hasAttribute("data-details-compact"))).toBe(true);
  });

  test("the legacy technical flag still means How", async ({ page }) => {
    await page.addInitScript(() => {
      try {
        localStorage.removeItem("inspr-details-level");
        localStorage.setItem("inspr-details", "1");
      } catch { /* ignore */ }
    });
    await page.goto("/pharos/?lang=en");
    expect(await level(page)).toBe("technical");
  });
});

test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("the page is What and the switch says so", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("radio", { name: "What" })).toHaveAttribute("aria-checked", "true");
    const state = await page.evaluate(() => {
      const shown = (selector) => [...document.querySelectorAll(selector)].filter((element) => element.getClientRects().length > 0).length;
      return {
        drawers: shown("[data-drawer]"),
        simpleOnly: shown('[data-depth-max="simple"]'),
        standard: shown('[data-copy-level="standard"]'),
        simpleCopy: shown('[data-copy-level="simple"]'),
      };
    });
    expect(state.drawers).toBe(0);
    expect(state.simpleOnly).toBe(0);
    expect(state.standard).toBeGreaterThan(0);
    expect(state.simpleCopy).toBe(0);
  });
});

test.describe("each depth shows its own page", () => {
  for (const { path, name } of sites) {
    test(`${name}: folds and copy follow the level`, async ({ page }) => {
      await page.goto(`${path}?lang=en`);
      const census = () => page.evaluate(() => {
        const current = document.documentElement.getAttribute("data-details-level");
        const order = ["simple", "standard", "technical"];
        const depth = order.indexOf(current);
        const wrong = [];
        for (const element of document.querySelectorAll("[data-depth-min], [data-depth-max], [data-drawer]")) {
          if (element.parentElement?.closest("[data-depth-min], [data-depth-max], [data-drawer]")) continue;
          const min = element.hasAttribute("data-drawer") ? "technical" : element.getAttribute("data-depth-min");
          const max = element.getAttribute("data-depth-max");
          const open = !((min && depth < order.indexOf(min)) || (max && depth > order.indexOf(max)));
          const shown = element.getClientRects().length > 0;
          // A closed fold must be gone; an open one may still be hidden by
          // its page's own layout rules.
          if (!open && shown) wrong.push(`${element.tagName}.${element.className} closed but shown`);
          if (open && getComputedStyle(element).display === "none" && element.parentElement?.getClientRects().length && !element.matches("[class*=connector], [aria-hidden=true]")) {
            wrong.push(`${element.tagName}.${element.className} open but display none`);
          }
        }
        for (const slot of document.querySelectorAll("[data-copy-slot]")) {
          if (!slot.parentElement || slot.parentElement.getClientRects().length === 0) continue;
          // Copy the page itself keeps invisible (a hover-driven caption).
          if (getComputedStyle(slot.parentElement).visibility === "hidden") continue;
          const shown = [...slot.querySelectorAll(":scope > [data-copy-level]")].filter((variant) => variant.getClientRects().length > 0 && getComputedStyle(variant).visibility !== "hidden").map((variant) => variant.getAttribute("data-copy-level"));
          if (shown.length !== 1 || shown[0] !== current) wrong.push(`slot shows ${shown.join("+") || "nothing"} at ${current}`);
        }
        return wrong;
      });
      expect(await census()).toEqual([]);
      for (const choice of ["How", "Why", "What", "How", "What"]) {
        await choose(page, choice);
        expect(await census(), `${choice}`).toEqual([]);
        expect(await page.evaluate(() => document.documentElement.hasAttribute("data-details-moving"))).toBe(false);
        expect(await page.evaluate(() => document.querySelectorAll(".is-holding, .is-swapping, [data-copy-from]").length)).toBe(0);
      }
    });
  }
});

test.describe("motion", () => {
  test.use({ reducedMotion: "no-preference" });

  const watch = (page) => page.evaluate(() => {
    const record = { animations: [], shifts: [], targets: new Set(), windows: [], seenBlocks: new Set() };
    // The top-level blocks on screen in any frame of a switch: a shift of a
    // block the reader never saw is no visible jump.
    const topBlock = (node) => {
      let element = node instanceof Element ? node : node?.parentElement;
      while (element && element.parentElement && element.parentElement !== document.body && element.parentElement.tagName !== "MAIN") element = element.parentElement;
      return element;
    };
    const noteSeen = () => {
      for (const block of document.querySelectorAll("body > *, main > *")) {
        const box = block.getBoundingClientRect();
        if (box.height > 0 && box.bottom > 0 && box.top < window.innerHeight) record.seenBlocks.add(block);
      }
    };
    record.topBlock = topBlock;
    window.__motion = record;
    const since = performance.now();
    const sweep = () => {
      noteSeen();
      for (const animation of document.getAnimations()) {
        const effect = animation.effect;
        const target = effect?.target;
        const isOurs = animation.id === "details-depth";
        const isNew = animation.startTime !== null && animation.startTime >= since - 1;
        // Ambient loops (a pulse that restarts when its block appears) are
        // the page's own decoration, not the switch.
        const ambient = effect?.getTiming?.().iterations === Infinity;
        if (!isOurs && (!isNew || ambient)) continue;
        let properties = [];
        if (animation instanceof CSSTransition) properties = [animation.transitionProperty];
        else properties = [...new Set((effect?.getKeyframes?.() ?? []).flatMap((frame) => Object.keys(frame)))]
          .filter((key) => !["offset", "computedOffset", "easing", "composite"].includes(key));
        const label = `${target?.tagName ?? "?"}.${String(target?.className ?? "").slice(0, 40)}`;
        record.animations.push({ id: animation.id, kind: animation.constructor.name, label, properties });
        if (target) record.targets.add(target);
      }
      if (document.documentElement.hasAttribute("data-details-moving")) requestAnimationFrame(sweep);
    };
    const start = () => requestAnimationFrame(sweep);
    const observer = new MutationObserver(() => {
      if (document.documentElement.hasAttribute("data-details-moving")) {
        noteSeen();
        record.windows.push([performance.now(), null]);
        start();
      } else if (record.windows.length && record.windows.at(-1)[1] === null) {
        record.windows.at(-1)[1] = performance.now();
      }
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-details-moving"] });
    if ("PerformanceObserver" in window && PerformanceObserver.supportedEntryTypes?.includes("layout-shift")) {
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          for (const source of entry.sources ?? []) {
            const rect = (r) => `${Math.round(r.y)}+${Math.round(r.height)}`;
            record.shifts.push({ node: source.node ?? null, at: entry.startTime, rects: `${rect(source.previousRect)} -> ${rect(source.currentRect)} scroll ${Math.round(window.scrollY)}` });
          }
        }
      }).observe({ type: "layout-shift" });
    }
  });

  const verdict = (page) => page.evaluate(() => {
    const record = window.__motion;
    const allowed = new Set(["transform", "translate", "opacity", "scale", "rotate"]);
    const bad = record.animations.filter((animation) => animation.properties.some((property) => !allowed.has(property)));
    const moved = [...record.targets];
    const stray = record.shifts
      .filter(({ node }) => node && !moved.some((target) => target === node || target.contains(node) || node.contains?.(target)))
      .filter(({ node }) => record.seenBlocks.has(record.topBlock(node)))
      .map(({ node, at, rects }) => {
        const inside = record.windows.findIndex(([from, to]) => at >= from - 20 && at <= (to ?? Infinity) + 50);
        node.__when = `${inside >= 0 ? `during switch ${inside + 1}` : `outside switches (t=${Math.round(at)}, windows ${JSON.stringify(record.windows.map((w) => w.map(Math.round)))})`} ${rects}`;
        return node;
      });
    return {
      ours: record.animations.filter((animation) => animation.id === "details-depth").length,
      bad: bad.map((animation) => `${animation.kind} ${animation.label}: ${animation.properties.join(",")}`),
      stray: stray.map((node) => `${node.nodeName}.${String(node.className ?? "").slice(0, 40)} ${node.__when}`),
    };
  });

  for (const { path, name } of sites) {
    test(`${name}: every switch frame is transform and opacity, nothing else shifts`, async ({ page }) => {
      await page.goto(`${path}?lang=en`, { waitUntil: "networkidle" });
      // Read from the middle of the page, where folds come and go; the
      // header's own float transition settles first.
      await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight * 0.3, behavior: "instant" }));
      await page.waitForTimeout(900);
      await watch(page);
      for (const choice of ["How", "Why", "What"]) await choose(page, choice);
      const result = await verdict(page);
      expect(result.bad).toEqual([]);
      expect(result.stray).toEqual([]);
    });
  }

  test("a reversal mid-switch lands cleanly", async ({ page }) => {
    await page.goto("/pharos/?lang=en", { waitUntil: "networkidle" });
    await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight * 0.3, behavior: "instant" }));
    const settled = page.evaluate(() => new Promise((resolve) => {
      let count = 0;
      document.addEventListener("inspr:details-settled", (event) => {
        count += 1;
        if (event.detail?.level === "simple") resolve(count);
      });
    }));
    await tap(page, page.getByRole("radio", { name: "How" }));
    await page.waitForTimeout(180);
    await tap(page, page.getByRole("radio", { name: "Why" }));
    await settled;
    expect(await level(page)).toBe("simple");
    const leftovers = await page.evaluate(() => ({
      holding: document.querySelectorAll(".is-holding, .is-swapping, [data-copy-from]").length,
      moving: document.documentElement.hasAttribute("data-details-moving"),
      running: document.getAnimations().filter((animation) => animation.id === "details-depth").length,
      translated: [...document.querySelectorAll("main *")].filter((element) => {
        const value = getComputedStyle(element).translate;
        return value !== "none" && element.getAnimations().some((animation) => animation.id === "details-depth");
      }).length,
    }));
    expect(leftovers).toEqual({ holding: 0, moving: false, running: 0, translated: 0 });
  });
});

test.describe("reduced motion", () => {
  test("the change is instant, with no motion", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/overview/?lang=en");
    expect(await page.evaluate(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches)).toBe(true);
    await tap(page, page.getByRole("radio", { name: "How" }));
    await expect.poll(() => level(page)).toBe("technical");
    const ours = await page.evaluate(() => document.getAnimations()
      .filter((animation) => animation.id === "details-depth")
      .slice(0, 4)
      .map((animation) => `${animation.effect?.target?.className} ${animation.playState}`));
    expect(ours).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.hasAttribute("data-details-moving"))).toBe(false);
  });
});
