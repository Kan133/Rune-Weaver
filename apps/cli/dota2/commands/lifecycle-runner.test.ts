import assert from "node:assert/strict";
import { mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";

import { runDota2RuntimeValidation } from "./lifecycle-runner.js";

const TEST_ROOT = join(process.cwd(), "tmp", "test-lifecycle-runner");

async function runTests(): Promise<void> {
  rmSync(TEST_ROOT, { recursive: true, force: true });
  mkdirSync(TEST_ROOT, { recursive: true });

  const result = await runDota2RuntimeValidation(
    {
      hostRoot: TEST_ROOT,
    } as any,
    true,
    "test",
  );

  assert.equal(result.success, true);
  assert.equal(result.skipped, true);
  assert.ok(
    result.limitations.some((item) => item.includes("Server: Server tsconfig.json not found")),
  );
  assert.ok(
    result.limitations.some((item) => item.includes("UI: UI tsconfig.json not found")),
  );

  rmSync(TEST_ROOT, { recursive: true, force: true });
  console.log("apps/cli/dota2/commands/lifecycle-runner.test.ts: PASS");
}

runTests().catch((error) => {
  console.error(error);
  process.exit(1);
});
