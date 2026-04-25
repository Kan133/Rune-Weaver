import assert from "node:assert/strict";

import type { IntentSchema, WorkspaceSemanticContext } from "../schema/types.js";
import { hasAmbiguousRelationCandidates, resolveRelationCandidates } from "./relation-resolver.js";

function createSchema(): IntentSchema {
  return {
    version: "1.0",
    host: { kind: "dota2-x-template" },
    request: {
      rawPrompt: "给 talent_draw_demo 增加一个常驻库存界面，玩家每次确认后都放进去",
      goal: "给 talent_draw_demo 增加一个常驻库存界面，玩家每次确认后都放进去",
    },
    classification: {
      intentKind: "cross-system-composition",
      confidence: "high",
    },
    requirements: {
      functional: ["给 talent_draw_demo 增加一个常驻库存界面，玩家每次确认后都放进去"],
    },
    composition: {
      dependencies: [
        {
          kind: "same-feature",
          relation: "reads",
          target: "talent_draw_demo",
          required: true,
        },
      ],
    },
    constraints: {},
    normalizedMechanics: {
      candidatePool: true,
      playerChoice: true,
      uiModal: true,
      outcomeApplication: true,
    },
    resolvedAssumptions: [],
  };
}

function testResolveRelationCandidatesDedupesAliasesForSameFeature() {
  const context: WorkspaceSemanticContext = {
    featureCount: 1,
    features: [
      {
        featureId: "talent_draw_demo",
        featureName: "Talent Draw Demo",
        aliases: ["talent_draw_demo", "talent draw demo"],
        intentKind: "standalone-system",
        selectedPatterns: [],
        sourceBacked: true,
        integrationPoints: [],
        semanticHints: [],
      },
    ],
  };

  const candidates = resolveRelationCandidates({
    rawText: "给 talent_draw_demo 增加一个常驻库存界面，玩家每次确认后都放进去",
    schema: createSchema(),
    workspaceSemanticContext: context,
  });

  assert.equal(candidates.length, 1);
  assert.equal(candidates[0]?.targetFeatureId, "talent_draw_demo");
  assert.equal(hasAmbiguousRelationCandidates(candidates), false);
}

function runTests() {
  testResolveRelationCandidatesDedupesAliasesForSameFeature();
  console.log("core/wizard/relation-resolver.test.ts passed");
}

runTests();
