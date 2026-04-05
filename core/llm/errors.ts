/**
 * Rune Weaver - Core LLM Errors
 */

export class LLMConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LLMConfigError";
  }
}

export class LLMRequestError extends Error {
  readonly status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "LLMRequestError";
    this.status = status;
  }
}

export class LLMResponseParseError extends Error {
  readonly rawText?: string;

  constructor(message: string, rawText?: string) {
    super(message);
    this.name = "LLMResponseParseError";
    this.rawText = rawText;
  }
}
