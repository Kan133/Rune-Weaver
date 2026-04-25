import assert from "node:assert/strict";

import { consumePossiblySpacedFlagValue } from "./arg-value.js";

function testConsumesSingleTokenFlagValue(): void {
  const result = consumePossiblySpacedFlagValue(["--output", "D:\\tmp-proof"], 0);
  assert.equal(result.value, "D:\\tmp-proof");
  assert.equal(result.nextIndex, 1);
}

function testConsumesWindowsPathWithSpacesUntilNextFlag(): void {
  const result = consumePossiblySpacedFlagValue(
    ["--output", "D:\\Rune", "Weaver\\tmp\\cli-review", "--force"],
    0,
  );
  assert.equal(result.value, "D:\\Rune Weaver\\tmp\\cli-review");
  assert.equal(result.nextIndex, 2);
}

function testLeavesIndexUnchangedWhenValueMissing(): void {
  const result = consumePossiblySpacedFlagValue(["--output"], 0);
  assert.equal(result.value, undefined);
  assert.equal(result.nextIndex, 0);
}

testConsumesSingleTokenFlagValue();
testConsumesWindowsPathWithSpacesUntilNextFlag();
testLeavesIndexUnchangedWhenValueMissing();

console.log("apps/cli/arg-value.test.ts passed");
