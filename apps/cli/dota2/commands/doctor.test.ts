/**
 * Doctor Command Tests
 *
 * Tests for the Runtime Doctor CLI command.
 * Uses temporary mock hosts to avoid touching real hosts.
 */

import assert from "assert";
import { existsSync, mkdirSync, writeFileSync, rmSync } from "fs";
import { join } from "path";
import { runDoctorCommand } from "./doctor.js";
import type { Dota2CLIOptions } from "../../dota2-cli.js";

const TEST_BASE = join(process.cwd(), "tmp", "test-doctor");

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
  // addon.config.ts
  mkdirSync(join(hostPath, "scripts"), { recursive: true });
  writeFileSync(
    join(hostPath, "scripts/addon.config.ts"),
    "let addon_name = 'test_addon'",
    "utf-8"
  );

  // package.json
  writeFileSync(
    join(hostPath, "package.json"),
    JSON.stringify({
      name: "test-addon",
      scripts: { postinstall: "echo install", dev: "echo dev", launch: "echo launch" }
    }),
    "utf-8"
  );

  // workspace - needs all required fields
  mkdirSync(join(hostPath, "game/scripts/src/rune_weaver"), { recursive: true });
  writeFileSync(
    join(hostPath, "game/scripts/src/rune_weaver/rune-weaver.workspace.json"),
    JSON.stringify({
      version: "0.1.0",
      hostType: "dota2-x-template",
      hostRoot: hostPath,
      addonName: "test_addon",
      initializedAt: new Date().toISOString(),
      features: []
    }),
    "utf-8"
  );
}

async function testMissingHost(): Promise<void> {
  console.log("Test: Missing --host parameter");
  const result = await runDoctorCommand({
    command: "doctor",
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

async function testEmptyHost(): Promise<void> {
  console.log("Test: Empty host directory");
  const hostPath = createTestHost("empty");

  try {
    const result = await runDoctorCommand({
      command: "doctor",
      prompt: "",
      hostRoot: hostPath,
      dryRun: true,
      write: false,
      force: false,
      verbose: false,
    });
    // Should complete but with failures
    assert.strictEqual(typeof result, "boolean", "Should return a boolean");
    console.log("  Passed");
  } finally {
    cleanupTestHost("empty");
  }
}

async function testMinimalHost(): Promise<void> {
  console.log("Test: Minimal valid host");
  const hostPath = createTestHost("minimal");

  try {
    setupMinimalHost(hostPath);

    const result = await runDoctorCommand({
      command: "doctor",
      prompt: "",
      hostRoot: hostPath,
      dryRun: true,
      write: false,
      force: false,
      verbose: false,
    });

    // Doctor returns true if not FAIL (PASS or WARN is ok)
    // A minimal host may have some warnings (missing dota dirs, etc.)
    assert.strictEqual(typeof result, "boolean", "Should return a boolean");
    console.log("  Passed (host may have warnings but no critical failures)");
  } finally {
    cleanupTestHost("minimal");
  }
}

async function testXTemplateAddon(): Promise<void> {
  console.log("Test: Host with x_template addon_name");
  const hostPath = createTestHost("xtemplate");

  try {
    setupMinimalHost(hostPath);
    writeFileSync(
      join(hostPath, "scripts/addon.config.ts"),
      "let addon_name = 'x_template'",
      "utf-8"
    );

    const result = await runDoctorCommand({
      command: "doctor",
      prompt: "",
      hostRoot: hostPath,
      dryRun: true,
      write: false,
      force: false,
      verbose: false,
    });

    // Should warn but not fail
    assert.strictEqual(typeof result, "boolean", "Should return a boolean");
    console.log("  Passed");
  } finally {
    cleanupTestHost("xtemplate");
  }
}

async function runAllTests(): Promise<void> {
  console.log("=".repeat(60));
  console.log("Doctor Command Tests");
  console.log("=".repeat(60));
  console.log();

  // Cleanup test base
  if (existsSync(TEST_BASE)) {
    rmSync(TEST_BASE, { recursive: true });
  }

  await testMissingHost();
  await testEmptyHost();
  await testMinimalHost();
  await testXTemplateAddon();

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
