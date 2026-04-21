import type {
  Blueprint,
  BlueprintModule,
  IntentSchema,
  PatternHint,
  ProposalConnection,
  ProposalModule,
  UIDesignSpec,
  UISurfaceSpec,
  UpdateIntent,
  ValidationContract,
  ValidationIssue,
} from "../schema/types";
import { CORE_PATTERN_IDS, isCanonicalPatternAvailable } from "../patterns/canonical-patterns";
import { getIntentGovernanceView } from "../wizard/intent-governance-view.js";
import {
  collectProposalBlockers,
  collectProposalIssues,
  getProposalStatus,
  getSchemaReadiness,
} from "./blueprint-status-policy";
import {
  buildEffectiveUpdateSchema,
} from "./builder-update-governance";
import {
  applyBlockingIssuesToNormalization,
  normalizeBlueprintProposal,
} from "./builder-finalization-policy";
import { buildBlueprintConnections } from "./builder-graph-assembly";
import { buildSemanticProjection } from "./builder-semantic-projection";
import { BlueprintBuildResult, BlueprintBuilderConfig } from "./types";
import { collectUpdateInvariantConflictIssues } from "./update-preservation.js";

function isPatternAvailable(patternId: string): boolean {
  return isCanonicalPatternAvailable(patternId);
}

export class BlueprintBuilder {
  private config: Required<BlueprintBuilderConfig>;

  constructor(config: BlueprintBuilderConfig = {}) {
    this.config = {
      autoConnect: true,
      enableUIBranch: true,
      modulePrefix: "mod_",
      ...config,
    };
  }

  build(schema: IntentSchema): BlueprintBuildResult {
    try {
      const draftBlueprint = this.doBuild(schema);
      const proposal = this.buildProposal(schema, draftBlueprint);
      const normalization = normalizeBlueprintProposal(schema, proposal, draftBlueprint);
      const finalBlueprint = normalization.finalBlueprint;
      const issues = [...normalization.report.issues];
      const canContinue = finalBlueprint.commitDecision?.canAssemble ?? finalBlueprint.status === "ready";

      return {
        success: canContinue,
        draftBlueprint,
        blueprint: finalBlueprint,
        finalBlueprint,
        blueprintProposal: proposal,
        normalizationReport: normalization.report,
        issues,
      };
    } catch (error) {
      const issues: ValidationIssue[] = [{
        code: "BLUEPRINT_BUILD_ERROR",
        scope: "blueprint",
        severity: "error",
        message: `鏋勫缓 Blueprint 鏃跺彂鐢熼敊璇? ${error instanceof Error ? error.message : String(error)}`,
        path: "builder",
      }];
      return { success: false, issues };
    }
  }

  buildUpdate(updateIntent: UpdateIntent): BlueprintBuildResult {
    try {
      const effectiveSchema = buildEffectiveUpdateSchema(updateIntent);
      const draftBlueprint = this.doBuild(effectiveSchema);
      const proposal = this.buildProposal(effectiveSchema, draftBlueprint);
      const normalization = normalizeBlueprintProposal(effectiveSchema, proposal, draftBlueprint);
      const invariantConflictIssues = collectUpdateInvariantConflictIssues(updateIntent);
      const adjustedNormalization = invariantConflictIssues.length > 0
        ? applyBlockingIssuesToNormalization(normalization, invariantConflictIssues)
        : normalization;
      const finalBlueprint = adjustedNormalization.finalBlueprint;
      const issues = [...adjustedNormalization.report.issues];
      const canContinue = finalBlueprint.commitDecision?.canAssemble ?? finalBlueprint.status === "ready";

      return {
        success: canContinue,
        draftBlueprint,
        blueprint: finalBlueprint,
        finalBlueprint,
        blueprintProposal: proposal,
        normalizationReport: adjustedNormalization.report,
        issues,
      };
    } catch (error) {
      const issues: ValidationIssue[] = [{
        code: "BLUEPRINT_UPDATE_BUILD_ERROR",
        scope: "blueprint",
        severity: "error",
        message: `鏋勫缓 Update Blueprint 鏃跺彂鐢熼敊璇? ${error instanceof Error ? error.message : String(error)}`,
        path: "builder.update",
      }];
      return { success: false, issues };
    }
  }

  private doBuild(schema: IntentSchema): Blueprint {
    const governance = getIntentGovernanceView(schema);
    const planning = buildSemanticProjection(schema, this.config.modulePrefix);
    const modules = planning.modules;
    const connections = this.config.autoConnect
      ? buildBlueprintConnections(modules)
      : [];
    const patternHints = this.buildPatternHints(schema);
    const uiDesignSpec = this.buildUIDesignSpec(schema);
    const validations = this.buildValidationContracts(schema);
    const assumptions = [...(schema.resolvedAssumptions || [])];

    return {
      id: this.generateBlueprintId(schema),
      version: "1.0",
      summary: schema.request.goal,
      sourceIntent: {
        intentKind: governance.intentKind,
        goal: schema.request.goal,
        normalizedMechanics: governance.mechanics,
      },
      modules,
      ...(planning.moduleFacets.length > 0 ? { moduleFacets: planning.moduleFacets } : {}),
      connections,
      patternHints,
      ...(uiDesignSpec ? { uiDesignSpec } : {}),
      assumptions,
      validations,
      readyForAssembly: modules.length > 0,
      parameters: (schema as IntentSchema & { parameters?: Record<string, unknown> }).parameters,
    };
  }

  private buildProposal(schema: IntentSchema, candidate: Blueprint) {
    const governance = getIntentGovernanceView(schema);
    const readiness = getSchemaReadiness(schema);
    const issues = collectProposalIssues(schema);
    const blockedBy = [...collectProposalBlockers(schema)];

    const proposedModules: ProposalModule[] = candidate.modules.map((module) => ({
      id: module.id,
      role: module.role,
      category: module.category,
      proposedPatternIds: module.patternIds || [],
      proposedParameters: module.parameters,
      missingPatterns: (module.patternIds || []).length === 0 && !this.isPolymorphicCategory(module.category),
      missingIntegration: module.category === "integration" && (!module.outputs || module.outputs.length === 0),
      missingOwnership: !module.role,
      missingCapability: this.isCapabilityWeak(module, schema),
    }));

    const proposedConnections: ProposalConnection[] = candidate.connections.map((connection) => ({
      from: connection.from,
      to: connection.to,
      purpose: connection.purpose,
      connectionType: this.inferProposalConnectionType(connection),
    }));

    return {
      id: `${candidate.id}_proposal`,
      source: "rule" as const,
      status: getProposalStatus(readiness, issues, blockedBy),
      sourceIntent: {
        goal: schema.request.goal,
        intentKind: governance.intentKind,
      },
      proposedModules,
      proposedConnections,
      confidence: this.getProposalConfidence(proposedModules, readiness),
      notes: [...(schema.resolvedAssumptions || [])],
      issues,
      uncertainties: schema.uncertainties?.map((item) => item.summary) || [],
      blockedBy,
      candidatePatternFamilies: this.collectCandidatePatternFamilies(candidate),
    };
  }

  private buildPatternHints(schema: IntentSchema): PatternHint[] {
    const governance = getIntentGovernanceView(schema);
    const hints: PatternHint[] = [];

    if (governance.mechanics.trigger) {
      const patterns = [CORE_PATTERN_IDS.INPUT_KEY_BINDING].filter(isPatternAvailable);
      if (patterns.length > 0) {
        hints.push({
          category: "input",
          suggestedPatterns: patterns,
          rationale: "Needs explicit trigger binding.",
        });
      }
    }

    if (governance.mechanics.candidatePool) {
      const patterns = [CORE_PATTERN_IDS.DATA_WEIGHTED_POOL].filter(isPatternAvailable);
      if (patterns.length > 0) {
        hints.push({
          category: "data",
          suggestedPatterns: patterns,
          rationale: "Needs weighted candidate-pool semantics.",
        });
      }
    }

    if (governance.mechanics.weightedSelection || governance.mechanics.playerChoice) {
      const patterns = [CORE_PATTERN_IDS.RULE_SELECTION_FLOW].filter(isPatternAvailable);
      if (patterns.length > 0) {
        hints.push({
          category: "rule",
          suggestedPatterns: patterns,
          rationale: governance.mechanics.playerChoice
            ? "Needs player choice / confirmation semantics."
            : "Needs weighted selection flow semantics.",
        });
      }
    }

    if (governance.mechanics.uiModal) {
      const patterns = [CORE_PATTERN_IDS.UI_SELECTION_MODAL].filter(isPatternAvailable);
      if (patterns.length > 0) {
        hints.push({
          category: "ui",
          suggestedPatterns: patterns,
          rationale: "Needs a modal UI surface.",
        });
      }
    }

    if (governance.mechanics.outcomeApplication) {
      hints.push({
        category: "effect",
        suggestedPatterns: [],
        rationale: "Needs outcome application semantics; final pattern remains resolver/assembly-owned.",
      });
    }

    if (governance.mechanics.resourceConsumption) {
      hints.push({
        category: "resource",
        suggestedPatterns: [],
        rationale: "Needs resource-consumption semantics; final pattern remains resolver/assembly-owned.",
      });
    }

    return hints;
  }

  private buildUIDesignSpec(schema: IntentSchema): UIDesignSpec | undefined {
    const governance = getIntentGovernanceView(schema);
    if (!this.config.enableUIBranch || !governance.ui.needed) {
      return undefined;
    }

    const surfaces: UISurfaceSpec[] = [];
    for (let i = 0; i < (governance.ui.surfaces || []).length; i += 1) {
      const surface = governance.ui.surfaces![i];
      surfaces.push({
        id: `surface_${i}`,
        type: this.inferSurfaceType(surface),
        purpose: surface,
      });
    }

    if (surfaces.length === 0) {
      return undefined;
    }

    return {
      surfaces,
      visualStyle: {
        tone: "game",
        density: "medium",
      },
    };
  }

  private inferSurfaceType(surface: string): UISurfaceSpec["type"] {
    const surfaceLower = surface.toLowerCase();
    if (surfaceLower.includes("modal") || surfaceLower.includes("selection")) {
      return "modal";
    }
    if (surfaceLower.includes("hint")) {
      return "hint";
    }
    if (surfaceLower.includes("panel")) {
      return "panel";
    }
    if (surfaceLower.includes("overlay")) {
      return "overlay";
    }
    return "hud";
  }

  private buildValidationContracts(schema: IntentSchema): ValidationContract[] {
    const contracts: ValidationContract[] = [];

    for (const patternId of schema.constraints.requiredPatterns || []) {
      contracts.push({
        scope: "assembly",
        rule: `蹇呴』浣跨敤 Pattern: ${patternId}`,
        severity: "error",
      });
    }

    for (const patternId of schema.constraints.forbiddenPatterns || []) {
      contracts.push({
        scope: "assembly",
        rule: `绂佹浣跨敤鐨?Pattern: ${patternId}`,
        severity: "error",
      });
    }

    contracts.push({
      scope: "blueprint",
      rule: "Blueprint 蹇呴』鍖呭惈鑷冲皯涓€涓ā鍧?",
      severity: "error",
    });

    contracts.push({
      scope: "assembly",
      rule: "闈炲鎬佹ā鍧楀繀椤荤粦瀹氬埌鍙敤 Pattern锛涘鎬佹ā鍧楋紙effect/resource/integration锛夊彲鐢?resolver/assembly 鍚庣画瑙ｆ瀽",
      severity: "warning",
    });

    return contracts;
  }

  private getProposalConfidence(
    modules: ProposalModule[],
    readiness: "ready" | "weak" | "blocked",
  ): "high" | "medium" | "low" {
    if (readiness === "blocked") {
      return "low";
    }
    if (readiness === "weak") {
      return "medium";
    }
    return modules.length >= 2 ? "high" : "medium";
  }

  private collectCandidatePatternFamilies(candidate: Blueprint): string[] {
    const families = new Set<string>();
    for (const hint of candidate.patternHints) {
      for (const patternId of hint.suggestedPatterns) {
        const family = patternId.split(".").slice(0, 2).join(".");
        if (family) {
          families.add(family);
        }
      }
    }
    return [...families];
  }

  private inferProposalConnectionType(connection: Blueprint["connections"][number]): string {
    if (connection.purpose.includes("瑙﹀彂")) {
      return "control";
    }
    if (connection.purpose.includes("鏁版嵁")) {
      return "data";
    }
    if (connection.purpose.includes("UI")) {
      return "visual";
    }
    return "implicit_sequence";
  }

  private isPolymorphicCategory(category: BlueprintModule["category"]): boolean {
    return category === "effect" || category === "resource" || category === "integration";
  }

  private isCapabilityWeak(module: BlueprintModule, schema: IntentSchema): boolean {
    if (module.category === "effect") {
      const hasEffects = (schema.effects?.operations || []).length > 0;
      const hasParameters = !!module.parameters && Object.keys(module.parameters).length > 0;
      return !hasEffects && !hasParameters;
    }
    if (module.category === "rule") {
      return !schema.selection?.mode && !(module.parameters && Object.keys(module.parameters).length > 0);
    }
    return false;
  }

  private generateBlueprintId(schema: IntentSchema): string {
    const prefix = getIntentGovernanceView(schema).intentKind.replace(/-/g, "_");
    const timestamp = Date.now().toString(36).slice(-4);
    return `${prefix}_${timestamp}`;
  }
}

export function buildBlueprint(
  schema: IntentSchema,
  config?: BlueprintBuilderConfig,
): BlueprintBuildResult {
  return new BlueprintBuilder(config).build(schema);
}

export function buildUpdateBlueprint(
  updateIntent: UpdateIntent,
  config?: BlueprintBuilderConfig,
): BlueprintBuildResult {
  return new BlueprintBuilder(config).buildUpdate(updateIntent);
}
