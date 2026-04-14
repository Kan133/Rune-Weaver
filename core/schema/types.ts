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
  /** T138-R1: Parameters extracted from prompt (cooldown, mana, range, etc.) */
  parameters?: Record<string, unknown>;
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
