/**
 * Rune Weaver - Anthropic LLM Provider
 *
 * 褰撳墠闃舵鍙疄鐜版帴鍙ｅ崰浣嶏紝閬垮厤杩囨棭寮曞叆涓嶅繀瑕佺殑澶嶆潅搴︺€?
 */

import {
  GenerateObjectInput,
  GenerateObjectResult,
  GenerateTextInput,
  GenerateTextResult,
  LLMClient,
  AnthropicConfig,
} from "../types";
import { LLMRequestError } from "../errors";

export class AnthropicClient implements LLMClient {
  constructor(_config: AnthropicConfig) {
    void _config;
  }

  async generateText(_input: GenerateTextInput): Promise<GenerateTextResult> {
    throw new LLMRequestError(
      "Anthropic provider is not implemented yet. Use openai-compatible for the current phase."
    );
  }

  async generateObject<T>(
    _input: GenerateObjectInput
  ): Promise<GenerateObjectResult<T>> {
    throw new LLMRequestError(
      "Anthropic provider is not implemented yet. Use openai-compatible for the current phase."
    );
  }
}
