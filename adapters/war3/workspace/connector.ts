/**
 * War3 Adapter - Workspace Connector
 *
 * B-group second slice: connects scanner results to a usable ProjectContext.
 * Read-only boundary - no write operations.
 */

import { resolve } from "path";
import type { HostKind } from "../../../core/host/types.js";
import { WAR3_CLASSIC_HOST_KIND } from "../../../core/host/types.js";
import { scanWar3Project, type War3ProjectScanResult } from "../scanner/project-scan.js";
import { CLASSIC_WAR3_SCRIPT_FILES, CLASSIC_WAR3_REQUIRED_FILES, CLASSIC_WAR3_P0_OPTIONAL_FILES } from "./files.js";
import type { ProjectContext, War3WorkspaceConnectionResult } from "./types.js";
import type { WorkspaceParsedFiles } from "../parser/types.js";

function determineScriptEntry(scanResult: War3ProjectScanResult): string | undefined {
  for (const file of CLASSIC_WAR3_SCRIPT_FILES) {
    if (scanResult.files.scripts[file]?.exists) {
      return file;
    }
  }
  return undefined;
}

function collectP0SourceFiles(scanResult: War3ProjectScanResult): string[] {
  const files: string[] = [];
  // Include classic War3 P0 base files (w3i, w3e)
  for (const file of CLASSIC_WAR3_REQUIRED_FILES) {
    if (scanResult.files.required[file]?.exists) {
      files.push(file);
    }
  }
  // Append P0 optional files
  for (const file of CLASSIC_WAR3_P0_OPTIONAL_FILES) {
    if (scanResult.files.p0Optional[file]?.exists) {
      files.push(file);
    }
  }
  return files;
}

function buildProjectContext(
  workspaceRoot: string,
  scanResult: War3ProjectScanResult,
): ProjectContext {
  const scriptEntry = determineScriptEntry(scanResult);
  const p0SourceFiles = collectP0SourceFiles(scanResult);

  // Initialize empty parser-ready file map
  // This will be populated by buildWar3DerivedWorkspaceView when called
  const parserReadyFiles: WorkspaceParsedFiles = {};

  return {
    hostKind: WAR3_CLASSIC_HOST_KIND as HostKind,
    workspaceRoot: resolve(workspaceRoot),
    scanResult,
    scriptEntry,
    p0SourceFiles,
    parserReadyFiles,
    notes: [...scanResult.notes],
    issues: [...scanResult.issues],
  };
}

export function connectWar3Workspace(hostRoot: string): War3WorkspaceConnectionResult {
  const scanResult = scanWar3Project(hostRoot);

  if (!scanResult.valid) {
    return {
      success: false,
      context: null,
      issues: [...scanResult.issues],
    };
  }

  const context = buildProjectContext(hostRoot, scanResult);

  return {
    success: true,
    context,
    issues: [],
  };
}
