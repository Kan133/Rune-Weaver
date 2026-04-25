/**
 * Post-Generation Repair - Executor
 *
 * Executes repair actions based on their kind.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import type { GroundingCheckResult, ModuleImplementationRecord } from "../../../../core/schema/types.js";
import {
  aggregateGroundingChecks,
  aggregateModuleGroundingAssessments,
} from "../../../../core/governance/grounding.js";
import type {
  PostGenerationRepairAction,
  RepairActionResult,
  PostGenerationRepairResult,
  PostGenerationRepairPlan,
} from "./types.js";
import { findMissingLessImports } from "./helpers.js";
import { refreshBridge } from "../../bridge/index.js";
import { loadWorkspace, saveWorkspace } from "../../../../core/workspace/index.js";

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

/**
 * Execute a single repair action
 */
export async function executeRepairAction(
  action: PostGenerationRepairAction,
  hostRoot: string
): Promise<RepairActionResult> {
  const result: RepairActionResult = {
    action,
    success: false,
    message: "",
  };

  if (!action.executable) {
    result.message = `Action ${action.id} is not executable`;
    return result;
  }

  try {
    switch (action.kind) {
      case "safe_fix": {
        if (action.sourceCheck === "less_imports") {
          return await fixLessImports(hostRoot, action);
        } else if (action.sourceCheck === "rune_weaver_root_css") {
          return await fixRuneWeaverRootCss(hostRoot, action);
        }
        result.message = `Unknown safe_fix sourceCheck: ${action.sourceCheck}`;
        return result;
      }

      case "refresh_bridge": {
        return await executeRefreshBridge(hostRoot, action);
      }

      case "upgrade_workspace_grounding": {
        return await executeUpgradeWorkspaceGrounding(hostRoot, action);
      }

      default: {
        result.message = `Cannot execute action of kind: ${action.kind}`;
        return result;
      }
    }
  } catch (error) {
    result.message = `Execution failed: ${error instanceof Error ? error.message : String(error)}`;
    result.errors = [result.message];
    return result;
  }
}

async function executeUpgradeWorkspaceGrounding(
  hostRoot: string,
  action: PostGenerationRepairAction,
): Promise<RepairActionResult> {
  const result: RepairActionResult = {
    action,
    success: false,
    message: "",
  };

  const upgradePlan = action.data?.groundingUpgrade;
  if (!upgradePlan || upgradePlan.featureIds.length === 0) {
    result.message = "Missing grounding upgrade targets";
    result.errors = [result.message];
    return result;
  }

  const workspaceResult = loadWorkspace(hostRoot);
  if (!workspaceResult.success || !workspaceResult.workspace) {
    result.message = "Failed to load workspace for grounding upgrade";
    result.errors = workspaceResult.issues;
    return result;
  }

  const workspace = workspaceResult.workspace;
  const upgradedFeatures: string[] = [];
  const upgradedModules: string[] = [];

  const updatedWorkspace = {
    ...workspace,
    features: workspace.features.map((feature) => {
      if (!upgradePlan.featureIds.includes(feature.featureId)) {
        return feature;
      }

      const targetModuleIds = new Set(upgradePlan.modulesByFeature[feature.featureId] || []);
      const synthesizedModules = (feature.modules || []).filter(
        (module): module is ModuleImplementationRecord => module.sourceKind === "synthesized",
      );
      if (synthesizedModules.length === 0) {
        throw new Error(`Feature '${feature.featureId}' has no synthesized modules to upgrade`);
      }

      const modules = (feature.modules || []).map((module) => {
        if (module.sourceKind !== "synthesized") {
          return module;
        }

        const rawGrounding = normalizeGroundingChecks((module.metadata as Record<string, unknown> | undefined)?.grounding);
        if (targetModuleIds.has(module.moduleId)) {
          if (rawGrounding.length === 0) {
            throw new Error(
              `Feature '${feature.featureId}' module '${module.moduleId}' is missing raw metadata.grounding`,
            );
          }

          upgradedModules.push(`${feature.featureId}:${module.moduleId}`);
          return {
            ...module,
            groundingAssessment: aggregateGroundingChecks(rawGrounding),
          };
        }

        return module;
      });

      upgradedFeatures.push(feature.featureId);
      return {
        ...feature,
        modules,
        groundingSummary: aggregateModuleGroundingAssessments(
          modules.filter((module): module is ModuleImplementationRecord => module.sourceKind === "synthesized"),
        ),
        updatedAt: new Date().toISOString(),
      };
    }),
  };

  const saveResult = saveWorkspace(hostRoot, updatedWorkspace);
  if (!saveResult.success) {
    result.message = "Failed to save upgraded workspace grounding";
    result.errors = saveResult.issues;
    return result;
  }

  result.success = true;
  result.modifiedFile = join(hostRoot, "game/scripts/src/rune_weaver/rune-weaver.workspace.json");
  result.message = upgradedModules.length > 0
    ? `Upgraded workspace grounding for ${upgradedModules.length} synthesized module(s) across ${upgradedFeatures.length} feature(s)`
    : `Recomputed feature groundingSummary for ${upgradedFeatures.length} feature(s)`;
  return result;
}

/**
 * Fix LESS imports in hud/styles.less
 */
async function fixLessImports(
  hostRoot: string,
  action: PostGenerationRepairAction
): Promise<RepairActionResult> {
  const result: RepairActionResult = {
    action,
    success: false,
    message: "",
  };

  const hudStylesPath = join(hostRoot, "content/panorama/src/hud/styles.less");

  try {
    const missingImports = action.data?.missingImports || findMissingLessImports(hostRoot);

    if (missingImports.length === 0) {
      result.success = true;
      result.message = "No missing imports to add";
      return result;
    }

    const existingContent = existsSync(hudStylesPath)
      ? readFileSync(hudStylesPath, "utf-8")
      : "";
    if (!existsSync(hudStylesPath)) {
      mkdirSync(join(hostRoot, "content/panorama/src/hud"), { recursive: true });
    }
    const newImports = missingImports.join("\n");
    const updatedContent = existingContent.trim().length > 0
      ? `${newImports}\n${existingContent}`
      : `${newImports}\n`;

    writeFileSync(hudStylesPath, updatedContent, "utf-8");

    result.success = true;
    result.message = `Added ${missingImports.length} missing LESS imports`;
    result.modifiedFile = hudStylesPath;
    return result;
  } catch (error) {
    result.message = `Failed to fix LESS imports: ${error instanceof Error ? error.message : String(error)}`;
    result.errors = [result.message];
    return result;
  }
}

/**
 * Fix .rune-weaver-root CSS block in hud/styles.less
 */
async function fixRuneWeaverRootCss(
  hostRoot: string,
  action: PostGenerationRepairAction
): Promise<RepairActionResult> {
  const result: RepairActionResult = {
    action,
    success: false,
    message: "",
  };

  const hudStylesPath = join(hostRoot, "content/panorama/src/hud/styles.less");
  const rootStyleBlock = `.rune-weaver-root {
  width: 100%;
  height: 100%;
}`;

  try {
    if (!existsSync(hudStylesPath)) {
      // Create the file with the root style block
      writeFileSync(hudStylesPath, `${rootStyleBlock}\n`, "utf-8");
      result.success = true;
      result.message = "Created hud/styles.less with .rune-weaver-root CSS block";
      result.modifiedFile = hudStylesPath;
      return result;
    }

    const existingContent = readFileSync(hudStylesPath, "utf-8");

    // Check if .rune-weaver-root exists
    const hasRuneWeaverRoot = /\.rune-weaver-root\s*\{/.test(existingContent);

    if (!hasRuneWeaverRoot) {
      // Prepend the root style block
      const updatedContent = `${rootStyleBlock}\n\n${existingContent}`;
      writeFileSync(hudStylesPath, updatedContent, "utf-8");
      result.success = true;
      result.message = "Added .rune-weaver-root CSS block to hud/styles.less";
      result.modifiedFile = hudStylesPath;
      return result;
    }

    // Check if existing block has required properties
    // Use [\s\S] instead of 's' flag for ES5 compatibility
    const rootBlockMatch = existingContent.match(/\.rune-weaver-root\s*\{([\s\S]*?)\}/);
    if (rootBlockMatch) {
      const block = rootBlockMatch[1];
      const hasWidth100 = /width\s*:\s*100%\s*;?/.test(block);
      const hasHeight100 = /height\s*:\s*100%\s*;?/.test(block);

      if (hasWidth100 && hasHeight100) {
        result.success = true;
        result.message = ".rune-weaver-root CSS block already has required properties";
        return result;
      }

      // Patch existing block
      let newBlock = block;
      if (!hasWidth100) {
        newBlock += "\n  width: 100%;";
      }
      if (!hasHeight100) {
        newBlock += "\n  height: 100%;";
      }

      const updatedContent = existingContent.replace(
        /\.rune-weaver-root\s*\{[\s\S]*?\}/,
        `.rune-weaver-root {${newBlock}\n}`
      );

      writeFileSync(hudStylesPath, updatedContent, "utf-8");
      result.success = true;
      result.message = "Patched .rune-weaver-root CSS block with missing properties";
      result.modifiedFile = hudStylesPath;
      return result;
    }

    result.message = "Could not parse .rune-weaver-root CSS block";
    result.errors = [result.message];
    return result;
  } catch (error) {
    result.message = `Failed to fix CSS: ${error instanceof Error ? error.message : String(error)}`;
    result.errors = [result.message];
    return result;
  }
}

/**
 * Execute refresh bridge action
 */
async function executeRefreshBridge(
  hostRoot: string,
  action: PostGenerationRepairAction
): Promise<RepairActionResult> {
  const result: RepairActionResult = {
    action,
    success: false,
    message: "",
  };

  // Load workspace first
  const workspaceResult = loadWorkspace(hostRoot);
  if (!workspaceResult.success || !workspaceResult.workspace) {
    result.message = "Failed to load workspace for refresh bridge";
    result.errors = workspaceResult.issues;
    return result;
  }

  try {
    const bridgeResult = refreshBridge(hostRoot, workspaceResult.workspace);

    if (bridgeResult.success) {
      result.success = true;
      result.message = `Bridge refreshed successfully. Server: ${bridgeResult.serverRefreshed}, UI: ${bridgeResult.uiRefreshed}`;
    } else {
      result.message = "Bridge refresh failed";
      result.errors = bridgeResult.errors;
    }

    return result;
  } catch (error) {
    result.message = `Failed to execute refresh bridge: ${error instanceof Error ? error.message : String(error)}`;
    result.errors = [result.message];
    return result;
  }
}

/**
 * Execute all safe (executable) post-generation repairs
 */
export async function executeSafePostGenerationRepairs(
  plan: PostGenerationRepairPlan,
  hostRoot: string
): Promise<PostGenerationRepairResult> {
  const result: PostGenerationRepairResult = {
    success: false,
    executed: [],
    skipped: [],
    errors: [],
    summary: {
      attempted: 0,
      succeeded: 0,
      failed: 0,
      skipped: 0,
    },
  };

  // Execute only executable actions
  for (const action of plan.actions) {
    if (!action.executable) {
      result.skipped.push(action);
      result.summary.skipped++;
      continue;
    }

    result.summary.attempted++;
    const actionResult = await executeRepairAction(action, hostRoot);
    result.executed.push(actionResult);

    if (actionResult.success) {
      result.summary.succeeded++;
    } else {
      result.summary.failed++;
      if (actionResult.errors) {
        result.errors.push(...actionResult.errors);
      }
    }
  }

  result.success = result.summary.failed === 0 && result.summary.attempted > 0;
  return result;
}
