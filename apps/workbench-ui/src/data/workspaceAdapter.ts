import type {
  Dota2GovernanceReadModel,
  Dota2GovernanceReadModelFeature,
  RuneWeaverWorkspace,
  RuneWeaverFeatureRecord,
} from '@/types/workspace';
import type { Feature, Group, FeatureStatus } from '@/types/feature';
import { deriveFeatureGroupFromWorkspaceRecord } from '@/data/featureGroupProjection';
import {
  buildLegacyCompatibilityReviewSignals,
  buildLegacyGovernanceIssues,
} from '@/data/workspaceGovernanceCompatibility';

function mapWorkspaceStatus(status: string): FeatureStatus {
  switch (status) {
    case 'active':
      return 'active';
    case 'disabled':
    case 'archived':
      return 'draft';
    case 'rolled_back':
      return 'error';
    default:
      return 'unknown';
  }
}

function buildLifecycleSummary(readModel: Dota2GovernanceReadModelFeature): string {
  const parts = [
    readModel.lifecycle.implementationStrategy ? `strategy=${readModel.lifecycle.implementationStrategy}` : '',
    readModel.lifecycle.maturity ? `maturity=${readModel.lifecycle.maturity}` : '',
    readModel.lifecycle.commitOutcome ? `commit=${readModel.lifecycle.commitOutcome}` : '',
  ].filter(Boolean);
  if (parts.length === 0) {
    return readModel.lifecycle.requiresReview
      ? 'Lifecycle still requires manual review.'
      : 'Lifecycle has no explicit governance markers recorded.';
  }
  return `${parts.join(' | ')}${readModel.lifecycle.requiresReview ? ' | review=yes' : ''}`;
}

function deriveReadinessFromReadModel(readModel: Dota2GovernanceReadModelFeature): Feature['reviewSignals']['readiness'] {
  switch (readModel.repairability.status) {
    case 'requires_regenerate':
      return {
        score: 10,
        warnings: [...readModel.repairability.reasons],
      };
    case 'upgrade_workspace_grounding':
      return {
        score: 35,
        warnings: [...readModel.repairability.reasons],
      };
    case 'repair_safe':
      return {
        score: 45,
        warnings: [...readModel.repairability.reasons],
      };
    case 'review_required':
      return {
        score: readModel.grounding.status === 'insufficient' ? 45 : 65,
        warnings: [...readModel.repairability.reasons],
      };
    case 'clean':
      return {
        score: readModel.lifecycle.requiresReview ? 60 : readModel.grounding.reviewRequired ? 80 : 100,
        warnings: readModel.lifecycle.requiresReview ? [...readModel.lifecycle.reviewReasons] : [],
      };
    case 'not_checked':
    default:
      return {
        score: readModel.lifecycle.requiresReview ? 55 : null,
        warnings: readModel.lifecycle.reviewReasons,
      };
  }
}

function buildReviewSignalsFromReadModel(readModel: Dota2GovernanceReadModelFeature): Feature['reviewSignals'] {
  return {
    lifecycle: {
      featureStatus: readModel.status,
      maturity: readModel.lifecycle.maturity || null,
      implementationStrategy: readModel.lifecycle.implementationStrategy || null,
      commitOutcome: readModel.lifecycle.commitOutcome || null,
      canAssemble: null,
      canWriteHost: null,
      requiresReview: readModel.lifecycle.requiresReview,
      reasons: readModel.lifecycle.reviewReasons,
      summary: buildLifecycleSummary(readModel),
    },
    reusableGovernance: {
      admittedCount: readModel.reusableGovernance.admittedCount,
      attentionCount: readModel.reusableGovernance.attentionCount,
      familyAdmissions: readModel.reusableGovernance.familyAdmissions,
      patternAdmissions: readModel.reusableGovernance.patternAdmissions,
      seamAdmissions: readModel.reusableGovernance.seamAdmissions,
      summary: readModel.reusableGovernance.summary,
    },
    proposalStatus: {
      ready: readModel.status === 'active',
      percentage: readModel.status === 'active' ? 100 : null,
      message: readModel.productVerdict.label,
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
    readiness: deriveReadinessFromReadModel(readModel),
    compatibilitySource: 'governance-read-model',
    grounding: {
      status: readModel.grounding.status,
      reviewRequired: readModel.grounding.reviewRequired,
      verifiedSymbolCount: readModel.grounding.verifiedSymbolCount,
      allowlistedSymbolCount: readModel.grounding.allowlistedSymbolCount,
      weakSymbolCount: readModel.grounding.weakSymbolCount,
      unknownSymbolCount: readModel.grounding.unknownSymbolCount,
      warningCount: readModel.grounding.warningCount,
      warnings: readModel.grounding.warnings,
      reasonCodes: readModel.grounding.reasonCodes,
      summary: readModel.grounding.summary,
    },
    repairability: {
      status: readModel.repairability.status,
      reasons: readModel.repairability.reasons,
      summary: readModel.repairability.summary,
    },
  };
}

function buildGovernanceReadModelIndex(
  governanceReadModel?: Dota2GovernanceReadModel | null,
): Map<string, Dota2GovernanceReadModelFeature> {
  return new Map((governanceReadModel?.features || []).map((feature) => [feature.featureId, feature]));
}

export function adaptWorkspaceRecordToFeature(
  record: RuneWeaverFeatureRecord,
  hostType?: string | null,
  governanceReadModel?: Dota2GovernanceReadModelFeature | null,
): Feature {
  const reviewSignals = governanceReadModel
    ? buildReviewSignalsFromReadModel(governanceReadModel)
    : buildLegacyCompatibilityReviewSignals(record);

  return {
    id: record.featureId,
    displayName: record.featureName || record.featureId,
    systemId: record.featureId,
    group: deriveFeatureGroupFromWorkspaceRecord(record),
    parentId: null,
    childrenIds: record.dependsOn || [],
    status: mapWorkspaceStatus(record.status),
    revision: record.revision,
    updatedAt: new Date(record.updatedAt),
    patterns: record.selectedPatterns || [],
    generatedFiles: record.generatedFiles || [],
    gapFillBoundaries: record.gapFillBoundaries || [],
    integrationPoints: record.integrationPoints || [],
    hostRealization: {
      host: hostType || null,
      context: record.blueprintId || null,
      syncStatus: 'unknown',
    },
    reviewSignals,
  };
}

export function adaptWorkspaceToFeatures(
  workspace: RuneWeaverWorkspace,
  governanceReadModel?: Dota2GovernanceReadModel | null,
): Feature[] {
  const governanceIndex = buildGovernanceReadModelIndex(governanceReadModel);
  return workspace.features.map((record: RuneWeaverFeatureRecord) =>
    adaptWorkspaceRecordToFeature(record, workspace.hostType, governanceIndex.get(record.featureId)),
  );
}

export function deriveGroupsFromWorkspace(
  workspace: RuneWeaverWorkspace,
  governanceReadModel?: Dota2GovernanceReadModel | null,
): Group[] {
  const features = adaptWorkspaceToFeatures(workspace, governanceReadModel);
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

export interface BridgeArtifact {
  workspace: RuneWeaverWorkspace;
  governanceReadModel?: Dota2GovernanceReadModel;
  _bridge: {
    exportedAt: string;
    exportedBy: string;
    sourceHostRoot: string;
    version: string;
  };
}

export async function loadWorkspaceFromFile(path: string): Promise<RuneWeaverWorkspace | null> {
  const { workspace } = await loadWorkspaceWithMeta(path);
  return workspace;
}

export async function loadWorkspaceWithMeta(
  path: string,
): Promise<{
  workspace: RuneWeaverWorkspace | null;
  bridgeMeta: { exportedAt: string; exportedBy: string; sourceHostRoot: string; version: string } | null;
  governanceReadModel: Dota2GovernanceReadModel | null;
  issues: string[];
}> {
  try {
    const response = await fetch(path);
    if (!response.ok) {
      console.warn(`[F011] Failed to load workspace from ${path}: ${response.status}`);
      return { workspace: null, bridgeMeta: null, governanceReadModel: null, issues: [] };
    }
    const data = await response.json();

    if (data._bridge && data.workspace) {
      const governanceReadModel = data.governanceReadModel || null;
      return {
        workspace: data.workspace as RuneWeaverWorkspace,
        bridgeMeta: data._bridge,
        governanceReadModel,
        issues: governanceReadModel ? [] : buildLegacyGovernanceIssues('bridge-payload-missing-read-model'),
      };
    }

    return {
      workspace: data as RuneWeaverWorkspace,
      bridgeMeta: null,
      governanceReadModel: null,
      issues: buildLegacyGovernanceIssues('raw-workspace-payload'),
    };
  } catch (error) {
    console.warn(`[F011] Error loading workspace: ${error}`);
    return { workspace: null, bridgeMeta: null, governanceReadModel: null, issues: [] };
  }
}

export const DEFAULT_WORKSPACE_PATH = '/bridge-workspace.json';
