import type {
  SelectionPoolAdmissionDiagnostics,
  SelectionPoolAdmissionFinding,
} from "../../../../core/schema/types.js";
import {
  SELECTION_POOL_FAMILY_ID,
  createAdmissionFinding,
  type SelectionPoolDetectionResult,
} from "./shared.js";

export function createNotApplicableDiagnostics(
  detection: SelectionPoolDetectionResult,
): SelectionPoolAdmissionDiagnostics {
  return {
    familyId: SELECTION_POOL_FAMILY_ID,
    verdict: "not_applicable",
    detection: {
      handled: false,
      objectKindHint: detection.objectKindHint,
      matchedBy: [],
      findings: [
        createAdmissionFinding(
          "detection",
          "SELECTION_POOL_NOT_APPLICABLE",
          "info",
          "selection_pool detection did not find enough create/update family cues.",
        ),
      ],
    },
    proposal: {
      proposalAvailable: false,
      promptMergeApplied: false,
      promptMergeActions: [],
      findings: [],
    },
    contract: {
      assessed: false,
      skeletonMatch: false,
      findings: [],
    },
    decision: {
      verdict: "not_applicable",
      blockerCodes: [],
      findings: [
        createAdmissionFinding(
          "decision",
          "SELECTION_POOL_NOT_APPLICABLE",
          "info",
          "selection_pool family was not applicable for this prompt.",
        ),
      ],
    },
  };
}

export function createBlockedDiagnostics(
  detection: SelectionPoolDetectionResult,
  blockerCodes: string[],
  reasons: string[],
): SelectionPoolAdmissionDiagnostics {
  return {
    familyId: SELECTION_POOL_FAMILY_ID,
    verdict: "governance_blocked",
    detection: {
      handled: true,
      objectKindHint: detection.objectKindHint,
      matchedBy: detection.matchedBy,
      findings: detection.findings,
    },
    proposal: {
      proposalAvailable: false,
      promptMergeApplied: false,
      promptMergeActions: [],
      findings: [],
    },
    contract: {
      assessed: false,
      skeletonMatch: false,
      findings: [],
    },
    decision: {
      verdict: "governance_blocked",
      blockerCodes,
      findings: blockerCodes.map((code, index) =>
        createAdmissionFinding("decision", code, "error", reasons[index] || `${code} blocked selection_pool admission.`)),
    },
  };
}

function formatMissingAtomBlocker(atom: string): string {
  return `selection_pool admission declined because required contract atom '${atom}' was not satisfied.`;
}

function collectErrorFindings(findings: SelectionPoolAdmissionFinding[]): string[] {
  return findings
    .filter((finding) => finding.severity === "error")
    .map((finding) => finding.message);
}

export function extractSelectionPoolAdmissionBlockers(
  diagnostics: SelectionPoolAdmissionDiagnostics | undefined,
): string[] {
  if (!diagnostics || diagnostics.verdict === "not_applicable") {
    return [];
  }

  const blockers = new Set<string>();
  for (const finding of collectErrorFindings(diagnostics.decision.findings)) {
    blockers.add(finding);
  }

  if (diagnostics.verdict === "declined") {
    for (const atom of diagnostics.contract.assessment?.missingAtoms || []) {
      blockers.add(formatMissingAtomBlocker(atom));
    }
  }

  return [...blockers];
}
