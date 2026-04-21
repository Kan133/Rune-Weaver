export const DOTA2_ABILITY_KV_AGGREGATE_OWNER = "dota2-ability-kv-aggregate" as const;
export const ABILITY_KV_AGGREGATE_TARGET_PATH = "game/scripts/npc/npc_abilities_custom.txt";
export const ABILITY_KV_FRAGMENT_ROOT = "game/scripts/src/rune_weaver/generated/kv-fragments";

function normalizePath(path: string): string {
  return path.replace(/\\/g, "/");
}

export function buildAbilityKvFragmentPath(featureId: string, abilityName: string): string {
  return `${ABILITY_KV_FRAGMENT_ROOT}/${featureId}/${abilityName}.kv.txt`;
}

export function normalizeAbilityKvAggregateTargetPath(_path?: string): string {
  return ABILITY_KV_AGGREGATE_TARGET_PATH;
}

export function resolveAbilityKvScriptFile(abilityName: string): string {
  return `rune_weaver/abilities/${abilityName}`;
}

export function isAbilityKvAggregatePath(path: string): boolean {
  return normalizePath(path).endsWith(ABILITY_KV_AGGREGATE_TARGET_PATH);
}

export function isAbilityKvFragmentPath(path: string): boolean {
  return normalizePath(path).startsWith(`${ABILITY_KV_FRAGMENT_ROOT}/`) && normalizePath(path).endsWith(".kv.txt");
}

export function extractAbilityNameFromLuaPath(path: string): string | undefined {
  const normalized = normalizePath(path);
  if (!normalized.includes("game/scripts/vscripts/rune_weaver/abilities/") || !normalized.endsWith(".lua")) {
    return undefined;
  }

  return normalized.split("/").pop()?.replace(/\.lua$/i, "");
}
