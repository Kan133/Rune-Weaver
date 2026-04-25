export type FeatureStatus = 'draft' | 'active' | 'archived' | 'error' | 'unknown';

export interface HostRealization {
  host: string | null;
  context: string | null;
  syncStatus: 'synced' | 'pending' | 'error' | 'unknown';
}

export interface ReviewSignals {
  lifecycle?: {
    featureStatus: 'active' | 'disabled' | 'archived' | 'rolled_back' | 'unknown';
    maturity: 'exploratory' | 'stabilized' | 'templated' | null;
    implementationStrategy: 'family' | 'pattern' | 'guided_native' | 'exploratory' | null;
    commitOutcome: 'committable' | 'exploratory' | 'blocked' | null;
    canAssemble: boolean | null;
    canWriteHost: boolean | null;
    requiresReview: boolean;
    reasons: string[];
    summary: string;
  };
  reusableGovernance?: {
    admittedCount: number;
    attentionCount: number;
    familyAdmissions: GovernanceAdmissionView[];
    patternAdmissions: GovernanceAdmissionView[];
    seamAdmissions: GovernanceAdmissionView[];
    summary: string;
  };
  repairability?: {
    status: 'not_checked' | 'clean' | 'review_required' | 'repair_safe' | 'upgrade_workspace_grounding' | 'requires_regenerate';
    reasons: string[];
    summary: string;
  };
  proposalStatus: {
    ready: boolean;
    percentage: number | null;
    message: string | null;
  };
  gapFillSummary: {
    autoFilled: number;
    needsAttention: number;
  };
  categoryEClarification: {
    count: number;
    items: string[];
  };
  invalidPatternIds: string[];
  readiness: {
    score: number | null;
    warnings: string[];
  };
  compatibilitySource?: 'governance-read-model' | 'compatibility-only';
  grounding?: {
    status: 'none_required' | 'exact' | 'partial' | 'insufficient';
    reviewRequired: boolean;
    verifiedSymbolCount: number;
    allowlistedSymbolCount: number;
    weakSymbolCount: number;
    unknownSymbolCount: number;
    warningCount: number;
    warnings?: string[];
    reasonCodes?: string[];
    summary?: string;
  };
}

export interface GovernanceAdmissionView {
  assetId: string;
  status: 'candidate' | 'admitted' | 'deprecated' | 'untracked';
}

export interface Feature {
  id: string;
  displayName: string;
  systemId: string;
  group: string | null;
  parentId: string | null;
  childrenIds: string[];
  status: FeatureStatus;
  revision: number | null;
  updatedAt: Date | null;
  patterns: string[];
  generatedFiles: string[];
  gapFillBoundaries?: string[];
  integrationPoints?: string[];
  hostRealization: HostRealization;
  reviewSignals: ReviewSignals;
}

export interface Group {
  id: string;
  name: string;
  icon: string;
  count: number;
}

export interface CreateFeatureData {
  displayName: string;
  systemId?: string;
  group: string;
  parentId?: string | null;
}

export interface WizardMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

export interface WizardState {
  isActive: boolean;
  messages: WizardMessage[];
  currentStep: 'intent' | 'clarification' | 'confirmation' | 'generating';
  draftFeature: Partial<Feature> | null;
}
