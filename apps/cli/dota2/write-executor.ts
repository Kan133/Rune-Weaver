import { existsSync } from "fs";
import { join } from "path";
import { executeWritePlan, generateWriteReview, WritePlan as ExecutorWritePlan, WriteAction, WriteExecutorOptions, WriteReviewArtifact, WriteResult } from "../../../adapters/dota2/executor/index.js";
import { WritePlan, WritePlanEntry } from "../../../adapters/dota2/assembler/index.js";
import { materializeKvWritePlanEntries } from "../../../adapters/dota2/kv/index.js";
import { computeAbilityName, generateCodeContent, generateKVContentWithIndex } from "../helpers/index.js";
import type { Dota2CLIOptions } from "../dota2-cli.js";

function buildEntryIdentity(entry: WritePlanEntry): string {
  return `${entry.sourcePattern}::${entry.sourceModule}`;
}

function buildLuaTargetPath(abilityName: string): string {
  return `game/scripts/vscripts/rune_weaver/abilities/${abilityName}.lua`;
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
    const materializedKv = materializeKvWritePlanEntries({
      hostRoot: options.hostRoot,
      entries: kvEntries,
      buildKvContent: generateKVContentWithIndex,
    });

    for (const fragment of materializedKv.fragmentEntries) {
      if (fragment.abilityName) {
        abilityNameByIdentity.set(buildEntryIdentity(fragment.entry), fragment.abilityName);
      }
      console.log(`  [KV] Prepared fragment ${fragment.targetPath}`);
      kvActions.push({
        type: fragment.entry.operation === "create" ? "create" : "refresh",
        targetPath: fragment.targetPath,
        content: fragment.content,
        rwOwned: true,
        description: fragment.entry.contentSummary,
      });
    }

    for (const passthrough of materializedKv.passthroughEntries) {
      if (passthrough.abilityName) {
        abilityNameByIdentity.set(buildEntryIdentity(passthrough.entry), passthrough.abilityName);
      }
      kvActions.push({
        type: passthrough.entry.operation === "create" ? "create" : "refresh",
        targetPath: passthrough.targetPath,
        content: passthrough.content,
        rwOwned: true,
        description: passthrough.entry.contentSummary,
      });
    }

    if (materializedKv.aggregate) {
      const aggregateFullPath = join(options.hostRoot, materializedKv.aggregate.aggregateTargetPath);
      const aggregateActionType = existsSync(aggregateFullPath) ? "refresh" : "create";
      console.log(`  [KV] Materialized aggregate ${materializedKv.aggregate.aggregateTargetPath}`);
      kvActions.push({
        type: aggregateActionType,
        targetPath: materializedKv.aggregate.aggregateTargetPath,
        content: materializedKv.aggregate.content,
        rwOwned: true,
        description: `KV aggregate materialization: ${materializedKv.aggregate.abilityNames.join(", ") || "none"}`,
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
