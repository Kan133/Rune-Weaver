/**
 * War3 Adapter - Parser Tests
 *
 * Lightweight tests for the parser skeleton.
 */

import { mkdirSync, writeFileSync, rmSync } from "fs";
import { join } from "path";
import {
  readW3iFile,
  readW3eFile,
  readUnitsDooFile,
  readDooFile,
  isW3iParseResult,
  isW3eParseResult,
  isUnitsDooParseResult,
  isDooParseResult,
} from "./index.js";

const TEST_DIR = join(process.cwd(), "tmp", "war3-parser-test");

function setup() {
  try {
    rmSync(TEST_DIR, { recursive: true, force: true });
  } catch {
    // ignore
  }
  mkdirSync(TEST_DIR, { recursive: true });
}

function teardown() {
  try {
    rmSync(TEST_DIR, { recursive: true, force: true });
  } catch {
    // ignore
  }
}

function runTests() {
  console.log("Running War3 Parser Tests...\n");
  let passed = 0;
  let failed = 0;

  // Test 1: Read w3i - file not found
  {
    const result = readW3iFile("/nonexistent/path");
    if (!result.success && result.issues.length > 0 && result.bytesLength === 0) {
      console.log("✅ Test 1: w3i file not found - PASS");
      passed++;
    } else {
      console.log("❌ Test 1: w3i file not found - FAIL");
      console.log("  Result:", JSON.stringify(result, null, 2));
      failed++;
    }
  }

  // Test 2: Read w3i - file exists (placeholder content, no magic)
  {
    setup();
    const testContent = "mock w3i content";
    writeFileSync(join(TEST_DIR, "war3map.w3i"), testContent);
    const result = readW3iFile(TEST_DIR);
    if (
      result.success &&
      result.bytesLength === testContent.length &&
      result.parsed === false &&
      result.summary?._placeholder === true &&
      result.summary?.magic === undefined
    ) {
      console.log("✅ Test 2: w3i file exists (placeholder parse) - PASS");
      passed++;
    } else {
      console.log("❌ Test 2: w3i file exists (placeholder parse) - FAIL");
      console.log("  Result:", JSON.stringify(result, null, 2));
      failed++;
    }
    teardown();
  }

  // Test 2b: Read w3i - binary file with real header and core metadata
  {
    setup();
    const formatVersion = Buffer.alloc(4);
    formatVersion.writeUInt32LE(31, 0);
    const mapVersion = Buffer.alloc(4);
    mapVersion.writeUInt32LE(7, 0);
    const editorVersion = Buffer.alloc(4);
    editorVersion.writeUInt32LE(6108, 0);
    const gameMajor = Buffer.alloc(4);
    gameMajor.writeUInt32LE(1, 0);
    const gameMinor = Buffer.alloc(4);
    gameMinor.writeUInt32LE(29, 0);
    const gamePatch = Buffer.alloc(4);
    gamePatch.writeUInt32LE(2, 0);
    const gameBuild = Buffer.alloc(4);
    gameBuild.writeUInt32LE(9999, 0);
    const strings = Buffer.concat([
      Buffer.from("Test Map", "utf8"), Buffer.from([0]),
      Buffer.from("Author", "utf8"), Buffer.from([0]),
      Buffer.from("Desc", "utf8"), Buffer.from([0]),
      Buffer.from("2v2", "utf8"), Buffer.from([0]),
    ]);
    const cameraBounds = Buffer.alloc(32);
    const cameraComplements = Buffer.alloc(16);
    const playableWidth = Buffer.alloc(4);
    playableWidth.writeUInt32LE(64, 0);
    const playableHeight = Buffer.alloc(4);
    playableHeight.writeUInt32LE(96, 0);
    const flags = Buffer.alloc(4);
    flags.writeUInt32LE(0x10, 0);
    const tileset = Buffer.from([0x4C]);
    const loadingScreenNumber = Buffer.alloc(4);
    loadingScreenNumber.writeInt32LE(2, 0);
    const loadingModel = Buffer.from("\0", "utf8");
    const loadingStrings = Buffer.from("Load text\0Load title\0Load subtitle\0", "utf8");
    const gameDataSet = Buffer.alloc(4);
    gameDataSet.writeUInt32LE(0, 0);
    const prologueModel = Buffer.from("\0", "utf8");
    const prologueStrings = Buffer.from("Prologue text\0Prologue title\0Prologue subtitle\0", "utf8");
    const fogAndWeather = Buffer.concat([
      Buffer.alloc(4),
      Buffer.alloc(12),
      Buffer.alloc(4),
      Buffer.alloc(4),
      Buffer.from("\0", "utf8"),
      Buffer.from([0x4C]),
      Buffer.alloc(4),
    ]);
    const scriptType = Buffer.alloc(4);
    scriptType.writeUInt32LE(1, 0);
    const supportedModes = Buffer.alloc(4);
    supportedModes.writeUInt32LE(1, 0);
    const gameDataVersion = Buffer.alloc(4);
    gameDataVersion.writeUInt32LE(2, 0);
    const playersCount = Buffer.alloc(4);
    playersCount.writeUInt32LE(4, 0);

    const binaryContent = Buffer.concat([
      formatVersion,
      mapVersion,
      editorVersion,
      gameMajor,
      gameMinor,
      gamePatch,
      gameBuild,
      strings,
      cameraBounds,
      cameraComplements,
      playableWidth,
      playableHeight,
      flags,
      tileset,
      loadingScreenNumber,
      loadingModel,
      loadingStrings,
      gameDataSet,
      prologueModel,
      prologueStrings,
      fogAndWeather,
      scriptType,
      supportedModes,
      gameDataVersion,
      playersCount,
    ]);
    writeFileSync(join(TEST_DIR, "war3map.w3i"), binaryContent);
    const result = readW3iFile(TEST_DIR);
    if (
      result.success &&
      result.bytesLength === binaryContent.length &&
      result.parsed === true &&
      result.summary?._placeholder === false &&
      result.summary?.formatVersion === 31 &&
      result.summary?.mapVersion === 7 &&
      result.summary?.editorVersion === 6108 &&
      result.summary?.gameVersion?.minor === 29 &&
      result.summary?.name === "Test Map" &&
      result.summary?.author === "Author" &&
      result.summary?.playableWidth === 64 &&
      result.summary?.playableHeight === 96 &&
      result.summary?.tileset === "L" &&
      result.summary?.scriptType === 1 &&
      result.summary?.playersCount === 4
    ) {
      console.log("✅ Test 2b: w3i binary with core metadata parsed - PASS");
      passed++;
    } else {
      console.log("❌ Test 2b: w3i binary with core metadata parsed - FAIL");
      console.log("  Result:", JSON.stringify(result, null, 2));
      failed++;
    }
    teardown();
  }

  // Test 2c: Read real sample w3i - PyWC3 folder map
  {
    const samplePath = join(process.cwd(), "tmp", "war3-samples", "PyWC3", "maps", "test.w3x", "war3map.w3i");
    const result = readW3iFile(samplePath);
    if (
      result.success &&
      result.parsed === true &&
      result.summary?._placeholder === false &&
      result.summary?.formatVersion === 31 &&
      result.summary?.mapVersion === 88 &&
      result.summary?.editorVersion === 6108 &&
      result.summary?.gameVersion?.major === 1 &&
      result.summary?.gameVersion?.minor === 32 &&
      result.summary?.gameVersion?.patch === 3 &&
      result.summary?.name === "TRIGSTR_001" &&
      result.summary?.author === "TRIGSTR_004" &&
      result.summary?.playableWidth === 52 &&
      result.summary?.playableHeight === 52 &&
      result.summary?.tileset === "L" &&
      result.summary?.scriptType === 1 &&
      result.summary?.playersCount === 2
    ) {
      console.log("✅ Test 2c: real sample w3i parsed - PASS");
      passed++;
    } else {
      console.log("❌ Test 2c: real sample w3i parsed - FAIL");
      console.log("  Result:", JSON.stringify(result, null, 2));
      failed++;
    }
  }

  // Test 3: Read w3e - file exists (placeholder content, no magic)
  {
    setup();
    const testContent = "mock w3e content with more bytes";
    writeFileSync(join(TEST_DIR, "war3map.w3e"), testContent);
    const result = readW3eFile(TEST_DIR);
    if (
      result.success &&
      result.bytesLength === testContent.length &&
      result.parsed === false &&
      result.summary?._placeholder === true &&
      result.summary?.magic === undefined
    ) {
      console.log("✅ Test 3: w3e file exists (placeholder parse) - PASS");
      passed++;
    } else {
      console.log("❌ Test 3: w3e file exists (placeholder parse) - FAIL");
      console.log("  Result:", JSON.stringify(result, null, 2));
      failed++;
    }
    teardown();
  }

  // Test 3b: Read w3e - binary file with real magic and version
  {
    setup();
    // Create minimal w3e binary: "W3E\0" magic + version (4 bytes, little-endian)
    // Version 11 w3e format (Classic/Reforged)
    const magic = Buffer.from([0x57, 0x33, 0x45, 0x00]); // "W3E\0"
    const version = Buffer.alloc(4);
    version.writeUInt32LE(11, 0); // version 11
    const binaryContent = Buffer.concat([magic, version]);
    writeFileSync(join(TEST_DIR, "war3map.w3e"), binaryContent);
    const result = readW3eFile(TEST_DIR);
    if (
      result.success &&
      result.bytesLength === 8 &&
      result.parsed === false && // Not enough data for full header
      result.summary?._placeholder === true
    ) {
      console.log("✅ Test 3b: w3e binary with magic/version only (placeholder) - PASS");
      passed++;
    } else {
      console.log("❌ Test 3b: w3e binary with magic/version only (placeholder) - FAIL");
      console.log("  Result:", JSON.stringify(result, null, 2));
      failed++;
    }
    teardown();
  }

  // Test 3c: Read w3e - binary file with full header (tileset + dimensions)
  {
    setup();
    // Create w3e binary with full header
    // Format: magic(4) + version(4) + mainTileset(1) + usesCustomTileset(4) + 
    //         groundTilesetCount(4) + cliffTilesetCount(4) + width(4) + height(4) + 
    //         horizontalOffset(4) + verticalOffset(4)
    const magic = Buffer.from([0x57, 0x33, 0x45, 0x00]); // "W3E\0"
    const version = Buffer.alloc(4);
    version.writeUInt32LE(11, 0); // version 11
    const mainTileset = Buffer.from([0x4C]); // 'L' for Lordaeron
    const usesCustomTileset = Buffer.alloc(4);
    usesCustomTileset.writeUInt32LE(0, 0); // no custom tileset
    const groundTilesetCount = Buffer.alloc(4);
    groundTilesetCount.writeUInt32LE(1, 0); // 1 ground tileset
    const groundTilesetId = Buffer.from([0x4C, 0x6F, 0x72, 0x64]); // "Lord"
    const cliffTilesetCount = Buffer.alloc(4);
    cliffTilesetCount.writeUInt32LE(1, 0); // 1 cliff tileset
    const cliffTilesetId = Buffer.from([0x43, 0x6C, 0x69, 0x66]); // "Clif"
    const width = Buffer.alloc(4);
    width.writeUInt32LE(64, 0); // 64 tiles wide
    const height = Buffer.alloc(4);
    height.writeUInt32LE(64, 0); // 64 tiles high
    const hOffset = Buffer.alloc(4);
    hOffset.writeFloatLE(-3200, 0); // horizontal offset
    const vOffset = Buffer.alloc(4);
    vOffset.writeFloatLE(-3200, 0); // vertical offset

    const binaryContent = Buffer.concat([
      magic, version, mainTileset, usesCustomTileset,
      groundTilesetCount, groundTilesetId, cliffTilesetCount, cliffTilesetId,
      width, height, hOffset, vOffset,
    ]);
    writeFileSync(join(TEST_DIR, "war3map.w3e"), binaryContent);
    const result = readW3eFile(TEST_DIR);
    if (
      result.success &&
      result.parsed === true &&
      result.summary?._placeholder === false &&
      result.summary?.magic === "W3E" &&
      result.summary?.version === 11 &&
      result.summary?.mainTileset === "L" &&
      result.summary?.usesCustomTileset === 0 &&
      result.summary?.width === 64 &&
      result.summary?.height === 64 &&
      result.summary?.horizontalOffset === -3200 &&
      result.summary?.verticalOffset === -3200 &&
      result.notes.some((n: string) => n.includes("64x64"))
    ) {
      console.log("✅ Test 3c: w3e binary with full header parsed - PASS");
      passed++;
    } else {
      console.log("❌ Test 3c: w3e binary with full header parsed - FAIL");
      console.log("  Result:", JSON.stringify(result, null, 2));
      failed++;
    }
    teardown();
  }

  // Test 4: Read units.doo - file exists (placeholder content, no magic)
  {
    setup();
    const testContent = "mock units doo";
    writeFileSync(join(TEST_DIR, "war3mapunits.doo"), testContent);
    const result = readUnitsDooFile(TEST_DIR);
    if (
      result.success &&
      result.bytesLength === testContent.length &&
      result.parsed === false &&
      result.summary?._placeholder === true &&
      result.summary?.magic === undefined
    ) {
      console.log("✅ Test 4: units.doo file exists (placeholder parse) - PASS");
      passed++;
    } else {
      console.log("❌ Test 4: units.doo file exists (placeholder parse) - FAIL");
      console.log("  Result:", JSON.stringify(result, null, 2));
      failed++;
    }
    teardown();
  }

  // Test 4b: Read units.doo - binary file with real magic, version and subVersion
  {
    setup();
    // Create minimal units.doo binary: "W3do" magic + version (4 bytes) + subVersion (4 bytes)
    // Format: version 8, subVersion 11 (Frozen Throne format)
    const magic = Buffer.from([0x57, 0x33, 0x64, 0x6F]); // "W3do"
    const version = Buffer.alloc(4);
    version.writeUInt32LE(8, 0); // version 8
    const subVersion = Buffer.alloc(4);
    subVersion.writeUInt32LE(11, 0); // subVersion 11
    const binaryContent = Buffer.concat([magic, version, subVersion]);
    writeFileSync(join(TEST_DIR, "war3mapunits.doo"), binaryContent);
    const result = readUnitsDooFile(TEST_DIR);
    if (
      result.success &&
      result.bytesLength === 12 &&
      result.parsed === true &&
      result.summary?._placeholder === false &&
      result.summary?.magic === "W3do" &&
      result.summary?.version === 8 &&
      result.summary?.subVersion === 11
    ) {
      console.log("✅ Test 4b: units.doo binary with magic/version/subVersion parsed - PASS");
      passed++;
    } else {
      console.log("❌ Test 4b: units.doo binary with magic/version/subVersion parsed - FAIL");
      console.log("  Result:", JSON.stringify(result, null, 2));
      failed++;
    }
    teardown();
  }

  // Test 4c: Read units.doo - v8 binary with object count and sample coordinates
  {
    setup();
    // Create units.doo v8 binary with 2 objects
    // Header: magic(4) + version(4) + subVersion(4) + unknown(4) + count(4) = 20 bytes
    const magic = Buffer.from([0x57, 0x33, 0x64, 0x6F]); // "W3do"
    const version = Buffer.alloc(4);
    version.writeUInt32LE(8, 0); // version 8
    const subVersion = Buffer.alloc(4);
    subVersion.writeUInt32LE(11, 0); // subVersion 11
    const unknown = Buffer.alloc(4);
    unknown.writeUInt32LE(0, 0);
    const objectCount = Buffer.alloc(4);
    objectCount.writeUInt32LE(2, 0); // 2 objects

    // Object 1: Unit "hfoo" (footman) at (100, 200, 0) owned by player 0
    const obj1Id = Buffer.from([0x68, 0x66, 0x6F, 0x6F]); // "hfoo"
    const obj1Variation = Buffer.alloc(4);
    obj1Variation.writeUInt32LE(0, 0);
    const obj1X = Buffer.alloc(4);
    obj1X.writeFloatLE(100.0, 0);
    const obj1Y = Buffer.alloc(4);
    obj1Y.writeFloatLE(200.0, 0);
    const obj1Z = Buffer.alloc(4);
    obj1Z.writeFloatLE(0.0, 0);
    const obj1Angle = Buffer.alloc(4);
    obj1Angle.writeFloatLE(0.0, 0);
    const obj1ScaleX = Buffer.alloc(4);
    obj1ScaleX.writeFloatLE(1.0, 0);
    const obj1ScaleY = Buffer.alloc(4);
    obj1ScaleY.writeFloatLE(1.0, 0);
    const obj1ScaleZ = Buffer.alloc(4);
    obj1ScaleZ.writeFloatLE(1.0, 0);
    const obj1Flags = Buffer.from([0x00]);
    const obj1PlayerId = Buffer.from([0x00]); // Player 0
    const obj1Health = Buffer.alloc(2);
    obj1Health.writeInt16LE(-1, 0);
    const obj1Mana = Buffer.alloc(2);
    obj1Mana.writeInt16LE(-1, 0);
    const obj1DroppedItemSet = Buffer.alloc(4);
    obj1DroppedItemSet.writeInt32LE(-1, 0);
    const obj1Gold = Buffer.alloc(4);
    obj1Gold.writeUInt32LE(0, 0);
    const obj1TargetAcquisition = Buffer.alloc(4);
    obj1TargetAcquisition.writeUInt32LE(0, 0);
    const obj1HeroLevel = Buffer.alloc(4);
    obj1HeroLevel.writeUInt32LE(0, 0); // Not a hero
    const obj1InventoryCount = Buffer.alloc(4);
    obj1InventoryCount.writeUInt32LE(0, 0);
    const obj1AbilityCount = Buffer.alloc(4);
    obj1AbilityCount.writeUInt32LE(0, 0);
    const obj1RandomType = Buffer.alloc(4);
    obj1RandomType.writeUInt32LE(0, 0); // Not random
    const obj1CustomColor = Buffer.alloc(4);
    obj1CustomColor.writeUInt32LE(0, 0);
    const obj1Waygate = Buffer.alloc(4);
    obj1Waygate.writeUInt32LE(0, 0);
    const obj1CreationNumber = Buffer.alloc(4);
    obj1CreationNumber.writeUInt32LE(1, 0);

    // Object 2: Item "gold" at (300, 400, 50) owned by player 15
    const obj2Id = Buffer.from([0x67, 0x6F, 0x6C, 0x64]); // "gold"
    const obj2Variation = Buffer.alloc(4);
    obj2Variation.writeUInt32LE(0, 0);
    const obj2X = Buffer.alloc(4);
    obj2X.writeFloatLE(300.0, 0);
    const obj2Y = Buffer.alloc(4);
    obj2Y.writeFloatLE(400.0, 0);
    const obj2Z = Buffer.alloc(4);
    obj2Z.writeFloatLE(50.0, 0);
    const obj2Angle = Buffer.alloc(4);
    obj2Angle.writeFloatLE(0.0, 0);
    const obj2ScaleX = Buffer.alloc(4);
    obj2ScaleX.writeFloatLE(1.0, 0);
    const obj2ScaleY = Buffer.alloc(4);
    obj2ScaleY.writeFloatLE(1.0, 0);
    const obj2ScaleZ = Buffer.alloc(4);
    obj2ScaleZ.writeFloatLE(1.0, 0);
    const obj2Flags = Buffer.from([0x00]);
    const obj2PlayerId = Buffer.from([0x0F]); // Player 15
    const obj2Health = Buffer.alloc(2);
    obj2Health.writeInt16LE(-1, 0);
    const obj2Mana = Buffer.alloc(2);
    obj2Mana.writeInt16LE(-1, 0);
    const obj2DroppedItemSet = Buffer.alloc(4);
    obj2DroppedItemSet.writeInt32LE(-1, 0);
    const obj2Gold = Buffer.alloc(4);
    obj2Gold.writeUInt32LE(0, 0);
    const obj2TargetAcquisition = Buffer.alloc(4);
    obj2TargetAcquisition.writeUInt32LE(0, 0);
    const obj2HeroLevel = Buffer.alloc(4);
    obj2HeroLevel.writeUInt32LE(0, 0); // Not a hero
    const obj2InventoryCount = Buffer.alloc(4);
    obj2InventoryCount.writeUInt32LE(0, 0);
    const obj2AbilityCount = Buffer.alloc(4);
    obj2AbilityCount.writeUInt32LE(0, 0);
    const obj2RandomType = Buffer.alloc(4);
    obj2RandomType.writeUInt32LE(0, 0); // Not random
    const obj2CustomColor = Buffer.alloc(4);
    obj2CustomColor.writeUInt32LE(0, 0);
    const obj2Waygate = Buffer.alloc(4);
    obj2Waygate.writeUInt32LE(0, 0);
    const obj2CreationNumber = Buffer.alloc(4);
    obj2CreationNumber.writeUInt32LE(2, 0);

    const obj1 = Buffer.concat([
      obj1Id, obj1Variation, obj1X, obj1Y, obj1Z, obj1Angle,
      obj1ScaleX, obj1ScaleY, obj1ScaleZ, obj1Flags, obj1PlayerId,
      obj1Health, obj1Mana, obj1DroppedItemSet, obj1Gold,
      obj1TargetAcquisition, obj1HeroLevel, obj1InventoryCount, obj1AbilityCount,
      obj1RandomType, obj1CustomColor, obj1Waygate, obj1CreationNumber,
    ]);

    const obj2 = Buffer.concat([
      obj2Id, obj2Variation, obj2X, obj2Y, obj2Z, obj2Angle,
      obj2ScaleX, obj2ScaleY, obj2ScaleZ, obj2Flags, obj2PlayerId,
      obj2Health, obj2Mana, obj2DroppedItemSet, obj2Gold,
      obj2TargetAcquisition, obj2HeroLevel, obj2InventoryCount, obj2AbilityCount,
      obj2RandomType, obj2CustomColor, obj2Waygate, obj2CreationNumber,
    ]);

    const binaryContent = Buffer.concat([
      magic, version, subVersion, unknown, objectCount, obj1, obj2,
    ]);
    writeFileSync(join(TEST_DIR, "war3mapunits.doo"), binaryContent);

    const result = readUnitsDooFile(TEST_DIR);
    if (
      result.success &&
      result.parsed === true &&
      result.summary?._placeholder === false &&
      result.summary?.magic === "W3do" &&
      result.summary?.version === 8 &&
      result.summary?.subVersion === 11 &&
      result.summary?.objectCount === 2 &&
      result.summary?.samples !== undefined &&
      result.summary.samples.length === 2 &&
      result.summary.samples[0].id === "hfoo" &&
      Math.abs(result.summary.samples[0].x - 100.0) < 0.01 &&
      Math.abs(result.summary.samples[0].y - 200.0) < 0.01 &&
      Math.abs(result.summary.samples[0].z - 0.0) < 0.01 &&
      result.summary.samples[0].owner === 0 &&
      result.summary.samples[1].id === "gold" &&
      Math.abs(result.summary.samples[1].x - 300.0) < 0.01 &&
      Math.abs(result.summary.samples[1].y - 400.0) < 0.01 &&
      Math.abs(result.summary.samples[1].z - 50.0) < 0.01 &&
      result.summary.samples[1].owner === 15
    ) {
      console.log("✅ Test 4c: units.doo v8 with object samples parsed - PASS");
      passed++;
    } else {
      console.log("❌ Test 4c: units.doo v8 with object samples parsed - FAIL");
      console.log("  Result:", JSON.stringify(result, null, 2));
      failed++;
    }
    teardown();
  }

  // Test 5: Read war3map.doo - file not found
  {
    const result = readDooFile("/nonexistent/path");
    if (!result.success && result.issues.length > 0 && result.bytesLength === 0) {
      console.log("✅ Test 5: war3map.doo file not found - PASS");
      passed++;
    } else {
      console.log("❌ Test 5: war3map.doo file not found - FAIL");
      console.log("  Result:", JSON.stringify(result, null, 2));
      failed++;
    }
  }

  // Test 5a: Read war3map.doo - file exists (placeholder content, no magic)
  {
    setup();
    const testContent = "mock doo content";
    writeFileSync(join(TEST_DIR, "war3map.doo"), testContent);
    const result = readDooFile(TEST_DIR);
    if (
      result.success &&
      result.bytesLength === testContent.length &&
      result.parsed === false &&
      result.summary?._placeholder === true &&
      result.summary?.magic === undefined
    ) {
      console.log("✅ Test 5a: war3map.doo file exists (placeholder parse) - PASS");
      passed++;
    } else {
      console.log("❌ Test 5a: war3map.doo file exists (placeholder parse) - FAIL");
      console.log("  Result:", JSON.stringify(result, null, 2));
      failed++;
    }
    teardown();
  }

  // Test 5b: Read war3map.doo - binary file with real magic, version and subVersion
  {
    setup();
    // Create minimal doo binary: "W3do" magic + version (4 bytes) + subVersion (4 bytes)
    // Format: version 8, subVersion 11 (Frozen Throne format)
    const magic = Buffer.from([0x57, 0x33, 0x64, 0x6F]); // "W3do"
    const version = Buffer.alloc(4);
    version.writeUInt32LE(8, 0); // version 8
    const subVersion = Buffer.alloc(4);
    subVersion.writeUInt32LE(11, 0); // subVersion 11
    const binaryContent = Buffer.concat([magic, version, subVersion]);
    writeFileSync(join(TEST_DIR, "war3map.doo"), binaryContent);
    const result = readDooFile(TEST_DIR);
    if (
      result.success &&
      result.bytesLength === 12 &&
      result.parsed === true &&
      result.summary?._placeholder === false &&
      result.summary?.magic === "W3do" &&
      result.summary?.version === 8 &&
      result.summary?.subVersion === 11
    ) {
      console.log("✅ Test 5b: war3map.doo binary with magic/version/subVersion parsed - PASS");
      passed++;
    } else {
      console.log("❌ Test 5b: war3map.doo binary with magic/version/subVersion parsed - FAIL");
      console.log("  Result:", JSON.stringify(result, null, 2));
      failed++;
    }
    teardown();
  }

  // Test 4d: Read real sample units.doo - v8 subVersion 9 (Reign of Chaos format)
  {
    const samplePath = join(process.cwd(), "tmp", "war3-samples", "PyWC3", "maps", "test.w3x", "war3mapUnits.doo");
    const result = readUnitsDooFile(samplePath);
    if (
      result.success &&
      result.parsed === true &&
      result.summary?._placeholder === false &&
      result.summary?.magic === "W3do" &&
      result.summary?.version === 8 &&
      result.summary?.subVersion === 9 &&
      result.summary?.objectCount === 2 &&
      result.summary?.samples !== undefined &&
      result.summary.samples.length >= 1 &&
      result.summary.samples[0].id === "sloc" &&
      Math.abs(result.summary.samples[0].x - 0.0) < 0.01 &&
      Math.abs(result.summary.samples[0].y - 0.0) < 0.01 &&
      Math.abs(result.summary.samples[0].z - 0.0) < 0.01
    ) {
      console.log("✅ Test 4d: real sample units.doo v8.9 parsed - PASS");
      passed++;
    } else {
      console.log("❌ Test 4d: real sample units.doo v8.9 parsed - FAIL");
      console.log("  Result:", JSON.stringify(result, null, 2));
      failed++;
    }
  }

  // Test 5c: Read war3map.doo - binary with doodad count and sample coordinates
  {
    setup();
    // Create doo binary with 3 doodads
    // Header: magic(4) + version(4) + subVersion(4) + doodadCount(4) = 16 bytes
    const magic = Buffer.from([0x57, 0x33, 0x64, 0x6F]); // "W3do"
    const version = Buffer.alloc(4);
    version.writeUInt32LE(8, 0); // version 8
    const subVersion = Buffer.alloc(4);
    subVersion.writeUInt32LE(11, 0); // subVersion 11
    const doodadCount = Buffer.alloc(4);
    doodadCount.writeUInt32LE(3, 0); // 3 doodads

    // Doodad record can include a skinId field in real maps; use the 54-byte layout here.
    function createDoodadRecord(id: string, x: number, y: number, z: number): Buffer {
      const idBuf = Buffer.from(id.padEnd(4, "\0").substring(0, 4));
      const variation = Buffer.alloc(4);
      const xBuf = Buffer.alloc(4);
      xBuf.writeFloatLE(x, 0);
      const yBuf = Buffer.alloc(4);
      yBuf.writeFloatLE(y, 0);
      const zBuf = Buffer.alloc(4);
      zBuf.writeFloatLE(z, 0);
      const angle = Buffer.alloc(4);
      const scaleX = Buffer.alloc(4);
      scaleX.writeFloatLE(1.0, 0);
      const scaleY = Buffer.alloc(4);
      scaleY.writeFloatLE(1.0, 0);
      const scaleZ = Buffer.alloc(4);
      scaleZ.writeFloatLE(1.0, 0);
      const skinId = Buffer.from(id.padEnd(4, "\0").substring(0, 4));
      const flags = Buffer.from([0x00]);
      const lifePercent = Buffer.from([0x64]); // 100%
      const itemTableId = Buffer.alloc(4);
      itemTableId.writeInt32LE(-1, 0);
      const itemSet = Buffer.alloc(4);
      itemSet.writeInt32LE(0, 0);
      const creationNumber = Buffer.alloc(4);
      creationNumber.writeInt32LE(0, 0);

      return Buffer.concat([
        idBuf, variation, xBuf, yBuf, zBuf, angle,
        scaleX, scaleY, scaleZ, skinId, flags, lifePercent, itemTableId, itemSet, creationNumber,
      ]);
    }

    const doodad1 = createDoodadRecord("LTex", 100.5, 200.5, 10.0); // Lordaeron Tree
    const doodad2 = createDoodadRecord("ZTsg", 300.0, 400.0, 0.0);  // Summer Tree
    const doodad3 = createDoodadRecord("OTip", 500.0, 600.0, 20.0); // Ice Tree

    // Special doodad section: version(4) + count(4) = 8 bytes header
    const specialVersion = Buffer.alloc(4);
    specialVersion.writeUInt32LE(0, 0);
    const specialCount = Buffer.alloc(4);
    specialCount.writeUInt32LE(2, 0); // 2 special doodads

    // Special doodad record: id(4) + x(4) + y(4) + z(4) = 16 bytes
    function createSpecialDoodadRecord(id: string, x: number, y: number, z: number): Buffer {
      const idBuf = Buffer.from(id.padEnd(4, "\0").substring(0, 4));
      const xBuf = Buffer.alloc(4);
      xBuf.writeFloatLE(x, 0);
      const yBuf = Buffer.alloc(4);
      yBuf.writeFloatLE(y, 0);
      const zBuf = Buffer.alloc(4);
      zBuf.writeFloatLE(z, 0);
      return Buffer.concat([idBuf, xBuf, yBuf, zBuf]);
    }

    const specialDoodad1 = createSpecialDoodadRecord("LTer", 150.0, 250.0, 0.0);
    const specialDoodad2 = createSpecialDoodadRecord("ZTtc", 350.0, 450.0, 0.0);

    const binaryContent = Buffer.concat([
      magic, version, subVersion, doodadCount,
      doodad1, doodad2, doodad3,
      specialVersion, specialCount, specialDoodad1, specialDoodad2,
    ]);
    writeFileSync(join(TEST_DIR, "war3map.doo"), binaryContent);

    const result = readDooFile(TEST_DIR);
    if (
      result.success &&
      result.parsed === true &&
      result.summary?._placeholder === false &&
      result.summary?.magic === "W3do" &&
      result.summary?.version === 8 &&
      result.summary?.subVersion === 11 &&
      result.summary?.doodadCount === 3 &&
      result.summary?.specialDoodadCount === 2 &&
      result.summary?.samples !== undefined &&
      result.summary.samples.length === 3 &&
      result.summary.samples[0].id === "LTex" &&
      Math.abs(result.summary.samples[0].x - 100.5) < 0.01 &&
      Math.abs(result.summary.samples[0].y - 200.5) < 0.01 &&
      Math.abs(result.summary.samples[0].z - 10.0) < 0.01 &&
      result.summary.samples[1].id === "ZTsg" &&
      Math.abs(result.summary.samples[1].x - 300.0) < 0.01 &&
      Math.abs(result.summary.samples[1].y - 400.0) < 0.01 &&
      Math.abs(result.summary.samples[1].z - 0.0) < 0.01
    ) {
      console.log("✅ Test 5c: war3map.doo with doodad count and samples parsed - PASS");
      passed++;
    } else {
      console.log("❌ Test 5c: war3map.doo with doodad count and samples parsed - FAIL");
      console.log("  Result:", JSON.stringify(result, null, 2));
      failed++;
    }
    teardown();
  }

  // Test 5d: Read real sample war3map.doo - PyWC3 folder map
  {
    const samplePath = join(process.cwd(), "tmp", "war3-samples", "PyWC3", "maps", "test.w3x", "war3map.doo");
    const result = readDooFile(samplePath);

    if (
      result.success &&
      result.parsed === true &&
      result.summary?._placeholder === false &&
      result.summary?.magic === "W3do" &&
      result.summary?.version === 8 &&
      result.summary?.subVersion === 11 &&
      result.summary?.doodadCount === 3 &&
      result.summary?.samples !== undefined &&
      result.summary.samples.length === 3 &&
      result.summary.samples.every((sample) => sample.id === "DTfp") &&
      Math.abs(result.summary.samples[0].x - 128.0) < 0.01 &&
      Math.abs(result.summary.samples[1].x - 256.0) < 0.01 &&
      Math.abs(result.summary.samples[2].x - 384.0) < 0.01
    ) {
      console.log("✅ Test 5d: real sample war3map.doo parsed - PASS");
      passed++;
    } else {
      console.log("❌ Test 5d: real sample war3map.doo parsed - FAIL");
      console.log("  Result:", JSON.stringify(result, null, 2));
      failed++;
    }
  }

  // Test 6: Type guards
  {
    setup();
    writeFileSync(join(TEST_DIR, "war3map.w3i"), "test");
    const w3iResult = readW3iFile(TEST_DIR);
    const w3eResult = readW3eFile(TEST_DIR);
    const unitsDooResult = readUnitsDooFile(TEST_DIR);
    const dooResult = readDooFile(TEST_DIR);

    if (
      isW3iParseResult(w3iResult) &&
      isW3eParseResult(w3eResult) &&
      isUnitsDooParseResult(unitsDooResult) &&
      isDooParseResult(dooResult) &&
      !isW3iParseResult(null) &&
      !isW3iParseResult("string")
    ) {
      console.log("✅ Test 6: Type guards work correctly - PASS");
      passed++;
    } else {
      console.log("❌ Test 6: Type guards work correctly - FAIL");
      failed++;
    }
    teardown();
  }

  // Test 7: Read w3i with direct file path
  {
    setup();
    const filePath = join(TEST_DIR, "direct.w3i");
    writeFileSync(filePath, "direct test");
    const result = readW3iFile(filePath);
    if (result.success && result.sourceFile === filePath) {
      console.log("✅ Test 7: w3i direct file path - PASS");
      passed++;
    } else {
      console.log("❌ Test 7: w3i direct file path - FAIL");
      console.log("  Result:", JSON.stringify(result, null, 2));
      failed++;
    }
    teardown();
  }

  // Test 8: Read doo with direct file path
  {
    setup();
    const filePath = join(TEST_DIR, "direct.doo");
    writeFileSync(filePath, "direct doo test");
    const result = readDooFile(filePath);
    if (result.success && result.sourceFile === filePath) {
      console.log("✅ Test 8: doo direct file path - PASS");
      passed++;
    } else {
      console.log("❌ Test 8: doo direct file path - FAIL");
      console.log("  Result:", JSON.stringify(result, null, 2));
      failed++;
    }
    teardown();
  }

  console.log(`\n${"=".repeat(40)}`);
  console.log(`Results: ${passed} passed, ${failed} failed`);

  return failed === 0;
}

// Run tests if executed directly
const isDirectExecution = import.meta.url.startsWith("file://");
if (isDirectExecution) {
  const success = runTests();
  process.exit(success ? 0 : 1);
}

export { runTests };
