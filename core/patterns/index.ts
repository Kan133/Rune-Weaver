/**
 * Rune Weaver - Core Patterns
 * 
 * Pattern 元数据抽象层
 * 定义与宿主无关的 Pattern 描述接口
 * 
 * 对齐要求:
 * - PATTERN-SPEC.md
 * - docs/hosts/dota2/PATTERN-AUTHORING-GUIDE.md
 * - 三个 draft pattern 试点
 */

// ============================================================================
// Pattern 参数定义
// ============================================================================

export interface PatternParam {
  name: string;
  type: string;
  required: boolean;
  description?: string;
  defaultValue?: unknown;
  /** 参数约束，如 "value > 0" */
  constraints?: string[];
}

// ============================================================================
// Pattern 输入/输出定义
// ============================================================================

export interface PatternPort {
  name: string;
  type: string;
  description?: string;
  required?: boolean;
}

// ============================================================================
// Pattern 职责与非目标
// ============================================================================

export interface PatternResponsibility {
  /** 职责描述 */
  text: string;
  /** 是否核心职责 */
  core: boolean;
}

export interface PatternNonGoal {
  /** 非目标描述（本 Pattern 不做什么） */
  text: string;
  /** 建议替代方案 */
  alternative?: string;
}

// ============================================================================
// Pattern 依赖定义
// ============================================================================

export interface PatternDependency {
  /** 依赖的 Pattern ID */
  patternId: string;
  /** 依赖关系类型 */
  relation: "requires" | "optional" | "conflicts" | "replaces";
  /** 依赖说明 */
  reason?: string;
}

// ============================================================================
// Pattern 验证提示
// ============================================================================

export interface PatternValidationHint {
  /** 验证阶段 */
  stage: "schema" | "blueprint" | "assembly" | "host";
  /** 验证规则描述 */
  rule: string;
  /** 错误提示 */
  message: string;
  /** 严重程度 */
  severity: "error" | "warning";
}

// ============================================================================
// Pattern 宿主绑定（抽象层）
// ============================================================================

export interface PatternHostBinding {
  /** 宿主标识 */
  hostId: string;
  /** 该宿主下的目标位置 */
  target: string;
  /** 输出文件类型 */
  outputTypes: string[];
  /** 宿主特定参数映射 */
  paramMapping?: Record<string, string>;
  /** 宿主特定约束 */
  constraints?: string[];
}

// ============================================================================
// Pattern 示例
// ============================================================================

export interface PatternExample {
  /** 示例名称 */
  name: string;
  /** 示例描述 */
  description: string;
  /** 示例参数 */
  params?: Record<string, unknown>;
  /** 使用场景 */
  useCase?: string;
}

// ============================================================================
// Pattern 元数据（宿主无关）- 升级后完整版
// ============================================================================

export interface PatternMeta {
  /** Pattern 唯一标识 */
  id: string;
  
  /** 所属类别 */
  category: string;
  
  /** 简短摘要 */
  summary: string;
  
  /** 详细描述 */
  description?: string;
  
  /** 职责列表 */
  responsibilities: PatternResponsibility[];
  
  /** 非目标（本 Pattern 不做什么） */
  nonGoals: PatternNonGoal[];
  
  /** 能力标签 */
  capabilities: string[];
  
  /** 输入定义 */
  inputs: PatternPort[];
  
  /** 输出定义 */
  outputs: PatternPort[];
  
  /** 参数定义（更详细的结构化参数） */
  parameters?: PatternParam[];
  
  /** 约束条件 */
  constraints?: string[];
  
  /** 依赖关系 */
  dependencies?: PatternDependency[];
  
  /** 验证提示 */
  validationHints?: PatternValidationHint[];
  
  /** 宿主绑定 */
  hostBindings?: PatternHostBinding[];
  
  /** 使用示例 */
  examples?: PatternExample[];
  
  /** 相关文档链接 */
  references?: string[];
}

// ============================================================================
// Pattern 目录接口
// ============================================================================

export interface PatternCatalog {
  patterns: PatternMeta[];
  getById(id: string): PatternMeta | undefined;
  getByCategory(category: string): PatternMeta[];
  getByCapability(capability: string): PatternMeta[];
  validatePattern(pattern: unknown): { valid: boolean; errors: string[] };
}

// ============================================================================
// Pattern 准入检查
// ============================================================================

export interface PatternValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  checks: {
    hasId: boolean;
    hasSummary: boolean;
    hasResponsibilities: boolean;
    hasNonGoals: boolean;
    hasParameters: boolean;
    hasInputs: boolean;
    hasOutputs: boolean;
    hasExamples: boolean;
    hasHostBinding: boolean;
  };
}

/**
 * 验证 Pattern 是否符合准入标准
 */
export function validatePatternForAdmission(
  pattern: Partial<PatternMeta>
): PatternValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  const checks = {
    hasId: !!pattern.id,
    hasSummary: !!pattern.summary && pattern.summary.length > 0,
    hasResponsibilities: !!pattern.responsibilities && pattern.responsibilities.length > 0,
    hasNonGoals: !!pattern.nonGoals && pattern.nonGoals.length > 0,
    hasParameters: !!pattern.parameters && pattern.parameters.length > 0,
    hasInputs: !!pattern.inputs && pattern.inputs.length > 0,
    hasOutputs: !!pattern.outputs && pattern.outputs.length > 0,
    hasExamples: !!pattern.examples && pattern.examples.length > 0,
    hasHostBinding: !!pattern.hostBindings && pattern.hostBindings.length > 0,
  };

  // 核心必填字段（error 级别）
  if (!checks.hasId) {
    errors.push("Pattern 必须包含 id");
  }
  
  if (!checks.hasSummary) {
    errors.push("Pattern 必须包含 summary");
  }
  
  if (!checks.hasResponsibilities) {
    errors.push("Pattern 必须包含 responsibilities");
  }
  
  // PATTERN-SPEC.md 入库最低标准字段（error 级别）
  if (!checks.hasNonGoals) {
    errors.push("Pattern 必须包含 nonGoals（明确不做什么）");
  }
  
  if (!checks.hasParameters) {
    errors.push("Pattern 必须包含 parameters（参数定义）");
  }
  
  if (!checks.hasHostBinding) {
    errors.push("Pattern 必须包含 hostBindings（宿主绑定）");
  }
  
  // 建议字段（warning 级别）
  if (!checks.hasExamples) {
    warnings.push("Pattern 建议包含 examples（使用示例）");
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    checks,
  };
}

// ============================================================================
// 创建一个简单的 Pattern 目录
// ============================================================================

export function createPatternCatalog(patterns: PatternMeta[]): PatternCatalog {
  return {
    patterns,
    getById: (id: string) => patterns.find((p) => p.id === id),
    getByCategory: (category: string) =>
      patterns.filter((p) => p.category === category),
    getByCapability: (capability: string) =>
      patterns.filter((p) => p.capabilities.includes(capability)),
    validatePattern: (pattern: unknown) => {
      const result = validatePatternForAdmission(pattern as Partial<PatternMeta>);
      return { valid: result.valid, errors: [...result.errors, ...result.warnings] };
    },
  };
}

// ============================================================================
// 工具函数
// ============================================================================

/**
 * 获取 Pattern 的核心职责
 */
export function getCoreResponsibilities(pattern: PatternMeta): string[] {
  return pattern.responsibilities
    .filter((r) => r.core)
    .map((r) => r.text);
}

/**
 * 获取 Pattern 的宿主绑定
 */
export function getHostBinding(
  pattern: PatternMeta,
  hostId: string
): PatternHostBinding | undefined {
  return pattern.hostBindings?.find((b) => b.hostId === hostId);
}

/**
 * 检查 Pattern 是否支持指定宿主
 */
export function supportsHost(pattern: PatternMeta, hostId: string): boolean {
  return pattern.hostBindings?.some((b) => b.hostId === hostId) ?? false;
}
