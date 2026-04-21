/**
 * Rune Weaver - Workspace-backed Update Wizard
 */

import type {
  CurrentFeatureContext,
  CurrentFeatureTruth,
  HostDescriptor,
  IntentSchema,
  UpdateIntent,
} from "../schema/types";
import type { RuneWeaverFeatureRecord } from "../workspace/types.js";
import { DOTA2_X_TEMPLATE_HOST_KIND } from "../host/types.js";
import { buildWizardUpdatePromptPackage } from "../llm/prompt-packages.js";
import { buildDota2RetrievalBundle } from "../retrieval/index.js";
import { validateIntentSchema } from "../validation";
import type { UpdateWizardOptions, UpdateWizardResult } from "./types";
import { buildCurrentFeatureTruth, projectCurrentFeatureContext } from "./current-feature-truth.js";
import { createFallbackIntentSchema, INTENT_SCHEMA_REFERENCE, normalizeIntentSchema } from "./intent-schema";
import { WIZARD_PROVIDER_TIMEOUT_MS } from "./provider-timeout.js";
import { analyzeUpdateSemanticLayers } from "./update-semantic-analysis.js";
import { buildGovernedRequestedChangeCandidate } from "./update-governance-decisions.js";
import { projectUpdateDelta } from "./update-delta-projection.js";
import { buildUpdateClarificationPlan } from "./update-clarification-plan.js";
import { buildUpdatePromptRawFacts } from "./update-raw-facts.js";

const DEFAULT_HOST: HostDescriptor = {
  kind: DOTA2_X_TEMPLATE_HOST_KIND,
};

interface PartialUpdateWizardPayload {
  requestedChange?: Partial<IntentSchema>;
  resolvedAssumptions?: string[];
}

function dedupeStrings(values: Array<string | undefined>): string[] {
  if (!Array.isArray(values)) {
    return [];
  }
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    if (!value) {
      continue;
    }
    const trimmed = value.trim();
    if (!trimmed || seen.has(trimmed)) {
      continue;
    }
    seen.add(trimmed);
    result.push(trimmed);
  }
  return result;
}

function hydrateCurrentFeatureTruthFromContext(
  currentFeatureContext: CurrentFeatureContext,
): CurrentFeatureTruth {
  const profile = currentFeatureContext.featureAuthoring?.profile || currentFeatureContext.sourceModel?.ref?.adapter;
  const preservedModuleBackbone =
    Array.isArray(currentFeatureContext.preservedModuleBackbone) && currentFeatureContext.preservedModuleBackbone.length > 0
      ? currentFeatureContext.preservedModuleBackbone
      : Array.isArray(currentFeatureContext.admittedSkeleton) && currentFeatureContext.admittedSkeleton.length > 0
        ? currentFeatureContext.admittedSkeleton
        : currentFeatureContext.selectedPatterns;
  return {
    featureId: currentFeatureContext.featureId,
    revision: currentFeatureContext.revision,
    intentKind: currentFeatureContext.intentKind,
    sourceBacked: currentFeatureContext.sourceBacked,
    ...(profile ? { profile } : {}),
    selectedPatterns: [...currentFeatureContext.selectedPatterns],
    ...(currentFeatureContext.moduleRecords ? { moduleRecords: [...currentFeatureContext.moduleRecords] } : {}),
    ...(currentFeatureContext.sourceModel ? { sourceModel: currentFeatureContext.sourceModel } : {}),
    ...(currentFeatureContext.featureAuthoring ? { featureAuthoring: currentFeatureContext.featureAuthoring } : {}),
    preservedModuleBackbone: [...preservedModuleBackbone],
    preservedInvariants: [...(currentFeatureContext.preservedInvariants || [])],
    boundedFields: { ...currentFeatureContext.boundedFields },
    realizationParticipation: dedupeStrings([...(currentFeatureContext.boundedFields.realizationKinds || [])]),
    ownedSemanticContracts: dedupeStrings([
      ...(profile ? [`profile:${profile}`] : []),
      ...preservedModuleBackbone.map((role) => `backbone:${role}`),
      ...(currentFeatureContext.boundedFields.inventoryEnabled === true ? ["contract:selection.inventory"] : []),
      ...(typeof currentFeatureContext.boundedFields.triggerKey === "string" ? ["contract:trigger"] : []),
      ...(typeof currentFeatureContext.boundedFields.choiceCount === "number" ? ["contract:selection.choice_count"] : []),
      ...(currentFeatureContext.boundedFields.hasLuaAbilityShell === true ? ["contract:realization.lua"] : []),
      ...(currentFeatureContext.boundedFields.hasAbilityKvParticipation === true ? ["contract:realization.kv"] : []),
    ]),
  };
}

function buildUpdateIntent(input: {
  currentFeatureContext: CurrentFeatureContext;
  currentFeatureTruth: CurrentFeatureTruth;
  requestedChange: IntentSchema;
  resolvedAssumptions?: string[];
}): UpdateIntent {
  const promptFacts = buildUpdatePromptRawFacts(input.requestedChange);
  const requestedChange = buildGovernedRequestedChangeCandidate({
    requestedChange: input.requestedChange,
    currentFeatureTruth: input.currentFeatureTruth,
    promptFacts,
  });
  const { semanticAnalysis, governedChange } = analyzeUpdateSemanticLayers({
    requestedChange,
    currentFeatureTruth: input.currentFeatureTruth,
  });
  const delta = projectUpdateDelta({
    currentFeatureTruth: input.currentFeatureTruth,
    governedChange,
    semanticAnalysis,
  });

  return {
    version: "1.0",
    mode: "update",
    target: {
      featureId: input.currentFeatureTruth.featureId,
      revision: input.currentFeatureTruth.revision,
      ...(input.currentFeatureTruth.profile ? { profile: input.currentFeatureTruth.profile } : {}),
      sourceBacked: input.currentFeatureTruth.sourceBacked,
    },
    currentFeatureContext: input.currentFeatureContext,
    currentFeatureTruth: input.currentFeatureTruth,
    requestedChange,
    governedChange,
    semanticAnalysis,
    delta,
    resolvedAssumptions: dedupeStrings([
      ...(input.resolvedAssumptions || []),
      ...(governedChange.resolvedAssumptions || []),
      "Update preserves unspecified existing behavior from the current feature truth unless governance explicitly approves a change.",
    ]),
  };
}

export function buildCurrentFeatureContext(
  existingFeature: RuneWeaverFeatureRecord,
  hostRoot: string,
): CurrentFeatureContext {
  return projectCurrentFeatureContext(
    buildCurrentFeatureTruth(existingFeature, hostRoot),
  );
}

export async function runWizardToUpdateIntent(
  options: UpdateWizardOptions,
): Promise<UpdateWizardResult> {
  const host = options.input.host ?? DEFAULT_HOST;
  const currentFeatureTruth = hydrateCurrentFeatureTruthFromContext(
    options.input.currentFeatureContext,
  );
  let raw: unknown;
  let requestedChange: IntentSchema;
  let updateIntent: UpdateIntent;
  const preValidationIssues = [];
  const retrievalBundle = await buildDota2RetrievalBundle({
    promptPackageId: "wizard.update",
    queryText: options.input.rawText,
    projectRoot: host.projectRoot || process.cwd(),
    currentFeatureContext: options.input.currentFeatureContext,
  });
  const promptPackage = buildWizardUpdatePromptPackage({
    rawText: options.input.rawText,
    currentFeatureContext: options.input.currentFeatureContext,
    hostSummary: JSON.stringify(host),
    retrievalBundle,
    refinementContext: options.input.refinementContext,
  });

  try {
    const result = await options.client.generateObject<PartialUpdateWizardPayload>({
      messages: promptPackage.messages,
      schemaName: "UpdateWizardInterpretation",
      schemaDescription:
        "Interpret an update request against the current feature truth and return only the semantic requested-change candidate.",
      schema: {
        requestedChange: INTENT_SCHEMA_REFERENCE,
        resolvedAssumptions: ["string"],
      },
      model: options.input.model,
      temperature: options.input.temperature,
      timeoutMs: WIZARD_PROVIDER_TIMEOUT_MS,
      providerOptions: options.input.providerOptions,
    });

    raw = result.raw;
    requestedChange = normalizeIntentSchema(
      result.object.requestedChange || {},
      options.input.rawText,
      host,
    );
    updateIntent = buildUpdateIntent({
      currentFeatureContext: options.input.currentFeatureContext,
      currentFeatureTruth,
      requestedChange,
      resolvedAssumptions: result.object.resolvedAssumptions,
    });
    requestedChange = updateIntent.requestedChange;
  } catch (error) {
    requestedChange = createFallbackIntentSchema(options.input.rawText, host);
    updateIntent = buildUpdateIntent({
      currentFeatureContext: options.input.currentFeatureContext,
      currentFeatureTruth,
      requestedChange,
    });
    requestedChange = updateIntent.requestedChange;
    preValidationIssues.push({
      code: "UPDATE_WIZARD_GENERIC_FALLBACK",
      scope: "schema" as const,
      severity: "warning" as const,
      message: `Update wizard fell back to generic semantic interpretation: ${error instanceof Error ? error.message : String(error)}`,
      path: "wizard.update",
    });
  }

  const clarificationPlan = updateIntent.semanticAnalysis
    ? buildUpdateClarificationPlan(updateIntent.semanticAnalysis)
    : undefined;
  const issues = [...preValidationIssues, ...validateIntentSchema(requestedChange)];

  return {
    requestedChange,
    updateIntent,
    interpretation: {
      requestedChange,
      updateIntent,
      ...(clarificationPlan ? { clarificationPlan } : {}),
      promptPackageId: promptPackage.id,
      promptConstraints: promptPackage.promptConstraints,
      ...(promptPackage.retrievalBundle ? { retrievalBundle: promptPackage.retrievalBundle } : {}),
    },
    ...(clarificationPlan ? { clarificationPlan } : {}),
    issues,
    valid: !issues.some((issue) => issue.severity === "error"),
    raw,
  };
}

export function buildUpdateWizardMessages(
  rawText: string,
  currentFeatureContext: CurrentFeatureContext,
  host: HostDescriptor,
  refinementContext?: UpdateWizardOptions["input"]["refinementContext"],
): Array<{ role: "system" | "user" | "assistant"; content: string }> {
  return buildWizardUpdatePromptPackage({
    rawText,
    currentFeatureContext,
    hostSummary: JSON.stringify(host),
    refinementContext,
  }).messages;
}

export function createUpdateIntentFromRequestedChange(
  currentFeatureContext: CurrentFeatureContext,
  requestedChange: IntentSchema,
): UpdateIntent {
  return buildUpdateIntent({
    currentFeatureContext,
    currentFeatureTruth: hydrateCurrentFeatureTruthFromContext(currentFeatureContext),
    requestedChange,
  });
}
