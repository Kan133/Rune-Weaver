/**
 * Rune Weaver - Core Schema Types
 * 
 * 定义意图层 (Intent Layer) 和实现编排层的核心类型
 * 与 docs/SCHEMA.md 保持一致
 */

import type { HostDescriptor } from "../host/types.js";

// ============================================================================
// Intent Schema - 需求层核心对象
// 与 SCHEMA.md 4.2 节对齐
// ============================================================================

export type { HostDescriptor } from "../host/types.js";

export type IntentReadiness = "ready" | "weak" | "blocked";

export interface IntentActor {
  id: string;
  role: string;
  label: string;
}

export interface IntentRequirement {
  id: string;
  kind: "trigger" | "state" | "rule" | "effect" | "resource" | "ui" | "integration" | "generic";
  summary: string;
  actors?: string[];
  inputs?: string[];
  outputs?: string[];
  invariants?: string[];
  parameters?: Record<string, unknown>;
  priority?: "must" | "should" | "could";
}

export interface IntentStateContract {
  states: Array<{
    id: string;
    summary: string;
    owner?: "feature" | "session" | "external";
    lifetime?: "ephemeral" | "session" | "persistent";
    kind?: "scalar" | "counter" | "collection" | "inventory" | "selection-session" | "generic";
    mutationMode?: "create" | "update" | "consume" | "expire" | "remove";
  }>;
}

export interface IntentFlowContract {
  triggerSummary?: string;
  sequence?: string[];
  supportsCancel?: boolean;
  supportsRetry?: boolean;
  requiresConfirmation?: boolean;
}

export interface IntentInteractionContract {
  activations?: Array<{
    actor?: string;
    kind: "key" | "mouse" | "event" | "passive" | "system";
    input?: string;
    phase?: "press" | "release" | "hold" | "enter" | "occur";
    repeatability?: "one-shot" | "repeatable" | "toggle" | "persistent";
    confirmation?: "none" | "implicit" | "explicit";
  }>;
}

export interface IntentTargetingContract {
  subject?: "self" | "ally" | "enemy" | "unit" | "point" | "area" | "direction" | "global";
  selector?: "cursor" | "current-target" | "nearest" | "random" | "none";
  teamScope?: "self" | "ally" | "enemy" | "any";
}

export interface IntentTimingContract {
  cooldownSeconds?: number;
  delaySeconds?: number;
  intervalSeconds?: number;
  duration?: {
    kind: "instant" | "timed" | "persistent";
    seconds?: number;
  };
}

export interface IntentSpatialContract {
  motion?: {
    kind: "dash" | "teleport" | "knockback" | "none";
    distance?: number;
    direction?: "cursor" | "facing" | "target" | "fixed";
  };
  area?: {
    shape: "circle" | "line" | "cone";
    radius?: number;
    length?: number;
    width?: number;
  };
  emission?: {
    kind: "projectile" | "pulse" | "wave" | "none";
    speed?: number;
    count?: number;
  };
}

export interface IntentSelectionContract {
  mode?: "deterministic" | "weighted" | "filtered" | "user-chosen" | "hybrid";
  source?: "none" | "candidate-collection" | "weighted-pool" | "filtered-pool";
  choiceMode?: "none" | "user-chosen" | "random" | "weighted" | "hybrid";
  cardinality?: "single" | "multiple";
  choiceCount?: number;
  repeatability?: "one-shot" | "repeatable" | "persistent";
  duplicatePolicy?: "allow" | "avoid" | "forbid";
  commitment?: "immediate" | "confirm" | "deferred";
  inventory?: {
    enabled: boolean;
    capacity?: number;
    storeSelectedItems?: boolean;
    blockDrawWhenFull?: boolean;
    fullMessage?: string;
    presentation?: "persistent_panel";
  };
}

export interface IntentEffectContract {
  operations: Array<"apply" | "remove" | "stack" | "expire" | "consume" | "restore">;
  targets?: string[];
  durationSemantics?: "instant" | "timed" | "persistent";
}

export interface IntentOutcomeContract {
  operations?: Array<
    "apply-effect" | "move" | "spawn" | "grant-feature" | "update-state" | "consume-resource" | "emit-event"
  >;
}

export interface IntentIntegrationContract {
  expectedBindings: Array<{
    id: string;
    kind: "entry-point" | "event-hook" | "bridge-point" | "ui-surface" | "data-source";
    summary: string;
    required?: boolean;
  }>;
}

export interface IntentContentModelContract {
  collections?: Array<{
    id: string;
    role: "candidate-options" | "spawnables" | "progress-items" | "generic";
    ownership?: "feature" | "shared" | "external";
    updateMode?: "replace" | "merge" | "append";
    itemSchema?: Array<{
      name: string;
      type: "string" | "number" | "boolean" | "enum" | "effect-ref" | "object-ref";
      required?: boolean;
      semanticRole?: string;
    }>;
  }>;
}

export interface IntentCompositionContract {
  dependencies?: Array<{
    kind: "same-feature" | "cross-feature" | "external-system";
    relation: "reads" | "writes" | "triggers" | "grants" | "syncs-with";
    target?: string;
    required?: boolean;
  }>;
}

export interface IntentInvariant {
  id: string;
  summary: string;
  severity: "error" | "warning";
}

export interface IntentUncertainty {
  id: string;
  summary: string;
  affects: Array<"intent" | "blueprint" | "pattern" | "realization">;
  severity: "low" | "medium" | "high";
}

export interface WizardClarificationQuestion {
  id: string;
  question: string;
  targetPaths?: string[];
  reason: string;
}

export interface LegacyRequiredClarification {
  id?: string;
  question?: string;
  blocksFinalization?: boolean;
}

export interface WizardClarificationPlan {
  questions: WizardClarificationQuestion[];
  maxQuestions: number;
  requiredForFaithfulInterpretation: boolean;
  targetPaths: string[];
  reason: string;
}

export interface IntentSchema {
  version: string;
  host: HostDescriptor;
  request: UserRequestSummary;
  classification: IntentClassification;
  readiness?: IntentReadiness;
  actors?: IntentActor[];
  requirements: IntentRequirements;
  constraints: IntentConstraints;
  interaction?: IntentInteractionContract;
  targeting?: IntentTargetingContract;
  timing?: IntentTimingContract;
  spatial?: IntentSpatialContract;
  stateModel?: IntentStateContract;
  flow?: IntentFlowContract;
  selection?: IntentSelectionContract;
  effects?: IntentEffectContract;
  outcomes?: IntentOutcomeContract;
  contentModel?: IntentContentModelContract;
  composition?: IntentCompositionContract;
  integrations?: IntentIntegrationContract;
  uiRequirements?: UIRequirementSummary;
  normalizedMechanics: NormalizedMechanics;
  acceptanceInvariants?: IntentInvariant[];
  uncertainties?: IntentUncertainty[];
  requiredClarifications?: LegacyRequiredClarification[];
  openQuestions?: string[];
  resolvedAssumptions: string[];
  isReadyForBlueprint?: boolean;
  /** Planning-stage extracted scalar/module-safe parameters only */
  parameters?: Record<string, unknown>;
}

export interface WorkspaceFeatureHandle {
  featureId: string;
  featureName?: string;
  aliases: string[];
  intentKind: string;
  selectedPatterns: string[];
  sourceBacked: boolean;
  integrationPoints: string[];
  semanticHints: string[];
}

export interface WorkspaceSemanticContext {
  featureCount: number;
  features: WorkspaceFeatureHandle[];
}

export type PromptPackageId =
  | "wizard.create"
  | "wizard.update"
  | "synthesis.module"
  | "repair.local";

export type CorpusSourceKind =
  | "governance"
  | "curated_host"
  | "raw_reference"
  | "workspace_evidence";

export type SynthesisTargetProfile =
  | "lua_ability"
  | "ability_kv"
  | "panorama_tsx"
  | "panorama_less";

export interface EvidenceRef {
  id: string;
  sourceKind: CorpusSourceKind;
  title: string;
  path?: string;
  section?: string;
  snippet?: string;
  symbol?: string;
  score?: number;
  metadata?: Record<string, unknown>;
}

export interface RetrievalSummary {
  tiersUsed: Array<0 | 1 | 2 | 3>;
  evidenceCount: number;
  sourceKinds: CorpusSourceKind[];
}

export interface RetrievalQuery {
  promptPackageId: PromptPackageId;
  featureId?: string;
  moduleId?: string;
  targetProfile?: SynthesisTargetProfile;
  hostKind?: string;
  intentSummary?: string;
  terms?: string[];
  maxItems?: number;
  allowRawReferences?: boolean;
  workspaceEvidenceOnly?: boolean;
}

export interface RetrievalBundle {
  promptPackageId: PromptPackageId;
  tiersUsed: Array<0 | 1 | 2 | 3>;
  summary: string;
  evidenceRefs: EvidenceRef[];
  warnings?: string[];
  metadata?: Record<string, unknown>;
}

export interface PromptConstraintBundle {
  mustPreserve: string[];
  mustNotAdd: string[];
  exactScalars: Record<string, string | number | boolean>;
  openSemanticGaps: string[];
  evidenceRefs?: EvidenceRef[];
}

export interface RelationCandidate {
  relation:
    | "reads"
    | "writes"
    | "triggers"
    | "grants"
    | "syncs-with"
    | "depends-on"
    | "extends"
    | "conflicts-with";
  targetFeatureId: string;
  featureName?: string;
  matchedAlias: string;
  confidence: "low" | "medium" | "high";
  score: number;
  reason: string;
}

export interface WizardInterpretation {
  intentSchema: IntentSchema;
  clarificationPlan?: WizardClarificationPlan;
  promptPackageId?: PromptPackageId;
  promptConstraints?: PromptConstraintBundle;
  retrievalBundle?: RetrievalBundle;
}

export interface CurrentFeatureContextSourceModel {
  ref?: FeatureAuthoringSourceArtifactRef;
  artifact?: Record<string, unknown>;
}

export interface CurrentFeatureContext {
  featureId: string;
  revision: number;
  intentKind: string;
  selectedPatterns: string[];
  moduleRecords?: ModuleImplementationRecord[];
  sourceBacked: boolean;
  sourceModel?: CurrentFeatureContextSourceModel;
  featureAuthoring?: FeatureAuthoring;
  sourceBackedInvariantRoles?: string[];
  preservedModuleBackbone: string[];
  admittedSkeleton?: string[];
  preservedInvariants: string[];
  boundedFields: Record<string, unknown>;
}

export type UpdateDeltaKind =
  | "trigger"
  | "selection"
  | "state"
  | "ui"
  | "effect"
  | "content"
  | "integration"
  | "composition"
  | "generic";

export interface UpdateDeltaItem {
  path: string;
  kind: UpdateDeltaKind;
  summary: string;
}

export interface UpdateIntent {
  version: string;
  mode: "update";
  target: {
    featureId: string;
    revision: number;
    profile?: SourceBackedFeatureProfile;
    sourceBacked: boolean;
  };
  currentFeatureContext: CurrentFeatureContext;
  requestedChange: IntentSchema;
  delta: {
    preserve: UpdateDeltaItem[];
    add: UpdateDeltaItem[];
    modify: UpdateDeltaItem[];
    remove: UpdateDeltaItem[];
  };
  resolvedAssumptions: string[];
}

export interface UpdateWizardInterpretation {
  requestedChange: IntentSchema;
  updateIntent: UpdateIntent;
  clarificationPlan?: WizardClarificationPlan;
  promptPackageId?: PromptPackageId;
  promptConstraints?: PromptConstraintBundle;
  retrievalBundle?: RetrievalBundle;
}

export interface UserRequestSummary {
  rawPrompt: string;
  goal: string;
  nameHint?: string;
}

export interface IntentClassification {
  intentKind:
    | "micro-feature"
    | "standalone-system"
    | "cross-system-composition"
    | "ui-surface"
    | "unknown";
  confidence?: "low" | "medium" | "high";
}

export interface IntentRequirements {
  functional: string[];
  typed?: IntentRequirement[];
  interactions?: string[];
  dataNeeds?: string[];
  outputs?: string[];
}

export interface IntentConstraints {
  requiredPatterns?: string[];
  forbiddenPatterns?: string[];
  hostConstraints?: string[];
  nonFunctional?: string[];
}

export interface UIRequirementSummary {
  needed: boolean;
  surfaces?: string[];
  feedbackNeeds?: string[];
}

export interface NormalizedMechanics {
  trigger?: boolean;
  candidatePool?: boolean;
  weightedSelection?: boolean;
  playerChoice?: boolean;
  uiModal?: boolean;
  outcomeApplication?: boolean;
  resourceConsumption?: boolean;
}

// ============================================================================
// Validation Issue - 跨层统一问题格式
// 与 SCHEMA.md 8.2 节对齐
// ============================================================================

export interface ValidationIssue {
  code: string;
  scope: "schema" | "blueprint" | "assembly" | "host";
  severity: "error" | "warning";
  message: string;
  path?: string;
}

export type FeatureMaturity = "exploratory" | "stabilized" | "templated";

export type ImplementationStrategy = "family" | "pattern" | "guided_native" | "exploratory";

export type ValidationOutcome = "unvalidated" | "passed" | "needs_review" | "failed";

export type CommitDecisionOutcome = "committable" | "exploratory" | "blocked";

export type ModuleSourceKind = "templated" | "family" | "pattern" | "synthesized";

export type ArtifactSourceKind = "templated" | "synthesized";

export type SynthesisBundleKind = "gameplay_ability" | "ui_surface" | "supporting_surface";

export type FeatureDependencyRelation = "reads" | "writes" | "triggers" | "grants" | "syncs_with";

export interface Dota2CorpusRegistryEntry {
  id: string;
  tier: 0 | 1 | 2 | 3;
  sourceKind: CorpusSourceKind;
  canonicalPath: string;
  legacyPaths?: string[];
  workflowConsumers: PromptPackageId[];
  stability: "active" | "transitional" | "legacy";
}

export interface FeatureContractSurface {
  id: string;
  kind: "event" | "data" | "capability" | "state" | "integration";
  summary: string;
}

export interface FeatureStateScope {
  stateId: string;
  scope: "local" | "session" | "persistent";
  owner: "feature" | "shared" | "external";
  summary?: string;
}

export interface FeatureContract {
  exports: FeatureContractSurface[];
  consumes: FeatureContractSurface[];
  integrationSurfaces: string[];
  stateScopes: FeatureStateScope[];
}

export interface FeatureDependencyEdge {
  relation: FeatureDependencyRelation;
  targetFeatureId?: string;
  targetSurfaceId?: string;
  required?: boolean;
  summary?: string;
}

export interface ValidationStageStatus {
  status: ValidationOutcome;
  warnings: string[];
  blockers: string[];
  summary?: string;
  checkedAt?: string;
}

export interface ValidationStatus {
  status: ValidationOutcome;
  warnings: string[];
  blockers: string[];
  lastValidatedAt?: string;
  blueprint?: ValidationStageStatus;
  synthesis?: ValidationStageStatus;
  repair?: ValidationStageStatus;
  dependency?: ValidationStageStatus;
  host?: ValidationStageStatus;
  runtime?: ValidationStageStatus;
}

export interface DesignDraft {
  retrievedFamilyCandidates: string[];
  retrievedPatternCandidates: string[];
  reuseConfidence: "high" | "medium" | "low";
  chosenImplementationStrategy: ImplementationStrategy;
  artifactTargets?: string[];
  notes?: string[];
}

export interface CommitDecision {
  outcome: CommitDecisionOutcome;
  canAssemble: boolean;
  canWriteHost: boolean;
  requiresReview: boolean;
  reasons: string[];
  stage?: "blueprint" | "final";
  impactedFeatures?: string[];
  dependencyBlockers?: string[];
  downgradedFeatures?: string[];
  reviewModules?: string[];
}

export interface SynthesizedArtifact {
  id: string;
  moduleId: string;
  bundleId: string;
  sourceKind: ModuleSourceKind;
  role: RealizationRole;
  hostTarget: string;
  outputKind: "kv" | "ts" | "ui" | "lua" | "bridge";
  contentType: "typescript" | "tsx" | "less" | "kv" | "json" | "lua";
  targetPath: string;
  content: string;
  summary: string;
  rationale: string[];
  metadata?: Record<string, unknown>;
}

export interface SynthesisBundlePlan {
  bundleId: string;
  kind: SynthesisBundleKind;
  primaryModuleId: string;
  moduleIds: string[];
  semanticRoles: string[];
  categories: Array<BlueprintModule["category"]>;
  artifactTargets: string[];
  ownedScopeRoot: string;
  entrySurface: "gameplay" | "ui" | "supporting";
  lifecycleBoundary: string;
  strategy: ImplementationStrategy;
}

export interface GroundingCheckResult {
  artifactId: string;
  targetProfile?: SynthesisTargetProfile;
  verifiedSymbols: string[];
  allowlistedSymbols: string[];
  weakSymbols: string[];
  unknownSymbols: string[];
  warnings: string[];
  evidenceRefs?: EvidenceRef[];
}

export interface ModuleImplementationRecord {
  moduleId: string;
  bundleId?: string;
  role: string;
  category?: BlueprintModule["category"];
  sourceKind: ModuleSourceKind;
  planningKind?: "templated_module" | "backbone";
  backboneKind?: "gameplay_ability" | "ui_surface" | "supporting_surface";
  facetIds?: string[];
  familyId?: string;
  patternId?: string;
  selectedPatternIds: string[];
  artifactTargets?: string[];
  ownedPaths?: string[];
  fillContractIds?: string[];
  reviewRequired?: boolean;
  requiresReview?: boolean;
  reviewReasons?: string[];
  implementationStrategy?: ImplementationStrategy;
  maturity?: FeatureMaturity;
  outputKinds?: Array<"server" | "shared" | "ui" | "bridge">;
  artifactPaths?: string[];
  resolvedFrom?: "family" | "pattern" | "guided_native" | "exploratory" | "mixed";
  summary?: string;
  requiredOutputs?: string[];
  integrationHints?: string[];
  stateExpectations?: string[];
  synthesizedArtifactIds?: string[];
  metadata?: Record<string, unknown>;
}

export interface UnresolvedModuleNeed {
  moduleId: string;
  semanticRole: string;
  category?: BlueprintModule["category"];
  reason: string;
  backboneKind?: "gameplay_ability" | "ui_surface" | "supporting_surface";
  facetIds?: string[];
  coLocatePreferred?: boolean;
  requiredCapabilities: string[];
  optionalCapabilities?: string[];
  requiredOutputs?: string[];
  artifactTargets?: string[];
  ownedScopeHints?: string[];
  stateExpectations?: string[];
  integrationHints?: string[];
  invariants?: string[];
  boundedVariability?: string[];
  explicitPatternHints?: string[];
  prohibitedTraits?: string[];
  suggestedAlternative?: string;
  strategy?: ImplementationStrategy;
  familyId?: string;
  source?: "module-need" | "derived-module" | "derived-mechanic";
}

export interface ModuleSynthesisResult {
  moduleId?: string;
  bundleId?: string;
  moduleIds?: string[];
  success: boolean;
  strategy: ImplementationStrategy;
  sourceKind: ModuleSourceKind;
  promptPackageId?: PromptPackageId;
  moduleRecords: ModuleImplementationRecord[];
  unresolvedModuleNeeds: UnresolvedModuleNeed[];
  artifacts: SynthesizedArtifact[];
  warnings: string[];
  blockers: string[];
  evidenceRefs?: EvidenceRef[];
  assumptions?: string[];
  mustNotAddViolations?: string[];
  grounding?: GroundingCheckResult[];
  compatibilityPatternId?: string;
}

export interface ArtifactSynthesisResult {
  success: boolean;
  strategy: ImplementationStrategy;
  sourceKind: ModuleSourceKind;
  promptPackageId?: PromptPackageId;
  moduleRecords?: ModuleImplementationRecord[];
  unresolvedModuleNeeds?: UnresolvedModuleNeed[];
  moduleResults?: ModuleSynthesisResult[];
  bundles?: SynthesisBundlePlan[];
  artifacts: SynthesizedArtifact[];
  warnings: string[];
  blockers: string[];
  retrievalSummary?: RetrievalSummary;
  evidenceRefs?: EvidenceRef[];
  grounding?: GroundingCheckResult[];
  compatibilityPatternId?: string;
}

export interface DependencyImpactRecord {
  featureId: string;
  label: string;
  outcome: "validated" | "needs_review" | "blocked";
  issues: string[];
}

export interface DependencyRevalidationResult {
  success: boolean;
  providerFeatureId: string;
  impactedFeatures: DependencyImpactRecord[];
  blockers: string[];
  downgradedFeatures: string[];
  compatibleFeatures: string[];
}

// ============================================================================
// Blueprint Types - 实现编排层
// 与 SCHEMA.md 5.2 节对齐
// ============================================================================

export interface Blueprint {
  id: string;
  version: string;
  summary: string;
  sourceIntent: BlueprintSourceIntent;
  modules: BlueprintModule[];
  moduleFacets?: ModuleFacetSpec[];
  connections: BlueprintConnection[];
  patternHints: PatternHint[];
  uiDesignSpec?: UIDesignSpec;
  assumptions: string[];
  validations: ValidationContract[];
  readyForAssembly: boolean;
  /** T138-R1: Parameters extracted from prompt (cooldown, mana, range, etc.) */
  parameters?: Record<string, unknown>;
  /** Step 2 migration: normalized blueprint readiness */
  status?: NormalizedBlueprintStatus;
  /** Step 2 migration: canonical pattern-facing seam */
  moduleNeeds?: ModuleNeed[];
  moduleRecords?: ModuleImplementationRecord[];
  unresolvedModuleNeeds?: UnresolvedModuleNeed[];
  /** Step 2 migration: legacy-compatible proposal linkage */
  proposalId?: string;
  /** Step 6 migration: Blueprint-authorized source-backed authoring contract */
  featureAuthoring?: FeatureAuthoring;
  fillContracts?: FillContract[];
  designDraft?: DesignDraft;
  maturity?: FeatureMaturity;
  implementationStrategy?: ImplementationStrategy;
  featureContract?: FeatureContract;
  validationStatus?: ValidationStatus;
  dependencyEdges?: FeatureDependencyEdge[];
  commitDecision?: CommitDecision;
}

export interface BlueprintSourceIntent {
  intentKind: IntentClassification["intentKind"];
  goal: string;
  normalizedMechanics: NormalizedMechanics;
}

export interface BlueprintModule {
  id: string;
  role: string;
  category:
    | "trigger"
    | "data"
    | "rule"
    | "effect"
    | "ui"
    | "resource"
    | "integration";
  planningKind?: "templated_module" | "backbone";
  backboneKind?: "gameplay_ability" | "ui_surface" | "supporting_surface";
  facetIds?: string[];
  /** T151: Explicit pattern grouping - if provided, Assembly will use this instead of category-based inference */
  patternIds?: string[];
  responsibilities: string[];
  inputs?: string[];
  outputs?: string[];
  parameters?: Record<string, unknown>;
}

export interface BlueprintConnection {
  from: string;
  to: string;
  purpose: string;
}

export interface PatternHint {
  category?: string;
  suggestedPatterns: string[];
  rationale?: string;
}

export type ProposalStatus = "draft" | "needs_review" | "usable" | "blocked";

export interface ProposalModule {
  id: string;
  role: string;
  category: BlueprintModule["category"];
  proposedPatternIds: string[];
  proposedParameters?: Record<string, unknown>;
  missingPatterns?: boolean;
  missingIntegration?: boolean;
  missingOwnership?: boolean;
  missingCapability?: boolean;
}

export interface ProposalConnection {
  from: string;
  to: string;
  purpose?: string;
  connectionType?: string;
}

export type SourceBackedFeatureAuthoringMode = "source-backed";
export type SourceBackedFeatureProfile = string;
export type SelectionPoolObjectKind = "talent" | "equipment" | "skill_card_placeholder";
export type SelectionPoolObjectTier = "R" | "SR" | "SSR" | "UR";

export interface SourceBackedParameterSurface {
  invariants?: string[];
}

export interface FeatureAuthoringSourceArtifactRef {
  adapter: string;
  version: number;
  path: string;
}

export interface SelectionPoolAuthoredObject {
  id: string;
  label: string;
  description: string;
  weight: number;
  tier: SelectionPoolObjectTier;
}

export interface SelectionPoolInventoryContract {
  enabled: boolean;
  capacity: number;
  storeSelectedItems: boolean;
  blockDrawWhenFull: boolean;
  fullMessage: string;
  presentation: "persistent_panel";
}

export interface SelectionPoolEffectProfile {
  kind: "tier_attribute_bonus_placeholder";
  rarityAttributeBonusMap: Record<string, { attribute: string; value: number }>;
}

export interface SelectionPoolFeatureAuthoringParameters {
  triggerKey: string;
  choiceCount: number;
  objectKind?: SelectionPoolObjectKind;
  objects: SelectionPoolAuthoredObject[];
  drawMode?: "single" | "multiple_without_replacement" | "multiple_with_replacement";
  duplicatePolicy?: "allow" | "avoid_when_possible" | "forbid";
  poolStateTracking?: "none" | "session";
  selectionPolicy?: "single";
  applyMode?: "immediate" | "deferred";
  postSelectionPoolBehavior?:
    | "none"
    | "remove_selected_from_remaining"
    | "remove_selected_and_keep_unselected_eligible";
  trackSelectedItems?: boolean;
  inventory?: SelectionPoolInventoryContract;
  display?: {
    title?: string;
    description?: string;
    inventoryTitle?: string;
    payloadShape?: "card_with_rarity";
    minDisplayCount?: number;
  };
  placeholderConfig?: {
    id: string;
    name: string;
    description?: string;
    disabled?: boolean;
  };
  effectProfile?: SelectionPoolEffectProfile;
}

export interface SelectionPoolParameterSurface {
  triggerKey: {
    kind: "single_hotkey";
    allowList: string[];
  };
  choiceCount: {
    minimum: number;
    maximum: number;
  };
  objects: {
    minItems: number;
    seededWhenMissing: boolean;
  };
  inventory: {
    supported: boolean;
    capacityRange: {
      minimum: number;
      maximum: number;
    };
    fixedPresentation: "persistent_panel";
  };
  invariants: string[];
}

export type SelectionPoolAdmissionVerdict =
  | "not_applicable"
  | "admitted_explicit"
  | "admitted_compressed"
  | "declined"
  | "governance_blocked";

export interface SelectionPoolAdmissionFinding {
  code: string;
  stage: "detection" | "proposal" | "contract" | "decision";
  severity: "info" | "warning" | "error";
  message: string;
  atom?: string;
  satisfied?: boolean;
  metadata?: Record<string, unknown>;
}

export interface SelectionPoolContractAtomStatus {
  atom: string;
  satisfied: boolean;
  detail: string;
}

export interface SelectionPoolContractAssessment {
  skeletonMatch: boolean;
  compressionEligible: boolean;
  atoms: SelectionPoolContractAtomStatus[];
  satisfiedAtoms: string[];
  missingAtoms: string[];
  blockerCodes: string[];
}

export interface SelectionPoolAdmissionDiagnostics {
  familyId: "selection_pool";
  verdict: SelectionPoolAdmissionVerdict;
  detection: {
    handled: boolean;
    objectKindHint?: SelectionPoolObjectKind;
    matchedBy: string[];
    findings: SelectionPoolAdmissionFinding[];
  };
  proposal: {
    proposalAvailable: boolean;
    proposalSource?: "llm" | "fallback" | "existing-feature";
    baseSource?: string;
    promptMergeApplied: boolean;
    promptMergeActions: string[];
    objectKind?: string;
    findings: SelectionPoolAdmissionFinding[];
  };
  contract: {
    assessed: boolean;
    skeletonMatch: boolean;
    assessment?: SelectionPoolContractAssessment;
    findings: SelectionPoolAdmissionFinding[];
  };
  decision: {
    verdict: SelectionPoolAdmissionVerdict;
    blockerCodes: string[];
    findings: SelectionPoolAdmissionFinding[];
  };
}

export interface FeatureAuthoringProposal<
  Parameters extends object = object,
  Surface extends object = SourceBackedParameterSurface,
> {
  mode: SourceBackedFeatureAuthoringMode;
  profile: SourceBackedFeatureProfile;
  objectKind?: string;
  parameters: Parameters;
  parameterSurface: Surface;
  proposalSource?: "llm" | "fallback" | "existing-feature";
  notes?: string[];
}

export interface FeatureAuthoring<
  Parameters extends object = object,
  Surface extends object = SourceBackedParameterSurface,
> {
  mode: SourceBackedFeatureAuthoringMode;
  profile: SourceBackedFeatureProfile;
  objectKind?: string;
  parameters: Parameters;
  parameterSurface: Surface;
  sourceArtifactRef?: FeatureAuthoringSourceArtifactRef;
  notes?: string[];
}

export interface FillIntentCandidate {
  boundaryId: string;
  summary: string;
  source: "llm" | "fallback" | "existing-feature" | "deterministic";
}

export interface FillContract {
  boundaryId: string;
  targetModuleId: string;
  targetPatternId: string;
  mode: "closed";
  sourceBindings: string[];
  allowed: string[];
  forbidden: string[];
  invariants: string[];
  expectedOutput: string;
  fallbackPolicy: "deterministic-default";
}

export interface BlueprintProposal {
  id: string;
  source: "llm" | "fallback" | "rule";
  status: ProposalStatus;
  sourceIntent: {
    goal: string;
    intentKind: IntentClassification["intentKind"];
  };
  proposedModules: ProposalModule[];
  proposedConnections: ProposalConnection[];
  confidence: "high" | "medium" | "low";
  notes: string[];
  issues: string[];
  uncertainties?: string[];
  blockedBy?: string[];
  candidatePatternFamilies?: string[];
  featureAuthoringProposal?: FeatureAuthoringProposal;
  fillIntentCandidates?: FillIntentCandidate[];
}

export interface ModuleNeed extends Record<string, unknown> {
  moduleId: string;
  semanticRole: string;
  backboneKind?: "gameplay_ability" | "ui_surface" | "supporting_surface";
  facetIds?: string[];
  coLocatePreferred?: boolean;
  requiredCapabilities: string[];
  optionalCapabilities?: string[];
  requiredOutputs?: string[];
  stateExpectations?: string[];
  integrationHints?: string[];
  invariants?: string[];
  boundedVariability?: string[];
  explicitPatternHints?: string[];
  prohibitedTraits?: string[];
}

export interface ModuleFacetSpec {
  facetId: string;
  backboneModuleId: string;
  kind: "trigger" | "timing" | "state" | "spawn" | "motion" | "effect" | "resource";
  role: string;
  category: BlueprintModule["category"];
  requiredCapabilities: string[];
  optionalCapabilities?: string[];
  requiredOutputs?: string[];
  stateExpectations?: string[];
  integrationHints?: string[];
  invariants?: string[];
}

export type NormalizedBlueprintStatus = "ready" | "weak" | "blocked";

export interface BlueprintNormalizationReport {
  status: NormalizedBlueprintStatus;
  notes: string[];
  issues: ValidationIssue[];
  blockers: string[];
}

export interface FinalBlueprint extends Blueprint {
  status: NormalizedBlueprintStatus;
  moduleNeeds: ModuleNeed[];
  moduleFacets?: ModuleFacetSpec[];
  moduleRecords?: ModuleImplementationRecord[];
  unresolvedModuleNeeds?: UnresolvedModuleNeed[];
  fillContracts?: FillContract[];
  designDraft: DesignDraft;
  maturity: FeatureMaturity;
  implementationStrategy: ImplementationStrategy;
  featureContract: FeatureContract;
  validationStatus: ValidationStatus;
  dependencyEdges: FeatureDependencyEdge[];
  commitDecision: CommitDecision;
}

export interface ValidationContract {
  scope: "schema" | "blueprint" | "assembly" | "host";
  rule: string;
  severity: "error" | "warning";
}

// ============================================================================
// UI Design Spec Types
// 与 SCHEMA.md 6.2 节对齐
// ============================================================================

export interface UIDesignSpec {
  surfaces: UISurfaceSpec[];
  visualStyle?: UIVisualStyle;
  copyHints?: string[];
  feedbackHints?: string[];
}

export interface UISurfaceSpec {
  id: string;
  type: "modal" | "hud" | "hint" | "panel" | "overlay";
  purpose: string;
  inputs?: string[];
  outputs?: string[];
  layoutHints?: string[];
  interactionMode?: "blocking" | "lightweight" | "persistent";
  autoDismissMs?: number;
}

export interface UIVisualStyle {
  tone?: string;
  density?: "low" | "medium" | "high";
  themeKeywords?: string[];
}

// ============================================================================
// Extension Point Types
// 与 SCHEMA.md 7.2 节对齐
// ============================================================================

export interface ExtensionPoint {
  id: string;
  purpose: string;
  inputSchema: Record<string, unknown>;
  outputSchema: Record<string, unknown>;
  constraints: string[];
}

// ============================================================================
// Assembly Plan Types
// 与 SCHEMA.md 9.2 节对齐
// ============================================================================

export interface AssemblyPlan {
  blueprintId: string;
  selectedPatterns: SelectedPattern[];
  moduleRecords?: ModuleImplementationRecord[];
  unresolvedModuleNeeds?: UnresolvedModuleNeed[];
  synthesisBundles?: SynthesisBundlePlan[];
  modules?: AssemblyModule[];
  /** T154: Propagated from Blueprint for composite relationship hints */
  connections?: BlueprintConnection[];
  writeTargets: WriteTarget[];
  bridgeUpdates?: BridgeUpdate[];
  validations: ValidationContract[];
  readyForHostWrite: boolean;
  /** Host Write Readiness Gate 详情 (T065) */
  hostWriteReadiness?: HostWriteReadiness;
  /** T138-R1: Parameters extracted from prompt (cooldown, mana, range, etc.) */
  parameters?: Record<string, unknown>;
  featureAuthoring?: FeatureAuthoring;
  fillContracts?: FillContract[];
  implementationStrategy?: ImplementationStrategy;
  validationStatus?: ValidationStatus;
  dependencyEdges?: FeatureDependencyEdge[];
  commitDecision?: CommitDecision;
  sourceKind?: ModuleSourceKind;
  synthesizedArtifacts?: SynthesizedArtifact[];
  artifactSynthesisResult?: ArtifactSynthesisResult;
}

/**
 * Assembly Module - 带有 pattern 归属的就绪模块
 * 与 docs/ASSEMBLY-REALIZATION-NOTES.md 对齐
 */
export interface AssemblyModule {
  id: string;
  role: RealizationRole;
  selectedPatterns: string[];
  outputKinds: ("server" | "shared" | "ui" | "bridge")[];
  sourceKind?: ModuleSourceKind;
  /** T172-R1: Propagate module-specific parameters from Blueprint for case-specific fill */
  parameters?: Record<string, unknown>;
  /** T149: Explicit outputs for finer-grained output expression (optional, for future composite features) */
  outputs?: HostRealizationOutput[];
  realizationHints?: {
    kvCapable?: boolean;
    runtimeHeavy?: boolean;
    uiRequired?: boolean;
    /** T112-R1: Marked when module is constructed via fallback (no Blueprint modules) */
    isFallback?: boolean;
  };
}

/** Host Write Readiness Gate (T065) */
export interface HostWriteReadiness {
  /** 是否就绪 */
  ready: boolean;
  /** 检查项列表 */
  checks: ReadinessCheck[];
  /** 阻塞原因 */
  blockers: string[];
}

/** 单个就绪检查项 */
export interface ReadinessCheck {
  /** 检查项名称 */
  name: string;
  /** 是否通过 */
  passed: boolean;
  /** 严重级别 */
  severity: "error" | "warning";
  /** 描述信息 */
  message: string;
}

export interface SelectedPattern {
  patternId: string;
  role: string;
  parameters?: Record<string, unknown>;
}

export interface WriteTarget {
  target: "server" | "shared" | "ui" | "config";
  path: string;
  summary: string;
}

export interface BridgeUpdate {
  target: "server" | "ui";
  file: string;
  action: "create" | "refresh" | "inject_once";
}

// ============================================================================
// Host Realization Plan Types
// 与 docs/HOST-REALIZATION-SCHEMA.md 和 docs/HOST-REALIZATION-CONTRACT.md 对齐
// ============================================================================

/**
 * Dota2 Host  realization 类型
 * 与 docs/hosts/dota2/DOTA2-HOST-REALIZATION-POLICY.md 对齐
 * T143: Added "lua" for formal routing of lua ability patterns
 * T143-R1: Added "kv+lua" to represent lua-backed abilities with kv static shell
 */
export type RealizationType = "kv" | "ts" | "ui" | "lua" | "kv+lua" | "kv+ts" | "shared-ts" | "bridge-only";

/**
 * Host Realization Output - T148
 * Explicit output representation for multi-output realization.
 * Used alongside realizationType for backward compatibility.
 */
export interface HostRealizationOutput {
  /** Kind of output (kv/ts/ui/lua/bridge) */
  kind: "kv" | "ts" | "ui" | "lua" | "bridge";
  /** Target path in the host */
  target: string;
  /** Why this output was chosen */
  rationale?: string[];
}

/**
 * Host Realization 单位角色
 * 与 docs/ASSEMBLY-REALIZATION-NOTES.md 对齐
 */
export type RealizationRole = "gameplay-core" | "ui-surface" | "shared-support" | "bridge-support";

/**
 * Host Realization Plan
 * 位置: AssemblyPlan -> HostRealizationPlan -> GeneratorRoutingPlan
 * 与 docs/HOST-REALIZATION-SCHEMA.md 对齐
 */
export interface HostRealizationPlan {
  /** Schema version for compatibility checking */
  version: string;
  /** Target host identifier (e.g., "dota2") */
  host: string;
  /** T112-R1: References blueprintId, not assemblyPlanId */
  sourceBlueprintId: string;
  /** Realization units for each module */
  units: HostRealizationUnit[];
  /** Blocking issues that prevent realization */
  blockers: string[];
  /** Informational notes about the realization process */
  notes: string[];
}

/**
 * Host Realization Unit
 * Single module unit that needs to be materialized in the host
 */
export interface HostRealizationUnit {
  /** Unique identifier for this realization unit */
  id: string;
  /** Source module this unit is derived from */
  sourceModuleId: string;
  /** Patterns that contribute to this unit */
  sourcePatternIds: string[];
  /** Whether the unit came from templated assembly or synthesized artifacts */
  sourceKind: ModuleSourceKind;
  /** Role in the host realization (e.g., "gameplay-core", "ui-surface") */
  role: RealizationRole;
  /** How this unit should be materialized */
  realizationType: RealizationType;
  /** Target paths/endpoints in the host */
  hostTargets: string[];
  /** T148: Explicit outputs for multi-output realization (optional, for migration) */
  outputs?: HostRealizationOutput[];
  /** T172-R1: Propagate module parameters for case-specific fill */
  parameters?: Record<string, unknown>;
  /** Why this realization type was chosen */
  rationale: string[];
  /** Confidence in the realization decision */
  confidence: "high" | "medium" | "low";
  /** Issues that block this realization */
  blockers?: string[];
}

/**
 * Generator Routing Plan - T115
 * Position: AssemblyPlan -> HostRealizationPlan -> GeneratorRoutingPlan -> Generators
 * Routes each HostRealizationUnit to concrete generator families (ts/ui/kv/bridge)
 */
export interface GeneratorRoutingPlan {
  /** Schema version */
  version: "1.0";
  /** Target host identifier */
  host: string;
  /** Source blueprint this routing plan is derived from */
  sourceBlueprintId: string;
  /** Individual routes from realization units to generator families */
  routes: GeneratorRoute[];
  /** Overall warnings from the routing process */
  warnings: string[];
  /** Overall blocking issues from the routing process */
  blockers: string[];
}

/**
 * Generator Route - T113
 * Minimal routing unit from HostRealizationPlan to concrete generator families.
 * Aligns with docs/GENERATOR-ROUTING-SCHEMA.md GeneratorRoute shape.
 */
export interface GeneratorRoute {
  /** Unique route identifier */
  id: string;
  /** Source realization unit this route is derived from */
  sourceUnitId: string;
  /** Whether the route came from templated assembly or synthesized artifacts */
  sourceKind: ModuleSourceKind;
  /** Target generator family for this route */
  generatorFamily: "dota2-kv" | "dota2-ts" | "dota2-ui" | "dota2-lua" | "bridge-support";
  /** Kind of output this route produces */
  routeKind: "kv" | "ts" | "ui" | "lua" | "bridge";
  /** Target path in the host */
  hostTarget: string;
  /** T143-R2: Source pattern IDs this route is derived from */
  sourcePatternIds: string[];
  /** T172-R1: Parameters from source module for case-specific fill */
  parameters?: Record<string, unknown>;
  /** Why this route was chosen */
  rationale: string[];
  /** Issues blocking this route */
  blockers?: string[];
}

/**
 * Generator Aggregate Output - T113
 * Minimal aggregate output from all generators before write planning.
 * Consolidates kv/ts/ui outputs with their route metadata.
 */
export interface GeneratorAggregateOutput {
  /** Schema version */
  version: "1.0";
  /** Target host identifier */
  host: string;
  /** Source blueprint this output is derived from */
  sourceBlueprintId: string;
  /** Individual route outputs from generators */
  routes: GeneratorRouteOutput[];
  /** Warnings from the aggregation process */
  aggregateWarnings: string[];
  /** Blocking issues from the aggregation process */
  aggregateBlockers: string[];
}

/**
 * Generator Route Output - T113
 * Single generated output from a generator family, with metadata.
 */
export interface GeneratorRouteOutput {
  /** Unique output identifier */
  id: string;
  /** Source realization unit this output is derived from */
  sourceUnitId: string;
  /** Generator family that produced this output */
  generatorFamily: "dota2-kv" | "dota2-ts" | "dota2-ui" | "dota2-lua" | "bridge-support";
  /** Kind of output this represents */
  routeKind: "kv" | "ts" | "ui" | "lua" | "bridge";
  /** Target path in the host */
  hostTarget: string;
  /** Generated content (if not blocked) */
  content?: string;
  /** Content type for the generated file */
  contentType: "typescript" | "tsx" | "less" | "kv" | "json";
  /** Final target path where content should be written */
  targetPath: string;
  /** Exported symbols from this output */
  exports: string[];
  /** Warnings from the generation process */
  warnings: string[];
  /** Whether this output is blocked */
  blocked: boolean;
  /** Reason for blocking if blocked */
  blockerReason?: string;
}

/**
 * T119: Artifact Status Semantics
 * Formalizes the meaning of routed / generated / deferred / blocked states
 * in review artifacts. These apply to GeneratorRoute and GeneratorRouteOutput.
 *
 * ## routed
 * Generator Router has assigned a generatorFamily and the unit is dispatched.
 * Does NOT mean: output exists, file written, validation passed.
 *
 * ## generated
 * Generator has produced output (string) for a routed unit, ready for write planning.
 * Does NOT mean: file written, validation passed.
 *
 * ## deferred
 * Unit is recognized but intentionally postponed - required generator not yet in mainline
 * (e.g. KV before v1) or capability is beyond current scope.
 * Not blocked - system is aware and waiting, not stuck.
 *
 * ## blocked
 * Unit cannot proceed due to a named, articulable blocker.
 * Requires resolution before continuation.
 */
export type ArtifactStatus = "routed" | "generated" | "deferred" | "blocked";

/**
 * T119: Validation Layering Types
 * Five validation stages from route-level to runtime.
 * Each stage is independent and produces its own issue list.
 */

/**
 * Stage 1: Route-Level Validation
 * Validates coherence between HostRealizationPlan and GeneratorRoutingPlan.
 * Run after GeneratorRoutingPlan is built, before generators are called.
 */
export interface RouteLevelValidationResult {
  stage: "route-level";
  valid: boolean;
  issues: ValidationIssue[];
}

/**
 * Stage 2: Generator Output Validation
 * Validates well-formed output from each generator family.
 * Run after each generator completes, before write planning.
 */
export interface GeneratorOutputValidationResult {
  stage: "generator-output";
  generatorFamily: "dota2-kv" | "dota2-ts" | "dota2-ui" | "dota2-lua" | "bridge-support";
  routeId: string;
  valid: boolean;
  issues: ValidationIssue[];
}

/**
 * T119: Generator Stage vs GeneratorRouting Stage Boundary
 *
 * generatorRouting stage is responsible for:
 * - Routing decisions (which generatorFamily receives which unit)
 * - Per-route status: routed | deferred | blocked
 * - blockers[] per route
 * - NOT output content - only routing intent
 *
 * generator stage is responsible for:
 * - Actual code emission (TS/KV/UI strings)
 * - Per-route output status: generated | blocked
 * - generatedFiles[] list
 * - NOT routing decisions
 *
 * This separation allows:
 * - Multi-generator (KV+TS+UI) to be tracked per-family
 * - Deferred routes to be clearly distinguished from blocked routes
 * - Per-generator validation at stage 2
 */
