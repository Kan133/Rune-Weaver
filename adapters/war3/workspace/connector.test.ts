/**
 * War3 Adapter - Workspace Connector Tests
 *
 * Lightweight tests for the workspace connector layer.
 */

import { mkdirSync, writeFileSync, rmSync } from "fs";
import { join } from "path";
import { connectWar3Workspace } from "./connector.js";
import type { War3WorkspaceConnectionResult } from "./types.js";

const TEST_DIR = join(process.cwd(), "tmp", "war3-connector-test");

function setup() {
  try {
    rmSync(TEST_DIR, { recursive: true, force: true });
  } catch {
    // ignore
  }
  mkdirSync(TEST_DIR, { recursive: true });
}

function teardown() {
  try {
    rmSync(TEST_DIR, { recursive: true, force: true });
  } catch {
    // ignore
  }
}

function createMinimalWar3Project(dir: string, scriptType: "j" | "lua") {
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "war3map.w3i"), "mock");
  writeFileSync(join(dir, "war3map.w3e"), "mock");
  const scriptFile = scriptType === "j" ? "war3map.j" : "war3map.lua";
  writeFileSync(join(dir, scriptFile), "mock");
}

function runTests() {
  console.log("Running War3 Workspace Connector Tests...\n");
  let passed = 0;
  let failed = 0;

  // Test 1: Invalid path
  {
    const result = connectWar3Workspace("/nonexistent/path");
    if (!result.success && result.issues.length > 0 && result.context === null) {
      console.log("✅ Test 1: Invalid path - PASS");
      passed++;
    } else {
      console.log("❌ Test 1: Invalid path - FAIL");
      failed++;
    }
  }

  // Test 2: Valid Jass project
  {
    setup();
    const projectDir = join(TEST_DIR, "valid-jass");
    createMinimalWar3Project(projectDir, "j");
    const result = connectWar3Workspace(projectDir);
    if (
      result.success &&
      result.context !== null &&
      result.context.scriptEntry === "war3map.j" &&
      result.context.hostKind === "war3-classic"
    ) {
      console.log("✅ Test 2: Valid Jass project - PASS");
      passed++;
    } else {
      console.log("❌ Test 2: Valid Jass project - FAIL");
      console.log("  Result:", JSON.stringify(result, null, 2));
      failed++;
    }
    teardown();
  }

  // Test 3: Valid Lua project
  {
    setup();
    const projectDir = join(TEST_DIR, "valid-lua");
    createMinimalWar3Project(projectDir, "lua");
    const result = connectWar3Workspace(projectDir);
    if (
      result.success &&
      result.context !== null &&
      result.context.scriptEntry === "war3map.lua"
    ) {
      console.log("✅ Test 3: Valid Lua project - PASS");
      passed++;
    } else {
      console.log("❌ Test 3: Valid Lua project - FAIL");
      console.log("  Result:", JSON.stringify(result, null, 2));
      failed++;
    }
    teardown();
  }

  // Test 4: Missing required files
  {
    setup();
    const projectDir = join(TEST_DIR, "incomplete");
    mkdirSync(projectDir, { recursive: true });
    writeFileSync(join(projectDir, "war3map.j"), "mock");
    // Missing war3map.w3i and war3map.w3e
    const result = connectWar3Workspace(projectDir);
    if (!result.success && result.issues.length > 0) {
      console.log("✅ Test 4: Missing required files - PASS");
      passed++;
    } else {
      console.log("❌ Test 4: Missing required files - FAIL");
      failed++;
    }
    teardown();
  }

  // Test 5: P0 source files discovery
  {
    setup();
    const projectDir = join(TEST_DIR, "with-p0");
    createMinimalWar3Project(projectDir, "lua");
    writeFileSync(join(projectDir, "war3mapunits.doo"), "mock");
    writeFileSync(join(projectDir, "war3mapMisc.txt"), "mock");
    const result = connectWar3Workspace(projectDir);
    if (
      result.success &&
      result.context !== null &&
      result.context.p0SourceFiles.includes("war3mapunits.doo") &&
      result.context.p0SourceFiles.includes("war3mapMisc.txt")
    ) {
      console.log("✅ Test 5: P0 source files discovery - PASS");
      passed++;
    } else {
      console.log("❌ Test 5: P0 source files discovery - FAIL");
      console.log("  P0 files:", result.context?.p0SourceFiles);
      failed++;
    }
    teardown();
  }

  console.log(`\n${"=".repeat(40)}`);
  console.log(`Results: ${passed} passed, ${failed} failed`);

  return failed === 0;
}

// Run tests if executed directly
const isDirectExecution = import.meta.url.startsWith("file://");
if (isDirectExecution) {
  const success = runTests();
  process.exit(success ? 0 : 1);
}

export { runTests };
