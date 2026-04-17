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
import {
  buildModuleNeeds,
  describeMechanicResponsibility,
  extractModuleParameters,
  getCanonicalPatternIds,
  inferCategoriesFromMechanics,
  inferCategoryFromRequirement,
  inferRoleFromCategory,
  resolveRequirementCategory,
  resolveRequirementParameters,
  resolveRequirementRole,
} from "./blueprint-semantic-shaping";
import {
  collectProposalBlockers,
  collectProposalIssues,
  getNormalizedStatus,
  getProposalStatus,
  getSchemaReadiness,
} from "./blueprint-status-policy";
import { isResolvableExistingSeamIssue } from "./clarification-policy";
import {
  deriveFeatureAuthoringProposal,
  normalizeFeatureAuthoringProposal,
  type FeatureAuthoringNormalizationResult,
} from "./feature-authoring";
import {
  buildSelectionPoolFillContracts,
  compileSelectionPoolModuleParameters,
} from "../../adapters/dota2/families/selection-pool/index.js";
import { assessSemanticCompleteness } from "./seam-authority";
import type { SemanticAssessment } from "./seam-authority";

function isPatternAvailable(patternId: string): boolean {
  return isCanonicalPatternAvailable(patternId);
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
    const readiness = getSchemaReadiness(schema);
    const issues = collectProposalIssues(schema);
    const blockedBy = collectProposalBlockers(schema);
    const featureAuthoringProposal = deriveFeatureAuthoringProposal(schema);
    const fillIntentCandidates = Array.isArray(schema.fillIntentCandidates)
      ? schema.fillIntentCandidates
      : undefined;

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
      status: getProposalStatus(readiness, issues, blockedBy),
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
      ...(featureAuthoringProposal ? { featureAuthoringProposal } : {}),
      ...(fillIntentCandidates ? { fillIntentCandidates } : {}),
    };
  }

  private normalizeProposal(
    schema: IntentSchema,
    proposal: BlueprintProposal
  ): { finalBlueprint: FinalBlueprint; report: BlueprintNormalizationReport } {
    const candidate = this.doBuild(schema);
    const normalizedFeatureAuthoring = normalizeFeatureAuthoringProposal(
      schema,
      proposal.featureAuthoringProposal,
    );
    const modules = this.applyFeatureAuthoringToModules(
      this.canonicalizeModules(candidate.modules),
      normalizedFeatureAuthoring,
    );
    const connections = this.canonicalizeConnections(candidate.connections, modules);
    const moduleNeeds = buildModuleNeeds(schema, modules);
    const assessment = assessSemanticCompleteness(schema, modules, moduleNeeds, proposal);
    const preliminaryStatus = getNormalizedStatus(schema, proposal, modules, assessment);
    const status: NormalizedBlueprintStatus =
      normalizedFeatureAuthoring.blockers.length > 0
        ? "blocked"
        : normalizedFeatureAuthoring.warnings.length > 0 && preliminaryStatus === "ready"
          ? "weak"
          : preliminaryStatus;
    const fillContracts = normalizedFeatureAuthoring.featureAuthoring
      ? buildSelectionPoolFillContracts(modules)
      : undefined;
    const issues = this.collectNormalizationIssues(
      schema,
      proposal,
      modules,
      moduleNeeds,
      status,
      assessment,
      normalizedFeatureAuthoring,
    );
    const blockers = issues
      .filter((issue) => issue.severity === "error")
      .map((issue) => issue.message);

    const finalBlueprint: FinalBlueprint = {
      ...candidate,
      modules,
      connections,
      parameters: candidate.parameters,
      status,
      moduleNeeds,
      proposalId: proposal.id,
      readyForAssembly: status === "ready" && issues.every((issue) => issue.severity !== "error"),
      ...(normalizedFeatureAuthoring.featureAuthoring ? { featureAuthoring: normalizedFeatureAuthoring.featureAuthoring } : {}),
      ...(fillContracts ? { fillContracts } : {}),
    };

    const report: BlueprintNormalizationReport = {
      status,
      notes: [...proposal.notes, ...assessment.notes, ...normalizedFeatureAuthoring.notes],
      issues,
      blockers,
    };

    return { finalBlueprint, report };
  }

  private applyFeatureAuthoringToModules(
    modules: BlueprintModule[],
    featureAuthoring: FeatureAuthoringNormalizationResult,
  ): BlueprintModule[] {
    if (!featureAuthoring.featureAuthoring || featureAuthoring.featureAuthoring.profile !== "selection_pool") {
      return modules;
    }

    const compiled = compileSelectionPoolModuleParameters(featureAuthoring.featureAuthoring);
    return modules.map((module) => {
      const override =
        module.role === "input_trigger"
          ? compiled.input_trigger
          : module.role === "weighted_pool"
            ? compiled.weighted_pool
            : module.role === "selection_flow"
              ? compiled.selection_flow
              : module.role === "selection_modal"
                ? compiled.selection_modal
                : undefined;

      return override
        ? {
            ...module,
            parameters: {
              ...(module.parameters || {}),
              ...override,
            },
          }
        : module;
    });
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
        const module = this.createTypedRequirementModule(req, i, prefix, schemaParams, schema);
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
    schemaParams: Record<string, unknown>,
    schema: IntentSchema
  ): BlueprintModule | null {
    const category = resolveRequirementCategory(req, schema);
    const role = resolveRequirementRole(req, category, schema, [
      req.id,
      req.summary,
      ...(req.inputs || []),
      ...(req.outputs || []),
    ]);
    const parameters = resolveRequirementParameters(req, category, schemaParams, schema);

    return {
      id: `${prefix}typed_${req.id || index}`,
      role,
      category,
      patternIds: getCanonicalPatternIds(category, role),
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
    const category = inferCategoryFromRequirement(req);
    const role = inferRoleFromCategory(category, [req]);
    const patternIds = getCanonicalPatternIds(category, role);
    const parameters = extractModuleParameters(category, schemaParams);
    
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
    const categories = inferCategoriesFromMechanics(schema);

    for (const category of categories) {
      const role = inferRoleFromCategory(category);
      const parameters = extractModuleParameters(category, schemaParams);
      const newModule: BlueprintModule = {
        id: `${prefix}${category}_${modules.length}`,
        role,
        category,
        patternIds: getCanonicalPatternIds(category, role),
        responsibilities: [describeMechanicResponsibility(category)],
        ...(Object.keys(parameters).length > 0 && { parameters }),
      };
      this.upsertModule(modules, newModule);
    }
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
   * 创建交互模块（输入绑定）
   */
  private createInteractionModule(
    interaction: string,
    index: number,
    prefix: string,
    schemaParams: Record<string, unknown>
  ): BlueprintModule | null {
    const parameters = extractModuleParameters("trigger", schemaParams);
    const role = inferRoleFromCategory("trigger");
    return {
      id: `${prefix}input_${index}`,
      role,
      category: "trigger",
      patternIds: getCanonicalPatternIds("trigger", role),
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
    const parameters = extractModuleParameters("ui", schemaParams);
    const role = inferRoleFromCategory("ui", [surface]);
    return {
      id: `${prefix}ui_${index}`,
      role,
      category: "ui",
      patternIds: getCanonicalPatternIds("ui", role),
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

  private collectNormalizationIssues(
    schema: IntentSchema,
    proposal: BlueprintProposal,
    modules: BlueprintModule[],
    moduleNeeds: ModuleNeed[],
    status: NormalizedBlueprintStatus,
    assessment: SemanticAssessment,
    featureAuthoring: FeatureAuthoringNormalizationResult,
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

    if (schema.requiredClarifications?.some((item) => item.blocksFinalization && !isResolvableExistingSeamIssue(item.question, schema))) {
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

    for (const blocker of featureAuthoring.blockers) {
      issues.push({
        code: "FINAL_BLUEPRINT_FEATURE_AUTHORING_BLOCKER",
        scope: "blueprint",
        severity: "error",
        message: blocker,
        path: "featureAuthoring",
      });
    }

    for (const warning of featureAuthoring.warnings) {
      issues.push({
        code: "FINAL_BLUEPRINT_FEATURE_AUTHORING_WARNING",
        scope: "blueprint",
        severity: "warning",
        message: warning,
        path: "featureAuthoring",
      });
    }

    return issues;
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
