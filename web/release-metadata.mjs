import { execFileSync } from "node:child_process";
import packageManifest from "./package.json" with { type: "json" };
import {
  CALENDAR_SCHEME,
  RELEASE_CHANNEL,
  canonicalAnchor,
  parseSequence,
  validateVersionBlock,
} from "./calendar-version.mjs";

const repositoryRoot = process.cwd();

const SHA_PATTERN = /^[0-9a-f]{7,64}$/i;
const RELEASE_PATTERN = /^[a-z0-9][a-z0-9._-]{0,127}$/i;
const UTC_TIMESTAMP_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;

function localGitState() {
  try {
    const revision = execFileSync(
      "git",
      ["rev-parse", "--verify", "HEAD"],
      {
        cwd: repositoryRoot,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      },
    ).trim();
    const status = execFileSync(
      "git",
      ["status", "--porcelain", "--untracked-files=normal"],
      {
        cwd: repositoryRoot,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      },
    ).trim();

    return { revision, dirty: status.length > 0 };
  } catch {
    return { revision: "unknown", dirty: false };
  }
}

function optionalValue(environment, name) {
  const value = environment[name];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function createReleaseMetadata(
  environment = process.env,
  fallbackGitState = localGitState(),
) {
  const suppliedRevision = optionalValue(environment, "INSPR_GIT_SHA");
  const suppliedDirty = optionalValue(environment, "INSPR_GIT_DIRTY");
  const suppliedReleaseId = optionalValue(environment, "INSPR_RELEASE_ID");
  const suppliedDeployedAt = optionalValue(environment, "INSPR_DEPLOYED_AT");
  // Reserved once by deploy.sh (INSPR-493); the build never derives it.
  const suppliedCalendarVersion = optionalValue(environment, "INSPR_CALENDAR_VERSION");
  const suppliedSequence = optionalValue(environment, "INSPR_RELEASE_SEQUENCE");
  const suppliedAnchor = optionalValue(environment, "INSPR_CALENDAR_ANCHOR");

  if (suppliedRevision && !SHA_PATTERN.test(suppliedRevision)) {
    throw new Error("INSPR_GIT_SHA must be a 7-64 character hexadecimal revision");
  }
  if (suppliedDirty && suppliedDirty !== "0" && suppliedDirty !== "1") {
    throw new Error("INSPR_GIT_DIRTY must be 0 or 1");
  }
  if (suppliedReleaseId && !RELEASE_PATTERN.test(suppliedReleaseId)) {
    throw new Error("INSPR_RELEASE_ID contains unsupported characters");
  }
  if (
    suppliedDeployedAt &&
    (!UTC_TIMESTAMP_PATTERN.test(suppliedDeployedAt) ||
      Number.isNaN(Date.parse(suppliedDeployedAt)))
  ) {
    throw new Error("INSPR_DEPLOYED_AT must be a valid UTC timestamp");
  }

  const deploymentFields = [
    suppliedRevision,
    suppliedReleaseId,
    suppliedDeployedAt,
    suppliedCalendarVersion,
    suppliedSequence,
    suppliedAnchor,
  ];
  const hasDeploymentField = deploymentFields.some(Boolean) || Boolean(suppliedDirty);
  const hasCompleteDeployment = deploymentFields.every(Boolean);
  if (hasDeploymentField && !hasCompleteDeployment) {
    throw new Error(
      "INSPR_GIT_SHA, INSPR_RELEASE_ID, INSPR_DEPLOYED_AT, INSPR_CALENDAR_VERSION, " +
        "INSPR_RELEASE_SEQUENCE and INSPR_CALENDAR_ANCHOR must be supplied together",
    );
  }

  let calendar = null;
  if (hasCompleteDeployment) {
    let anchor;
    try {
      anchor = JSON.parse(suppliedAnchor);
    } catch {
      throw new Error("INSPR_CALENDAR_ANCHOR must be a JSON migration anchor");
    }
    try {
      calendar = validateVersionBlock(
        {
          scheme: CALENDAR_SCHEME,
          value: suppliedCalendarVersion,
          channel: RELEASE_CHANNEL,
          sequence: parseSequence(suppliedSequence),
          anchor: canonicalAnchor(anchor),
        },
        { deployedAt: suppliedDeployedAt },
      );
    } catch (error) {
      throw new Error(`INSPR_CALENDAR_VERSION rejected: ${error.message}`);
    }
  }

  const revision = suppliedRevision ?? fallbackGitState.revision;
  const dirty = suppliedRevision
    ? suppliedDirty === "1"
    : fallbackGitState.dirty;
  const shortRevision = SHA_PATTERN.test(revision)
    ? revision.slice(0, 12).toLowerCase()
    : "unknown";

  return Object.freeze({
    packageName: packageManifest.name,
    version: packageManifest.version,
    gitRevision: shortRevision,
    gitDirty: dirty,
    gitLabel: dirty ? `${shortRevision}-dirty` : shortRevision,
    releaseId: suppliedReleaseId ?? "local",
    deployedAt: suppliedDeployedAt,
    isDeployment: hasCompleteDeployment,
    // A local build has no calendar version and never shows one.
    calendarVersion: calendar?.value ?? null,
    versionScheme: calendar?.scheme ?? null,
    releaseChannel: calendar?.channel ?? null,
    releaseSequence: calendar?.sequence ?? null,
    versionAnchor: calendar ? Object.freeze(calendar.anchor) : null,
  });
}

export const releaseMetadata = createReleaseMetadata();

// Schema 2 adds the explicit version block (INSPR-493). Schema 1 manifests
// stay valid history for the legacy era and are never rewritten.
export function releaseManifest(metadata = releaseMetadata) {
  return {
    schemaVersion: 2,
    package: {
      name: metadata.packageName,
      version: metadata.version,
    },
    source: {
      git: metadata.gitRevision,
      dirty: metadata.gitDirty,
    },
    deployment: {
      releaseId: metadata.releaseId,
      deployedAt: metadata.deployedAt,
    },
    version: metadata.calendarVersion
      ? {
          scheme: metadata.versionScheme,
          value: metadata.calendarVersion,
          channel: metadata.releaseChannel,
          sequence: metadata.releaseSequence,
          anchor: { ...metadata.versionAnchor },
        }
      : null,
  };
}
