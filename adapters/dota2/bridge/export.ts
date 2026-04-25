// F011: Bridge Workspace Export for UI
// Provides explicit CLI → UI bridge artifact generation
// Creates a stable, versioned bridge file for workbench-ui consumption

import { existsSync, mkdirSync, writeFileSync } from "fs";
import { join } from "path";
import type { RuneWeaverWorkspace } from "../../../core/workspace/types.js";
import {
  buildDota2GovernanceReadModel,
  type Dota2GovernanceReadModel,
} from "../governance/read-model.js";

// F011: Bridge artifact contract
export interface BridgeExportConfig {
  // Source workspace host root
  hostRoot: string;
  // Bridge output directory (defaults to UI public folder)
  outputDir?: string;
  // Bridge filename
  filename?: string;
  // Include metadata
  includeMetadata?: boolean;
}

// F011: Bridge export result
export interface BridgeExportResult {
  success: boolean;
  outputPath: string;
  workspace: RuneWeaverWorkspace | null;
  exportedAt: string;
  issues: string[];
}

// F011: Default bridge paths
export const BRIDGE_DEFAULTS = {
  // When running from CLI, export to UI public folder
  uiPublicPath: "apps/workbench-ui/public",
  filename: "bridge-workspace.json",
} as const;

// F011: Bridge metadata
interface BridgeMetadata {
  exportedAt: string;
  exportedBy: string;
  sourceHostRoot: string;
  version: string;
}

// F011: Bridge artifact structure
interface BridgeArtifact {
  // Original workspace data
  workspace: RuneWeaverWorkspace;
  governanceReadModel: Dota2GovernanceReadModel;
  // Bridge metadata
  _bridge: BridgeMetadata;
}

/**
 * F011: Export workspace to bridge artifact for UI consumption
 *
 * This is the primary CLI → UI bridge mechanism.
 * CLI commands call this to make their workspace data available to the UI.
 */
export function exportWorkspaceToBridge(
  workspace: RuneWeaverWorkspace,
  config: BridgeExportConfig
): BridgeExportResult {
  const issues: string[] = [];
  const exportedAt = new Date().toISOString();

  // Determine output path
  const outputDir = config.outputDir || join(process.cwd(), BRIDGE_DEFAULTS.uiPublicPath);
  const filename = config.filename || BRIDGE_DEFAULTS.filename;
  const outputPath = join(outputDir, filename);

  try {
    // Ensure output directory exists
    if (!existsSync(outputDir)) {
      mkdirSync(outputDir, { recursive: true });
    }

    // Build bridge artifact
    const artifact: BridgeArtifact = {
      workspace,
      governanceReadModel: buildDota2GovernanceReadModel({
        hostRoot: config.hostRoot,
        features: workspace.features,
      }),
      _bridge: {
        exportedAt,
        exportedBy: "rune-weaver-cli",
        sourceHostRoot: config.hostRoot,
        version: "0.1",
      },
    };

    // Write bridge file
    const content = JSON.stringify(artifact, null, 2);
    writeFileSync(outputPath, content, "utf-8");

    return {
      success: true,
      outputPath,
      workspace,
      exportedAt,
      issues,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    issues.push(`Failed to export bridge: ${message}`);

    return {
      success: false,
      outputPath,
      workspace: null,
      exportedAt,
      issues,
    };
  }
}

/**
 * F011: Export workspace from host root
 *
 * Convenience function that loads workspace from host and exports to bridge.
 */
export async function exportHostToBridge(
  hostRoot: string,
  outputDir?: string
): Promise<BridgeExportResult> {
  const { loadWorkspace } = await import("../../../core/workspace/manager.js");

  const loadResult = loadWorkspace(hostRoot);

  if (!loadResult.success || !loadResult.workspace) {
    return {
      success: false,
      outputPath: "",
      workspace: null,
      exportedAt: new Date().toISOString(),
      issues: loadResult.issues,
    };
  }

  return exportWorkspaceToBridge(loadResult.workspace, {
    hostRoot,
    outputDir,
  });
}

/**
 * F011: Get expected bridge file path for UI
 *
 * Returns the path where UI expects to find the bridge artifact.
 */
export function getBridgeFilePath(outputDir?: string): string {
  const dir = outputDir || join(process.cwd(), BRIDGE_DEFAULTS.uiPublicPath);
  return join(dir, BRIDGE_DEFAULTS.filename);
}
