/**
 * T121-R6-R5-R19: Modifier Registration Shape Alignment
 *
 * ROOT CAUSE (confirmed by working baseline analysis):
 *
 *   Working pattern (crystal_nova_x):
 *     - ability + modifier defined in SAME .ts/.lua file
 *     - @registerModifier() with NO args
 *     - Engine loads ability's ScriptFile → both classes registered
 *     - NO separate modifier KV entry needed
 *
 *   Our broken pattern:
 *     - ability in rw_test_v2.lua  (loaded by engine)
 *     - modifier in modifier_rw_test_v2.lua  (NEVER LOADED!)
 *     - require() path didn't help because vscripts/ is empty, no init.lua
 *
 * FIX: Merge modifier class INTO ability file (same-file pattern)
 */
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

const HOST_ROOT = "D:\\test1";
const NPC_ABILITIES_PATH = join(HOST_ROOT, "game/scripts/npc/npc_abilities_custom.txt");
const ABILITIES_DIR = join(HOST_ROOT, "game/scripts/vscripts/rune_weaver/abilities");

const ABILITY_NAME = "rw_test_v2";
const MODIFIER_NAME = "modifier_rw_test_v2";

function generateMergedLua(): string {
  return `local ____lualib = require("lualib_bundle")
local __TS__Class = ____lualib.__TS__Class
local __TS__ClassExtends = ____lualib.__TS__ClassExtends
local __TS__DecorateLegacy = ____lualib.__TS__DecorateLegacy
local ____exports = {}
local ____dota_ts_adapter = require("utils.dota_ts_adapter")
local BaseAbility = ____dota_ts_adapter.BaseAbility
local BaseModifier = ____dota_ts_adapter.BaseModifier
local registerAbility = ____dota_ts_adapter.registerAbility
local registerModifier = ____dota_ts_adapter.registerModifier

-- ============================================================
-- ABILITY: ${ABILITY_NAME} (same file as modifier - aligned with crystal_nova_x pattern)
-- ============================================================
____exports.${ABILITY_NAME} = __TS__Class()
local ${ABILITY_NAME} = ____exports.${ABILITY_NAME}
${ABILITY_NAME}.name = "${ABILITY_NAME}"
__TS__ClassExtends(${ABILITY_NAME}, BaseAbility)

function ${ABILITY_NAME}.prototype.OnSpellStart(self)
    print("[RW_TEST_V2] OnSpellStart firing...")

    local caster = self:GetCaster()
    local duration = self:GetSpecialValueFor("buff_duration") or 6.0

    print("[RW_TEST_V2] Calling AddNewModifier for: ${MODIFIER_NAME}, duration=" .. tostring(duration))

    -- Use same pattern as crystal_nova_x: modifier.apply(target, caster, ability, params)
    local modifier_applied = ${MODIFIER_NAME}.apply(caster, caster, self, {})

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

-- ============================================================
-- MODIFIER: ${MODIFIER_NAME} (SAME FILE as ability - this is the key fix!)
-- Aligned with crystal_nova_x / modifier_crystal_nova_x_debuff pattern
-- ============================================================
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

-- registerModifier with NO args - same as crystal_nova_x's @registerModifier()
-- LinkLuaModifier will use empty fileName, which works because we're in SAME FILE
${MODIFIER_NAME} = __TS__DecorateLegacy({registerModifier(nil)}, ${MODIFIER_NAME})
____exports.${MODIFIER_NAME} = ${MODIFIER_NAME}
_G.${MODIFIER_NAME} = ${MODIFIER_NAME}

return ____exports`;
}

function removeModifierKVFromAbilitiesTxt(): boolean {
  let content = readFileSync(NPC_ABILITIES_PATH, "utf-8");

  if (!content.includes(`"${MODIFIER_NAME}"`)) {
    console.log(`⚠️ ${MODIFIER_NAME} not found in DOTAAbilities (already clean or never added)`);
    return true;
  }

  const modStart = content.indexOf(`"${MODIFIER_NAME}"`);
  const modEndBlock = content.indexOf("\n}", content.indexOf('"ScriptFile"', modStart));
  if (modEndBlock === -1) {
    console.log("⚠️ Could not find modifier block end, skipping KV removal");
    return true;
  }

  const before = content.substring(0, modStart);
  const after = content.substring(modEndBlock + 2);

  content = before + after;
  writeFileSync(NPC_ABILITIES_PATH, content, "utf-8");
  console.log(`✅ Removed ${MODIFIER_NAME} KV pseudo-entry from DOTAAbilities`);
  return true;
}

console.log("=" .repeat(60));
console.log("T121-R6-R5-R19: Modifier Registration Shape Alignment");
console.log("=" .repeat(60));
console.log();
console.log("ROOT CAUSE ANALYSIS:");
console.log("  Working baseline (crystal_nova_x):");
console.log("    • ability + modifier in SAME .lua file");
console.log("    • @registerModifier() — no args, empty filePath");
console.log("    • Engine loads ScriptFile → both classes auto-registered");
console.log("    • NO separate modifier KV needed");
console.log("");
console.log("  Our broken pattern (T18):");
console.log("    • ability in rw_test_v2.lua (loaded)");
console.log("    • modifier in SEPARATE modifier_rw_test_v2.lua (NEVER loaded!)");
console.log("    • vscripts/ dir has no init.lua to preload anything");
console.log("");
console.log("FIX: Merge modifier into ability file (crystal_nova_x alignment)");
console.log();

const mergedContent = generateMergedLua();
writeFileSync(join(ABILITIES_DIR, `${ABILITY_NAME}.lua`), mergedContent, "utf-8");
console.log(`✅ Merged ability+modifier written to:`);
console.log(`   ${ABILITIES_DIR}\\${ABILITY_NAME}.lua`);

removeModifierKVFromAbilitiesTxt();

console.log("");
console.log("CHANGES vs T121-R18:");
console.log("  ❌ REMOVED: separate modifier_rw_test_v2.lua file");
console.log("  ❌ REMOVED: require() preload hack");
console.log("  ❌ REMOVED: registerModifier(name, filePath) with explicit path");
console.log("  ❌ REMOVED: modifier KV entry from npc_abilities_custom.txt");
console.log("  ✅ ADDED: modifier class INSIDE ability file (same-file pattern)");
console.log("  ✅ USING: registerModifier(nil) — matches crystal_nova_x exactly");
console.log("  ✅ USING: BaseModifier.apply() — matches crystal_nova_x exactly");
console.log("");
console.log("Next: launch Dota2, press D to cast, check console logs");
