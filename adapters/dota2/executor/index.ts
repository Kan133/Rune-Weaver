/**
 * Dota2 Adapter - Host Write Executor
 *
 * Phase 1 正式实现 (T074-T077-R2)
 * - 支持 create, refresh, inject_once 动作
 * - 边界校验真正参与执行
 * - 收紧 inject_once 幂等逻辑
 *
 * 这是唯一的公共入口，不再有双轨并存。
 */

export {
  executeWritePlan,
  generateWriteReview,
  validateWriteAction,
  isInRWNamespace,
  isAllowedBridgePoint,
  type WriteActionType,
  type WriteAction,
  type WritePlan,
  type WriteResult,
  type WriteExecutorOptions,
  type WriteReviewArtifact,
} from "./write-executor.js";

// ============================================================================
// Legacy 兼容层 - 仅用于旧代码过渡，新代码请使用上方 Phase 1 API
// ============================================================================

export {
  applyWritePlan,
  printExecutionResult,
  canExecuteWritePlan,
  type WritePlanExecutionResult,
  type ExecutionOptions,
} from "./legacy-executor.js";
