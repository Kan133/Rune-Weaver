import assert from "node:assert/strict";

import { createWritePlan } from "./index.js";
import type { AssemblyPlan, GeneratorRoutingPlan, HostRealizationPlan } from "../../../core/schema/types.js";

function createResourceAssemblyPlan(patterns: AssemblyPlan["selectedPatterns"]): AssemblyPlan {
  return {
    blueprintId: "bp_resource_composition",
    selectedPatterns: patterns,
    writeTargets: [],
    bridgeUpdates: [],
    validations: [],
    readyForHostWrite: true,
  };
}

{
  const assemblyPlan = createResourceAssemblyPlan([
    {
      patternId: "input.key_binding",
      role: "resource_input",
      parameters: { triggerKey: "F4" },
    },
    {
      patternId: "resource.basic_pool",
      role: "resource_pool",
      parameters: { resourceId: "mana", maxValue: 100 },
    },
    {
      patternId: "effect.resource_consume",
      role: "resource_cost_consumer",
      parameters: { amount: 25, resourceType: "mana", failBehavior: "block" },
    },
  ]);

  const hostRealizationPlan: HostRealizationPlan = {
    version: "1.0",
    host: "dota2",
    sourceBlueprintId: "bp_resource_composition",
    units: [
      {
        id: "unit_input",
        sourceModuleId: "resource_input",
        sourcePatternIds: ["input.key_binding"],
        role: "gameplay-core",
        realizationType: "ts",
        hostTargets: ["server_ts"],
        outputs: [{ kind: "ts", target: "server_ts", rationale: ["key binding runtime"] }],
        rationale: ["resource key binding runtime"],
        confidence: "high",
      },
      {
        id: "unit_pool",
        sourceModuleId: "resource_pool",
        sourcePatternIds: ["resource.basic_pool"],
        role: "shared-support",
        realizationType: "shared-ts",
        hostTargets: ["shared_ts"],
        outputs: [{ kind: "ts", target: "shared_ts", rationale: ["shared runtime"] }],
        rationale: ["resource pool shared runtime"],
        confidence: "high",
      },
      {
        id: "unit_consume",
        sourceModuleId: "resource_cost_consumer",
        sourcePatternIds: ["effect.resource_consume"],
        role: "gameplay-core",
        realizationType: "ts",
        hostTargets: ["server_ts"],
        outputs: [{ kind: "ts", target: "server_ts", rationale: ["server runtime"] }],
        rationale: ["resource consumer runtime"],
        confidence: "high",
      },
    ],
    blockers: [],
    notes: [],
  };

  const routingPlan: GeneratorRoutingPlan = {
    version: "1.0",
    host: "dota2",
    sourceBlueprintId: "bp_resource_composition",
    routes: [
      {
        id: "route_input_ts",
        sourceUnitId: "unit_input",
        generatorFamily: "dota2-ts",
        routeKind: "ts",
        hostTarget: "server_ts",
        sourcePatternIds: ["input.key_binding"],
        parameters: { triggerKey: "F4" },
        rationale: ["input runtime route"],
      },
      {
        id: "route_pool_ts",
        sourceUnitId: "unit_pool",
        generatorFamily: "dota2-ts",
        routeKind: "ts",
        hostTarget: "server_shared_ts",
        sourcePatternIds: ["resource.basic_pool"],
        parameters: { resourceId: "mana", maxValue: 100 },
        rationale: ["shared runtime route"],
      },
      {
        id: "route_consume_ts",
        sourceUnitId: "unit_consume",
        generatorFamily: "dota2-ts",
        routeKind: "ts",
        hostTarget: "server_ts",
        sourcePatternIds: ["effect.resource_consume"],
        parameters: { amount: 25, resourceType: "mana", failBehavior: "block" },
        rationale: ["server runtime route"],
      },
    ],
    warnings: [],
    blockers: [],
  };

  const writePlan = createWritePlan(
    assemblyPlan,
    "D:\\test-host",
    "standalone_system_resource",
    routingPlan,
    hostRealizationPlan
  );

  const keyBindingEntry = writePlan.entries.find(
    (entry) =>
      entry.sourcePattern === "input.key_binding" &&
      !entry.targetPath.endsWith("_ability.ts") &&
      !entry.targetPath.endsWith("_modifier.ts")
  );
  const poolEntry = writePlan.entries.find((entry) => entry.sourcePattern === "resource.basic_pool");
  const consumeEntry = writePlan.entries.find((entry) => entry.sourcePattern === "effect.resource_consume");

  assert.ok(keyBindingEntry);
  assert.ok(poolEntry);
  assert.ok(consumeEntry);
  assert.match(poolEntry!.targetPath, /generated\/shared\//i);
  assert.equal(consumeEntry!.deferred, false);
  assert.equal(consumeEntry!.metadata?.resourceCostComposition, "feature-local-auto-bind");
  assert.equal(
    consumeEntry!.metadata?.resourcePoolImportPath,
    "../shared/standalone_system_resource_resource_pool_resource_basic_pool.js"
  );
  assert.equal(
    consumeEntry!.metadata?.resourcePoolClassName,
    "StandaloneSystemResourceResourcePoolResourceBasicPool"
  );
  assert.match(consumeEntry!.contentSummary, /auto-compose: resource\.basic_pool\(mana\)/i);
  assert.match(consumeEntry!.contentSummary, /canonical caller: input\.key_binding\(F4\)/i);
  assert.equal(
    keyBindingEntry!.metadata?.resourceInvocationImportPath,
    "./standalone_system_resource_resource_cost_consumer_effect_resource_consume.js"
  );
  assert.equal(
    keyBindingEntry!.metadata?.resourceInvocationClassName,
    "StandaloneSystemResourceResourceCostConsumerEffectResourceConsume"
  );
  assert.equal(keyBindingEntry!.metadata?.resourceInvocationMode, "resource-consume-configured");
  assert.equal(keyBindingEntry!.metadata?.resourceInvocationResourceType, "mana");
  assert.match(keyBindingEntry!.contentSummary, /auto-call: effect\.resource_consume\(mana\)/i);
}

{
  const assemblyPlan = createResourceAssemblyPlan([
    {
      patternId: "effect.resource_consume",
      role: "resource_cost_consumer",
      parameters: { amount: 25, resourceType: "mana", failBehavior: "block" },
    },
  ]);

  const hostRealizationPlan: HostRealizationPlan = {
    version: "1.0",
    host: "dota2",
    sourceBlueprintId: "bp_resource_only_consumer",
    units: [
      {
        id: "unit_consume",
        sourceModuleId: "resource_cost_consumer",
        sourcePatternIds: ["effect.resource_consume"],
        role: "gameplay-core",
        realizationType: "ts",
        hostTargets: ["server_ts"],
        outputs: [{ kind: "ts", target: "server_ts", rationale: ["server runtime"] }],
        rationale: ["resource consumer runtime"],
        confidence: "high",
      },
    ],
    blockers: [],
    notes: [],
  };

  const routingPlan: GeneratorRoutingPlan = {
    version: "1.0",
    host: "dota2",
    sourceBlueprintId: "bp_resource_only_consumer",
    routes: [
      {
        id: "route_consume_ts",
        sourceUnitId: "unit_consume",
        generatorFamily: "dota2-ts",
        routeKind: "ts",
        hostTarget: "server_ts",
        sourcePatternIds: ["effect.resource_consume"],
        parameters: { amount: 25, resourceType: "mana", failBehavior: "block" },
        rationale: ["server runtime route"],
      },
    ],
    warnings: [],
    blockers: [],
  };

  const writePlan = createWritePlan(
    assemblyPlan,
    "D:\\test-host",
    "standalone_system_resource",
    routingPlan,
    hostRealizationPlan
  );

  assert.equal(writePlan.stats.deferred, 1);
  const [consumeEntry] = writePlan.entries;
  assert.equal(consumeEntry.sourcePattern, "effect.resource_consume");
  assert.equal(consumeEntry.deferred, true);
  assert.match(consumeEntry.deferredReason || "", /requires a same-feature resource\.basic_pool companion/i);
}

{
  const assemblyPlan = createResourceAssemblyPlan([
    {
      patternId: "resource.basic_pool",
      role: "resource_pool",
      parameters: { resourceId: "mana", maxValue: 100 },
    },
    {
      patternId: "effect.resource_consume",
      role: "resource_cost_consumer",
      parameters: { amount: 25, resourceType: "mana", failBehavior: "block" },
    },
  ]);

  const hostRealizationPlan: HostRealizationPlan = {
    version: "1.0",
    host: "dota2",
    sourceBlueprintId: "bp_resource_missing_caller",
    units: [
      {
        id: "unit_pool",
        sourceModuleId: "resource_pool",
        sourcePatternIds: ["resource.basic_pool"],
        role: "shared-support",
        realizationType: "shared-ts",
        hostTargets: ["shared_ts"],
        outputs: [{ kind: "ts", target: "shared_ts", rationale: ["shared runtime"] }],
        rationale: ["resource pool shared runtime"],
        confidence: "high",
      },
      {
        id: "unit_consume",
        sourceModuleId: "resource_cost_consumer",
        sourcePatternIds: ["effect.resource_consume"],
        role: "gameplay-core",
        realizationType: "ts",
        hostTargets: ["server_ts"],
        outputs: [{ kind: "ts", target: "server_ts", rationale: ["server runtime"] }],
        rationale: ["resource consumer runtime"],
        confidence: "high",
      },
    ],
    blockers: [],
    notes: [],
  };

  const routingPlan: GeneratorRoutingPlan = {
    version: "1.0",
    host: "dota2",
    sourceBlueprintId: "bp_resource_missing_caller",
    routes: [
      {
        id: "route_pool_ts",
        sourceUnitId: "unit_pool",
        generatorFamily: "dota2-ts",
        routeKind: "ts",
        hostTarget: "server_shared_ts",
        sourcePatternIds: ["resource.basic_pool"],
        parameters: { resourceId: "mana", maxValue: 100 },
        rationale: ["shared runtime route"],
      },
      {
        id: "route_consume_ts",
        sourceUnitId: "unit_consume",
        generatorFamily: "dota2-ts",
        routeKind: "ts",
        hostTarget: "server_ts",
        sourcePatternIds: ["effect.resource_consume"],
        parameters: { amount: 25, resourceType: "mana", failBehavior: "block" },
        rationale: ["server runtime route"],
      },
    ],
    warnings: [],
    blockers: [],
  };

  const writePlan = createWritePlan(
    assemblyPlan,
    "D:\\test-host",
    "standalone_system_resource",
    routingPlan,
    hostRealizationPlan
  );

  const consumeEntry = writePlan.entries.find((entry) => entry.sourcePattern === "effect.resource_consume");
  assert.ok(consumeEntry);
  assert.equal(consumeEntry!.deferred, true);
  assert.match(consumeEntry!.deferredReason || "", /requires a same-feature input\.key_binding caller/i);
}

{
  const assemblyPlan = createResourceAssemblyPlan([
    {
      patternId: "resource.basic_pool",
      role: "resource_pool",
      parameters: { resourceId: "energy", maxValue: 100 },
    },
    {
      patternId: "effect.resource_consume",
      role: "resource_cost_consumer",
      parameters: { amount: 25, resourceType: "mana", failBehavior: "block" },
    },
  ]);

  const hostRealizationPlan: HostRealizationPlan = {
    version: "1.0",
    host: "dota2",
    sourceBlueprintId: "bp_resource_mismatch",
    units: [
      {
        id: "unit_pool",
        sourceModuleId: "resource_pool",
        sourcePatternIds: ["resource.basic_pool"],
        role: "shared-support",
        realizationType: "shared-ts",
        hostTargets: ["shared_ts"],
        outputs: [{ kind: "ts", target: "shared_ts", rationale: ["shared runtime"] }],
        rationale: ["resource pool shared runtime"],
        confidence: "high",
      },
      {
        id: "unit_consume",
        sourceModuleId: "resource_cost_consumer",
        sourcePatternIds: ["effect.resource_consume"],
        role: "gameplay-core",
        realizationType: "ts",
        hostTargets: ["server_ts"],
        outputs: [{ kind: "ts", target: "server_ts", rationale: ["server runtime"] }],
        rationale: ["resource consumer runtime"],
        confidence: "high",
      },
    ],
    blockers: [],
    notes: [],
  };

  const routingPlan: GeneratorRoutingPlan = {
    version: "1.0",
    host: "dota2",
    sourceBlueprintId: "bp_resource_mismatch",
    routes: [
      {
        id: "route_pool_ts",
        sourceUnitId: "unit_pool",
        generatorFamily: "dota2-ts",
        routeKind: "ts",
        hostTarget: "server_shared_ts",
        sourcePatternIds: ["resource.basic_pool"],
        parameters: { resourceId: "energy", maxValue: 100 },
        rationale: ["shared runtime route"],
      },
      {
        id: "route_consume_ts",
        sourceUnitId: "unit_consume",
        generatorFamily: "dota2-ts",
        routeKind: "ts",
        hostTarget: "server_ts",
        sourcePatternIds: ["effect.resource_consume"],
        parameters: { amount: 25, resourceType: "mana", failBehavior: "block" },
        rationale: ["server runtime route"],
      },
    ],
    warnings: [],
    blockers: [],
  };

  const writePlan = createWritePlan(
    assemblyPlan,
    "D:\\test-host",
    "standalone_system_resource",
    routingPlan,
    hostRealizationPlan
  );

  const consumeEntry = writePlan.entries.find((entry) => entry.sourcePattern === "effect.resource_consume");
  assert.ok(consumeEntry);
  assert.equal(consumeEntry!.deferred, true);
  assert.match(consumeEntry!.deferredReason || "", /resourceType: "mana"/i);
}

{
  const assemblyPlan = createResourceAssemblyPlan([
    {
      patternId: "input.key_binding",
      role: "resource_input",
      parameters: { triggerKey: "F4" },
    },
    {
      patternId: "resource.basic_pool",
      role: "resource_pool",
      parameters: { resourceId: "mana", maxValue: 100 },
    },
    {
      patternId: "effect.resource_consume",
      role: "resource_cost_consumer",
      parameters: { amount: 25, resourceType: "mana", failBehavior: "warn" },
    },
  ]);

  const hostRealizationPlan: HostRealizationPlan = {
    version: "1.0",
    host: "dota2",
    sourceBlueprintId: "bp_resource_unsupported_fail_behavior",
    units: [
      {
        id: "unit_input",
        sourceModuleId: "resource_input",
        sourcePatternIds: ["input.key_binding"],
        role: "gameplay-core",
        realizationType: "ts",
        hostTargets: ["server_ts"],
        outputs: [{ kind: "ts", target: "server_ts", rationale: ["key binding runtime"] }],
        rationale: ["resource key binding runtime"],
        confidence: "high",
      },
      {
        id: "unit_pool",
        sourceModuleId: "resource_pool",
        sourcePatternIds: ["resource.basic_pool"],
        role: "shared-support",
        realizationType: "shared-ts",
        hostTargets: ["shared_ts"],
        outputs: [{ kind: "ts", target: "shared_ts", rationale: ["shared runtime"] }],
        rationale: ["resource pool shared runtime"],
        confidence: "high",
      },
      {
        id: "unit_consume",
        sourceModuleId: "resource_cost_consumer",
        sourcePatternIds: ["effect.resource_consume"],
        role: "gameplay-core",
        realizationType: "ts",
        hostTargets: ["server_ts"],
        outputs: [{ kind: "ts", target: "server_ts", rationale: ["server runtime"] }],
        rationale: ["resource consumer runtime"],
        confidence: "high",
      },
    ],
    blockers: [],
    notes: [],
  };

  const routingPlan: GeneratorRoutingPlan = {
    version: "1.0",
    host: "dota2",
    sourceBlueprintId: "bp_resource_unsupported_fail_behavior",
    routes: [
      {
        id: "route_input_ts",
        sourceUnitId: "unit_input",
        generatorFamily: "dota2-ts",
        routeKind: "ts",
        hostTarget: "server_ts",
        sourcePatternIds: ["input.key_binding"],
        parameters: { triggerKey: "F4" },
        rationale: ["input runtime route"],
      },
      {
        id: "route_pool_ts",
        sourceUnitId: "unit_pool",
        generatorFamily: "dota2-ts",
        routeKind: "ts",
        hostTarget: "server_shared_ts",
        sourcePatternIds: ["resource.basic_pool"],
        parameters: { resourceId: "mana", maxValue: 100 },
        rationale: ["shared runtime route"],
      },
      {
        id: "route_consume_ts",
        sourceUnitId: "unit_consume",
        generatorFamily: "dota2-ts",
        routeKind: "ts",
        hostTarget: "server_ts",
        sourcePatternIds: ["effect.resource_consume"],
        parameters: { amount: 25, resourceType: "mana", failBehavior: "warn" },
        rationale: ["server runtime route"],
      },
    ],
    warnings: [],
    blockers: [],
  };

  const writePlan = createWritePlan(
    assemblyPlan,
    "D:\\test-host",
    "standalone_system_resource",
    routingPlan,
    hostRealizationPlan
  );

  const keyBindingEntry = writePlan.entries.find(
    (entry) =>
      entry.sourcePattern === "input.key_binding" &&
      !entry.targetPath.endsWith("_ability.ts") &&
      !entry.targetPath.endsWith("_modifier.ts")
  );
  const consumeEntry = writePlan.entries.find((entry) => entry.sourcePattern === "effect.resource_consume");

  assert.ok(keyBindingEntry);
  assert.ok(consumeEntry);
  assert.equal(writePlan.stats.deferred, 1);
  assert.equal(consumeEntry!.deferred, true);
  assert.match(consumeEntry!.deferredReason || "", /only admits failBehavior "block" or "report"/i);
  assert.equal(keyBindingEntry!.metadata?.resourceInvocationMode, undefined);
  assert.doesNotMatch(keyBindingEntry!.contentSummary, /auto-call: effect\.resource_consume/i);
}

{
  const assemblyPlan = createResourceAssemblyPlan([
    {
      patternId: "input.key_binding",
      role: "resource_input",
      parameters: { triggerKey: "F4" },
    },
    {
      patternId: "resource.basic_pool",
      role: "resource_pool",
      parameters: { resourceId: "mana", maxValue: 100, regen: 5 },
    },
    {
      patternId: "effect.resource_consume",
      role: "resource_cost_consumer",
      parameters: { amount: 25, resourceType: "mana", failBehavior: "block" },
    },
  ]);

  const hostRealizationPlan: HostRealizationPlan = {
    version: "1.0",
    host: "dota2",
    sourceBlueprintId: "bp_resource_regen_pool",
    units: [
      {
        id: "unit_input",
        sourceModuleId: "resource_input",
        sourcePatternIds: ["input.key_binding"],
        role: "gameplay-core",
        realizationType: "ts",
        hostTargets: ["server_ts"],
        outputs: [{ kind: "ts", target: "server_ts", rationale: ["key binding runtime"] }],
        rationale: ["resource key binding runtime"],
        confidence: "high",
      },
      {
        id: "unit_pool",
        sourceModuleId: "resource_pool",
        sourcePatternIds: ["resource.basic_pool"],
        role: "shared-support",
        realizationType: "shared-ts",
        hostTargets: ["shared_ts"],
        outputs: [{ kind: "ts", target: "shared_ts", rationale: ["shared runtime"] }],
        rationale: ["resource pool shared runtime"],
        confidence: "high",
      },
      {
        id: "unit_consume",
        sourceModuleId: "resource_cost_consumer",
        sourcePatternIds: ["effect.resource_consume"],
        role: "gameplay-core",
        realizationType: "ts",
        hostTargets: ["server_ts"],
        outputs: [{ kind: "ts", target: "server_ts", rationale: ["server runtime"] }],
        rationale: ["resource consumer runtime"],
        confidence: "high",
      },
    ],
    blockers: [],
    notes: [],
  };

  const routingPlan: GeneratorRoutingPlan = {
    version: "1.0",
    host: "dota2",
    sourceBlueprintId: "bp_resource_regen_pool",
    routes: [
      {
        id: "route_input_ts",
        sourceUnitId: "unit_input",
        generatorFamily: "dota2-ts",
        routeKind: "ts",
        hostTarget: "server_ts",
        sourcePatternIds: ["input.key_binding"],
        parameters: { triggerKey: "F4" },
        rationale: ["input runtime route"],
      },
      {
        id: "route_pool_ts",
        sourceUnitId: "unit_pool",
        generatorFamily: "dota2-ts",
        routeKind: "ts",
        hostTarget: "server_shared_ts",
        sourcePatternIds: ["resource.basic_pool"],
        parameters: { resourceId: "mana", maxValue: 100, regen: 5 },
        rationale: ["shared runtime route"],
      },
      {
        id: "route_consume_ts",
        sourceUnitId: "unit_consume",
        generatorFamily: "dota2-ts",
        routeKind: "ts",
        hostTarget: "server_ts",
        sourcePatternIds: ["effect.resource_consume"],
        parameters: { amount: 25, resourceType: "mana", failBehavior: "block" },
        rationale: ["server runtime route"],
      },
    ],
    warnings: [],
    blockers: [],
  };

  const writePlan = createWritePlan(
    assemblyPlan,
    "D:\\test-host",
    "standalone_system_resource",
    routingPlan,
    hostRealizationPlan
  );

  const keyBindingEntry = writePlan.entries.find(
    (entry) =>
      entry.sourcePattern === "input.key_binding" &&
      !entry.targetPath.endsWith("_ability.ts") &&
      !entry.targetPath.endsWith("_modifier.ts")
  );
  const poolEntry = writePlan.entries.find((entry) => entry.sourcePattern === "resource.basic_pool");
  const consumeEntry = writePlan.entries.find((entry) => entry.sourcePattern === "effect.resource_consume");

  assert.ok(keyBindingEntry);
  assert.ok(poolEntry);
  assert.ok(consumeEntry);
  assert.equal(writePlan.stats.deferred, 2);
  assert.equal(poolEntry!.deferred, true);
  assert.match(poolEntry!.deferredReason || "", /auto-regen remains deferred/i);
  assert.equal(consumeEntry!.deferred, true);
  assert.match(consumeEntry!.deferredReason || "", /requires a same-feature resource\.basic_pool companion without auto-regen/i);
  assert.equal(keyBindingEntry!.metadata?.resourceInvocationMode, undefined);
  assert.doesNotMatch(keyBindingEntry!.contentSummary, /auto-call: effect\.resource_consume/i);
}

console.log("adapters/dota2/assembler/resource-composition.test.ts passed");
