import { UI_TRIGGER_KEYWORDS } from "./intake-analysis.js";
import type {
  ClarificationResult,
  KnownInputs,
  UIDetectionResult,
  UIIntakeResult,
} from "./types.js";

const UI_SURFACE_KEYWORDS: Record<string, string[]> = {
  modal: ["modal", "dialog", "弹出", "选择", "抽取", "talent", "天赋"],
  panel: ["panel", "hud", "界面", "窗口", "screen", "menu", "菜单"],
  selection: ["selection", "choose", "pick", "选择", "三选一", "四选一"],
  tooltip: ["tooltip", "提示", "信息"],
  bar: ["bar", "进度条", "资源条"],
};

const KEY_PARAM_PATTERNS = {
  trigger: ["按", "key", "trigger", "按键", "绑定", "press", "Q", "W", "E", "R", "F"],
  damage: ["damage", "伤害", "dps", "damage", "数值", "50", "100", "200"],
  range: ["range", "范围", "距离", "300", "400", "500", "600"],
  duration: ["duration", "持续", "秒", "时间", "10", "30", "60"],
  cooldown: ["cooldown", "冷却", "cd", "30", "60", "120"],
  target: ["target", "目标", "enemy", "self", "友方", "敌方"],
};

export function extractKnownInputs(request: string): KnownInputs {
  const requestLower = request.toLowerCase();
  const known: KnownInputs = {};

  const keyMatch = request.match(/\b([QWERF])\b/i);
  if (keyMatch) {
    known.trigger = keyMatch[1].toUpperCase();
  }

  const damageMatch = requestLower.match(/(\d+)\s*(damage|伤害|dps)/);
  if (damageMatch) {
    known.damage = damageMatch[1];
  }

  const rangeMatch = requestLower.match(/(\d+)\s*(range|范围|距离)/);
  if (rangeMatch) {
    known.range = rangeMatch[1];
  }

  const durationMatch = requestLower.match(/(\d+)\s*(秒|second|duration|持续)/);
  if (durationMatch) {
    known.duration = durationMatch[1];
  }

  const cooldownMatch = requestLower.match(/(\d+)\s*(cooldown|冷却|cd)/);
  if (cooldownMatch) {
    known.cooldown = cooldownMatch[1];
  }

  if (requestLower.includes("enemy") || requestLower.includes("敌方") || requestLower.includes("目标")) {
    known.target = "enemy";
  } else if (requestLower.includes("self") || requestLower.includes("自身") || requestLower.includes("自己")) {
    known.target = "self";
  }

  if (requestLower.includes("dash") || requestLower.includes("冲刺") || requestLower.includes("位移") ||
    requestLower.includes("blink") || requestLower.includes("闪现") || requestLower.includes("jump")) {
    known.abilityType = "dash";
  } else if (requestLower.includes("buff") || requestLower.includes("增益") || requestLower.includes("增强") ||
    requestLower.includes("debuff") || requestLower.includes("负面")) {
    known.abilityType = "buff";
  } else if (requestLower.includes("talent") || requestLower.includes("天赋") || requestLower.includes("抽取")) {
    known.abilityType = "talent";
  } else if (requestLower.includes("damage") || requestLower.includes("伤害") || requestLower.includes("攻击")) {
    known.abilityType = "damage";
  } else if (requestLower.includes("heal") || requestLower.includes("治疗") || requestLower.includes("恢复")) {
    known.abilityType = "heal";
  }

  if (requestLower.includes("zone") || requestLower.includes("区域") || requestLower.includes("地点") ||
    requestLower.includes("location") || requestLower.includes("rw_")) {
    known.zone = "detected";
  }

  if (requestLower.includes("选择") || requestLower.includes("选") || requestLower.includes("select") ||
    requestLower.includes("modal") || requestLower.includes("弹窗") || requestLower.includes("panel")) {
    known.uiType = "selection";
  } else if (requestLower.includes("hint") || requestLower.includes("提示") || requestLower.includes("hotkey")) {
    known.uiType = "hint";
  }

  if (requestLower.includes("choice") || requestLower.includes("三选") || requestLower.includes("多选") ||
    requestLower.includes("随机") || requestLower.includes("random")) {
    known.choiceCount = "detected";
  }

  return known;
}

export function detectMissingKeyParams(request: string): ClarificationResult {
  const requestLower = request.toLowerCase();
  const missingParams: string[] = [];
  const suggestions: string[] = [];

  const isTalentOrSelection = requestLower.includes("talent") || requestLower.includes("天赋") ||
    requestLower.includes("选择") || requestLower.includes("modal") ||
    requestLower.includes("selection") || requestLower.includes("抽取");
  const isDashOrMovement = requestLower.includes("dash") || requestLower.includes("冲刺") ||
    requestLower.includes("位移") || requestLower.includes("blink") ||
    requestLower.includes("movement") || requestLower.includes("移动");
  const isHealOrBuff = requestLower.includes("heal") || requestLower.includes("治疗") ||
    requestLower.includes("buff") || requestLower.includes("增益");

  for (const [param, keywords] of Object.entries(KEY_PARAM_PATTERNS)) {
    const hasParam = keywords.some((keyword) => requestLower.includes(keyword.toLowerCase()));
    if (!hasParam) {
      let shouldAsk = true;

      if (isTalentOrSelection && ["damage", "range"].includes(param)) {
        shouldAsk = false;
      } else if (isDashOrMovement && param === "damage") {
        shouldAsk = false;
      } else if (isHealOrBuff && param === "damage") {
        shouldAsk = false;
      } else if (requestLower.includes("simple") || requestLower.includes("简单") ||
        requestLower.includes("基础") || requestLower.includes("basic")) {
        shouldAsk = false;
      }

      if (shouldAsk) {
        switch (param) {
          case "trigger":
            if (!isTalentOrSelection) {
              missingParams.push("trigger/key_binding");
              suggestions.push("Consider specifying trigger key (e.g., Q, W, E, R, F)");
            }
            break;
          case "damage":
            if (!isTalentOrSelection && !isDashOrMovement && !isHealOrBuff) {
              missingParams.push("damage_value");
              suggestions.push("Consider specifying damage value");
            }
            break;
          case "range":
            if (!isTalentOrSelection) {
              missingParams.push("range");
              suggestions.push("Consider specifying ability range");
            }
            break;
          case "duration":
            missingParams.push("duration");
            suggestions.push("Consider specifying effect duration");
            break;
          case "cooldown":
            missingParams.push("cooldown");
            suggestions.push("Consider specifying cooldown");
            break;
          case "target":
            missingParams.push("target_type");
            suggestions.push("Consider specifying target type (enemy/self/ally)");
            break;
        }
      }
    }
  }

  const hasAnyKeyParam = Object.entries(KEY_PARAM_PATTERNS).some(
    ([, keywords]) => keywords.some((keyword) => requestLower.includes(keyword.toLowerCase())),
  );

  return {
    hasMissingKeyParams: missingParams.length > 0 && !hasAnyKeyParam,
    missingParams: missingParams.slice(0, 3),
    suggestions: suggestions.slice(0, 3),
  };
}

export function detectUIRequirements(request: string): UIDetectionResult {
  const requestLower = request.toLowerCase();
  const detectedUITriggers: string[] = [];

  for (const keyword of UI_TRIGGER_KEYWORDS) {
    if (requestLower.includes(keyword.toLowerCase())) {
      detectedUITriggers.push(keyword);
    }
  }

  const uiNeeded = detectedUITriggers.length > 0;

  return {
    uiNeeded,
    detectedUITriggers: detectedUITriggers.slice(0, 5),
    uiBranchRecommended: uiNeeded && detectedUITriggers.some((trigger) =>
      ["modal", "dialog", "selection", "choose", "pick", "talent", "选择", "抽取", "天赋"].includes(trigger),
    ),
  };
}

export function collectUIIntake(request: string, uiDetection: UIDetectionResult): UIIntakeResult {
  const requestLower = request.toLowerCase();
  const missingInfo: string[] = [];

  let surfaceType: string | undefined;
  for (const [type, keywords] of Object.entries(UI_SURFACE_KEYWORDS)) {
    if (keywords.some((keyword) => requestLower.includes(keyword.toLowerCase()))) {
      surfaceType = type;
      break;
    }
  }
  if (!surfaceType) {
    surfaceType = "modal";
    missingInfo.push("surface_type_inferred_as_modal");
  }

  let interactionLevel: string | undefined;
  if (requestLower.includes("简单") || requestLower.includes("simple") || requestLower.includes("minimal")) {
    interactionLevel = "minimal";
  } else if (requestLower.includes("复杂") || requestLower.includes("complex") || requestLower.includes("many")) {
    interactionLevel = "high";
  } else if (requestLower.includes("中等") || requestLower.includes("medium")) {
    interactionLevel = "medium";
  } else {
    interactionLevel = "low";
  }

  const hasChoices = requestLower.includes("选择") || requestLower.includes("choice") || requestLower.includes("pick");
  const hasTimer = requestLower.includes("倒计时") || requestLower.includes("timer") || requestLower.includes("时间");
  let infoDensity = "low";
  if (hasChoices && hasTimer) {
    infoDensity = "high";
  } else if (hasChoices || hasTimer) {
    infoDensity = "medium";
  }

  if (!surfaceType) {
    missingInfo.push("surface_type");
  }

  const canProceed = surfaceType !== undefined;

  return {
    entered: true,
    surfaceType,
    interactionLevel,
    infoDensity,
    missingInfo,
    canProceed,
  };
}
