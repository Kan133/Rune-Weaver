import { existsSync, readFileSync } from "fs";
import { join } from "path";

import { calculateHostWriteExecutionOrder } from "../../../core/host/write-plan.js";
import type { GovernedUpdateExecutionView, UpdateIntent } from "../../../core/schema/types.js";
import type { RuneWeaverFeatureRecord } from "../../../core/workspace/types.js";
import { requireGovernedUpdateExecutionView } from "../../../core/blueprint/update-execution-view.js";
import type { WritePlan, WritePlanEntry } from "../assembler/index.js";
import { parseAbilityBlocks } from "../kv/aggregate-writer.js";
import {
  ABILITY_KV_AGGREGATE_TARGET_PATH,
  isAbilityKvAggregatePath,
  isAbilityKvFragmentPath,
} from "../kv/contract.js";
import { resolveFeatureOwnedArtifacts } from "../kv/owned-artifacts.js";

export interface PreservedWritePlanArtifact {
  targetPath: string;
  contentType: "lua" | "kv";
  moduleId: string;
  reason: string;
  bundleId?: string;
}

export interface PreservedWritePlanArtifacts {
  preserved: PreservedWritePlanArtifact[];
  prunedPaths: string[];
  skippedReasons: string[];
}

interface PreservableArtifactCandidate {
  targetPath: string;
  contentType: "lua" | "kv";
  moduleId: string;
  bundleId?: string;
  abilityName?: string;
  scriptFile?: string;
  aggregateTargetPath?: string;
  reason: string;
}

function dedupeStrings(values: Array<string | undefined>): string[] {
  return [...new Set(values.filter((value): value is string => Boolean(value && value.trim().length > 0)))];
}

function normalizePath(path: string): string {
  return path.replace(/\\/g, "/").toLowerCase();
}

function resolveArtifactPath(hostRoot: string, targetPath: string): string {
  return /^[A-Za-z]:[\\/]/.test(targetPath)
    ? targetPath
    : join(hostRoot, targetPath);
}

function isGameplayShellArtifactPath(path: string): path is string {
  const normalized = path.replace(/\\/g, "/");
  return (
    normalized.endsWith(".lua")
    && normalized.includes("game/scripts/vscripts/rune_weaver/abilities/")
  ) || isAbilityKvFragmentPath(normalized) || isAbilityKvAggregatePath(normalized);
}

function classifyArtifactContentType(path: string): "lua" | "kv" | undefined {
  const normalized = path.replace(/\\/g, "/");
  if (normalized.endsWith(".lua")) {
    return "lua";
  }
  if (isAbilityKvFragmentPath(normalized) || isAbilityKvAggregatePath(normalized)) {
    return "kv";
  }
  return undefined;
}

function findModuleRecordForPreservedArtifact(
  existingFeature: RuneWeaverFeatureRecord,
  candidatePath: string,
  abilityName?: string,
): Pick<PreservableArtifactCandidate, "moduleId" | "bundleId"> {
  const normalizedCandidatePath = normalizePath(candidatePath);

  for (const moduleRecord of existingFeature.modules || []) {
    if (moduleRecord.sourceKind !== "synthesized") {
      continue;
    }

    const artifactPaths = dedupeStrings([
      ...(moduleRecord.ownedPaths || []),
      ...(moduleRecord.artifactPaths || []),
    ]);
    if (artifactPaths.some((artifactPath) => normalizePath(artifactPath) === normalizedCandidatePath)) {
      return {
        moduleId: moduleRecord.moduleId,
        bundleId: moduleRecord.bundleId,
      };
    }

    if (
      abilityName
      && artifactPaths.some((artifactPath) => normalizePath(artifactPath).includes(`${abilityName.toLowerCase()}.`))
    ) {
      return {
        moduleId: moduleRecord.moduleId,
        bundleId: moduleRecord.bundleId,
      };
    }
  }

  return {
    moduleId: "preserved_runtime_shell",
  };
}

function collectPreservableCandidates(
  existingFeature: RuneWeaverFeatureRecord,
): PreservableArtifactCandidate[] {
  return resolveFeatureOwnedArtifacts(existingFeature).flatMap((artifact) => {
    if (artifact.kind === "materialized_aggregate") {
      return [];
    }
    if (artifact.kind === "generated_file" && !isGameplayShellArtifactPath(artifact.path)) {
      return [];
    }
    if (artifact.kind !== "generated_file" && artifact.kind !== "ability_kv_fragment") {
      return [];
    }

    const contentType =
      artifact.kind === "ability_kv_fragment"
        ? "kv"
        : classifyArtifactContentType(artifact.path);
    if (!contentType) {
      return [];
    }

    const moduleRef = findModuleRecordForPreservedArtifact(
      existingFeature,
      artifact.path,
      artifact.kind === "ability_kv_fragment" ? artifact.abilityName : undefined,
    );

    return [{
      targetPath: artifact.path,
      contentType,
      moduleId: moduleRef.moduleId,
      bundleId: moduleRef.bundleId,
      abilityName: artifact.kind === "ability_kv_fragment" ? artifact.abilityName : undefined,
      scriptFile: artifact.kind === "ability_kv_fragment" ? artifact.scriptFile : undefined,
      aggregateTargetPath: artifact.kind === "ability_kv_fragment" ? artifact.aggregateTargetPath : undefined,
      reason: `Preserve existing synthesized ${contentType} gameplay shell for module '${moduleRef.moduleId}'.`,
    }] satisfies PreservableArtifactCandidate[];
  });
}

function hasCrossFeatureMutationSignal(executionView: GovernedUpdateExecutionView): boolean {
  const compositionDependencies = executionView.governedChange.composition?.dependencies || [];
  const operations = executionView.governedChange.outcomes?.operations || [];

  return compositionDependencies.some((dependency) => dependency.kind === "cross-feature")
    || operations.includes("grant-feature")
    || executionView.semanticAnalysis.governanceDecisions.scope.value === "cross_feature_mutation";
}

function hasRealizationRewriteSignal(executionView: GovernedUpdateExecutionView): boolean {
  return executionView.semanticAnalysis.governanceDecisions.scope.value === "rewrite";
}

function hasExplicitShellMutationSignal(executionView: GovernedUpdateExecutionView): boolean {
  const authority = executionView.semanticAnalysis.governanceDecisions.mutationAuthority.value;
  const governedItems = [
    ...authority.add,
    ...authority.modify,
    ...authority.remove,
    ...executionView.delta.add,
    ...executionView.delta.modify,
    ...executionView.delta.remove,
  ];
  return governedItems.some((item) =>
    item.kind === "composition"
    || item.kind === "integration"
    || /\b(?:ability|shell|runtime|lua|kv|script|realization|bridge|grant|dependency)\b/iu.test(item.path)
    || /\b(?:ability|shell|runtime|lua|kv|script|realization|bridge|grant|dependency)\b/iu.test(item.summary),
  );
}

function shouldPreserveExistingGameplayShell(
  updateIntent: UpdateIntent,
  executionView: GovernedUpdateExecutionView,
): PreservedWritePlanArtifacts {
  const skippedReasons: string[] = [];
  const boundedFields = updateIntent.currentFeatureTruth?.boundedFields || updateIntent.currentFeatureContext.boundedFields;
  const hasExistingShell =
    boundedFields.hasLuaAbilityShell === true || boundedFields.hasAbilityKvParticipation === true;

  if (!hasExistingShell) {
    skippedReasons.push("Current feature context does not expose an existing Lua/KV gameplay shell to preserve.");
  }
  if (hasCrossFeatureMutationSignal(executionView)) {
    skippedReasons.push("Update requests cross-feature mutation authority, so gameplay shell carry-forward is disabled.");
  }
  if (hasRealizationRewriteSignal(executionView)) {
    skippedReasons.push("Update governance classifies this round as a realization rewrite, so gameplay shell carry-forward is disabled.");
  }
  if (hasExplicitShellMutationSignal(executionView)) {
    skippedReasons.push("Update delta contains explicit shell/runtime/integration mutation signals, so gameplay shell carry-forward is disabled.");
  }

  return {
    preserved: [],
    prunedPaths: [],
    skippedReasons,
  };
}

function resolveAbilityName(
  updateIntent: UpdateIntent,
  existingFeature: RuneWeaverFeatureRecord,
): string | undefined {
  const boundedAbilityName = updateIntent.currentFeatureContext.boundedFields.abilityName;
  if (typeof boundedAbilityName === "string" && boundedAbilityName.trim().length > 0) {
    return boundedAbilityName;
  }

  const luaPath = existingFeature.generatedFiles.find((candidate) =>
    candidate.replace(/\\/g, "/").includes("game/scripts/vscripts/rune_weaver/abilities/") && candidate.endsWith(".lua"),
  );
  return luaPath
    ? luaPath.replace(/\\/g, "/").split("/").pop()?.replace(/\.lua$/i, "")
    : undefined;
}

function resolvePreservedTriggerKey(updateIntent: UpdateIntent): string | undefined {
  const executionView = requireGovernedUpdateExecutionView(
    updateIntent,
    "Dota2 preserved trigger-key resolution",
  );
  const currentTriggerKey =
    typeof updateIntent.currentFeatureTruth?.boundedFields.triggerKey === "string"
      ? updateIntent.currentFeatureTruth.boundedFields.triggerKey.trim().toUpperCase()
      : typeof updateIntent.currentFeatureContext.boundedFields.triggerKey === "string"
        ? updateIntent.currentFeatureContext.boundedFields.triggerKey.trim().toUpperCase()
      : undefined;
  const hasTriggerRebind = [...updateIntent.delta.modify, ...updateIntent.delta.add].some((item) =>
    item.path === "input.triggerKey" && item.kind === "trigger",
  );
  if (!hasTriggerRebind) {
    return undefined;
  }

  const activation = (executionView.governedChange.interaction?.activations || []).find((item) => item.kind === "key");
  const requestedTriggerKey =
    (typeof activation?.input === "string" ? activation.input.trim().toUpperCase() : undefined)
    || (typeof executionView.governedChange.parameters?.triggerKey === "string"
      ? executionView.governedChange.parameters.triggerKey.trim().toUpperCase()
      : undefined)
    || (typeof updateIntent.delta.modify.find((item) => item.path === "input.triggerKey")?.newValue === "string"
      ? String(updateIntent.delta.modify.find((item) => item.path === "input.triggerKey")?.newValue).trim().toUpperCase()
      : typeof updateIntent.delta.modify.find((item) => item.path === "input.triggerKey")?.summary === "string"
        ? updateIntent.delta.modify
            .find((item) => item.path === "input.triggerKey")
            ?.summary.match(/\b(F\d+|[A-Z])\b/i)?.[1]?.toUpperCase()
      : undefined);
  if (!requestedTriggerKey || requestedTriggerKey === currentTriggerKey) {
    return undefined;
  }

  return requestedTriggerKey;
}

function rebindPreservedLuaTriggerKey(
  content: string,
  updateIntent: UpdateIntent,
): string {
  const requestedTriggerKey = resolvePreservedTriggerKey(updateIntent);
  if (!requestedTriggerKey) {
    return content;
  }

  return content
    .replace(/(\bTRIGGER_KEY\s*=\s*["'])([^"']+)(["'])/g, `$1${requestedTriggerKey}$3`)
    .replace(/(\btriggerKey\s*=\s*["'])([^"']+)(["'])/g, `$1${requestedTriggerKey}$3`);
}

function resolvePreservedKvContent(
  hostRoot: string,
  candidate: PreservableArtifactCandidate,
): string | undefined {
  const fullPath = resolveArtifactPath(hostRoot, candidate.targetPath);
  if (existsSync(fullPath)) {
    return readFileSync(fullPath, "utf-8");
  }

  if (!candidate.abilityName) {
    return undefined;
  }

  const aggregateTargetPath = candidate.aggregateTargetPath || ABILITY_KV_AGGREGATE_TARGET_PATH;
  const aggregateFullPath = resolveArtifactPath(hostRoot, aggregateTargetPath);
  if (!existsSync(aggregateFullPath)) {
    return undefined;
  }

  const aggregateContent = readFileSync(aggregateFullPath, "utf-8");
  return parseAbilityBlocks(aggregateContent).get(candidate.abilityName);
}

function buildPreservedEntry(input: {
  candidate: PreservableArtifactCandidate;
  content: string;
  abilityName?: string;
}): WritePlanEntry {
  const { candidate, content, abilityName } = input;
  const preservedAbilityName = candidate.abilityName || abilityName;
  return {
    operation: "update",
    targetPath: candidate.targetPath,
    contentType: candidate.contentType,
    contentSummary: candidate.reason,
    sourcePattern: `synthesized.${candidate.moduleId}.${candidate.contentType}`,
    sourceModule: candidate.moduleId,
    safe: true,
    generatorFamilyHint: candidate.contentType === "lua" ? "dota2-lua" : "dota2-kv",
    metadata: {
      ...(candidate.bundleId ? { bundleId: candidate.bundleId } : {}),
      ...(preservedAbilityName ? { abilityName: preservedAbilityName } : {}),
      ...(candidate.contentType === "kv"
        ? {
            kvArtifactKind: "fragment",
            aggregateTargetPath: candidate.aggregateTargetPath || ABILITY_KV_AGGREGATE_TARGET_PATH,
            ...(candidate.scriptFile ? { scriptFile: candidate.scriptFile } : {}),
          }
        : {}),
      synthesizedContent: content,
      preservedFromExistingFeature: true,
      preservedArtifactReason: candidate.reason,
    },
  };
}

function recalculateWritePlan(writePlan: WritePlan): void {
  writePlan.executionOrder = calculateHostWriteExecutionOrder(writePlan.entries);
  writePlan.stats = {
    total: writePlan.entries.length,
    create: writePlan.entries.filter((entry) => entry.operation === "create").length,
    update: writePlan.entries.filter((entry) => entry.operation === "update").length,
    conflicts: writePlan.entries.filter(
      (entry) => !entry.safe || (entry.conflicts && entry.conflicts.length > 0),
    ).length,
    deferred: writePlan.entries.filter((entry) => entry.deferred).length,
  };
}

function pruneGameplayShellRewriteAttempts(writePlan: WritePlan): string[] {
  const prunedPaths: string[] = [];
  writePlan.entries = writePlan.entries.filter((entry) => {
    if (!isGameplayShellArtifactPath(entry.targetPath)) {
      return true;
    }

    prunedPaths.push(entry.targetPath);
    return false;
  });

  return dedupeStrings(prunedPaths);
}

export function preserveDota2UpdateWritePlanArtifacts(input: {
  hostRoot: string;
  updateIntent: UpdateIntent;
  existingFeature: RuneWeaverFeatureRecord;
  writePlan: WritePlan;
}): PreservedWritePlanArtifacts {
  const { hostRoot, updateIntent, existingFeature, writePlan } = input;
  const executionView = requireGovernedUpdateExecutionView(
    updateIntent,
    "Dota2 update write-plan preservation",
  );
  const gating = shouldPreserveExistingGameplayShell(updateIntent, executionView);
  if (gating.skippedReasons.length > 0) {
    return gating;
  }

  const prunedPaths = pruneGameplayShellRewriteAttempts(writePlan);
  const plannedPaths = new Set(writePlan.entries.map((entry) => normalizePath(entry.targetPath)));
  const abilityName = resolveAbilityName(updateIntent, existingFeature);
  const preserved: PreservedWritePlanArtifact[] = [];
  const skippedReasons: string[] = [];

  for (const candidate of collectPreservableCandidates(existingFeature)) {
    if (plannedPaths.has(normalizePath(candidate.targetPath))) {
      continue;
    }

    const content = candidate.contentType === "kv"
      ? resolvePreservedKvContent(hostRoot, candidate)
      : (() => {
          const fullPath = resolveArtifactPath(hostRoot, candidate.targetPath);
          if (!existsSync(fullPath)) {
            return undefined;
          }
          return rebindPreservedLuaTriggerKey(
            readFileSync(fullPath, "utf-8"),
            updateIntent,
          );
        })();
    if (typeof content !== "string") {
      skippedReasons.push(`Cannot preserve '${candidate.targetPath}' because the current host content is missing.`);
      continue;
    }
    writePlan.entries.push(buildPreservedEntry({
      candidate,
      content,
      abilityName,
    }));
    plannedPaths.add(normalizePath(candidate.targetPath));
    preserved.push({
      targetPath: candidate.targetPath,
      contentType: candidate.contentType,
      moduleId: candidate.moduleId,
      reason: candidate.reason,
      ...(candidate.bundleId ? { bundleId: candidate.bundleId } : {}),
    });
  }

  if (preserved.length > 0) {
    recalculateWritePlan(writePlan);
  }

  return {
    preserved,
    prunedPaths,
    skippedReasons,
  };
}
