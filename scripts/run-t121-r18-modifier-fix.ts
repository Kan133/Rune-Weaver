/**
 * T121-R6-R5-R18: Modifier Registration Fix
 *
 * Root cause: registerModifier(nil) calls LinkLuaModifier with empty fileName.
 * The modifier Lua file is never loaded because:
 *   1. LinkLuaModifier gets "" as filePath
 *   2. No init.lua/preload in vscripts to load it
 *
 * Fix: Two-pronged approach
 *   1. Pass correct filePath to registerModifier() call
 *   2. Add require() in ability OnSpellStart as safety net
 */
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

const HOST_ROOT = "D:\\test1";
const ABILITIES_DIR = join(HOST_ROOT, "game/scripts/vscripts/rune_weaver/abilities");
const MODIFIERS_DIR = join(HOST_ROOT, "game/scripts/vscripts/rune_weaver/modifiers");

const ABILITY_NAME = "rw_test_v2";
const MODIFIER_NAME = "modifier_rw_test_v2";
const MODIFIER_FILE_PATH = "rune_weaver/modifiers/" + MODIFIER_NAME;

function generateAbilityLuaFixed(): string {
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
    print("[RW_TEST_V2] OnSpellStart firing...")

    local caster = self:GetCaster()
    local duration = self:GetSpecialValueFor("buff_duration") or 6.0

    print("[RW_TEST_V2] Preloading modifier: ${MODIFIER_NAME}")
    require("${MODIFIER_FILE_PATH}")

    print("[RW_TEST_V2] Calling AddNewModifier for: ${MODIFIER_NAME}, duration=" .. tostring(duration))
    local modifier_applied = caster:AddNewModifier(caster, self, "${MODIFIER_NAME}", {duration = duration})

    if modifier_applied then
        print("[RW_TEST_V2] ✅ ${MODIFIER_NAME} APPLIED SUCCESSFULLY!")
    else
        print("[RW_TEST_V2] ❌ AddNewModifier returned nil!")
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

function generateModifierLuaFixed(): string {
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
    print("[${MODIFIER_NAME}] ✅ OnCreated FIRED! Parent=" .. self:GetParent():GetUnitName())
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

-- FIX: Pass filePath to registerModifier so LinkLuaModifier gets the correct path
${MODIFIER_NAME} = __TS__DecorateLegacy({registerModifier("${MODIFIER_NAME}", "${MODIFIER_FILE_PATH}")}, ${MODIFIER_NAME})
____exports.${MODIFIER_NAME} = ${MODIFIER_NAME}
_G.${MODIFIER_NAME} = ${MODIFIER_NAME}
return ____exports`;
}

console.log("=" .repeat(60));
console.log("T121-R6-R5-R18: Modifier Registration Fix");
console.log("=" .repeat(60));
console.log();
console.log("ROOT CAUSE:");
console.log("  1. registerModifier(nil) → LinkLuaModifier(name, '', NONE) — empty path!");
console.log("  2. No init.lua in vscripts → modifier Lua never loaded");
console.log("");
console.log("FIX (two-pronged):");
console.log("  A. registerModifier(name, filePath) — LinkLuaModifier gets real path");
console.log("  B. require(modifier_file) in OnSpellStart — safety net preload");
console.log();

const abilityContent = generateAbilityLuaFixed();
const modifierContent = generateModifierLuaFixed();

writeFileSync(join(ABILITIES_DIR, `${ABILITY_NAME}.lua`), abilityContent, "utf-8");
writeFileSync(join(MODIFIERS_DIR, `${MODIFIER_NAME}.lua`), modifierContent, "utf-8");

console.log("✅ Files regenerated with registration fix:");
console.log(`   ${ABILITIES_DIR}\\${ABILITY_NAME}.lua`);
console.log(`   ${MODIFIERS_DIR}\\${MODIFIER_NAME}.lua`);
console.log("");
console.log("CHANGES vs previous version:");
console.log("   Ability:  +require('${MODIFIER_FILE_PATH}') before AddNewModifier");
console.log("   Modifier: registerModifier(nil) → registerModifier('${MODIFIER_NAME}', '${MODIFIER_FILE_PATH}')");
console.log("");
console.log("Next: launch Dota2, press D to cast rw_test_v2, check console logs");
