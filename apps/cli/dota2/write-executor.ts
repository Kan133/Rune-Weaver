import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { executeWritePlan, generateWriteReview, WritePlan as ExecutorWritePlan, WriteAction, WriteExecutorOptions, WriteReviewArtifact, WriteResult } from "../../../adapters/dota2/executor/index.js";
import { WritePlan, WritePlanEntry } from "../../../adapters/dota2/assembler/index.js";
import { computeAbilityName, generateCodeContent, generateKVContentWithIndex } from "../helpers/index.js";
import type { Dota2CLIOptions } from "../dota2-cli.js";

function buildEntryIdentity(entry: WritePlanEntry): string {
  return `${entry.sourcePattern}::${entry.sourceModule}`;
}

function buildLuaTargetPath(abilityName: string): string {
  return `game/scripts/vscripts/rune_weaver/abilities/${abilityName}.lua`;
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

function mergeKvBlocksWithExisting(hostRoot: string, targetPath: string, kvBlocks: string[]): string {
  const fullPath = join(hostRoot, targetPath);
  const mergedBlocks = new Map<string, string>();

  if (existsSync(fullPath)) {
    const existingContent = readFileSync(fullPath, "utf-8");
    for (const [name, block] of parseAbilityBlocks(existingContent)) {
      mergedBlocks.set(name, block);
    }
  }

  for (const block of kvBlocks) {
    const nameMatch = block.match(/^"([^"]+)"/m);
    if (nameMatch?.[1] && nameMatch[1] !== "DOTAAbilities") {
      mergedBlocks.set(nameMatch[1], block);
    }
  }

  return wrapAbilityBlocks(Array.from(mergedBlocks.values()));
}

export async function executeWrite(
  writePlan: WritePlan,
  options: Dota2CLIOptions,
  stableFeatureId: string,
): Promise<{ result: WriteResult | null; review: WriteReviewArtifact | null }> {
  console.log("\n" + "=".repeat(70));
  console.log("Stage 6: Write Executor");
  console.log("=".repeat(70));

  const deferredEntries = writePlan.entries.filter((entry) => entry.deferred);
  const executableEntries = writePlan.entries.filter((entry) => !entry.deferred);

  if (deferredEntries.length > 0) {
    console.log(`  ⚠️  Deferred entries (not executing): ${deferredEntries.length}`);
    for (const entry of deferredEntries) {
      console.log(`    - ${entry.sourcePattern}: ${entry.deferredReason || "Generator not yet implemented"}`);
    }
  }

  const kvEntries = executableEntries.filter((entry) => entry.contentType === "kv");
  const nonKvEntries = executableEntries.filter((entry) => entry.contentType !== "kv");
  const abilityNameByIdentity = new Map<string, string>();

  const kvActions: WriteAction[] = [];
  if (kvEntries.length > 0) {
    const kvEntriesByTarget = new Map<string, WritePlanEntry[]>();
    for (const entry of kvEntries) {
      const existing = kvEntriesByTarget.get(entry.targetPath) || [];
      existing.push(entry);
      kvEntriesByTarget.set(entry.targetPath, existing);
    }

    for (const [targetPath, entries] of kvEntriesByTarget) {
      const kvBlocks = entries.map((entry, index) => {
        const abilityName = computeAbilityName(entry, index);
        abilityNameByIdentity.set(buildEntryIdentity(entry), abilityName);
        const entryWithAbilityName: WritePlanEntry = {
          ...entry,
          metadata: {
            ...(entry.metadata || {}),
            abilityName,
          },
        };
        return generateKVContentWithIndex(entryWithAbilityName, index);
      });
      const combinedContent = mergeKvBlocksWithExisting(options.hostRoot, targetPath, kvBlocks);
      const aggregatedDescription = `KV aggregation: ${entries.length} abilities -> ${targetPath}`;
      console.log(`  [KV] Aggregated ${entries.length} entries into ${targetPath}`);
      kvActions.push({
        type: "create",
        targetPath,
        content: combinedContent,
        rwOwned: true,
        description: aggregatedDescription,
      });
    }
  }

  const nonKvActions: WriteAction[] = nonKvEntries.map((entry) => {
    if (entry.contentType === "lua") {
      const identity = buildEntryIdentity(entry);
      const abilityName = abilityNameByIdentity.get(identity) || computeAbilityName(entry, 0);
      const luaEntry: WritePlanEntry = {
        ...entry,
        metadata: {
          ...(entry.metadata || {}),
          abilityName,
        },
      };
      return {
        type: entry.operation === "create" ? "create" : "refresh",
        targetPath: buildLuaTargetPath(abilityName),
        content: generateCodeContent(luaEntry, stableFeatureId),
        rwOwned: true,
        description: entry.contentSummary,
      };
    }

    return {
      type: entry.operation === "create" ? "create" : "refresh",
      targetPath: entry.targetPath,
      content: generateCodeContent(entry, stableFeatureId),
      rwOwned: true,
      description: entry.contentSummary,
    };
  });

  const actions: WriteAction[] = [...nonKvActions, ...kvActions];
  const executorPlan: ExecutorWritePlan = {
    featureId: stableFeatureId,
    actions,
    filesToCreate: actions.filter((action) => action.type === "create").map((action) => action.targetPath),
    filesToModify: actions.filter((action) => action.type === "refresh").map((action) => action.targetPath),
    readyForHostWrite: writePlan.readyForHostWrite,
    readinessBlockers: writePlan.readinessBlockers,
  };

  const executorOptions: WriteExecutorOptions = {
    hostRoot: options.hostRoot,
    dryRun: options.dryRun || !options.write,
    force: options.force,
  };

  const review = generateWriteReview(executorPlan, executorOptions);
  console.log("  Write Review:");
  console.log(`    Ready to execute: ${review.readyToExecute}`);
  console.log(`    Files to create: ${review.filesToCreate.length}`);
  console.log(`    Blockers: ${review.blockers.length}`);

  if (!options.write && !options.dryRun) {
    console.log("\n  ℹ️  Running in dry-run mode (use --write to actually write files)");
  }

  const result = await executeWritePlan(executorPlan, executorOptions);
  const dryRunExecution = executorOptions.dryRun === true;

  console.log("\n  Execution Result:");
  console.log(`    Success: ${result.success}`);

  if (result.blockedByReadinessGate) {
    console.log(`    ⚠️  Blocked by Readiness Gate: ${result.readinessBlockers?.join(", ")}`);
    console.log("    (Use --force to override)");
  }

  console.log(`    ${dryRunExecution ? "Planned" : "Executed"}: ${result.executed.length}`);
  console.log(`    Skipped: ${result.skipped.length}`);
  console.log(`    Failed: ${result.failed.length}`);
  if (dryRunExecution) {
    console.log("    Dry-run: no host files were written");
  }

  if (result.createdFiles.length > 0 && options.verbose) {
    console.log("    Created Files:");
    for (const file of result.createdFiles) {
      console.log(`      - ${file}`);
    }
  }

  return { result, review };
}
