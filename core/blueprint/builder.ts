/**
 * Rune Weaver - Blueprint Builder
 * 
 * 将 IntentSchema 转换为 Blueprint
 * 实现需求层到实现编排层的转换
 * 与 docs/SCHEMA.md 5.2 节对齐
 */

import {
  IntentSchema,
  Blueprint,
  BlueprintModule,
  BlueprintConnection,
  BlueprintNormalizationReport,
  BlueprintProposal,
  FinalBlueprint,
  ModuleNeed,
  ProposalConnection,
  ProposalModule,
  ProposalStatus,
  NormalizedBlueprintStatus,
  IntentRequirement,
  ValidationContract,
  ValidationIssue,
  PatternHint,
  UIDesignSpec,
  UISurfaceSpec,
} from "../schema/types";
import { BlueprintBuilderConfig, BlueprintBuildResult } from "./types";
import { isCanonicalPatternAvailable, CORE_PATTERN_IDS } from "../patterns/canonical-patterns";

function isPatternAvailable(patternId: string): boolean {
  return isCanonicalPatternAvailable(patternId);
}

interface SemanticAssessment {
  blockers: string[];
  warnings: string[];
  notes: string[];
}

/**
 * Blueprint Builder 类
 * 
 * 负责将澄清后的 IntentSchema 转换为实现编排蓝图
 */
export class BlueprintBuilder {
  private config: Required<BlueprintBuilderConfig>;

  constructor(config: BlueprintBuilderConfig = {}) {
    this.config = {
      autoConnect: true,
      enableUIBranch: true,
      modulePrefix: "mod_",
      ...config,
    };
  }

  /**
   * 构建 Blueprint
   * @param schema 已验证的 IntentSchema
   * @returns 构建结果
   */
  build(schema: IntentSchema): BlueprintBuildResult {
    try {
      const proposal = this.buildProposal(schema);
      const normalization = this.normalizeProposal(schema, proposal);
      const finalBlueprint = normalization.finalBlueprint;
      const issues = [...normalization.report.issues];

      if (finalBlueprint.status !== "ready") {
        return {
          success: false,
          blueprint: finalBlueprint,
          finalBlueprint,
          blueprintProposal: proposal,
          normalizationReport: normalization.report,
          issues,
        };
      }

      return {
        success: true,
        blueprint: finalBlueprint,
        finalBlueprint,
        blueprintProposal: proposal,
        normalizationReport: normalization.report,
        issues,
      };
    } catch (error) {
      const issues: ValidationIssue[] = [];
      issues.push({
        code: "BLUEPRINT_BUILD_ERROR",
        scope: "blueprint",
        severity: "error",
        message: `构建 Blueprint 时发生错误: ${error instanceof Error ? error.message : String(error)}`,
        path: "builder",
      });
      return { success: false, issues };
    }
  }

  /**
   * 执行构建
   */
  private doBuild(schema: IntentSchema): Blueprint {
    const modules = this.buildModules(schema);
    const connections = this.config.autoConnect
      ? this.buildConnections(modules)
      : [];
    const patternHints = this.buildPatternHints(schema);
    const uiDesignSpec = this.buildUIDesignSpec(schema);
    const validations = this.buildValidationContracts(schema);
    const assumptions = [...schema.resolvedAssumptions];

    return {
      id: this.generateBlueprintId(schema),
      version: "1.0",
      summary: schema.request.goal,
      sourceIntent: {
        intentKind: schema.classification.intentKind,
        goal: schema.request.goal,
        normalizedMechanics: schema.normalizedMechanics,
      },
      modules,
      connections,
      patternHints,
      ...(uiDesignSpec && { uiDesignSpec }),
      assumptions,
      validations,
      readyForAssembly: modules.length > 0,
      // T138-R1: Pass through parameters from IntentSchema
      parameters: (schema as any).parameters,
    };
  }

  private buildProposal(schema: IntentSchema): BlueprintProposal {
    const candidate = this.doBuild(schema);
    const readiness = this.getSchemaReadiness(schema);
    const issues = this.collectProposalIssues(schema);
    const blockedBy = this.collectProposalBlockers(schema);

    const proposedModules: ProposalModule[] = candidate.modules.map((module) => ({
      id: module.id,
      role: module.role,
      category: module.category,
      proposedPatternIds: module.patternIds || [],
      proposedParameters: module.parameters,
      missingPatterns: (module.patternIds || []).length === 0 && !this.isPolymorphicCategory(module.category),
      missingIntegration: module.category === "integration" && (!module.outputs || module.outputs.length === 0),
      missingOwnership: !module.role,
      missingCapability: this.isCapabilityWeak(module, schema),
    }));

    const proposedConnections: ProposalConnection[] = candidate.connections.map((connection) => ({
      from: connection.from,
      to: connection.to,
      purpose: connection.purpose,
      connectionType: this.inferProposalConnectionType(connection),
    }));

    return {
      id: `${candidate.id}_proposal`,
      source: "rule",
      status: this.getProposalStatus(readiness, issues, blockedBy),
      sourceIntent: {
        goal: schema.request.goal,
        intentKind: schema.classification.intentKind,
      },
      proposedModules,
      proposedConnections,
      confidence: this.getProposalConfidence(proposedModules, readiness),
      notes: [...schema.resolvedAssumptions],
      issues,
      uncertainties: schema.uncertainties?.map((item) => item.summary) || [],
      blockedBy,
      candidatePatternFamilies: this.collectCandidatePatternFamilies(candidate),
    };
  }

  private normalizeProposal(
    schema: IntentSchema,
    proposal: BlueprintProposal
  ): { finalBlueprint: FinalBlueprint; report: BlueprintNormalizationReport } {
    const candidate = this.doBuild(schema);
    const modules = this.canonicalizeModules(candidate.modules);
    const connections = this.canonicalizeConnections(candidate.connections, modules);
    const moduleNeeds = this.buildModuleNeeds(schema, modules);
    const assessment = this.assessSemanticCompleteness(schema, modules, moduleNeeds, proposal);
    const status = this.getNormalizedStatus(schema, proposal, modules, assessment);
    const issues = this.collectNormalizationIssues(schema, proposal, modules, moduleNeeds, status, assessment);
    const blockers = issues
      .filter((issue) => issue.severity === "error")
      .map((issue) => issue.message);

    const finalBlueprint: FinalBlueprint = {
      ...candidate,
      modules,
      connections,
      status,
      moduleNeeds,
      proposalId: proposal.id,
      readyForAssembly: status === "ready" && issues.every((issue) => issue.severity !== "error"),
    };

    const report: BlueprintNormalizationReport = {
      status,
      notes: [...proposal.notes, ...assessment.notes],
      issues,
      blockers,
    };

    return { finalBlueprint, report };
  }

  /**
   * 根据需求构建模块
   */
  private buildModules(schema: IntentSchema): BlueprintModule[] {
    const modules: BlueprintModule[] = [];
    const prefix = this.config.modulePrefix;
    const schemaParams = this.getSchemaParameters(schema);
    const typedRequirements = schema.requirements.typed || [];

    if (typedRequirements.length > 0) {
      for (let i = 0; i < typedRequirements.length; i++) {
        const req = typedRequirements[i];
        const module = this.createTypedRequirementModule(req, i, prefix, schemaParams);
        if (module) {
          this.upsertModule(modules, module);
        }
      }
    }

    for (let i = 0; i < schema.requirements.functional.length; i++) {
      const req = schema.requirements.functional[i];
      const module = this.createFunctionalModule(req, i, prefix, schemaParams);
      if (module) {
        this.upsertModule(modules, module);
      }
    }

    this.addMechanicModules(schema, modules, prefix, schemaParams);

    if (schema.requirements.interactions) {
      for (let i = 0; i < schema.requirements.interactions.length; i++) {
        const interaction = schema.requirements.interactions[i];
        const inputModule = this.createInteractionModule(interaction, i, prefix, schemaParams);
        if (inputModule) {
          this.upsertModule(modules, inputModule);
        }
      }
    }

    if (schema.uiRequirements?.needed && schema.uiRequirements.surfaces) {
      for (let i = 0; i < schema.uiRequirements.surfaces.length; i++) {
        const surface = schema.uiRequirements.surfaces[i];
        const uiModule = this.createUIModule(surface, i, prefix, schemaParams);
        if (uiModule) {
          this.upsertModule(modules, uiModule);
        }
      }
    }

    return modules;
  }

  private createTypedRequirementModule(
    req: IntentRequirement,
    index: number,
    prefix: string,
    schemaParams: Record<string, unknown>
  ): BlueprintModule | null {
    const category = this.mapRequirementKindToCategory(req.kind);
    const role = this.inferRoleFromCategory(category, [
      req.id,
      req.summary,
      ...(req.inputs || []),
      ...(req.outputs || []),
    ]);
    const parameters = {
      ...this.extractModuleParameters(category, schemaParams),
      ...(req.parameters || {}),
    };

    return {
      id: `${prefix}typed_${req.id || index}`,
      role,
      category,
      patternIds: this.getCanonicalPatternIds(category, role),
      responsibilities: [req.summary, ...new Set(req.invariants || [])],
      inputs: req.inputs,
      outputs: req.outputs,
      ...(Object.keys(parameters).length > 0 && { parameters }),
    };
  }

  /**
   * 创建功能模块
   */
  private createFunctionalModule(
    req: string,
    index: number,
    prefix: string,
    schemaParams: Record<string, unknown>
  ): BlueprintModule | null {
    const category = this.inferCategoryFromRequirement(req);
    const role = this.inferRoleFromCategory(category, [req]);
    const patternIds = this.getCanonicalPatternIds(category, role);
    const parameters = this.extractModuleParameters(category, schemaParams);
    
    return {
      id: `${prefix}func_${index}`,
      role,
      category,
      patternIds,
      responsibilities: [req],
      ...(Object.keys(parameters).length > 0 && { parameters }),
    };
  }

  /**
   * 从 IntentSchema 扩展参数中读取模块参数。
   */
  private getSchemaParameters(schema: IntentSchema): Record<string, unknown> {
    const params = (schema as IntentSchema & { parameters?: Record<string, unknown> }).parameters;
    return params && typeof params === "object" ? params : {};
  }

  /**
   * 根据 normalizedMechanics 补齐 functional 文本中未显式拆出的通用模块。
   */
  private addMechanicModules(
    schema: IntentSchema,
    modules: BlueprintModule[],
    prefix: string,
    schemaParams: Record<string, unknown>
  ): void {
    const categories = this.inferCategoriesFromMechanics(schema);

    for (const category of categories) {
      const role = this.inferRoleFromCategory(category);
      const parameters = this.extractModuleParameters(category, schemaParams);
      const newModule: BlueprintModule = {
        id: `${prefix}${category}_${modules.length}`,
        role,
        category,
        patternIds: this.getCanonicalPatternIds(category, role),
        responsibilities: [this.describeMechanicResponsibility(category)],
        ...(Object.keys(parameters).length > 0 && { parameters }),
      };
      this.upsertModule(modules, newModule);
    }
  }

  private inferCategoriesFromMechanics(schema: IntentSchema): BlueprintModule["category"][] {
    const mechanics = schema.normalizedMechanics;
    const categories: BlueprintModule["category"][] = [];

    if (mechanics.trigger) {
      categories.push("trigger");
    }
    if (mechanics.candidatePool) {
      categories.push("data");
    }
    if (mechanics.weightedSelection || mechanics.playerChoice) {
      categories.push("rule");
    }
    if (mechanics.uiModal) {
      categories.push("ui");
    }
    if (mechanics.outcomeApplication) {
      categories.push("effect");
    }
    if (mechanics.resourceConsumption) {
      categories.push("resource");
    }

    return categories;
  }

  private mapRequirementKindToCategory(kind: IntentRequirement["kind"]): BlueprintModule["category"] {
    switch (kind) {
      case "trigger":
        return "trigger";
      case "state":
        return "data";
      case "rule":
        return "rule";
      case "effect":
        return "effect";
      case "resource":
        return "resource";
      case "ui":
        return "ui";
      case "integration":
        return "integration";
      default:
        return "effect";
    }
  }

  private describeMechanicResponsibility(category: BlueprintModule["category"]): string {
    switch (category) {
      case "trigger":
        return "Trigger flow activation";
      case "data":
        return "Provide candidate data and pool state";
      case "rule":
        return "Orchestrate selection and commit behavior";
      case "ui":
        return "Present interactive selection surface";
      case "effect":
        return "Apply selected outcome";
      case "resource":
        return "Track resource state and consumption";
      case "integration":
        return "Bridge integration boundaries";
      default:
        return "Handle feature behavior";
    }
  }

  private inferRoleFromCategory(
    category: BlueprintModule["category"],
    contextSignals: string[] = []
  ): string {
    if (category === "ui") {
      return this.inferUISemanticRole(contextSignals);
    }

    const roleMap: Record<BlueprintModule["category"], string> = {
      trigger: "input_trigger",
      data: "weighted_pool",
      rule: "selection_flow",
      effect: "effect_application",
      ui: "selection_modal",
      resource: "resource_pool",
      integration: "integration_bridge",
    };
    return roleMap[category];
  }

  private inferUISemanticRole(contextSignals: string[]): "selection_modal" | "key_hint" | "resource_bar" {
    const context = contextSignals
      .flatMap((signal) => signal.split(/\s+/))
      .join(" ")
      .toLowerCase();

    if (
      this.contextSignalsContainAny(context, [
        "resource_bar",
        "resource bar",
        "mana",
        "energy",
        "resource",
        "法力",
        "蓝量",
        "资源",
        "bar",
        "条",
      ])
    ) {
      return "resource_bar";
    }

    if (
      this.contextSignalsContainAny(context, [
        "key_hint",
        "key hint",
        "hotkey",
        "按键",
        "键位",
        "hint",
        "cooldown",
      ])
    ) {
      return "key_hint";
    }

    return "selection_modal";
  }

  private extractModuleParameters(
    category: BlueprintModule["category"],
    schemaParams: Record<string, unknown>
  ): Record<string, unknown> {
    switch (category) {
      case "trigger":
        return this.extractTriggerParams(schemaParams);
      case "data":
        return this.extractPoolParams(schemaParams);
      case "rule":
        return this.extractSelectionParams(schemaParams);
      case "ui":
        return this.extractUIParams(schemaParams);
      case "effect":
        return this.extractEffectParams(schemaParams);
      default:
        return {};
    }
  }

  private extractTriggerParams(params: Record<string, unknown>): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    if (params.triggerKey) {
      result.key = params.triggerKey;
    }
    if (params.eventName) {
      result.eventName = params.eventName;
    }
    return result;
  }

  private extractPoolParams(params: Record<string, unknown>): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    if (params.entries) {
      result.entries = params.entries;
    }
    if (params.weights) {
      result.weights = params.weights;
    }
    if (params.tiers) {
      result.tiers = params.tiers;
    }
    if (params.choiceCount) {
      result.choiceCount = params.choiceCount;
    }
    if (params.drawMode) {
      result.drawMode = params.drawMode;
    }
    if (params.duplicatePolicy) {
      result.duplicatePolicy = params.duplicatePolicy;
    }
    if (params.poolStateTracking) {
      result.poolStateTracking = params.poolStateTracking;
    }
    return result;
  }

  private extractSelectionParams(params: Record<string, unknown>): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    if (params.choiceCount) {
      result.choiceCount = params.choiceCount;
    }
    if (params.selectionPolicy) {
      result.selectionPolicy = params.selectionPolicy;
    }
    if (params.applyMode) {
      result.applyMode = params.applyMode;
    }
    if (params.postSelectionPoolBehavior) {
      result.postSelectionPoolBehavior = params.postSelectionPoolBehavior;
    }
    if (params.trackSelectedItems !== undefined) {
      result.trackSelectedItems = params.trackSelectedItems;
    }
    if (params.effectApplication) {
      result.effectApplication = params.effectApplication;
    }
    if (params.inventory) {
      result.inventory = params.inventory;
    }
    return result;
  }

  private extractUIParams(params: Record<string, unknown>): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    if (params.choiceCount) {
      result.choiceCount = params.choiceCount;
    }
    if (params.layoutPreset) {
      result.layoutPreset = params.layoutPreset;
    }
    if (params.selectionMode) {
      result.selectionMode = params.selectionMode;
    }
    if (params.dismissBehavior) {
      result.dismissBehavior = params.dismissBehavior;
    }
    if (params.payloadShape) {
      result.payloadShape = params.payloadShape;
    }
    if (params.minDisplayCount !== undefined) {
      result.minDisplayCount = params.minDisplayCount;
    }
    if (params.placeholderConfig) {
      result.placeholderConfig = params.placeholderConfig;
    }
    if (params.inventory) {
      result.inventory = params.inventory;
    }
    return result;
  }

  private extractEffectParams(params: Record<string, unknown>): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    if (params.effectMapping) {
      result.effectMapping = params.effectMapping;
    }
    if (params.effectApplication) {
      result.effectApplication = params.effectApplication;
    }
    return result;
  }

  private upsertModule(
    modules: BlueprintModule[],
    newModule: BlueprintModule
  ): void {
    const existingIndex = modules.findIndex(m => m.category === newModule.category);

    if (existingIndex >= 0) {
      const existing = modules[existingIndex];
      const mergedResponsibilities = [...new Set([...existing.responsibilities, ...newModule.responsibilities])];
      const mergedParameters = {
        ...(existing.parameters || {}),
        ...(newModule.parameters || {}),
      };
      const existingPatternIds = existing.patternIds || [];
      const newPatternIds = newModule.patternIds || [];
      const mergedPatternIds = existingPatternIds.length > 0
        ? existingPatternIds
        : newPatternIds;

      modules[existingIndex] = {
        ...existing,
        responsibilities: mergedResponsibilities,
        ...(Object.keys(mergedParameters).length > 0 && { parameters: mergedParameters }),
        patternIds: mergedPatternIds,
      };
    } else {
      modules.push(newModule);
    }
  }

  /**
   * 从需求文本推断模块类别
   */
  private inferCategoryFromRequirement(req: string): BlueprintModule["category"] {
    const reqLower = req.toLowerCase();
    
    if (reqLower.includes("按键") || reqLower.includes("触发") || reqLower.includes("输入")) {
      return "trigger";
    }
    if (reqLower.includes("数据") || reqLower.includes("池") || reqLower.includes("集合")) {
      return "data";
    }
    if (reqLower.includes("规则") || reqLower.includes("流程") || reqLower.includes("选择")) {
      return "rule";
    }
    if (reqLower.includes("效果") || reqLower.includes("技能") || reqLower.includes("冲刺")) {
      return "effect";
    }
    if (reqLower.includes("ui") || reqLower.includes("界面") || reqLower.includes("显示")) {
      return "ui";
    }
    if (reqLower.includes("资源") || reqLower.includes("消耗")) {
      return "resource";
    }
    
    return "effect"; // 默认效果类别
  }

  /**
   * T152-R1: Map category to canonical pattern IDs for explicit grouping
   * Only stable single-path categories get explicit patternIds[].
   * Polymorphic categories (effect, resource) should rely on resolver + fallback.
   */
  private getCanonicalPatternIds(category: BlueprintModule["category"], role?: string): string[] {
    switch (category) {
      case "trigger":
        return [CORE_PATTERN_IDS.INPUT_KEY_BINDING];
      case "data":
        return [CORE_PATTERN_IDS.DATA_WEIGHTED_POOL];
      case "rule":
        return [CORE_PATTERN_IDS.RULE_SELECTION_FLOW];
      case "ui":
        if (role === "resource_bar") {
          return [CORE_PATTERN_IDS.UI_RESOURCE_BAR];
        }
        if (role === "key_hint") {
          return [CORE_PATTERN_IDS.UI_KEY_HINT];
        }
        return [CORE_PATTERN_IDS.UI_SELECTION_MODAL];
      case "effect":
        return [];
      case "resource":
        return [];
      case "integration":
        return [];
      default:
        return [];
    }
  }

  /**
   * 创建交互模块（输入绑定）
   */
  private createInteractionModule(
    interaction: string,
    index: number,
    prefix: string,
    schemaParams: Record<string, unknown>
  ): BlueprintModule | null {
    const parameters = this.extractModuleParameters("trigger", schemaParams);
    const role = this.inferRoleFromCategory("trigger");
    return {
      id: `${prefix}input_${index}`,
      role,
      category: "trigger",
      patternIds: this.getCanonicalPatternIds("trigger", role),
      responsibilities: [`处理交互: ${interaction}`],
      ...(Object.keys(parameters).length > 0 && { parameters }),
    };
  }

  /**
   * 创建 UI 模块
   */
  private createUIModule(
    surface: string,
    index: number,
    prefix: string,
    schemaParams: Record<string, unknown>
  ): BlueprintModule | null {
    const parameters = this.extractModuleParameters("ui", schemaParams);
    const role = this.inferRoleFromCategory("ui", [surface]);
    return {
      id: `${prefix}ui_${index}`,
      role,
      category: "ui",
      patternIds: this.getCanonicalPatternIds("ui", role),
      responsibilities: [`渲染 UI: ${surface}`],
      outputs: [surface],
      ...(Object.keys(parameters).length > 0 && { parameters }),
    };
  }

  /**
   * 构建模块间连接
   */
  private buildConnections(modules: BlueprintModule[]): BlueprintConnection[] {
    const connections: BlueprintConnection[] = [];

    // 按类别分组
    const triggerModules = modules.filter((m) => m.category === "trigger");
    const dataModules = modules.filter((m) => m.category === "data");
    const ruleModules = modules.filter((m) => m.category === "rule");
    const effectModules = modules.filter((m) => m.category === "effect");
    const uiModules = modules.filter((m) => m.category === "ui");

    // 1. 触发 -> 规则/效果
    for (const trigger of triggerModules) {
      for (const rule of ruleModules) {
        connections.push({
          from: trigger.id,
          to: rule.id,
          purpose: "触发规则执行",
        });
      }
      for (const effect of effectModules) {
        connections.push({
          from: trigger.id,
          to: effect.id,
          purpose: "触发效果应用",
        });
      }
    }

    // 2. 数据 -> 规则/效果
    for (const data of dataModules) {
      for (const rule of ruleModules) {
        connections.push({
          from: data.id,
          to: rule.id,
          purpose: "提供数据输入",
        });
      }
      for (const effect of effectModules) {
        connections.push({
          from: data.id,
          to: effect.id,
          purpose: "提供效果参数",
        });
      }
    }

    // 3. 规则 -> 效果
    for (const rule of ruleModules) {
      for (const effect of effectModules) {
        connections.push({
          from: rule.id,
          to: effect.id,
          purpose: "规则决策驱动效果",
        });
      }
    }

    // 4. 效果 -> UI
    for (const effect of effectModules) {
      for (const ui of uiModules) {
        connections.push({
          from: effect.id,
          to: ui.id,
          purpose: "效果状态驱动 UI 更新",
        });
      }
    }

    return connections;
  }

  /**
   * 构建 Pattern 提示
   */
  private buildPatternHints(schema: IntentSchema): PatternHint[] {
    const hints: PatternHint[] = [];

    if (schema.normalizedMechanics.trigger) {
      const patterns = [CORE_PATTERN_IDS.INPUT_KEY_BINDING].filter(isPatternAvailable);
      if (patterns.length > 0) {
        hints.push({
          category: "input",
          suggestedPatterns: patterns,
          rationale: "需要输入触发机制",
        });
      }
    }

    if (schema.normalizedMechanics.candidatePool) {
      const patterns = [CORE_PATTERN_IDS.DATA_WEIGHTED_POOL].filter(isPatternAvailable);
      if (patterns.length > 0) {
        hints.push({
          category: "data",
          suggestedPatterns: patterns,
          rationale: "需要候选项池管理",
        });
      }
    }

    if (schema.normalizedMechanics.weightedSelection) {
      const patterns = [CORE_PATTERN_IDS.RULE_SELECTION_FLOW].filter(isPatternAvailable);
      if (patterns.length > 0) {
        hints.push({
          category: "rule",
          suggestedPatterns: patterns,
          rationale: "需要加权随机选择",
        });
      }
    }

    if (schema.normalizedMechanics.playerChoice) {
      const patterns = [CORE_PATTERN_IDS.RULE_SELECTION_FLOW].filter(isPatternAvailable);
      if (patterns.length > 0) {
        hints.push({
          category: "rule",
          suggestedPatterns: patterns,
          rationale: "需要玩家选择处理",
        });
      }
    }

    if (schema.normalizedMechanics.uiModal) {
      const patterns = [CORE_PATTERN_IDS.UI_SELECTION_MODAL].filter(isPatternAvailable);
      if (patterns.length > 0) {
        hints.push({
          category: "ui",
          suggestedPatterns: patterns,
          rationale: "需要模态 UI 界面",
        });
      }
    }

    if (schema.normalizedMechanics.outcomeApplication) {
      hints.push({
        category: "effect",
        suggestedPatterns: [],
        rationale: "需要结果应用机制（多态模块，由 resolver/assembly 根据上下文解析具体 pattern）",
      });
    }

    if (schema.normalizedMechanics.resourceConsumption) {
      hints.push({
        category: "resource",
        suggestedPatterns: [],
        rationale: "需要资源消耗处理（多态模块，由 resolver/assembly 根据上下文解析具体 pattern）",
      });
    }

    return hints;
  }

  /**
   * 构建 UI 设计规格
   */
  private buildUIDesignSpec(schema: IntentSchema): UIDesignSpec | undefined {
    if (!this.config.enableUIBranch || !schema.uiRequirements?.needed) {
      return undefined;
    }

    const surfaces: UISurfaceSpec[] = [];

    if (schema.uiRequirements.surfaces) {
      for (let i = 0; i < schema.uiRequirements.surfaces.length; i++) {
        const surface = schema.uiRequirements.surfaces[i];
        surfaces.push({
          id: `surface_${i}`,
          type: this.inferSurfaceType(surface),
          purpose: surface,
        });
      }
    }

    if (surfaces.length === 0) {
      return undefined;
    }

    return {
      surfaces,
      visualStyle: {
        tone: "game",
        density: "medium",
      },
    };
  }

  /**
   * 推断 surface 类型
   */
  private inferSurfaceType(surface: string): UISurfaceSpec["type"] {
    const surfaceLower = surface.toLowerCase();
    
    if (surfaceLower.includes("模态") || surfaceLower.includes("modal") || surfaceLower.includes("选择")) {
      return "modal";
    }
    if (surfaceLower.includes("提示") || surfaceLower.includes("hint")) {
      return "hint";
    }
    if (surfaceLower.includes("面板") || surfaceLower.includes("panel")) {
      return "panel";
    }
    if (surfaceLower.includes("覆盖") || surfaceLower.includes("overlay")) {
      return "overlay";
    }
    
    return "hud";
  }

  /**
   * 构建验证合约
   */
  private buildValidationContracts(schema: IntentSchema): ValidationContract[] {
    const contracts: ValidationContract[] = [];

    // 基于 requiredPatterns 添加验证合约
    if (schema.constraints.requiredPatterns) {
      for (const patternId of schema.constraints.requiredPatterns) {
        contracts.push({
          scope: "assembly",
          rule: `必须使用 Pattern: ${patternId}`,
          severity: "error",
        });
      }
    }

    // 基于 forbiddenPatterns 添加验证合约
    if (schema.constraints.forbiddenPatterns) {
      for (const patternId of schema.constraints.forbiddenPatterns) {
        contracts.push({
          scope: "assembly",
          rule: `禁止使用的 Pattern: ${patternId}`,
          severity: "error",
        });
      }
    }

    // 添加基本验证
    contracts.push({
      scope: "blueprint",
      rule: "Blueprint 必须包含至少一个模块",
      severity: "error",
    });

    contracts.push({
      scope: "assembly",
      rule: "非多态模块必须绑定到可用 Pattern；多态模块（effect/resource/integration）可由 resolver/assembly 后续解析",
      severity: "warning",
    });

    return contracts;
  }

  private getSchemaReadiness(schema: IntentSchema): "ready" | "weak" | "blocked" {
    if (schema.readiness) {
      return schema.readiness;
    }

    if (schema.isReadyForBlueprint) {
      return "ready";
    }

    if ((schema.requiredClarifications || []).some((item) => item.blocksFinalization)) {
      return "blocked";
    }

    if ((schema.openQuestions || []).length > 0 || (schema.uncertainties || []).length > 0) {
      return "weak";
    }

    return "blocked";
  }

  private collectProposalIssues(schema: IntentSchema): string[] {
    const issues = [
      ...schema.openQuestions
        .filter((question) => !this.isResolvableExistingSeamIssue(question, schema))
        .map((question) => `Open question: ${question}`),
      ...(schema.uncertainties || [])
        .filter((item) => !this.isResolvableExistingSeamIssue(item.summary, schema))
        .map((item) => `Uncertainty: ${item.summary}`),
    ];
    return [...new Set(issues)];
  }

  private collectProposalBlockers(schema: IntentSchema): string[] {
    return (schema.requiredClarifications || [])
      .filter((item) => item.blocksFinalization && !this.isResolvableExistingSeamIssue(item.question, schema))
      .map((item) => item.question);
  }

  private getProposalStatus(
    readiness: "ready" | "weak" | "blocked",
    issues: string[],
    blockedBy: string[]
  ): ProposalStatus {
    if (readiness === "blocked" || blockedBy.length > 0) {
      return "blocked";
    }
    if (readiness === "weak" || issues.length > 0) {
      return "needs_review";
    }
    return "usable";
  }

  private getProposalConfidence(
    modules: ProposalModule[],
    readiness: "ready" | "weak" | "blocked"
  ): "high" | "medium" | "low" {
    if (readiness === "blocked") {
      return "low";
    }
    if (readiness === "weak") {
      return "medium";
    }
    return modules.length >= 2 ? "high" : "medium";
  }

  private collectCandidatePatternFamilies(candidate: Blueprint): string[] {
    const families = new Set<string>();
    for (const hint of candidate.patternHints) {
      for (const patternId of hint.suggestedPatterns) {
        const family = patternId.split(".").slice(0, 2).join(".");
        if (family) {
          families.add(family);
        }
      }
    }
    return [...families];
  }

  private inferProposalConnectionType(connection: BlueprintConnection): string {
    if (connection.purpose.includes("触发")) {
      return "control";
    }
    if (connection.purpose.includes("数据")) {
      return "data";
    }
    if (connection.purpose.includes("UI")) {
      return "visual";
    }
    return "implicit_sequence";
  }

  private isPolymorphicCategory(category: BlueprintModule["category"]): boolean {
    return category === "effect" || category === "resource" || category === "integration";
  }

  private isCapabilityWeak(module: BlueprintModule, schema: IntentSchema): boolean {
    if (module.category === "effect") {
      const hasEffects = (schema.effects?.operations || []).length > 0;
      const hasParameters = !!module.parameters && Object.keys(module.parameters).length > 0;
      return !hasEffects && !hasParameters;
    }
    if (module.category === "rule") {
      return !schema.selection?.mode && !(module.parameters && Object.keys(module.parameters).length > 0);
    }
    return false;
  }

  private canonicalizeModules(modules: BlueprintModule[]): BlueprintModule[] {
    return modules.map((module) => ({
      ...module,
      responsibilities: [...new Set(module.responsibilities)].filter(Boolean),
      inputs: module.inputs ? [...new Set(module.inputs)] : undefined,
      outputs: module.outputs ? [...new Set(module.outputs)] : undefined,
    }));
  }

  private canonicalizeConnections(
    connections: BlueprintConnection[],
    modules: BlueprintModule[]
  ): BlueprintConnection[] {
    const moduleIds = new Set(modules.map((module) => module.id));
    const deduped = new Map<string, BlueprintConnection>();

    for (const connection of connections) {
      if (!moduleIds.has(connection.from) || !moduleIds.has(connection.to)) {
        continue;
      }
      const key = `${connection.from}:${connection.to}:${connection.purpose}`;
      if (!deduped.has(key)) {
        deduped.set(key, connection);
      }
    }

    return [...deduped.values()];
  }

  private getNormalizedStatus(
    schema: IntentSchema,
    proposal: BlueprintProposal,
    modules: BlueprintModule[],
    assessment: SemanticAssessment
  ): NormalizedBlueprintStatus {
    const readiness = this.getSchemaReadiness(schema);
    if (readiness === "blocked" || proposal.status === "blocked" || assessment.blockers.length > 0) {
      return "blocked";
    }

    if (modules.length === 0) {
      return "blocked";
    }

    if (readiness === "weak" || proposal.status === "needs_review" || assessment.warnings.length > 0) {
      return "weak";
    }

    return "ready";
  }

  private buildModuleNeeds(
    schema: IntentSchema,
    modules: BlueprintModule[]
  ): ModuleNeed[] {
    return modules.map((module) => ({
      moduleId: module.id,
      semanticRole: module.role,
      requiredCapabilities: this.inferRequiredCapabilities(module, schema),
      optionalCapabilities: this.inferOptionalCapabilities(module, schema),
      requiredOutputs: this.inferRequiredOutputs(module, schema),
      stateExpectations: this.inferStateExpectations(module, schema),
      integrationHints: this.inferIntegrationHints(module, schema),
      invariants: this.inferInvariants(module, schema),
      boundedVariability: this.inferBoundedVariability(module),
      explicitPatternHints: this.inferExplicitPatternHints(module, schema),
      prohibitedTraits: undefined,
    }));
  }

  private inferExplicitPatternHints(
    module: BlueprintModule,
    schema: IntentSchema
  ): string[] | undefined {
    const hints = new Set<string>();
    const defaultPatternIds = new Set(this.getCanonicalPatternIds(module.category, module.role));

    for (const patternId of schema.constraints.requiredPatterns || []) {
      if (this.patternMatchesModuleCategory(patternId, module.category)) {
        hints.add(patternId);
      }
    }

    for (const patternId of module.patternIds || []) {
      if (!defaultPatternIds.has(patternId)) {
        hints.add(patternId);
      }
    }

    return hints.size > 0 ? [...hints] : undefined;
  }

  private patternMatchesModuleCategory(
    patternId: string,
    category: BlueprintModule["category"]
  ): boolean {
    const family = patternId.split(".")[0];
    switch (category) {
      case "trigger":
        return family === "input";
      case "data":
        return family === "data";
      case "rule":
        return family === "rule";
      case "effect":
        return family === "effect";
      case "resource":
        return family === "resource";
      case "ui":
        return family === "ui";
      case "integration":
        return family === "integration";
      default:
        return false;
    }
  }

  private inferRequiredCapabilities(
    module: BlueprintModule,
    schema: IntentSchema
  ): string[] {
    const capabilities = new Set<string>();

    switch (module.category) {
      case "trigger":
        capabilities.add("input.trigger.capture");
        break;
      case "data":
        if (schema.normalizedMechanics.candidatePool) {
          capabilities.add("selection.pool.weighted_candidates");
        } else {
          capabilities.add("state.session.snapshot");
        }
        break;
      case "rule":
        if (
          schema.normalizedMechanics.playerChoice ||
          schema.selection?.mode === "user-chosen" ||
          schema.normalizedMechanics.uiModal ||
          schema.uiRequirements?.needed
        ) {
          capabilities.add("selection.flow.player_confirmed");
        } else if (schema.selection?.mode === "weighted" || schema.normalizedMechanics.weightedSelection) {
          capabilities.add("selection.flow.weighted_resolve");
        } else {
          capabilities.add("selection.flow.resolve");
        }
        break;
      case "effect":
        if (this.shouldUseShortTimeBuffCapability(schema.effects)) {
          capabilities.add("ability.buff.short_duration");
          break;
        }
        for (const operation of schema.effects?.operations || []) {
          capabilities.add(this.mapEffectOperationToCapability(operation));
        }
        if ((schema.effects?.operations || []).length === 0) {
          capabilities.add("effect.modifier.apply");
        }
        break;
      case "resource":
        capabilities.add("resource.pool.numeric");
        break;
      case "ui":
        if (module.role === "resource_bar") {
          capabilities.add("ui.resource.bar");
        } else if (module.role === "key_hint") {
          capabilities.add("ui.input.key_hint");
        } else {
          capabilities.add("ui.selection.modal");
        }
        break;
      case "integration":
        capabilities.add("integration.bridge.sync");
        break;
    }

    return [...capabilities];
  }

  private inferOptionalCapabilities(
    module: BlueprintModule,
    schema: IntentSchema
  ): string[] | undefined {
    const optional = new Set<string>();

    if (module.category === "rule" && schema.selection?.repeatability) {
      optional.add(`selection-repeatability/${schema.selection.repeatability}`);
    }
    if (
      module.category === "rule" &&
      (schema.selection?.mode === "weighted" || schema.normalizedMechanics.weightedSelection)
    ) {
      optional.add("selection.flow.weighted_resolve");
    }
    if (module.category === "ui" && schema.uiRequirements?.feedbackNeeds) {
      for (const need of schema.uiRequirements.feedbackNeeds) {
        optional.add(`ui-feedback/${need}`);
      }
    }
    if (module.category === "effect" && schema.effects?.durationSemantics) {
      optional.add(`effect-duration/${schema.effects.durationSemantics}`);
    }

    return optional.size > 0 ? [...optional] : undefined;
  }

  private inferRequiredOutputs(
    module: BlueprintModule,
    schema: IntentSchema
  ): string[] | undefined {
    const outputs = new Set<string>();

    if (module.outputs) {
      for (const output of module.outputs) {
        outputs.add(output);
      }
    }
    if (module.category === "ui" && schema.uiRequirements?.surfaces) {
      outputs.add("ui.surface");
    }
    if (module.category === "trigger") {
      outputs.add("server.runtime");
    }
    if (module.category === "data" && schema.normalizedMechanics.candidatePool) {
      outputs.add("shared.runtime");
    }
    if (module.category === "rule") {
      outputs.add("server.runtime");
    }
    if (module.category === "effect") {
      outputs.add("server.runtime");
      outputs.add("host.config.kv");
      for (const output of schema.requirements.outputs || []) {
        outputs.add(output);
      }
      for (const requirement of schema.requirements.typed || []) {
        if (this.mapRequirementKindToCategory(requirement.kind) === "effect") {
          for (const output of requirement.outputs || []) {
            outputs.add(output);
          }
        }
      }
    }
    if (module.category === "integration") {
      outputs.add("server.runtime");
      for (const binding of schema.integrations?.expectedBindings || []) {
        outputs.add(`${binding.kind}:${binding.id}`);
      }
    }

    return outputs.size > 0 ? [...outputs] : undefined;
  }

  private inferStateExpectations(
    module: BlueprintModule,
    schema: IntentSchema
  ): string[] | undefined {
    if (!schema.stateModel?.states || schema.stateModel.states.length === 0) {
      return undefined;
    }

    if (!["data", "rule", "resource", "effect"].includes(module.category)) {
      return undefined;
    }

    const expectations = new Set<string>();

    if (module.category === "data" && schema.stateModel.states.some((state) => this.stateLooksLikePoolState(state))) {
      expectations.add("selection.pool_state");
    }

    if (["rule", "effect"].includes(module.category) && schema.stateModel.states.some((state) => this.stateLooksLikeCommittedSelection(state))) {
      expectations.add("selection.commit_state");
    }

    for (const state of schema.stateModel.states) {
      expectations.add(`state:${state.id}`);
      if (state.owner) {
        expectations.add(`owner:${state.owner}`);
      }
      if (state.lifetime) {
        expectations.add(`lifetime:${state.lifetime}`);
      }
      if (state.mutationMode) {
        expectations.add(`mutation:${state.mutationMode}`);
      }
    }

    return [...expectations];
  }

  private inferIntegrationHints(
    module: BlueprintModule,
    schema: IntentSchema
  ): string[] | undefined {
    const bindings = schema.integrations?.expectedBindings || [];
    if (bindings.length === 0 && module.category !== "ui") {
      return undefined;
    }

    const hints = new Set<string>();
    if (module.category === "ui") {
      hints.add("ui.surface");
      if (module.role === "resource_bar") {
        hints.add("resource.ui_surface");
      } else if (module.role === "key_hint") {
        hints.add("input.binding");
      }
    }

    for (const binding of bindings) {
      if (module.category === "integration" || (module.category === "ui" && binding.kind === "ui-surface")) {
        if (binding.kind === "ui-surface") {
          if (module.role === "resource_bar") {
            hints.add("resource.ui_surface");
          } else if (module.role === "key_hint") {
            hints.add("input.binding");
          } else {
            hints.add("selection.ui_surface");
          }
        }
        if (module.category === "ui") {
          hints.add("ui.surface");
        }
        if (binding.kind === "bridge-point" || module.category === "integration") {
          hints.add("server.runtime");
        }
        hints.add(`binding:${binding.kind}:${binding.id}`);
        if (binding.required) {
          hints.add(`required-binding:${binding.id}`);
        }
      }
    }

    return hints.size > 0 ? [...hints] : undefined;
  }

  private inferInvariants(
    module: BlueprintModule,
    schema: IntentSchema
  ): string[] | undefined {
    const invariants = new Set<string>();

    for (const requirement of schema.requirements.typed || []) {
      if (this.mapRequirementKindToCategory(requirement.kind) === module.category) {
        for (const invariant of requirement.invariants || []) {
          invariants.add(invariant);
        }
      }
    }

    return invariants.size > 0 ? [...invariants] : undefined;
  }

  private inferBoundedVariability(module: BlueprintModule): string[] | undefined {
    const variability = new Set<string>();

    if (module.parameters) {
      for (const key of Object.keys(module.parameters)) {
        variability.add(`parameter:${key}`);
      }
    }

    return variability.size > 0 ? [...variability] : undefined;
  }

  private mapEffectOperationToCapability(
    operation: NonNullable<IntentSchema["effects"]>["operations"][number]
  ): string {
    switch (operation) {
      case "apply":
        return "effect.modifier.apply";
      case "remove":
        return "effect.modifier.remove";
      case "stack":
        return "effect.modifier.stack";
      case "expire":
        return "effect.modifier.expire";
      case "consume":
        return "effect.resource.consume";
      case "restore":
        return "effect.resource.restore";
      default:
        return "effect.modifier.apply";
    }
  }

  private shouldUseShortTimeBuffCapability(
    effects: IntentSchema["effects"] | undefined
  ): boolean {
    if (!effects) {
      return false;
    }

    const operations = effects.operations || [];
    if (operations.length !== 1 || operations[0] !== "apply") {
      return false;
    }

    if (effects.durationSemantics !== "timed") {
      return false;
    }

    const targets = effects.targets || [];
    if (targets.length === 0) {
      return false;
    }

    return targets.every((target) => this.isSelfTargetedEffectTarget(target));
  }

  private isSelfTargetedEffectTarget(target: string): boolean {
    const normalized = target.trim().toLowerCase().replace(/[\s_-]+/g, "");
    return [
      "self",
      "selftargeted",
      "selfcast",
      "selfonly",
      "caster",
      "hero",
      "ownhero",
      "playerhero",
    ].includes(normalized);
  }

  private assessSemanticCompleteness(
    schema: IntentSchema,
    modules: BlueprintModule[],
    moduleNeeds: ModuleNeed[],
    proposal: BlueprintProposal
  ): SemanticAssessment {
    const blockers = new Set<string>();
    const warnings = new Set<string>();
    const notes = new Set<string>();
    const typedRequirements = schema.requirements.typed || [];

    if (proposal.blockedBy && proposal.blockedBy.length > 0) {
      for (const blocker of proposal.blockedBy) {
        blockers.add(`Blocked by clarification: ${blocker}`);
      }
    }

    if (typedRequirements.length === 0 && schema.requirements.functional.length === 0) {
      blockers.add("IntentSchema does not provide any functional or typed requirements for FinalBlueprint normalization.");
    }

    for (const requirement of typedRequirements) {
      if (requirement.priority !== "must") {
        continue;
      }

      const category = this.mapRequirementKindToCategory(requirement.kind);
      const matchingNeed = moduleNeeds.find((need) => {
        const module = modules.find((item) => item.id === need.moduleId);
        return module?.category === category;
      });

      if (!matchingNeed) {
        blockers.add(`Missing canonical ModuleNeed for must requirement '${requirement.id}'.`);
        continue;
      }

      if (matchingNeed.requiredCapabilities.length === 0) {
        blockers.add(`Must requirement '${requirement.id}' does not resolve requiredCapabilities.`);
      }

      if (category === "effect" && (schema.effects?.operations || []).length === 0) {
        warnings.add(`Must effect requirement '${requirement.id}' is underspecified because no effect operations were provided.`);
      }

      if (category === "rule" && !schema.selection?.mode) {
        warnings.add(`Must rule requirement '${requirement.id}' is underspecified because selection.mode is missing.`);
      }

      if (category === "ui" && !matchingNeed.requiredOutputs?.length) {
        warnings.add(`Must ui requirement '${requirement.id}' is underspecified because no UI surface/output was captured.`);
      }

      if (category === "integration" && !matchingNeed.integrationHints?.length) {
        warnings.add(`Must integration requirement '${requirement.id}' is underspecified because no integration binding was captured.`);
      }

      if (category === "data" && !matchingNeed.stateExpectations?.length) {
        warnings.add(`Must state requirement '${requirement.id}' is underspecified because no state expectations were captured.`);
      }
    }

    this.addUnsupportedFamilyGapBlockers(schema, blockers);

    const uncertaintyCount = schema.uncertainties?.length ?? 0;
    if (uncertaintyCount > 0) {
      notes.add(`Normalization retained ${uncertaintyCount} uncertainty item(s).`);
    }

    const clarificationCount = schema.requiredClarifications?.length ?? 0;
    if (clarificationCount > 0) {
      notes.add(`Normalization retained ${clarificationCount} clarification item(s).`);
    }

    this.addCoarseCapabilityWarnings(moduleNeeds, warnings);

    return {
      blockers: [...blockers],
      warnings: [...warnings],
      notes: [...notes],
    };
  }

  private addCoarseCapabilityWarnings(
    moduleNeeds: ModuleNeed[],
    warnings: Set<string>
  ): void {
    for (const need of moduleNeeds) {
      for (const capability of need.requiredCapabilities) {
        if (capability === "selection.flow.resolve") {
          warnings.add(
            `ModuleNeed '${need.semanticRole}' falls back to coarse capability 'selection.flow.resolve'; selection semantics remain underspecified on the current seam.`
          );
        }
        if (capability === "state.session.snapshot") {
          warnings.add(
            `ModuleNeed '${need.semanticRole}' falls back to coarse capability 'state.session.snapshot'; state semantics remain underspecified on the current seam.`
          );
        }
      }
    }
  }

  private addUnsupportedFamilyGapBlockers(
    schema: IntentSchema,
    blockers: Set<string>
  ): void {
    if (this.hasUnsupportedSchedulerTimerSignals(schema)) {
      blockers.add(
        "Scheduler/timer semantics are requested, but the current seam has no first-class scheduler/timer family."
      );
    }

    if (this.hasUnsupportedRewardProgressionSignals(schema)) {
      blockers.add(
        "Reward/progression semantics are requested, but the current seam has no first-class reward/progression family."
      );
    }

    if (this.hasUnsupportedSpawnEmissionSignals(schema)) {
      blockers.add(
        "Spawn/emission semantics are requested, but the current seam has no first-class spawn/emission family."
      );
    }
  }

  private hasUnsupportedSchedulerTimerSignals(schema: IntentSchema): boolean {
    const parameterKeys = this.collectTypedParameterKeys(schema);
    if (
      parameterKeys.has("initialDelaySeconds") ||
      parameterKeys.has("tickSeconds") ||
      parameterKeys.has("delaySeconds") ||
      parameterKeys.has("cooldownSeconds") ||
      parameterKeys.has("intervalSeconds")
    ) {
      return true;
    }

    return this.collectIntentStrings(schema).some((value) => {
      const normalized = value.toLowerCase();
      return (
        normalized.includes("cooldown") ||
        normalized.includes("冷却") ||
        normalized.includes("reopen it for") ||
        normalized.includes("reopen for") ||
        normalized.includes("cannot reopen") ||
        normalized.includes("cannot open again") ||
        normalized.includes("open again after") ||
        normalized.includes("delay resolution") ||
        normalized.includes("resolve the chosen result after") ||
        normalized.includes("不是立刻生效") ||
        normalized.includes("延迟") ||
        normalized.includes("结算后") ||
        normalized.includes("每 1 秒") ||
        normalized.includes("每秒") ||
        normalized.includes("every 1 second") ||
        normalized.includes("every second") ||
        normalized.includes("periodic") ||
        normalized.includes("periodically") ||
        normalized.includes("tick every") ||
        normalized.includes("trigger every") ||
        normalized.includes("30 秒内不能再次打开")
      );
    });
  }

  private hasUnsupportedRewardProgressionSignals(schema: IntentSchema): boolean {
    return this.collectIntentStrings(schema).some((value) => {
      const normalized = value.toLowerCase();
      return (
        normalized.includes("reward progress") ||
        normalized.includes("reward level") ||
        normalized.includes("level up") ||
        normalized.includes("progression") ||
        normalized.includes("奖励进度") ||
        normalized.includes("奖励循环") ||
        normalized.includes("累计三轮") ||
        normalized.includes("提升一级") ||
        normalized.includes("升级") ||
        normalized.includes("progress track") ||
        normalized.includes("after each selection round")
      );
    });
  }

  private hasUnsupportedSpawnEmissionSignals(schema: IntentSchema): boolean {
    return this.collectIntentStrings(schema).some((value) => {
      const normalized = value.toLowerCase();
      return (
        normalized.includes("spawn") ||
        normalized.includes("summon") ||
        normalized.includes("projectile") ||
        normalized.includes("helper unit") ||
        normalized.includes("helper entity") ||
        normalized.includes("companion") ||
        normalized.includes("生成一个") ||
        normalized.includes("生成帮助单位") ||
        normalized.includes("投射物") ||
        normalized.includes("帮助单位") ||
        normalized.includes("跟随玩家")
      );
    });
  }

  private collectTypedParameterKeys(schema: IntentSchema): Set<string> {
    const keys = new Set<string>();
    for (const requirement of schema.requirements.typed || []) {
      for (const key of Object.keys(requirement.parameters || {})) {
        keys.add(key);
      }
    }
    return keys;
  }

  private collectNormalizationIssues(
    schema: IntentSchema,
    proposal: BlueprintProposal,
    modules: BlueprintModule[],
    moduleNeeds: ModuleNeed[],
    status: NormalizedBlueprintStatus,
    assessment: SemanticAssessment
  ): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    if (modules.length === 0) {
      issues.push({
        code: "EMPTY_FINAL_BLUEPRINT_MODULES",
        scope: "blueprint",
        severity: "error",
        message: "FinalBlueprint 必须至少包含一个模块",
        path: "modules",
      });
    }

    if (moduleNeeds.length !== modules.length) {
      issues.push({
        code: "MODULE_NEED_COUNT_MISMATCH",
        scope: "blueprint",
        severity: "error",
        message: "FinalBlueprint.moduleNeeds 必须与 modules 对齐",
        path: "moduleNeeds",
      });
    }

    if (status !== "ready") {
      issues.push({
        code: status === "blocked" ? "FINAL_BLUEPRINT_BLOCKED" : "FINAL_BLUEPRINT_WEAK",
        scope: "blueprint",
        severity: status === "blocked" ? "error" : "warning",
        message: status === "blocked"
          ? "语义不足，FinalBlueprint 已被 honest-block"
          : "语义仍有不确定性，FinalBlueprint 处于 weak 状态",
        path: "status",
      });
    }

    if (proposal.proposedModules.some((module) => (module.proposedPatternIds || []).length > 0) && moduleNeeds.some((need) => need.explicitPatternHints && need.explicitPatternHints.length > 0)) {
      issues.push({
        code: "PATTERN_HINTS_TIE_BREAK_ONLY",
        scope: "blueprint",
        severity: "warning",
        message: "explicitPatternHints 仅作为 tie-break 输入，不代表最终 pattern authority",
        path: "moduleNeeds",
      });
    }

    if (schema.requiredClarifications?.some((item) => item.blocksFinalization && !this.isResolvableExistingSeamIssue(item.question, schema))) {
      issues.push({
        code: "REQUIRED_CLARIFICATION_BLOCKS_FINALIZATION",
        scope: "blueprint",
        severity: "error",
        message: "存在 blocksFinalization 的澄清项，无法输出 ready FinalBlueprint",
        path: "requiredClarifications",
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

  private isBoundedVariabilityClarification(question: string): boolean {
    const normalized = question.toLowerCase();
    const mentionsDetail =
      normalized.includes("具体内容") ||
      normalized.includes("具体数值") ||
      normalized.includes("具体的增益列表") ||
      normalized.includes("增益列表") ||
      normalized.includes("属性类型") ||
      normalized.includes("力量") ||
      normalized.includes("敏捷") ||
      normalized.includes("智力") ||
      normalized.includes("攻击力") ||
      normalized.includes("护甲") ||
      normalized.includes("数值") ||
      normalized.includes("名称") ||
      normalized.includes("图标") ||
      normalized.includes("icon") ||
      normalized.includes("resource path") ||
      normalized.includes("资源路径") ||
      normalized.includes("attribute values") ||
      normalized.includes("属性加成数值");
    const mentionsArchitectureGap =
      normalized.includes("what triggers") ||
      normalized.includes("trigger") ||
      normalized.includes("which existing systems") ||
      normalized.includes("integrate with") ||
      normalized.includes("multi-factor") ||
      normalized.includes("abilities") ||
      normalized.includes("items") ||
      normalized.includes("custom hero mechanics") ||
      normalized.includes("联动") ||
      normalized.includes("触发") ||
      normalized.includes("已有系统");

    return mentionsDetail && !mentionsArchitectureGap;
  }

  private isEffectLifecycleVariabilityClarification(question: string): boolean {
    const normalized = question.toLowerCase();
    const mentionsReplacementConcept =
      normalized.includes("replace") ||
      normalized.includes("replaced") ||
      normalized.includes("existing one") ||
      normalized.includes("existing buff") ||
      normalized.includes("current buff") ||
      normalized.includes("previous buff") ||
      normalized.includes("replace old") ||
      normalized.includes("new selection replace old") ||
      normalized.includes("保留最高值") ||
      normalized.includes("highest value") ||
      normalized.includes("retention priority") ||
      normalized.includes("替换") ||
      normalized.includes("旧增益") ||
      normalized.includes("当前增益");
    const mentionsStackingConcept =
      normalized.includes("stack") ||
      normalized.includes("stacking") ||
      normalized.includes("additively") ||
      normalized.includes("accumulate") ||
      normalized.includes("叠加");
    const mentionsCoexistenceConcept =
      normalized.includes("hold multiple buffs") ||
      normalized.includes("multiple buffs simultaneously") ||
      normalized.includes("multiple buffs") ||
      normalized.includes("same type") ||
      normalized.includes("same-type") ||
      normalized.includes("多次使用系统") ||
      normalized.includes("repeated uses") ||
      normalized.includes("same match") ||
      normalized.includes("simultaneously") ||
      normalized.includes("coexist") ||
      normalized.includes("coexisting") ||
      normalized.includes("同时拥有多个增益") ||
      normalized.includes("多个增益同时") ||
      normalized.includes("多个增益") ||
      normalized.includes("同类型");
    return (
      normalized.includes("clarify-stacking") ||
      normalized.includes("clarify-duration") ||
      normalized.includes("叠加") ||
      normalized.includes("替换") ||
      normalized.includes("多次打开") ||
      normalized.includes("永久的") ||
      normalized.includes("永久保留") ||
      normalized.includes("永久持续") ||
      normalized.includes("临时的") ||
      normalized.includes("限时") ||
      normalized.includes("limited duration") ||
      normalized.includes("多少秒") ||
      normalized.includes("几秒") ||
      normalized.includes("一段时间") ||
      normalized.includes("持续多久") ||
      normalized.includes("持续到游戏结束") ||
      normalized.includes("until next selection") ||
      normalized.includes("仅在特定条件下生效") ||
      normalized.includes("是否可叠加") ||
      normalized.includes("禁止选择同类型") ||
      normalized.includes("可以在一局游戏中多次打开") ||
      normalized.includes("移除旧效果") ||
      normalized.includes("持续时间") ||
      normalized.includes("duration") ||
      normalized.includes("stacking") ||
      normalized.includes("temporary") ||
      normalized.includes("permanent") ||
      normalized.includes("permanent for the match") ||
      normalized.includes("temporary with duration") ||
      normalized.includes("until next selection") ||
      normalized.includes("accumulate multiple buffs") ||
      normalized.includes("replace the previous buff") ||
      normalized.includes("reopen") ||
      normalized.includes("open multiple times") ||
      normalized.includes("replace current buff") ||
      normalized.includes("remove old effect") ||
      (mentionsReplacementConcept && (mentionsStackingConcept || mentionsCoexistenceConcept))
    );
  }

  private hasSupportedModifierLifecycleContext(schema: IntentSchema): boolean {
    return (
      schema.normalizedMechanics.outcomeApplication === true &&
      (schema.normalizedMechanics.playerChoice === true || schema.selection?.mode === "user-chosen") &&
      this.hasRepeatableSelectionIntent(schema) &&
      this.hasChoiceStateCarryThroughIntent(schema) &&
      (!!schema.effects?.durationSemantics || schema.normalizedMechanics.uiModal === true)
    );
  }

  private hasRepeatableSelectionIntent(schema: IntentSchema): boolean {
    if (schema.selection?.repeatability === "repeatable" || schema.selection?.repeatability === "persistent") {
      return true;
    }

    if (schema.flow?.supportsRetry === true) {
      return true;
    }

    if ((schema.flow?.sequence || []).some((step) => {
      const normalized = step.toLowerCase();
      return normalized.includes("每次") || normalized.includes("再次") || normalized.includes("repeat");
    })) {
      return true;
    }

    return this.collectIntentStrings(schema).some((value) => {
      const normalized = value.toLowerCase();
      return (
        normalized.includes("repeatable") ||
        normalized.includes("repeated") ||
        normalized.includes("repeat trigger") ||
        normalized.includes("reopen") ||
        normalized.includes("open again") ||
        normalized.includes("open multiple times") ||
        normalized.includes("每次打开") ||
        normalized.includes("再次打开") ||
        normalized.includes("多次打开") ||
        normalized.includes("重复触发") ||
        normalized.includes("反复触发")
      );
    });
  }

  private hasChoiceStateCarryThroughIntent(schema: IntentSchema): boolean {
    const hasPersistedChoiceState = !!schema.stateModel?.states?.some((state) => this.stateLooksLikePersistedChoiceState(state));
    if (hasPersistedChoiceState) {
      return true;
    }

    return this.collectIntentStrings(schema).some((value) => {
      const normalized = value.toLowerCase();
      return (
        normalized.includes("current choice") ||
        normalized.includes("current selection") ||
        normalized.includes("current state") ||
        normalized.includes("selected state") ||
        normalized.includes("selection state") ||
        normalized.includes("status sync") ||
        normalized.includes("state sync") ||
        normalized.includes("display current") ||
        normalized.includes("show current") ||
        normalized.includes("已选择") ||
        normalized.includes("当前选择") ||
        normalized.includes("当前状态") ||
        normalized.includes("当前选择状态") ||
        normalized.includes("选择状态") ||
        normalized.includes("状态同步")
      );
    });
  }

  private isNonBlockingClarification(question: string, schema: IntentSchema): boolean {
    return this.isResolvableExistingSeamIssue(question, schema);
  }

  private isResolvableExistingSeamIssue(value: string, schema: IntentSchema): boolean {
    if (this.isBoundedVariabilityClarification(value)) {
      return true;
    }

    if (this.isEffectLifecycleVariabilityClarification(value) && this.hasSupportedModifierLifecycleContext(schema)) {
      return true;
    }

    if (!this.isSupportedTriChoiceBuffFamilyContext(schema)) {
      return false;
    }

    return (
      !this.explicitlyReopensSupportedFamilyArchitecture(value) &&
      (this.isSupportedTriChoicePolishIssue(value) || this.isSupportedTriChoiceCatalogIssue(value))
    );
  }

  private isSupportedTriChoiceBuffFamilyContext(schema: IntentSchema): boolean {
    const bindings = schema.integrations?.expectedBindings || [];
    return (
      schema.normalizedMechanics.trigger === true &&
      schema.normalizedMechanics.candidatePool === true &&
      schema.normalizedMechanics.playerChoice === true &&
      schema.normalizedMechanics.uiModal === true &&
      schema.normalizedMechanics.outcomeApplication === true &&
      (schema.selection?.mode === "user-chosen" || schema.normalizedMechanics.playerChoice === true) &&
      this.hasRepeatableSelectionIntent(schema) &&
      bindings.some((binding) => binding.kind === "ui-surface") &&
      bindings.some((binding) => binding.kind === "bridge-point") &&
      bindings.some((binding) => binding.kind === "entry-point" || binding.kind === "data-source") &&
      this.hasSupportedModifierLifecycleContext(schema)
    );
  }

  private isSupportedTriChoicePolishIssue(value: string): boolean {
    const normalized = value.toLowerCase();
    return (
      normalized.includes("rebind") ||
      normalized.includes("可重绑") ||
      normalized.includes("rebindable") ||
      normalized.includes("cooldown") ||
      normalized.includes("冷却") ||
      normalized.includes("visual") ||
      normalized.includes("audio") ||
      normalized.includes("反馈") ||
      normalized.includes("音效") ||
      normalized.includes("特效") ||
      normalized.includes("f4")
    );
  }

  private isSupportedTriChoiceCatalogIssue(value: string): boolean {
    const normalized = value.toLowerCase();
    return (
      this.isBoundedVariabilityClarification(value) ||
      normalized.includes("pool size") ||
      normalized.includes("total pool size") ||
      normalized.includes("buff list") ||
      normalized.includes("buff types") ||
      normalized.includes("specific buff types") ||
      normalized.includes("pool composition") ||
      normalized.includes("modifier examples") ||
      normalized.includes("buff option list") ||
      normalized.includes("stat values") ||
      normalized.includes("duplicate across sessions") ||
      normalized.includes("总池大小") ||
      normalized.includes("总候选池") ||
      normalized.includes("完整 buff 列表") ||
      normalized.includes("完整增益列表") ||
      normalized.includes("具体 buff 类型") ||
      normalized.includes("具体增益类型") ||
      normalized.includes("池组成") ||
      normalized.includes("具体属性加成示例") ||
      normalized.includes("具体增益选项") ||
      normalized.includes("跨局重复") ||
      normalized.includes("同类型") ||
      normalized.includes("same type") ||
      normalized.includes("same-type") ||
      normalized.includes("duplicate")
    );
  }

  private explicitlyReopensSupportedFamilyArchitecture(value: string): boolean {
    const normalized = value.toLowerCase();
    const reopensTrigger =
      normalized.includes("what triggers") ||
      normalized.includes("trigger condition") ||
      normalized.includes("when does the selection happen") ||
      normalized.includes("how is f4 triggered") ||
      normalized.includes("触发条件") ||
      normalized.includes("什么触发") ||
      normalized.includes("何时触发");
    const reopensIntegration =
      normalized.includes("which system") ||
      normalized.includes("which existing systems") ||
      normalized.includes("integrate with") ||
      normalized.includes("what does it sync with") ||
      normalized.includes("bridge target") ||
      normalized.includes("联动哪个系统") ||
      normalized.includes("同步到哪里") ||
      normalized.includes("桥接到哪里");
    const reopensStateShape =
      normalized.includes("what state is persisted") ||
      normalized.includes("whether state should persist") ||
      normalized.includes("where is current buff stored") ||
      normalized.includes("candidate pool state") ||
      normalized.includes("state model") ||
      normalized.includes("存什么状态") ||
      normalized.includes("状态模型") ||
      normalized.includes("候选池状态");

    return reopensTrigger || reopensIntegration || reopensStateShape;
  }

  private stateLooksLikeCommittedSelection(
    state: NonNullable<IntentSchema["stateModel"]>["states"][number]
  ): boolean {
    const summary = state.summary.toLowerCase();
    const id = state.id.toLowerCase();
    return (
      summary.includes("selected") ||
      summary.includes("current choice") ||
      summary.includes("active buff") ||
      summary.includes("current buff") ||
      summary.includes("当前选择") ||
      summary.includes("当前增益") ||
      id.includes("selected") ||
      id.includes("choice") ||
      id.includes("active_buff") ||
      id.includes("current_buff")
    );
  }

  private stateLooksLikePoolState(
    state: NonNullable<IntentSchema["stateModel"]>["states"][number]
  ): boolean {
    const summary = state.summary.toLowerCase();
    const id = state.id.toLowerCase();
    return (
      summary.includes("pool") ||
      summary.includes("candidate") ||
      summary.includes("候选池") ||
      summary.includes("候选") ||
      id.includes("pool") ||
      id.includes("candidate")
    );
  }

  private stateLooksLikePersistedChoiceState(
    state: NonNullable<IntentSchema["stateModel"]>["states"][number]
  ): boolean {
    const summary = state.summary.toLowerCase();
    const id = state.id.toLowerCase();
    return (
      (state.lifetime === "persistent" || state.lifetime === "session") &&
      (
        this.stateLooksLikeCommittedSelection(state) ||
        summary.includes("active state") ||
        summary.includes("current selection") ||
        summary.includes("current choice") ||
        summary.includes("selected state") ||
        summary.includes("selection state") ||
        summary.includes("当前状态") ||
        summary.includes("已选择") ||
        summary.includes("选择状态") ||
        summary.includes("状态同步") ||
        id.includes("active_state") ||
        id.includes("current_selection") ||
        id.includes("current_choice") ||
        id.includes("selected_state") ||
        id.includes("selection_state")
      )
    );
  }

  private collectIntentStrings(schema: IntentSchema): string[] {
    const values: string[] = [];
    values.push(schema.request.goal);
    values.push(schema.flow?.triggerSummary || "");
    values.push(...(schema.flow?.sequence || []));
    values.push(...schema.requirements.functional);
    values.push(...(schema.requirements.interactions || []));
    values.push(...(schema.requirements.dataNeeds || []));
    values.push(...(schema.requirements.outputs || []));
    values.push(...(schema.uiRequirements?.surfaces || []));
    values.push(...(schema.uiRequirements?.feedbackNeeds || []));
    values.push(...schema.openQuestions);
    values.push(...schema.resolvedAssumptions);

    for (const requirement of schema.requirements.typed || []) {
      values.push(requirement.summary);
      values.push(...(requirement.inputs || []));
      values.push(...(requirement.outputs || []));
      values.push(...(requirement.invariants || []));
    }

    for (const binding of schema.integrations?.expectedBindings || []) {
      values.push(binding.summary);
      values.push(binding.id);
    }

    return values.filter((value): value is string => typeof value === "string" && value.trim().length > 0);
  }

  private contextSignalsContainAny(context: string, terms: string[]): boolean {
    return terms.some((term) => context.includes(term.toLowerCase()));
  }

  /**
   * 生成 Blueprint ID
   */
  private generateBlueprintId(schema: IntentSchema): string {
    const prefix = schema.classification.intentKind.replace(/-/g, "_");
    const timestamp = Date.now().toString(36).slice(-4);
    return `${prefix}_${timestamp}`;
  }
}

/**
 * 便捷函数：快速构建 Blueprint
 */
export function buildBlueprint(
  schema: IntentSchema,
  config?: BlueprintBuilderConfig
): BlueprintBuildResult {
  const builder = new BlueprintBuilder(config);
  return builder.build(schema);
}
