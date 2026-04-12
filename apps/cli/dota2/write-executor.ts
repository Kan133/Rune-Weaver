import { executeWritePlan, generateWriteReview, WritePlan as ExecutorWritePlan, WriteAction, WriteExecutorOptions, WriteReviewArtifact, WriteResult } from "../../../adapters/dota2/executor/index.js";
import { WritePlan, WritePlanEntry } from "../../../adapters/dota2/assembler/index.js";
import { generateCodeContent, generateKVContentWithIndex } from "../helpers/index.js";
import type { Dota2CLIOptions } from "../dota2-cli.js";

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

  const kvActions: WriteAction[] = [];
  if (kvEntries.length > 0) {
    const kvEntriesByTarget = new Map<string, WritePlanEntry[]>();
    for (const entry of kvEntries) {
      const existing = kvEntriesByTarget.get(entry.targetPath) || [];
      existing.push(entry);
      kvEntriesByTarget.set(entry.targetPath, existing);
    }

    for (const [targetPath, entries] of kvEntriesByTarget) {
      const combinedContent = entries.map((entry, index) => generateKVContentWithIndex(entry, index)).join("\n\n");
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

  const nonKvActions: WriteAction[] = nonKvEntries.map((entry) => ({
    type: entry.operation === "create" ? "create" : "refresh",
    targetPath: entry.targetPath,
    content: generateCodeContent(entry),
    rwOwned: true,
    description: entry.contentSummary,
  }));

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

  console.log("\n  Execution Result:");
  console.log(`    Success: ${result.success}`);

  if (result.blockedByReadinessGate) {
    console.log(`    ⚠️  Blocked by Readiness Gate: ${result.readinessBlockers?.join(", ")}`);
    console.log("    (Use --force to override)");
  }

  console.log(`    Executed: ${result.executed.length}`);
  console.log(`    Skipped: ${result.skipped.length}`);
  console.log(`    Failed: ${result.failed.length}`);

  if (result.createdFiles.length > 0 && options.verbose) {
    console.log("    Created Files:");
    for (const file of result.createdFiles) {
      console.log(`      - ${file}`);
    }
  }

  return { result, review };
}
