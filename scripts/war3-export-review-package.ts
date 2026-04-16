#!/usr/bin/env tsx

import { readFileSync } from "fs";
import { resolve } from "path";

import {
  buildWar3CurrentSliceReviewPackage,
  exportWar3ReviewPackage,
  getDefaultWar3ReviewPackageOutputDir,
} from "../adapters/war3/intent/index.js";

function usage(): never {
  console.error(`Usage: tsx scripts/war3-export-review-package.ts <artifact-json> [options]

Options:
  --out-dir <dir>                  Output directory (default: tmp/war3-review)
  --shop-target-source-id <id>     Override feature.inputs.shopTargetSourceId
  --shop-target-mode <mode>        Override feature.inputs.shopTargetMode
  --shop-unlock-mechanism <mode>   Override feature.inputs.shopUnlockMechanism
  --shop-order-mode <mode>         Override feature.inputs.shopOrderMode
  --shop-order-id <id>             Override feature.inputs.shopOrderId
  --trigger-area-source-id <id>    Override feature.inputs.triggerAreaSourceId
`);
  process.exit(1);
}

function parseArgs(argv: string[]) {
  if (argv.length < 1) {
    usage();
  }

  const artifactPath = resolve(argv[0]);
  let outDir = getDefaultWar3ReviewPackageOutputDir();
  const overrides: Record<string, string> = {};

  for (let i = 1; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--out-dir" && i + 1 < argv.length) {
      outDir = resolve(argv[++i]);
      continue;
    }
    if (arg === "--shop-target-source-id" && i + 1 < argv.length) {
      overrides.shopTargetSourceId = argv[++i];
      continue;
    }
    if (arg === "--shop-target-mode" && i + 1 < argv.length) {
      overrides.shopTargetMode = argv[++i];
      continue;
    }
    if (arg === "--shop-unlock-mechanism" && i + 1 < argv.length) {
      overrides.shopUnlockMechanism = argv[++i];
      continue;
    }
    if (arg === "--shop-order-mode" && i + 1 < argv.length) {
      overrides.shopOrderMode = argv[++i];
      continue;
    }
    if (arg === "--shop-order-id" && i + 1 < argv.length) {
      overrides.shopOrderId = argv[++i];
      continue;
    }
    if (arg === "--trigger-area-source-id" && i + 1 < argv.length) {
      overrides.triggerAreaSourceId = argv[++i];
      continue;
    }
    usage();
  }

  return { artifactPath, outDir, overrides };
}

function applyInputOverrides(artifact: any, overrides: Record<string, string>): any {
  if (!artifact?.feature?.inputs) {
    return artifact;
  }

  return {
    ...artifact,
    feature: {
      ...artifact.feature,
      inputs: {
        ...artifact.feature.inputs,
        ...overrides,
      },
    },
  };
}

async function main(): Promise<void> {
  const { artifactPath, outDir, overrides } = parseArgs(process.argv.slice(2));

  const raw = readFileSync(artifactPath, "utf-8");
  const artifact = applyInputOverrides(JSON.parse(raw), overrides);

  const reviewPackage = buildWar3CurrentSliceReviewPackage(artifact);
  const packageDir = exportWar3ReviewPackage(reviewPackage, outDir);

  console.log("War3 review package exported");
  console.log(`Artifact: ${artifactPath}`);
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
  if (reviewPackage.implementationDraftPlan) {
    console.log(`Implementation draft entries: ${reviewPackage.implementationDraftPlan.entries.length}`);
    console.log(
      `Implementation draft ready: ${reviewPackage.implementationDraftPlan.readiness.readyForImplementationDraft ? "yes" : "no"}`,
    );
  }
}

main().catch((error) => {
  console.error("Failed to export War3 review package:");
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
