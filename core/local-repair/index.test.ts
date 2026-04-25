import assert from "node:assert/strict";

import type { Blueprint } from "../schema/types.js";
import type { WritePlan } from "../../adapters/dota2/assembler/index.js";
import {
  runLocalRepair,
  runLocalRepairWithLLM,
} from "./index.js";

function makeRepairBlueprint(): Blueprint {
  return {
    id: "rw_fire_dash",
    version: "1.0",
    summary: "Exploratory fire dash repair test.",
    sourceIntent: {
      intentKind: "micro-feature",
      goal: "Create a fire dash ability.",
      normalizedMechanics: {
        trigger: true,
        outcomeApplication: true,
      },
    },
    modules: [],
    connections: [],
    patternHints: [],
    assumptions: [],
    validations: [],
    readyForAssembly: false,
    fillContracts: [
      {
        boundaryId: "fire_dash_body",
        targetModuleId: "fire_dash_core",
        targetPatternId: "synthesized.fire_dash_core",
        mode: "closed",
        sourceBindings: ["artifact.body"],
        allowed: ["Replace the placeholder body with concrete Lua statements."],
        forbidden: ["Do not change feature ownership or routing."],
        invariants: ["Stay inside the placeholder body only."],
        expectedOutput: "Concrete Lua statements replacing the local repair placeholder.",
        fallbackPolicy: "deterministic-default",
      },
    ],
    validationStatus: {
      status: "failed",
      warnings: [],
      blockers: [],
      repair: {
        status: "failed",
        warnings: ["Missing synthesized body implementation."],
        blockers: [],
      },
    },
  } as Blueprint;
}

function makeRepairWritePlan(): WritePlan {
  return {
    id: "repair-test",
    targetProject: "D:\\test3",
    generatedAt: "2026-04-19T00:00:00.000Z",
    entries: [
      {
        operation: "create",
        targetPath: "game/scripts/vscripts/rune_weaver/abilities/rw_fire_dash.lua",
        contentType: "lua",
        contentSummary: "Synthesized Lua ability shell",
        sourcePattern: "synthesized.fire_dash_core",
        sourceModule: "fire_dash_core",
        safe: true,
        metadata: {
          synthesizedContent: [
            "function rw_fire_dash:OnSpellStart()",
            "__RW_MUSCLE_FILL_ABILITY_BODY__",
            "end",
          ].join("\n"),
          localRepairRequested: true,
          validationFailure: "Missing muscle-fill ability body.",
          repairBoundaryId: "fire_dash_body",
        },
      },
    ],
    stats: {
      total: 1,
      create: 1,
      update: 0,
      conflicts: 0,
      deferred: 0,
    },
    executionOrder: [0],
    namespaceRoots: {
      server: "game/scripts/src/rune_weaver",
      panorama: "content/panorama/src/rune_weaver",
    },
  };
}

async function withDisabledLLM<T>(run: () => Promise<T>): Promise<T> {
  const keys = [
    "RW_LLM_PROCESS_ENV_OVERRIDES",
    "LLM_PROVIDER",
    "OPENAI_BASE_URL",
    "OPENAI_API_KEY",
    "OPENAI_MODEL",
    "ANTHROPIC_API_KEY",
    "ANTHROPIC_MODEL",
  ] as const;
  const snapshot = new Map<string, string | undefined>(keys.map((key) => [key, process.env[key]]));

  process.env.RW_LLM_PROCESS_ENV_OVERRIDES = "1";
  process.env.LLM_PROVIDER = "";
  process.env.OPENAI_BASE_URL = "";
  process.env.OPENAI_API_KEY = "";
  process.env.OPENAI_MODEL = "";
  process.env.ANTHROPIC_API_KEY = "";
  process.env.ANTHROPIC_MODEL = "";

  try {
    return await run();
  } finally {
    for (const key of keys) {
      const value = snapshot.get(key);
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }
}

async function testRunLocalRepairWithLLMFallsBackToDeterministicRepair() {
  const blueprint = makeRepairBlueprint();
  const baselineWritePlan = makeRepairWritePlan();
  const wrapperWritePlan = makeRepairWritePlan();
  const deterministic = runLocalRepair(blueprint, baselineWritePlan);
  const withFallback = await withDisabledLLM(() =>
    runLocalRepairWithLLM(blueprint, wrapperWritePlan)
  );

  assert.deepEqual(withFallback, deterministic);
  assert.equal(withFallback.attempted, true);
  assert.equal(withFallback.repairedTargets.length, 1);
  assert.ok(
    String(wrapperWritePlan.entries[0]?.metadata?.synthesizedContent).includes("EmitSoundOn"),
  );
}

async function runTests() {
  await testRunLocalRepairWithLLMFallsBackToDeterministicRepair();
  console.log("core/local-repair/index.test.ts passed");
}

runTests();
