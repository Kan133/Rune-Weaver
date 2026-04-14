/**
 * Rune Weaver - Rollback Execute
 *
 * T105: Rollback Execute Minimal
 *
 * 执行 rollback 操作
 */

import { existsSync, readFileSync, unlinkSync, writeFileSync } from "fs";
import { join } from "path";
import { RollbackPlan } from "./rollback-plan.js";
import { refreshBridge } from "../bridge/index.js";
import { RuneWeaverWorkspace } from "../../../core/workspace/index.js";

export interface RollbackExecutionResult {
  success: boolean;
  deleted: string[];
  failed: { file: string; error: string }[];
  skipped: string[];
  indexRefreshSuccess: boolean;
  workspaceUpdateSuccess: boolean;
  errors: string[];
}

export function executeRollback(
  rollbackPlan: RollbackPlan,
  workspace: RuneWeaverWorkspace,
  hostRoot: string,
  dryRun: boolean,
  skipBridgeRefresh?: boolean
): RollbackExecutionResult {
  const result: RollbackExecutionResult = {
    success: true,
    deleted: [],
    failed: [],
    skipped: [],
    indexRefreshSuccess: false,
    workspaceUpdateSuccess: false,
    errors: [],
  };

  if (!rollbackPlan.canExecute) {
    result.success = false;
    result.errors.push("Rollback plan cannot be executed due to safety issues");
    return result;
  }

  for (const filePath of rollbackPlan.filesToDelete) {
    const fullPath = join(hostRoot, filePath);

    if (!existsSync(fullPath)) {
      result.skipped.push(filePath);
      continue;
    }

    if (dryRun) {
      result.skipped.push(filePath);
      continue;
    }

    try {
      unlinkSync(fullPath);
      result.deleted.push(filePath);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      result.failed.push({ file: filePath, error: message });
      result.success = false;
    }
  }

  if (!dryRun && result.success) {
    try {
      removeAbilityBlocks(hostRoot, rollbackPlan.abilityNamesToRemove);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      result.errors.push(`KV cleanup failed: ${message}`);
      result.success = false;
    }
  }

  if (!dryRun && result.success && skipBridgeRefresh !== true) {
    const bridgeResult = refreshBridge(hostRoot, workspace);
    result.indexRefreshSuccess = bridgeResult.success;

    if (!bridgeResult.success) {
      result.errors.push(...bridgeResult.errors);
    }
  } else if (!dryRun && skipBridgeRefresh === true) {
    result.indexRefreshSuccess = true;
  } else if (dryRun) {
    result.indexRefreshSuccess = true;
  }

  result.workspaceUpdateSuccess = true;

  return result;
}

function removeAbilityBlocks(hostRoot: string, abilityNamesToRemove: string[]): void {
  if (abilityNamesToRemove.length === 0) {
    return;
  }

  const kvPath = join(hostRoot, "game/scripts/npc/npc_abilities_custom.txt");
  if (!existsSync(kvPath)) {
    return;
  }

  const existingContent = readFileSync(kvPath, "utf-8");
  const blocks = parseAbilityBlocks(existingContent);
  const filteredBlocks = Array.from(blocks.entries()).filter(([name, block]) => {
    if (name === "DOTAAbilities") {
      return false;
    }
    const scriptFileMatch = block.match(/"ScriptFile"\s+"rune_weaver\/abilities\/([^"]+)"/);
    const scriptFileAbility = scriptFileMatch?.[1];
    return !scriptFileAbility || !abilityNamesToRemove.includes(scriptFileAbility);
  }).map(([, block]) => block);

  writeFileSync(kvPath, wrapAbilityBlocks(filteredBlocks), "utf-8");
}

function parseAbilityBlocks(content: string): Map<string, string> {
  const blocks = new Map<string, string>();
  const lines = content.split(/\r?\n/);

  let insideRoot = false;
  let rootDepth = 0;
  let currentName: string | null = null;
  let currentLines: string[] = [];
  let braceDepth = 0;

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (!insideRoot) {
      if (line === "\"DOTAAbilities\"") {
        insideRoot = true;
      }
      continue;
    }

    if (!currentName) {
      if (line === "{") {
        rootDepth += 1;
        continue;
      }

      if (line === "}") {
        rootDepth -= 1;
        if (rootDepth <= 0) {
          insideRoot = false;
        }
        continue;
      }
    }

    if (!currentName) {
      const nameMatch = line.match(/^"([^"]+)"$/);
      if (nameMatch && nameMatch[1] !== "DOTAAbilities") {
        currentName = nameMatch[1];
        currentLines = [line];
        braceDepth = 0;
        continue;
      }
      continue;
    }

    currentLines.push(rawLine);
    braceDepth += countChar(rawLine, "{");
    braceDepth -= countChar(rawLine, "}");
    if (braceDepth === 0) {
      blocks.set(currentName, currentLines.join("\n"));
      currentName = null;
      currentLines = [];
    }
  }

  return blocks;
}

function wrapAbilityBlocks(blocks: string[]): string {
  const normalizedBlocks = blocks.map((block) =>
    block
      .split(/\r?\n/)
      .map((line) => `\t${line}`)
      .join("\n")
  );

  return `"DOTAAbilities"\n{\n${normalizedBlocks.join("\n\n")}\n}\n`;
}

function countChar(value: string, needle: string): number {
  return value.split(needle).length - 1;
}

export function formatRollbackResult(result: RollbackExecutionResult): string {
  const lines: string[] = [];

  lines.push("--- Rollback Execution Result ---");
  lines.push(`  Success: ${result.success ? "✅" : "❌"}`);
  lines.push(`  Deleted: ${result.deleted.length}`);
  lines.push(`  Failed: ${result.failed.length}`);
  lines.push(`  Skipped: ${result.skipped.length}`);
  lines.push(`  Index Refresh: ${result.indexRefreshSuccess ? "✅" : "❌"}`);
  lines.push(`  Workspace Update: ${result.workspaceUpdateSuccess ? "✅" : "❌"}`);

  if (result.deleted.length > 0) {
    lines.push("", "  Deleted Files:");
    for (const file of result.deleted) {
      lines.push(`    🗑️  ${file}`);
    }
  }

  if (result.failed.length > 0) {
    lines.push("", "  Failed Deletions:");
    for (const failure of result.failed) {
      lines.push(`    ❌ ${failure.file}: ${failure.error}`);
    }
  }

  if (result.skipped.length > 0) {
    lines.push("", "  Skipped Files:");
    for (const file of result.skipped) {
      lines.push(`    ⏭️  ${file}`);
    }
  }

  if (result.errors.length > 0) {
    lines.push("", "  Errors:");
    for (const error of result.errors) {
      lines.push(`    ⚠️  ${error}`);
    }
  }

  return lines.join("\n");
}
