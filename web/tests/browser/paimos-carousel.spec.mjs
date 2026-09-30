// The AEON specs carousel (INSPR-494): the dialog keeps its accessibility
// state across a rapid close and reopen, and every caption stays reachable
// on a short viewport because the active slide scrolls on its own.
import { expect, test } from "@playwright/test";

const pages = [
  { path: "/paimos/", lang: "en" },
  { path: "/paimos/de/", lang: "de" },
];

const open = async (page, index) => {
  await page.goto(`${pages[0].path}?lang=en`, { waitUntil: "domcontentloaded" });
  const button = page.locator("#specs .specs__tile .specs__open").nth(index);
  await button.scrollIntoViewIfNeeded();
  await button.click();
  await expect(page.locator("[data-specs-carousel]")).toHaveAttribute("role", "dialog");
  return button;
};

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
    };
  });

test.describe("carousel dialog state", () => {
  test("survives a rapid Escape and click reopen of the same card", async ({ page }) => {
    const button = await open(page, 3);
    await page.keyboard.press("Escape");
    await expect(page.locator("[data-specs-carousel]")).not.toHaveAttribute("role", "dialog");
    // Well inside the 800ms the closing slide keeps for its fade.
    await button.click();
    const state = await dialogState(page);
    expect(state.role).toBe("dialog");
    expect(state.modal).toBe("true");
    expect(state.currentSlide).toBe("04");
    expect(state.currentHidden).toBe("false");
    expect(state.currentAlt.length).toBeGreaterThan(0);
    expect(state.othersHidden).toBe(true);
    expect(state.labelledby).toContain("specs-slide-label-04");
    expect(state.nameResolves).toBe(true);
    expect(state.describedby).toEqual(["specs-slide-note-04"]);
    expect(state.descriptionResolves).toBe(true);
    expect(state.focused).toBe("Close");
  });

  test("survives a rapid Escape and Enter reopen by keyboard", async ({ page }) => {
    const button = await open(page, 6);
    await page.keyboard.press("Escape");
    await expect(button).toBeFocused();
    await page.keyboard.press("Enter");
    const state = await dialogState(page);
    expect(state.role).toBe("dialog");
    expect(state.currentSlide).toBe("07");
    expect(state.currentHidden).toBe("false");
    expect(state.currentAlt.length).toBeGreaterThan(0);
    expect(state.nameResolves).toBe(true);
    expect(state.descriptionResolves).toBe(true);
    expect(state.focused).toBe("Close");
    // A close after a reopen still returns focus and clears the dialog.
    await page.keyboard.press("Escape");
    await expect(page.locator("[data-specs-carousel]")).not.toHaveAttribute("role", "dialog");
    await expect(button).toBeFocused();
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
    await button.click();
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
