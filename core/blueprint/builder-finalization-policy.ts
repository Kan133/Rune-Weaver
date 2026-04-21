import type {
  Blueprint,
  BlueprintModule,
  BlueprintNormalizationReport,
  BlueprintProposal,
  CommitDecision,
  DesignDraft,
  FeatureContract,
  FeatureDependencyEdge,
  FeatureMaturity,
  ImplementationStrategy,
  IntentRequirement,
  IntentSchema,
  ModuleNeed,
  NormalizedBlueprintStatus,
  ValidationIssue,
  ValidationStatus,
} from "../schema/types.js";
import { buildModuleNeeds } from "./blueprint-semantic-shaping";
import { getNormalizedStatus } from "./blueprint-status-policy";
import { assessSemanticCompleteness } from "./seam-authority";
import type { SemanticAssessment } from "./seam-authority";
import type { BlueprintNormalizationOutcome } from "./types";
import {
  canonicalizeBlueprintConnections,
  canonicalizeBlueprintModules,
} from "./builder-graph-assembly";

function determineImplementationStrategy(
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

function determineReuseConfidence(
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

function deriveArtifactTargets(candidate: Blueprint): string[] {
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

function buildDesignDraft(
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
  const retrievedFamilyCandidates = Array.from(new Set(proposal.candidatePatternFamilies || []));
  const chosenImplementationStrategy = determineImplementationStrategy(
    status,
    retrievedFamilyCandidates,
    retrievedPatternCandidates,
  );

  return {
    retrievedFamilyCandidates,
    retrievedPatternCandidates,
    reuseConfidence: determineReuseConfidence(
      retrievedFamilyCandidates,
      retrievedPatternCandidates,
    ),
    chosenImplementationStrategy,
    artifactTargets: deriveArtifactTargets(candidate),
    notes: assessment.warnings,
  };
}

function mapRequirementToContractSurface(
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

function buildFeatureContract(schema: IntentSchema): FeatureContract {
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
      kind: mapRequirementToContractSurface(requirement.kind),
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

function normalizeDependencyRelation(
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

function buildDependencyEdges(schema: IntentSchema): FeatureDependencyEdge[] {
  return (schema.composition?.dependencies || []).map((dependency) => ({
    relation: normalizeDependencyRelation(dependency.relation),
    targetFeatureId: dependency.kind === "cross-feature" ? dependency.target : undefined,
    targetSurfaceId: dependency.target,
    required: dependency.required,
    summary: `${dependency.kind}:${dependency.relation}${dependency.target ? `:${dependency.target}` : ""}`,
  }));
}

function buildValidationStatus(
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

function buildCommitDecision(
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

function determineFeatureMaturity(
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

function collectNormalizationIssues(
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
      message: "FinalBlueprint 蹇呴』鑷冲皯鍖呭惈涓€涓ā鍧?",
      path: "modules",
    });
  }

  if (moduleNeeds.length !== modules.length) {
    issues.push({
      code: "MODULE_NEED_COUNT_MISMATCH",
      scope: "blueprint",
      severity: "error",
      message: "FinalBlueprint.moduleNeeds 蹇呴』涓?modules 瀵归綈",
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

  if (
    proposal.proposedModules.some((module) => (module.proposedPatternIds || []).length > 0)
    && moduleNeeds.some((need) => need.explicitPatternHints && need.explicitPatternHints.length > 0)
  ) {
    issues.push({
      code: "PATTERN_HINTS_TIE_BREAK_ONLY",
      scope: "blueprint",
      severity: "warning",
      message: "explicitPatternHints 浠呬綔涓?tie-break 杈撳叆锛屼笉浠ｈ〃鏈€缁?pattern authority",
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

export function normalizeBlueprintProposal(
  schema: IntentSchema,
  proposal: BlueprintProposal,
  candidate: Blueprint,
): BlueprintNormalizationOutcome {
  const modules = canonicalizeBlueprintModules(candidate.modules);
  const connections = canonicalizeBlueprintConnections(candidate.connections, modules);
  const moduleFacets = candidate.moduleFacets || [];
  const moduleNeeds = buildModuleNeeds(schema, modules, moduleFacets);
  const assessment = assessSemanticCompleteness(schema, modules, moduleNeeds, proposal, moduleFacets);
  const status = getNormalizedStatus(schema, proposal, modules, assessment);
  const issues = collectNormalizationIssues(proposal, modules, moduleNeeds, status, assessment);
  const blockers = issues
    .filter((issue) => issue.severity === "error")
    .map((issue) => issue.message);
  const designDraft = buildDesignDraft(candidate, proposal, assessment, status);
  const implementationStrategy = designDraft.chosenImplementationStrategy;
  const commitDecision = buildCommitDecision(status, implementationStrategy, issues, assessment);

  const finalBlueprint = {
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
    maturity: determineFeatureMaturity(implementationStrategy, status),
    implementationStrategy,
    featureContract: buildFeatureContract(schema),
    validationStatus: buildValidationStatus(status, issues),
    dependencyEdges: buildDependencyEdges(schema),
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

export function applyBlockingIssuesToNormalization(
  normalization: BlueprintNormalizationOutcome,
  additionalIssues: ValidationIssue[],
): BlueprintNormalizationOutcome {
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
      validationStatus: buildValidationStatus("blocked", issues),
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
