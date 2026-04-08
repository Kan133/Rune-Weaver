/**
 * Rune Weaver - Core Wizard
 */

export * from "./types";
export * from "./intent-schema";

interface TalentEntry {
  id: string;
  label: string;
  description: string;
  weight: number;
  tier: string;
}

export function extractNumericParameters(prompt: string): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  const cooldownMatch = prompt.match(/cooldown\s*(\d+)/i);
  if (cooldownMatch) {
    result.abilityCooldown = parseFloat(cooldownMatch[1]);
  }

  const manaMatch = prompt.match(/蓝耗[：为]?\s*(\d+)|mana\s*cost?\s*(\d+)/i);
  if (manaMatch) {
    result.abilityManaCost = parseInt(manaMatch[1] || manaMatch[2]);
  }

  const durationMatch = prompt.match(/duration\s*(\d+(?:\.\d+)?)/i);
  if (durationMatch) {
    result.abilityDuration = parseFloat(durationMatch[1]);
  }

  const rangeMatch = prompt.match(/距离[：为]?\s*(\d+)|range\s*(\d+)|冲刺距离\s*(\d+)/i);
  if (rangeMatch) {
    result.abilityCastRange = parseInt(rangeMatch[1] || rangeMatch[2] || rangeMatch[3]);
  }

  const choiceMatch = prompt.match(/(\d+)\s*choices?/i);
  if (choiceMatch) {
    result.choiceCount = parseInt(choiceMatch[1]);
  }

  const talentMatches = [...prompt.matchAll(/(power|armor|haste|magic|attack|speed|life|health)\+(\d+)/gi)];
  if (talentMatches.length > 0) {
    const talents: TalentEntry[] = talentMatches.map((match, index) => {
      const type = match[1].toLowerCase();
      const value = parseInt(match[2]);
      
      const talentMap: Record<string, { id: string; label: string; desc: string; tier: string }> = {
        power: { id: 'talent_power', label: 'Power Boost', desc: `+${value} Attack Damage`, tier: 'R' },
        attack: { id: 'talent_attack', label: 'Attack Boost', desc: `+${value} Attack Damage`, tier: 'R' },
        armor: { id: 'talent_armor', label: 'Armor Boost', desc: `+${value} Armor`, tier: 'R' },
        magic: { id: 'talent_magic', label: 'Magic Resist', desc: `+${value}% Magic Resistance`, tier: 'SR' },
        haste: { id: 'talent_haste', label: 'Haste', desc: `+${value} Movement Speed`, tier: 'SR' },
        speed: { id: 'talent_speed', label: 'Speed Boost', desc: `+${value} Movement Speed`, tier: 'SR' },
        life: { id: 'talent_life', label: 'Life Boost', desc: `+${value} Max Health`, tier: 'R' },
        health: { id: 'talent_health', label: 'Health Boost', desc: `+${value} Max Health`, tier: 'R' },
      };
      
      const key = Object.keys(talentMap).find(k => type.includes(k)) || type;
      const talent = talentMap[key] || { id: `talent_${type}`, label: `${type} Boost`, desc: `+${value}`, tier: 'R' };
      
      const weightMap: Record<string, number> = { 'r': 50, 'sr': 30, 'ssr': 15, 'ur': 5 };
      const weight = weightMap[talent.tier.toLowerCase()] || 50;
      
      return {
        id: talent.id,
        label: talent.label,
        description: talent.desc,
        weight,
        tier: talent.tier,
      };
    });
    
    if (talents.length > 0) {
      result.entries = talents;
    }
  }

  return result;
}
