import assert from "assert";

import {
  getGapFillErrorMessage,
  getGapFillRetryDelayMs,
  isTransientGapFillError,
} from "./index.js";

function main(): void {
  assert.strictEqual(
    isTransientGapFillError("The engine is currently overloaded, please try again later"),
    true,
  );
  assert.strictEqual(
    isTransientGapFillError({ status: 429, message: "Request failed with status 429" }),
    true,
  );
  assert.strictEqual(
    isTransientGapFillError({ status: 503, message: "LLM request failed with status 503" }),
    true,
  );
  assert.strictEqual(
    isTransientGapFillError({ status: 400, message: "LLM request failed with status 400" }),
    false,
  );
  assert.strictEqual(isTransientGapFillError("LLM response parse failed"), false);
  assert.strictEqual(isTransientGapFillError("Missing boundary anchor"), false);
  assert.strictEqual(
    getGapFillErrorMessage({ message: "temporarily unavailable" }),
    "temporarily unavailable",
  );
  assert.strictEqual(getGapFillRetryDelayMs(0), 800);
  assert.strictEqual(getGapFillRetryDelayMs(1), 1600);
  assert.strictEqual(getGapFillRetryDelayMs(5), 1600);
  console.log("gap-fill retry tests passed");
}

main();
