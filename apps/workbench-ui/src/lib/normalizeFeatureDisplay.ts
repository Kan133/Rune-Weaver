import type { Feature, HostRealization } from '@/types/feature';

export interface NormalizedFeatureDisplay {
  id: string;
  displayName: string;
  systemId: string;
  group: string | null;
  parentId: string | null;
  childrenIds: string[];
  status: Feature['status'];
  revision: number | null;
  updatedAt: Date | null;
  patterns: string[];
  generatedFiles: string[];
  gapFillBoundaries: string[];
  integrationPoints: string[];
  hostRealization: {
    host: string | null;
    context: string | null;
    syncStatus: HostRealization['syncStatus'];
  };
  reviewSignals: {
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
  };
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

function normalizeDate(value: unknown): Date | null {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  if (typeof value === 'string' || typeof value === 'number') {
    const next = new Date(value);
    return Number.isNaN(next.getTime()) ? null : next;
  }
  return null;
}

export function normalizeFeatureDisplay(feature: Feature | null | undefined): NormalizedFeatureDisplay | null {
  if (!feature) {
    return null;
  }

  const source = feature as Partial<Feature>;
  const reviewSignals = source.reviewSignals;
  const hostRealization = source.hostRealization;

  return {
    id: typeof source.id === 'string' ? source.id : '',
    displayName: typeof source.displayName === 'string' && source.displayName.trim()
      ? source.displayName
      : '未命名 Feature',
    systemId: typeof source.systemId === 'string' && source.systemId.trim()
      ? source.systemId
      : 'unknown-feature',
    group: typeof source.group === 'string' && source.group.trim() ? source.group : null,
    parentId: typeof source.parentId === 'string' ? source.parentId : null,
    childrenIds: asStringArray(source.childrenIds),
    status: source.status ?? 'unknown',
    revision: typeof source.revision === 'number' && Number.isFinite(source.revision) ? source.revision : null,
    updatedAt: normalizeDate(source.updatedAt),
    patterns: asStringArray(source.patterns),
    generatedFiles: asStringArray(source.generatedFiles),
    gapFillBoundaries: asStringArray(source.gapFillBoundaries),
    integrationPoints: asStringArray(source.integrationPoints),
    hostRealization: {
      host: typeof hostRealization?.host === 'string' && hostRealization.host.trim() ? hostRealization.host : null,
      context: typeof hostRealization?.context === 'string' && hostRealization.context.trim() ? hostRealization.context : null,
      syncStatus:
        hostRealization?.syncStatus === 'synced' ||
        hostRealization?.syncStatus === 'error' ||
        hostRealization?.syncStatus === 'pending' ||
        hostRealization?.syncStatus === 'unknown'
          ? hostRealization.syncStatus
          : 'unknown',
    },
    reviewSignals: {
      proposalStatus: {
        ready: reviewSignals?.proposalStatus?.ready ?? false,
        percentage: typeof reviewSignals?.proposalStatus?.percentage === 'number'
          ? reviewSignals.proposalStatus.percentage
          : null,
        message: typeof reviewSignals?.proposalStatus?.message === 'string' && reviewSignals.proposalStatus.message.trim()
          ? reviewSignals.proposalStatus.message
          : null,
      },
      gapFillSummary: {
        autoFilled: typeof reviewSignals?.gapFillSummary?.autoFilled === 'number'
          ? reviewSignals.gapFillSummary.autoFilled
          : 0,
        needsAttention: typeof reviewSignals?.gapFillSummary?.needsAttention === 'number'
          ? reviewSignals.gapFillSummary.needsAttention
          : 0,
      },
      categoryEClarification: {
        count: typeof reviewSignals?.categoryEClarification?.count === 'number'
          ? reviewSignals.categoryEClarification.count
          : 0,
        items: asStringArray(reviewSignals?.categoryEClarification?.items),
      },
      invalidPatternIds: asStringArray(reviewSignals?.invalidPatternIds),
      readiness: {
        score: typeof reviewSignals?.readiness?.score === 'number' ? reviewSignals.readiness.score : null,
        warnings: asStringArray(reviewSignals?.readiness?.warnings),
      },
    },
  };
}
