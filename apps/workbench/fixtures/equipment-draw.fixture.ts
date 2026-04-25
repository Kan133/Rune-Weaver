import type { SelectionPoolFeatureAuthoringParameters } from "../../../core/schema/types.js";

import {
  EQUIPMENT_DRAW_DEMO_PARAMETERS,
  equipmentDrawCaseSpec as registryEquipmentDrawCaseSpec,
  type SelectionCaseSpec,
} from "../../../adapters/dota2/cases/selection-demo-registry.js";
import { resolveSelectionPoolCompiledObjects } from "../../../adapters/dota2/families/selection-pool/source-model.js";

export interface EquipmentEntry {
  id: string;
  label: string;
  description: string;
  weight: number;
  tier: string;
  itemName?: string;
}

export interface EquipmentDrawFixture {
  featureId: string;
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
    entries: EquipmentEntry[];
  };
  caseSpec: SelectionCaseSpec;
  authoringParameters: SelectionPoolFeatureAuthoringParameters;
}

function cloneAuthoringParameters(): SelectionPoolFeatureAuthoringParameters {
  return JSON.parse(JSON.stringify(EQUIPMENT_DRAW_DEMO_PARAMETERS)) as SelectionPoolFeatureAuthoringParameters;
}

function buildEntries(): EquipmentEntry[] {
  return resolveSelectionPoolCompiledObjects(EQUIPMENT_DRAW_DEMO_PARAMETERS).objects.map((object) => ({
    id: object.id,
    label: object.label,
    description: object.description,
    weight: object.weight,
    tier: object.tier,
    itemName: object.outcome?.kind === "native_item_delivery" ? object.outcome.itemName : undefined,
  }));
}

function buildFixtureParameters(): EquipmentDrawFixture["parameters"] {
  const params = EQUIPMENT_DRAW_DEMO_PARAMETERS;
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
      id: params.placeholderConfig?.id || "empty_equipment_slot",
      name: params.placeholderConfig?.name || "Empty Slot",
      description: params.placeholderConfig?.description || "No equipment available",
      disabled: params.placeholderConfig?.disabled ?? true,
    },
    entries: buildEntries(),
  };
}

export const equipmentDrawCaseSpec = registryEquipmentDrawCaseSpec;

export const equipmentDrawFixture: EquipmentDrawFixture = {
  featureId: equipmentDrawCaseSpec.featureId,
  prompt: equipmentDrawCaseSpec.prompt,
  parameters: buildFixtureParameters(),
  caseSpec: equipmentDrawCaseSpec,
  authoringParameters: cloneAuthoringParameters(),
};

export function getEquipmentDrawCaseSpec(): SelectionCaseSpec {
  return equipmentDrawCaseSpec;
}
