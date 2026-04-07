/**
 * Dota2KVGenerator v1 — Pure Function Scaffold
 *
 * Minimum KV emitter for ability shell / static config.
 * No file I/O, no router integration, no write executor.
 *
 * Scope: v1 ability KV only.
 * NOT responsible for: runtime logic, modifiers, hero/item/unit KV,
 * arbitrary KV patching, ability_values, linked specials.
 */

import type {
  AbilityKVConfig,
  KVGeneratorInput,
  KVGeneratorOutput,
  AbilitySpecial,
} from "./types.js";

export type { AbilityKVConfig, KVGeneratorInput, KVGeneratorOutput };

/**
 * Generate a Dota2 ability KV entry block from input config.
 * Pure function: same input always produces same output.
 * No file I/O, no side effects.
 */
export function generateAbilityKV(input: KVGeneratorInput): KVGeneratorOutput {
  const { abilityConfig } = input;

  const lines: string[] = [];
  lines.push(`"${abilityConfig.abilityName}"`);
  lines.push("{");

  lines.push(`    "BaseClass"              "${abilityConfig.baseClass}"`);
  lines.push(`    "AbilityBehavior"        "${abilityConfig.behavior}"`);

  if (abilityConfig.scriptFile) {
    lines.push(`    "ScriptFile"            "${abilityConfig.scriptFile}"`);
  }

  if (abilityConfig.abilityType) {
    lines.push(`    "AbilityType"           "${abilityConfig.abilityType}"`);
  }

  lines.push(`    "MaxLevel"               "${abilityConfig.maxLevel ?? "4"}"`);
  lines.push(`    "RequiredLevel"          "${abilityConfig.requiredLevel ?? "-4"}"`);
  lines.push(`    "LevelsBetweenUpgrades"  "${abilityConfig.levelsBetweenUpgrades ?? "4"}"`);

  if (abilityConfig.abilityDamageType) {
    lines.push(`    "AbilityDamageType"    "${abilityConfig.abilityDamageType}"`);
  }

  if (abilityConfig.abilityCastPoint) {
    lines.push(`    "AbilityCastPoint"      "${abilityConfig.abilityCastPoint}"`);
  }

  if (abilityConfig.abilityCastAnimation) {
    lines.push(`    "AbilityCastAnimation" "${abilityConfig.abilityCastAnimation}"`);
  }

  if (abilityConfig.animationPlaybackRate) {
    lines.push(`    "AnimationPlaybackRate" "${abilityConfig.animationPlaybackRate}"`);
  }

  if (abilityConfig.animationIgnoresModelScale) {
    lines.push(`    "AnimationIgnoresModelScale" "${abilityConfig.animationIgnoresModelScale}"`);
  }

  if (abilityConfig.abilityCooldown) {
    lines.push(`    "AbilityCooldown"      "${abilityConfig.abilityCooldown}"`);
  }

  if (abilityConfig.abilityManaCost) {
    lines.push(`    "AbilityManaCost"       "${abilityConfig.abilityManaCost}"`);
  }

  if (abilityConfig.abilityCastRange) {
    lines.push(`    "AbilityCastRange"      "${abilityConfig.abilityCastRange}"`);
  }

  if (abilityConfig.abilityCastRangeBuffer) {
    lines.push(`    "AbilityCastRangeBuffer" "${abilityConfig.abilityCastRangeBuffer}"`);
  }

  if (abilityConfig.abilityDuration) {
    lines.push(`    "AbilityDuration"       "${abilityConfig.abilityDuration}"`);
  }

  if (abilityConfig.abilityChannelTime) {
    lines.push(`    "AbilityChannelTime"    "${abilityConfig.abilityChannelTime}"`);
  }

  if (abilityConfig.abilityChannelledManaCostPerSecond) {
    lines.push(`    "AbilityChannelledManaCostPerSecond" "${abilityConfig.abilityChannelledManaCostPerSecond}"`);
  }

  if (abilityConfig.abilityDamage) {
    lines.push(`    "AbilityDamage"         "${abilityConfig.abilityDamage}"`);
  }

  if (abilityConfig.unitTargetTeam) {
    lines.push(`    "AbilityUnitTargetTeam" "${abilityConfig.unitTargetTeam}"`);
  }

  if (abilityConfig.unitTargetType) {
    lines.push(`    "AbilityUnitTargetType" "${abilityConfig.unitTargetType}"`);
  }

  if (abilityConfig.unitTargetFlags) {
    lines.push(`    "AbilityUnitTargetFlags" "${abilityConfig.unitTargetFlags}"`);
  }

  if (abilityConfig.aoERadius) {
    lines.push(`    "AoERadius"             "${abilityConfig.aoERadius}"`);
  }

  if (abilityConfig.specials && abilityConfig.specials.length > 0) {
    lines.push(`    "AbilitySpecial"`);
    lines.push(`    {`);
    for (const special of abilityConfig.specials) {
      lines.push(`        "${special.index}"`);
      lines.push(`        {`);
      lines.push(`            "var_type"      "${special.varType}"`);
      lines.push(`            "${special.key}" "${special.value}"`);
      lines.push(`        }`);
    }
    lines.push(`    }`);
  }

  if (abilityConfig.precache && abilityConfig.precache.length > 0) {
    lines.push(`    "Precache"`);
    lines.push(`    {`);
    for (const precache of abilityConfig.precache) {
      lines.push(`        "${precache}"`);
    }
    lines.push(`    }`);
  }

  lines.push("}");

  return {
    routeId: input.routeId,
    abilityName: abilityConfig.abilityName,
    kvBlock: lines.join("\n"),
    targetFile: "npc_abilities_custom.txt",
  };
}

/**
 * Create a minimal AbilitySpecial entry.
 * Helper for fixtures and tests.
 */
export function createAbilitySpecial(
  index: string,
  key: string,
  value: string | number,
  varType: "FIELD_INTEGER" | "FIELD_FLOAT" = "FIELD_INTEGER"
): AbilitySpecial {
  return { index, varType, key, value };
}
