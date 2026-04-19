import type {
  IntentContentModelContract,
  IntentSelectionContract,
  UIRequirementSummary,
} from "../../schema/types.js";
import { inferInventoryStoreSelectedItems } from "./prompt-hints.js";
import type { PromptSemanticHints } from "./shared.js";
import { isOneOf, normalizePositiveInteger, normalizeStringArray } from "./shared.js";

export function normalizeUIRequirements(
  ui: Partial<UIRequirementSummary> | undefined,
): UIRequirementSummary | undefined {
  if (!ui) {
    return undefined;
  }

  return {
    needed: ui.needed === true,
    surfaces: normalizeStringArray(ui.surfaces),
    feedbackNeeds: normalizeStringArray(ui.feedbackNeeds),
  };
}

export function normalizeSelection(
  selection: Partial<IntentSelectionContract> | undefined,
  promptHints: PromptSemanticHints,
): IntentSelectionContract | undefined {
  if (!selection && !promptHints.candidatePool && !promptHints.playerChoice) {
    return undefined;
  }

  const inferredMode = promptHints.weightedDraw
    ? "weighted"
    : promptHints.playerChoice && promptHints.candidatePool
      ? "user-chosen"
      : undefined;
  const inferredSource = promptHints.weightedDraw
    ? "weighted-pool"
    : promptHints.candidatePool
      ? "candidate-collection"
      : undefined;
  const inferredChoiceMode = promptHints.playerChoice
    ? "user-chosen"
    : promptHints.weightedDraw
      ? "weighted"
      : undefined;
  const inferredCardinality = promptHints.committedCount === 1
    ? "single"
    : promptHints.committedCount && promptHints.committedCount > 1
      ? "multiple"
      : undefined;
  const normalizedInventory =
    promptHints.inventory || selection?.inventory?.enabled === true
      ? {
          enabled: true,
          capacity: promptHints.inventoryCapacity,
          storeSelectedItems:
            inferInventoryStoreSelectedItems(promptHints.normalizedText)
            || selection?.inventory?.storeSelectedItems === true
              ? true
              : undefined,
          blockDrawWhenFull:
            promptHints.inventoryBlocksWhenFull || selection?.inventory?.blockDrawWhenFull === true
              ? true
              : undefined,
          fullMessage: promptHints.inventoryFullMessage,
          presentation:
            promptHints.inventory || selection?.inventory?.presentation === "persistent_panel"
              ? "persistent_panel" as const
              : undefined,
        }
      : undefined;

  const normalizedSelection: IntentSelectionContract = {
    mode: promptHints.weightedDraw
      ? "weighted"
      : isOneOf(selection?.mode, ["deterministic", "weighted", "filtered", "user-chosen", "hybrid"])
        ? selection.mode
        : inferredMode,
    source: promptHints.weightedDraw
      ? "weighted-pool"
      : isOneOf(selection?.source, ["none", "candidate-collection", "weighted-pool", "filtered-pool"])
        ? selection.source
        : inferredSource,
    choiceMode: isOneOf(selection?.choiceMode, ["none", "user-chosen", "random", "weighted", "hybrid"])
      ? promptHints.playerChoice
        ? "user-chosen"
        : selection.choiceMode
      : inferredChoiceMode,
    cardinality: isOneOf(selection?.cardinality, ["single", "multiple"])
      ? selection.cardinality
      : inferredCardinality,
    choiceCount: promptHints.candidateCount ?? normalizePositiveInteger(selection?.choiceCount),
    repeatability: isOneOf(selection?.repeatability, ["one-shot", "repeatable", "persistent"])
      ? selection.repeatability
      : undefined,
    duplicatePolicy: promptHints.noRepeatAfterSelection
      ? "forbid"
      : isOneOf(selection?.duplicatePolicy, ["allow", "avoid", "forbid"])
        ? selection.duplicatePolicy
        : undefined,
    commitment: promptHints.immediateOutcome
      ? "immediate"
      : isOneOf(selection?.commitment, ["immediate", "confirm", "deferred"])
        ? selection.commitment
        : undefined,
    inventory: promptHints.inventory ? normalizedInventory : undefined,
  };

  const hasExplicitSelectionSemantics =
    promptHints.candidatePool ||
    promptHints.playerChoice ||
    promptHints.weightedDraw ||
    normalizedSelection.mode === "weighted" ||
    normalizedSelection.mode === "filtered" ||
    normalizedSelection.mode === "user-chosen" ||
    normalizedSelection.mode === "hybrid" ||
    normalizedSelection.source === "candidate-collection" ||
    normalizedSelection.source === "weighted-pool" ||
    normalizedSelection.source === "filtered-pool" ||
    normalizedSelection.choiceMode === "user-chosen" ||
    normalizedSelection.choiceMode === "random" ||
    normalizedSelection.choiceMode === "weighted" ||
    normalizedSelection.choiceMode === "hybrid" ||
    typeof normalizedSelection.choiceCount === "number" ||
    normalizedSelection.inventory?.enabled === true;

  return hasExplicitSelectionSemantics ? normalizedSelection : undefined;
}

export function buildPromptDerivedCandidateCollection(
  promptHints: PromptSemanticHints,
): NonNullable<IntentContentModelContract["collections"]>[number] {
  const itemSchema: NonNullable<
    NonNullable<IntentContentModelContract["collections"]>[number]["itemSchema"]
  > = [
    {
      name: "id",
      type: "string",
      required: true,
      semanticRole: "stable-option-id",
    },
  ];

  if (promptHints.weightedDraw) {
    itemSchema.push({
      name: "weight",
      type: "number",
      required: false,
      semanticRole: "selection-weight",
    });
  }

  if (promptHints.rarityDisplay) {
    itemSchema.push({
      name: "rarity",
      type: "enum",
      required: false,
      semanticRole: "display-rarity",
    });
  }

  if (promptHints.immediateOutcome) {
    itemSchema.push({
      name: "effect",
      type: "effect-ref",
      required: false,
      semanticRole: "selected-outcome",
    });
  }

  return {
    id: "candidate_options",
    role: "candidate-options",
    ownership: "feature",
    updateMode: "replace",
    itemSchema,
  };
}

export function normalizeContentModel(
  contentModel: Partial<IntentContentModelContract> | undefined,
  promptHints: PromptSemanticHints,
): IntentContentModelContract | undefined {
  if (!contentModel || !Array.isArray(contentModel.collections)) {
    return promptHints.candidatePool
      ? { collections: [buildPromptDerivedCandidateCollection(promptHints)] }
      : undefined;
  }

  const collections = contentModel.collections
    .filter(
      (item): item is NonNullable<IntentContentModelContract["collections"]>[number] =>
        typeof item === "object" && item !== null,
    )
    .map((item, index) => ({
      id: typeof item.id === "string" && item.id.trim() ? item.id : `collection_${index}`,
      role: isOneOf(item.role, ["candidate-options", "spawnables", "progress-items", "generic"])
        ? item.role
        : promptHints.candidatePool
          ? "candidate-options"
          : "generic",
      ownership: isOneOf(item.ownership, ["feature", "shared", "external"])
        ? item.ownership
        : promptHints.candidatePool
          ? "feature"
          : undefined,
      updateMode: isOneOf(item.updateMode, ["replace", "merge", "append"])
        ? item.updateMode
        : promptHints.candidatePool
          ? "replace"
          : undefined,
      itemSchema: Array.isArray(item.itemSchema)
        ? item.itemSchema
            .filter(
              (schemaItem): schemaItem is NonNullable<
                NonNullable<IntentContentModelContract["collections"]>[number]["itemSchema"]
              >[number] => typeof schemaItem === "object" && schemaItem !== null,
            )
            .map((schemaItem) => ({
              name: typeof schemaItem.name === "string" && schemaItem.name.trim() ? schemaItem.name : "field",
              type: isOneOf(schemaItem.type, ["string", "number", "boolean", "enum", "effect-ref", "object-ref"])
                ? schemaItem.type
                : "string",
              required: schemaItem.required === true,
              semanticRole:
                typeof schemaItem.semanticRole === "string" && schemaItem.semanticRole.trim()
                  ? schemaItem.semanticRole
                  : undefined,
            }))
        : promptHints.candidatePool
          ? buildPromptDerivedCandidateCollection(promptHints).itemSchema
          : undefined,
    }));

  return collections.length > 0
    ? { collections }
    : promptHints.candidatePool
      ? { collections: [buildPromptDerivedCandidateCollection(promptHints)] }
      : undefined;
}
