/**
 * Post-Generation Repair - Planner
 *
 * Creates repair plans based on validation results.
 */

import { existsSync } from "fs";
import { join } from "path";
import type {
  PostGenerationRepairAction,
  PostGenerationRepairPlan,
  RepairActionKind,
  RepairRiskLevel,
  PostGenerationValidationResult,
  PostGenerationCheck,
} from "./types.js";
import { generateActionId, findMissingLessImports } from "./helpers.js";

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
    const action = createRepairAction(check, hostRoot, index);
    actions.push(action);
  }

  // Categorize actions
  const executableActions = actions.filter((a) => a.executable);
  const manualActions = actions.filter((a) => !a.executable);
  const requiresRegenerateActions = actions.filter((a) => a.kind === "requires_regenerate");

  return {
    needsRepair: actions.length > 0,
    sourceValidation: validationResult,
    actions,
    executableActions,
    manualActions,
    summary: {
      total: actions.length,
      executable: executableActions.length,
      requiresRegenerate: requiresRegenerateActions.length,
      manual: manualActions.length,
    },
  };
}
