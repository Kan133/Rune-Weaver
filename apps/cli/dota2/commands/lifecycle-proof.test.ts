import assert from "assert";
import { existsSync, mkdirSync, rmSync, readFileSync } from "fs";
import { join } from "path";
import { buildLifecycleProofConfig, runLifecycleProofCommand } from "./lifecycle-proof.js";

const TEST_ROOT = join(process.cwd(), "tmp", "test-lifecycle-proof");

async function runTests(): Promise<void> {
  console.log("Lifecycle Proof Tests");
  console.log("=".repeat(50));

  if (existsSync(TEST_ROOT)) {
    rmSync(TEST_ROOT, { recursive: true, force: true });
  }
  mkdirSync(TEST_ROOT, { recursive: true });

  const output = join(TEST_ROOT, "proof.json");
  const options = {
    command: "lifecycle" as const,
    prompt: "",
    hostRoot: TEST_ROOT,
    featureId: "talent_draw_demo",
    dryRun: true,
    write: false,
    force: false,
    output,
    verbose: false,
    addonName: "talent_draw_demo",
    mapName: "temp",
  };

  const plan = buildLifecycleProofConfig(options).plan;
  assert.strictEqual(plan.length, 14, "Lifecycle proof should include the full create/update/delete/recreate path");
  assert.strictEqual(plan[0].kind, "create");
  assert.strictEqual(plan[3].kind, "update");
  assert.strictEqual(plan[6].kind, "delete");
  assert.strictEqual(plan[9].kind, "recreate");
  assert.strictEqual(plan[12].kind, "refresh-evidence");
  assert.strictEqual(plan[13].kind, "manual-runtime");
  assert(plan.some((step) => step.command.join(" ").includes("demo:talent-draw:refresh")));

  const success = await runLifecycleProofCommand(options);
  assert.strictEqual(success, true, "Plan-only lifecycle proof should succeed as a planning command");
  assert.strictEqual(existsSync(output), true, "Plan-only run should still write an artifact");

  const artifact = JSON.parse(readFileSync(output, "utf-8"));
  assert.strictEqual(artifact.mode, "plan");
  assert.strictEqual(artifact.finalVerdict.pipelineComplete, false);
  assert(artifact.finalVerdict.nextSteps[0].includes("--write"));

  rmSync(TEST_ROOT, { recursive: true, force: true });
  console.log("  PASS");
}

runTests().catch((error) => {
  console.error("Test failed:", error);
  process.exit(1);
});
