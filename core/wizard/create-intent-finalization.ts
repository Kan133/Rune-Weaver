import type { IntentSchema } from "../schema/types.js";

export function extractNumericParameters(prompt: string): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  const keyMatch = prompt.match(
    /按下?\s*(F\d+|[QWERDF]|[1-6])(?:键)?|按键\s*(F\d+|[QWERDF]|[1-6])|触发键[：:\s]*(F\d+|[QWERDF]|[1-6])/i,
  );
  if (keyMatch) {
    result.triggerKey = (keyMatch[1] || keyMatch[2] || keyMatch[3]).toUpperCase();
  }

  const changeMatch = prompt.match(
    /修改为\s*(\d+)|[改修][成变为]\s*(\d+)|调整到\s*(\d+)|更改为\s*(\d+)|设为\s*(\d+)|变为\s*(\d+)/,
  );
  if (changeMatch) {
    result.abilityCooldown = parseFloat(
      changeMatch[1] || changeMatch[2] || changeMatch[3] || changeMatch[4] || changeMatch[5] || changeMatch[6],
    );
  } else {
    const cooldownMatch = prompt.match(
      /cooldown\s*(\d+)|冷却[时间]?\s*(?:到|为)\s*(\d+)/i,
    );
    if (cooldownMatch) {
      result.abilityCooldown = parseFloat(cooldownMatch[1] || cooldownMatch[2]);
    }
  }

  const manaMatch = prompt.match(/蓝耗[：为]?\s*(\d+)|mana\s*cost?\s*(\d+)/i);
  if (manaMatch) {
    result.abilityManaCost = parseInt(manaMatch[1] || manaMatch[2]);
  }

  const durationMatch = prompt.match(/duration\s*(\d+(?:\.\d+)?)/i);
  if (durationMatch) {
    result.abilityDuration = parseFloat(durationMatch[1]);
  }

  const rangeMatch = prompt.match(/距离[：为]?\s*(\d+)|range\s*(\d+)|冲刺距离\s*(\d+)/i);
  if (rangeMatch) {
    result.abilityCastRange = parseInt(rangeMatch[1] || rangeMatch[2] || rangeMatch[3]);
  }

  const choiceMatch = prompt.match(/(\d+)\s*choices?/i);
  if (choiceMatch) {
    result.choiceCount = parseInt(choiceMatch[1]);
  }

  return result;
}

function applyDeterministicMechanicHints(
  schema: IntentSchema,
  extractedParameters: Record<string, unknown>,
): IntentSchema["normalizedMechanics"] {
  const mechanics = {
    trigger: false,
    candidatePool: false,
    weightedSelection: false,
    playerChoice: false,
    uiModal: false,
    outcomeApplication: false,
    resourceConsumption: false,
    ...(schema.normalizedMechanics || {}),
  };
  const hasCanonicalSelectionPool = Array.isArray(extractedParameters.entries) && extractedParameters.entries.length > 0;
  const hasEffectApplication =
    typeof extractedParameters.effectApplication === "object"
    && extractedParameters.effectApplication !== null;
  const revealBatchImmediate = schema.selection?.resolutionMode === "reveal_batch_immediate";

  return {
    ...mechanics,
    trigger: mechanics.trigger || typeof extractedParameters.triggerKey === "string",
    candidatePool: mechanics.candidatePool || hasCanonicalSelectionPool,
    weightedSelection:
      mechanics.weightedSelection
      || typeof extractedParameters.drawMode === "string"
      || typeof extractedParameters.duplicatePolicy === "string",
    playerChoice:
      revealBatchImmediate
        ? false
        : mechanics.playerChoice
          || typeof extractedParameters.selectionPolicy === "string"
          || typeof extractedParameters.choiceCount === "number",
    uiModal:
      mechanics.uiModal
      || typeof extractedParameters.payloadShape === "string"
      || typeof extractedParameters.minDisplayCount === "number",
    outcomeApplication: mechanics.outcomeApplication || hasEffectApplication,
  };
}

export function finalizeCreateIntentSchema(
  schema: IntentSchema,
  rawText: string,
): IntentSchema {
  const extractedParameters = extractNumericParameters(rawText);
  const mergedParameters = Object.keys(extractedParameters).length > 0
    ? {
        ...(schema.parameters || {}),
        ...extractedParameters,
      }
    : schema.parameters;

  return {
    ...schema,
    normalizedMechanics: applyDeterministicMechanicHints(schema, extractedParameters),
    ...(mergedParameters ? { parameters: mergedParameters } : {}),
  };
}
