/**
 * Tests for Selection Flow Generator
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

function testBasicGeneration() {
  console.log("Test 1: basic selection flow code generation");

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

function testTrackSelectedItems() {
  console.log("Test 3: trackSelectedItems logic");

  const entry = createMockEntry({
    choiceCount: 3,
    postSelectionPoolBehavior: "remove_selected_from_remaining",
    trackSelectedItems: true,
  });

  const code = generateSelectionFlowCode("TestSelectionFlow", "test-feature", entry);

  assert(code.includes("trackOwned: true"), "Should pass trackOwned through pool commit options");
  assert(code.includes("const poolCommit = selection.poolCommit;"), "Should lift poolCommit into a standalone function value before invocation");
  assert(code.includes("poolCommit(selectedOption.id, { trackOwned: true });"), "Should invoke poolCommit without method-call syntax");
  assert(!code.includes("selection.poolCommit(selectedOption.id"), "Should avoid direct property invocation that TS->Lua may lower to a method call");
  assert(!code.includes("ownedIds"), "Should not store ownedIds in selection_flow");

  console.log("✓ Test 3 passed\n");
}

function testPlayerScopedEvents() {
  console.log("Test 4: player-scoped events");

  const entry = createMockEntry({
    choiceCount: 3,
  });

  const code = generateSelectionFlowCode("TestSelectionFlow", "test-feature", entry);

  assert(code.includes("fireSelectionEvent"), "Should contain fireSelectionEvent");
  assert(code.includes("fireConfirmationEvent"), "Should contain fireConfirmationEvent");
  assert(code.includes("CustomGameEventManager.Send_ServerToPlayer"), "Should contain Send_ServerToPlayer");
  assert(code.includes("rune_weaver_selection_made"), "Should contain rune_weaver_selection_made");
  assert(code.includes("rune_weaver_selection_confirmed"), "Should contain rune_weaver_selection_confirmed");

  console.log("✓ Test 4 passed\n");
}

function testRemoveSelectedAndKeepUnselectedEligible() {
  console.log("Test 5: remove_selected_and_keep_unselected_eligible behavior");

  const entry = createMockEntry({
    choiceCount: 3,
    postSelectionPoolBehavior: "remove_selected_and_keep_unselected_eligible",
    trackSelectedItems: true,
  });

  const code = generateSelectionFlowCode("TestSelectionFlow", "test-feature", entry);

  assert(code.includes("remove_selected_and_keep_unselected_eligible"), "Should contain behavior name");
  assert(code.includes("unselected candidates"), "Should contain unselected candidates");
  assert(code.includes("remain eligible"), "Should contain remain eligible");

  console.log("✓ Test 5 passed\n");
}

function testEventListenersRegistration() {
  console.log("Test 6: event listeners registration");

  const entry = createMockEntry({
    choiceCount: 3,
  });

  const code = generateSelectionFlowCode("TestSelectionFlow", "test-feature", entry);

  assert(code.includes("registerTestSelectionFlow"), "Should contain registerTestSelectionFlow");
  assert(code.includes("CustomGameEventManager.RegisterListener"), "Should contain RegisterListener");
  assert(code.includes("rune_weaver_player_select"), "Should contain rune_weaver_player_select");
  assert(code.includes("rune_weaver_player_confirm"), "Should contain rune_weaver_player_confirm");

  console.log("✓ Test 6 passed\n");
}

function testBackwardCompatibility() {
  console.log("Test 7: backward compatibility with default parameters");

  const entry = createMockEntry({});

  const code = generateSelectionFlowCode("TestSelectionFlow", "test-feature", entry);

  assert(code.includes("class TestSelectionFlow"), "Should contain class name");
  assert(code.includes("startSelection"), "Should contain startSelection");
  assert(code.includes("choiceCount: 1"), "Should contain neutral fallback choiceCount");
  assert(code.includes('selectionPolicy: "single"'), "Should contain default selectionPolicy");
  assert(code.includes('postSelectionPoolBehavior: "none"'), "Should contain default postSelectionPoolBehavior");

  console.log("✓ Test 7 passed\n");
}

function testDeferredApplyModeCompatibilityState() {
  console.log("Test 8: deferred applyMode compatibility state");

  const entry = createMockEntry({
    choiceCount: 3,
    applyMode: "deferred",
  });

  const code = generateSelectionFlowCode("TestSelectionFlow", "test-feature", entry);

  assert(code.includes('applyMode: "deferred"'), "Should contain applyMode deferred");
  assert(code.includes("deferredEffect"), "Should keep deferred compatibility state");

  console.log("✓ Test 8 passed\n");
}

function testInventoryExtension() {
  console.log("Test 9: inventory extension support");

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

  console.log("✓ Test 9 passed\n");
}

function testLocalProgressionExtension() {
  console.log("Test 10: local progression extension support");

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

  console.log("✓ Test 10 passed\n");
}

function testNoPoolStateMirroring() {
  console.log("Test 11: no pool state mirroring");

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

  console.log("✓ Test 11 passed\n");
}

function testSelectionOutcomeHookEmitsNormalizedRequest() {
  console.log("Test 12: selection outcome hook emits normalized request");

  const entry = createMockEntry({
    choiceCount: 3,
  });

  const code = generateSelectionFlowCode("TestSelectionFlow", "test-feature", entry);

  assert(code.includes("selectionOutcomeHandlers"), "Should contain selection outcome handler registry");
  assert(code.includes("registerOutcomeHandler"), "Should expose outcome handler registration");
  assert(code.includes("SelectionOutcomeRequest"), "Should define normalized outcome request shape");
  assert(code.includes("const outcomeRequest: SelectionOutcomeRequest"), "Should build a normalized outcome request on confirm");
  assert(code.includes("const result = handler({ ...request, request })"), "Should pass normalized request context to handlers");
  assert(!code.includes("applyEffectByRarity"), "Should no longer own concrete effect realization");
  assert(!code.includes("rarityAttributeBonusMap"), "Should not embed legacy rarity outcome tables");

  console.log("✓ Test 12 passed\n");
}

function testConfirmListenerCapturesOptionalCursorPosition() {
  console.log("Test 13: confirm listener captures optional cursor position");

  const entry = createMockEntry({
    choiceCount: 3,
  });

  const code = generateSelectionFlowCode("TestSelectionFlow", "test-feature", entry);

  assert(code.includes("cursorX"), "Should read cursorX from confirm payload when present");
  assert(code.includes("cursorPosition"), "Should include cursorPosition in the normalized outcome request");
  assert(code.includes("Number.isFinite(Number(event.cursorY))"), "Should defensively validate cursor coordinates");

  console.log("✓ Test 13 passed\n");
}

console.log("=== Selection Flow Generator Tests ===\n");
testBasicGeneration();
testPostSelectionPoolBehavior();
testTrackSelectedItems();
testPlayerScopedEvents();
testRemoveSelectedAndKeepUnselectedEligible();
testEventListenersRegistration();
testBackwardCompatibility();
testDeferredApplyModeCompatibilityState();
testInventoryExtension();
testLocalProgressionExtension();
testNoPoolStateMirroring();
testSelectionOutcomeHookEmitsNormalizedRequest();
testConfirmListenerCapturesOptionalCursorPosition();
console.log("=== All tests passed ===");
