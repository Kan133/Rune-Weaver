/**
 * AssemblyPlan -> Dota2 UI Adapter Integration
 *
 * This layer recognizes UI patterns from AssemblyPlan, generates reviewable UI
 * artifacts through the Dota2 UI adapter, and reports write-integration
 * readiness without touching host files.
 */

import {
  AssemblyPlan,
  Blueprint,
  SelectedPattern,
  UIDesignSpec,
} from "../../../core/schema/types.js";
import { generateUIComponent } from "./generator.js";
import { generateUIIndex } from "./refresh-ui-index.js";
import {
  GeneratedUIComponent,
  GeneratedUIIndex,
  UIGenerationOptions,
} from "./types.js";

export interface UIPatternRecognition {
  hasUIPatterns: boolean;
  uiPatterns: SelectedPattern[];
  nonUiPatterns: SelectedPattern[];
}

export interface UnresolvedUIItem {
  patternId: string;
  reason: string;
  suggestedAlternative?: string;
}

export interface AssemblyGeneratedUIComponent extends GeneratedUIComponent {
  sourcePatternId: string;
}

export interface AssemblyUIResult {
  blueprintId: string;
  assemblyId: string;
  generatedComponents: AssemblyGeneratedUIComponent[];
  generatedIndex: GeneratedUIIndex;
  unresolvedItems: UnresolvedUIItem[];
  generatedAt: string;
}

export interface UIGeneratedFileSummary {
  fileName: string;
  fileType: "tsx" | "less";
  lineCount: number;
  patternId: string;
  featureFileName: string;
}

export interface UIReadinessGate {
  name: string;
  passed: boolean;
  severity: "error" | "warning";
  message: string;
}

export interface UIAssemblyReviewArtifact {
  version: string;
  blueprintId: string;
  assemblySummary: {
    id: string;
    patternCount: number;
    uiPatternCount: number;
  };
  selectedUiPatterns: Array<{
    patternId: string;
    role: string;
    supported: boolean;
  }>;
  uiDesignSpecSummary: {
    surfaceCount: number;
    density?: string;
    themeKeywords?: string[];
    tone?: string;
  };
  generatedFilesSummary: UIGeneratedFileSummary[];
  unresolvedItems: UnresolvedUIItem[];
  readyForWriteIntegration: boolean;
  readinessGates: UIReadinessGate[];
  generatedAt: string;
}

export const SUPPORTED_UI_PATTERNS = new Set<string>([
  "ui.selection_modal",
  "ui.key_hint",
  "ui.resource_bar",
]);

export function isUIPattern(patternId: string): boolean {
  return patternId.startsWith("ui.");
}

export function isSupportedUIPattern(patternId: string): boolean {
  return SUPPORTED_UI_PATTERNS.has(patternId);
}

export function recognizeUIPatterns(assemblyPlan: AssemblyPlan): UIPatternRecognition {
  const uiPatterns = assemblyPlan.selectedPatterns.filter((pattern) =>
    isUIPattern(pattern.patternId),
  );
  const nonUiPatterns = assemblyPlan.selectedPatterns.filter(
    (pattern) => !isUIPattern(pattern.patternId),
  );

  return {
    hasUIPatterns: uiPatterns.length > 0,
    uiPatterns,
    nonUiPatterns,
  };
}

export function generateUIFromAssembly(
  assemblyPlan: AssemblyPlan,
  blueprint: Blueprint | null,
  featureId: string,
): AssemblyUIResult {
  const recognition = recognizeUIPatterns(assemblyPlan);
  const generatedComponents: AssemblyGeneratedUIComponent[] = [];
  const unresolvedItems: UnresolvedUIItem[] = [];
  const designSpec = blueprint?.uiDesignSpec ?? createDefaultUIDesignSpec();

  // Track pattern instance counts for unique naming
  const patternInstanceCounts = new Map<string, number>();

  for (const pattern of recognition.uiPatterns) {
    if (!isSupportedUIPattern(pattern.patternId)) {
      unresolvedItems.push({
        patternId: pattern.patternId,
        reason: `Unsupported UI pattern: ${pattern.patternId}`,
        suggestedAlternative: getSuggestedAlternative(pattern.patternId),
      });
      continue;
    }

    try {
      // T068-T070-R2: Generate unique featureId for multiple instances of same pattern
      const instanceIndex = patternInstanceCounts.get(pattern.patternId) ?? 0;
      patternInstanceCounts.set(pattern.patternId, instanceIndex + 1);
      
      // Use role for disambiguation if available and results in non-empty string
      // Otherwise use index suffix for multiple instances
      const sanitizedRole = pattern.role ? sanitizeForFilename(pattern.role) : "";
      const roleSuffix = sanitizedRole.length > 0
        ? `_${sanitizedRole}`
        : instanceIndex > 0 
          ? `_${instanceIndex}` 
          : "";
      
      const uniqueFeatureId = `${featureId}_${pattern.patternId.replace("ui.", "")}${roleSuffix}`;

      const options: UIGenerationOptions = {
        featureId: uniqueFeatureId,
        patternId: pattern.patternId,
        blueprintId: blueprint?.id ?? assemblyPlan.blueprintId ?? "unknown",
        designSpec,
        assemblyData: pattern.parameters,
      };

      const component = generateUIComponent(options);
      generatedComponents.push({
        ...component,
        sourcePatternId: pattern.patternId,
      });
    } catch (error) {
      unresolvedItems.push({
        patternId: pattern.patternId,
        reason: `Generation failed: ${error instanceof Error ? error.message : String(error)}`,
      });
    }
  }

  const generatedIndex = generateUIIndex({
    features: generatedComponents.map((component) => ({
      featureId: component.fileName,
      componentName: toPascalCase(component.fileName),
    })),
  });

  return {
    blueprintId: blueprint?.id ?? assemblyPlan.blueprintId ?? "unknown",
    assemblyId: `assembly_${Date.now()}`,
    generatedComponents,
    generatedIndex,
    unresolvedItems,
    generatedAt: new Date().toISOString(),
  };
}

export function generateUIFromMultipleAssemblies(
  assemblyPlans: Array<{ plan: AssemblyPlan; blueprint: Blueprint | null; featureId: string }>,
): AssemblyUIResult[] {
  return assemblyPlans.map(({ plan, blueprint, featureId }) =>
    generateUIFromAssembly(plan, blueprint, featureId),
  );
}

export function checkUIReadinessGates(
  recognition: UIPatternRecognition,
  uiResult: AssemblyUIResult,
  designSpec?: UIDesignSpec,
): UIReadinessGate[] {
  const gates: UIReadinessGate[] = [];

  const allSupported = recognition.uiPatterns.every((pattern) =>
    isSupportedUIPattern(pattern.patternId),
  );
  gates.push({
    name: "ALL_UI_PATTERNS_SUPPORTED",
    passed: allSupported,
    severity: "error",
    message: allSupported
      ? "All UI patterns are supported"
      : `Unsupported UI patterns: ${recognition.uiPatterns
          .filter((pattern) => !isSupportedUIPattern(pattern.patternId))
          .map((pattern) => pattern.patternId)
          .join(", ")}`,
  });

  const specMappable = designSpec ? Boolean(designSpec.surfaces?.length) : true;
  gates.push({
    name: "UIDESIGNSPEC_MAPPABLE",
    passed: specMappable,
    severity: "warning",
    message: specMappable
      ? "UIDesignSpec can be mapped to templates"
      : "No UIDesignSpec provided, using defaults",
  });

  const generationSuccess = uiResult.generatedComponents.length > 0;
  gates.push({
    name: "TEMPLATE_GENERATION_SUCCESS",
    passed: generationSuccess,
    severity: "error",
    message: generationSuccess
      ? `${uiResult.generatedComponents.length} UI components generated`
      : "No UI components could be generated",
  });

  const indexSuccess = Boolean(uiResult.generatedIndex?.content?.length);
  gates.push({
    name: "INDEX_AGGREGATION_SUCCESS",
    passed: indexSuccess,
    severity: "error",
    message: indexSuccess ? "UI index generated successfully" : "Failed to generate UI index",
  });

  const noBlockingUnresolved = uiResult.unresolvedItems.length === 0;
  gates.push({
    name: "NO_BLOCKING_UNRESOLVED",
    passed: noBlockingUnresolved,
    severity: "error",
    message: noBlockingUnresolved
      ? "No unresolved UI items"
      : `${uiResult.unresolvedItems.length} unresolved: ${uiResult.unresolvedItems
          .map((item) => item.patternId)
          .join(", ")}`,
  });

  const dependenciesResolvable = uiResult.generatedComponents.every((component) =>
    component.dependencies.every((dependency) => isKnownDependency(dependency)),
  );
  gates.push({
    name: "DEPENDENCIES_RESOLVABLE",
    passed: dependenciesResolvable,
    severity: "warning",
    message: dependenciesResolvable
      ? "All component dependencies are resolvable"
      : "Some component dependencies may need manual resolution",
  });

  return gates;
}

export function generateUIReviewArtifact(
  assemblyPlan: AssemblyPlan,
  blueprint: Blueprint | null,
  uiResult: AssemblyUIResult,
): UIAssemblyReviewArtifact {
  const recognition = recognizeUIPatterns(assemblyPlan);
  const designSpec = blueprint?.uiDesignSpec;
  const readinessGates = checkUIReadinessGates(recognition, uiResult, designSpec);

  const blockingGateFailures = new Set([
    "ALL_UI_PATTERNS_SUPPORTED",
    "TEMPLATE_GENERATION_SUCCESS",
    "INDEX_AGGREGATION_SUCCESS",
    "NO_BLOCKING_UNRESOLVED",
  ]);

  const readyForWriteIntegration =
    uiResult.generatedComponents.length > 0 &&
    readinessGates.every(
      (gate) => !blockingGateFailures.has(gate.name) || gate.passed,
    );

  return {
    version: "1.0",
    blueprintId: blueprint?.id ?? assemblyPlan.blueprintId ?? "unknown",
    assemblySummary: {
      id: uiResult.assemblyId,
      patternCount: assemblyPlan.selectedPatterns.length,
      uiPatternCount: recognition.uiPatterns.length,
    },
    selectedUiPatterns: recognition.uiPatterns.map((pattern) => ({
      patternId: pattern.patternId,
      role: pattern.role || "unknown",
      supported: isSupportedUIPattern(pattern.patternId),
    })),
    uiDesignSpecSummary: {
      surfaceCount: designSpec?.surfaces?.length || 0,
      density: designSpec?.visualStyle?.density,
      themeKeywords: designSpec?.visualStyle?.themeKeywords,
      tone: designSpec?.visualStyle?.tone,
    },
    generatedFilesSummary: uiResult.generatedComponents.flatMap((component) => [
      {
        fileName: component.tsxFileName,
        fileType: "tsx" as const,
        lineCount: component.tsxContent.split("\n").length,
        patternId: component.sourcePatternId,
        featureFileName: component.fileName,
      },
      {
        fileName: component.lessFileName,
        fileType: "less" as const,
        lineCount: component.lessContent.split("\n").length,
        patternId: component.sourcePatternId,
        featureFileName: component.fileName,
      },
    ]),
    unresolvedItems: uiResult.unresolvedItems,
    readyForWriteIntegration,
    readinessGates,
    generatedAt: uiResult.generatedAt,
  };
}

function createDefaultUIDesignSpec(): UIDesignSpec {
  return {
    surfaces: [
      {
        id: "default",
        type: "modal",
        purpose: "Default UI surface",
        interactionMode: "blocking",
      },
    ],
    visualStyle: {
      density: "medium",
      tone: "formal",
    },
  };
}

function getSuggestedAlternative(patternId: string): string | undefined {
  const alternatives: Record<string, string> = {
    "ui.custom_modal": "ui.selection_modal",
    "ui.alert": "ui.selection_modal",
    "ui.tooltip": "ui.key_hint",
    "ui.status_bar": "ui.resource_bar",
  };

  return alternatives[patternId];
}

function isKnownDependency(dependency: string): boolean {
  const knownDependencies = new Set([
    "react",
    "react-panorama",
    "@dota2/panorama",
    "panorama-types",
  ]);

  return (
    knownDependencies.has(dependency) ||
    dependency.startsWith("./") ||
    dependency.startsWith("../")
  );
}

function toPascalCase(value: string): string {
  return value
    .split(/[-_]/)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1).toLowerCase())
    .join("");
}

/**
 * Sanitize a string to be safe for use in filenames.
 * Removes/replaces characters that are problematic in file paths.
 */
function sanitizeForFilename(value: string): string {
  return value
    .replace(/[\/\\:*?"<>|]/g, "") // Remove illegal filename characters
    .replace(/\s+/g, "_")           // Replace spaces with underscores
    .replace(/[^a-zA-Z0-9_\-]/g, "") // Keep only alphanumeric, underscore, hyphen
    .toLowerCase();
}
