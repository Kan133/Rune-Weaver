import type {
  Blueprint,
  FeatureContract,
  FeatureDependencyEdge,
  FeatureContractSurface,
  FeatureStateScope,
  IntentSchema,
  RelationCandidate,
  UpdateIntent,
  WizardClarificationAuthority,
} from "../../../core/schema/types.js";
import { calculateHostWriteExecutionOrder } from "../../../core/host/write-plan.js";
import type { RuneWeaverFeatureRecord } from "../../../core/workspace/types.js";
import { analyzeDefinitionOnlyProviderSemantics } from "../../../core/wizard/intent-schema/definition-only-provider.js";
import type { WritePlan } from "../assembler/index.js";
import { resolveProviderAbilityBindingFromWritePlan } from "../provider-ability-identity.js";
import {
  isSelectionPoolFeatureAuthoring,
  refreshSelectionPoolWritePlanEntries,
} from "../families/selection-pool/authoring.js";
import {
  type FeatureAuthoring as SelectionPoolFeatureAuthoring,
} from "../families/selection-pool/shared.js";
import {
  appendProviderExportEntry,
  appendSelectionGrantBindingEntry,
  appendSelectionGrantContractEntry,
  buildProviderAbilityExportArtifact,
  buildSelectionGrantBindingArtifact,
  buildSelectionGrantContractArtifact,
  ensureConsumesGrantableAbilitySurface,
  ensureGrantDependencyEdge,
  ensureGrantableAbilitySurface,
  GRANTABLE_PRIMARY_HERO_ABILITY_SURFACE_ID,
  readProviderAbilityExportArtifact,
  readSelectionGrantBindingArtifact,
  type Dota2AbilityExportAttachmentMode,
  type Dota2ProviderAbilityExportSurface,
  type Dota2SelectionGrantBinding,
} from "./grant-artifacts.js";

export interface ApplyDota2GrantSeamResult {
  blueprint: Blueprint;
  writeBlockers: string[];
  notes: string[];
}

function dedupeStrings(values: Array<string | undefined>): string[] {
  return [...new Set(values.filter((value): value is string => Boolean(value && value.trim().length > 0)))];
}

function normalizeFeatureContract(contract?: FeatureContract): FeatureContract {
  return {
    exports: [...(contract?.exports || [])],
    consumes: [...(contract?.consumes || [])],
    integrationSurfaces: [...(contract?.integrationSurfaces || [])],
    stateScopes: [...(contract?.stateScopes || [])],
  };
}

function dedupeByKey<T>(items: T[], keyFor: (item: T) => string): T[] {
  const seen = new Set<string>();
  const deduped: T[] = [];
  for (const item of items) {
    const key = keyFor(item);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    deduped.push(item);
  }
  return deduped;
}

function mergeFeatureContractSurfaces(
  preferred: FeatureContractSurface[],
  fallback: FeatureContractSurface[],
): FeatureContractSurface[] {
  return dedupeByKey(
    [...preferred, ...fallback],
    (surface) => `${surface.kind}:${surface.id}`,
  );
}

function mergeFeatureStateScopes(
  preferred: FeatureStateScope[],
  fallback: FeatureStateScope[],
): FeatureStateScope[] {
  return dedupeByKey(
    [...preferred, ...fallback],
    (scope) => `${scope.stateId}:${scope.scope}:${scope.owner}`,
  );
}

function mergeFeatureContracts(preferred?: FeatureContract, fallback?: FeatureContract): FeatureContract {
  const preferredContract = normalizeFeatureContract(preferred);
  const fallbackContract = normalizeFeatureContract(fallback);
  return {
    exports: mergeFeatureContractSurfaces(preferredContract.exports, fallbackContract.exports),
    consumes: mergeFeatureContractSurfaces(preferredContract.consumes, fallbackContract.consumes),
    integrationSurfaces: dedupeStrings([
      ...preferredContract.integrationSurfaces,
      ...fallbackContract.integrationSurfaces,
    ]),
    stateScopes: mergeFeatureStateScopes(preferredContract.stateScopes, fallbackContract.stateScopes),
  };
}

function mergeDependencyEdges(
  preferred: FeatureDependencyEdge[] | undefined,
  fallback: FeatureDependencyEdge[] | undefined,
): FeatureDependencyEdge[] {
  return dedupeByKey(
    [...(preferred || []), ...(fallback || [])],
    (edge) => `${edge.relation}:${edge.targetFeatureId || ""}:${edge.targetSurfaceId || ""}`,
  );
}

function isGameplayAbilityRole(role: string | undefined): boolean {
  return role === "gameplay_ability" || role === "gameplay-core";
}

function isGrantableAbilityProviderBlueprint(blueprint: Blueprint): boolean {
  if (isSelectionPoolFeatureAuthoring(blueprint.featureAuthoring)) {
    return false;
  }

  const hasGameplayAbilityModule = blueprint.modules.some(
    (module) =>
      module.backboneKind === "gameplay_ability"
      || isGameplayAbilityRole(module.role),
  );
  if (hasGameplayAbilityModule) {
    return true;
  }

  return (blueprint.moduleRecords || []).some(
    (record) =>
      record.backboneKind === "gameplay_ability"
      || isGameplayAbilityRole(record.role),
  );
}

function isGrantableAbilityProvider(input: {
  schema: IntentSchema;
  blueprint: Blueprint;
}): boolean {
  return (
    analyzeDefinitionOnlyProviderSemantics(input.schema, input.schema.request.rawPrompt).matches
    || isGrantableAbilityProviderBlueprint(input.blueprint)
  );
}

function resolveProviderAttachmentMode(blueprint: Blueprint): Dota2AbilityExportAttachmentMode {
  const hasTriggerModule = blueprint.modules.some((module) => module.category === "trigger");
  return hasTriggerModule ? "auto_on_activate" : "grant_only";
}

function refreshWritePlanDerivedFields(writePlan: WritePlan): void {
  writePlan.executionOrder = calculateHostWriteExecutionOrder(writePlan.entries);
  writePlan.stats = {
    total: writePlan.entries.length,
    create: writePlan.entries.filter((entry) => entry.operation === "create").length,
    update: writePlan.entries.filter((entry) => entry.operation === "update").length,
    conflicts: writePlan.entries.filter((entry) => !entry.safe || (entry.conflicts && entry.conflicts.length > 0)).length,
    deferred: writePlan.entries.filter((entry) => entry.deferred).length,
  };
}

function resolveCrossFeatureTargetCandidate(
  relationCandidates: RelationCandidate[] | undefined,
): RelationCandidate | undefined {
  if (!relationCandidates || relationCandidates.length === 0) {
    return undefined;
  }
  if (relationCandidates.length > 1) {
    const [first, second] = relationCandidates;
    if (!second || Math.abs(first.score - second.score) > 0.12) {
      return first.confidence === "high" || first.confidence === "medium" ? first : undefined;
    }
    return undefined;
  }
  return relationCandidates[0].confidence === "high" || relationCandidates[0].confidence === "medium"
    ? relationCandidates[0]
    : undefined;
}

function hasSelectionGrantSemantics(
  input: {
    schema: IntentSchema;
    clarificationAuthority: WizardClarificationAuthority;
    relationCandidates?: RelationCandidate[];
    updateIntent?: UpdateIntent;
  },
): boolean {
  const { schema, clarificationAuthority, relationCandidates, updateIntent } = input;
  const governedComposition = updateIntent?.governedChange?.composition?.dependencies || [];
  const governedOutcomes = updateIntent?.governedChange?.outcomes?.operations || [];
  const governanceScope = updateIntent?.semanticAnalysis?.governanceDecisions.scope.value;

  if (governedOutcomes.includes("grant-feature")) {
    return true;
  }

  if (governanceScope === "cross_feature_mutation") {
    return true;
  }

  if (governedComposition.some((dependency) => dependency.kind === "cross-feature")) {
    return true;
  }

  if ((schema.outcomes?.operations || []).includes("grant-feature")) {
    return true;
  }

  if (schema.classification?.intentKind === "cross-system-composition") {
    return true;
  }

  if ((schema.composition?.dependencies || []).some((dependency) => dependency.kind === "cross-feature")) {
    return true;
  }

  return clarificationAuthority.unresolvedDependencies.some(
    (dependency) => dependency.kind === "cross-feature-target",
  );
}

function hasResolvedRelationCandidate(relationCandidates: RelationCandidate[] | undefined): boolean {
  return (relationCandidates || []).some(
    (candidate) => typeof candidate.targetFeatureId === "string" && candidate.targetFeatureId.trim().length > 0,
  );
}

function isSelectionGrantDeltaPath(item: { kind: string; path: string }): boolean {
  if (
    item.kind === "composition"
    && /^composition\.dependencies(?:\[.*\])?$/i.test(item.path)
  ) {
    return true;
  }

  if (
    item.kind === "integration"
    && /^integrations\.expectedBindings(?:\[.*\])?$/i.test(item.path)
  ) {
    return true;
  }

  if (
    item.kind === "effect"
    && /^selection_flow\.effect_mapping/i.test(item.path)
  ) {
    return true;
  }

  return false;
}

function isSelectionGrantObjectDeltaPath(item: { kind: string; path: string }): boolean {
  if (item.kind !== "content") {
    return false;
  }

  return (
    /^(?:featureAuthoring\.parameters|sourceModel\.artifact)\.objects\b/i.test(item.path)
    || /^contentModel\.collections\b/i.test(item.path)
    || /^data\.weighted_pool\b/i.test(item.path)
  );
}

function hasSelectionGrantUpdateDelta(updateIntent: UpdateIntent | undefined): boolean {
  if (!updateIntent) {
    return false;
  }

  const authority = updateIntent.semanticAnalysis?.governanceDecisions.mutationAuthority.value;
  const addedOrModifiedItems = authority
    ? [...authority.add, ...authority.modify]
    : [...updateIntent.delta.add, ...updateIntent.delta.modify];
  const hasGrantBindingDelta =
    addedOrModifiedItems.some((item) => isSelectionGrantDeltaPath(item))
    || (updateIntent.governedChange?.composition?.dependencies || []).some((dependency) => dependency.kind === "cross-feature")
    || (updateIntent.governedChange?.outcomes?.operations || []).includes("grant-feature");
  const hasLocalObjectDelta = addedOrModifiedItems.some((item) => isSelectionGrantObjectDeltaPath(item));

  return hasGrantBindingDelta && hasLocalObjectDelta;
}

function hasSelectionGrantRemovalDelta(updateIntent: UpdateIntent | undefined): boolean {
  if (!updateIntent) {
    return false;
  }

  const authority = updateIntent.semanticAnalysis?.governanceDecisions.mutationAuthority.value;
  const removeItems = authority ? authority.remove : updateIntent.delta.remove || [];

  return removeItems.some((item) => isSelectionGrantDeltaPath(item) || isSelectionGrantObjectDeltaPath(item));
}

function hasSelectionGrantMutationRequest(input: {
  updateIntent?: UpdateIntent;
  clarificationAuthority: WizardClarificationAuthority;
}): boolean {
  return (
    hasSelectionGrantUpdateDelta(input.updateIntent)
    || hasSelectionGrantRemovalDelta(input.updateIntent)
    || input.clarificationAuthority.unresolvedDependencies.some(
      (dependency) => dependency.kind === "cross-feature-target",
    )
  );
}

function hasSelectionGrantFallbackAuthority(input: {
  relationCandidates?: RelationCandidate[];
  updateIntent?: UpdateIntent;
}): boolean {
  return hasResolvedRelationCandidate(input.relationCandidates) && hasSelectionGrantUpdateDelta(input.updateIntent);
}

function promptRequestsReplacement(prompt: string): boolean {
  return /(?:replace|substitute|swap out|rewire|替换|代替|换成|改成)/i.test(prompt);
}

function resolveReplacementObjectId(
  featureAuthoring: SelectionPoolFeatureAuthoring,
  prompt: string,
): string | undefined {
  const normalizedPrompt = prompt.toLowerCase();
  for (const object of featureAuthoring.parameters.objects) {
    if (
      normalizedPrompt.includes(object.id.toLowerCase()) ||
      normalizedPrompt.includes(object.label.toLowerCase())
    ) {
      return object.id;
    }
  }
  return undefined;
}

function resolveBoundObject(
  featureAuthoring: SelectionPoolFeatureAuthoring,
  prompt: string,
): { objectId: string } | { error: string } {
  const replacementObjectId = resolveReplacementObjectId(featureAuthoring, prompt);
  if (replacementObjectId) {
    return { objectId: replacementObjectId };
  }

  if (promptRequestsReplacement(prompt)) {
    return {
      error: "Cross-feature reward replacement requested, but no existing object id or label could be resolved for rewiring.",
    };
  }

  return {
    error:
      "Cross-feature grant binding cannot mutate selection_pool local authoring after admission. Update selection_pool authoring locally to choose an existing object slot, then bind that object id or label.",
  };
}

function resolveCurrentFeatureRecord(input: {
  featureId: string;
  currentFeature?: RuneWeaverFeatureRecord;
  workspaceFeatures?: RuneWeaverFeatureRecord[];
}): RuneWeaverFeatureRecord | undefined {
  if (input.currentFeature?.featureId === input.featureId) {
    return input.currentFeature;
  }

  return (input.workspaceFeatures || []).find((feature) => feature.featureId === input.featureId);
}

function preserveExistingSelectionGrantState(input: {
  hostRoot: string;
  featureId: string;
  blueprint: Blueprint;
  writePlan: WritePlan;
  currentFeature?: RuneWeaverFeatureRecord;
  workspaceFeatures?: RuneWeaverFeatureRecord[];
}): { blueprint: Blueprint; preservedCount: number; skippedCount: number } {
  if (!isSelectionPoolFeatureAuthoring(input.blueprint.featureAuthoring)) {
    return {
      blueprint: input.blueprint,
      preservedCount: 0,
      skippedCount: 0,
    };
  }

  const existingBindingArtifact = readSelectionGrantBindingArtifact(input.hostRoot, input.featureId);
  if (!existingBindingArtifact?.bindings?.length) {
    return {
      blueprint: input.blueprint,
      preservedCount: 0,
      skippedCount: 0,
    };
  }

  const validObjectIds = new Set(
    input.blueprint.featureAuthoring.parameters.objects.map((object) => object.id),
  );
  const preservedBindings = existingBindingArtifact.bindings.filter((binding) => validObjectIds.has(binding.objectId));
  if (preservedBindings.length === 0) {
    return {
      blueprint: input.blueprint,
      preservedCount: 0,
      skippedCount: existingBindingArtifact.bindings.length,
    };
  }

  const currentFeature = resolveCurrentFeatureRecord({
    featureId: input.featureId,
    currentFeature: input.currentFeature,
    workspaceFeatures: input.workspaceFeatures,
  });

  appendSelectionGrantBindingEntry(
    input.writePlan,
    input.featureId,
    buildSelectionGrantBindingArtifact(input.featureId, preservedBindings),
    refreshWritePlanDerivedFields,
  );
  appendSelectionGrantContractEntry(
    input.writePlan,
    input.featureId,
    buildSelectionGrantContractArtifact(input.featureId, input.blueprint.featureAuthoring),
    refreshWritePlanDerivedFields,
  );

  return {
    blueprint: {
      ...input.blueprint,
      featureContract: mergeFeatureContracts(input.blueprint.featureContract, currentFeature?.featureContract),
      dependencyEdges: mergeDependencyEdges(input.blueprint.dependencyEdges, currentFeature?.dependencyEdges),
    },
    preservedCount: preservedBindings.length,
    skippedCount: existingBindingArtifact.bindings.length - preservedBindings.length,
  };
}

function resolveProviderSurface(
  hostRoot: string,
  feature: RuneWeaverFeatureRecord | undefined,
): Dota2ProviderAbilityExportSurface | undefined {
  if (!feature) {
    return undefined;
  }

  const artifact = readProviderAbilityExportArtifact(hostRoot, feature.featureId);
  if (!artifact) {
    return undefined;
  }

  return artifact.surfaces.find((surface) => surface.surfaceId === GRANTABLE_PRIMARY_HERO_ABILITY_SURFACE_ID);
}

function appendWriteBlockers(writePlan: WritePlan, blockers: string[]): void {
  if (blockers.length === 0) {
    return;
  }

  writePlan.readyForHostWrite = false;
  writePlan.readinessBlockers = dedupeStrings([...(writePlan.readinessBlockers || []), ...blockers]);
}

export function applyDota2GrantSeam(input: {
  hostRoot: string;
  featureId: string;
  prompt: string;
  schema: IntentSchema;
  updateIntent?: UpdateIntent;
  blueprint: Blueprint;
  writePlan: WritePlan;
  relationCandidates?: RelationCandidate[];
  clarificationAuthority: WizardClarificationAuthority;
  currentFeature?: RuneWeaverFeatureRecord;
  workspaceFeatures?: RuneWeaverFeatureRecord[];
}): ApplyDota2GrantSeamResult {
  const notes: string[] = [];
  const writeBlockers: string[] = [];
  let blueprint = input.blueprint;

  const grantableProvider = isGrantableAbilityProvider({ schema: input.schema, blueprint });
  if (grantableProvider) {
    const providerBinding = resolveProviderAbilityBindingFromWritePlan(input.writePlan);
    if (providerBinding.binding) {
      const providerExport = buildProviderAbilityExportArtifact(
        input.featureId,
        providerBinding.binding.abilityName,
        resolveProviderAttachmentMode(blueprint),
      );
      appendProviderExportEntry(input.writePlan, input.featureId, providerExport, refreshWritePlanDerivedFields);
      blueprint = {
        ...blueprint,
        featureContract: ensureGrantableAbilitySurface(blueprint.featureContract),
      };
      notes.push(`Exported Dota2 provider ability surface for ${providerBinding.binding.abilityName}.`);
    } else if (providerBinding.issues.length > 0) {
      writeBlockers.push(
        ...providerBinding.issues.map(
          (issue) => `Provider ability export unresolved for '${input.featureId}': ${issue}`,
        ),
      );
      notes.push(`Skipped Dota2 provider ability export for '${input.featureId}' because runtime ability identity did not close.`);
    } else {
      notes.push(`Skipped Dota2 provider ability export for '${input.featureId}' because no authoritative runtime ability binding was resolved.`);
    }
  }

  const selectionGrantSemantics = hasSelectionGrantSemantics({
    schema: input.schema,
    clarificationAuthority: input.clarificationAuthority,
    relationCandidates: input.relationCandidates,
    updateIntent: input.updateIntent,
  });
  const selectionGrantFallbackAuthority = hasSelectionGrantFallbackAuthority({
    relationCandidates: input.relationCandidates,
    updateIntent: input.updateIntent,
  });
  const selectionGrantMutationRequest = hasSelectionGrantMutationRequest({
    updateIntent: input.updateIntent,
    clarificationAuthority: input.clarificationAuthority,
  });

  if (
    isSelectionPoolFeatureAuthoring(blueprint.featureAuthoring) &&
    !selectionGrantMutationRequest
  ) {
    const preservedSelectionGrantState = preserveExistingSelectionGrantState({
      hostRoot: input.hostRoot,
      featureId: input.featureId,
      blueprint,
      writePlan: input.writePlan,
      currentFeature: input.currentFeature,
      workspaceFeatures: input.workspaceFeatures,
    });
    if (preservedSelectionGrantState.preservedCount > 0) {
      blueprint = preservedSelectionGrantState.blueprint;
      notes.push(
        `Preserved ${preservedSelectionGrantState.preservedCount} existing Dota2 selection grant binding(s) for '${input.featureId}' during a non-binding update.`,
      );
      if (preservedSelectionGrantState.skippedCount > 0) {
        notes.push(
          `Skipped ${preservedSelectionGrantState.skippedCount} stale selection grant binding(s) that referenced missing local object ids.`,
        );
      }
      appendWriteBlockers(input.writePlan, writeBlockers);
      return { blueprint, writeBlockers, notes };
    }
  }

  if (
    (!selectionGrantSemantics && !selectionGrantFallbackAuthority) ||
    !isSelectionPoolFeatureAuthoring(blueprint.featureAuthoring)
  ) {
    appendWriteBlockers(input.writePlan, writeBlockers);
    return { blueprint, writeBlockers, notes };
  }

  const grantContractArtifact = buildSelectionGrantContractArtifact(input.featureId, blueprint.featureAuthoring);
  appendSelectionGrantContractEntry(
    input.writePlan,
    input.featureId,
    grantContractArtifact,
    refreshWritePlanDerivedFields,
  );
  notes.push(
    `Published Dota2 selection grant contract for ${grantContractArtifact.slots.length} local selection object slot(s).`,
  );

  if (input.clarificationAuthority.unresolvedDependencies.length > 0 && input.clarificationAuthority.blocksWrite) {
    writeBlockers.push(
      ...input.clarificationAuthority.unresolvedDependencies.map(
        (dependency) => `Unresolved dependency blocks host write: ${dependency.summary}`,
      ),
    );
  }

  const resolvedTarget = resolveCrossFeatureTargetCandidate(input.relationCandidates);
  if (!resolvedTarget) {
    writeBlockers.push(
      "Cross-feature reward binding requires one resolved target feature before host write can continue.",
    );
    appendWriteBlockers(input.writePlan, writeBlockers);
    blueprint = {
      ...blueprint,
      status: blueprint.status === "blocked" ? "blocked" : "weak",
    };
    return { blueprint, writeBlockers, notes };
  }

  const providerFeature = (input.workspaceFeatures || []).find(
    (feature) => feature.featureId === resolvedTarget.targetFeatureId,
  );
  const providerSurface = resolveProviderSurface(input.hostRoot, providerFeature);
  if (!providerSurface) {
    writeBlockers.push(
      `Target feature '${resolvedTarget.targetFeatureId}' does not yet expose the Dota2 provider surface '${GRANTABLE_PRIMARY_HERO_ABILITY_SURFACE_ID}'.`,
    );
    appendWriteBlockers(input.writePlan, writeBlockers);
    blueprint = {
      ...blueprint,
      status: blueprint.status === "blocked" ? "blocked" : "weak",
    };
    return { blueprint, writeBlockers, notes };
  }

  const boundObjectResult = resolveBoundObject(blueprint.featureAuthoring, input.prompt);
  if ("error" in boundObjectResult) {
    writeBlockers.push(boundObjectResult.error);
    appendWriteBlockers(input.writePlan, writeBlockers);
    blueprint = {
      ...blueprint,
      status: blueprint.status === "blocked" ? "blocked" : "weak",
    };
    return { blueprint, writeBlockers, notes };
  }

  const nextBinding: Dota2SelectionGrantBinding = {
    objectId: boundObjectResult.objectId,
    targetFeatureId: resolvedTarget.targetFeatureId,
    targetSurfaceId: GRANTABLE_PRIMARY_HERO_ABILITY_SURFACE_ID,
    relation: "grants",
    applyBehavior: "grant_primary_hero_ability",
  };
  if (!grantContractArtifact.slots.some((slot) => slot.objectId === nextBinding.objectId)) {
    writeBlockers.push(
      `Selection grant contract for '${input.featureId}' does not expose local object '${nextBinding.objectId}' for cross-feature grants.`,
    );
    appendWriteBlockers(input.writePlan, writeBlockers);
    blueprint = {
      ...blueprint,
      status: blueprint.status === "blocked" ? "blocked" : "weak",
    };
    return { blueprint, writeBlockers, notes };
  }
  const existingBindingArtifact = readSelectionGrantBindingArtifact(input.hostRoot, input.featureId);
  const bindingArtifact = buildSelectionGrantBindingArtifact(
    input.featureId,
    [
      ...(existingBindingArtifact?.bindings || []).filter((binding) => binding.objectId !== nextBinding.objectId),
      nextBinding,
    ],
  );

  appendSelectionGrantBindingEntry(
    input.writePlan,
    input.featureId,
    bindingArtifact,
    refreshWritePlanDerivedFields,
  );
  blueprint = {
    ...blueprint,
    featureContract: ensureConsumesGrantableAbilitySurface(blueprint.featureContract),
    dependencyEdges: ensureGrantDependencyEdge(blueprint.dependencyEdges, resolvedTarget.targetFeatureId),
  };
  notes.push(
    `Bound local selection object '${boundObjectResult.objectId}' to provider '${resolvedTarget.targetFeatureId}:${GRANTABLE_PRIMARY_HERO_ABILITY_SURFACE_ID}'.`,
  );

  appendWriteBlockers(input.writePlan, writeBlockers);
  return { blueprint, writeBlockers, notes };
}
