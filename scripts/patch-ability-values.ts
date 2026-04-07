import { readFileSync, writeFileSync } from "fs";
const path = "D:\\test1\\game\\scripts\\npc\\npc_abilities_custom.txt";
let content = readFileSync(path, "utf-8");
const oldAbility = `"rw_modifier_applier_0"
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
const newAbility = `"rw_modifier_applier_0"
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
	"AbilityValues"		{
		"duration"		"5.0 5.5 6.0 6.5"
		"movespeed_bonus"		"50 60 70 80"
	}
}`;
if (!content.includes(oldAbility)) {
  console.log("⚠️ Ability block pattern not found, trying alternative match...");
  const altOld = content.substring(content.indexOf('"rw_modifier_applier_0"'), content.indexOf("}\n\n", content.indexOf('"rw_modifier_applier_0"')) + 1);
  const altNew = altOld.replace(/"AbilityCastRange"\t\t\t"0"\n\}/, '"AbilityCastRange"\t\t\t"0"\n\t"AbilityValues"\t\t{\n\t\t"duration"\t\t"5.0 5.5 6.0 6.5"\n\t\t"movespeed_bonus"\t"50 60 70 80"\n\t}\n}');
  content = content.replace(altOld, altNew);
} else {
  content = content.replace(oldAbility, newAbility);
}
writeFileSync(path, content, "utf-8");
console.log("✅ AbilityValues (duration + movespeed_bonus) patched into rw_modifier_applier_0");
