import { TALENT_DRAW_EXAMPLE } from "../../../adapters/dota2/families/selection-pool/__fixtures__/examples.js";

/**
 * Talent Draw Demo Fixture
 *
 * Uses the live selection_pool family example catalog rather than legacy case authority.
 * The fixture shape stays backward-compatible for existing workbench/demo consumers.
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

function buildFixtureParameters(): TalentDrawFixture["parameters"] {
  const params = TALENT_DRAW_EXAMPLE.parameters;
  return {
    triggerKey: params.triggerKey,
    choiceCount: params.choiceCount,
    drawMode: params.drawMode || "multiple_without_replacement",
    duplicatePolicy: params.duplicatePolicy || "forbid",
    poolStateTracking: params.poolStateTracking || "session",
    selectionPolicy: params.selectionPolicy || "single",
    applyMode: params.applyMode || "immediate",
    postSelectionPoolBehavior: params.postSelectionPoolBehavior || "remove_selected_from_remaining",
    trackSelectedItems: params.trackSelectedItems !== false,
    payloadShape: params.display?.payloadShape || "card_with_rarity",
    minDisplayCount: params.display?.minDisplayCount || params.choiceCount,
    placeholderConfig: {
      id: params.placeholderConfig?.id || "empty_selection_slot",
      name: params.placeholderConfig?.name || "Empty Slot",
      description: params.placeholderConfig?.description || "No selection available",
      disabled: params.placeholderConfig?.disabled ?? true,
    },
    effectApplication: {
      enabled: true,
      rarityAttributeBonusMap: params.effectProfile?.rarityAttributeBonusMap || {},
    },
    entries: params.objects.map((object) => ({
      id: object.id,
      label: object.label,
      description: object.description,
      weight: object.weight,
      tier: object.tier,
    })),
  };
}

export const talentDrawFixture: TalentDrawFixture = {
  prompt: TALENT_DRAW_EXAMPLE.createPrompt,
  parameters: buildFixtureParameters(),
};

export function getTalentDrawParameters(): Record<string, unknown> {
  return buildFixtureParameters();
}
