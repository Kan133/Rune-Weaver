import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { readLLMExecutionConfig } from "./factory";
import { LLMConfigError } from "./errors";

function withTempEnv(envText: string, run: (dir: string) => void): void {
  const dir = mkdtempSync(join(tmpdir(), "rw-llm-factory-"));
  try {
    writeFileSync(join(dir, ".env"), envText, "utf-8");
    run(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

function testWizardUsesLowTemperatureByDefaultForGenericModels() {
  withTempEnv(
    [
      "LLM_PROVIDER=openai-compatible",
      "OPENAI_BASE_URL=https://example.invalid/v1",
      "OPENAI_API_KEY=test-key",
      "OPENAI_MODEL=gpt-generic",
    ].join("\n"),
    (dir) => {
      const config = readLLMExecutionConfig(dir, "wizard");
      assert.equal(config.temperature, 0.2);
    },
  );
}

function testWizardKeepsKimiThinkingEnabledTemperatureConstraint() {
  withTempEnv(
    [
      "LLM_PROVIDER=openai-compatible",
      "OPENAI_BASE_URL=https://example.invalid/v1",
      "OPENAI_API_KEY=test-key",
      "OPENAI_MODEL=kimi-k2.5",
      "LLM_WIZARD_THINKING=enabled",
    ].join("\n"),
    (dir) => {
      const config = readLLMExecutionConfig(dir, "wizard");
      assert.equal(config.temperature, 1);
    },
  );
}

function testWizardKeepsKimiThinkingDisabledTemperatureConstraint() {
  withTempEnv(
    [
      "LLM_PROVIDER=openai-compatible",
      "OPENAI_BASE_URL=https://example.invalid/v1",
      "OPENAI_API_KEY=test-key",
      "OPENAI_MODEL=kimi-k2.5",
      "LLM_WIZARD_THINKING=disabled",
    ].join("\n"),
    (dir) => {
      const config = readLLMExecutionConfig(dir, "wizard");
      assert.equal(config.temperature, 0.6);
    },
  );
}

function testWizardSupportsGpt54ReasoningEffort() {
  withTempEnv(
    [
      "LLM_PROVIDER=openai-compatible",
      "OPENAI_BASE_URL=https://example.invalid/v1",
      "OPENAI_API_KEY=test-key",
      "OPENAI_MODEL=gpt-5.4",
      "LLM_WIZARD_THINKING=disabled",
      "LLM_WIZARD_REASONING_EFFORT=low",
    ].join("\n"),
    (dir) => {
      const config = readLLMExecutionConfig(dir, "wizard");
      assert.equal(config.temperature, 0.2);
      assert.equal(config.reasoningEffort, "low");
      assert.deepEqual(config.providerOptions, {
        reasoning_effort: "low",
      });
    },
  );
}

function testReasoningEffortRejectsUnsupportedModels() {
  withTempEnv(
    [
      "LLM_PROVIDER=openai-compatible",
      "OPENAI_BASE_URL=https://example.invalid/v1",
      "OPENAI_API_KEY=test-key",
      "OPENAI_MODEL=glm-4.7",
      "LLM_WIZARD_THINKING=disabled",
      "LLM_WIZARD_REASONING_EFFORT=low",
    ].join("\n"),
    (dir) => {
      assert.throws(
        () => readLLMExecutionConfig(dir, "wizard"),
        (error: unknown) =>
          error instanceof LLMConfigError &&
          /only openai-compatible GPT-5 models are currently supported/i.test(error.message),
      );
    },
  );
}

function runTests() {
  testWizardUsesLowTemperatureByDefaultForGenericModels();
  testWizardKeepsKimiThinkingEnabledTemperatureConstraint();
  testWizardKeepsKimiThinkingDisabledTemperatureConstraint();
  testWizardSupportsGpt54ReasoningEffort();
  testReasoningEffortRejectsUnsupportedModels();
  console.log("factory.test.ts: PASS");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runTests();
}

export { runTests };
