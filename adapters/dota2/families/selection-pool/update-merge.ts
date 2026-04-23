import type { UpdateIntent } from "../../../../core/schema/types.js";
import { requireGovernedUpdateExecutionView } from "../../../../core/blueprint/update-execution-view.js";
import {
  SELECTION_POOL_CANONICAL_BACKBONE_SUMMARY,
  getSelectionPoolCanonicalPatternIds,
} from "../../../../core/schema/selection-pool-profile.js";
import {
  coercePositiveInteger,
  dedupeStrings,
  expandObjectPoolToCount,
  getInventoryDefaults,
  normalizeFeatureAuthoringParameters,
  parseRequestedObjectCount,
  resolveSelectionPoolObjectKind,
  resolveSelectionPoolParametersFromFeature,
  type FeatureAuthoring,
  type SelectionPoolCurrentContextHints,
  type SelectionPoolInventoryUpdateRequest,
  type SelectionPoolRequestedUpdate,
} from "./shared.js";
import type { RuneWeaverFeatureRecord } from "../../../../core/workspace/types.js";
import { countSelectionPoolEntries } from "./source-model.js";

function getUpdateDeltaRecords(updateIntent: UpdateIntent) {
  return [
    ...(updateIntent.delta.add || []),
    ...(updateIntent.delta.modify || []),
    ...(updateIntent.delta.remove || []),
  ];
}

function hasDeltaPath(updateIntent: UpdateIntent, matcher: string | RegExp): boolean {
  return getUpdateDeltaRecords(updateIntent).some((item) => {
    if (matcher instanceof RegExp) {
      return matcher.test(item.path);
    }
    return item.path === matcher;
  });
}

function findDeltaItem(updateIntent: UpdateIntent, matcher: string | RegExp) {
  return getUpdateDeltaRecords(updateIntent).find((item) => {
    if (matcher instanceof RegExp) {
      return matcher.test(item.path);
    }
    return item.path === matcher;
  });
}

function findDeltaNewValue(updateIntent: UpdateIntent, matcher: string | RegExp): unknown {
  return findDeltaItem(updateIntent, matcher)?.newValue;
}

function extractRequestedObjectCountFromUpdateIntent(updateIntent: UpdateIntent): number | undefined {
  const explicitObjectCount = coercePositiveInteger(
    findDeltaNewValue(updateIntent, /content\.collection\.objectCount$/),
  );
  if (typeof explicitObjectCount === "number") {
    return explicitObjectCount;
  }

  const promptObjectCount = parseRequestedObjectCount(
    String(
      updateIntent.governedChange?.request?.goal
      || updateIntent.governedChange?.request?.rawPrompt
      || "",
    ),
  );
  if (typeof promptObjectCount === "number") {
    return promptObjectCount;
  }

  return coercePositiveInteger(updateIntent.governedChange?.parameters?.objectCount);
}

function extractRequestedInventoryUpdate(
  currentFeatureAuthoring: FeatureAuthoring,
  updateIntent: UpdateIntent,
): SelectionPoolInventoryUpdateRequest | undefined {
  const executionView = requireGovernedUpdateExecutionView(
    updateIntent,
    "selection_pool update inventory merge",
  );
  const existingInventory = currentFeatureAuthoring.parameters.inventory;
  const governedInventory = executionView.governedChange.selection?.inventory;
  const inventoryPathRequested = hasDeltaPath(updateIntent, /selection\.inventory/);
  const inventoryEnabled =
    governedInventory?.enabled === true ||
    inventoryPathRequested;

  if (!inventoryEnabled) {
    return undefined;
  }

  const capacity =
    coercePositiveInteger(findDeltaNewValue(updateIntent, /selection\.inventory\.capacity$/))
    || (typeof governedInventory?.capacity === "number"
      ? Math.floor(governedInventory.capacity)
      : undefined)
    || existingInventory?.capacity;
  if (!capacity) {
    return undefined;
  }

  const fullMessage =
    (typeof findDeltaNewValue(updateIntent, /selection\.inventory\.fullMessage$/) === "string"
      ? String(findDeltaNewValue(updateIntent, /selection\.inventory\.fullMessage$/))
      : undefined)
    || governedInventory?.fullMessage
    || existingInventory?.fullMessage
    || getInventoryDefaults().fullMessage;
  const storeSelectedItems =
    typeof findDeltaNewValue(updateIntent, /selection\.inventory\.storeSelectedItems$/) === "boolean"
      ? Boolean(findDeltaNewValue(updateIntent, /selection\.inventory\.storeSelectedItems$/))
      : governedInventory?.storeSelectedItems === true || existingInventory?.storeSelectedItems === true;
  const blockDrawWhenFull =
    typeof findDeltaNewValue(updateIntent, /selection\.inventory\.blockDrawWhenFull$/) === "boolean"
      ? Boolean(findDeltaNewValue(updateIntent, /selection\.inventory\.blockDrawWhenFull$/))
      : governedInventory?.blockDrawWhenFull === true || existingInventory?.blockDrawWhenFull === true;

  return {
    enabled: true,
    capacity,
    storeSelectedItems,
    blockDrawWhenFull,
    fullMessage,
    presentation: "persistent_panel",
  };
}

function extractRequestedUpdate(
  currentFeatureAuthoring: FeatureAuthoring,
  updateIntent: UpdateIntent,
): SelectionPoolRequestedUpdate {
  const executionView = requireGovernedUpdateExecutionView(
    updateIntent,
    "selection_pool update merge",
  );
  const activation = (
    executionView.governedChange.interaction?.activations
    || []
  ).find((item) => item.kind === "key");
  const requestedTriggerKey = hasDeltaPath(updateIntent, "input.triggerKey")
    ? (
      (typeof findDeltaNewValue(updateIntent, "input.triggerKey") === "string"
        ? String(findDeltaNewValue(updateIntent, "input.triggerKey"))
        : undefined)
      || (typeof activation?.input === "string" ? activation.input : undefined)
    )
    : undefined;
  const requestedChoiceCount = hasDeltaPath(updateIntent, /selection\.choiceCount$/)
    ? (
      coercePositiveInteger(findDeltaNewValue(updateIntent, /selection\.choiceCount$/))
      || (typeof executionView.governedChange.selection?.choiceCount === "number"
        ? Math.floor(executionView.governedChange.selection.choiceCount)
        : undefined)
    )
    : undefined;

  return {
    triggerKey: requestedTriggerKey,
    choiceCount: requestedChoiceCount,
    objectCount: extractRequestedObjectCountFromUpdateIntent(updateIntent),
    inventory: extractRequestedInventoryUpdate(currentFeatureAuthoring, updateIntent),
  };
}

export function deriveSelectionPoolCurrentContextHints(
  feature: RuneWeaverFeatureRecord,
  sourceArtifact?: Record<string, unknown>,
): SelectionPoolCurrentContextHints | undefined {
  const parameters = resolveSelectionPoolParametersFromFeature(feature, sourceArtifact);
  if (!parameters) {
    return undefined;
  }

  return {
    admittedSkeleton: getSelectionPoolCanonicalPatternIds(),
    preservedInvariants: [...currentSelectionPoolInvariants()],
    boundedFields: {
      triggerKey: parameters.triggerKey,
      choiceCount: parameters.choiceCount,
      objectCount: countSelectionPoolEntries(parameters),
      inventoryEnabled: parameters.inventory?.enabled === true,
      inventoryCapacity: parameters.inventory?.capacity,
      inventoryFullMessage: parameters.inventory?.fullMessage,
      ...(parameters.objectKind ? { objectKind: parameters.objectKind } : {}),
    },
  };
}

function currentSelectionPoolInvariants(): string[] {
  return dedupeStrings([
    "single trigger entry only",
    "weighted pool candidate source",
    "confirm exactly one candidate",
    "current feature owns pool membership only; object truth may come from local collections, feature exports, or external catalogs",
    SELECTION_POOL_CANONICAL_BACKBONE_SUMMARY,
    "no persistence",
    "no cross-feature grants",
    "no arbitrary movement/projectile effect family",
  ]);
}

export function mergeSelectionPoolFeatureAuthoringForUpdate(input: {
  currentFeatureAuthoring: FeatureAuthoring;
  updateIntent: UpdateIntent;
}): FeatureAuthoring {
  const { currentFeatureAuthoring, updateIntent } = input;
  const metadataObjectKind =
    resolveSelectionPoolObjectKind(currentFeatureAuthoring.parameters.objectKind)
    || resolveSelectionPoolObjectKind(currentFeatureAuthoring.objectKind);
  let merged = normalizeFeatureAuthoringParameters(
    currentFeatureAuthoring.parameters,
    metadataObjectKind,
  );

  const requestedUpdate = extractRequestedUpdate(currentFeatureAuthoring, updateIntent);

  if (requestedUpdate.triggerKey) {
    merged = normalizeFeatureAuthoringParameters(
      {
        ...merged,
        triggerKey: requestedUpdate.triggerKey,
      },
      metadataObjectKind,
    );
  }

  if (typeof requestedUpdate.choiceCount === "number") {
    merged = normalizeFeatureAuthoringParameters(
      {
        ...merged,
        choiceCount: requestedUpdate.choiceCount,
      },
      metadataObjectKind,
    );
  }

  if (requestedUpdate.inventory) {
    merged = normalizeFeatureAuthoringParameters(
      {
        ...merged,
        inventory: {
          enabled: true,
          capacity: requestedUpdate.inventory.capacity || merged.inventory?.capacity || getInventoryDefaults().capacity,
          storeSelectedItems: requestedUpdate.inventory.storeSelectedItems !== false,
          blockDrawWhenFull: requestedUpdate.inventory.blockDrawWhenFull === true,
          fullMessage: requestedUpdate.inventory.fullMessage || merged.inventory?.fullMessage || getInventoryDefaults().fullMessage,
          presentation: "persistent_panel",
        },
      },
      metadataObjectKind,
    );
  }

  if (requestedUpdate.objectCount && requestedUpdate.objectCount > countSelectionPoolEntries(merged)) {
    merged = expandObjectPoolToCount(merged, requestedUpdate.objectCount, metadataObjectKind);
  }

  const notes = dedupeStrings([
    ...(currentFeatureAuthoring.notes || []),
    "selection_pool update merge was normalized from current feature truth and UpdateIntent authority.",
    requestedUpdate.inventory
      ? "selection_pool update merge restored the requested session-only inventory contract from UpdateIntent authority."
      : undefined,
  ]);

  return {
    ...currentFeatureAuthoring,
    ...(metadataObjectKind ? { objectKind: metadataObjectKind } : {}),
    parameters: merged,
    notes,
  };
}
