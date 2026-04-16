#!/usr/bin/env tsx

import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

import { exportWar3ReviewPackage } from "../adapters/war3/intent/index.js";
import {
  createSkeletonDerivedProbePackageSource,
  loadExportedProbePackageSource,
  writeWar3ProbeEvidenceLedger,
  writeWar3ProbeInputFile,
  writeWar3ProbeReviewSummary,
} from "./war3-demo-probe-shared.js";

function usage(): never {
  console.error(`Usage: tsx scripts/war3-run-skeleton-demo-probe.ts [options]

Options:
  --review-out-dir <dir>    Review package output directory (default: tmp/war3-review)
  --input-out-dir <dir>     Probe input output directory (default: tmp/war3-probe-inputs)
  --probe-out-dir <dir>     Probe runner output directory (default: tmp/kimi-war3)
  --summary-out-dir <dir>   Probe summary output directory (default: tmp/war3-probe-summaries)
  --label <string>          Probe runner label prefix (default: skeleton-demo-probe)
  --max-steps-per-turn <n>  Max steps per turn for kimi (default: 3)
`);
  process.exit(1);
}

function parseArgs(argv: string[]) {
  let reviewOutDir = resolve("tmp/war3-review");
  let inputOutDir = resolve("tmp/war3-probe-inputs");
  let probeOutDir = resolve("tmp/kimi-war3");
  let summaryOutDir = resolve("tmp/war3-probe-summaries");
  let label = "skeleton-demo-probe";
  let maxStepsPerTurn = 3;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--review-out-dir" && i + 1 < argv.length) {
      reviewOutDir = resolve(argv[++i]);
      continue;
    }
    if (arg === "--input-out-dir" && i + 1 < argv.length) {
      inputOutDir = resolve(argv[++i]);
      continue;
    }
    if (arg === "--probe-out-dir" && i + 1 < argv.length) {
      probeOutDir = resolve(argv[++i]);
      continue;
    }
    if (arg === "--summary-out-dir" && i + 1 < argv.length) {
      summaryOutDir = resolve(argv[++i]);
      continue;
    }
    if (arg === "--label" && i + 1 < argv.length) {
      label = argv[++i];
      continue;
    }
    if (arg === "--max-steps-per-turn" && i + 1 < argv.length) {
      maxStepsPerTurn = Number.parseInt(argv[++i], 10);
      if (Number.isNaN(maxStepsPerTurn) || maxStepsPerTurn < 1) {
        usage();
      }
      continue;
    }
    usage();
  }

  return {
    reviewOutDir,
    inputOutDir,
    probeOutDir,
    summaryOutDir,
    label,
    maxStepsPerTurn,
  };
}

function resolveTsxInvocation(): { command: string; argsPrefix: string[] } {
  const cliModule = resolve("node_modules/tsx/dist/cli.mjs");
  if (!existsSync(cliModule)) {
    throw new Error("Could not find node_modules/tsx/dist/cli.mjs.");
  }

  return {
    command: process.execPath,
    argsPrefix: [cliModule],
  };
}

function runCommand(command: string, args: string[]): Promise<{
  exitCode: number | null;
  stdout: string;
  stderr: string;
}> {
  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(command, args, {
      stdio: ["ignore", "pipe", "pipe"],
      shell: false,
    });
    const stdoutChunks: Buffer[] = [];
    const stderrChunks: Buffer[] = [];

    child.stdout.on("data", (chunk) => stdoutChunks.push(chunk));
    child.stderr.on("data", (chunk) => stderrChunks.push(chunk));
    child.on("error", (error) => rejectPromise(error));
    child.on("close", (code) => {
      const stdout = Buffer.concat(stdoutChunks).toString("utf-8");
      const stderr = Buffer.concat(stderrChunks).toString("utf-8");
      resolvePromise({
        exitCode: code ?? null,
        stdout,
        stderr,
      });
    });
  });
}

function extractSummaryPath(outputText: string): string {
  const match = outputText.match(/^Summary file:\s+(.+)$/m);
  if (!match) {
    throw new Error("war3-probe-runner.ts did not report a summary file path.");
  }
  return resolve(match[1].trim());
}

async function main(): Promise<void> {
  const {
    reviewOutDir,
    inputOutDir,
    probeOutDir,
    summaryOutDir,
    label,
    maxStepsPerTurn,
  } = parseArgs(process.argv.slice(2));

  const skeletonSource = createSkeletonDerivedProbePackageSource();
  const reviewPackageDir = exportWar3ReviewPackage(skeletonSource.reviewPackage, reviewOutDir);
  const source = loadExportedProbePackageSource(reviewPackageDir);

  if (!source.validation.valid) {
    throw new Error("Skeleton-derived War3 review package did not validate.");
  }

  const inputFile = writeWar3ProbeInputFile({
    source,
    outDir: inputOutDir,
  });

  const tsxInvocation = resolveTsxInvocation();
  const probeRunnerResult = await runCommand(tsxInvocation.command, [
    ...tsxInvocation.argsPrefix,
    resolve("scripts/war3-probe-runner.ts"),
    inputFile,
    "--out-dir",
    probeOutDir,
    "--label",
    label,
    "--max-steps-per-turn",
    String(maxStepsPerTurn),
  ]);
  const probeSummaryPath = extractSummaryPath(
    [probeRunnerResult.stdout, probeRunnerResult.stderr].filter(Boolean).join("\n"),
  );
  const reviewSummaryPath = writeWar3ProbeReviewSummary({
    summaryPath: probeSummaryPath,
    outDir: summaryOutDir,
  });
  const evidenceLedgerPath = writeWar3ProbeEvidenceLedger({
    reviewSummaryPath,
    outDir: summaryOutDir,
  });

  if (probeRunnerResult.exitCode !== 0) {
    console.log("War3 skeleton demo probe recorded a blocked result");
    console.log(`Probe runner exit code: ${probeRunnerResult.exitCode}`);
    console.log(`Review package: ${reviewPackageDir}`);
    console.log(`Probe input: ${inputFile}`);
    console.log(`Probe summary: ${probeSummaryPath}`);
    console.log(`Review summary: ${reviewSummaryPath}`);
    console.log(`Evidence ledger: ${evidenceLedgerPath}`);
    process.exitCode = 1;
    return;
  }

  console.log("War3 skeleton demo probe completed");
  console.log(`Review package: ${reviewPackageDir}`);
  console.log(`Probe input: ${inputFile}`);
  console.log(`Probe summary: ${probeSummaryPath}`);
  console.log(`Review summary: ${reviewSummaryPath}`);
  console.log(`Evidence ledger: ${evidenceLedgerPath}`);
}

main().catch((error) => {
  console.error("Failed to run War3 skeleton demo probe:");
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
