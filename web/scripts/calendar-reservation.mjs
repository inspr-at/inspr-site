// Calendar-version reservation for deploy.sh (INSPR-493). stdin carries the
// host's sealed release manifests and, after a "=== events.tsv" line, its
// release ledger (see read_release_inventory in deploy.sh). Every coordinate
// the ledger has recorded counts as used, abandoned pending seals included.
//
//   reserve <YYYY-MM-DDThh:mm:ssZ>  prints "version<TAB>sequence<TAB>anchor-json"
//   verify <release.json>           prints "version<TAB>sequence" when the
//                                   manifest is exactly the channel's next release
//
// Exit 3 means the coordinate is not yet later than the channel's latest one
// and the caller may retry in the next second; any other failure exits 1.
import { readFileSync } from "node:fs";
import {
  parseReleaseInventory,
  reserveCalendarVersion,
  verifyReleaseAgainstInventory,
} from "../calendar-version.mjs";
import { LEGACY_VERSION, parseEvents } from "../release-set.mjs";

export const LEDGER_MARKER = "=== events.tsv";

// Splits the inventory into build manifests and the ledger's recorded
// calendar coordinates.
function readInventory(text) {
  const lines = String(text ?? "").split("\n");
  const marker = lines.indexOf(LEDGER_MARKER);
  const manifests = marker === -1 ? lines : lines.slice(0, marker);
  const ledger = marker === -1 ? [] : lines.slice(marker + 1);
  const recorded = parseEvents(ledger.join("\n"))
    .filter((entry) => entry.version !== LEGACY_VERSION)
    .map(({ releaseId, version, sequence }) => ({ releaseId, version, sequence }));
  return { entries: parseReleaseInventory(manifests.join("\n")), recorded };
}

const [command, argument] = process.argv.slice(2);
try {
  const { entries, recorded } = readInventory(readFileSync(0, "utf8"));
  if (command === "reserve" && argument) {
    const { version, sequence, anchor } = reserveCalendarVersion({ deployedAt: argument, entries, recorded });
    process.stdout.write(`${version}\t${sequence}\t${JSON.stringify(anchor)}\n`);
  } else if (command === "verify" && argument) {
    const manifest = JSON.parse(readFileSync(argument, "utf8"));
    const block = verifyReleaseAgainstInventory(manifest, entries, recorded);
    process.stdout.write(`${block.value}\t${block.sequence}\n`);
  } else {
    throw new Error("usage: calendar-reservation.mjs reserve <utc-second> | verify <release.json>");
  }
} catch (error) {
  console.error(`calendar reservation: ${error.message}`);
  process.exitCode = error.code === "retry" ? 3 : 1;
}
