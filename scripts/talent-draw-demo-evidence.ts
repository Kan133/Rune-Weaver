#!/usr/bin/env tsx
/**
 * Talent Draw Demo Evidence Pack Generator
 * 
 * Supports dry-run evidence and optional host write execution.
 * 
 * Creates a formal evidence pack for the Talent Draw demo by running the
 * full Rune Weaver pipeline with explicit fixture parameters.
 * 
 * This script explicitly imports talentDrawFixture and merges its parameters
 * into the IntentSchema before Blueprint generation, ensuring the demo
 * does not rely on implicit Wizard behavior.
 * 
 * FULL PIPELINE (Finding A):
 * Schema -> Blueprint -> Pattern Resolution -> AssemblyPlan 
 * -> HostRealization -> GeneratorRouting -> WritePlan -> GeneratedCode
 * 
 * USAGE:
 *   # Dry-run mode (default)
 *   npm run demo:talent-draw
 *   npm run demo:talent-draw -- --host D:\tsetA
 *   
 *   # Write mode
 *   npm run demo:talent-draw -- --host D:\tsetA --write
 *   
 *   # Force write
 *   npm run demo:talent-draw -- --host D:\tsetA --write --force
 */

import { mkdir, writeFile } from "fs/promises";
import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { talentDrawFixture } from "../apps/workbench/fixtures/talent-draw.fixture.js";
import { 
  EVIDENCE_DIR, 
  ARTIFACT_FILE, 
  MARKDOWN_FILE,
  parseCLIOptions,
  TALENT_DRAW_FEATURE_ID,
} from "./talent-draw-demo-evidence/config.js";
import { runCompletePipeline } from "./talent-draw-demo-evidence/pipeline.js";
import { runSmokeAssertions } from "./talent-draw-demo-evidence/smoke.js";
import { generateArtifact } from "./talent-draw-demo-evidence/artifact.js";
import { generateMarkdown } from "./talent-draw-demo-evidence/markdown.js";
import type { CLIOptions } from "./talent-draw-demo-evidence/types.js";

function checkHostAddonPreflight(hostRoot: string): void {
  const addonConfigPath = join(hostRoot, "scripts", "addon.config.ts");
  if (!existsSync(addonConfigPath)) {
    return;
  }

  const addonConfig = readFileSync(addonConfigPath, "utf-8");
  const hasDefaultAddonName = addonConfig.includes("let addon_name: string = 'x_template'");
  const hasNodeModules = existsSync(join(hostRoot, "node_modules"));

  if (hasDefaultAddonName) {
    console.warn("⚠️  Host preflight: scripts/addon.config.ts still uses addon_name = 'x_template'.");
    console.warn("   For a fresh x-template host, run the demo prepare command before yarn install.");
    if (!hasNodeModules) {
      console.warn("   Recommended order: dota2 demo prepare --write -> yarn install -> demo write -> yarn dev -> yarn launch <addon_name> temp");
    }
    console.warn();
  }
}

async function main(): Promise<void> {
  // Parse CLI options
  const options: CLIOptions = parseCLIOptions();
  checkHostAddonPreflight(options.host);
  
  console.log("=".repeat(60));
  console.log("🎲 Talent Draw Demo Evidence Pack Generator");
  console.log("=".repeat(60));
  console.log();
  console.log(`📁 Host Root: ${options.host}`);
  console.log(`📝 Mode: ${options.write ? "WRITE" : "DRY-RUN"}`);
  console.log(`⚡ Force: ${options.force ? "YES" : "NO"}`);
  console.log(`🔍 Verbose: ${options.verbose ? "YES" : "NO"}`);
  console.log();

  // Ensure output directory exists
  await mkdir(EVIDENCE_DIR, { recursive: true });
  console.log(`📁 Evidence directory: ${EVIDENCE_DIR}`);
  console.log();

  // Run COMPLETE pipeline with optional write execution.
  console.log("[Main] Running complete pipeline...");
  const { pipelineResult, writeExecution } = await runCompletePipeline(talentDrawFixture, options);
  console.log();

  // Run smoke assertions after pipeline execution.
  const smoke = runSmokeAssertions({
    result: pipelineResult,
    writeExecution,
    options,
  });
  console.log();

  // Generate artifacts
  console.log("[Output] Generating evidence files...");
  
  const artifact = generateArtifact({
    result: pipelineResult,
    smoke,
    writeExecution,
    options,
  });
  
  const markdown = generateMarkdown(artifact);

  // Write artifact.json
  const artifactPath = join(EVIDENCE_DIR, ARTIFACT_FILE);
  await writeFile(artifactPath, JSON.stringify(artifact, null, 2), "utf-8");
  console.log(`  ✓ ${artifactPath}`);

  // Write DEMO-GUIDE.md
  const markdownPath = join(EVIDENCE_DIR, MARKDOWN_FILE);
  await writeFile(markdownPath, markdown, "utf-8");
  console.log(`  ✓ ${markdownPath}`);
  console.log();

  // Summary
  console.log("=".repeat(60));
  console.log("Summary");
  console.log("=".repeat(60));
  console.log(`Smoke Assertions: ${smoke.assertions.filter(a => a.passed).length}/${smoke.assertions.length} passed`);
  console.log(`Host Realization: ${pipelineResult.hostRealizationPlan ? "✓" : "✗"}`);
  console.log(`Generator Routing: ${pipelineResult.generatorRoutingPlan ? "✓" : "✗"}`);
  console.log(`Write Plan: ${pipelineResult.writePlan ? "✓" : "✗"}`);
  console.log(`Generated Files: ${pipelineResult.generatedFiles.length}`);
  console.log();
  
  // Write execution summary
  if (writeExecution) {
    console.log("Write Execution:");
    console.log(`  Mode: ${options.write ? "WRITE" : "DRY-RUN"}`);
    console.log(`  Success: ${writeExecution.success ? "✓" : "✗"}`);
    console.log(`  Files Created: ${writeExecution.evidence.filesCreated.length}`);
    console.log(`  Files Modified: ${writeExecution.evidence.filesModified.length}`);
    console.log(`  Dry-Run Artifacts: ${writeExecution.evidence.dryRunArtifacts.length}`);
    console.log();
  }
  
  console.log(`Evidence Files: ${EVIDENCE_DIR}/{${ARTIFACT_FILE},${MARKDOWN_FILE}}`);
  console.log();

  // Exit handling
  if (!smoke.passed) {
    console.error("❌ SMOKE ASSERTIONS FAILED");
    console.error("Failed assertions:");
    smoke.assertions.filter(a => !a.passed).forEach(a => {
      console.error(`  - ${a.name}${a.message ? `: ${a.message}` : ""}`);
    });
    process.exit(1);
  }

  if (options.write && writeExecution && !writeExecution.success) {
    console.error("❌ WRITE EXECUTION FAILED");
    if (writeExecution.writeResult?.blockedByReadinessGate) {
      console.error("Blocked by readiness gate. Use --force to override.");
    }
    process.exit(3);
  }

  console.log("✅ Talent Draw Demo Evidence Pack generated successfully!");
  
  if (!options.write) {
    console.log();
    console.log("💡 To write files to host, run:");
    console.log(`   npm run demo:talent-draw -- --host ${options.host} --write`);
  }
}

main().catch(error => {
  console.error("❌ Fatal error:", error);
  process.exit(1);
});
