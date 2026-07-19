import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  chmod,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import {
  createReleaseMetadata,
  releaseManifest,
} from "../release-metadata.mjs";

const sourceUrl = new URL("../src/", import.meta.url);

const products = [
  {
    slug: "paimos",
    exportName: "paimosContent",
    canonical: "https://paimos.inspr.at",
    licensePattern: /name:\s*"AGPL-3\.0-only"/,
  },
  {
    slug: "pharos",
    exportName: "pharosContent",
    canonical: "https://pharos.inspr.at",
    licensePattern: /name:\s*"AGPL-3\.0-only"/,
  },
  {
    slug: "janus",
    exportName: "janusContent",
    canonical: "https://janus.inspr.at",
    licensePattern: /name:\s*"AGPL-3\.0-only"/,
  },
];

async function source(relativePath) {
  return readFile(new URL(relativePath, sourceUrl), "utf8");
}

function relativeLuminance(hex) {
  const channels = hex.match(/[0-9a-f]{2}/gi).map((channel) => {
    const normalized = Number.parseInt(channel, 16) / 255;
    return normalized <= 0.04045
      ? normalized / 12.92
      : ((normalized + 0.055) / 1.055) ** 2.4;
  });

  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function contrastRatio(foreground, background) {
  const luminances = [relativeLuminance(foreground), relativeLuminance(background)]
    .sort((left, right) => right - left);
  return (luminances[0] + 0.05) / (luminances[1] + 0.05);
}

test("each product route renders its canonical content through ProductPage", async () => {
  const urls = await source("content/urls.ts");

  for (const { slug, exportName, canonical } of products) {
    const route = await source(`pages/${slug}/index.astro`);

    assert.match(
      route,
      /import ProductPage from "\.\.\/\.\.\/components\/ProductPage\.astro";/,
      `${slug} must use the shared product page`,
    );
    assert.match(
      route,
      new RegExp(`import \\{ ${exportName} \\} from "\\.\\.\\/\\.\\.\\/content\\/${slug}";`),
      `${slug} must import its own content`,
    );
    assert.match(
      route,
      new RegExp(`<ProductPage content=\\{${exportName}\\} \\/>`),
      `${slug} must pass its content to ProductPage`,
    );
    assert.ok(
      urls.includes(`${slug}: "${canonical}"`),
      `${slug} canonical URL must remain centralized in content/urls.ts`,
    );
  }
});

test("product copy contains no em dashes and no hardcoded business host", async () => {
  for (const { slug } of products) {
    const content = await source(`content/${slug}.ts`);

    assert.ok(!content.includes("\u2014"), `${slug} content contains an em dash`);
    assert.doesNotMatch(
      content,
      /https:\/\/(?:amt\.inspr\.at|augmentoring\.com)/,
      `${slug} must use the centralized business URL instead of a hardcoded host`,
    );
    assert.match(
      content,
      /import \{ siteUrls \} from "\.\/urls";/,
      `${slug} must consume centralized site URLs`,
    );
    assert.match(
      content,
      /primaryHref:\s*"#model"/,
      `${slug} hero CTA must target the rendered operating-model section`,
    );
  }
});

test("all product license claims match repository metadata", async () => {
  for (const { slug, licensePattern } of products) {
    const content = await source(`content/${slug}.ts`);
    assert.match(content, licensePattern, `${slug} has an unexpected license claim`);
  }

  for (const { slug } of products) {
    const content = await source(`content/${slug}.ts`);
    assert.match(content, /name:\s*"AGPL-3\.0-only"/);
    assert.doesNotMatch(content, /name:\s*"MIT"/);
  }
});

test("each canonical host publishes its own robots and sitemap pair", async () => {
  const rootRobots = await readFile(new URL("../public/robots.txt", import.meta.url), "utf8");
  const rootSitemap = await readFile(new URL("../public/sitemap.xml", import.meta.url), "utf8");

  assert.match(rootRobots, /https:\/\/www\.inspr\.at\/sitemap\.xml/);
  assert.match(rootSitemap, /<loc>https:\/\/www\.inspr\.at\/<\/loc>/);

  for (const { slug, canonical } of products) {
    const robots = await readFile(new URL(`../public/${slug}/robots.txt`, import.meta.url), "utf8");
    const sitemap = await readFile(new URL(`../public/${slug}/sitemap.xml`, import.meta.url), "utf8");

    assert.match(robots, new RegExp(`${canonical.replaceAll(".", "\\.")}\\/sitemap\\.xml`));
    assert.ok(sitemap.includes(`<loc>${canonical}/</loc>`));
  }
});

test("all four microsites render claim visuals and accessible workflow controls", async () => {
  const productPage = await source("components/ProductPage.astro");
  const workflow = await source("components/WorkflowExplorer.astro");
  const umbrella = await source("pages/index.astro");

  assert.match(productPage, /<WorkflowExplorer/);
  assert.match(productPage, /content\.slug === "paimos" && <PaimosProductSurface/);
  assert.match(productPage, /data-integration-filter/);
  assert.match(workflow, /role="tablist"/);
  assert.match(workflow, /aria-selected/);
  assert.match(workflow, /prefers-reduced-motion: reduce/);
  assert.match(workflow, /IntersectionObserver/);
  assert.match(umbrella, /title="Continuity is the advantage\."/);

  const assets = [
    "assets/products/inspr/continuity.png",
    "assets/products/paimos/context-ledger.png",
    "assets/products/pharos/fleet-gate.png",
    "assets/products/janus/value-boundary.png",
    "assets/products/paimos/product-surface.png",
  ];
  for (const asset of assets) {
    const metadata = await stat(new URL(asset, sourceUrl));
    assert.ok(metadata.size > 10_000, `${asset} must be a real image asset`);
  }
});

test("inspectable rails keep compact desktop labels above minimum contrast", async () => {
  const styles = await source("styles/microsites.css");
  const compactColor = styles.match(/--inspectable-muted: (#[0-9a-f]{6});/i)?.[1];

  assert.equal(compactColor, "#586b79");
  assert.ok(contrastRatio(compactColor, "#fffdf9") >= 4.5);
  assert.ok(contrastRatio(compactColor, "#f8f5ef") >= 4.5);
  assert.match(
    styles,
    /\.inspectable-rail__index \{[\s\S]*?color: var\(--inspectable-muted\);/,
  );
  assert.match(
    styles,
    /\.inspectable-rail__selector-copy small \{[\s\S]*?color: var\(--inspectable-muted\);/,
  );
  assert.match(
    styles,
    /\.inspectable-rail__map-node \{[\s\S]*?color: var\(--inspectable-muted\);/,
  );
  assert.match(
    styles,
    /\.section--ink \.inspectable-rail \{\s*--inspectable-muted: var\(--night-soft\);/,
  );
});

test("Paimos screenshot tabs use neutral tabpanel hosts", async () => {
  const surface = await source("components/PaimosProductSurface.astro");

  assert.match(surface, /<div\s+id=\{`surface-panel-\$\{index\}`\}\s+role="tabpanel"/);
  assert.doesNotMatch(surface, /<article\s+id=\{`surface-panel-/);
  assert.match(surface, /\.product-surface__details \[data-surface-panel\] \{/);
  assert.match(surface, /\.product-surface__details \[data-surface-panel\]\[hidden\] \{/);
  assert.doesNotMatch(surface, /\.product-surface__details article/);
});

test("Pharos states release and provider maturity without overclaiming", async () => {
  const pharos = await source("content/pharos.ts");

  assert.match(pharos, /releases\/tag\/v0\.1\.41/);
  assert.match(pharos, /latest tagged release is v0\.1\.41, while current main declares v0\.1\.43/);
  assert.match(pharos, /status: "Read-only live"/);
  assert.match(pharos, /read-only provider checks are live/);
  assert.match(pharos, /Managed execution is disabled pending attended production acceptance/);
  assert.doesNotMatch(pharos, /connector is implemented and deployed/);
});

test("workflow stages expose icons, evidence signals and source references", async () => {
  for (const { slug } of products) {
    const content = await source(`content/${slug}.ts`);
    const model = content.slice(content.indexOf("model:"), content.indexOf("featureSections:"));

    assert.match(model, /icon:/, `${slug} workflow needs contextual SVG icons`);
    assert.match(model, /signal:/, `${slug} workflow needs a concrete result signal`);
    assert.match(model, /reference:/, `${slug} workflow needs inspectable evidence`);
    assert.match(content, /github\.com\/markus-barta\//, `${slug} evidence must link to source`);
  }
});

test("the positive INSPR product constellation remains present", async () => {
  const umbrella = await source("pages/index.astro");
  const constellation = await source("components/ProductConstellation.astro");

  assert.match(umbrella, /Three focused tools\. One coherent way of working\./);
  assert.match(umbrella, /<ProductConstellation products=\{products\} \/>/);
  assert.match(constellation, /class="product-constellation"/);
  assert.match(constellation, /shared context/);
  assert.match(constellation, /Explore \{product\.name\}/);
});

test("interactive explorers use one five-second, pause-only lifecycle", async () => {
  const workflow = await source("components/WorkflowExplorer.astro");
  const surface = await source("components/PaimosProductSurface.astro");

  for (const [name, component] of [["workflow", workflow], ["surface", surface]]) {
    assert.match(component, /STAGE_DURATION = 5000/, `${name} must advance every five seconds`);
    assert.match(component, /\.animate\(/, `${name} must animate elapsed stage time`);
    assert.match(component, /easing: "linear"/, `${name} progress must remain linear`);
    assert.match(component, /pointerenter/, `${name} stages must respond to hover`);
    assert.match(component, /IntersectionObserver/, `${name} must stop work offscreen`);
    assert.match(component, /focusin/, `${name} must hold while keyboard focus is inside`);
    assert.match(component, /focusout/, `${name} must resume after focus leaves`);
    assert.match(
      component,
      /querySelector\(":focus-visible"\)/,
      `${name} must not treat residual pointer focus as an interaction hold`,
    );
    assert.match(component, /AbortController/, `${name} must clean up its interaction listeners`);
    assert.match(component, /animation\.cancel\(\)/, `${name} must release finished animations`);
    assert.match(component, />Pause</, `${name} exposes a pause label before interaction`);
    assert.doesNotMatch(component, /Play sequence/, `${name} must not expose a play control`);
    assert.match(
      component,
      /Resume automatic progression/,
      `${name} must expose the resume action while manually paused`,
    );
  }

  assert.match(workflow, /data-workflow-annotation/);
  assert.match(workflow, /experience\.addEventListener\(\s*"pointerenter"/);
  assert.match(workflow, /observer\.observe\(observedControl\)/);
  assert.match(surface, /interactionArea\.addEventListener\(\s*"pointerenter"/);
  assert.match(surface, /observer\.observe\(observedDetails\)/);
  assert.match(surface, /data-surface-progress/);
  assert.doesNotMatch(
    surface,
    /interactionArea\.contains\(document\.activeElement\)/,
    "surface autoplay must not be locked by residual pointer focus",
  );
  assert.match(surface, /\.product-surface__toggle \{\s*min-height: 2\.75rem;/);
  assert.match(workflow, /\.workflow__toggle \{\s*min-height: 2\.75rem;/);
});

test("workflow stages map their explanation back onto each image", async () => {
  const umbrella = await source("pages/index.astro");
  const janus = await source("content/janus.ts");
  assert.match(umbrella, /visual: \{ x: 18, y: 61 \}/);
  assert.match(janus, /visual: \{ x: 15, y: 50 \}/);
  assert.match(janus, /visual: \{ x: 55, y: 50 \}/);
  assert.match(janus, /visual: \{ x: 80, y: 47 \}/);

  for (const { slug } of products) {
    const content = await source(`content/${slug}.ts`);
    const model = content.slice(content.indexOf("model:"), content.indexOf("featureSections:"));
    assert.match(model, /visual: \{ x: \d+, y: \d+ \}/, `${slug} needs image-linked stages`);
  }
});

test("the identity utility uses the unmodified official ZITADEL mark", async () => {
  const umbrella = await source("pages/index.astro");
  const footer = await source("components/MicrositeFooter.astro");
  const logo = await readFile(
    new URL("assets/brands/zitadel-logo-solo-dark-icon.svg", sourceUrl),
  );
  const digest = createHash("sha256").update(logo).digest("hex");

  assert.equal(digest, "6767d70158d40a666378108c1fc22cfd10f2295615c68c35c104605973e6a07c");
  assert.match(umbrella, /zitadel-logo-solo-dark-icon\.svg/);
  assert.match(umbrella, /alt="ZITADEL logo"/);
  assert.match(umbrella, /Self-hosted/);
  assert.match(umbrella, /powered by ZITADEL/);
  assert.match(footer, /ZITADEL identity/);
});

test("Janus headlines use editorial Fraunces without changing body or mono faces", async () => {
  const layout = await source("layouts/MicrositeLayout.astro");
  const styles = await source("styles/microsites.css");
  const manifest = await readFile(new URL("../package.json", import.meta.url), "utf8");

  assert.match(layout, /@fontsource-variable\/fraunces\/full\.css/);
  assert.match(
    styles,
    /html\[data-product="janus"\] \{[\s\S]*?--font-display: "Fraunces Variable", Georgia, "Times New Roman", serif;/,
  );
  assert.match(styles, /--font-body: "Inria Sans"/);
  assert.match(styles, /--font-mono: "JetBrains Mono Variable"/);
  assert.match(manifest, /"@fontsource-variable\/fraunces"/);
  assert.doesNotMatch(layout, /@fontsource-variable\/ibm-plex-sans/);
  assert.doesNotMatch(manifest, /"@fontsource-variable\/ibm-plex-sans"/);
  assert.doesNotMatch(layout, /@fontsource-variable\/sora/);
  assert.doesNotMatch(manifest, /"@fontsource-variable\/sora"/);
  assert.doesNotMatch(styles, /Unbounded Variable/);
});

test("one validated release identity is visible across the site family", async () => {
  const revision = "0123456789abcdef0123456789abcdef01234567";
  const deployedAt = "2026-07-18T15:30:00Z";
  const releaseId = "20260718T153000Z-0123456789ab";
  const metadata = createReleaseMetadata(
    {
      INSPR_GIT_SHA: revision,
      INSPR_GIT_DIRTY: "0",
      INSPR_RELEASE_ID: releaseId,
      INSPR_DEPLOYED_AT: deployedAt,
    },
    { revision: "ffffffffffffffffffffffffffffffffffffffff", dirty: true },
  );

  assert.equal(metadata.gitRevision, revision.slice(0, 12));
  assert.equal(metadata.gitLabel, revision.slice(0, 12));
  assert.equal(metadata.releaseId, releaseId);
  assert.equal(metadata.deployedAt, deployedAt);
  assert.equal(metadata.isDeployment, true);
  assert.deepEqual(releaseManifest(metadata).deployment, {
    releaseId,
    deployedAt,
  });

  const local = createReleaseMetadata(
    {},
    { revision: "fedcba9876543210fedcba9876543210fedcba98", dirty: true },
  );
  assert.equal(local.releaseId, "local");
  assert.equal(local.deployedAt, null);
  assert.equal(local.gitLabel, "fedcba987654-dirty");
  assert.equal(local.isDeployment, false);

  assert.throws(
    () => createReleaseMetadata(
      { INSPR_RELEASE_ID: releaseId },
      { revision, dirty: false },
    ),
    /must be supplied together/,
  );
  assert.throws(
    () => createReleaseMetadata(
      { INSPR_GIT_DIRTY: "1" },
      { revision, dirty: false },
    ),
    /must be supplied together/,
  );

  const footer = await source("components/MicrositeFooter.astro");
  assert.match(footer, /import \{ releaseMetadata \}/);
  assert.match(footer, /aria-label="Site release"/);
  assert.match(footer, /data-release-id=\{releaseMetadata\.releaseId\}/);
  assert.match(footer, /<dt>Site<\/dt>/);
  assert.match(footer, /<dt>Git<\/dt>/);
  assert.match(footer, /<dt>Release<\/dt>/);
  assert.match(footer, /<dt>Deployed<\/dt>/);

  const manifestWriter = await readFile(
    new URL("../scripts/write-release-manifest.mjs", import.meta.url),
    "utf8",
  );
  const deploy = await readFile(new URL("../../deploy.sh", import.meta.url), "utf8");
  assert.match(manifestWriter, /dist\/release\.json/);
  assert.match(deploy, /INSPR_GIT_SHA="\$GIT_SHA"/);
  assert.match(deploy, /INSPR_RELEASE_ID="\$RELEASE_ID"/);
  assert.match(deploy, /INSPR_DEPLOYED_AT="\$DEPLOYED_AT"/);
  assert.match(deploy, /read_release_manifest/);
  assert.match(deploy, /RELEASE_ID="\$MANIFEST_RELEASE_ID"/);
  assert.match(deploy, /RELEASE_TARGET="builds\/\$RELEASE_ID"/);
  assert.match(deploy, /refusing to deploy a dirty working tree/);
  assert.match(deploy, /source changed during the build; refusing remote writes/);
  assert.match(deploy, /data-release-id=/);
});

test("direct SSH deployment overrides preserve one pinned host identity", async () => {
  const deployUrl = new URL("../../deploy.sh", import.meta.url);
  const deployPath = fileURLToPath(deployUrl);
  const deploy = await readFile(deployUrl, "utf8");

  assert.match(deploy, /INSPR_AT_SSH_HOSTNAME/);
  assert.match(deploy, /INSPR_AT_SSH_HOST_KEY_ALIAS/);
  assert.match(deploy, /StrictHostKeyChecking=yes/);
  assert.match(deploy, /SSH_ARGS\+=\([\s\S]*Hostname=\$SSH_HOSTNAME[\s\S]*HostKeyAlias=\$SSH_HOST_KEY_ALIAS/);
  assert.match(deploy, /SCP_ARGS\+=\([\s\S]*Hostname=\$SSH_HOSTNAME[\s\S]*HostKeyAlias=\$SSH_HOST_KEY_ALIAS/);
  assert.match(deploy, /RSYNC_SSH\+="[^"]*Hostname=\$SSH_HOSTNAME[^"]*HostKeyAlias=\$SSH_HOST_KEY_ALIAS"/);

  const baseEnvironment = {
    PATH: process.env.PATH ?? "/usr/bin:/bin",
  };
  const rejected = [
    {
      environment: { INSPR_AT_SSH_HOSTNAME: "100.64.0.4" },
      message: /must be set together/,
    },
    {
      environment: {
        INSPR_AT_SSH_HOSTNAME: "100.64.0.4;touch-bad",
        INSPR_AT_SSH_HOST_KEY_ALIAS: "csb1.ts.barta.cm",
      },
      message: /must be a DNS name or IPv4 address/,
    },
    {
      environment: {
        INSPR_AT_SSH_HOSTNAME: "100.64.0.4",
        INSPR_AT_SSH_HOST_KEY_ALIAS: "-oUnsafeOption",
      },
      message: /contains unsafe characters/,
    },
    {
      environment: {
        INSPR_AT_SSH_HOSTNAME: "100.64.0.4",
        INSPR_AT_SSH_HOST_KEY_ALIAS: "[csb1.ts.barta.cm]:0",
      },
      message: /port must be between 1 and 65535/,
    },
    {
      environment: {
        INSPR_AT_SSH_HOSTNAME: "100.64.0.4",
        INSPR_AT_SSH_HOST_KEY_ALIAS: "[csb1.ts.barta.cm]:2222",
      },
      message: /SSH_PORT is required for a bracketed/,
    },
    {
      environment: {
        INSPR_AT_SSH_HOSTNAME: "100.64.0.4",
        INSPR_AT_SSH_HOST_KEY_ALIAS: "[csb1.ts.barta.cm]:2222",
        INSPR_AT_SSH_PORT: "2223",
      },
      message: /SSH_PORT must match the bracketed/,
    },
  ];

  for (const fixture of rejected) {
    const result = spawnSync("/bin/bash", [deployPath], {
      cwd: fileURLToPath(new URL("../..", import.meta.url)),
      encoding: "utf8",
      env: { ...baseEnvironment, ...fixture.environment },
    });
    assert.equal(result.status, 1);
    assert.match(result.stderr, fixture.message);
    assert.doesNotMatch(result.stdout, /building Astro|uploading immutable release/);
  }

  const fixtureRoot = await mkdtemp(join(tmpdir(), "inspr-deploy-transport-"));
  try {
    const fakeBin = join(fixtureRoot, "fake-bin");
    const transportLog = join(fixtureRoot, "transport.log");
    const gitRevision = "0123456789abcdef0123456789abcdef01234567";
    const releaseId = "20260719T000000Z-0123456789ab";
    const fixtureDirectories = [
      fakeBin,
      join(fixtureRoot, "site"),
      join(fixtureRoot, "web", "dist", "_astro"),
      join(fixtureRoot, "web", "dist", "paimos"),
      join(fixtureRoot, "web", "dist", "pharos"),
      join(fixtureRoot, "web", "dist", "janus"),
    ];
    await Promise.all(
      fixtureDirectories.map((directory) => mkdir(directory, { recursive: true })),
    );

    await Promise.all([
      writeFile(join(fixtureRoot, "deploy.sh"), deploy),
      writeFile(join(fixtureRoot, "Caddyfile"), "fixture caddy configuration\n"),
      writeFile(join(fixtureRoot, "docker-compose.yml"), "services: {}\n"),
      writeFile(join(fixtureRoot, "site", "index.html"), "fixture archive\n"),
      writeFile(join(fixtureRoot, "web", "dist", "index.html"), "fixture umbrella\n"),
      writeFile(join(fixtureRoot, "web", "dist", "paimos", "index.html"), "fixture paimos\n"),
      writeFile(join(fixtureRoot, "web", "dist", "pharos", "index.html"), "fixture pharos\n"),
      writeFile(join(fixtureRoot, "web", "dist", "janus", "index.html"), "fixture janus\n"),
      writeFile(join(fixtureRoot, "web", "dist", "_astro", "fixture.css"), "body{}\n"),
      writeFile(
        join(fixtureRoot, "web", "dist", "release.json"),
        `${JSON.stringify({
          schemaVersion: 1,
          package: { version: "1.0.0" },
          source: { git: gitRevision.slice(0, 12), dirty: false },
          deployment: {
            releaseId,
            deployedAt: "2026-07-19T00:00:00Z",
          },
        })}\n`,
      ),
    ]);

    const loggingTransport = (name) => `#!/bin/sh
printf '%s' '${name}' >> "$TRANSPORT_LOG"
for argument in "$@"; do
  printf '\\t%s' "$argument" >> "$TRANSPORT_LOG"
done
printf '\\n' >> "$TRANSPORT_LOG"
cat >/dev/null
`;
    for (const transport of ["ssh", "scp", "rsync"]) {
      const executable = join(fakeBin, transport);
      await writeFile(executable, loggingTransport(transport));
      await chmod(executable, 0o755);
    }

    const fakeGit = join(fakeBin, "git");
    await writeFile(
      fakeGit,
      `#!/bin/sh
case "$*" in
  *rev-parse*) printf '%s\\n' '${gitRevision}' ;;
  *status*) exit 0 ;;
  *) exit 92 ;;
esac
`,
    );
    await chmod(fakeGit, 0o755);

    const fakePython = join(fakeBin, "python3");
    await writeFile(fakePython, "#!/bin/sh\nexit 0\n");
    await chmod(fakePython, 0o755);

    const bracketedAlias = spawnSync("/bin/bash", [join(fixtureRoot, "deploy.sh")], {
      cwd: fixtureRoot,
      encoding: "utf8",
      env: {
        ...baseEnvironment,
        PATH: `${fakeBin}:${baseEnvironment.PATH}`,
        TRANSPORT_LOG: transportLog,
        INSPR_AT_SSH_HOSTNAME: "100.64.0.4",
        INSPR_AT_SSH_HOST_KEY_ALIAS: "[csb1.ts.barta.cm]:2222",
        INSPR_AT_SSH_PORT: "2222",
        SKIP_BUILD: "1",
        SKIP_PROBE: "1",
      },
    });
    assert.equal(
      bracketedAlias.status,
      0,
      `isolated deploy failed:\n${bracketedAlias.stderr}\n${bracketedAlias.stdout}`,
    );

    const records = (await readFile(transportLog, "utf8"))
      .trim()
      .split("\n")
      .map((line) => line.split("\t"));
    const recordsFor = (name) => records
      .filter(([transport]) => transport === name)
      .map(([, ...arguments_]) => arguments_);
    const sshRecords = recordsFor("ssh");
    const scpRecords = recordsFor("scp");
    const rsyncRecords = recordsFor("rsync");
    assert.ok(sshRecords.length > 0, "fixture must exercise SSH");
    assert.ok(scpRecords.length > 0, "fixture must exercise SCP");
    assert.ok(rsyncRecords.length > 0, "fixture must exercise rsync");

    const assertOption = (arguments_, option) => {
      assert.ok(
        arguments_.some((argument, index) => (
          argument === "-o" && arguments_[index + 1] === option
        )),
        `missing SSH option ${option} in ${JSON.stringify(arguments_)}`,
      );
    };
    for (const arguments_ of [...sshRecords, ...scpRecords]) {
      assertOption(arguments_, "StrictHostKeyChecking=yes");
      assertOption(arguments_, "Hostname=100.64.0.4");
      assertOption(arguments_, "HostKeyAlias=[csb1.ts.barta.cm]:2222");
    }
    for (const arguments_ of sshRecords) {
      assert.ok(arguments_.some((argument, index) => (
        argument === "-p" && arguments_[index + 1] === "2222"
      )));
      assert.ok(arguments_.includes("csb1"));
    }
    for (const arguments_ of scpRecords) {
      assert.ok(arguments_.some((argument, index) => (
        argument === "-P" && arguments_[index + 1] === "2222"
      )));
      assert.ok(arguments_.some((argument) => argument.startsWith("csb1:")));
    }

    const expectedRsyncShell = [
      "ssh",
      "-o BatchMode=yes",
      "-o ConnectTimeout=10",
      "-o StrictHostKeyChecking=yes",
      "-o Hostname=100.64.0.4",
      "-o HostKeyAlias=[csb1.ts.barta.cm]:2222",
      "-p 2222",
    ].join(" ");
    for (const arguments_ of rsyncRecords) {
      const shellIndex = arguments_.indexOf("-e");
      assert.notEqual(shellIndex, -1);
      assert.equal(arguments_[shellIndex + 1], expectedRsyncShell);
      assert.ok(arguments_.some((argument) => argument.startsWith("csb1:")));
    }
  } finally {
    await rm(fixtureRoot, { recursive: true, force: true });
  }
});
