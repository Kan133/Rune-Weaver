import { existsSync, readFileSync } from "fs";
import { join } from "path";

import type {
  CurrentFeatureContext,
  CurrentFeatureTruth,
} from "../schema/types.js";
import { getSelectionPoolCanonicalModuleRoles } from "../schema/selection-pool-profile.js";
import type { RuneWeaverFeatureRecord } from "../workspace/types.js";
import { extractCurrentFeatureBoundedTruth } from "./current-feature-bounded-truth.js";

function dedupeStrings(values: Array<string | undefined>): string[] {
  return [...new Set((values || []).filter((value): value is string => Boolean(value && value.trim().length > 0)))];
}

function resolveArtifactPath(hostRoot: string, relativePath: string): string {
  return /^[A-Za-z]:[\\/]/.test(relativePath)
    ? relativePath
    : join(hostRoot, relativePath);
}

function readSourceArtifact(
  existingFeature: RuneWeaverFeatureRecord,
  hostRoot: string,
): Record<string, unknown> | undefined {
  if (!existingFeature.sourceModel?.path) {
    return undefined;
  }

  const fullPath = resolveArtifactPath(hostRoot, existingFeature.sourceModel.path);
  if (!existsSync(fullPath)) {
    return undefined;
  }

  try {
    const parsed = JSON.parse(readFileSync(fullPath, "utf-8"));
    return parsed && typeof parsed === "object" ? parsed as Record<string, unknown> : undefined;
  } catch {
    return undefined;
  }
}

function extractPreservedInvariants(existingFeature: RuneWeaverFeatureRecord): string[] {
  const invariants = existingFeature.featureAuthoring?.parameterSurface?.invariants;
  return Array.isArray(invariants)
    ? dedupeStrings(invariants.map((item) => typeof item === "string" ? item : undefined))
    : [];
}

function extractSourceBackedInvariantRoles(
  existingFeature: RuneWeaverFeatureRecord,
): string[] {
  const profile = existingFeature.featureAuthoring?.profile;
  const adapter = existingFeature.sourceModel?.adapter;
  if (profile === "selection_pool" || adapter === "selection_pool") {
    return getSelectionPoolCanonicalModuleRoles();
  }

  return [];
}

function derivePreservedModuleBackbone(existingFeature: RuneWeaverFeatureRecord): string[] {
  const sourceBackedInvariantRoles = extractSourceBackedInvariantRoles(existingFeature);
  if (sourceBackedInvariantRoles.length > 0) {
    return sourceBackedInvariantRoles;
  }

  if (existingFeature.modules && existingFeature.modules.length > 0) {
    return dedupeStrings(existingFeature.modules.map((module) => module.role));
  }

  return [...existingFeature.selectedPatterns];
}

function deriveOwnedSemanticContracts(input: {
  existingFeature: RuneWeaverFeatureRecord;
  preservedModuleBackbone: string[];
  boundedFields: CurrentFeatureTruth["boundedFields"];
  profile?: string;
}): string[] {
  const { existingFeature, preservedModuleBackbone, boundedFields, profile } = input;
  return dedupeStrings([
    existingFeature.sourceModel ? "source_model" : undefined,
    existingFeature.featureAuthoring ? "feature_authoring" : undefined,
    profile ? `profile:${profile}` : undefined,
    ...preservedModuleBackbone.map((role) => `backbone:${role}`),
    typeof boundedFields.triggerKey === "string" ? "contract:trigger" : undefined,
    typeof boundedFields.choiceCount === "number" ? "contract:selection.choice_count" : undefined,
    typeof boundedFields.objectCount === "number" ? "contract:content.collection.object_count" : undefined,
    boundedFields.inventoryEnabled === true ? "contract:selection.inventory" : undefined,
    boundedFields.hasLuaAbilityShell === true ? "contract:realization.lua" : undefined,
    boundedFields.hasAbilityKvParticipation === true ? "contract:realization.kv" : undefined,
    ...(boundedFields.realizationKinds || []).map((kind) => `realization:${kind}`),
  ]);
}

export function buildCurrentFeatureTruth(
  existingFeature: RuneWeaverFeatureRecord,
  hostRoot: string,
): CurrentFeatureTruth {
  const sourceArtifact = readSourceArtifact(existingFeature, hostRoot);
  const preservedModuleBackbone = derivePreservedModuleBackbone(existingFeature);
  const boundedFields = extractCurrentFeatureBoundedTruth({
    existingFeature,
    hostRoot,
    sourceArtifact,
  });
  const profile = existingFeature.featureAuthoring?.profile || existingFeature.sourceModel?.adapter;

  return {
    featureId: existingFeature.featureId,
    revision: existingFeature.revision,
    intentKind: existingFeature.intentKind,
    sourceBacked: Boolean(existingFeature.sourceModel || existingFeature.featureAuthoring),
    ...(profile ? { profile } : {}),
    selectedPatterns: [...existingFeature.selectedPatterns],
    ...(existingFeature.modules && existingFeature.modules.length > 0
      ? { moduleRecords: [...existingFeature.modules] }
      : {}),
    ...(existingFeature.sourceModel || sourceArtifact
      ? {
          sourceModel: {
            ...(existingFeature.sourceModel
              ? {
                  ref: {
                    adapter: existingFeature.sourceModel.adapter,
                    version: existingFeature.sourceModel.version,
                    path: existingFeature.sourceModel.path,
                  },
                }
              : {}),
            ...(sourceArtifact ? { artifact: sourceArtifact } : {}),
          },
        }
      : {}),
    ...(existingFeature.featureAuthoring ? { featureAuthoring: existingFeature.featureAuthoring } : {}),
    preservedModuleBackbone,
    preservedInvariants: extractPreservedInvariants(existingFeature),
    boundedFields,
    realizationParticipation: dedupeStrings([...(boundedFields.realizationKinds || [])]),
    ownedSemanticContracts: deriveOwnedSemanticContracts({
      existingFeature,
      preservedModuleBackbone,
      boundedFields,
      profile,
    }),
  };
}

export function projectCurrentFeatureContext(
  currentFeatureTruth: CurrentFeatureTruth,
): CurrentFeatureContext {
  return {
    featureId: currentFeatureTruth.featureId,
    revision: currentFeatureTruth.revision,
    intentKind: currentFeatureTruth.intentKind,
    selectedPatterns: [...currentFeatureTruth.selectedPatterns],
    ...(currentFeatureTruth.moduleRecords && currentFeatureTruth.moduleRecords.length > 0
      ? { moduleRecords: [...currentFeatureTruth.moduleRecords] }
      : {}),
    sourceBacked: currentFeatureTruth.sourceBacked,
    ...(currentFeatureTruth.sourceModel ? { sourceModel: currentFeatureTruth.sourceModel } : {}),
    ...(currentFeatureTruth.featureAuthoring ? { featureAuthoring: currentFeatureTruth.featureAuthoring } : {}),
    preservedModuleBackbone: [...currentFeatureTruth.preservedModuleBackbone],
    preservedInvariants: [...currentFeatureTruth.preservedInvariants],
    boundedFields: { ...currentFeatureTruth.boundedFields },
    ...(currentFeatureTruth.moduleRecords && currentFeatureTruth.moduleRecords.length > 0
      ? {}
      : { admittedSkeleton: [...currentFeatureTruth.preservedModuleBackbone] }),
    ...(currentFeatureTruth.sourceBacked && currentFeatureTruth.profile
      ? { sourceBackedInvariantRoles: [...currentFeatureTruth.preservedModuleBackbone] }
      : {}),
  };
}
