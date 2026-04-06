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
  modules?: AssemblyModule[];
  writeTargets: WriteTarget[];
  bridgeUpdates?: BridgeUpdate[];
  validations: ValidationContract[];
  readyForHostWrite: boolean;
  /** Host Write Readiness Gate 详情 (T065) */
  hostWriteReadiness?: HostWriteReadiness;
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
 * 与 docs/DOTA2-HOST-REALIZATION-POLICY.md 对齐
 */
export type RealizationType = "kv" | "ts" | "ui" | "kv+ts" | "shared-ts" | "bridge-only";

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
  /** Role in the host realization (e.g., "gameplay-core", "ui-surface") */
  role: RealizationRole;
  /** How this unit should be materialized */
  realizationType: RealizationType;
  /** Target paths/endpoints in the host */
  hostTargets: string[];
  /** Why this realization type was chosen */
  rationale: string[];
  /** Confidence in the realization decision */
  confidence: "high" | "medium" | "low";
  /** Issues that block this realization */
  blockers?: string[];
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
  /** Target generator family for this route */
  generatorFamily: "dota2-kv" | "dota2-ts" | "dota2-ui" | "bridge-support";
  /** Kind of output this route produces */
  routeKind: "kv" | "ts" | "ui" | "bridge";
  /** Target path in the host */
  hostTarget: string;
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
  generatorFamily: "dota2-kv" | "dota2-ts" | "dota2-ui" | "bridge-support";
  /** Kind of output this represents */
  routeKind: "kv" | "ts" | "ui" | "bridge";
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
