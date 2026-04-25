import type { WorkbenchResult } from '../../../workbench/contract';
import type { Feature, Group, FeatureStatus } from '@/types/feature';
import { deriveFeatureGroupFromWorkbenchResult } from '@/data/featureGroupProjection';

function mapStatus(status: string): FeatureStatus {
  switch (status) {
    case 'ready':
    case 'active':
      return 'active';
    case 'draft':
    case 'needs_clarification':
      return 'draft';
    case 'blocked':
      return 'error';
    default:
      return 'unknown';
  }
}

export function adaptWorkbenchResultToFeature(result: WorkbenchResult): Feature | null {
  if (!result.featureCard || !result.featureDetail) {
    return null;
  }

  const card = result.featureCard;
  const detail = result.featureDetail;
  const patterns = detail.patternBindings?.patterns || [];
  const generatedFiles: string[] = [];
  const governanceWarnings =
    result.governanceRelease?.status === 'blocked'
      ? result.governanceRelease.requiredConfirmations?.map((confirmation) => confirmation.description) || []
      : [];
  const proposalMessage =
    result.governanceRelease?.blockedReason ||
    detail.status?.lastConflictSummary ||
    detail.basicInfo?.intentSummary ||
    null;
  const updatedAt =
    card.updatedAt instanceof Date
      ? card.updatedAt
      : typeof card.updatedAt === 'string' || typeof card.updatedAt === 'number'
      ? new Date(card.updatedAt)
      : null;
  const hasWrittenOutputs = result.updateWriteResult?.writeStatus === 'written';
  const compatibilityWarnings = [
    'Legacy workbench result payload has no governance read-model; UI is using the compatibility-only display boundary.',
    ...governanceWarnings,
  ];

  if (result.updateWriteResult?.touchedOutputs) {
    result.updateWriteResult.touchedOutputs.forEach((output) => {
      if (output.outputPath) {
        generatedFiles.push(output.outputPath);
      }
    });
  }

  const reviewSignals = {
    lifecycle: {
      featureStatus: hasWrittenOutputs ? 'active' as const : card.status === 'blocked' ? 'rolled_back' as const : 'unknown' as const,
      maturity: null,
      implementationStrategy: null,
      commitOutcome:
        result.governanceRelease?.status === 'blocked'
          ? 'blocked' as const
          : null,
      canAssemble: null,
      canWriteHost: null,
      requiresReview: governanceWarnings.length > 0,
      reasons: governanceWarnings,
      summary: proposalMessage || 'Legacy workbench result adapter compatibility view.',
    },
    reusableGovernance: {
      admittedCount: 0,
      attentionCount: 0,
      familyAdmissions: [],
      patternAdmissions: [],
      seamAdmissions: [],
      summary: 'Legacy workbench result adapter does not carry reusable-governance admissions.',
    },
    proposalStatus: {
      ready: card.status === 'ready',
      percentage: card.status === 'ready' ? 100 : null,
      message: proposalMessage,
    },
    gapFillSummary: {
      autoFilled: result.gapFillResult?.filledGaps?.length || 0,
      needsAttention: result.gapFillResult?.unfilledGaps?.length || 0,
    },
    categoryEClarification: {
      count: result.gapFillResult?.categoryEGaps?.length || 0,
      items: result.gapFillResult?.categoryEGaps?.map((gap) => gap.targetField) || [],
    },
    invalidPatternIds: result.failureCorpus?.invalidPatternIds
      ? Object.values(result.failureCorpus.invalidPatternIds).flat()
      : [],
    readiness: {
      score: null,
      warnings: compatibilityWarnings,
    },
    compatibilitySource: 'compatibility-only' as const,
    grounding: {
      status: 'none_required' as const,
      reviewRequired: false,
      verifiedSymbolCount: 0,
      allowlistedSymbolCount: 0,
      weakSymbolCount: 0,
      unknownSymbolCount: 0,
      warningCount: 0,
      warnings: [],
      reasonCodes: [],
      summary: 'Legacy workbench result adapter does not carry grounding detail.',
    },
    repairability: {
      status: 'not_checked' as const,
      reasons: [
        ...governanceWarnings,
        ...(result.governanceRelease?.blockedReason ? [result.governanceRelease.blockedReason] : []),
      ],
      summary: hasWrittenOutputs
        ? 'Legacy workbench result reports generated outputs, but canonical repairability is unavailable without a governance read-model.'
        : 'Legacy workbench result does not carry validation-stage repairability detail.',
    },
  };

  return {
    id: card.id,
    displayName: card.displayLabel,
    systemId: card.systemLabel,
    group: deriveFeatureGroupFromWorkbenchResult(result),
    parentId: null,
    childrenIds: [],
    status: mapStatus(card.status),
    revision: null,
    updatedAt,
    patterns,
    generatedFiles,
    hostRealization: {
      host: card.host || null,
      context: detail.hostOutput?.outputSummary || null,
      syncStatus: hasWrittenOutputs ? 'synced' : 'unknown',
    },
    reviewSignals,
  };
}

export function adaptWorkbenchResultsToFeatures(results: WorkbenchResult[]): Feature[] {
  return results
    .map((result) => adaptWorkbenchResultToFeature(result))
    .filter((feature): feature is Feature => feature !== null);
}

export function deriveGroupsFromFeatures(features: Feature[]): Group[] {
  const groupCounts = new Map<string, number>();

  features.forEach((feature) => {
    const groupId = feature.group || 'unknown';
    const count = groupCounts.get(groupId) || 0;
    groupCounts.set(groupId, count + 1);
  });

  const groupNames: Record<string, string> = {
    skill: '技能',
    hero: '英雄',
    system: '系统',
    item: '物品',
    unknown: '未知',
  };

  const groupIcons: Record<string, string> = {
    skill: 'Zap',
    hero: 'User',
    system: 'Settings',
    item: 'Package',
    unknown: 'CircleHelp',
  };

  const groups: Group[] = [
    { id: 'all', name: '全部 Features', icon: 'Layers', count: features.length },
  ];

  groupCounts.forEach((count, groupId) => {
    groups.push({
      id: groupId,
      name: groupNames[groupId] || groupId,
      icon: groupIcons[groupId] || 'Layers',
      count,
    });
  });

  return groups;
}
