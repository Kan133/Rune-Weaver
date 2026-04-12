import type { IntentSchema } from "../../core/schema/types.js";

export interface WorkbenchOptions {
  hostRoot: string;
  dryRun?: boolean;
  confirmedItemIds?: string[];
  write?: boolean;
}

export interface FailureCorpus {
  userRequest: string;
  proposalStatus: string;
  proposalSource: "llm" | "fallback" | undefined;
  confidence: string;
  invalidPatternIds: Record<string, string[]>;
  gapFillSummary: {
    identified: number;
    filled: number;
    unfilled: number;
    categoryE: number;
  };
  categoryESummary: string[];
  degraded: boolean;
  fallback: boolean;
}

export interface WorkbenchResult {
  success: boolean;
  session?: IntakeSession;
  featureIdentity?: FeatureIdentity;
  featureOwnership?: FeatureOwnership;
  integrationPoints?: IntegrationPointRegistry;
  conflictResult?: ConflictCheckResult;
  featureCard?: FeatureCard;
  featureDetail?: FeatureDetail;
  lifecycleActions?: LifecycleActions;
  actionRoute?: ActionRouteResult;
  wizardDegradation?: WizardDegradationInfo;
  featureRouting?: FeatureRouting;
  featureFocus?: FeatureFocus;
  updateHandoff?: UpdateHandoff;
  updateHandler?: UpdateHandler;
  updateWriteResult?: UpdateWriteResult;
  governanceRelease?: GovernanceRelease;
  confirmationAction?: ConfirmationAction;
  gapFillResult?: GapFillResult;
  failureCorpus?: FailureCorpus;
  error?: string;
}

export type FeatureCardStatus = "draft" | "needs_clarification" | "ready" | "blocked";

export interface FeatureCard {
  id: string;
  displayLabel: string;
  systemLabel: string;
  summary: string;
  host: string;
  status: FeatureCardStatus;
  riskLevel: "low" | "medium" | "high";
  needsConfirmation: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface FeatureDetailBasicInfo {
  id: string;
  displayLabel: string;
  systemLabel: string;
  intentSummary: string;
  hostScope: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface FeatureDetailStatus {
  status: FeatureCardStatus;
  riskLevel: "low" | "medium" | "high";
  needsConfirmation: boolean;
  conflictCount: number;
  lastConflictSummary: string;
}

export interface KnownInputs {
  [key: string]: unknown;
}

export interface FeatureDetailEditableParams {
  knownInputs: KnownInputs;
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

export type LifecycleActionKind = "create" | "read" | "update" | "archive";

export interface LifecycleAction {
  kind: LifecycleActionKind;
  enabled: boolean;
  reason: string;
  nextHint?: string;
}

export type FeaturePersistenceState = "new" | "runtime" | "persisted";

export interface LifecycleActions {
  cardId: string;
  actions: LifecycleAction[];
  currentStage: FeatureCardStatus;
  persistenceState: FeaturePersistenceState;
  persistedFeatureId?: string;
  persistenceReason: string;
}

export type ActionRouteStatus = "matched" | "unavailable";

export interface ActionRoute {
  routeId: string;
  status: ActionRouteStatus;
  targetFeatureId?: string;
  reason: string;
  requestedAction?: string;
  targetCardId?: string;
  routeReason?: string;
  nextHint?: string;
}

export interface ActionRouteResult {
  route: ActionRoute;
  alternativeRoutes: ActionRoute[];
}

export type FeatureRoutingDecision = "create" | "update" | "possible_match" | "unclear";

export interface FeatureRoutingCandidate {
  candidateId: string;
  featureLabel: string;
  confidence: "high" | "medium" | "low";
  matchedPatterns: string[];
  reason: string;
}

export interface FeatureRouting {
  decision: FeatureRoutingDecision;
  confidence: "high" | "medium" | "low";
  candidates: FeatureRoutingCandidate[];
  rationale: string;
  candidateFeature?: { featureId: string; featureLabel: string };
  reason?: string;
  nextHint?: string;
}

export type FeatureFocusType = "newly_created" | "persisted_existing" | "candidate_match" | "runtime_only";

export interface FeatureFocus {
  focusType: FeatureFocusType;
  featureId?: string;
  featureLabel?: string;
  reason: string;
  persistenceRelation?: string;
  source?: string;
}

export type UpdateHandoffStatus = "direct_target" | "candidate_target" | "unresolved";

export interface UpdateHandoff {
  status: UpdateHandoffStatus;
  targetFeatureId?: string;
  targetFeatureLabel?: string;
  handoverReason: string;
  alternatives?: Array<{ featureId: string; featureLabel: string }>;
  confidence?: "high" | "medium" | "low";
  nextHint?: string;
}

export type UpdateHandlerStatus = "ready_for_dry_run" | "blocked_waiting_target" | "blocked_waiting_confirmation" | "not_applicable";

export interface UpdateHandler {
  status: UpdateHandlerStatus;
  targetFeatureId?: string;
  targetFeatureLabel?: string;
  handlerReason: string;
  confidence: "high" | "medium" | "low";
  nextHint?: string;
  dryRunEnabled: boolean;
  updatePlan?: UpdateDryRunPlan;
}

export type UpdatePlanStatus = "planning_ready" | "planning_blocked" | "planning_not_applicable";

export type UpdateOperationType = "no_op" | "modify_existing" | "attach_parameter_update";

export interface AffectedSurface {
  surfaceKind: string;
  surfaceId?: string;
  description: string;
  riskLevel?: "low" | "medium" | "high";
}

export interface UpdateDryRunPlan {
  planStatus: UpdatePlanStatus;
  targetFeatureId: string;
  targetFeatureLabel: string;
  operationType: UpdateOperationType;
  affectedSurfaces: AffectedSurface[];
  planningReason: string;
  nextHint: string;
  canProceed: boolean;
}

export type UpdateWriteStatus =
  | "not_applicable"
  | "blocked_by_plan"
  | "blocked_by_conflict"
  | "simulated"
  | "simulated_write"
  | "written"
  | "write_failed"
  | "forced_validation"
  | "forced_validation_write";

export type UpdateWriteMode = "dry_run" | "actual" | "simulated" | "forced_validation" | "actual_write" | "blocked";

export interface TouchedOutput {
  outputKind: string;
  outputPath: string;
  description: string;
  status: "created" | "modified" | "deleted" | "unchanged";
}

export interface UpdateWriteResult {
  writeStatus: UpdateWriteStatus;
  targetFeatureId: string;
  targetFeatureLabel: string;
  writeMode: UpdateWriteMode;
  touchedOutputs: TouchedOutput[];
  writeReason: string;
  nextHint?: string;
  canRetry: boolean;
}

export type GovernanceReleaseStatus =
  | "not_required"
  | "awaiting_confirmation"
  | "released"
  | "blocked"
  | "blocked_by_conflict"
  | "blocked_pending_confirmation"
  | "blocked_by_governance";

export interface RequiredConfirmationItem {
  itemId: string;
  itemType: "conflict" | "parameter" | "ownership";
  description: string;
  severity: "high" | "medium" | "low";
  currentValue?: string;
  suggestedValue?: string;
}

export interface GovernanceRelease {
  status: GovernanceReleaseStatus;
  blockedReason?: string | null;
  requiredConfirmations: RequiredConfirmationItem[];
  nextAllowedTransition?: string | null;
  releaseHint: string;
  canSelfRelease: boolean;
}

export type ConfirmationActionStatus =
  | "not_applicable"
  | "awaiting_items"
  | "partially_accepted"
  | "accepted"
  | "partially_confirmed"
  | "fully_confirmed"
  | "rejected";

export interface ConfirmedItem {
  itemId: string;
  confirmedAt: string;
  note?: string;
}

export interface ConfirmationAction {
  actionStatus: ConfirmationActionStatus;
  targetItemIds: string[];
  acceptedItems: ConfirmedItem[];
  remainingItems: RequiredConfirmationItem[];
  transitionResult: "released_to_ready" | "still_blocked" | "not_needed";
  actionHint: string;
  canProceed: boolean;
}

export type FeatureStage = "intake" | "routing" | "ownership" | "planning" | "generation" | "writing" | "complete";

export interface FeatureIdentity {
  id: string;
  label: string;
  intentSummary: string;
  hostScope: string;
  currentStage?: string;
  createdAt: Date;
}

export type OwnershipConfidence = "high" | "medium" | "low";

export interface FeatureOwnership {
  featureId: string;
  expectedSurfaces: OwnershipSurface[];
  impactAreas: ImpactArea[];
  confidence: OwnershipConfidence;
  isComplete: boolean;
}

export type IntegrationPointKind =
  | "trigger"
  | "modifier"
  | "ability"
  | "unit"
  | "item"
  | "event"
  | "kv"
  | "ui"
  | "custom"
  | "trigger_binding"
  | "kv_entry"
  | "modifier_slot"
  | "effect_slot"
  | "ui_mount"
  | "panel_event"
  | "event_hook"
  | "data_pool"
  | "ability_slot"
  | "lua_table";

export interface IntegrationPoint {
  id: string;
  key: string;
  kind: IntegrationPointKind;
  source: string;
  reason: string;
}

export interface IntegrationPointRegistry {
  featureId: string;
  points: IntegrationPoint[];
  confidence?: string;
}

export type UINeeds = "none" | "minimal" | "standard" | "rich";

export interface NextStepRecommendation {
  action: string;
  reason: string;
  priority?: "high" | "medium" | "low";
}

export interface ClarificationResult {
  hasMissingKeyParams: boolean;
  missingParams: string[];
  suggestions: string[];
}

export interface UIDetectionResult {
  uiNeeded: boolean;
  detectedUITriggers?: string[];
  uiBranchRecommended?: boolean;
}

export interface UIIntakeResult {
  entered?: boolean;
  surfaceType?: string;
  interactionLevel?: string;
  infoDensity?: string;
  missingInfo?: string[];
  canProceed?: boolean;
}

export type ConflictKind = "shared_integration_point" | "surface_overlap" | "pattern_conflict" | "ownership_conflict" | "integration_conflict";

export type ConflictSeverity = "error" | "warning" | "info";

export type ConflictStatus = "safe" | "needs_confirmation" | "blocked" | "unresolved" | "acknowledged" | "resolved";

export type RecommendedAction = "proceed" | "confirm" | "block" | "modify" | "escalate" | "abort";

export interface IntegrationPointConflict {
  kind: ConflictKind;
  severity: ConflictSeverity;
  conflictingPoint: string;
  existingFeatureId: string;
  existingFeatureLabel: string;
  explanation: string;
}

export interface ConflictCheckResult {
  featureId: string;
  hasConflict: boolean;
  conflicts: IntegrationPointConflict[];
  status: ConflictStatus;
  recommendedAction: RecommendedAction;
  summary: string;
}

export type ProposalStatus = "draft" | "proposed" | "usable" | "needs_review" | "accepted" | "rejected";

export interface ProposedModule {
  id: string;
  role: string;
  category: string;
  proposedPatternIds: string[];
  proposedParameters?: Record<string, unknown>;
  missingPatterns?: boolean;
  missingIntegration?: boolean;
  missingOwnership?: boolean;
  missingCapability?: boolean;
}

export interface ProposedConnection {
  sourceModuleId: string;
  targetModuleId: string;
  connectionType?: string;
}

export interface ExperienceReference {
  experienceId: string;
  reason?: string;
}

export interface BlueprintProposal {
  id: string;
  source: "llm" | "fallback";
  status: ProposalStatus;
  featureId: string;
  userRequest: string;
  proposedModules: ProposedModule[];
  proposedConnections: ProposedConnection[];
  confidence: OwnershipConfidence;
  notes: string[];
  issues: string[];
  referencedExperiences: ExperienceReference[];
  generatedAt: Date;
  invalidPatternIds?: Record<string, string[]>;
}

export type ExperienceKind = "case_preset" | "feature_preset" | "known_good_example" | "pattern" | "integration" | "ownership";

export type ExperienceMaturity = "nascent" | "emerging" | "stable" | "mature" | "proven" | "verified";

export interface ExperienceEntry {
  id: string;
  kind: ExperienceKind;
  host: string;
  featureType?: string;
  capabilityTags?: string[];
  suggestedModuleIds?: string[];
  suggestedPatternIds?: string[];
  notes?: string[];
  maturity: ExperienceMaturity;
  risks?: string[];
  description?: string;
}

export type GapKind = "title" | "description" | "duration" | "cooldown" | "choiceCount" | "pattern" | "integration" | "ownership" | "capability";

export type FillSource = "rule" | "llm" | "existing" | "generated" | "manual" | "clarification_needed";

export interface GapFillEntry {
  id: string;
  gapKind: GapKind;
  targetField: string;
  targetModuleId: string;
  fillSource: FillSource;
  suggestedValue: unknown;
  confidence: "high" | "medium" | "low";
  notes?: string[];
  risks?: string[];
}

export interface GapFillResult {
  identifiedGaps: GapFillEntry[];
  filledGaps: GapFillEntry[];
  unfilledGaps: GapFillEntry[];
  categoryEGaps: GapFillEntry[];
  categoryESummary: string[];
}

export type AnchorKind = "trigger_zone" | "spawn_point" | "area_anchor" | "marker" | "waypoint";

export interface SceneReference {
  id: string;
  anchorName: string;
  anchorKind: AnchorKind;
  host: string;
  notes: string[];
  confidence: "high" | "medium" | "low";
}

export interface ActualWriteResult {
  success: boolean;
  touchedOutputs: TouchedOutput[];
  error?: string;
}

export type WizardDegradationStatus = "none" | "partial" | "degraded" | "failed";

export interface WizardDegradationInfo {
  status: WizardDegradationStatus;
  reason: string;
  availableObjects?: string[];
}

export interface OwnershipSummary {
  expectedSurfaces: OwnershipSurface[];
  impactAreas: ImpactArea[];
  confidence: OwnershipConfidence;
}

export interface IntegrationPointSummary {
  points: string[];
  count: number;
  confidence?: string;
}

export interface ConflictSummary {
  hasConflict: boolean;
  conflictCount: number;
  status: ConflictStatus;
  recommendedAction: RecommendedAction;
  summary: string;
}

export interface UINeedsResult {
  needed: boolean;
  surfaceType?: string;
  interactionLevel?: string;
  infoDensity?: string;
  branchEntered?: boolean;
}

export interface FeatureReview {
  featureIdentityId: string;
  featureOwnershipId: string;
  integrationPointsId: string;
  featureSummary: string;
  recognizedCapabilities: string[];
  knownInputs: KnownInputs;
  missingConfirmations: string[];
  ownership: OwnershipSummary;
  integrationPoints: IntegrationPointSummary;
  conflict: ConflictSummary;
  uiNeeds?: UINeedsResult;
  nextStep: NextStepRecommendation;
  canProceed: boolean;
}

export type IntakeSessionStatus = "initialized" | "wizard_completed" | "ready_to_proceed" | "needs_clarification" | "review_completed" | "ui_intake_completed" | "error" | "completed" | "needs_clarification" | "degraded" | "failed";

export interface IntakeSession {
  id: string;
  originalRequest?: string;
  hostRoot?: string;
  createdAt: Date;
  featureIdentity: FeatureIdentity;
  featureOwnership: FeatureOwnership;
  integrationPoints: IntegrationPointRegistry;
  status: IntakeSessionStatus;
  uiIntake?: UIIntakeResult;
  review?: FeatureReview;
  wizardResult?: {
    schema: IntentSchema;
    issues: Array<{ severity: string; code?: string; scope?: string; message: string }>;
    valid: boolean;
  };
}
