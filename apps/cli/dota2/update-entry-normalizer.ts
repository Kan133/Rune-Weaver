import type { WritePlanEntry } from "../../../adapters/dota2/assembler/index.js";
import { computeAbilityName } from "../helpers/index.js";

function buildEntryIdentity(entry: WritePlanEntry): string {
  return `${entry.sourcePattern}::${entry.sourceModule}`;
}

function buildLuaTargetPath(abilityName: string): string {
  return `game/scripts/vscripts/rune_weaver/abilities/${abilityName}.lua`;
}

export function normalizeUpdateWritePlanEntries(entries: WritePlanEntry[]): WritePlanEntry[] {
  const abilityNameByIdentity = new Map<string, string>();
  let kvIndex = 0;

  for (const entry of entries) {
    if (entry.deferred || entry.contentType !== "kv") {
      continue;
    }

    const abilityName = computeAbilityName(entry, kvIndex++);
    abilityNameByIdentity.set(buildEntryIdentity(entry), abilityName);
  }

  return entries.map((entry) => {
    if (entry.deferred) {
      return entry;
    }

    if (entry.contentType === "kv") {
      const abilityName = abilityNameByIdentity.get(buildEntryIdentity(entry)) || computeAbilityName(entry, 0);
      abilityNameByIdentity.set(buildEntryIdentity(entry), abilityName);
      return {
        ...entry,
        metadata: {
          ...(entry.metadata || {}),
          abilityName,
        },
      };
    }

    if (entry.contentType === "lua") {
      const identity = buildEntryIdentity(entry);
      const abilityName = abilityNameByIdentity.get(identity) || computeAbilityName(entry, 0);
      return {
        ...entry,
        targetPath: buildLuaTargetPath(abilityName),
        metadata: {
          ...(entry.metadata || {}),
          abilityName,
        },
      };
    }

    return entry;
  });
}
