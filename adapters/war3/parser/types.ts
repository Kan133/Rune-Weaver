/**
 * War3 Adapter - Parser Types
 *
 * Contract for binary file parsing. All parsers are read-only.
 * Placeholder implementation - actual binary parsing not implemented yet.
 */

/**
 * Base result type for all file parse operations.
 */
export interface FileParseResult<T = unknown> {
  /** Whether the file was successfully read (not parsed) */
  success: boolean;
  /** Source file path */
  sourceFile: string;
  /** Raw bytes length if file was read */
  bytesLength: number;
  /** Whether binary parsing was attempted */
  parsed: boolean;
  /** Placeholder summary fields (to be filled by real parser) */
  summary: T | null;
  /** Human-readable notes about the file */
  notes: string[];
  /** Issues encountered during file read/parse */
  issues: string[];
}

/**
 * Summary for w3i (map info) files.
 * Minimal real parsing: header, core map strings, bounds, and script metadata.
 */
export interface W3iSummary {
  /** True if no real parsing was done (e.g., file too small or no magic match) */
  _placeholder: boolean;
  /** Status message for debugging */
  status?: string;
  /** W3I format version (first 4 bytes, little-endian) - REAL PARSED FIELD */
  formatVersion?: number;
  /** Map save/version counter - REAL PARSED FIELD */
  mapVersion?: number;
  /** Editor version that last saved the map - REAL PARSED FIELD */
  editorVersion?: number;
  /** Optional game version tuple for newer map formats - REAL PARSED FIELD */
  gameVersion?: {
    major: number;
    minor: number;
    patch: number;
    build: number;
  };
  /** Map display name - REAL PARSED FIELD */
  name?: string;
  /** Map author - REAL PARSED FIELD */
  author?: string;
  /** Map description - REAL PARSED FIELD */
  description?: string;
  /** Suggested players string - REAL PARSED FIELD */
  suggestedPlayers?: string;
  /** Playable area width - REAL PARSED FIELD */
  playableWidth?: number;
  /** Playable area height - REAL PARSED FIELD */
  playableHeight?: number;
  /** Map flags bitmask - REAL PARSED FIELD */
  flags?: number;
  /** Main tileset character - REAL PARSED FIELD */
  tileset?: string;
  /** Loading screen preset number (-1 means none/custom) - REAL PARSED FIELD */
  loadingScreenNumber?: number;
  /** Script type: 0 = Jass, 1 = Lua for modern formats - REAL PARSED FIELD */
  scriptType?: number;
  /** Supported modes bitmask in newer formats - REAL PARSED FIELD */
  supportedModes?: number;
  /** Game data version field in newer formats - REAL PARSED FIELD */
  gameDataVersion?: number;
  /** Declared player count - REAL PARSED FIELD */
  playersCount?: number;
}

/**
 * Summary for w3e (environment/terrain) files.
 * Minimal real parsing: magic header, version, tileset, and dimensions.
 * All other fields are placeholder/future work.
 */
export interface W3eSummary {
  /** True if no real parsing was done (e.g., file too small or no magic match) */
  _placeholder: boolean;
  /** Status message for debugging */
  status?: string;
  /** File format magic identifier (first 4 bytes: "W3E\0") - REAL PARSED FIELD */
  magic?: string;
  /** File format version (4 bytes at offset 4, little-endian) - REAL PARSED FIELD */
  version?: number;
  /** Main tileset character (1 byte at offset 8) - REAL PARSED FIELD */
  mainTileset?: string;
  /** Whether map uses custom tileset (4 bytes at offset 9, little-endian) - REAL PARSED FIELD */
  usesCustomTileset?: number;
  /** Map width in tiles (4 bytes after tileset headers, little-endian) - REAL PARSED FIELD */
  width?: number;
  /** Map height in tiles (4 bytes after width, little-endian) - REAL PARSED FIELD */
  height?: number;
  /** Horizontal offset in world coordinates (4 bytes after height, little-endian) - REAL PARSED FIELD */
  horizontalOffset?: number;
  /** Vertical offset in world coordinates (4 bytes after horizontal offset, little-endian) - REAL PARSED FIELD */
  verticalOffset?: number;
}

/**
 * Minimal unit/doodad sample for candidate positions.
 */
export interface ObjectSample {
  /** Object ID (4-char string or raw hex) */
  id: string;
  /** X coordinate in world space */
  x: number;
  /** Y coordinate in world space */
  y: number;
  /** Z coordinate in world space */
  z: number;
  /** Owner/player ID (for units/items) */
  owner?: number;
}

/**
 * Summary for units.doo (unit placement) files.
 * Minimal real parsing: magic header, version, sub-version, object count, and sample coordinates.
 */
export interface UnitsDooSummary {
  /** True if no real parsing was done (e.g., file too small or no magic match) */
  _placeholder: boolean;
  /** Status message for debugging */
  status?: string;
  /** File format magic identifier (first 4 bytes: "W3do") - REAL PARSED FIELD */
  magic?: string;
  /** File format version (4 bytes at offset 4, little-endian) - REAL PARSED FIELD */
  version?: number;
  /** File format sub-version (4 bytes at offset 8, little-endian) - REAL PARSED FIELD */
  subVersion?: number;
  /** Number of objects (units/items) in the file - REAL PARSED FIELD */
  objectCount?: number;
  /** Up to 5 sample objects with coordinates - REAL PARSED FIELD */
  samples?: ObjectSample[];
}

/**
 * Summary for war3map.doo (doodad placement) files.
 * Minimal real parsing: magic header, version, sub-version, doodad count, and sample coordinates.
 */
export interface DooSummary {
  /** True if no real parsing was done (e.g., file too small or no magic match) */
  _placeholder: boolean;
  /** Status message for debugging */
  status?: string;
  /** File format magic identifier (first 4 bytes: "W3do") - REAL PARSED FIELD */
  magic?: string;
  /** File format version (4 bytes at offset 4, little-endian) - REAL PARSED FIELD */
  version?: number;
  /** File format sub-version (4 bytes at offset 8, little-endian) - REAL PARSED FIELD */
  subVersion?: number;
  /** Number of doodads in the file - REAL PARSED FIELD */
  doodadCount?: number;
  /** Number of special doodads (tree variants) - REAL PARSED FIELD */
  specialDoodadCount?: number;
  /** Up to 5 sample doodads with coordinates - REAL PARSED FIELD */
  samples?: ObjectSample[];
}

/**
 * Type alias for specific parse results.
 */
export type W3iParseResult = FileParseResult<W3iSummary>;
export type W3eParseResult = FileParseResult<W3eSummary>;
export type UnitsDooParseResult = FileParseResult<UnitsDooSummary>;
export type DooParseResult = FileParseResult<DooSummary>;

/**
 * Options for parser functions.
 */
export interface ParserOptions {
  /** Optional workspace root path */
  workspaceRoot?: string;
  /** Whether to include raw bytes in result (default: false) */
  includeRawBytes?: boolean;
}

/**
 * Map of parsed (read) files for a workspace.
 * Keys are file names (e.g., "war3map.w3i"), values are parse results.
 */
export interface WorkspaceParsedFiles {
  w3i?: W3iParseResult;
  w3e?: W3eParseResult;
  unitsDoo?: UnitsDooParseResult;
  doo?: DooParseResult;
}
