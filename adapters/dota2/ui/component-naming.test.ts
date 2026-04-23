import assert from "node:assert/strict";

import { toGeneratedUiComponentName } from "./component-naming.js";

assert.equal(
  toGeneratedUiComponentName("reveal_batch_demo_ui_surface_mod_typed_rarity_card_ui_2"),
  "RevealBatchDemoUiSurfaceModTypedRarityCardUi2",
);
assert.equal(
  toGeneratedUiComponentName("equipment-draw_demo"),
  "EquipmentDrawDemo",
);

console.log("adapters/dota2/ui/component-naming.test.ts passed");
