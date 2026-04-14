import assert from "assert/strict";
import { mkdtempSync, writeFileSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

import { buildWar3DerivedWorkspaceView } from "./index.js";
import type { ProjectContext } from "../workspace/types.js";
import type { War3ProjectScanResult } from "../scanner/project-scan.js";

function createWorkspace(files: Record<string, Buffer>): string {
  const root = mkdtempSync(join(tmpdir(), "rw-war3-derived-"));
  for (const [name, buffer] of Object.entries(files)) {
    writeFileSync(join(root, name), buffer);
  }
  return root;
}

function createW3i(version = 7): Buffer {
  const buffer = Buffer.alloc(8);
  buffer.write("W3I", 0, "ascii");
  buffer.writeUInt32LE(version, 4);
  return buffer;
}

function createW3e(width: number, height: number, offsetX: number, offsetY: number): Buffer {
  const buffer = Buffer.alloc(37);
  buffer.write("W3E", 0, "ascii");
  buffer[3] = 0;
  buffer.writeUInt32LE(1, 4);
  buffer.write("A", 8, "ascii");
  buffer.writeUInt32LE(0, 9);
  buffer.writeUInt32LE(0, 13);
  buffer.writeUInt32LE(0, 17);
  buffer.writeUInt32LE(width, 21);
  buffer.writeUInt32LE(height, 25);
  buffer.writeInt32LE(offsetX, 29);
  buffer.writeInt32LE(offsetY, 33);
  return buffer;
}

function createUnitsRecord(id: string, x: number, y: number, z: number, owner: number): Buffer {
  const buffer = Buffer.alloc(82);
  buffer.write(id.padEnd(4, "\0").slice(0, 4), 0, "ascii");
  buffer.writeUInt32LE(0, 4);
  buffer.writeFloatLE(x, 8);
  buffer.writeFloatLE(y, 12);
  buffer.writeFloatLE(z, 16);
  buffer.writeFloatLE(0, 20);
  buffer.writeFloatLE(1, 24);
  buffer.writeFloatLE(1, 28);
  buffer.writeFloatLE(1, 32);
  buffer.writeUInt8(0, 36);
  buffer.writeUInt8(owner, 37);
  buffer.writeInt16LE(100, 38);
  buffer.writeInt16LE(100, 40);
  buffer.writeInt32LE(-1, 42);
  buffer.writeInt32LE(0, 46);
  buffer.writeInt32LE(0, 50);
  buffer.writeInt32LE(0, 54);
  buffer.writeUInt32LE(0, 58);
  buffer.writeUInt32LE(0, 62);
  buffer.writeUInt32LE(0, 66);
  buffer.writeUInt32LE(0, 70);
  buffer.writeUInt32LE(0, 74);
  buffer.writeUInt32LE(0, 78);
  return buffer;
}

function createUnitsDoo(samples: Array<{ id: string; x: number; y: number; z: number; owner: number }>): Buffer {
  const header = Buffer.alloc(20);
  header.write("W3do", 0, "ascii");
  header.writeUInt32LE(8, 4);
  header.writeUInt32LE(11, 8);
  header.writeUInt32LE(0, 12);
  header.writeUInt32LE(samples.length, 16);
  const records = samples.map((sample) => createUnitsRecord(sample.id, sample.x, sample.y, sample.z, sample.owner));
  return Buffer.concat([header, ...records]);
}

function createDooRecord(id: string, x: number, y: number, z: number): Buffer {
  const buffer = Buffer.alloc(50);
  buffer.write(id.padEnd(4, "\0").slice(0, 4), 0, "ascii");
  buffer.writeUInt32LE(0, 4);
  buffer.writeFloatLE(x, 8);
  buffer.writeFloatLE(y, 12);
  buffer.writeFloatLE(z, 16);
  buffer.writeFloatLE(0, 20);
  buffer.writeFloatLE(1, 24);
  buffer.writeFloatLE(1, 28);
  buffer.writeFloatLE(1, 32);
  buffer.writeUInt8(0, 36);
  buffer.writeUInt8(100, 37);
  buffer.writeInt32LE(-1, 38);
  buffer.writeInt32LE(0, 42);
  buffer.writeInt32LE(0, 46);
  return buffer;
}

function createDoo(samples: Array<{ id: string; x: number; y: number; z: number }>): Buffer {
  const header = Buffer.alloc(16);
  header.write("W3do", 0, "ascii");
  header.writeUInt32LE(8, 4);
  header.writeUInt32LE(11, 8);
  header.writeUInt32LE(samples.length, 12);
  const records = samples.map((sample) => createDooRecord(sample.id, sample.x, sample.y, sample.z));
  return Buffer.concat([header, ...records]);
}

function makeContext(workspaceRoot: string): ProjectContext {
  return {
    hostKind: "war3-classic",
    workspaceRoot,
    scanResult: {
      valid: true,
      path: workspaceRoot,
      hostType: "war3-classic",
      files: {
        required: {} as War3ProjectScanResult["files"]["required"],
        scripts: {} as War3ProjectScanResult["files"]["scripts"],
        p0Optional: {} as War3ProjectScanResult["files"]["p0Optional"],
        p1Optional: {} as War3ProjectScanResult["files"]["p1Optional"],
      },
      issues: [],
      notes: [],
    },
    scriptEntry: undefined,
    p0SourceFiles: [],
    parserReadyFiles: {},
    notes: [],
    issues: [],
  };
}

function testUnitsSampleAnchors() {
  const root = createWorkspace({
    "war3map.w3i": createW3i(),
    "war3map.w3e": createW3e(4, 4, 0, 0),
    "war3mapunits.doo": createUnitsDoo([
      { id: "hfoo", x: 10, y: 10, z: 0, owner: 2 },
      { id: "oarc", x: 400, y: 400, z: 0, owner: 7 },
    ]),
  });

  const view = buildWar3DerivedWorkspaceView(makeContext(root));
  const suggestions = view.anchorCandidates?.suggestions;

  assert.ok(suggestions);
  assert.equal(suggestions?.length, 2);
  assert.deepEqual(suggestions?.[0], {
    id: "hfoo",
    x: 10,
    y: 10,
    z: 0,
    kind: "unit",
    regionHint: "northwest",
    label: "hfoo (P2)",
    reason: "sampled-from-units-doo",
    owner: 2,
  });
  assert.equal(suggestions?.[1]?.regionHint, "southeast");
  assert.equal(suggestions?.[1]?.kind, "unit");
}

function testDoodadSampleLandmarks() {
  const root = createWorkspace({
    "war3map.w3i": createW3i(),
    "war3map.w3e": createW3e(4, 4, 0, 0),
    "war3map.doo": createDoo([
      { id: "LTlt", x: 256, y: 256, z: 0 },
    ]),
  });

  const view = buildWar3DerivedWorkspaceView(makeContext(root));
  const suggestions = view.doodadCandidates?.suggestions;

  assert.ok(suggestions);
  assert.equal(suggestions?.length, 1);
  assert.deepEqual(suggestions?.[0], {
    id: "LTlt",
    x: 256,
    y: 256,
    z: 0,
    kind: "doodad",
    regionHint: "center",
    label: "LTlt",
    reason: "sampled-from-doodads",
  });
}

function testUnknownRegionWithoutCanvasHint() {
  const root = createWorkspace({
    "war3mapunits.doo": createUnitsDoo([
      { id: "hfoo", x: 10, y: 10, z: 0, owner: 1 },
    ]),
  });

  const view = buildWar3DerivedWorkspaceView(makeContext(root));
  const suggestion = view.anchorCandidates?.suggestions?.[0];

  assert.ok(suggestion);
  assert.equal(suggestion?.regionHint, "unknown");
  assert.equal(suggestion?.kind, "unit");
}

const cases = [
  ["units sample -> anchor suggestions", testUnitsSampleAnchors],
  ["doodad sample -> landmark suggestions", testDoodadSampleLandmarks],
  ["missing canvasHint -> region unknown", testUnknownRegionWithoutCanvasHint],
] as const;

for (const [name, fn] of cases) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

console.log(`Passed ${cases.length} derived suggestion tests.`);
