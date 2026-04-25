import { mkdir, writeFile } from "fs/promises";
import { existsSync, readFileSync } from "fs";
import { join } from "path";

import type { SelectionCaseSpec } from "../../adapters/dota2/cases/selection-demo-registry.js";
import { formatSelectionCaseTitle } from "../../apps/workbench/fixtures/selection-case.fixture.js";
import {
  ARTIFACT_FILE,
  MARKDOWN_FILE,
  getDemoScriptName,
  parseCLIOptions,
} from "./config.js";
import { generateArtifact } from "./artifact.js";
import { generateMarkdown } from "./markdown.js";
import { runCompletePipeline } from "./pipeline.js";
import { runSmokeAssertions } from "./smoke.js";
import type { CLIOptions } from "./types.js";

interface ErrorWithExitCode extends Error {
  exitCode?: number;
}

function createExitError(message: string, exitCode: number): ErrorWithExitCode {
  const error = new Error(message) as ErrorWithExitCode;
  error.exitCode = exitCode;
  return error;
}

function checkHostAddonPreflight(hostRoot: string): void {
  const addonConfigPath = join(hostRoot, "scripts", "addon.config.ts");
  if (!existsSync(addonConfigPath)) {
    return;
  }

  const addonConfig = readFileSync(addonConfigPath, "utf-8");
  const hasDefaultAddonName = addonConfig.includes("let addon_name: string = 'x_template'");
  const hasNodeModules = existsSync(join(hostRoot, "node_modules"));

  if (hasDefaultAddonName) {
    console.warn("⚠ Host preflight: scripts/addon.config.ts still uses addon_name = 'x_template'.");
    console.warn("  For a fresh x-template host, run init or demo prepare before yarn install.");
    if (!hasNodeModules) {
      console.warn("  Recommended order: init/prepare -> yarn install -> demo write -> yarn dev -> yarn launch <addon_name> temp");
    }
    console.warn();
  }
}

export async function runSelectionCaseEvidenceCli(caseSpec: SelectionCaseSpec): Promise<void> {
  const scriptName = getDemoScriptName(caseSpec.caseId);
  const options: CLIOptions = parseCLIOptions(scriptName);
  const caseTitle = formatSelectionCaseTitle(caseSpec);

  checkHostAddonPreflight(options.host);

  console.log("=".repeat(60));
  console.log(`Selection Case Demo Evidence Pack Generator: ${caseTitle}`);
  console.log("=".repeat(60));
  console.log();
  console.log(`Host Root: ${options.host}`);
  console.log(`Mode: ${options.write ? "WRITE" : "DRY-RUN"}`);
  console.log(`Force: ${options.force ? "YES" : "NO"}`);
  console.log(`Verbose: ${options.verbose ? "YES" : "NO"}`);
  console.log();

  await mkdir(caseSpec.evidenceDir, { recursive: true });
  console.log(`Evidence directory: ${caseSpec.evidenceDir}`);
  console.log();

  console.log("[Main] Running complete pipeline...");
  const { pipelineResult, writeExecution } = await runCompletePipeline(caseSpec, options);
  console.log();

  const smoke = runSmokeAssertions({
    caseSpec,
    result: pipelineResult,
    writeExecution,
    options,
  });
  console.log();

  console.log("[Output] Generating evidence files...");
  const artifact = generateArtifact({
    caseSpec,
    result: pipelineResult,
    smoke,
    writeExecution,
    options,
  });
  const markdown = generateMarkdown(caseSpec, artifact);

  const artifactPath = join(caseSpec.evidenceDir, ARTIFACT_FILE);
  await writeFile(artifactPath, JSON.stringify(artifact, null, 2), "utf-8");
  console.log(`  ✓ ${artifactPath}`);

  const markdownPath = join(caseSpec.evidenceDir, MARKDOWN_FILE);
  await writeFile(markdownPath, markdown, "utf-8");
  console.log(`  ✓ ${markdownPath}`);
  console.log();

  console.log("=".repeat(60));
  console.log("Summary");
  console.log("=".repeat(60));
  console.log(`Smoke Assertions: ${smoke.assertions.filter((assertion) => assertion.passed).length}/${smoke.assertions.length} passed`);
  console.log(`Host Realization: ${pipelineResult.hostRealizationPlan ? "✓" : "✗"}`);
  console.log(`Generator Routing: ${pipelineResult.generatorRoutingPlan ? "✓" : "✗"}`);
  console.log(`Write Plan: ${pipelineResult.writePlan ? "✓" : "✗"}`);
  console.log(`Generated Files: ${pipelineResult.generatedFiles.length}`);
  console.log();

  if (writeExecution) {
    console.log("Write Execution:");
    console.log(`  Mode: ${options.write ? "WRITE" : "DRY-RUN"}`);
    console.log(`  Success: ${writeExecution.success ? "✓" : "✗"}`);
    console.log(`  Files Created: ${writeExecution.evidence.filesCreated.length}`);
    console.log(`  Files Modified: ${writeExecution.evidence.filesModified.length}`);
    console.log(`  Dry-Run Artifacts: ${writeExecution.evidence.dryRunArtifacts.length}`);
    console.log();
  }

  console.log(`Evidence Files: ${caseSpec.evidenceDir}/{${ARTIFACT_FILE},${MARKDOWN_FILE}}`);
  console.log();

  if (!smoke.passed) {
    const failedAssertions = smoke.assertions
      .filter((assertion) => !assertion.passed)
      .map((assertion) => `${assertion.name}${assertion.message ? `: ${assertion.message}` : ""}`)
      .join("; ");
    throw createExitError(`SMOKE ASSERTIONS FAILED: ${failedAssertions}`, 1);
  }

  if (options.write && writeExecution && !writeExecution.success) {
    if (writeExecution.writeResult?.blockedByReadinessGate) {
      throw createExitError("WRITE EXECUTION FAILED: blocked by readiness gate", 3);
    }
    throw createExitError("WRITE EXECUTION FAILED", 3);
  }

  console.log(`✓ ${caseTitle} evidence generated successfully!`);

  if (!options.write) {
    console.log();
    console.log("To write files to host, run:");
    console.log(`  npm run ${scriptName} -- --host ${options.host} --write`);
  }
}
