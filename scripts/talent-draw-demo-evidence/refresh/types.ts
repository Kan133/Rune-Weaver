export interface CLIOptions {
  host: string;
  verbose: boolean;
}

export interface GeneratedFilesData {
  featureId: string;
  revision: number | string;
  selectedPatterns: string[];
  generatedFiles: string[];
  entryBindings: Array<Record<string, unknown>>;
}

export interface ManifestFileEntry {
  path: string;
  status: "written" | "missing" | "copied" | "error";
  sizeBytes?: number;
}

export interface Manifest {
  generatedAt: string;
  host: string;
  status: "PASS" | "WARN" | "FAIL";
  acceptanceSummaryPath?: string;
  canonicalDemo: {
    classification: "canonical-acceptance";
    prompt: string;
    boundary: string;
    continuationOrder: string[];
    runtimeVideo: string;
  };
  evidenceCompleteness: {
    classification: "canonical_acceptance" | "exploratory";
    status: "complete" | "incomplete";
    missingManualEvidence: string[];
    missingAutoEvidence: string[];
    requiredManualEvidence: string[];
    requiredAutoEvidence: string[];
  };
  exitCodes: {
    demoPrepare: number;
    doctor: number;
    validate: number;
  };
  files: ManifestFileEntry[];
}

export interface AcceptanceSummary {
  generatedAt: string;
  classification: "canonical" | "exploratory";
  promptBoundaryMatch: boolean;
  canonical: {
    prompt: string;
    boundary: string;
    continuationOrder: string[];
  };
  observed: {
    prompt: string;
    boundary: string;
    source: "canonical_contract" | "gap_fill_approval";
  };
  lifecycleCheckpoints: {
    canonicalContractPresent: boolean;
    manifestPresent: boolean;
    reviewArtifactPresent: boolean;
    doctorOutputPresent: boolean;
    validateOutputPresent: boolean;
    generatedFilesPresent: boolean;
    gapFillApprovalPresent: boolean;
    requiredScreenshotsPresent: boolean;
    runtimeVideoPresent: boolean;
  };
  missingManualEvidence: string[];
  missingAutoEvidence: string[];
  consistencyChecks: {
    manifestReferencesAcceptanceSummary: boolean;
    manifestTracksCanonicalContract: boolean;
    manifestTracksReviewState: boolean;
    approvalEvidenceStateConsistent: boolean;
  };
  handoffReadiness: {
    status: "ready" | "not_ready";
    reasons: string[];
  };
  proofPointGate: {
    status: "open" | "blocked";
    reason: string;
  };
  finalJudgment:
    | "canonical_acceptance_ready"
    | "canonical_incomplete"
    | "exploratory";
}
