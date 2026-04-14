#!/usr/bin/env node
// war3-probe-runner.ts
// Probe-only utility: pipe a prompt file to kimi CLI and record outputs.
// No deps beyond Node stdlib.

import { spawn } from "node:child_process";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname, basename, join } from "node:path";

function usage(): never {
  console.error(`Usage: tsx scripts/war3-probe-runner.ts <input-file> [options]

Options:
  --out-dir <dir>           Output directory (default: tmp/kimi-war3)
  --label <string>          Label prefix for output files (default: probe)
  --max-steps-per-turn <n>  Max steps per turn (default: 3)
`);
  process.exit(1);
}

function parseArgs(argv: string[]) {
  if (argv.length < 1) usage();
  const inputFile = resolve(argv[0]);
  let outDir = resolve("tmp/kimi-war3");
  let label = "probe";
  let maxStepsPerTurn = 3;
  for (let i = 1; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--out-dir" && i + 1 < argv.length) {
      outDir = resolve(argv[++i]);
    } else if (arg === "--label" && i + 1 < argv.length) {
      label = argv[++i];
    } else if (arg === "--max-steps-per-turn" && i + 1 < argv.length) {
      maxStepsPerTurn = parseInt(argv[++i], 10);
      if (Number.isNaN(maxStepsPerTurn) || maxStepsPerTurn < 1) usage();
    } else {
      usage();
    }
  }
  return { inputFile, outDir, label, maxStepsPerTurn };
}

function nowIso() {
  return new Date().toISOString();
}

function sanitizeLabel(label: string) {
  return label.replace(/[^a-zA-Z0-9_-]/g, "_");
}

const TOOL_FAILURE_PATTERNS = [
  /Max number of steps reached/i,
  /login\s*(required|error)/i,
  /authentication\s*(required|error|failed)/i,
  /unauthorized/i,
  /rate\s*limit/i,
  /connection\s*(error|refused|reset|timed out)/i,
  /spawn\s*error/i,
  /command\s*not\s*found/i,
  /'kimi'\s+is\s+not\s+recognized/i,
];

function looksLikeToolFailure(exitCode: number | null, stderr: string, stdout: string): boolean {
  if (exitCode !== 0) return true;
  const combined = stderr + "\n" + stdout;
  return TOOL_FAILURE_PATTERNS.some((p) => p.test(combined));
}

function isBlank(text: string): boolean {
  return text.trim().length === 0;
}

function classify(exitCode: number | null, stderr: string, stdout: string, final: string): "tool-execution-failure" | "model-output-success" | "unusable-output" {
  if (looksLikeToolFailure(exitCode, stderr, stdout)) return "tool-execution-failure";
  if (isBlank(final)) return "unusable-output";
  return "model-output-success";
}

async function main() {
  const { inputFile, outDir, label, maxStepsPerTurn } = parseArgs(process.argv.slice(2));

  mkdirSync(outDir, { recursive: true });
  const safeLabel = sanitizeLabel(label);
  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  const base = join(outDir, `${safeLabel}-${ts}`);

  const promptText = readFileSync(inputFile, "utf-8");

  const args = [
    "--no-thinking",
    "--print",
    "--input-format", "text",
    "--final-message-only",
    "--max-steps-per-turn", String(maxStepsPerTurn),
  ];

  const startedAt = nowIso();
  let exitCode: number | null = null;
  let spawnError: string | null = null;
  const stdoutChunks: Buffer[] = [];
  const stderrChunks: Buffer[] = [];

  await new Promise<void>((resolvePromise, rejectPromise) => {
    const child = spawn("kimi", args, { stdio: ["pipe", "pipe", "pipe"] });

    child.stdin.write(promptText, "utf-8", (err) => {
      if (err) {
        spawnError = err.message;
        child.kill();
        return;
      }
      child.stdin.end();
    });

    child.stdout.on("data", (chunk) => stdoutChunks.push(chunk));
    child.stderr.on("data", (chunk) => stderrChunks.push(chunk));

    child.on("error", (err) => {
      spawnError = err.message;
    });

    child.on("close", (code) => {
      exitCode = code ?? null;
      resolvePromise();
    });
  });

  const stdout = Buffer.concat(stdoutChunks).toString("utf-8");
  const stderr = Buffer.concat(stderrChunks).toString("utf-8");
  const finishedAt = nowIso();

  // final output text is just stdout because --final-message-only is set
  const finalOutput = stdout;
  const status = classify(exitCode, stderr, stdout, finalOutput);

  const summary = {
    inputFile,
    label: safeLabel,
    startedAt,
    finishedAt,
    exitCode,
    spawnError,
    status,
    maxStepsPerTurn,
    outputFiles: {
      stdout: `${base}.stdout.txt`,
      stderr: `${base}.stderr.txt`,
      final: `${base}.final.txt`,
      summary: `${base}.summary.json`,
    },
  };

  writeFileSync(`${base}.stdout.txt`, stdout, "utf-8");
  writeFileSync(`${base}.stderr.txt`, stderr, "utf-8");
  writeFileSync(`${base}.final.txt`, finalOutput, "utf-8");
  writeFileSync(`${base}.summary.json`, JSON.stringify(summary, null, 2), "utf-8");

  console.log(`Probe finished: ${status}`);
  console.log(`Outputs written to: ${base}.*`);
  if (status !== "model-output-success") {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
