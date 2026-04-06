/**
 * Rune Weaver - Update Module
 *
 * T108-T111: Update Semantics Refinement
 *
 * 本模块提供细粒度的 update 语义，让同一 feature 的小改动
 * 尽量走 refresh / selective replace，而不是默认靠大范围 cleanup。
 *
 * 核心概念：
 * - unchanged: 文件内容未变化，跳过
 * - refresh-only: 同一路径内容变化，只更新内容
 * - create-new: 新文件，直接创建
 * - safe-delete: RW-owned 文件被移除，安全删除
 * - requires-regenerate: 变化超出安全边界，需要完整 regenerate
 *
 * T108-T111-R1: Update Mainline Integration
 *
 * 本模块现在是 CLI 主路径的内部策略，不再是独立 maintenance 子系统。
 * - classifyUpdateDiff: 保留，作为主路径中的分类策略
 * - executeSelectiveUpdate: 保留，作为主路径中的执行辅助
 * - createUpdateReviewArtifact: 已移除，使用统一 Dota2ReviewArtifact
 * - saveUpdateReviewArtifact: 已移除，使用统一 saveReviewArtifact
 */

export {
  classifyUpdateDiff,
  formatUpdateDiffResult,
  type UpdateDiffResult,
  type FileUpdateClassification,
  type UpdateClassification,
} from "./update-classifier.js";

export {
  executeSelectiveUpdate,
  formatSelectiveUpdateResult,
  type SelectiveUpdateResult,
} from "./update-executor.js";
