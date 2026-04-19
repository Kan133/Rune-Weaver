import type { Blueprint, UpdateIntent } from "../../../core/schema/types.js";
import { enrichDota2UpdateBlueprint } from "../blueprint/index.js";

export function adaptDota2UpdateBlueprint<T extends Blueprint>(
  blueprint: T,
  updateIntent: UpdateIntent,
): T {
  return enrichDota2UpdateBlueprint(blueprint, updateIntent).blueprint || blueprint;
}
