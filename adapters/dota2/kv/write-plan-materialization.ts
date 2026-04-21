import type { WritePlanEntry } from "../assembler/index.js";
import {
  type AbilityKvAggregateMaterialization,
  type AbilityKvPendingFragment,
  materializeAbilityKvAggregate,
} from "./aggregate-writer.js";
import { normalizeAbilityKvAggregateTargetPath } from "./contract.js";
import { isAbilityKvFragmentEntry } from "./owned-artifacts.js";

export interface MaterializedKvEntry {
  entry: WritePlanEntry;
  targetPath: string;
  content: string;
  abilityName?: string;
}

export interface WritePlanKvMaterialization {
  fragmentEntries: MaterializedKvEntry[];
  passthroughEntries: MaterializedKvEntry[];
  aggregate?: AbilityKvAggregateMaterialization;
}

function normalizePath(path: string): string {
  return path.replace(/\\/g, "/");
}

function resolveEntryAbilityName(entry: WritePlanEntry): string | undefined {
  const metadataAbilityName = entry.metadata?.abilityName;
  if (typeof metadataAbilityName === "string" && metadataAbilityName.trim().length > 0) {
    return metadataAbilityName.trim();
  }

  const parameterAbilityName = entry.parameters?.abilityName;
  if (typeof parameterAbilityName === "string" && parameterAbilityName.trim().length > 0) {
    return parameterAbilityName.trim();
  }

  return normalizePath(entry.targetPath).split("/").pop()?.replace(/\.kv\.txt$/i, "");
}

export function materializeKvWritePlanEntries(input: {
  hostRoot: string;
  entries: WritePlanEntry[];
  buildKvContent: (entry: WritePlanEntry, index: number) => string;
  removedFragmentPaths?: string[];
}): WritePlanKvMaterialization {
  const fragmentEntries: MaterializedKvEntry[] = [];
  const passthroughEntries: MaterializedKvEntry[] = [];
  const pendingFragments: AbilityKvPendingFragment[] = [];
  let kvIndex = 0;

  for (const entry of input.entries) {
    if (entry.deferred || entry.contentType !== "kv") {
      continue;
    }

    const content = input.buildKvContent(entry, kvIndex++);
    const abilityName = resolveEntryAbilityName(entry);

    if (isAbilityKvFragmentEntry(entry)) {
      const aggregateTargetPath =
        normalizeAbilityKvAggregateTargetPath(
          typeof entry.metadata?.aggregateTargetPath === "string" && entry.metadata.aggregateTargetPath.trim().length > 0
            ? entry.metadata.aggregateTargetPath
            : undefined,
        );
      fragmentEntries.push({
        entry,
        targetPath: entry.targetPath,
        content,
        abilityName,
      });
      pendingFragments.push({
        fragmentPath: entry.targetPath,
        content,
        abilityName,
        aggregateTargetPath,
      });
      continue;
    }

    passthroughEntries.push({
      entry,
      targetPath: entry.targetPath,
      content,
      abilityName,
    });
  }

  return {
    fragmentEntries,
    passthroughEntries,
    aggregate:
      pendingFragments.length > 0
      || (input.removedFragmentPaths || []).length > 0
        ? materializeAbilityKvAggregate({
            hostRoot: input.hostRoot,
            pendingFragments,
            removedFragmentPaths: input.removedFragmentPaths,
          })
        : undefined,
  };
}
