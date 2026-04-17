import { IntentSchema } from "../schema/types";
import { stateLooksLikePersistedChoiceState } from "./seam-authority";
import { collectIntentStrings } from "./semantic-lexical";

export function isResolvableExistingSeamIssue(value: string, schema: IntentSchema): boolean {
  if (isBoundedVariabilityClarification(value)) {
    return true;
  }

  if (isEffectLifecycleVariabilityClarification(value) && hasSupportedModifierLifecycleContext(schema)) {
    return true;
  }

  if (!isSupportedTriChoiceBuffFamilyContext(schema)) {
    return false;
  }

  return (
    !explicitlyReopensSupportedFamilyArchitecture(value) &&
    (isSupportedTriChoicePolishIssue(value) || isSupportedTriChoiceCatalogIssue(value))
  );
}

function isBoundedVariabilityClarification(question: string): boolean {
  const normalized = question.toLowerCase();
  const mentionsDetail =
    normalized.includes("具体内容") ||
    normalized.includes("具体数值") ||
    normalized.includes("具体的增益列表") ||
    normalized.includes("增益列表") ||
    normalized.includes("属性类型") ||
    normalized.includes("力量") ||
    normalized.includes("敏捷") ||
    normalized.includes("智力") ||
    normalized.includes("攻击力") ||
    normalized.includes("护甲") ||
    normalized.includes("数值") ||
    normalized.includes("名称") ||
    normalized.includes("图标") ||
    normalized.includes("icon") ||
    normalized.includes("resource path") ||
    normalized.includes("资源路径") ||
    normalized.includes("attribute values") ||
    normalized.includes("属性加成数值");
  const mentionsArchitectureGap =
    normalized.includes("what triggers") ||
    normalized.includes("trigger") ||
    normalized.includes("which existing systems") ||
    normalized.includes("integrate with") ||
    normalized.includes("multi-factor") ||
    normalized.includes("abilities") ||
    normalized.includes("items") ||
    normalized.includes("custom hero mechanics") ||
    normalized.includes("联动") ||
    normalized.includes("触发") ||
    normalized.includes("已有系统");

  return mentionsDetail && !mentionsArchitectureGap;
}

function isEffectLifecycleVariabilityClarification(question: string): boolean {
  const normalized = question.toLowerCase();
  const mentionsReplacementConcept =
    normalized.includes("replace") ||
    normalized.includes("replaced") ||
    normalized.includes("existing one") ||
    normalized.includes("existing buff") ||
    normalized.includes("current buff") ||
    normalized.includes("previous buff") ||
    normalized.includes("replace old") ||
    normalized.includes("new selection replace old") ||
    normalized.includes("保留最高值") ||
    normalized.includes("highest value") ||
    normalized.includes("retention priority") ||
    normalized.includes("替换") ||
    normalized.includes("旧增益") ||
    normalized.includes("当前增益");
  const mentionsStackingConcept =
    normalized.includes("stack") ||
    normalized.includes("stacking") ||
    normalized.includes("additively") ||
    normalized.includes("accumulate") ||
    normalized.includes("叠加");
  const mentionsCoexistenceConcept =
    normalized.includes("hold multiple buffs") ||
    normalized.includes("multiple buffs simultaneously") ||
    normalized.includes("multiple buffs") ||
    normalized.includes("same type") ||
    normalized.includes("same-type") ||
    normalized.includes("多次使用系统") ||
    normalized.includes("repeated uses") ||
    normalized.includes("same match") ||
    normalized.includes("simultaneously") ||
    normalized.includes("coexist") ||
    normalized.includes("coexisting") ||
    normalized.includes("同时拥有多个增益") ||
    normalized.includes("多个增益同时") ||
    normalized.includes("多个增益") ||
    normalized.includes("同类型");
  return (
    normalized.includes("clarify-stacking") ||
    normalized.includes("clarify-duration") ||
    normalized.includes("叠加") ||
    normalized.includes("替换") ||
    normalized.includes("多次打开") ||
    normalized.includes("永久的") ||
    normalized.includes("永久保留") ||
    normalized.includes("永久持续") ||
    normalized.includes("临时的") ||
    normalized.includes("限时") ||
    normalized.includes("limited duration") ||
    normalized.includes("多少秒") ||
    normalized.includes("几秒") ||
    normalized.includes("一段时间") ||
    normalized.includes("持续多久") ||
    normalized.includes("持续到游戏结束") ||
    normalized.includes("until next selection") ||
    normalized.includes("仅在特定条件下生效") ||
    normalized.includes("是否可叠加") ||
    normalized.includes("禁止选择同类型") ||
    normalized.includes("可以在一局游戏中多次打开") ||
    normalized.includes("移除旧效果") ||
    normalized.includes("持续时间") ||
    normalized.includes("duration") ||
    normalized.includes("stacking") ||
    normalized.includes("temporary") ||
    normalized.includes("permanent") ||
    normalized.includes("permanent for the match") ||
    normalized.includes("temporary with duration") ||
    normalized.includes("until next selection") ||
    normalized.includes("accumulate multiple buffs") ||
    normalized.includes("replace the previous buff") ||
    normalized.includes("reopen") ||
    normalized.includes("open multiple times") ||
    normalized.includes("replace current buff") ||
    normalized.includes("remove old effect") ||
    (mentionsReplacementConcept && (mentionsStackingConcept || mentionsCoexistenceConcept))
  );
}

function hasSupportedModifierLifecycleContext(schema: IntentSchema): boolean {
  return (
    schema.normalizedMechanics.outcomeApplication === true &&
    (schema.normalizedMechanics.playerChoice === true || schema.selection?.mode === "user-chosen") &&
    hasRepeatableSelectionIntent(schema) &&
    hasChoiceStateCarryThroughIntent(schema) &&
    (!!schema.effects?.durationSemantics || schema.normalizedMechanics.uiModal === true)
  );
}

function hasRepeatableSelectionIntent(schema: IntentSchema): boolean {
  if (schema.selection?.repeatability === "repeatable" || schema.selection?.repeatability === "persistent") {
    return true;
  }

  if (schema.flow?.supportsRetry === true) {
    return true;
  }

  if ((schema.flow?.sequence || []).some((step) => {
    const normalized = step.toLowerCase();
    return normalized.includes("每次") || normalized.includes("再次") || normalized.includes("repeat");
  })) {
    return true;
  }

  return collectIntentStrings(schema).some((value) => {
    const normalized = value.toLowerCase();
    return (
      normalized.includes("repeatable") ||
      normalized.includes("repeated") ||
      normalized.includes("repeat trigger") ||
      normalized.includes("reopen") ||
      normalized.includes("open again") ||
      normalized.includes("open multiple times") ||
      normalized.includes("每次打开") ||
      normalized.includes("再次打开") ||
      normalized.includes("多次打开") ||
      normalized.includes("重复触发") ||
      normalized.includes("反复触发")
    );
  });
}

function hasChoiceStateCarryThroughIntent(schema: IntentSchema): boolean {
  const hasPersistedChoiceState = !!schema.stateModel?.states?.some((state) => stateLooksLikePersistedChoiceState(state));
  if (hasPersistedChoiceState) {
    return true;
  }

  return collectIntentStrings(schema).some((value) => {
    const normalized = value.toLowerCase();
    return (
      normalized.includes("current choice") ||
      normalized.includes("current selection") ||
      normalized.includes("current state") ||
      normalized.includes("selected state") ||
      normalized.includes("selection state") ||
      normalized.includes("status sync") ||
      normalized.includes("state sync") ||
      normalized.includes("display current") ||
      normalized.includes("show current") ||
      normalized.includes("已选择") ||
      normalized.includes("当前选择") ||
      normalized.includes("当前状态") ||
      normalized.includes("当前选择状态") ||
      normalized.includes("选择状态") ||
      normalized.includes("状态同步")
    );
  });
}

function isSupportedTriChoiceBuffFamilyContext(schema: IntentSchema): boolean {
  const bindings = schema.integrations?.expectedBindings || [];
  return (
    schema.normalizedMechanics.trigger === true &&
    schema.normalizedMechanics.candidatePool === true &&
    schema.normalizedMechanics.playerChoice === true &&
    schema.normalizedMechanics.uiModal === true &&
    schema.normalizedMechanics.outcomeApplication === true &&
    (schema.selection?.mode === "user-chosen" || schema.normalizedMechanics.playerChoice === true) &&
    hasRepeatableSelectionIntent(schema) &&
    bindings.some((binding) => binding.kind === "ui-surface") &&
    bindings.some((binding) => binding.kind === "bridge-point") &&
    bindings.some((binding) => binding.kind === "entry-point" || binding.kind === "data-source") &&
    hasSupportedModifierLifecycleContext(schema)
  );
}

function isSupportedTriChoicePolishIssue(value: string): boolean {
  const normalized = value.toLowerCase();
  return (
    normalized.includes("rebind") ||
    normalized.includes("可重绑") ||
    normalized.includes("rebindable") ||
    normalized.includes("cooldown") ||
    normalized.includes("冷却") ||
    normalized.includes("visual") ||
    normalized.includes("audio") ||
    normalized.includes("反馈") ||
    normalized.includes("音效") ||
    normalized.includes("特效") ||
    normalized.includes("f4")
  );
}

function isSupportedTriChoiceCatalogIssue(value: string): boolean {
  const normalized = value.toLowerCase();
  return (
    isBoundedVariabilityClarification(value) ||
    normalized.includes("pool size") ||
    normalized.includes("total pool size") ||
    normalized.includes("buff list") ||
    normalized.includes("buff types") ||
    normalized.includes("specific buff types") ||
    normalized.includes("pool composition") ||
    normalized.includes("modifier examples") ||
    normalized.includes("buff option list") ||
    normalized.includes("stat values") ||
    normalized.includes("duplicate across sessions") ||
    normalized.includes("总池大小") ||
    normalized.includes("总候选池") ||
    normalized.includes("完整 buff 列表") ||
    normalized.includes("完整增益列表") ||
    normalized.includes("具体 buff 类型") ||
    normalized.includes("具体增益类型") ||
    normalized.includes("池组成") ||
    normalized.includes("具体属性加成示例") ||
    normalized.includes("具体增益选项") ||
    normalized.includes("跨局重复") ||
    normalized.includes("同类型") ||
    normalized.includes("same type") ||
    normalized.includes("same-type") ||
    normalized.includes("duplicate")
  );
}

function explicitlyReopensSupportedFamilyArchitecture(value: string): boolean {
  const normalized = value.toLowerCase();
  const reopensTrigger =
    normalized.includes("what triggers") ||
    normalized.includes("trigger condition") ||
    normalized.includes("when does the selection happen") ||
    normalized.includes("how is f4 triggered") ||
    normalized.includes("触发条件") ||
    normalized.includes("什么触发") ||
    normalized.includes("何时触发");
  const reopensIntegration =
    normalized.includes("which system") ||
    normalized.includes("which existing systems") ||
    normalized.includes("integrate with") ||
    normalized.includes("what does it sync with") ||
    normalized.includes("bridge target") ||
    normalized.includes("联动哪个系统") ||
    normalized.includes("同步到哪里") ||
    normalized.includes("桥接到哪里");
  const reopensStateShape =
    normalized.includes("what state is persisted") ||
    normalized.includes("whether state should persist") ||
    normalized.includes("where is current buff stored") ||
    normalized.includes("candidate pool state") ||
    normalized.includes("state model") ||
    normalized.includes("存什么状态") ||
    normalized.includes("状态模型") ||
    normalized.includes("候选池状态");

  return reopensTrigger || reopensIntegration || reopensStateShape;
}
