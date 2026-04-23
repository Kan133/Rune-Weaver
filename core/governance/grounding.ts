import type {
  EvidenceRef,
  GroundingAssessment,
  GroundingAssessmentReasonCode,
  GroundingCheckResult,
} from "../schema/types.js";

function uniqueStrings<T extends string>(values: T[]): T[] {
  return [...new Set(values.filter((value) => value.trim().length > 0))];
}

function uniqueEvidenceRefs(refs: EvidenceRef[]): EvidenceRef[] {
  const unique = new Map<string, EvidenceRef>();
  for (const ref of refs) {
    unique.set(`${ref.id}::${ref.sourceKind}::${ref.title}::${ref.path || ""}`, ref);
  }
  return [...unique.values()];
}

function sumGroundingSymbols(assessment: Pick<
  GroundingAssessment,
  "verifiedSymbolCount" | "allowlistedSymbolCount" | "weakSymbolCount" | "unknownSymbolCount"
>): number {
  return (
    assessment.verifiedSymbolCount
    + assessment.allowlistedSymbolCount
    + assessment.weakSymbolCount
    + assessment.unknownSymbolCount
  );
}

export function buildGroundingAssessment(
  check?: GroundingCheckResult | null,
): GroundingAssessment {
  const verifiedSymbolCount = check?.verifiedSymbols.length || 0;
  const allowlistedSymbolCount = check?.allowlistedSymbols.length || 0;
  const weakSymbolCount = check?.weakSymbols.length || 0;
  const unknownSymbolCount = check?.unknownSymbols.length || 0;
  const totalSymbols =
    verifiedSymbolCount
    + allowlistedSymbolCount
    + weakSymbolCount
    + unknownSymbolCount;

  let status: GroundingAssessment["status"];
  if (totalSymbols === 0) {
    status = "none_required";
  } else if (unknownSymbolCount > 0 || verifiedSymbolCount + allowlistedSymbolCount === 0) {
    status = "insufficient";
  } else if (weakSymbolCount > 0) {
    status = "partial";
  } else {
    status = "exact";
  }

  const reasonCodes: GroundingAssessmentReasonCode[] = [];
  if (totalSymbols === 0) {
    reasonCodes.push("no_symbols_required");
  }
  if (verifiedSymbolCount > 0) {
    reasonCodes.push("verified_symbols_present");
  }
  if (allowlistedSymbolCount > 0) {
    reasonCodes.push("allowlisted_symbols_present");
  }
  if (weakSymbolCount > 0) {
    reasonCodes.push("weak_symbols_present");
  }
  if (unknownSymbolCount > 0) {
    reasonCodes.push("unknown_symbols_present");
  }
  if (totalSymbols > 0 && verifiedSymbolCount + allowlistedSymbolCount === 0) {
    reasonCodes.push("missing_exact_or_allowlisted_backing");
  }

  return {
    status,
    reviewRequired: status === "partial" || status === "insufficient",
    verifiedSymbolCount,
    allowlistedSymbolCount,
    weakSymbolCount,
    unknownSymbolCount,
    warnings: uniqueStrings(check?.warnings || []),
    reasonCodes: uniqueStrings(reasonCodes),
    evidenceRefs: uniqueEvidenceRefs(check?.evidenceRefs || []),
  };
}

export function aggregateGroundingAssessments(
  assessments: Array<GroundingAssessment | null | undefined>,
): GroundingAssessment {
  const normalized = assessments.filter(
    (assessment): assessment is GroundingAssessment => Boolean(assessment),
  );
  if (normalized.length === 0) {
    return buildGroundingAssessment();
  }

  const aggregateCheck: GroundingCheckResult = {
    artifactId: "aggregate",
    verifiedSymbols: [],
    allowlistedSymbols: [],
    weakSymbols: [],
    unknownSymbols: [],
    warnings: uniqueStrings(normalized.flatMap((assessment) => assessment.warnings)),
    evidenceRefs: uniqueEvidenceRefs(normalized.flatMap((assessment) => assessment.evidenceRefs)),
  };

  for (let index = 0; index < normalized.reduce((sum, assessment) => sum + assessment.verifiedSymbolCount, 0); index += 1) {
    aggregateCheck.verifiedSymbols.push(`verified:${index}`);
  }
  for (let index = 0; index < normalized.reduce((sum, assessment) => sum + assessment.allowlistedSymbolCount, 0); index += 1) {
    aggregateCheck.allowlistedSymbols.push(`allowlisted:${index}`);
  }
  for (let index = 0; index < normalized.reduce((sum, assessment) => sum + assessment.weakSymbolCount, 0); index += 1) {
    aggregateCheck.weakSymbols.push(`weak:${index}`);
  }
  for (let index = 0; index < normalized.reduce((sum, assessment) => sum + assessment.unknownSymbolCount, 0); index += 1) {
    aggregateCheck.unknownSymbols.push(`unknown:${index}`);
  }

  const aggregate = buildGroundingAssessment(aggregateCheck);
  return {
    ...aggregate,
    reasonCodes: uniqueStrings(normalized.flatMap((assessment) => assessment.reasonCodes)),
  };
}

export function aggregateGroundingChecks(
  checks: Array<GroundingCheckResult | null | undefined>,
): GroundingAssessment {
  return aggregateGroundingAssessments(checks.map((check) => buildGroundingAssessment(check)));
}

export function aggregateModuleGroundingAssessments(
  modules: Array<
    | {
        sourceKind?: string;
        groundingAssessment?: GroundingAssessment;
      }
    | null
    | undefined
  >,
): GroundingAssessment {
  return aggregateGroundingAssessments(
    modules
      .filter((module) => module?.sourceKind === "synthesized")
      .map((module) => module?.groundingAssessment),
  );
}

export function buildGroundingReviewReason(
  scopeLabel: string,
  assessment?: GroundingAssessment | null,
): string | undefined {
  if (!assessment?.reviewRequired) {
    return undefined;
  }
  return [
    `Grounding for ${scopeLabel} remained ${assessment.status}.`,
    `verified=${assessment.verifiedSymbolCount}`,
    `allowlisted=${assessment.allowlistedSymbolCount}`,
    `weak=${assessment.weakSymbolCount}`,
    `unknown=${assessment.unknownSymbolCount}`,
  ].join(" ");
}

export function validateGroundingAssessmentAgainstChecks(
  assessment: GroundingAssessment | null | undefined,
  checks: Array<GroundingCheckResult | null | undefined>,
  scopeLabel: string,
): string[] {
  if (!assessment) {
    return [`${scopeLabel}: missing canonical grounding assessment`];
  }

  const expected = aggregateGroundingChecks(checks);
  const issues: string[] = [];
  if (assessment.status !== expected.status) {
    issues.push(`${scopeLabel}: grounding status '${assessment.status}' does not match raw checks '${expected.status}'`);
  }
  if (assessment.reviewRequired !== expected.reviewRequired) {
    issues.push(`${scopeLabel}: grounding reviewRequired flag does not match raw checks`);
  }
  if (assessment.verifiedSymbolCount !== expected.verifiedSymbolCount) {
    issues.push(`${scopeLabel}: verifiedSymbolCount does not match raw checks`);
  }
  if (assessment.allowlistedSymbolCount !== expected.allowlistedSymbolCount) {
    issues.push(`${scopeLabel}: allowlistedSymbolCount does not match raw checks`);
  }
  if (assessment.weakSymbolCount !== expected.weakSymbolCount) {
    issues.push(`${scopeLabel}: weakSymbolCount does not match raw checks`);
  }
  if (assessment.unknownSymbolCount !== expected.unknownSymbolCount) {
    issues.push(`${scopeLabel}: unknownSymbolCount does not match raw checks`);
  }
  return issues;
}

export function summarizeGroundingAssessment(
  assessment?: GroundingAssessment | null,
): string {
  const normalized = assessment || buildGroundingAssessment();
  return [
    normalized.status,
    `verified=${normalized.verifiedSymbolCount}`,
    `allowlisted=${normalized.allowlistedSymbolCount}`,
    `weak=${normalized.weakSymbolCount}`,
    `unknown=${normalized.unknownSymbolCount}`,
  ].join(" | ");
}

export function hasGroundingSymbols(
  assessment?: GroundingAssessment | null,
): boolean {
  if (!assessment) {
    return false;
  }
  return sumGroundingSymbols(assessment) > 0;
}
