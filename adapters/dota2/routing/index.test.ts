import assert from "node:assert/strict";

import { generateGeneratorRoutingPlan } from "./index.js";

{
  const routingPlan = generateGeneratorRoutingPlan({
    version: "1.0",
    host: "dota2",
    sourceBlueprintId: "bp_buff",
    units: [
      {
        id: "buff_unit",
        sourceModuleId: "buff_module",
        sourcePatternIds: ["effect.modifier_applier"],
        role: "gameplay-core",
        realizationType: "kv+lua",
        hostTargets: ["lua_ability", "ability_kv"],
        outputs: [
          { kind: "lua", target: "lua_ability", rationale: ["lua runtime"] },
          { kind: "kv", target: "ability_kv", rationale: ["kv config"] },
        ],
        rationale: ["family fit: modifier-runtime"],
        confidence: "high",
      },
    ],
    blockers: [],
    notes: [],
  });

  assert.deepEqual(
    routingPlan.routes.map((route) => `${route.routeKind}:${route.generatorFamily}`),
    ["lua:dota2-lua", "kv:dota2-kv"]
  );
  assert.equal(routingPlan.blockers.length, 0);
}

{
  const routingPlan = generateGeneratorRoutingPlan({
    version: "1.0",
    host: "dota2",
    sourceBlueprintId: "bp_blocked",
    units: [
      {
        id: "blocked_unit",
        sourceModuleId: "blocked_module",
        sourcePatternIds: ["effect.dash"],
        role: "gameplay-core",
        realizationType: "kv+ts",
        hostTargets: ["ability_kv", "server_ts"],
        outputs: [
          { kind: "kv", target: "ability_kv", rationale: ["kv"] },
          { kind: "ts", target: "server_ts", rationale: ["ts"] },
        ],
        rationale: ["blocked example"],
        confidence: "medium",
        blockers: ["missing host policy"],
      },
    ],
    blockers: [],
    notes: [],
  });

  assert.equal(routingPlan.blockers[0], "2 generator route(s) remain blocked by realization constraints");
  assert.equal(routingPlan.warnings.length, 2);
}

console.log("adapters/dota2/routing/index.test.ts passed");
