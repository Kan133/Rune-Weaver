/**
 * Dota2 Adapter - Code Generator
 * 
 * 根据 WritePlanEntry 生成真实可执行的宿主代码
 * T034 修复：从 contentSummary 改为生成真实代码
 */

import { WritePlanEntry } from "../assembler/index.js";
import { generateAbilityLuaWrapper, AbilityLuaWrapperConfig, AbilityModifierConfig } from "./lua-ability/index.js";
import { generateAbilityKV, KVGeneratorInput } from "./kv/index.js";
import { generateWeightedPoolCode } from "./server/weighted-pool.js";
import { generateSelectionFlowCode } from "./server/selection-flow.js";
import { generateOutcomeRealizerCode } from "./server/outcome-realizer.js";
import { generateKeyBindingCode } from "./server/key-binding.js";
import { generateDashEffectCode } from "./server/dash-effect.js";
import { generateResourcePoolCode } from "./server/resource-pool.js";
import { generateResourceConsumeCode } from "./server/resource-consume.js";
import { generateDefaultServerCode } from "./server/default-server.js";
import { generateSelectionModalComponent } from "./ui/selection-modal.js";
import { generateKeyBindingEmitterComponent } from "./ui/key-binding-emitter.js";
import { generateKeyHintComponent } from "./ui/key-hint.js";
import { generateResourceBarComponent } from "./ui/resource-bar.js";
import { generateDefaultUIComponent } from "./ui/default-ui.js";
import { generateLessStyles } from "./ui/less-styles.js";
import { toPascalCase } from "./common/naming.js";

/**
 * 生成结果
 */
export interface GeneratedCode {
  /** 完整代码内容 */
  content: string;
  /** 代码语言 */
  language: "typescript" | "tsx" | "less" | "css" | "json" | "lua" | "kv";
  /** 导出的符号名 */
  exports: string[];
}

/**
 * Generate Lua ability wrapper code for Dota2 ability_lua system.
 *
 * T125-R1: Mainline integration of generateAbilityLuaWrapper().
 *
 * Delegates to lua-ability generator with same-file modifier support.
 * Extracts config from WritePlanEntry's metadata when available,
 * or uses sensible defaults from patternId.
 */
function generateLuaAbilityCode(
  patternId: string,
  entry: WritePlanEntry,
  featureId: string
): GeneratedCode {
  // Merge parameters + metadata so write-stage overrides (for example resolved abilityName)
  // can refine generator behavior without losing pattern parameters.
  const caseParams = {
    ...(entry.parameters || {}),
    ...(entry.metadata || {}),
  };
  const abilityName = caseParams.abilityName as string || patternId.replace(/[^a-zA-Z0-9_]/g, "_");
  const modifierConfig = caseParams.modifierConfig as AbilityModifierConfig | undefined;

  const config: AbilityLuaWrapperConfig = {
    abilityName,
    onSpellStart: caseParams.onSpellStart as string | undefined,
    additionalMethods: caseParams.additionalMethods as string | undefined,
    modifierConfig,
  };

  const content = generateAbilityLuaWrapper(config);

  return {
    content,
    language: "lua",
    exports: [abilityName, ...(modifierConfig ? [modifierConfig.name] : [])],
  };
}

function generateKVCode(
  patternId: string,
  entry: WritePlanEntry,
  featureId: string
): GeneratedCode {
  const patternSegment = patternId.includes(".")
    ? patternId.split(".").pop() || patternId
    : patternId;
  const baseName = patternSegment;
  const featureSegment = entry.targetPath.includes("feature_")
    ? entry.targetPath.match(/feature_([^/]+)/)?.[1]
    : entry.targetPath.includes("micro_feature_")
      ? entry.targetPath.match(/micro_feature_([^/]+)/)?.[1]
      : featureId;
  const entryMetadata = entry.metadata || {};
  const abilityName = (entryMetadata.abilityName as string | undefined)
    || (featureSegment
      ? `rw_${featureSegment}_${baseName}`
      : `rw_${baseName}`);
  const params = {
    cooldown: entryMetadata.abilityCooldown as string | undefined,
    manaCost: entryMetadata.abilityManaCost as string | undefined,
    duration: entryMetadata.abilityDuration as string | undefined,
    castRange: entryMetadata.abilityCastRange as string | undefined,
  };

  const kvInput: KVGeneratorInput = {
    routeId: `route_${patternId}_kv`,
    sourceUnitId: entry.sourceModule,
    generatorFamily: "dota2-kv",
    hostTarget: "ability_kv",
    abilityConfig: {
      abilityName,
      baseClass: (entryMetadata.abilityBaseClass as string | undefined) || "ability_datadriven",
      abilityType:
        ((entryMetadata.abilityType as KVGeneratorInput["abilityConfig"]["abilityType"] | undefined) ||
          "DOTA_ABILITY_TYPE_BASIC"),
      behavior: (entryMetadata.abilityBehavior as string | undefined) || "DOTA_ABILITY_BEHAVIOR_NO_TARGET",
      abilityCooldown: params.cooldown || "8.0",
      abilityManaCost: params.manaCost || "50",
      abilityCastRange: params.castRange || "0",
      abilityCastPoint: "0.1",
      maxLevel: "4",
      requiredLevel: "1",
      levelsBetweenUpgrades: "3",
      scriptFile: entryMetadata.scriptFile as string | undefined,
      specials: entryMetadata.specials as KVGeneratorInput["abilityConfig"]["specials"] | undefined,
      precache: [],
    },
    rationale: [
      `Generated from pattern: ${patternId}`,
      `Module: ${entry.sourceModule}`,
      `Feature: ${featureSegment}`,
    ],
    blockers: entry.deferred ? [entry.deferredReason || "Entry marked deferred"] : [],
  };

  const kvOutput = generateAbilityKV(kvInput);

  return {
    content: kvOutput.kvBlock,
    language: "kv",
    exports: [abilityName],
  };
}

/**
 * 根据 Pattern ID 生成服务端代码
 */
function generateServerCode(
  patternId: string,
  entry: WritePlanEntry,
  featureId: string
): string {
  const baseName = entry.targetPath.split("/").pop()?.replace(".ts", "") || "module";
  const className = toPascalCase(baseName);
  
  switch (patternId) {
    case "input.key_binding":
      return generateKeyBindingCode(className, featureId, entry);
    case "effect.dash":
      return generateDashEffectCode(className, featureId, entry);
    case "effect.resource_consume":
      return generateResourceConsumeCode(className, featureId, entry);
    case "resource.basic_pool":
      return generateResourcePoolCode(className, featureId, entry);
    case "data.weighted_pool":
      // GP-1: Use enhanced weighted pool generator with session state support
      return generateWeightedPoolCode(className, featureId, entry);
    case "rule.selection_flow":
      // GP-2: Use enhanced selection flow generator with commit/events support
      return generateSelectionFlowCode(className, featureId, entry);
    case "effect.outcome_realizer":
      return generateOutcomeRealizerCode(className, featureId, entry);
    case "ui.key_hint":
    case "ui.selection_modal":
    case "ui.resource_bar":
      // UI patterns 应该生成在 panorama，这里返回空或注释
      return `// UI Pattern '${patternId}' should be generated in panorama directory\n`;
    default:
      return generateDefaultServerCode(className, featureId, entry);
  }
}

/**
 * 生成 UI 代码 (TSX)
 */
function generateUICode(
  patternId: string,
  entry: WritePlanEntry,
  featureId: string
): string {
  const baseName = entry.targetPath.split("/").pop()?.replace(".tsx", "") || "Component";
  const componentName = toPascalCase(baseName);
  
  switch (patternId) {
    case "input.key_binding":
      return generateKeyBindingEmitterComponent(componentName, featureId, entry);
    case "ui.key_hint":
      return generateKeyHintComponent(componentName, featureId, entry);
    case "ui.selection_modal":
      // GP-4: Use enhanced selection modal generator with placeholder support
      return generateSelectionModalComponent(componentName, featureId, entry);
    case "ui.resource_bar":
      return generateResourceBarComponent(componentName, featureId, entry);
    default:
      return generateDefaultUIComponent(componentName, featureId);
  }
}

/**
 * 主生成函数
 */
export function generateCode(
  entry: WritePlanEntry,
  featureId: string
): GeneratedCode {
  const patternId = entry.sourcePattern;
  const isUI = entry.targetPath.includes("panorama");
  const isLess = entry.targetPath.endsWith(".less");
  const isLua = entry.contentType === "lua" || entry.targetPath.endsWith(".lua");
  const isKV = entry.contentType === "kv";
  const isJson = entry.contentType === "json" || entry.targetPath.endsWith(".json");

  if (isLua) {
    return generateLuaAbilityCode(patternId, entry, featureId);
  }

  if (isKV) {
    return generateKVCode(patternId, entry, featureId);
  }

  if (isJson) {
    return {
      content: `${JSON.stringify(entry.parameters || {}, null, 2)}\n`,
      language: "json",
      exports: [],
    };
  }

  let content: string;
  let language: "typescript" | "tsx" | "less" | "css" | "json";
  let exports: string[] = [];

  if (isLess) {
    content = generateLessStyles(patternId, entry, featureId);
    language = "less";
  } else if (isUI) {
    content = generateUICode(patternId, entry, featureId);
    language = "tsx";
    // 提取导出的组件名
    const baseName = entry.targetPath.split("/").pop()?.replace(".tsx", "") || "Component";
    exports = [toPascalCase(baseName)];
  } else {
    content = generateServerCode(patternId, entry, featureId);
    language = "typescript";
    // 提取导出的类名和函数名
    const baseName = entry.targetPath.split("/").pop()?.replace(".ts", "") || "Module";
    exports = [toPascalCase(baseName), `register${toPascalCase(baseName)}`];
  }

  return {
    content,
    language,
    exports,
  };
}
