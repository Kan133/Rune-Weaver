// Feature-First Workbench Types
// Based on docs/WORKBENCH-FRONTEND-PLAN-ZH.md

export type FeatureCardStatus = "draft" | "needs_clarification" | "ready" | "blocked";

export type FeaturePersistenceState = "new" | "runtime" | "persisted";

export type FeatureRoutingDecision = "create" | "update" | "possible_match" | "unclear";

export type FeatureFocusType = "newly_created" | "persisted_existing" | "candidate_match" | "runtime_only";

export type UpdateHandoffStatus = "direct_target" | "candidate_target" | "unresolved";

export type UpdateHandlerStatus = "ready_for_dry_run" | "blocked_waiting_target" | "blocked_waiting_confirmation" | "not_applicable";

export type LifecycleActionKind = "create" | "read" | "update" | "archive";

export type ActionRouteStatus = "matched" | "unavailable";

export type RiskLevel = "low" | "medium" | "high";

export type ConfidenceLevel = "high" | "medium" | "low";

// F003: Beginner-friendly feature categories
export type FeatureCategory =
  | "hero"           // 英雄
  | "ability"        // 技能
  | "talent"         // 天赋
  | "item"           // 物品
  | "ui_visual"      // UI 表现
  | "rule_mechanic"  // 规则机制
  | "input_interaction" // 输入交互
  | "data_config"    // 数据配置
  | "other";         // 其他

export interface FeatureCard {
  id: string;
  displayLabel: string;
  systemLabel: string;
  summary: string;
  host: string;
  status: FeatureCardStatus;
  riskLevel: RiskLevel;
  needsConfirmation: boolean;
  // F003: Add category for beginner-friendly classification
  category?: FeatureCategory;
  categoryLabel?: string;
  // F003: Simplified affected areas for beginners
  affectedAreas?: string[];
  nextAction?: string;
  createdAt: string;
  updatedAt: string;
}

export interface FeatureDetailBasicInfo {
  id: string;
  displayLabel: string;
  systemLabel: string;
  intentSummary: string;
  hostScope: string;
  createdAt: string;
  updatedAt: string;
}

export interface FeatureDetailStatus {
  status: FeatureCardStatus;
  riskLevel: RiskLevel;
  needsConfirmation: boolean;
  conflictCount: number;
  lastConflictSummary: string;
}

export interface FeatureDetailEditableParams {
  knownInputs: Record<string, unknown>;
  missingParams: string[];
  canEdit: boolean;
}

export type OwnershipSurface =
  | "ability"
  | "unit"
  | "item"
  | "hero"
  | "map"
  | "ui"
  | "kv"
  | "lua"
  | "ts"
  | "trigger"
  | "data"
  | "rule"
  | "effect"
  | "shared";

export type ImpactArea = "gameplay" | "ui" | "ui_surface" | "data" | "audio" | "visual" | "network" | "ability_system";

export interface FeatureDetailHostOutput {
  host: string;
  expectedSurfaces: OwnershipSurface[];
  impactAreas: ImpactArea[];
  integrationPointCount: number;
  outputSummary: string;
}

export interface FeatureDetailPatternBindings {
  patterns: string[];
  isBound: boolean;
}

export interface FeatureDetail {
  cardId: string;
  basicInfo: FeatureDetailBasicInfo;
  status: FeatureDetailStatus;
  editableParams: FeatureDetailEditableParams;
  hostOutput: FeatureDetailHostOutput;
  patternBindings: FeatureDetailPatternBindings;
}

export interface FeatureReview {
  summary: string;
  recognizedCapabilities: string[];
  knownInputs: Record<string, unknown>;
  conflictSummary: string;
  nextStep: string;
}

export interface LifecycleAction {
  kind: LifecycleActionKind;
  enabled: boolean;
  reason: string;
  nextHint?: string;
}

export interface LifecycleActions {
  cardId: string;
  currentStage: FeatureCardStatus;
  persistenceState: FeaturePersistenceState;
  persistedFeatureId: string | null;
  persistenceReason: string;
  actions: LifecycleAction[];
}

export interface ActionRoute {
  kind: LifecycleActionKind;
  targetCardId: string;
  targetCardLabel: string;
  requestedAction?: LifecycleActionKind;
  status: ActionRouteStatus;
  reason: string;
}

export interface ActionRouteResult {
  primaryRoute: ActionRoute;
  alternativeRoutes: ActionRoute[];
}

export interface FeatureRouting {
  decision: FeatureRoutingDecision;
  confidence: ConfidenceLevel;
  candidates: Array<{
    candidateId: string;
    featureLabel: string;
    confidence: ConfidenceLevel;
    matchedPatterns: string[];
    reason: string;
  }>;
  rationale: string;
  nextHint: string;
}

export interface FeatureFocus {
  focusType: FeatureFocusType;
  featureId?: string;
  featureLabel?: string;
  reason: string;
  source: string;
  persistenceRelation?: "newly_created" | "persisted_match" | "runtime_only";
}

export interface UpdateHandoff {
  status: UpdateHandoffStatus;
  targetFeatureId?: string;
  targetFeatureLabel?: string;
  handoverReason: string;
  nextHint: string;
}

export interface UpdateHandler {
  status: UpdateHandlerStatus;
  reason: string;
  nextHint: string;
}

export interface UpdateDryRunPlan {
  planId: string;
  targetFeatureId: string;
  affectedSurfaces: Array<{
    surfaceId: string;
    surfaceKind: string;
    changeType: "modify" | "add" | "remove";
    riskLevel: RiskLevel;
  }>;
  estimatedImpact: string;
  canProceed: boolean;
  blockers: string[];
}

export interface UpdateWriteResult {
  success: boolean;
  writtenFiles: string[];
  failedFiles: string[];
  rollbackAvailable: boolean;
  message: string;
}

export interface GovernanceRelease {
  status: "not_required" | "awaiting_confirmation" | "released" | "blocked" | "blocked_by_conflict" | "blocked_pending_confirmation" | "blocked_by_governance";
  blockedReason: string | null;
  requiredConfirmations: Array<{
    itemId: string;
    itemType: "conflict" | "parameter" | "ownership";
    description: string;
    severity: RiskLevel;
    currentValue?: string;
    suggestedValue?: string;
  }>;
  nextAllowedTransition: string | null;
  releaseHint: string;
  canSelfRelease: boolean;
}

export interface ConfirmationAction {
  itemId: string;
  description: string;
  confirmed: boolean;
  required: boolean;
}

export interface BlueprintModule {
  moduleId: string;
  patternIds: string[];
  role: string;
  description: string;
}

export interface BlueprintProposal {
  blueprintId: string;
  featureId: string;
  modules: BlueprintModule[];
  affectedSurfaces: OwnershipSurface[];
  rationale: string;
}

export interface OutputEvidence {
  filePath: string;
  contentType: "kv" | "ts" | "lua" | "tsx" | "less" | "ui" | "other";
  description: string;
  size: number;
  status?: "created" | "modified" | "deleted" | "unchanged";
}

export interface SessionSummary {
  sessionId: string;
  status: "active" | "completed" | "error" | "closed";
  currentFeatureId?: string;
  hostRoot: string;
}

// F003: Simplified workbench state for beginner-first UI
export interface WorkbenchState {
  session: SessionSummary;
  featureCard?: FeatureCard;
  featureDetail?: FeatureDetail;
  featureReview?: FeatureReview;
  lifecycleActions?: LifecycleActions;
  actionRoute?: ActionRouteResult;
  featureRouting?: FeatureRouting;
  featureFocus?: FeatureFocus;
  updateHandoff?: UpdateHandoff;
  updateHandler?: UpdateHandler;
  updateDryRunPlan?: UpdateDryRunPlan;
  updateWriteResult?: UpdateWriteResult;
  governanceRelease?: GovernanceRelease;
  confirmationActions?: ConfirmationAction[];
  blueprintProposal?: BlueprintProposal;
  outputEvidence?: OutputEvidence[];
}

// F004: Extended scenarios for adapter testing
export type MockScenario = "create" | "update" | "governance-blocked" | "write-success";
