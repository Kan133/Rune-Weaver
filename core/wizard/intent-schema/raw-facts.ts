import type { HostDescriptor, IntentSchema } from "../../schema/types.js";
import {
  CROSS_FEATURE_SIGNAL_PATTERN,
  INVENTORY_SIGNAL_PATTERN,
  PERSISTENCE_SIGNAL_PATTERN,
  UI_SIGNAL_PATTERN,
  hasNegatedSignalPrefix,
  withGlobalFlag,
} from "./prompt-hints.js";
import type { IntentRawFact, IntentRawFacts } from "./semantic-analysis.js";
import type { PromptSemanticHints } from "./shared.js";
import { isRecord, normalizePositiveInteger, normalizePositiveNumber } from "./shared.js";
import { extractTriggerKeySignal } from "../trigger-key-extraction.js";

interface BuildIntentRawFactsInput {
  candidate: Partial<IntentSchema>;
  rawText: string;
  host: HostDescriptor;
  promptHints: PromptSemanticHints;
}

export function buildIntentRawFacts(input: BuildIntentRawFactsInput): IntentRawFacts {
  const facts: IntentRawFacts = [];
  const { candidate, rawText, promptHints } = input;

  pushRawFact(facts, "host.kind", input.host.kind, "schema_candidate", "high");

  const keyMatch =
    rawText.match(/(?:press|hit|tap|bind|when)\s+(f\d+|[a-z])/i) ||
    rawText.match(/按(?:下)?\s*(f\d+|[a-z])/i) ||
    rawText.match(/(?:以|用)?\s*(f\d+|[a-z])\s*触发/iu) ||
    rawText.match(/触发键[:：]?\s*(f\d+|[a-z])/i);
  pushRawFact(
    facts,
    "prompt.interaction.trigger_key",
    typeof keyMatch?.[1] === "string" ? keyMatch[1].toUpperCase() : undefined,
    "prompt_text",
    keyMatch?.[1] ? "high" : "medium",
    keyMatch?.[0],
  );
  const explicitTriggerKeySignal = extractTriggerKeySignal(rawText);
  if (explicitTriggerKeySignal?.key) {
    pushRawFact(
      facts,
      "prompt.interaction.trigger_key",
      explicitTriggerKeySignal.key,
      "prompt_text",
      "high",
      explicitTriggerKeySignal.evidenceText,
    );
  }
  pushRawFact(
    facts,
    "prompt.interaction.passive",
    /passive|aura|被动|光环/iu.test(rawText) ? true : undefined,
    "prompt_text",
    "medium",
  );

  const cooldownMatch = rawText.match(/(?:cooldown|冷却(?:时间)?)(?:\s*(?:to|of|为))?\s*(\d+(?:\.\d+)?)/i);
  const durationMatch = rawText.match(/(?:duration|持续(?:时间)?)(?:\s*(?:to|of|为))?\s*(\d+(?:\.\d+)?)/i);
  const intervalMatch = rawText.match(/(?:every|interval|每隔)\s*(\d+(?:\.\d+)?)\s*(?:seconds?|秒)/i);
  const distanceMatch =
    rawText.match(/(\d+(?:\.\d+)?)\s*(?:units?|码|yards?)/i) ||
    rawText.match(/(\d+(?:\.\d+)?)\s*(?:距离|射程|range)/i) ||
    rawText.match(/(?:distance|range|距离|冲刺距离)(?:\s*(?:to|of|为))?\s*(\d+(?:\.\d+)?)/i);
  pushRawFact(
    facts,
    "prompt.timing.cooldown_seconds",
    normalizePositiveNumber(cooldownMatch?.[1]),
    "prompt_text",
    cooldownMatch?.[1] ? "high" : "medium",
    cooldownMatch?.[0],
  );
  pushRawFact(
    facts,
    "prompt.timing.duration_seconds",
    normalizePositiveNumber(durationMatch?.[1]),
    "prompt_text",
    durationMatch?.[1] ? "high" : "medium",
    durationMatch?.[0],
  );
  pushRawFact(
    facts,
    "prompt.timing.interval_seconds",
    normalizePositiveNumber(intervalMatch?.[1]),
    "prompt_text",
    intervalMatch?.[1] ? "high" : "medium",
    intervalMatch?.[0],
  );
  pushRawFact(
    facts,
    "prompt.spatial.distance",
    normalizePositiveNumber(distanceMatch?.[1]),
    "prompt_text",
    distanceMatch?.[1] ? "high" : "medium",
    distanceMatch?.[0],
  );

  pushRawFact(
    facts,
    "prompt.targeting.subject",
    inferPromptTargetSubject(rawText),
    "prompt_text",
    "medium",
  );
  pushRawFact(
    facts,
    "prompt.targeting.selector",
    /cursor|mouse|鼠标/iu.test(rawText) ? "cursor" : undefined,
    "prompt_text",
    "medium",
  );
  pushRawFact(
    facts,
    "prompt.spatial.motion_kind",
    /teleport|传送/iu.test(rawText) ? "teleport" : /dash|move|冲刺|移动/iu.test(rawText) ? "dash" : undefined,
    "prompt_text",
    "medium",
  );

  pushRawFact(facts, "prompt.selection.candidate_pool", promptHints.candidatePool || undefined, "prompt_hints", "medium");
  pushRawFact(facts, "prompt.selection.weighted_draw", promptHints.weightedDraw || undefined, "prompt_hints", "medium");
  pushRawFact(facts, "prompt.selection.player_choice", promptHints.playerChoice || undefined, "prompt_hints", "medium");
  pushRawFact(facts, "prompt.selection.candidate_count", promptHints.candidateCount, "prompt_hints", "high");
  pushRawFact(facts, "prompt.selection.committed_count", promptHints.committedCount, "prompt_hints", "high");
  pushRawFact(facts, "prompt.selection.rarity_display", promptHints.rarityDisplay || undefined, "prompt_hints", "medium");
  pushRawFact(facts, "prompt.selection.returns_unchosen_to_pool", promptHints.returnsUnchosenToPool || undefined, "prompt_hints", "medium");
  pushRawFact(facts, "prompt.selection.no_repeat_after_selection", promptHints.noRepeatAfterSelection || undefined, "prompt_hints", "medium");
  pushRawFact(facts, "prompt.selection.immediate_outcome", promptHints.immediateOutcome || undefined, "prompt_hints", "medium");
  pushRawFact(facts, "prompt.ui.surface_needed", promptHints.uiSurface || undefined, "prompt_hints", "medium");
  pushRawFact(facts, "prompt.inventory.enabled", promptHints.inventory || undefined, "prompt_hints", "medium");
  pushRawFact(facts, "prompt.inventory.capacity", promptHints.inventoryCapacity, "prompt_hints", "high");
  pushRawFact(
    facts,
    "prompt.inventory.block_draw_when_full",
    promptHints.inventoryBlocksWhenFull || undefined,
    "prompt_hints",
    "medium",
  );
  pushRawFact(
    facts,
    "prompt.composition.runtime_persistence",
    promptHints.explicitRuntimePersistence || undefined,
    "prompt_hints",
    "high",
  );
  pushRawFact(
    facts,
    "prompt.composition.external_persistence",
    promptHints.explicitExternalPersistence || undefined,
    "prompt_hints",
    "high",
  );
  pushRawFact(
    facts,
    "prompt.composition.explicit_cross_feature",
    promptHints.explicitCrossFeature || undefined,
    "prompt_hints",
    "high",
  );

  pushRawFact(
    facts,
    "prompt.constraint.no_ui",
    hasExplicitNegativeSignal(rawText, UI_SIGNAL_PATTERN) ? true : undefined,
    "prompt_text",
    "high",
  );
  pushRawFact(
    facts,
    "prompt.constraint.no_inventory",
    hasExplicitNegativeSignal(rawText, INVENTORY_SIGNAL_PATTERN) ? true : undefined,
    "prompt_text",
    "high",
  );
  pushRawFact(
    facts,
    "prompt.constraint.no_persistence",
    hasExplicitNegativeSignal(rawText, PERSISTENCE_SIGNAL_PATTERN) ? true : undefined,
    "prompt_text",
    "high",
  );
  pushRawFact(
    facts,
    "prompt.constraint.no_cross_feature",
    hasExplicitNegativeSignal(rawText, CROSS_FEATURE_SIGNAL_PATTERN) ? true : undefined,
    "prompt_text",
    "high",
  );

  const parameters = isRecord(candidate.parameters) ? candidate.parameters : {};
  pushRawFact(
    facts,
    "schema.parameters.shell_only",
    parameters.shellOnly === true ? true : undefined,
    "parameters",
    "high",
  );
  pushRawFact(
    facts,
    "schema.parameters.player_input",
    typeof parameters.playerInput === "boolean" ? parameters.playerInput : undefined,
    "parameters",
    "high",
  );
  pushRawFact(
    facts,
    "schema.parameters.auto_attach",
    typeof parameters.autoAttach === "boolean" ? parameters.autoAttach : undefined,
    "parameters",
    "high",
  );
  pushRawFact(
    facts,
    "schema.parameters.grant_logic_included",
    typeof parameters.grantLogicIncluded === "boolean" ? parameters.grantLogicIncluded : undefined,
    "parameters",
    "high",
  );
  pushRawFact(
    facts,
    "schema.parameters.modifier_application_included",
    typeof parameters.modifierApplicationIncluded === "boolean"
      ? parameters.modifierApplicationIncluded
      : undefined,
    "parameters",
    "high",
  );
  pushRawFact(
    facts,
    "schema.parameters.external_grant_later",
    parameters.externalGrantLater === true ? true : undefined,
    "parameters",
    "high",
  );

  const firstActivation = candidate.interaction?.activations?.[0];
  pushRawFact(facts, "schema.interaction.kind", firstActivation?.kind, "schema_candidate", "high");
  pushRawFact(facts, "schema.interaction.trigger_key", firstActivation?.input, "schema_candidate", "high");
  pushRawFact(facts, "schema.interaction.repeatability", firstActivation?.repeatability, "schema_candidate", "medium");

  pushRawFact(facts, "schema.selection.mode", candidate.selection?.mode, "schema_candidate", "high");
  pushRawFact(facts, "schema.selection.source", candidate.selection?.source, "schema_candidate", "high");
  pushRawFact(facts, "schema.selection.choice_mode", candidate.selection?.choiceMode, "schema_candidate", "high");
  pushRawFact(facts, "schema.selection.cardinality", candidate.selection?.cardinality, "schema_candidate", "high");
  pushRawFact(facts, "schema.selection.choice_count", candidate.selection?.choiceCount, "schema_candidate", "high");
  pushRawFact(facts, "schema.selection.repeatability", candidate.selection?.repeatability, "schema_candidate", "medium");
  pushRawFact(facts, "schema.selection.duplicate_policy", candidate.selection?.duplicatePolicy, "schema_candidate", "medium");
  pushRawFact(
    facts,
    "schema.inventory.enabled",
    candidate.selection?.inventory?.enabled === true ? true : undefined,
    "schema_candidate",
    "high",
  );
  pushRawFact(facts, "schema.inventory.capacity", candidate.selection?.inventory?.capacity, "schema_candidate", "high");
  pushRawFact(
    facts,
    "schema.inventory.block_draw_when_full",
    candidate.selection?.inventory?.blockDrawWhenFull === true ? true : undefined,
    "schema_candidate",
    "high",
  );

  pushRawFact(
    facts,
    "schema.ui.needed",
    candidate.uiRequirements?.needed === true ? true : undefined,
    "schema_candidate",
    "high",
  );
  pushRawFact(
    facts,
    "schema.ui.surfaces",
    (candidate.uiRequirements?.surfaces || []).length > 0 ? candidate.uiRequirements?.surfaces : undefined,
    "schema_candidate",
    "high",
  );

  pushRawFact(
    facts,
    "schema.content.has_candidate_collection",
    (candidate.contentModel?.collections || []).some((collection) => collection.role === "candidate-options")
      ? true
      : undefined,
    "schema_candidate",
    "high",
  );
  pushRawFact(
    facts,
    "schema.composition.has_cross_feature",
    (candidate.composition?.dependencies || []).some((dependency) => dependency.kind === "cross-feature")
      ? true
      : undefined,
    "schema_candidate",
    "high",
  );
  pushRawFact(
    facts,
    "schema.composition.has_external_system",
    (candidate.composition?.dependencies || []).some((dependency) => dependency.kind === "external-system")
      ? true
      : undefined,
    "schema_candidate",
    "high",
  );
  pushRawFact(
    facts,
    "schema.state.has_external_owner",
    (candidate.stateModel?.states || []).some((state) => state.owner === "external") ? true : undefined,
    "schema_candidate",
    "high",
  );
  pushRawFact(
    facts,
    "schema.state.has_persistent_lifetime",
    (candidate.stateModel?.states || []).some((state) => state.lifetime === "persistent") ? true : undefined,
    "schema_candidate",
    "high",
  );
  pushRawFact(
    facts,
    "schema.timing.has_persistent_duration",
    candidate.timing?.duration?.kind === "persistent" ? true : undefined,
    "schema_candidate",
    "high",
  );
  pushRawFact(
    facts,
    "schema.effects.duration_semantics",
    candidate.effects?.durationSemantics,
    "schema_candidate",
    "medium",
  );
  pushRawFact(
    facts,
    "schema.outcomes.operations",
    (candidate.outcomes?.operations || []).length > 0 ? candidate.outcomes?.operations : undefined,
    "schema_candidate",
    "medium",
  );
  pushRawFact(
    facts,
    "schema.parameters.choice_count",
    normalizePositiveInteger(candidate.parameters?.choiceCount),
    "parameters",
    "high",
  );
  pushRawFact(
    facts,
    "schema.parameters.trigger_key",
    typeof candidate.parameters?.triggerKey === "string" ? candidate.parameters.triggerKey : undefined,
    "parameters",
    "high",
  );

  return facts;
}

export function findRawFact(rawFacts: IntentRawFacts, code: string): IntentRawFact | undefined {
  for (let index = rawFacts.length - 1; index >= 0; index -= 1) {
    if (rawFacts[index]?.code === code) {
      return rawFacts[index];
    }
  }
  return undefined;
}

export function readRawFactValue<TValue = unknown>(
  rawFacts: IntentRawFacts,
  code: string,
): TValue | undefined {
  return findRawFact(rawFacts, code)?.value as TValue | undefined;
}

export function hasTrueRawFact(rawFacts: IntentRawFacts, code: string): boolean {
  return findRawFact(rawFacts, code)?.value === true;
}

function pushRawFact(
  facts: IntentRawFacts,
  code: string,
  value: unknown,
  source: IntentRawFact["source"],
  confidence: IntentRawFact["confidence"],
  evidenceText?: string,
): void {
  if (value === undefined) {
    return;
  }

  if (Array.isArray(value) && value.length === 0) {
    return;
  }

  facts.push({
    code,
    value,
    source,
    confidence,
    evidenceText,
  });
}

function hasExplicitNegativeSignal(rawText: string, pattern: RegExp): boolean {
  const matcher = withGlobalFlag(pattern);
  for (const match of rawText.matchAll(matcher)) {
    const index = match.index ?? -1;
    if (index >= 0 && hasNegatedSignalPrefix(rawText, index)) {
      return true;
    }
  }
  return false;
}

function inferPromptTargetSubject(rawText: string): string | undefined {
  if (/cursor|mouse|鼠标/iu.test(rawText)) {
    return /direction|toward|朝|方向/iu.test(rawText) ? "direction" : "point";
  }
  if (/ally|friendly|友军/iu.test(rawText)) {
    return "ally";
  }
  if (/enemy|敌人|敌方/iu.test(rawText)) {
    return "enemy";
  }
  if (/self|自身/iu.test(rawText)) {
    return "self";
  }
  return undefined;
}
