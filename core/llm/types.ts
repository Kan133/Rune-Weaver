/**
 * Rune Weaver - Core LLM Types
 *
 * 鐢ㄤ簬绾︽潫 Rune Weaver 鍐呴儴鐨?LLM 鎺ュ彛銆?
 */

export interface LLMMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface LLMUsage {
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
}

export interface GenerateTextInput {
  messages: LLMMessage[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
  providerOptions?: Record<string, unknown>;
}

export interface GenerateTextResult {
  text: string;
  raw?: unknown;
  usage?: LLMUsage;
}

export interface GenerateObjectInput<T> {
  messages: LLMMessage[];
  schemaName: string;
  schemaDescription?: string;
  schema: unknown;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  providerOptions?: Record<string, unknown>;
}

export interface GenerateObjectResult<T> {
  object: T;
  rawText?: string;
  raw?: unknown;
  usage?: LLMUsage;
}

export type LLMThinkingMode = "enabled" | "disabled";
export type OpenAICompatibleThinkingPayloadMode = "auto" | "type-object" | "none";

export type LLMWorkflowKind =
  | "wizard"
  | "blueprint"
  | "dota2-planning"
  | "gap-fill"
  | "workbench-gap-fill";

export interface LLMExecutionConfig {
  model?: string;
  temperature?: number;
  providerOptions?: Record<string, unknown>;
  thinking?: LLMThinkingMode;
}

export interface LLMClient {
  generateText(input: GenerateTextInput): Promise<GenerateTextResult>;
  generateObject<T>(input: GenerateObjectInput<T>): Promise<GenerateObjectResult<T>>;
}

export type LLMProviderKind = "openai-compatible" | "anthropic";

export interface OpenAICompatibleConfig {
  provider: "openai-compatible";
  baseUrl: string;
  apiKey: string;
  model: string;
  timeoutMs?: number;
}

export interface AnthropicConfig {
  provider: "anthropic";
  baseUrl: string;
  apiKey: string;
  model: string;
}

export type LLMProviderConfig = OpenAICompatibleConfig | AnthropicConfig;
