import { expect, test as base } from "@playwright/test";

// INSPR-538: in headless Linux WebKit (WPE, which handles media through
// GStreamer) the AEON page's process crashed at random ("Target crashed" /
// "Page crashed") and failed unrelated geometry tests. In a Linux container the
// idle page crashed in 9 of 16 runs with its hero <video> and 1 of 16 without
// it; blocking only the .mp4 request, hiding GStreamer's plugins, or removing
// the element after parsing did not prevent it. The exact mechanism inside
// WebKit was not isolated, and Safari was not tested here; macOS WebKit runs
// passed. This is a mitigation, not a guarantee: a residual crash rate remains.
//
// Making the element inert (no autoplay, no <source>, preload="none") did not
// help either (11 of 16): the element alone starts WebKit's media stack.
//
// So for WebKit on Linux only, each HTML document is served without its
// <video> elements; the poster image and everything else stay as shipped.
// Chromium and Firefox keep loading and playing the video. A test that needs
// the real video, such as the hero Pause test (the AEON hero's paused state
// follows the video's play/pause events), opts out with
// test.use({ keepVideo: true }). macOS WebKit runs are unchanged.
const stripVideo = process.platform === "linux";

export const test = base.extend({
  keepVideo: [false, { option: true }],
  context: async ({ context, browserName, keepVideo }, use) => {
    if (browserName === "webkit" && stripVideo && !keepVideo) {
      await context.route("**/*", async (route) => {
        if (route.request().resourceType() !== "document") return route.fallback();
        const response = await route.fetch();
        const type = response.headers()["content-type"] ?? "";
        if (!type.includes("text/html")) return route.fulfill({ response });
        const body = (await response.text()).replace(/<video\b[\s\S]*?<\/video>/gi, "");
        return route.fulfill({ response, body });
      });
    }
    await use(context);
  },
});

export { expect };
