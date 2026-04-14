#!/usr/bin/env tsx

import { resolve } from "path";

import { validateWar3WorkspaceShapeAtHostRoot } from "../adapters/war3/intent/index.js";

function usage(): never {
  console.error("Usage: tsx scripts/war3-validate-workspace-shape.ts <host-root>");
  process.exit(1);
}

async function main(): Promise<void> {
  const hostRootArg = process.argv[2];
  if (!hostRootArg) {
    usage();
  }

  const hostRoot = resolve(hostRootArg);
  const result = validateWar3WorkspaceShapeAtHostRoot(hostRoot);

  console.log("War3 workspace shape validation");
  console.log(`Host root: ${hostRoot}`);
  console.log(`Flavor: ${result.flavor}`);
  console.log(`Readiness: ${result.readiness}`);
  if (result.evidencePaths.length > 0) {
    console.log(`Evidence: ${result.evidencePaths.join(", ")}`);
  }
  if (result.notes.length > 0) {
    console.log("Notes:");
    for (const note of result.notes) {
      console.log(`- ${note}`);
    }
  }

  if (result.readiness === "unrecognized") {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error("Failed to validate War3 workspace shape:");
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
