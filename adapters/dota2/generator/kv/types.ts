/**
 * Dota2KVGenerator v1 — Types
 *
 * Minimum type definitions for KV generator scaffold.
 * Formalized from tmp/kv-generator-spike/06-typescript-draft.ts
 *
 * Scope: v1 ability shell / static config only.
 * NOT responsible for: runtime logic, modifiers, hero/item/unit KV.
 */

export type FieldType = "FIELD_INTEGER" | "FIELD_FLOAT" | "FIELD_BOOLEAN" | "FIELD_STRING";

export interface AbilitySpecial {
  index: string;
  varType: FieldType;
  key: string;
  value: string | number;
  radius?: string;
  duration?: string;
}

export interface AbilityKVConfig {
  abilityName: string;

  baseClass: "ability_datadriven" | string;
  abilityType: "DOTA_ABILITY_TYPE_BASIC" | "DOTA_ABILITY_TYPE_ULTIMATE";

  behavior: string;

  unitTargetTeam?: string;
  unitTargetType?: string;
  unitTargetFlags?: string;
  abilityDamageType?: string;

  abilityCooldown?: string;
  abilityManaCost?: string;
  abilityCastRange?: string;
  abilityCastRangeBuffer?: string;
  abilityCastPoint?: string;
  abilityChannelTime?: string;
  abilityChannelledManaCostPerSecond?: string;
  abilityDuration?: string;
  abilityDamage?: string;

  aoERadius?: string;

  abilityCastAnimation?: string;
  animationPlaybackRate?: string;
  animationIgnoresModelScale?: string;

  maxLevel?: string;
  requiredLevel?: string;
  levelsBetweenUpgrades?: string;

  scriptFile?: string;
  precache?: string[];

  specials?: AbilitySpecial[];
}

export interface KVGeneratorInput {
  routeId: string;
  sourceUnitId: string;
  generatorFamily: "dota2-kv";
  hostTarget: "ability_kv";
  abilityConfig: AbilityKVConfig;
  rationale: string[];
  blockers: string[];
}

export interface KVGeneratorOutput {
  routeId: string;
  abilityName: string;
  kvBlock: string;
  targetFile: "npc_abilities_custom.txt";
}
