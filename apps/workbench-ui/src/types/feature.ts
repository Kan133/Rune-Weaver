export type FeatureStatus = 'draft' | 'active' | 'archived' | 'error';

export interface HostRealization {
  host: string;
  context: string;
  syncStatus: 'synced' | 'pending' | 'error';
}

export interface ReviewSignals {
  proposalStatus: {
    ready: boolean;
    percentage: number;
    message: string;
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
    score: number;
    warnings: string[];
  };
}

export interface Feature {
  id: string;
  displayName: string;
  systemId: string;
  group: string;
  parentId: string | null;
  childrenIds: string[];
  status: FeatureStatus;
  revision: number;
  updatedAt: Date;
  patterns: string[];
  generatedFiles: string[];
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
