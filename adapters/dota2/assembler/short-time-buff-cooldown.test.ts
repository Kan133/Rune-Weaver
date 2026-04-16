import assert from "node:assert/strict";

import { createWritePlan } from "./index.js";
import { generateCode } from "../generator/index.js";
import type { AssemblyPlan, GeneratorRoutingPlan, HostRealizationPlan } from "../../../core/schema/types.js";

const assemblyPlan: AssemblyPlan = {
  blueprintId: "bp_short_time_buff_cooldown",
  selectedPatterns: [
    {
      patternId: "dota2.short_time_buff",
      role: "effect_application",
      parameters: {
        abilityName: "rw_phase_a_short_buff",
        modifierName: "modifier_rw_phase_a_short_buff",
        cooldownSeconds: 12,
        duration: 4,
        movespeedBonus: 60,
      },
    },
  ],
  writeTargets: [],
  bridgeUpdates: [],
  validations: [],
  readyForHostWrite: true,
  parameters: {
    abilityCooldown: "99",
  },
};

const hostRealizationPlan: HostRealizationPlan = {
  version: "1.0",
  host: "dota2",
  sourceBlueprintId: "bp_short_time_buff_cooldown",
  units: [
    {
      id: "unit_short_time_buff",
      sourceModuleId: "effect_application",
      sourcePatternIds: ["dota2.short_time_buff"],
      role: "gameplay-core",
      realizationType: "kv+lua",
      hostTargets: ["lua_ability", "ability_kv"],
      outputs: [
        { kind: "lua", target: "lua_ability", rationale: ["lua runtime"] },
        { kind: "kv", target: "ability_kv", rationale: ["kv shell"] },
      ],
      rationale: ["family fit: short-time-buff"],
      confidence: "high",
    },
  ],
  blockers: [],
  notes: [],
};

const routingPlan: GeneratorRoutingPlan = {
  version: "1.0",
  host: "dota2",
  sourceBlueprintId: "bp_short_time_buff_cooldown",
  routes: [
    {
      id: "route_short_time_buff_lua",
      sourceUnitId: "unit_short_time_buff",
      generatorFamily: "dota2-lua",
      routeKind: "lua",
      hostTarget: "lua_ability",
      sourcePatternIds: ["dota2.short_time_buff"],
      parameters: {
        abilityName: "rw_phase_a_short_buff",
      },
      rationale: ["lua runtime route"],
    },
    {
      id: "route_short_time_buff_kv",
      sourceUnitId: "unit_short_time_buff",
      generatorFamily: "dota2-kv",
      routeKind: "kv",
      hostTarget: "ability_kv",
      sourcePatternIds: ["dota2.short_time_buff"],
      parameters: {
        abilityName: "rw_phase_a_short_buff",
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
  "phase_a_scheduler_buff",
  routingPlan,
  hostRealizationPlan
);

assert.equal(writePlan.entries.length, 2);
assert.equal(writePlan.stats.deferred, 0);

const kvEntry = writePlan.entries.find((entry) => entry.contentType === "kv");
const luaEntry = writePlan.entries.find((entry) => entry.contentType === "lua");

assert.ok(kvEntry, "expected a KV entry for dota2.short_time_buff");
assert.ok(luaEntry, "expected a Lua entry for dota2.short_time_buff");
assert.equal(kvEntry!.deferred, false);
assert.equal(luaEntry!.deferred, false);
assert.equal(kvEntry!.generatorFamilyHint, "dota2-kv");
assert.equal(luaEntry!.generatorFamilyHint, "dota2-lua");
assert.equal(kvEntry!.metadata?.abilityCooldown, "12");

const generatedKV = generateCode(kvEntry!, "phase_a_scheduler_buff");
assert.match(generatedKV.content, /"AbilityCooldown"\s+"12"/);
assert.doesNotMatch(generatedKV.content, /"AbilityCooldown"\s+"99"/);

console.log("adapters/dota2/assembler/short-time-buff-cooldown.test.ts passed");
