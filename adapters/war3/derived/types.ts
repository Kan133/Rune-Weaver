/**
 * War3 Adapter - Derived Types
 *
 * Read-only derived workspace view types.
 * Placeholder implementation - summary structures for future real parsing results.
 */

/**
 * Map summary derived from w3i parsing.
 * Minimal real parsing: core map metadata and playable area.
 */
export interface MapSummary {
  /** True if no real parsing was done (e.g., file too small or no magic match) */
  _placeholder: boolean;
  /** Status message for debugging */
  status?: string;
  /** Source file reference */
  sourceFile?: string;
  /** Bytes length (if file was read) */
  bytesLength?: number;
  /** W3I format version - REAL PARSED FIELD */
  formatVersion?: number;
  /** Map save/version counter - REAL PARSED FIELD */
  mapVersion?: number;
  /** Editor version that last saved the map - REAL PARSED FIELD */
  editorVersion?: number;
  /** Optional game version tuple - REAL PARSED FIELD */
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
  /** Tileset character - REAL PARSED FIELD */
  tileset?: string;
  /** Script type: 0 = Jass, 1 = Lua - REAL PARSED FIELD */
  scriptType?: number;
  /** Declared player count - REAL PARSED FIELD */
  playersCount?: number;
}

/**
 * Canvas hint for planar map rendering.
 * Provides tilepoint dimensions and world coordinate offsets.
 */
export interface CanvasHint {
  /** Map width in tiles */
  width: number;
  /** Map height in tiles */
  height: number;
  /** Horizontal offset in world coordinates */
  offsetX: number;
  /** Vertical offset in world coordinates */
  offsetY: number;
}

/**
 * Planar map view derived from w3e parsing.
 * Minimal real parsing: magic header, version, tileset, and dimensions.
 * All other fields are placeholder/future work.
 */
export interface PlanarMap {
  /** True if no real parsing was done (e.g., file too small or no magic match) */
  _placeholder: boolean;
  /** Status message for debugging */
  status?: string;
  /** Source file reference */
  sourceFile?: string;
  /** Bytes length (if file was read) */
  bytesLength?: number;
  /** File format magic identifier (from w3e) - REAL PARSED FIELD */
  magic?: string;
  /** File format version (from w3e) - REAL PARSED FIELD */
  version?: number;
  /** Main tileset character (from w3e) - REAL PARSED FIELD */
  mainTileset?: string;
  /** Whether map uses custom tileset (from w3e) - REAL PARSED FIELD */
  usesCustomTileset?: number;
  /** Canvas hint for rendering (tile dimensions and world offsets) - REAL PARSED FIELD */
  canvasHint?: CanvasHint;
  /** Future: terrain data, tilepoint grid, etc. */
}

/**
 * Minimal object sample with coordinates.
 */
export interface CandidateSample {
  /** Object ID */
  id: string;
  /** X coordinate in world space */
  x: number;
  /** Y coordinate in world space */
  y: number;
  /** Z coordinate in world space */
  z: number;
  /** Owner/player ID (for units) */
  owner?: number;
}

/**
 * Anchor candidate derived from units.doo parsing.
 * Minimal real parsing: magic header, version, sub-version, object count, and sample coordinates.
 */
export interface AnchorCandidates {
  /** True if no real parsing was done (e.g., file too small or no magic match) */
  _placeholder: boolean;
  /** Status message for debugging */
  status?: string;
  /** Source file reference */
  sourceFile?: string;
  /** Bytes length (if file was read) */
  bytesLength?: number;
  /** File format magic identifier (from units.doo) - REAL PARSED FIELD */
  magic?: string;
  /** File format version (from units.doo) - REAL PARSED FIELD */
  version?: number;
  /** File format sub-version (from units.doo) - REAL PARSED FIELD */
  subVersion?: number;
  /** Number of objects (units/items) in the file - REAL PARSED FIELD */
  candidateCount?: number;
  /** Up to 5 sample objects with coordinates - REAL PARSED FIELD */
  sampleObjects?: CandidateSample[];
  /** Light-weight anchor suggestions for UI/workbench */
  suggestions?: AnchorSuggestion[];
}

/**
 * Doodad candidate derived from war3map.doo parsing.
 * Minimal real parsing: magic header, version, sub-version, doodad count, and sample coordinates.
 */
export interface DoodadCandidates {
  /** True if no real parsing was done (e.g., file too small or no magic match) */
  _placeholder: boolean;
  /** Status message for debugging */
  status?: string;
  /** Source file reference */
  sourceFile?: string;
  /** Bytes length (if file was read) */
  bytesLength?: number;
  /** File format magic identifier (from doo) - REAL PARSED FIELD */
  magic?: string;
  /** File format version (from doo) - REAL PARSED FIELD */
  version?: number;
  /** File format sub-version (from doo) - REAL PARSED FIELD */
  subVersion?: number;
  /** Number of doodads in the file - REAL PARSED FIELD */
  candidateCount?: number;
  /** Number of special doodads (tree variants) - REAL PARSED FIELD */
  specialDoodadCount?: number;
  /** Up to 5 sample doodads with coordinates - REAL PARSED FIELD */
  sampleObjects?: CandidateSample[];
  /** Light-weight landmark suggestions for UI/workbench */
  suggestions?: LandmarkSuggestion[];
}

/**
 * Suggestion kind - coarse classification for UI.
 */
export type AnchorSuggestionKind = "unit" | "doodad";

/**
 * Region hint - coarse 3x3 grid position relative to map center.
 */
export type RegionHint =
  | "northwest"
  | "north"
  | "northeast"
  | "west"
  | "center"
  | "east"
  | "southwest"
  | "south"
  | "southeast"
  | "unknown";

/**
 * Anchor suggestion for workbench UI.
 * Lightweight aggregate from sample objects with conservative inference.
 */
export interface AnchorSuggestion {
  /** Suggestion ID (derived from object id) */
  id: string;
  /** X coordinate in world space */
  x: number;
  /** Y coordinate in world space */
  y: number;
  /** Z coordinate in world space */
  z: number;
  /** Coarse kind classification */
  kind: AnchorSuggestionKind;
  /** Region hint relative to map center (3x3 grid) */
  regionHint: RegionHint;
  /** Display label for UI (short) */
  label: string;
  /** Reason why this is a candidate */
  reason: string;
  /** Owner/player ID if available */
  owner?: number;
}

/**
 * Landmark suggestion for workbench UI.
 * Lightweight aggregate from doodad samples with conservative inference.
 */
export interface LandmarkSuggestion {
  /** Suggestion ID (derived from doodad id) */
  id: string;
  /** X coordinate in world space */
  x: number;
  /** Y coordinate in world space */
  y: number;
  /** Z coordinate in world space */
  z: number;
  /** Always "doodad" for landmark suggestions */
  kind: AnchorSuggestionKind;
  /** Region hint relative to map center (3x3 grid) */
  regionHint: RegionHint;
  /** Display label for UI (short) */
  label: string;
  /** Reason why this is a candidate */
  reason: string;
}

/**
 * File status in workbench summary.
 */
export interface WorkbenchFileStatus {
  /** Whether the file exists and was readable */
  exists: boolean;
  /** Whether the file was successfully read (bytes available) */
  read: boolean;
  /** Whether the file content is placeholder (not real parsed) */
  isPlaceholder: boolean;
  /** Whether real parsing was successful (parsed = true) */
  isRealParsed: boolean;
  /** Format magic if available (from real parsing) */
  magic?: string;
  /** Format version if available (from real parsing) */
  version?: number;
  /** Format sub-version if available (from real parsing) */
  subVersion?: number;
}

/**
 * Unified workbench summary for UI/doctor consumption.
 * Aggregates all file statuses and provides next action recommendation.
 */
export interface WorkbenchSummary {
  /** Whether workspace has minimum required files for workbench input */
  isReadyForWorkbench: boolean;
  /** Status of w3i (map info) file - REQUIRED */
  w3i: WorkbenchFileStatus;
  /** Status of w3e (terrain) file - REQUIRED */
  w3e: WorkbenchFileStatus;
  /** Status of units.doo file - OPTIONAL */
  unitsDoo: WorkbenchFileStatus;
  /** Status of war3map.doo file - OPTIONAL */
  doo: WorkbenchFileStatus;
  /** Human-readable recommended next step */
  recommendedNextStep: string;
}

/**
 * Combined derived workspace view.
 * Aggregates all parsed (read) file summaries into a unified view.
 */
export interface War3DerivedWorkspaceView {
  /** Whether the derived view was successfully built */
  success: boolean;
  /** Workspace root path */
  workspaceRoot: string;
  /** Unified workbench summary for UI/doctor */
  workbenchSummary: WorkbenchSummary;
  /** Map summary from w3i (if available) */
  mapSummary: MapSummary | null;
  /** Planar map from w3e (if available) */
  planarMap: PlanarMap | null;
  /** Anchor candidates from units.doo (if available) */
  anchorCandidates: AnchorCandidates | null;
  /** Doodad candidates from war3map.doo (if available) */
  doodadCandidates: DoodadCandidates | null;
  /** List of files that were read */
  availableFiles: string[];
  /** List of files that could not be read */
  missingFiles: string[];
  /** Human-readable notes */
  notes: string[];
  /** Issues encountered */
  issues: string[];
}
