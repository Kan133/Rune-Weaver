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
    lifecycle: {
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
    reusableGovernance: {
      admittedCount: number;
      attentionCount: number;
      familyAdmissions: Array<{
        assetId: string;
        status: 'candidate' | 'admitted' | 'deprecated' | 'untracked';
      }>;
      patternAdmissions: Array<{
        assetId: string;
        status: 'candidate' | 'admitted' | 'deprecated' | 'untracked';
      }>;
      seamAdmissions: Array<{
        assetId: string;
        status: 'candidate' | 'admitted' | 'deprecated' | 'untracked';
      }>;
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
    compatibilitySource: 'governance-read-model' | 'compatibility-only';
    grounding: {
      status: 'none_required' | 'exact' | 'partial' | 'insufficient';
      reviewRequired: boolean;
      verifiedSymbolCount: number;
      allowlistedSymbolCount: number;
      weakSymbolCount: number;
      unknownSymbolCount: number;
      warningCount: number;
      warnings: string[];
      reasonCodes: string[];
      summary: string | null;
    };
    repairability: {
      status: 'not_checked' | 'clean' | 'review_required' | 'repair_safe' | 'upgrade_workspace_grounding' | 'requires_regenerate';
      reasons: string[];
      summary: string | null;
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

function normalizeLifecycle(feature: Partial<Feature>): NormalizedFeatureDisplay['reviewSignals']['lifecycle'] {
  const reviewSignals = feature.reviewSignals;
  const featureStatus =
    reviewSignals?.lifecycle?.featureStatus === 'active'
    || reviewSignals?.lifecycle?.featureStatus === 'disabled'
    || reviewSignals?.lifecycle?.featureStatus === 'archived'
    || reviewSignals?.lifecycle?.featureStatus === 'rolled_back'
      ? reviewSignals.lifecycle.featureStatus
      : feature.status === 'active'
        ? 'active'
        : feature.status === 'archived'
          ? 'archived'
          : feature.status === 'error'
            ? 'rolled_back'
            : 'unknown';

  return {
    featureStatus,
    maturity:
      reviewSignals?.lifecycle?.maturity === 'exploratory'
      || reviewSignals?.lifecycle?.maturity === 'stabilized'
      || reviewSignals?.lifecycle?.maturity === 'templated'
        ? reviewSignals.lifecycle.maturity
        : null,
    implementationStrategy:
      reviewSignals?.lifecycle?.implementationStrategy === 'family'
      || reviewSignals?.lifecycle?.implementationStrategy === 'pattern'
      || reviewSignals?.lifecycle?.implementationStrategy === 'guided_native'
      || reviewSignals?.lifecycle?.implementationStrategy === 'exploratory'
        ? reviewSignals.lifecycle.implementationStrategy
        : null,
    commitOutcome:
      reviewSignals?.lifecycle?.commitOutcome === 'committable'
      || reviewSignals?.lifecycle?.commitOutcome === 'exploratory'
      || reviewSignals?.lifecycle?.commitOutcome === 'blocked'
        ? reviewSignals.lifecycle.commitOutcome
        : null,
    canAssemble: typeof reviewSignals?.lifecycle?.canAssemble === 'boolean' ? reviewSignals.lifecycle.canAssemble : null,
    canWriteHost: typeof reviewSignals?.lifecycle?.canWriteHost === 'boolean' ? reviewSignals.lifecycle.canWriteHost : null,
    requiresReview: reviewSignals?.lifecycle?.requiresReview ?? reviewSignals?.grounding?.reviewRequired ?? false,
    reasons: asStringArray(reviewSignals?.lifecycle?.reasons),
    summary:
      typeof reviewSignals?.lifecycle?.summary === 'string' && reviewSignals.lifecycle.summary.trim()
        ? reviewSignals.lifecycle.summary
        : reviewSignals?.proposalStatus?.message || 'No lifecycle summary recorded.',
  };
}

function normalizeReusableGovernance(feature: Partial<Feature>): NormalizedFeatureDisplay['reviewSignals']['reusableGovernance'] {
  const reviewSignals = feature.reviewSignals;
  const normalizeAdmissions = (value: unknown) =>
    Array.isArray(value)
      ? value.flatMap((entry) => {
          if (!entry || typeof entry !== 'object') {
            return [];
          }
          const record = entry as Record<string, unknown>;
          const status = record.status;
          if (
            typeof record.assetId !== 'string'
            || (status !== 'candidate' && status !== 'admitted' && status !== 'deprecated' && status !== 'untracked')
          ) {
            return [];
          }
          return [{ assetId: record.assetId, status }];
        })
      : [];

  return {
    admittedCount: typeof reviewSignals?.reusableGovernance?.admittedCount === 'number'
      ? reviewSignals.reusableGovernance.admittedCount
      : 0,
    attentionCount: typeof reviewSignals?.reusableGovernance?.attentionCount === 'number'
      ? reviewSignals.reusableGovernance.attentionCount
      : 0,
    familyAdmissions: normalizeAdmissions(reviewSignals?.reusableGovernance?.familyAdmissions),
    patternAdmissions: normalizeAdmissions(reviewSignals?.reusableGovernance?.patternAdmissions),
    seamAdmissions: normalizeAdmissions(reviewSignals?.reusableGovernance?.seamAdmissions),
    summary:
      typeof reviewSignals?.reusableGovernance?.summary === 'string' && reviewSignals.reusableGovernance.summary.trim()
        ? reviewSignals.reusableGovernance.summary
        : 'No reusable-governance summary recorded.',
  };
}

function normalizeRepairability(feature: Partial<Feature>): NormalizedFeatureDisplay['reviewSignals']['repairability'] {
  const repairability = feature.reviewSignals?.repairability;
  return {
    status:
      repairability?.status === 'not_checked'
      || repairability?.status === 'clean'
      || repairability?.status === 'review_required'
      || repairability?.status === 'repair_safe'
      || repairability?.status === 'upgrade_workspace_grounding'
      || repairability?.status === 'requires_regenerate'
        ? repairability.status
        : 'not_checked',
    reasons: asStringArray(repairability?.reasons),
    summary:
      typeof repairability?.summary === 'string' && repairability.summary.trim()
        ? repairability.summary
        : null,
  };
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
        hostRealization?.syncStatus === 'synced'
        || hostRealization?.syncStatus === 'error'
        || hostRealization?.syncStatus === 'pending'
        || hostRealization?.syncStatus === 'unknown'
          ? hostRealization.syncStatus
          : 'unknown',
    },
    reviewSignals: {
      lifecycle: normalizeLifecycle(source),
      reusableGovernance: normalizeReusableGovernance(source),
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
      compatibilitySource:
        reviewSignals?.compatibilitySource === 'governance-read-model'
        || reviewSignals?.compatibilitySource === 'compatibility-only'
          ? reviewSignals.compatibilitySource
          : 'compatibility-only',
      grounding: {
        status:
          reviewSignals?.grounding?.status === 'exact'
          || reviewSignals?.grounding?.status === 'partial'
          || reviewSignals?.grounding?.status === 'insufficient'
          || reviewSignals?.grounding?.status === 'none_required'
            ? reviewSignals.grounding.status
            : 'none_required',
        reviewRequired: reviewSignals?.grounding?.reviewRequired ?? false,
        verifiedSymbolCount: typeof reviewSignals?.grounding?.verifiedSymbolCount === 'number'
          ? reviewSignals.grounding.verifiedSymbolCount
          : 0,
        allowlistedSymbolCount: typeof reviewSignals?.grounding?.allowlistedSymbolCount === 'number'
          ? reviewSignals.grounding.allowlistedSymbolCount
          : 0,
        weakSymbolCount: typeof reviewSignals?.grounding?.weakSymbolCount === 'number'
          ? reviewSignals.grounding.weakSymbolCount
          : 0,
        unknownSymbolCount: typeof reviewSignals?.grounding?.unknownSymbolCount === 'number'
          ? reviewSignals.grounding.unknownSymbolCount
          : 0,
        warningCount: typeof reviewSignals?.grounding?.warningCount === 'number'
          ? reviewSignals.grounding.warningCount
          : 0,
        warnings: asStringArray(reviewSignals?.grounding?.warnings),
        reasonCodes: asStringArray(reviewSignals?.grounding?.reasonCodes),
        summary:
          typeof reviewSignals?.grounding?.summary === 'string' && reviewSignals.grounding.summary.trim()
            ? reviewSignals.grounding.summary
            : null,
      },
      repairability: normalizeRepairability(source),
    },
  };
}
