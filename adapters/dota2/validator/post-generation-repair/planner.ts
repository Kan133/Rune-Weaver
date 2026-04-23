/**
 * Post-Generation Repair - Planner
 *
 * Creates repair plans based on validation results.
 */

import { existsSync, readFileSync } from "fs";
import { join } from "path";
import type { RuneWeaverFeatureRecord } from "../../../../core/workspace/types.js";
import type { GroundingCheckResult, ModuleImplementationRecord } from "../../../../core/schema/types.js";
import {
  aggregateModuleGroundingAssessments,
  validateGroundingAssessmentAgainstChecks,
} from "../../../../core/governance/grounding.js";
import type {
  PostGenerationRepairAction,
  PostGenerationRepairPlan,
  PostGenerationValidationResult,
  PostGenerationCheck,
} from "./types.js";
import { generateActionId, findMissingLessImports } from "./helpers.js";

interface SynthesizedGroundingRecoveryCandidate {
  featureId: string;
  moduleIds: string[];
}

function normalizeGroundingChecks(rawGrounding: unknown): GroundingCheckResult[] {
  if (!Array.isArray(rawGrounding)) {
    return [];
  }

  return rawGrounding.filter((item): item is GroundingCheckResult =>
    Boolean(item)
    && typeof item === "object"
    && typeof (item as Record<string, unknown>).artifactId === "string"
    && Array.isArray((item as Record<string, unknown>).verifiedSymbols)
    && Array.isArray((item as Record<string, unknown>).allowlistedSymbols)
    && Array.isArray((item as Record<string, unknown>).weakSymbols)
    && Array.isArray((item as Record<string, unknown>).unknownSymbols)
    && Array.isArray((item as Record<string, unknown>).warnings),
  );
}

function buildSynthesizedGroundingIssueActions(
  check: PostGenerationCheck,
  hostRoot: string,
  startIndex: number,
): PostGenerationRepairAction[] {
  const workspacePath = join(hostRoot, "game/scripts/src/rune_weaver/rune-weaver.workspace.json");
  if (!existsSync(workspacePath)) {
    return [
      {
        id: generateActionId(check.check, startIndex),
        sourceCheck: check.check,
        kind: "requires_regenerate",
        executable: false,
        risk: "high",
        title: "Synthesized grounding contract requires regeneration",
        description: "The workspace file is missing, so canonical grounding cannot be recovered. Regenerate the synthesized feature from the modern pipeline.",
        data: {
          context: {
            details: check.details,
            workspacePath,
          },
        },
      },
    ];
  }

  let rawWorkspace: { features?: RuneWeaverFeatureRecord[] };
  try {
    rawWorkspace = JSON.parse(readFileSync(workspacePath, "utf-8")) as { features?: RuneWeaverFeatureRecord[] };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return [
      {
        id: generateActionId(check.check, startIndex),
        sourceCheck: check.check,
        kind: "requires_regenerate",
        executable: false,
        risk: "high",
        title: "Synthesized grounding contract requires regeneration",
        description: "The workspace file could not be parsed to recover canonical grounding. Regenerate the synthesized feature from the modern pipeline.",
        data: {
          context: {
            details: check.details,
            workspacePath,
            parseError: message,
          },
        },
      },
    ];
  }

  const actions: PostGenerationRepairAction[] = [];
  let nextIndex = startIndex;

  for (const feature of rawWorkspace.features || []) {
    const synthesizedModules = (feature.modules || []).filter(
      (module): module is ModuleImplementationRecord => module.sourceKind === "synthesized",
    );
    if (synthesizedModules.length === 0) {
      continue;
    }

    const missingAssessmentModuleIds: string[] = [];
    const missingRawGroundingModuleIds: string[] = [];
    const nonRecoverableIssues: string[] = [];

    for (const module of synthesizedModules) {
      const rawGrounding = normalizeGroundingChecks((module.metadata as Record<string, unknown> | undefined)?.grounding);
      const scopeLabel = `feature '${feature.featureId}' module '${module.moduleId}'`;

      if (!module.groundingAssessment) {
        if (rawGrounding.length === 0) {
          missingRawGroundingModuleIds.push(module.moduleId);
        } else {
          missingAssessmentModuleIds.push(module.moduleId);
        }
        continue;
      }

      nonRecoverableIssues.push(
        ...validateGroundingAssessmentAgainstChecks(module.groundingAssessment, rawGrounding, scopeLabel),
      );
    }

    const featureRawChecks = synthesizedModules.flatMap((module) =>
      normalizeGroundingChecks((module.metadata as Record<string, unknown> | undefined)?.grounding),
    );
    if (feature.groundingSummary) {
      nonRecoverableIssues.push(
        ...validateGroundingAssessmentAgainstChecks(
          feature.groundingSummary,
          featureRawChecks,
          `feature '${feature.featureId}'`,
        ),
      );

      if (missingAssessmentModuleIds.length === 0) {
        const aggregatedFromModules = aggregateModuleGroundingAssessments(synthesizedModules);
        if (
          feature.groundingSummary.status !== aggregatedFromModules.status
          || feature.groundingSummary.verifiedSymbolCount !== aggregatedFromModules.verifiedSymbolCount
          || feature.groundingSummary.allowlistedSymbolCount !== aggregatedFromModules.allowlistedSymbolCount
          || feature.groundingSummary.weakSymbolCount !== aggregatedFromModules.weakSymbolCount
          || feature.groundingSummary.unknownSymbolCount !== aggregatedFromModules.unknownSymbolCount
        ) {
          nonRecoverableIssues.push(
            `${feature.featureId}: feature groundingSummary does not match synthesized module assessments`,
          );
        }
      }
    }

    const featureNeedsSummary = !feature.groundingSummary;
    if (!featureNeedsSummary && missingAssessmentModuleIds.length === 0 && missingRawGroundingModuleIds.length === 0) {
      continue;
    }

    if (missingRawGroundingModuleIds.length > 0 || nonRecoverableIssues.length > 0) {
      actions.push(
        createRequiresRegenerateGroundingAction(
          check,
          feature,
          missingRawGroundingModuleIds,
          nonRecoverableIssues,
          nextIndex,
        ),
      );
      nextIndex += 1;
      continue;
    }

    actions.push(
      createUpgradeWorkspaceGroundingAction(
        check,
        {
          featureId: feature.featureId,
          moduleIds: missingAssessmentModuleIds,
        },
        featureNeedsSummary,
        nextIndex,
      ),
    );
    nextIndex += 1;
  }

  if (actions.length > 0) {
    return actions;
  }

  return [
    {
      id: generateActionId(check.check, startIndex),
      sourceCheck: check.check,
      kind: "requires_regenerate",
      executable: false,
      risk: "high",
      title: "Synthesized grounding contract requires regeneration",
      description: "The synthesized grounding contract failed for reasons that are not safely recoverable from workspace metadata alone.",
      data: {
        context: {
          details: check.details,
        },
      },
    },
  ];
}

function createUpgradeWorkspaceGroundingAction(
  check: PostGenerationCheck,
  candidate: SynthesizedGroundingRecoveryCandidate,
  featureNeedsSummary: boolean,
  index: number,
): PostGenerationRepairAction {
  const moduleSummary = candidate.moduleIds.length > 0
    ? `module groundingAssessment for ${candidate.moduleIds.length} synthesized module(s)`
    : "feature groundingSummary";
  const summarySuffix = featureNeedsSummary
    ? " and recompute the feature groundingSummary"
    : "";

  return {
    id: generateActionId(check.check, index),
    sourceCheck: check.check,
    kind: "upgrade_workspace_grounding",
    executable: true,
    risk: "low",
    title: `Upgrade workspace grounding for synthesized feature '${candidate.featureId}'`,
    description: `Derive canonical ${moduleSummary}${summarySuffix} from preserved synthesized raw metadata.grounding.`,
    data: {
      targetFile: "game/scripts/src/rune_weaver/rune-weaver.workspace.json",
      groundingUpgrade: {
        featureIds: [candidate.featureId],
        modulesByFeature: {
          [candidate.featureId]: candidate.moduleIds,
        },
      },
    },
  };
}

function createRequiresRegenerateGroundingAction(
  check: PostGenerationCheck,
  feature: Pick<RuneWeaverFeatureRecord, "featureId">,
  missingRawGroundingModuleIds: string[],
  nonRecoverableIssues: string[],
  index: number,
): PostGenerationRepairAction {
  const reasons: string[] = [];
  if (missingRawGroundingModuleIds.length > 0) {
    reasons.push(
      `synthesized module raw metadata.grounding is missing for: ${missingRawGroundingModuleIds.join(", ")}`,
    );
  }
  if (nonRecoverableIssues.length > 0) {
    reasons.push(...nonRecoverableIssues);
  }

  return {
    id: generateActionId(check.check, index),
    sourceCheck: check.check,
    kind: "requires_regenerate",
    executable: false,
    risk: "high",
    title: `Regenerate synthesized feature '${feature.featureId}' grounding contract`,
    description: "Canonical workspace grounding cannot be reconstructed honestly because required raw grounding metadata is missing or existing canonical truth already drifted.",
    data: {
      context: {
        details: reasons,
      },
      targetFile: "game/scripts/src/rune_weaver/rune-weaver.workspace.json",
    },
  };
}

/**
 * Create a repair action for a failed check based on the check-to-action mapping
 */
export function createRepairAction(
  check: PostGenerationCheck,
  hostRoot: string,
  index: number
): PostGenerationRepairAction {
  const baseAction: Omit<PostGenerationRepairAction, "kind" | "executable" | "risk" | "title" | "description"> = {
    id: generateActionId(check.check, index),
    sourceCheck: check.check,
  };

  switch (check.check) {
    case "less_imports": {
      // Find missing imports
      const missingImports = findMissingLessImports(hostRoot);
      return {
        ...baseAction,
        kind: "safe_fix",
        executable: true,
        risk: "low",
        title: "Add missing LESS imports to hud/styles.less",
        description: `Add ${missingImports.length} missing @import statements for generated UI LESS files`,
        data: {
          missingImports,
          targetFile: "content/panorama/src/hud/styles.less",
        },
      };
    }

    case "rune_weaver_root_css": {
      return {
        ...baseAction,
        kind: "safe_fix",
        executable: true,
        risk: "low",
        title: "Add/patch .rune-weaver-root CSS block",
        description: "Ensure .rune-weaver-root has width: 100% and height: 100%",
        data: {
          cssAction: existsSync(join(hostRoot, "content/panorama/src/hud/styles.less"))
            ? "patch"
            : "create",
          targetFile: "content/panorama/src/hud/styles.less",
        },
      };
    }

    case "server_index_references": {
      return {
        ...baseAction,
        kind: "refresh_bridge",
        executable: true,
        risk: "none",
        title: "Refresh bridge to fix server index references",
        description: "Call refreshBridge() to regenerate server index with correct imports",
        data: {
          targetFile: "game/scripts/src/rune_weaver/generated/server/index.ts",
        },
      };
    }

    case "ui_index_mounts": {
      return {
        ...baseAction,
        kind: "refresh_bridge",
        executable: true,
        risk: "none",
        title: "Refresh bridge to fix UI index mounts",
        description: "Call refreshBridge() to regenerate UI index with correct component imports",
        data: {
          targetFile: "content/panorama/src/rune_weaver/generated/ui/index.tsx",
        },
      };
    }

    case "lua_scriptfile_paths": {
      return {
        ...baseAction,
        kind: "requires_regenerate",
        executable: false,
        risk: "medium",
        title: "Missing Lua script files require regeneration",
        description: "ScriptFile references in KV files point to non-existent Lua files. Regenerate the feature to create missing Lua wrappers.",
        data: {
          context: { details: check.details },
        },
      };
    }

    case "workspace_generated_files_exist": {
      return {
        ...baseAction,
        kind: "requires_regenerate",
        executable: false,
        risk: "high",
        title: "Missing generated files require regeneration",
        description: "Files recorded in workspace do not exist on disk. The feature needs to be regenerated.",
        data: {
          context: { details: check.details },
        },
      };
    }

    case "npc_abilities_structure": {
      return {
        ...baseAction,
        kind: "manual",
        executable: false,
        risk: "high",
        title: "Manual fix required: npc_abilities_custom.txt structure",
        description: "The npc_abilities_custom.txt file has structural issues that require manual correction.",
        data: {
          context: { details: check.details },
        },
      };
    }

    default: {
      return {
        ...baseAction,
        kind: "manual",
        executable: false,
        risk: "high",
        title: `Manual fix required: ${check.check}`,
        description: check.message,
        data: {
          context: { details: check.details },
        },
      };
    }
  }
}

/**
 * Plan repairs based on validation result
 */
export function planPostGenerationRepairs(
  validationResult: PostGenerationValidationResult,
  hostRoot: string
): PostGenerationRepairPlan {
  const actions: PostGenerationRepairAction[] = [];

  // Iterate through failed checks and create repair actions
  const failedChecks = validationResult.checks.filter((check) => !check.passed);

  for (let index = 0; index < failedChecks.length; index++) {
    const check = failedChecks[index];
    if (check.check === "synthesized_grounding_governance") {
      actions.push(...buildSynthesizedGroundingIssueActions(check, hostRoot, index));
      continue;
    }

    const action = createRepairAction(check, hostRoot, index);
    actions.push(action);
  }

  // Categorize actions
  const executableActions = actions.filter((a) => a.executable);
  const nonExecutableActions = actions.filter((a) => !a.executable);
  const manualActions = actions.filter((a) => a.kind === "manual");
  const upgradeWorkspaceGroundingActions = actions.filter((a) => a.kind === "upgrade_workspace_grounding");
  const requiresRegenerateActions = actions.filter((a) => a.kind === "requires_regenerate");

  return {
    needsRepair: actions.length > 0,
    sourceValidation: validationResult,
    actions,
    executableActions,
    nonExecutableActions,
    manualActions,
    summary: {
      total: actions.length,
      executable: executableActions.length,
      upgradeWorkspaceGrounding: upgradeWorkspaceGroundingActions.length,
      requiresRegenerate: requiresRegenerateActions.length,
      manual: manualActions.length,
    },
  };
}
