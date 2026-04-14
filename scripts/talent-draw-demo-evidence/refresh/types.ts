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
