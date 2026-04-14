#!/usr/bin/env tsx

import { resolve } from "path";

import {
  readWar3ReviewPackageFromDir,
  validateWar3CurrentSliceReviewPackage,
} from "../adapters/war3/intent/index.js";

function usage(): never {
  console.error("Usage: tsx scripts/war3-validate-review-package.ts <review-package-dir>");
  process.exit(1);
}

async function main(): Promise<void> {
  const packageDirArg = process.argv[2];
  if (!packageDirArg) {
    usage();
  }

  const packageDir = resolve(packageDirArg);
  const reviewPackage = readWar3ReviewPackageFromDir(packageDir);
  const validation = validateWar3CurrentSliceReviewPackage(reviewPackage);

  console.log("War3 review package validation");
  console.log(`Package: ${packageDir}`);
  console.log(`Valid: ${validation.valid ? "yes" : "no"}`);
  console.log(`Ready for implementation draft: ${validation.readyForImplementationDraft ? "yes" : "no"}`);
  console.log(`Open bindings: ${validation.openBindingCount}`);
  console.log(`Workspace flavor: ${validation.workspaceValidation.flavor}`);
  console.log(`Workspace readiness: ${validation.workspaceValidation.readiness}`);
  if (validation.workspaceValidation.evidencePaths.length > 0) {
    console.log(`Workspace evidence: ${validation.workspaceValidation.evidencePaths.join(", ")}`);
  }
  console.log(`Host target validation: ${validation.hostTargetValidation.status}`);
  if (validation.hostTargetValidation.checkedPaths.length > 0) {
    console.log(
      `Host target paths: ${validation.hostTargetValidation.checkedPaths
        .map((entry) => `${entry.purpose}=${entry.path}${entry.exists ? "" : " (missing)"}`)
        .join(", ")}`,
    );
  }
  console.log(`TSTL draft validation: ${validation.tstlDraftValidation.status}`);
  if (validation.tstlDraftValidation.checkedArtifacts.length > 0) {
    console.log(
      `TSTL draft artifacts: ${validation.tstlDraftValidation.checkedArtifacts
        .map((entry) => `${entry.artifact}=${entry.pathHint} [${entry.status}]`)
        .join(", ")}`,
    );
  }
  if (reviewPackage.implementationDraftPlan) {
    console.log(
      `Implementation draft plan: ${reviewPackage.implementationDraftPlan.entries.length} entries, ready=${reviewPackage.implementationDraftPlan.readiness.readyForImplementationDraft ? "yes" : "no"}`,
    );
    console.log(
      `Implementation draft evidence level: ${reviewPackage.implementationDraftPlan.evidenceLevel}`,
    );
  }
  console.log(`Runtime hook evidence: ${validation.runtimeHookValidation.status}`);
  console.log(`Runtime hook script entry: ${validation.runtimeHookValidation.scriptEntry || "(none)"}`);
  if (validation.runtimeHookValidation.candidateAnchors.length > 0) {
    console.log(`Runtime hook anchors: ${validation.runtimeHookValidation.candidateAnchors.join(", ")}`);
  }
  console.log(`Shop target evidence: ${validation.shopTargetValidation.status}`);
  console.log(`Shop target symbol: ${validation.shopTargetValidation.bindingSymbol}`);
  console.log(`Shop target declaration site: ${validation.shopTargetValidation.declarationSitePathHint}`);
  if (validation.shopTargetValidation.evidenceFiles.length > 0) {
    console.log(`Shop target evidence files: ${validation.shopTargetValidation.evidenceFiles.join(", ")}`);
  }
  console.log(`Trigger area evidence: ${validation.triggerAreaValidation.status}`);
  console.log(`Trigger area source: ${validation.triggerAreaValidation.sourceAnchorSemanticName}`);
  console.log(`Trigger area realization site: ${validation.triggerAreaValidation.realizationSitePathHint}`);
  if (validation.triggerAreaValidation.evidenceFiles.length > 0) {
    console.log(`Trigger area evidence files: ${validation.triggerAreaValidation.evidenceFiles.join(", ")}`);
  }

  if (validation.issues.length === 0) {
    console.log("Issues: none");
    return;
  }

  console.log("Issues:");
  for (const issue of validation.issues) {
    console.log(`- [${issue.severity}] ${issue.code}: ${issue.message}`);
  }

  if (!validation.valid) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error("Failed to validate War3 review package:");
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
