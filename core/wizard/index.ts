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

  // 提取按键绑定
  const keyMatch = prompt.match(/按([QWERDF]|F\d+|[1-6])键|按键([QWERDF]|F\d+|[1-6])/i);
  if (keyMatch) {
    result.triggerKey = (keyMatch[1] || keyMatch[2]).toUpperCase();
  }

  // 优先匹配"改成/改为/修改为/调整到/更改为/设为/变为"模式（提取目标值）
  const changeMatch = prompt.match(
    /修改为\s*(\d+)|[改修][成变为]\s*(\d+)|调整到\s*(\d+)|更改为\s*(\d+)|设为\s*(\d+)|变为\s*(\d+)/
  );
  if (changeMatch) {
    result.abilityCooldown = parseFloat(
      changeMatch[1] || changeMatch[2] || changeMatch[3] || changeMatch[4] || changeMatch[5] || changeMatch[6]
    );
  } else {
    // 回退逻辑：优先匹配"到/为"后的数字（新值），避免匹配"从"后的数字（旧值）
    const cooldownMatch = prompt.match(
      /cooldown\s*(\d+)|冷却[时间]?\s*(?:到|为)\s*(\d+)/i
    );
    if (cooldownMatch) {
      result.abilityCooldown = parseFloat(cooldownMatch[1] || cooldownMatch[2]);
    }
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
