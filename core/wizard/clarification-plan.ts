import type {
  CurrentFeatureContext,
  IntentSchema,
  RelationCandidate,
  WizardClarificationPlan,
  WizardClarificationQuestion,
  WorkspaceSemanticContext,
} from "../schema/types";
import { hasAmbiguousRelationCandidates } from "./relation-resolver";

interface ClarificationPlanInput {
  rawText: string;
  schema: IntentSchema;
  currentFeatureContext?: CurrentFeatureContext;
  workspaceSemanticContext?: WorkspaceSemanticContext;
  relationCandidates?: RelationCandidate[];
}

function normalizeText(value: string): string {
  return value.toLowerCase();
}

function withGlobalFlag(pattern: RegExp): RegExp {
  return new RegExp(pattern.source, pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`);
}

function hasNegatedSignalPrefix(rawText: string, index: number): boolean {
  const prefix = rawText.slice(Math.max(0, index - 24), index).toLowerCase();
  return /(?:不要|不需要|无需|别|不能|禁止|without|no|do not)\s*(?:any\s*)?$/iu.test(prefix);
}

function hasUnnegatedSignal(rawText: string, pattern: RegExp): boolean {
  const matcher = withGlobalFlag(pattern);
  for (const match of rawText.matchAll(matcher)) {
    const index = match.index ?? -1;
    if (index < 0 || !hasNegatedSignalPrefix(rawText, index)) {
      return true;
    }
  }
  return false;
}

const PERSISTENCE_SIGNAL_PATTERN =
  /persist|persistence|persistent|across matches|cross-match|持久|跨局/iu;
const CROSS_FEATURE_SIGNAL_PATTERN =
  /grant another feature|cross-feature|cross feature|授予另一个|另一个技能/iu;

function dedupeQuestions(
  questions: WizardClarificationQuestion[],
  maxQuestions: number,
): WizardClarificationQuestion[] {
  const seen = new Set<string>();
  const deduped: WizardClarificationQuestion[] = [];

  for (const question of questions) {
    const key = `${question.question}::${(question.targetPaths || []).join(",")}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    deduped.push(question);
    if (deduped.length >= maxQuestions) {
      break;
    }
  }

  return deduped;
}

function looksLikePassiveRequest(rawText: string, schema: IntentSchema): boolean {
  const text = normalizeText(rawText);
  return (
    text.includes("passive")
    || text.includes("aura")
    || text.includes("always on")
    || text.includes("被动")
    || text.includes("光环")
    || (schema.interaction?.activations || []).some((activation) => activation.kind === "passive")
  );
}

function hasTriggerAuthority(schema: IntentSchema): boolean {
  return Boolean(
    (schema.interaction?.activations || []).length > 0
    || schema.flow?.triggerSummary
    || (schema.requirements.typed || []).some((requirement) => requirement.kind === "trigger")
  );
}

function requiresPersistenceScope(rawText: string, schema: IntentSchema): boolean {
  return (
    hasUnnegatedSignal(rawText, PERSISTENCE_SIGNAL_PATTERN)
    || schema.timing?.duration?.kind === "persistent"
    || (schema.stateModel?.states || []).some((state) => state.lifetime === "persistent")
  );
}

function hasPersistenceOwnerScope(schema: IntentSchema): boolean {
  if ((schema.stateModel?.states || []).some((state) => state.lifetime === "persistent" && !!state.owner)) {
    return true;
  }

  return (schema.composition?.dependencies || []).some(
    (dependency) =>
      dependency.kind === "external-system"
      && dependency.relation === "writes"
      && typeof dependency.target === "string"
      && dependency.target.trim().length > 0,
  );
}

function requiresCrossFeatureTarget(rawText: string, schema: IntentSchema): boolean {
  return (
    (schema.outcomes?.operations || []).includes("grant-feature")
    || (schema.composition?.dependencies || []).some((dependency) => dependency.kind === "cross-feature")
    || hasUnnegatedSignal(rawText, CROSS_FEATURE_SIGNAL_PATTERN)
  );
}

function hasCrossFeatureTarget(schema: IntentSchema): boolean {
  return (schema.composition?.dependencies || []).some(
    (dependency) =>
      dependency.kind === "cross-feature"
      && typeof dependency.target === "string"
      && dependency.target.trim().length > 0,
  );
}

function needsRelationDisambiguation(input: ClarificationPlanInput): boolean {
  return hasAmbiguousRelationCandidates(input.relationCandidates);
}

function requiresTargetOwnershipQuestion(rawText: string, schema: IntentSchema): boolean {
  const text = normalizeText(rawText);
  const hasSpatialTargetingPressure =
    (schema.outcomes?.operations || []).includes("move")
    || (schema.outcomes?.operations || []).includes("spawn")
    || Boolean(schema.spatial?.motion)
    || Boolean(schema.spatial?.emission);

  if (!hasSpatialTargetingPressure) {
    return false;
  }

  if (schema.targeting?.subject || schema.targeting?.selector) {
    return false;
  }

  return !(
    text.includes("toward the cursor")
    || text.includes("towards the cursor")
    || text.includes("at the cursor")
    || text.includes("toward cursor")
    || text.includes("朝鼠标")
    || text.includes("向鼠标")
  );
}

function hasContradictorySignals(rawText: string, schema: IntentSchema): boolean {
  const text = normalizeText(rawText);
  const hasPassive = looksLikePassiveRequest(rawText, schema);
  const hasExplicitActivation = hasTriggerAuthority(schema);
  const hasOneShot = schema.selection?.repeatability === "one-shot";
  const hasPersistent = schema.timing?.duration?.kind === "persistent";

  return (
    (hasPassive && hasExplicitActivation && (text.includes("press") || text.includes("按下")))
    || (hasOneShot && hasPersistent)
  );
}

export function buildWizardClarificationPlan(
  input: ClarificationPlanInput,
): WizardClarificationPlan | undefined {
  const questions: WizardClarificationQuestion[] = [];
  const maxQuestions = 3;

  if (!input.currentFeatureContext && !looksLikePassiveRequest(input.rawText, input.schema) && !hasTriggerAuthority(input.schema)) {
    questions.push({
      id: "clarify-trigger-authority",
      question: "What exactly triggers this feature, and who owns that trigger?",
      targetPaths: ["interaction.activations", "flow.triggerSummary", "requirements.typed"],
      reason: "The semantic structure is missing a reliable trigger or passive ownership boundary.",
    });
  }

  if (requiresPersistenceScope(input.rawText, input.schema) && !hasPersistenceOwnerScope(input.schema)) {
    questions.push({
      id: "clarify-persistence-scope",
      question: "What ownership scope should persist this behavior or state?",
      targetPaths: ["timing.duration", "stateModel.states", "composition.dependencies"],
      reason: "Persistence is requested, but the owner or storage boundary is still unclear.",
    });
  }

  if (requiresCrossFeatureTarget(input.rawText, input.schema) && !hasCrossFeatureTarget(input.schema)) {
    questions.push({
      id: "clarify-cross-feature-target",
      question: "Which exact feature is being granted, read, or coupled to?",
      targetPaths: ["composition.dependencies", "outcomes.operations", "integrations.expectedBindings"],
      reason: "Cross-feature semantics are present, but the target feature boundary is not explicit.",
    });
  }

  if (needsRelationDisambiguation(input)) {
    const candidates = input.relationCandidates || [];
    const choiceSummary = candidates
      .slice(0, 3)
      .map((candidate) => candidate.featureName || candidate.targetFeatureId)
      .join(", ");
    questions.push({
      id: "clarify-existing-feature-target",
      question: `Which existing feature do you mean: ${choiceSummary}?`,
      targetPaths: ["composition.dependencies"],
      reason: "The workspace semantic context exposes multiple plausible feature targets for the relation described in the prompt.",
    });
  }

  if (requiresTargetOwnershipQuestion(input.rawText, input.schema)) {
    questions.push({
      id: "clarify-targeting-boundary",
      question: "What is the intended target or direction boundary for this behavior?",
      targetPaths: ["targeting", "spatial", "effects.targets"],
      reason: "The request implies non-trivial targeting or spatial behavior, but the target boundary is still ambiguous.",
    });
  }

  if (hasContradictorySignals(input.rawText, input.schema)) {
    questions.push({
      id: "clarify-conflicting-semantics",
      question: "Two parts of the request imply different behavior boundaries. Which one should win?",
      targetPaths: ["interaction.activations", "selection.repeatability", "timing.duration"],
      reason: "The current schema captures contradictory signals that would change the resulting semantic structure.",
    });
  }

  const finalQuestions = dedupeQuestions(questions, maxQuestions);
  if (finalQuestions.length === 0) {
    return undefined;
  }

  const targetPaths = Array.from(
    new Set(finalQuestions.flatMap((question) => question.targetPaths || [])),
  );

  return {
    questions: finalQuestions,
    maxQuestions,
    requiredForFaithfulInterpretation: true,
    targetPaths,
    reason: "The current IntentSchema is missing one or more high-signal structural details that would materially change the semantic interpretation.",
  };
}
