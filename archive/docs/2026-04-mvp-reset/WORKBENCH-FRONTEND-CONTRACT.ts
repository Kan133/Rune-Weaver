/**
 * Workbench Frontend Result Contract
 * 
 * This contract provides a stable interface for frontend consumption.
 * Frontend should NOT depend on CLI console output.
 * 
 * Version: 1.0
 */

export type FeatureCardStatus = "draft" | "needs_clarification" | "ready" | "blocked";

export type RiskLevel = "low" | "medium" | "high";

export type Confidence = "high" | "medium" | "low";

export type LifecycleActionKind = "create" | "read" | "update" | "archive";

export type PersistenceState = "new" | "runtime" | "persisted";

export type RoutingDecision = "create" | "update" | "possible_match" | "unclear";

export type GovernanceStatus = "not_required" | "awaiting_confirmation" | "released" | "blocked";

export type ConfirmationStatus = "not_applicable" | "awaiting_items" | "accepted" | "fully_confirmed" | "rejected";

export type HandoffStatus = "direct_target" | "candidate_target" | "unresolved";

export type FocusType = "newly_created" | "persisted_existing" | "candidate_match" | "runtime_only";

export type OutputStatus = "created" | "modified" | "deleted" | "unchanged";

export type ProposalStatus = "draft" | "proposed" | "usable" | "accepted";

export type ContentType = "lua" | "kv" | "ts" | "ui" | "other";

export type ConfirmationItemType = "conflict" | "parameter" | "ownership";

export interface Session {
  sessionId: string;
  createdAt: string;
  originalRequest: string;
  hostRoot: string;
}

export interface FeatureSummary {
  id: string;
  displayLabel: string;
  systemLabel: string;
  summary: string;
  host: string;
}

export interface FeatureCard {
  id: string;
  displayLabel: string;
  systemLabel: string;
  summary: string;
  host: string;
  status: FeatureCardStatus;
  riskLevel: RiskLevel;
  needsConfirmation: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BasicInfo {
  id: string;
  displayLabel: string;
  systemLabel: string;
  intentSummary: string;
  hostScope: string;
  createdAt: string;
  updatedAt: string;
}

export interface FeatureStatus {
  status: FeatureCardStatus;
  riskLevel: RiskLevel;
  needsConfirmation: boolean;
  conflictCount: number;
  lastConflictSummary: string;
}

export interface EditableParams {
  knownInputs: Record<string, unknown>;
  missingParams: string[];
  canEdit: boolean;
}

export interface HostOutput {
  host: string;
  expectedSurfaces: string[];
  impactAreas: string[];
  integrationPointCount: number;
  outputSummary: string;
}

export interface PatternBindings {
  patterns: string[];
  isBound: boolean;
}

export interface FeatureDetail {
  cardId: string;
  basicInfo: BasicInfo;
  status: FeatureStatus;
  editableParams: EditableParams;
  hostOutput: HostOutput;
  patternBindings: PatternBindings;
}

export interface LifecycleAction {
  kind: LifecycleActionKind;
  enabled: boolean;
  reason: string;
  nextHint?: string;
}

export interface Lifecycle {
  cardId: string;
  currentStage: FeatureCardStatus;
  persistenceState: PersistenceState;
  persistedFeatureId: string | null;
  persistenceReason: string;
  actions: LifecycleAction[];
}

export interface Focus {
  type: FocusType;
  featureId?: string;
  featureLabel?: string;
  reason: string;
}

export interface Handoff {
  status: HandoffStatus;
  targetFeatureId?: string;
  targetFeatureLabel?: string;
  handoverReason: string;
}

export interface Routing {
  decision: RoutingDecision;
  confidence: Confidence;
  focus: Focus;
  handoff: Handoff;
}

export interface RequiredConfirmationItem {
  itemId: string;
  itemType: ConfirmationItemType;
  description: string;
  severity: RiskLevel;
  currentValue?: string;
  suggestedValue?: string;
}

export interface GovernanceRelease {
  status: GovernanceStatus;
  blockedReason: string | null;
  requiredConfirmations: RequiredConfirmationItem[];
  nextAllowedTransition: string | null;
  releaseHint: string;
  canSelfRelease: boolean;
}

export interface Confirmation {
  actionStatus: ConfirmationStatus;
  acceptedItemIds: string[];
  remainingItemCount: number;
  transitionResult: "released_to_ready" | "still_blocked" | "not_needed";
  actionHint: string;
  canProceed: boolean;
}

export interface Governance {
  release: GovernanceRelease;
  confirmation: Confirmation;
}

export interface AffectedSurface {
  surfaceKind: string;
  surfaceId?: string;
  description: string;
  riskLevel?: RiskLevel;
}

export interface TouchedOutput {
  outputKind: string;
  outputPath: string;
  description: string;
  status: OutputStatus;
}

export interface GeneratedFile {
  path: string;
  contentType: ContentType;
  generatedAt: string;
}

export interface ProposedModule {
  id: string;
  role: string;
  category: string;
  patternIds: string[];
}

export interface Proposal {
  id: string;
  status: ProposalStatus;
  modules: ProposedModule[];
  confidence: Confidence;
  notes: string[];
  issues: string[];
}

export interface Evidence {
  affectedSurfaces: AffectedSurface[];
  touchedOutputs: TouchedOutput[];
  generatedFiles: GeneratedFile[];
  proposal: Proposal | null;
}

export interface WorkbenchError {
  code: string;
  message: string;
  details: Record<string, unknown> | null;
  recoverable: boolean;
}

export interface WorkbenchFrontendResult {
  success: boolean;
  session: Session | null;
  featureSummary: FeatureSummary | null;
  featureCard: FeatureCard | null;
  featureDetail: FeatureDetail | null;
  lifecycle: Lifecycle | null;
  routing: Routing | null;
  governance: Governance | null;
  evidence: Evidence | null;
  errors: WorkbenchError[];
}

export function createEmptyResult(): WorkbenchFrontendResult {
  return {
    success: false,
    session: null,
    featureSummary: null,
    featureCard: null,
    featureDetail: null,
    lifecycle: null,
    routing: null,
    governance: null,
    evidence: null,
    errors: []
  };
}
