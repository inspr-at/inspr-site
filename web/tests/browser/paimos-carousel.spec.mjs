// The AEON specs carousel (INSPR-494): the dialog keeps its accessibility
// state across a rapid close and reopen, and every caption stays reachable
// on a short viewport because the active slide scrolls on its own, by
// pointer and by keyboard.
import { expect, test } from "./fixtures.mjs";

const pages = [
  { path: "/paimos/", lang: "en" },
  { path: "/paimos/de/", lang: "de" },
];

const dialogState = (page) =>
  page.evaluate(() => {
    const dialog = document.querySelector("[data-specs-carousel]");
    const ids = (attr) => (dialog.getAttribute(attr) ?? "").split(" ").filter(Boolean);
    const current = dialog.querySelector(".specs__slide.is-current");
    return {
      role: dialog.getAttribute("role"),
      modal: dialog.getAttribute("aria-modal"),
      labelledby: ids("aria-labelledby"),
      nameResolves: ids("aria-labelledby").every((id) => (document.getElementById(id)?.textContent ?? "").trim().length > 0),
      describedby: ids("aria-describedby"),
      descriptionResolves: ids("aria-describedby").every((id) => (document.getElementById(id)?.textContent ?? "").trim().length > 0),
      currentSlide: current?.dataset.slide ?? null,
      currentHidden: current?.getAttribute("aria-hidden") ?? null,
      currentAlt: current?.querySelector(".specs__slide-img")?.getAttribute("alt") ?? "",
      othersHidden: [...dialog.querySelectorAll(".specs__slide:not(.is-current)")].every((slide) => slide.getAttribute("aria-hidden") === "true"),
      focused: document.activeElement?.getAttribute("aria-label") ?? null,
      inert: dialog.hasAttribute("inert"),
    };
  });

test.describe("carousel dialog state", () => {
  // Real motion: under reduced motion the close settles at once and a
  // reopen never meets the slide the fade keeps in place.
  test.use({ reducedMotion: "no-preference" });

  // The page clock starts at a fixed time and pauses well ahead of it
  // before the close, so the reopen lands inside the 800ms settle window
  // every run; then time runs past it. The first open goes by keyboard:
  // under real motion the page scrolls smoothly, which a click can outrun.
  const start = new Date("2026-09-30T12:00:00Z");
  const openAt = async (page, index) => {
    await page.clock.install({ time: start });
    await page.goto(`${pages[0].path}?lang=en`, { waitUntil: "domcontentloaded" });
    const button = page.locator("#specs .specs__tile .specs__open").nth(index);
    // Centred, clear of the sticky header; focus then has nothing to scroll.
    await button.evaluate((el) => el.scrollIntoView({ block: "center", behavior: "instant" }));
    await button.focus();
    await page.keyboard.press("Enter");
    await expect(page.locator("[data-specs-carousel]")).toHaveAttribute("role", "dialog");
    return button;
  };

  const closeInsideSettle = async (page, key) => {
    await page.clock.pauseAt(new Date(start.getTime() + 10 * 60_000));
    await page.keyboard.press("Escape");
    await expect(page.locator("[data-specs-carousel]")).not.toHaveAttribute("role", "dialog");
    const settling = await page.evaluate(() => {
      const dialog = document.querySelector("[data-specs-carousel]");
      const opener = document.activeElement;
      // A fading control must not take focus.
      const close = dialog.querySelector("[data-carousel-close]");
      close.focus();
      const closeFocusable = document.activeElement === close;
      opener.focus();
      return {
        showing: document.querySelector(".specs--aeon").classList.contains("is-showing"),
        kept: dialog.querySelector(".specs__slide.is-current")?.dataset.slide ?? null,
        inert: dialog.hasAttribute("inert"),
        closeFocusable,
      };
    });
    expect(settling.showing, "the close is still settling").toBe(true);
    expect(settling.kept, "the closing slide is kept for its fade").toBe(key);
    expect(settling.inert, "the fading dialog is inert").toBe(true);
    expect(settling.closeFocusable, "the fading dialog's controls take no focus").toBe(false);
  };

  // The fading carousel must not catch the click meant for the card: the
  // card is the top hit target at its centre, and a real click lands there.
  const clickThroughSettle = async (button) => {
    const point = await button.evaluate((el) => {
      const box = el.getBoundingClientRect();
      const x = box.left + box.width / 2;
      const y = box.top + box.height / 2;
      const top = document.elementFromPoint(x, y);
      return { x, y, hit: el.contains(top), top: top?.className?.baseVal ?? top?.className ?? null };
    });
    expect(point.hit, `the closing carousel lets the card take the click (top: ${point.top})`).toBe(true);
    await button.page().mouse.click(point.x, point.y);
  };

  const expectOpenOn = async (page, key) => {
    const state = await dialogState(page);
    expect(state.role).toBe("dialog");
    expect(state.modal).toBe("true");
    expect(state.currentSlide).toBe(key);
    expect(state.currentHidden).toBe("false");
    expect(state.currentAlt.length).toBeGreaterThan(0);
    expect(state.othersHidden).toBe(true);
    expect(state.labelledby).toContain(`specs-slide-label-${key}`);
    expect(state.nameResolves).toBe(true);
    expect(state.describedby).toEqual([`specs-slide-note-${key}`]);
    expect(state.descriptionResolves).toBe(true);
    expect(state.focused).toBe("Close");
    expect(state.inert).toBe(false);
  };

  test("survives a rapid Escape and click reopen of the same card", async ({ page }) => {
    const button = await openAt(page, 3);
    await closeInsideSettle(page, "04");
    await clickThroughSettle(button);
    await expectOpenOn(page, "04");
    // The pending settle from the close must not undo the reopen.
    await page.clock.runFor(1000);
    await expectOpenOn(page, "04");
  });

  test("survives a rapid Escape and Enter reopen by keyboard", async ({ page }) => {
    const button = await openAt(page, 6);
    await closeInsideSettle(page, "07");
    await expect(button).toBeFocused();
    await page.keyboard.press("Enter");
    await expectOpenOn(page, "07");
    await page.clock.runFor(1000);
    await expectOpenOn(page, "07");
    // A close after a reopen still returns focus and clears the dialog.
    await page.keyboard.press("Escape");
    await expect(page.locator("[data-specs-carousel]")).not.toHaveAttribute("role", "dialog");
    await expect(button).toBeFocused();
    await page.clock.runFor(1000);
    expect(await page.locator("[data-specs-carousel] .specs__slide.is-current").count()).toBe(0);
  });
});

for (const { path, lang } of pages) {
  test(`${path} keeps the longest caption reachable at 320x256`, async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 256 });
    await page.goto(`${path}?lang=${lang}`, { waitUntil: "domcontentloaded" });
    // The slide whose standard note is longest.
    const index = await page.evaluate(() => {
      const notes = [...document.querySelectorAll("[data-specs-carousel] .specs__slide-note .specs__variant--tech")];
      return notes.reduce((best, note, i) => (note.textContent.length > notes[best].textContent.length ? i : best), 0);
    });
    const button = page.locator("#specs .specs__tile .specs__open").nth(index);
    await button.scrollIntoViewIfNeeded();
    // INSPR-540: open by keyboard. This test is about the caption, and Linux
    // WebKit reports the first tile as never "stable" for a pointer click at
    // 320x256 (INSPR-538); the click path has its own reopen test above.
    await button.focus();
    await page.keyboard.press("Enter");
    await expect(page.locator("[data-specs-carousel]")).toHaveAttribute("role", "dialog");
    const slide = page.locator("[data-specs-carousel] .specs__slide.is-current");
    const metrics = await slide.evaluate((el) => {
      const img = el.querySelector(".specs__slide-img");
      const source = el.querySelector(".specs__slide-source");
      el.scrollTop = 0;
      const imageTopAtStart = img.getBoundingClientRect().top;
      el.scrollTop = el.scrollHeight;
      const sourceBottomAtEnd = source.getBoundingClientRect().bottom;
      return {
        overflows: el.scrollHeight > el.clientHeight,
        scrollable: getComputedStyle(el).overflowY === "auto",
        imageTopAtStart,
        imageHeight: img.getBoundingClientRect().height,
        sourceBottomAtEnd,
        viewport: window.innerHeight,
        pageOverflow: document.documentElement.scrollWidth > window.innerWidth,
      };
    });
    expect(metrics.scrollable).toBe(true);
    expect(metrics.imageTopAtStart).toBeGreaterThanOrEqual(0);
    expect(metrics.imageHeight).toBeGreaterThan(0);
    expect(metrics.sourceBottomAtEnd).toBeLessThanOrEqual(metrics.viewport + 1);
    expect(metrics.pageOverflow).toBe(false);
  });
}

test("the keyboard reaches and scrolls an overflowing caption", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 256 });
  await page.goto(`${pages[0].path}?lang=en`, { waitUntil: "domcontentloaded" });
  const button = page.locator("#specs .specs__tile .specs__open").first();
  await button.scrollIntoViewIfNeeded();
  await button.focus();
  await page.keyboard.press("Enter");
  const dialog = page.locator("[data-specs-carousel]");
  await expect(dialog).toHaveAttribute("role", "dialog");
  const slide = dialog.locator(".specs__slide.is-current");
  expect(await slide.evaluate((el) => el.scrollHeight > el.clientHeight)).toBe(true);
  // Close, then the slide: the scroll region sits in the focus trap.
  await page.keyboard.press("Tab");
  await expect(slide).toBeFocused();
  expect(await dialog.locator(".specs__slide[tabindex]").count()).toBe(1);
  await page.keyboard.press("PageDown");
  await expect.poll(() => slide.evaluate((el) => el.scrollTop)).toBeGreaterThan(0);
  await page.keyboard.press("End");
  await expect
    .poll(() => slide.evaluate((el) => Math.ceil(el.scrollTop + el.clientHeight) >= el.scrollHeight - 1))
    .toBe(true);
  // Paging from the focused slide hands focus to the incoming slide; the
  // outgoing one is hidden and leaves the focus order.
  await page.keyboard.press("ArrowRight");
  const second = dialog.locator('.specs__slide[data-slide="02"]');
  await expect(second).toHaveClass(/is-current/);
  await expect(second).toBeFocused();
  await expect(dialog.locator('.specs__slide[data-slide="01"]')).toHaveAttribute("aria-hidden", "true");
  expect(await dialog.locator(".specs__slide[tabindex]").count()).toBe(1);
  // The trap cycles on through the arrows and back to Close.
  await page.keyboard.press("Tab");
  await expect(dialog.locator("[data-carousel-prev]")).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(dialog.locator("[data-carousel-next]")).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(dialog.locator("[data-carousel-close]")).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(dialog.locator("[data-carousel-next]")).toBeFocused();
  // Paging from a button keeps focus on it; the next slide takes over the
  // focus stop.
  await page.keyboard.press("ArrowRight");
  await expect(dialog.locator(".specs__slide.is-current")).toHaveAttribute("data-slide", "03");
  await expect(dialog.locator("[data-carousel-next]")).toBeFocused();
  expect(await dialog.locator(".specs__slide[tabindex]").count()).toBe(1);
  await expect(dialog.locator(".specs__slide.is-current")).toHaveAttribute("tabindex", "0");
  // Closed, the dialog is inert again.
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveAttribute("inert", "");
});
