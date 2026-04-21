/**
 * Post-Generation Repair - Executor
 *
 * Executes repair actions based on their kind.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import type {
  PostGenerationRepairAction,
  RepairActionResult,
  PostGenerationRepairResult,
  PostGenerationRepairPlan,
} from "./types.js";
import { findMissingLessImports } from "./helpers.js";
import { refreshBridge } from "../../bridge/index.js";
import { loadWorkspace } from "../../../../core/workspace/index.js";

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
