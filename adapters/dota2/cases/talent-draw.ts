export interface TalentDrawEntry {
  id: string;
  label: string;
  description: string;
  weight: number;
  tier: string;
}

export interface TalentDrawCanonicalParameters {
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
  entries: TalentDrawEntry[];
}

const TALENT_DRAW_CANONICAL_PARAMETERS: TalentDrawCanonicalParameters = {
  triggerKey: "F4",
  choiceCount: 3,
  drawMode: "multiple_without_replacement",
  duplicatePolicy: "forbid",
  poolStateTracking: "session",
  selectionPolicy: "single",
  applyMode: "immediate",
  postSelectionPoolBehavior: "remove_selected_from_remaining",
  trackSelectedItems: true,
  payloadShape: "card_with_rarity",
  minDisplayCount: 3,
  placeholderConfig: {
    id: "empty_slot",
    name: "Empty Slot",
    description: "No talent available",
    disabled: true,
  },
  effectApplication: {
    enabled: true,
    rarityAttributeBonusMap: {
      R: { attribute: "strength", value: 10 },
      SR: { attribute: "agility", value: 10 },
      SSR: { attribute: "intelligence", value: 10 },
      UR: { attribute: "all", value: 10 },
    },
  },
  entries: [
    { id: "R001", label: "Strength Boost", description: "+10 Strength", weight: 40, tier: "R" },
    { id: "R002", label: "Fortitude", description: "+10 Strength", weight: 40, tier: "R" },
    { id: "SR001", label: "Agility Boost", description: "+10 Agility", weight: 30, tier: "SR" },
    { id: "SR002", label: "Swift Reflexes", description: "+10 Agility", weight: 30, tier: "SR" },
    { id: "SSR001", label: "Intelligence Boost", description: "+10 Intelligence", weight: 20, tier: "SSR" },
    { id: "UR001", label: "Ultimate Growth", description: "+10 All Attributes", weight: 10, tier: "UR" },
  ],
};

function countCanonicalSignals(prompt: string): number {
  const checks = [
    /f4/i.test(prompt),
    /天赋/.test(prompt),
    /三选一|3\s*个|三个/.test(prompt),
    /稀有度|rarity|R、SR、SSR、UR|R,?\s*SR,?\s*SSR,?\s*UR/i.test(prompt),
    /不重复|移除|后续不再出现|remove_selected_from_remaining/.test(prompt),
    /界面|ui|modal|卡片/.test(prompt),
  ];

  return checks.filter(Boolean).length;
}

export function isCanonicalTalentDrawPrompt(prompt: string): boolean {
  return countCanonicalSignals(prompt) >= 4;
}

export function getCanonicalTalentDrawParameters(): Record<string, unknown> {
  return JSON.parse(JSON.stringify(TALENT_DRAW_CANONICAL_PARAMETERS)) as Record<string, unknown>;
}

export function mergeCanonicalTalentDrawParameters(
  prompt: string,
  explicitParameters: Record<string, unknown>
): Record<string, unknown> {
  if (!isCanonicalTalentDrawPrompt(prompt)) {
    return explicitParameters;
  }

  const canonical = getCanonicalTalentDrawParameters();
  return {
    ...canonical,
    ...explicitParameters,
  };
}
