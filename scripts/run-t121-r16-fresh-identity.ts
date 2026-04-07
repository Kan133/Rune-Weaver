/**
 * T121-R6-R5-R16: RW Buff Revalidation with Fresh Ability Identity
 *
 * Complete fresh identity to exclude cache/historical artifact interference.
 *
 * New identity:
 *   - Ability:  rw_test_v2
 *   - Modifier: modifier_rw_test_v2
 *
 * This is a clean-slate reimplementation, NOT a patch of old artifacts.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";

const HOST_ROOT = "D:\\test1";
const NPC_ABILITIES_PATH = join(HOST_ROOT, "game/scripts/npc/npc_abilities_custom.txt");
const ABILITIES_DIR = join(HOST_ROOT, "game/scripts/vscripts/rune_weaver/abilities");
const MODIFIERS_DIR = join(HOST_ROOT, "game/scripts/vscripts/rune_weaver/modifiers");

const ABILITY_NAME = "rw_test_v2";
const MODIFIER_NAME = "modifier_rw_test_v2";

const ABILITY_KV = `"${ABILITY_NAME}"
{
	"BaseClass"		"ability_lua"
	"AbilityBehavior"		"DOTA_ABILITY_BEHAVIOR_NO_TARGET"
	"ScriptFile"		"rune_weaver/abilities/${ABILITY_NAME}"
	"AbilityType"		"DOTA_ABILITY_TYPE_BASIC"
	"AbilityTextureName"	"invoker_quas spirits"
	"MaxLevel"		"1"
	"RequiredLevel"		"1"
	"AbilityCastPoint"		"0.0"
	"AbilityCooldown"		"10.0"
	"AbilityManaCost"		"30"
	"AbilityCastRange"		"0"
	"AbilityValues"		{
		"buff_duration"		"6.0"
		"movespeed_bonus"		"80"
	}
}`;

const MODIFIER_KV = `"${MODIFIER_NAME}"
{
	"BaseClass"			"modifier_lua"
	"IsHidden"			"0"
	"IsDebuff"			"0"
	"IsPurgable"			"1"
	"IsBuff"			"1"
	"ScriptFile"			"rune_weaver/modifiers/${MODIFIER_NAME}"
}`;

function generateAbilityLua(): string {
  return `local ____lualib = require("lualib_bundle")
local __TS__Class = ____lualib.__TS__Class
local __TS__ClassExtends = ____lualib.__TS__ClassExtends
local __TS__DecorateLegacy = ____lualib.__TS__DecorateLegacy
local ____exports = {}
local ____dota_ts_adapter = require("utils.dota_ts_adapter")
local BaseAbility = ____dota_ts_adapter.BaseAbility
local registerAbility = ____dota_ts_adapter.registerAbility

____exports.${ABILITY_NAME} = __TS__Class()
local ${ABILITY_NAME} = ____exports.${ABILITY_NAME}
${ABILITY_NAME}.name = "${ABILITY_NAME}"
__TS__ClassExtends(${ABILITY_NAME}, BaseAbility)

function ${ABILITY_NAME}.prototype.OnSpellStart(self)
    local caster = self:GetCaster()
    local duration = self:GetSpecialValueFor("buff_duration") or 6.0

    print("[RW_TEST_V2] OnSpellStart fired! Caster=" .. caster:GetUnitName() .. " Duration=" .. tostring(duration))

    local modifier_applied = caster:AddNewModifier(caster, self, "${MODIFIER_NAME}", {duration = duration})

    if modifier_applied then
        print("[RW_TEST_V2] Modifier ${MODIFIER_NAME} applied successfully!")
    else
        print("[RW_TEST_V2] WARNING: AddNewModifier returned nil!")
    end

    self:PlayEffects()
end

function ${ABILITY_NAME}.prototype.PlayEffects(self)
    local sound = "Hero_Invoker.Quas.Spirit"
    EmitSoundOn(sound, self:GetCaster())
    print("[RW_TEST_V2] PlayEffects done")
end

${ABILITY_NAME} = __TS__DecorateLegacy({registerAbility(nil)}, ${ABILITY_NAME})
____exports.${ABILITY_NAME} = ${ABILITY_NAME}
_G.${ABILITY_NAME} = ${ABILITY_NAME}
return ____exports`;
}

function generateModifierLua(): string {
  return `local ____lualib = require("lualib_bundle")
local __TS__Class = ____lualib.__TS__Class
local __TS__ClassExtends = ____lualib.__TS__ClassExtends
local __TS__DecorateLegacy = ____lualib.__TS__DecorateLegacy
local ____exports = {}
local ____dota_ts_adapter = require("utils.dota_ts_adapter")
local BaseModifier = ____dota_ts_adapter.BaseModifier
local registerModifier = ____dota_ts_adapter.registerModifier

____exports.${MODIFIER_NAME} = __TS__Class()
local ${MODIFIER_NAME} = ____exports.${MODIFIER_NAME}
${MODIFIER_NAME}.name = "${MODIFIER_NAME}"
__TS__ClassExtends(${MODIFIER_NAME}, BaseModifier)

function ${MODIFIER_NAME}.prototype:IsHidden()
    return false
end

function ${MODIFIER_NAME}.prototype:IsDebuff()
    return false
end

function ${MODIFIER_NAME}.prototype:IsPurgable()
    return true
end

function ${MODIFIER_NAME}.prototype:IsBuff()
    return true
end

function ${MODIFIER_NAME}.prototype:GetStatusEffectName()
    return "particles/status_fx/status_effect_frost.vpcf"
end

function ${MODIFIER_NAME}.prototype:StatusEffectPriority()
    return 10
end

function ${MODIFIER_NAME}.prototype:DeclareFunctions()
    return {
        MODIFIER_PROPERTY_MOVESPEED_BONUS_CONSTANT,
    }
end

function ${MODIFIER_NAME}.prototype:GetModifierMoveSpeedBonus_Constant()
    local bonus = self:GetAbility():GetSpecialValueFor("movespeed_bonus") or 80
    return bonus
end

function ${MODIFIER_NAME}.prototype:OnCreated(keys)
    print("[${MODIFIER_NAME}] OnCreated! Parent=" .. self:GetParent():GetUnitName())
    if IsServer() then
        local particle = "particles/generic_gameplay/generic_slowed_cold.vpcf"
        self.particle_id = ParticleManager:CreateParticle(particle, PATTACH_ABSORIGIN_FOLLOW, self:GetParent())
        print("[${MODIFIER_NAME}] Particle created, id=" .. tostring(self.particle_id))
    end
end

function ${MODIFIER_NAME}.prototype:OnDestroy()
    print("[${MODIFIER_NAME}] OnDestroy called")
    if IsServer() and self.particle_id then
        ParticleManager:DestroyParticle(self.particle_id, false)
        ParticleManager:ReleaseParticleIndex(self.particle_id)
        print("[${MODIFIER_NAME}] Particle cleaned up")
    end
end

${MODIFIER_NAME} = __TS__DecorateLegacy({registerModifier(nil)}, ${MODIFIER_NAME})
____exports.${MODIFIER_NAME} = ${MODIFIER_NAME}
_G.${MODIFIER_NAME} = ${MODIFIER_NAME}
return ____exports`;
}

function addKVToDOTAAbilities(kvBlock: string): boolean {
  let content = readFileSync(NPC_ABILITIES_PATH, "utf-8");

  const blockNameMatch = kvBlock.match(/^"([^"]+)"/);
  if (!blockNameMatch) { console.error("❌ Could not extract name from KV block"); return false; }
  const blockName = blockNameMatch[1];

  if (content.includes('"' + blockName + '"')) {
    console.log(`⚠️ ${blockName} already in DOTAAbilities (skipping)`);
    return true;
  }

  const insertPos = content.lastIndexOf("}\n");
  if (insertPos === -1) { console.error("❌ Could not find DOTAAbilities closing brace"); return false; }

  content = content.substring(0, insertPos) + "\n\n" + kvBlock + "\n}\n";
  writeFileSync(NPC_ABILITIES_PATH, content, "utf-8");
  console.log(`✅ ${blockName} KV added to DOTAAbilities`);
  return true;
}

function deployLuaFile(content: string, dir: string, filename: string): boolean {
  if (!existsSync(dir)) { mkdirSync(dir, { recursive: true }); }
  const targetPath = join(dir, filename);
  writeFileSync(targetPath, content, "utf-8");
  console.log(`✅ Lua file written: ${targetPath}`);
  return true;
}

console.log("=" .repeat(60));
console.log("T121-R6-R5-R16: Fresh Identity RW Buff Revalidation");
console.log("=" .repeat(60));
console.log();
console.log(`New Ability:   ${ABILITY_NAME}`);
console.log(`New Modifier:  ${MODIFIER_NAME}`);
console.log(`Target Host:   ${HOST_ROOT}`);
console.log();

const kv1Ok = addKVToDOTAAbilities(ABILITY_KV);
const kv2Ok = addKVToDOTAAbilities(MODIFIER_KV);
const lua1Ok = deployLuaFile(generateAbilityLua(), ABILITIES_DIR, `${ABILITY_NAME}.lua`);
const lua2Ok = deployLuaFile(generateModifierLua(), MODIFIERS_DIR, `${MODIFIER_NAME}.lua`);

console.log();
if (kv1Ok && kv2Ok && lua1Ok && lua2Ok) {
  console.log("🎉 Fresh identity deployed successfully!");
  console.log("");
  console.log("DEPLOYMENT SUMMARY:");
  console.log(`  Ability KV:     npc_abilities_custom.txt > DOTAAbilities > "${ABILITY_NAME}"`);
  console.log(`  Ability Lua:    vscripts/rune_weaver/abilities/${ABILITY_NAME}.lua`);
  console.log(`  Modifier KV:    npc_abilities_custom.txt > DOTAAbilities > "${MODIFIER_NAME}"`);
  console.log(`  Modifier Lua:   vscripts/rune_weaver/modifiers/${MODIFIER_NAME}.lua`);
  console.log("");
  console.log("OBSERVABLE EFFECTS (on cast):");
  console.log("  1. Console prints: [RW_TEST_V2] / [modifier_rw_test_v2] debug lines");
  console.log("  2. Sound: Hero_Invoker.Quas.Spirit");
  console.log("  3. Frost status effect icon above hero head");
  console.log("  4. Cold particle attached to hero body");
  console.log("  5. +80 movement speed for 6 seconds");
  console.log("  6. Buff visible in buff bar, purgable");
  console.log("");
  console.log("CACHE-SAFETY:");
  console.log("  • Completely new names - zero overlap with old rw_modifier_applier_0");
  console.log("  • Zero overlap with modifier_rw_buff");
  console.log("  • If this works but old didn't -> cache/artifact confirmed as root cause");
  console.log("");
  console.log("Next: launch Dota2, give hero the ability, cast it, check console + buff bar");
} else {
  console.log("❌ Some deployments failed");
  process.exit(1);
}
