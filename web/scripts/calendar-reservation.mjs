// Calendar-version reservation for deploy.sh (INSPR-493). stdin carries the
// host's sealed release manifests (see read_release_inventory in deploy.sh).
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

const [command, argument] = process.argv.slice(2);
try {
  const entries = parseReleaseInventory(readFileSync(0, "utf8"));
  if (command === "reserve" && argument) {
    const { version, sequence, anchor } = reserveCalendarVersion({ deployedAt: argument, entries });
    process.stdout.write(`${version}\t${sequence}\t${JSON.stringify(anchor)}\n`);
  } else if (command === "verify" && argument) {
    const manifest = JSON.parse(readFileSync(argument, "utf8"));
    const block = verifyReleaseAgainstInventory(manifest, entries);
    process.stdout.write(`${block.value}\t${block.sequence}\n`);
  } else {
    throw new Error("usage: calendar-reservation.mjs reserve <utc-second> | verify <release.json>");
  }
} catch (error) {
  console.error(`calendar reservation: ${error.message}`);
  process.exitCode = error.code === "retry" ? 3 : 1;
}
