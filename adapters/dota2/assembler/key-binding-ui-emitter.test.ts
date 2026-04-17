import assert from "node:assert/strict";

import { createWritePlan } from "./index.js";
import type { AssemblyPlan, GeneratorRoutingPlan, HostRealizationPlan } from "../../../core/schema/types.js";

const assemblyPlan: AssemblyPlan = {
  blueprintId: "bp_key_binding_emitter",
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
  bridgeUpdates: [],
  validations: [],
  readyForHostWrite: true,
};

const hostRealizationPlan: HostRealizationPlan = {
  version: "1.0",
  host: "dota2",
  sourceBlueprintId: "bp_key_binding_emitter",
  units: [
    {
      id: "unit_input_trigger",
      sourceModuleId: "mod_input_trigger",
      sourcePatternIds: ["input.key_binding"],
      role: "runtime-primary",
      realizationType: "ts",
      hostTargets: ["server_ts"],
      outputs: [
        {
          kind: "typescript",
          target: "server_ts",
          rationale: ["input key binding server runtime"],
        },
      ],
      rationale: ["key binding trigger"],
      confidence: "medium",
    },
  ],
  blockers: [],
  notes: [],
};

const routingPlan: GeneratorRoutingPlan = {
  version: "1.0",
  host: "dota2",
  sourceBlueprintId: "bp_key_binding_emitter",
  routes: [
    {
      id: "route_input_trigger",
      sourceUnitId: "unit_input_trigger",
      generatorFamily: "dota2-ts",
      routeKind: "ts",
      hostTarget: "server_ts",
      sourcePatternIds: ["input.key_binding"],
      parameters: {
        triggerKey: "F4",
        eventName: "rune_weaver_selection_pool_triggered",
      },
      rationale: ["input key binding runtime route"],
    },
  ],
  warnings: [],
  blockers: [],
};

const writePlan = createWritePlan(
  assemblyPlan,
  "D:\\test-host",
  "talent_draw_demo",
  routingPlan,
  hostRealizationPlan,
);

const serverEntry = writePlan.entries.find(
  (entry) => entry.targetPath === "game/scripts/src/rune_weaver/generated/server/talent_draw_demo_input_trigger_input_key_binding.ts",
);
const emitterEntry = writePlan.entries.find(
  (entry) => entry.targetPath === "content/panorama/src/rune_weaver/generated/ui/talent_draw_demo_input_trigger_input_key_binding_emitter.tsx",
);

assert.ok(serverEntry, "server key binding entry should exist");
assert.ok(emitterEntry, "ui emitter entry should exist");
assert.equal(emitterEntry?.sourcePattern, "input.key_binding");
assert.equal(emitterEntry?.contentType, "tsx");
assert.equal(emitterEntry?.generatorFamilyHint, "dota2-ui");
assert.equal(emitterEntry?.parameters?.triggerKey, "F4");
assert.equal(emitterEntry?.parameters?.eventName, "rune_weaver_selection_pool_triggered");

console.log("adapters/dota2/assembler/key-binding-ui-emitter.test.ts passed");
