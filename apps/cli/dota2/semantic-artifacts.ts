import { existsSync, mkdirSync, writeFileSync } from "fs";
import { join } from "path";

import type {
  Blueprint,
  FinalBlueprint,
  IntentSchema,
  UpdateIntent,
} from "../../../core/schema/types.js";
import type { IntentSemanticAnalysis } from "../../../core/wizard/index.js";
import type { CreateReadinessDecision } from "../../../adapters/dota2/blueprint/index.js";
import type { SemanticExportStatus } from "../dota2-cli.js";

export interface SemanticArtifactSummary {
  rootDir: string;
  intentSchemaPath?: string;
  requestedChangeIntentSchemaPath?: string;
  updateIntentPath?: string;
  blueprintPath?: string;
  finalBlueprintPath?: string;
}

export function createPendingSemanticExportStatus(
  reason = "Semantic artifacts were not written for this run.",
): SemanticExportStatus {
  return {
    written: false,
    reason,
  };
}

export function createWrittenSemanticExportStatus(
  summary: SemanticArtifactSummary,
): SemanticExportStatus {
  return {
    written: true,
    rootDir: summary.rootDir,
  };
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

function writeBlueprintArtifacts(
  rootDir: string,
  context: {
    commandKind: "create" | "update";
    featureId: string;
    generatedAt?: string;
    revision?: number;
    blueprint?: Blueprint;
    finalBlueprint?: FinalBlueprint;
  },
): Pick<SemanticArtifactSummary, "blueprintPath" | "finalBlueprintPath"> {
  const summary: Pick<SemanticArtifactSummary, "blueprintPath" | "finalBlueprintPath"> = {};

  if (context.blueprint) {
    const blueprintPath = join(rootDir, `blueprint.${context.commandKind}.json`);
    writeSemanticArtifact(blueprintPath, {
      version: "1.0",
      generatedAt: context.generatedAt || new Date().toISOString(),
      commandKind: context.commandKind,
      featureId: context.featureId,
      ...(typeof context.revision === "number" ? { revision: context.revision } : {}),
      blueprint: context.blueprint,
    });
    summary.blueprintPath = blueprintPath;
  }

  if (context.finalBlueprint) {
    const finalBlueprintPath = join(rootDir, `final-blueprint.${context.commandKind}.json`);
    writeSemanticArtifact(finalBlueprintPath, {
      version: "1.0",
      generatedAt: context.generatedAt || new Date().toISOString(),
      commandKind: context.commandKind,
      featureId: context.featureId,
      ...(typeof context.revision === "number" ? { revision: context.revision } : {}),
      finalBlueprint: context.finalBlueprint,
    });
    summary.finalBlueprintPath = finalBlueprintPath;
  }

  return summary;
}

export function saveCreateSemanticArtifacts(
  context: SemanticArtifactWriteContext & {
    intentSchema: IntentSchema;
    semanticAnalysis?: IntentSemanticAnalysis;
    createReadinessDecision?: CreateReadinessDecision;
    blueprint?: Blueprint;
    finalBlueprint?: FinalBlueprint;
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
    ...(context.semanticAnalysis ? { semanticAnalysis: context.semanticAnalysis } : {}),
    ...(context.createReadinessDecision ? { createReadinessDecision: context.createReadinessDecision } : {}),
  });

  return {
    rootDir,
    intentSchemaPath,
    ...writeBlueprintArtifacts(rootDir, context),
  };
}

export function saveUpdateSemanticArtifacts(
  context: SemanticArtifactWriteContext & {
    requestedChangeIntentSchema: IntentSchema;
    updateIntent: UpdateIntent;
    blueprint?: Blueprint;
    finalBlueprint?: FinalBlueprint;
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
    ...writeBlueprintArtifacts(rootDir, {
      ...context,
      revision: context.updateIntent.target.revision,
    }),
  };
}
