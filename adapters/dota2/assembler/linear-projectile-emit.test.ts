import assert from "node:assert/strict";

import { createWritePlan } from "./index.js";
import { generateCode } from "../generator/index.js";
import type { AssemblyPlan, GeneratorRoutingPlan, HostRealizationPlan } from "../../../core/schema/types.js";

const assemblyPlan: AssemblyPlan = {
  blueprintId: "bp_linear_projectile_emit",
  selectedPatterns: [
    {
      patternId: "dota2.linear_projectile_emit",
      role: "effect_application",
      parameters: {
        abilityName: "rw_phase_c_linear_projectile",
        projectileDistance: 900,
        projectileSpeed: 1200,
        projectileRadius: 125,
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
  sourceBlueprintId: "bp_linear_projectile_emit",
  units: [
    {
      id: "unit_linear_projectile",
      sourceModuleId: "effect_application",
      sourcePatternIds: ["dota2.linear_projectile_emit"],
      role: "gameplay-core",
      realizationType: "kv+lua",
      hostTargets: ["lua_ability", "ability_kv"],
      outputs: [
        { kind: "lua", target: "lua_ability", rationale: ["projectile runtime"] },
        { kind: "kv", target: "ability_kv", rationale: ["projectile kv shell"] },
      ],
      rationale: ["family fit: forward linear projectile"],
      confidence: "high",
    },
  ],
  blockers: [],
  notes: [],
};

const routingPlan: GeneratorRoutingPlan = {
  version: "1.0",
  host: "dota2",
  sourceBlueprintId: "bp_linear_projectile_emit",
  routes: [
    {
      id: "route_linear_projectile_lua",
      sourceUnitId: "unit_linear_projectile",
      generatorFamily: "dota2-lua",
      routeKind: "lua",
      hostTarget: "lua_ability",
      sourcePatternIds: ["dota2.linear_projectile_emit"],
      parameters: {
        abilityName: "rw_phase_c_linear_projectile",
      },
      rationale: ["lua projectile route"],
    },
    {
      id: "route_linear_projectile_kv",
      sourceUnitId: "unit_linear_projectile",
      generatorFamily: "dota2-kv",
      routeKind: "kv",
      hostTarget: "ability_kv",
      sourcePatternIds: ["dota2.linear_projectile_emit"],
      parameters: {
        abilityName: "rw_phase_c_linear_projectile",
      },
      rationale: ["kv projectile route"],
    },
  ],
  warnings: [],
  blockers: [],
};

const writePlan = createWritePlan(
  assemblyPlan,
  "D:\\test-host",
  "phase_c_linear_projectile",
  routingPlan,
  hostRealizationPlan
);

assert.equal(writePlan.entries.length, 2);
assert.equal(writePlan.stats.deferred, 0);

const kvEntry = writePlan.entries.find((entry) => entry.contentType === "kv");
const luaEntry = writePlan.entries.find((entry) => entry.contentType === "lua");

assert.ok(kvEntry, "expected a KV entry for dota2.linear_projectile_emit");
assert.ok(luaEntry, "expected a Lua entry for dota2.linear_projectile_emit");
assert.equal(kvEntry!.deferred, false);
assert.equal(luaEntry!.deferred, false);
assert.equal(kvEntry!.generatorFamilyHint, "dota2-kv");
assert.equal(luaEntry!.generatorFamilyHint, "dota2-lua");
assert.equal(kvEntry!.metadata?.abilityBehavior, "DOTA_ABILITY_BEHAVIOR_NO_TARGET");
assert.equal(kvEntry!.metadata?.abilityBaseClass, "ability_lua");
assert.equal(kvEntry!.metadata?.scriptFile, "rune_weaver/abilities/phase_c_linear_projectile.lua");
assert.deepEqual(
  kvEntry!.metadata?.specials?.map((special: { key: string; value: string }) => [special.key, special.value]),
  [
    ["projectile_distance", "900"],
    ["projectile_speed", "1200"],
    ["projectile_radius", "125"],
  ]
);

const generatedLua = generateCode(luaEntry!, "phase_c_linear_projectile");
assert.match(generatedLua.content, /ProjectileManager:CreateLinearProjectile/);
assert.match(generatedLua.content, /OnProjectileHit/);

const generatedKV = generateCode(kvEntry!, "phase_c_linear_projectile");
assert.match(generatedKV.content, /"AbilityBehavior"\s+"DOTA_ABILITY_BEHAVIOR_NO_TARGET"/);
assert.match(generatedKV.content, /"BaseClass"\s+"ability_lua"/);
assert.match(generatedKV.content, /"ScriptFile"\s+"rune_weaver\/abilities\/phase_c_linear_projectile\.lua"/);
assert.match(generatedKV.content, /"projectile_distance"\s+"900"/);
assert.match(generatedKV.content, /"projectile_speed"\s+"1200"/);
assert.match(generatedKV.content, /"projectile_radius"\s+"125"/);

console.log("adapters/dota2/assembler/linear-projectile-emit.test.ts passed");
