// F008: Workspace JSON to Feature Adapter
// Bridges RuneWeaverWorkspace (from rune-weaver.workspace.json) to frontend Feature type
// Allows UI to consume real persisted feature records from workspace

import type { RuneWeaverWorkspace, RuneWeaverFeatureRecord } from "@/types/workspace";
import type { Feature, Group, FeatureStatus } from "@/types/feature";

// F008: Convert workspace record status to frontend FeatureStatus
function mapWorkspaceStatus(status: string): FeatureStatus {
  switch (status) {
    case "active":
      return "active";
    case "disabled":
    case "archived":
      return "draft";
    case "rolled_back":
      return "error";
    default:
      return "draft";
  }
}

// F008: Derive group from intentKind or patterns
function deriveGroup(record: RuneWeaverFeatureRecord): string {
  const intentKind = record.intentKind?.toLowerCase() || "";

  if (intentKind.includes("ability") || intentKind.includes("skill")) {
    return "skill";
  }
  if (intentKind.includes("hero") || intentKind.includes("unit")) {
    return "hero";
  }
  if (intentKind.includes("system") || intentKind.includes("mechanic")) {
    return "system";
  }
  if (intentKind.includes("item")) {
    return "item";
  }

  // Fallback: check patterns
  const patterns = record.selectedPatterns || [];
  if (patterns.some((p: string) => p.includes("ability") || p.includes("skill"))) {
    return "skill";
  }
  if (patterns.some((p: string) => p.includes("system"))) {
    return "system";
  }

  return "skill"; // Default group
}

// F008: Convert a single workspace record to Feature
export function adaptWorkspaceRecordToFeature(record: RuneWeaverFeatureRecord): Feature {
  const group = deriveGroup(record);

  // Build review signals from workspace record
  const hasGeneratedFiles = record.generatedFiles && record.generatedFiles.length > 0;
  const isActive = record.status === "active";

  const reviewSignals = {
    proposalStatus: {
      ready: isActive,
      percentage: isActive ? 100 : record.status === "disabled" ? 50 : 75,
      message: isActive
        ? "功能已激活"
        : record.status === "disabled"
        ? "功能已禁用"
        : "功能已回滚",
    },
    gapFillSummary: {
      autoFilled: record.selectedPatterns?.length || 0,
      needsAttention: 0, // Workspace doesn't store gap fill history
    },
    categoryEClarification: {
      count: 0,
      items: [],
    },
    invalidPatternIds: [],
    readiness: {
      score: isActive ? 95 : 60,
      warnings: record.status === "disabled" ? ["功能当前处于禁用状态"] : [],
    },
  };

  return {
    id: record.featureId,
    displayName: record.featureName || record.featureId,
    systemId: record.featureId,
    group,
    parentId: null, // Workspace doesn't store hierarchy yet
    childrenIds: record.dependsOn || [],
    status: mapWorkspaceStatus(record.status),
    revision: record.revision,
    updatedAt: new Date(record.updatedAt),
    patterns: record.selectedPatterns || [],
    generatedFiles: record.generatedFiles || [],
    hostRealization: {
      host: "Dota2",
      context: record.blueprintId || "",
      syncStatus: hasGeneratedFiles ? "synced" : "pending",
    },
    reviewSignals,
  };
}

// F008: Convert workspace features to Feature array
export function adaptWorkspaceToFeatures(workspace: RuneWeaverWorkspace): Feature[] {
  return workspace.features.map((record: RuneWeaverFeatureRecord) => adaptWorkspaceRecordToFeature(record));
}

// F008: Derive groups from workspace features
export function deriveGroupsFromWorkspace(workspace: RuneWeaverWorkspace): Group[] {
  const features = adaptWorkspaceToFeatures(workspace);
  const groupCounts = new Map<string, number>();

  features.forEach((feature) => {
    const count = groupCounts.get(feature.group) || 0;
    groupCounts.set(feature.group, count + 1);
  });

  const groupNames: Record<string, string> = {
    skill: "技能",
    hero: "英雄",
    system: "系统",
    item: "物品",
  };

  const groupIcons: Record<string, string> = {
    skill: "Zap",
    hero: "User",
    system: "Settings",
    item: "Package",
  };

  const groups: Group[] = [
    { id: "all", name: "全部 Features", icon: "Layers", count: features.length },
  ];

  groupCounts.forEach((count, groupId) => {
    groups.push({
      id: groupId,
      name: groupNames[groupId] || groupId,
      icon: groupIcons[groupId] || "Layers",
      count,
    });
  });

  return groups;
}

// F011: Bridge artifact structure from CLI export
export interface BridgeArtifact {
  workspace: RuneWeaverWorkspace;
  _bridge: {
    exportedAt: string;
    exportedBy: string;
    sourceHostRoot: string;
    version: string;
  };
}

// F008: Load workspace from JSON file (for dev mode)
// F011: Also handles bridge artifact format from CLI export
export async function loadWorkspaceFromFile(
  path: string
): Promise<RuneWeaverWorkspace | null> {
  try {
    const response = await fetch(path);
    if (!response.ok) {
      console.warn(`[F008] Failed to load workspace from ${path}: ${response.status}`);
      return null;
    }
    const data = await response.json();

    // F011: Detect bridge artifact format (CLI export)
    if (data._bridge && data.workspace) {
      console.log(`[F011] Loaded bridge artifact from CLI export:`);
      console.log(`  - Exported at: ${data._bridge.exportedAt}`);
      console.log(`  - Source host: ${data._bridge.sourceHostRoot}`);
      return data.workspace as RuneWeaverWorkspace;
    }

    // Standard workspace format
    return data as RuneWeaverWorkspace;
  } catch (error) {
    console.warn(`[F008] Error loading workspace: ${error}`);
    return null;
  }
}

// F011: Load workspace with bridge metadata
export async function loadWorkspaceWithMeta(
  path: string
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

    // F011: Detect bridge artifact format (CLI export)
    if (data._bridge && data.workspace) {
      return {
        workspace: data.workspace as RuneWeaverWorkspace,
        bridgeMeta: data._bridge,
      };
    }

    // Standard workspace format
    return { workspace: data as RuneWeaverWorkspace, bridgeMeta: null };
  } catch (error) {
    console.warn(`[F011] Error loading workspace: ${error}`);
    return { workspace: null, bridgeMeta: null };
  }
}

// F008: Default workspace path for dev mode
export const DEFAULT_WORKSPACE_PATH = "/sample-workspace.json";
