import type { RuneWeaverFeatureRecord } from "../../core/workspace/types.js";
import type {
  FeatureIdentity,
  FeatureOwnership,
  ImpactArea,
  IntegrationPoint,
  IntegrationPointKind,
  IntegrationPointRegistry,
  OwnershipConfidence,
  OwnershipSurface,
} from "./types.js";

export const UI_TRIGGER_KEYWORDS = [
  "ui", "modal", "dialog", "panel", "button", "menu", "hud", "screen",
  "interface", "selection", "choose", "pick", "talent", "upgrade", "inventory",
  "tooltip", "icon", "display", "show", "hide", "popup", "窗口", "界面",
  "选择", "抽取", "天赋", "菜单", "按钮", "提示", "显示",
];

function generateFeatureId(): string {
  return `feature_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

function extractFeatureLabel(request: string): string {
  const requestLower = request.toLowerCase();

  const abilityKeywords = ["ability", "技能", "法", "ability"];
  const buffKeywords = ["buff", "增益", "增强", "提升"];
  const damageKeywords = ["damage", "伤害", "dps"];
  const dashKeywords = ["dash", "冲刺", "位移", "闪避"];
  const talentKeywords = ["talent", "天赋", "升级"];
  const selectionKeywords = ["selection", "选择", "抽取", "三选一", "四选一"];

  if (talentKeywords.some((keyword) => requestLower.includes(keyword))) {
    return "talent_system";
  }
  if (selectionKeywords.some((keyword) => requestLower.includes(keyword))) {
    return "selection_system";
  }
  if (dashKeywords.some((keyword) => requestLower.includes(keyword))) {
    return "dash_ability";
  }
  if (buffKeywords.some((keyword) => requestLower.includes(keyword))) {
    return "buff_effect";
  }
  if (damageKeywords.some((keyword) => requestLower.includes(keyword))) {
    return "damage_ability";
  }
  if (abilityKeywords.some((keyword) => requestLower.includes(keyword))) {
    return "ability";
  }

  return "general_feature";
}

export function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

export function createFeatureIdentity(request: string, hostRoot: string): FeatureIdentity {
  const featureId = generateFeatureId();
  const featureLabel = extractFeatureLabel(request);

  return {
    id: featureId,
    label: featureLabel,
    intentSummary: request.substring(0, 80),
    hostScope: hostRoot,
    currentStage: "intake",
    createdAt: new Date(),
  };
}

export function createFeatureOwnership(featureId: string, request: string, hostRoot: string): FeatureOwnership {
  const requestLower = request.toLowerCase();
  const expectedSurfaces: OwnershipSurface[] = [];
  const impactAreas: ImpactArea[] = [];

  expectedSurfaces.push("trigger");

  if (requestLower.includes("data") || requestLower.includes("pool") || requestLower.includes("list") ||
    requestLower.includes("数据") || requestLower.includes("列表") || requestLower.includes("池")) {
    expectedSurfaces.push("data");
  }

  if (requestLower.includes("rule") || requestLower.includes("logic") || requestLower.includes("condition") ||
    requestLower.includes("规则") || requestLower.includes("逻辑")) {
    expectedSurfaces.push("rule");
  }

  if (UI_TRIGGER_KEYWORDS.some((keyword) => requestLower.includes(keyword))) {
    expectedSurfaces.push("ui");
    impactAreas.push("ui_surface");
  }

  if (requestLower.includes("buff") || requestLower.includes("effect") || requestLower.includes("damage") ||
    requestLower.includes("增益") || requestLower.includes("效果") || requestLower.includes("伤害")) {
    expectedSurfaces.push("effect");
    impactAreas.push("gameplay");
    impactAreas.push("ability_system");
  }

  if (requestLower.includes("shared") || requestLower.includes("global") ||
    requestLower.includes("全局") || requestLower.includes("共享")) {
    expectedSurfaces.push("shared");
  }

  if (expectedSurfaces.length < 2) {
    expectedSurfaces.push("data");
    expectedSurfaces.push("effect");
    impactAreas.push("gameplay");
  }

  if (!impactAreas.includes("gameplay")) {
    impactAreas.push("gameplay");
  }

  if (expectedSurfaces.includes("ui") && !impactAreas.includes("ui_surface")) {
    impactAreas.push("ui_surface");
  }

  let confidence: OwnershipConfidence = "low";
  if (expectedSurfaces.length >= 3 && impactAreas.length >= 2) {
    confidence = "high";
  } else if (expectedSurfaces.length >= 2) {
    confidence = "medium";
  }

  const isComplete = confidence !== "low";

  return {
    featureId,
    expectedSurfaces,
    impactAreas,
    confidence,
    isComplete,
  };
}

export function createIntegrationPointRegistry(featureId: string, request: string, hostRoot: string): IntegrationPointRegistry {
  const requestLower = request.toLowerCase();
  const points: IntegrationPoint[] = [];

  points.push({
    id: `${featureId}_trigger_1`,
    key: "ability_trigger",
    kind: "trigger_binding",
    source: "keyword: trigger/key/QWER",
    reason: "User requested ability activation mechanism",
  });

  points.push({
    id: `${featureId}_kv_1`,
    key: "ability_kv",
    kind: "kv_entry",
    source: "keyword: ability/damage/range",
    reason: "Dota2 ability requires KV definition",
  });

  if (requestLower.includes("buff") || requestLower.includes("effect") || requestLower.includes("增益") || requestLower.includes("效果")) {
    points.push({
      id: `${featureId}_modifier_1`,
      key: "modifier_handler",
      kind: "modifier_slot",
      source: "keyword: buff/effect",
      reason: "Ability applies buff/modifier effect",
    });
  }

  if (requestLower.includes("damage") || requestLower.includes("伤害") || requestLower.includes("dps")) {
    points.push({
      id: `${featureId}_damage_1`,
      key: "damage_handler",
      kind: "effect_slot",
      source: "keyword: damage",
      reason: "Ability deals damage",
    });
  }

  if (UI_TRIGGER_KEYWORDS.some((keyword) => requestLower.includes(keyword))) {
    points.push({
      id: `${featureId}_ui_1`,
      key: "ui_panel",
      kind: "ui_mount",
      source: "keyword: ui/modal/panel",
      reason: "Feature includes UI component",
    });

    points.push({
      id: `${featureId}_panel_event_1`,
      key: "panel_click_event",
      kind: "panel_event",
      source: "keyword: ui/button/interaction",
      reason: "UI requires event handling",
    });
  }

  if (requestLower.includes("event") || requestLower.includes("hook") || requestLower.includes("事件")) {
    points.push({
      id: `${featureId}_event_1`,
      key: "event_hook",
      kind: "event_hook",
      source: "keyword: event/hook",
      reason: "Feature hooks into game events",
    });
  }

  if (requestLower.includes("talent") || requestLower.includes("天赋") || requestLower.includes("升级")) {
    points.push({
      id: `${featureId}_talent_1`,
      key: "talent_pool",
      kind: "data_pool",
      source: "keyword: talent/pool",
      reason: "Talent system requires data pool",
    });

    points.push({
      id: `${featureId}_talent_2`,
      key: "talent_selection",
      kind: "ability_slot",
      source: "keyword: talent/selection",
      reason: "Talent occupies ability slot",
    });
  }

  if (requestLower.includes("selection") || requestLower.includes("choose") || requestLower.includes("选择") || requestLower.includes("抽取")) {
    points.push({
      id: `${featureId}_selection_1`,
      key: "selection_logic",
      kind: "event_hook",
      source: "keyword: selection/choose",
      reason: "Selection requires event handling",
    });
  }

  if (points.length < 3) {
    points.push({
      id: `${featureId}_lua_1`,
      key: "lua_ability",
      kind: "lua_table",
      source: "default: ability logic",
      reason: "Ability requires Lua runtime logic",
    });
  }

  let confidence: OwnershipConfidence = "low";
  if (points.length >= 4) {
    confidence = "high";
  } else if (points.length >= 2) {
    confidence = "medium";
  }

  return {
    featureId,
    points,
    confidence,
  };
}

export function extractIntegrationPoints(feature: RuneWeaverFeatureRecord): IntegrationPointKind[] {
  const points: IntegrationPointKind[] = [];

  if (feature.entryBindings) {
    for (const binding of feature.entryBindings) {
      if (binding.kind === "import" || binding.kind === "register") {
        points.push("trigger_binding");
      }
      if (binding.kind === "mount" || binding.kind === "append_index") {
        points.push("ui_mount");
      }
    }
  }

  if (feature.generatedFiles) {
    for (const file of feature.generatedFiles) {
      if (file.includes("kv/") || file.includes("abilities")) {
        points.push("kv_entry");
      }
      if (file.includes("effect") || file.includes("modifier")) {
        points.push("effect_slot");
      }
      if (file.includes("lua")) {
        points.push("lua_table");
      }
      if (file.includes("panorama") || file.includes("ui")) {
        points.push("ui_mount");
      }
    }
  }

  return [...new Set(points)];
}
