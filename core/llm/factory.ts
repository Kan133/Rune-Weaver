/**
 * Rune Weaver - LLM Factory
 */

import { existsSync, readFileSync } from "fs";
import { resolve } from "path";
import { LLMConfigError } from "./errors";
import {
  LLMClient,
  LLMExecutionConfig,
  LLMThinkingMode,
  LLMProviderKind,
  LLMWorkflowKind,
  OpenAICompatibleThinkingPayloadMode,
  AnthropicConfig,
  OpenAICompatibleConfig,
} from "./types";
import { OpenAICompatibleClient } from "./providers/openai-compatible";
import { AnthropicClient } from "./providers/anthropic";

export function createLLMClientFromEnv(projectRoot: string = process.cwd()): LLMClient {
  const env = readLLMEnvironment(projectRoot);
  const provider = readRequired(env, "LLM_PROVIDER") as LLMProviderKind;

  switch (provider) {
    case "openai-compatible":
      return new OpenAICompatibleClient(readOpenAICompatibleConfig(env));
    case "anthropic":
      return new AnthropicClient(readAnthropicConfig(env));
    default:
      throw new LLMConfigError(
        `Unsupported LLM_PROVIDER: ${provider}. Expected openai-compatible or anthropic.`
      );
  }
}

export function isLLMConfigured(projectRoot: string = process.cwd()): boolean {
  try {
    const env = readLLMEnvironment(projectRoot);
    if (!env.LLM_PROVIDER) {
      return false;
    }
    if (env.LLM_PROVIDER === "openai-compatible") {
      return !!(env.OPENAI_BASE_URL && env.OPENAI_API_KEY && env.OPENAI_MODEL);
    }
    if (env.LLM_PROVIDER === "anthropic") {
      return !!(env.ANTHROPIC_API_KEY && env.ANTHROPIC_MODEL);
    }
    return false;
  } catch {
    return false;
  }
}

export function readLLMEnvironment(projectRoot: string = process.cwd()): Record<string, string> {
  return loadEnv(projectRoot);
}

const WORKFLOW_ENV_PREFIX: Record<LLMWorkflowKind, string> = {
  wizard: "LLM_WIZARD",
  blueprint: "LLM_BLUEPRINT",
  "dota2-planning": "LLM_DOTA2_PLANNING",
  "gap-fill": "LLM_GAP_FILL",
  "workbench-gap-fill": "LLM_WORKBENCH_GAP_FILL",
};

const DEFAULT_WORKFLOW_THINKING: Record<LLMWorkflowKind, LLMThinkingMode> = {
  wizard: "enabled",
  blueprint: "disabled",
  "dota2-planning": "enabled",
  "gap-fill": "disabled",
  "workbench-gap-fill": "disabled",
};

const DEFAULT_WORKFLOW_TEMPERATURE: Record<LLMWorkflowKind, number> = {
  wizard: 1,
  blueprint: 0.6,
  "dota2-planning": 1,
  "gap-fill": 0.6,
  "workbench-gap-fill": 0.6,
};

const DEFAULT_OPENAI_COMPAT_THINKING_PAYLOAD_MODE: OpenAICompatibleThinkingPayloadMode = "auto";
const KIMI_THINKING_MODEL_PATTERN = /^kimi-k2\.5/i;
const GLM_THINKING_MODEL_PATTERN = /^glm-4\.7/i;
const PROCESS_ENV_LLM_OVERRIDE_FLAG = "RW_LLM_PROCESS_ENV_OVERRIDES";

export function readLLMExecutionConfig(
  projectRoot: string = process.cwd(),
  workflow: LLMWorkflowKind,
): LLMExecutionConfig {
  const env = readLLMEnvironment(projectRoot);
  const provider = env.LLM_PROVIDER as LLMProviderKind | undefined;
  const model = readExecutionModel(env, provider);
  const prefix = WORKFLOW_ENV_PREFIX[workflow];
  const thinking = readThinkingMode(env[`${prefix}_THINKING`]) ?? DEFAULT_WORKFLOW_THINKING[workflow];
  const temperature = readWorkflowTemperature(env[`${prefix}_TEMPERATURE`], workflow);
  const openAICompatThinkingPayloadMode = readOpenAICompatibleThinkingPayloadMode(
    env.OPENAI_COMPAT_THINKING_PAYLOAD
  );
  const providerOptions = buildProviderOptions(
    provider,
    model,
    thinking,
    openAICompatThinkingPayloadMode
  );

  validateWorkflowConfig({
    provider,
    model,
    workflow,
    thinking,
    temperature,
    providerOptions,
  });

  return {
    model,
    temperature,
    thinking,
    providerOptions,
  };
}

export function maskLLMApiKey(apiKey: string | undefined): string | undefined {
  if (!apiKey) {
    return undefined;
  }

  if (apiKey.length <= 8) {
    return `${apiKey.slice(0, 2)}***${apiKey.slice(-2)}`;
  }

  return `${apiKey.slice(0, 4)}***${apiKey.slice(-4)}`;
}

function readThinkingMode(raw: string | undefined): LLMThinkingMode | undefined {
  if (!raw) {
    return undefined;
  }

  if (raw === "enabled" || raw === "disabled") {
    return raw;
  }

  throw new LLMConfigError(
    `Unsupported thinking mode '${raw}'. Expected 'enabled' or 'disabled'.`,
  );
}

function readOpenAICompatibleThinkingPayloadMode(
  raw: string | undefined
): OpenAICompatibleThinkingPayloadMode {
  if (!raw) {
    return DEFAULT_OPENAI_COMPAT_THINKING_PAYLOAD_MODE;
  }

  if (raw === "auto" || raw === "type-object" || raw === "none") {
    return raw;
  }

  throw new LLMConfigError(
    `Unsupported OPENAI_COMPAT_THINKING_PAYLOAD '${raw}'. Expected 'auto', 'type-object', or 'none'.`,
  );
}

function readWorkflowTemperature(
  raw: string | undefined,
  workflow: LLMWorkflowKind,
): number {
  if (!raw) {
    return DEFAULT_WORKFLOW_TEMPERATURE[workflow];
  }

  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) {
    throw new LLMConfigError(`Invalid temperature '${raw}' for workflow '${workflow}'.`);
  }

  return parsed;
}

function readExecutionModel(
  env: Record<string, string>,
  provider: LLMProviderKind | undefined
): string | undefined {
  if (provider === "anthropic") {
    return env.ANTHROPIC_MODEL;
  }

  if (provider === "openai-compatible") {
    return env.OPENAI_MODEL;
  }

  return env.OPENAI_MODEL || env.ANTHROPIC_MODEL;
}

function shouldSendThinkingPayload(
  provider: LLMProviderKind | undefined,
  model: string | undefined,
  mode: OpenAICompatibleThinkingPayloadMode
): boolean {
  if (provider !== "openai-compatible") {
    return false;
  }

  if (mode === "none") {
    return false;
  }

  if (mode === "type-object") {
    return true;
  }

  return !!model && (
    KIMI_THINKING_MODEL_PATTERN.test(model) ||
    GLM_THINKING_MODEL_PATTERN.test(model)
  );
}

function buildProviderOptions(
  provider: LLMProviderKind | undefined,
  model: string | undefined,
  thinking: LLMThinkingMode,
  thinkingPayloadMode: OpenAICompatibleThinkingPayloadMode
): Record<string, unknown> | undefined {
  if (!shouldSendThinkingPayload(provider, model, thinkingPayloadMode)) {
    return undefined;
  }

  return {
    thinking: { type: thinking },
  };
}

function validateWorkflowConfig(input: {
  provider: LLMProviderKind | undefined;
  model: string | undefined;
  workflow: LLMWorkflowKind;
  thinking: LLMThinkingMode;
  temperature: number;
  providerOptions?: Record<string, unknown>;
}): void {
  if (
    input.provider !== "openai-compatible" ||
    !input.model ||
    !KIMI_THINKING_MODEL_PATTERN.test(input.model) ||
    !(input.providerOptions && "thinking" in input.providerOptions)
  ) {
    return;
  }

  if (input.thinking === "enabled" && input.temperature !== 1) {
    throw new LLMConfigError(
      `Workflow '${input.workflow}' uses ${input.model} with thinking=enabled, which requires temperature=1.`,
    );
  }

  if (input.thinking === "disabled" && input.temperature !== 0.6) {
    throw new LLMConfigError(
      `Workflow '${input.workflow}' uses ${input.model} with thinking=disabled, which requires temperature=0.6.`,
    );
  }
}

function readOpenAICompatibleConfig(
  env: Record<string, string>
): OpenAICompatibleConfig {
  return {
    provider: "openai-compatible",
    baseUrl: readRequired(env, "OPENAI_BASE_URL"),
    apiKey: readRequired(env, "OPENAI_API_KEY"),
    model: readRequired(env, "OPENAI_MODEL"),
    timeoutMs: readOptionalPositiveNumber(env, "OPENAI_TIMEOUT_MS"),
  };
}

function readAnthropicConfig(env: Record<string, string>): AnthropicConfig {
  return {
    provider: "anthropic",
    baseUrl: env.ANTHROPIC_BASE_URL || "https://api.anthropic.com",
    apiKey: readRequired(env, "ANTHROPIC_API_KEY"),
    model: readRequired(env, "ANTHROPIC_MODEL"),
  };
}

function readRequired(env: Record<string, string>, key: string): string {
  const value = env[key];
  if (!value) {
    throw new LLMConfigError(`Missing required environment variable: ${key}`);
  }
  return value;
}

function readOptionalPositiveNumber(
  env: Record<string, string>,
  key: string
): number | undefined {
  const raw = env[key];
  if (!raw) {
    return undefined;
  }

  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return undefined;
  }

  return parsed;
}

function loadEnv(projectRoot: string): Record<string, string> {
  const result: Record<string, string> = {};
  const dotEnvKeys = new Set<string>();

  const envPath = resolve(projectRoot, ".env");
  if (existsSync(envPath)) {
    const content = readFileSync(envPath, "utf-8");
    for (const rawLine of content.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#")) {
        continue;
      }

      const separatorIndex = line.indexOf("=");
      if (separatorIndex <= 0) {
        continue;
      }

      const key = line.slice(0, separatorIndex).trim();
      let value = line.slice(separatorIndex + 1).trim();

      if (
        (value.startsWith("\"") && value.endsWith("\"")) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }

      result[key] = value;
      dotEnvKeys.add(key);
    }
  }

  const allowProcessLLMOverride = process.env[PROCESS_ENV_LLM_OVERRIDE_FLAG] === "1";
  for (const [key, value] of Object.entries(process.env)) {
    if (typeof value === "string") {
      if (!allowProcessLLMOverride && dotEnvKeys.has(key) && isManagedLLMEnvKey(key)) {
        continue;
      }
      result[key] = value;
    }
  }

  return result;
}

function isManagedLLMEnvKey(key: string): boolean {
  return (
    key === "LLM_PROVIDER" ||
    key === "OPENAI_BASE_URL" ||
    key === "OPENAI_API_KEY" ||
    key === "OPENAI_MODEL" ||
    key === "OPENAI_TIMEOUT_MS" ||
    key === "OPENAI_COMPAT_THINKING_PAYLOAD" ||
    key === "ANTHROPIC_BASE_URL" ||
    key === "ANTHROPIC_API_KEY" ||
    key === "ANTHROPIC_MODEL" ||
    key.startsWith("LLM_")
  );
}
