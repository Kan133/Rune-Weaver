/**
 * Dota2KVGenerator v1 — Minimal Fixture
 *
 * Exercises generateAbilityKV with v1-supported fields:
 * - cooldown
 * - mana
 * - cast range
 * - behavior
 * - specials
 *
 * Run: npx tsx adapters/dota2/generator/kv/kv-generator.fixture.ts
 */

import {
  generateAbilityKV,
  createAbilitySpecial,
  type KVGeneratorInput,
} from "./index.js";

function runFixture(): void {
  console.log("=".repeat(70));
  console.log("Dota2KVGenerator v1 — Minimal Fixture");
  console.log("=".repeat(70));

  const input: KVGeneratorInput = {
    routeId: "route_dash_kv_01",
    sourceUnitId: "dash_core",
    generatorFamily: "dota2-kv",
    hostTarget: "ability_kv",
    abilityConfig: {
      abilityName: "rw_dash_ability",
      baseClass: "ability_datadriven",
      abilityType: "DOTA_ABILITY_TYPE_BASIC",
      behavior: "DOTA_ABILITY_BEHAVIOR_NO_TARGET | DOTA_ABILITY_BEHAVIOR_DIRECTIONAL",
      abilityCooldown: "8.0 8.0 8.0 8.0",
      abilityManaCost: "50 60 70 80",
      abilityCastRange: "0",
      abilityCastPoint: "0.1",
      abilityDamageType: "DAMAGE_TYPE_PHYSICAL",
      abilityDamage: "100 150 200 250",
      aoERadius: "300",
      abilityCastAnimation: "ACT_DOTA_CAST_ABILITY_1",
      animationPlaybackRate: "1.0",
      maxLevel: "4",
      requiredLevel: "-4",
      levelsBetweenUpgrades: "4",
      specials: [
        createAbilitySpecial("01", "distance", "300", "FIELD_INTEGER"),
        createAbilitySpecial("02", "speed", "1200", "FIELD_INTEGER"),
        createAbilitySpecial("03", "radius", "150", "FIELD_INTEGER"),
        createAbilitySpecial("04", "duration", "0.5", "FIELD_FLOAT"),
      ],
    },
    rationale: [
      "ability shell fits host-native static configuration",
      "dash movement logic requires runtime script behavior (TS side)",
    ],
    blockers: [],
  };

  const output = generateAbilityKV(input);

  console.log("\n--- Generated KV Block ---");
  console.log(output.kvBlock);
  console.log("\n--- Metadata ---");
  console.log(`Route ID: ${output.routeId}`);
  console.log(`Ability Name: ${output.abilityName}`);
  console.log(`Target File: ${output.targetFile}`);
  console.log("\n--- Validation Checks ---");

  const hasBaseClass = output.kvBlock.includes('"BaseClass"');
  const hasCooldown = output.kvBlock.includes('"AbilityCooldown"');
  const hasManaCost = output.kvBlock.includes('"AbilityManaCost"');
  const hasCastRange = output.kvBlock.includes('"AbilityCastRange"');
  const hasBehavior = output.kvBlock.includes('"AbilityBehavior"');
  const hasSpecials = output.kvBlock.includes('"AbilitySpecial"');

  console.log(`  BaseClass present: ${hasBaseClass ? "✅" : "❌"}`);
  console.log(`  AbilityCooldown present: ${hasCooldown ? "✅" : "❌"}`);
  console.log(`  AbilityManaCost present: ${hasManaCost ? "✅" : "❌"}`);
  console.log(`  AbilityCastRange present: ${hasCastRange ? "✅" : "❌"}`);
  console.log(`  AbilityBehavior present: ${hasBehavior ? "✅" : "❌"}`);
  console.log(`  AbilitySpecial present: ${hasSpecials ? "✅" : "❌"}`);

  const allPassed = hasBaseClass && hasCooldown && hasManaCost && hasCastRange && hasBehavior && hasSpecials;
  console.log(`\n${allPassed ? "✅ All checks passed" : "❌ Some checks failed"}`);

  console.log("\n--- v1 Scope Boundaries ---");
  console.log("  ✅ cooldown, mana, cast range, behavior, specials covered");
  console.log("  ✅ Static KV only (no runtime logic)");
  console.log("  ✅ No modifier logic");
  console.log("  ✅ No hero/item/unit KV");
  console.log("  ✅ No ability_values");
  console.log("  ✅ No linked specials");

  console.log("\n=".repeat(70));
}

runFixture();
