import type {
  CurrentFeatureTruth,
  GovernedUpdateSchema,
  IntentSchema,
  UpdateCurrentTruthRawFact,
  UpdateDeltaItem,
  UpdateGovernanceDecisions,
  UpdateGovernanceScope,
  UpdatePromptRawFact,
} from "../schema/types.js";
import { analyzeIntentSemanticLayers } from "./intent-schema/semantic-analysis.js";
import {
  readExplicitRequestedChoiceCountChange,
  readRequestedObjectCount,
  readRequestedTriggerKey,
} from "./update-signal-extraction.js";

function dedupeStrings(values: Array<string | undefined>): string[] {
  return [...new Set(values.filter((value): value is string => Boolean(value && value.trim().length > 0)))];
}

function deepCloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function normalizePositiveInteger(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? Math.floor(value)
    : undefined;
}

function collectStructuredTexts(requestedChange: IntentSchema): string[] {
  return dedupeStrings([
    requestedChange.request.rawPrompt,
    requestedChange.request.goal,
    ...(requestedChange.requirements?.functional || []),
    ...(requestedChange.requirements?.interactions || []),
    ...(requestedChange.requirements?.outputs || []),
    ...(requestedChange.constraints?.hostConstraints || []),
    ...(requestedChange.constraints?.nonFunctional || []),
    ...(requestedChange.resolvedAssumptions || []),
  ]);
}

function parseInventoryCapacityFromTexts(texts: string[]): number | undefined {
  for (const text of texts) {
    const match =
      text.match(/(\d+)\s*-\s*slots?/iu)
      || text.match(/(\d+)\s*(?:slots?|slot|格|格子|栏位)/iu)
      || text.match(/(?:inventory|storage|stash|warehouse|仓库|库存|存储)(?:\s*(?:to|of|为)?)\s*(\d+)/iu);
    if (!match?.[1]) {
      continue;
    }
    const parsed = Number(match[1]);
    if (Number.isFinite(parsed) && parsed > 0) {
      return Math.floor(parsed);
    }
  }

  return undefined;
}

function requestsStoredSelections(texts: string[]): boolean {
  return texts.some((text) =>
    /store selected|store the selected|keep selected|selection goes into inventory|selected.*inventory|confirmed.*inventory|显示在仓库|放入仓库|存入仓库|added into the .*inventory|存入库存|自动出现在面板/iu.test(text),
  );
}

function requestsBlockWhenFull(texts: string[]): boolean {
  return texts.some((text) =>
    /inventory full.*(?:stop|block|no longer|cannot)|when the .*full.*(?:do not|cannot|stop)|满了.*(?:不能|无法|停止)|存满了.*(?:不能|无法)|库存满了.*(?:不能|无法)/iu.test(text),
  );
}

function readPromptFactValue<TValue = unknown>(
  facts: UpdatePromptRawFact[],
  code: string,
): TValue | undefined {
  for (let index = facts.length - 1; index >= 0; index -= 1) {
    if (facts[index]?.code === code) {
      return facts[index]?.value as TValue | undefined;
    }
  }
  return undefined;
}

function readCurrentTruthFactValue<TValue = unknown>(
  facts: UpdateCurrentTruthRawFact[],
  code: string,
): TValue | undefined {
  for (let index = facts.length - 1; index >= 0; index -= 1) {
    if (facts[index]?.code === code) {
      return facts[index]?.value as TValue | undefined;
    }
  }
  return undefined;
}

function hasExternalPersistenceOwner(requestedChange: IntentSchema): boolean {
  if (
    (requestedChange.stateModel?.states || []).some(
      (state) => state.lifetime === "persistent" && state.owner === "external",
    )
  ) {
    return true;
  }

  return (requestedChange.composition?.dependencies || []).some(
    (dependency) =>
      dependency.kind === "external-system"
      && dependency.relation === "writes"
      && typeof dependency.target === "string"
      && dependency.target.trim().length > 0,
  );
}

function hasCrossFeatureTarget(requestedChange: IntentSchema): boolean {
  return (requestedChange.composition?.dependencies || []).some(
    (dependency) =>
      dependency.kind === "cross-feature"
      && typeof dependency.target === "string"
      && dependency.target.trim().length > 0,
  );
}

function currentTruthDisallowsPersistence(currentFeatureTruth: CurrentFeatureTruth): boolean {
  return currentFeatureTruth.preservedInvariants.some((item) => /no persistence/i.test(item))
    || currentFeatureTruth.profile === "selection_pool";
}

function applyPersistenceGovernance(
  requestedChange: IntentSchema,
  currentFeatureTruth: CurrentFeatureTruth,
  promptFacts: UpdatePromptRawFact[],
): IntentSchema {
  const explicitExternalPersistence = readPromptFactValue<boolean>(
    promptFacts,
    "prompt.update.external_persistence",
  ) === true;

  if (!currentTruthDisallowsPersistence(currentFeatureTruth) || explicitExternalPersistence) {
    return requestedChange;
  }

  let changed = false;
  const normalized = deepCloneJson(requestedChange);

  if (normalized.timing?.duration?.kind === "persistent") {
    delete normalized.timing.duration;
    if (Object.keys(normalized.timing).length === 0) {
      delete normalized.timing;
    }
    changed = true;
  }

  if (normalized.effects?.durationSemantics === "persistent") {
    delete normalized.effects.durationSemantics;
    if (
      (!Array.isArray(normalized.effects.operations) || normalized.effects.operations.length === 0)
      && (!Array.isArray(normalized.effects.targets) || normalized.effects.targets.length === 0)
    ) {
      delete normalized.effects;
    }
    changed = true;
  }

  if (normalized.selection?.repeatability === "persistent") {
    normalized.selection.repeatability = "repeatable";
    changed = true;
  }

  if (normalized.stateModel?.states?.some((state) => state.lifetime === "persistent")) {
    normalized.stateModel.states = normalized.stateModel.states.map((state) =>
      state.lifetime === "persistent"
        ? {
            ...state,
            lifetime: "session",
          }
        : state,
    );
    changed = true;
  }

  if (!changed) {
    return requestedChange;
  }

  normalized.resolvedAssumptions = dedupeStrings([
    ...(normalized.resolvedAssumptions || []),
    "Preserved the current no-persistence invariant; persistent presentation wording does not imply external storage ownership.",
  ]);

  return normalized;
}

function applyTriggerGovernance(
  requestedChange: IntentSchema,
  currentFeatureTruth: CurrentFeatureTruth,
): IntentSchema {
  const authoritativeTriggerKey = readRequestedTriggerKey(
    requestedChange,
    currentFeatureTruth.boundedFields.triggerKey as string | undefined,
  );
  if (!authoritativeTriggerKey) {
    return requestedChange;
  }

  const normalized = deepCloneJson(requestedChange);
  normalized.parameters = {
    ...(normalized.parameters || {}),
    triggerKey: authoritativeTriggerKey,
    key: authoritativeTriggerKey,
  };

  const activations = [...(normalized.interaction?.activations || [])];
  const keyActivationIndex = activations.findIndex((activation) => activation.kind === "key");
  if (keyActivationIndex >= 0) {
    activations[keyActivationIndex] = {
      ...activations[keyActivationIndex],
      input: authoritativeTriggerKey,
    };
  } else {
    activations.unshift({
      kind: "key",
      input: authoritativeTriggerKey,
      phase: "press",
      repeatability: "repeatable",
    });
  }

  normalized.interaction = {
    ...(normalized.interaction || {}),
    activations,
  };
  return normalized;
}

function applyChoiceCountGovernance(
  requestedChange: IntentSchema,
): IntentSchema {
  const explicitChoiceCount = readExplicitRequestedChoiceCountChange(requestedChange);
  if (typeof explicitChoiceCount !== "number") {
    return requestedChange;
  }

  const normalized = deepCloneJson(requestedChange);
  normalized.selection = {
    ...(normalized.selection || {}),
    choiceCount: explicitChoiceCount,
  };
  normalized.parameters = {
    ...(normalized.parameters || {}),
    choiceCount: explicitChoiceCount,
  };
  return normalized;
}

function applyObjectCountGovernance(
  requestedChange: IntentSchema,
): IntentSchema {
  const requestedObjectCount = readRequestedObjectCount(requestedChange.request.rawPrompt || "");
  if (typeof requestedObjectCount !== "number") {
    return requestedChange;
  }

  const normalized = deepCloneJson(requestedChange);
  normalized.parameters = {
    ...(normalized.parameters || {}),
    objectCount: requestedObjectCount,
  };
  return normalized;
}

function applyInventoryGovernance(
  requestedChange: IntentSchema,
  promptFacts: UpdatePromptRawFact[],
): IntentSchema {
  const structuredTexts = collectStructuredTexts(requestedChange);
  const inventoryEnabled = readPromptFactValue<boolean>(promptFacts, "prompt.inventory.enabled") === true
    || requestedChange.selection?.inventory?.enabled === true
    || (requestedChange.stateModel?.states || []).some((state) => state.kind === "inventory")
    || structuredTexts.some((text) => /inventory|storage|stash|warehouse|仓库|库存|存储面板|库存面板|仓库面板/iu.test(text));
  if (!inventoryEnabled) {
    return requestedChange;
  }

  const inventoryCapacity = normalizePositiveInteger(
    readPromptFactValue(promptFacts, "prompt.inventory.capacity"),
  ) || normalizePositiveInteger(requestedChange.selection?.inventory?.capacity);
  const resolvedInventoryCapacity = inventoryCapacity || parseInventoryCapacityFromTexts(structuredTexts);
  const blockDrawWhenFull = readPromptFactValue<boolean>(promptFacts, "prompt.inventory.block_draw_when_full") === true
    || requestedChange.selection?.inventory?.blockDrawWhenFull === true
    || requestsBlockWhenFull(structuredTexts);
  const storeSelectedItems =
    requestedChange.selection?.inventory?.storeSelectedItems === true
    || requestsStoredSelections(structuredTexts)
    || (requestedChange.stateModel?.states || []).some((state) => state.kind === "inventory");
  const normalized = deepCloneJson(requestedChange);
  normalized.selection = {
    ...(normalized.selection || {}),
    inventory: {
      ...(normalized.selection?.inventory || {}),
      enabled: true,
      ...(typeof resolvedInventoryCapacity === "number" ? { capacity: resolvedInventoryCapacity } : {}),
      ...(storeSelectedItems ? { storeSelectedItems: true } : {}),
      ...(blockDrawWhenFull ? { blockDrawWhenFull: true } : {}),
      presentation:
        normalized.selection?.inventory?.presentation
        || "persistent_panel",
    },
  };

  if (typeof resolvedInventoryCapacity === "number") {
    normalized.parameters = {
      ...(normalized.parameters || {}),
      capacity: resolvedInventoryCapacity,
    };
  }

  return normalized;
}

export function buildGovernedRequestedChangeCandidate(input: {
  requestedChange: IntentSchema;
  currentFeatureTruth: CurrentFeatureTruth;
  promptFacts: UpdatePromptRawFact[];
}): IntentSchema {
  const afterPersistence = applyPersistenceGovernance(
    input.requestedChange,
    input.currentFeatureTruth,
    input.promptFacts,
  );
  const afterTrigger = applyTriggerGovernance(afterPersistence, input.currentFeatureTruth);
  const afterChoiceCount = applyChoiceCountGovernance(afterTrigger);
  const afterObjectCount = applyObjectCountGovernance(afterChoiceCount);
  return applyInventoryGovernance(afterObjectCount, input.promptFacts);
}

function buildPreservation(input: {
  currentFeatureTruth: CurrentFeatureTruth;
}): UpdateGovernanceDecisions["preservation"]["value"] {
  const { currentFeatureTruth } = input;
  return {
    preservedModuleBackbone: [...currentFeatureTruth.preservedModuleBackbone],
    preservedInvariants: [...currentFeatureTruth.preservedInvariants],
    protectedContracts: [...currentFeatureTruth.ownedSemanticContracts],
  };
}

function pushMutation(
  bucket: UpdateDeltaItem[],
  item: UpdateDeltaItem | undefined,
): void {
  if (!item) {
    return;
  }
  bucket.push(item);
}

function deriveMutationAuthority(input: {
  currentFeatureTruth: CurrentFeatureTruth;
  governedCandidate: IntentSchema;
  promptFacts: UpdatePromptRawFact[];
  currentTruthFacts: UpdateCurrentTruthRawFact[];
}): UpdateGovernanceDecisions["mutationAuthority"]["value"] {
  const { currentFeatureTruth, governedCandidate, promptFacts, currentTruthFacts } = input;
  const add: UpdateDeltaItem[] = [];
  const modify: UpdateDeltaItem[] = [];
  const remove: UpdateDeltaItem[] = [];
  const blocked: UpdateGovernanceDecisions["mutationAuthority"]["value"]["blocked"] = [];
  const currentTriggerKey = currentFeatureTruth.boundedFields.triggerKey as string | undefined;
  const currentChoiceCount = normalizePositiveInteger(currentFeatureTruth.boundedFields.choiceCount);
  const currentObjectCount = normalizePositiveInteger(currentFeatureTruth.boundedFields.objectCount);
  const currentInventoryEnabled = currentFeatureTruth.boundedFields.inventoryEnabled === true;
  const currentInventoryCapacity = normalizePositiveInteger(currentFeatureTruth.boundedFields.inventoryCapacity);
  const currentInventoryFullMessage =
    typeof currentFeatureTruth.boundedFields.inventoryFullMessage === "string"
      ? currentFeatureTruth.boundedFields.inventoryFullMessage
      : undefined;

  const requestedTriggerKey = readRequestedTriggerKey(governedCandidate, currentTriggerKey);
  if (requestedTriggerKey && requestedTriggerKey !== currentTriggerKey) {
    modify.push({
      path: "input.triggerKey",
      kind: "trigger",
      summary: `Rebind the current trigger key to ${requestedTriggerKey}.`,
      oldValue: currentTriggerKey,
      newValue: requestedTriggerKey,
      reason: "Explicit bounded trigger rebind resolved from the governed update candidate.",
    });
  }

  const requestedChoiceCount = readExplicitRequestedChoiceCountChange(governedCandidate);
  if (typeof requestedChoiceCount === "number" && requestedChoiceCount !== currentChoiceCount) {
    modify.push({
      path: "selection.choiceCount",
      kind: "selection",
      summary: `Change the current selection choice count to ${requestedChoiceCount}.`,
      oldValue: currentChoiceCount,
      newValue: requestedChoiceCount,
      reason: "Explicit bounded candidate-count change resolved from the governed update candidate.",
    });
  }

  const requestedObjectCount = normalizePositiveInteger(
    governedCandidate.parameters?.objectCount,
  ) || readRequestedObjectCount(governedCandidate.request.rawPrompt || "");
  if (typeof requestedObjectCount === "number" && requestedObjectCount !== currentObjectCount) {
    modify.push({
      path: "content.collection.objectCount",
      kind: "content",
      summary: `Change the same-feature owned object collection count to ${requestedObjectCount}.`,
      oldValue: currentObjectCount,
      newValue: requestedObjectCount,
      reason: "Explicit bounded object-count change resolved from the governed update candidate.",
    });
  }

  const requestedInventory = governedCandidate.selection?.inventory;
  if (requestedInventory?.enabled === true) {
    pushMutation(
      currentInventoryEnabled ? modify : add,
      {
        path: "selection.inventory",
        kind: "ui",
        summary: currentInventoryEnabled
          ? "Refresh the current feature inventory contract."
          : "Add the current feature inventory contract.",
        oldValue: currentInventoryEnabled ? true : undefined,
        newValue: true,
        reason: "Governed update candidate enables a current-feature inventory contract.",
      },
    );

    if (
      typeof requestedInventory.capacity === "number"
      && requestedInventory.capacity !== currentInventoryCapacity
    ) {
      modify.push({
        path: "selection.inventory.capacity",
        kind: "ui",
        summary: `Change inventory capacity to ${Math.floor(requestedInventory.capacity)}.`,
        oldValue: currentInventoryCapacity,
        newValue: Math.floor(requestedInventory.capacity),
        reason: "Governed update candidate resolves an explicit bounded inventory capacity.",
      });
    }

    if (
      typeof requestedInventory.fullMessage === "string"
      && requestedInventory.fullMessage.trim()
      && requestedInventory.fullMessage !== currentInventoryFullMessage
    ) {
      modify.push({
        path: "selection.inventory.fullMessage",
        kind: "ui",
        summary: "Refresh the inventory full message.",
        oldValue: currentInventoryFullMessage,
        newValue: requestedInventory.fullMessage,
        reason: "Governed update candidate resolves an explicit inventory full message.",
      });
    }

    if (typeof requestedInventory.storeSelectedItems === "boolean") {
      modify.push({
        path: "selection.inventory.storeSelectedItems",
        kind: "state",
        summary: requestedInventory.storeSelectedItems
          ? "Store selected items in the current feature inventory."
          : "Stop storing selected items in the current feature inventory.",
        newValue: requestedInventory.storeSelectedItems,
        reason: "Governed update candidate resolves whether confirmed selections are stored in inventory.",
      });
    }

    if (typeof requestedInventory.blockDrawWhenFull === "boolean") {
      modify.push({
        path: "selection.inventory.blockDrawWhenFull",
        kind: "ui",
        summary: requestedInventory.blockDrawWhenFull
          ? "Block new draws when the inventory is full."
          : "Do not block new draws when the inventory is full.",
        newValue: requestedInventory.blockDrawWhenFull,
        reason: "Governed update candidate resolves the full-inventory draw gating policy.",
      });
    }
  }

  const explicitCrossFeature =
    readPromptFactValue<boolean>(promptFacts, "prompt.update.cross_feature") === true
    || (governedCandidate.composition?.dependencies || []).some((dependency) => dependency.kind === "cross-feature")
    || (governedCandidate.outcomes?.operations || []).includes("grant-feature");
  if (explicitCrossFeature) {
    modify.push({
      path: "composition.dependencies",
      kind: "composition",
      summary: "Change cross-feature composition for the current feature.",
      reason: "Governed update candidate contains cross-feature mutation semantics.",
    });
    if (!hasCrossFeatureTarget(governedCandidate)) {
      blocked.push({
        path: "composition.dependencies.target",
        kind: "composition" as const,
        reason: "Cross-feature update semantics require one explicit target feature boundary.",
        impact: "write-blocking-unresolved-dependency" as const,
      });
    }
  }

  const explicitExternalPersistence =
    readPromptFactValue<boolean>(promptFacts, "prompt.update.external_persistence") === true
    || readCurrentTruthFactValue<boolean>(currentTruthFacts, "current.feature.source_backed") === true
      && (governedCandidate.composition?.dependencies || []).some((dependency) => dependency.kind === "external-system");
  if (explicitExternalPersistence && !hasExternalPersistenceOwner(governedCandidate)) {
    blocked.push({
      path: "composition.dependencies.external-system",
      kind: "composition" as const,
      reason: "External persistence requires an explicit owner or storage boundary.",
      impact: "blueprint-blocking-structural" as const,
    });
  }

  return {
    add,
    modify,
    remove,
    blocked,
  };
}

function deriveScope(input: {
  promptFacts: UpdatePromptRawFact[];
  mutationAuthority: UpdateGovernanceDecisions["mutationAuthority"]["value"];
  governedCandidate: IntentSchema;
}): UpdateGovernanceScope {
  const { promptFacts, mutationAuthority, governedCandidate } = input;

  if (
    mutationAuthority.modify.some((item) => item.path.startsWith("composition.dependencies"))
    || (governedCandidate.composition?.dependencies || []).some((dependency) => dependency.kind === "cross-feature")
    || (governedCandidate.outcomes?.operations || []).includes("grant-feature")
  ) {
    return "cross_feature_mutation";
  }

  if (mutationAuthority.blocked.length > 0) {
    return "ambiguous";
  }

  if (readPromptFactValue<boolean>(promptFacts, "prompt.update.realization_rewrite") === true) {
    return "rewrite";
  }

  return "bounded_update";
}

export function deriveUpdateGovernanceDecisions(input: {
  requestedChange: IntentSchema;
  currentFeatureTruth: CurrentFeatureTruth;
  promptFacts: UpdatePromptRawFact[];
  currentTruthFacts: UpdateCurrentTruthRawFact[];
}): UpdateGovernanceDecisions {
  const governedCandidate = buildGovernedRequestedChangeCandidate({
    requestedChange: input.requestedChange,
    currentFeatureTruth: input.currentFeatureTruth,
    promptFacts: input.promptFacts,
  });
  const effectiveAnalysis = analyzeIntentSemanticLayers(
    governedCandidate,
    governedCandidate.request.rawPrompt,
    governedCandidate.host,
  );
  const mutationAuthority = deriveMutationAuthority({
    currentFeatureTruth: input.currentFeatureTruth,
    governedCandidate,
    promptFacts: input.promptFacts,
    currentTruthFacts: input.currentTruthFacts,
  });
  const scope = deriveScope({
    promptFacts: input.promptFacts,
    mutationAuthority,
    governedCandidate,
  });

  return {
    scope: {
      code: "update.scope",
      value: scope,
      confidence: scope === "bounded_update" ? "medium" : "high",
      rationaleFactCodes: [
        scope === "rewrite" ? "prompt.update.realization_rewrite" : "",
        scope === "cross_feature_mutation" ? "prompt.update.cross_feature" : "",
      ].filter(Boolean),
    },
    preservation: {
      code: "update.preservation",
      value: buildPreservation({ currentFeatureTruth: input.currentFeatureTruth }),
      confidence: "high",
      rationaleFactCodes: [
        "current.feature.preserved_backbone",
        "current.feature.preserved_invariants",
      ],
    },
    mutationAuthority: {
      code: "update.mutation_authority",
      value: mutationAuthority,
      confidence: "high",
      rationaleFactCodes: [
        "current.bounded.trigger_key",
        "current.bounded.choice_count",
        "current.bounded.object_count",
        "current.bounded.inventory_enabled",
        "current.bounded.inventory_capacity",
      ],
    },
    effectiveContracts: {
      code: "update.effective_contracts",
      value: {
        activation: governedCandidate.interaction,
        selection: governedCandidate.selection,
        uiRequirements: governedCandidate.uiRequirements,
        timing: governedCandidate.timing,
        effects: governedCandidate.effects,
        outcomes: governedCandidate.outcomes,
        stateModel: governedCandidate.stateModel,
        contentModel: governedCandidate.contentModel,
        composition: governedCandidate.composition,
        normalizedMechanics: effectiveAnalysis.governanceDecisions.normalizedMechanics.value,
      },
      confidence: "high",
      rationaleFactCodes: [
        "prompt.selection.candidate_pool",
        "prompt.inventory.enabled",
        "schema.interaction.trigger_key",
      ],
    },
  };
}

export function buildGovernedUpdateSchema(input: {
  requestedChange: IntentSchema;
  currentFeatureTruth: CurrentFeatureTruth;
  governanceDecisions: UpdateGovernanceDecisions;
  promptFacts: UpdatePromptRawFact[];
}): GovernedUpdateSchema {
  const governedCandidate = buildGovernedRequestedChangeCandidate({
    requestedChange: input.requestedChange,
    currentFeatureTruth: input.currentFeatureTruth,
    promptFacts: input.promptFacts,
  });

  return {
    version: "1.0",
    target: {
      featureId: input.currentFeatureTruth.featureId,
      revision: input.currentFeatureTruth.revision,
      ...(input.currentFeatureTruth.profile ? { profile: input.currentFeatureTruth.profile } : {}),
      sourceBacked: input.currentFeatureTruth.sourceBacked,
    },
    scope: input.governanceDecisions.scope.value,
    preservation: input.governanceDecisions.preservation.value,
    request: governedCandidate.request,
    classification: governedCandidate.classification,
    requirements: governedCandidate.requirements,
    constraints: governedCandidate.constraints,
    ...(governedCandidate.interaction ? { interaction: governedCandidate.interaction } : {}),
    ...(governedCandidate.targeting ? { targeting: governedCandidate.targeting } : {}),
    ...(governedCandidate.timing ? { timing: governedCandidate.timing } : {}),
    ...(governedCandidate.spatial ? { spatial: governedCandidate.spatial } : {}),
    ...(governedCandidate.stateModel ? { stateModel: governedCandidate.stateModel } : {}),
    ...(governedCandidate.flow ? { flow: governedCandidate.flow } : {}),
    ...(governedCandidate.selection ? { selection: governedCandidate.selection } : {}),
    ...(governedCandidate.effects ? { effects: governedCandidate.effects } : {}),
    ...(governedCandidate.outcomes ? { outcomes: governedCandidate.outcomes } : {}),
    ...(governedCandidate.contentModel ? { contentModel: governedCandidate.contentModel } : {}),
    ...(governedCandidate.composition ? { composition: governedCandidate.composition } : {}),
    ...(governedCandidate.integrations ? { integrations: governedCandidate.integrations } : {}),
    ...(governedCandidate.uiRequirements ? { uiRequirements: governedCandidate.uiRequirements } : {}),
    normalizedMechanics: governedCandidate.normalizedMechanics,
    resolvedAssumptions: dedupeStrings([
      ...(governedCandidate.resolvedAssumptions || []),
      ...(input.governanceDecisions.mutationAuthority.value.blocked.length === 0
        ? ["Governed update schema contains only authority-approved semantic changes."]
        : []),
    ]),
    ...(governedCandidate.parameters ? { parameters: governedCandidate.parameters } : {}),
  };
}
