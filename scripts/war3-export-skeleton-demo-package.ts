#!/usr/bin/env tsx

import { createRequire } from "module";
import { resolve } from "path";

import {
  buildWar3CurrentSliceReviewPackage,
  exportWar3ReviewPackage,
  getDefaultWar3ReviewPackageOutputDir,
  validateWar3CurrentSliceReviewPackage,
} from "../adapters/war3/intent/index.js";

const require = createRequire(import.meta.url);
const {
  createWar3SkeletonDemoArtifactInput,
}: {
  createWar3SkeletonDemoArtifactInput?: (hostRoot: string) => unknown;
} = require("../tmp/war3-tstl-skeleton/tools/demo-artifact-bridge.js");

function usage(): never {
  console.error(`Usage: tsx scripts/war3-export-skeleton-demo-package.ts [options]

Options:
  --out-dir <dir>   Output directory (default: tmp/war3-review)
`);
  process.exit(1);
}

function parseArgs(argv: string[]) {
  let outDir = getDefaultWar3ReviewPackageOutputDir();

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--out-dir" && i + 1 < argv.length) {
      outDir = resolve(argv[++i]);
      continue;
    }
    usage();
  }

  return { outDir };
}

async function main(): Promise<void> {
  const { outDir } = parseArgs(process.argv.slice(2));
  const hostRoot = resolve("tmp/war3-tstl-skeleton/maps/demo.w3x");
  if (!createWar3SkeletonDemoArtifactInput) {
    throw new Error(
      "tmp/war3-tstl-skeleton demo artifact bridge did not expose createWar3SkeletonDemoArtifactInput.",
    );
  }

  const artifact = createWar3SkeletonDemoArtifactInput(hostRoot);
  const reviewPackage = buildWar3CurrentSliceReviewPackage(artifact);
  const validation = validateWar3CurrentSliceReviewPackage(reviewPackage);
  const packageDir = exportWar3ReviewPackage(reviewPackage, outDir);

  console.log("War3 skeleton demo review package exported");
  console.log(`Host root: ${hostRoot}`);
  console.log(`Output: ${packageDir}`);
  console.log(`Blueprint: ${reviewPackage.writePreviewArtifact.summary.blueprintId}`);
  console.log(`Target symbol: ${reviewPackage.writePreviewArtifact.summary.targetBindingSymbol}`);
  console.log(`Unresolved bindings: ${reviewPackage.writePreviewArtifact.summary.unresolvedBindingCount}`);
  if (reviewPackage.shadowRealizationPlan) {
    console.log(`Shadow realization units: ${reviewPackage.shadowRealizationPlan.realizationUnits.length}`);
  }
  if (reviewPackage.shadowDraftBundle) {
    console.log(`Shadow draft files: ${Object.keys(reviewPackage.shadowDraftBundle.draftFiles).length}`);
  }
  if (reviewPackage.shadowSiteEvidenceReview) {
    console.log(`Shadow site evidence contracts: ${reviewPackage.shadowSiteEvidenceReview.sites.length}`);
  }
  console.log(`Valid: ${validation.valid ? "yes" : "no"}`);
  console.log(
    `Ready for implementation draft: ${validation.readyForImplementationDraft ? "yes" : "no"}`,
  );
  console.log(`Open bindings: ${validation.openBindingCount}`);
}

main().catch((error) => {
  console.error("Failed to export War3 skeleton demo review package:");
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
