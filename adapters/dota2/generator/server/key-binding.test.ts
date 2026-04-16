import assert from "node:assert/strict";

import { generateKeyBindingCode } from "./key-binding.js";
import type { WritePlanEntry } from "../../assembler/index.js";

function createEntry(overrides: Partial<WritePlanEntry> = {}): WritePlanEntry {
  return {
    operation: "create",
    targetPath: "game/scripts/src/rune_weaver/generated/server/feature_resource_key_binding.ts",
    contentType: "typescript",
    contentSummary: "input/input.key_binding (typescript) params: {}",
    sourcePattern: "input.key_binding",
    sourceModule: "resource_input",
    safe: true,
    parameters: {
      triggerKey: "F4",
    },
    ...overrides,
  };
}

{
  const code = generateKeyBindingCode(
    "FeatureResourceKeyBinding",
    "standalone_system_resource",
    createEntry({
      metadata: {
        resourceInvocationImportPath: "./feature_resource_consume.js",
        resourceInvocationTargetPath: "game/scripts/src/rune_weaver/generated/server/feature_resource_consume.ts",
        resourceInvocationClassName: "FeatureResourceConsume",
        resourceInvocationMode: "resource-consume-configured",
        resourceInvocationResourceType: "mana",
      },
    })
  );

  assert.match(code, /import \{ FeatureResourceConsume \} from "\.\/feature_resource_consume\.js"/i);
  assert.match(code, /same-feature input\.key_binding -> effect\.resource_consume \(mana\)/i);
  assert.match(code, /const resourceConsumer = FeatureResourceConsume\.getInstance\(\);/i);
  assert.match(code, /keyBinding\.setHandler\(\(playerId: number\) =>/i);
  assert.match(code, /resourceConsumer\.consumeConfiguredAmount\(playerId\)/i);
  assert.match(code, /registered with canonical resource consume caller/i);
}

{
  const code = generateKeyBindingCode(
    "FeatureResourceKeyBinding",
    "standalone_system_resource",
    createEntry()
  );

  assert.doesNotMatch(code, /FeatureResourceConsume/);
  assert.doesNotMatch(code, /consumeConfiguredAmount/);
  assert.match(code, /FeatureResourceKeyBinding\.getInstance\(\);/i);
  assert.match(code, /\[Rune Weaver\] FeatureResourceKeyBinding registered/i);
}

console.log("adapters/dota2/generator/server/key-binding.test.ts passed");
