import { WritePlanEntry } from "../../assembler/index.js";
import { generateOutcomeRealizerCode } from "./outcome-realizer.js";

function assert(condition: unknown, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

function createMockEntry(params: Record<string, unknown>): WritePlanEntry {
  return {
    sourcePattern: "effect.outcome_realizer",
    sourceModule: "selection_outcome",
    targetPath: "server/test-outcome-realizer.ts",
    contentType: "typescript",
    operation: "create",
    contentSummary: "Test outcome realizer",
    safe: true,
    parameters: params,
  };
}

function testAttributeBonusRealization() {
  console.log("Test 1: attribute_bonus realization");

  const code = generateOutcomeRealizerCode(
    "TestOutcomeRealizer",
    "test-feature",
    createMockEntry({
      outcomes: [
        {
          id: "R001",
          outcome: { kind: "attribute_bonus", attribute: "strength", value: 10 },
        },
      ],
    }),
  );

  assert(code.includes("ModifyStrength"), "Should realize strength bonuses through hero attribute mutation");
  assert(code.includes("rune_weaver_effect_applied"), "Should keep the legacy attribute bonus event");
  assert(code.includes('"R001"'), "Should key outcomes by object id");

  console.log("✓ Test 1 passed\n");
}

function testNativeItemDeliveryRealization() {
  console.log("Test 2: native_item_delivery realization");

  const code = generateOutcomeRealizerCode(
    "TestOutcomeRealizer",
    "test-feature",
    createMockEntry({
      outcomes: [
        {
          id: "EQ001",
          outcome: {
            kind: "native_item_delivery",
            itemName: "item_blink",
            deliveryMode: "hero_inventory",
            fallbackWhenInventoryFull: "drop_to_ground",
            positionPolicy: "hero_origin",
          },
        },
      ],
    }),
  );

  assert(code.includes("CreateItem"), "Should create native Dota2 items");
  assert(code.includes("CreateItemOnPositionSync"), "Should support bounded ground drop fallback");
  assert(code.includes("hasAvailableInventorySlot"), "Should check bounded inventory space before delivery");
  assert(code.includes("resolveItemOwner"), "Should resolve a typed item owner for CreateItem");
  assert(code.includes("CreateItem(itemName, owner, hero)"), "Should call CreateItem with controller owner and hero purchaser");
  assert(!code.includes("CreateItem(itemName, hero, hero)"), "Should not pass hero as the CreateItem owner");

  console.log("✓ Test 2 passed\n");
}

function testSpawnUnitRealization() {
  console.log("Test 3: spawn_unit realization");

  const code = generateOutcomeRealizerCode(
    "TestOutcomeRealizer",
    "test-feature",
    createMockEntry({
      outcomes: [
        {
          id: "SP001",
          outcome: {
            kind: "spawn_unit",
            unitName: "npc_dota_neutral_kobold",
            spawnCount: 2,
            positionPolicy: "hero_forward",
            teamScope: "player_team",
          },
        },
      ],
    }),
  );

  assert(code.includes("CreateUnitByName"), "Should spawn native Dota2 units");
  assert(code.includes("positionPolicy: \"hero_forward\""), "Should preserve bounded spawn position policy");
  assert(code.includes("spawnCount: 2"), "Should preserve requested spawn count");

  console.log("✓ Test 3 passed\n");
}

function testSelectionFlowAttachment() {
  console.log("Test 4: attachToSelectionFlow registers handled outcome hook");

  const code = generateOutcomeRealizerCode(
    "TestOutcomeRealizer",
    "test-feature",
    createMockEntry({
      outcomes: [
        {
          id: "R001",
          outcome: { kind: "attribute_bonus", attribute: "strength", value: 10 },
        },
      ],
    }),
  );

  assert(code.includes("attachToSelectionFlow"), "Should expose selection flow attachment seam");
  assert(code.includes("selectionFlow.registerOutcomeHandler"), "Should register through the existing outcome handler hook");
  assert(code.includes("return { handled };"), "Should return handled=true for configured outcomes");

  console.log("✓ Test 4 passed\n");
}

console.log("=== Outcome Realizer Generator Tests ===\n");
testAttributeBonusRealization();
testNativeItemDeliveryRealization();
testSpawnUnitRealization();
testSelectionFlowAttachment();
console.log("=== All tests passed ===");
