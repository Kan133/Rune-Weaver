// Feature 类型定义

export type FeatureStatus = 'active' | 'draft' | 'error' | 'regenerate';

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
  hostRealization: {
    host: string;
    context: string;
    syncStatus: 'synced' | 'pending' | 'error';
  };
  reviewSignals: {
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
  };
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
