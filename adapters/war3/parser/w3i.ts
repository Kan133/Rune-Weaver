/**
 * War3 Adapter - W3I Parser
 *
 * Read-only parser for war3map.w3i (map info) files.
 * Minimal real parsing: format version, core strings, playable area, and script metadata.
 */

import { existsSync, readFileSync } from "fs";
import { resolve } from "path";
import type { ParserOptions, W3iParseResult, W3iSummary } from "./types.js";

interface Cursor {
  offset: number;
}

function readUInt32(bytes: Buffer, cursor: Cursor): number | null {
  if (cursor.offset + 4 > bytes.length) {
    return null;
  }

  const value = bytes.readUInt32LE(cursor.offset);
  cursor.offset += 4;
  return value;
}

function readInt32(bytes: Buffer, cursor: Cursor): number | null {
  if (cursor.offset + 4 > bytes.length) {
    return null;
  }

  const value = bytes.readInt32LE(cursor.offset);
  cursor.offset += 4;
  return value;
}

function readFloat32(bytes: Buffer, cursor: Cursor): number | null {
  if (cursor.offset + 4 > bytes.length) {
    return null;
  }

  const value = bytes.readFloatLE(cursor.offset);
  cursor.offset += 4;
  return value;
}

function readUInt8(bytes: Buffer, cursor: Cursor): number | null {
  if (cursor.offset + 1 > bytes.length) {
    return null;
  }

  const value = bytes.readUInt8(cursor.offset);
  cursor.offset += 1;
  return value;
}

function readCString(bytes: Buffer, cursor: Cursor): string | null {
  const zeroIndex = bytes.indexOf(0x00, cursor.offset);
  if (zeroIndex === -1) {
    return null;
  }

  const value = bytes.toString("utf8", cursor.offset, zeroIndex);
  cursor.offset = zeroIndex + 1;
  return value;
}

function parseW3i(bytes: Buffer): W3iSummary | null {
  if (bytes.length < 12) {
    return null;
  }

  const cursor: Cursor = { offset: 0 };
  const formatVersion = readUInt32(bytes, cursor);
  const mapVersion = readUInt32(bytes, cursor);
  const editorVersion = readUInt32(bytes, cursor);

  if (
    formatVersion === null ||
    mapVersion === null ||
    editorVersion === null ||
    formatVersion < 18 ||
    formatVersion > 40
  ) {
    return null;
  }

  let gameVersion: W3iSummary["gameVersion"];
  if (formatVersion >= 28) {
    const major = readUInt32(bytes, cursor);
    const minor = readUInt32(bytes, cursor);
    const patch = readUInt32(bytes, cursor);
    const build = readUInt32(bytes, cursor);

    if (major === null || minor === null || patch === null || build === null) {
      return null;
    }

    gameVersion = { major, minor, patch, build };
  }

  const name = readCString(bytes, cursor);
  const author = readCString(bytes, cursor);
  const description = readCString(bytes, cursor);
  const suggestedPlayers = readCString(bytes, cursor);

  if (name === null || author === null || description === null || suggestedPlayers === null) {
    return null;
  }

  for (let i = 0; i < 8; i++) {
    if (readFloat32(bytes, cursor) === null) {
      return null;
    }
  }

  for (let i = 0; i < 4; i++) {
    if (readInt32(bytes, cursor) === null) {
      return null;
    }
  }

  const playableWidth = readUInt32(bytes, cursor);
  const playableHeight = readUInt32(bytes, cursor);
  const flags = readUInt32(bytes, cursor);
  const tilesetByte = readUInt8(bytes, cursor);
  const loadingScreenNumber = readInt32(bytes, cursor);

  if (
    playableWidth === null ||
    playableHeight === null ||
    flags === null ||
    tilesetByte === null ||
    loadingScreenNumber === null
  ) {
    return null;
  }

  if (formatVersion >= 25 && readCString(bytes, cursor) === null) {
    return null;
  }

  if (readCString(bytes, cursor) === null) {
    return null;
  }
  if (readCString(bytes, cursor) === null) {
    return null;
  }
  if (readCString(bytes, cursor) === null) {
    return null;
  }

  if (formatVersion >= 25 && readUInt32(bytes, cursor) === null) {
    return null;
  }

  if (formatVersion >= 25 && readCString(bytes, cursor) === null) {
    return null;
  }

  if (readCString(bytes, cursor) === null) {
    return null;
  }
  if (readCString(bytes, cursor) === null) {
    return null;
  }
  if (readCString(bytes, cursor) === null) {
    return null;
  }

  if (formatVersion >= 25) {
    if (readUInt32(bytes, cursor) === null) {
      return null;
    }
    if (readFloat32(bytes, cursor) === null || readFloat32(bytes, cursor) === null || readFloat32(bytes, cursor) === null) {
      return null;
    }
    if (readUInt8(bytes, cursor) === null || readUInt8(bytes, cursor) === null || readUInt8(bytes, cursor) === null || readUInt8(bytes, cursor) === null) {
      return null;
    }
    if (readUInt32(bytes, cursor) === null) {
      return null;
    }
    if (readCString(bytes, cursor) === null) {
      return null;
    }
    if (readUInt8(bytes, cursor) === null) {
      return null;
    }
    if (readUInt8(bytes, cursor) === null || readUInt8(bytes, cursor) === null || readUInt8(bytes, cursor) === null || readUInt8(bytes, cursor) === null) {
      return null;
    }
  }

  let scriptType: number | undefined;
  if (formatVersion >= 28) {
    scriptType = readUInt32(bytes, cursor) ?? undefined;
    if (scriptType === undefined) {
      return null;
    }
  }

  let supportedModes: number | undefined;
  let gameDataVersion: number | undefined;
  if (formatVersion >= 31) {
    supportedModes = readUInt32(bytes, cursor) ?? undefined;
    gameDataVersion = readUInt32(bytes, cursor) ?? undefined;
    if (supportedModes === undefined || gameDataVersion === undefined) {
      return null;
    }
  }

  const playersCount = readUInt32(bytes, cursor);
  if (playersCount === null) {
    return null;
  }

  return {
    _placeholder: false,
    formatVersion,
    mapVersion,
    editorVersion,
    gameVersion,
    name,
    author,
    description,
    suggestedPlayers,
    playableWidth,
    playableHeight,
    flags,
    tileset: String.fromCharCode(tilesetByte),
    loadingScreenNumber,
    scriptType,
    supportedModes,
    gameDataVersion,
    playersCount,
  };
}

/**
 * Attempts to read a w3i file from workspace or direct path.
 *
 * @param source - Workspace root directory or direct file path
 * @param options - Parser options
 * @returns Parse result with summary (real fields if structure can be parsed, placeholder otherwise)
 */
export function readW3iFile(source: string, options: ParserOptions = {}): W3iParseResult {
  const { workspaceRoot } = options;

  let filePath: string;
  if (workspaceRoot) {
    filePath = resolve(workspaceRoot, source);
  } else {
    const directPath = resolve(source);
    const w3iFileName = "war3map.w3i";
    filePath = source.toLowerCase().endsWith(".w3i") ? directPath : resolve(directPath, w3iFileName);
  }

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

  const summary = parseW3i(bytes);
  if (summary) {
    const versionLabel = summary.gameVersion
      ? `${summary.gameVersion.major}.${summary.gameVersion.minor}.${summary.gameVersion.patch}.${summary.gameVersion.build}`
      : "classic-legacy";

    return {
      success: true,
      sourceFile: filePath,
      bytesLength: bytes.length,
      parsed: true,
      summary,
      notes: [
        `File read successfully: ${bytes.length} bytes`,
        `W3I format version: ${summary.formatVersion}, editor version: ${summary.editorVersion}`,
        `Map name: ${summary.name ?? "(empty)"}, author: ${summary.author ?? "(empty)"}`,
        `Playable size: ${summary.playableWidth}x${summary.playableHeight}, tileset: ${summary.tileset}`,
        `Game version: ${versionLabel}, players: ${summary.playersCount}`,
      ],
      issues: [],
    };
  }

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
 * Type guard for w3i parse results.
 */
export function isW3iParseResult(result: unknown): result is W3iParseResult {
  return (
    typeof result === "object" &&
    result !== null &&
    "sourceFile" in result &&
    "bytesLength" in result &&
    typeof (result as W3iParseResult).bytesLength === "number"
  );
}
