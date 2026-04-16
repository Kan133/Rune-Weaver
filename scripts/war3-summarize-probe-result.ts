#!/usr/bin/env tsx

import { resolve } from "path";

import {
  buildWar3ProbeReviewSummary,
  writeWar3ProbeEvidenceLedger,
  writeWar3ProbeReviewSummary,
} from "./war3-demo-probe-shared.js";

function usage(): never {
  console.error(`Usage: tsx scripts/war3-summarize-probe-result.ts <probe-summary-json> [options]

Options:
  --out-dir <dir>   Output directory for review summaries (default: tmp/war3-probe-summaries)
`);
  process.exit(1);
}

function parseArgs(argv: string[]) {
  if (argv.length < 1) {
    usage();
  }

  const summaryPath = resolve(argv[0]);
  let outDir: string | undefined;

  for (let i = 1; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--out-dir" && i + 1 < argv.length) {
      outDir = resolve(argv[++i]);
      continue;
    }
    usage();
  }

  return { summaryPath, outDir };
}

async function main(): Promise<void> {
  const { summaryPath, outDir } = parseArgs(process.argv.slice(2));
  const reviewSummary = buildWar3ProbeReviewSummary(summaryPath);
  const reviewSummaryPath = writeWar3ProbeReviewSummary({ summaryPath, outDir });
  const ledgerPath = writeWar3ProbeEvidenceLedger({ reviewSummaryPath, outDir });

  console.log("War3 probe result summarized");
  console.log(`Probe status: ${reviewSummary.probeStatus}`);
  console.log(`Blocked by external probe: ${reviewSummary.blockedByExternalProbe ? "yes" : "no"}`);
  console.log(`Usable planning evidence: ${reviewSummary.usablePlanningEvidence ? "yes" : "no"}`);
  console.log(`Disposition: ${reviewSummary.disposition}`);
  console.log(`Respects no runnable code: ${reviewSummary.respectsNoRunnableCode ? "yes" : "no"}`);
  console.log(`Next move: ${reviewSummary.nextMoveRecommendation}`);
  console.log(`Review summary: ${reviewSummaryPath}`);
  console.log(`Evidence ledger: ${ledgerPath}`);
}

main().catch((error) => {
  console.error("Failed to summarize War3 probe result:");
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
