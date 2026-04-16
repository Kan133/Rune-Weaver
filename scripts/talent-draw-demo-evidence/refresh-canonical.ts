#!/usr/bin/env tsx
/**
 * Canonical Evidence Pack Auto-Refresh
 *
 * Refreshes docs/talent-draw-case/demo-evidence/latest/ from the current host
 * without manually copying outputs.
 *
 * Usage:
 *   npm run demo:talent-draw:refresh -- --host D:\testB
 */

import { existsSync, rmSync } from "fs";
import { mkdir, writeFile, copyFile } from "fs/promises";
import { basename, join } from "path";
import {
  TALENT_DRAW_CANONICAL_BOUNDARY,
  TALENT_DRAW_CANONICAL_CONTINUATION_ORDER,
  TALENT_DRAW_CANONICAL_PROMPT,
} from "../../apps/workbench-ui/src/lib/gapFillCanonical.js";
import {
  LATEST_DIR,
  DEMO_PREPARE_OUTPUT_FILE,
  GAP_FILL_APPROVALS_DIR,
  parseArgs,
  log,
  logError,
  runCommand,
  readWorkspaceFile,
  findLatestReviewArtifact,
  findGapFillApprovalArtifacts,
  extractVConsoleCheckpoints,
  writeScreenshotsReadme,
  createMissingReviewInstructions,
  computeCanonicalEvidenceCompleteness,
  buildAcceptanceSummary,
  writeManifest,
  type ManifestFileEntry,
  type Manifest,
} from "./refresh-helpers.js";

async function main(): Promise<void> {
  const options = parseArgs();

  if (!options.host) {
    logError("--host is required");
    process.exit(1);
  }

  const hostPath = options.host;
  if (!existsSync(hostPath)) {
    logError(`Host path does not exist: ${hostPath}`);
    process.exit(1);
  }

  log("=".repeat(60));
  log("Canonical Evidence Pack Auto-Refresh");
  log("=".repeat(60));
  log("");
  log(`Host: ${hostPath}`);
  log(`Output: ${LATEST_DIR}`);
  log("");

  await mkdir(LATEST_DIR, { recursive: true });

  const manifestFiles: ManifestFileEntry[] = [];
  let demoPrepareExitCode = 0;
  let doctorExitCode = 0;
  let validateExitCode = 0;
  let hasCriticalError = false;

  // 1. Run demo prepare command and capture its runbook output.
  const demoPrepareResult = await runCommand(
    ["npm", "run", "cli", "--", "dota2", "demo", "prepare", "--host", hostPath, "--addon-name", "talent_draw_demo", "--map", "temp"],
    "Dota2 Demo Prepare",
    options,
  );
  demoPrepareExitCode = demoPrepareResult.exitCode;

  const demoPrepareOutputPath = join(LATEST_DIR, DEMO_PREPARE_OUTPUT_FILE);
  await writeFile(demoPrepareOutputPath, demoPrepareResult.output, "utf-8");
  manifestFiles.push({
    path: DEMO_PREPARE_OUTPUT_FILE,
    status: demoPrepareExitCode === 0 ? "written" : "error",
    sizeBytes: Buffer.byteLength(demoPrepareResult.output, "utf-8"),
  });
  log(`  Written: ${DEMO_PREPARE_OUTPUT_FILE} (exit code: ${demoPrepareExitCode})`);

  // 2. Run doctor command.
  const doctorResult = await runCommand(
    ["npm", "run", "cli", "--", "dota2", "doctor", "--host", hostPath],
    "Dota2 Doctor",
    options,
  );
  doctorExitCode = doctorResult.exitCode;

  const doctorOutputPath = join(LATEST_DIR, "doctor-output.txt");
  await writeFile(doctorOutputPath, doctorResult.output, "utf-8");
  manifestFiles.push({
    path: "doctor-output.txt",
    status: doctorExitCode === 0 ? "written" : "error",
    sizeBytes: Buffer.byteLength(doctorResult.output, "utf-8"),
  });
  log(`  Written: doctor-output.txt (exit code: ${doctorExitCode})`);

  // 3. Run validate command.
  const validateResult = await runCommand(
    ["npm", "run", "cli", "--", "dota2", "validate", "--host", hostPath],
    "Dota2 Validate",
    options,
  );
  validateExitCode = validateResult.exitCode;

  const validateOutputPath = join(LATEST_DIR, "validate-output.txt");
  await writeFile(validateOutputPath, validateResult.output, "utf-8");
  manifestFiles.push({
    path: "validate-output.txt",
    status: validateExitCode === 0 ? "written" : "error",
    sizeBytes: Buffer.byteLength(validateResult.output, "utf-8"),
  });
  log(`  Written: validate-output.txt (exit code: ${validateExitCode})`);

  // 4. Read workspace and write generated-files.json.
  log("");
  log("Reading workspace file...");
  const workspaceData = await readWorkspaceFile(hostPath);

  if (workspaceData) {
    const generatedFilesPath = join(LATEST_DIR, "generated-files.json");
    const generatedFilesJson = JSON.stringify(workspaceData, null, 2);
    await writeFile(generatedFilesPath, generatedFilesJson, "utf-8");
    manifestFiles.push({
      path: "generated-files.json",
      status: "written",
      sizeBytes: Buffer.byteLength(generatedFilesJson, "utf-8"),
    });
    log("  Written: generated-files.json");
    log(`    Feature: ${workspaceData.featureId}`);
    log(`    Revision: ${workspaceData.revision}`);
    log(`    Generated files: ${workspaceData.generatedFiles.length}`);
  } else {
    logError("  Could not read workspace file or find talent_draw_demo feature");
    hasCriticalError = true;
  }

  // 5. Find and copy review artifact.
  log("");
  log("Finding review artifact...");
  const reviewArtifactPath = await findLatestReviewArtifact(hostPath);

  if (reviewArtifactPath) {
    const destPath = join(LATEST_DIR, "review-artifact.json");
    await removeIfExists(join(LATEST_DIR, "review-artifact-missing.txt"));
    await copyFile(reviewArtifactPath, destPath);
    manifestFiles.push({
      path: "review-artifact.json",
      status: "copied",
    });
    log("  Copied: review-artifact.json");
    log(`    Source: ${basename(reviewArtifactPath)}`);
  } else {
    const missingInstructions = await createMissingReviewInstructions(hostPath);
    const missingPath = join(LATEST_DIR, "review-artifact-missing.txt");
    await removeIfExists(join(LATEST_DIR, "review-artifact.json"));
    await writeFile(missingPath, missingInstructions, "utf-8");
    manifestFiles.push({
      path: "review-artifact-missing.txt",
      status: "missing",
      sizeBytes: Buffer.byteLength(missingInstructions, "utf-8"),
    });
    log("  Written: review-artifact-missing.txt");
    log("    (Run demo:talent-draw with --write --force to generate)");
  }

  // 6. Copy gap-fill approval records, if any participated in this demo.
  log("");
  log("Finding gap-fill approval records...");
  const approvalArtifactPaths = await findGapFillApprovalArtifacts(hostPath);
  if (approvalArtifactPaths.length > 0) {
    const approvalsDir = join(LATEST_DIR, GAP_FILL_APPROVALS_DIR);
    await mkdir(approvalsDir, { recursive: true });
    for (const approvalPath of approvalArtifactPaths.slice(0, 5)) {
      const destName = basename(approvalPath);
      const destPath = join(approvalsDir, destName);
      await copyFile(approvalPath, destPath);
      manifestFiles.push({
        path: `${GAP_FILL_APPROVALS_DIR}/${destName}`,
        status: "copied",
      });
      log(`  Copied: ${GAP_FILL_APPROVALS_DIR}/${destName}`);
    }
  } else {
    const missingPath = join(LATEST_DIR, "gap-fill-approvals-missing.txt");
    const missingText = [
      "No gap-fill approval records were found for this host.",
      "",
      "This is expected if the canonical demo did not use a require_confirmation gap-fill patch.",
      "If gap-fill participated, run the gap-fill command and approve the patch before refreshing evidence.",
    ].join("\n");
    await writeFile(missingPath, missingText, "utf-8");
    manifestFiles.push({
      path: "gap-fill-approvals-missing.txt",
      status: "missing",
      sizeBytes: Buffer.byteLength(missingText, "utf-8"),
    });
    log("  Written: gap-fill-approvals-missing.txt");
  }

  // 7. Write vconsole-template.txt.
  log("");
  log("Creating VConsole template...");
  const vconsoleContent = await extractVConsoleCheckpoints();
  const vconsolePath = join(LATEST_DIR, "vconsole-template.txt");
  await writeFile(vconsolePath, vconsoleContent, "utf-8");
  manifestFiles.push({
    path: "vconsole-template.txt",
    status: "written",
    sizeBytes: Buffer.byteLength(vconsoleContent, "utf-8"),
  });
  log("  Written: vconsole-template.txt");

  // 8. Create screenshots directory with README.
  log("");
  log("Creating screenshots directory...");
  await writeScreenshotsReadme();
  manifestFiles.push({
    path: "screenshots/README.md",
    status: "written",
  });
  log("  Created: screenshots/README.md");

  // 9. Write manifest.json.
  log("");
  log("Writing manifest...");

  const canonicalContractPath = join(LATEST_DIR, "canonical-gap-fill-contract.json");
  const canonicalContract = {
    classification: "canonical-acceptance",
    prompt: TALENT_DRAW_CANONICAL_PROMPT,
    boundary: TALENT_DRAW_CANONICAL_BOUNDARY,
    continuationOrder: [...TALENT_DRAW_CANONICAL_CONTINUATION_ORDER],
    requiredWorkbenchScreenshots: [
      "06-gap-fill-review.png",
      "07-gap-fill-approval-unit.png",
      "08-gap-fill-continuation.png",
    ],
    requiredRuntimeScreenshots: [
      "01-initial.png",
      "02-ui-open.png",
      "03-card-detail.png",
      "04-after-select.png",
      "05-second-draw.png",
    ],
    runtimeVideo: "talent-draw-demo-runtime.mp4",
  };
  const canonicalContractJson = JSON.stringify(canonicalContract, null, 2);
  await writeFile(canonicalContractPath, canonicalContractJson, "utf-8");
  manifestFiles.push({
    path: "canonical-gap-fill-contract.json",
    status: "written",
    sizeBytes: Buffer.byteLength(canonicalContractJson, "utf-8"),
  });
  log("  Written: canonical-gap-fill-contract.json");

  const evidenceCompleteness = computeCanonicalEvidenceCompleteness(LATEST_DIR);

  let status: "PASS" | "WARN" | "FAIL" = "PASS";
  if (hasCriticalError) {
    status = "FAIL";
  } else if (
    demoPrepareExitCode !== 0 ||
    doctorExitCode !== 0 ||
    validateExitCode !== 0 ||
    !reviewArtifactPath ||
    evidenceCompleteness.status !== "complete"
  ) {
    status = "WARN";
  }

  const manifest: Manifest = {
    generatedAt: new Date().toISOString(),
    host: hostPath,
    status,
    acceptanceSummaryPath: "acceptance-summary.json",
    canonicalDemo: {
      classification: "canonical-acceptance",
      prompt: TALENT_DRAW_CANONICAL_PROMPT,
      boundary: TALENT_DRAW_CANONICAL_BOUNDARY,
      continuationOrder: [...TALENT_DRAW_CANONICAL_CONTINUATION_ORDER],
      runtimeVideo: "talent-draw-demo-runtime.mp4",
    },
    evidenceCompleteness,
    exitCodes: {
      demoPrepare: demoPrepareExitCode,
      doctor: doctorExitCode,
      validate: validateExitCode,
    },
    files: manifestFiles,
  };

  await writeManifest(manifest);
  log("  Written: manifest.json");

  const acceptanceSummary = buildAcceptanceSummary({
    latestDir: LATEST_DIR,
    canonicalPrompt: TALENT_DRAW_CANONICAL_PROMPT,
    canonicalBoundary: TALENT_DRAW_CANONICAL_BOUNDARY,
    continuationOrder: [...TALENT_DRAW_CANONICAL_CONTINUATION_ORDER],
    evidenceCompleteness,
    manifest,
  });
  const acceptanceSummaryJson = JSON.stringify(acceptanceSummary, null, 2);
  const acceptanceSummaryPath = join(LATEST_DIR, "acceptance-summary.json");
  await writeFile(acceptanceSummaryPath, acceptanceSummaryJson, "utf-8");
  manifestFiles.push({
    path: "acceptance-summary.json",
    status: "written",
    sizeBytes: Buffer.byteLength(acceptanceSummaryJson, "utf-8"),
  });
  await writeManifest({
    ...manifest,
    files: manifestFiles,
  });
  log("  Written: acceptance-summary.json");
  log("  Updated: manifest.json");

  log("");
  log("=".repeat(60));
  log("Summary");
  log("=".repeat(60));
  log(`Demo Prepare: exit code ${demoPrepareExitCode}`);
  log(`Doctor: exit code ${doctorExitCode}`);
  log(`Validate: exit code ${validateExitCode}`);
  log(`Files written: ${manifestFiles.length}`);
  log(`Output directory: ${LATEST_DIR}`);
  log(`Canonical evidence completeness: ${evidenceCompleteness.status}`);
  log(`Acceptance judgment: ${acceptanceSummary.finalJudgment}`);
  log(`Handoff readiness: ${acceptanceSummary.handoffReadiness.status}`);
  log(`Proof-point gate: ${acceptanceSummary.proofPointGate.status}`);
  log(
    `Missing manual evidence: ${
      evidenceCompleteness.missingManualEvidence.length > 0
        ? evidenceCompleteness.missingManualEvidence.join(", ")
        : "(none)"
    }`,
  );
  log(
    `Missing auto evidence: ${
      evidenceCompleteness.missingAutoEvidence.length > 0
        ? evidenceCompleteness.missingAutoEvidence.join(", ")
        : "(none)"
    }`,
  );
  log("");

  if (demoPrepareExitCode !== 0 || doctorExitCode !== 0 || validateExitCode !== 0 || hasCriticalError) {
    log("FAILED: One or more critical checks failed.");
    process.exit(1);
  }

  log("SUCCESS: Evidence pack refreshed.");
  process.exit(0);
}

async function removeIfExists(path: string): Promise<void> {
  if (existsSync(path)) {
    rmSync(path, { force: true });
  }
}

main().catch((error) => {
  logError(`Fatal error: ${error}`);
  process.exit(1);
});
