/**
 * War3 Adapter - DOO Parser
 *
 * Read-only parser for war3map.doo (doodad placement) files.
 * Minimal real parsing: magic header, version, sub-version, doodad count, and sample coordinates.
 */

import { existsSync, readFileSync } from "fs";
import { resolve } from "path";
import type { ParserOptions, DooParseResult, ObjectSample } from "./types.js";

// Doodad record structure for war3map.doo (version 8)
// The documented size is 50 bytes, but some real maps (e.g. Reforged exports,
// PyWC3-generated maps) insert an extra 4-byte field after scaleZ — likely a
// skinId / type duplicate — yielding a 54-byte stride. We detect this at
// runtime so we stay compatible with both variants.
//
// Offsets within the record (both variants):
// - id (4 bytes): char[4]
// - variation (4 bytes): uint32
// - x (4 bytes): float  <- offset 8
// - y (4 bytes): float  <- offset 12
// - z (4 bytes): float  <- offset 16
// - angle (4 bytes): float
// - scaleX (4 bytes): float
// - scaleY (4 bytes): float
// - scaleZ (4 bytes): float
// [possible extra 4-byte field]
// - flags (1 byte): uint8
// - lifePercent (1 byte): uint8
// - itemTableId (4 bytes): int32 (-1 = none)
// - itemSet (4 bytes): int32 (dropped item set)
// - doodadId (4 bytes): int32 (terrain/tree ID)

const DOODAD_RECORD_SIZE_DEFAULT = 50;
const DOODAD_ID_OFFSET = 0;           // 4 bytes: doodad ID

const DOODAD_X_OFFSET = 8;            // 4 bytes float: X coordinate
const DOODAD_Y_OFFSET = 12;           // 4 bytes float: Y coordinate
const DOODAD_Z_OFFSET = 16;           // 4 bytes float: Z coordinate

// Special doodad record structure (fixed 16 bytes per special doodad)
const SPECIAL_DOODAD_RECORD_SIZE = 16;

function isPrintableAscii(buf: Buffer): boolean {
  for (let i = 0; i < buf.length; i++) {
    const b = buf[i];
    if (b < 0x20 || b > 0x7e) {
      return false;
    }
  }
  return true;
}

/**
 * Detect whether this file uses the extended 54-byte doodad record.
 * We check the field at offset 36 of the first record: if it looks like a
 * 4-character ASCII id we treat the stride as 54 bytes, otherwise 50.
 */
function detectDoodadRecordSize(
  bytes: Buffer,
  offset: number,
  count: number
): number {
  if (count <= 0) {
    return DOODAD_RECORD_SIZE_DEFAULT;
  }

  const fieldAt36 = bytes.slice(offset + 36, offset + 40);
  if (fieldAt36.length === 4 && isPrintableAscii(fieldAt36)) {
    // Sanity-check subsequent record starts also look like ASCII ids.
    let valid = true;
    for (let i = 1; i < count; i++) {
      const start = offset + i * 54;
      if (start + 4 > bytes.length) {
        valid = false;
        break;
      }
      if (!isPrintableAscii(bytes.slice(start, start + 4))) {
        valid = false;
        break;
      }
    }
    if (valid) {
      return 54;
    }
  }

  return DOODAD_RECORD_SIZE_DEFAULT;
}

/**
 * Parses doodad samples from the buffer.
 * Returns up to maxSamples doodad coordinates.
 */
function parseDoodadSamples(
  bytes: Buffer,
  offset: number,
  count: number,
  recordSize: number,
  maxSamples: number = 5
): ObjectSample[] {
  const samples: ObjectSample[] = [];
  const sampleCount = Math.min(count, maxSamples);

  for (let i = 0; i < sampleCount; i++) {
    const recordOffset = offset + i * recordSize;

    // Check if we have enough bytes for this record
    if (recordOffset + recordSize > bytes.length) {
      break;
    }

    // Read doodad ID (4 bytes as string)
    const idBytes = bytes.slice(recordOffset + DOODAD_ID_OFFSET, recordOffset + DOODAD_ID_OFFSET + 4);
    const id = idBytes.toString("ascii").replace(/\0/g, "");

    // Read coordinates (float32, little-endian)
    const x = bytes.readFloatLE(recordOffset + DOODAD_X_OFFSET);
    const y = bytes.readFloatLE(recordOffset + DOODAD_Y_OFFSET);
    const z = bytes.readFloatLE(recordOffset + DOODAD_Z_OFFSET);

    samples.push({ id, x, y, z });
  }

  return samples;
}

/**
 * Attempts to read a doo file from workspace or direct path.
 *
 * @param source - Workspace root directory or direct file path
 * @param options - Parser options
 * @returns Parse result with summary containing header info and sample coordinates
 */
export function readDooFile(source: string, options: ParserOptions = {}): DooParseResult {
  const { workspaceRoot } = options;

  // Determine the actual file path
  let filePath: string;
  if (workspaceRoot) {
    filePath = resolve(workspaceRoot, source);
  } else {
    const directPath = resolve(source);
    const dooFileName = "war3map.doo";
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

      // Try to read doodad count (4 bytes at offset 12)
      let doodadCount = 0;
      let specialDoodadCount = 0;
      let samples: ObjectSample[] | undefined;
      let doodadSectionParsed = false;

      if (bytes.length >= 16) {
        doodadCount = bytes.readUInt32LE(12);

        // Parse doodad samples starting at offset 16
        const doodadDataOffset = 16;
        const recordSize = detectDoodadRecordSize(bytes, doodadDataOffset, doodadCount);
        const minDoodadSectionSize = doodadCount * recordSize;

        // Conservative check: ensure we have enough bytes for declared doodads
        if (bytes.length >= doodadDataOffset + minDoodadSectionSize) {
          samples = parseDoodadSamples(bytes, doodadDataOffset, doodadCount, recordSize, 5);
          doodadSectionParsed = true;

          // Try to read special doodad section
          // After doodad records: special doodad version (4 bytes) + count (4 bytes) + records
          const specialSectionOffset = doodadDataOffset + minDoodadSectionSize;

          if (bytes.length >= specialSectionOffset + 8) {
            // Read special doodad version (we ignore it for now, just need count)
            // const specialVersion = bytes.readUInt32LE(specialSectionOffset);
            specialDoodadCount = bytes.readUInt32LE(specialSectionOffset + 4);

            // Verify special doodad section has enough bytes
            const specialDataOffset = specialSectionOffset + 8;
            const minSpecialSectionSize = specialDoodadCount * SPECIAL_DOODAD_RECORD_SIZE;

            if (bytes.length < specialDataOffset + minSpecialSectionSize) {
              // Special doodad count seems invalid, but we already have main doodads
              // Just keep what we have and note the issue
              specialDoodadCount = 0;
            }
          }
        }
      }

      const notes = [
        `File read successfully: ${bytes.length} bytes`,
        `Magic: W3do, Version: ${version}, SubVersion: ${subVersion}`,
      ];

      if (doodadSectionParsed) {
        notes.push(`Doodad count: ${doodadCount}`);
        if (specialDoodadCount > 0) {
          notes.push(`Special doodad count: ${specialDoodadCount}`);
        }
        if (samples && samples.length > 0) {
          notes.push(`Sample positions: ${samples.length} doodad(s)`);
        }
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
          doodadCount,
          specialDoodadCount: specialDoodadCount > 0 ? specialDoodadCount : undefined,
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
 * Type guard for doo parse results.
 */
export function isDooParseResult(result: unknown): result is DooParseResult {
  return (
    typeof result === "object" &&
    result !== null &&
    "sourceFile" in result &&
    "bytesLength" in result &&
    typeof (result as DooParseResult).bytesLength === "number"
  );
}
