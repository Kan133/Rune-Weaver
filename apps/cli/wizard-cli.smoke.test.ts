import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";

function testWizardStabilityHelpSmoke() {
  const result = spawnSync(
    "npx",
    ["tsx", "apps/cli/index.ts", "wizard", "stability", "--help"],
    {
      cwd: "D:\\Rune Weaver",
      encoding: "utf-8",
      shell: process.platform === "win32",
    },
  );

  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /wizard stability/i);
  assert.match(result.stdout, /--corpus/i);
  assert.match(result.stdout, /--runs/i);
}

function runTests() {
  testWizardStabilityHelpSmoke();
  console.log("wizard-cli.smoke.test.ts: PASS");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runTests();
}

export { runTests };
