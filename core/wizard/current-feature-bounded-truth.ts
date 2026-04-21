import { existsSync, readFileSync } from "fs";
import { join } from "path";

import type { CurrentFeatureBoundedTruth } from "../schema/types.js";
import type { RuneWeaverFeatureRecord } from "../workspace/types.js";

function dedupeStrings(values: Array<string | undefined>): string[] {
  return [...new Set(values.filter((value): value is string => Boolean(value && value.trim().length > 0)))];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function normalizePositiveInteger(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? Math.floor(value)
    : undefined;
}

function normalizeStringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

function resolveSourceBackedSnapshot(
  existingFeature: RuneWeaverFeatureRecord,
  sourceArtifact?: Record<string, unknown>,
): Record<string, unknown> | undefined {
  const authoredParameters = isRecord(existingFeature.featureAuthoring?.parameters)
    ? existingFeature.featureAuthoring.parameters
    : undefined;

  if (sourceArtifact && authoredParameters) {
    return {
      ...authoredParameters,
      ...sourceArtifact,
    };
  }

  return sourceArtifact || authoredParameters;
}

function applySourceBackedSnapshot(
  boundedFields: CurrentFeatureBoundedTruth,
  existingFeature: RuneWeaverFeatureRecord,
  sourceArtifact?: Record<string, unknown>,
): void {
  const snapshot = resolveSourceBackedSnapshot(existingFeature, sourceArtifact);
  if (!snapshot) {
    return;
  }

  const triggerKey = normalizeStringValue(snapshot.triggerKey);
  const choiceCount = normalizePositiveInteger(snapshot.choiceCount);
  const objects = Array.isArray(snapshot.objects) ? snapshot.objects : undefined;
  const inventory = isRecord(snapshot.inventory) ? snapshot.inventory : undefined;

  if (triggerKey) {
    boundedFields.triggerKey = triggerKey;
  }
  if (typeof choiceCount === "number") {
    boundedFields.choiceCount = choiceCount;
  }
  if (Array.isArray(objects)) {
    boundedFields.objectCount = objects.length;
  }
  if (inventory) {
    if (typeof inventory.enabled === "boolean") {
      boundedFields.inventoryEnabled = inventory.enabled;
    }
    const inventoryCapacity = normalizePositiveInteger(inventory.capacity);
    if (typeof inventoryCapacity === "number") {
      boundedFields.inventoryCapacity = inventoryCapacity;
    }
    const fullMessage = normalizeStringValue(inventory.fullMessage);
    if (fullMessage) {
      boundedFields.inventoryFullMessage = fullMessage;
    }
  }
}

function extractTriggerKeyFromIntegrationPoints(existingFeature: RuneWeaverFeatureRecord): string | undefined {
  for (const point of existingFeature.integrationPoints || []) {
    const match = point.match(/^input\.key_binding:(.+)$/i);
    if (match?.[1]) {
      const triggerKey = normalizeStringValue(match[1]);
      if (triggerKey) {
        return triggerKey.toUpperCase();
      }
    }
  }
  return undefined;
}

function isWeightedPoolGeneratedFile(file: string): boolean {
  const normalized = file.replace(/\\/g, "/");
  return normalized.includes("/generated/shared/") && normalized.includes("weighted_pool") && normalized.endsWith(".ts");
}

function parseWeightedPoolEntries(content: string): number | undefined {
  const pattern = /\{\s*id:\s*"((?:\\.|[^"])*)",\s*label:\s*"((?:\\.|[^"])*)",\s*description:\s*"((?:\\.|[^"])*)",\s*weight:\s*([0-9.]+)(?:,\s*tier:\s*"((?:\\.|[^"])*)")?\s*\}/g;
  let count = 0;
  for (const _match of content.matchAll(pattern)) {
    count += 1;
  }
  return count > 0 ? count : undefined;
}

function readWeightedPoolBoundedTruth(
  hostRoot: string,
  existingFeature: RuneWeaverFeatureRecord,
): Pick<CurrentFeatureBoundedTruth, "choiceCount" | "objectCount"> {
  const weightedPoolPath = existingFeature.generatedFiles.find(isWeightedPoolGeneratedFile);
  if (!weightedPoolPath) {
    return {};
  }

  const fullPath = /^[A-Za-z]:[\\/]/.test(weightedPoolPath)
    ? weightedPoolPath
    : join(hostRoot, weightedPoolPath);
  if (!existsSync(fullPath)) {
    return {};
  }

  const content = readFileSync(fullPath, "utf-8");
  const objectCount = parseWeightedPoolEntries(content);
  const choiceCountMatch = content.match(/drawForSelection\(count: number = (\d+)\)/);
  const choiceCount = choiceCountMatch?.[1] ? Number(choiceCountMatch[1]) : undefined;

  return {
    ...(typeof choiceCount === "number" && Number.isFinite(choiceCount) && choiceCount > 0
      ? { choiceCount: Math.floor(choiceCount) }
      : {}),
    ...(typeof objectCount === "number" ? { objectCount } : {}),
  };
}

function collectModuleArtifactPaths(existingFeature: RuneWeaverFeatureRecord): string[] {
  return dedupeStrings(
    (existingFeature.modules || []).flatMap((moduleRecord) => [
      ...(moduleRecord.ownedPaths || []),
      ...(moduleRecord.artifactPaths || []),
    ]),
  );
}

function collectKnownArtifactPaths(existingFeature: RuneWeaverFeatureRecord): string[] {
  return dedupeStrings([
    ...existingFeature.generatedFiles,
    ...collectModuleArtifactPaths(existingFeature),
  ]);
}

function extractAbilityNameFromPaths(paths: string[]): string | undefined {
  const abilityNames = dedupeStrings(
    paths
      .map((path) => path.replace(/\\/g, "/"))
      .filter((path) => path.includes("vscripts/rune_weaver/abilities/") && path.endsWith(".lua"))
      .map((path) => path.split("/").pop()?.replace(/\.lua$/i, "")),
  );

  return abilityNames.length === 1 ? abilityNames[0] : undefined;
}

function extractRealizationKinds(paths: string[]): string[] {
  const kinds = new Set<string>();
  for (const path of paths) {
    const normalized = path.replace(/\\/g, "/");
    if (normalized.endsWith(".lua")) {
      kinds.add("lua");
    } else if (normalized.endsWith("npc_abilities_custom.txt")) {
      kinds.add("kv");
    } else if (normalized.endsWith(".tsx") || normalized.endsWith(".less")) {
      kinds.add("ui");
    } else if (normalized.endsWith(".ts")) {
      kinds.add(normalized.includes("/generated/shared/") ? "shared-ts" : "ts");
    }
  }

  return [...kinds];
}

export function extractCurrentFeatureBoundedTruth(input: {
  existingFeature: RuneWeaverFeatureRecord;
  hostRoot: string;
  sourceArtifact?: Record<string, unknown>;
}): CurrentFeatureBoundedTruth {
  const { existingFeature, hostRoot, sourceArtifact } = input;
  const boundedFields: CurrentFeatureBoundedTruth = {};

  applySourceBackedSnapshot(boundedFields, existingFeature, sourceArtifact);

  const integrationTriggerKey = extractTriggerKeyFromIntegrationPoints(existingFeature);
  if (integrationTriggerKey && !boundedFields.triggerKey) {
    boundedFields.triggerKey = integrationTriggerKey;
  }

  const weightedPoolTruth = readWeightedPoolBoundedTruth(hostRoot, existingFeature);
  if (typeof weightedPoolTruth.choiceCount === "number" && typeof boundedFields.choiceCount !== "number") {
    boundedFields.choiceCount = weightedPoolTruth.choiceCount;
  }
  if (typeof weightedPoolTruth.objectCount === "number" && typeof boundedFields.objectCount !== "number") {
    boundedFields.objectCount = weightedPoolTruth.objectCount;
  }

  const bundleIds = dedupeStrings((existingFeature.modules || []).map((moduleRecord) => moduleRecord.bundleId));
  if (bundleIds.length > 0) {
    boundedFields.bundleIds = bundleIds;
  }

  const artifactPaths = collectKnownArtifactPaths(existingFeature);
  const abilityName = extractAbilityNameFromPaths(artifactPaths);
  if (abilityName) {
    boundedFields.abilityName = abilityName;
  }

  if (artifactPaths.some((path) => path.replace(/\\/g, "/").includes("vscripts/rune_weaver/abilities/") && path.endsWith(".lua"))) {
    boundedFields.hasLuaAbilityShell = true;
  }

  if (artifactPaths.some((path) => path.replace(/\\/g, "/").endsWith("game/scripts/npc/npc_abilities_custom.txt"))) {
    boundedFields.hasAbilityKvParticipation = true;
  }

  const realizationKinds = extractRealizationKinds(artifactPaths);
  if (realizationKinds.length > 0) {
    boundedFields.realizationKinds = realizationKinds;
  }

  return boundedFields;
}
