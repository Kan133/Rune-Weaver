/**
 * Rune Weaver - Core Wizard
 */

export * from "./types";
export * from "./intent-schema";
export * from "./update-intent";
export * from "./clarification-plan";
export * from "./relation-resolver";
export * from "./stability-harness";

export function extractNumericParameters(prompt: string): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  // Extract key binding
  const keyMatch = prompt.match(
    /按下?\s*(F\d+|[QWERDF]|[1-6])(?:键)?|按键\s*(F\d+|[QWERDF]|[1-6])|触发键[：:\s]*(F\d+|[QWERDF]|[1-6])/i
  );
  if (keyMatch) {
    result.triggerKey = (keyMatch[1] || keyMatch[2] || keyMatch[3]).toUpperCase();
  }

  // Priority match for change patterns (target value)
  const changeMatch = prompt.match(
    /修改为\s*(\d+)|[改修][成变为]\s*(\d+)|调整到\s*(\d+)|更改为\s*(\d+)|设为\s*(\d+)|变为\s*(\d+)/
  );
  if (changeMatch) {
    result.abilityCooldown = parseFloat(
      changeMatch[1] || changeMatch[2] || changeMatch[3] || changeMatch[4] || changeMatch[5] || changeMatch[6]
    );
  } else {
    // Fallback: match cooldown values
    const cooldownMatch = prompt.match(
      /cooldown\s*(\d+)|冷却[时间]?\s*(?:到|为)\s*(\d+)/i
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
