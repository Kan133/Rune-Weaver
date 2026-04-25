import type {
  ExecutionAuthorityDecision,
  WizardClarificationPlan,
  WizardClarificationQuestion,
  WizardClarificationSignals,
} from "../../../core/schema/types.js";

function dedupeStrings(values: Array<string | undefined>): string[] {
  return [...new Set(values.filter((value): value is string => Boolean(value && value.trim().length > 0)))];
}

function createReadyClarificationSignals(): WizardClarificationSignals {
  return {
    semanticPosture: "bounded",
    reasons: [],
    openStructuralContracts: [],
    unresolvedDependencies: [],
  };
}

function collectRemainingQuestionIds(executionAuthority: ExecutionAuthorityDecision): Set<string> {
  const questionIds = new Set<string>();
  for (const contract of executionAuthority.remainingStructuralContracts || []) {
    for (const questionId of contract.questionIds || []) {
      questionIds.add(questionId);
    }
  }
  for (const dependency of executionAuthority.unresolvedDependencies || []) {
    for (const questionId of dependency.questionIds || []) {
      questionIds.add(questionId);
    }
  }
  return questionIds;
}

function filterQuestions(
  clarificationPlan: WizardClarificationPlan | undefined,
  remainingQuestionIds: Set<string>,
): WizardClarificationQuestion[] {
  if (!clarificationPlan?.questions.length || remainingQuestionIds.size === 0) {
    return [];
  }

  return clarificationPlan.questions.filter((question) => remainingQuestionIds.has(question.id));
}

export function reconcileClarificationForReviewArtifact(input: {
  clarificationPlan?: WizardClarificationPlan;
  clarificationSignals?: WizardClarificationSignals;
  executionAuthority: ExecutionAuthorityDecision;
}): {
  clarificationPlan?: WizardClarificationPlan;
  clarificationSignals: WizardClarificationSignals;
} {
  const remainingQuestionIds = collectRemainingQuestionIds(input.executionAuthority);
  const questions = filterQuestions(input.clarificationPlan, remainingQuestionIds);
  const clarificationSignals: WizardClarificationSignals =
    input.executionAuthority.remainingStructuralContracts.length === 0
      && input.executionAuthority.unresolvedDependencies.length === 0
      ? createReadyClarificationSignals()
      : {
          semanticPosture: "open",
          reasons: dedupeStrings([
            ...input.executionAuthority.remainingStructuralContracts.map((contract) => contract.summary),
            ...input.executionAuthority.unresolvedDependencies.map((dependency) => dependency.summary),
          ]),
          openStructuralContracts: [...input.executionAuthority.remainingStructuralContracts],
          unresolvedDependencies: [...input.executionAuthority.unresolvedDependencies],
        };

  if (questions.length === 0) {
    return {
      clarificationPlan: undefined,
      clarificationSignals,
    };
  }

  return {
    clarificationPlan: {
      questions,
      maxQuestions: input.clarificationPlan?.maxQuestions || Math.max(questions.length, 1),
      requiredForFaithfulInterpretation:
        input.executionAuthority.blocksBlueprint || input.executionAuthority.blocksWrite,
      targetPaths: dedupeStrings(questions.flatMap((question) => question.targetPaths || [])),
      reason:
        clarificationSignals.reasons[0]
        || input.clarificationPlan?.reason
        || "The governed create semantics still contain unresolved structural boundaries that would materially change execution.",
      signals: clarificationSignals,
    },
    clarificationSignals,
  };
}
