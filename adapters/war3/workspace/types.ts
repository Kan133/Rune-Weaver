/**
 * War3 Adapter - Workspace Connector Types
 *
 * Minimal type definitions for the workspace connector layer.
 */

import type { HostKind } from "../../../core/host/types.js";
import type { War3ProjectScanResult } from "../scanner/project-scan.js";
import type { WorkspaceParsedFiles } from "../parser/types.js";

export interface ProjectContext {
  hostKind: HostKind;
  workspaceRoot: string;
  scanResult: War3ProjectScanResult;
  scriptEntry: string | undefined;
  p0SourceFiles: string[];
  /** Parser-ready file map - populated by buildWar3DerivedWorkspaceView */
  parserReadyFiles: WorkspaceParsedFiles;
  notes: string[];
  issues: string[];
}

export interface War3WorkspaceConnectionResult {
  success: boolean;
  context: ProjectContext | null;
  issues: string[];
}
