// Release-set commands for deploy.sh (INSPR-493); see ../release-set.mjs.
//
//   create <dist> <source-revision> <lockfile> <caddyfile>
//       writes <dist>/release-set.json and prints its SHA-256
//   verify <expected-sha256> <release-id> <version|legacy>
//       stdin: remote_release_listing output for one release on the host;
//       prints "version<TAB>artifact-count<TAB>edge-sha256"
//   baseline <release-id> <output-file>
//       stdin: remote_release_listing output for a live legacy release;
//       writes its baseline manifest and prints the manifest's SHA-256
//   lookup <release-id|version>
//       stdin: releases/events.tsv; prints "release-id<TAB>version<TAB>sequence<TAB>sha256<TAB>kind"
//       of the confirmed entry (kind sealed or baseline); exit 4 when the
//       ledger confirms none
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  RELEASE_SET_FILE,
  createBaseline,
  createReleaseSet,
  parseEvents,
  sealedRelease,
  serializeBaseline,
  serializeReleaseSet,
  sha256,
  verifyRemoteRelease,
} from "../release-set.mjs";

const [command, ...args] = process.argv.slice(2);
try {
  if (command === "create" && args.length === 4) {
    const [root, sourceRevision, lockfile, caddyfile] = args;
    const bytes = Buffer.from(serializeReleaseSet(createReleaseSet({
      root,
      sourceRevision,
      lockfileBytes: readFileSync(lockfile),
      edgeBytes: readFileSync(caddyfile),
    })));
    writeFileSync(join(root, RELEASE_SET_FILE), bytes);
    process.stdout.write(`${sha256(bytes)}\n`);
  } else if (command === "verify" && args.length === 3) {
    const [expectedDigest, releaseId, version] = args;
    const set = verifyRemoteRelease({ listing: readFileSync(0, "utf8"), expectedDigest, releaseId, version });
    process.stdout.write(`${version}\t${set.artifacts.length}\t${set.edge.sha256}\n`);
  } else if (command === "baseline" && args.length === 2) {
    const [releaseId, output] = args;
    const bytes = Buffer.from(serializeBaseline(createBaseline({ listing: readFileSync(0, "utf8"), releaseId })));
    writeFileSync(output, bytes);
    process.stdout.write(`${sha256(bytes)}\n`);
  } else if (command === "lookup" && args.length === 1) {
    const entry = sealedRelease(parseEvents(readFileSync(0, "utf8")), args[0]);
    if (!entry) {
      console.error(`release set: ${args[0]} is not confirmed in the release ledger`);
      process.exit(4);
    }
    process.stdout.write(`${entry.releaseId}\t${entry.version}\t${entry.sequence}\t${entry.digest}\t${entry.event}\n`);
  } else {
    throw new Error("usage: release-set.mjs create <dist> <revision> <lockfile> <caddyfile> | verify <sha256> <release-id> <version> | baseline <release-id> <output> | lookup <target>");
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
