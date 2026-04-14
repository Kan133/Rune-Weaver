/**
 * War3 Adapter - Parser Module
 *
 * Read-only binary file parsers for Warcraft III map files.
 * Placeholder implementation - file reading only, no binary parsing yet.
 */

export {
  readW3iFile,
  isW3iParseResult,
} from "./w3i.js";

export {
  readW3eFile,
  isW3eParseResult,
} from "./w3e.js";

export {
  readUnitsDooFile,
  isUnitsDooParseResult,
} from "./units-doo.js";

export {
  readDooFile,
  isDooParseResult,
} from "./doo.js";

export type {
  FileParseResult,
  ParserOptions,
  W3iParseResult,
  W3eParseResult,
  UnitsDooParseResult,
  DooParseResult,
  W3iSummary,
  W3eSummary,
  UnitsDooSummary,
  DooSummary,
  WorkspaceParsedFiles,
} from "./types.js";
