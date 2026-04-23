export type FeatureStatus = 'draft' | 'active' | 'archived' | 'error' | 'unknown';

export interface HostRealization {
  host: string | null;
  context: string | null;
  syncStatus: 'synced' | 'pending' | 'error' | 'unknown';
}

export interface ReviewSignals {
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
  grounding?: {
    status: 'none_required' | 'exact' | 'partial' | 'insufficient';
    reviewRequired: boolean;
    verifiedSymbolCount: number;
    allowlistedSymbolCount: number;
    weakSymbolCount: number;
    unknownSymbolCount: number;
    warningCount: number;
  };
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
