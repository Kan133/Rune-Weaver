import { existsSync, mkdirSync, writeFileSync } from "fs";
import { join } from "path";

import type { IntentSchema, UpdateIntent } from "../../../core/schema/types.js";

export interface SemanticArtifactSummary {
  rootDir: string;
  intentSchemaPath?: string;
  requestedChangeIntentSchemaPath?: string;
  updateIntentPath?: string;
}

interface SemanticArtifactWriteContext {
  hostRoot: string;
  featureId: string;
  dryRun: boolean;
  reviewOutputDir: string;
}

function ensureDirectory(path: string): void {
  if (!existsSync(path)) {
    mkdirSync(path, { recursive: true });
  }
}

function resolveSemanticArtifactRoot(context: SemanticArtifactWriteContext): string {
  return context.dryRun
    ? join(context.reviewOutputDir, "semantic", context.featureId)
    : join(
        context.hostRoot,
        "game",
        "scripts",
        "src",
        "rune_weaver",
        "features",
        context.featureId,
        "artifacts",
        "semantic",
      );
}

function writeSemanticArtifact(
  outputPath: string,
  payload: Record<string, unknown>,
): void {
  writeFileSync(outputPath, JSON.stringify(payload, null, 2), "utf-8");
}

export function saveCreateSemanticArtifacts(
  context: SemanticArtifactWriteContext & {
    intentSchema: IntentSchema;
    commandKind: "create";
    generatedAt?: string;
  },
): SemanticArtifactSummary {
  const rootDir = resolveSemanticArtifactRoot(context);
  ensureDirectory(rootDir);

  const intentSchemaPath = join(rootDir, "intent-schema.create.json");
  writeSemanticArtifact(intentSchemaPath, {
    version: "1.0",
    generatedAt: context.generatedAt || new Date().toISOString(),
    commandKind: context.commandKind,
    featureId: context.featureId,
    intentSchema: context.intentSchema,
  });

  return {
    rootDir,
    intentSchemaPath,
  };
}

export function saveUpdateSemanticArtifacts(
  context: SemanticArtifactWriteContext & {
    requestedChangeIntentSchema: IntentSchema;
    updateIntent: UpdateIntent;
    commandKind: "update";
    generatedAt?: string;
  },
): SemanticArtifactSummary {
  const rootDir = resolveSemanticArtifactRoot(context);
  ensureDirectory(rootDir);

  const requestedChangeIntentSchemaPath = join(rootDir, "intent-schema.update.json");
  writeSemanticArtifact(requestedChangeIntentSchemaPath, {
    version: "1.0",
    generatedAt: context.generatedAt || new Date().toISOString(),
    commandKind: context.commandKind,
    featureId: context.featureId,
    revision: context.updateIntent.target.revision,
    intentSchema: context.requestedChangeIntentSchema,
  });

  const updateIntentPath = join(rootDir, "update-intent.json");
  writeSemanticArtifact(updateIntentPath, {
    version: "1.0",
    generatedAt: context.generatedAt || new Date().toISOString(),
    commandKind: context.commandKind,
    featureId: context.featureId,
    revision: context.updateIntent.target.revision,
    updateIntent: context.updateIntent,
  });

  return {
    rootDir,
    requestedChangeIntentSchemaPath,
    updateIntentPath,
  };
}
