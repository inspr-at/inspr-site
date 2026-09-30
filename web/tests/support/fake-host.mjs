// A local stand-in for the production host, for deploy.sh tests (INSPR-493).
//
// The fake ssh runs each remote command with bash against a temporary host
// directory, rsync and scp copy for real, and docker answers the container
// checks. deploy.sh therefore exercises its real remote steps: the lock, the
// release-set listing, sealing, the ledger, symlink promotion and rollback.
//
// Fault injection (environment of one run):
//   FAKE_SSH_FAIL=<glob>        a remote command matching it fails (exit 255)
//   FAKE_CONTAINER_UNHEALTHY=1  the container check fails, unless `current`
//                               points at FAKE_HEALTHY_CURRENT
//   FAKE_DOCKER_TAMPER=<path>   a failing container check also appends to it
//   FAKE_RSYNC_GATE=<path>      holds the upload until the file exists
//   FAKE_TAMPER_INCOMING=<path> alters the unsealed upload before sealing
import { spawn, spawnSync } from "node:child_process";
import { chmod, cp, mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const webRoot = fileURLToPath(new URL("../../", import.meta.url));
const repositoryRoot = fileURLToPath(new URL("../../../", import.meta.url));
export const FIXTURE_REVISION = "0123456789abcdef0123456789abcdef01234567";
const realRsync = spawnSync("/bin/sh", ["-c", "command -v rsync"], { encoding: "utf8" }).stdout.trim();

export const DOCUMENTS = Object.freeze([
  "index.html", "overview/index.html", "de/ueberblick/index.html",
  "paimos/index.html", "paimos/de/index.html", "paimos-legacy/index.html", "paimos-legacy/de/index.html",
  "paimos-aeon/index.html", "paimos-aeon/de/index.html", "pharos/index.html", "pharos/de/index.html",
  "janus/index.html", "janus/de/index.html",
]);

// Log "<name>\t<arg>\t<arg>..." before acting, like the transport assertions expect.
const logLine = (name) => `{ printf '%s' '${name}'; for argument in "$@"; do printf '\\t%s' "$argument"; done; printf '\\n'; } >> "$TRANSPORT_LOG"`;

const FAKES = {
  ssh: `${logLine("ssh")}
command=$(cat)
case "$command" in
  *docker-compose.yml*) exit 97 ;;
esac
if [ -n "\${FAKE_SSH_FAIL:-}" ]; then
  case "$command" in
    $FAKE_SSH_FAIL) exit 255 ;;
  esac
fi
printf '%s\\n' "$command" | /bin/bash -se`,
  scp: `${logLine("scp")}
source="\${@: -2:1}"
target="\${@: -1}"
exec cp -p "$source" "/\${target#*:/}"`,
  rsync: `${logLine("rsync")}
arguments=()
skip=0
dry=0
for argument in "$@"; do
  if [ "$skip" = 1 ]; then skip=0; continue; fi
  case "$argument" in
    -e) skip=1 ;;
    -[!-]*n*) dry=1; arguments+=("$argument") ;;
    *:/*) arguments+=("/\${argument#*:/}") ;;
    *) arguments+=("$argument") ;;
  esac
done
# FAKE_RSYNC_GATE holds an upload (while the lock is held) until the file exists.
if [ "$dry" = 0 ] && [ -n "\${FAKE_RSYNC_GATE:-}" ]; then
  : > "$FAKE_RSYNC_GATE.waiting"
  for _ in $(seq 1 300); do [ -e "$FAKE_RSYNC_GATE" ] && break; sleep 0.1; done
fi
"$REAL_RSYNC" "\${arguments[@]}"
status=$?
# FAKE_TAMPER_INCOMING=<path> alters the unsealed upload on the host after the
# checksum parity check (during the asset publish), before sealing.
target="\${arguments[\${#arguments[@]}-1]}"
if [ "$status" = 0 ] && [ "$dry" = 0 ] && [ -n "\${FAKE_TAMPER_INCOMING:-}" ]; then
  case "$target" in
    */assets/_astro/)
      for incoming in "\${target%/assets/_astro/}"/.incoming-*; do
        printf 'tampered\\n' >> "$incoming/$FAKE_TAMPER_INCOMING"
      done ;;
  esac
fi
exit "$status"`,
  docker: `${logLine("docker")}
case "$*" in
  *"exec inspr-www caddy validate"*)
    if [ -n "\${FAKE_CONTAINER_UNHEALTHY:-}" ] \\
      && [ "$(readlink "$INSPR_AT_DIR/releases/current" 2>/dev/null)" != "\${FAKE_HEALTHY_CURRENT:-}" ]; then
      [ -z "\${FAKE_DOCKER_TAMPER:-}" ] || printf 'tampered\\n' >> "$FAKE_DOCKER_TAMPER"
      exit 1
    fi ;;
  *wget*) printf 'Inspiration is the only limit.\\nRequirements you approve before work begins.\\n' ;;
esac
exit 0`,
  python3: "exit 0",
  git: `case "$*" in
  *rev-parse*) printf '%s\\n' ${FIXTURE_REVISION} ;;
  *status*) exit 0 ;;
  *) exit 92 ;;
esac`,
  // The build writes release.json through the real metadata helper.
  npm: "exec node scripts/write-release-manifest.mjs",
};

export async function createHost() {
  const root = await mkdtemp(join(tmpdir(), "inspr-fake-host-"));
  const dir = join(root, "inspr-at");
  await mkdir(join(dir, "site"), { recursive: true });
  await mkdir(join(dir, "releases", "builds"), { recursive: true });
  await writeFile(join(dir, "site", "index.html"), "fixture archive\n");
  await writeFile(join(dir, "Caddyfile"), "fixture caddy configuration\n");
  return { root, dir, releases: join(dir, "releases") };
}

// A build sealed before this change: only its release.json on the host.
export async function seedBuild(host, id, manifest) {
  await mkdir(join(host.releases, "builds", id), { recursive: true });
  await writeFile(join(host.releases, "builds", id, "release.json"), `${JSON.stringify(manifest, null, 2)}\n`);
  await writeFile(join(host.releases, "builds", id, "index.html"), `legacy ${id}\n`);
}

export async function createCheckout(host, { release = null, caddyfile = "fixture caddy configuration\n" } = {}) {
  const root = await mkdtemp(join(tmpdir(), "inspr-fake-checkout-"));
  const fakeBin = join(root, "fake-bin");
  const dist = join(root, "web", "dist");
  await mkdir(fakeBin, { recursive: true });
  await mkdir(join(root, "site"), { recursive: true });
  await mkdir(join(root, "web", "scripts"), { recursive: true });
  await mkdir(join(dist, "_astro"), { recursive: true });
  for (const document of DOCUMENTS) {
    await mkdir(dirname(join(dist, document)), { recursive: true });
    await writeFile(join(dist, document), `fixture ${document}\n`);
  }
  await writeFile(join(dist, "_astro", "fixture.css"), "body{}\n");
  if (release) await writeFile(join(dist, "release.json"), `${JSON.stringify(release, null, 2)}\n`);
  await writeFile(join(root, "site", "index.html"), "fixture archive\n");
  await writeFile(join(root, "Caddyfile"), caddyfile);
  await writeFile(join(root, "web", "package-lock.json"), '{"name":"web","lockfileVersion":3}\n');
  await cp(join(repositoryRoot, "deploy.sh"), join(root, "deploy.sh"));
  for (const file of [
    "package.json", "release-metadata.mjs", "calendar-version.mjs", "release-set.mjs",
    "scripts/calendar-reservation.mjs", "scripts/release-set.mjs", "scripts/write-release-manifest.mjs",
  ]) {
    await cp(join(webRoot, file), join(root, "web", file));
  }
  for (const [name, body] of Object.entries(FAKES)) {
    await writeFile(join(fakeBin, name), `#!/bin/bash\n${body}\n`);
    await chmod(join(fakeBin, name), 0o755);
  }
  const transportLog = join(root, "transport.log");
  const environment = (extra = {}) => ({
    PATH: `${fakeBin}:${process.env.PATH}`,
    REAL_RSYNC: realRsync,
    TRANSPORT_LOG: transportLog,
    INSPR_AT_DIR: host.dir,
    SKIP_PROBE: "1",
    ...(release ? { SKIP_BUILD: "1" } : {}),
    ...extra,
  });
  const deploy = join(root, "deploy.sh");
  return {
    root,
    dist,
    transportLog,
    environment,
    run: (extra) => spawnSync("/bin/bash", [deploy], { cwd: root, encoding: "utf8", env: environment(extra) }),
    start: (extra) => {
      const child = spawn("/bin/bash", [deploy], { cwd: root, env: environment(extra) });
      let stdout = "";
      let stderr = "";
      child.stdout.on("data", (chunk) => { stdout += chunk; });
      child.stderr.on("data", (chunk) => { stderr += chunk; });
      return new Promise((resolve) => child.on("close", (status) => resolve({ status, stdout, stderr })));
    },
    release: async () => JSON.parse(await readFile(join(dist, "release.json"), "utf8")),
  };
}
