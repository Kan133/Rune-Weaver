/**
 * Rune Weaver - LLM Factory
 */

import { existsSync, readFileSync } from "fs";
import { resolve } from "path";
import { LLMConfigError } from "./errors";
import {
  LLMClient,
  LLMProviderKind,
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

  for (const [key, value] of Object.entries(process.env)) {
    if (typeof value === "string") {
      result[key] = value;
    }
  }

  const envPath = resolve(projectRoot, ".env");
  if (!existsSync(envPath)) {
    return result;
  }

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

    if (!(key in result)) {
      result[key] = value;
    }
  }

  return result;
}
