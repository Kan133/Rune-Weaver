import type { IntentSchema, UpdateIntent } from "../../../../core/schema/types.js";
import type { RuneWeaverFeatureRecord } from "../../../../core/workspace/types.js";
import {
  coercePositiveInteger,
  dedupeStrings,
  expandObjectPoolToCount,
  getInventoryDefaults,
  normalizeFeatureAuthoringParameters,
  parseChoiceCount,
  parseInventoryCapacity,
  parseQuotedMessage,
  parseRequestedObjectCount,
  parseTriggerKey,
  promptRequestsFullBlock,
  promptRequestsInventoryContract,
  promptRequestsStoredSelections,
  resolveSelectionPoolObjectKind,
  resolveSelectionPoolParametersFromFeature,
  type FeatureAuthoring,
  type SelectionPoolCurrentContextHints,
  type SelectionPoolInventoryUpdateRequest,
  type SelectionPoolRequestedUpdate,
} from "./shared.js";

function getUpdateDeltaRecords(updateIntent: UpdateIntent): Array<Record<string, unknown>> {
  return [
    ...(updateIntent.delta.add || []),
    ...(updateIntent.delta.modify || []),
  ].map((item) => item as unknown as Record<string, unknown>);
}

function hasDeltaPath(updateIntent: UpdateIntent, matcher: string | RegExp): boolean {
  return getUpdateDeltaRecords(updateIntent).some((item) => {
    const path = typeof item.path === "string" ? item.path : "";
    if (matcher instanceof RegExp) {
      return matcher.test(path);
    }
    return path === matcher;
  });
}

function findDeltaNewValue(updateIntent: UpdateIntent, matcher: string | RegExp): unknown {
  return getUpdateDeltaRecords(updateIntent).find((item) => {
    const path = typeof item.path === "string" ? item.path : "";
    if (matcher instanceof RegExp) {
      return matcher.test(path);
    }
    return path === matcher;
  })?.newValue;
}

function collectStructuredTexts(requestedChange: IntentSchema, updateIntent: UpdateIntent): string[] {
  const deltaTexts = [
    ...(updateIntent.delta.add || []),
    ...(updateIntent.delta.modify || []),
  ].flatMap((item) => [item.path, item.summary].filter((value): value is string => typeof value === "string" && value.trim().length > 0));

  return [
    requestedChange.request.rawPrompt,
    requestedChange.request.goal,
    ...(requestedChange.requirements?.functional || []),
    ...(requestedChange.requirements?.interactions || []),
    ...(requestedChange.requirements?.dataNeeds || []),
    ...(requestedChange.requirements?.outputs || []),
    ...(requestedChange.constraints?.hostConstraints || []),
    ...(requestedChange.constraints?.nonFunctional || []),
    requestedChange.flow?.triggerSummary,
    ...(requestedChange.flow?.sequence || []),
    ...(requestedChange.resolvedAssumptions || []),
    ...(requestedChange.uncertainties || []).map((item) => item.summary),
    ...deltaTexts,
  ].filter((value): value is string => typeof value === "string" && value.trim().length > 0);
}

function extractRequestedObjectCountFromUpdateIntent(updateIntent: UpdateIntent): number | undefined {
  for (const item of getUpdateDeltaRecords(updateIntent)) {
    const path = typeof item.path === "string" ? item.path : "";
    if (!path) {
      continue;
    }
    if (/(^|\.)(objectCount)$/.test(path)) {
      const resolvedCount = coercePositiveInteger(item.newValue);
      if (typeof resolvedCount === "number") {
        return resolvedCount;
      }
    }
    if (/(^|\.)(objects)$/.test(path) && Array.isArray(item.newValue)) {
      const objectCount = item.newValue.length;
      if (objectCount > 0) {
        return objectCount;
      }
    }
  }
  return undefined;
}

function resolveRequestedObjectCountForUpdate(
  requestedChange: IntentSchema,
  updateIntent: UpdateIntent,
): number | undefined {
  const structuredTexts = collectStructuredTexts(requestedChange, updateIntent);
  return extractRequestedObjectCountFromUpdateIntent(updateIntent)
    || structuredTexts
      .map((text) => parseRequestedObjectCount(text))
      .find((value): value is number => typeof value === "number");
}

function extractRequestedInventoryUpdate(
  currentFeatureAuthoring: FeatureAuthoring,
  requestedChange: IntentSchema,
  updateIntent: UpdateIntent,
): SelectionPoolInventoryUpdateRequest | undefined {
  const existingInventory = currentFeatureAuthoring.parameters.inventory;
  const structuredTexts = collectStructuredTexts(requestedChange, updateIntent);
  const explicitCapacity =
    coercePositiveInteger(findDeltaNewValue(updateIntent, /selection\.inventory\.capacity$/))
    || (typeof requestedChange.selection?.inventory?.capacity === "number"
      ? Math.floor(requestedChange.selection.inventory.capacity)
      : undefined)
    || structuredTexts
      .map((text) => parseInventoryCapacity(text))
      .find((value): value is number => typeof value === "number");
  const explicitFullMessage =
    (typeof requestedChange.selection?.inventory?.fullMessage === "string"
      ? requestedChange.selection.inventory.fullMessage
      : undefined)
    || (typeof findDeltaNewValue(updateIntent, /selection\.inventory\.fullMessage$/) === "string"
      ? String(findDeltaNewValue(updateIntent, /selection\.inventory\.fullMessage$/))
      : undefined)
    || structuredTexts
      .map((text) => parseQuotedMessage(text))
      .find((value): value is string => typeof value === "string" && value.trim().length > 0);
  const inventoryPathRequested = hasDeltaPath(updateIntent, /inventory/);
  const inventoryTextRequested = structuredTexts.some((text) => promptRequestsInventoryContract(text));
  const inventoryStateRequested = (requestedChange.stateModel?.states || []).some((state) => state.kind === "inventory");
  const enabled =
    requestedChange.selection?.inventory?.enabled === true ||
    inventoryPathRequested ||
    inventoryTextRequested ||
    inventoryStateRequested;

  if (!enabled) {
    return undefined;
  }

  const storeSelectedItems =
    requestedChange.selection?.inventory?.storeSelectedItems === true ||
    structuredTexts.some((text) =>
      promptRequestsStoredSelections(text) ||
      /(?:confirmed|selected|chosen).*(?:inventory|storage|stash)|(?:确认|选中|抽取后).*(?:加入|进入|存入|显示在).*(?:库存|仓库|面板)/i.test(text),
    );
  const blockDrawWhenFull =
    requestedChange.selection?.inventory?.blockDrawWhenFull === true ||
    structuredTexts.some((text) =>
      promptRequestsFullBlock(text) ||
      /(?:inventory|storage|库存|仓库|面板).*(?:full|满了|满仓|存满了).*(?:block|cannot draw|不再抽取|不能再抽|抽取无效)/i.test(text),
    );

  const capacity = explicitCapacity || existingInventory?.capacity;
  if (!capacity) {
    return undefined;
  }

  return {
    enabled: true,
    capacity,
    storeSelectedItems: storeSelectedItems || existingInventory?.storeSelectedItems === true,
    blockDrawWhenFull: blockDrawWhenFull || existingInventory?.blockDrawWhenFull === true,
    fullMessage: explicitFullMessage || existingInventory?.fullMessage || getInventoryDefaults().fullMessage,
    presentation: "persistent_panel",
  };
}

function extractRequestedUpdate(
  currentFeatureAuthoring: FeatureAuthoring,
  requestedChange: IntentSchema,
  updateIntent: UpdateIntent,
): SelectionPoolRequestedUpdate {
  const requestedTriggerKey = hasDeltaPath(updateIntent, "input.triggerKey")
    ? (
      (typeof findDeltaNewValue(updateIntent, "input.triggerKey") === "string"
        ? String(findDeltaNewValue(updateIntent, "input.triggerKey"))
        : undefined)
      || parseTriggerKey(requestedChange.request.rawPrompt)
    )
    : undefined;
  const requestedChoiceCount = hasDeltaPath(updateIntent, /selection\.choiceCount$/)
    ? (
      (typeof requestedChange.selection?.choiceCount === "number" && requestedChange.selection.choiceCount > 0
        ? Math.floor(requestedChange.selection.choiceCount)
        : undefined)
      || coercePositiveInteger(findDeltaNewValue(updateIntent, /selection\.choiceCount$/))
      || parseChoiceCount(requestedChange.request.rawPrompt)
    )
    : undefined;

  return {
    triggerKey: requestedTriggerKey,
    choiceCount: requestedChoiceCount,
    objectCount: resolveRequestedObjectCountForUpdate(requestedChange, updateIntent),
    inventory: extractRequestedInventoryUpdate(currentFeatureAuthoring, requestedChange, updateIntent),
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
    admittedSkeleton: [
      "input.key_binding",
      "data.weighted_pool",
      "rule.selection_flow",
      "ui.selection_modal",
    ],
    preservedInvariants: [...currentSelectionPoolInvariants()],
    boundedFields: {
      triggerKey: parameters.triggerKey,
      choiceCount: parameters.choiceCount,
      objectCount: parameters.objects.length,
      inventoryEnabled: parameters.inventory?.enabled === true,
      inventoryCapacity: parameters.inventory?.capacity,
      inventoryFullMessage: parameters.inventory?.fullMessage,
      ...(parameters.objectKind ? { objectKind: parameters.objectKind } : {}),
    },
  };
}

function currentSelectionPoolInvariants(): string[] {
  return dedupeStrings([...[
    "single trigger entry only",
    "weighted pool candidate source",
    "confirm exactly one candidate",
    "same-feature owned object collection only",
    "same selection skeleton: input.key_binding + data.weighted_pool + rule.selection_flow + ui.selection_modal",
    "no persistence",
    "no cross-feature grants",
    "no arbitrary custom effect family",
  ]]);
}

export function mergeSelectionPoolFeatureAuthoringForUpdate(input: {
  currentFeatureAuthoring: FeatureAuthoring;
  requestedChange: IntentSchema;
  updateIntent: UpdateIntent;
}): FeatureAuthoring {
  const { currentFeatureAuthoring, requestedChange, updateIntent } = input;
  const metadataObjectKind =
    resolveSelectionPoolObjectKind(currentFeatureAuthoring.parameters.objectKind)
    || resolveSelectionPoolObjectKind(currentFeatureAuthoring.objectKind);
  let merged = normalizeFeatureAuthoringParameters(
    currentFeatureAuthoring.parameters,
    metadataObjectKind,
  );

  const requestedUpdate = extractRequestedUpdate(currentFeatureAuthoring, requestedChange, updateIntent);

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

  if (requestedUpdate.objectCount && requestedUpdate.objectCount > merged.objects.length) {
    merged = expandObjectPoolToCount(merged, requestedUpdate.objectCount, metadataObjectKind);
  }

  const notes = dedupeStrings([
    ...(currentFeatureAuthoring.notes || []),
    "selection_pool update merge was normalized from workspace-backed current feature context and UpdateIntent authority.",
    requestedUpdate.inventory
      ? "selection_pool update merge restored the requested session-only inventory contract from bounded update authority."
      : undefined,
  ]);

  return {
    ...currentFeatureAuthoring,
    ...(metadataObjectKind ? { objectKind: metadataObjectKind } : {}),
    parameters: merged,
    notes,
  };
}
