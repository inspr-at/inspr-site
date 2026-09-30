// INSPR Calendar Versioning for the site release (INSPR-493).
//
// Normative source: inspr-modules docs/AGENTS-VERSIONING.md. New reservations
// declare inspr-calver-3; the coordinate is YYMMDDhhmmss.0.0 in UTC. deploy.sh
// reserves it once from its deployment timestamp and every build reuses it.
// Nothing here reads a clock: build nodes never derive a version themselves.

export const CALENDAR_SCHEME = "inspr-calver-3";
// CalVer2 shares the coordinate. Readers accept it in history; a new
// reservation declaring it is invalid.
export const DEPRECATED_CALENDAR_SCHEME = "inspr-calendar-v2";
export const CALENDAR_SCHEMES = Object.freeze([CALENDAR_SCHEME, DEPRECATED_CALENDAR_SCHEME]);
export const LEGACY_SCHEME = "legacy";
export const RELEASE_CHANNEL = "stable";
// A reservation that is not later than the channel's latest coordinate waits
// for the next second only while that coordinate is this close; a larger gap
// means a skewed clock and fails closed.
export const RESERVATION_RETRY_SECONDS = 5;

// Doctrine grammar. Necessary, not sufficient: see the real-date check below.
const GRAMMAR =
  /^(?:[1-9][0-9])(?:0[1-9]|1[0-2])(?:0[1-9]|[12][0-9]|3[01])(?:[01][0-9]|2[0-3])(?:[0-5][0-9])(?:[0-5][0-9])\.0\.0$/;
const UTC_SECOND = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})Z$/;
const RELEASE_ID = /^[a-z0-9][a-z0-9._-]{0,127}$/i;
const SEQUENCE = /^[1-9][0-9]{0,8}$/;

export class ReservationError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

// True only for a canonical coordinate on a date that exists (proleptic
// Gregorian, UTC). No v prefix, suffix, whitespace or short form.
export function isCalendarVersion(value) {
  if (typeof value !== "string" || !GRAMMAR.test(value)) return false;
  const year = 2000 + Number(value.slice(0, 2));
  const month = Number(value.slice(2, 4));
  const day = Number(value.slice(4, 6));
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

// The reservation instant of a valid coordinate, in epoch milliseconds.
export function calendarInstant(version) {
  if (!isCalendarVersion(version)) throw new ReservationError("invalid", `invalid calendar version ${version}`);
  const field = (start) => Number(version.slice(start, start + 2));
  return Date.UTC(2000 + field(0), field(2) - 1, field(4), field(6), field(8), field(10));
}

// The coordinate of one UTC reservation second (YYYY-MM-DDThh:mm:ssZ).
export function calendarVersionFromUtc(timestamp) {
  const match = UTC_SECOND.exec(typeof timestamp === "string" ? timestamp : "");
  if (!match) throw new ReservationError("invalid", "reservation timestamp must be one UTC second (YYYY-MM-DDThh:mm:ssZ)");
  const [, year, ...fields] = match;
  if (Number(year) < 2010 || Number(year) > 2099) {
    throw new ReservationError("invalid", "reservation year must lie in 2010-2099");
  }
  const version = `${year.slice(2)}${fields.join("")}.0.0`;
  if (!isCalendarVersion(version)) throw new ReservationError("invalid", `invalid reservation timestamp ${timestamp}`);
  return version;
}

// Orders two coordinates of one channel. Validates first: invalid input has no
// order, and generic string or SemVer sorting is never used on its own.
export function compareCalendarVersions(left, right) {
  if (!isCalendarVersion(left) || !isCalendarVersion(right)) {
    throw new ReservationError("invalid", "only valid calendar versions can be compared");
  }
  const difference = calendarInstant(left) - calendarInstant(right);
  return Math.sign(difference);
}

const plainObject = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value)
  && Object.getPrototypeOf(value) === Object.prototype;

function exactKeys(value, keys, what) {
  if (!plainObject(value)) throw new ReservationError("invalid", `${what} must be an object`);
  const have = Object.keys(value).sort();
  const want = [...keys].sort();
  if (have.length !== want.length || have.some((key, index) => key !== want[index])) {
    throw new ReservationError("invalid", `${what} must have exactly: ${want.join(", ")}`);
  }
}

export function parseSequence(value) {
  const text = typeof value === "number" ? String(value) : value;
  if (typeof text !== "string" || !SEQUENCE.test(text)) {
    throw new ReservationError("invalid", "release sequence must be a positive integer");
  }
  return Number(text);
}

// The legacy-to-calendar migration anchor. The first calendar release of the
// channel records it and every later release carries it unchanged.
export function validateAnchor(anchor) {
  exactKeys(anchor, ["legacyScheme", "lastLegacyVersion", "firstCalendarVersion", "firstCalendarSequence"], "version anchor");
  if (anchor.legacyScheme !== LEGACY_SCHEME) throw new ReservationError("invalid", "anchor legacy scheme must be legacy");
  if (anchor.lastLegacyVersion !== null
    && (typeof anchor.lastLegacyVersion !== "string" || !RELEASE_ID.test(anchor.lastLegacyVersion) || anchor.lastLegacyVersion === "local")) {
    throw new ReservationError("invalid", "anchor last legacy version must be a release id or null");
  }
  if (!isCalendarVersion(anchor.firstCalendarVersion)) throw new ReservationError("invalid", "anchor first calendar version is invalid");
  if (!Number.isSafeInteger(anchor.firstCalendarSequence) || anchor.firstCalendarSequence < 1) {
    throw new ReservationError("invalid", "anchor first calendar sequence must be a positive integer");
  }
  return anchor;
}

// The anchor with its fields in one fixed order, for storage and comparison.
export function canonicalAnchor(anchor) {
  validateAnchor(anchor);
  return {
    legacyScheme: anchor.legacyScheme,
    lastLegacyVersion: anchor.lastLegacyVersion,
    firstCalendarVersion: anchor.firstCalendarVersion,
    firstCalendarSequence: anchor.firstCalendarSequence,
  };
}

const sameAnchor = (left, right) =>
  JSON.stringify(canonicalAnchor(left)) === JSON.stringify(canonicalAnchor(right));

// Validates a release.json version block. A new release must declare the
// current scheme; history may still carry the deprecated CalVer2 identifier.
export function validateVersionBlock(block, { deployedAt, history = false } = {}) {
  const schemes = history ? CALENDAR_SCHEMES : [CALENDAR_SCHEME];
  if (!plainObject(block) || !schemes.includes(block.scheme)) {
    throw new ReservationError("invalid", `unknown or absent version scheme ${JSON.stringify(block?.scheme)}`);
  }
  exactKeys(block, ["scheme", "value", "channel", "sequence", "anchor"], "release version");
  if (!isCalendarVersion(block.value)) throw new ReservationError("invalid", `invalid calendar version ${block.value}`);
  if (block.channel !== RELEASE_CHANNEL) throw new ReservationError("invalid", `unknown release channel ${block.channel}`);
  if (!Number.isSafeInteger(block.sequence) || block.sequence < 1) {
    throw new ReservationError("invalid", "release sequence must be a positive integer");
  }
  validateAnchor(block.anchor);
  const first = block.anchor.firstCalendarSequence;
  if (block.sequence < first) throw new ReservationError("invalid", "release sequence precedes the migration anchor");
  const order = compareCalendarVersions(block.value, block.anchor.firstCalendarVersion);
  if (block.sequence === first ? order !== 0 : order <= 0) {
    throw new ReservationError("invalid", "release version and sequence disagree with the migration anchor");
  }
  if (deployedAt !== undefined && block.value !== calendarVersionFromUtc(deployedAt)) {
    throw new ReservationError("invalid", "calendar version is not the deployment timestamp's reservation");
  }
  return block;
}

// Parses the host's sealed release manifests, as printed by deploy.sh:
// one "--- <build-id>" line followed by that build's release.json.
export function parseReleaseInventory(text) {
  const entries = [];
  let current = null;
  for (const line of String(text ?? "").split("\n")) {
    const header = /^--- ([A-Za-z0-9._-]+)$/.exec(line);
    if (header) {
      current = { buildId: header[1], lines: [] };
      entries.push(current);
    } else if (current) {
      current.lines.push(line);
    } else if (line.trim()) {
      throw new ReservationError("invalid", "release inventory is malformed");
    }
  }
  return entries.map(({ buildId, lines }) => {
    try {
      return { buildId, manifest: JSON.parse(lines.join("\n")) };
    } catch {
      throw new ReservationError("invalid", `release manifest of build ${buildId} is not JSON`);
    }
  });
}

// Splits the channel history into eras. Fails closed on an unknown manifest
// schema, a calendar build without a scheme, or an inconsistent history.
export function summarizeInventory(entries) {
  const legacy = [];
  const calendar = [];
  for (const { buildId, manifest } of entries) {
    if (manifest?.schemaVersion === 1) {
      const releaseId = manifest?.deployment?.releaseId;
      const deployedAt = manifest?.deployment?.deployedAt;
      if (typeof releaseId !== "string" || !RELEASE_ID.test(releaseId) || !UTC_SECOND.test(deployedAt ?? "")) {
        throw new ReservationError("invalid", `legacy build ${buildId} has no release identity`);
      }
      legacy.push({ releaseId, deployedAt });
    } else if (manifest?.schemaVersion === 2) {
      if (manifest.version === null || manifest.version === undefined) {
        throw new ReservationError("invalid", `build ${buildId} declares no version scheme`);
      }
      const block = validateVersionBlock(manifest.version, { history: true });
      calendar.push({ ...block, releaseId: manifest?.deployment?.releaseId });
    } else {
      throw new ReservationError("invalid", `build ${buildId} has an unknown release manifest schema`);
    }
  }
  legacy.sort((left, right) => (left.deployedAt === right.deployedAt
    ? (left.releaseId < right.releaseId ? -1 : 1)
    : (left.deployedAt < right.deployedAt ? -1 : 1)));
  calendar.sort((left, right) => left.sequence - right.sequence);
  for (let index = 1; index < calendar.length; index += 1) {
    const previous = calendar[index - 1];
    const next = calendar[index];
    if (next.sequence === previous.sequence || compareCalendarVersions(next.value, previous.value) <= 0) {
      throw new ReservationError("invalid", "calendar history is not strictly ordered by sequence and version");
    }
    if (!sameAnchor(next.anchor, previous.anchor)) {
      throw new ReservationError("invalid", "calendar history carries more than one migration anchor");
    }
  }
  return { legacy, calendar };
}

// Coordinates the host's release ledger has recorded ({ releaseId, version,
// sequence } of every pending or sealed record). A recorded coordinate stays
// used even when its upload was abandoned before sealing, so it is never
// issued again. Rows of `own` (the release being verified) are its own
// reservation and must name exactly its coordinate.
function heldCoordinates(recorded, own) {
  const held = [];
  for (const row of recorded) {
    if (!row || typeof row.releaseId !== "string" || !isCalendarVersion(row.version)
      || !Number.isSafeInteger(row.sequence) || row.sequence < 1) {
      throw new ReservationError("invalid", "the release ledger records an invalid coordinate");
    }
    if (own && row.releaseId === own.releaseId) {
      if (row.version !== own.value || row.sequence !== own.sequence) {
        throw new ReservationError("invalid", `the release ledger records ${own.releaseId} with another coordinate`);
      }
    } else {
      held.push(row);
    }
  }
  return held;
}

// Reserves the next coordinate of the channel from one deployment timestamp:
// strictly later than every sealed build and every coordinate the ledger has
// recorded, and one past the highest sequence of either.
export function reserveCalendarVersion({ deployedAt, entries, recorded = [], own }) {
  const version = calendarVersionFromUtc(deployedAt);
  const { legacy, calendar } = summarizeInventory(entries);
  const latest = calendar.at(-1);
  const coordinates = [...calendar.map(({ value, sequence }) => ({ version: value, sequence })), ...heldCoordinates(recorded, own)];
  const latestVersion = coordinates.reduce((max, { version: value }) =>
    (max === null || compareCalendarVersions(value, max) > 0 ? value : max), null);
  const sequence = Math.max(0, ...coordinates.map((coordinate) => coordinate.sequence)) + 1;
  if (latestVersion && compareCalendarVersions(version, latestVersion) <= 0) {
    const gap = (calendarInstant(latestVersion) - calendarInstant(version)) / 1000;
    throw new ReservationError(
      gap < RESERVATION_RETRY_SECONDS ? "retry" : "clock",
      `reservation ${version} is not later than the channel's latest version ${latestVersion}`,
    );
  }
  if (latest) return { version, sequence, anchor: canonicalAnchor(latest.anchor) };
  const lastLegacy = legacy.at(-1) ?? null;
  if (lastLegacy && lastLegacy.deployedAt >= deployedAt) {
    throw new ReservationError("clock", `reservation ${deployedAt} is not later than the last legacy deployment`);
  }
  // The first sealed calendar release anchors the channel; an abandoned
  // earlier reservation only moves its sequence on.
  return {
    version,
    sequence,
    anchor: {
      legacyScheme: LEGACY_SCHEME,
      lastLegacyVersion: lastLegacy?.releaseId ?? null,
      firstCalendarVersion: version,
      firstCalendarSequence: sequence,
    },
  };
}

// Confirms that a built release manifest is exactly the next reservation of
// the channel described by the host inventory.
export function verifyReleaseAgainstInventory(manifest, entries, recorded = []) {
  if (manifest?.schemaVersion !== 2) throw new ReservationError("invalid", "release manifest must use schema version 2");
  const deployedAt = manifest?.deployment?.deployedAt;
  const block = validateVersionBlock(manifest.version, { deployedAt });
  const own = { releaseId: manifest?.deployment?.releaseId, value: block.value, sequence: block.sequence };
  const expected = reserveCalendarVersion({ deployedAt, entries, recorded, own });
  if (block.sequence !== expected.sequence) {
    throw new ReservationError("invalid", `release sequence ${block.sequence} is not the channel's next sequence ${expected.sequence}`);
  }
  if (!sameAnchor(block.anchor, expected.anchor)) {
    throw new ReservationError("invalid", "release migration anchor differs from the channel history");
  }
  return block;
}
