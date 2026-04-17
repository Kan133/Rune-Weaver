import {
  BlueprintModule,
  BlueprintProposal,
  IntentSchema,
  NormalizedBlueprintStatus,
  ProposalStatus,
} from "../schema/types";
import { isResolvableExistingSeamIssue } from "./clarification-policy";
import type { SemanticAssessment } from "./seam-authority";

type SchemaReadiness = "ready" | "weak" | "blocked";

export function getSchemaReadiness(schema: IntentSchema): SchemaReadiness {
  if (schema.readiness) {
    return schema.readiness;
  }

  if (schema.isReadyForBlueprint) {
    return "ready";
  }

  if ((schema.requiredClarifications || []).some((item) => item.blocksFinalization)) {
    return "blocked";
  }

  if ((schema.openQuestions || []).length > 0 || (schema.uncertainties || []).length > 0) {
    return "weak";
  }

  return "blocked";
}

export function collectProposalIssues(schema: IntentSchema): string[] {
  const issues = [
    ...schema.openQuestions
      .filter((question) => !isResolvableExistingSeamIssue(question, schema))
      .map((question) => `Open question: ${question}`),
    ...(schema.uncertainties || [])
      .filter((item) => !isResolvableExistingSeamIssue(item.summary, schema))
      .map((item) => `Uncertainty: ${item.summary}`),
  ];
  return [...new Set(issues)];
}

export function collectProposalBlockers(schema: IntentSchema): string[] {
  return (schema.requiredClarifications || [])
    .filter((item) => item.blocksFinalization && !isResolvableExistingSeamIssue(item.question, schema))
    .map((item) => item.question);
}

export function getProposalStatus(
  readiness: SchemaReadiness,
  issues: string[],
  blockedBy: string[]
): ProposalStatus {
  if (readiness === "blocked" || blockedBy.length > 0) {
    return "blocked";
  }
  if (readiness === "weak" || issues.length > 0) {
    return "needs_review";
  }
  return "usable";
}

export function getNormalizedStatus(
  schema: IntentSchema,
  proposal: BlueprintProposal,
  modules: BlueprintModule[],
  assessment: SemanticAssessment
): NormalizedBlueprintStatus {
  const readiness = getSchemaReadiness(schema);
  if (readiness === "blocked" || proposal.status === "blocked" || assessment.blockers.length > 0) {
    return "blocked";
  }

  if (modules.length === 0) {
    return "blocked";
  }

  if (readiness === "weak" || proposal.status === "needs_review" || assessment.warnings.length > 0) {
    return "weak";
  }

  return "ready";
}
