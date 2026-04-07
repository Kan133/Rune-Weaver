/**
 * T121-R6-R5-R13: RW Ability Instantiation Final Fix
 *
 * Blocker: rw_modifier_applier_0 KV entry was lost during T121 baseline migration.
 * Fix: restore KV into DOTAAbilities + generate Lua wrapper + deploy to test1
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { generateAbilityLuaWrapper } from "../adapters/dota2/generator/lua-ability/index.js";

const HOST_ROOT = "D:\\test1";
const NPC_ABILITIES_PATH = join(HOST_ROOT, "game/scripts/npc/npc_abilities_custom.txt");
const VSCRIPTS_ABILITIES_DIR = join(HOST_ROOT, "game/scripts/vscripts/rune_weaver/abilities");

const RW_ABILITY_KV = `"rw_modifier_applier_0"
{
	"BaseClass"		"ability_lua"
	"AbilityBehavior"		"DOTA_ABILITY_BEHAVIOR_NO_TARGET"
	"ScriptFile"		"rune_weaver/abilities/rw_modifier_applier_0"
	"AbilityType"		"DOTA_ABILITY_TYPE_BASIC"
	"MaxLevel"		"4"
	"RequiredLevel"		"1"
	"LevelsBetweenUpgrades"	"3"
	"AbilityCastPoint"		"0.1"
	"AbilityCooldown"		"8.0"
	"AbilityManaCost"		"50"
	"AbilityCastRange"		"0"
}`;

function restoreRWAbilityKV(): boolean {
  if (!existsSync(NPC_ABILITIES_PATH)) {
    console.error(`❌ Target file not found: ${NPC_ABILITIES_PATH}`);
    return false;
  }

  let content = readFileSync(NPC_ABILITIES_PATH, "utf-8");

  if (content.includes('"rw_modifier_applier_0"')) {
    console.log("✅ rw_modifier_applier_0 already in DOTAAbilities (skipping KV restore)");
    return true;
  }

  const dotaAbilitiesEnd = content.lastIndexOf("}\n");
  if (dotaAbilitiesEnd === -1) {
    console.error("❌ Could not find DOTAAbilities closing brace");
    return false;
  }

  content = content.substring(0, dotaAbilitiesEnd) + "\n" + RW_ABILITY_KV + "\n}\n";

  writeFileSync(NPC_ABILITIES_PATH, content, "utf-8");
  console.log("✅ rw_modifier_applier_0 KV restored into DOTAAbilities");
  return true;
}

function generateLuaWrapper(): string {
  return generateAbilityLuaWrapper({
    abilityName: "rw_modifier_applier_0",
    onSpellStart: `    local caster = self:GetCaster()
    local duration = self:GetSpecialValueFor("duration") or 5.0
    caster:AddNewModifier(caster, self, "modifier_rw_buff", {duration = duration})
    self:PlayEffects()`,
  });
}

function deployLuaWrapper(): boolean {
  if (!existsSync(VSCRIPTS_ABILITIES_DIR)) {
    mkdirSync(VSCRIPTS_ABILITIES_DIR, { recursive: true });
  }

  const luaContent = generateLuaWrapper();
  const targetPath = join(VSCRIPTS_ABILITIES_DIR, "rw_modifier_applier_0.lua");

  writeFileSync(targetPath, luaContent, "utf-8");
  console.log(`✅ Lua wrapper written to: ${targetPath}`);
  return true;
}

console.log("T121-R6-R5-R13: RW Ability Instantiation Final Fix");
console.log(`Target host: ${HOST_ROOT}`);
console.log();

const kvOk = restoreRWAbilityKV();
const luaOk = deployLuaWrapper();

console.log();
if (kvOk && luaOk) {
  console.log("🎉 All fixes applied successfully!");
  console.log("");
  console.log("Summary:");
  console.log("  • KV entry: restored in npc_abilities_custom.txt > DOTAAbilities");
  console.log("  • Lua wrapper: generated at game/scripts/vscripts/rune_weaver/abilities/rw_modifier_applier_0.lua");
  console.log("  • ScriptFile path: rune_weaver/abilities/rw_modifier_applier_0");
  console.log("");
  console.log("Next: launch Dota2 and verify rw_modifier_applier_0 appears on hero");
} else {
  console.log("❌ Some fixes failed - check errors above");
  process.exit(1);
}
