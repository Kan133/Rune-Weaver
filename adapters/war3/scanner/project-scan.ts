/**
 * War3 Adapter - Project Scanner
 *
 * First-slice read-only scanner for classic Warcraft III map workspaces.
 * It does not parse binary formats yet.
 */

import { existsSync, statSync } from "fs";
import { join, resolve } from "path";
import type { HostKind } from "../../../core/host/types.js";
import {
  UNKNOWN_HOST_KIND,
  WAR3_CLASSIC_HOST_KIND,
} from "../../../core/host/types.js";
import { ensureWar3HostKindRegistered } from "../host-registration.js";
import {
  CLASSIC_WAR3_P0_OPTIONAL_FILES,
  CLASSIC_WAR3_P1_OPTIONAL_FILES,
  CLASSIC_WAR3_REQUIRED_FILES,
  CLASSIC_WAR3_SCRIPT_FILES,
  type ClassicWar3P0OptionalFile,
  type ClassicWar3P1OptionalFile,
  type ClassicWar3RequiredFile,
  type ClassicWar3ScriptFile,
} from "../workspace/files.js";

export interface FilePresence {
  path: string;
  exists: boolean;
}

export interface ClassicWar3WorkspaceFiles {
  required: Record<ClassicWar3RequiredFile, FilePresence>;
  scripts: Record<ClassicWar3ScriptFile, FilePresence>;
  p0Optional: Record<ClassicWar3P0OptionalFile, FilePresence>;
  p1Optional: Record<ClassicWar3P1OptionalFile, FilePresence>;
}

export interface War3ProjectScanResult {
  valid: boolean;
  path: string;
  hostType: HostKind;
  files: ClassicWar3WorkspaceFiles;
  issues: string[];
  notes: string[];
}

function checkFile(projectPath: string, file: string): FilePresence {
  const fullPath = join(projectPath, file);
  try {
    return {
      path: fullPath,
      exists: existsSync(fullPath) && statSync(fullPath).isFile(),
    };
  } catch {
    return {
      path: fullPath,
      exists: false,
    };
  }
}

function collectFiles<TFile extends readonly string[]>(
  projectPath: string,
  files: TFile,
): Record<TFile[number], FilePresence> {
  return Object.fromEntries(
    files.map((file) => [file, checkFile(projectPath, file)]),
  ) as Record<TFile[number], FilePresence>;
}

export function scanWar3Project(projectPath: string): War3ProjectScanResult {
  ensureWar3HostKindRegistered();

  const result: War3ProjectScanResult = {
    valid: false,
    path: resolve(projectPath),
    hostType: UNKNOWN_HOST_KIND,
    files: {
      required: collectFiles(projectPath, CLASSIC_WAR3_REQUIRED_FILES),
      scripts: collectFiles(projectPath, CLASSIC_WAR3_SCRIPT_FILES),
      p0Optional: collectFiles(projectPath, CLASSIC_WAR3_P0_OPTIONAL_FILES),
      p1Optional: collectFiles(projectPath, CLASSIC_WAR3_P1_OPTIONAL_FILES),
    },
    issues: [],
    notes: [],
  };

  if (!existsSync(projectPath)) {
    result.issues.push(`Path does not exist: ${projectPath}`);
    return result;
  }

  try {
    if (!statSync(projectPath).isDirectory()) {
      result.issues.push(`Path is not a directory: ${projectPath}`);
      return result;
    }
  } catch {
    result.issues.push(`Failed to inspect path: ${projectPath}`);
    return result;
  }

  for (const file of CLASSIC_WAR3_REQUIRED_FILES) {
    if (!result.files.required[file].exists) {
      result.issues.push(`Missing required workspace file: ${file}`);
    }
  }

  const hasScript = CLASSIC_WAR3_SCRIPT_FILES.some(
    (file) => result.files.scripts[file].exists,
  );
  if (!hasScript) {
    result.issues.push("Missing script entry file: expected war3map.j or war3map.lua");
  }

  for (const file of CLASSIC_WAR3_P0_OPTIONAL_FILES) {
    if (!result.files.p0Optional[file].exists) {
      result.notes.push(`P0 optional file not found yet: ${file}`);
    }
  }

  for (const file of CLASSIC_WAR3_P1_OPTIONAL_FILES) {
    if (!result.files.p1Optional[file].exists) {
      result.notes.push(`P1 optional file not found: ${file}`);
    }
  }

  result.valid = result.issues.length === 0;
  result.hostType = result.valid ? WAR3_CLASSIC_HOST_KIND : UNKNOWN_HOST_KIND;

  if (result.valid) {
    result.notes.push("Classic Warcraft III workspace shape recognized");
  }

  return result;
}

export function isSupportedWar3Host(projectPath: string): boolean {
  return scanWar3Project(projectPath).valid;
}
