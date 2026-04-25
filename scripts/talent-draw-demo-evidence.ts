#!/usr/bin/env tsx

import { talentDrawCaseSpec } from "../adapters/dota2/cases/selection-demo-registry.js";
import { runSelectionCaseEvidenceCli } from "./selection-case-demo-evidence/runner.js";

runSelectionCaseEvidenceCli(talentDrawCaseSpec).catch((error: Error & { exitCode?: number }) => {
  console.error("Fatal error:", error.message);
  process.exit(error.exitCode || 1);
});
