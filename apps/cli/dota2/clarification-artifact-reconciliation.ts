import type {
  ExecutionAuthorityDecision,
  WizardClarificationPlan,
  WizardClarificationQuestion,
  WizardClarificationSignals,
} from "../../../core/schema/types.js";

function dedupeStrings(values: string[]): string[] {
  return [...new Set(values.filter((value) => value.trim().length > 0))];
}

function collectReferencedQuestionIds(input: {
  clarificationSignals?: WizardClarificationSignals;
  executionAuthority?: ExecutionAuthorityDecision;
}): Set<string> {
  const questionIds = new Set<string>();
  const structuralContracts =
    input.executionAuthority?.remainingStructuralContracts
    || input.clarificationSignals?.openStructuralContracts
    || [];
  const unresolvedDependencies =
    input.executionAuthority?.unresolvedDependencies
    || input.clarificationSignals?.unresolvedDependencies
    || [];

  for (const contract of structuralContracts) {
    for (const questionId of contract.questionIds || []) {
      questionIds.add(questionId);
    }
  }
  for (const dependency of unresolvedDependencies) {
    for (const questionId of dependency.questionIds || []) {
      questionIds.add(questionId);
    }
  }

  return questionIds;
}

function reconcileClarificationPlan(
  clarificationPlan: WizardClarificationPlan | undefined,
  referencedQuestionIds: Set<string>,
): WizardClarificationPlan | undefined {
  if (!clarificationPlan) {
    return undefined;
  }

  const questions = clarificationPlan.questions.filter((question) => referencedQuestionIds.has(question.id));
  if (questions.length === 0) {
    return undefined;
  }

  return {
    ...clarificationPlan,
    questions,
    requiredForFaithfulInterpretation: true,
    targetPaths: dedupeStrings(questions.flatMap((question) => question.targetPaths || [])),
  };
}

function reconcileClarificationSignals(input: {
  clarificationSignals?: WizardClarificationSignals;
  executionAuthority?: ExecutionAuthorityDecision;
  retainedQuestions: WizardClarificationQuestion[];
}): WizardClarificationSignals | undefined {
  if (!input.clarificationSignals) {
    return undefined;
  }

  const openStructuralContracts = input.executionAuthority?.remainingStructuralContracts
    || input.clarificationSignals.openStructuralContracts;
  const unresolvedDependencies = input.executionAuthority?.unresolvedDependencies
    || input.clarificationSignals.unresolvedDependencies;
  const retainedQuestionIds = new Set(input.retainedQuestions.map((question) => question.id));

  return {
    ...input.clarificationSignals,
    openStructuralContracts: openStructuralContracts.filter((contract) =>
      (contract.questionIds || []).some((questionId) => retainedQuestionIds.has(questionId)),
    ),
    unresolvedDependencies: unresolvedDependencies.filter((dependency) =>
      (dependency.questionIds || []).some((questionId) => retainedQuestionIds.has(questionId)),
    ),
  };
}

export function reconcileClarificationArtifactTruth(input: {
  clarificationPlan?: WizardClarificationPlan;
  clarificationSignals?: WizardClarificationSignals;
  executionAuthority?: ExecutionAuthorityDecision;
}): {
  clarificationPlan?: WizardClarificationPlan;
  clarificationSignals?: WizardClarificationSignals;
} {
  if (!input.executionAuthority) {
    return {
      clarificationPlan: input.clarificationPlan,
      clarificationSignals: input.clarificationSignals,
    };
  }

  const referencedQuestionIds = collectReferencedQuestionIds(input);
  const clarificationPlan = reconcileClarificationPlan(input.clarificationPlan, referencedQuestionIds);
  const clarificationSignals = reconcileClarificationSignals({
    clarificationSignals: input.clarificationSignals,
    executionAuthority: input.executionAuthority,
    retainedQuestions: clarificationPlan?.questions || [],
  });

  return {
    clarificationPlan,
    clarificationSignals,
  };
}
