/**
 * Rune Weaver - Rollback Module
 *
 * T104-T107-R1: Rollback Mainline Integration
 *
 * 本模块只提供 rollback plan generation 和 safety validation。
 * 执行结果、workspace 结果、validation 结果、artifact 和 verdict
 * 都统一回当前 CLI 主口径。
 */

export {
  generateRollbackPlan,
  validateFileOwnership,
  validateFeatureExclusivity,
  isRwOwnedPath,
  isBridgePoint,
  formatRollbackPlan,
} from "./rollback-plan.js";

export type {
  RollbackPlan,
  RollbackValidationResult,
} from "./rollback-plan.js";

export {
  executeRollback,
  formatRollbackResult,
} from "./rollback-execute.js";

export type {
  RollbackExecutionResult,
} from "./rollback-execute.js";
