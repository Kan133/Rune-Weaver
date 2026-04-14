/**
 * War3 Adapter - Units DOO Parser
 *
 * Read-only parser for war3mapunits.doo (unit placement) files.
 * Minimal real parsing: magic header, version, sub-version, object count, and sample coordinates.
 * Supports version=8, subVersion=11 (Frozen Throne format) with conservative traversal.
 * Best-effort support for version=8, subVersion=9 (Reign of Chaos format): header and
 * basic sample coordinates only; full record traversal is not implemented due to
 * undocumented format differences.
 */

import { existsSync, readFileSync } from "fs";
import { resolve } from "path";
import type { ParserOptions, UnitsDooParseResult, ObjectSample } from "./types.js";

// Units.doo v8 header structure
// - subVersion 11 (TFT): magic(4) + version(4) + subVersion(4) + unknown(4) + objectCount(4) = 20 bytes
// - subVersion 9 (RoC):  magic(4) + version(4) + subVersion(4) + objectCount(4) = 16 bytes
// Each object has variable length - we need to conservatively skip fields

// Fixed offsets within an object record (version 8 subVersion 11)
const OBJECT_ID_OFFSET = 0;           // 4 bytes: unit/item ID

const OBJECT_X_OFFSET = 8;            // 4 bytes float: X coordinate
const OBJECT_Y_OFFSET = 12;           // 4 bytes float: Y coordinate
const OBJECT_Z_OFFSET = 16;           // 4 bytes float: Z coordinate

const OBJECT_PLAYER_ID_OFFSET = 37;   // 1 byte: player/owner ID




// For heroes: after base fields, there are hero stats
// heroLevel (4) + heroStr (4) + heroAgi (4) + heroInt (4) = 16 bytes minimum for heroes

/**
 * Safely skips variable-length sections in a units.doo object record.
 * Returns the offset after this object, or -1 if traversal fails.
 *
 * Version 8 structure (conservative traversal):
 * - Base fields: ~50 bytes (up to gold amount)
 * - Hero stats (if hero): level(4) + str(4) + agi(4) + int(4) = 16 bytes
 * - Inventory: itemSlotCount(4) + [itemID(4) + charges(4) per slot]
 * - Abilities: abilityModCount(4) + [abilityID(4) + active(4) + level(4) per mod]
 * - Random unit data: depends on random type
 * - Custom color: 4 bytes (if present)
 * - Waygate target: 4 bytes (if present)
 * - Creation number: 4 bytes
 */
function skipObjectRecord(bytes: Buffer, offset: number, endOffset: number): number {
  if (offset >= endOffset) {
    return -1;
  }

  let pos = offset;

  // Minimum base fields: up to gold amount (offset 0-49)
  const MIN_BASE_SIZE = 50;
  if (pos + MIN_BASE_SIZE > endOffset) {
    return -1; // Not enough bytes for base fields
  }

  // Move past base fields to hero stats / inventory section
  // The base structure in v8 is actually larger - we need to account for all fixed fields
  // After gold amount (offset 46), we have:
  // - targetAcquisition (4 bytes)
  // - heroLevel (4 bytes) - 0 if not a hero
  pos += 54; // gold(4) + targetAcquisition(4) = 50->54, heroLevel is at 54

  if (pos + 4 > endOffset) return -1;

  const heroLevel = bytes.readInt32LE(pos);
  pos += 4;

  // If heroLevel > 0, we have hero stats (str, agi, int)
  if (heroLevel > 0) {
    if (pos + 12 > endOffset) return -1;
    pos += 12; // str(4) + agi(4) + int(4)
  }

  // Inventory section
  if (pos + 4 > endOffset) return -1;
  const itemSlotCount = bytes.readUInt32LE(pos);
  pos += 4;

  if (itemSlotCount > 100) return -1; // Sanity check

  for (let i = 0; i < itemSlotCount; i++) {
    if (pos + 8 > endOffset) return -1;
    pos += 8; // itemID(4) + charges(4)
  }

  // Abilities section
  if (pos + 4 > endOffset) return -1;
  const abilityModCount = bytes.readUInt32LE(pos);
  pos += 4;

  if (abilityModCount > 100) return -1; // Sanity check

  for (let i = 0; i < abilityModCount; i++) {
    if (pos + 12 > endOffset) return -1;
    pos += 12; // abilityID(4) + active(4) + level(4)
  }

  // Random unit/item/hero data (varies by type, but we skip based on minimal conservative path)
  // The random data section starts with a type indicator
  // Type 0: none, Type 1: unit table, Type 2: item table, Type 3: random from custom table
  if (pos + 4 > endOffset) return -1;
  const randomType = bytes.readUInt32LE(pos);
  pos += 4;

  if (randomType === 1 || randomType === 2) {
    // Table-based random: tableIndex(4) + column(4)
    if (pos + 8 > endOffset) return -1;
    pos += 8;
  } else if (randomType === 3) {
    // Custom random: itemCount(4) + [itemID(4) per item]
    if (pos + 4 > endOffset) return -1;
    const itemCount = bytes.readUInt32LE(pos);
    pos += 4;
    if (itemCount > 100) return -1;
    if (pos + itemCount * 4 > endOffset) return -1;
    pos += itemCount * 4;
  }
  // Type 0: no additional data

  // Custom color (always present in v8)
  if (pos + 4 > endOffset) return -1;
  pos += 4; // customColor(4)

  // Waygate target (always present in v8)
  if (pos + 4 > endOffset) return -1;
  pos += 4; // waygateTarget(4)

  // Creation number
  if (pos + 4 > endOffset) return -1;
  pos += 4; // creationNumber(4)

  return pos;
}

/**
 * Parses object samples from the buffer.
 * Returns up to maxSamples object coordinates with owner info.
 */
function parseObjectSamples(
  bytes: Buffer,
  offset: number,
  count: number,
  endOffset: number,
  maxSamples: number = 5
): { samples: ObjectSample[]; objectsParsed: number; nextOffset: number } {
  const samples: ObjectSample[] = [];
  let pos = offset;
  let objectsParsed = 0;

  for (let i = 0; i < count; i++) {
    // Check if we have enough bytes for the basic object header
    if (pos + OBJECT_PLAYER_ID_OFFSET + 1 > endOffset) {
      break;
    }

    // Read object ID (4 bytes as string)
    const idBytes = bytes.slice(pos + OBJECT_ID_OFFSET, pos + OBJECT_ID_OFFSET + 4);
    const id = idBytes.toString("ascii").replace(/\0/g, "");

    // Read coordinates (float32, little-endian)
    const x = bytes.readFloatLE(pos + OBJECT_X_OFFSET);
    const y = bytes.readFloatLE(pos + OBJECT_Y_OFFSET);
    const z = bytes.readFloatLE(pos + OBJECT_Z_OFFSET);

    // Read owner/player ID
    const owner = bytes.readUInt8(pos + OBJECT_PLAYER_ID_OFFSET);

    if (samples.length < maxSamples) {
      samples.push({ id, x, y, z, owner });
    }

    objectsParsed++;

    // Skip to next object (conservative traversal)
    const nextPos = skipObjectRecord(bytes, pos, endOffset);
    if (nextPos === -1 || nextPos <= pos) {
      // Failed to skip - invalid structure
      objectsParsed = 0; // Mark as failed
      break;
    }
    pos = nextPos;
  }

  return { samples, objectsParsed, nextOffset: pos };
}

/**
 * Best-effort parsing of object samples for version 8 subVersion 9.
 * The v9 record layout differs from v11 and is not fully documented.
 * We read basic coordinates from fixed offsets and use an estimated fixed
 * stride when the remaining bytes divide evenly by the object count.
 */
function parseObjectSamplesV9(
  bytes: Buffer,
  offset: number,
  count: number,
  endOffset: number,
  maxSamples: number = 5
): { samples: ObjectSample[]; objectsParsed: number; nextOffset: number } {
  const samples: ObjectSample[] = [];
  const totalObjectBytes = endOffset - offset;
  const hasEvenStride = count > 0 && totalObjectBytes % count === 0;
  const stride = hasEvenStride ? totalObjectBytes / count : 0;
  let pos = offset;
  let objectsParsed = 0;

  for (let i = 0; i < count; i++) {
    if (pos + 20 > endOffset) {
      break;
    }

    const idBytes = bytes.slice(pos, pos + 4);
    // Sanity check: ID should be printable ASCII
    const isValidId = idBytes[0] !== 0 && idBytes.every((b) => b >= 0x20 && b < 0x7f);
    if (!isValidId) {
      break;
    }

    const id = idBytes.toString("ascii").replace(/\0/g, "");
    const x = bytes.readFloatLE(pos + 8);
    const y = bytes.readFloatLE(pos + 12);
    const z = bytes.readFloatLE(pos + 16);
    // Empirical v8.9 samples place owner in the second byte of the 4-byte field at +40.
    const owner = stride >= 42 ? bytes.readUInt8(pos + 41) : 0;

    if (samples.length < maxSamples) {
      samples.push({ id, x, y, z, owner });
    }

    objectsParsed++;

    if (hasEvenStride) {
      pos += stride;
    } else {
      // Without a known stride we cannot reliably reach the next object
      break;
    }
  }

  return { samples, objectsParsed, nextOffset: pos };
}

/**
 * Attempts to read a units.doo file from workspace or direct path.
 *
 * @param source - Workspace root directory or direct file path
 * @param options - Parser options
 * @returns Parse result with summary containing header info and sample coordinates
 */
export function readUnitsDooFile(source: string, options: ParserOptions = {}): UnitsDooParseResult {
  const { workspaceRoot } = options;

  // Determine the actual file path
  let filePath: string;
  if (workspaceRoot) {
    filePath = resolve(workspaceRoot, source);
  } else {
    const directPath = resolve(source);
    const dooFileName = "war3mapunits.doo";
    filePath = source.toLowerCase().endsWith(".doo") ? directPath : resolve(directPath, dooFileName);
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

  // Minimal real parsing: check magic header, version and sub-version
  if (bytes.length >= 12) {
    const magicBytes = bytes.slice(0, 4);
    // Check if first 4 bytes are "W3do" (0x57, 0x33, 0x64, 0x6F)
    if (
      magicBytes[0] === 0x57 &&
      magicBytes[1] === 0x33 &&
      magicBytes[2] === 0x64 &&
      magicBytes[3] === 0x6F
    ) {
      const version = bytes.readUInt32LE(4);
      const subVersion = bytes.readUInt32LE(8);

      // Support boundaries:
      // - v8 subVersion 11 (TFT): full conservative parsing
      // - v8 subVersion 9  (RoC): header + best-effort sample coordinates only
      const isSupportedVersion = version === 8 && (subVersion === 11 || subVersion === 9);
      const isSubVersion9 = version === 8 && subVersion === 9;

      // Try to read object count
      let objectCount = 0;
      let samples: ObjectSample[] | undefined;
      let objectDataOffset = 20;

      if (isSubVersion9 && bytes.length >= 16) {
        // subVersion 9 has no unknown field; count is directly at offset 12
        objectCount = bytes.readUInt32LE(12);
        objectDataOffset = 16;
      } else if (subVersion === 11 && bytes.length >= 20) {
        // subVersion 11 has an unknown int at offset 12, count at offset 16
        objectCount = bytes.readUInt32LE(16);
        objectDataOffset = 20;
      }

      // Conservative parsing: only parse objects if version is supported
      if (isSupportedVersion && objectCount > 0) {
        const result = isSubVersion9
          ? parseObjectSamplesV9(bytes, objectDataOffset, objectCount, bytes.length, 5)
          : parseObjectSamples(bytes, objectDataOffset, objectCount, bytes.length, 5);

        // If we successfully parsed at least one object, use the samples
        if (result.objectsParsed > 0) {
          samples = result.samples;
        } else {
          // Parsing failed - fall back to header-only result
          objectCount = 0;
        }
      }

      const notes = [
        `File read successfully: ${bytes.length} bytes`,
        `Magic: W3do, Version: ${version}, SubVersion: ${subVersion}`,
      ];

      if (samples !== undefined) {
        notes.push(`Object count: ${objectCount}`);
        if (samples.length > 0) {
          notes.push(`Sample positions: ${samples.length} object(s)`);
        }
      } else if (isSupportedVersion) {
        notes.push("Object data parsing skipped (empty or conservative)");
      } else {
        notes.push(`Version ${version}.${subVersion} not fully supported (only v8.9 / v8.11) - using header only`);
      }

      return {
        success: true,
        sourceFile: filePath,
        bytesLength: bytes.length,
        parsed: true,
        summary: {
          _placeholder: false,
          magic: "W3do",
          version,
          subVersion,
          objectCount: objectCount > 0 ? objectCount : undefined,
          samples,
        },
        notes,
        issues: [],
      };
    }
  }

  // Return placeholder result - file too small or no valid magic
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
 * Type guard for units.doo parse results.
 */
export function isUnitsDooParseResult(result: unknown): result is UnitsDooParseResult {
  return (
    typeof result === "object" &&
    result !== null &&
    "sourceFile" in result &&
    "bytesLength" in result &&
    typeof (result as UnitsDooParseResult).bytesLength === "number"
  );
}
