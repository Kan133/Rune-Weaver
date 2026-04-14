// F009: Workspace Source Configuration
// Provides switchable workspace data sources beyond fixed sample file
// Supports: sample file, local bridge file, query param override

import type { RuneWeaverWorkspace } from "@/types/workspace";
import { loadWorkspaceWithMeta } from "./workspaceAdapter";

// F009: Supported workspace source types
export type WorkspaceSourceType = "sample" | "bridge" | "query-param";

// F009: Workspace source configuration
export interface WorkspaceSourceConfig {
  type: WorkspaceSourceType;
  path: string;
  label: string;
  description?: string;
}

// F009: Predefined workspace sources
// F011: Bridge source now explicitly corresponds to CLI artifact at fixed path
export const WORKSPACE_SOURCES: WorkspaceSourceConfig[] = [
  {
    type: "sample",
    path: "/sample-workspace.json",
    label: "Sample Workspace",
    description: "内置示例 workspace 数据",
  },
  {
    type: "bridge",
    // F011: Bridge artifact path - CLI exports to apps/workbench-ui/public/bridge-workspace.json
    path: "/bridge-workspace.json",
    label: "CLI Bridge Artifact",
    description: "CLI 导出的 workspace 数据 (npm run cli -- export-bridge --host <path>)",
  },
];

// F011: Bridge artifact contract
// CLI produces: apps/workbench-ui/public/bridge-workspace.json
// UI consumes: /bridge-workspace.json (served from public folder)
export const BRIDGE_ARTIFACT_CONTRACT = {
  // CLI output path (relative to project root)
  cliOutputPath: "apps/workbench-ui/public/bridge-workspace.json",
  // UI consumption path (relative to UI root)
  uiConsumptionPath: "/bridge-workspace.json",
  // How to generate: npm run cli -- export-bridge --host <host-path>
  generationCommand: "npm run cli -- export-bridge --host <host-path>",
} as const;

// F009: Default source
export const DEFAULT_WORKSPACE_SOURCE: WorkspaceSourceConfig = WORKSPACE_SOURCES[0];

// F009: Storage key for source preference
const SOURCE_STORAGE_KEY = "rune-weaver:workspace-source";

// F009: Get source from query param
function getSourceFromQueryParam(): WorkspaceSourceConfig | null {
  if (typeof window === "undefined") return null;

  const params = new URLSearchParams(window.location.search);
  const workspacePath = params.get("workspace");

  if (workspacePath) {
    return {
      type: "query-param",
      path: workspacePath,
      label: "Query Param",
      description: `从 URL 参数加载: ${workspacePath}`,
    };
  }

  return null;
}

// F009: Get saved source preference
export function getSavedSourcePreference(): WorkspaceSourceConfig | null {
  if (typeof window === "undefined") return null;

  try {
    const saved = localStorage.getItem(SOURCE_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved) as WorkspaceSourceConfig;
      // Validate it's a known source type
      if (WORKSPACE_SOURCES.some((s) => s.path === parsed.path) || parsed.type === "query-param") {
        return parsed;
      }
    }
  } catch {
    // Ignore parse errors
  }

  return null;
}

// F009: Save source preference
export function saveSourcePreference(source: WorkspaceSourceConfig): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(SOURCE_STORAGE_KEY, JSON.stringify(source));
  } catch {
    // Ignore storage errors
  }
}

// F009: Get current effective source (priority: query param > saved > default)
export function getEffectiveSource(): WorkspaceSourceConfig {
  // Priority 1: Query param override
  const querySource = getSourceFromQueryParam();
  if (querySource) {
    return querySource;
  }

  // Priority 2: Saved preference
  const savedSource = getSavedSourcePreference();
  if (savedSource) {
    return savedSource;
  }

  // Priority 3: Default
  return DEFAULT_WORKSPACE_SOURCE;
}

// F009: Load workspace from effective source
// F011: Returns bridge metadata when using bridge source
export async function loadWorkspaceFromSource(
  source?: WorkspaceSourceConfig
): Promise<{
  workspace: RuneWeaverWorkspace | null;
  source: WorkspaceSourceConfig;
  issues: string[];
  bridgeMeta?: { exportedAt: string; exportedBy: string; sourceHostRoot: string; version: string } | null;
}> {
  const effectiveSource = source || getEffectiveSource();
  const issues: string[] = [];

  // F011: Use loadWorkspaceWithMeta to detect bridge artifact format
  const { workspace, bridgeMeta } = await loadWorkspaceWithMeta(effectiveSource.path);

  if (!workspace) {
    issues.push(`Failed to load workspace from ${effectiveSource.path}`);

    // Try fallback to default sample
    if (effectiveSource.path !== DEFAULT_WORKSPACE_SOURCE.path) {
      const fallbackResult = await loadWorkspaceWithMeta(DEFAULT_WORKSPACE_SOURCE.path);
      if (fallbackResult.workspace) {
        issues.push(`Fallback to default sample workspace`);
        return {
          workspace: fallbackResult.workspace,
          source: DEFAULT_WORKSPACE_SOURCE,
          issues,
          bridgeMeta: fallbackResult.bridgeMeta,
        };
      }
    }
  }

  return { workspace, source: effectiveSource, issues, bridgeMeta };
}

// F009: Switch to a different source
// F011: Returns bridge metadata when using bridge source
export async function switchWorkspaceSource(
  source: WorkspaceSourceConfig
): Promise<{
  workspace: RuneWeaverWorkspace | null;
  source: WorkspaceSourceConfig;
  issues: string[];
  bridgeMeta?: { exportedAt: string; exportedBy: string; sourceHostRoot: string; version: string } | null;
}> {
  // Save preference
  saveSourcePreference(source);

  // Load from new source
  return loadWorkspaceFromSource(source);
}

// F009: Get available sources for UI selector
export function getAvailableSources(): WorkspaceSourceConfig[] {
  const querySource = getSourceFromQueryParam();
  const baseSources = [...WORKSPACE_SOURCES];

  if (querySource && !baseSources.some((s) => s.path === querySource.path)) {
    baseSources.push(querySource);
  }

  return baseSources;
}
