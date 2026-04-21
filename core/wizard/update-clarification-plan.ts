import type {
  UpdateSemanticAnalysis,
  WizardClarificationPlan,
  WizardClarificationQuestion,
} from "../schema/types.js";
import { deriveWizardClarificationAuthority } from "./clarification-plan.js";

function dedupeQuestions(
  questions: WizardClarificationQuestion[],
  maxQuestions: number,
): WizardClarificationQuestion[] {
  const seen = new Set<string>();
  const deduped: WizardClarificationQuestion[] = [];
  for (const question of questions) {
    const key = `${question.id}::${question.question}::${(question.targetPaths || []).join(",")}`;
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

export function buildUpdateClarificationPlan(
  semanticAnalysis: UpdateSemanticAnalysis,
): WizardClarificationPlan | undefined {
  const questions: WizardClarificationQuestion[] = [];
  const maxQuestions = 3;

  for (const residue of semanticAnalysis.openSemanticResidue) {
    if (residue.disposition !== "open" || residue.class === "bounded_detail_only") {
      continue;
    }

    if (residue.id.includes("cross_feature")) {
      questions.push({
        id: "clarify-cross-feature-target",
        question: "Which exact feature is being granted, read, or coupled to?",
        targetPaths: residue.targetPaths,
        reason: residue.summary,
        impact: "write-blocking-unresolved-dependency",
        unresolvedDependencyId: "cross-feature-target",
      });
      continue;
    }

    if (residue.id.includes("persistence") || residue.id.includes("external-system")) {
      questions.push({
        id: "clarify-persistence-scope",
        question: "What ownership scope should persist this behavior or state?",
        targetPaths: residue.targetPaths,
        reason: residue.summary,
        impact: "blueprint-blocking-structural",
      });
      continue;
    }

    questions.push({
      id: "clarify-conflicting-semantics",
      question: "Two parts of the update still imply different behavior boundaries. Which one should win?",
      targetPaths: residue.targetPaths,
      reason: residue.summary,
      impact:
        residue.class === "governance_relevant"
          ? "blueprint-blocking-structural"
          : "advisory",
    });
  }

  if (semanticAnalysis.governanceDecisions.scope.value === "ambiguous") {
    questions.push({
      id: "clarify-conflicting-semantics",
      question: "Which semantic boundary should win for this update?",
      targetPaths: ["governedChange.scope"],
      reason: "Update governance could not collapse the requested change into one unambiguous bounded scope.",
      impact: "blueprint-blocking-structural",
    });
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
      "The governed update still contains one or more unresolved semantic boundaries that would materially change execution.",
  });

  return {
    questions: finalQuestions,
    maxQuestions,
    requiredForFaithfulInterpretation: true,
    targetPaths,
    reason:
      "The governed update still contains one or more unresolved semantic boundaries that would materially change execution.",
    authority,
  };
}
