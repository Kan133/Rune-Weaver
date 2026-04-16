import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { dirname, join } from "path";
import {
  computeCanonicalEvidenceCompleteness,
  REQUIRED_AUTO_EVIDENCE,
  REQUIRED_MANUAL_EVIDENCE,
} from "./refresh/completeness.js";
import { buildAcceptanceSummary } from "./refresh/acceptance-summary.js";
import type { Manifest } from "./refresh/types.js";
import {
  TALENT_DRAW_CANONICAL_BOUNDARY,
  TALENT_DRAW_CANONICAL_CONTINUATION_ORDER,
  TALENT_DRAW_CANONICAL_PROMPT,
} from "../../apps/workbench-ui/src/lib/gapFillCanonical.js";

function assert(condition: unknown, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

function createTempLatestDir(): string {
  return mkdtempSync(join(tmpdir(), "rw-evidence-"));
}

function ensureFile(root: string, relativePath: string): void {
  const fullPath = join(root, relativePath);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, "ok", "utf8");
}

function buildManifest(paths: string[], status: Manifest["status"] = "WARN"): Manifest {
  return {
    generatedAt: new Date().toISOString(),
    host: "D:\\RN",
    status,
    acceptanceSummaryPath: "acceptance-summary.json",
    canonicalDemo: {
      classification: "canonical-acceptance",
      prompt: TALENT_DRAW_CANONICAL_PROMPT,
      boundary: TALENT_DRAW_CANONICAL_BOUNDARY,
      continuationOrder: [...TALENT_DRAW_CANONICAL_CONTINUATION_ORDER],
      runtimeVideo: "talent-draw-demo-runtime.mp4",
    },
    evidenceCompleteness: {
      classification: "canonical_acceptance",
      status: status === "PASS" ? "complete" : "incomplete",
      missingManualEvidence: [],
      missingAutoEvidence: [],
      requiredManualEvidence: [],
      requiredAutoEvidence: [],
    },
    exitCodes: {
      demoPrepare: 0,
      doctor: 0,
      validate: 0,
    },
    files: paths.map((path) => ({ path, status: "written" as const })),
  };
}

function testIncompleteWhenManualEvidenceIsMissing(): void {
  const latestDir = createTempLatestDir();
  try {
    for (const relativePath of REQUIRED_AUTO_EVIDENCE) {
      ensureFile(latestDir, relativePath);
    }

    const result = computeCanonicalEvidenceCompleteness(latestDir);
    assert(result.status === "incomplete", "missing manual evidence should keep completeness incomplete");
    assert(result.missingManualEvidence.includes("talent-draw-demo-runtime.mp4"), "runtime video should be reported missing");
    assert(result.missingAutoEvidence.length === 0, "auto evidence should be complete in this scenario");
  } finally {
    rmSync(latestDir, { recursive: true, force: true });
  }
}

function testIncompleteWhenAutoEvidenceIsMissing(): void {
  const latestDir = createTempLatestDir();
  try {
    for (const relativePath of REQUIRED_MANUAL_EVIDENCE) {
      ensureFile(latestDir, relativePath);
    }
    ensureFile(latestDir, "review-artifact-missing.txt");

    const result = computeCanonicalEvidenceCompleteness(latestDir);
    assert(result.status === "incomplete", "missing auto evidence should keep completeness incomplete");
    assert(result.missingAutoEvidence.includes("review-artifact.json"), "missing review artifact should be reported");
  } finally {
    rmSync(latestDir, { recursive: true, force: true });
  }
}

function testCompleteWhenAllEvidenceExists(): void {
  const latestDir = createTempLatestDir();
  try {
    for (const relativePath of REQUIRED_MANUAL_EVIDENCE) {
      ensureFile(latestDir, relativePath);
    }
    for (const relativePath of REQUIRED_AUTO_EVIDENCE) {
      ensureFile(latestDir, relativePath);
    }

    const result = computeCanonicalEvidenceCompleteness(latestDir);
    assert(result.status === "complete", "all evidence should mark completeness complete");
    assert(result.missingManualEvidence.length === 0, "no manual evidence should be missing");
    assert(result.missingAutoEvidence.length === 0, "no auto evidence should be missing");
  } finally {
    rmSync(latestDir, { recursive: true, force: true });
  }
}

function testAcceptanceReadyWhenCanonicalEvidenceIsComplete(): void {
  const latestDir = createTempLatestDir();
  try {
    for (const relativePath of REQUIRED_MANUAL_EVIDENCE) {
      ensureFile(latestDir, relativePath);
    }
    for (const relativePath of REQUIRED_AUTO_EVIDENCE) {
      ensureFile(latestDir, relativePath);
    }

    const completeness = computeCanonicalEvidenceCompleteness(latestDir);
    const summary = buildAcceptanceSummary({
      latestDir,
      canonicalPrompt: TALENT_DRAW_CANONICAL_PROMPT,
      canonicalBoundary: TALENT_DRAW_CANONICAL_BOUNDARY,
      continuationOrder: [...TALENT_DRAW_CANONICAL_CONTINUATION_ORDER],
      evidenceCompleteness: completeness,
      manifest: buildManifest(
        [...REQUIRED_AUTO_EVIDENCE, "review-artifact.json", "canonical-gap-fill-contract.json", "gap-fill-approvals-missing.txt"],
        "PASS",
      ),
    });

    assert(summary.classification === "canonical", "complete canonical evidence should stay canonical");
    assert(summary.finalJudgment === "canonical_acceptance_ready", "complete canonical evidence should be acceptance ready");
    assert(summary.handoffReadiness.status === "ready", "complete canonical evidence should be handoff-ready");
    assert(summary.proofPointGate.status === "open", "complete canonical evidence should open the proof-point gate");
  } finally {
    rmSync(latestDir, { recursive: true, force: true });
  }
}

function testAcceptanceIncompleteWhenManualEvidenceIsMissing(): void {
  const latestDir = createTempLatestDir();
  try {
    for (const relativePath of REQUIRED_AUTO_EVIDENCE) {
      ensureFile(latestDir, relativePath);
    }

    const completeness = computeCanonicalEvidenceCompleteness(latestDir);
    const summary = buildAcceptanceSummary({
      latestDir,
      canonicalPrompt: TALENT_DRAW_CANONICAL_PROMPT,
      canonicalBoundary: TALENT_DRAW_CANONICAL_BOUNDARY,
      continuationOrder: [...TALENT_DRAW_CANONICAL_CONTINUATION_ORDER],
      evidenceCompleteness: completeness,
      manifest: buildManifest(["canonical-gap-fill-contract.json", "review-artifact.json", "gap-fill-approvals-missing.txt"]),
    });

    assert(summary.finalJudgment === "canonical_incomplete", "missing manual evidence should keep canonical runs incomplete");
    assert(!summary.lifecycleCheckpoints.requiredScreenshotsPresent, "missing screenshots should be reflected in lifecycle checkpoints");
    assert(summary.handoffReadiness.status === "not_ready", "incomplete canonical evidence should not be handoff-ready");
    assert(summary.proofPointGate.status === "blocked", "incomplete canonical evidence should keep the proof-point gate blocked");
  } finally {
    rmSync(latestDir, { recursive: true, force: true });
  }
}

function testAcceptanceIncompleteWhenAutoEvidenceIsMissing(): void {
  const latestDir = createTempLatestDir();
  try {
    for (const relativePath of REQUIRED_MANUAL_EVIDENCE) {
      ensureFile(latestDir, relativePath);
    }

    const completeness = computeCanonicalEvidenceCompleteness(latestDir);
    const summary = buildAcceptanceSummary({
      latestDir,
      canonicalPrompt: TALENT_DRAW_CANONICAL_PROMPT,
      canonicalBoundary: TALENT_DRAW_CANONICAL_BOUNDARY,
      continuationOrder: [...TALENT_DRAW_CANONICAL_CONTINUATION_ORDER],
      evidenceCompleteness: completeness,
      manifest: buildManifest(["canonical-gap-fill-contract.json", "gap-fill-approvals-missing.txt"]),
    });

    assert(summary.finalJudgment === "canonical_incomplete", "missing auto evidence should keep canonical runs incomplete");
    assert(summary.missingAutoEvidence.includes("review-artifact.json"), "missing review artifact should be preserved in summary");
    assert(!summary.consistencyChecks.manifestTracksReviewState, "missing review state should fail the consistency pass");
  } finally {
    rmSync(latestDir, { recursive: true, force: true });
  }
}

function testExploratoryEvenWhenFilesExist(): void {
  const latestDir = createTempLatestDir();
  try {
    for (const relativePath of REQUIRED_MANUAL_EVIDENCE) {
      ensureFile(latestDir, relativePath);
    }
    for (const relativePath of REQUIRED_AUTO_EVIDENCE) {
      ensureFile(latestDir, relativePath);
    }

    const completeness = computeCanonicalEvidenceCompleteness(latestDir);
    const summary = buildAcceptanceSummary({
      latestDir,
      canonicalPrompt: TALENT_DRAW_CANONICAL_PROMPT,
      canonicalBoundary: TALENT_DRAW_CANONICAL_BOUNDARY,
      continuationOrder: [...TALENT_DRAW_CANONICAL_CONTINUATION_ORDER],
      evidenceCompleteness: completeness,
      manifest: buildManifest(["canonical-gap-fill-contract.json", "review-artifact.json", "gap-fill-approvals-missing.txt"], "PASS"),
      observedPrompt: "改一下权重池逻辑",
      observedBoundary: "weighted_pool.selection_policy",
    });

    assert(summary.classification === "exploratory", "prompt/boundary drift should force exploratory classification");
    assert(summary.finalJudgment === "exploratory", "exploratory runs should never be marked acceptance ready");
    assert(summary.proofPointGate.status === "blocked", "exploratory runs should keep the proof-point gate blocked");
  } finally {
    rmSync(latestDir, { recursive: true, force: true });
  }
}

function testApprovalEvidenceMustBePresentOrExplicitlyMissing(): void {
  const latestDir = createTempLatestDir();
  try {
    for (const relativePath of REQUIRED_MANUAL_EVIDENCE) {
      ensureFile(latestDir, relativePath);
    }
    for (const relativePath of REQUIRED_AUTO_EVIDENCE) {
      ensureFile(latestDir, relativePath);
    }

    const completeness = computeCanonicalEvidenceCompleteness(latestDir);
    const summary = buildAcceptanceSummary({
      latestDir,
      canonicalPrompt: TALENT_DRAW_CANONICAL_PROMPT,
      canonicalBoundary: TALENT_DRAW_CANONICAL_BOUNDARY,
      continuationOrder: [...TALENT_DRAW_CANONICAL_CONTINUATION_ORDER],
      evidenceCompleteness: completeness,
      manifest: buildManifest(["canonical-gap-fill-contract.json", "review-artifact.json"], "PASS"),
    });

    assert(!summary.consistencyChecks.approvalEvidenceStateConsistent, "approval evidence must be present or explicitly marked missing");
    assert(summary.handoffReadiness.status === "not_ready", "approval evidence inconsistency should block handoff readiness");
  } finally {
    rmSync(latestDir, { recursive: true, force: true });
  }
}

function runTests(): boolean {
  const tests: Array<{ name: string; fn: () => void }> = [
    { name: "incomplete when manual evidence is missing", fn: testIncompleteWhenManualEvidenceIsMissing },
    { name: "incomplete when auto evidence is missing", fn: testIncompleteWhenAutoEvidenceIsMissing },
    { name: "complete when all evidence exists", fn: testCompleteWhenAllEvidenceExists },
    { name: "acceptance ready when canonical evidence is complete", fn: testAcceptanceReadyWhenCanonicalEvidenceIsComplete },
    { name: "acceptance incomplete when manual evidence is missing", fn: testAcceptanceIncompleteWhenManualEvidenceIsMissing },
    { name: "acceptance incomplete when auto evidence is missing", fn: testAcceptanceIncompleteWhenAutoEvidenceIsMissing },
    { name: "exploratory even when files exist", fn: testExploratoryEvenWhenFilesExist },
    { name: "approval evidence must be present or explicitly missing", fn: testApprovalEvidenceMustBePresentOrExplicitlyMissing },
  ];

  let passed = 0;
  let failed = 0;

  console.log("Running evidence completeness tests...\n");

  for (const test of tests) {
    try {
      test.fn();
      console.log(`PASS ${test.name}`);
      passed += 1;
    } catch (error) {
      console.log(`FAIL ${test.name}`);
      console.log(error instanceof Error ? error.message : error);
      failed += 1;
    }
  }

  console.log(`\nResults: ${passed} passed, ${failed} failed`);
  return failed === 0;
}

const success = runTests();
process.exit(success ? 0 : 1);
