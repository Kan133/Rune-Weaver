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
    const issues: ValidationIssue[] = [];

    // 前置检查 - 使用新的 isReadyForBlueprint 字段
    if (!schema.isReadyForBlueprint) {
      issues.push({
        code: "SCHEMA_NOT_READY",
        scope: "blueprint",
        severity: "error",
        message: "IntentSchema 未准备好构建 Blueprint",
        path: "isReadyForBlueprint",
      });
      return { success: false, issues };
    }

    try {
      const blueprint = this.doBuild(schema);
      return { success: true, blueprint, issues };
    } catch (error) {
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

  /**
   * 根据需求构建模块
   */
  private buildModules(schema: IntentSchema): BlueprintModule[] {
    const modules: BlueprintModule[] = [];
    const prefix = this.config.modulePrefix;
    const schemaParams = (schema as any).parameters || {};

    const choiceCount = schemaParams.choiceCount as number | undefined;
    const talentEntries = schemaParams.entries as Array<{ id: string; label: string; description: string; weight: number; tier: string }> | undefined;

    if (choiceCount !== undefined || talentEntries !== undefined || Object.keys(schemaParams).length > 0) {
      const triggerModule: BlueprintModule = {
        id: `${prefix}trigger_0`,
        role: 'talent_trigger',
        category: 'trigger',
        patternIds: ['input.key_binding'],
        responsibilities: ['Trigger talent draw on key press'],
        parameters: {
          key: 'F4',
          triggerAction: 'open_talent_modal',
        },
      };
      modules.push(triggerModule);

      const poolModule: BlueprintModule = {
        id: `${prefix}pool_0`,
        role: 'talent_pool',
        category: 'data',
        patternIds: ['data.weighted_pool'],
        responsibilities: ['Manage talent pool'],
        parameters: talentEntries ? { entries: talentEntries } : undefined,
      };
      modules.push(poolModule);

      const ruleModule: BlueprintModule = {
        id: `${prefix}rule_0`,
        role: 'selection_rule',
        category: 'rule',
        patternIds: ['rule.selection_flow'],
        responsibilities: ['Manage selection flow'],
        parameters: {
          choiceCount: choiceCount || 3,
          selectionPolicy: 'single',
        },
      };
      modules.push(ruleModule);

      const uiModule: BlueprintModule = {
        id: `${prefix}ui_0`,
        role: 'selection_ui',
        category: 'ui',
        patternIds: ['ui.selection_modal'],
        responsibilities: ['Display selection UI'],
        parameters: {
          title: 'Choose Your Talent',
          description: 'Select one of the following talents',
        },
      };
      modules.push(uiModule);

      const effectModule: BlueprintModule = {
        id: `${prefix}effect_0`,
        role: 'talent_buff',
        category: 'effect',
        patternIds: ['dota2.short_time_buff'],
        responsibilities: ['Apply buff effect'],
        parameters: {
          duration: schemaParams.abilityDuration || 10,
          movespeedBonus: 50,
          manaCost: 0,
          cooldown: schemaParams.abilityCooldown || 30,
        },
      };
      modules.push(effectModule);

      return modules;
    }

    for (let i = 0; i < schema.requirements.functional.length; i++) {
      const req = schema.requirements.functional[i];
      const module = this.createFunctionalModule(req, i, prefix);
      if (module) {
        modules.push(module);
      }
    }

    if (schema.requirements.interactions) {
      for (let i = 0; i < schema.requirements.interactions.length; i++) {
        const interaction = schema.requirements.interactions[i];
        const inputModule = this.createInteractionModule(interaction, i, prefix);
        if (inputModule && !modules.find(m => m.id === inputModule.id)) {
          modules.push(inputModule);
        }
      }
    }

    if (schema.uiRequirements?.needed && schema.uiRequirements.surfaces) {
      for (let i = 0; i < schema.uiRequirements.surfaces.length; i++) {
        const surface = schema.uiRequirements.surfaces[i];
        const uiModule = this.createUIModule(surface, i, prefix);
        if (uiModule) {
          modules.push(uiModule);
        }
      }
    }

    return modules;
  }

  /**
   * 创建功能模块
   */
  private createFunctionalModule(
    req: string,
    index: number,
    prefix: string
  ): BlueprintModule | null {
    const category = this.inferCategoryFromRequirement(req);
    const patternIds = this.getCanonicalPatternIds(category);
    
    return {
      id: `${prefix}func_${index}`,
      role: req,
      category,
      patternIds,
      responsibilities: [req],
    };
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
  private getCanonicalPatternIds(category: BlueprintModule["category"]): string[] {
    switch (category) {
      case "trigger":
        return [CORE_PATTERN_IDS.INPUT_KEY_BINDING];
      case "data":
        return [CORE_PATTERN_IDS.DATA_WEIGHTED_POOL];
      case "rule":
        return [CORE_PATTERN_IDS.RULE_SELECTION_FLOW];
      case "ui":
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
    prefix: string
  ): BlueprintModule | null {
    return {
      id: `${prefix}input_${index}`,
      role: interaction,
      category: "trigger",
      patternIds: this.getCanonicalPatternIds("trigger"),
      responsibilities: [`处理交互: ${interaction}`],
    };
  }

  /**
   * 创建 UI 模块
   */
  private createUIModule(
    surface: string,
    index: number,
    prefix: string
  ): BlueprintModule | null {
    return {
      id: `${prefix}ui_${index}`,
      role: surface,
      category: "ui",
      patternIds: this.getCanonicalPatternIds("ui"),
      responsibilities: [`渲染 UI: ${surface}`],
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
      const patterns = [CORE_PATTERN_IDS.EFFECT_MODIFIER_APPLIER, CORE_PATTERN_IDS.EFFECT_RESOURCE_CONSUME].filter(isPatternAvailable);
      if (patterns.length > 0) {
        hints.push({
          category: "effect",
          suggestedPatterns: patterns,
          rationale: "需要结果应用机制",
        });
      }
    }

    if (schema.normalizedMechanics.resourceConsumption) {
      const patterns = [CORE_PATTERN_IDS.RESOURCE_BASIC_POOL, CORE_PATTERN_IDS.EFFECT_RESOURCE_CONSUME].filter(isPatternAvailable);
      if (patterns.length > 0) {
        hints.push({
          category: "resource",
          suggestedPatterns: patterns,
          rationale: "需要资源消耗处理",
        });
      }
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
      rule: "所有模块必须绑定到可用 Pattern",
      severity: "error",
    });

    return contracts;
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
