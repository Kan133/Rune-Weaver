/**
 * Rune Weaver - OpenAI Compatible LLM Provider
 */

import {
  GenerateObjectInput,
  GenerateObjectResult,
  GenerateTextInput,
  GenerateTextResult,
  LLMClient,
  LLMMessage,
  OpenAICompatibleConfig,
} from "../types";
import { LLMRequestError, LLMResponseParseError } from "../errors";

interface OpenAICompatibleMessage {
  role: LLMMessage["role"];
  content: string;
}

interface OpenAICompatibleResponse {
  choices?: Array<{
    message?: {
      content?: string | Array<{ type?: string; text?: string }>;
    };
  }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
  error?: {
    message?: string;
  };
}

export class OpenAICompatibleClient implements LLMClient {
  constructor(private readonly config: OpenAICompatibleConfig) {}

  async generateText(input: GenerateTextInput): Promise<GenerateTextResult> {
    const payload = {
      model: input.model ?? this.config.model,
      messages: input.messages.map(toOpenAIMessage),
      temperature: input.temperature,
      max_tokens: input.maxTokens,
      ...input.providerOptions,
    };

    const response = await this.postChatCompletions(payload);
    const text = extractTextFromResponse(response);

    return {
      text,
      raw: response,
      usage: mapUsage(response.usage),
    };
  }

  async generateObject<T>(
    input: GenerateObjectInput<T>
  ): Promise<GenerateObjectResult<T>> {
    const schemaPrompt = buildObjectSchemaPrompt(
      input.schemaName,
      input.schemaDescription,
      input.schema
    );

    const response = await this.postChatCompletions({
      model: input.model ?? this.config.model,
      messages: [
        {
          role: "system",
          content: schemaPrompt,
        },
        ...input.messages.map(toOpenAIMessage),
      ],
      temperature: input.temperature,
      max_tokens: input.maxTokens,
      response_format: { type: "json_object" },
      ...input.providerOptions,
    });

    const rawText = extractTextFromResponse(response);

    try {
      const object = JSON.parse(extractJsonObject(rawText)) as T;
      return {
        object,
        rawText,
        raw: response,
        usage: mapUsage(response.usage),
      };
    } catch (error) {
      throw new LLMResponseParseError(
        `Failed to parse structured JSON response: ${
          error instanceof Error ? error.message : String(error)
        }`,
        rawText
      );
    }
  }

  private async postChatCompletions(payload: Record<string, unknown>) {
    const url = `${this.config.baseUrl.replace(/\/+$/, "")}/chat/completions`;

    let httpResponse: Response;
    try {
      httpResponse = await fetch(url, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify(payload),
      });
    } catch (error) {
      throw new LLMRequestError(
        `LLM request failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }

    let json: OpenAICompatibleResponse;
    try {
      json = (await httpResponse.json()) as OpenAICompatibleResponse;
    } catch (error) {
      throw new LLMRequestError(
        `LLM response was not valid JSON: ${
          error instanceof Error ? error.message : String(error)
        }`,
        httpResponse.status
      );
    }

    if (!httpResponse.ok) {
      throw new LLMRequestError(
        json.error?.message ?? `LLM request failed with status ${httpResponse.status}`,
        httpResponse.status
      );
    }

    return json;
  }
}

function toOpenAIMessage(message: LLMMessage): OpenAICompatibleMessage {
  return {
    role: message.role,
    content: message.content,
  };
}

function extractTextFromResponse(response: OpenAICompatibleResponse): string {
  const content = response.choices?.[0]?.message?.content;

  if (typeof content === "string") {
    return content;
  }

  if (Array.isArray(content)) {
    return content
      .map((item) => item.text ?? "")
      .join("")
      .trim();
  }

  throw new LLMResponseParseError("LLM response did not contain message content");
}

function buildObjectSchemaPrompt(
  schemaName: string,
  schemaDescription: string | undefined,
  schema: unknown
): string {
  const descriptionBlock = schemaDescription
    ? `Description: ${schemaDescription}\n`
    : "";

  return [
    "You are a strict JSON generator.",
    `Return only one valid JSON object for schema: ${schemaName}.`,
    descriptionBlock.trim(),
    "Do not wrap the JSON in markdown fences.",
    "Do not include commentary.",
    `Schema reference: ${JSON.stringify(schema, null, 2)}`,
  ]
    .filter(Boolean)
    .join("\n");
}

function extractJsonObject(text: string): string {
  const trimmed = text.trim();

  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    return trimmed;
  }

  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start >= 0 && end > start) {
    return trimmed.slice(start, end + 1);
  }

  throw new LLMResponseParseError("Could not locate JSON object in response", text);
}

function mapUsage(
  usage:
    | {
        prompt_tokens?: number;
        completion_tokens?: number;
        total_tokens?: number;
      }
    | undefined
) {
  if (!usage) {
    return undefined;
  }

  return {
    inputTokens: usage.prompt_tokens,
    outputTokens: usage.completion_tokens,
    totalTokens: usage.total_tokens,
  };
}
