export const SELECTION_POOL_CANONICAL_MODULE_ROLES = [
  "input_trigger",
  "weighted_pool",
  "selection_flow",
  "selection_outcome",
  "selection_modal",
] as const;

export type SelectionPoolCanonicalModuleRole =
  typeof SELECTION_POOL_CANONICAL_MODULE_ROLES[number];

export const SELECTION_POOL_CANONICAL_PATTERN_IDS = [
  "input.key_binding",
  "data.weighted_pool",
  "rule.selection_flow",
  "effect.outcome_realizer",
  "ui.selection_modal",
] as const;

export const SELECTION_POOL_CANONICAL_BACKBONE_SUMMARY =
  "same selection skeleton: input.key_binding + data.weighted_pool + rule.selection_flow + effect.outcome_realizer + ui.selection_modal";

export function getSelectionPoolCanonicalModuleRoles(): SelectionPoolCanonicalModuleRole[] {
  return [...SELECTION_POOL_CANONICAL_MODULE_ROLES];
}

export function getSelectionPoolCanonicalPatternIds(): string[] {
  return [...SELECTION_POOL_CANONICAL_PATTERN_IDS];
}
