import assert from "node:assert/strict";

import { toPascalCase } from "../generator/common/naming.js";
import { generateUIIndex } from "./refresh-ui-index.js";
import { toGeneratedComponentExportName, toGeneratedUiComponentName } from "./component-naming.js";

assert.equal(
  toGeneratedUiComponentName("reveal_batch_demo_ui_surface_mod_typed_rarity_card_ui_2"),
  "RevealBatchDemoUiSurfaceModTypedRarityCardUi_2",
);
assert.equal(
  toGeneratedUiComponentName("equipment-draw_demo"),
  "EquipmentDrawDemo",
);
assert.equal(
  toGeneratedUiComponentName("standalone_system_93oj_selection_modal"),
  "StandaloneSystem_93ojSelectionModal",
);
assert.equal(
  toGeneratedComponentExportName("standalone_system_93oj_selection_modal"),
  "StandaloneSystem_93ojSelectionModal",
);
assert.equal(
  toPascalCase("standalone_system_93oj_selection_modal"),
  "StandaloneSystem_93ojSelectionModal",
);

const generatedIndex = generateUIIndex({
  features: [
    {
      featureId: "standalone_system_93oj_selection_modal",
      componentName: "ignored_by_index_builder",
    },
  ],
});

assert.match(
  generatedIndex.content,
  /import \{ StandaloneSystem_93ojSelectionModal \} from "\.\/standalone_system_93oj_selection_modal";/,
);
assert.match(
  generatedIndex.content,
  /<StandaloneSystem_93ojSelectionModal \/>/,
);
assert.match(
  generatedIndex.content,
  /export \{ StandaloneSystem_93ojSelectionModal \} from "\.\/standalone_system_93oj_selection_modal";/,
);

console.log("adapters/dota2/ui/component-naming.test.ts passed");
