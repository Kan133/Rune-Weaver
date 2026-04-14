import type {
  AssemblyPlan,
  Blueprint,
  GeneratorRoutingPlan,
  HostRealizationPlan,
  IntentSchema,
  ValidationIssue,
  WriteTarget,
} from "../../core/schema/types.js";
import type { PatternResolutionResult } from "../../core/patterns/resolver.js";
import type { WritePlan, WritePlanEntry } from "../../adapters/dota2/assembler/index.js";
import type { GeneratedCode } from "../../adapters/dota2/generator/index.js";
import type { WriteResult, WriteReviewArtifact } from "../../adapters/dota2/executor/index.js";

export interface FullPipelineResult {
  schema: IntentSchema;
  blueprint: Blueprint;
  resolution: PatternResolutionResult;
  assemblyPlan: AssemblyPlan | null;
  hostRealizationPlan: HostRealizationPlan | null;
  generatorRoutingPlan: GeneratorRoutingPlan | null;
  writePlan: WritePlan | null;
  generatedFiles: Array<{ entry: WritePlanEntry; code: GeneratedCode }>;
  issues: ValidationIssue[];
  wizardExtractedParams: Record<string, unknown>;
}

export interface SmokeResult {
  passed: boolean;
  assertions: Array<{ name: string; passed: boolean; message?: string }>;
}

export interface WriteModeConfig {
  mode: "dry-run" | "write";
  hostRoot: string;
  stableFeatureId: string;
  force: boolean;
}

export interface WriteExecutionResult {
  success: boolean;
  writeResult: WriteResult | null;
  review: WriteReviewArtifact | null;
  evidence: {
    filesCreated: string[];
    filesModified: string[];
    filesSkipped: string[];
    dryRunArtifacts: Array<{
      path: string;
      wouldCreate: boolean;
      preview: string;
    }>;
  };
}

export interface EvidenceArtifact {
  meta: {
    generatedAt: string;
    fixtureVersion: string;
    pipelineVersion: string;
    hostRoot: string;
    writeMode: "dry-run" | "write";
    stableFeatureId: string;
  };
  fixture: {
    prompt: string;
    parameters: Record<string, unknown>;
  };
  wizardExtraction: {
    params: Record<string, unknown>;
    talentDrawParamsInjected: boolean;
  };
  schema: {
    id: string;
    intentKind: string;
    isReadyForBlueprint: boolean;
    normalizedMechanics: Record<string, boolean>;
    parameters: Record<string, unknown>;
  };
  blueprint: {
    id: string;
    moduleCount: number;
    modules: Array<{
      id: string;
      category: string;
      role: string;
      patternIds?: string[];
      hasParameters: boolean;
    }>;
    connections: Array<{ from: string; to: string; purpose: string }>;
    patternHints: Array<{ category?: string; suggestedPatterns: string[] }>;
  };
  patterns: {
    resolved: Array<{
      patternId: string;
      role: string;
      priority: string;
      source: string;
    }>;
    unresolved: Array<{ requestedId: string; reason: string }>;
    complete: boolean;
  };
  assemblyPlan: {
    blueprintId: string;
    selectedPatterns: string[];
    writeTargets: WriteTarget[];
    bridgeUpdates: Array<{ target: string; file: string; action: string }>;
    readyForHostWrite: boolean;
  } | null;
  hostRealization: {
    version: string;
    host: string;
    sourceBlueprintId: string;
    units: Array<{
      id: string;
      realizationType: string;
      hostTargets: string[];
      confidence: string;
      sourcePatternIds: string[];
    }>;
    blockers: string[];
  } | null;
  generatorRouting: {
    version: string;
    host: string;
    sourceBlueprintId: string;
    routes: Array<{
      id: string;
      generatorFamily: string;
      routeKind: string;
      hostTarget: string;
      sourcePatternIds: string[];
    }>;
    warnings: string[];
    blockers: string[];
  } | null;
  writePlan: {
    id: string;
    targetProject: string;
    entryCount: number;
    stats: {
      total: number;
      create: number;
      update: number;
      conflicts: number;
      deferred: number;
    };
    entries: Array<{
      targetPath: string;
      contentType: string;
      operation: string;
      sourcePattern: string;
      contentSummary: string;
      generatorFamilyHint?: string;
      deferred?: boolean;
    }>;
    deferredWarnings: string[];
  } | null;
  generatedContent: Array<{
    targetPath: string;
    language: string;
    exports: string[];
    contentPreview: string;
    hasDrawForSelection: boolean;
    hasRarityBonus: boolean;
    hasPlaceholderEvidence: boolean;
  }>;
  writeExecution: WriteExecutionResult | null;
  smokeAssertions: {
    passed: boolean;
    total: number;
    passedCount: number;
    failed: string[];
    details: Array<{ name: string; passed: boolean; message?: string }>;
  };
  knownLimitations: string[];
}

export interface CLIOptions {
  host: string;
  write: boolean;
  force: boolean;
  verbose: boolean;
}
