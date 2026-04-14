/**
 * War3 Adapter - W3E Parser
 *
 * Read-only parser for war3map.w3e (environment/terrain) files.
 * Minimal real parsing: header fields including tileset and dimensions.
 */

import { existsSync, readFileSync } from "fs";
import { resolve } from "path";
import type { ParserOptions, W3eParseResult, W3eSummary } from "./types.js";

/**
 * Attempts to parse w3e header fields from buffer.
 * Conservative parsing - returns null if length insufficient or counts are invalid.
 *
 * W3E Header format (classic):
 * - magic: 4 bytes ("W3E\0")
 * - version: 4 bytes (uint32LE)
 * - mainTileset: 1 byte (char)
 * - usesCustomTileset: 4 bytes (uint32LE)
 * - groundTilesetCount: 4 bytes (uint32LE)
 * - groundTilesetIds: 4 * groundTilesetCount bytes
 * - cliffTilesetCount: 4 bytes (uint32LE)
 * - cliffTilesetIds: 4 * cliffTilesetCount bytes
 * - width: 4 bytes (uint32LE)
 * - height: 4 bytes (uint32LE)
 * - horizontalOffset: 4 bytes (float, little-endian)
 * - verticalOffset: 4 bytes (float, little-endian)
 *
 * @param bytes - Buffer containing w3e file data
 * @returns W3eSummary if parsing succeeds, null otherwise
 */
function parseW3eHeader(bytes: Buffer): W3eSummary | null {
  // Minimum header size check: up to verticalOffset
  // magic(4) + version(4) + mainTileset(1) + usesCustomTileset(4) + groundCount(4) + cliffCount(4) + width(4) + height(4) + hOffset(4) + vOffset(4)
  // = 4 + 4 + 1 + 4 + 4 + 4 + 4 + 4 + 4 + 4 = 37 bytes minimum (with 0 tilesets)
  const MIN_HEADER_SIZE = 37;

  if (bytes.length < MIN_HEADER_SIZE) {
    return null;
  }

  // Check magic: first 3 bytes must be "W3E" (0x57, 0x33, 0x45)
  if (bytes[0] !== 0x57 || bytes[1] !== 0x33 || bytes[2] !== 0x45) {
    return null;
  }

  let offset = 0;

  // Magic (4 bytes) - we already verified first 3
  const magicBytes = bytes.slice(0, 4);
  const magic = magicBytes.toString("ascii", 0, 3); // "W3E"
  offset += 4;

  // Version (4 bytes, uint32LE)
  const version = bytes.readUInt32LE(offset);
  offset += 4;

  // Main tileset (1 byte, char)
  const mainTilesetChar = String.fromCharCode(bytes[offset]);
  offset += 1;

  // Uses custom tileset (4 bytes, uint32LE)
  const usesCustomTileset = bytes.readUInt32LE(offset);
  offset += 4;

  // Ground tileset count (4 bytes, uint32LE)
  const groundTilesetCount = bytes.readUInt32LE(offset);
  offset += 4;

  // Sanity check: ground tileset count should be reasonable (typically 1-16)
  if (groundTilesetCount > 64 || groundTilesetCount < 0) {
    return null;
  }

  // Check if we have enough bytes for ground tileset IDs
  if (bytes.length < offset + groundTilesetCount * 4 + 4) {
    return null;
  }

  // Skip ground tileset IDs (4 bytes each)
  offset += groundTilesetCount * 4;

  // Cliff tileset count (4 bytes, uint32LE)
  const cliffTilesetCount = bytes.readUInt32LE(offset);
  offset += 4;

  // Sanity check: cliff tileset count should be reasonable (typically 0-16)
  if (cliffTilesetCount > 64 || cliffTilesetCount < 0) {
    return null;
  }

  // Check if we have enough bytes for cliff tileset IDs + dimensions + offsets
  const remainingNeeded = cliffTilesetCount * 4 + 4 + 4 + 4 + 4; // cliff IDs + width + height + hOffset + vOffset
  if (bytes.length < offset + remainingNeeded) {
    return null;
  }

  // Skip cliff tileset IDs (4 bytes each)
  offset += cliffTilesetCount * 4;

  // Width (4 bytes, uint32LE)
  const width = bytes.readUInt32LE(offset);
  offset += 4;

  // Height (4 bytes, uint32LE)
  const height = bytes.readUInt32LE(offset);
  offset += 4;

  // Horizontal offset (4 bytes, floatLE)
  const horizontalOffset = bytes.readFloatLE(offset);
  offset += 4;

  // Vertical offset (4 bytes, floatLE)
  const verticalOffset = bytes.readFloatLE(offset);

  // Sanity check on dimensions (War3 maps are typically 32-480 tiles)
  if (width === 0 || width > 1000 || height === 0 || height > 1000) {
    return null;
  }

  return {
    _placeholder: false,
    magic,
    version,
    mainTileset: mainTilesetChar,
    usesCustomTileset,
    width,
    height,
    horizontalOffset,
    verticalOffset,
  };
}

/**
 * Attempts to read a w3e file from workspace or direct path.
 *
 * @param source - Workspace root directory or direct file path
 * @param options - Parser options
 * @returns Parse result with placeholder summary
 */
export function readW3eFile(source: string, options: ParserOptions = {}): W3eParseResult {
  const { workspaceRoot } = options;

  // Determine the actual file path
  let filePath: string;
  if (workspaceRoot) {
    filePath = resolve(workspaceRoot, source);
  } else {
    const directPath = resolve(source);
    const w3eFileName = "war3map.w3e";
    filePath = source.toLowerCase().endsWith(".w3e") ? directPath : resolve(directPath, w3eFileName);
  }

  // Check file existence
  if (!existsSync(filePath)) {
    return {
      success: false,
      sourceFile: filePath,
      bytesLength: 0,
      parsed: false,
      summary: null,
      notes: [],
      issues: [`File not found: ${filePath}`],
    };
  }

  // Read file bytes
  let bytes: Buffer;
  try {
    bytes = readFileSync(filePath);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      sourceFile: filePath,
      bytesLength: 0,
      parsed: false,
      summary: null,
      notes: [],
      issues: [`Failed to read file: ${message}`],
    };
  }

  // Attempt to parse w3e header
  const headerSummary = parseW3eHeader(bytes);

  if (headerSummary) {
    const notes = [
      `File read successfully: ${bytes.length} bytes`,
      `Magic: ${headerSummary.magic}, Version: ${headerSummary.version}`,
      `Tileset: ${headerSummary.mainTileset}, Custom: ${headerSummary.usesCustomTileset}`,
      `Dimensions: ${headerSummary.width}x${headerSummary.height}`,
      `Offset: (${headerSummary.horizontalOffset}, ${headerSummary.verticalOffset})`,
    ];

    return {
      success: true,
      sourceFile: filePath,
      bytesLength: bytes.length,
      parsed: true,
      summary: headerSummary,
      notes,
      issues: [],
    };
  }

  // Return placeholder result - file too small, no valid magic, or parse error
  return {
    success: true,
    sourceFile: filePath,
    bytesLength: bytes.length,
    parsed: false,
    summary: {
      _placeholder: true,
      status: "binary parser not implemented yet",
    },
    notes: [
      `File read successfully: ${bytes.length} bytes`,
      "Binary format parsing is a future enhancement",
    ],
    issues: [],
  };
}

/**
 * Type guard for w3e parse results.
 */
export function isW3eParseResult(result: unknown): result is W3eParseResult {
  return (
    typeof result === "object" &&
    result !== null &&
    "sourceFile" in result &&
    "bytesLength" in result &&
    typeof (result as W3eParseResult).bytesLength === "number"
  );
}
