import { dota2Patterns } from "../../adapters/dota2/patterns/index";

export const CANONICAL_AVAILABLE_PATTERNS = new Set(
  dota2Patterns.map(p => p.id)
);

export function isCanonicalPatternAvailable(patternId: string): boolean {
  return CANONICAL_AVAILABLE_PATTERNS.has(patternId);
}

export const CORE_PATTERN_IDS = {
  INPUT_KEY_BINDING: "input.key_binding",
  DATA_WEIGHTED_POOL: "data.weighted_pool",
  RULE_SELECTION_FLOW: "rule.selection_flow",
  EFFECT_DASH: "effect.dash",
  EFFECT_MODIFIER_APPLIER: "effect.modifier_applier",
  EFFECT_RESOURCE_CONSUME: "effect.resource_consume",
  RESOURCE_BASIC_POOL: "resource.basic_pool",
  UI_SELECTION_MODAL: "ui.selection_modal",
  UI_KEY_HINT: "ui.key_hint",
  UI_RESOURCE_BAR: "ui.resource_bar",
  DOTA2_SHORT_TIME_BUFF: "dota2.short_time_buff",
} as const;

export type CorePatternId = typeof CORE_PATTERN_IDS[keyof typeof CORE_PATTERN_IDS];
