/**
 * Dota2 Ability Lua Wrapper Generator
 *
 * Generates Lua ability wrappers compatible with Dota2's ability_lua system.
 * Includes global (_G) registration for AddAbility() compatibility.
 *
 * T121 Learnings Formalized:
 * - T14: Use PATTACH_* Lua globals, NOT ParticleAttachment.* (TS-only API)
 * - T19: Modifier class MUST be in SAME FILE as ability (engine only loads ScriptFile)
 * - T20: Use native AddNewModifier(), NOT BaseModifier.apply() (static method not in _G)
 *
 * T128: Extended with archetype discriminator.
 *   "buff" (default): short-duration stat modifier — no periodic logic
 *   "dot": damage-over-time modifier — requires OnIntervalThink
 *
 * Extensibility model (T128 findings):
 *   Shared: abilityName, modifierName, isHidden/IsDebuff/IsPurgable/IsBuff, statusEffectName,
 *           statusEffectPriority, onCreated, onDestroy, declareFunctions, modifierFunctions
 *   Archetype-specific: archetype discriminator + optional dotDamage + dotInterval
 */

export type ModifierArchetype = "buff" | "dot";

export interface AbilityLuaWrapperConfig {
  /** Ability name (e.g., "rw_test_v2") */
  abilityName: string;
  /** Discriminator: "buff" = stat modifier, "dot" = damage-over-time (default: "buff") */
  archetype?: ModifierArchetype;
  /** OnSpellStart logic */
  onSpellStart?: string;
  /** Additional methods on the ability */
  additionalMethods?: string;
  /**
   * Optional: inline modifier definition.
   * If provided, generates modifier class IN THE SAME FILE as ability.
   *
   * T19 Learning: Dota2 engine only loads the ability's ScriptFile.
   * Separate modifier files are NEVER loaded unless there's an init.lua/preload.
   * The working pattern from crystal_nova_x is: ability + modifier in same file.
   */
  modifierConfig?: AbilityModifierConfig;
}

export interface AbilityModifierConfig {
  /** Modifier name (e.g., "modifier_rw_test_v2") */
  name: string;
  /** Discriminator: "buff" | "dot" (default: "buff") */
  archetype?: ModifierArchetype;
  /** IsHidden default */
  isHidden?: boolean;
  /** IsDebuff default */
  isDebuff?: boolean;
  /** IsPurgable default */
  isPurgable?: boolean;
  /** IsBuff default */
  isBuff?: boolean;
  /** Status effect particle path */
  statusEffectName?: string;
  /** Status effect priority */
  statusEffectPriority?: number;
  /** DeclareFunctions return array (e.g., MODIFIER_PROPERTY_MOVESPEED_BONUS_CONSTANT) */
  declareFunctions?: string;
  /** GetModifier* function bodies (keyed by function name) */
  modifierFunctions?: Record<string, string>;
  /** OnCreated body (after 'function OnCreated(self)') */
  onCreated?: string;
  /** OnDestroy body (after 'function OnDestroy(self)') */
  onDestroy?: string;
  /** T128: DOT archetype — damage per tick (absolute value, e.g. 50) */
  dotDamage?: number;
  /** T128: DOT archetype — interval between ticks in seconds (default: 1.0) */
  dotInterval?: number;
}

/** Placeholder used in template strings before substitution */
const PLACEHOLDER_ABILITY = "__ABILITY_NAME_PLACEHOLDER__";

const DEFAULT_PLAY_EFFECTS_BUFF = `function ${PLACEHOLDER_ABILITY}.prototype.PlayEffects(self)
    local particle = "particles/units/heroes/hero_ogre_magi/ogre_magi_bloodlust_target.vpcf"
    local sound = "Hero_OgreMagi.Bloodlust.Target"
    local effect = ParticleManager:CreateParticle(particle, PATTACH_ABSORIGIN_FOLLOW, self:GetCaster())
    ParticleManager:ReleaseParticleIndex(effect)
    EmitSoundOn(sound, self:GetCaster())
end`;

const DEFAULT_PLAY_EFFECTS_DEBUFF = `function ${PLACEHOLDER_ABILITY}.prototype.PlayEffects(self)
    local particle = "particles/generic_gameplay/generic_slowed_cold.vpcf"
    local sound = "Hero_Crystal.CrystalNova"
    local effect = ParticleManager:CreateParticle(particle, PATTACH_ABSORIGIN_FOLLOW, self:GetCaster())
    ParticleManager:ReleaseParticleIndex(effect)
    EmitSoundOn(sound, self:GetCaster())
end`;

const DEFAULT_ON_SPELL_START = (abilityName: string, modifierName: string | null) => {
  if (modifierName) {
    return `    local caster = self:GetCaster()
    local duration = self:GetSpecialValueFor("buff_duration") or 6.0

    -- T20 Learning: use native AddNewModifier, NOT BaseModifier.apply()
    -- BaseModifier.apply() is a static method not copied to _G by registerModifier
    local modifier_applied = caster:AddNewModifier(caster, self, "${modifierName}", {duration = duration})

    if modifier_applied then
        print("[${abilityName}] ✅ ${modifierName} applied")
    else
        print("[${abilityName}] ❌ ${modifierName} AddNewModifier returned nil")
    end

    self:PlayEffects()`;
  }
  return `    local caster = self:GetCaster()
    caster:AddNewModifier(caster, self, "modifier_generic", {duration = 5.0})
    self:PlayEffects()`;
};

function generateModifierClass(
  config: AbilityModifierConfig,
  abilityName: string,
): string {
  const modName = config.name;
  const archetype = config.archetype || "buff";
  const hidden = config.isHidden !== undefined ? config.isHidden : false;
  const debuff = config.isDebuff !== undefined ? config.isDebuff : archetype === "dot";
  const purgable = config.isPurgable !== undefined ? config.isPurgable : true;
  const isBuff = config.isBuff !== undefined ? config.isBuff : archetype === "buff";

  const statusEffect = config.statusEffectName || (archetype === "dot"
    ? "particles/status_fx/status_effect_poison.vpcf"
    : "particles/status_fx/status_effect_frost.vpcf");
  const statusPriority = config.statusEffectPriority || 10;

  const funcBodies: string[] = [];
  if (config.modifierFunctions) {
    for (const [funcName, body] of Object.entries(config.modifierFunctions)) {
      funcBodies.push(`function ${modName}.prototype.${funcName}(self)
${body}
end`);
    }
  }

  const onCreatedBody = config.onCreated || `    print("[${modName}] OnCreated")`;
  const onDestroyBody = config.onDestroy || `    print("[${modName}] OnDestroy")`;

  const interval = archetype === "dot" ? (config.dotInterval ?? 1.0) : null;
  const damage = archetype === "dot" ? (config.dotDamage ?? 50) : null;

  return `
-- ============================================================
-- MODIFIER: ${modName} (same file as ability — T19 pattern)
-- Archetype: ${archetype}
-- Engine only loads ScriptFile; separate modifier files are never loaded.
-- ============================================================
____exports.${modName} = __TS__Class()
local ${modName} = ____exports.${modName}
${modName}.name = "${modName}"
__TS__ClassExtends(${modName}, BaseModifier)

function ${modName}.prototype:IsHidden()
    return ${hidden}
end

function ${modName}.prototype:IsDebuff()
    return ${debuff}
end

function ${modName}.prototype:IsPurgable()
    return ${purgable}
end

function ${modName}.prototype:IsBuff()
    return ${isBuff}
end

function ${modName}.prototype:GetStatusEffectName()
    return "${statusEffect}"
end

function ${modName}.prototype:StatusEffectPriority()
    return ${statusPriority}
end

${config.declareFunctions ? `function ${modName}.prototype:DeclareFunctions(self)
    return ${config.declareFunctions}
end` : ""}

${archetype === "dot" && interval !== null && damage !== null ? `
function ${modName}.prototype:OnIntervalThink(self)
    -- T128 fix: victim = self:GetParent() (the unit the modifier is attached to),
    -- NOT self:GetCaster() (who cast the ability).
    -- For no-target self-DOT: parent = caster (correct self-damage).
    -- For targeted DOT: parent = target (correct enemy damage).
    local caster = self:GetCaster()
    local target = self:GetParent()
    local ability = self:GetAbility()
    if not caster or caster:IsNull() then return end
    if not target or target:IsNull() then return end
    if not target:IsAlive() then return end
    if target:IsInvulnerable() then return end
    if target:IsMagicImmune() then return end
    local damage_table = {
        victim = target,
        attacker = caster,
        ability = ability,
        damage = ${damage},
        damage_type = DAMAGE_TYPE_MAGICAL,
    }
    ApplyDamage(damage_table)
    print("[${modName}] tick damage on " .. target:GetUnitName() .. ": " .. ${damage})
end` : ""}

${funcBodies.join("\n\n")}

function ${modName}.prototype:OnCreated(self)
${onCreatedBody}
    ${archetype === "dot" && interval !== null ? `self:StartIntervalThink(${interval})` : ""}
end

function ${modName}.prototype:OnDestroy(self)
${onDestroyBody}
end

-- T19 + T20: registerModifier(nil) + no .apply() — matches crystal_nova_x exactly
${modName} = __TS__DecorateLegacy({registerModifier(nil)}, ${modName})
____exports.${modName} = ${modName}
_G.${modName} = ${modName}`;
}

/**
 * Generate a Lua ability wrapper with global registration.
 *
 * If modifierConfig is provided, includes modifier class in same file (T19 pattern).
 */
export function generateAbilityLuaWrapper(config: AbilityLuaWrapperConfig): string {
  const { abilityName, archetype, onSpellStart, additionalMethods, modifierConfig } = config;
  const hasModifier = !!modifierConfig;
  const modifierName = modifierConfig?.name || null;
  const effectiveArchetype = modifierConfig?.archetype ?? archetype ?? "buff";
  
  const playEffectsTemplate = effectiveArchetype === "dot" ? DEFAULT_PLAY_EFFECTS_DEBUFF : DEFAULT_PLAY_EFFECTS_BUFF;
  const playEffectsCode = playEffectsTemplate.replace(PLACEHOLDER_ABILITY, abilityName);
  const onSpellStartCode = onSpellStart || DEFAULT_ON_SPELL_START(abilityName, modifierName);

  let modifierBlock = "";
  if (hasModifier && modifierConfig) {
    const effectiveArchetype = modifierConfig.archetype ?? archetype ?? "buff";
    modifierBlock = generateModifierClass({ ...modifierConfig, archetype: effectiveArchetype }, abilityName);
  }

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
-- ABILITY: ${abilityName}
-- ============================================================
____exports.${abilityName} = __TS__Class()
local ${abilityName} = ____exports.${abilityName}
${abilityName}.name = "${abilityName}"
__TS__ClassExtends(${abilityName}, BaseAbility)

function ${abilityName}.prototype.OnSpellStart(self)
${onSpellStartCode}
end

${playEffectsCode}

${additionalMethods || ''}${abilityName} = __TS__DecorateLegacy({registerAbility(nil)}, ${abilityName})
____exports.${abilityName} = ${abilityName}
_G.${abilityName} = ${abilityName}
${modifierBlock}

return ____exports`;
}