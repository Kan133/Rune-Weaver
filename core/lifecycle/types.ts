export type LifecycleCompletionKind =
  | "default-safe"
  | "forced"
  | "partial"
  | "requires-regenerate";

export interface LifecycleCommandContext {
  command: string;
  hostRoot: string;
  featureId?: string;
  prompt?: string;
  dryRun: boolean;
  write: boolean;
  force: boolean;
}

export interface LifecycleStageResult {
  success: boolean;
  skipped?: boolean;
  issues: string[];
  [key: string]: unknown;
}

export interface LifecycleFinalVerdict {
  pipelineComplete: boolean;
  completionKind: LifecycleCompletionKind;
  weakestStage: string;
  sufficientForDemo: boolean;
  remainingRisks: string[];
  nextSteps: string[];
}

export interface MaintenanceLifecycleStageStatus {
  name: string;
  success: boolean;
}
