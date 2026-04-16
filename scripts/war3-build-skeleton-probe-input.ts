#!/usr/bin/env tsx

import { resolve } from "path";

import {
  createSkeletonDerivedProbePackageSource,
  loadExportedProbePackageSource,
  writeWar3ProbeInputFile,
} from "./war3-demo-probe-shared.js";

function usage(): never {
  console.error(`Usage: tsx scripts/war3-build-skeleton-probe-input.ts [options]

Options:
  --package-dir <dir>   Consume an existing exported War3 review package
  --out-dir <dir>       Output directory for probe input files (default: tmp/war3-probe-inputs)
`);
  process.exit(1);
}

function parseArgs(argv: string[]) {
  let packageDir: string | undefined;
  let outDir: string | undefined;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--package-dir" && i + 1 < argv.length) {
      packageDir = resolve(argv[++i]);
      continue;
    }
    if (arg === "--out-dir" && i + 1 < argv.length) {
      outDir = resolve(argv[++i]);
      continue;
    }
    usage();
  }

  return { packageDir, outDir };
}

async function main(): Promise<void> {
  const { packageDir, outDir } = parseArgs(process.argv.slice(2));
  const source = packageDir
    ? loadExportedProbePackageSource(packageDir)
    : createSkeletonDerivedProbePackageSource();
  const inputFile = writeWar3ProbeInputFile({ source, outDir });

  console.log("War3 skeleton probe input built");
  console.log(`Source kind: ${source.sourceKind}`);
  if (source.packageDir) {
    console.log(`Review package: ${source.packageDir}`);
  }
  console.log(`Feature: setup-mid-zone-shop`);
  console.log(`Workspace flavor: ${source.validation.workspaceValidation.flavor}`);
  console.log(`Open bindings: ${source.validation.openBindingCount}`);
  console.log(`Output: ${inputFile}`);
}

main().catch((error) => {
  console.error("Failed to build War3 skeleton probe input:");
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
