import assert from "node:assert/strict";

import { generateLessStyles } from "./less-styles.js";
import { generateKeyHintComponent } from "./key-hint.js";
import type { WritePlanEntry } from "../../assembler/index.js";

const componentEntry: WritePlanEntry = {
  operation: "create",
  sourcePattern: "ui.key_hint",
  sourceModule: "ui_hint",
  targetPath: "content/panorama/src/rune_weaver/generated/ui/feature_ui_key_hint.tsx",
  contentType: "tsx",
  contentSummary: "Generate static key hint UI",
  safe: true,
  parameters: {
    key: "F4",
    text: "Open talent draft",
    positionHint: "top right",
  },
};

const lessEntry: WritePlanEntry = {
  ...componentEntry,
  targetPath: "content/panorama/src/rune_weaver/generated/ui/feature_ui_key_hint.less",
  contentType: "less",
};

const componentCode = generateKeyHintComponent(
  "FeatureUiKeyHint",
  "feature_ui_key_hint",
  componentEntry
);
assert.match(componentCode, /keyText = "F4"/);
assert.match(componentCode, /text = "Open talent draft"/);
assert.match(componentCode, /feature_ui_key_hint-root/);
assert.match(componentCode, /feature_ui_key_hint-position-/);
assert.doesNotMatch(componentCode, /TODO/);
assert.doesNotMatch(componentCode, /useEffect/);
assert.doesNotMatch(componentCode, /setIsPressed/);

const lessCode = generateLessStyles("ui.key_hint", lessEntry, "feature_ui_key_hint");
assert.match(lessCode, /\.feature_ui_key_hint-root/);
assert.match(lessCode, /\.feature_ui_key_hint-key/);
assert.match(lessCode, /\.feature_ui_key_hint-position-top-right/);
assert.doesNotMatch(lessCode, /TODO/);

console.log("adapters/dota2/generator/ui/key-hint.test.ts passed");
