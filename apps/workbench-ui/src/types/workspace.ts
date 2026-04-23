// F008: Local Workspace Types
// Mirrors core/workspace/types.ts for frontend use
// Avoids importing from outside src directory

export interface EntryBinding {
  target: "server" | "ui" | "config";
  file: string;
  kind: "import" | "register" | "mount" | "append_index";
  symbol?: string;
}

export interface FeatureSourceModelRef {
  adapter: string;
  version: number;
  path: string;
}

export type GroundingAssessmentStatus =
  | 'none_required'
  | 'exact'
  | 'partial'
  | 'insufficient';

export interface GroundingAssessment {
  status: GroundingAssessmentStatus;
  reviewRequired: boolean;
  verifiedSymbolCount: number;
  allowlistedSymbolCount: number;
  weakSymbolCount: number;
  unknownSymbolCount: number;
  warnings: string[];
  reasonCodes: string[];
}

export interface ValidationStageStatus {
  status: 'unvalidated' | 'passed' | 'needs_review' | 'failed';
  warnings: string[];
  blockers: string[];
  summary?: string;
  checkedAt?: string;
}

export interface ValidationStatus {
  status: 'unvalidated' | 'passed' | 'needs_review' | 'failed';
  warnings: string[];
  blockers: string[];
  lastValidatedAt?: string;
  blueprint?: ValidationStageStatus;
  synthesis?: ValidationStageStatus;
  repair?: ValidationStageStatus;
  dependency?: ValidationStageStatus;
  host?: ValidationStageStatus;
  runtime?: ValidationStageStatus;
}

export interface CommitDecision {
  outcome: 'committable' | 'exploratory' | 'blocked';
  canAssemble: boolean;
  canWriteHost: boolean;
  requiresReview: boolean;
  reasons: string[];
  reviewModules?: string[];
}

export interface RuneWeaverFeatureRecord {
  featureId: string;
  featureName?: string;
  intentKind: string;
  status: "active" | "disabled" | "archived" | "rolled_back";
  revision: number;
  blueprintId: string;
  selectedPatterns: string[];
  generatedFiles: string[];
  entryBindings: EntryBinding[];
  sourceModel?: FeatureSourceModelRef;
  dependsOn?: string[];
  maturity?: 'exploratory' | 'stabilized' | 'templated';
  implementationStrategy?: 'family' | 'pattern' | 'guided_native' | 'exploratory';
  validationStatus?: ValidationStatus;
  commitDecision?: CommitDecision;
  groundingSummary?: GroundingAssessment;
  integrationPoints?: string[];
  gapFillBoundaries?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface RuneWeaverWorkspace {
  version: string;
  hostType: "dota2-x-template";
  hostRoot: string;
  addonName: string;
  mapName?: string;
  initializedAt: string;
  features: RuneWeaverFeatureRecord[];
}
