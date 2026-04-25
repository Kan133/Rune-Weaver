import type {
  CurrentFeatureTruth,
  IntentSchema,
  UpdateCurrentTruthRawFact,
  UpdatePromptRawFact,
} from "../schema/types.js";
import {
  analyzeIntentSemanticLayers,
} from "./intent-schema/semantic-analysis.js";
import {
  hasExplicitCrossFeatureSignal,
  hasExplicitExternalPersistenceSignal,
  hasInventorySignal,
  hasUiSignal,
} from "./intent-schema/prompt-hints.js";
import {
  hasRealizationRewriteSignal,
  readExplicitRequestedChoiceCountChange,
  readRequestedObjectCount,
  readRequestedTriggerKey,
} from "./update-signal-extraction.js";

function pushPromptFact(
  facts: UpdatePromptRawFact[],
  code: string,
  value: unknown,
  source: UpdatePromptRawFact["source"],
  confidence: UpdatePromptRawFact["confidence"],
  evidenceText?: string,
): void {
  if (value === undefined) {
    return;
  }

  if (Array.isArray(value) && value.length === 0) {
    return;
  }

  facts.push({ code, value, source, confidence, evidenceText });
}

function pushCurrentTruthFact(
  facts: UpdateCurrentTruthRawFact[],
  code: string,
  value: unknown,
  source: UpdateCurrentTruthRawFact["source"],
  confidence: UpdateCurrentTruthRawFact["confidence"],
  evidenceText?: string,
): void {
  if (value === undefined) {
    return;
  }

  if (Array.isArray(value) && value.length === 0) {
    return;
  }

  facts.push({ code, value, source, confidence, evidenceText });
}

export function buildUpdatePromptRawFacts(
  requestedChange: IntentSchema,
): UpdatePromptRawFact[] {
  const semanticAnalysis = analyzeIntentSemanticLayers(
    requestedChange,
    requestedChange.request.rawPrompt,
    requestedChange.host,
  );
  const facts: UpdatePromptRawFact[] = semanticAnalysis.rawFacts.map((fact) => ({
    code: fact.code,
    value: fact.value,
    source: fact.source === "prompt_text" || fact.source === "prompt_hints"
      ? fact.source
      : "requested_change",
    confidence: fact.confidence,
    ...(fact.evidenceText ? { evidenceText: fact.evidenceText } : {}),
  }));
  const rawPrompt = requestedChange.request.rawPrompt || "";

  pushPromptFact(
    facts,
    "prompt.update.trigger_key",
    readRequestedTriggerKey(requestedChange),
    "prompt_text",
    "high",
  );
  pushPromptFact(
    facts,
    "prompt.update.choice_count",
    readExplicitRequestedChoiceCountChange(requestedChange),
    "prompt_text",
    "high",
  );
  pushPromptFact(
    facts,
    "prompt.update.object_count",
    readRequestedObjectCount(rawPrompt),
    "prompt_text",
    "high",
  );
  pushPromptFact(
    facts,
    "prompt.update.realization_rewrite",
    hasRealizationRewriteSignal(rawPrompt) ? true : undefined,
    "prompt_text",
    "medium",
  );
  pushPromptFact(
    facts,
    "prompt.update.keep_existing_behavior",
    /其他(?:机制|逻辑|部分|行为)保持不变|keep everything else the same|keep the rest unchanged|without changing other behavior|preserve existing behavior/iu.test(rawPrompt)
      ? true
      : undefined,
    "prompt_text",
    "medium",
  );
  pushPromptFact(
    facts,
    "prompt.update.inventory_surface",
    hasInventorySignal(rawPrompt) && hasUiSignal(rawPrompt) ? true : undefined,
    "prompt_hints",
    "medium",
  );
  pushPromptFact(
    facts,
    "prompt.update.cross_feature",
    hasExplicitCrossFeatureSignal(rawPrompt) ? true : undefined,
    "prompt_text",
    "medium",
  );
  pushPromptFact(
    facts,
    "prompt.update.external_persistence",
    hasExplicitExternalPersistenceSignal(rawPrompt) ? true : undefined,
    "prompt_text",
    "medium",
  );

  return facts;
}

export function buildUpdateCurrentTruthRawFacts(
  currentFeatureTruth: CurrentFeatureTruth,
): UpdateCurrentTruthRawFact[] {
  const facts: UpdateCurrentTruthRawFact[] = [];
  const boundedFields = currentFeatureTruth.boundedFields;

  pushCurrentTruthFact(facts, "current.feature.id", currentFeatureTruth.featureId, "current_feature_truth", "high");
  pushCurrentTruthFact(facts, "current.feature.revision", currentFeatureTruth.revision, "current_feature_truth", "high");
  pushCurrentTruthFact(facts, "current.feature.intent_kind", currentFeatureTruth.intentKind, "current_feature_truth", "high");
  pushCurrentTruthFact(facts, "current.feature.source_backed", currentFeatureTruth.sourceBacked, "current_feature_truth", "high");
  pushCurrentTruthFact(facts, "current.feature.profile", currentFeatureTruth.profile, "current_feature_truth", "high");
  pushCurrentTruthFact(
    facts,
    "current.feature.selected_patterns",
    currentFeatureTruth.selectedPatterns,
    "current_feature_truth",
    "medium",
  );
  pushCurrentTruthFact(
    facts,
    "current.feature.preserved_backbone",
    currentFeatureTruth.preservedModuleBackbone,
    "current_feature_truth",
    "high",
  );
  pushCurrentTruthFact(
    facts,
    "current.feature.preserved_invariants",
    currentFeatureTruth.preservedInvariants,
    "current_feature_truth",
    "high",
  );
  pushCurrentTruthFact(
    facts,
    "current.feature.owned_semantic_contracts",
    currentFeatureTruth.ownedSemanticContracts,
    "current_feature_truth",
    "medium",
  );
  pushCurrentTruthFact(
    facts,
    "current.feature.realization_participation",
    currentFeatureTruth.realizationParticipation,
    "current_feature_truth",
    "medium",
  );
  pushCurrentTruthFact(facts, "current.bounded.trigger_key", boundedFields.triggerKey, "current_feature_truth", "high");
  pushCurrentTruthFact(facts, "current.bounded.choice_count", boundedFields.choiceCount, "current_feature_truth", "high");
  pushCurrentTruthFact(facts, "current.bounded.object_count", boundedFields.objectCount, "current_feature_truth", "high");
  pushCurrentTruthFact(
    facts,
    "current.bounded.inventory_enabled",
    boundedFields.inventoryEnabled,
    "current_feature_truth",
    "high",
  );
  pushCurrentTruthFact(
    facts,
    "current.bounded.inventory_capacity",
    boundedFields.inventoryCapacity,
    "current_feature_truth",
    "high",
  );
  pushCurrentTruthFact(
    facts,
    "current.bounded.inventory_full_message",
    boundedFields.inventoryFullMessage,
    "current_feature_truth",
    "medium",
  );
  pushCurrentTruthFact(
    facts,
    "current.bounded.ability_name",
    boundedFields.abilityName,
    "current_feature_truth",
    "medium",
  );
  pushCurrentTruthFact(
    facts,
    "current.bounded.has_lua_ability_shell",
    boundedFields.hasLuaAbilityShell,
    "current_feature_truth",
    "medium",
  );
  pushCurrentTruthFact(
    facts,
    "current.bounded.has_ability_kv_participation",
    boundedFields.hasAbilityKvParticipation,
    "current_feature_truth",
    "medium",
  );

  return facts;
}
