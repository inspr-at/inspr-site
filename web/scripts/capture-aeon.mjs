#!/usr/bin/env node
// INSPR-478: capture the PAIMOS AEON marketing set from a local dev instance.
//
// Run it only against `aeon serve` with AEON_ENV=dev, a scratch database and
// `aeon demo seed` data, built from the exact release tag being published.
// Never point it at a production instance or real client data. The output
// directory is then published through sync-paimos-captures.mjs, which proves
// the public tag and re-checks every asset.
//
//   node scripts/capture-aeon.mjs --base-url http://127.0.0.1:18478 \
//     --out /tmp/aeon-captures --email demo@example.com --tenant demo \
//     --project ACME --ticket ACME-12 --entry runbook/deploy --search invoice

import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { chromium } from "playwright";

function arg(flag, fallback) {
  const index = process.argv.indexOf(flag);
  const value = index >= 0 ? process.argv[index + 1] : fallback;
  if (value === undefined) throw new Error(`${flag} is required`);
  return value;
}

const baseUrl = arg("--base-url").replace(/\/$/, "");
const out = resolve(arg("--out"));
const email = arg("--email", "demo@example.com");
const tenant = arg("--tenant", "demo");
const project = arg("--project");
const ticket = arg("--ticket");
const entry = arg("--entry");
const search = arg("--search");

const host = new URL(baseUrl).hostname;
if (!["127.0.0.1", "localhost", "::1"].includes(host)) {
  throw new Error("captures are taken from a local dev instance only");
}

const viewport = { width: 1600, height: 1000 };
const deviceScaleFactor = 2;
const settle = 900;

// Each scene opens one screen. A surface scene also names the DOM landmark
// its hotspot must land on; the gate compares both.
const scenes = [
  {
    name: "surface-ticket.png",
    landmark: ["issueContext", "aside.ticket-ws"],
    open: (page) => page.goto(`${baseUrl}/p/${project}/${ticket}`),
    ready: "aside.ticket-ws h1, aside.ticket-ws h2",
  },
  {
    name: "surface-agents.png",
    landmark: ["executionControl", "section.queue"],
    open: (page) => page.goto(`${baseUrl}/agents`),
    ready: "section.queue",
  },
  {
    name: "surface-knowledge.png",
    landmark: ["applicableMemories", ".entry-page.dock"],
    open: (page) => page.goto(`${baseUrl}/p/${project}/knowledge?entry=${entry}`),
    ready: ".entry-page.dock",
  },
  {
    name: "ui-projects.png",
    open: (page) => page.goto(`${baseUrl}/`),
    ready: "main",
  },
  {
    name: "ui-work-tree.png",
    // The outline opens collapsed; the Display menu expands every epic.
    open: async (page) => {
      await page.goto(`${baseUrl}/p/${project}?view=outline`);
      await page.waitForLoadState("networkidle");
      await page.getByRole("button", { name: "Display" }).click();
      await page.getByRole("button", { name: "Expand all" }).click();
    },
    ready: "main",
  },
  {
    name: "ui-search.png",
    // Opened from the workspace home, the palette searches every project.
    open: async (page) => {
      await page.goto(`${baseUrl}/`);
      await page.waitForLoadState("networkidle");
      await page.keyboard.press("ControlOrMeta+k");
      await page.keyboard.type(search, { delay: 40 });
    },
    ready: "dialog[open]",
  },
  {
    name: "ui-knowledge-graph.png",
    open: (page) => page.goto(`${baseUrl}/p/${project}/knowledge?mode=graph`),
    ready: "main",
  },
  {
    name: "ui-releases.png",
    open: (page) => page.goto(`${baseUrl}/releases`),
    ready: "main",
  },
];

async function signedInContext(browser, colorScheme, extra = {}) {
  const context = await browser.newContext({ viewport, deviceScaleFactor, colorScheme, reducedMotion: "reduce", ...extra });
  const response = await context.request.post(`${baseUrl}/api/auth/dev-login`, { data: { email, tenant } });
  if (!response.ok()) throw new Error(`dev login failed with ${response.status()}`);
  return context;
}

async function show(page, scene) {
  await scene.open(page);
  await page.waitForLoadState("networkidle");
  await page.locator(scene.ready).first().waitFor({ state: "visible" });
  // A docked selection can scroll the page; every capture starts at the top.
  await page.evaluate(() => window.scrollTo(0, 0));
  // Park the pointer so no hover state leaks into the capture.
  await page.mouse.move(0, viewport.height - 1);
  await page.waitForTimeout(settle);
}

async function measure(page, selector) {
  const box = await page.locator(selector).first().boundingBox();
  if (!box) throw new Error(`landmark ${selector} is not visible`);
  const round = (value) => Number(value.toFixed(4));
  return {
    x: round(box.x / viewport.width),
    y: round(box.y / viewport.height),
    width: round(box.width / viewport.width),
    height: round(box.height / viewport.height),
  };
}

async function stills(browser, theme, dir) {
  const context = await signedInContext(browser, theme);
  const page = await context.newPage();
  const landmarks = {};
  for (const scene of scenes) {
    await show(page, scene);
    if (scene.landmark) {
      const [key, selector] = scene.landmark;
      landmarks[key] = { screen: scene.name, ...(await measure(page, selector)) };
    }
    await page.screenshot({ path: join(dir, scene.name) });
    console.log(`✓ ${theme} ${scene.name}`);
  }
  await context.close();
  return landmarks;
}

// Loops are recorded at 1280×800 and re-encoded to the site's video contract:
// H.264 Main, 24 fps, yuv420p, no audio, fast start.
async function loop(browser, name, steps) {
  const raw = mkdtempSync(join(tmpdir(), "aeon-loop-"));
  const context = await signedInContext(browser, "light", {
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 1,
    reducedMotion: "no-preference",
    recordVideo: { dir: raw, size: { width: 1280, height: 800 } },
  });
  const page = await context.newPage();
  await steps(page);
  await context.close();
  const [webm] = readdirSync(raw).filter((file) => file.endsWith(".webm"));
  const result = spawnSync("ffmpeg", [
    "-y", "-loglevel", "error", "-i", join(raw, webm),
    "-an", "-r", "24", "-c:v", "libx264", "-profile:v", "main", "-pix_fmt", "yuv420p",
    "-crf", "28", "-movflags", "+faststart", join(out, name),
  ]);
  rmSync(raw, { recursive: true, force: true });
  if (result.status !== 0) throw new Error(`ffmpeg failed for ${name}: ${result.stderr}`);
  console.log(`✓ loop ${name}`);
}

mkdirSync(join(out, "dark"), { recursive: true });
const browser = await chromium.launch();
try {
  const landmarks = await stills(browser, "light", out);
  await stills(browser, "dark", join(out, "dark"));

  await loop(browser, "loop-ticket-agents.mp4", async (page) => {
    await page.goto(`${baseUrl}/p/${project}`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1200);
    await page.goto(`${baseUrl}/p/${project}/${ticket}`);
    await page.locator("aside.ticket-ws").waitFor();
    await page.waitForTimeout(2600);
    await page.goto(`${baseUrl}/agents`);
    await page.locator("section.queue").waitFor();
    await page.waitForTimeout(2600);
  });
  await loop(browser, "loop-search-navigate.mp4", async (page) => {
    await page.goto(`${baseUrl}/`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);
    await page.keyboard.press("ControlOrMeta+k");
    await page.keyboard.type(search, { delay: 120 });
    await page.waitForTimeout(1400);
    await page.keyboard.press("Enter");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2600);
  });

  writeFileSync(
    join(out, "capture-surface.json"),
    `${JSON.stringify({ schemaVersion: 2, theme: "light", viewport: { ...viewport, deviceScaleFactor }, landmarks }, null, 2)}\n`,
  );
  console.log(`✓ capture set written to ${out}`);
} finally {
  await browser.close();
}
