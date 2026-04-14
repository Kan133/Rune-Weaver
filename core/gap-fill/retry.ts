const TRANSIENT_PATTERNS = [
  /overloaded/i,
  /rate limit/i,
  /too many requests/i,
  /\b429\b/,
  /temporarily unavailable/i,
  /timeout/i,
  /timed out/i,
  /connection reset/i,
  /econnreset/i,
  /etimedout/i,
  /eai_again/i,
  /service unavailable/i,
];

const TRANSIENT_STATUS_CODES = new Set([408, 429, 500, 502, 503, 504]);

export function isTransientGapFillError(error: unknown): boolean {
  if (hasTransientStatusCode(error)) {
    return true;
  }

  const message = getGapFillErrorMessage(error);
  return TRANSIENT_PATTERNS.some((pattern) => pattern.test(message));
}

export function getGapFillRetryDelayMs(attemptIndex: number): number {
  const delays = [800, 1600];
  return delays[attemptIndex] ?? delays[delays.length - 1];
}

export async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export function getGapFillErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  if (error && typeof error === "object") {
    const record = error as Record<string, unknown>;
    if (typeof record.message === "string") {
      return record.message;
    }
  }

  return String(error);
}

function hasTransientStatusCode(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }

  const record = error as Record<string, unknown>;
  const status = record.status ?? record.statusCode;
  return typeof status === "number" && TRANSIENT_STATUS_CODES.has(status);
}
