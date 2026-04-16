import assert from "node:assert/strict";

import { buildGeneratorStage, generateCodeContent } from "./artifact-builder.js";
import type { WritePlan, WritePlanEntry } from "../../../adapters/dota2/assembler/index.js";

const bridgeDeferredReason =
  "Selection-state bridge output is intentionally elided: runtime/UI sync is already absorbed by the admitted selection flow, so no standalone bridge file is emitted.";

const bridgeEntry: WritePlanEntry = {
  operation: "create",
  targetPath: "game/scripts/src/rune_weaver/generated/server/feature_bridge.ts",
  contentType: "typescript",
  contentSummary: "integration/integration.state_sync_bridge (typescript) params: {}",
  sourcePattern: "integration.state_sync_bridge",
  sourceModule: "integration_bridge",
  safe: true,
  generatorFamilyHint: "bridge-support",
  deferred: true,
  deferredReason: bridgeDeferredReason,
};

const runtimeEntry: WritePlanEntry = {
  operation: "create",
  targetPath: "game/scripts/src/rune_weaver/generated/server/feature_runtime.ts",
  contentType: "typescript",
  contentSummary: "input/input.key_binding (typescript) params: {}",
  sourcePattern: "input.key_binding",
  sourceModule: "input_trigger",
  safe: true,
  generatorFamilyHint: "dota2-ts",
};

const resourceCallerEntry: WritePlanEntry = {
  operation: "create",
  targetPath: "game/scripts/src/rune_weaver/generated/server/feature_resource_key_binding.ts",
  contentType: "typescript",
  contentSummary:
    'input/input.key_binding (typescript) params: {"triggerKey":"F4"} [auto-call: effect.resource_consume(mana)]',
  sourcePattern: "input.key_binding",
  sourceModule: "resource_input",
  safe: true,
  generatorFamilyHint: "dota2-ts",
  parameters: {
    triggerKey: "F4",
  },
  metadata: {
    resourceInvocationImportPath: "./feature_resource_consume.js",
    resourceInvocationTargetPath: "game/scripts/src/rune_weaver/generated/server/feature_resource_consume.ts",
    resourceInvocationClassName: "FeatureResourceConsume",
    resourceInvocationMode: "resource-consume-configured",
    resourceInvocationResourceType: "mana",
  },
};

const resourceConsumeEntry: WritePlanEntry = {
  operation: "create",
  targetPath: "game/scripts/src/rune_weaver/generated/server/feature_resource_consume.ts",
  contentType: "typescript",
  contentSummary:
    'effect/effect.resource_consume (typescript) params: {"amount":75,"resourceType":"mana","failBehavior":"block"} [auto-compose: resource.basic_pool(mana)] [canonical caller: input.key_binding(F4)]',
  sourcePattern: "effect.resource_consume",
  sourceModule: "resource_cost_consumer",
  safe: true,
  generatorFamilyHint: "dota2-ts",
  parameters: {
    amount: 75,
    resourceType: "mana",
    failBehavior: "block",
  },
  metadata: {
    resourcePoolImportPath: "../shared/feature_resource_pool.js",
    resourcePoolTargetPath: "game/scripts/src/rune_weaver/generated/shared/feature_resource_pool.ts",
    resourcePoolClassName: "FeatureResourcePool",
    resourcePoolResourceId: "mana",
    resourceCostComposition: "feature-local-auto-bind",
  },
};

const standaloneResourceConsumeMissingPoolEntry: WritePlanEntry = {
  operation: "create",
  targetPath: "game/scripts/src/rune_weaver/generated/server/feature_resource_consume_missing_pool.ts",
  contentType: "typescript",
  contentSummary:
    'effect/effect.resource_consume (typescript) params: {"amount":75,"resourceType":"mana","failBehavior":"block"} [deferred: missing compatible resource.basic_pool companion]',
  sourcePattern: "effect.resource_consume",
  sourceModule: "resource_cost_consumer",
  safe: true,
  generatorFamilyHint: "dota2-ts",
  deferred: true,
  deferredReason:
    'effect.resource_consume requires a same-feature resource.basic_pool companion for automatic composition in the current resource/cost slice (resourceType: "mana")',
};

const standaloneResourceConsumeMissingCallerEntry: WritePlanEntry = {
  operation: "create",
  targetPath: "game/scripts/src/rune_weaver/generated/server/feature_resource_consume_missing_caller.ts",
  contentType: "typescript",
  contentSummary:
    'effect/effect.resource_consume (typescript) params: {"amount":75,"resourceType":"mana","failBehavior":"block"} [auto-compose: resource.basic_pool(mana)] [deferred: canonical caller missing or ambiguous]',
  sourcePattern: "effect.resource_consume",
  sourceModule: "resource_cost_consumer",
  safe: true,
  generatorFamilyHint: "dota2-ts",
  deferred: true,
  deferredReason:
    'effect.resource_consume requires a same-feature input.key_binding caller to expose the current admitted invocation path (resourceType: "mana")',
  metadata: {
    resourcePoolImportPath: "../shared/feature_resource_pool.js",
    resourcePoolTargetPath: "game/scripts/src/rune_weaver/generated/shared/feature_resource_pool.ts",
    resourcePoolClassName: "FeatureResourcePool",
    resourcePoolResourceId: "mana",
    resourceCostComposition: "feature-local-auto-bind",
  },
};

const invalidResourceConsumeEntry: WritePlanEntry = {
  ...resourceConsumeEntry,
  targetPath: "game/scripts/src/rune_weaver/generated/server/feature_resource_consume_invalid.ts",
  parameters: {
    amount: 75,
    resourceType: "mana",
    failBehavior: "soft-block",
  },
};

const writePlan = {
  entries: [bridgeEntry, runtimeEntry],
  deferredWarnings: [`[integration.state_sync_bridge] ${bridgeDeferredReason}`],
} as WritePlan;

const generatorStage = buildGeneratorStage(writePlan, []);

assert.deepEqual(generatorStage.generatedFiles, [runtimeEntry.targetPath]);
assert.deepEqual(generatorStage.deferredEntries, [
  {
    pattern: "integration.state_sync_bridge",
    reason: bridgeDeferredReason,
  },
]);
assert.deepEqual(generatorStage.deferredWarnings, [`[integration.state_sync_bridge] ${bridgeDeferredReason}`]);

assert.throws(
  () =>
    generateCodeContent({
      ...bridgeEntry,
      deferred: false,
      deferredReason: undefined,
    }),
  /placeholder bridge files are not allowed/i
);

const resourceConsumeContent = generateCodeContent(
  resourceConsumeEntry,
  "feature_resource_consume"
);
const resourceCallerContent = generateCodeContent(
  resourceCallerEntry,
  "feature_resource_consume"
);

assert.match(resourceConsumeContent, /Resource consume runtime for effect\.resource_consume/i);
assert.match(resourceConsumeContent, /auto-composes when the same feature provides a compatible resource\.basic_pool companion/i);
assert.match(resourceConsumeContent, /import \{ FeatureResourcePool \} from "\.\.\/shared\/feature_resource_pool\.js"/i);
assert.match(resourceConsumeContent, /ensureComposedPoolBinding\(\): void/i);
assert.match(resourceConsumeContent, /this\.ensureComposedPoolBinding\(\);/i);
assert.match(resourceConsumeContent, /bindPool\(pool: ResourcePoolLike\)/i);
assert.match(resourceConsumeContent, /consumeConfiguredAmount\(playerId: number\)/i);
assert.doesNotMatch(resourceConsumeContent, /默认模块/);
assert.doesNotMatch(resourceConsumeContent, /requires resource\.basic_pool binding before use/i);
assert.doesNotMatch(resourceConsumeContent, /normalized to "block"/i);

assert.equal(
  generateCodeContent(standaloneResourceConsumeMissingPoolEntry),
  `// Deferred: ${standaloneResourceConsumeMissingPoolEntry.deferredReason}\n`
);
assert.equal(
  generateCodeContent(standaloneResourceConsumeMissingCallerEntry),
  `// Deferred: ${standaloneResourceConsumeMissingCallerEntry.deferredReason}\n`
);
assert.throws(
  () => generateCodeContent(invalidResourceConsumeEntry, "feature_resource_consume"),
  /effect\.resource_consume only supports failBehavior "block" or "report"/i
);

assert.match(resourceCallerContent, /import \{ FeatureResourceConsume \} from "\.\/feature_resource_consume\.js"/i);
assert.match(resourceCallerContent, /same-feature input\.key_binding -> effect\.resource_consume \(mana\)/i);
assert.match(resourceCallerContent, /keyBinding\.setHandler\(\(playerId: number\) =>/i);
assert.match(resourceCallerContent, /resourceConsumer\.consumeConfiguredAmount\(playerId\)/i);
assert.match(resourceCallerContent, /registered with canonical resource consume caller/i);

console.log("apps/cli/helpers/artifact-builder.test.ts passed");
