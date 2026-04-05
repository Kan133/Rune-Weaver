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
    };
  }

  /**
   * 根据需求构建模块
   */
  private buildModules(schema: IntentSchema): BlueprintModule[] {
    const modules: BlueprintModule[] = [];
    const prefix = this.config.modulePrefix;

    // 1. 从 functional requirements 构建核心模块
    for (let i = 0; i < schema.requirements.functional.length; i++) {
      const req = schema.requirements.functional[i];
      const module = this.createFunctionalModule(req, i, prefix);
      if (module) {
        modules.push(module);
      }
    }

    // 2. 从 interactions 构建输入模块
    if (schema.requirements.interactions) {
      for (let i = 0; i < schema.requirements.interactions.length; i++) {
        const interaction = schema.requirements.interactions[i];
        const inputModule = this.createInteractionModule(interaction, i, prefix);
        if (inputModule && !modules.find(m => m.id === inputModule.id)) {
          modules.push(inputModule);
        }
      }
    }

    // 3. 从 UI requirements 构建 UI 模块
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
    
    return {
      id: `${prefix}func_${index}`,
      role: req,
      category,
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

    // 基于 normalizedMechanics 生成 pattern hints
    if (schema.normalizedMechanics.trigger) {
      hints.push({
        category: "input",
        suggestedPatterns: ["input.key_binding", "input.event_handler"],
        rationale: "需要输入触发机制",
      });
    }

    if (schema.normalizedMechanics.candidatePool) {
      hints.push({
        category: "data",
        suggestedPatterns: ["data.weighted_pool", "data.registry"],
        rationale: "需要候选项池管理",
      });
    }

    if (schema.normalizedMechanics.weightedSelection) {
      hints.push({
        category: "rule",
        suggestedPatterns: ["rule.weighted_random", "rule.selection_flow"],
        rationale: "需要加权随机选择",
      });
    }

    if (schema.normalizedMechanics.playerChoice) {
      hints.push({
        category: "rule",
        suggestedPatterns: ["rule.player_selection", "rule.choice_validator"],
        rationale: "需要玩家选择处理",
      });
    }

    if (schema.normalizedMechanics.uiModal) {
      hints.push({
        category: "ui",
        suggestedPatterns: ["ui.selection_modal", "ui.modal_container"],
        rationale: "需要模态 UI 界面",
      });
    }

    if (schema.normalizedMechanics.outcomeApplication) {
      hints.push({
        category: "effect",
        suggestedPatterns: ["effect.modifier_applier", "effect.state_updater"],
        rationale: "需要结果应用机制",
      });
    }

    if (schema.normalizedMechanics.resourceConsumption) {
      hints.push({
        category: "resource",
        suggestedPatterns: ["resource.basic_pool", "resource.cost_validator"],
        rationale: "需要资源消耗处理",
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
