/**
 * Rune Weaver - Core Pipeline
 * 
 * 主流程编排层导出
 * 与 docs/SCHEMA.md 对齐
 */

export {
  AssemblyPlanBuilder,
  createAssemblyPlan,
  type UnresolvedModule,
  type PatternConflict,
  type AssemblyPlanConfig,
} from "./assembly-plan";

export {
  resolvePatterns,
  mergeDuplicatePatterns,
  type PatternResolutionResult,
  type ResolvedPattern,
  type ResolutionIssue,
} from "../patterns/resolver";
