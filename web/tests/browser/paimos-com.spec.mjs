import { readFile } from "node:fs/promises";
import { expect, test } from "./fixtures.mjs";

// INSPR-572: Watch now must hand the player a real film. Both the live manifest
// and the films on media.inspr.at are served from here: the manifest is the
// committed snapshot, and the repository's own hero loop stands in for every
// film. The test needs no network and proves the player's wiring: the source
// it picks for the screen, that the film loads, and that it plays.
const snapshot = await readFile(new URL("../../src/content/films/manifest.json", import.meta.url), "utf8");
const loop = await readFile(new URL("../../src/assets/products/paimos/hero-loop.mp4", import.meta.url));
const first = JSON.parse(snapshot).episodes.find((film) => film.id === "W05") ?? JSON.parse(snapshot).episodes[0];

test.describe("paimos.com player", { tag: "@video" }, () => {
  test.use({ keepVideo: true });

  for (const screen of [
    { name: "desktop", viewport: { width: 1440, height: 900 }, cut: "16x9" },
    { name: "phone", viewport: { width: 390, height: 844 }, cut: "9x16" },
  ]) {
    test(`Watch now plays the first film in the ${screen.cut} cut (${screen.name})`, async ({ page, browserName }) => {
      // route.fulfill answers without byte ranges, which WebKit's player requires.
      test.skip(browserName === "webkit", "WebKit needs byte-range responses");
      await page.route("https://media.inspr.at/films/manifest.json", (route) =>
        route.fulfill({ status: 200, contentType: "application/json", headers: { "access-control-allow-origin": "*" }, body: snapshot }));
      await page.route(/^https:\/\/media\.inspr\.at\/films\/.+\.mp4$/, (route) =>
        route.fulfill({ status: 200, contentType: "video/mp4", body: loop }));
      await page.setViewportSize(screen.viewport);
      await page.goto("/paimos-com/", { waitUntil: "domcontentloaded" });

      const chapters = page.locator("[data-cinema-chapter]");
      await expect(chapters).toHaveCount(JSON.parse(snapshot).episodes.length);
      await page.locator("[data-cinema-watch]").click();

      const film = page.locator(".cinema__video[data-shown]");
      await expect(film).toHaveCount(1, { timeout: 15_000 });
      const state = await film.evaluate((video) => ({
        src: video.currentSrc,
        readyState: video.readyState,
        paused: video.paused,
        error: video.error?.code ?? null,
      }));
      expect(state.error).toBeNull();
      expect(state.src).toContain(`/films/${first.id.toLowerCase()}/v${first.version}/${screen.cut}`);
      expect(state.readyState).toBeGreaterThanOrEqual(2);
      expect(state.paused).toBe(false);
      await expect(page.locator("[data-cinema]")).toHaveAttribute("data-state", "open");

      await page.keyboard.press("Escape");
      await expect(page.locator("[data-cinema]")).toHaveAttribute("data-state", "idle");
    });
  }
});
