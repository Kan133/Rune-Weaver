/**
 * Dota2 Adapter - Post-Generation Repair (P0)
 *
 * Repairs failed post-generation validation checks.
 * Based on selection_pool runtime bugs - these are critical repairs
 * that must be applied before the game can run correctly.
 *
 * This is a barrel file that re-exports from the post-generation-repair/ directory.
 * Implementation is split into cohesive modules:
 * - types: Core type definitions
 * - helpers: Internal utility functions
 * - planner: Repair planning logic
 * - executor: Repair execution logic
 * - report: Reporting and formatting functions
 */

// Re-export all types
export type {
  RepairActionKind,
  RepairRiskLevel,
  PostGenerationRepairAction,
  PostGenerationRepairPlan,
  RepairActionResult,
  PostGenerationRepairResult,
  PostGenerationValidationResult,
  PostGenerationCheck,
} from "./post-generation-repair/types.js";

// Re-export all functions
export {
  createRepairAction,
  planPostGenerationRepairs,
} from "./post-generation-repair/planner.js";

export {
  executeRepairAction,
  executeSafePostGenerationRepairs,
} from "./post-generation-repair/executor.js";

export {
  printRepairPlan,
  printRepairResult,
} from "./post-generation-repair/report.js";

// Note: Internal helpers (generateActionId, findMissingLessImports) are not exported
// as they are implementation details and should not be part of the public API.
