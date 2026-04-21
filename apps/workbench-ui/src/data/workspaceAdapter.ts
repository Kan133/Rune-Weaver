import type { RuneWeaverWorkspace, RuneWeaverFeatureRecord } from '@/types/workspace';
import type { Feature, Group, FeatureStatus } from '@/types/feature';
import { deriveFeatureGroupFromWorkspaceRecord } from '@/data/featureGroupProjection';

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

function deriveWorkspaceStatusMessage(status: RuneWeaverFeatureRecord['status']): string | null {
  switch (status) {
    case 'active':
      return '功能已激活';
    case 'disabled':
      return '功能已禁用';
    case 'archived':
      return '功能已归档';
    case 'rolled_back':
      return '功能已回滚';
    default:
      return null;
  }
}

function deriveWorkspaceWarnings(status: RuneWeaverFeatureRecord['status']): string[] {
  switch (status) {
    case 'disabled':
      return ['功能当前处于禁用状态'];
    case 'rolled_back':
      return ['功能当前处于回滚状态'];
    default:
      return [];
  }
}

export function adaptWorkspaceRecordToFeature(record: RuneWeaverFeatureRecord, hostType?: string | null): Feature {
  const isActive = record.status === 'active';

  const reviewSignals = {
    proposalStatus: {
      ready: isActive,
      percentage: isActive ? 100 : null,
      message: deriveWorkspaceStatusMessage(record.status),
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
      score: null,
      warnings: deriveWorkspaceWarnings(record.status),
    },
  };

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

export function adaptWorkspaceToFeatures(workspace: RuneWeaverWorkspace): Feature[] {
  return workspace.features.map((record: RuneWeaverFeatureRecord) => adaptWorkspaceRecordToFeature(record, workspace.hostType));
}

export function deriveGroupsFromWorkspace(workspace: RuneWeaverWorkspace): Group[] {
  const features = adaptWorkspaceToFeatures(workspace);
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
  _bridge: {
    exportedAt: string;
    exportedBy: string;
    sourceHostRoot: string;
    version: string;
  };
}

export async function loadWorkspaceFromFile(path: string): Promise<RuneWeaverWorkspace | null> {
  try {
    const response = await fetch(path);
    if (!response.ok) {
      console.warn(`[F008] Failed to load workspace from ${path}: ${response.status}`);
      return null;
    }
    const data = await response.json();

    if (data._bridge && data.workspace) {
      console.log('[F011] Loaded bridge artifact from CLI export:');
      console.log(`  - Exported at: ${data._bridge.exportedAt}`);
      console.log(`  - Source host: ${data._bridge.sourceHostRoot}`);
      return data.workspace as RuneWeaverWorkspace;
    }

    return data as RuneWeaverWorkspace;
  } catch (error) {
    console.warn(`[F008] Error loading workspace: ${error}`);
    return null;
  }
}

export async function loadWorkspaceWithMeta(
  path: string,
): Promise<{
  workspace: RuneWeaverWorkspace | null;
  bridgeMeta: { exportedAt: string; exportedBy: string; sourceHostRoot: string; version: string } | null;
}> {
  try {
    const response = await fetch(path);
    if (!response.ok) {
      console.warn(`[F011] Failed to load workspace from ${path}: ${response.status}`);
      return { workspace: null, bridgeMeta: null };
    }
    const data = await response.json();

    if (data._bridge && data.workspace) {
      return {
        workspace: data.workspace as RuneWeaverWorkspace,
        bridgeMeta: data._bridge,
      };
    }

    return { workspace: data as RuneWeaverWorkspace, bridgeMeta: null };
  } catch (error) {
    console.warn(`[F011] Error loading workspace: ${error}`);
    return { workspace: null, bridgeMeta: null };
  }
}

export const DEFAULT_WORKSPACE_PATH = '/bridge-workspace.json';
