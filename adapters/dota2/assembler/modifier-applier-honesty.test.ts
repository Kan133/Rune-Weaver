import assert from "node:assert/strict";

import { createWritePlan } from "./index.js";
import type { AssemblyPlan, GeneratorRoutingPlan, HostRealizationPlan } from "../../../core/schema/types.js";

const assemblyPlan: AssemblyPlan = {
  blueprintId: "bp_modifier_honesty",
  selectedPatterns: [
    {
      patternId: "effect.modifier_applier",
      role: "modifier_effect",
      parameters: {
        modifierId: "buff_attack_damage",
        duration: 10,
        stacks: 1,
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
  sourceBlueprintId: "bp_modifier_honesty",
  units: [
    {
      id: "unit_modifier",
      sourceModuleId: "modifier_effect",
      sourcePatternIds: ["effect.modifier_applier"],
      role: "gameplay-core",
      realizationType: "kv+lua",
      hostTargets: ["lua_ability", "ability_kv"],
      outputs: [
        { kind: "lua", target: "lua_ability", rationale: ["lua runtime"] },
        { kind: "kv", target: "ability_kv", rationale: ["kv shell"] },
      ],
      rationale: ["family fit: modifier-runtime"],
      confidence: "high",
    },
  ],
  blockers: [],
  notes: [],
};

const routingPlan: GeneratorRoutingPlan = {
  version: "1.0",
  host: "dota2",
  sourceBlueprintId: "bp_modifier_honesty",
  routes: [
    {
      id: "route_modifier_lua",
      sourceUnitId: "unit_modifier",
      generatorFamily: "dota2-lua",
      routeKind: "lua",
      hostTarget: "lua_ability",
      sourcePatternIds: ["effect.modifier_applier"],
      parameters: {
        modifierId: "buff_attack_damage",
        duration: 10,
        stacks: 1,
      },
      rationale: ["lua runtime route"],
    },
    {
      id: "route_modifier_kv",
      sourceUnitId: "unit_modifier",
      generatorFamily: "dota2-kv",
      routeKind: "kv",
      hostTarget: "ability_kv",
      sourcePatternIds: ["effect.modifier_applier"],
      parameters: {
        modifierId: "buff_attack_damage",
        duration: 10,
        stacks: 1,
      },
      rationale: ["kv shell route"],
    },
  ],
  warnings: [],
  blockers: [],
};

const writePlan = createWritePlan(
  assemblyPlan,
  "D:\\test-host",
  "standalone_system_modifier",
  routingPlan,
  hostRealizationPlan
);

assert.equal(writePlan.entries.length, 2);
assert.equal(writePlan.stats.deferred, 2);

for (const entry of writePlan.entries) {
  assert.equal(entry.sourcePattern, "effect.modifier_applier");
  assert.equal(entry.deferred, true);
  assert.match(entry.deferredReason || "", /remains deferred/i);
  assert.match(entry.deferredReason || "", /same-file ability modifier slices such as dota2\.short_time_buff/i);
}

const luaEntry = writePlan.entries.find((entry) => entry.contentType === "lua");
const kvEntry = writePlan.entries.find((entry) => entry.contentType === "kv");

assert.ok(luaEntry);
assert.ok(kvEntry);
assert.equal(luaEntry!.generatorFamilyHint, "dota2-lua");
assert.equal(kvEntry!.generatorFamilyHint, "dota2-kv");
assert.equal(luaEntry!.metadata?.modifierConfig, undefined);
assert.equal(
  writePlan.deferredWarnings?.[0],
  `[effect.modifier_applier] ${writePlan.entries[0].deferredReason}`
);

console.log("adapters/dota2/assembler/modifier-applier-honesty.test.ts passed");
