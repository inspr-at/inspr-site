// Release-set commands for deploy.sh (INSPR-493); see ../release-set.mjs.
//
//   create <dist> <source-revision> <lockfile>
//       writes <dist>/release-set.json and prints its SHA-256
//   verify <expected-sha256> <release-id> <version>
//       stdin: remote_release_listing output for one build on the host
//   lookup <release-id|version>
//       stdin: releases/events.tsv; prints "release-id<TAB>version<TAB>sequence<TAB>sha256"
//       of the sealed entry; exit 4 when the release predates the ledger
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  RELEASE_SET_FILE,
  createReleaseSet,
  parseEvents,
  sealedRelease,
  serializeReleaseSet,
  sha256,
  verifyRemoteRelease,
} from "../release-set.mjs";

const [command, ...args] = process.argv.slice(2);
try {
  if (command === "create" && args.length === 3) {
    const [root, sourceRevision, lockfile] = args;
    const bytes = Buffer.from(serializeReleaseSet(createReleaseSet({
      root,
      sourceRevision,
      lockfileBytes: readFileSync(lockfile),
    })));
    writeFileSync(join(root, RELEASE_SET_FILE), bytes);
    process.stdout.write(`${sha256(bytes)}\n`);
  } else if (command === "verify" && args.length === 3) {
    const [expectedDigest, releaseId, version] = args;
    const set = verifyRemoteRelease({ listing: readFileSync(0, "utf8"), expectedDigest, releaseId, version });
    process.stdout.write(`${set.version.value}\t${set.artifacts.length}\n`);
  } else if (command === "lookup" && args.length === 1) {
    const entry = sealedRelease(parseEvents(readFileSync(0, "utf8")), args[0]);
    if (!entry) {
      console.error(`release set: ${args[0]} is not in the release ledger`);
      process.exit(4);
    }
    process.stdout.write(`${entry.releaseId}\t${entry.version}\t${entry.sequence}\t${entry.digest}\n`);
  } else {
    throw new Error("usage: release-set.mjs create <dist> <revision> <lockfile> | verify <sha256> <release-id> <version> | lookup <target>");
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
