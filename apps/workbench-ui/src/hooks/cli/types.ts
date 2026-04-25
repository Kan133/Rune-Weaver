export type CLICommand =
  | 'init'
  | 'run'
  | 'update'
  | 'delete'
  | 'demo-prepare'
  | 'doctor'
  | 'validate'
  | 'install'
  | 'dev'
  | 'repair-build'
  | 'launch'
  | 'gap-fill';

export type ExecutionStatus = 'idle' | 'running' | 'success' | 'failure';

export interface CLIExecuteOptions {
  command: CLICommand;
  hostRoot: string;
  prompt?: string;
  write?: boolean;
  force?: boolean;
  featureId?: string;
  boundaryId?: string;
  instruction?: string;
  gapFillMode?: 'review' | 'apply' | 'validate-applied';
  approvalFile?: string;
  addonName?: string;
  mapName?: string;
}

export interface CLIActionSummary {
  headline: string;
  reason: string;
  command?: string;
}

export type CLIReviewStageStatus = 'success' | 'failure' | 'warning' | 'info';

export interface CLIReviewStage {
  id: string;
  label: string;
  status: CLIReviewStageStatus;
  summary: string;
  details?: string[];
}

export interface CLIReviewAction {
  label: string;
  command?: string;
  kind: 'primary' | 'secondary' | 'repair' | 'launch' | 'inspect';
}

export type GapFillProductStatus =
  | 'ready_to_apply'
  | 'needs_confirmation'
  | 'blocked_by_host'
  | 'blocked_by_policy';

export interface CLIGapFillDecisionRecord {
  originalInstruction: string;
  selectedBoundary: string;
  selectedBoundaryLabel?: string;
  assumptionsMade: string[];
  userInputsUsed: string[];
  inferredInputsUsed: string[];
  decision: string;
  failureCategories: string[];
  exactNextStep?: string;
  approvalFile?: string;
}

export interface CLIGapFillReadiness {
  hostReady: boolean;
  workspaceConsistent: boolean;
  blockingItems: string[];
  advisoryItems: string[];
}

export interface CLICanonicalGapFillGuidance {
  classification: 'canonical' | 'exploratory';
  title: string;
  summary: string;
  nextStep: string;
  evidenceMode: 'acceptance' | 'exploratory';
  expectedPrompt: string;
  expectedBoundary: string;
}

export interface CLICanonicalAcceptance {
  classification: 'canonical_acceptance_ready' | 'canonical_but_incomplete' | 'exploratory';
  summary: string;
  nextStep: string;
}

export interface CLIReviewPayload {
  title: string;
  summary: string;
  status: CLIReviewStageStatus;
  stages: CLIReviewStage[];
  blockers: string[];
  highlights: string[];
  recommendedActions: CLIReviewAction[];
  artifactPath?: string;
  featureId?: string;
  generatedFiles?: string[];
  integrationPoints?: string[];
  gapFillStatus?: GapFillProductStatus;
  gapFillDecisionRecord?: CLIGapFillDecisionRecord;
  gapFillReadiness?: CLIGapFillReadiness;
  canonicalGapFillGuidance?: CLICanonicalGapFillGuidance;
  canonicalAcceptance?: CLICanonicalAcceptance;
}

export interface CLIExecutionResult {
  success: boolean;
  command: string;
  exitCode: number;
  output: string[];
  error?: string;
  artifactPath?: string;
  actionSummary?: CLIActionSummary;
  review?: CLIReviewPayload;
}

export interface LaunchPreflightResult {
  ready: boolean;
  missingArtifacts: string[];
}

export interface UseCLIExecutorReturn {
  isRunning: boolean;
  status: ExecutionStatus;
  currentCommand: CLICommand | null;
  output: string[];
  result: CLIExecutionResult | null;
  error: string | null;
  execute: (options: CLIExecuteOptions) => Promise<void>;
  executeInit: (hostRoot: string, addonName?: string) => Promise<void>;
  executeRun: (hostRoot: string, prompt: string, write?: boolean, featureId?: string) => Promise<void>;
  executeUpdate: (hostRoot: string, featureId: string, prompt: string, write?: boolean) => Promise<void>;
  executeDelete: (hostRoot: string, featureId: string, write?: boolean) => Promise<void>;
  executeDemoPrepare: (hostRoot: string, addonName?: string, mapName?: string) => Promise<void>;
  executeDoctor: (hostRoot: string) => Promise<void>;
  executeValidate: (hostRoot: string) => Promise<void>;
  executeInstall: (hostRoot: string) => Promise<void>;
  executeDev: (hostRoot: string) => Promise<void>;
  executeRepairBuild: (hostRoot: string) => Promise<void>;
  executeLaunch: (hostRoot: string, addonName?: string, mapName?: string) => Promise<void>;
  executeGapFill: (
    hostRoot: string,
    featureId: string,
    instruction: string,
    boundaryId?: string,
    gapFillMode?: 'review' | 'apply' | 'validate-applied',
    approvalFile?: string,
  ) => Promise<void>;
  checkLaunchPreflight: (hostRoot: string) => Promise<LaunchPreflightResult>;
  clearOutput: () => void;
  reset: () => void;
}

export interface ExecuteAPIResponse {
  success: boolean;
  result?: CLIExecutionResult;
  error?: string;
}
