/**
 * Rune Weaver - Core Schema Types
 * 
 * 定义意图层 (Intent Layer) 和实现编排层的核心类型
 * 与 docs/SCHEMA.md 保持一致
 */

// ============================================================================
// Host Descriptor
// ============================================================================

export interface HostDescriptor {
  kind: "dota2-x-template" | "unknown";
  projectRoot?: string;
}

// ============================================================================
// Intent Schema - 需求层核心对象
// 与 SCHEMA.md 4.2 节对齐
// ============================================================================

export interface IntentSchema {
  version: string;
  host: HostDescriptor;
  request: UserRequestSummary;
  classification: IntentClassification;
  requirements: IntentRequirements;
  constraints: IntentConstraints;
  uiRequirements?: UIRequirementSummary;
  normalizedMechanics: NormalizedMechanics;
  openQuestions: string[];
  resolvedAssumptions: string[];
  isReadyForBlueprint: boolean;
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
  connections: BlueprintConnection[];
  patternHints: PatternHint[];
  uiDesignSpec?: UIDesignSpec;
  assumptions: string[];
  validations: ValidationContract[];
  readyForAssembly: boolean;
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
  writeTargets: WriteTarget[];
  bridgeUpdates?: BridgeUpdate[];
  validations: ValidationContract[];
  readyForHostWrite: boolean;
  /** Host Write Readiness Gate 详情 (T065) */
  hostWriteReadiness?: HostWriteReadiness;
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
