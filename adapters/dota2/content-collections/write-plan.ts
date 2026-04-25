import type { WritePlan, WritePlanEntry } from "../assembler/index.js";
import {
  RW_CONTENT_COLLECTIONS_ADAPTER,
  type FeatureContentCollectionsArtifactV1,
  getFeatureContentCollectionsArtifactRelativePath,
} from "./artifact.js";

export function appendJsonEntry(
  writePlan: WritePlan,
  targetPath: string,
  contentSummary: string,
  parameters: Record<string, unknown>,
  metadata: Record<string, unknown>,
  refreshWritePlanDerivedFields: (writePlan: WritePlan) => void,
): void {
  const existingIndex = writePlan.entries.findIndex((entry) => entry.targetPath === targetPath);
  const nextEntry: WritePlanEntry = {
    operation: existingIndex >= 0 ? writePlan.entries[existingIndex].operation : "create",
    targetPath,
    contentType: "json",
    contentSummary,
    sourcePattern: metadata.sourcePattern as string,
    sourceModule: metadata.sourceModule as string,
    safe: true,
    parameters,
    metadata,
  };

  if (existingIndex >= 0) {
    writePlan.entries[existingIndex] = nextEntry;
    refreshWritePlanDerivedFields(writePlan);
    return;
  }

  writePlan.entries.push(nextEntry);
  refreshWritePlanDerivedFields(writePlan);
}

export function appendFeatureContentCollectionsEntry(
  writePlan: WritePlan,
  featureId: string,
  artifact: FeatureContentCollectionsArtifactV1,
  refreshWritePlanDerivedFields: (writePlan: WritePlan) => void,
): void {
  appendJsonEntry(
    writePlan,
    getFeatureContentCollectionsArtifactRelativePath(featureId),
    `rw content collections (${artifact.collections.length})`,
    artifact as unknown as Record<string, unknown>,
    {
      adapter: RW_CONTENT_COLLECTIONS_ADAPTER,
      sourcePattern: "rw.content_collections",
      sourceModule: "content_collections",
    },
    refreshWritePlanDerivedFields,
  );
}
