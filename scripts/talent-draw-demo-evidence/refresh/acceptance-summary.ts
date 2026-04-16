import { existsSync, readdirSync, readFileSync } from "fs";
import { join } from "path";

import type { AcceptanceSummary } from "./types.js";
import type { Manifest } from "./types.js";
import type { EvidenceCompletenessResult } from "./completeness.js";
import { GAP_FILL_APPROVALS_DIR } from "./constants.js";

interface ApprovalObservation {
  prompt: string;
  boundary: string;
  source: "gap_fill_approval";
}

function readObservedGapFill(latestDir: string): ApprovalObservation | undefined {
  const approvalsDir = join(latestDir, GAP_FILL_APPROVALS_DIR);
  if (!existsSync(approvalsDir)) {
    return undefined;
  }

  const firstApproval = readdirSync(approvalsDir)
    .filter((file) => file.endsWith(".json"))
    .sort()[0];

  if (!firstApproval) {
    return undefined;
  }

  try {
    const raw = readFileSync(join(approvalsDir, firstApproval), "utf-8");
    const parsed = JSON.parse(raw) as {
      instruction?: string;
      boundaryId?: string;
    };

    if (!parsed.instruction || !parsed.boundaryId) {
      return undefined;
    }

    return {
      prompt: parsed.instruction,
      boundary: parsed.boundaryId,
      source: "gap_fill_approval",
    };
  } catch {
    return undefined;
  }
}

export function buildAcceptanceSummary(input: {
  latestDir: string;
  canonicalPrompt: string;
  canonicalBoundary: string;
  continuationOrder: string[];
  evidenceCompleteness: EvidenceCompletenessResult;
  manifest?: Manifest;
  observedPrompt?: string;
  observedBoundary?: string;
}): AcceptanceSummary {
  const {
    latestDir,
    canonicalPrompt,
    canonicalBoundary,
    continuationOrder,
    evidenceCompleteness,
    manifest,
    observedPrompt,
    observedBoundary,
  } = input;

  const approvalObservation = readObservedGapFill(latestDir);
  const observed = approvalObservation
    ? approvalObservation
    : {
        prompt: observedPrompt || canonicalPrompt,
        boundary: observedBoundary || canonicalBoundary,
        source: "canonical_contract" as const,
      };

  const promptBoundaryMatch =
    observed.prompt === canonicalPrompt &&
    observed.boundary === canonicalBoundary;
  const classification = promptBoundaryMatch ? "canonical" : "exploratory";

  const lifecycleCheckpoints = {
    canonicalContractPresent: existsSync(join(latestDir, "canonical-gap-fill-contract.json")),
    manifestPresent: existsSync(join(latestDir, "manifest.json")) || !!manifest,
    reviewArtifactPresent: existsSync(join(latestDir, "review-artifact.json")),
    doctorOutputPresent: existsSync(join(latestDir, "doctor-output.txt")),
    validateOutputPresent: existsSync(join(latestDir, "validate-output.txt")),
    generatedFilesPresent: existsSync(join(latestDir, "generated-files.json")),
    gapFillApprovalPresent: existsSync(join(latestDir, GAP_FILL_APPROVALS_DIR)),
    requiredScreenshotsPresent: evidenceCompleteness.missingManualEvidence
      .filter((path) => path.startsWith("screenshots/"))
      .length === 0,
    runtimeVideoPresent: !evidenceCompleteness.missingManualEvidence.includes("talent-draw-demo-runtime.mp4"),
  };

  const manifestFilePaths = new Set((manifest?.files || []).map((file) => file.path));
  const reviewStatePresent =
    existsSync(join(latestDir, "review-artifact.json")) ||
    existsSync(join(latestDir, "review-artifact-missing.txt")) ||
    manifestFilePaths.has("review-artifact.json") ||
    manifestFilePaths.has("review-artifact-missing.txt");
  const approvalEvidenceStateConsistent =
    lifecycleCheckpoints.gapFillApprovalPresent ||
    existsSync(join(latestDir, "gap-fill-approvals-missing.txt")) ||
    manifestFilePaths.has("gap-fill-approvals-missing.txt");

  const consistencyChecks = {
    manifestReferencesAcceptanceSummary: manifest?.acceptanceSummaryPath === "acceptance-summary.json",
    manifestTracksCanonicalContract: manifestFilePaths.has("canonical-gap-fill-contract.json"),
    manifestTracksReviewState: reviewStatePresent,
    approvalEvidenceStateConsistent,
  };

  const finalJudgment =
    classification === "exploratory"
      ? "exploratory"
      : evidenceCompleteness.status === "complete"
        ? "canonical_acceptance_ready"
        : "canonical_incomplete";

  const handoffReasons: string[] = [];
  if (finalJudgment !== "canonical_acceptance_ready") {
    handoffReasons.push(
      finalJudgment === "exploratory"
        ? "The observed prompt or boundary drifted from the frozen Talent Draw contract."
        : "The canonical replay pack is still missing required evidence.",
    );
  }
  if (!consistencyChecks.manifestReferencesAcceptanceSummary) {
    handoffReasons.push("manifest.json does not point to acceptance-summary.json.");
  }
  if (!consistencyChecks.manifestTracksCanonicalContract) {
    handoffReasons.push("manifest.json does not track canonical-gap-fill-contract.json.");
  }
  if (!consistencyChecks.manifestTracksReviewState) {
    handoffReasons.push("The pack does not record either review-artifact.json or review-artifact-missing.txt.");
  }
  if (!consistencyChecks.approvalEvidenceStateConsistent) {
    handoffReasons.push("Gap-fill approval evidence is neither present nor explicitly marked missing.");
  }

  const handoffReadiness = {
    status: handoffReasons.length === 0 ? "ready" : "not_ready",
    reasons: handoffReasons,
  } as const;

  const proofPointGate = {
    status:
      finalJudgment === "canonical_acceptance_ready" && handoffReadiness.status === "ready"
        ? "open"
        : "blocked",
    reason:
      finalJudgment === "canonical_acceptance_ready" && handoffReadiness.status === "ready"
        ? "The canonical replay pack is complete and handoff-safe."
        : "Stay on canonical closure until the replay pack is complete and handoff-safe.",
  } as const;

  return {
    generatedAt: new Date().toISOString(),
    classification,
    promptBoundaryMatch,
    canonical: {
      prompt: canonicalPrompt,
      boundary: canonicalBoundary,
      continuationOrder: [...continuationOrder],
    },
    observed,
    lifecycleCheckpoints,
    missingManualEvidence: [...evidenceCompleteness.missingManualEvidence],
    missingAutoEvidence: [...evidenceCompleteness.missingAutoEvidence],
    consistencyChecks,
    handoffReadiness,
    proofPointGate,
    finalJudgment,
  };
}
