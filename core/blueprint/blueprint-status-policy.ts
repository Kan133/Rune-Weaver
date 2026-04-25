import {
  BlueprintModule,
  BlueprintProposal,
  IntentSchema,
  NormalizedBlueprintStatus,
  ProposalStatus,
} from "../schema/types";
import type { SemanticAssessment } from "./seam-authority";

type SchemaReadiness = "ready" | "weak" | "blocked";

export function getSchemaReadiness(schema: IntentSchema): SchemaReadiness {
  if (schema.readiness === "blocked") {
    return "blocked";
  }

  if (schema.readiness === "weak" || schema.isReadyForBlueprint === false) {
    return "weak";
  }

  if ((schema.uncertainties || []).length > 0) {
    return "weak";
  }

  return "ready";
}

export function collectProposalIssues(schema: IntentSchema): string[] {
  const issues = [
    ...(schema.uncertainties || [])
      .map((item) => `Uncertainty: ${item.summary}`),
  ];
  return [...new Set(issues)];
}

export function collectProposalBlockers(schema: IntentSchema): string[] {
  void schema;
  return [];
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
  // Stage 1 proposal posture remains useful evidence, but final blueprint status
  // must come from assembled blueprint facts and semantic assessment only.
  void schema;
  void proposal;

  if (modules.length === 0) {
    return "blocked";
  }

  if (assessment.blockers.length > 0) {
    return "blocked";
  }

  if (
    assessment.warnings.length > 0
  ) {
    return "weak";
  }

  return "ready";
}
