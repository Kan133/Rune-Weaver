import type { Feature, HostRealization, ReviewSignals } from '@/types/feature';

export interface NormalizedFeatureDisplay {
  id: string;
  displayName: string;
  systemId: string;
  group: string;
  parentId: string | null;
  childrenIds: string[];
  status: Feature['status'];
  revision: number;
  updatedAt: Date | null;
  patterns: string[];
  generatedFiles: string[];
  gapFillBoundaries: string[];
  integrationPoints: string[];
  hostRealization: HostRealization;
  reviewSignals: ReviewSignals;
}

const DEFAULT_HOST_REALIZATION: HostRealization = {
  host: 'Dota2',
  context: '',
  syncStatus: 'pending',
};

const DEFAULT_REVIEW_SIGNALS: ReviewSignals = {
  proposalStatus: {
    ready: false,
    percentage: 0,
    message: '当前记录还没有完整的 proposal 信号。',
  },
  gapFillSummary: {
    autoFilled: 0,
    needsAttention: 0,
  },
  categoryEClarification: {
    count: 0,
    items: [],
  },
  invalidPatternIds: [],
  readiness: {
    score: 0,
    warnings: [],
  },
};

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

function normalizeDate(value: unknown): Date | null {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  if (typeof value === 'string' || typeof value === 'number') {
    const normalized = new Date(value);
    return Number.isNaN(normalized.getTime()) ? null : normalized;
  }

  return null;
}

export function normalizeFeatureDisplay(
  feature: Feature | null | undefined,
): NormalizedFeatureDisplay | null {
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
    group: typeof source.group === 'string' && source.group.trim() ? source.group : 'skill',
    parentId: typeof source.parentId === 'string' ? source.parentId : null,
    childrenIds: asStringArray(source.childrenIds),
    status: source.status ?? 'draft',
    revision: typeof source.revision === 'number' && Number.isFinite(source.revision) ? source.revision : 1,
    updatedAt: normalizeDate(source.updatedAt),
    patterns: asStringArray(source.patterns),
    generatedFiles: asStringArray(source.generatedFiles),
    gapFillBoundaries: asStringArray(source.gapFillBoundaries),
    integrationPoints: asStringArray(source.integrationPoints),
    hostRealization: {
      host: typeof hostRealization?.host === 'string' && hostRealization.host.trim()
        ? hostRealization.host
        : DEFAULT_HOST_REALIZATION.host,
      context: typeof hostRealization?.context === 'string' ? hostRealization.context : '',
      syncStatus:
        hostRealization?.syncStatus === 'synced' ||
        hostRealization?.syncStatus === 'error' ||
        hostRealization?.syncStatus === 'pending'
          ? hostRealization.syncStatus
          : DEFAULT_HOST_REALIZATION.syncStatus,
    },
    reviewSignals: {
      proposalStatus: {
        ready: reviewSignals?.proposalStatus?.ready ?? DEFAULT_REVIEW_SIGNALS.proposalStatus.ready,
        percentage:
          typeof reviewSignals?.proposalStatus?.percentage === 'number'
            ? reviewSignals.proposalStatus.percentage
            : DEFAULT_REVIEW_SIGNALS.proposalStatus.percentage,
        message:
          typeof reviewSignals?.proposalStatus?.message === 'string'
            ? reviewSignals.proposalStatus.message
            : DEFAULT_REVIEW_SIGNALS.proposalStatus.message,
      },
      gapFillSummary: {
        autoFilled:
          typeof reviewSignals?.gapFillSummary?.autoFilled === 'number'
            ? reviewSignals.gapFillSummary.autoFilled
            : DEFAULT_REVIEW_SIGNALS.gapFillSummary.autoFilled,
        needsAttention:
          typeof reviewSignals?.gapFillSummary?.needsAttention === 'number'
            ? reviewSignals.gapFillSummary.needsAttention
            : DEFAULT_REVIEW_SIGNALS.gapFillSummary.needsAttention,
      },
      categoryEClarification: {
        count:
          typeof reviewSignals?.categoryEClarification?.count === 'number'
            ? reviewSignals.categoryEClarification.count
            : DEFAULT_REVIEW_SIGNALS.categoryEClarification.count,
        items: asStringArray(reviewSignals?.categoryEClarification?.items),
      },
      invalidPatternIds: asStringArray(reviewSignals?.invalidPatternIds),
      readiness: {
        score:
          typeof reviewSignals?.readiness?.score === 'number'
            ? reviewSignals.readiness.score
            : DEFAULT_REVIEW_SIGNALS.readiness.score,
        warnings: asStringArray(reviewSignals?.readiness?.warnings),
      },
    },
  };
}
