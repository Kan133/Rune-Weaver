import { createHash } from "crypto";

import type { CLIInputProvenance, Dota2CLIOptions } from "../dota2-cli.js";

export function hashPrompt(prompt: string): string {
  return createHash("sha256")
    .update(prompt, "utf8")
    .digest("hex");
}

export function resolveReviewInputProvenance(
  options: Dota2CLIOptions,
): CLIInputProvenance | undefined {
  if (options.inputProvenance) {
    return options.inputProvenance;
  }

  if (!options.prompt) {
    return undefined;
  }

  return {
    requestedSubcommand: options.command,
    normalizedCommand: options.command,
    promptHash: hashPrompt(options.prompt),
  };
}
