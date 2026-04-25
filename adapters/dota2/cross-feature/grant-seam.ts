import type {
  Blueprint,
  ExecutionAuthorityDecision,
  FeatureContract,
  FeatureDependencyEdge,
  FeatureContractSurface,
  FeatureStateScope,
  IntentSchema,
  RelationCandidate,
  UpdateIntent,
  WizardClarificationSignals,
  WizardUnresolvedDependency,
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
import { resolveSelectionPoolCompiledObjects } from "../families/selection-pool/source-model.js";
import {
  appendProviderExportEntry,
  appendSelectionGrantBindingEntry,
  appendSelectionGrantContractEntry,
  buildProviderAbilityExportArtifact,
  buildSelectionGrantBindingArtifact,
  buildSelectionGrantContractArtifact,
  DOTA2_PRIMARY_HERO_ABILITY_GRANTABLE_CONTRACT_ID,
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

interface GrantSeamClarificationInput {
  clarificationSignals?: WizardClarificationSignals;
  executionAuthority?: ExecutionAuthorityDecision;
}

interface GrantSeamClarificationState {
  unresolvedCrossFeatureDependencies: WizardUnresolvedDependency[];
  writeBlockRequested: boolean;
}

function dedupeStrings(values: Array<string | undefined>): string[] {
  return [...new Set(values.filter((value): value is string => Boolean(value && value.trim().length > 0)))];
}

function resolveGrantSeamClarificationState(
  input: GrantSeamClarificationInput,
): GrantSeamClarificationState {
  const unresolvedDependencies = input.clarificationSignals?.unresolvedDependencies || [];

  return {
    unresolvedCrossFeatureDependencies: unresolvedDependencies.filter(
      (dependency) => dependency.kind === "cross-feature-target",
    ),
    writeBlockRequested: input.executionAuthority?.blocksWrite === true,
  };
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
    (surface) => `${surface.kind}:${surface.contractId || ""}:${surface.id}`,
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
    (edge) => `${edge.relation}:${edge.targetFeatureId || ""}:${edge.targetSurfaceId || ""}:${edge.targetContractId || ""}`,
  );
}

function isGameplayAbilityRole(role: string | undefined): boolean {
  return role === "gameplay_ability" || role === "gameplay-core";
}

function collectProviderIntentText(schema: IntentSchema): string {
  const typedRequirements = schema.requirements?.typed || [];
  return [
    schema.request?.rawPrompt || "",
    schema.request?.goal || "",
    ...(schema.requirements?.functional || []),
    ...(schema.resolvedAssumptions || []),
    ...typedRequirements.flatMap((requirement) => [
      requirement.summary,
      ...(requirement.outputs || []),
      ...(requirement.invariants || []),
    ]),
  ]
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    .join(" ");
}

function hasExplicitGrantableProviderIntent(schema: IntentSchema): boolean {
  const text = collectProviderIntentText(schema);
  const providerIntentPattern =
    /(?:grantable\s+(?:gameplay\s+ability|hero\s+ability)|gameplay\s+ability\s+provider|grantable\s+provider|provider\s+shell|later\s+external\s+grant(?:ing)?|external\s+consumer|grant[- ]only)/iu;
  const crossFeatureGrantOptOutPattern =
    /(?:no|without)\s+cross[- ]feature\s+grants?|cross[- ]feature\s+grants?\s+(?:disabled|forbidden|not included)|does\s+not\s+include\s+cross[- ]feature\s+grants?/iu;
  const parameters = schema.parameters || {};
  const explicitLaterGrant =
    parameters.externalGrantLater === true ||
    parameters.laterExternalGranting === true ||
    parameters.grantable === true;
  const hasGrantDependency = (schema.composition?.dependencies || []).some(
    (dependency) =>
      (dependency.kind === "cross-feature" || dependency.kind === "external-system")
      && dependency.relation === "grants",
  );

  if (crossFeatureGrantOptOutPattern.test(text)) {
    return false;
  }

  return explicitLaterGrant || hasGrantDependency || providerIntentPattern.test(text);
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
    || (hasExplicitGrantableProviderIntent(input.schema) && isGrantableAbilityProviderBlueprint(input.blueprint))
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

function hasCrossFeatureDependency(
  dependencies: Array<{ kind?: string }> | undefined,
): boolean {
  return (dependencies || []).some((dependency) => dependency.kind === "cross-feature");
}

function hasSelectionGrantSemantics(
  input: {
    schema: IntentSchema;
    updateIntent?: UpdateIntent;
  },
): boolean {
  const { schema, updateIntent } = input;
  const governedComposition = updateIntent?.governedChange?.composition?.dependencies || [];
  const governanceScope = updateIntent?.semanticAnalysis?.governanceDecisions.scope.value;

  if (governanceScope === "cross_feature_mutation") {
    return true;
  }

  if (hasCrossFeatureDependency(governedComposition)) {
    return true;
  }

  if (hasCrossFeatureDependency(schema.composition?.dependencies)) {
    return true;
  }

  return false;
}

function hasResolvedRelationCandidate(relationCandidates: RelationCandidate[] | undefined): boolean {
  return (relationCandidates || []).some(
    (candidate) => typeof candidate.targetFeatureId === "string" && candidate.targetFeatureId.trim().length > 0,
  );
}

function promptRequestsSelectionGrantBinding(prompt: string): boolean {
  return /(?:grant(?:s|ed|ing)?|bind(?:s|ing)?|wire(?:s|d|ing)?|reward|on selection|when selected|primary hero ability|provider|授予|绑定|连到|连接到|接到|提供器|选择后|选中后|获得技能|给英雄技能)/iu.test(
    prompt,
  );
}

function hasExplicitPromptSelectionGrantBinding(input: {
  prompt: string;
  relationCandidates?: RelationCandidate[];
  featureAuthoring?: SelectionPoolFeatureAuthoring;
}): boolean {
  if (!input.featureAuthoring || !hasResolvedRelationCandidate(input.relationCandidates)) {
    return false;
  }

  if (!promptRequestsSelectionGrantBinding(input.prompt)) {
    return false;
  }

  return (
    promptRequestsReplacement(input.prompt)
    || Boolean(resolveReplacementObjectId(input.featureAuthoring, input.prompt))
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
    /^(?:featureAuthoring\.parameters|sourceModel\.artifact)\.poolEntries\b/i.test(item.path)
    || /^(?:featureAuthoring\.parameters|sourceModel\.artifact)\.localCollections\b/i.test(item.path)
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
  prompt: string;
  relationCandidates?: RelationCandidate[];
  featureAuthoring?: SelectionPoolFeatureAuthoring;
}): boolean {
  const explicitPromptBindingRequest = hasExplicitPromptSelectionGrantBinding(input);
  return (
    explicitPromptBindingRequest
    || hasSelectionGrantUpdateDelta(input.updateIntent)
    || hasSelectionGrantRemovalDelta(input.updateIntent)
  );
}

function hasSelectionGrantFallbackAuthority(input: {
  prompt: string;
  relationCandidates?: RelationCandidate[];
  updateIntent?: UpdateIntent;
  featureAuthoring?: SelectionPoolFeatureAuthoring;
}): boolean {
  const explicitPromptBindingRequest = hasExplicitPromptSelectionGrantBinding(input);
  return explicitPromptBindingRequest || (
    hasSelectionGrantUpdateDelta(input.updateIntent)
    && hasResolvedRelationCandidate(input.relationCandidates)
  );
}

function promptRequestsReplacement(prompt: string): boolean {
  return /(?:replace|substitute|swap out|rewire|替换|代替|换成|改成)/i.test(prompt);
}

function resolveReplacementObjectId(
  featureAuthoring: SelectionPoolFeatureAuthoring,
  prompt: string,
): string | undefined {
  const normalizedPrompt = prompt.toLowerCase();
  for (const object of resolveSelectionPoolCompiledObjects(featureAuthoring.parameters, undefined, {
    allowDeferredFeatureExportResolution: true,
  }).objects) {
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
): { entryId: string } | { error: string } {
  const replacementEntryId = resolveReplacementObjectId(featureAuthoring, prompt);
  if (replacementEntryId) {
    return { entryId: replacementEntryId };
  }

  if (promptRequestsReplacement(prompt)) {
    return {
      error: "Cross-feature reward replacement requested, but no existing object id or label could be resolved for rewiring.",
    };
  }

  return {
      error:
      "Cross-feature grant binding cannot mutate selection_pool local authoring after admission. Update selection_pool authoring locally to choose an existing pool entry, then bind that entry id or label.",
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

  const validEntryIds = new Set(
    resolveSelectionPoolCompiledObjects(input.blueprint.featureAuthoring.parameters, input.hostRoot).objects.map((object) => object.id),
  );
  const preservedBindings = existingBindingArtifact.bindings.filter((binding) => validEntryIds.has(binding.entryId));
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
  clarificationSignals?: WizardClarificationSignals;
  executionAuthority?: ExecutionAuthorityDecision;
  currentFeature?: RuneWeaverFeatureRecord;
  workspaceFeatures?: RuneWeaverFeatureRecord[];
}): ApplyDota2GrantSeamResult {
  const notes: string[] = [];
  const writeBlockers: string[] = [];
  let blueprint = input.blueprint;
  const clarificationState = resolveGrantSeamClarificationState({
    clarificationSignals: input.clarificationSignals,
    executionAuthority: input.executionAuthority,
  });

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
    updateIntent: input.updateIntent,
  });
  const selectionGrantFallbackAuthority = hasSelectionGrantFallbackAuthority({
    prompt: input.prompt,
    relationCandidates: input.relationCandidates,
    updateIntent: input.updateIntent,
    featureAuthoring: isSelectionPoolFeatureAuthoring(blueprint.featureAuthoring)
      ? blueprint.featureAuthoring
      : undefined,
  });
  const selectionGrantMutationRequest = hasSelectionGrantMutationRequest({
    updateIntent: input.updateIntent,
    prompt: input.prompt,
    relationCandidates: input.relationCandidates,
    featureAuthoring: isSelectionPoolFeatureAuthoring(blueprint.featureAuthoring)
      ? blueprint.featureAuthoring
      : undefined,
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
          `Skipped ${preservedSelectionGrantState.skippedCount} stale selection grant binding(s) that referenced missing local pool entry ids.`,
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
    `Published Dota2 selection grant contract for ${grantContractArtifact.slots.length} local selection pool slot(s).`,
  );

  if (clarificationState.unresolvedCrossFeatureDependencies.length > 0) {
    if (clarificationState.writeBlockRequested) {
      notes.push(
        "Grant seam honored unresolved cross-feature dependency blocking at host write without widening Stage 1 clarification power.",
      );
    } else {
      notes.push(
        "Grant seam kept unresolved cross-feature dependency blocking at host write even without a broader write-block decision.",
      );
    }
    writeBlockers.push(
      ...clarificationState.unresolvedCrossFeatureDependencies.map(
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
    entryId: boundObjectResult.entryId,
    targetFeatureId: resolvedTarget.targetFeatureId,
    targetSurfaceId: GRANTABLE_PRIMARY_HERO_ABILITY_SURFACE_ID,
    targetContractId: DOTA2_PRIMARY_HERO_ABILITY_GRANTABLE_CONTRACT_ID,
    relation: "grants",
    applyBehavior: "grant_primary_hero_ability",
  };
  if (!grantContractArtifact.slots.some((slot) => slot.entryId === nextBinding.entryId)) {
    writeBlockers.push(
      `Selection grant contract for '${input.featureId}' does not expose local pool entry '${nextBinding.entryId}' for cross-feature grants.`,
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
      ...(existingBindingArtifact?.bindings || []).filter((binding) => binding.entryId !== nextBinding.entryId),
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
    `Bound local selection pool entry '${boundObjectResult.entryId}' to provider '${resolvedTarget.targetFeatureId}:${GRANTABLE_PRIMARY_HERO_ABILITY_SURFACE_ID}'.`,
  );

  appendWriteBlockers(input.writePlan, writeBlockers);
  return { blueprint, writeBlockers, notes };
}
