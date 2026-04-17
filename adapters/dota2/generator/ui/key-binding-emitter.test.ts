import assert from "node:assert/strict";

import { generateKeyBindingEmitterComponent } from "./key-binding-emitter.js";
import type { WritePlanEntry } from "../../assembler/index.js";

function createEntry(overrides: Partial<WritePlanEntry> = {}): WritePlanEntry {
  return {
    operation: "create",
    sourcePattern: "input.key_binding",
    sourceModule: "input_trigger",
    targetPath: "content/panorama/src/rune_weaver/generated/ui/feature_input_key_binding_emitter.tsx",
    contentType: "tsx",
    contentSummary: "input/input.key_binding (tsx) params: {} [ui-emitter]",
    safe: true,
    parameters: {
      triggerKey: "F4",
      eventName: "rune_weaver_selection_pool_triggered",
    },
    ...overrides,
  };
}

{
  const code = generateKeyBindingEmitterComponent(
    "FeatureInputKeyBindingEmitter",
    "talent_draw_demo",
    createEntry(),
  );

  assert.match(code, /registerCustomKey/);
  assert.match(code, /setKeyDownCallback/);
  assert.match(code, /RuneWeaverInputBindingRegistry/);
  assert.match(code, /GameEvents\.SendCustomGameEventToServer/);
  assert.match(code, /rune_weaver_selection_pool_triggered/);
  assert.match(code, /featureId,\s*\n\s*\}\);/);
  assert.match(code, /return null;/);
  assert.doesNotMatch(code, /rune_weaver_show_selection/);
}

{
  let error: unknown;
  try {
    generateKeyBindingEmitterComponent(
      "FeatureInputKeyBindingEmitter",
      "talent_draw_demo",
      createEntry({
        parameters: {
          eventName: "rune_weaver_selection_pool_triggered",
        },
      }),
    );
  } catch (caught) {
    error = caught;
  }

  assert.ok(error instanceof Error);
  assert.match((error as Error).message, /requires an explicit triggerKey\/key parameter/i);
}

console.log("adapters/dota2/generator/ui/key-binding-emitter.test.ts passed");
