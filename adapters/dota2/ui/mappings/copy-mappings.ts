/**
 * Copy Mappings for Dota2 UI Adapter
 * 
 * 将 UIDesignSpec 的文案相关字段映射到具体文案内容
 */

import { UIDesignSpec } from "../../../../core/schema/types.js";

export interface CopyContent {
  title: string;
  buttonText: string;
  hintText: string;
  emptyText: string;
}

// Tone-based copy templates
const toneTemplates: Record<string, {
  title: string;
  buttonText: string;
  hintText: string;
  emptyText: string;
}> = {
  formal: {
    title: "请选择一个选项",
    buttonText: "确认",
    hintText: "按 {key} 使用",
    emptyText: "暂无数据",
  },
  casual: {
    title: "挑一个吧",
    buttonText: "确定",
    hintText: "按 {key} 就行",
    emptyText: "什么都没有",
  },
  epic: {
    title: "选择你的命运",
    buttonText: "觉醒",
    hintText: "按下 {key} 释放力量",
    emptyText: "命运尚未开启",
  },
  minimal: {
    title: "选择",
    buttonText: "OK",
    hintText: "{key}",
    emptyText: "-",
  },
};

// Copy hint processors
function processCopyHints(baseCopy: CopyContent, copyHints?: string[]): CopyContent {
  if (!copyHints || copyHints.length === 0) {
    return baseCopy;
  }

  let result = { ...baseCopy };

  for (const hint of copyHints) {
    // Simple keyword-based replacement
    if (hint.includes("简短") || hint.includes("极简")) {
      result.title = result.title.split(" ")[0] || "选择";
      result.buttonText = "OK";
    }
    if (hint.includes("力量") || hint.includes("power")) {
      result.title = result.title.replace("选项", "力量");
      result.title = result.title.replace("命运", "力量觉醒");
    }
    if (hint.includes("命运") || hint.includes("fate")) {
      result.title = "选择你的命运";
      result.buttonText = "觉醒";
    }
    if (hint.includes("神秘") || hint.includes("mystery")) {
      result.title = "揭示神秘";
      result.hintText = "神秘的 {key} 键";
    }
  }

  return result;
}

export function generateCopyContent(designSpec: UIDesignSpec): CopyContent {
  const tone = designSpec.visualStyle?.tone || "formal";
  const baseTemplate = toneTemplates[tone] || toneTemplates.formal;
  
  return processCopyHints(baseTemplate, designSpec.copyHints);
}

// Generate feedback flags from feedbackHints
export function generateFeedbackFlags(feedbackHints?: string[]): {
  hasSound: boolean;
  hasAnimation: boolean;
  hasParticle: boolean;
} {
  const hints = feedbackHints || [];
  
  return {
    hasSound: hints.includes("sound"),
    hasAnimation: hints.includes("animation"),
    hasParticle: hints.includes("particle"),
  };
}

// Generate interaction mode flags
export function generateInteractionFlags(interactionMode?: string): {
  isBlocking: boolean;
  isLightweight: boolean;
  isPersistent: boolean;
} {
  const mode = interactionMode || "blocking";
  
  return {
    isBlocking: mode === "blocking",
    isLightweight: mode === "lightweight",
    isPersistent: mode === "persistent",
  };
}
