/**
 * Rune Weaver - Workspace State Manager
 *
 * T090-T093: Workspace State Management Minimal Foundation
 *
 * 管理工作区状态文件的读取、写入、更新和验证
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { join, dirname, basename } from "path";
import {
  RuneWeaverWorkspace,
  RuneWeaverFeatureRecord,
  WorkspaceStateResult,
  WorkspaceValidationResult,
  FeatureWriteResult,
  DuplicateFeaturePolicy,
  EntryBinding,
} from "./types.js";

const WORKSPACE_FILE_NAME = "rune-weaver.workspace.json";
const CURRENT_VERSION = "0.1";

export function getWorkspaceFilePath(hostRoot: string): string {
  return join(hostRoot, WORKSPACE_FILE_NAME);
}

export function workspaceExists(hostRoot: string): boolean {
  return existsSync(getWorkspaceFilePath(hostRoot));
}

export function createEmptyWorkspace(hostRoot: string): RuneWeaverWorkspace {
  const addonName = basename(hostRoot);
  const now = new Date().toISOString();

  return {
    version: CURRENT_VERSION,
    hostType: "dota2-x-template",
    hostRoot,
    addonName,
    initializedAt: now,
    features: [],
  };
}

export function loadWorkspace(hostRoot: string): WorkspaceStateResult {
  const filePath = getWorkspaceFilePath(hostRoot);
  const issues: string[] = [];

  if (!existsSync(filePath)) {
    return {
      success: false,
      workspace: null,
      issues: ["Workspace file does not exist"],
    };
  }

  try {
    const content = readFileSync(filePath, "utf-8");
    const rawWorkspace = JSON.parse(content);

    if (!validateWorkspaceStructure(rawWorkspace)) {
      issues.push("Workspace file has invalid structure");
      return {
        success: false,
        workspace: null,
        issues,
      };
    }

    // Normalize workspace to ensure all required fields exist
    const workspace = normalizeWorkspace(rawWorkspace);

    return {
      success: true,
      workspace,
      issues: [],
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    issues.push(`Failed to load workspace: ${message}`);
    return {
      success: false,
      workspace: null,
      issues,
    };
  }
}

export function saveWorkspace(hostRoot: string, workspace: RuneWeaverWorkspace): WorkspaceStateResult {
  const filePath = getWorkspaceFilePath(hostRoot);
  const issues: string[] = [];

  try {
    const dir = dirname(filePath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    const content = JSON.stringify(workspace, null, 2);
    writeFileSync(filePath, content, "utf-8");

    return {
      success: true,
      workspace,
      issues: [],
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    issues.push(`Failed to save workspace: ${message}`);
    return {
      success: false,
      workspace: null,
      issues,
    };
  }
}

export function initializeWorkspace(hostRoot: string): WorkspaceStateResult {
  if (workspaceExists(hostRoot)) {
    return loadWorkspace(hostRoot);
  }

  const workspace = createEmptyWorkspace(hostRoot);
  return saveWorkspace(hostRoot, workspace);
}

export function findFeatureById(workspace: RuneWeaverWorkspace, featureId: string): RuneWeaverFeatureRecord | undefined {
  return workspace.features.find((f) => f.featureId === featureId);
}

export function getActiveFeatures(workspace: RuneWeaverWorkspace): RuneWeaverFeatureRecord[] {
  return workspace.features.filter((f) => f.status === "active");
}

export function checkDuplicateFeature(
  workspace: RuneWeaverWorkspace,
  featureId: string
): DuplicateFeaturePolicy {
  const existing = findFeatureById(workspace, featureId);

  if (!existing) {
    return {
      action: "reject",
      message: "No duplicate found",
    };
  }

  return {
    action: "reject",
    message: `Feature '${featureId}' already exists with status '${existing.status}'. ` +
             `Use --update to modify existing features or use a different feature ID.`,
  };
}

export function addFeatureToWorkspace(
  workspace: RuneWeaverWorkspace,
  result: FeatureWriteResult,
  intentKind: string
): RuneWeaverWorkspace {
  const now = new Date().toISOString();

  const featureRecord: RuneWeaverFeatureRecord = {
    featureId: result.featureId,
    intentKind,
    status: "active",
    revision: 1,
    blueprintId: result.blueprintId,
    selectedPatterns: result.selectedPatterns,
    generatedFiles: result.generatedFiles,
    entryBindings: result.entryBindings,
    createdAt: now,
    updatedAt: now,
  };

  return {
    ...workspace,
    features: [...workspace.features, featureRecord],
  };
}

export function updateFeatureInWorkspace(
  workspace: RuneWeaverWorkspace,
  featureId: string,
  result: FeatureWriteResult,
  intentKind: string
): RuneWeaverWorkspace {
  const existing = findFeatureById(workspace, featureId);
  if (!existing) {
    throw new Error(`Feature '${featureId}' does not exist in workspace`);
  }

  const now = new Date().toISOString();

  const updatedFeature: RuneWeaverFeatureRecord = {
    ...existing,
    intentKind,
    status: "active",
    revision: existing.revision + 1,
    blueprintId: result.blueprintId,
    selectedPatterns: result.selectedPatterns,
    generatedFiles: result.generatedFiles,
    entryBindings: result.entryBindings,
    updatedAt: now,
  };

  return {
    ...workspace,
    features: workspace.features.map((feature) =>
      feature.featureId === featureId ? updatedFeature : feature
    ),
  };
}

export function validateWorkspace(workspace: RuneWeaverWorkspace): WorkspaceValidationResult {
  const checks: string[] = [];
  const issues: string[] = [];

  checks.push("✅ Workspace file exists");
  checks.push(`✅ Version: ${workspace.version}`);
  checks.push(`✅ Host type: ${workspace.hostType}`);
  checks.push(`✅ Addon name: ${workspace.addonName}`);

  const featureCount = workspace.features.length;
  const totalGeneratedFiles = workspace.features.reduce(
    (sum, f) => sum + f.generatedFiles.length,
    0
  );
  const bridgePointCount = workspace.features.reduce(
    (sum, f) => sum + f.entryBindings.length,
    0
  );

  checks.push(`✅ Features: ${featureCount}`);
  checks.push(`✅ Total generated files: ${totalGeneratedFiles}`);
  checks.push(`✅ Bridge points: ${bridgePointCount}`);

  const featureIds = new Set<string>();
  for (const feature of workspace.features) {
    if (featureIds.has(feature.featureId)) {
      issues.push(`Duplicate feature ID: ${feature.featureId}`);
    }
    featureIds.add(feature.featureId);

    if (feature.generatedFiles.length === 0) {
      checks.push(`⚠️  Feature '${feature.featureId}' has no generated files`);
    }
  }

  return {
    valid: issues.length === 0,
    checks,
    issues,
    details: {
      fileExists: true,
      featureCount,
      totalGeneratedFiles,
      bridgePointCount,
    },
  };
}

function validateWorkspaceStructure(workspace: unknown): workspace is RuneWeaverWorkspace {
  if (typeof workspace !== "object" || workspace === null) {
    return false;
  }

  const w = workspace as Record<string, unknown>;

  return (
    typeof w.version === "string" &&
    w.hostType === "dota2-x-template" &&
    typeof w.hostRoot === "string" &&
    typeof w.addonName === "string" &&
    typeof w.initializedAt === "string" &&
    Array.isArray(w.features)
  );
}

/**
 * Normalize workspace to ensure all required fields exist
 * 
 * This handles migration from older workspace formats by:
 * - Adding missing fields with sensible defaults
 * - Ensuring feature records have all required fields
 */
function normalizeWorkspace(rawWorkspace: unknown): RuneWeaverWorkspace {
  const raw = rawWorkspace as Record<string, unknown>;
  
  const workspace: RuneWeaverWorkspace = {
    version: (raw.version as string) || CURRENT_VERSION,
    hostType: (raw.hostType as "dota2-x-template") || "dota2-x-template",
    hostRoot: (raw.hostRoot as string) || "",
    addonName: (raw.addonName as string) || "",
    initializedAt: (raw.initializedAt as string) || new Date().toISOString(),
    features: [],
  };

  // Normalize features
  const rawFeatures = (raw.features as Array<unknown>) || [];
  workspace.features = rawFeatures.map((rawFeature) => normalizeFeature(rawFeature));

  return workspace;
}

/**
 * Normalize a feature record to ensure all required fields exist
 */
function normalizeFeature(rawFeature: unknown): RuneWeaverFeatureRecord {
  const raw = rawFeature as Record<string, unknown>;
  const now = new Date().toISOString();
  const generatedFiles = ((raw.generatedFiles as string[]) || []).filter((file): file is string => typeof file === "string");

  return {
    featureId: (raw.featureId as string) || "",
    intentKind: (raw.intentKind as string) || "unknown",
    status: (raw.status as "active" | "disabled" | "archived") || "active",
    revision: (raw.revision as number) || 1,
    blueprintId: (raw.blueprintId as string) || "",
    selectedPatterns: (raw.selectedPatterns as string[]) || [],
    generatedFiles,
    entryBindings: normalizeEntryBindings(raw.entryBindings, generatedFiles),
    createdAt: (raw.createdAt as string) || now,
    updatedAt: (raw.updatedAt as string) || now,
  };
}

/**
 * Normalize entry bindings to ensure correct structure
 */
function normalizeEntryBindings(rawBindings: unknown, generatedFiles: string[]): EntryBinding[] {
  const bindings = (rawBindings as Array<unknown>) || [];
  const normalized = bindings.map((rawBinding) => {
    const raw = rawBinding as Record<string, unknown>;
    return {
      target: (raw.target as "server" | "ui" | "config") || "server",
      file: (raw.file as string) || "",
      kind: (raw.kind as "import" | "register" | "mount" | "append_index") || "import",
    };
  });

  const bridged = toKnownBridgeBindings(normalized);
  if (bridged.length > 0) {
    return bridged;
  }

  return inferBridgeBindingsFromGeneratedFiles(generatedFiles);
}

/**
 * 提取真实的 bridge/entry 绑定
 * 
 * 根据 WORKSPACE-MODEL.md，entryBindings 应该记录：
 * - 宿主入口文件（bridge points）
 * - 而不是 generated files
 * 
 * 允许的 bridge points：
 * - game/scripts/src/modules/index.ts (server bridge)
 * - content/panorama/src/hud/script.tsx (ui bridge)
 */
export function extractEntryBindings(
  bridgeUpdates: Array<{ target: string; file: string; action: string }> | undefined
): EntryBinding[] {
  const bindings: EntryBinding[] = [];
  for (const update of bridgeUpdates || []) {
    if (update.action !== "inject_once") {
      continue;
    }

    if (update.file === "game/scripts/src/modules/index.ts") {
      bindings.push({
        target: "server",
        file: update.file,
        kind: "import",
      });
    } else if (update.file === "content/panorama/src/hud/script.tsx") {
      bindings.push({
        target: "ui",
        file: update.file,
        kind: "mount",
      });
    }
  }

  return dedupeBindings(bindings);
}

function toKnownBridgeBindings(bindings: EntryBinding[]): EntryBinding[] {
  const known = bindings.filter((binding) =>
    binding.file === "game/scripts/src/modules/index.ts" ||
    binding.file === "content/panorama/src/hud/script.tsx"
  );

  return dedupeBindings(
    known.map((binding) => {
      if (binding.file === "game/scripts/src/modules/index.ts") {
        return { target: "server", file: binding.file, kind: "import" as const };
      }
      return { target: "ui", file: binding.file, kind: "mount" as const };
    })
  );
}

function inferBridgeBindingsFromGeneratedFiles(generatedFiles: string[]): EntryBinding[] {
  const bindings: EntryBinding[] = [];

  if (generatedFiles.some((file) => file.startsWith("game/scripts/src/rune_weaver/"))) {
    bindings.push({
      target: "server",
      file: "game/scripts/src/modules/index.ts",
      kind: "import",
    });
  }

  if (generatedFiles.some((file) => file.startsWith("content/panorama/src/rune_weaver/"))) {
    bindings.push({
      target: "ui",
      file: "content/panorama/src/hud/script.tsx",
      kind: "mount",
    });
  }

  return bindings;
}

function dedupeBindings(bindings: EntryBinding[]): EntryBinding[] {
  const seen = new Set<string>();
  const deduped: EntryBinding[] = [];

  for (const binding of bindings) {
    const key = `${binding.target}:${binding.file}:${binding.kind}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    deduped.push(binding);
  }

  return deduped;
}

export function rollbackFeatureInWorkspace(
  workspace: RuneWeaverWorkspace,
  featureId: string
): RuneWeaverWorkspace {
  const existing = findFeatureById(workspace, featureId);
  if (!existing) {
    throw new Error(`Feature '${featureId}' does not exist in workspace`);
  }

  const now = new Date().toISOString();

  const rolledBackFeature: RuneWeaverFeatureRecord = {
    ...existing,
    status: "rolled_back",
    generatedFiles: [],
    entryBindings: [],
    updatedAt: now,
  };

  return {
    ...workspace,
    features: workspace.features.map((feature) =>
      feature.featureId === featureId ? rolledBackFeature : feature
    ),
  };
}
