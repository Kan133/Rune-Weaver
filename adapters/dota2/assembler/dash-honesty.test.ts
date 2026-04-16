import assert from "node:assert/strict";

import { createWritePlan } from "./index.js";
import type { AssemblyPlan, GeneratorRoutingPlan, HostRealizationPlan } from "../../../core/schema/types.js";

const assemblyPlan: AssemblyPlan = {
  blueprintId: "bp_dash_honesty",
  selectedPatterns: [
    {
      patternId: "effect.dash",
      role: "dash_effect",
      parameters: {
        distance: 300,
        speed: 1200,
      },
    },
  ],
  modules: [
    {
      id: "dash_module",
      role: "gameplay-core",
      category: "effect",
      selectedPatterns: ["effect.dash"],
      outputKinds: ["server"],
      outputs: [
        { kind: "kv", target: "ability_kv", rationale: ["ability shell"] },
        { kind: "ts", target: "server_ts", rationale: ["runtime"] },
      ],
      parameters: {
        distance: 300,
        speed: 1200,
      },
    } as any,
  ],
  writeTargets: [],
  bridgeUpdates: [],
  validations: [],
  readyForHostWrite: true,
};

const hostRealizationPlan: HostRealizationPlan = {
  version: "1.0",
  host: "dota2",
  sourceBlueprintId: "bp_dash_honesty",
  units: [
    {
      id: "dash_module",
      sourceModuleId: "dash_module",
      sourcePatternIds: ["effect.dash"],
      role: "gameplay-core",
      realizationType: "kv+ts",
      hostTargets: ["ability_kv", "server_ts"],
      outputs: [
        { kind: "kv", target: "ability_kv", rationale: ["ability shell"] },
        { kind: "ts", target: "server_ts", rationale: ["runtime"] },
      ],
      rationale: ["family fit: composite-static-runtime"],
      confidence: "medium",
    },
  ],
  blockers: [],
  notes: [],
};

const routingPlan: GeneratorRoutingPlan = {
  version: "1.0",
  host: "dota2",
  sourceBlueprintId: "bp_dash_honesty",
  routes: [
    {
      id: "route_dash_kv",
      sourceUnitId: "dash_module",
      generatorFamily: "dota2-kv",
      routeKind: "kv",
      hostTarget: "ability_kv",
      sourcePatternIds: ["effect.dash"],
      parameters: {
        distance: 300,
        speed: 1200,
      },
      rationale: ["kv shell route"],
    },
    {
      id: "route_dash_ts",
      sourceUnitId: "dash_module",
      generatorFamily: "dota2-ts",
      routeKind: "ts",
      hostTarget: "server_ts",
      sourcePatternIds: ["effect.dash"],
      parameters: {
        distance: 300,
        speed: 1200,
      },
      rationale: ["runtime route"],
    },
  ],
  warnings: [],
  blockers: [],
};

const writePlan = createWritePlan(
  assemblyPlan,
  "D:\\test-host",
  "feature_dash_honesty",
  routingPlan,
  hostRealizationPlan
);

assert.equal(writePlan.entries.length, 2);
assert.equal(writePlan.stats.deferred, 2);

for (const entry of writePlan.entries) {
  assert.equal(entry.sourcePattern, "effect.dash");
  assert.equal(entry.deferred, true);
  assert.match(entry.deferredReason || "", /effect\.dash remains deferred/i);
  assert.match(entry.deferredReason || "", /ability-shell \+ motion-modifier path/i);
}

assert.deepEqual(
  writePlan.entries.map((entry) => entry.generatorFamilyHint),
  ["dota2-ts", "dota2-ts"]
);
assert.ok(
  writePlan.entries.some((entry) => entry.targetPath.endsWith("_modifier.ts")),
  "dash still advertises a companion modifier slot, but it must now defer honestly"
);
assert.equal(
  writePlan.deferredWarnings?.[0],
  `[effect.dash] ${writePlan.entries[0].deferredReason}`
);

console.log("adapters/dota2/assembler/dash-honesty.test.ts passed");
