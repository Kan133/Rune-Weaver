import { getCanonicalTalentDrawParameters } from "../../../adapters/dota2/cases/talent-draw.js";

/**
 * Talent Draw Demo Fixture
 * 
 * 用于 E2E demo 和 smoke test，提供完整的 Talent Draw 参数。
 * 不被普通 Wizard 使用，需在 demo/test 中显式导入。
 * 
 * === CANONICAL CASE MAPPING ===
 * This fixture implements the canonical Talent Draw case with the following
 * rarity-to-attribute mapping:
 * 
 * | Rarity | Weight | Attribute        | Value | Description           |
 * |--------|--------|------------------|-------|-----------------------|
 * | R      | 40     | Strength         | +10   | "+10 Strength"        |
 * | SR     | 30     | Agility          | +10   | "+10 Agility"         |
 * | SSR    | 20     | Intelligence     | +10   | "+10 Intelligence"    |
 * | UR     | 10     | All Attributes   | +10   | "+10 All Attributes"  |
 * 
 * Note: Descriptions must match the actual applied effects to ensure UI
 * card fidelity. See: docs/talent-draw-case/CANONICAL-CASE-TALENT-DRAW.md
 */

export interface TalentEntry {
  id: string;
  label: string;
  description: string;
  weight: number;
  tier: string;
}

export interface TalentDrawFixture {
  prompt: string;
  parameters: {
    triggerKey: string;
    choiceCount: number;
    drawMode: string;
    duplicatePolicy: string;
    poolStateTracking: string;
    selectionPolicy: string;
    applyMode: string;
    postSelectionPoolBehavior: string;
    trackSelectedItems: boolean;
    payloadShape: string;
    minDisplayCount: number;
    placeholderConfig: {
      id: string;
      name: string;
      description: string;
      disabled: boolean;
    };
    effectApplication: {
      enabled: boolean;
      rarityAttributeBonusMap: Record<string, { attribute: string; value: number }>;
    };
    entries: TalentEntry[];
  };
}

export const talentDrawFixture: TalentDrawFixture = {
  prompt: "做一个按 F4 触发的三选一天赋抽取系统。玩家按 F4 后，从加权天赋池抽出 3 个候选天赋，显示卡牌选择 UI。玩家选择 1 个后立即应用效果，并且已选择的天赋后续不再出现。",
  parameters: getCanonicalTalentDrawParameters() as TalentDrawFixture["parameters"],
};

// 便捷函数：获取带 fixture 参数的 IntentSchema 扩展
export function getTalentDrawParameters(): Record<string, unknown> {
  return getCanonicalTalentDrawParameters();
}
