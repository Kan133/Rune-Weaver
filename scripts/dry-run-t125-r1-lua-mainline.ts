/**
 * T125-R1 Dry-Run: Verify Lua Ability Mainline Integration
 *
 * Proves that generateAbilityLuaWrapper() is now consumed by the
 * main generator path (not just tmp scripts).
 */
import { generateCode } from "../adapters/dota2/generator/index.js";
import type { WritePlanEntry } from "../adapters/dota2/assembler/index.js";

const TEST_ENTRY: WritePlanEntry = {
  operation: "create",
  targetPath: "game/scripts/vscripts/rune_weaver/abilities/rw_test_v2.lua",
  contentType: "lua",
  contentSummary: "Lua ability wrapper with same-file modifier",
  sourcePattern: "rw_test_v2",
  sourceModule: "rune_weaver.ability",
  safe: true,
  metadata: {
    abilityName: "rw_test_v2",
    modifierConfig: {
      name: "modifier_rw_test_v2",
      isHidden: false,
      isDebuff: false,
      isPurgable: true,
      isBuff: true,
      statusEffectName: "particles/status_fx/status_effect_frost.vpcf",
      declareFunctions: "MODIFIER_PROPERTY_MOVESPEED_BONUS_CONSTANT",
      modifierFunctions: {
        GetModifierMoveSpeedBonus_Constant: "return self:GetAbility():GetSpecialValueFor('movespeed_bonus') or 80",
      },
    },
  },
};

console.log("=" .repeat(60));
console.log("T125-R1 Dry-Run: Lua Ability Mainline Integration");
console.log("=" .repeat(60));
console.log();

const result = generateCode(TEST_ENTRY, "dry-run-test");

console.log("GENERATION RESULT:");
console.log(`  language:     ${result.language}`);
console.log(`  exports:      [${result.exports.join(", ")}]`);
console.log(`  content length: ${result.content.length} chars`);
console.log();

if (result.language === "lua") {
  console.log("✅ Language is 'lua' — mainline integration confirmed!");
} else {
  console.error("❌ Expected language 'lua', got:", result.language);
  process.exit(1);
}

if (result.exports.includes("rw_test_v2")) {
  console.log("✅ Ability export present in exports list");
} else {
  console.error("❌ Missing ability export");
  process.exit(1);
}

if (result.exports.includes("modifier_rw_test_v2")) {
  console.log("✅ Modifier export present in exports list (same-file strategy)");
} else {
  console.error("❌ Missing modifier export");
  process.exit(1);
}

if (result.content.includes("function rw_test_v2.prototype.OnSpellStart")) {
  console.log("✅ OnSpellStart method generated");
} else {
  console.error("❌ Missing OnSpellStart");
  process.exit(1);
}

if (result.content.includes("modifier_rw_test_v2 = __TS__Class()")) {
  console.log("✅ Modifier class generated in same file");
} else {
  console.error("❌ Missing modifier class");
  process.exit(1);
}

if (result.content.includes("caster:AddNewModifier(caster, self, \"modifier_rw_test_v2\"")) {
  console.log("✅ Using native AddNewModifier (T20 learning)");
} else {
  console.error("❌ Missing correct AddNewModifier call");
  process.exit(1);
}

if (result.content.includes("registerModifier(nil)")) {
  console.log("✅ Using registerModifier(nil) — matches crystal_nova_x pattern (T19 learning)");
} else {
  console.error("❌ Missing correct registerModifier call");
  process.exit(1);
}

console.log();
console.log("=".repeat(60));
console.log("🎉 ALL CHECKS PASSED — Lua ability mainline integration verified!");
console.log("=".repeat(60));
console.log("");
console.log("SUMMARY:");
console.log("  • generateCode() now handles 'lua' contentType ✅");
console.log("  • Delegates to generateAbilityLuaWrapper() ✅");
console.log("  • Same-file modifier generation works ✅");
console.log("  • T14/T19/T20 learnings embedded ✅");
console.log("");
console.log("MAINLINE PATH:");
console.log("  AssemblyPlan → assembler.createWritePlan()");
console.log("    → WritePlanEntry{contentType:'lua', ...}");
console.log("      → generator.generateCode(entry)");
console.log("        → generateLuaAbilityCode(patternId, entry)");
console.log("          → generateAbilityLuaWrapper(config)");
console.log("            → GeneratedCode{language:'lua', content, exports}");
