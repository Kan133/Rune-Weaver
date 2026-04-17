/**
 * Tests for Selection Flow Generator - GP-2
 */

import { generateSelectionFlowCode } from "./selection-flow.js";
import { WritePlanEntry } from "../../assembler/index.js";

function assert(condition: unknown, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

function createMockEntry(params: Record<string, unknown>): WritePlanEntry {
  return {
    sourcePattern: "rule.selection_flow",
    sourceModule: "test-module",
    targetPath: "server/test-selection-flow.ts",
    contentType: "typescript",
    operation: "create",
    contentSummary: "Test selection flow",
    safe: true,
    parameters: params,
  };
}

// Test 1: Basic selection flow code generation
function testBasicGeneration() {
  console.log("Test 1: Basic selection flow code generation");

  const entry = createMockEntry({
    choiceCount: 3,
  });

  const code = generateSelectionFlowCode("TestSelectionFlow", "test-feature", entry);

  assert(code.includes("class TestSelectionFlow"), "Should contain class name");
  assert(code.includes("startSelection"), "Should contain startSelection");
  assert(code.includes("onPlayerSelect"), "Should contain onPlayerSelect");
  assert(code.includes("onPlayerConfirm"), "Should contain onPlayerConfirm");

  console.log("✓ Test 1 passed\n");
}

// Test 2: postSelectionPoolBehavior logic
function testPostSelectionPoolBehavior() {
  console.log("Test 2: postSelectionPoolBehavior logic");

  const entry = createMockEntry({
    choiceCount: 3,
    postSelectionPoolBehavior: "remove_selected_from_remaining",
  });

  const code = generateSelectionFlowCode("TestSelectionFlow", "test-feature", entry);

  assert(code.includes("poolCommit"), "Should contain poolCommit handoff");
  assert(!code.includes("playerSessionStates"), "Should not mirror pool session state locally");
  assert(!code.includes("remainingIds"), "Should not store remainingIds in selection_flow");

  console.log("✓ Test 2 passed\n");
}

// Test 3: trackSelectedItems logic
function testTrackSelectedItems() {
  console.log("Test 3: trackSelectedItems logic");

  const entry = createMockEntry({
    choiceCount: 3,
    postSelectionPoolBehavior: "remove_selected_from_remaining",
    trackSelectedItems: true,
  });

  const code = generateSelectionFlowCode("TestSelectionFlow", "test-feature", entry);

  assert(code.includes("trackOwned: true"), "Should pass trackOwned through pool commit options");
  assert(!code.includes("ownedIds"), "Should not store ownedIds in selection_flow");

  console.log("✓ Test 3 passed\n");
}

// Test 4: effectApplication logic
function testEffectApplication() {
  console.log("Test 4: effectApplication logic");

  const entry = createMockEntry({
    choiceCount: 3,
    effectApplication: {
      enabled: true,
      rarityAttributeBonusMap: {
        R: { attribute: "strength", value: 10 },
        SR: { attribute: "agility", value: 10 },
      },
    },
  });

  const code = generateSelectionFlowCode("TestSelectionFlow", "test-feature", entry);

  assert(code.includes("applyEffectByRarity"), "Should contain applyEffectByRarity");
  assert(code.includes("rarityAttributeBonusMap"), "Should contain rarityAttributeBonusMap");
  assert(code.includes("strength"), "Should contain strength");
  assert(code.includes("agility"), "Should contain agility");

  console.log("✓ Test 4 passed\n");
}

// Test 5: player-scoped events
function testPlayerScopedEvents() {
  console.log("Test 5: player-scoped events");

  const entry = createMockEntry({
    choiceCount: 3,
  });

  const code = generateSelectionFlowCode("TestSelectionFlow", "test-feature", entry);

  assert(code.includes("fireSelectionEvent"), "Should contain fireSelectionEvent");
  assert(code.includes("fireConfirmationEvent"), "Should contain fireConfirmationEvent");
  assert(code.includes("CustomGameEventManager.Send_ServerToPlayer"), "Should contain Send_ServerToPlayer");
  assert(code.includes("rune_weaver_selection_made"), "Should contain rune_weaver_selection_made");
  assert(code.includes("rune_weaver_selection_confirmed"), "Should contain rune_weaver_selection_confirmed");

  console.log("✓ Test 5 passed\n");
}

// Test 6: remove_selected_and_keep_unselected_eligible behavior
function testRemoveSelectedAndKeepUnselectedEligible() {
  console.log("Test 6: remove_selected_and_keep_unselected_eligible behavior");

  const entry = createMockEntry({
    choiceCount: 3,
    postSelectionPoolBehavior: "remove_selected_and_keep_unselected_eligible",
    trackSelectedItems: true,
  });

  const code = generateSelectionFlowCode("TestSelectionFlow", "test-feature", entry);

  assert(code.includes("remove_selected_and_keep_unselected_eligible"), "Should contain behavior name");
  assert(code.includes("unselected candidates"), "Should contain unselected candidates");
  assert(code.includes("remain eligible"), "Should contain remain eligible");

  console.log("✓ Test 6 passed\n");
}

// Test 7: event listeners registration
function testEventListenersRegistration() {
  console.log("Test 7: event listeners registration");

  const entry = createMockEntry({
    choiceCount: 3,
  });

  const code = generateSelectionFlowCode("TestSelectionFlow", "test-feature", entry);

  assert(code.includes("registerTestSelectionFlow"), "Should contain registerTestSelectionFlow");
  assert(code.includes("CustomGameEventManager.RegisterListener"), "Should contain RegisterListener");
  assert(code.includes("rune_weaver_player_select"), "Should contain rune_weaver_player_select");
  assert(code.includes("rune_weaver_player_confirm"), "Should contain rune_weaver_player_confirm");

  console.log("✓ Test 7 passed\n");
}

// Test 8: backward compatibility with default parameters
function testBackwardCompatibility() {
  console.log("Test 8: backward compatibility with default parameters");

  const entry = createMockEntry({});

  const code = generateSelectionFlowCode("TestSelectionFlow", "test-feature", entry);

  assert(code.includes("class TestSelectionFlow"), "Should contain class name");
  assert(code.includes("startSelection"), "Should contain startSelection");
  assert(code.includes("choiceCount: 1"), "Should contain neutral fallback choiceCount");
  assert(code.includes('selectionPolicy: "single"'), "Should contain default selectionPolicy");
  assert(code.includes('postSelectionPoolBehavior: "none"'), "Should contain default postSelectionPoolBehavior");

  console.log("✓ Test 8 passed\n");
}

// Test 9: immediate applyMode
function testImmediateApplyMode() {
  console.log("Test 9: immediate applyMode");

  const entry = createMockEntry({
    choiceCount: 3,
    applyMode: "immediate",
    effectApplication: {
      enabled: true,
    },
  });

  const code = generateSelectionFlowCode("TestSelectionFlow", "test-feature", entry);

  assert(code.includes('applyMode: "immediate"'), "Should contain applyMode immediate");
  assert(code.includes("Apply effect immediately"), "Should contain Apply effect immediately");

  console.log("✓ Test 9 passed\n");
}

// Test 10: deferred applyMode
function testDeferredApplyMode() {
  console.log("Test 10: deferred applyMode");

  const entry = createMockEntry({
    choiceCount: 3,
    applyMode: "deferred",
    effectApplication: {
      enabled: true,
    },
  });

  const code = generateSelectionFlowCode("TestSelectionFlow", "test-feature", entry);

  assert(code.includes('applyMode: "deferred"'), "Should contain applyMode deferred");
  assert(code.includes("deferredEffect"), "Should contain deferredEffect");

  console.log("✓ Test 10 passed\n");
}

// Test 11: inventory extension stays inside selection flow runtime
function testInventoryExtension() {
  console.log("Test 11: inventory extension support");

  const entry = createMockEntry({
    choiceCount: 3,
    inventory: {
      enabled: true,
      capacity: 15,
      storeSelectedItems: true,
      blockDrawWhenFull: true,
      fullMessage: "Talent inventory full",
      presentation: "persistent_panel",
    },
  });

  const code = generateSelectionFlowCode("TestSelectionFlow", "test-feature", entry);

  assert(code.includes("selectedInventory"), "Should contain selectedInventory state");
  assert(code.includes("rune_weaver_selection_inventory_state"), "Should emit inventory state event");
  assert(code.includes("Talent inventory full"), "Should embed the full-state message");
  assert(code.includes("inventory full for player"), "Should block draw before opening modal when full");

  console.log("✓ Test 11 passed\n");
}

// Test 12: local progression extension stays inside selection flow runtime
function testLocalProgressionExtension() {
  console.log("Test 12: local progression extension support");

  const entry = createMockEntry({
    choiceCount: 1,
    progression: {
      enabled: true,
      progressThreshold: 3,
      progressStateId: "reward_progress",
      levelStateId: "reward_level",
    },
  });

  const code = generateSelectionFlowCode("TestSelectionFlow", "test-feature", entry);

  assert(code.includes("progressionThreshold = 3"), "Should contain the local progression threshold");
  assert(code.includes('progressionStateId = "reward_progress"'), "Should contain the round-counter state id");
  assert(code.includes('progressionLevelStateId = "reward_level"'), "Should contain the level state id");
  assert(code.includes("advanceProgression"), "Should contain progression update logic");
  assert(code.includes("progressionState.completedRounds += 1"), "Should increment completed rounds on confirm");
  assert(code.includes("Math.floor(progressionState.completedRounds / this.progressionThreshold)"), "Should derive level from thresholded rounds");

  console.log("✓ Test 12 passed\n");
}

// Test 13: selection flow must not carry weighted-pool session state ownership
function testNoPoolStateMirroring() {
  console.log("Test 13: no pool state mirroring");

  const entry = createMockEntry({
    choiceCount: 3,
    postSelectionPoolBehavior: "remove_selected_from_remaining",
    trackSelectedItems: true,
  });

  const code = generateSelectionFlowCode("TestSelectionFlow", "test-feature", entry);

  assert(!code.includes("remainingIds"), "Should not declare remainingIds");
  assert(!code.includes("ownedIds"), "Should not declare ownedIds");
  assert(!code.includes("currentChoiceIds"), "Should not declare currentChoiceIds");
  assert(!code.includes("getRemainingTalentIds"), "Should not fallback to talent-specific pool API");

  console.log("✓ Test 13 passed\n");
}

// Run all tests
console.log("=== Selection Flow Generator Tests ===\n");
testBasicGeneration();
testPostSelectionPoolBehavior();
testTrackSelectedItems();
testEffectApplication();
testPlayerScopedEvents();
testRemoveSelectedAndKeepUnselectedEligible();
testEventListenersRegistration();
testBackwardCompatibility();
testImmediateApplyMode();
testDeferredApplyMode();
testInventoryExtension();
testLocalProgressionExtension();
testNoPoolStateMirroring();
console.log("=== All tests passed ===");
