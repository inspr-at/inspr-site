// INSPR-498: the rotating glass AEON mark in the capability carousel. It sits
// in the centre of the generated scenes with an open middle, stays inside
// what it decorates, animates transform and opacity only, pauses from the
// carousel's button (WCAG 2.2.2), and stands still under reduced motion.
import { mkdirSync } from "node:fs";
import { expect, test } from "@playwright/test";

const MARKED = ["06", "10", "12", "17", "20"];
const CLEAN = ["01", "03", "09", "18"];
const ALLOWED = new Set(["transform", "opacity", "offset", "easing", "composite", "computedOffset"]);

const openSlide = async (page, number, size = { width: 1440, height: 900 }) => {
  await page.setViewportSize(size);
  await page.goto("/paimos/?lang=en", { waitUntil: "domcontentloaded" });
  const button = page.locator("#specs .specs__tile .specs__open").nth(Number(number) - 1);
  await button.evaluate((el) => el.scrollIntoView({ block: "center", behavior: "instant" }));
  await button.focus();
  await page.keyboard.press("Enter");
  const dialog = page.locator("[data-specs-carousel]");
  await expect(dialog).toHaveAttribute("role", "dialog");
  const slide = dialog.locator(`.specs__slide[data-slide="${number}"]`);
  await expect(slide).toHaveClass(/is-current/);
  await expect(slide).toHaveCSS("opacity", "1");
  return { dialog, slide };
};

// The animations that belong to a mark of the current slide.
const markAnimations = (page) =>
  page.evaluate(() =>
    document
      .getAnimations()
      .filter((animation) => animation instanceof CSSAnimation && animation.effect?.target?.closest?.(".specs__slide.is-current [data-aeon-mark]"))
      .map((animation) => ({
        name: animation.animationName,
        state: animation.playState,
        properties: [...new Set(animation.effect.getKeyframes().flatMap((frame) => Object.keys(frame)))],
      })),
  );

test.describe("with motion", () => {
  test.use({ reducedMotion: "no-preference" });

  test("exactly the five open-centre scenes carry the mark, no live screen does", async ({ page }) => {
    await page.goto("/paimos/?lang=en", { waitUntil: "domcontentloaded" });
    const marked = await page.evaluate(() =>
      [...document.querySelectorAll("[data-specs-carousel] .specs__slide")]
        .filter((slide) => slide.querySelector("[data-aeon-mark]"))
        .map((slide) => slide.dataset.slide),
    );
    expect(marked).toEqual(MARKED);
    for (const number of CLEAN) {
      expect(marked).not.toContain(number);
    }
    // The mark sits in the frame, which is the image's box.
    const inFrame = await page.evaluate(() =>
      [...document.querySelectorAll("[data-aeon-mark]")].every((mark) => mark.parentElement?.matches(".specs__slide-frame--mark")),
    );
    expect(inFrame).toBe(true);
  });

  for (const [name, size] of [
    ["1440x900", { width: 1440, height: 900 }],
    ["744x1024", { width: 744, height: 1024 }],
    ["390x844", { width: 390, height: 844 }],
    ["320x256", { width: 320, height: 256 }],
  ]) {
    test(`the mark stays inside its slide and off the caption at ${name}`, async ({ page }) => {
      for (const number of ["20", "10"]) {
        const { slide } = await openSlide(page, number, size);
        const geometry = await slide.evaluate((el) => {
          const box = (node) => node.getBoundingClientRect();
          const frame = box(el.querySelector(".specs__slide-frame"));
          const stage = box(el.querySelector(".aeon-mark__stage"));
          const caption = box(el.querySelector(".specs__slide-caption"));
          const halo = box(el.querySelector(".aeon-mark__halo"));
          const slideBox = box(el);
          const inside = (inner, outer, tolerance = 1) =>
            inner.left >= outer.left - tolerance && inner.right <= outer.right + tolerance && inner.top >= outer.top - tolerance && inner.bottom <= outer.bottom + tolerance;
          const round = (r) => [r.left, r.top, r.width, r.height].map((n) => Math.round(n));
          return {
            frame: round(frame),
            stage: round(stage),
            caption: round(caption),
            slideBox: round(slideBox),
            stageInFrame: inside(stage, frame),
            haloInSlide: inside(halo, slideBox),
            stageClearOfCaption: stage.bottom <= caption.top + 1 || stage.top >= caption.bottom - 1 || stage.right <= caption.left || stage.left >= caption.right,
            centred: Math.abs(stage.left + stage.width / 2 - (frame.left + frame.width / 2)) <= 1 && Math.abs(stage.top + stage.height / 2 - (frame.top + frame.height / 2)) <= 1,
            size: stage.width,
          };
        });
        const facts = JSON.stringify(geometry);
        expect(geometry.stageInFrame, `slide ${number}: the slab is inside the image frame ${facts}`).toBe(true);
        expect(geometry.haloInSlide, `slide ${number}: the glow is inside the slide ${facts}`).toBe(true);
        expect(geometry.stageClearOfCaption, `slide ${number}: the slab does not touch the caption ${facts}`).toBe(true);
        expect(geometry.centred, `slide ${number}: the slab is centred on the image ${facts}`).toBe(true);
        expect(geometry.size).toBeGreaterThan(70);
        expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false);
      }
    });
  }

  test("only transform and opacity animate, and everything runs", async ({ page }) => {
    await openSlide(page, "20");
    const animations = await markAnimations(page);
    expect(animations.length).toBeGreaterThanOrEqual(5);
    for (const animation of animations) {
      expect(animation.state, `${animation.name} runs`).toBe("running");
      for (const property of animation.properties) {
        expect(ALLOWED.has(property), `${animation.name} animates ${property}`).toBe(true);
      }
    }
    // The decorative parts never intercept a click.
    expect(await page.locator(".specs__slide.is-current .aeon-mark").evaluate((el) => getComputedStyle(el).pointerEvents)).toBe("none");
  });

  test("the pause button stops and resumes the turn, keeps its state across slides and shows only where something moves", async ({ page }) => {
    const { dialog } = await openSlide(page, "20");
    const button = dialog.locator("[data-carousel-motion]");
    await expect(button).toBeVisible();
    await expect(button).toHaveAccessibleName("Pause motion");
    await button.click();
    await expect(button).toHaveAccessibleName("Play motion");
    await expect(dialog).toHaveAttribute("data-motion", "paused");
    expect((await markAnimations(page)).every((animation) => animation.state === "paused")).toBe(true);
    // A slide with a real screen has nothing that moves, so no button.
    await page.keyboard.press("ArrowLeft");
    await expect(dialog.locator(".specs__slide.is-current")).toHaveAttribute("data-slide", "19");
    await expect(button).toBeHidden();
    // Back on a moving slide the choice still holds; the same button resumes.
    await page.keyboard.press("ArrowRight");
    await expect(dialog.locator(".specs__slide.is-current")).toHaveAttribute("data-slide", "20");
    await expect(button).toBeVisible();
    await expect(button).toHaveAccessibleName("Play motion");
    expect((await markAnimations(page)).every((animation) => animation.state === "paused")).toBe(true);
    await button.click();
    await expect(button).toHaveAccessibleName("Pause motion");
    await expect(dialog).not.toHaveAttribute("data-motion", "paused");
    await expect.poll(async () => (await markAnimations(page)).every((animation) => animation.state === "running")).toBe(true);
  });

  test("a slide with a live screen has no mark and no pause button", async ({ page }) => {
    const { dialog, slide } = await openSlide(page, "03");
    await expect(slide.locator("[data-aeon-mark]")).toHaveCount(0);
    await expect(dialog.locator("[data-carousel-motion]")).toBeHidden();
  });

  test("the pause button is a stop of the keyboard trap, before Close", async ({ page }) => {
    const { dialog } = await openSlide(page, "20");
    await expect(dialog.locator("[data-carousel-close]")).toBeFocused();
    await page.keyboard.press("Shift+Tab");
    await expect(dialog.locator("[data-carousel-motion]")).toBeFocused();
    await page.keyboard.press("Shift+Tab");
    await expect(dialog.locator("[data-carousel-next]")).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(dialog.locator("[data-carousel-motion]")).toBeFocused();
    // Leaving for a slide without a mark never strands the focus on the button.
    await page.keyboard.press("ArrowLeft");
    await expect(dialog.locator(".specs__slide.is-current")).toHaveAttribute("data-slide", "19");
    await expect(dialog.locator("[data-carousel-close]")).toBeFocused();
  });

  test("the paused closed carousel and other slides stand still", async ({ page }) => {
    await page.goto("/paimos/?lang=en", { waitUntil: "domcontentloaded" });
    const running = await page.evaluate(() =>
      document.getAnimations().filter((animation) => animation.effect?.target?.closest?.("[data-aeon-mark]") && animation.playState === "running").length,
    );
    expect(running, "nothing turns while the carousel is closed").toBe(0);
  });

  test("screenshots of the turn, for review", async ({ page }) => {
    test.skip(!process.env.INSPR_SHOTS, "review shots only on request");
    mkdirSync("test-results/shots", { recursive: true });
    for (const [number, size] of [
      ["20", { width: 1440, height: 900 }],
      ["10", { width: 1440, height: 900 }],
      ["06", { width: 1440, height: 900 }],
      ["12", { width: 1440, height: 900 }],
      ["17", { width: 1440, height: 900 }],
      ["20", { width: 390, height: 844 }],
    ]) {
      await openSlide(page, number, size);
      for (const [label, fraction] of [["a", 0], ["b", 0.22], ["c", 0.5], ["d", 0.75]]) {
        await page.evaluate((ms) => {
          for (const animation of document.getAnimations()) {
            if (animation.effect?.target?.closest?.(".specs__slide.is-current [data-aeon-mark]")) {
              animation.pause();
              animation.currentTime = ms;
            }
          }
        }, fraction * 16000);
        await page.waitForTimeout(250);
        await page.screenshot({ path: `test-results/shots/mark-${number}-${size.width}-${label}.png` });
      }
    }
  });
});

test.describe("with reduced motion", () => {
  test("the mark stands in its static pose and there is nothing to pause", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    const { dialog } = await openSlide(page, "20");
    const facts = await page.evaluate(() => ({
      query: matchMedia("(prefers-reduced-motion: reduce)").matches,
      haloAnimation: getComputedStyle(document.querySelector(".specs__slide.is-current .aeon-mark__halo")).animationName,
    }));
    expect(facts, JSON.stringify(facts)).toEqual({ query: true, haloAnimation: "none" });
    expect(await markAnimations(page)).toEqual([]);
    await expect(dialog.locator("[data-carousel-motion]")).toBeHidden();
    const pose = await page.locator(".specs__slide.is-current .aeon-mark__spin").evaluate((el) => getComputedStyle(el).transform);
    expect(pose).not.toBe("none");
    // The front is still the AEON mark.
    await expect(page.locator(".specs__slide.is-current .aeon-mark__front img")).toBeVisible();
  });
});
