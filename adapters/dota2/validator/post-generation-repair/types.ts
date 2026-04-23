/**
 * Post-Generation Repair - Types
 *
 * Core type definitions for post-generation repair operations.
 */

import type {
  PostGenerationValidationResult,
  PostGenerationCheck,
} from "../post-generation-validator.js";

export type RepairActionKind =
  | "safe_fix"
  | "refresh_bridge"
  | "upgrade_workspace_grounding"
  | "requires_regenerate"
  | "manual";
export type RepairRiskLevel = "none" | "low" | "medium" | "high";

export interface PostGenerationRepairAction {
  id: string;
  sourceCheck: string;
  title: string;
  description: string;
  risk: RepairRiskLevel;
  executable: boolean;
  kind: RepairActionKind;
  data?: {
    missingImports?: string[];
    cssAction?: "create" | "patch";
    targetFile?: string;
    groundingUpgrade?: {
      featureIds: string[];
      modulesByFeature: Record<string, string[]>;
    };
    context?: Record<string, unknown>;
  };
}

export interface PostGenerationRepairPlan {
  needsRepair: boolean;
  sourceValidation: PostGenerationValidationResult;
  actions: PostGenerationRepairAction[];
  executableActions: PostGenerationRepairAction[];
  nonExecutableActions: PostGenerationRepairAction[];
  manualActions: PostGenerationRepairAction[];
  summary: {
    total: number;
    executable: number;
    upgradeWorkspaceGrounding: number;
    requiresRegenerate: number;
    manual: number;
  };
}

export interface RepairActionResult {
  action: PostGenerationRepairAction;
  success: boolean;
  message: string;
  modifiedFile?: string;
  errors?: string[];
}

export interface PostGenerationRepairResult {
  success: boolean;
  executed: RepairActionResult[];
  skipped: PostGenerationRepairAction[];
  errors: string[];
  summary: {
    attempted: number;
    succeeded: number;
    failed: number;
    skipped: number;
  };
}

// Re-export types needed from validator for convenience
export type { PostGenerationValidationResult, PostGenerationCheck };
