import { writeFile } from "node:fs/promises";
import { releaseManifest } from "../release-metadata.mjs";

const destination = new URL("../dist/release.json", import.meta.url);
const document = `${JSON.stringify(releaseManifest(), null, 2)}\n`;

await writeFile(destination, document, "utf8");
