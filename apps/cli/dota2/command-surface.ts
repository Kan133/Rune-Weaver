import { existsSync, readFileSync } from "fs";

import type { CLIInputProvenance } from "../dota2-cli.js";
import { hashPrompt } from "./input-provenance.js";

const DOTA2_SUBCOMMAND_ALIASES = {
  create: "run",
} as const;

const KNOWN_DOTA2_SUBCOMMANDS = new Set([
  "run",
  "create",
  "dry-run",
  "review",
  "update",
  "regenerate",
  "rollback",
  "init",
  "check-host",
  "validate",
  "repair",
  "doctor",
  "gap-fill",
  "demo",
  "lifecycle",
  "launch",
]);

const PROMPT_CONSUMING_COMMANDS = new Set([
  "run",
  "dry-run",
  "review",
  "update",
  "regenerate",
]);

const FLAGS_WITH_VALUES = new Set([
  "--host",
  "--input",
  "-i",
  "--input-base64-env",
  "--feature",
  "--boundary",
  "--instruction",
  "--approve",
  "--mode",
  "--output",
  "-o",
  "--temperature",
  "--model",
  "--corpus",
  "--runs",
  "--addon-name",
  "--map",
  "--scenario",
]);

export type Dota2TopLevelSubcommand =
  | "run"
  | "dry-run"
  | "review"
  | "update"
  | "regenerate"
  | "rollback"
  | "init"
  | "check-host"
  | "validate"
  | "repair"
  | "doctor"
  | "gap-fill"
  | "demo"
  | "lifecycle"
  | "launch";

export interface Dota2CommandSurfaceInput {
  rawArgs: string[];
  requestedSubcommand?: string;
  input?: string;
  inputBase64Env?: string;
  host?: string;
  env?: NodeJS.ProcessEnv;
}

export interface Dota2CommandSurfaceResolution {
  requestedSubcommand: string;
  normalizedSubcommand: Dota2TopLevelSubcommand;
  prompt?: string;
  hostRoot?: string;
  inputProvenance: CLIInputProvenance;
}

function normalizeDota2Subcommand(subcommand?: string): Dota2TopLevelSubcommand | undefined {
  if (!subcommand) {
    return "run";
  }

  if (!KNOWN_DOTA2_SUBCOMMANDS.has(subcommand)) {
    return undefined;
  }

  return (DOTA2_SUBCOMMAND_ALIASES[subcommand as keyof typeof DOTA2_SUBCOMMAND_ALIASES] || subcommand) as Dota2TopLevelSubcommand;
}

function readPromptFromPath(promptCandidate: string): string {
  if (!existsSync(promptCandidate)) {
    return promptCandidate;
  }

  return readFileSync(promptCandidate, "utf8");
}

function extractFirstPromptPositional(commandArgs: string[]): string | undefined {
  for (let index = 0; index < commandArgs.length; index += 1) {
    const value = commandArgs[index];
    if (!value) {
      continue;
    }

    if (value.startsWith("-")) {
      if (FLAGS_WITH_VALUES.has(value)) {
        index += 1;
      }
      continue;
    }

    return value;
  }

  return undefined;
}

export function resolveDota2CommandSurface(
  input: Dota2CommandSurfaceInput,
): Dota2CommandSurfaceResolution {
  const requestedSubcommand = input.requestedSubcommand || "run";
  const normalizedSubcommand = normalizeDota2Subcommand(requestedSubcommand);
  if (!normalizedSubcommand) {
    throw new Error(`Unknown dota2 subcommand '${requestedSubcommand}'.`);
  }

  let promptSource: CLIInputProvenance["promptSource"];
  let prompt: string | undefined;
  const rawArgs = input.rawArgs || [];
  const argsAfterCommand = rawArgs[0] === "dota2" ? rawArgs.slice(1) : [...rawArgs];
  const commandArgs = argsAfterCommand[0] === requestedSubcommand
    ? argsAfterCommand.slice(1)
    : argsAfterCommand;

  if (PROMPT_CONSUMING_COMMANDS.has(normalizedSubcommand)) {
    const positionalPrompt = extractFirstPromptPositional(commandArgs);
    if (positionalPrompt) {
      prompt = positionalPrompt;
      promptSource = "positional";
    } else if (typeof input.input === "string" && input.input.length > 0) {
      prompt = input.input;
      promptSource = "--input";
    } else if (input.inputBase64Env) {
      const encodedPrompt = (input.env || process.env)[input.inputBase64Env];
      if (!encodedPrompt) {
        throw new Error(`Missing environment variable for --input-base64-env: ${input.inputBase64Env}`);
      }

      try {
        prompt = Buffer.from(encodedPrompt, "base64").toString("utf8");
      } catch (error) {
        throw new Error(
          `Failed to decode base64 prompt from environment variable '${input.inputBase64Env}': ${error instanceof Error ? error.message : String(error)}`,
        );
      }
      promptSource = "base64-env";
    }

    if (prompt) {
      prompt = readPromptFromPath(prompt);
    }
  }

  return {
    requestedSubcommand,
    normalizedSubcommand,
    ...(prompt ? { prompt } : {}),
    ...(input.host ? { hostRoot: input.host } : {}),
    inputProvenance: {
      requestedSubcommand,
      normalizedCommand: normalizedSubcommand,
      ...(promptSource ? { promptSource } : {}),
      ...(prompt ? { promptHash: hashPrompt(prompt) } : {}),
    },
  };
}
