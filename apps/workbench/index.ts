/**
 * Rune Weaver - Workbench Entry
 *
 * CLI entry only. Orchestration, persistence, and reporting live in focused modules.
 */

import { printWorkbenchCompletionSummary } from "./console-reporting.js";
import { runWorkbench } from "./run-workbench.js";
import { runDelete, runInspect, runList } from "./workbench-commands.js";

export { runWorkbench } from "./run-workbench.js";

async function main() {
  const args = process.argv.slice(2);

  const hasInspectFlag = args.includes("--inspect");
  const inspectIndex = args.indexOf("--inspect");
  const inspectFeatureId = hasInspectFlag ? args[inspectIndex + 1] : undefined;

  if (hasInspectFlag && inspectFeatureId) {
    const nonFlagArgs = args.filter((arg, index) => index !== inspectIndex && index !== inspectIndex + 1);
    const hostRoot = nonFlagArgs.find((arg) => !arg.startsWith("--")) || "D:\\test1";
    await runInspect(inspectFeatureId, hostRoot);
    return;
  }

  if (args.includes("--list")) {
    const nonFlagArgs = args.filter((arg) => arg !== "--list");
    const hostRoot = nonFlagArgs.find((arg) => !arg.startsWith("--")) || "D:\\test1";
    await runList(hostRoot);
    return;
  }

  const hasDeleteFlag = args.includes("--delete");
  const deleteIndex = args.indexOf("--delete");
  const deleteFeatureId = hasDeleteFlag ? args[deleteIndex + 1] : undefined;

  if (hasDeleteFlag && deleteFeatureId) {
    const nonFlagArgs = args.filter((arg, index) => index !== deleteIndex && index !== deleteIndex + 1);
    const hostRoot = nonFlagArgs.find((arg) => !arg.startsWith("--")) || "D:\\test1";
    await runDelete(deleteFeatureId, hostRoot, args.includes("--confirm"));
    return;
  }

  const hasWriteFlag = args.includes("--write");
  let filteredArgs = args.filter((arg) => arg !== "--write");

  let confirmedItemIds: string[] | undefined;
  const confirmArgIndex = filteredArgs.findIndex((arg) => arg.startsWith("--confirm"));
  if (confirmArgIndex !== -1) {
    const confirmArg = filteredArgs[confirmArgIndex];
    const hasEquals = confirmArg.includes("=");
    const confirmValue = hasEquals
      ? confirmArg.split("=")[1]
      : filteredArgs[confirmArgIndex + 1];

    if (confirmValue) {
      confirmedItemIds = confirmValue
        .split(",")
        .map((id) => id.trim())
        .filter((id) => id.length > 0);
    }

    const indicesToRemove = hasEquals
      ? [confirmArgIndex]
      : [confirmArgIndex, confirmArgIndex + 1];
    filteredArgs = filteredArgs.filter((_, index) => !indicesToRemove.includes(index));
  }

  const request = filteredArgs[0] || "a dash ability with 300 range";
  const hostRoot = filteredArgs[1] || "D:\\test1";
  const dryRun = !hasWriteFlag;

  try {
    const result = await runWorkbench(request, {
      hostRoot,
      dryRun,
      confirmedItemIds,
      write: hasWriteFlag,
    });
    printWorkbenchCompletionSummary(result);
    process.exit(result.success ? 0 : 1);
  } catch (err) {
    console.error("\n[Workbench] Error:", err);
    process.exit(1);
  }
}

void main();
