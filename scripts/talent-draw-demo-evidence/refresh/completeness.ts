import { existsSync } from "fs";
import { join } from "path";

export const REQUIRED_MANUAL_EVIDENCE = [
  "screenshots/01-initial.png",
  "screenshots/02-ui-open.png",
  "screenshots/03-card-detail.png",
  "screenshots/04-after-select.png",
  "screenshots/05-second-draw.png",
  "screenshots/06-gap-fill-review.png",
  "screenshots/07-gap-fill-approval-unit.png",
  "screenshots/08-gap-fill-continuation.png",
  "talent-draw-demo-runtime.mp4",
] as const;

export const REQUIRED_AUTO_EVIDENCE = [
  "canonical-gap-fill-contract.json",
  "review-artifact.json",
  "doctor-output.txt",
  "validate-output.txt",
  "generated-files.json",
] as const;

export interface EvidenceCompletenessResult {
  classification: "canonical_acceptance" | "exploratory";
  status: "complete" | "incomplete";
  missingManualEvidence: string[];
  missingAutoEvidence: string[];
  requiredManualEvidence: string[];
  requiredAutoEvidence: string[];
}

export function computeCanonicalEvidenceCompleteness(latestDir: string): EvidenceCompletenessResult {
  const missingManualEvidence = REQUIRED_MANUAL_EVIDENCE.filter(
    (relativePath) => !existsSync(join(latestDir, relativePath)),
  );

  const missingAutoEvidence = REQUIRED_AUTO_EVIDENCE.filter(
    (relativePath) => !existsSync(join(latestDir, relativePath)),
  );

  if (existsSync(join(latestDir, "review-artifact-missing.txt")) && !existsSync(join(latestDir, "review-artifact.json"))) {
    if (!missingAutoEvidence.includes("review-artifact.json")) {
      missingAutoEvidence.push("review-artifact.json");
    }
  }

  return {
    classification: "canonical_acceptance",
    status: missingManualEvidence.length === 0 && missingAutoEvidence.length === 0 ? "complete" : "incomplete",
    missingManualEvidence,
    missingAutoEvidence,
    requiredManualEvidence: [...REQUIRED_MANUAL_EVIDENCE],
    requiredAutoEvidence: [...REQUIRED_AUTO_EVIDENCE],
  };
}
