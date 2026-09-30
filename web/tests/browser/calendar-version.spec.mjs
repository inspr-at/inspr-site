import { expect, test } from "@playwright/test";

// INSPR-493: every release footer shows the reserved calendar version through
// the shared renderer. A direct local build has no version and says so; a
// deployment build (deploy.sh supplies the reservation) renders Pretty, reveals
// on hover or keyboard focus, and copies the exact canonical version.
const footers = [
  { path: "/", container: ".site-footer__release" },
  { path: "/aithema/", container: ".site-footer__release" },
  { path: "/paimos/", container: ".site-footer__release" },
  { path: "/pharos/de/", container: ".site-footer__release" },
  { path: "/janus/", container: ".site-footer__release" },
  { path: "/overview/", container: ".overview-footer" },
  { path: "/de/ueberblick/", container: ".overview-footer" },
];

async function releaseVersion(request) {
  const manifest = await (await request.get("/release.json")).json();
  expect(manifest.schemaVersion).toBe(2);
  return manifest.version;
}

for (const { path, container } of footers) {
  test(`${path} footer shows the release version truthfully`, async ({ page, request }) => {
    const version = await releaseVersion(request);
    await page.goto(path, { waitUntil: "load" });
    const release = page.locator(container);
    const coordinate = release.locator("[data-calendar-version]");

    if (!version) {
      await expect(coordinate).toHaveCount(0);
      if (container === ".site-footer__release") await expect(release).toContainText(/Local build|Lokaler Build/);
      return;
    }

    expect(version.scheme).toBe("inspr-calver-3");
    await expect(coordinate).toHaveAttribute("data-calendar-version", version.value);
    await expect(coordinate).toHaveAttribute("data-version-scheme", "inspr-calver-3");
    // Pretty: six segments, never the .0.0 tail, while the accessible name and
    // tooltip carry the exact canonical version and its UTC date and time.
    await expect(coordinate).toHaveAttribute("role", "button");
    await expect(coordinate).toHaveAttribute("title", new RegExp(`^${version.value.replace(/\./g, "\\.")} · 20\\d\\d-\\d\\d-\\d\\d \\d\\d:\\d\\d:\\d\\d UTC$`));
    await expect(coordinate).toHaveAttribute("aria-label", new RegExp(`^${version.value.replace(/\./g, "\\.")} · `));
    await expect(coordinate).not.toContainText(".0.0");
    await expect(coordinate.locator(".yy")).toHaveText(version.value.slice(0, 2));
    await expect(release).not.toContainText(/INSPR-VER[12]/);
  });
}

test("the footer version reveals on hover and focus and copies the canonical value", async ({ page, request, context, browserName }) => {
  const version = await releaseVersion(request);
  test.skip(!version, "a direct local build carries no calendar version");
  await page.goto("/", { waitUntil: "load" });
  const coordinate = page.locator(".site-footer__release [data-calendar-version]");
  await coordinate.scrollIntoViewIfNeeded();
  await expect(coordinate).toHaveAttribute("data-version-view", "pretty");

  await coordinate.hover();
  await expect(coordinate).toHaveAttribute("data-version-view", "revealed");
  await page.mouse.move(0, 0);
  await expect(coordinate).toHaveAttribute("data-version-view", "pretty");

  await coordinate.focus();
  await page.keyboard.press("Shift");
  await expect(coordinate).toHaveAttribute("data-version-view", "revealed");

  test.skip(browserName !== "chromium", "clipboard read-back is granted in Chromium only");
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.keyboard.press("Enter");
  await expect(coordinate).toHaveAttribute("data-copy-state", "copied");
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(version.value);
});

test("the version renderer ships as an external module", async ({ page, request }) => {
  const version = await releaseVersion(request);
  test.skip(!version, "a direct local build carries no calendar version");
  await page.goto("/", { waitUntil: "load" });
  const inline = await page.locator(".site-footer__release script:not([src])").count();
  expect(inline).toBe(0);
  await expect(page.locator('.site-footer__release script[type="module"][src^="/_astro/"]')).toHaveCount(1);
});
