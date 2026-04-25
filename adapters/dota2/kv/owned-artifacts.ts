import type { WritePlan, WritePlanEntry } from "../assembler/index.js";
import type { FeatureOwnedArtifact, RuneWeaverFeatureRecord } from "../../../core/workspace/types.js";
import {
  ABILITY_KV_AGGREGATE_TARGET_PATH,
  DOTA2_ABILITY_KV_AGGREGATE_OWNER,
  buildAbilityKvFragmentPath,
  extractAbilityNameFromLuaPath,
  isAbilityKvAggregatePath,
  isAbilityKvFragmentPath,
  normalizeAbilityKvAggregateTargetPath,
  resolveAbilityKvScriptFile,
} from "./contract.js";

function dedupeStrings(values: Array<string | undefined>): string[] {
  return [...new Set(values.filter((value): value is string => Boolean(value && value.trim().length > 0)))];
}

function normalizePath(path: string): string {
  return path.replace(/\\/g, "/");
}

function resolveEntryAbilityName(entry: WritePlanEntry): string | undefined {
  const metadataAbilityName = entry.metadata?.abilityName;
  if (typeof metadataAbilityName === "string" && metadataAbilityName.trim().length > 0) {
    return metadataAbilityName.trim();
  }

  const parameterAbilityName = entry.parameters?.abilityName;
  if (typeof parameterAbilityName === "string" && parameterAbilityName.trim().length > 0) {
    return parameterAbilityName.trim();
  }

  const fileName = normalizePath(entry.targetPath).split("/").pop();
  return fileName?.replace(/\.kv\.txt$/i, "");
}

function isSourceModelEntry(entry: WritePlanEntry): boolean {
  return entry.sourcePattern === "rw.feature_source_model" || Boolean(entry.metadata?.sourceModelRef);
}

export function isAbilityKvFragmentEntry(entry: WritePlanEntry): boolean {
  return !entry.deferred && (
    entry.metadata?.kvArtifactKind === "fragment"
    || isAbilityKvFragmentPath(entry.targetPath)
  );
}

export function buildWritePlanGeneratedFiles(writePlan: WritePlan): string[] {
  const executableEntries = writePlan.entries.filter((entry) => !entry.deferred);
  const generatedFiles = new Set<string>();
  let hasKvFragment = false;

  for (const entry of executableEntries) {
    generatedFiles.add(entry.targetPath);
    if (isAbilityKvFragmentEntry(entry)) {
      hasKvFragment = true;
      generatedFiles.add(
        normalizeAbilityKvAggregateTargetPath(
          typeof entry.metadata?.aggregateTargetPath === "string"
            ? entry.metadata.aggregateTargetPath
            : undefined,
        ),
      );
    }
  }

  if (hasKvFragment) {
    generatedFiles.add(ABILITY_KV_AGGREGATE_TARGET_PATH);
  }

  return [...generatedFiles];
}

export function buildOwnedArtifactsFromWritePlan(input: {
  writePlan: WritePlan;
  sourceModelPath?: string;
  sourceModelAdapter?: string;
  sourceModelVersion?: number;
}): FeatureOwnedArtifact[] {
  const artifacts: FeatureOwnedArtifact[] = [];
  const executableEntries = input.writePlan.entries.filter((entry) => !entry.deferred);
  const aggregateTargets = new Set<string>();

  for (const entry of executableEntries) {
    if (isAbilityKvFragmentEntry(entry)) {
      const abilityName = resolveEntryAbilityName(entry);
      if (!abilityName) {
        continue;
      }
      const aggregateTargetPath =
        normalizeAbilityKvAggregateTargetPath(
          typeof entry.metadata?.aggregateTargetPath === "string"
            ? entry.metadata.aggregateTargetPath
            : undefined,
        );
      aggregateTargets.add(aggregateTargetPath);
      artifacts.push({
        kind: "ability_kv_fragment",
        path: entry.targetPath,
        aggregateTargetPath,
        abilityName,
        scriptFile:
          typeof entry.metadata?.scriptFile === "string" && entry.metadata.scriptFile.trim().length > 0
            ? entry.metadata.scriptFile
            : resolveAbilityKvScriptFile(abilityName),
        managedBy: DOTA2_ABILITY_KV_AGGREGATE_OWNER,
      });
      continue;
    }

    if (isAbilityKvAggregatePath(entry.targetPath)) {
      continue;
    }
    if (isSourceModelEntry(entry)) {
      continue;
    }

    artifacts.push({
      kind: "generated_file",
      path: entry.targetPath,
    });
  }

  if (input.sourceModelPath) {
    artifacts.push({
      kind: "rw_source_model",
      path: input.sourceModelPath,
      adapter: input.sourceModelAdapter,
      version: input.sourceModelVersion,
    });
  }

  for (const path of aggregateTargets) {
    artifacts.push({
      kind: "materialized_aggregate",
      path,
      managedBy: DOTA2_ABILITY_KV_AGGREGATE_OWNER,
    });
  }

  return artifacts;
}

function resolveLegacyAbilityName(feature: RuneWeaverFeatureRecord): string | undefined {
  const generatedAbilityName = dedupeStrings(feature.generatedFiles.map(extractAbilityNameFromLuaPath));
  if (generatedAbilityName.length === 1) {
    return generatedAbilityName[0];
  }

  const moduleAbilityName = dedupeStrings(
    (feature.modules || []).flatMap((moduleRecord) => [
      ...(moduleRecord.ownedPaths || []).map(extractAbilityNameFromLuaPath),
      ...(moduleRecord.artifactPaths || []).map(extractAbilityNameFromLuaPath),
    ]),
  );
  return moduleAbilityName.length === 1 ? moduleAbilityName[0] : undefined;
}

export function resolveFeatureOwnedArtifacts(feature: RuneWeaverFeatureRecord): FeatureOwnedArtifact[] {
  if (feature.ownedArtifacts && feature.ownedArtifacts.length > 0) {
    return feature.ownedArtifacts.map((artifact) => {
      if (artifact.kind === "ability_kv_fragment") {
        return {
          ...artifact,
          aggregateTargetPath: normalizeAbilityKvAggregateTargetPath(artifact.aggregateTargetPath),
        };
      }
      if (artifact.kind === "materialized_aggregate") {
        return {
          ...artifact,
          path: normalizeAbilityKvAggregateTargetPath(artifact.path),
        };
      }
      return artifact;
    });
  }

  const artifacts: FeatureOwnedArtifact[] = [];
  for (const path of feature.generatedFiles) {
    if (isAbilityKvAggregatePath(path)) {
      continue;
    }
    artifacts.push({
      kind: "generated_file",
      path,
    });
  }

  if (feature.sourceModel?.path) {
    artifacts.push({
      kind: "rw_source_model",
      path: feature.sourceModel.path,
      adapter: feature.sourceModel.adapter,
      version: feature.sourceModel.version,
    });
  }

  if (feature.generatedFiles.some((path) => isAbilityKvAggregatePath(path))) {
    const abilityName = resolveLegacyAbilityName(feature);
    if (abilityName) {
      artifacts.push({
        kind: "ability_kv_fragment",
        path: buildAbilityKvFragmentPath(feature.featureId, abilityName),
        aggregateTargetPath: ABILITY_KV_AGGREGATE_TARGET_PATH,
        abilityName,
        scriptFile: resolveAbilityKvScriptFile(abilityName),
        managedBy: DOTA2_ABILITY_KV_AGGREGATE_OWNER,
      });
      artifacts.push({
        kind: "materialized_aggregate",
        path: ABILITY_KV_AGGREGATE_TARGET_PATH,
        managedBy: DOTA2_ABILITY_KV_AGGREGATE_OWNER,
      });
    } else {
      artifacts.push({
        kind: "generated_file",
        path: ABILITY_KV_AGGREGATE_TARGET_PATH,
      });
    }
  }

  return artifacts;
}

export function getOwnedArtifactPaths(feature: RuneWeaverFeatureRecord): string[] {
  return resolveFeatureOwnedArtifacts(feature).map((artifact) => artifact.path);
}

export function getAbilityKvFragmentPaths(feature: RuneWeaverFeatureRecord): string[] {
  return resolveFeatureOwnedArtifacts(feature)
    .filter((artifact): artifact is Extract<FeatureOwnedArtifact, { kind: "ability_kv_fragment" }> => artifact.kind === "ability_kv_fragment")
    .map((artifact) => artifact.path);
}
