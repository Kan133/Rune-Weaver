import type { LLMMessage } from "../llm/index.js";

export type GapFillSlotScope = "pattern" | "binding" | "generator-template";

export type GapFillSlotKind =
  | "literal.text"
  | "literal.number"
  | "enum.choice"
  | "expression.formula"
  | "mapping.object"
  | "callback.fragment"
  | "payload.template"
  | "implementation.fragment";

export interface GapFillSlotDescriptor {
  slotId: string;
  slotKind: GapFillSlotKind;
  scope: GapFillSlotScope;
  required: boolean;
  valueType?: string;
  grammar?: string;
  allowedSymbols?: string[];
  bounds?: string[];
  sourceOfTruth?: string;
  validatorIds?: string[];
  fallbackPolicy?: "reject" | "default" | "escalate";
  description?: string;
}

export interface GapFillPlanMetadata {
  planId: string;
  createdAt: string;
  summary: string;
  operationCount: number;
  includesReplace: boolean;
  includesInsert: boolean;
  includesDelete: boolean;
  notes?: string[];
  tags?: string[];
}

export interface GapFillValidationIssue {
  code: string;
  message: string;
  category: GapFillFailureCategory;
  details?: string[];
  evidence?: string[];
}

export type GapDescriptorKind = "closed" | "open";

export type GapFillPatchOperationKind = "replace" | "insert_before" | "insert_after" | "delete";
export type GapFillDecision = "auto_apply" | "require_confirmation" | "reject";
export type GapFillRiskLevel = "low" | "medium" | "high";
export type GapDescriptorStatus = "ready" | "needs_confirmation" | "blocked";
export type GapDescriptorSource = "user_provided" | "inferred" | "canonical_assist" | "unresolved";
export type GapFillPlanScopeKind = "single_boundary";
export type GapFillMode = "review" | "apply" | "validate-applied";
export type GapFillFailureCategory =
  | "spec_ambiguity"
  | "approval_required"
  | "host_readiness"
  | "write_mismatch"
  | "runtime_risk"
  | "build_failure"
  | "policy_reject";

export interface GapFillBoundaryInfo {
  id: string;
  label: string;
  filePath: string;
  anchor: string;
  allowed: string[];
  forbidden: string[];
  slotDescriptor?: GapFillSlotDescriptor;
  descriptorKind?: GapDescriptorKind;
  hostTargets?: string[];
  scope?: GapFillSlotScope;
  tags?: string[];
}

export interface GapFillBoundaryProvider {
  getBoundary(boundaryId: string): GapFillBoundaryInfo | undefined;
  listBoundaries(): GapFillBoundaryInfo[];
}

export interface GapDescriptor {
  id: string;
  label: string;
  status: GapDescriptorStatus;
  source: GapDescriptorSource;
  boundary: GapFillBoundaryInfo;
  targetFile: string;
  assumptionsMade: string[];
  userInputsUsed: string[];
  inferredInputsUsed: string[];
  canonicalAssistUsed: boolean;
  descriptorKind?: GapDescriptorKind;
  scope?: GapFillSlotScope;
  slotDescriptor?: GapFillSlotDescriptor;
  planMetadata?: GapFillPlanMetadata;
  tags?: string[];
}

export interface GapFillTargetFile {
  path: string;
  content: string;
  lineCount: number;
  sizeBytes: number;
}

export interface GapFillPatchOperation {
  kind: GapFillPatchOperationKind;
  target: string;
  reason: string;
  excerpt?: string;
  replacement?: string;
}

export interface GapFillPlanScope {
  kind: GapFillPlanScopeKind;
  boundaryId: string;
  targetFile: string;
}

export interface GapFillPatchPlan {
  boundaryId: string;
  targetFile: string;
  summary: string;
  operations: GapFillPatchOperation[];
  notes?: string[];
  scope?: GapFillPlanScope;
  metadata?: GapFillPlanMetadata;
  assumptionsMade?: string[];
  userInputsUsed?: string[];
  inferredInputsUsed?: string[];
  source?: GapDescriptorSource;
  canonicalAssistUsed?: boolean;
}

export interface GapFillPromptContext {
  boundary: GapFillBoundaryInfo;
  hostRoot: string;
  instruction: string;
  targetFile: GapFillTargetFile;
}

export interface GapFillReviewSummary {
  boundaryId: string;
  targetFile: string;
  allowed: string[];
  forbidden: string[];
  llmConfigured: boolean;
  summary: string;
  issues: string[];
  operations: GapFillPatchOperation[];
}

export interface GapFillDecisionIssue {
  code: string;
  category: GapFillFailureCategory;
  message: string;
}

export interface GapFillRunInput {
  projectRoot: string;
  hostRoot: string;
  llmConfigured: boolean;
  llmModel?: string;
  llmProvider?: string;
  llmTemperature?: number;
  llmProviderOptions?: Record<string, unknown>;
  instruction: string;
  boundary: GapFillBoundaryInfo;
  targetFile: GapFillTargetFile;
}

export interface GapFillRunResult {
  success: boolean;
  summary: string;
  promptMessages: LLMMessage[];
  patchPlan?: GapFillPatchPlan;
  rawModelText?: string;
  issues: string[];
}

export interface GapFillDecisionResult {
  decision: GapFillDecision;
  riskLevel: GapFillRiskLevel;
  reasons: GapFillDecisionIssue[];
  userSummary: string;
  canApplyDirectly: boolean;
  failureCategories: GapFillFailureCategory[];
}

export interface GapFillDecisionRecord {
  requestedBoundaryId: string;
  requestedBoundaryLabel: string;
  targetFile: string;
  originalInstruction: string;
  source: GapDescriptorSource;
  canonicalAssistUsed: boolean;
  assumptionsMade: string[];
  userInputsUsed: string[];
  inferredInputsUsed: string[];
  approvalDecision: GapFillDecision;
  failureCategories: GapFillFailureCategory[];
  recommendedNextStep?: string;
  planMetadata?: GapFillPlanMetadata;
}

export interface GapFillApplyRequest {
  mode: GapFillMode;
  requestedBoundaryId: string;
  approvedBoundaryId?: string;
  approvalId?: string;
  targetFile: string;
}

export interface GapFillApplyResult {
  requested: boolean;
  attempted: boolean;
  success: boolean;
  boundaryId: string;
  targetFile: string;
  targetPath?: string;
  approvalId?: string;
  appliedOperations: string[];
  issues: string[];
  failureCategory?: GapFillFailureCategory;
}

export interface GapFillValidationCheck {
  id: string;
  passed: boolean;
  message: string;
  details?: string[];
  category?: GapFillFailureCategory;
}

export interface GapFillValidationResult {
  success: boolean;
  boundaryId: string;
  targetFile: string;
  checks: GapFillValidationCheck[];
  issues: string[];
  failureCategories: GapFillFailureCategory[];
  issueDetails?: GapFillValidationIssue[];
  planMetadata?: GapFillPlanMetadata;
  recommendedNextStep?: string;
}
