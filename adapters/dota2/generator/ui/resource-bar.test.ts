import assert from "node:assert/strict";

import { generateLessStyles } from "./less-styles.js";
import { generateResourceBarComponent } from "./resource-bar.js";
import type { WritePlanEntry } from "../../assembler/index.js";

const componentEntry: WritePlanEntry = {
  operation: "create",
  sourcePattern: "ui.resource_bar",
  sourceModule: "ui_resource",
  targetPath: "content/panorama/src/rune_weaver/generated/ui/feature_ui_resource_bar.tsx",
  contentType: "tsx",
  contentSummary: "Generate static resource bar UI",
  safe: true,
  parameters: {
    resourceId: "mana",
    displayName: "Mana",
    stylePreset: "compact",
  },
};

const lessEntry: WritePlanEntry = {
  ...componentEntry,
  targetPath: "content/panorama/src/rune_weaver/generated/ui/feature_ui_resource_bar.less",
  contentType: "less",
};

const componentCode = generateResourceBarComponent(
  "FeatureUiResourceBar",
  "feature_ui_resource_bar",
  componentEntry
);
assert.match(componentCode, /label = "Mana"/);
assert.match(componentCode, /stylePreset = "compact"/);
assert.match(componentCode, /feature_ui_resource_bar-root/);
assert.match(componentCode, /feature_ui_resource_bar-variant-/);
assert.doesNotMatch(componentCode, /TODO/);
assert.doesNotMatch(componentCode, /useEffect/);
assert.doesNotMatch(componentCode, /setInterval/);
assert.doesNotMatch(componentCode, /CustomNetTables/);

const lessCode = generateLessStyles("ui.resource_bar", lessEntry, "feature_ui_resource_bar");
assert.match(lessCode, /\.feature_ui_resource_bar-root/);
assert.match(lessCode, /\.feature_ui_resource_bar-track/);
assert.match(lessCode, /\.feature_ui_resource_bar-variant-compact/);
assert.doesNotMatch(lessCode, /TODO/);

console.log("adapters/dota2/generator/ui/resource-bar.test.ts passed");
