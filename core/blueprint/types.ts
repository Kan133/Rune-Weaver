/**
 * Rune Weaver - Blueprint Types
 * 
 * 实现编排层核心类型定义
 * 与 docs/SCHEMA.md 5.2 节保持一致
 */

// 导入基础类型
import type {
  Blueprint,
  BlueprintNormalizationReport,
  BlueprintProposal,
  FinalBlueprint,
  ValidationIssue,
  PatternHint,
} from "../schema/types";

// 重新导出 schema 中已定义的 Blueprint 相关类型
export type {
  Blueprint,
  BlueprintSourceIntent,
  BlueprintModule,
  BlueprintConnection,
  PatternHint,
  ValidationContract,
  UIDesignSpec,
  UISurfaceSpec,
  UIVisualStyle,
} from "../schema/types";

// ============================================================================
// Blueprint 专用扩展类型
// ============================================================================

/**
 * Blueprint 构建器配置
 */
export interface BlueprintBuilderConfig {
  /** 是否自动推断模块连接 */
  autoConnect?: boolean;
  /** 是否启用 UI 分支检测 */
  enableUIBranch?: boolean;
  /** 模块命名前缀 */
  modulePrefix?: string;
}

/**
 * Blueprint 构建结果
 */
export interface BlueprintBuildResult {
  success: boolean;
  blueprint?: Blueprint;
  finalBlueprint?: FinalBlueprint;
  blueprintProposal?: BlueprintProposal;
  normalizationReport?: BlueprintNormalizationReport;
  issues: ValidationIssue[];
}

/**
 * Blueprint 统计分析
 */
export interface BlueprintStats {
  moduleCount: number;
  connectionCount: number;
  inputModuleCount: number;
  effectModuleCount: number;
  uiModuleCount: number;
  dataModuleCount: number;
  maxDepth: number;
}

/**
 * Blueprint 验证结果
 */
export interface BlueprintValidationResult {
  valid: boolean;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
  stats: BlueprintStats;
}

/**
 * Blueprint 评审产物
 * 用于人工评审和存档
 */
export interface BlueprintReviewArtifact {
  version: string;
  generatedAt: string;
  sourceSchema: {
    goal: string;
    intentKind: string;
    uncertaintyCount: number;
  };
  blueprint: {
    id: string;
    summary: string;
    moduleCount: number;
    connectionCount: number;
  };
  patternHints: PatternHint[];
  assumptions: string[];
  readyForAssembly: boolean;
  notes?: string[];
}
