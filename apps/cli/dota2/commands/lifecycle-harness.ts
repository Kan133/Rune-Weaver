import { mkdirSync, writeFileSync } from "fs";
import { spawnSync } from "child_process";
import { join } from "path";
import type { Dota2CLIOptions } from "../../dota2-cli.js";

export type LifecycleProofStepKind =
  | "create"
  | "doctor"
  | "validate"
  | "update"
  | "delete"
  | "recreate"
  | "refresh-evidence"
  | "manual-runtime"
  | "evidence";

export interface LifecycleProofStep {
  id: number;
  name: string;
  kind: LifecycleProofStepKind;
  command: string[];
  required: boolean;
}

export interface LifecycleProofStepResult extends LifecycleProofStep {
  success: boolean;
  skipped: boolean;
  exitCode: number | null;
  output: string;
}

export interface LifecycleProofArtifact {
  version: string;
  generatedAt: string;
  scenarioId: string;
  hostRoot: string;
  featureId: string;
  addonName: string;
  mapName: string;
  mode: "plan" | "write";
  plan: LifecycleProofStep[];
  results: LifecycleProofStepResult[];
  finalVerdict: {
    pipelineComplete: boolean;
    weakestStep: string;
    remainingRisks: string[];
    nextSteps: string[];
  };
}

export interface LifecycleHarnessConfig {
  scenarioId: string;
  displayName: string;
  featureId: string;
  addonName: string;
  mapName: string;
  narrative?: string;
  plan: LifecycleProofStep[];
}

export function buildDoctorStep(id: number, host: string, name: string): LifecycleProofStep {
  return {
    id,
    name,
    kind: "doctor",
    required: true,
    command: ["npm", "run", "cli", "--", "dota2", "doctor", "--host", host],
  };
}

export function buildValidateStep(id: number, host: string, name: string): LifecycleProofStep {
  return {
    id,
    name,
    kind: "validate",
    required: true,
    command: ["npm", "run", "cli", "--", "dota2", "validate", "--host", host],
  };
}

export async function runLifecycleHarness(
  options: Dota2CLIOptions,
  config: LifecycleHarnessConfig,
): Promise<{ success: boolean; artifact: LifecycleProofArtifact; outputPath: string }> {
  console.log("=".repeat(70));
  console.log(`Rune Weaver - ${config.displayName} Lifecycle Proof`);
  console.log("=".repeat(70));
  console.log(`\nHost: ${options.hostRoot}`);
  console.log(`Feature: ${config.featureId}`);
  console.log(`Addon: ${config.addonName}`);
  console.log(`Map: ${config.mapName}`);
  if (config.narrative) {
    console.log(`Scenario: ${config.narrative}`);
  }
  console.log(`Mode: ${options.write ? "WRITE" : "PLAN-ONLY (dry-run)"}\n`);

  const results: LifecycleProofStepResult[] = [];
  if (options.write) {
    console.log("\n" + "-".repeat(70));
    console.log("Executing Lifecycle Proof");
    console.log("-".repeat(70));

    for (const step of config.plan) {
      if (step.kind === "manual-runtime") {
        results.push({ ...step, success: true, skipped: true, exitCode: null, output: "Manual step only." });
        continue;
      }

      const result = runStep(step);
      results.push(result);

      if (!result.success && step.required) {
        console.log(`\nStopped at required step ${step.id}: ${step.name}`);
        break;
      }
    }
  } else {
    for (const step of config.plan) {
      results.push({ ...step, success: true, skipped: true, exitCode: null, output: "Plan-only mode." });
    }
  }

  const artifact = buildArtifact(options, config, results);
  const outputPath = saveLifecycleProofArtifact(artifact, options.output);
  printLifecycleProofSummary(artifact, outputPath);

  return {
    success: options.write ? artifact.finalVerdict.pipelineComplete : true,
    artifact,
    outputPath,
  };
}

export function printLifecycleProofPlan(plan: LifecycleProofStep[]): void {
  console.log("Lifecycle Plan");
  console.log("-".repeat(70));
  for (const step of plan) {
    console.log(`[${step.id}] ${step.name}${step.required ? "" : " (optional)"}`);
    console.log(`    ${formatCommand(step.command)}`);
  }
}

function runStep(step: LifecycleProofStep): LifecycleProofStepResult {
  console.log("\n" + "=".repeat(70));
  console.log(`[${step.id}] ${step.name}`);
  console.log("=".repeat(70));
  console.log(formatCommand(step.command));

  const [command, ...args] = step.command;
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    encoding: "utf-8",
    shell: process.platform === "win32",
  });

  const output = `${result.stdout || ""}${result.stderr || ""}`;
  if (output.trim()) {
    console.log(output.trimEnd());
  }

  const exitCode = result.status ?? (result.error ? 1 : 0);
  const success = exitCode === 0;
  console.log(`\nStep result: ${success ? "PASS" : "FAIL"} (exit code ${exitCode})`);

  return {
    ...step,
    success,
    skipped: false,
    exitCode,
    output,
  };
}

function buildArtifact(
  options: Dota2CLIOptions,
  config: LifecycleHarnessConfig,
  results: LifecycleProofStepResult[],
): LifecycleProofArtifact {
  const failedRequired = results.find((result) => result.required && !result.success);
  const planOnly = !options.write;

  return {
    version: "1.0",
    generatedAt: new Date().toISOString(),
    scenarioId: config.scenarioId,
    hostRoot: options.hostRoot,
    featureId: config.featureId,
    addonName: config.addonName,
    mapName: config.mapName,
    mode: options.write ? "write" : "plan",
    plan: config.plan,
    results,
    finalVerdict: {
      pipelineComplete: !planOnly && !failedRequired,
      weakestStep: failedRequired?.name || "",
      remainingRisks: [
        ...(planOnly ? ["Lifecycle proof was not executed; rerun with --write on a disposable prepared host."] : []),
        ...(failedRequired ? [`Required step failed: ${failedRequired.name}`] : []),
      ],
      nextSteps: planOnly
        ? ["Run with --write on a disposable prepared host to execute create/update/delete/recreate."]
        : failedRequired
          ? ["Inspect the failed step output, then rerun the lifecycle proof after fixing the host."]
          : [
              "Run yarn dev in the host if generated assets changed.",
              `Launch manually: yarn launch ${config.addonName} ${config.mapName}`,
              "Capture VConsole output and screenshots into the evidence pack.",
            ],
    },
  };
}

function saveLifecycleProofArtifact(artifact: LifecycleProofArtifact, output?: string): string {
  const outputDir = join(process.cwd(), "tmp", "cli-review");
  mkdirSync(outputDir, { recursive: true });
  const outputPath = output || join(outputDir, `lifecycle-proof-${Date.now()}.json`);
  writeFileSync(outputPath, JSON.stringify(artifact, null, 2), "utf-8");
  return outputPath;
}

function printLifecycleProofSummary(artifact: LifecycleProofArtifact, outputPath: string): void {
  console.log("\n" + "=".repeat(70));
  console.log("Lifecycle Proof Summary");
  console.log("=".repeat(70));
  console.log(`Result: ${artifact.finalVerdict.pipelineComplete ? "PASS" : "INCOMPLETE"}`);
  console.log(`Mode: ${artifact.mode}`);
  console.log(`Weakest Step: ${artifact.finalVerdict.weakestStep || "(none)"}`);
  if (artifact.finalVerdict.remainingRisks.length > 0) {
    console.log("\nRemaining Risks:");
    for (const risk of artifact.finalVerdict.remainingRisks) {
      console.log(`  - ${risk}`);
    }
  }
  console.log("\nNext Steps:");
  for (const step of artifact.finalVerdict.nextSteps) {
    console.log(`  - ${step}`);
  }
  console.log(`\nArtifact: ${outputPath}`);
}

function formatCommand(command: string[]): string {
  return command.map((part) => (/\s/.test(part) ? `"${part}"` : part)).join(" ");
}
