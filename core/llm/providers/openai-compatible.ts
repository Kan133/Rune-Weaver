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
      reasoning_content?: string;
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

    const response = await this.postChatCompletions(payload, input.timeoutMs);
    const text = extractTextFromResponse(response);

    return {
      text,
      raw: response,
      usage: mapUsage(response.usage),
    };
  }

  async generateObject<T>(
    input: GenerateObjectInput
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
    }, input.timeoutMs);

    const rawText = extractTextFromResponse(response);

    try {
      const object = parseStructuredJson<T>(rawText);
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

  protected async postChatCompletions(
    payload: Record<string, unknown>,
    timeoutOverrideMs?: number,
  ) {
    const url = `${this.config.baseUrl.replace(/\/+$/, "")}/chat/completions`;

    let httpResponse: Response;
    const controller = new AbortController();
    const timeoutMs = timeoutOverrideMs ?? this.config.timeoutMs ?? 30000;
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      httpResponse = await fetch(url, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === "AbortError") {
        throw new LLMRequestError(`LLM request timed out after ${timeoutMs} ms`);
      }
      throw new LLMRequestError(
        `LLM request failed: ${error instanceof Error ? error.message : String(error)}`
      );
    } finally {
      clearTimeout(timeoutId);
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
  const message = response.choices?.[0]?.message;
  const content = message?.content;
  const reasoning = message?.reasoning_content;

  if (typeof content === "string" && content.trim().length > 0) {
    return content;
  }

  if (Array.isArray(content) && content.length > 0) {
    const text = content
      .map((item) => item.text ?? "")
      .join("")
      .trim();
    if (text.length > 0) {
      return text;
    }
  }

  if (typeof reasoning === "string" && reasoning.trim().length > 0) {
    throw new LLMResponseParseError(
      "LLM response contained only reasoning content, no usable text response"
    );
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

function parseStructuredJson<T>(rawText: string): T {
  const jsonText = extractJsonObject(rawText);

  try {
    return JSON.parse(jsonText) as T;
  } catch (error) {
    const repairedJsonText = repairCommonJsonIssues(jsonText);
    if (repairedJsonText !== jsonText) {
      try {
        return JSON.parse(repairedJsonText) as T;
      } catch {
        // Fall through to the original parse error below so the message stays honest.
      }
    }

    throw error;
  }
}

function repairCommonJsonIssues(jsonText: string): string {
  let repaired = jsonText.trim().replace(/,\s*([}\]])/g, "$1");
  repaired = closeUnterminatedJsonStructures(repaired);
  return repaired;
}

function closeUnterminatedJsonStructures(text: string): string {
  const stack: string[] = [];
  let inString = false;
  let escaping = false;

  for (const char of text) {
    if (escaping) {
      escaping = false;
      continue;
    }

    if (char === "\\") {
      escaping = true;
      continue;
    }

    if (char === "\"") {
      inString = !inString;
      continue;
    }

    if (inString) {
      continue;
    }

    if (char === "{") {
      stack.push("}");
      continue;
    }

    if (char === "[") {
      stack.push("]");
      continue;
    }

    if ((char === "}" || char === "]") && stack[stack.length - 1] === char) {
      stack.pop();
    }
  }

  if (inString) {
    text += "\"";
  }

  if (stack.length > 0) {
    text += stack.reverse().join("");
  }

  return text;
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
