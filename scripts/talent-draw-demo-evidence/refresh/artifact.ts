import { readdir, readFile } from "fs/promises";
import { existsSync } from "fs";
import { join, resolve } from "path";
import { CANONICAL_ARTIFACT_PATH, TMP_CLI_REVIEW_DIR } from "./constants.js";

export async function findLatestReviewArtifact(hostPath: string): Promise<string | null> {
  const reviewArtifact = await findCliReviewArtifact(hostPath);
  if (reviewArtifact) {
    return reviewArtifact;
  }
  return findCanonicalEvidenceArtifact(hostPath);
}

export async function findGapFillApprovalArtifacts(hostPath: string): Promise<string[]> {
  if (!existsSync(TMP_CLI_REVIEW_DIR)) {
    return [];
  }

  const files = await readdir(TMP_CLI_REVIEW_DIR);
  const approvalFiles = files
    .filter((file) => file.startsWith("gap-fill-approval-") && file.endsWith(".json"))
    .sort()
    .reverse();

  const expectedHost = normalizePath(hostPath);
  const matches: string[] = [];

  for (const file of approvalFiles) {
    const artifactPath = join(TMP_CLI_REVIEW_DIR, file);
    try {
      const artifact = JSON.parse(await readFile(artifactPath, "utf-8"));
      const artifactHost = normalizePath(artifact?.hostRoot ?? "");
      if (artifactHost === expectedHost) {
        matches.push(artifactPath);
      }
    } catch {
      // Ignore malformed historical artifacts.
    }
  }

  return matches;
}

async function findCliReviewArtifact(hostPath: string): Promise<string | null> {
  if (!existsSync(TMP_CLI_REVIEW_DIR)) {
    return null;
  }

  const files = await readdir(TMP_CLI_REVIEW_DIR);
  const reviewFiles = files
    .filter((file) => file.startsWith("dota2-review-") && file.endsWith(".json"))
    .sort()
    .reverse();

  const expectedHost = normalizePath(hostPath);
  for (const file of reviewFiles) {
    const artifactPath = join(TMP_CLI_REVIEW_DIR, file);
    try {
      const artifact = JSON.parse(await readFile(artifactPath, "utf-8"));
      const artifactHost = normalizePath(artifact?.cliOptions?.hostRoot ?? "");
      if (artifactHost === expectedHost) {
        return artifactPath;
      }
    } catch {
      // Ignore malformed historical artifacts.
    }
  }

  return null;
}

async function findCanonicalEvidenceArtifact(hostPath: string): Promise<string | null> {
  if (!existsSync(CANONICAL_ARTIFACT_PATH)) {
    return null;
  }

  try {
    const artifact = JSON.parse(await readFile(CANONICAL_ARTIFACT_PATH, "utf-8"));
    const artifactHost = normalizePath(artifact?.meta?.hostRoot ?? artifact?.cliOptions?.hostRoot ?? "");
    return artifactHost === normalizePath(hostPath) ? CANONICAL_ARTIFACT_PATH : null;
  } catch {
    return null;
  }
}

function normalizePath(value: string): string {
  return resolve(value).toLowerCase();
}
