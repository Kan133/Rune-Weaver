import assert from "node:assert/strict";

import { createWritePlan } from "./planning.js";
import { createCanonicalTalentDrawFeatureModel, getTalentDrawSourceArtifactRelativePath } from "../../../adapters/dota2/cases/talent-draw-adapter.js";

function testCreateWritePlanUsesStableFeatureIdForCreate(): void {
  const assemblyPlan = {
    blueprintId: "standalone_system_abcd",
    selectedPatterns: [
      {
        patternId: "input.key_binding",
        role: "input_trigger",
        parameters: {
          triggerKey: "F4",
        },
      },
    ],
    writeTargets: [],
    readyForHostWrite: true,
    hostWriteReadiness: {
      blockers: [],
    },
    parameters: {},
  } as any;

  const { writePlan, issues } = createWritePlan(
    assemblyPlan,
    "D:\\test3",
    null,
    "create",
    undefined,
    undefined,
    "talent_draw_demo",
  );

  assert.deepEqual(issues, []);
  assert.ok(writePlan);
  assert.equal(
    writePlan!.entries.every((entry) => entry.targetPath.includes("talent_draw_demo")),
    true,
  );
}

function testCreateWritePlanAppendsTalentDrawSourceArtifact(): void {
  const sourceModel = createCanonicalTalentDrawFeatureModel("talent_draw_demo");
  const assemblyPlan = {
    blueprintId: "standalone_system_abcd",
    selectedPatterns: [
      {
        patternId: "input.key_binding",
        role: "input_trigger",
        parameters: {
          triggerKey: "F4",
        },
      },
    ],
    writeTargets: [],
    readyForHostWrite: true,
    hostWriteReadiness: {
      blockers: [],
    },
    parameters: {
      rwFeatureSourceModel: sourceModel,
      rwFeatureSourceModelRef: {
        adapter: "talent-draw",
        version: 1,
        path: getTalentDrawSourceArtifactRelativePath("talent_draw_demo"),
      },
    },
  } as any;

  const { writePlan, issues } = createWritePlan(
    assemblyPlan,
    "D:\\test3",
    null,
    "create",
    undefined,
    undefined,
    "talent_draw_demo",
  );

  assert.deepEqual(issues, []);
  assert.ok(writePlan);
  const jsonEntry = writePlan!.entries.find((entry) => entry.contentType === "json");
  assert.ok(jsonEntry);
  assert.equal(jsonEntry!.targetPath, getTalentDrawSourceArtifactRelativePath("talent_draw_demo"));
  assert.equal(jsonEntry!.sourcePattern, "rw.feature_source_model");
}

function runTests(): void {
  testCreateWritePlanUsesStableFeatureIdForCreate();
  testCreateWritePlanAppendsTalentDrawSourceArtifact();
  console.log("apps/cli/dota2/planning.test.ts: PASS");
}

runTests();
