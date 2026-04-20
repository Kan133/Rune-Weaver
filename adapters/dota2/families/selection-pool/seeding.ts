import type { FillIntentCandidate } from "../../../../core/schema/types.js";
import type { RuneWeaverFeatureRecord } from "../../../../core/workspace/types.js";
import {
  buildGenericSeedParameters,
  coercePositiveInteger,
  createFeatureAuthoringProposal,
  createFillIntentCandidates,
  dedupeStrings,
  expandObjectPoolToCount,
  getInventoryDefaults,
  getLegacyTalentDrawSourceArtifactRelativePath,
  getSelectionPoolSourceArtifactRelativePath,
  inferObjectKind,
  isLegacyTalentDrawArtifact,
  isLegacyTalentDrawSourceModelRef,
  isSelectionPoolFeatureAuthoring,
  isSelectionPoolFeatureSourceArtifactV1,
  isSelectionPoolSourceModelRef,
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
  tryReadSourceArtifact,
  type FeatureAuthoringProposal,
  type ResolveSelectionPoolFamilyInput,
  type SelectionPoolFeatureSourceArtifactV1,
  type SelectionPoolInventoryUpdateRequest,
  type SelectionPoolPromptMergeResult,
  type SelectionPoolProposalBuildResult,
} from "./shared.js";
import { migrateLegacyTalentDrawArtifact } from "./shared.js";

function loadExistingSourceArtifact(
  input: ResolveSelectionPoolFamilyInput,
  featureId: string,
): SelectionPoolFeatureSourceArtifactV1 | undefined {
  const sourceModelRef = input.existingFeature?.sourceModel;
  if (isSelectionPoolSourceModelRef(sourceModelRef)) {
    const raw = tryReadSourceArtifact(input.hostRoot, sourceModelRef.path);
    if (isSelectionPoolFeatureSourceArtifactV1(raw)) {
      return raw;
    }
  }
  if (isLegacyTalentDrawSourceModelRef(sourceModelRef)) {
    const raw = tryReadSourceArtifact(input.hostRoot, sourceModelRef.path);
    if (isLegacyTalentDrawArtifact(raw)) {
      return migrateLegacyTalentDrawArtifact(raw);
    }
  }
  const currentPath = getSelectionPoolSourceArtifactRelativePath(featureId);
  const currentRaw = tryReadSourceArtifact(input.hostRoot, currentPath);
  if (isSelectionPoolFeatureSourceArtifactV1(currentRaw)) {
    return currentRaw;
  }
  const legacyPath = getLegacyTalentDrawSourceArtifactRelativePath(featureId);
  const legacyRaw = tryReadSourceArtifact(input.hostRoot, legacyPath);
  if (isLegacyTalentDrawArtifact(legacyRaw)) {
    return migrateLegacyTalentDrawArtifact(legacyRaw);
  }
  return undefined;
}

export function buildProposalFromExistingFeature(
  input: ResolveSelectionPoolFamilyInput,
  featureId: string,
  objectKindHint: ReturnType<typeof inferObjectKind>,
): SelectionPoolProposalBuildResult {
  const existingAuthoring =
    isSelectionPoolFeatureAuthoring(input.existingFeature?.featureAuthoring)
      ? input.existingFeature.featureAuthoring
      : undefined;
  if (existingAuthoring) {
    return {
      proposal: createFeatureAuthoringProposal(
        normalizeFeatureAuthoringParameters(
          existingAuthoring.parameters,
          resolveSelectionPoolObjectKind(existingAuthoring.parameters.objectKind)
            || resolveSelectionPoolObjectKind(existingAuthoring.objectKind)
            || objectKindHint,
        ),
        input.proposalSource,
        ["selection_pool proposal migrated from existing workspace featureAuthoring."],
      ),
      baseSource: "existing_feature",
      seedNotes: ["selection_pool proposal migrated from existing workspace featureAuthoring."],
    };
  }

  const existingArtifact = loadExistingSourceArtifact(input, featureId);
  if (existingArtifact) {
    const baseSource = isLegacyTalentDrawSourceModelRef(input.existingFeature?.sourceModel)
      ? "legacy_source_artifact"
      : "existing_source_artifact";
    const seedNote = baseSource === "legacy_source_artifact"
      ? "selection_pool proposal loaded from legacy talent-draw source artifact."
      : "selection_pool proposal loaded from existing source artifact.";
    return {
      proposal: createFeatureAuthoringProposal(
        normalizeFeatureAuthoringParameters({
          triggerKey: existingArtifact.triggerKey,
          choiceCount: existingArtifact.choiceCount,
          objectKind: existingArtifact.objectKind,
          objects: existingArtifact.objects,
          drawMode: existingArtifact.drawMode,
          duplicatePolicy: existingArtifact.duplicatePolicy,
          poolStateTracking: existingArtifact.poolStateTracking,
          selectionPolicy: existingArtifact.selectionPolicy,
          applyMode: existingArtifact.applyMode,
          postSelectionPoolBehavior: existingArtifact.postSelectionPoolBehavior,
          trackSelectedItems: existingArtifact.trackSelectedItems,
          inventory: existingArtifact.inventory,
          display: existingArtifact.display,
          placeholderConfig: existingArtifact.placeholderConfig,
          effectProfile: existingArtifact.effectProfile,
        }, resolveSelectionPoolObjectKind(existingArtifact.objectKind) || objectKindHint),
        input.proposalSource,
        [seedNote],
      ),
      baseSource,
      seedNotes: [seedNote],
    };
  }

  return {
    proposal: createFeatureAuthoringProposal(
      buildGenericSeedParameters({ objectKindHint }),
      input.proposalSource,
      ["selection_pool proposal seeded from generic family defaults."],
    ),
    baseSource: "generic_seed",
    seedNotes: ["selection_pool proposal seeded from generic family defaults."],
  };
}

function buildPromptMergedInventory(
  prompt: string,
  existingInventory: FeatureAuthoringProposal["parameters"]["inventory"],
): SelectionPoolInventoryUpdateRequest | undefined {
  if (!promptRequestsInventoryContract(prompt)) {
    return undefined;
  }
  const explicitCapacity = parseInventoryCapacity(prompt);
  return {
    enabled: true,
    capacity: explicitCapacity || existingInventory?.capacity || getInventoryDefaults().capacity,
    storeSelectedItems: promptRequestsStoredSelections(prompt) || existingInventory?.storeSelectedItems !== false,
    blockDrawWhenFull: promptRequestsFullBlock(prompt) || existingInventory?.blockDrawWhenFull === true,
    fullMessage: parseQuotedMessage(prompt) || existingInventory?.fullMessage || getInventoryDefaults().fullMessage,
    presentation: "persistent_panel",
  };
}

export function applyPromptMerge(
  input: ResolveSelectionPoolFamilyInput,
  proposal: FeatureAuthoringProposal,
): SelectionPoolPromptMergeResult {
  const metadataObjectKind =
    resolveSelectionPoolObjectKind(proposal.parameters.objectKind)
    || resolveSelectionPoolObjectKind(proposal.objectKind)
    || inferObjectKind(input.prompt, input.existingFeature);

  const requestedTriggerKey = parseTriggerKey(input.prompt);
  const requestedChoiceCount = parseChoiceCount(input.prompt);
  const requestedObjectCount = parseRequestedObjectCount(input.prompt);
  const requestedInventory = buildPromptMergedInventory(input.prompt, proposal.parameters.inventory);

  let parameters = normalizeFeatureAuthoringParameters({
    ...proposal.parameters,
    objectKind: metadataObjectKind,
    triggerKey: requestedTriggerKey || proposal.parameters.triggerKey,
    choiceCount: requestedChoiceCount || proposal.parameters.choiceCount,
    inventory: requestedInventory
      ? {
          enabled: true,
          capacity: requestedInventory.capacity || getInventoryDefaults().capacity,
          storeSelectedItems: requestedInventory.storeSelectedItems !== false,
          blockDrawWhenFull: requestedInventory.blockDrawWhenFull === true,
          fullMessage: requestedInventory.fullMessage || getInventoryDefaults().fullMessage,
          presentation: "persistent_panel",
        }
      : proposal.parameters.inventory,
  }, metadataObjectKind);

  const expansionTarget = typeof requestedObjectCount === "number" && requestedObjectCount > parameters.objects.length
    ? coercePositiveInteger(requestedObjectCount)
    : undefined;
  if (typeof expansionTarget === "number") {
    parameters = expandObjectPoolToCount(parameters, expansionTarget, metadataObjectKind);
  }

  const mergeActions = dedupeStrings([
    requestedTriggerKey && requestedTriggerKey !== proposal.parameters.triggerKey
      ? `triggerKey:${requestedTriggerKey}`
      : undefined,
    typeof requestedChoiceCount === "number" && requestedChoiceCount !== proposal.parameters.choiceCount
      ? `choiceCount:${requestedChoiceCount}`
      : undefined,
    requestedInventory ? "inventory_contract" : undefined,
    typeof expansionTarget === "number" ? "object_pool_expansion" : undefined,
    metadataObjectKind && metadataObjectKind !== proposal.objectKind ? `objectKind:${metadataObjectKind}` : undefined,
  ]);

  return {
    proposal: createFeatureAuthoringProposal(
      parameters,
      input.proposalSource,
      dedupeStrings([
        ...(proposal.notes || []),
        requestedInventory
          ? "selection_pool merged the admitted session-only inventory contract."
          : undefined,
        typeof expansionTarget === "number"
          ? "selection_pool merged an object-pool expansion inside the admitted single-skeleton family."
          : undefined,
      ]),
    ),
    mergeActions,
  };
}

export function createSelectionPoolSeedProposal(
  input: ResolveSelectionPoolFamilyInput,
): SelectionPoolProposalBuildResult {
  const objectKindHint = inferObjectKind(input.prompt, input.existingFeature);
  if (input.mode === "create") {
    return {
      proposal: createFeatureAuthoringProposal(
        buildGenericSeedParameters({ objectKindHint }),
        input.proposalSource,
        ["selection_pool proposal seeded from generic family defaults."],
      ),
      baseSource: "generic_seed",
      seedNotes: ["selection_pool proposal seeded from generic family defaults."],
    };
  }

  const featureId = input.featureId?.trim() || input.existingFeature?.featureId || "";
  return buildProposalFromExistingFeature(input, featureId, objectKindHint);
}

export function resolveSelectionPoolFillIntentCandidates(
  proposalSource: ResolveSelectionPoolFamilyInput["proposalSource"],
): FillIntentCandidate[] {
  return createFillIntentCandidates(
    proposalSource === "llm" ? "llm" : proposalSource === "existing-feature" ? "existing-feature" : "fallback",
  );
}
