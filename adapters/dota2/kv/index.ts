/**
 * Dota2 KV Tools - Index
 *
 * Exports all KV-related utilities:
 * - KV Generator (ability shell / static config)
 * - Baseline Migrator (XLSXContent -> DOTAAbilities load path repair)
 */

export { generateAbilityKV, createAbilitySpecial } from "../generator/kv/index.js";
export type {
  AbilityKVConfig,
  KVGeneratorInput,
  KVGeneratorOutput,
  AbilitySpecial,
} from "../generator/kv/types.js";

export { migrateBaselineAbilities, printBaselineMigrationResult } from "./baseline-migrator.js";
export type {
  BaselineMigrationInput,
  BaselineMigrationResult,
  ParsedAbilityBlock,
} from "./baseline-migrator.js";
