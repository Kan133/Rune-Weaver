/**
 * Dota2 CLI - Artifact and Verdict Builder Helpers
 *
 * T120: Split Prep - Extract low-risk artifact assembly logic from dota2-cli.ts
 * T139: Artifact/Verdict Extraction - Phase B
 *
 * This module contains pure assembly / formatting helpers only.
 * No execution policy, no routing policy, no host realization logic.
 *
 * Split Principle (per DOTA2-CLI-SPLIT-PLAN.md):
 * - CLI should become a command orchestration shell
 * - Artifact construction and verdict calculation should be unified
 * - Stage-specific business logic should move to dedicated modules
 */

import type { Dota2ReviewArtifact } from "../dota2-cli.js";
import type { WritePlan, WritePlanEntry } from "../../../adapters/dota2/assembler/index.js";
import type { KVGeneratorInput } from "../../../adapters/dota2/generator/kv/types.js";
import { generateAbilityKV } from "../../../adapters/dota2/generator/kv/index.js";
import { generateCode } from "../../../adapters/dota2/generator/index.js";

export type FeatureMode = "create" | "update" | "regenerate";

export interface VerdictInput {
  stages: Dota2ReviewArtifact["stages"];
  options: {
    force: boolean;
    dryRun: boolean;
  };
  writePlan: WritePlan | null;
  runtimeValidationResult: {
    success: boolean;
    skipped?: boolean;
  };
  workspaceStateResult: {
    success: boolean;
    error?: string;
    skipped?: boolean;
  };
  hostValidationDetails: Record<string, unknown>;
}

export type CompletionKind = "default-safe" | "forced" | "partial" | "requires-regenerate";

export interface VerdictResult {
  pipelineComplete: boolean;
  completionKind: CompletionKind;
  weakestStage: string;
  sufficientForDemo: boolean;
  hasUnresolvedPatterns: boolean;
  wasForceOverride: boolean;
  remainingRisks: string[];
  nextSteps: string[];
}

export function calculateFinalVerdict(input: VerdictInput): VerdictResult {
  const { stages, options, writePlan, runtimeValidationResult, workspaceStateResult, hostValidationDetails } = input;
  const { force, dryRun } = options;

  const coreStages = [
    stages.intentSchema,
    stages.blueprint,
    stages.patternResolution,
    stages.assemblyPlan,
    stages.hostRealization,
    stages.generatorRouting,
    stages.generator,
    stages.writeExecutor,
    stages.hostValidation,
    stages.runtimeValidation,
    stages.workspaceState,
  ];

  const allStagesSuccess = coreStages.every((s) => s && (s as { success: boolean }).success);
  const hasUnresolvedPatterns = stages.patternResolution.unresolvedPatterns.length > 0;
  const wasForceOverride = force && stages.assemblyPlan.readyForHostWrite === false;
  const featureFilesCreated = (hostValidationDetails.featureFilesCount as number) > 0;
  const wsFailed = !workspaceStateResult.success && !workspaceStateResult.skipped;
  const runtimeFailed = !runtimeValidationResult.success && !dryRun;

  let completionKind: CompletionKind = "partial";
  if (allStagesSuccess && !hasUnresolvedPatterns && !wasForceOverride && stages.assemblyPlan.readyForHostWrite && !wsFailed && !runtimeFailed) {
    completionKind = "default-safe";
  } else if (allStagesSuccess && wasForceOverride && !wsFailed && !runtimeFailed) {
    completionKind = "forced";
  } else if (allStagesSuccess && hasUnresolvedPatterns && !wsFailed && !runtimeFailed) {
    completionKind = "partial";
  } else if (wsFailed || runtimeFailed) {
    completionKind = "partial";
  }

  const pipelineComplete =
    allStagesSuccess &&
    !wsFailed &&
    !runtimeFailed &&
    !hasUnresolvedPatterns &&
    !wasForceOverride &&
    stages.assemblyPlan.readyForHostWrite;

  const weakestStage =
    allStagesSuccess && !wsFailed
      ? "none"
      : wsFailed
        ? "workspaceState"
        : (Object.entries(stages) as [string, unknown][])
            .filter(([k, s]) => k !== "cleanupPlan" && typeof s === "object" && s !== null && "success" in s && !(s as { success: boolean }).success)
            .map(([k]) => k)[0] || "unknown";

  const sufficientForDemo =
    completionKind === "default-safe" &&
    stages.hostValidation.success &&
    featureFilesCreated &&
    !wsFailed;

  const risks: string[] = [...(stages.hostValidation.issues || [])];
  if (hasUnresolvedPatterns) {
    risks.push(`Has ${stages.patternResolution.unresolvedPatterns.length} unresolved patterns`);
  }
  if (wasForceOverride) {
    risks.push("Execution required --force override");
  }
  if (!featureFilesCreated) {
    risks.push("Feature-specific files could not be identified");
  }
  if (wsFailed) {
    risks.push(`Workspace state update failed: ${workspaceStateResult.error}`);
  }

  const routingPlan = stages.generatorRouting;
  if (routingPlan && !routingPlan.success && routingPlan.blockers?.length > 0) {
    const kvBlocked = routingPlan.blockers.some((b: string) => b.includes("KV route"));
    if (kvBlocked) {
      risks.push("KV routes blocked - dota2-kv generator not yet implemented (transitional gap)");
    } else {
      risks.push(...routingPlan.blockers);
    }
  }

  const nextSteps: string[] = [];
  if (wsFailed) {
    nextSteps.push("Fix workspace state update failure");
  }
  if (completionKind === "partial") {
    if (hasUnresolvedPatterns) {
      nextSteps.push("Add missing patterns to resolve all pattern hints");
    }
    if (!featureFilesCreated) {
      nextSteps.push("Improve feature file identification");
    }
  }
  if (completionKind === "forced") {
    nextSteps.push("Resolve blockers to enable default-safe execution");
  }
  if (completionKind === "default-safe") {
    nextSteps.push("Host runtime validation");
    nextSteps.push("Rollback support");
  }
  if (routingPlan && !routingPlan.success && routingPlan.blockers?.some((b: string) => b.includes("KV route"))) {
    nextSteps.push("Implement dota2-kv generator to unblock KV routes");
  }

  return {
    pipelineComplete,
    completionKind,
    weakestStage,
    sufficientForDemo,
    hasUnresolvedPatterns,
    wasForceOverride,
    remainingRisks: risks,
    nextSteps: nextSteps.length > 0 ? nextSteps : ["Improve pipeline completeness"],
  };
}

export function buildDeferredEntriesInfo(entries: WritePlanEntry[]): Array<{ pattern: string; reason: string }> {
  return entries
    .filter((e: WritePlanEntry) => e.deferred)
    .map((e: WritePlanEntry) => ({
      pattern: e.sourcePattern,
      reason: e.deferredReason || "Generator not yet implemented",
    }));
}

export function buildGeneratorStage(
  writePlan: WritePlan | null,
  issues: string[]
): Dota2ReviewArtifact["stages"]["generator"] {
  const entries: WritePlanEntry[] = writePlan?.entries || [];
  const deferredEntries = entries.filter((e: WritePlanEntry) => e.deferred);
  const executableEntries = entries.filter((e: WritePlanEntry) => !e.deferred);

  const kvEntries = executableEntries.filter((e: WritePlanEntry) => e.contentType === "kv");
  const nonKvEntries = executableEntries.filter((e: WritePlanEntry) => e.contentType !== "kv");

  const kvTargetPaths = new Set(kvEntries.map((e: WritePlanEntry) => e.targetPath));
  const aggregatedKvFiles = Array.from(kvTargetPaths);

  const nonKvFiles = nonKvEntries.map((e: WritePlanEntry) => e.targetPath);

  const generatedFiles = [...nonKvFiles, ...aggregatedKvFiles];

  return {
    success: writePlan !== null,
    generatedFiles,
    deferredEntries: buildDeferredEntriesInfo(deferredEntries),
    issues,
    realizationContext: writePlan?.realizationContext,
  };
}

export function computeAbilityName(entry: WritePlanEntry, index: number): string {
  const metadataAbilityName = entry.metadata?.abilityName;
  if (typeof metadataAbilityName === "string" && metadataAbilityName.trim().length > 0) {
    return metadataAbilityName;
  }

  const parameterAbilityName = entry.parameters?.abilityName;
  if (typeof parameterAbilityName === "string" && parameterAbilityName.trim().length > 0) {
    return parameterAbilityName;
  }

  const patternSegment = entry.sourcePattern.includes(".")
    ? entry.sourcePattern.split(".").pop() || entry.sourcePattern
    : entry.sourcePattern;
  const baseName = patternSegment;
  const featureMatch =
    entry.targetPath.match(/(standalone_system_[a-z0-9]+)/i) ||
    entry.targetPath.match(/(micro_feature_[a-z0-9]+)/i) ||
    entry.targetPath.match(/(feature_[a-z0-9]+)/i);
  const featureSegment = featureMatch?.[1] || null;
  return featureSegment
    ? `rw_${featureSegment}_${baseName}_${index}`
    : `rw_${baseName}_${index}`;
}

export function generateKVContentWithIndex(entry: WritePlanEntry, index: number): string {
  const abilityName = computeAbilityName(entry, index);

  const entryMetadata = entry.metadata || {};
  const params = {
    cooldown: entryMetadata.abilityCooldown != null 
      ? String(entryMetadata.abilityCooldown) 
      : undefined,
    manaCost: entryMetadata.abilityManaCost != null 
      ? String(entryMetadata.abilityManaCost) 
      : undefined,
    duration: entryMetadata.abilityDuration != null 
      ? String(entryMetadata.abilityDuration) 
      : undefined,
    castRange: entryMetadata.abilityCastRange != null 
      ? String(entryMetadata.abilityCastRange) 
      : undefined,
  };

  const kvInput: KVGeneratorInput = {
    routeId: `route_${entry.sourcePattern}_kv`,
    sourceUnitId: entry.sourceModule,
    generatorFamily: "dota2-kv",
    hostTarget: "ability_kv",
    abilityConfig: {
      abilityName,
      baseClass: "ability_lua",
      abilityType: "DOTA_ABILITY_TYPE_BASIC",
      behavior: "DOTA_ABILITY_BEHAVIOR_NO_TARGET",
      abilityCooldown: params.cooldown || "8.0",
      abilityManaCost: params.manaCost || "50",
      abilityCastRange: params.castRange || "0",
      abilityCastPoint: "0.1",
      maxLevel: "4",
      requiredLevel: "1",
      levelsBetweenUpgrades: "3",
      scriptFile: `rune_weaver/abilities/${abilityName}`,
      precache: [
        "particle://particles/units/heroes/hero_ogre_magi/ogre_magi_bloodlust_target.vpcf",
        "soundfile://soundevents/game_sounds_heroes/game_sounds_ogre_magi.vsndevts",
      ],
    },
    rationale: [
      `Generated from pattern: ${entry.sourcePattern}`,
      `Module: ${entry.sourceModule}`,
      `Feature: ${abilityName}`,
    ],
    blockers: entry.deferred ? [entry.deferredReason || "Entry marked deferred"] : [],
  };

  try {
    const kvOutput = generateAbilityKV(kvInput);
    console.log(`  [KV] Generated ability: ${kvOutput.abilityName} -> ${entry.targetPath}`);
    return kvOutput.kvBlock;
  } catch (error) {
    console.log(`  [KV] Error generating KV: ${error}`);
    return `// KV generation failed: ${error}\n`;
  }
}

export function generateKVContent(entry: WritePlanEntry): string {
  const patternSegment = entry.sourcePattern.includes(".")
    ? entry.sourcePattern.split(".").pop() || entry.sourcePattern
    : entry.sourcePattern;
  const baseName = patternSegment;
  const featureSegment = entry.targetPath.includes("feature_")
    ? entry.targetPath.match(/feature_([^/]+)/)?.[1]
    : entry.targetPath.includes("micro_feature_")
      ? entry.targetPath.match(/micro_feature_([^/]+)/)?.[1]
      : null;
  const abilityName = featureSegment
    ? `rw_${featureSegment}_${baseName}`
    : `rw_${baseName}`;

  const entryMetadata = entry.metadata || {};
  const params = {
    cooldown: entryMetadata.abilityCooldown != null 
      ? String(entryMetadata.abilityCooldown) 
      : undefined,
    manaCost: entryMetadata.abilityManaCost != null 
      ? String(entryMetadata.abilityManaCost) 
      : undefined,
    duration: entryMetadata.abilityDuration != null 
      ? String(entryMetadata.abilityDuration) 
      : undefined,
    castRange: entryMetadata.abilityCastRange != null 
      ? String(entryMetadata.abilityCastRange) 
      : undefined,
  };

  const kvInput: KVGeneratorInput = {
    routeId: `route_${entry.sourcePattern}_kv`,
    sourceUnitId: entry.sourceModule,
    generatorFamily: "dota2-kv",
    hostTarget: "ability_kv",
    abilityConfig: {
      abilityName,
      baseClass: "ability_datadriven",
      abilityType: "DOTA_ABILITY_TYPE_BASIC",
      behavior: "DOTA_ABILITY_BEHAVIOR_NO_TARGET",
      abilityCooldown: params.cooldown || "8.0",
      abilityManaCost: params.manaCost || "50",
      abilityCastRange: params.castRange || "0",
      abilityCastPoint: "0.1",
      maxLevel: "4",
      requiredLevel: "1",
      levelsBetweenUpgrades: "3",
      precache: [
        "particle://particles/units/heroes/hero_ogre_magi/ogre_magi_bloodlust_target.vpcf",
        "soundfile://soundevents/game_sounds_heroes/game_sounds_ogre_magi.vsndevts",
      ],
    },
    rationale: [
      `Generated from pattern: ${entry.sourcePattern}`,
      `Module: ${entry.sourceModule}`,
      `Feature: ${featureSegment}`,
    ],
    blockers: entry.deferred ? [entry.deferredReason || "Entry marked deferred"] : [],
  };

  try {
    const kvOutput = generateAbilityKV(kvInput);
    console.log(`  [KV] Generated ability: ${kvOutput.abilityName} -> ${entry.targetPath}`);
    return kvOutput.kvBlock;
  } catch (error) {
    console.log(`  [KV] Error generating KV: ${error}`);
    return `// KV generation failed: ${error}\n`;
  }
}

function deriveFeatureIdFromTargetPath(targetPath: string): string | null {
  const patterns = [
    /(micro_feature_[^_\/]+)/,
    /(standalone_system_[^_\/]+)/,
    /(feature_[^_\/]+)/,
  ];

  for (const pattern of patterns) {
    const match = targetPath.match(pattern);
    if (match?.[1]) {
      return match[1];
    }
  }

  return null;
}

export function generateCodeContent(entry: WritePlanEntry, stableFeatureId?: string): string {
  const familyHint = entry.generatorFamilyHint;

  if (entry.deferred) {
    return `// Deferred: ${entry.deferredReason || "Generator not yet implemented"}\n`;
  }

  switch (familyHint) {
    case "dota2-ui":
      break;

    case "dota2-kv":
      return generateKVContent(entry);

    case "bridge-support":
      return `// Bridge support: handled via bridge adapter\n`;

    case "dota2-lua":
      break;

    case "dota2-ts":
    default:
      break;
  }

  const resolvedFeatureId =
    stableFeatureId ||
    deriveFeatureIdFromTargetPath(entry.targetPath) ||
    entry.sourcePattern;

  const generated = generateCode(entry, resolvedFeatureId);
  return generated.content;
}

function getEntryExtension(entry: WritePlanEntry): string {
  switch (entry.contentType) {
    case "tsx":
      return ".tsx";
    case "less":
    case "css":
      return ".less";
    case "json":
      return ".json";
    case "lua":
      return ".lua";
    default:
      return ".ts";
  }
}

function getEntryQualifier(entry: WritePlanEntry): "ability" | "modifier" | "main" {
  if (entry.targetPath.endsWith("_ability.ts") || entry.contentSummary.includes("Ability")) {
    return "ability";
  }
  if (entry.targetPath.endsWith("_modifier.ts") || entry.contentSummary.includes("Modifier")) {
    return "modifier";
  }
  return "main";
}

function findCompatibleExistingTarget(
  entry: WritePlanEntry,
  existingPaths: string[],
  consumedExistingPaths: Set<string>
): string | null {
  const patternSegment = entry.sourcePattern.replace(/\./g, "_");
  const extension = getEntryExtension(entry);
  const qualifier = getEntryQualifier(entry);

  const entryIsServer = entry.targetPath.includes("/server/") || entry.targetPath.includes("\\server\\");
  const entryIsUI = entry.targetPath.includes("/ui/") || entry.targetPath.includes("\\ui\\");
  const entryIsShared = entry.targetPath.includes("/shared/") || entry.targetPath.includes("\\shared\\");

  const candidates = existingPaths.filter((path) => {
    if (consumedExistingPaths.has(path)) {
      return false;
    }
    if (!path.includes(patternSegment) || !path.endsWith(extension)) {
      return false;
    }

    const pathIsServer = path.includes("/server/") || path.includes("\\server\\");
    const pathIsUI = path.includes("/ui/") || path.includes("\\ui\\");
    const pathIsShared = path.includes("/shared/") || path.includes("\\shared\\");

    if (entryIsServer !== pathIsServer || entryIsUI !== pathIsUI || entryIsShared !== pathIsShared) {
      return false;
    }

    if (qualifier === "ability") {
      return path.endsWith("_ability.ts");
    }
    if (qualifier === "modifier") {
      return path.endsWith("_modifier.ts");
    }
    if (extension === ".ts") {
      return !path.endsWith("_ability.ts") && !path.endsWith("_modifier.ts");
    }

    return true;
  });

  return candidates.length === 1 ? candidates[0] : null;
}

export interface AlignWritePlanResult {
  ok: true;
}

export interface AlignWritePlanError {
  ok: false;
  issues: string[];
}

export type AlignWritePlanOutcome = AlignWritePlanResult | AlignWritePlanError;

export function alignWritePlanWithExistingFeature(
  writePlan: WritePlan,
  existingFeature: { generatedFiles: string[] },
  mode: FeatureMode
): AlignWritePlanOutcome {
  const consumedExistingPaths = new Set<string>();

  writePlan.entries = writePlan.entries.map((entry) => {
    if (existingFeature.generatedFiles.includes(entry.targetPath)) {
      consumedExistingPaths.add(entry.targetPath);
      return { ...entry, operation: "update" };
    }

    const remappedTarget = findCompatibleExistingTarget(entry, existingFeature.generatedFiles, consumedExistingPaths);
    if (remappedTarget) {
      consumedExistingPaths.add(remappedTarget);
      return {
        ...entry,
        targetPath: remappedTarget,
        operation: "update",
      };
    }

    return { ...entry, operation: "create" };
  });

  const plannedPaths = new Set(writePlan.entries.map((entry) => entry.targetPath));
  const orphanedPaths = existingFeature.generatedFiles.filter((path) => !plannedPaths.has(path));

  if (orphanedPaths.length > 0 && mode === "create") {
    return {
      ok: false,
      issues: [
        `${mode} would orphan existing generated files for feature: ${orphanedPaths.join(", ")}`,
        "Use 'dota2 update --feature <id>' or 'dota2 regenerate --feature <id>' to handle file changes.",
      ],
    };
  }

  writePlan.stats = {
    total: writePlan.entries.length,
    create: writePlan.entries.filter((entry) => entry.operation === "create").length,
    update: writePlan.entries.filter((entry) => entry.operation === "update").length,
    conflicts: writePlan.entries.filter(
      (entry) => !entry.safe || (entry.conflicts && entry.conflicts.length > 0)
    ).length,
    deferred: writePlan.entries.filter((entry) => entry.deferred).length,
  };

  return { ok: true };
}
