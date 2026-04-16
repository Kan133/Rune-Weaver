import assert from "node:assert/strict";

import { createWritePlan } from "./index.js";
import type { AssemblyPlan, GeneratorRoutingPlan, HostRealizationPlan } from "../../../core/schema/types.js";

const assemblyPlan: AssemblyPlan = {
  blueprintId: "bp_bridge_elision",
  selectedPatterns: [
    {
      patternId: "integration.state_sync_bridge",
      role: "integration_bridge",
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
  sourceBlueprintId: "bp_bridge_elision",
  units: [
    {
      id: "unit_bridge",
      sourceModuleId: "mod_bridge",
      sourcePatternIds: ["integration.state_sync_bridge"],
      role: "bridge-support",
      realizationType: "bridge-only",
      hostTargets: ["bridge_refresh"],
      outputs: [
        {
          kind: "bridge",
          target: "bridge_refresh",
          rationale: ["selection state sync"],
        },
      ],
      rationale: ["bridge-only state sync"],
      confidence: "medium",
    },
  ],
  blockers: [],
  notes: [],
};

const routingPlan: GeneratorRoutingPlan = {
  version: "1.0",
  host: "dota2",
  sourceBlueprintId: "bp_bridge_elision",
  routes: [
    {
      id: "route_bridge",
      sourceUnitId: "unit_bridge",
      generatorFamily: "bridge-support",
      routeKind: "bridge",
      hostTarget: "bridge_refresh",
      sourcePatternIds: ["integration.state_sync_bridge"],
      rationale: ["bridge-only route"],
    },
  ],
  warnings: [],
  blockers: [],
};

const writePlan = createWritePlan(
  assemblyPlan,
  "D:\\test-host",
  "standalone_system_test",
  routingPlan,
  hostRealizationPlan
);

assert.equal(writePlan.entries.length, 1);
assert.equal(writePlan.stats.deferred, 1);

const [bridgeEntry] = writePlan.entries;
assert.equal(bridgeEntry.sourcePattern, "integration.state_sync_bridge");
assert.equal(bridgeEntry.generatorFamilyHint, "bridge-support");
assert.equal(bridgeEntry.deferred, true);
assert.match(
  bridgeEntry.deferredReason || "",
  /intentionally elided/i
);
assert.match(
  bridgeEntry.deferredReason || "",
  /no standalone bridge file is emitted/i
);
assert.equal(
  writePlan.deferredWarnings?.[0],
  `[integration.state_sync_bridge] ${bridgeEntry.deferredReason}`
);

console.log("adapters/dota2/assembler/bridge-elision.test.ts passed");
