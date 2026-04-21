import type {
  CurrentFeatureContext,
  IntentSchema,
  RelationCandidate,
  WizardClarificationAuthority,
  WizardClarificationImpact,
  WizardClarificationPlan,
  WizardClarificationQuestion,
  WizardUnresolvedDependency,
  WorkspaceSemanticContext,
} from "../schema/types";
import { getIntentGovernanceView } from "./intent-governance-view.js";
import { hasAmbiguousRelationCandidates } from "./relation-resolver";
import type { IntentSemanticAnalysis, IntentSemanticSurface } from "./intent-schema/semantic-analysis.js";

interface ClarificationPlanInput {
  rawText: string;
  schema: IntentSchema;
  currentFeatureContext?: CurrentFeatureContext;
  workspaceSemanticContext?: WorkspaceSemanticContext;
  relationCandidates?: RelationCandidate[];
  semanticAnalysis?: IntentSemanticAnalysis;
}

const EXTERNAL_PERSISTENCE_SIGNAL_PATTERN =
  /save|saved|save system|profile|profile storage|account|account profile|account storage|external storage|external system|database|nettable|across matches|across sessions|cross[- ]match|cross[- ]session|outside the current match|outside the current session|跨局|跨会话|存档|账号档案|外部存储|外部系统/iu;
const CROSS_FEATURE_SIGNAL_PATTERN =
  /grant another feature|cross-feature|cross feature|另一个功能|另一个技能|跨功能/iu;

function normalizeText(value: string): string {
  return value.toLowerCase();
}

function withGlobalFlag(pattern: RegExp): RegExp {
  return new RegExp(pattern.source, pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`);
}

function hasNegatedSignalPrefix(rawText: string, index: number): boolean {
  const prefix = rawText.slice(Math.max(0, index - 24), index).toLowerCase();
  return /(?:不要|不需要|无需|不能|禁止|without|no|do not)\s*(?:any\s*)?$/iu.test(prefix);
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
    text.includes("passive") ||
    text.includes("aura") ||
    text.includes("always on") ||
    text.includes("被动") ||
    text.includes("光环") ||
    (schema.interaction?.activations || []).some((activation) => activation.kind === "passive")
  );
}

function hasTriggerAuthority(schema: IntentSchema): boolean {
  return Boolean(
    (schema.interaction?.activations || []).length > 0 ||
      schema.flow?.triggerSummary ||
      (schema.requirements.typed || []).some((requirement) => requirement.kind === "trigger"),
  );
}

function hasExplicitExternalPersistenceRequest(rawText: string): boolean {
  return hasUnnegatedSignal(rawText, EXTERNAL_PERSISTENCE_SIGNAL_PATTERN);
}

function hasPersistentOwnershipIssue(schema: IntentSchema): boolean {
  return (schema.stateModel?.states || []).some(
    (state) => state.lifetime === "persistent" && (!state.owner || state.owner === "external"),
  );
}

function requiresPersistenceScope(rawText: string, schema: IntentSchema): boolean {
  return (
    hasExplicitExternalPersistenceRequest(rawText) ||
    hasPersistentOwnershipIssue(schema) ||
    (schema.composition?.dependencies || []).some(
      (dependency) => dependency.kind === "external-system" && dependency.relation === "writes",
    )
  );
}

function hasPersistenceOwnerScope(schema: IntentSchema): boolean {
  if (
    (schema.stateModel?.states || []).some(
      (state) => state.lifetime === "persistent" && state.owner === "external",
    )
  ) {
    return true;
  }

  return (schema.composition?.dependencies || []).some(
    (dependency) =>
      dependency.kind === "external-system" &&
      dependency.relation === "writes" &&
      typeof dependency.target === "string" &&
      dependency.target.trim().length > 0,
  );
}

function requiresCrossFeatureTarget(rawText: string, schema: IntentSchema): boolean {
  return (
    (schema.composition?.dependencies || []).some((dependency) => dependency.kind === "cross-feature") ||
    hasUnnegatedSignal(rawText, CROSS_FEATURE_SIGNAL_PATTERN)
  );
}

function hasCrossFeatureTarget(schema: IntentSchema): boolean {
  return (schema.composition?.dependencies || []).some(
    (dependency) =>
      dependency.kind === "cross-feature" &&
      typeof dependency.target === "string" &&
      dependency.target.trim().length > 0,
  );
}

function needsRelationDisambiguation(input: ClarificationPlanInput): boolean {
  return hasAmbiguousRelationCandidates(input.relationCandidates);
}

function hasResolvedRelationTarget(input: ClarificationPlanInput): boolean {
  const candidates = input.relationCandidates || [];
  if (candidates.length === 0 || hasAmbiguousRelationCandidates(candidates)) {
    return false;
  }

  return candidates[0].confidence === "high" || candidates[0].confidence === "medium";
}

function requiresTargetOwnershipQuestion(rawText: string, schema: IntentSchema): boolean {
  const text = normalizeText(rawText);
  const hasSpatialTargetingPressure =
    (schema.outcomes?.operations || []).includes("move") ||
    (schema.outcomes?.operations || []).includes("spawn") ||
    Boolean(schema.spatial?.motion) ||
    Boolean(schema.spatial?.emission);

  if (!hasSpatialTargetingPressure) {
    return false;
  }

  if (schema.targeting?.subject || schema.targeting?.selector) {
    return false;
  }

  return !(
    text.includes("toward the cursor") ||
    text.includes("towards the cursor") ||
    text.includes("at the cursor") ||
    text.includes("toward cursor") ||
    text.includes("朝鼠标") ||
    text.includes("向鼠标")
  );
}

function hasContradictorySignals(rawText: string, schema: IntentSchema): boolean {
  const text = normalizeText(rawText);
  const hasPassive = looksLikePassiveRequest(rawText, schema);
  const hasExplicitActivation = hasTriggerAuthority(schema);
  const hasSelectionSemantics = Boolean(
    (schema.normalizedMechanics?.candidatePool ||
      schema.normalizedMechanics?.weightedSelection ||
      schema.normalizedMechanics?.playerChoice ||
      schema.normalizedMechanics?.uiModal) ||
      (schema.selection?.source && schema.selection.source !== "none") ||
      (schema.selection?.choiceMode && schema.selection.choiceMode !== "none") ||
      ((schema.selection?.choiceCount || 0) > 1),
  );
  const hasOneShot = hasSelectionSemantics && schema.selection?.repeatability === "one-shot";
  const hasPersistent = schema.timing?.duration?.kind === "persistent";

  return (
    (hasPassive && hasExplicitActivation && (text.includes("press") || text.includes("按下"))) ||
    (hasOneShot && hasPersistent)
  );
}

function applyQuestionImpact(
  question: Omit<WizardClarificationQuestion, "impact"> & {
    impact: WizardClarificationImpact;
  },
): WizardClarificationQuestion {
  return question;
}

export function deriveWizardClarificationAuthority(
  clarificationPlan: WizardClarificationPlan | undefined,
): WizardClarificationAuthority {
  if (!clarificationPlan || clarificationPlan.questions.length === 0) {
    return {
      blocksBlueprint: false,
      blocksWrite: false,
      requiresReview: false,
      unresolvedDependencies: [],
      reasons: [],
    };
  }

  const unresolvedDependencies = new Map<string, WizardUnresolvedDependency>();
  const reasons = new Set<string>();
  let blocksBlueprint = false;
  let blocksWrite = false;
  let requiresReview = false;

  for (const question of clarificationPlan.questions) {
    const impact = question.impact || "blueprint-blocking-structural";
    requiresReview = true;
    reasons.add(question.reason);

    if (impact === "blueprint-blocking-structural") {
      blocksBlueprint = true;
      blocksWrite = true;
      continue;
    }

    if (impact === "write-blocking-unresolved-dependency") {
      blocksWrite = true;
      const dependencyId = question.unresolvedDependencyId || question.id;
      const existing = unresolvedDependencies.get(dependencyId);
      if (existing) {
        existing.questionIds = [...new Set([...existing.questionIds, question.id])];
        continue;
      }

      unresolvedDependencies.set(dependencyId, {
        id: dependencyId,
        kind:
          dependencyId === "cross-feature-target"
            ? "cross-feature-target"
            : dependencyId === "existing-feature-target"
              ? "existing-feature-target"
              : "generic",
        summary: question.reason,
        questionIds: [question.id],
      });
    }
  }

  return {
    blocksBlueprint,
    blocksWrite,
    requiresReview,
    unresolvedDependencies: [...unresolvedDependencies.values()],
    reasons: [...reasons],
  };
}

export function buildWizardClarificationPlan(
  input: ClarificationPlanInput,
): WizardClarificationPlan | undefined {
  if (input.semanticAnalysis) {
    return buildSemanticClarificationPlan(input);
  }

  return buildLegacyClarificationPlan(input);
}

function buildSemanticClarificationPlan(
  input: ClarificationPlanInput,
): WizardClarificationPlan | undefined {
  const questions: WizardClarificationQuestion[] = [];
  const maxQuestions = 3;
  const governance = getIntentGovernanceView(input.schema);
  const openResidue = input.semanticAnalysis?.openSemanticResidue || [];

  for (const residue of openResidue) {
    if (residue.disposition !== "open" || residue.class === "bounded_detail_only") {
      continue;
    }

    const question = buildSemanticResidueQuestion(residue.surface, residue.summary, residue.targetPaths);
    if (!question) {
      continue;
    }

    questions.push(question);
  }

  if (
    !input.currentFeatureContext &&
    !looksLikeGovernedPassiveRequest(input.schema) &&
    !governance.activation.interactive
    && !(governance.activation.kinds || []).includes("passive")
  ) {
    questions.push(
      applyQuestionImpact({
        id: "clarify-trigger-authority",
        question: "What exactly triggers this feature, and who owns that trigger?",
        targetPaths: ["interaction.activations", "flow.triggerSummary", "requirements.typed"],
        reason: "The governed create semantics still do not expose a reliable trigger or passive ownership boundary.",
        impact: "blueprint-blocking-structural",
      }),
    );
  }

  if (needsRelationDisambiguation(input)) {
    const candidates = input.relationCandidates || [];
    const choiceSummary = candidates
      .slice(0, 3)
      .map((candidate) => candidate.featureName || candidate.targetFeatureId)
      .join(", ");
    questions.push(
      applyQuestionImpact({
        id: "clarify-existing-feature-target",
        question: `Which existing feature do you mean: ${choiceSummary}?`,
        targetPaths: ["composition.dependencies"],
        reason: "The workspace semantic context exposes multiple plausible feature targets for the relation described in the request.",
        impact: "write-blocking-unresolved-dependency",
        unresolvedDependencyId: "existing-feature-target",
      }),
    );
  }

  if (
    requiresGovernedTargetOwnershipQuestion(input.schema) &&
    !openResidue.some((item) => item.surface === "activation")
  ) {
    questions.push(
      applyQuestionImpact({
        id: "clarify-targeting-boundary",
        question: "What is the intended target or direction boundary for this behavior?",
        targetPaths: ["targeting", "spatial", "effects.targets"],
        reason: "The governed create semantics imply non-trivial targeting or spatial behavior, but the target boundary is still ambiguous.",
        impact: "blueprint-blocking-structural",
      }),
    );
  }

  if (hasGovernedContradictorySignals(input.schema)) {
    questions.push(
      applyQuestionImpact({
        id: "clarify-conflicting-semantics",
        question: "Two parts of the request imply different behavior boundaries. Which one should win?",
        targetPaths: ["interaction.activations", "selection.repeatability", "timing.duration"],
        reason: "The governed create semantics still contain contradictory structure that would materially change realization.",
        impact: "blueprint-blocking-structural",
      }),
    );
  }

  const finalQuestions = dedupeQuestions(questions, maxQuestions);
  if (finalQuestions.length === 0) {
    return undefined;
  }

  const targetPaths = Array.from(
    new Set(finalQuestions.flatMap((question) => question.targetPaths || [])),
  );

  const authority = deriveWizardClarificationAuthority({
    questions: finalQuestions,
    maxQuestions,
    requiredForFaithfulInterpretation: true,
    targetPaths,
    reason:
      "The governed create semantics still contain unresolved structural boundaries that would materially change execution.",
  });

  return {
    questions: finalQuestions,
    maxQuestions,
    requiredForFaithfulInterpretation: true,
    targetPaths,
    reason:
      "The governed create semantics still contain unresolved structural boundaries that would materially change execution.",
    authority,
  };
}

function buildLegacyClarificationPlan(
  input: ClarificationPlanInput,
): WizardClarificationPlan | undefined {
  const questions: WizardClarificationQuestion[] = [];
  const maxQuestions = 3;

  if (
    !input.currentFeatureContext &&
    !looksLikePassiveRequest(input.rawText, input.schema) &&
    !hasTriggerAuthority(input.schema)
  ) {
    questions.push(
      applyQuestionImpact({
        id: "clarify-trigger-authority",
        question: "What exactly triggers this feature, and who owns that trigger?",
        targetPaths: ["interaction.activations", "flow.triggerSummary", "requirements.typed"],
        reason: "The semantic structure is missing a reliable trigger or passive ownership boundary.",
        impact: "blueprint-blocking-structural",
      }),
    );
  }

  if (
    requiresPersistenceScope(input.rawText, input.schema) &&
    !hasPersistenceOwnerScope(input.schema)
  ) {
    questions.push(
      applyQuestionImpact({
        id: "clarify-persistence-scope",
        question: "What ownership scope should persist this behavior or state?",
        targetPaths: ["timing.duration", "stateModel.states", "composition.dependencies"],
        reason: "Persistence is requested, but the owner or storage boundary is still unclear.",
        impact: "blueprint-blocking-structural",
      }),
    );
  }

  if (
    requiresCrossFeatureTarget(input.rawText, input.schema) &&
    !hasCrossFeatureTarget(input.schema) &&
    !hasResolvedRelationTarget(input)
  ) {
    questions.push(
      applyQuestionImpact({
        id: "clarify-cross-feature-target",
        question: "Which exact feature is being granted, read, or coupled to?",
        targetPaths: ["composition.dependencies", "outcomes.operations", "integrations.expectedBindings"],
        reason: "Cross-feature semantics are present, but the target feature boundary is not explicit.",
        impact: "write-blocking-unresolved-dependency",
        unresolvedDependencyId: "cross-feature-target",
      }),
    );
  }

  if (needsRelationDisambiguation(input)) {
    const candidates = input.relationCandidates || [];
    const choiceSummary = candidates
      .slice(0, 3)
      .map((candidate) => candidate.featureName || candidate.targetFeatureId)
      .join(", ");
    questions.push(
      applyQuestionImpact({
        id: "clarify-existing-feature-target",
        question: `Which existing feature do you mean: ${choiceSummary}?`,
        targetPaths: ["composition.dependencies"],
        reason: "The workspace semantic context exposes multiple plausible feature targets for the relation described in the prompt.",
        impact: "write-blocking-unresolved-dependency",
        unresolvedDependencyId: "existing-feature-target",
      }),
    );
  }

  if (requiresTargetOwnershipQuestion(input.rawText, input.schema)) {
    questions.push(
      applyQuestionImpact({
        id: "clarify-targeting-boundary",
        question: "What is the intended target or direction boundary for this behavior?",
        targetPaths: ["targeting", "spatial", "effects.targets"],
        reason: "The request implies non-trivial targeting or spatial behavior, but the target boundary is still ambiguous.",
        impact: "blueprint-blocking-structural",
      }),
    );
  }

  if (hasContradictorySignals(input.rawText, input.schema)) {
    questions.push(
      applyQuestionImpact({
        id: "clarify-conflicting-semantics",
        question: "Two parts of the request imply different behavior boundaries. Which one should win?",
        targetPaths: ["interaction.activations", "selection.repeatability", "timing.duration"],
        reason: "The current schema captures contradictory signals that would change the resulting semantic structure.",
        impact: "blueprint-blocking-structural",
      }),
    );
  }

  const finalQuestions = dedupeQuestions(questions, maxQuestions);
  if (finalQuestions.length === 0) {
    return undefined;
  }

  const targetPaths = Array.from(
    new Set(finalQuestions.flatMap((question) => question.targetPaths || [])),
  );

  const authority = deriveWizardClarificationAuthority({
    questions: finalQuestions,
    maxQuestions,
    requiredForFaithfulInterpretation: true,
    targetPaths,
    reason:
      "The current IntentSchema is missing one or more high-signal structural details that would materially change the semantic interpretation.",
  });

  return {
    questions: finalQuestions,
    maxQuestions,
    requiredForFaithfulInterpretation: true,
    targetPaths,
    reason:
      "The current IntentSchema is missing one or more high-signal structural details that would materially change the semantic interpretation.",
    authority,
  };
}

function buildSemanticResidueQuestion(
  surface: IntentSemanticSurface,
  reason: string,
  targetPaths?: string[],
): WizardClarificationQuestion | undefined {
  switch (surface) {
    case "selection_flow":
      return applyQuestionImpact({
        id: "clarify-selection-flow",
        question:
          "After the shown candidates appear, should the player choose one to commit, or should the shown results resolve without a follow-up choice?",
        targetPaths: targetPaths || ["selection", "flow", "requirements.typed"],
        reason,
        impact: "blueprint-blocking-structural",
      });
    case "activation":
      return applyQuestionImpact({
        id: "clarify-trigger-authority",
        question: "What exactly triggers this feature, and who owns that trigger?",
        targetPaths: targetPaths || ["interaction.activations", "flow.triggerSummary", "requirements.typed"],
        reason,
        impact: "blueprint-blocking-structural",
      });
    case "state_scope":
      return applyQuestionImpact({
        id: "clarify-persistence-scope",
        question: "What ownership scope should persist this behavior or state?",
        targetPaths: targetPaths || ["stateModel.states", "composition.dependencies"],
        reason,
        impact: "blueprint-blocking-structural",
      });
    case "composition_boundary":
      return applyQuestionImpact({
        id: "clarify-cross-feature-target",
        question: "Which exact feature is being granted, read, or coupled to?",
        targetPaths: targetPaths || ["composition.dependencies", "integrations.expectedBindings"],
        reason,
        impact: "write-blocking-unresolved-dependency",
        unresolvedDependencyId: "cross-feature-target",
      });
    default:
      return applyQuestionImpact({
        id: "clarify-conflicting-semantics",
        question: "Two parts of the request still leave one semantic boundary open. Which one should win?",
        targetPaths,
        reason,
        impact: "blueprint-blocking-structural",
      });
  }
}

function looksLikeGovernedPassiveRequest(schema: IntentSchema): boolean {
  return (schema.interaction?.activations || []).some((activation) => activation.kind === "passive");
}

function requiresGovernedTargetOwnershipQuestion(schema: IntentSchema): boolean {
  const governance = getIntentGovernanceView(schema);
  const hasSpatialTargetingPressure =
    (governance.outcome.operations || []).includes("move") ||
    (governance.outcome.operations || []).includes("spawn") ||
    Boolean(schema.spatial?.motion) ||
    Boolean(schema.spatial?.emission);

  if (!hasSpatialTargetingPressure) {
    return false;
  }

  return !(schema.targeting?.subject || schema.targeting?.selector);
}

function hasGovernedContradictorySignals(schema: IntentSchema): boolean {
  const governance = getIntentGovernanceView(schema);
  const passive = (governance.activation.kinds || []).includes("passive");
  const interactive = governance.activation.interactive;
  const hasSelectionSemantics = Boolean(
    governance.mechanics.candidatePool ||
      governance.mechanics.weightedSelection ||
      governance.mechanics.playerChoice ||
      governance.mechanics.uiModal ||
      governance.selection.present,
  );
  const hasOneShot = hasSelectionSemantics && governance.selection.repeatability === "one-shot";
  const hasPersistent = schema.timing?.duration?.kind === "persistent";

  return (passive && interactive) || (hasOneShot && hasPersistent);
}
