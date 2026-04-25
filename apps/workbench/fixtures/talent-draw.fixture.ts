import type { SelectionPoolFeatureAuthoringParameters } from "../../../core/schema/types.js";

import {
  TALENT_DRAW_DEMO_PARAMETERS,
  talentDrawCaseSpec as registryTalentDrawCaseSpec,
  type SelectionCaseSpec,
} from "../../../adapters/dota2/cases/selection-demo-registry.js";
import { resolveSelectionPoolCompiledObjects } from "../../../adapters/dota2/families/selection-pool/source-model.js";

/**
 * Talent Draw Demo Fixture
 *
 * Uses the case-owned selection demo registry while preserving the older fixture shape
 * expected by workbench/demo consumers.
 */

export interface TalentEntry {
  id: string;
  label: string;
  description: string;
  weight: number;
  tier: string;
}

export interface TalentDrawFixture {
  featureId: string;
  prompt: string;
  caseSpec: SelectionCaseSpec;
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
  authoringParameters: SelectionPoolFeatureAuthoringParameters;
}

function getCompiledObjects() {
  return resolveSelectionPoolCompiledObjects(TALENT_DRAW_DEMO_PARAMETERS).objects;
}

function buildCompatibilityEffectApplication(
  objects: ReturnType<typeof getCompiledObjects>,
): TalentDrawFixture["parameters"]["effectApplication"] {
  const rarityAttributeBonusMap = objects.reduce<Record<string, { attribute: string; value: number }>>((result, object) => {
    if (object.outcome?.kind !== "attribute_bonus" || result[object.tier]) {
      return result;
    }
    result[object.tier] = {
      attribute: object.outcome.attribute,
      value: object.outcome.value,
    };
    return result;
  }, {});

  return {
    enabled: Object.keys(rarityAttributeBonusMap).length > 0,
    rarityAttributeBonusMap,
  };
}

function buildFixtureParameters(): TalentDrawFixture["parameters"] {
  const params = TALENT_DRAW_DEMO_PARAMETERS;
  const compiledObjects = getCompiledObjects();
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
    effectApplication: buildCompatibilityEffectApplication(compiledObjects),
    entries: compiledObjects.map((object) => ({
      id: object.id,
      label: object.label,
      description: object.description,
      weight: object.weight,
      tier: object.tier,
    })),
  };
}

function cloneAuthoringParameters(): SelectionPoolFeatureAuthoringParameters {
  return JSON.parse(JSON.stringify(TALENT_DRAW_DEMO_PARAMETERS)) as SelectionPoolFeatureAuthoringParameters;
}

export const talentDrawCaseSpec = registryTalentDrawCaseSpec;

export const talentDrawFixture: TalentDrawFixture = {
  featureId: talentDrawCaseSpec.featureId,
  prompt: talentDrawCaseSpec.prompt,
  caseSpec: talentDrawCaseSpec,
  parameters: buildFixtureParameters(),
  authoringParameters: cloneAuthoringParameters(),
};

export function getTalentDrawParameters(): Record<string, unknown> {
  return buildFixtureParameters();
}

export function getTalentDrawCaseSpec(): SelectionCaseSpec {
  return talentDrawCaseSpec;
}
