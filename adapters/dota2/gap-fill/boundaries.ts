import type { GapFillBoundaryInfo, GapFillBoundaryProvider } from "../../../core/gap-fill/index.js";

const DOTA2_GAP_FILL_BOUNDARIES: GapFillBoundaryInfo[] = [
  {
    id: "selection_flow.effect_mapping",
    label: "Selection flow effect mapping",
    filePath: "adapters/dota2/generator/server/selection-flow.ts",
    anchor: "GAP_FILL_BOUNDARY: selection_flow.effect_mapping",
    allowed: ["rarity_formula", "case_value_mapping", "option_to_effect_translation"],
    forbidden: ["event_channel_changes", "session_ownership_changes", "pattern_binding_changes"],
  },
  {
    id: "weighted_pool.selection_policy",
    label: "Weighted pool selection policy",
    filePath: "adapters/dota2/generator/server/weighted-pool.ts",
    anchor: "GAP_FILL_BOUNDARY: weighted_pool.selection_policy",
    allowed: ["draw_policy_details", "duplicate_handling", "session_filtering"],
    forbidden: ["pool_contract_changes", "host_routing_changes", "undeclared_persistence"],
  },
  {
    id: "ui.selection_modal.payload_adapter",
    label: "Selection modal payload adapter",
    filePath: "adapters/dota2/generator/ui/selection-modal.ts",
    anchor: "GAP_FILL_BOUNDARY: ui.selection_modal.payload_adapter",
    allowed: ["item_normalization", "placeholder_padding", "defensive_fallback_values", "card_presentation_formatting"],
    forbidden: ["root_mount_changes", "transport_event_changes", "less_wiring_changes"],
  },
];

const BOUNDARY_MAP = new Map(DOTA2_GAP_FILL_BOUNDARIES.map((boundary) => [boundary.id, boundary] as const));

export const dota2GapFillBoundaryProvider: GapFillBoundaryProvider = {
  getBoundary(boundaryId: string): GapFillBoundaryInfo | undefined {
    return BOUNDARY_MAP.get(boundaryId);
  },
  listBoundaries(): GapFillBoundaryInfo[] {
    return [...DOTA2_GAP_FILL_BOUNDARIES];
  },
};

const PATTERN_TO_BOUNDARY_IDS: Record<string, string[]> = {
  "rule.selection_flow": ["selection_flow.effect_mapping"],
  "data.weighted_pool": ["weighted_pool.selection_policy"],
  "ui.selection_modal": ["ui.selection_modal.payload_adapter"],
};

export function resolveDota2GapFillBoundaryIdsForPatterns(patternIds: string[]): string[] {
  const resolved = new Set<string>();

  for (const patternId of patternIds) {
    for (const boundaryId of PATTERN_TO_BOUNDARY_IDS[patternId] || []) {
      resolved.add(boundaryId);
    }
  }

  return [...resolved];
}

export function resolveDota2GapFillBoundariesForPatterns(patternIds: string[]): GapFillBoundaryInfo[] {
  return resolveDota2GapFillBoundaryIdsForPatterns(patternIds)
    .map((boundaryId) => dota2GapFillBoundaryProvider.getBoundary(boundaryId))
    .filter((boundary): boundary is GapFillBoundaryInfo => !!boundary);
}
