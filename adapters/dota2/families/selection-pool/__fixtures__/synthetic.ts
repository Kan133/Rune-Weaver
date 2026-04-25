import type {
  OutcomeSpec,
  SelectionPoolFeatureAuthoringParameters,
  SelectionPoolObjectKind,
  SelectionPoolObjectTier,
} from "../../../../../core/schema/types.js";

interface SyntheticObject {
  objectId: string;
  label: string;
  description: string;
  weight: number;
  tier: SelectionPoolObjectTier;
  outcome?: OutcomeSpec;
}

function createTalentOutcome(tier: SelectionPoolObjectTier): NonNullable<SyntheticObject["outcome"]> {
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

  return {
    title: "Choose Your Selection",
    description: "Select one of the following options",
    inventoryTitle: "Selection Inventory",
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

  return {
    id: "empty_selection_slot",
    name: "Empty Slot",
    description: "No selection available",
    disabled: true,
  };
}

function createSyntheticObjects(
  objectKind: SelectionPoolObjectKind,
): SyntheticObject[] {
  if (objectKind === "equipment") {
    return [
      { objectId: "EQ_001", label: "Equipment Option 1", description: "Synthetic equipment option 1", weight: 40, tier: "R" },
      { objectId: "EQ_002", label: "Equipment Option 2", description: "Synthetic equipment option 2", weight: 40, tier: "R" },
      { objectId: "EQ_003", label: "Equipment Option 3", description: "Synthetic equipment option 3", weight: 30, tier: "SR" },
      { objectId: "EQ_004", label: "Equipment Option 4", description: "Synthetic equipment option 4", weight: 30, tier: "SR" },
      { objectId: "EQ_005", label: "Equipment Option 5", description: "Synthetic equipment option 5", weight: 20, tier: "SSR" },
      { objectId: "EQ_006", label: "Equipment Option 6", description: "Synthetic equipment option 6", weight: 10, tier: "UR" },
    ];
  }

  return [
    { objectId: "SEL_001", label: "Selection Option 1", description: "Synthetic selection option 1", weight: 40, tier: "R", outcome: createTalentOutcome("R") },
    { objectId: "SEL_002", label: "Selection Option 2", description: "Synthetic selection option 2", weight: 40, tier: "R", outcome: createTalentOutcome("R") },
    { objectId: "SEL_003", label: "Selection Option 3", description: "Synthetic selection option 3", weight: 30, tier: "SR", outcome: createTalentOutcome("SR") },
    { objectId: "SEL_004", label: "Selection Option 4", description: "Synthetic selection option 4", weight: 30, tier: "SR", outcome: createTalentOutcome("SR") },
    { objectId: "SEL_005", label: "Selection Option 5", description: "Synthetic selection option 5", weight: 20, tier: "SSR", outcome: createTalentOutcome("SSR") },
    { objectId: "SEL_006", label: "Selection Option 6", description: "Synthetic selection option 6", weight: 10, tier: "UR", outcome: createTalentOutcome("UR") },
  ];
}

export function buildSelectionPoolSyntheticParameters(
  objectKind: SelectionPoolObjectKind = "talent",
): SelectionPoolFeatureAuthoringParameters {
  const objects = createSyntheticObjects(objectKind);
  return {
    triggerKey: "F4",
    choiceCount: 3,
    objectKind,
    localCollections: [
      {
        collectionId: "default",
        visibility: "local",
        objects: objects.map((object) => ({
          objectId: object.objectId,
          label: object.label,
          description: object.description,
          ...(object.outcome ? { outcome: object.outcome } : {}),
        })),
      },
    ],
    poolEntries: objects.map((object) => ({
      entryId: object.objectId,
      objectRef: {
        source: "local_collection",
        collectionId: "default",
        objectId: object.objectId,
      },
      weight: object.weight,
      tier: object.tier,
    })),
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
