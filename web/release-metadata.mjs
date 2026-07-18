import { execFileSync } from "node:child_process";
import packageManifest from "./package.json" with { type: "json" };

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
  ];
  const hasDeploymentField = deploymentFields.some(Boolean) || Boolean(suppliedDirty);
  const hasCompleteDeployment = deploymentFields.every(Boolean);
  if (hasDeploymentField && !hasCompleteDeployment) {
    throw new Error(
      "INSPR_GIT_SHA, INSPR_RELEASE_ID and INSPR_DEPLOYED_AT must be supplied together",
    );
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
  });
}

export const releaseMetadata = createReleaseMetadata();

export function releaseManifest(metadata = releaseMetadata) {
  return {
    schemaVersion: 1,
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
  };
}
