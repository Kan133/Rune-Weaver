/**
 * Rune Weaver - Assembly Plan
 * 
 * Pattern Resolution 到 Assembler 的桥接对象
 * 与 docs/SCHEMA.md 9.2 节对齐
 */

import {
  Blueprint,
  AssemblyPlan,
  AssemblyModule,
  ValidationIssue,
  SelectedPattern,
  WriteTarget,
  BridgeUpdate,
  ValidationContract,
  HostWriteReadiness,
  RealizationRole,
} from "../schema/types";
import { resolvePatterns, PatternResolutionResult, ResolvedPattern } from "../patterns/resolver";

// ============================================================================
// Assembly Plan 专用类型
// ============================================================================

/**
 * 未解析模块
 */
export interface UnresolvedModule {
  moduleId: string;
  reason: string;
  suggestedPatterns?: string[];
}

/**
 * Pattern 冲突
 */
export interface PatternConflict {
  moduleId: string;
  conflictingPatterns: string[];
  reason: string;
}

/**
 * Assembly Plan 构建配置
 */
export interface AssemblyPlanConfig {
  /** 允许 fallback Pattern */
  allowFallback?: boolean;
  /** 允许未解析模块继续 */
  allowUnresolved?: boolean;
  /** 生成目标类型 */
  targetKinds?: WriteTarget["target"][];
  /** 宿主根目录 (用于验证宿主映射) */
  hostRoot?: string;
}

/**
 * Host Write Readiness Gate 检查结果
 */
export interface HostWriteReadinessGate {
  /** 是否就绪 */
  ready: boolean;
  /** 检查项列表 */
  checks: ReadinessCheck[];
  /** 阻塞原因 */
  blockers: string[];
}

/**
 * 单个就绪检查项
 */
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

// ============================================================================
// Assembly Plan Builder
// ============================================================================

export class AssemblyPlanBuilder {
  private config: Required<AssemblyPlanConfig>;

  constructor(config: AssemblyPlanConfig = {}) {
    this.config = {
      allowFallback: true,
      allowUnresolved: false,
      targetKinds: ["server", "shared", "ui", "config"],
      hostRoot: config.hostRoot || "",
      ...config,
    };
  }

  /**
   * 执行 Host Write Readiness Gate 检查
   * T065: 收紧 readyForHostWrite 语义
   */
  checkHostWriteReadiness(
    result: PatternResolutionResult,
    selectedPatterns: SelectedPattern[],
    writeTargets: WriteTarget[],
    bridgeUpdates: BridgeUpdate[]
  ): HostWriteReadinessGate {
    const checks: ReadinessCheck[] = [];
    const blockers: string[] = [];

    // Gate 1: Patterns 存在性检查
    const hasPatterns = result.patterns.length > 0;
    checks.push({
      name: "PATTERNS_EXIST",
      passed: hasPatterns,
      severity: "error",
      message: hasPatterns 
        ? `${result.patterns.length} patterns selected`
        : "No patterns selected",
    });
    if (!hasPatterns) blockers.push("No patterns selected");

    // Gate 2: Unresolved 检查
    const noUnresolved = result.unresolved.length === 0;
    checks.push({
      name: "NO_UNRESOLVED",
      passed: noUnresolved,
      severity: "error",
      message: noUnresolved
        ? "All patterns resolved"
        : `${result.unresolved.length} unresolved: ${result.unresolved.map(u => u.requestedId).join(", ")}`,
    });
    if (!noUnresolved) blockers.push(`Unresolved patterns: ${result.unresolved.map(u => u.requestedId).join(", ")}`);

    // Gate 3: Error issues 检查
    const noErrors = !result.issues.some((i) => i.severity === "error");
    checks.push({
      name: "NO_ERROR_ISSUES",
      passed: noErrors,
      severity: "error",
      message: noErrors
        ? "No error-level issues"
        : `${result.issues.filter(i => i.severity === "error").length} error-level issues`,
    });
    if (!noErrors) blockers.push("Error-level issues exist");

    // Gate 4: Fallback patterns 检查 (如果不允许)
    const hasFallback = result.patterns.some((p) => p.priority === "fallback");
    const fallbackOk = this.config.allowFallback || !hasFallback;
    checks.push({
      name: "FALLBACK_CHECK",
      passed: fallbackOk,
      severity: "warning",
      message: fallbackOk
        ? hasFallback ? "Fallback patterns allowed" : "No fallback patterns"
        : "Fallback patterns detected (set allowFallback=true to allow)",
    });
    if (!fallbackOk) blockers.push("Fallback patterns not allowed");

    // Gate 5: Write targets 映射检查
    const hasValidTargets = writeTargets.length > 0 && 
      writeTargets.every(t => ["server", "shared", "ui", "config"].includes(t.target));
    checks.push({
      name: "VALID_WRITE_TARGETS",
      passed: hasValidTargets,
      severity: "error",
      message: hasValidTargets
        ? `${writeTargets.length} valid write targets`
        : "No valid write targets",
    });
    if (!hasValidTargets) blockers.push("No valid write targets");

    // Gate 6: Bridge updates 映射检查
    const validBridgeActions = ["create", "refresh", "inject_once"];
    const hasValidBridge = bridgeUpdates.every(b => 
      validBridgeActions.includes(b.action) && ["server", "ui"].includes(b.target)
    );
    checks.push({
      name: "VALID_BRIDGE_UPDATES",
      passed: hasValidBridge,
      severity: "error",
      message: hasValidBridge
        ? `${bridgeUpdates.length} valid bridge updates`
        : "Invalid bridge updates detected",
    });
    if (!hasValidBridge) blockers.push("Invalid bridge updates");

    // Gate 7: Pattern 真实性检查 (必须在 catalog 中)
    const allPatternsValid = selectedPatterns.every(p => this.isPatternInCatalog(p.patternId));
    checks.push({
      name: "PATTERNS_IN_CATALOG",
      passed: allPatternsValid,
      severity: "error",
      message: allPatternsValid
        ? "All patterns in catalog"
        : "Some patterns not in catalog",
    });
    if (!allPatternsValid) blockers.push("Some patterns not in catalog");

    // Gate 8: Bridge Plan 完整性检查 (T067)
    const bridgePlanComplete = this.isBridgePlanComplete(bridgeUpdates);
    checks.push({
      name: "BRIDGE_PLAN_COMPLETE",
      passed: bridgePlanComplete,
      severity: "error",
      message: bridgePlanComplete
        ? "Bridge plan complete"
        : "Bridge plan incomplete - missing required bridge actions",
    });
    if (!bridgePlanComplete) blockers.push("Bridge plan incomplete");

    // Gate 9: Host Context 检查 (T067) - 升为硬门槛
    const hasHostContext = !!this.config.hostRoot && this.config.hostRoot !== "NOT_SET";
    checks.push({
      name: "HOST_CONTEXT_AVAILABLE",
      passed: hasHostContext,
      severity: "error",  // 从 warning 升为 error
      message: hasHostContext
        ? `Host context: ${this.config.hostRoot}`
        : "Host context not set - must provide via --hostRoot or RUNEWEAVER_HOST_ROOT",
    });
    if (!hasHostContext) blockers.push("Host context not set");

    // 综合判断
    const criticalChecks = checks.filter(c => c.severity === "error");
    const ready = criticalChecks.every(c => c.passed);

    return { ready, checks, blockers };
  }

  /**
   * 检查桥接计划是否完整 (T067)
   * 
   * 完整的桥接计划应包含：
   * - server 侧: create (RW entry) + refresh (index) + inject_once (host entry)
   * - ui 侧: create (RW entry) + refresh (index) + inject_once (host entry)
   */
  private isBridgePlanComplete(bridgeUpdates: BridgeUpdate[]): boolean {
    const hasServerBridge = bridgeUpdates.some(b => 
      b.target === "server" && b.action === "inject_once" && 
      b.file.includes("modules/index.ts")
    );
    const hasServerRefresh = bridgeUpdates.some(b => 
      b.target === "server" && b.action === "refresh" && 
      b.file.includes("generated/server")
    );
    const hasServerCreate = bridgeUpdates.some(b => 
      b.target === "server" && b.action === "create" && 
      b.file.includes("rune_weaver/index.ts")
    );
    
    const hasUIBridge = bridgeUpdates.some(b => 
      b.target === "ui" && b.action === "inject_once" && 
      b.file.includes("hud/script.tsx")
    );
    const hasUIRefresh = bridgeUpdates.some(b => 
      b.target === "ui" && b.action === "refresh" && 
      b.file.includes("generated/ui")
    );
    const hasUICreate = bridgeUpdates.some(b => 
      b.target === "ui" && b.action === "create" && 
      b.file.includes("rune_weaver/index.tsx")
    );

    // 如果存在 server code，需要完整的 server bridge
    const needsServerBridge = bridgeUpdates.some(b => b.target === "server");
    // 如果存在 UI code，需要完整的 UI bridge
    const needsUIBridge = bridgeUpdates.some(b => b.target === "ui");

    const serverComplete = !needsServerBridge || (hasServerCreate && hasServerRefresh && hasServerBridge);
    const uiComplete = !needsUIBridge || (hasUICreate && hasUIRefresh && hasUIBridge);

    return serverComplete && uiComplete;
  }

  /**
   * 检查 pattern 是否在 catalog 中
   */
  private isPatternInCatalog(patternId: string): boolean {
    // 当前 catalog 中的 10 个 patterns
    const catalogPatterns = [
      "input.key_binding",
      "data.weighted_pool",
      "rule.selection_flow",
      "effect.dash",
      "effect.modifier_applier",
      "effect.resource_consume",
      "resource.basic_pool",
      "ui.selection_modal",
      "ui.key_hint",
      "ui.resource_bar",
    ];
    return catalogPatterns.includes(patternId);
  }

  /**
   * 从 Blueprint 构建 AssemblyPlan
   * @param blueprint 已验证的 Blueprint
   * @param resolutionResult Pattern 解析结果
   * @returns AssemblyPlan
   */
  build(
    blueprint: Blueprint,
    resolutionResult: PatternResolutionResult
  ): AssemblyPlan {
    // 转换 patterns（去除解析元数据）
    const selectedPatterns = this.convertToSelectedPatterns(resolutionResult.patterns);
    
    // 构建写入目标（候选目标，不是已确认可写入）
    const writeTargets = this.buildWriteTargets(blueprint, selectedPatterns);
    
    // 构建桥接更新指令
    const bridgeUpdates = this.buildBridgeUpdates(selectedPatterns);
    
    // 构建验证合约（描述性，不是 actual errors）
    const validations = this.buildValidations(resolutionResult);

    // 计算 readyForHostWrite（严格条件）
    const readyForHostWrite = this.calculateReadyForHostWrite(
      resolutionResult,
      selectedPatterns
    );

    // T065: 执行 Host Write Readiness Gate 检查
    const hostWriteReadiness = this.checkHostWriteReadiness(
      resolutionResult,
      selectedPatterns,
      writeTargets,
      bridgeUpdates
    );

    // 使用更严格的 readiness gate 结果覆盖 readyForHostWrite
    const finalReadyForHostWrite = readyForHostWrite && hostWriteReadiness.ready;

    return {
      blueprintId: blueprint.id,
      selectedPatterns,
      modules: this.buildAssemblyModules(blueprint, resolutionResult),
      writeTargets,
      bridgeUpdates,
      validations,
      readyForHostWrite: finalReadyForHostWrite,
      hostWriteReadiness,
    };
  }

  /**
   * 构建 AssemblyModule 列表 - 为 Host Realization 提供结构化输入
   * 与 docs/ASSEMBLY-REALIZATION-NOTES.md 对齐
   */
  private buildAssemblyModules(
    blueprint: Blueprint,
    resolutionResult: PatternResolutionResult
  ): AssemblyModule[] {
    const modules: AssemblyModule[] = [];

    // 如果 Blueprint 有模块，使用 Blueprint 模块结构
    if (blueprint.modules && blueprint.modules.length > 0) {
      for (const bpModule of blueprint.modules) {
        // 收集该 Blueprint 模块关联的 patterns
        const modulePatterns = resolutionResult.patterns
          .filter((p) => {
            // 基于 pattern category 或参数推断 module 归属
            // 这里用简单启发式：trigger 模块关联 input.key_binding，effect 模块关联 effect.* 等
            if (bpModule.category === "trigger" && p.patternId === "input.key_binding") return true;
            if (bpModule.category === "effect" && p.patternId.startsWith("effect.")) return true;
            if (bpModule.category === "resource" && p.patternId.startsWith("resource.")) return true;
            if (bpModule.category === "data" && p.patternId.startsWith("data.")) return true;
            if (bpModule.category === "rule" && p.patternId.startsWith("rule.")) return true;
            if (bpModule.category === "ui" && p.patternId.startsWith("ui.")) return true;
            return false;
          })
          .map((p) => p.patternId);

        if (modulePatterns.length === 0) continue;

        // 推断 role
        let role: RealizationRole = "gameplay-core";
        if (bpModule.category === "ui") role = "ui-surface";
        else if (bpModule.category === "data") role = "shared-support";

        // 推断 outputKinds
        const outputKinds: ("server" | "shared" | "ui" | "bridge")[] = [];
        if (modulePatterns.some((p) => p.startsWith("ui."))) outputKinds.push("ui");
        else if (modulePatterns.some((p) => p.startsWith("data."))) outputKinds.push("shared");
        else outputKinds.push("server");

        // 推断 realizationHints
        const realizationHints: AssemblyModule["realizationHints"] = {};
        if (bpModule.category === "effect" || modulePatterns.includes("effect.dash")) {
          realizationHints.kvCapable = true;
          realizationHints.runtimeHeavy = true;
        }
        if (modulePatterns.includes("input.key_binding") || modulePatterns.includes("rule.selection_flow")) {
          realizationHints.runtimeHeavy = true;
        }
        if (modulePatterns.some((p) => p.startsWith("ui."))) {
          realizationHints.uiRequired = true;
        }

        modules.push({
          id: bpModule.id,
          role,
          selectedPatterns: modulePatterns,
          outputKinds,
          realizationHints,
        });
      }
    } else {
      // T112-R1: No Blueprint modules - using fallback module construction
      // This is a conservative fallback, not a first-class realization
      const allPatterns = resolutionResult.patterns.map((p) => p.patternId);

      // 分类 patterns
      const uiPatterns = allPatterns.filter((p) => p.startsWith("ui."));
      const sharedPatterns = allPatterns.filter((p) => p.startsWith("data."));
      const gameplayPatterns = allPatterns.filter(
        (p) => !p.startsWith("ui.") && !p.startsWith("data.")
      );

      // T112-R1: Fallback modules have lower confidence and explicit isFallback marker
      if (gameplayPatterns.length > 0) {
        modules.push({
          id: "gameplay-core",
          role: "gameplay-core",
          selectedPatterns: gameplayPatterns,
          outputKinds: ["server"],
          realizationHints: {
            kvCapable: gameplayPatterns.some((p) => p.startsWith("effect.")),
            runtimeHeavy: gameplayPatterns.some(
              (p) => p === "input.key_binding" || p === "rule.selection_flow"
            ),
            // T112-R1: Mark as fallback - this is not first-class realization
            isFallback: true,
          },
        });
      }

      if (uiPatterns.length > 0) {
        modules.push({
          id: "ui-surface",
          role: "ui-surface",
          selectedPatterns: uiPatterns,
          outputKinds: ["ui"],
          realizationHints: {
            uiRequired: true,
            // T112-R1: Mark as fallback
            isFallback: true,
          },
        });
      }

      if (sharedPatterns.length > 0) {
        modules.push({
          id: "shared-support",
          role: "shared-support",
          selectedPatterns: sharedPatterns,
          outputKinds: ["shared"],
          // T112-R1: Mark as fallback
          realizationHints: { isFallback: true },
        });
      }
    }

    return modules;
  }

  /**
   * 转换 ResolvedPattern 到 SelectedPattern（去除解析元数据）
   */
  private convertToSelectedPatterns(patterns: ResolvedPattern[]): SelectedPattern[] {
    return patterns.map((p) => ({
      patternId: p.patternId,
      role: p.role,
      parameters: p.parameters,
    }));
  }

  /**
   * 生成候选写入目标
   * 注意：这些是候选目标，不代表已确认可写入
   */
  private buildWriteTargets(
    blueprint: Blueprint,
    bindings: SelectedPattern[]
  ): WriteTarget[] {
    const targets: WriteTarget[] = [];

    const hasServerCode = bindings.some((b) => this.isServerPattern(b.patternId));
    const hasSharedCode = bindings.some((b) => this.isSharedPattern(b.patternId));
    const hasUICode = bindings.some((b) => this.isUIPattern(b.patternId));
    const hasConfig = bindings.some((b) => this.isConfigPattern(b.patternId));

    if (hasServerCode && this.config.targetKinds.includes("server")) {
      targets.push({
        target: "server",
        path: `server/${blueprint.id}.ts`,
        summary: `[CANDIDATE] Server module for ${blueprint.id}`,
      });
    }

    if (hasSharedCode && this.config.targetKinds.includes("shared")) {
      targets.push({
        target: "shared",
        path: `shared/${blueprint.id}.ts`,
        summary: `[CANDIDATE] Shared definitions for ${blueprint.id}`,
      });
    }

    if (hasUICode && this.config.targetKinds.includes("ui")) {
      targets.push({
        target: "ui",
        path: `ui/${blueprint.id}.tsx`,
        summary: `[CANDIDATE] UI component for ${blueprint.id}`,
      });
    }

    if (hasConfig && this.config.targetKinds.includes("config")) {
      targets.push({
        target: "config",
        path: `config/${blueprint.id}.txt`,
        summary: `[CANDIDATE] Configuration for ${blueprint.id}`,
      });
    }

    return targets;
  }

  /**
   * 生成完整桥接更新指令 (T067 修复)
   * 
   * Server Bridge Plan:
   * - create: game/scripts/src/rune_weaver/index.ts (RW owned)
   * - refresh: game/scripts/src/rune_weaver/generated/server/index.ts (RW owned)
   * - inject_once: game/scripts/src/modules/index.ts (host owned)
   * 
   * UI Bridge Plan:
   * - create: content/panorama/src/rune_weaver/index.tsx (RW owned)
   * - refresh: content/panorama/src/rune_weaver/generated/ui/index.tsx (RW owned)
   * - inject_once: content/panorama/src/hud/script.tsx (host owned)
   */
  private buildBridgeUpdates(bindings: SelectedPattern[]): BridgeUpdate[] {
    const updates: BridgeUpdate[] = [];

    const hasServerCode = bindings.some((b) => this.isServerPattern(b.patternId));
    const hasUICode = bindings.some((b) => this.isUIPattern(b.patternId));

    // Server Bridge Plan
    if (hasServerCode) {
      // 1. create RW server entry (RW owned)
      updates.push({
        target: "server",
        file: "rune_weaver/index.ts",
        action: "create",
      });
      
      // 2. refresh server index (RW owned)
      updates.push({
        target: "server",
        file: "rune_weaver/generated/server/index.ts",
        action: "refresh",
      });
      
      // 3. inject_once into host module entry (host owned) - T067 fix
      updates.push({
        target: "server",
        file: "game/scripts/src/modules/index.ts",
        action: "inject_once",
      });
    }

    // UI Bridge Plan
    if (hasUICode) {
      // 1. create RW UI entry (RW owned)
      updates.push({
        target: "ui",
        file: "rune_weaver/index.tsx",
        action: "create",
      });
      
      // 2. refresh UI index (RW owned)
      updates.push({
        target: "ui",
        file: "rune_weaver/generated/ui/index.tsx",
        action: "refresh",
      });
      
      // 3. inject_once into host HUD entry (host owned) - T067 fix
      updates.push({
        target: "ui",
        file: "content/panorama/src/hud/script.tsx",
        action: "inject_once",
      });
    }

    return updates;
  }

  /**
   * 构建验证合约（描述性）
   * 这些 contracts 描述需要满足的条件，不是 actual errors
   */
  private buildValidations(resolutionResult: PatternResolutionResult): ValidationContract[] {
    const validations: ValidationContract[] = [];

    // 基础合约：必须有至少一个 pattern
    validations.push({
      scope: "assembly",
      rule: "At least one pattern must be selected",
      severity: resolutionResult.patterns.length === 0 ? "error" : "warning",
    });

    // 基础合约：所有 pattern 必须可解析
    validations.push({
      scope: "assembly",
      rule: "All patterns must be resolvable to catalog entries",
      severity: resolutionResult.unresolved.length > 0 ? "error" : "warning",
    });

    // 基础合约：宿主环境必须支持
    validations.push({
      scope: "host",
      rule: "Host environment must support selected patterns",
      severity: "warning",
    });

    // 如果有 fallback pattern，添加警告
    const hasFallback = resolutionResult.patterns.some((p) => p.priority === "fallback");
    if (hasFallback) {
      validations.push({
        scope: "assembly",
        rule: "Some patterns are fallback matches and may need review",
        severity: "warning",
      });
    }

    // 如果有 unresolved patterns，添加错误
    if (resolutionResult.unresolved.length > 0) {
      validations.push({
        scope: "assembly",
        rule: `${resolutionResult.unresolved.length} pattern(s) could not be resolved: ${resolutionResult.unresolved.map(u => u.requestedId).join(", ")}`,
        severity: "error",
      });
    }

    return validations;
  }

  /**
   * 计算 readyForHostWrite（严格条件）
   * 
   * 必须同时满足：
   * 1. 至少有一个 pattern
   * 2. 没有 unresolved patterns
   * 3. 没有 error severity 的 issues
   * 4. 没有 fallback priority 的 patterns（或允许 fallback）
   * 5. 有至少一个 write target
   */
  private calculateReadyForHostWrite(
    result: PatternResolutionResult,
    selectedPatterns: SelectedPattern[]
  ): boolean {
    // 必须有 pattern
    if (result.patterns.length === 0) return false;

    // 必须没有 unresolved
    if (result.unresolved.length > 0) return false;

    // 必须没有 error issues
    if (result.issues.some((i) => i.severity === "error")) return false;

    // 如果不允许 fallback，检查是否有 fallback patterns
    if (!this.config.allowFallback) {
      const hasFallback = result.patterns.some((p) => p.priority === "fallback");
      if (hasFallback) return false;
    }

    // 必须有至少一个 write target
    const hasServer = selectedPatterns.some((p) => this.isServerPattern(p.patternId));
    const hasUI = selectedPatterns.some((p) => this.isUIPattern(p.patternId));
    if (!hasServer && !hasUI) return false;

    return true;
  }

  /**
   * 判断是否为服务端 Pattern
   */
  private isServerPattern(patternId: string): boolean {
    const serverPrefixes = ["input.", "effect.", "rule.", "resource."];
    return serverPrefixes.some((p) => patternId.startsWith(p));
  }

  /**
   * 判断是否为共享 Pattern
   */
  private isSharedPattern(patternId: string): boolean {
    return patternId.startsWith("data.");
  }

  /**
   * 判断是否为 UI Pattern
   */
  private isUIPattern(patternId: string): boolean {
    return patternId.startsWith("ui.");
  }

  /**
   * 判断是否为配置 Pattern
   */
  private isConfigPattern(patternId: string): boolean {
    return patternId.includes("config") || patternId.includes("kv");
  }
}

// ============================================================================
// Assembly Plan Creator
// ============================================================================

export interface CreateAssemblyPlanResult {
  plan: AssemblyPlan | null;
  issues: ValidationIssue[];
}

/**
 * 从 Blueprint 创建 AssemblyPlan (T067: 支持传入 config)
 */
export function createAssemblyPlan(
  blueprint: Blueprint,
  config?: AssemblyPlanConfig
): CreateAssemblyPlanResult {
  const resolutionResult = resolvePatterns(blueprint);
  
  const builder = new AssemblyPlanBuilder(config);
  
  try {
    const plan = builder.build(blueprint, resolutionResult);
    // 将 resolver issues 转换为 ValidationIssue 格式
    const issues: ValidationIssue[] = resolutionResult.issues.map((i) => ({
      code: i.code,
      scope: i.scope,
      severity: i.severity,
      message: i.message,
      path: i.path,
    }));
    return { plan, issues };
  } catch (error) {
    return {
      plan: null,
      issues: [
        {
          code: "ASSEMBLY_PLAN_BUILD_FAILED",
          scope: "assembly",
          severity: "error",
          message: error instanceof Error ? error.message : "AssemblyPlan build failed",
        },
      ],
    };
  }
}
