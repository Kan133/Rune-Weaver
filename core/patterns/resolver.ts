/**
 * Rune Weaver - Pattern Resolver
 *
 * 从 Blueprint 解析出 SelectedPattern[]
 * 只使用当前 Catalog 中真实存在的 Pattern
 */

import {
  Blueprint,
  BlueprintModule,
  PatternHint,
  SelectedPattern as BaseSelectedPattern,
  NormalizedMechanics,
} from "../schema/types";

/**
 * 扩展的 SelectedPattern，包含解析元数据
 */
export interface ResolvedPattern extends BaseSelectedPattern {
  priority: "required" | "preferred" | "fallback";
  source: "hint" | "category" | "mechanic";
}

/**
 * 未解析的 Pattern 请求
 */
export interface UnresolvedPattern {
  requestedId: string;
  reason: string;
  suggestedAlternative?: string;
}

/**
 * Pattern 解析结果
 */
export interface PatternResolutionResult {
  /** 选中的 patterns（只包含 catalog 中存在的） */
  patterns: ResolvedPattern[];
  /** 未解析的 patterns */
  unresolved: UnresolvedPattern[];
  /** 解析过程中的问题 */
  issues: ResolutionIssue[];
  /** 是否完全解析（没有 unresolved 且没有 error） */
  complete: boolean;
}

/**
 * 解析问题
 */
export interface ResolutionIssue {
  code: string;
  scope: "schema" | "blueprint" | "assembly" | "host";
  severity: "error" | "warning";
  message: string;
  path?: string;
  moduleId?: string;
}

// ============================================================================
// 当前 Catalog 中真实存在的 Pattern 集合
// 来源: adapters/dota2/patterns/index.ts
// ============================================================================
const AVAILABLE_PATTERNS = new Set([
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
]);

/**
 * 检查 pattern 是否在 catalog 中
 */
function isPatternAvailable(patternId: string): boolean {
  return AVAILABLE_PATTERNS.has(patternId);
}

/**
 * 类别到默认 Pattern 的映射
 * 只包含 catalog 中存在的 pattern
 * 
 * 注意：effect 类别不再一刀切映射到 effect.dash
 * 而是根据语义在 resolveFromCategory 中动态选择
 */
const CATEGORY_PATTERN_MAP: Record<
  BlueprintModule["category"],
  { patternId: string; priority: ResolvedPattern["priority"] } | null
> = {
  trigger: { patternId: "input.key_binding", priority: "required" },
  data: { patternId: "data.weighted_pool", priority: "required" },
  rule: { patternId: "rule.selection_flow", priority: "required" },
  // effect 类别不再一刀切映射，见 resolveEffectPattern 函数
  effect: null,
  resource: { patternId: "resource.basic_pool", priority: "required" },
  ui: { patternId: "ui.selection_modal", priority: "preferred" },
  // integration 类别在 catalog 中没有对应 pattern
  integration: null,
};

/**
 * 机制到 Pattern 的映射
 * 只包含 catalog 中存在的 pattern
 */
const MECHANIC_PATTERN_MAP: Partial<
  Record<keyof NormalizedMechanics, { patternId: string; priority: ResolvedPattern["priority"] }>
> = {
  // trigger -> input.key_binding (available)
  trigger: { patternId: "input.key_binding", priority: "required" },
  // candidatePool -> data.weighted_pool (available)
  candidatePool: { patternId: "data.weighted_pool", priority: "required" },
  // weightedSelection -> data.weighted_pool (same as candidatePool)
  weightedSelection: { patternId: "data.weighted_pool", priority: "required" },
  // playerChoice -> rule.selection_flow (player selection is part of selection flow)
  playerChoice: { patternId: "rule.selection_flow", priority: "required" },
  // uiModal -> ui.selection_modal (available)
  uiModal: { patternId: "ui.selection_modal", priority: "required" },
  // outcomeApplication -> effect.modifier_applier (now available)
  outcomeApplication: { patternId: "effect.modifier_applier", priority: "required" },
  // resourceConsumption -> resource.basic_pool (available)
  resourceConsumption: { patternId: "resource.basic_pool", priority: "required" },
};

/**
 * 解析 Blueprint 到 SelectedPattern[]
 */
export function resolvePatterns(blueprint: Blueprint): PatternResolutionResult {
  const patterns: ResolvedPattern[] = [];
  const unresolved: UnresolvedPattern[] = [];
  const issues: ResolutionIssue[] = [];
  const patternIds = new Set<string>();

  // 策略 1: 从 patternHints 解析
  for (const hint of blueprint.patternHints) {
    const hintResult = resolveFromHint(hint, blueprint);
    for (const p of hintResult.patterns) {
      if (!patternIds.has(p.patternId)) {
        patterns.push(p);
        patternIds.add(p.patternId);
      } else {
        issues.push({
          code: "DUPLICATE_PATTERN",
          scope: "assembly",
          severity: "warning",
          message: `Pattern '${p.patternId}' already selected from another source`,
        });
      }
    }
    unresolved.push(...hintResult.unresolved);
  }

  // 策略 2: 从 modules 类别映射
  for (const module of blueprint.modules) {
    const categoryResult = resolveFromCategory(module);
    if (categoryResult.pattern && !patternIds.has(categoryResult.pattern.patternId)) {
      patterns.push(categoryResult.pattern);
      patternIds.add(categoryResult.pattern.patternId);
    }
    if (categoryResult.unresolved) {
      unresolved.push(categoryResult.unresolved);
    }
  }

  // 策略 3: 从 normalizedMechanics 推断
  const mechanicResult = resolveFromMechanics(blueprint.sourceIntent.normalizedMechanics);
  for (const p of mechanicResult.patterns) {
    if (!patternIds.has(p.patternId)) {
      patterns.push(p);
      patternIds.add(p.patternId);
    }
  }
  unresolved.push(...mechanicResult.unresolved);

  // 检查是否为空
  if (patterns.length === 0) {
    issues.push({
      code: "NO_PATTERNS_RESOLVED",
      scope: "assembly",
      severity: "error",
      message: "No patterns could be resolved from Blueprint",
    });
  }

  // 检查 unresolved 情况
  if (unresolved.length > 0) {
    issues.push({
      code: "UNRESOLVED_PATTERNS",
      scope: "assembly",
      severity: "warning",
      message: `${unresolved.length} pattern(s) could not be resolved: ${unresolved.map(u => u.requestedId).join(", ")}`,
    });
  }

  // 检查关键 pattern
  const hasTrigger = patterns.some((p) => p.patternId.startsWith("input."));
  const hasEffect = patterns.some((p) => p.patternId.startsWith("effect."));

  if (!hasTrigger && !hasEffect) {
    issues.push({
      code: "MISSING_CORE_PATTERN",
      scope: "assembly",
      severity: "warning",
      message: "No input trigger or effect pattern resolved",
    });
  }

  return {
    patterns,
    unresolved,
    issues,
    complete: patterns.length > 0 && unresolved.length === 0 && !issues.some((i) => i.severity === "error"),
  };
}

/**
 * 从 pattern hint 解析
 */
function resolveFromHint(
  hint: PatternHint,
  blueprint: Blueprint
): { patterns: ResolvedPattern[]; unresolved: UnresolvedPattern[] } {
  const patterns: ResolvedPattern[] = [];
  const unresolved: UnresolvedPattern[] = [];

  for (const patternId of hint.suggestedPatterns) {
    if (isPatternAvailable(patternId)) {
      patterns.push({
        patternId,
        role: hint.category || "unknown",
        parameters: extractParametersFromBlueprint(patternId, blueprint),
        priority: "preferred",
        source: "hint",
      });
    } else {
      unresolved.push({
        requestedId: patternId,
        reason: `Pattern '${patternId}' not found in current catalog`,
      });
    }
  }

  return { patterns, unresolved };
}

/**
 * 从模块类别解析
 */
function resolveFromCategory(module: BlueprintModule): {
  pattern: ResolvedPattern | null;
  unresolved: UnresolvedPattern | null;
} {
  // effect 类别特殊处理：根据语义智能选择
  if (module.category === "effect") {
    return resolveEffectPattern(module);
  }

  const mapping = CATEGORY_PATTERN_MAP[module.category];
  
  if (!mapping) {
    return {
      pattern: null,
      unresolved: {
        requestedId: `<${module.category}>`,
        reason: `No pattern available for category '${module.category}' in current catalog`,
      },
    };
  }

  return {
    pattern: {
      patternId: mapping.patternId,
      role: module.role,
      parameters: module.parameters,
      priority: mapping.priority,
      source: "category",
    },
    unresolved: null,
  };
}

/**
 * 解析 effect 类别模块到具体 pattern
 * 根据语义智能选择，不再一刀切映射到 effect.dash
 */
function resolveEffectPattern(module: BlueprintModule): {
  pattern: ResolvedPattern | null;
  unresolved: UnresolvedPattern | null;
} {
  const roleLower = module.role.toLowerCase();
  const responsibilitiesLower = module.responsibilities.map(r => r.toLowerCase()).join(" ");
  const contextLower = roleLower + " " + responsibilitiesLower;

  // 1. 位移/冲刺语义 -> effect.dash
  const dashKeywords = ["冲刺", "位移", "dash", "blink", "jump", "leap", "突进", "move", "rapid", "speed", "快速移动", "向前"];
  const isDashRelated = dashKeywords.some(k => contextLower.includes(k));
  if (isDashRelated) {
    return {
      pattern: {
        patternId: "effect.dash",
        role: module.role,
        parameters: module.parameters,
        priority: "required",
        source: "category",
      },
      unresolved: null,
    };
  }

  // 2. 资源消耗/扣除语义 -> effect.resource_consume
  const resourceKeywords = ["消耗", "扣除", "cost", "consume", "消耗法力", "消耗能量", "resource", "mana", "energy", "冷却", "cooldown"];
  const isResourceRelated = resourceKeywords.some(k => contextLower.includes(k));
  if (isResourceRelated) {
    return {
      pattern: {
        patternId: "effect.resource_consume",
        role: module.role,
        parameters: module.parameters,
        priority: "required",
        source: "category",
      },
      unresolved: null,
    };
  }

  // 3. 修改器/效果应用语义 -> effect.modifier_applier
  const modifierKeywords = ["应用", "modifier", "buff", "debuff", "效果", "天赋", "apply", "增益", "减益", "强化", "bind", "绑定", "key", "键", "execute", "执行", "action", "动作", "capture", "捕获", "input", "输入", "configuration", "配置"];
  const isModifierRelated = modifierKeywords.some(k => contextLower.includes(k));
  if (isModifierRelated) {
    return {
      pattern: {
        patternId: "effect.modifier_applier",
        role: module.role,
        parameters: module.parameters,
        priority: "required",
        source: "category",
      },
      unresolved: null,
    };
  }

  // 4. 无法识别语义 -> 标记为 weak match / fallback
  // 默认尝试 effect.modifier_applier 作为通用效果应用器
  // 但标记为 fallback 提示可能需要人工确认
  return {
    pattern: {
      patternId: "effect.modifier_applier",
      role: module.role,
      parameters: module.parameters,
      priority: "fallback",
      source: "category",
    },
    unresolved: {
      requestedId: `<effect:${module.role}>`,
      reason: `Effect module '${module.role}' has unrecognized semantics. ` +
              `Used 'effect.modifier_applier' as fallback. ` +
              `Please review if this is the correct pattern.`,
      suggestedAlternative: "Consider adding more specific keywords to role/responsibilities",
    },
  };
}

/**
 * 从 normalizedMechanics 解析
 */
function resolveFromMechanics(
  mechanics: NormalizedMechanics
): { patterns: ResolvedPattern[]; unresolved: UnresolvedPattern[] } {
  const patterns: ResolvedPattern[] = [];
  const unresolved: UnresolvedPattern[] = [];

  for (const [key, value] of Object.entries(mechanics)) {
    if (value) {
      const mechanicKey = key as keyof NormalizedMechanics;
      const mapping = MECHANIC_PATTERN_MAP[mechanicKey];
      
      if (mapping) {
        patterns.push({
          patternId: mapping.patternId,
          role: mechanicKey,
          parameters: {},
          priority: mapping.priority,
          source: "mechanic",
        });
      } else {
        unresolved.push({
          requestedId: `<mechanic:${mechanicKey}>`,
          reason: `No pattern available for mechanic '${mechanicKey}' in current catalog`,
        });
      }
    }
  }

  return { patterns, unresolved };
}

/**
 * 从 Blueprint 提取 Pattern 参数
 */
function extractParametersFromBlueprint(
  patternId: string,
  blueprint: Blueprint
): Record<string, unknown> {
  const params: Record<string, unknown> = {};

  if (patternId.startsWith("input.")) {
    const triggerModule = blueprint.modules.find((m) => m.category === "trigger");
    if (triggerModule?.parameters) {
      Object.assign(params, triggerModule.parameters);
    }
  } else if (patternId.startsWith("effect.")) {
    const effectModule = blueprint.modules.find((m) => m.category === "effect");
    if (effectModule?.parameters) {
      Object.assign(params, effectModule.parameters);
    }
  } else if (patternId.startsWith("data.")) {
    const dataModule = blueprint.modules.find((m) => m.category === "data");
    if (dataModule?.parameters) {
      Object.assign(params, dataModule.parameters);
    }
  }

  return params;
}

/**
 * 合并重复的 Pattern
 */
export function mergeDuplicatePatterns(
  patterns: ResolvedPattern[]
): ResolvedPattern[] {
  const patternMap = new Map<string, ResolvedPattern>();

  for (const p of patterns) {
    const existing = patternMap.get(p.patternId);
    if (!existing) {
      patternMap.set(p.patternId, p);
    } else {
      if (priorityValue(p.priority) > priorityValue(existing.priority)) {
        patternMap.set(p.patternId, {
          ...p,
          parameters: { ...existing.parameters, ...p.parameters },
        });
      } else {
        patternMap.set(p.patternId, {
          ...existing,
          parameters: { ...existing.parameters, ...p.parameters },
        });
      }
    }
  }

  return Array.from(patternMap.values());
}

/**
 * 优先级数值化
 */
function priorityValue(priority: ResolvedPattern["priority"]): number {
  const values: Record<string, number> = { required: 3, preferred: 2, fallback: 1 };
  return values[priority] || 0;
}
