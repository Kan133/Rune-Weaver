import type { SelectionCaseSpec } from "../../adapters/dota2/cases/selection-demo-registry.js";
import { KNOWN_LIMITATIONS } from "./config.js";
import type {
  CLIOptions,
  EvidenceArtifact,
  FullPipelineResult,
  SmokeResult,
  WriteExecutionResult,
} from "./types.js";

export interface ArtifactInput {
  caseSpec: SelectionCaseSpec;
  result: FullPipelineResult;
  smoke: SmokeResult;
  writeExecution: WriteExecutionResult | null;
  options: CLIOptions;
}

export function generateArtifact(input: ArtifactInput): EvidenceArtifact {
  const { caseSpec, result, smoke, writeExecution, options } = input;
  const {
    schema,
    blueprint,
    resolution,
    assemblyPlan,
    hostRealizationPlan,
    generatorRoutingPlan,
    writePlan,
    generatedFiles,
    wizardExtractedParams,
  } = result;

  const injectedKeys = caseSpec.smokeExpectations.wizardSpecificParams.filter((param) => param in wizardExtractedParams);

  return {
    meta: {
      generatedAt: new Date().toISOString(),
      fixtureVersion: "1.0",
      pipelineVersion: "4.0",
      caseId: caseSpec.caseId,
      hostRoot: options.host,
      evidenceDir: caseSpec.evidenceDir,
      writeMode: options.write ? "write" : "dry-run",
      stableFeatureId: caseSpec.featureId,
    },
    fixture: {
      prompt: caseSpec.prompt,
      objectKind: caseSpec.authoringParameters.objectKind,
      parameters: caseSpec.authoringParameters as Record<string, unknown>,
    },
    wizardExtraction: {
      params: wizardExtractedParams,
      caseSpecificParamsInjected: injectedKeys.length > 0,
      injectedKeys,
    },
    schema: {
      id: `${schema.request.nameHint || caseSpec.featureId}_schema`,
      intentKind: schema.classification.intentKind,
      isReadyForBlueprint: schema.isReadyForBlueprint,
      normalizedMechanics: schema.normalizedMechanics,
      parameters: schema.parameters as Record<string, unknown>,
    },
    blueprint: {
      id: blueprint.id,
      moduleCount: blueprint.modules.length,
      modules: blueprint.modules.map((module) => ({
        id: module.id,
        category: module.category,
        role: module.role,
        patternIds: module.patternIds,
        hasParameters: module.parameters !== undefined && Object.keys(module.parameters).length > 0,
      })),
      connections: blueprint.connections,
      patternHints: blueprint.patternHints,
    },
    patterns: {
      resolved: resolution.patterns.map((pattern) => ({
        patternId: pattern.patternId,
        role: pattern.role,
        priority: pattern.priority,
        source: pattern.source,
      })),
      unresolved: resolution.unresolved.map((item) => ({
        requestedId: item.requestedId,
        reason: item.reason,
      })),
      complete: resolution.complete,
    },
    assemblyPlan: assemblyPlan ? {
      blueprintId: assemblyPlan.blueprintId,
      selectedPatterns: assemblyPlan.selectedPatterns.map((pattern) => pattern.patternId),
      writeTargets: assemblyPlan.writeTargets,
      bridgeUpdates: assemblyPlan.bridgeUpdates.map((bridge) => ({
        target: bridge.target,
        file: bridge.file,
        action: bridge.action,
      })),
      readyForHostWrite: assemblyPlan.readyForHostWrite,
    } : null,
    hostRealization: hostRealizationPlan ? {
      version: hostRealizationPlan.version,
      host: hostRealizationPlan.host,
      sourceBlueprintId: hostRealizationPlan.sourceBlueprintId,
      units: hostRealizationPlan.units.map((unit) => ({
        id: unit.id,
        realizationType: unit.realizationType,
        hostTargets: unit.hostTargets,
        confidence: unit.confidence,
        sourcePatternIds: unit.sourcePatternIds,
      })),
      blockers: hostRealizationPlan.blockers,
    } : null,
    generatorRouting: generatorRoutingPlan ? {
      version: generatorRoutingPlan.version,
      host: generatorRoutingPlan.host,
      sourceBlueprintId: generatorRoutingPlan.sourceBlueprintId,
      routes: generatorRoutingPlan.routes.map((route) => ({
        id: route.id,
        generatorFamily: route.generatorFamily,
        routeKind: route.routeKind,
        hostTarget: route.hostTarget,
        sourcePatternIds: route.sourcePatternIds,
      })),
      warnings: generatorRoutingPlan.warnings,
      blockers: generatorRoutingPlan.blockers,
    } : null,
    writePlan: writePlan ? {
      id: writePlan.id,
      targetProject: writePlan.targetProject,
      entryCount: writePlan.entries.length,
      stats: writePlan.stats,
      entries: writePlan.entries.map((entry) => ({
        targetPath: entry.targetPath,
        contentType: entry.contentType,
        operation: entry.operation,
        sourcePattern: entry.sourcePattern,
        contentSummary: entry.contentSummary,
        generatorFamilyHint: entry.generatorFamilyHint,
        deferred: entry.deferred,
      })),
      deferredWarnings: writePlan.deferredWarnings || [],
    } : null,
    generatedContent: generatedFiles.map(({ entry, code }) => ({
      targetPath: entry.targetPath,
      language: code.language,
      exports: code.exports,
      contentPreview: code.content.substring(0, 200).replace(/\n/g, " "),
      hasDrawForSelection: code.content.includes("drawForSelection"),
      hasOutcomeEvidence: caseSpec.smokeExpectations.generatedContentIndicators.some((token) => code.content.includes(token)),
      hasPlaceholderEvidence:
        code.content.includes("placeholder") ||
        code.content.includes("empty_slot") ||
        code.content.includes("isPlaceholder"),
    })),
    writeExecution,
    smokeAssertions: {
      passed: smoke.passed,
      total: smoke.assertions.length,
      passedCount: smoke.assertions.filter((assertion) => assertion.passed).length,
      failed: smoke.assertions.filter((assertion) => !assertion.passed).map((assertion) => assertion.name),
      details: smoke.assertions,
    },
    knownLimitations: [...KNOWN_LIMITATIONS],
  };
}
