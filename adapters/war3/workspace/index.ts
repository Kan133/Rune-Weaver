/**
 * War3 Adapter - Workspace Module
 *
 * Exports workspace connector and related types.
 */

export { connectWar3Workspace } from "./connector.js";
export type { ProjectContext, War3WorkspaceConnectionResult } from "./types.js";
export {
  CLASSIC_WAR3_REQUIRED_FILES,
  CLASSIC_WAR3_SCRIPT_FILES,
  CLASSIC_WAR3_P0_OPTIONAL_FILES,
  CLASSIC_WAR3_P1_OPTIONAL_FILES,
  type ClassicWar3RequiredFile,
  type ClassicWar3ScriptFile,
  type ClassicWar3P0OptionalFile,
  type ClassicWar3P1OptionalFile,
} from "./files.js";

// Re-export parser and derived modules for convenience
export {
  readW3iFile,
  readW3eFile,
  readUnitsDooFile,
  isW3iParseResult,
  isW3eParseResult,
  isUnitsDooParseResult,
  type FileParseResult,
  type ParserOptions,
  type W3iParseResult,
  type W3eParseResult,
  type UnitsDooParseResult,
  type W3iSummary,
  type W3eSummary,
  type UnitsDooSummary,
  type WorkspaceParsedFiles,
} from "../parser/index.js";

export {
  buildWar3DerivedWorkspaceView,
  type MapSummary,
  type PlanarMap,
  type AnchorCandidates,
  type War3DerivedWorkspaceView,
} from "../derived/index.js";
