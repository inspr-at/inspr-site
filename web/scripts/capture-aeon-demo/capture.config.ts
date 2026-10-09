// SPDX-License-Identifier: AGPL-3.0-only
// Required local file: INSPR_CAPTURE_DENYLIST or ~/.inspr/capture-denylist.json.
// Format: names, hostPatterns, domains, companies arrays of strings or objects.
// Literal objects use {value, replacement?}; hostPatterns use {pattern, replacement?}.
// It stays on the operator machine outside every repo and must never be committed.
// Fixtures only: never production data, a fleet host, browser chrome or an instance URL.
// Run natively outside the Codex sandbox (NIX-445); obtain Opus visual QA before publishing.
// This AGPL-3.0-only spec imports AGPL test fixtures from the PAIMOS checkout at run time.
import { defineConfig } from '@playwright/test'
import { join } from 'node:path'
const output = process.env.AEON_CAPTURE_OUTPUT
const chrome = process.env.AEON_CAPTURE_CHROME
if (!output || !chrome) throw new Error('Use the capture-aeon-demo/run.mjs runner')
export default defineConfig({
 testDir: '.', testMatch: 'capture.spec.ts', workers: 1, retries: 0, timeout: 90000,
 outputDir: join(output, 'test-results'), reporter: [['list']],
 use: { baseURL: 'http://localhost:5891', viewport: {width:1600,height:1000}, deviceScaleFactor:2, timezoneId:'Europe/Vienna', colorScheme:'light', reducedMotion:'reduce', launchOptions:{ executablePath:chrome, args:['--disable-background-networking'] } },
})
