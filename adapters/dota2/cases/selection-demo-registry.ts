import type {
  OutcomeSpec,
  SelectionPoolFeatureAuthoringParameters,
  SelectionPoolLocalCollection,
  SelectionPoolObjectKind,
  SelectionPoolObjectTier,
  SelectionPoolPoolEntry,
} from "../../../core/schema/types.js";
import {
  getSelectionPoolCanonicalPatternIds,
} from "../../../core/schema/selection-pool-profile.js";
import {
  DOTA2_CURATED_NATIVE_ITEMS_CATALOG_ID,
} from "../families/selection-pool/content-catalogs.js";
import {
  createExternalCatalogEntry,
} from "../families/selection-pool/source-model.js";

export interface SelectionCaseSmokeExpectations {
  objectKind: SelectionPoolObjectKind;
  requiredPatternIds: string[];
  wizardSpecificParams: string[];
  requiredOutcomeKinds: OutcomeSpec["kind"][];
  generatedContentIndicators: string[];
  runtimeChecks: string[];
}

export interface SelectionCaseSpec {
  caseId: string;
  featureId: string;
  prompt: string;
  authoringParameters: SelectionPoolFeatureAuthoringParameters;
  evidenceDir: string;
  smokeExpectations: SelectionCaseSmokeExpectations;
}

interface SelectionPoolDemoObject {
  objectId: string;
  label: string;
  description: string;
  outcome?: OutcomeSpec;
}

interface SelectionPoolDemoCaseInput {
  caseId: string;
  featureId: string;
  prompt: string;
  authoringParameters: SelectionPoolFeatureAuthoringParameters;
  evidenceDir: string;
  objectKind: SelectionPoolObjectKind;
  requiredOutcomeKinds: OutcomeSpec["kind"][];
  generatedContentIndicators: string[];
  runtimeChecks: string[];
}

export const DEFAULT_SELECTION_CASE_WIZARD_SPECIFIC_PARAMS = [
  "objectKind",
  "localCollections",
  "poolEntries",
  "display",
  "poolStateTracking",
  "postSelectionPoolBehavior",
  "placeholderConfig",
  "drawMode",
  "duplicatePolicy",
] as const;

export const DEFAULT_SELECTION_CASE_REQUIRED_PATTERN_IDS = getSelectionPoolCanonicalPatternIds();

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export function createSelectionCaseSpec(input: SelectionPoolDemoCaseInput): SelectionCaseSpec {
  return {
    caseId: input.caseId,
    featureId: input.featureId,
    prompt: input.prompt,
    authoringParameters: clone(input.authoringParameters),
    evidenceDir: input.evidenceDir,
    smokeExpectations: {
      objectKind: input.objectKind,
      requiredPatternIds: [...DEFAULT_SELECTION_CASE_REQUIRED_PATTERN_IDS],
      wizardSpecificParams: [...DEFAULT_SELECTION_CASE_WIZARD_SPECIFIC_PARAMS],
      requiredOutcomeKinds: [...input.requiredOutcomeKinds],
      generatedContentIndicators: [...input.generatedContentIndicators],
      runtimeChecks: [...input.runtimeChecks],
    },
  };
}

function createDisplayDefaults(
  objectKind: SelectionPoolObjectKind,
): NonNullable<SelectionPoolFeatureAuthoringParameters["display"]> {
  if (objectKind === "equipment") {
    return {
      title: "Choose Your Equipment",
      description: "Select one of the following equipments",
      inventoryTitle: "Equipment Inventory",
      payloadShape: "card_with_rarity",
      minDisplayCount: 3,
    };
  }

  if (objectKind === "skill_card_placeholder") {
    return {
      title: "Choose Your Skill Card",
      description: "Select one of the following skill cards",
      inventoryTitle: "Skill Card Inventory",
      payloadShape: "card_with_rarity",
      minDisplayCount: 3,
    };
  }

  return {
    title: "Choose Your Talent",
    description: "Select one of the following talents",
    inventoryTitle: "Talent Inventory",
    payloadShape: "card_with_rarity",
    minDisplayCount: 3,
  };
}

function createPlaceholderConfig(
  objectKind: SelectionPoolObjectKind,
): NonNullable<SelectionPoolFeatureAuthoringParameters["placeholderConfig"]> {
  if (objectKind === "equipment") {
    return {
      id: "empty_equipment_slot",
      name: "Empty Slot",
      description: "No equipment available",
      disabled: true,
    };
  }

  if (objectKind === "skill_card_placeholder") {
    return {
      id: "empty_skill_card_slot",
      name: "Empty Slot",
      description: "No skill card available",
      disabled: true,
    };
  }

  return {
    id: "empty_talent_slot",
    name: "Empty Slot",
    description: "No talent available",
    disabled: true,
  };
}

function createTalentOutcome(tier: SelectionPoolObjectTier): NonNullable<SelectionPoolDemoObject["outcome"]> {
  if (tier === "R") {
    return { kind: "attribute_bonus", attribute: "strength", value: 10 };
  }
  if (tier === "SR") {
    return { kind: "attribute_bonus", attribute: "agility", value: 10 };
  }
  if (tier === "SSR") {
    return { kind: "attribute_bonus", attribute: "intelligence", value: 10 };
  }
  return { kind: "attribute_bonus", attribute: "all", value: 10 };
}

function createLocalCollection(
  collectionId: string,
  objects: SelectionPoolDemoObject[],
  visibility: "local" | "exported" = "local",
): SelectionPoolLocalCollection {
  return {
    collectionId,
    visibility,
    objects: objects.map((object) => ({
      objectId: object.objectId,
      label: object.label,
      description: object.description,
      ...(object.outcome ? { outcome: object.outcome } : {}),
    })),
  };
}

function createLocalPoolEntries(
  collectionId: string,
  objects: Array<SelectionPoolDemoObject & { tier: SelectionPoolObjectTier; weight: number }>,
): SelectionPoolPoolEntry[] {
  return objects.map((object) => ({
    entryId: object.objectId,
    objectRef: {
      source: "local_collection",
      collectionId,
      objectId: object.objectId,
    },
    weight: object.weight,
    tier: object.tier,
  }));
}

function createBaseParameters(
  objectKind: SelectionPoolObjectKind,
  localCollections: SelectionPoolLocalCollection[],
  poolEntries: SelectionPoolPoolEntry[],
): SelectionPoolFeatureAuthoringParameters {
  return {
    triggerKey: "F4",
    choiceCount: 3,
    objectKind,
    localCollections,
    poolEntries,
    drawMode: "multiple_without_replacement",
    duplicatePolicy: "forbid",
    poolStateTracking: "session",
    selectionPolicy: "single",
    applyMode: "immediate",
    postSelectionPoolBehavior: "remove_selected_from_remaining",
    trackSelectedItems: true,
    display: createDisplayDefaults(objectKind),
    placeholderConfig: createPlaceholderConfig(objectKind),
  };
}

export const TALENT_DRAW_DEMO_CREATE_PROMPT =
  "Create a talent draw system triggered by F4. When the player presses F4, draw 3 candidates from a weighted talent pool, show a card selection UI, let the player confirm one talent, apply it immediately, and make selected talents not appear again in future draws during the same session.";

export const TALENT_DRAW_DEMO_INVENTORY_UPDATE_PROMPT =
  'Add a persistent 15-slot talent inventory panel to the existing talent draw system. Each confirmed talent is stored in the panel. When the inventory is full, pressing F4 should stop opening new draws and show "Talent inventory full". Keep the current F4 three-choice draw flow, rarity display, and remove-selected-from-future-draws behavior unchanged.';

export const TALENT_DRAW_DEMO_SOURCE_UPDATE_PROMPT =
  "Expand the existing talent_draw_demo talent pool so it contains 20 total talents. Keep the current F4 three-choice flow, immediate application, and remove-selected-from-future-draws behavior unchanged. If an inventory panel already exists, keep it unchanged. The 14 new talents can use placeholder names, descriptions, rarities, and weights.";

export const EQUIPMENT_DRAW_DEMO_CREATE_PROMPT =
  "Create an equipment draw system triggered by F4. When the player presses F4, draw 3 candidates from a weighted equipment pool, show a card selection UI, let the player confirm one equipment, deliver the native item immediately, and make selected equipment not appear again in future draws during the same session.";

export const TALENT_DRAW_DEMO_OBJECTS: Array<SelectionPoolDemoObject & { tier: SelectionPoolObjectTier; weight: number }> = [
  { objectId: "R001", label: "Strength Boost", description: "+10 Strength", weight: 40, tier: "R", outcome: createTalentOutcome("R") },
  { objectId: "R002", label: "Fortitude", description: "+10 Strength", weight: 40, tier: "R", outcome: createTalentOutcome("R") },
  { objectId: "SR001", label: "Agility Boost", description: "+10 Agility", weight: 30, tier: "SR", outcome: createTalentOutcome("SR") },
  { objectId: "SR002", label: "Swift Reflexes", description: "+10 Agility", weight: 30, tier: "SR", outcome: createTalentOutcome("SR") },
  { objectId: "SSR001", label: "Intelligence Boost", description: "+10 Intelligence", weight: 20, tier: "SSR", outcome: createTalentOutcome("SSR") },
  { objectId: "UR001", label: "Ultimate Growth", description: "+10 All Attributes", weight: 10, tier: "UR", outcome: createTalentOutcome("UR") },
];

export const TALENT_DRAW_DEMO_PARAMETERS = createBaseParameters(
  "talent",
  [createLocalCollection("talent_pool", TALENT_DRAW_DEMO_OBJECTS, "exported")],
  createLocalPoolEntries("talent_pool", TALENT_DRAW_DEMO_OBJECTS),
);

export const EQUIPMENT_DRAW_DEMO_PARAMETERS = createBaseParameters(
  "equipment",
  [],
  [
    createExternalCatalogEntry("EQ_R001", "item_branches", 40, "R", DOTA2_CURATED_NATIVE_ITEMS_CATALOG_ID),
    createExternalCatalogEntry("EQ_R002", "item_magic_stick", 40, "R", DOTA2_CURATED_NATIVE_ITEMS_CATALOG_ID),
    createExternalCatalogEntry("EQ_SR001", "item_power_treads", 30, "SR", DOTA2_CURATED_NATIVE_ITEMS_CATALOG_ID),
    createExternalCatalogEntry("EQ_SR002", "item_phase_boots", 30, "SR", DOTA2_CURATED_NATIVE_ITEMS_CATALOG_ID),
    createExternalCatalogEntry("EQ_SSR001", "item_blink", 20, "SSR", DOTA2_CURATED_NATIVE_ITEMS_CATALOG_ID),
    createExternalCatalogEntry("EQ_UR001", "item_black_king_bar", 10, "UR", DOTA2_CURATED_NATIVE_ITEMS_CATALOG_ID),
  ],
);

export const talentDrawCaseSpec = createSelectionCaseSpec({
  caseId: "talent-draw",
  featureId: "talent_draw_demo",
  prompt: TALENT_DRAW_DEMO_CREATE_PROMPT,
  authoringParameters: TALENT_DRAW_DEMO_PARAMETERS,
  evidenceDir: "docs/talent-draw-case/demo-evidence",
  objectKind: "talent",
  requiredOutcomeKinds: ["attribute_bonus"],
  generatedContentIndicators: [
    "attribute_bonus",
    "ModifyStrength",
    "ModifyAgility",
    "ModifyIntellect",
  ],
  runtimeChecks: [
    "Press F4 and confirm the modal shows three talent cards.",
    "Select one talent and verify the attribute bonus is applied immediately.",
    "Trigger the draw again and verify the selected talent does not reappear in the same session.",
  ],
});

export const equipmentDrawCaseSpec = createSelectionCaseSpec({
  caseId: "equipment-draw",
  featureId: "equipment_draw_demo",
  prompt: EQUIPMENT_DRAW_DEMO_CREATE_PROMPT,
  authoringParameters: EQUIPMENT_DRAW_DEMO_PARAMETERS,
  evidenceDir: "docs/equipment-draw-case/demo-evidence",
  objectKind: "equipment",
  requiredOutcomeKinds: ["native_item_delivery"],
  generatedContentIndicators: [
    "native_item_delivery",
    "CreateItem",
    "CreateItemOnPositionSync",
    "hasAvailableInventorySlot",
    "drop_to_ground",
  ],
  runtimeChecks: [
    "Press F4 and confirm the modal shows three equipment cards.",
    "Select one equipment card and verify the native Dota2 item is granted immediately.",
    "Fill the hero inventory, select another equipment card, and verify the item drops near the hero.",
    "Trigger the draw again and verify the selected equipment does not reappear in the same session.",
  ],
});

export function getSelectionCaseObjectKind(
  caseSpec: SelectionCaseSpec,
): SelectionPoolObjectKind | undefined {
  return caseSpec.authoringParameters.objectKind;
}

export function formatSelectionCaseTitle(caseSpec: SelectionCaseSpec): string {
  const objectKind = getSelectionCaseObjectKind(caseSpec);
  if (objectKind === "equipment") {
    return "Equipment Draw Demo";
  }
  if (objectKind === "skill_card_placeholder") {
    return "Skill Card Draw Demo";
  }
  return "Talent Draw Demo";
}

export function formatSelectionObjectKindLabel(
  objectKind: SelectionPoolObjectKind | undefined,
): string {
  if (objectKind === "equipment") {
    return "equipment";
  }
  if (objectKind === "skill_card_placeholder") {
    return "skill card";
  }
  return "talent";
}
