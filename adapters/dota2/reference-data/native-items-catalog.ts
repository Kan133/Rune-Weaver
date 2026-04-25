import type { SelectionPoolReusableObject } from "../../../core/schema/types.js";

export const DOTA2_NATIVE_ITEM_OBJECTS: Record<string, SelectionPoolReusableObject> = Object.freeze({
  item_branches: {
    objectId: "item_branches",
    label: "Iron Branch",
    description: "Grant the native Dota 2 item Iron Branch.",
    outcome: {
      kind: "native_item_delivery",
      itemName: "item_branches",
      deliveryMode: "hero_inventory",
      fallbackWhenInventoryFull: "drop_to_ground",
      positionPolicy: "hero_origin",
    },
  },
  item_magic_stick: {
    objectId: "item_magic_stick",
    label: "Magic Stick",
    description: "Grant the native Dota 2 item Magic Stick.",
    outcome: {
      kind: "native_item_delivery",
      itemName: "item_magic_stick",
      deliveryMode: "hero_inventory",
      fallbackWhenInventoryFull: "drop_to_ground",
      positionPolicy: "hero_origin",
    },
  },
  item_power_treads: {
    objectId: "item_power_treads",
    label: "Power Treads",
    description: "Grant the native Dota 2 item Power Treads.",
    outcome: {
      kind: "native_item_delivery",
      itemName: "item_power_treads",
      deliveryMode: "hero_inventory",
      fallbackWhenInventoryFull: "drop_to_ground",
      positionPolicy: "hero_origin",
    },
  },
  item_phase_boots: {
    objectId: "item_phase_boots",
    label: "Phase Boots",
    description: "Grant the native Dota 2 item Phase Boots.",
    outcome: {
      kind: "native_item_delivery",
      itemName: "item_phase_boots",
      deliveryMode: "hero_inventory",
      fallbackWhenInventoryFull: "drop_to_ground",
      positionPolicy: "hero_origin",
    },
  },
  item_blink: {
    objectId: "item_blink",
    label: "Blink Dagger",
    description: "Grant the native Dota 2 item Blink Dagger.",
    outcome: {
      kind: "native_item_delivery",
      itemName: "item_blink",
      deliveryMode: "hero_inventory",
      fallbackWhenInventoryFull: "drop_to_ground",
      positionPolicy: "hero_origin",
    },
  },
  item_black_king_bar: {
    objectId: "item_black_king_bar",
    label: "Black King Bar",
    description: "Grant the native Dota 2 item Black King Bar.",
    outcome: {
      kind: "native_item_delivery",
      itemName: "item_black_king_bar",
      deliveryMode: "hero_inventory",
      fallbackWhenInventoryFull: "drop_to_ground",
      positionPolicy: "hero_origin",
    },
  },
});
