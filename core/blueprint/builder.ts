/**
 * Rune Weaver - Blueprint Builder
 * 
 * 将 IntentSchema 转换为 Blueprint
 * 实现需求层到实现编排层的转换
 * 与 docs/SCHEMA.md 5.2 节对齐
 */

import {
  IntentSchema,
  Blueprint,
  BlueprintModule,
  BlueprintConnection,
  CommitDecision,
  DesignDraft,
  FeatureContract,
  FeatureDependencyEdge,
  FeatureMaturity,
  ImplementationStrategy,
  BlueprintNormalizationReport,
  BlueprintProposal,
  FinalBlueprint,
  ModuleNeed,
  ModuleFacetSpec,
  ProposalConnection,
  ProposalModule,
  NormalizedBlueprintStatus,
  IntentRequirement,
  ValidationContract,
  ValidationIssue,
  PatternHint,
  UIDesignSpec,
  UISurfaceSpec,
  UpdateIntent,
  ValidationStatus,
} from "../schema/types";
import { BlueprintBuilderConfig, BlueprintBuildResult } from "./types";
import { isCanonicalPatternAvailable, CORE_PATTERN_IDS } from "../patterns/canonical-patterns";
import {
  buildModuleNeeds,
  describeMechanicResponsibility,
  extractModuleParameters,
  getCanonicalPatternIds,
  inferCategoriesFromMechanics,
  inferCategoryFromRequirement,
  inferRoleFromCategory,
  resolveRequirementCategory,
  resolveRequirementParameters,
  resolveRequirementRole,
} from "./blueprint-semantic-shaping";
import {
  collectProposalBlockers,
  collectProposalIssues,
  getNormalizedStatus,
  getProposalStatus,
  getSchemaReadiness,
} from "./blueprint-status-policy";
import {
  assessSemanticCompleteness,
  classifySpawnEmissionRisk,
  classifySchedulerTimerRisk,
  detectFollowOwnerMotionSignals,
  detectSelectionFlowAsk,
} from "./seam-authority";
import type { SemanticAssessment } from "./seam-authority";
import { stripNegativeConstraintFragments } from "./semantic-lexical";
import { buildModulePlanning } from "./module-planning.js";
import { getIntentGovernanceView } from "../wizard/intent-governance-view.js";
import {
  applyUpdateRemovalDirectives,
  buildPreservedUpdateMechanics,
  buildPreservedUpdateSelection,
  collectUpdateInvariantConflictIssues,
  collectUpdateRemovalDirectives,
  filterUpdateFunctionalRequirements,
  filterUpdateTypedRequirements,
  mergeUpdateUISurfaces,
  resolveAuthoritativeUpdateChoiceCount,
  resolveAuthoritativeUpdateTriggerKey,
  resolveUpdatePreservationAuthority,
  shouldUseAuthoritativeSourceBackedUpdateProjection,
} from "./update-preservation.js";

function isPatternAvailable(patternId: string): boolean {
  return isCanonicalPatternAvailable(patternId);
}

/**
 * Blueprint Builder 类
 * 
 * 负责将澄清后的 IntentSchema 转换为实现编排蓝图
 */
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

  /**
   * 构建 Blueprint
   * @param schema 已验证的 IntentSchema
   * @returns 构建结果
   */
  build(
    schema: IntentSchema,
  ): BlueprintBuildResult {
    try {
      const draftBlueprint = this.doBuild(schema);
      const proposal = this.buildProposal(schema, draftBlueprint);
      const normalization = this.normalizeProposal(schema, proposal, draftBlueprint);
      const finalBlueprint = normalization.finalBlueprint;
      const issues = [...normalization.report.issues];
      const canContinue = finalBlueprint.commitDecision?.canAssemble ?? finalBlueprint.status === "ready";

      if (!canContinue) {
        return {
          success: false,
          draftBlueprint,
          blueprint: finalBlueprint,
          finalBlueprint,
          blueprintProposal: proposal,
          normalizationReport: normalization.report,
          issues,
        };
      }

      return {
        success: true,
        draftBlueprint,
        blueprint: finalBlueprint,
        finalBlueprint,
        blueprintProposal: proposal,
        normalizationReport: normalization.report,
        issues,
      };
    } catch (error) {
      const issues: ValidationIssue[] = [];
      issues.push({
        code: "BLUEPRINT_BUILD_ERROR",
        scope: "blueprint",
        severity: "error",
        message: `构建 Blueprint 时发生错误: ${error instanceof Error ? error.message : String(error)}`,
        path: "builder",
      });
      return { success: false, issues };
    }
  }

  /**
   * 执行构建
   */
  private doBuild(schema: IntentSchema): Blueprint {
    const governance = getIntentGovernanceView(schema);
    const planning = this.buildModules(schema);
    const modules = planning.modules;
    const connections = this.config.autoConnect
      ? this.buildConnections(modules)
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
      ...(uiDesignSpec && { uiDesignSpec }),
      assumptions,
      validations,
      readyForAssembly: modules.length > 0,
      // T138-R1: Pass through parameters from IntentSchema
      parameters: (schema as any).parameters,
    };
  }

  private buildProposal(
    schema: IntentSchema,
    candidate: Blueprint,
  ): BlueprintProposal {
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
      source: "rule",
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

  buildUpdate(
    updateIntent: UpdateIntent,
  ): BlueprintBuildResult {
    try {
      const effectiveSchema = this.buildEffectiveUpdateSchema(updateIntent);
      const draftBlueprint = this.doBuild(effectiveSchema);
      const proposal = this.buildProposal(effectiveSchema, draftBlueprint);
      const normalization = this.normalizeProposal(effectiveSchema, proposal, draftBlueprint);
      const invariantConflictIssues = collectUpdateInvariantConflictIssues(updateIntent);
      const adjustedNormalization = invariantConflictIssues.length > 0
        ? this.applyBlockingIssues(normalization, invariantConflictIssues)
        : normalization;
      const finalBlueprint = adjustedNormalization.finalBlueprint;
      const issues = [...adjustedNormalization.report.issues];
      const canContinue = finalBlueprint.commitDecision?.canAssemble ?? finalBlueprint.status === "ready";

      if (!canContinue) {
        return {
          success: false,
          draftBlueprint,
          blueprint: finalBlueprint,
          finalBlueprint,
          blueprintProposal: proposal,
          normalizationReport: adjustedNormalization.report,
          issues,
        };
      }

      return {
        success: true,
        draftBlueprint,
        blueprint: finalBlueprint,
        finalBlueprint,
        blueprintProposal: proposal,
        normalizationReport: adjustedNormalization.report,
        issues,
      };
    } catch (error) {
      const issues: ValidationIssue[] = [];
      issues.push({
        code: "BLUEPRINT_UPDATE_BUILD_ERROR",
        scope: "blueprint",
        severity: "error",
        message: `构建 Update Blueprint 时发生错误: ${error instanceof Error ? error.message : String(error)}`,
        path: "builder.update",
      });
      return { success: false, issues };
    }
  }

  private normalizeProposal(
    schema: IntentSchema,
    proposal: BlueprintProposal,
    candidate: Blueprint,
  ): { finalBlueprint: FinalBlueprint; report: BlueprintNormalizationReport } {
    const modules = this.canonicalizeModules(candidate.modules);
    const connections = this.canonicalizeConnections(candidate.connections, modules);
    const moduleFacets = candidate.moduleFacets || [];
    const moduleNeeds = buildModuleNeeds(schema, modules, moduleFacets);
    const assessment = assessSemanticCompleteness(schema, modules, moduleNeeds, proposal, moduleFacets);
    const preliminaryStatus = getNormalizedStatus(schema, proposal, modules, assessment);
    const status: NormalizedBlueprintStatus = preliminaryStatus;
    const issues = this.collectNormalizationIssues(
      schema,
      proposal,
      modules,
      moduleNeeds,
      status,
      assessment,
    );
    const blockers = issues
      .filter((issue) => issue.severity === "error")
      .map((issue) => issue.message);
    const designDraft = this.buildDesignDraft(candidate, proposal, assessment, status);
    const implementationStrategy = designDraft.chosenImplementationStrategy;
    const featureContract = this.buildFeatureContract(schema);
    const dependencyEdges = this.buildDependencyEdges(schema);
    const validationStatus = this.buildValidationStatus(status, issues);
    const commitDecision = this.buildCommitDecision(
      status,
      implementationStrategy,
      issues,
      assessment,
    );
    const maturity = this.determineFeatureMaturity(implementationStrategy, status);

    const finalBlueprint: FinalBlueprint = {
      ...candidate,
      modules,
      ...(moduleFacets.length > 0 ? { moduleFacets } : {}),
      connections,
      parameters: candidate.parameters,
      status,
      moduleNeeds,
      proposalId: proposal.id,
      readyForAssembly: commitDecision.canAssemble,
      designDraft,
      maturity,
      implementationStrategy,
      featureContract,
      validationStatus,
      dependencyEdges,
      commitDecision,
    };

    const report: BlueprintNormalizationReport = {
      status,
      notes: [...proposal.notes, ...assessment.notes, ...(designDraft.notes || [])],
      issues,
      blockers,
    };

    return { finalBlueprint, report };
  }

  private buildDesignDraft(
    candidate: Blueprint,
    proposal: BlueprintProposal,
    assessment: SemanticAssessment,
    status: NormalizedBlueprintStatus,
  ): DesignDraft {
    const retrievedPatternCandidates = Array.from(
      new Set([
        ...candidate.patternHints.flatMap((hint) => hint.suggestedPatterns || []),
        ...proposal.proposedModules.flatMap((module) => module.proposedPatternIds || []),
      ]),
    );
    const retrievedFamilyCandidates = Array.from(
      new Set(proposal.candidatePatternFamilies || []),
    );
    const chosenImplementationStrategy = this.determineImplementationStrategy(
      status,
      retrievedFamilyCandidates,
      retrievedPatternCandidates,
    );

    return {
      retrievedFamilyCandidates,
      retrievedPatternCandidates,
      reuseConfidence: this.determineReuseConfidence(
        retrievedFamilyCandidates,
        retrievedPatternCandidates,
      ),
      chosenImplementationStrategy,
      artifactTargets: this.deriveArtifactTargets(candidate),
      notes: assessment.warnings,
    };
  }

  private determineImplementationStrategy(
    status: NormalizedBlueprintStatus,
    families: string[],
    patterns: string[],
  ): ImplementationStrategy {
    if (families.length > 0 && status === "ready") {
      return "family";
    }
    if (patterns.length > 0 && status === "ready") {
      return "pattern";
    }
    if (patterns.length > 0) {
      return "guided_native";
    }
    return "exploratory";
  }

  private determineReuseConfidence(
    families: string[],
    patterns: string[],
  ): DesignDraft["reuseConfidence"] {
    if (families.length > 0) {
      return "high";
    }
    if (patterns.length > 0) {
      return "medium";
    }
    return "low";
  }

  private deriveArtifactTargets(candidate: Blueprint): string[] {
    const targets = new Set<string>(["server"]);

    if (candidate.modules.some((module) => module.category === "ui")) {
      targets.add("ui");
    }

    if (candidate.modules.some((module) => module.category === "effect")) {
      targets.add("lua");
      targets.add("config");
    }

    if (candidate.modules.some((module) => module.category === "data")) {
      targets.add("shared");
    }

    return Array.from(targets);
  }

  private buildFeatureContract(schema: IntentSchema): FeatureContract {
    const exports = new Map<string, FeatureContract["exports"][number]>();
    const consumes = new Map<string, FeatureContract["consumes"][number]>();
    const integrationSurfaces = new Set<string>();
    const stateScopes: FeatureContract["stateScopes"] = (schema.stateModel?.states || []).map((state) => ({
      stateId: state.id,
      scope:
        state.lifetime === "persistent"
          ? "persistent"
          : state.lifetime === "session"
            ? "session"
            : "local",
      owner:
        state.owner === "external"
          ? "external"
          : state.owner === "session"
            ? "shared"
            : "feature",
      summary: state.summary,
    }));

    for (const state of schema.stateModel?.states || []) {
      exports.set(state.id, {
        id: state.id,
        kind: "state",
        summary: state.summary,
      });
    }

    for (const binding of schema.integrations?.expectedBindings || []) {
      integrationSurfaces.add(binding.id);
      exports.set(binding.id, {
        id: binding.id,
        kind: "integration",
        summary: binding.summary,
      });
    }

    for (const requirement of schema.requirements.typed || []) {
      consumes.set(requirement.id, {
        id: requirement.id,
        kind: this.mapRequirementToContractSurface(requirement.kind),
        summary: requirement.summary,
      });
    }

    for (const dependency of schema.composition?.dependencies || []) {
      const dependencyId = dependency.target || `${dependency.kind}:${dependency.relation}`;
      consumes.set(dependencyId, {
        id: dependencyId,
        kind: dependency.kind === "cross-feature" ? "integration" : "capability",
        summary: `Consumes dependency via ${dependency.relation}`,
      });
    }

    return {
      exports: Array.from(exports.values()),
      consumes: Array.from(consumes.values()),
      integrationSurfaces: Array.from(integrationSurfaces),
      stateScopes,
    };
  }

  private buildDependencyEdges(schema: IntentSchema): FeatureDependencyEdge[] {
    return (schema.composition?.dependencies || []).map((dependency) => ({
      relation: this.normalizeDependencyRelation(dependency.relation),
      targetFeatureId: dependency.kind === "cross-feature" ? dependency.target : undefined,
      targetSurfaceId: dependency.target,
      required: dependency.required,
      summary: `${dependency.kind}:${dependency.relation}${dependency.target ? `:${dependency.target}` : ""}`,
    }));
  }

  private normalizeDependencyRelation(
    relation: string,
  ): FeatureDependencyEdge["relation"] {
    switch (relation) {
      case "reads":
      case "writes":
      case "triggers":
      case "grants":
        return relation;
      case "syncs-with":
        return "syncs_with";
      default:
        return "reads";
    }
  }

  private buildValidationStatus(
    status: NormalizedBlueprintStatus,
    issues: ValidationIssue[],
  ): ValidationStatus {
    const warnings = issues
      .filter((issue) => issue.severity === "warning")
      .map((issue) => issue.message);
    const blockers = issues
      .filter((issue) => issue.severity === "error")
      .map((issue) => issue.message);

    return {
      status:
        blockers.length > 0
          ? "failed"
          : status === "weak" || warnings.length > 0
            ? "needs_review"
            : "unvalidated",
      warnings,
      blockers,
    };
  }

  private buildCommitDecision(
    status: NormalizedBlueprintStatus,
    implementationStrategy: ImplementationStrategy,
    issues: ValidationIssue[],
    assessment: SemanticAssessment,
  ): CommitDecision {
    const errors = issues
      .filter((issue) => issue.severity === "error")
      .map((issue) => issue.message);
    const warnings = issues
      .filter((issue) => issue.severity === "warning")
      .map((issue) => issue.message);

    if (status === "blocked" || errors.length > 0) {
      return {
        outcome: "blocked",
        canAssemble: false,
        canWriteHost: false,
        requiresReview: true,
        reasons: errors.length > 0 ? errors : assessment.blockers,
      };
    }

    const isExploratory =
      status === "weak"
      || implementationStrategy === "exploratory"
      || implementationStrategy === "guided_native";

    return {
      outcome: isExploratory ? "exploratory" : "committable",
      canAssemble: true,
      canWriteHost: true,
      requiresReview: isExploratory || warnings.length > 0,
      reasons: [...warnings, ...assessment.notes],
    };
  }

  private determineFeatureMaturity(
    implementationStrategy: ImplementationStrategy,
    status: NormalizedBlueprintStatus,
  ): FeatureMaturity {
    if (status === "weak" || implementationStrategy === "exploratory") {
      return "exploratory";
    }
    if (implementationStrategy === "guided_native") {
      return "stabilized";
    }
    return "templated";
  }

  private mapRequirementToContractSurface(
    kind: IntentRequirement["kind"],
  ): FeatureContract["exports"][number]["kind"] {
    switch (kind) {
      case "trigger":
      case "rule":
        return "event";
      case "state":
        return "state";
      case "resource":
        return "data";
      case "integration":
        return "integration";
      default:
        return "capability";
    }
  }

  private buildEffectiveUpdateSchema(
    updateIntent: UpdateIntent,
  ): IntentSchema {
    const requestedChange = updateIntent.requestedChange;
    const currentFeatureContext = updateIntent.currentFeatureContext;
    const preservationAuthority = resolveUpdatePreservationAuthority(currentFeatureContext);
    const removalDirectives = collectUpdateRemovalDirectives(updateIntent);
    const preservedModuleRoles = applyUpdateRemovalDirectives(
      preservationAuthority.preservedRoles,
      preservationAuthority.sourceBackedInvariantRoles,
      removalDirectives,
    );
    const choiceCount = resolveAuthoritativeUpdateChoiceCount(updateIntent);
    const triggerKey = resolveAuthoritativeUpdateTriggerKey(updateIntent);
    const collapsePatternOwnedState = this.shouldCollapsePatternOwnedState(
      requestedChange,
      preservedModuleRoles,
    );
    const useAuthoritativeSourceBackedProjection = shouldUseAuthoritativeSourceBackedUpdateProjection(
      updateIntent,
      preservationAuthority,
      removalDirectives,
    );
    const mergedFunctional = useAuthoritativeSourceBackedProjection
      ? []
      : Array.from(
          new Set(
            filterUpdateFunctionalRequirements(
              requestedChange.requirements.functional || [],
              currentFeatureContext,
            ),
          ),
        );
    const mergedTypedRequirements = useAuthoritativeSourceBackedProjection
      ? []
      : filterUpdateTypedRequirements(
          requestedChange.requirements.typed || [],
          currentFeatureContext,
        );
    const mergedSurfaces = mergeUpdateUISurfaces(
      requestedChange,
      preservedModuleRoles,
      preservationAuthority.sourceBackedInvariantRoles,
      removalDirectives,
    );

    return {
      ...requestedChange,
      request: {
        ...requestedChange.request,
        goal: requestedChange.request.goal || `Update feature ${updateIntent.target.featureId}`,
      },
      classification: {
        ...requestedChange.classification,
        intentKind:
          requestedChange.classification.intentKind === "unknown"
            ? (currentFeatureContext.intentKind as IntentSchema["classification"]["intentKind"])
            : requestedChange.classification.intentKind,
      },
      requirements: {
        ...requestedChange.requirements,
        functional: mergedFunctional,
        typed: collapsePatternOwnedState
          ? mergedTypedRequirements.filter((requirement) => requirement.kind !== "state")
          : mergedTypedRequirements,
      },
      constraints: {
        ...(requestedChange.constraints || {}),
      },
      selection: buildPreservedUpdateSelection(
        requestedChange,
        preservedModuleRoles,
        preservationAuthority.sourceBackedInvariantRoles,
        choiceCount,
        removalDirectives,
      ),
      uiRequirements: mergedSurfaces.length > 0
        ? {
            ...(requestedChange.uiRequirements || {}),
            needed: true,
            surfaces: mergedSurfaces,
          }
        : removalDirectives.removeUi && !preservationAuthority.sourceBackedInvariantRoles.includes("selection_modal")
          ? {
              ...(requestedChange.uiRequirements || {}),
              needed: false,
              surfaces: [],
            }
          : requestedChange.uiRequirements,
      stateModel: useAuthoritativeSourceBackedProjection
        ? undefined
        : collapsePatternOwnedState
          ? undefined
          : requestedChange.stateModel,
      composition: useAuthoritativeSourceBackedProjection
        ? undefined
        : requestedChange.composition,
      integrations: useAuthoritativeSourceBackedProjection
        ? undefined
        : requestedChange.integrations,
      normalizedMechanics: buildPreservedUpdateMechanics(
        requestedChange,
        preservedModuleRoles,
        preservationAuthority.sourceBackedInvariantRoles,
        removalDirectives,
      ),
      parameters: {
        ...(requestedChange.parameters || {}),
        ...(triggerKey ? { triggerKey } : {}),
        ...(typeof choiceCount === "number" ? { choiceCount } : {}),
      },
      resolvedAssumptions: Array.from(
        new Set([
          ...(requestedChange.resolvedAssumptions || []),
          ...updateIntent.resolvedAssumptions,
          ...(useAuthoritativeSourceBackedProjection
            ? [
                "Authoritative source-backed bounded update projection is active; preserved structure comes from current feature truth rather than re-derived update prose.",
              ]
            : []),
        ]),
      ),
    };
  }

  private shouldCollapsePatternOwnedState(
    requestedChange: IntentSchema,
    preservedModuleRoles: string[],
  ): boolean {
    if (requestedChange.selection?.inventory?.enabled !== true) {
      return false;
    }

    return preservedModuleRoles.includes("weighted_pool")
      || preservedModuleRoles.includes("selection_flow");
  }

  private applyBlockingIssues(
    normalization: { finalBlueprint: FinalBlueprint; report: BlueprintNormalizationReport },
    additionalIssues: ValidationIssue[],
  ): { finalBlueprint: FinalBlueprint; report: BlueprintNormalizationReport } {
    if (additionalIssues.length === 0) {
      return normalization;
    }

    const issues = [...normalization.report.issues, ...additionalIssues];
    const blockers = Array.from(
      new Set([
        ...normalization.report.blockers,
        ...additionalIssues
          .filter((issue) => issue.severity === "error")
          .map((issue) => issue.message),
      ]),
    );

    return {
      finalBlueprint: {
        ...normalization.finalBlueprint,
        status: "blocked",
        readyForAssembly: false,
        validationStatus: this.buildValidationStatus("blocked", issues),
        commitDecision: {
          outcome: "blocked",
          canAssemble: false,
          canWriteHost: false,
          requiresReview: true,
          reasons: blockers,
          stage: "blueprint",
        },
      },
      report: {
        ...normalization.report,
        status: "blocked",
        issues,
        blockers,
      },
    };
  }

  /**
   * 根据需求构建模块
   */
  private buildModules(
    schema: IntentSchema,
  ): { modules: BlueprintModule[]; moduleFacets: ModuleFacetSpec[] } {
    return buildModulePlanning(
      schema,
      this.buildFlatModules(schema),
      this.config.modulePrefix,
    );
  }

  private buildFlatModules(schema: IntentSchema): BlueprintModule[] {
    const governance = getIntentGovernanceView(schema);
    const modules: BlueprintModule[] = [];
    const prefix = this.config.modulePrefix;
    const schemaParams = this.getSchemaParameters(schema);
    const typedRequirements = schema.requirements.typed || [];

    if (typedRequirements.length > 0) {
      for (let i = 0; i < typedRequirements.length; i++) {
        const req = typedRequirements[i];
        const module = this.createTypedRequirementModule(req, i, prefix, schemaParams, schema);
        if (module) {
          this.upsertModule(modules, module);
        }
      }
    }

    for (let i = 0; i < schema.requirements.functional.length; i++) {
      const req = schema.requirements.functional[i];
      const module = this.createFunctionalModule(req, i, prefix, schemaParams);
      if (module) {
        this.upsertModule(modules, module);
      }
    }

    this.addMechanicModules(schema, modules, prefix, schemaParams);

    if (schema.requirements.interactions) {
      for (let i = 0; i < schema.requirements.interactions.length; i++) {
        const interaction = schema.requirements.interactions[i];
        const inputModule = this.createInteractionModule(interaction, i, prefix, schemaParams);
        if (inputModule) {
          this.upsertModule(modules, inputModule);
        }
      }
    }

    if (governance.ui.needed && governance.ui.surfaces) {
      for (let i = 0; i < governance.ui.surfaces.length; i++) {
        const surface = governance.ui.surfaces[i];
        const uiModule = this.createUIModule(surface, i, prefix, schemaParams);
        if (uiModule) {
          this.upsertModule(modules, uiModule);
        }
      }
    }

    return modules;
  }

  private createTypedRequirementModule(
    req: IntentRequirement,
    index: number,
    prefix: string,
    schemaParams: Record<string, unknown>,
    schema: IntentSchema
  ): BlueprintModule | null {
    const category = resolveRequirementCategory(req, schema);
    const role = resolveRequirementRole(req, category, schema, [
      req.id,
      req.summary,
      ...(req.inputs || []),
      ...(req.outputs || []),
    ]);
    const parameters = resolveRequirementParameters(req, category, schemaParams, schema);

    return {
      id: `${prefix}typed_${req.id || index}`,
      role,
      category,
      patternIds: getCanonicalPatternIds(category, role),
      responsibilities: [req.summary, ...new Set(req.invariants || [])],
      inputs: req.inputs,
      outputs: req.outputs,
      ...(Object.keys(parameters).length > 0 && { parameters }),
    };
  }

  /**
   * 创建功能模块
   */
  private createFunctionalModule(
    req: string,
    index: number,
    prefix: string,
    schemaParams: Record<string, unknown>
  ): BlueprintModule | null {
    const sanitizedRequirement = stripNegativeConstraintFragments(req);
    if (this.isNegativeConstraintRequirement(req) || sanitizedRequirement.length === 0) {
      return null;
    }

    const category = inferCategoryFromRequirement(sanitizedRequirement);
    const role = inferRoleFromCategory(category, [sanitizedRequirement]);
    const patternIds = getCanonicalPatternIds(category, role);
    const parameters = extractModuleParameters(category, schemaParams);
    
    return {
      id: `${prefix}func_${index}`,
      role,
      category,
      patternIds,
      responsibilities: [sanitizedRequirement],
      ...(Object.keys(parameters).length > 0 && { parameters }),
    };
  }

  private isNegativeConstraintRequirement(req: string): boolean {
    const normalized = req.trim().toLowerCase();
    return /^(?:(?:the|this)\s+feature\s+)?(?:do not|don't|must not|mustn't|should not|no\b|without\b|禁止|不要|不需要|无需|别|不能|不可|不得)/iu.test(normalized);
  }

  /**
   * 从 IntentSchema 扩展参数中读取模块参数。
   */
  private getSchemaParameters(schema: IntentSchema): Record<string, unknown> {
    const params = (schema as IntentSchema & { parameters?: Record<string, unknown> }).parameters;
    return params && typeof params === "object" ? params : {};
  }

  /**
   * 根据 normalizedMechanics 补齐 functional 文本中未显式拆出的通用模块。
   */
  private addMechanicModules(
    schema: IntentSchema,
    modules: BlueprintModule[],
    prefix: string,
    schemaParams: Record<string, unknown>
  ): void {
    const categories = inferCategoriesFromMechanics(schema);

    for (const category of categories) {
      const role = inferRoleFromCategory(
        category,
        this.collectMechanicContextSignals(schema, category),
        detectSelectionFlowAsk(schema),
      );
      const parameters = this.collectMechanicModuleParameters(schema, category, role, schemaParams);
      const newModule: BlueprintModule = {
        id: `${prefix}${category}_${modules.length}`,
        role,
        category,
        patternIds: getCanonicalPatternIds(category, role),
        responsibilities: [describeMechanicResponsibility(category)],
        ...(Object.keys(parameters).length > 0 && { parameters }),
      };
      this.upsertModule(modules, newModule);

      if (
        category === "rule" &&
        role === "selection_flow" &&
        classifySchedulerTimerRisk(schema) === "synthesis_required"
      ) {
        const timedRuleParameters = this.collectMechanicModuleParameters(schema, category, "timed_rule", schemaParams);
        this.upsertModule(modules, {
          id: `${prefix}${category}_timed_${modules.length}`,
          role: "timed_rule",
          category,
          patternIds: getCanonicalPatternIds(category, "timed_rule"),
          responsibilities: ["Orchestrate non-reusable local timing semantics that require synthesis"],
          ...(Object.keys(timedRuleParameters).length > 0 ? { parameters: timedRuleParameters } : {}),
        });
      }
    }
  }

  private collectMechanicModuleParameters(
    schema: IntentSchema,
    category: BlueprintModule["category"],
    role: string,
    schemaParams: Record<string, unknown>,
  ): Record<string, unknown> {
    const parameters = {
      ...extractModuleParameters(category, schemaParams),
    };

    if (category === "rule" && role === "timed_rule") {
      Object.assign(parameters, this.extractTimingMechanicParameters(schema));
    }

    return parameters;
  }

  private collectMechanicContextSignals(
    schema: IntentSchema,
    category: BlueprintModule["category"],
  ): string[] {
    if (category !== "rule") {
      return [];
    }

    const signals: string[] = [];
    if (detectSelectionFlowAsk(schema)) {
      signals.push("selection");
    }
    if (classifySchedulerTimerRisk(schema) !== undefined) {
      signals.push("timer");
    }

    return signals;
  }

  private extractTimingMechanicParameters(
    schema: IntentSchema,
  ): Record<string, unknown> {
    const parameters: Record<string, unknown> = {};
    const copyNumeric = (key: string, value: unknown): void => {
      if (typeof value === "number" && Number.isFinite(value)) {
        parameters[key] = value;
      }
    };

    copyNumeric("delaySeconds", schema.timing?.delaySeconds);
    copyNumeric("intervalSeconds", schema.timing?.intervalSeconds);
    copyNumeric("cooldownSeconds", schema.timing?.cooldownSeconds);

    for (const requirement of schema.requirements.typed || []) {
      const requirementParameters = requirement.parameters || {};
      copyNumeric("initialDelaySeconds", requirementParameters.initialDelaySeconds);
      copyNumeric("delaySeconds", requirementParameters.delaySeconds);
      copyNumeric("tickSeconds", requirementParameters.tickSeconds);
      copyNumeric("intervalSeconds", requirementParameters.intervalSeconds);
      copyNumeric("cooldownSeconds", requirementParameters.cooldownSeconds);
      copyNumeric("cooldown", requirementParameters.cooldown);
      copyNumeric("abilityCooldown", requirementParameters.abilityCooldown);
    }

    return parameters;
  }

  private upsertModule(
    modules: BlueprintModule[],
    newModule: BlueprintModule
  ): void {
    const existingIndex = modules.findIndex(
      (module) => module.category === newModule.category && module.role === newModule.role,
    );

    if (existingIndex >= 0) {
      const existing = modules[existingIndex];
      const mergedResponsibilities = [...new Set([...existing.responsibilities, ...newModule.responsibilities])];
      const mergedParameters = {
        ...(existing.parameters || {}),
        ...(newModule.parameters || {}),
      };
      const existingPatternIds = existing.patternIds || [];
      const newPatternIds = newModule.patternIds || [];
      const mergedPatternIds = existingPatternIds.length > 0
        ? existingPatternIds
        : newPatternIds;

      modules[existingIndex] = {
        ...existing,
        responsibilities: mergedResponsibilities,
        ...(Object.keys(mergedParameters).length > 0 && { parameters: mergedParameters }),
        patternIds: mergedPatternIds,
      };
    } else {
      modules.push(newModule);
    }
  }

  /**
   * 创建交互模块（输入绑定）
   */
  private createInteractionModule(
    interaction: string,
    index: number,
    prefix: string,
    schemaParams: Record<string, unknown>
  ): BlueprintModule | null {
    const parameters = extractModuleParameters("trigger", schemaParams);
    const role = inferRoleFromCategory("trigger");
    return {
      id: `${prefix}input_${index}`,
      role,
      category: "trigger",
      patternIds: getCanonicalPatternIds("trigger", role),
      responsibilities: [`处理交互: ${interaction}`],
      ...(Object.keys(parameters).length > 0 && { parameters }),
    };
  }

  /**
   * 创建 UI 模块
   */
  private createUIModule(
    surface: string,
    index: number,
    prefix: string,
    schemaParams: Record<string, unknown>
  ): BlueprintModule | null {
    const parameters = extractModuleParameters("ui", schemaParams);
    const role = inferRoleFromCategory("ui", [surface]);
    return {
      id: `${prefix}ui_${index}`,
      role,
      category: "ui",
      patternIds: getCanonicalPatternIds("ui", role),
      responsibilities: [`渲染 UI: ${surface}`],
      outputs: [surface],
      ...(Object.keys(parameters).length > 0 && { parameters }),
    };
  }

  /**
   * 构建模块间连接
   */
  private buildConnections(modules: BlueprintModule[]): BlueprintConnection[] {
    const connections: BlueprintConnection[] = [];

    // 按类别分组
    const triggerModules = modules.filter((m) => m.category === "trigger");
    const dataModules = modules.filter((m) => m.category === "data");
    const ruleModules = modules.filter((m) => m.category === "rule");
    const effectModules = modules.filter((m) => m.category === "effect");
    const uiModules = modules.filter((m) => m.category === "ui");

    // 1. 触发 -> 规则/效果
    for (const trigger of triggerModules) {
      for (const rule of ruleModules) {
        connections.push({
          from: trigger.id,
          to: rule.id,
          purpose: "触发规则执行",
        });
      }
      for (const effect of effectModules) {
        connections.push({
          from: trigger.id,
          to: effect.id,
          purpose: "触发效果应用",
        });
      }
    }

    // 2. 数据 -> 规则/效果
    for (const data of dataModules) {
      for (const rule of ruleModules) {
        connections.push({
          from: data.id,
          to: rule.id,
          purpose: "提供数据输入",
        });
      }
      for (const effect of effectModules) {
        connections.push({
          from: data.id,
          to: effect.id,
          purpose: "提供效果参数",
        });
      }
    }

    // 3. 规则 -> 效果
    for (const rule of ruleModules) {
      for (const effect of effectModules) {
        connections.push({
          from: rule.id,
          to: effect.id,
          purpose: "规则决策驱动效果",
        });
      }
    }

    // 4. 效果 -> UI
    for (const effect of effectModules) {
      for (const ui of uiModules) {
        connections.push({
          from: effect.id,
          to: ui.id,
          purpose: "效果状态驱动 UI 更新",
        });
      }
    }

    return connections;
  }

  /**
   * 构建 Pattern 提示
   */
  private buildPatternHints(schema: IntentSchema): PatternHint[] {
    const governance = getIntentGovernanceView(schema);
    const hints: PatternHint[] = [];

    if (governance.mechanics.trigger) {
      const patterns = [CORE_PATTERN_IDS.INPUT_KEY_BINDING].filter(isPatternAvailable);
      if (patterns.length > 0) {
        hints.push({
          category: "input",
          suggestedPatterns: patterns,
          rationale: "需要输入触发机制",
        });
      }
    }

    if (governance.mechanics.candidatePool) {
      const patterns = [CORE_PATTERN_IDS.DATA_WEIGHTED_POOL].filter(isPatternAvailable);
      if (patterns.length > 0) {
        hints.push({
          category: "data",
          suggestedPatterns: patterns,
          rationale: "需要候选项池管理",
        });
      }
    }

    if (governance.mechanics.weightedSelection) {
      const patterns = [CORE_PATTERN_IDS.RULE_SELECTION_FLOW].filter(isPatternAvailable);
      if (patterns.length > 0) {
        hints.push({
          category: "rule",
          suggestedPatterns: patterns,
          rationale: "需要加权随机选择",
        });
      }
    }

    if (governance.mechanics.playerChoice) {
      const patterns = [CORE_PATTERN_IDS.RULE_SELECTION_FLOW].filter(isPatternAvailable);
      if (patterns.length > 0) {
        hints.push({
          category: "rule",
          suggestedPatterns: patterns,
          rationale: "需要玩家选择处理",
        });
      }
    }

    if (governance.mechanics.uiModal) {
      const patterns = [CORE_PATTERN_IDS.UI_SELECTION_MODAL].filter(isPatternAvailable);
      if (patterns.length > 0) {
        hints.push({
          category: "ui",
          suggestedPatterns: patterns,
          rationale: "需要模态 UI 界面",
        });
      }
    }

    if (governance.mechanics.outcomeApplication) {
      hints.push({
        category: "effect",
        suggestedPatterns: [],
        rationale: "需要结果应用机制（多态模块，由 resolver/assembly 根据上下文解析具体 pattern）",
      });
    }

    if (governance.mechanics.resourceConsumption) {
      hints.push({
        category: "resource",
        suggestedPatterns: [],
        rationale: "需要资源消耗处理（多态模块，由 resolver/assembly 根据上下文解析具体 pattern）",
      });
    }

    return hints;
  }

  /**
   * 构建 UI 设计规格
   */
  private buildUIDesignSpec(schema: IntentSchema): UIDesignSpec | undefined {
    const governance = getIntentGovernanceView(schema);
    if (!this.config.enableUIBranch || !governance.ui.needed) {
      return undefined;
    }

    const surfaces: UISurfaceSpec[] = [];

    if (governance.ui.surfaces) {
      for (let i = 0; i < governance.ui.surfaces.length; i++) {
        const surface = governance.ui.surfaces[i];
        surfaces.push({
          id: `surface_${i}`,
          type: this.inferSurfaceType(surface),
          purpose: surface,
        });
      }
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

  /**
   * 推断 surface 类型
   */
  private inferSurfaceType(surface: string): UISurfaceSpec["type"] {
    const surfaceLower = surface.toLowerCase();
    
    if (surfaceLower.includes("模态") || surfaceLower.includes("modal") || surfaceLower.includes("选择")) {
      return "modal";
    }
    if (surfaceLower.includes("提示") || surfaceLower.includes("hint")) {
      return "hint";
    }
    if (surfaceLower.includes("面板") || surfaceLower.includes("panel")) {
      return "panel";
    }
    if (surfaceLower.includes("覆盖") || surfaceLower.includes("overlay")) {
      return "overlay";
    }
    
    return "hud";
  }

  /**
   * 构建验证合约
   */
  private buildValidationContracts(schema: IntentSchema): ValidationContract[] {
    const contracts: ValidationContract[] = [];

    // 基于 requiredPatterns 添加验证合约
    if (schema.constraints.requiredPatterns) {
      for (const patternId of schema.constraints.requiredPatterns) {
        contracts.push({
          scope: "assembly",
          rule: `必须使用 Pattern: ${patternId}`,
          severity: "error",
        });
      }
    }

    // 基于 forbiddenPatterns 添加验证合约
    if (schema.constraints.forbiddenPatterns) {
      for (const patternId of schema.constraints.forbiddenPatterns) {
        contracts.push({
          scope: "assembly",
          rule: `禁止使用的 Pattern: ${patternId}`,
          severity: "error",
        });
      }
    }

    // 添加基本验证
    contracts.push({
      scope: "blueprint",
      rule: "Blueprint 必须包含至少一个模块",
      severity: "error",
    });

    contracts.push({
      scope: "assembly",
      rule: "非多态模块必须绑定到可用 Pattern；多态模块（effect/resource/integration）可由 resolver/assembly 后续解析",
      severity: "warning",
    });

    return contracts;
  }

  private getProposalConfidence(
    modules: ProposalModule[],
    readiness: "ready" | "weak" | "blocked"
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

  private inferProposalConnectionType(connection: BlueprintConnection): string {
    if (connection.purpose.includes("触发")) {
      return "control";
    }
    if (connection.purpose.includes("数据")) {
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

  private canonicalizeModules(modules: BlueprintModule[]): BlueprintModule[] {
    return modules.map((module) => ({
      ...module,
      responsibilities: [...new Set(module.responsibilities)].filter(Boolean),
      inputs: module.inputs ? [...new Set(module.inputs)] : undefined,
      outputs: module.outputs ? [...new Set(module.outputs)] : undefined,
    }));
  }

  private canonicalizeConnections(
    connections: BlueprintConnection[],
    modules: BlueprintModule[]
  ): BlueprintConnection[] {
    const moduleIds = new Set(modules.map((module) => module.id));
    const deduped = new Map<string, BlueprintConnection>();

    for (const connection of connections) {
      if (!moduleIds.has(connection.from) || !moduleIds.has(connection.to)) {
        continue;
      }
      const key = `${connection.from}:${connection.to}:${connection.purpose}`;
      if (!deduped.has(key)) {
        deduped.set(key, connection);
      }
    }

    return [...deduped.values()];
  }

  private collectNormalizationIssues(
    schema: IntentSchema,
    proposal: BlueprintProposal,
    modules: BlueprintModule[],
    moduleNeeds: ModuleNeed[],
    status: NormalizedBlueprintStatus,
    assessment: SemanticAssessment,
  ): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    if (modules.length === 0) {
      issues.push({
        code: "EMPTY_FINAL_BLUEPRINT_MODULES",
        scope: "blueprint",
        severity: "error",
        message: "FinalBlueprint 必须至少包含一个模块",
        path: "modules",
      });
    }

    if (moduleNeeds.length !== modules.length) {
      issues.push({
        code: "MODULE_NEED_COUNT_MISMATCH",
        scope: "blueprint",
        severity: "error",
        message: "FinalBlueprint.moduleNeeds 必须与 modules 对齐",
        path: "moduleNeeds",
      });
    }

    if (status !== "ready") {
      issues.push({
        code: status === "blocked" ? "FINAL_BLUEPRINT_BLOCKED" : "FINAL_BLUEPRINT_WEAK",
        scope: "blueprint",
        severity: status === "blocked" ? "error" : "warning",
        message: status === "blocked"
          ? "FinalBlueprint hit a governance or structural block and cannot continue"
          : "FinalBlueprint remains reviewable/exploratory and can continue with weaker guarantees",
        path: "status",
      });
    }

    if (proposal.proposedModules.some((module) => (module.proposedPatternIds || []).length > 0) && moduleNeeds.some((need) => need.explicitPatternHints && need.explicitPatternHints.length > 0)) {
      issues.push({
        code: "PATTERN_HINTS_TIE_BREAK_ONLY",
        scope: "blueprint",
        severity: "warning",
        message: "explicitPatternHints 仅作为 tie-break 输入，不代表最终 pattern authority",
        path: "moduleNeeds",
      });
    }

    for (const blocker of assessment.blockers) {
      issues.push({
        code: "FINAL_BLUEPRINT_SEMANTIC_BLOCKER",
        scope: "blueprint",
        severity: "error",
        message: blocker,
        path: "moduleNeeds",
      });
    }

    for (const warning of assessment.warnings) {
      issues.push({
        code: "FINAL_BLUEPRINT_SEMANTIC_WARNING",
        scope: "blueprint",
        severity: "warning",
        message: warning,
        path: "moduleNeeds",
      });
    }

    return issues;
  }
  /**
   * 生成 Blueprint ID
   */
  private generateBlueprintId(schema: IntentSchema): string {
    const prefix = getIntentGovernanceView(schema).intentKind.replace(/-/g, "_");
    const timestamp = Date.now().toString(36).slice(-4);
    return `${prefix}_${timestamp}`;
  }
}

/**
 * 便捷函数：快速构建 Blueprint
 */
export function buildBlueprint(
  schema: IntentSchema,
  config?: BlueprintBuilderConfig
): BlueprintBuildResult {
  const builder = new BlueprintBuilder(config);
  return builder.build(schema);
}

export function buildUpdateBlueprint(
  updateIntent: UpdateIntent,
  config?: BlueprintBuilderConfig,
): BlueprintBuildResult {
  const builder = new BlueprintBuilder(config);
  return builder.buildUpdate(updateIntent);
}
