// F007: WorkbenchResult to Feature Adapter
// Bridges backend WorkbenchResult to frontend Feature type
// Allows UI to consume real structured data from workbench layer

import type { WorkbenchResult } from "../../../workbench/types";
import type { Feature, Group, FeatureStatus } from "@/types/feature";

// F007: Convert backend FeatureCard status to frontend FeatureStatus
function mapStatus(status: string): FeatureStatus {
  switch (status) {
    case "ready":
    case "active":
      return "active";
    case "draft":
    case "needs_clarification":
      return "draft";
    case "blocked":
      return "error";
    default:
      return "draft";
  }
}

// F007: Convert a single WorkbenchResult to Feature
export function adaptWorkbenchResultToFeature(result: WorkbenchResult): Feature | null {
  if (!result.featureCard || !result.featureDetail) {
    return null;
  }

  const card = result.featureCard;
  const detail = result.featureDetail;

  // Extract patterns from patternBindings
  const patterns = detail.patternBindings?.patterns || [];

  // Extract generated files from updateWriteResult if available
  const generatedFiles: string[] = [];
  if (result.updateWriteResult?.touchedOutputs) {
    result.updateWriteResult.touchedOutputs.forEach((output) => {
      if (output.outputPath) {
        generatedFiles.push(output.outputPath);
      }
    });
  }

  // Build review signals from available data
  const reviewSignals = {
    proposalStatus: {
      ready: card.status === "ready",
      percentage: card.status === "ready" ? 100 : 50,
      message: result.governanceRelease?.status === "blocked"
        ? "存在治理阻塞需要确认"
        : card.status === "ready"
        ? "所有 pattern 验证通过"
        : "需要进一步澄清",
    },
    gapFillSummary: {
      autoFilled: result.gapFillResult?.filledGaps?.length || 0,
      needsAttention: result.gapFillResult?.unfilledGaps?.length || 0,
    },
    categoryEClarification: {
      count: result.gapFillResult?.categoryEGaps?.length || 0,
      items: result.gapFillResult?.categoryEGaps
        ?.map((g) => g.targetField) || [],
    },
    invalidPatternIds: result.failureCorpus?.invalidPatternIds
      ? Object.values(result.failureCorpus.invalidPatternIds).flat()
      : [],
    readiness: {
      score: card.status === "ready" ? 95 : card.status === "blocked" ? 30 : 60,
      warnings: result.governanceRelease?.status === "blocked"
        ? result.governanceRelease.requiredConfirmations?.map((c) => c.description) || []
        : [],
    },
  };

  return {
    id: card.id,
    displayName: card.displayLabel,
    systemId: card.systemLabel,
    group: "skill", // Default group - can be inferred from patterns
    parentId: null,
    childrenIds: [],
    status: mapStatus(card.status),
    revision: 1,
    updatedAt: card.updatedAt instanceof Date ? card.updatedAt : new Date(card.updatedAt),
    patterns,
    generatedFiles,
    hostRealization: {
      host: card.host || "Dota2",
      context: detail.hostOutput?.outputSummary || "",
      syncStatus: generatedFiles.length > 0 ? "synced" : "pending",
    },
    reviewSignals,
  };
}

// F007: Convert multiple WorkbenchResults to Feature array
export function adaptWorkbenchResultsToFeatures(results: WorkbenchResult[]): Feature[] {
  return results
    .map((result) => adaptWorkbenchResultToFeature(result))
    .filter((f): f is Feature => f !== null);
}

// F007: Derive groups from features
export function deriveGroupsFromFeatures(features: Feature[]): Group[] {
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
