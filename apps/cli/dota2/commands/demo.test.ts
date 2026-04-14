/**
 * Demo Command Tests
 *
 * Tests for the Demo Preparation Runbook CLI command.
 * Uses temporary mock hosts to avoid touching real hosts.
 */

import assert from "assert";
import { existsSync, mkdirSync, writeFileSync, rmSync, readFileSync } from "fs";
import { join } from "path";
import { runDemoCommand } from "./demo.js";
import { generateRunbook } from "./demo-runbook.js";

const TEST_BASE = join(process.cwd(), "tmp", "test-demo");

function createTestHost(name: string): string {
  const hostPath = join(TEST_BASE, name);
  mkdirSync(hostPath, { recursive: true });
  return hostPath;
}

function cleanupTestHost(name: string): void {
  const hostPath = join(TEST_BASE, name);
  if (existsSync(hostPath)) {
    rmSync(hostPath, { recursive: true });
  }
}

function setupMinimalHost(hostPath: string): void {
  mkdirSync(join(hostPath, "scripts"), { recursive: true });
  writeFileSync(
    join(hostPath, "scripts/addon.config.ts"),
    "let addon_name = 'x_template'",
    "utf-8"
  );

  writeFileSync(
    join(hostPath, "package.json"),
    JSON.stringify({
      name: "test-addon",
      scripts: { postinstall: "echo install", dev: "echo dev", launch: "echo launch" }
    }),
    "utf-8"
  );
}

async function testMissingHost(): Promise<void> {
  console.log("Test: Missing --host parameter");
  const result = await runDemoCommand({
    command: "demo",
    prompt: "",
    hostRoot: "",
    dryRun: true,
    write: false,
    force: false,
    verbose: false,
  });
  assert.strictEqual(result, false, "Should return false when host is missing");
  console.log("  Passed");
}

async function testDryRunMode(): Promise<void> {
  console.log("Test: Dry-run mode (default)");
  const hostPath = createTestHost("dryrun");

  try {
    setupMinimalHost(hostPath);

    const result = await runDemoCommand({
      command: "demo",
      prompt: "",
      hostRoot: hostPath,
      dryRun: true,
      write: false,
      force: false,
      verbose: false,
      addonName: "test_addon",
      mapName: "test_map",
    });

    assert.strictEqual(result, true, "Should succeed in dry-run mode");
    // Should not create workspace
    assert.strictEqual(
      existsSync(join(hostPath, "game/scripts/src/rune_weaver/rune-weaver.workspace.json")),
      false,
      "Should not create workspace in dry-run mode"
    );
    console.log("  Passed");
  } finally {
    cleanupTestHost("dryrun");
  }
}

async function testWriteModeOnlyRenamesAddonConfig(): Promise<void> {
  console.log("Test: Write mode only renames addon.config");
  const hostPath = createTestHost("writemode");

  try {
    setupMinimalHost(hostPath);

    const result = await runDemoCommand({
      command: "demo",
      prompt: "",
      hostRoot: hostPath,
      dryRun: false,
      write: true,
      force: false,
      verbose: false,
      addonName: "my_addon",
      mapName: "my_map",
    });

    assert.strictEqual(result, true, "Should succeed in write mode");

    const workspacePath = join(hostPath, "game/scripts/src/rune_weaver/rune-weaver.workspace.json");
    assert.strictEqual(existsSync(workspacePath), false, "Should not create workspace directly");

    // Check addon name was updated
    const configContent = readFileSync(join(hostPath, "scripts/addon.config.ts"), "utf-8");
    assert.ok(configContent.includes("my_addon"), "Should update addon_name");

    console.log("  Passed");
  } finally {
    cleanupTestHost("writemode");
  }
}

async function testExistingWorkspaceNotRecreated(): Promise<void> {
  console.log("Test: Existing workspace preserved");
  const hostPath = createTestHost("existing");

  try {
    setupMinimalHost(hostPath);

    // Pre-create workspace
    mkdirSync(join(hostPath, "game/scripts/src/rune_weaver"), { recursive: true });
    writeFileSync(
      join(hostPath, "game/scripts/src/rune_weaver/rune-weaver.workspace.json"),
      JSON.stringify({ version: "0.1.0", features: [{ id: "test" }] }),
      "utf-8"
    );

    const result = await runDemoCommand({
      command: "demo",
      prompt: "",
      hostRoot: hostPath,
      dryRun: true,
      write: false,
      force: false,
      verbose: false,
      addonName: "test_addon",
      mapName: "test_map",
    });

    assert.strictEqual(result, true, "Should succeed");

    // Verify workspace still exists with original content
    const workspace = JSON.parse(readFileSync(
      join(hostPath, "game/scripts/src/rune_weaver/rune-weaver.workspace.json"),
      "utf-8"
    ));
    assert.strictEqual(workspace.features.length, 1, "Should preserve existing workspace");

    console.log("  Passed");
  } finally {
    cleanupTestHost("existing");
  }
}

async function testRunbookOrderAndChecks(): Promise<void> {
  console.log("Test: Runbook order and fresh-host checks");
  const hostPath = createTestHost("runbook");

  try {
    setupMinimalHost(hostPath);

    const runbook = generateRunbook({
      command: "demo",
      prompt: "",
      hostRoot: hostPath,
      dryRun: true,
      write: false,
      force: false,
      verbose: false,
      addonName: "talent_draw_demo",
      mapName: "temp",
    });

    const stepNames = runbook.steps.map((step) => step.name);
    assert.deepStrictEqual(stepNames, [
      "Fix addon.config name",
      "Install dependencies",
      "Verify addon install outputs",
      "Check package.json scripts",
      "Run Rune Weaver init/write",
      "Write or refresh Talent Draw feature",
      "Build TypeScript and Panorama",
      "Run Runtime Doctor",
      "Run Post-Generation Validate",
      "Launch Dota2",
    ]);

    const installStep = runbook.steps.find((step) => step.name === "Install dependencies");
    assert.ok(installStep?.command === "yarn install", "Should point to yarn install");
    assert.strictEqual(runbook.actionSummary.headline, "Fix addon.config name");
    assert.strictEqual(runbook.actionSummary.command, undefined, "The first action should be rename guidance before executable commands");
    assert.strictEqual(runbook.summary.overall, "BLOCKED", "Fresh host should report blocked until install/write path is complete");
    assert.ok(runbook.summary.nextStep?.includes("Fix addon.config name"), "Should point the operator at the first actionable step");

    const launchStep = runbook.steps.find((step) => step.name === "Launch Dota2");
    assert.ok(launchStep?.command?.includes("yarn launch talent_draw_demo temp"), "Should include addon and map");

    console.log("  Passed");
  } finally {
    cleanupTestHost("runbook");
  }
}

async function runAllTests(): Promise<void> {
  console.log("=".repeat(60));
  console.log("Demo Command Tests");
  console.log("=".repeat(60));
  console.log();

  // Cleanup test base
  if (existsSync(TEST_BASE)) {
    rmSync(TEST_BASE, { recursive: true });
  }

  await testMissingHost();
  await testDryRunMode();
  await testWriteModeOnlyRenamesAddonConfig();
  await testExistingWorkspaceNotRecreated();
  await testRunbookOrderAndChecks();

  console.log();
  console.log("=".repeat(60));
  console.log("All tests passed!");
  console.log("=".repeat(60));

  // Cleanup
  if (existsSync(TEST_BASE)) {
    rmSync(TEST_BASE, { recursive: true });
  }
}

runAllTests().catch((error) => {
  console.error("Test failed:", error);
  process.exit(1);
});
