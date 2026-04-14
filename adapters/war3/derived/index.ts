/**
 * War3 Adapter - Derived Module
 *
 * Read-only derived workspace view builder.
 * Placeholder implementation - aggregates parser results into summary structures.
 */

import type { ProjectContext } from "../workspace/types.js";
import {
  readW3iFile,
  readW3eFile,
  readUnitsDooFile,
  readDooFile,
  type W3iParseResult,
  type W3eParseResult,
  type UnitsDooParseResult,
  type DooParseResult,
} from "../parser/index.js";
import type {
  MapSummary,
  PlanarMap,
  CanvasHint,
  AnchorCandidates,
  DoodadCandidates,
  War3DerivedWorkspaceView,
  WorkbenchSummary,
  WorkbenchFileStatus,
  AnchorSuggestion,
  LandmarkSuggestion,
  RegionHint,
  CandidateSample,
} from "./types.js";

/**
 * Builds a map summary from w3i parse result.
 * Passes through real parsed fields if available.
 */
function buildMapSummary(result: W3iParseResult | undefined): MapSummary | null {
  if (!result || !result.success) {
    return null;
  }

  // If real parsing succeeded, expose real fields
  if (result.parsed && result.summary && !result.summary._placeholder) {
    return {
      _placeholder: false,
      sourceFile: result.sourceFile,
      bytesLength: result.bytesLength,
      formatVersion: result.summary.formatVersion,
      mapVersion: result.summary.mapVersion,
      editorVersion: result.summary.editorVersion,
      gameVersion: result.summary.gameVersion,
      name: result.summary.name,
      author: result.summary.author,
      description: result.summary.description,
      suggestedPlayers: result.summary.suggestedPlayers,
      playableWidth: result.summary.playableWidth,
      playableHeight: result.summary.playableHeight,
      tileset: result.summary.tileset,
      scriptType: result.summary.scriptType,
      playersCount: result.summary.playersCount,
    };
  }

  return {
    _placeholder: true,
    status: result.summary?.status ?? "binary parser not implemented yet",
    sourceFile: result.sourceFile,
    bytesLength: result.bytesLength,
  };
}

/**
 * Builds a planar map from w3e parse result.
 * Passes through real parsed fields if available.
 */
function buildPlanarMap(result: W3eParseResult | undefined): PlanarMap | null {
  if (!result || !result.success) {
    return null;
  }

  const summary = result.summary;
  const isRealParsed = summary && !summary._placeholder;

  // Build canvas hint if we have real parsed dimensions
  const canvasHint = isRealParsed && summary?.width !== undefined && summary?.height !== undefined
    ? {
        width: summary.width,
        height: summary.height,
        offsetX: summary.horizontalOffset ?? 0,
        offsetY: summary.verticalOffset ?? 0,
      }
    : undefined;

  return {
    _placeholder: summary?._placeholder ?? true,
    status: summary?.status,
    sourceFile: result.sourceFile,
    bytesLength: result.bytesLength,
    magic: summary?.magic,
    version: summary?.version,
    mainTileset: summary?.mainTileset,
    usesCustomTileset: summary?.usesCustomTileset,
    canvasHint,
  };
}

/**
 * Calculates region hint (3x3 grid) from world coordinates and canvas hint.
 * Returns "unknown" if canvasHint is not available.
 */
function calculateRegionHint(
  x: number,
  y: number,
  canvasHint: CanvasHint | undefined,
): RegionHint {
  if (!canvasHint) {
    return "unknown";
  }

  const mapWidthWorld = canvasHint.width * 128;
  const mapHeightWorld = canvasHint.height * 128;
  const leftBound = canvasHint.offsetX;
  const topBound = canvasHint.offsetY;

  const clampRatio = (value: number) => Math.max(0, Math.min(0.999999, value));
  const xRatio = clampRatio((x - leftBound) / mapWidthWorld);
  const yRatio = clampRatio((y - topBound) / mapHeightWorld);

  // Determine grid cell (0, 1, or 2 for each axis)
  const col = xRatio < 1 / 3 ? 0 : xRatio < 2 / 3 ? 1 : 2;
  const row = yRatio < 1 / 3 ? 0 : yRatio < 2 / 3 ? 1 : 2;

  const grid: RegionHint[][] = [
    ["northwest", "north", "northeast"],
    ["west", "center", "east"],
    ["southwest", "south", "southeast"],
  ];

  return grid[row][col];
}

/**
 * Builds anchor suggestions from candidate samples.
 * Max 5 suggestions, conservative inference.
 */
function buildAnchorSuggestions(
  samples: CandidateSample[] | undefined,
  canvasHint: CanvasHint | undefined,
): AnchorSuggestion[] | undefined {
  if (!samples || samples.length === 0) {
    return undefined;
  }

  return samples.slice(0, 5).map((sample) => {
    const regionHint = calculateRegionHint(sample.x, sample.y, canvasHint);
    const label = sample.owner !== undefined
      ? `${sample.id} (P${sample.owner})`
      : sample.id;

    return {
      id: sample.id,
      x: sample.x,
      y: sample.y,
      z: sample.z,
      kind: "unit",
      regionHint,
      label,
      reason: "sampled-from-units-doo",
      owner: sample.owner,
    };
  });
}

/**
 * Builds landmark suggestions from doodad samples.
 * Max 5 suggestions, always kind="doodad".
 */
function buildLandmarkSuggestions(
  samples: CandidateSample[] | undefined,
  canvasHint: CanvasHint | undefined,
): LandmarkSuggestion[] | undefined {
  if (!samples || samples.length === 0) {
    return undefined;
  }

  return samples.slice(0, 5).map((sample) => {
    const regionHint = calculateRegionHint(sample.x, sample.y, canvasHint);

    return {
      id: sample.id,
      x: sample.x,
      y: sample.y,
      z: sample.z,
      kind: "doodad",
      regionHint,
      label: sample.id,
      reason: "sampled-from-doodads",
    };
  });
}

/**
 * Builds anchor candidates from units.doo parse result.
 * Passes through real parsed fields if available.
 */
function buildAnchorCandidates(
  result: UnitsDooParseResult | undefined,
  canvasHint: CanvasHint | undefined,
): AnchorCandidates | null {
  if (!result || !result.success) {
    return null;
  }

  const summary = result.summary;
  const isRealParsed = summary && !summary._placeholder;

  // Map samples to candidate samples
  const sampleObjects = isRealParsed && summary?.samples
    ? summary.samples.map((s) => ({
        id: s.id,
        x: s.x,
        y: s.y,
        z: s.z,
        owner: s.owner,
      }))
    : undefined;

  // Build suggestions from samples
  const suggestions = buildAnchorSuggestions(sampleObjects, canvasHint);

  return {
    _placeholder: summary?._placeholder ?? true,
    status: summary?.status,
    sourceFile: result.sourceFile,
    bytesLength: result.bytesLength,
    magic: summary?.magic,
    version: summary?.version,
    subVersion: summary?.subVersion,
    candidateCount: isRealParsed ? summary?.objectCount : undefined,
    sampleObjects,
    suggestions,
  };
}

/**
 * Builds doodad candidates from war3map.doo parse result.
 * Passes through real parsed fields if available.
 */
function buildDoodadCandidates(
  result: DooParseResult | undefined,
  canvasHint: CanvasHint | undefined,
): DoodadCandidates | null {
  if (!result || !result.success) {
    return null;
  }

  const summary = result.summary;
  const isRealParsed = summary && !summary._placeholder;

  // Map samples to candidate samples
  const sampleObjects = isRealParsed && summary?.samples
    ? summary.samples.map((s) => ({
        id: s.id,
        x: s.x,
        y: s.y,
        z: s.z,
      }))
    : undefined;

  // Build suggestions from samples
  const suggestions = buildLandmarkSuggestions(sampleObjects, canvasHint);

  return {
    _placeholder: summary?._placeholder ?? true,
    status: summary?.status,
    sourceFile: result.sourceFile,
    bytesLength: result.bytesLength,
    magic: summary?.magic,
    version: summary?.version,
    subVersion: summary?.subVersion,
    candidateCount: isRealParsed ? summary?.doodadCount : undefined,
    specialDoodadCount: isRealParsed ? summary?.specialDoodadCount : undefined,
    sampleObjects,
    suggestions,
  };
}

/**
 * Builds workbench file status from a parse result.
 */
function buildFileStatus(result: { success: boolean; parsed: boolean; summary: { _placeholder?: boolean; magic?: string; version?: number; subVersion?: number } | null } | undefined): WorkbenchFileStatus {
  if (!result) {
    return {
      exists: false,
      read: false,
      isPlaceholder: true,
      isRealParsed: false,
    };
  }

  const isRealParsed = result.success && result.parsed && !!result.summary && !result.summary._placeholder;

  return {
    exists: result.success,
    read: result.success,
    isPlaceholder: !isRealParsed,
    isRealParsed,
    magic: result.summary?.magic,
    version: result.summary?.version,
    subVersion: result.summary?.subVersion,
  };
}

/**
 * Builds unified workbench summary from all parse results.
 */
function buildWorkbenchSummary(
  w3iResult: W3iParseResult | undefined,
  w3eResult: W3eParseResult | undefined,
  unitsDooResult: UnitsDooParseResult | undefined,
  dooResult: DooParseResult | undefined,
): WorkbenchSummary {
  const w3i = buildFileStatus(w3iResult);
  const w3e = buildFileStatus(w3eResult);
  const unitsDoo = buildFileStatus(unitsDooResult);
  const doo = buildFileStatus(dooResult);

  // Minimum workbench input: at least w3i OR w3e must be readable
  // Optional files (units.doo, war3map.doo) do not block workbench readiness
  const hasRequiredFiles = w3i.exists || w3e.exists;
  const isReadyForWorkbench = hasRequiredFiles;

  // Determine recommended next step
  let recommendedNextStep: string;
  if (!w3i.exists && !w3e.exists) {
    recommendedNextStep = "Add war3map.w3i or war3map.w3e to enable workbench";
  } else if (w3i.exists && !w3i.isRealParsed) {
    recommendedNextStep = "war3map.w3i exists but needs real parsing - check file format";
  } else if (w3e.exists && !w3e.isRealParsed) {
    recommendedNextStep = "war3map.w3e exists but needs real parsing - check file format";
  } else if (w3i.isRealParsed && w3e.isRealParsed) {
    recommendedNextStep = "Ready for workbench - all required files parsed";
  } else if (w3i.isRealParsed || w3e.isRealParsed) {
    recommendedNextStep = "Partially ready - add remaining required files for full workbench support";
  } else {
    recommendedNextStep = "Check file formats - files exist but could not be parsed";
  }

  return {
    isReadyForWorkbench,
    w3i,
    w3e,
    unitsDoo,
    doo,
    recommendedNextStep,
  };
}

/**
 * Builds a derived workspace view from a project context.
 *
 * This function reads available P0 source files and builds
 * placeholder summary structures for future real parsing.
 *
 * @param context - The project context from workspace connector
 * @returns A derived workspace view with placeholder summaries
 */
export function buildWar3DerivedWorkspaceView(context: ProjectContext): War3DerivedWorkspaceView {
  const workspaceRoot = context.workspaceRoot;
  const availableFiles: string[] = [];
  const missingFiles: string[] = [];
  const notes: string[] = [];
  const issues: string[] = [];

  // Attempt to read w3i
  const w3iResult = readW3iFile(workspaceRoot);
  if (w3iResult.success) {
    availableFiles.push("war3map.w3i");
    notes.push(...w3iResult.notes);
  } else {
    missingFiles.push("war3map.w3i");
    issues.push(...w3iResult.issues);
  }

  // Attempt to read w3e
  const w3eResult = readW3eFile(workspaceRoot);
  if (w3eResult.success) {
    availableFiles.push("war3map.w3e");
    notes.push(...w3eResult.notes);
  } else {
    missingFiles.push("war3map.w3e");
    issues.push(...w3eResult.issues);
  }

  // Attempt to read units.doo (optional P0 file)
  const unitsDooResult = readUnitsDooFile(workspaceRoot);
  if (unitsDooResult.success) {
    availableFiles.push("war3mapunits.doo");
    notes.push(...unitsDooResult.notes);
  } else {
    // This is optional, so don't add to issues unless it's specifically needed
    notes.push("war3mapunits.doo not found or not readable (optional file)");
  }

  // Attempt to read war3map.doo (optional P0 file)
  const dooResult = readDooFile(workspaceRoot);
  if (dooResult.success) {
    availableFiles.push("war3map.doo");
    notes.push(...dooResult.notes);
  } else {
    // This is optional, so don't add to issues unless it's specifically needed
    notes.push("war3map.doo not found or not readable (optional file)");
  }

  // Build derived structures
  const mapSummary = buildMapSummary(w3iResult);
  const planarMap = buildPlanarMap(w3eResult);
  const canvasHint = planarMap?.canvasHint;
  const anchorCandidates = buildAnchorCandidates(unitsDooResult, canvasHint);
  const doodadCandidates = buildDoodadCandidates(dooResult, canvasHint);

  // Build unified workbench summary
  const workbenchSummary = buildWorkbenchSummary(w3iResult, w3eResult, unitsDooResult, dooResult);

  const success = availableFiles.length > 0;

  if (success) {
    notes.push(`Derived workspace view built from ${availableFiles.length} file(s)`);
    notes.push("Derived view currently mixes minimal real header parsing with placeholder summaries");
  }

  return {
    success,
    workspaceRoot,
    workbenchSummary,
    mapSummary,
    planarMap,
    anchorCandidates,
    doodadCandidates,
    availableFiles,
    missingFiles,
    notes,
    issues,
  };
}

export type {
  MapSummary,
  PlanarMap,
  CanvasHint,
  AnchorCandidates,
  DoodadCandidates,
  War3DerivedWorkspaceView,
  WorkbenchSummary,
  WorkbenchFileStatus,
  AnchorSuggestion,
  LandmarkSuggestion,
  RegionHint,
  AnchorSuggestionKind,
} from "./types.js";
