import assert from "assert";

import type { Blueprint } from "../../../../core/schema/types.js";
import type { RuneWeaverFeatureRecord } from "../../../../core/workspace/index.js";
import type { PatternResolutionResult } from "../../../../core/patterns/resolver.js";
import { mergePatternInheritanceForUpdate } from "./update.js";

const existingFeature: Pick<RuneWeaverFeatureRecord, "selectedPatterns" | "generatedFiles" | "featureId"> = {
  featureId: "talent_draw_demo",
  selectedPatterns: [
    "input.key_binding",
    "data.weighted_pool",
    "rule.selection_flow",
  ],
  generatedFiles: [
    "game/scripts/src/rune_weaver/generated/server/talent_draw_demo_input_trigger_input_key_binding.ts",
    "game/scripts/src/rune_weaver/generated/shared/talent_draw_demo_weighted_pool_data_weighted_pool.ts",
    "game/scripts/src/rune_weaver/generated/server/talent_draw_demo_selection_flow_rule_selection_flow.ts",
  ],
};

const blueprint = {
  modules: [
    {
      id: "mod_input",
      role: "input_trigger",
      category: "trigger",
      parameters: {
        triggerKey: "F5",
        key: "F5",
        eventName: "rune_weaver_selection_pool_triggered",
      },
    },
    {
      id: "mod_pool",
      role: "weighted_pool",
      category: "data",
      parameters: {
        entries: [{ id: "A" }],
      },
    },
    {
      id: "mod_flow",
      role: "selection_flow",
      category: "rule",
      parameters: {
        choiceCount: 3,
      },
    },
  ],
} as unknown as Blueprint;

const resolutionPatterns: PatternResolutionResult["patterns"] = [
  {
    patternId: "data.weighted_pool",
    role: "weighted_pool",
    parameters: {
      entries: [{ id: "A" }, { id: "B" }],
    },
    priority: "required",
    source: "need",
  },
  {
    patternId: "rule.selection_flow",
    role: "selection_flow",
    parameters: {
      choiceCount: 3,
    },
    priority: "required",
    source: "need",
  },
];

const merged = mergePatternInheritanceForUpdate(existingFeature, resolutionPatterns, blueprint);
const keyBinding = merged.find((pattern) => pattern.patternId === "input.key_binding");

assert(keyBinding, "input.key_binding should be preserved from the existing feature");
assert.strictEqual(keyBinding?.role, "input_trigger");
assert.strictEqual(keyBinding?.parameters?.triggerKey, "F5");
assert.strictEqual(keyBinding?.parameters?.key, "F5");
assert.strictEqual(keyBinding?.parameters?.eventName, "rune_weaver_selection_pool_triggered");

const keyDeltaBlueprint = {
  modules: [
    {
      id: "mod_input",
      role: "input_trigger",
      category: "trigger",
      parameters: {
        fromKey: "F4",
        toKey: "F5",
      },
    },
  ],
} as unknown as Blueprint;

const mergedFromDelta = mergePatternInheritanceForUpdate(existingFeature, [], keyDeltaBlueprint);
const deltaKeyBinding = mergedFromDelta.find((pattern) => pattern.patternId === "input.key_binding");

assert(deltaKeyBinding, "input.key_binding should normalize update delta key params");
assert.strictEqual(deltaKeyBinding?.parameters?.fromKey, "F4");
assert.strictEqual(deltaKeyBinding?.parameters?.toKey, "F5");
assert.strictEqual(deltaKeyBinding?.parameters?.triggerKey, "F5");
assert.strictEqual(deltaKeyBinding?.parameters?.key, "F5");

const promptFallbackBlueprint = {
  summary: "把天赋抽取的触发键从 F4 改成 F5，其他行为保持不变。",
  sourceIntent: {
    goal: "把天赋抽取的触发键从 F4 改成 F5，其他行为保持不变。",
  },
  modules: [
    {
      id: "mod_typed_req_change_trigger_key",
      role: "change_trigger_key",
      category: "trigger",
      parameters: {
        key: "F4",
      },
    },
  ],
} as unknown as Blueprint;

const mergedFromPromptFallback = mergePatternInheritanceForUpdate(existingFeature, [], promptFallbackBlueprint);
const promptFallbackKeyBinding = mergedFromPromptFallback.find((pattern) => pattern.patternId === "input.key_binding");

assert(promptFallbackKeyBinding, "input.key_binding should fall back to prompt-derived trigger key");
assert.strictEqual(promptFallbackKeyBinding?.parameters?.triggerKey, "F5");
assert.strictEqual(promptFallbackKeyBinding?.parameters?.key, "F5");

console.log("update-pattern-inheritance.test.ts: PASS");
