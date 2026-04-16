import assert from "assert";
import { mkdtempSync, rmSync, writeFileSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

import { LLMConfigError } from "./errors.js";
import { readLLMEnvironment, readLLMExecutionConfig } from "./factory.js";

function withTempEnvFile(content: string, fn: (projectRoot: string) => void): void {
  const projectRoot = mkdtempSync(join(tmpdir(), "rw-llm-config-"));
  try {
    writeFileSync(join(projectRoot, ".env"), content, "utf-8");
    fn(projectRoot);
  } finally {
    rmSync(projectRoot, { recursive: true, force: true });
  }
}

function testGapFillWorkflowConfig(): void {
  withTempEnvFile(
    [
      "LLM_PROVIDER=openai-compatible",
      "OPENAI_BASE_URL=https://api.moonshot.cn/v1",
      "OPENAI_API_KEY=sk-test",
      "OPENAI_MODEL=kimi-k2.5",
      "LLM_GAP_FILL_THINKING=disabled",
      "LLM_GAP_FILL_TEMPERATURE=0.6",
    ].join("\n"),
    (projectRoot) => {
      const config = readLLMExecutionConfig(projectRoot, "gap-fill");
      assert.strictEqual(config.thinking, "disabled");
      assert.strictEqual(config.temperature, 0.6);
      assert.deepStrictEqual(config.providerOptions, {
        thinking: { type: "disabled" },
      });
    },
  );
}

function testOpenAICompatibleAutoOmitsThinkingPayloadForNonKimi(): void {
  withTempEnvFile(
    [
      "LLM_PROVIDER=openai-compatible",
      "OPENAI_BASE_URL=https://open.bigmodel.cn/api/paas/v4",
      "OPENAI_API_KEY=sk-test",
      "OPENAI_MODEL=glm-4.7",
      "LLM_WIZARD_THINKING=enabled",
      "LLM_WIZARD_TEMPERATURE=1",
    ].join("\n"),
    (projectRoot) => {
      const config = readLLMExecutionConfig(projectRoot, "wizard");
      assert.strictEqual(config.thinking, "enabled");
      assert.strictEqual(config.temperature, 1);
      assert.strictEqual(config.providerOptions, undefined);
    },
  );
}

function testOpenAICompatibleThinkingPayloadOverrideCanForceTypeObject(): void {
  withTempEnvFile(
    [
      "LLM_PROVIDER=openai-compatible",
      "OPENAI_BASE_URL=https://open.bigmodel.cn/api/paas/v4",
      "OPENAI_API_KEY=sk-test",
      "OPENAI_MODEL=glm-4.7",
      "OPENAI_COMPAT_THINKING_PAYLOAD=type-object",
      "LLM_WIZARD_THINKING=enabled",
      "LLM_WIZARD_TEMPERATURE=1",
    ].join("\n"),
    (projectRoot) => {
      const config = readLLMExecutionConfig(projectRoot, "wizard");
      assert.deepStrictEqual(config.providerOptions, {
        thinking: { type: "enabled" },
      });
    },
  );
}

function testKimiEnabledThinkingRequiresOne(): void {
  withTempEnvFile(
    [
      "LLM_PROVIDER=openai-compatible",
      "OPENAI_BASE_URL=https://api.moonshot.cn/v1",
      "OPENAI_API_KEY=sk-test",
      "OPENAI_MODEL=kimi-k2.5",
      "LLM_WIZARD_THINKING=enabled",
      "LLM_WIZARD_TEMPERATURE=1",
    ].join("\n"),
    (projectRoot) => {
      const config = readLLMExecutionConfig(projectRoot, "wizard");
      assert.strictEqual(config.thinking, "enabled");
      assert.strictEqual(config.temperature, 1);
    },
  );
}

function testKimiRejectsWrongTemperature(): void {
  withTempEnvFile(
    [
      "LLM_PROVIDER=openai-compatible",
      "OPENAI_BASE_URL=https://api.moonshot.cn/v1",
      "OPENAI_API_KEY=sk-test",
      "OPENAI_MODEL=kimi-k2.5",
      "LLM_WIZARD_THINKING=enabled",
      "LLM_WIZARD_TEMPERATURE=0.6",
    ].join("\n"),
    (projectRoot) => {
      assert.throws(
        () => readLLMExecutionConfig(projectRoot, "wizard"),
        (error: unknown) =>
          error instanceof LLMConfigError &&
          error.message.includes("thinking=enabled") &&
          error.message.includes("temperature=1"),
      );
    },
  );

  withTempEnvFile(
    [
      "LLM_PROVIDER=openai-compatible",
      "OPENAI_BASE_URL=https://api.moonshot.cn/v1",
      "OPENAI_API_KEY=sk-test",
      "OPENAI_MODEL=kimi-k2.5",
      "LLM_GAP_FILL_THINKING=disabled",
      "LLM_GAP_FILL_TEMPERATURE=1",
    ].join("\n"),
    (projectRoot) => {
      assert.throws(
        () => readLLMExecutionConfig(projectRoot, "gap-fill"),
        (error: unknown) =>
          error instanceof LLMConfigError &&
          error.message.includes("thinking=disabled") &&
          error.message.includes("temperature=0.6"),
      );
    },
  );
}

function testKimiThinkingPayloadNoneDisablesValidationCoupling(): void {
  withTempEnvFile(
    [
      "LLM_PROVIDER=openai-compatible",
      "OPENAI_BASE_URL=https://api.moonshot.cn/v1",
      "OPENAI_API_KEY=sk-test",
      "OPENAI_MODEL=kimi-k2.5",
      "OPENAI_COMPAT_THINKING_PAYLOAD=none",
      "LLM_WIZARD_THINKING=enabled",
      "LLM_WIZARD_TEMPERATURE=0.2",
    ].join("\n"),
    (projectRoot) => {
      const config = readLLMExecutionConfig(projectRoot, "wizard");
      assert.strictEqual(config.temperature, 0.2);
      assert.strictEqual(config.providerOptions, undefined);
    },
  );
}

function testProcessEnvOverridesDotEnv(): void {
  const originalBaseUrl = process.env.OPENAI_BASE_URL;
  process.env.OPENAI_BASE_URL = "https://stale-process-env.example/v1";

  try {
    withTempEnvFile(
      [
        "LLM_PROVIDER=openai-compatible",
        "OPENAI_BASE_URL=https://api.moonshot.cn/v1",
        "OPENAI_API_KEY=sk-test",
        "OPENAI_MODEL=kimi-k2.5",
      ].join("\n"),
      (projectRoot) => {
        const env = readLLMEnvironment(projectRoot);
        assert.strictEqual(env.OPENAI_BASE_URL, "https://stale-process-env.example/v1");
      },
    );
  } finally {
    if (originalBaseUrl === undefined) {
      delete process.env.OPENAI_BASE_URL;
    } else {
      process.env.OPENAI_BASE_URL = originalBaseUrl;
    }
  }
}

function run(): void {
  const tests: Array<{ name: string; fn: () => void }> = [
    { name: "reads gap-fill workflow config from .env", fn: testGapFillWorkflowConfig },
    { name: "auto omits thinking payload for non-kimi openai-compatible models", fn: testOpenAICompatibleAutoOmitsThinkingPayloadForNonKimi },
    { name: "explicit thinking payload override forces type-object payload", fn: testOpenAICompatibleThinkingPayloadOverrideCanForceTypeObject },
    { name: "accepts kimi enabled thinking with temperature 1", fn: testKimiEnabledThinkingRequiresOne },
    { name: "rejects invalid kimi temperature combinations", fn: testKimiRejectsWrongTemperature },
    { name: "kimi payload=none disables thinking validation coupling", fn: testKimiThinkingPayloadNoneDisablesValidationCoupling },
    { name: "process env overrides .env for llm settings", fn: testProcessEnvOverridesDotEnv },
  ];

  let passed = 0;
  for (const test of tests) {
    test.fn();
    console.log(`PASS ${test.name}`);
    passed += 1;
  }

  console.log(`LLM config tests: ${passed} passed`);
}

run();
