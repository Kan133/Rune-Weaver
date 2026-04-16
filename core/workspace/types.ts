/**
 * Rune Weaver - Workspace State Types
 *
 * T090: Workspace State Management Minimal Foundation
 *
 * 定义工作区状态文件的最小结构
 * 与 docs/WORKSPACE-MODEL.md 对齐
 */

import type { HostKind } from "../host/types.js";

export interface EntryBinding {
  target: "server" | "ui" | "config";
  file: string;
  kind: "import" | "register" | "mount" | "append_index";
  symbol?: string;
}

export interface FeatureSourceModelRef {
  adapter: string;
  version: number;
  path: string;
}

export interface RuneWeaverFeatureRecord {
  featureId: string;
  featureName?: string;
  intentKind: string;
  status: "active" | "disabled" | "archived" | "rolled_back";
  revision: number;
  blueprintId: string;
  selectedPatterns: string[];
  generatedFiles: string[];
  entryBindings: EntryBinding[];
  sourceModel?: FeatureSourceModelRef;
  dependsOn?: string[];
  integrationPoints?: string[];  // 存储集成点标识，如 ["input.key_binding:Q"]
  gapFillBoundaries?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface RuneWeaverWorkspace {
  version: string;
  hostType: HostKind;
  hostRoot: string;
  addonName: string;
  mapName?: string;  // 可选：默认启动的地图名称
  initializedAt: string;
  features: RuneWeaverFeatureRecord[];
}

export interface WorkspaceStateResult {
  success: boolean;
  workspace: RuneWeaverWorkspace | null;
  issues: string[];
}

export interface WorkspaceValidationResult {
  valid: boolean;
  checks: string[];
  issues: string[];
  details: {
    fileExists: boolean;
    featureCount: number;
    totalGeneratedFiles: number;
    bridgePointCount: number;
  };
}

export interface FeatureWriteResult {
  featureId: string;
  blueprintId: string;
  selectedPatterns: string[];
  generatedFiles: string[];
  entryBindings: EntryBinding[];
  sourceModel?: FeatureSourceModelRef;
  gapFillBoundaries?: string[];
}

export type DuplicateFeatureAction = "reject" | "overwrite" | "require-flag";

export interface DuplicateFeaturePolicy {
  action: DuplicateFeatureAction;
  message: string;
}
