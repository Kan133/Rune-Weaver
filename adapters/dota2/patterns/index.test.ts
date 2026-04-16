import assert from "node:assert/strict";

import { getPatternMeta } from "./index.js";

const resourcePool = getPatternMeta("resource.basic_pool");
assert.ok(resourcePool, "resource.basic_pool should exist in the catalog");
assert.ok(
  !resourcePool!.capabilities.includes("resource.pool.regen"),
  "resource.basic_pool should no longer advertise resource.pool.regen"
);
assert.match(
  resourcePool!.description || "",
  /不承诺自动回复|自动回复/i,
  "resource.basic_pool description should mention that auto-regen is not part of the admitted slice"
);
assert.ok(
  resourcePool!.constraints?.includes("regen 当前仅支持 0；非零值会在下游 honest defer"),
  "resource.basic_pool should constrain regen to 0 in the current admitted slice"
);
assert.deepEqual(resourcePool!.examples?.[0]?.params, { resourceId: "mana", maxValue: 500, regen: 0 });

const resourceConsume = getPatternMeta("effect.resource_consume");
assert.ok(resourceConsume, "effect.resource_consume should exist in the catalog");
const failBehaviorParam = resourceConsume!.parameters?.find((param) => param.name === "failBehavior");
assert.equal(
  failBehaviorParam?.description,
  '不足时的行为；当前 admitted slice 仅支持 "block" 或 "report"'
);
assert.ok(
  resourceConsume!.constraints?.includes(
    'failBehavior 当前仅支持 "block" 或 "report"；其他值会在下游 honest defer'
  ),
  "effect.resource_consume should publicly narrow failBehavior to block/report"
);
assert.match(
  resourceConsume!.description || "",
  /block\/report|block\/report 两种不足处理语义/i
);

const dashPattern = getPatternMeta("effect.dash");
assert.ok(dashPattern, "effect.dash should remain in the catalog");
assert.match(dashPattern!.summary, /deferred/i);
assert.match(dashPattern!.description || "", /deferred/i);
assert.ok(
  dashPattern!.constraints?.includes(
    "当前 broad dash family 仍 deferred；目录保留仅用于能力匹配与显式 honest boundary"
  )
);
assert.match(dashPattern!.examples?.[0]?.description || "", /deferred/i);

const modifierApplier = getPatternMeta("effect.modifier_applier");
assert.ok(modifierApplier, "effect.modifier_applier should remain in the catalog");
assert.match(modifierApplier!.summary, /deferred/i);
assert.match(modifierApplier!.description || "", /deferred/i);
assert.ok(
  modifierApplier!.constraints?.includes(
    "当前 broad modifier application family 仍 deferred；目录保留仅用于能力匹配与显式 honest boundary"
  )
);
assert.match(modifierApplier!.examples?.[0]?.description || "", /deferred/i);

const selectionModal = getPatternMeta("ui.selection_modal");
assert.ok(selectionModal, "ui.selection_modal should remain in the catalog");
assert.match(selectionModal!.description || "", /不承诺暂停游戏/);
assert.match(selectionModal!.description || "", /card_tray/i);
const layoutPresetParam = selectionModal!.parameters?.find((param) => param.name === "layoutPreset");
assert.equal(layoutPresetParam?.description, '布局预设；当前 admitted slice 仅支持 "card_tray"');
const selectionModeParam = selectionModal!.parameters?.find((param) => param.name === "selectionMode");
assert.equal(selectionModeParam?.description, '选择模式；当前 admitted slice 仅支持 "single"');
assert.ok(
  selectionModal!.constraints?.includes("当前 admitted slice 不自动暂停游戏或冻结宿主时间流"),
  "ui.selection_modal should stop claiming game pause behavior"
);
assert.ok(
  selectionModal!.constraints?.includes('layoutPreset 当前仅支持 "card_tray"；其他值需要 honest defer 或后续专门实现'),
  "ui.selection_modal should publicly narrow layoutPreset"
);
assert.ok(
  selectionModal!.constraints?.includes('selectionMode 当前仅支持 "single"；多选语义尚未在当前 UI family 中 admitted'),
  "ui.selection_modal should publicly narrow selectionMode"
);
assert.match(selectionModal!.examples?.[0]?.description || "", /card_tray/i);

const bridgePattern = getPatternMeta("integration.state_sync_bridge");
assert.ok(bridgePattern, "integration.state_sync_bridge should remain in the catalog");
assert.match(bridgePattern!.description || "", /省略独立 bridge 文件|deliberately elided/i);
const stateChannelsParam = bridgePattern!.parameters?.find((param) => param.name === "stateChannels");
assert.equal(
  stateChannelsParam?.description,
  "兼容性标记；当前 admitted slice 仅记录已声明的选择状态通道，如 candidate_pool / selection_commit"
);
const eventNamesParam = bridgePattern!.parameters?.find((param) => param.name === "eventNames");
assert.equal(
  eventNamesParam?.description,
  "兼容性标记；当前 admitted slice 不把事件名扩展为自由配置 bridge surface"
);
assert.ok(
  bridgePattern!.constraints?.includes(
    "stateChannels / eventNames 当前仅作为 compatibility hints；不会 materialize 成自由配置的桥接文件"
  ),
  "integration.state_sync_bridge should narrow stateChannels/eventNames to compatibility hints"
);
assert.ok(
  bridgePattern!.constraints?.includes(
    "当前 Dota2 admitted slice routed 但 deliberately elided；不生成 standalone bridge output"
  ),
  "integration.state_sync_bridge should explicitly admit routed+elided write behavior"
);
assert.match(bridgePattern!.examples?.[0]?.description || "", /deliberately elided/i);

console.log("adapters/dota2/patterns/index.test.ts passed");
