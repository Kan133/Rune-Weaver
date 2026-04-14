/**
 * Selection Modal Generator Test - GP-4
 * 
 * Tests for placeholder support, minDisplayCount, payloadShape, and P0 UI Safer Profile
 */

import { generateSelectionModalComponent } from "./selection-modal.js";
import { WritePlanEntry } from "../../assembler/index.js";

function assert(condition: unknown, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

// Test 1: Basic generation without placeholder support
function testBasicGeneration() {
  console.log("Test 1: Basic generation without placeholder support");
  
  const entry: WritePlanEntry = {
    sourcePattern: "ui.selection_modal",
    sourceModule: "test_module",
    targetPath: "test_selection_modal.tsx",
    contentType: "tsx",
    parameters: {
      title: "Choose Your Talent",
      description: "Select one talent",
      choiceCount: 3
    }
  };
  
  const code = generateSelectionModalComponent("TestModal", "test_feature", entry);
  
  // Verify basic structure
  assert(code.includes("TestModal"), "Should include component name");
  assert(code.includes("Choose Your Talent"), "Should include title");
  assert(code.includes("Select one talent"), "Should include description");
  assert(code.includes("choiceCount: 3"), "Should include choiceCount");
  assert(!code.includes("placeholderConfig"), "Should not include placeholder config when not provided");
  
  console.log("✓ Test 1 passed\n");
}

// Test 2: Generation with placeholder support
function testPlaceholderGeneration() {
  console.log("Test 2: Generation with placeholder support");
  
  const entry: WritePlanEntry = {
    sourcePattern: "ui.selection_modal",
    sourceModule: "test_module",
    targetPath: "test_selection_modal.tsx",
    contentType: "tsx",
    parameters: {
      title: "Choose Your Talent",
      description: "Select one talent",
      choiceCount: 3,
      minDisplayCount: 5,
      placeholderConfig: {
        id: "placeholder",
        name: "Empty Slot",
        description: "No talent available",
        disabled: true
      }
    }
  };
  
  const code = generateSelectionModalComponent("TestModal", "test_feature", entry);
  
  // Verify placeholder support
  assert(code.includes("minDisplayCount: 5"), "Should include minDisplayCount");
  assert(code.includes("placeholderConfig"), "Should include placeholder config");
  assert(code.includes("Empty Slot"), "Should include placeholder name");
  assert(code.includes("padWithPlaceholders"), "Should include padding function");
  assert(code.includes("isPlaceholder"), "Should include placeholder flag");
  
  console.log("✓ Test 2 passed\n");
}

// Test 3: Generation with different payload shapes
function testPayloadShapes() {
  console.log("Test 3: Generation with different payload shapes");
  
  const shapes = ["simple_text", "card", "card_with_rarity"] as const;
  
  for (const shape of shapes) {
    const entry: WritePlanEntry = {
      sourcePattern: "ui.selection_modal",
      sourceModule: "test_module",
      targetPath: "test_selection_modal.tsx",
      contentType: "tsx",
      parameters: {
        payloadShape: shape
      }
    };
    
    const code = generateSelectionModalComponent("TestModal", "test_feature", entry);
    
    assert(code.includes(`payloadShape: "${shape}"`), `Should include payloadShape: ${shape}`);
    
    if (shape === "card_with_rarity") {
      assert(code.includes("item.tier"), "Should include tier for card_with_rarity");
    }
  }
  
  console.log("✓ Test 3 passed\n");
}

// Test 4: Generation with dismiss behavior
function testDismissBehavior() {
  console.log("Test 4: Generation with dismiss behavior");
  
  const behaviors = ["selection_only", "manual", "auto"] as const;
  
  for (const behavior of behaviors) {
    const entry: WritePlanEntry = {
      sourcePattern: "ui.selection_modal",
      sourceModule: "test_module",
      targetPath: "test_selection_modal.tsx",
      contentType: "tsx",
      parameters: {
        dismissBehavior: behavior
      }
    };
    
    const code = generateSelectionModalComponent("TestModal", "test_feature", entry);
    
    assert(code.includes(`dismissBehavior: "${behavior}"`), `Should include dismissBehavior: ${behavior}`);
    
    if (behavior === "manual" || behavior === "auto") {
      assert(code.includes("btn-dismiss"), `Should include dismiss button for ${behavior}`);
    }
  }
  
  console.log("✓ Test 4 passed\n");
}

// ==================== P0 UI Safer Profile Tests ====================

// Test 5: normalizeSelectionItems accepts unknown input
function testNormalizeSelectionItemsUnknown() {
  console.log("Test 5: normalizeSelectionItems accepts unknown input");
  
  const entry: WritePlanEntry = {
    sourcePattern: "ui.selection_modal",
    sourceModule: "test_module",
    targetPath: "test_selection_modal.tsx",
    contentType: "tsx",
    parameters: {}
  };
  
  const code = generateSelectionModalComponent("TestModal", "test_feature", entry);
  
  // Verify normalizeSelectionItems signature accepts unknown
  assert(
    code.includes("const normalizeSelectionItems = (rawItems?: unknown): SelectionItem[]"),
    "normalizeSelectionItems should accept unknown input"
  );
  
  // Verify array or object handling with Array.isArray
  assert(
    code.includes("Array.isArray(rawItems)"),
    "Should use Array.isArray for type checking"
  );
  
  console.log("✓ Test 5 passed\n");
}

// Test 6: Object.values fallback for non-array input
function testObjectValuesFallback() {
  console.log("Test 6: Object.values fallback for non-array input");
  
  const entry: WritePlanEntry = {
    sourcePattern: "ui.selection_modal",
    sourceModule: "test_module",
    targetPath: "test_selection_modal.tsx",
    contentType: "tsx",
    parameters: {}
  };
  
  const code = generateSelectionModalComponent("TestModal", "test_feature", entry);
  
  // Verify Object.values fallback
  assert(
    code.includes("Object.values(rawItems ?? {})") || code.includes("Object.values"),
    "Should use Object.values as fallback for non-array input"
  );
  
  console.log("✓ Test 6 passed\n");
}

// Test 7: Filter non-object/null items
function testFilterNonObjectItems() {
  console.log("Test 7: Filter non-object/null items");
  
  const entry: WritePlanEntry = {
    sourcePattern: "ui.selection_modal",
    sourceModule: "test_module",
    targetPath: "test_selection_modal.tsx",
    contentType: "tsx",
    parameters: {}
  };
  
  const code = generateSelectionModalComponent("TestModal", "test_feature", entry);
  
  // Verify non-object filtering
  assert(
    code.includes("item !== null") && code.includes("typeof item === \"object\""),
    "Should filter out null and non-object items"
  );
  
  console.log("✓ Test 7 passed\n");
}

// Test 8: Default id, name, description, disabled, isPlaceholder
function testDefaultFieldValues() {
  console.log("Test 8: Default id, name, description, disabled, isPlaceholder");
  
  const entry: WritePlanEntry = {
    sourcePattern: "ui.selection_modal",
    sourceModule: "test_module",
    targetPath: "test_selection_modal.tsx",
    contentType: "tsx",
    parameters: {}
  };
  
  const code = generateSelectionModalComponent("TestModal", "test_feature", entry);
  
  // Verify defaults for id
  assert(
    code.includes("typeof item.id === \"string\" ? item.id : typeof item.id === \"number\" ? String(item.id) : `unknown_${index}`") ||
    code.includes('id: typeof item.id'),
    "Should provide stable fallback id"
  );
  
  // Verify defaults for name
  assert(
    code.includes('name: typeof item.name === "string" ? item.name : "Unknown"'),
    "Should provide default name"
  );
  
  // Verify defaults for disabled
  assert(
    code.includes('disabled: typeof item.disabled === "boolean" ? item.disabled : false'),
    "Should provide default false for disabled"
  );
  
  // Verify defaults for isPlaceholder
  assert(
    code.includes('isPlaceholder: typeof item.isPlaceholder === "boolean" ? item.isPlaceholder : false'),
    "Should provide default false for isPlaceholder"
  );
  
  console.log("✓ Test 8 passed\n");
}

// Test 9: Support rarity and tier normalization
function testRarityTierNormalization() {
  console.log("Test 9: Support rarity and tier normalization");
  
  const entry: WritePlanEntry = {
    sourcePattern: "ui.selection_modal",
    sourceModule: "test_module",
    targetPath: "test_selection_modal.tsx",
    contentType: "tsx",
    parameters: {
      payloadShape: "card_with_rarity"
    }
  };
  
  const code = generateSelectionModalComponent("TestModal", "test_feature", entry);
  
  // Verify rarity/tier normalization
  assert(
    code.includes("item.rarity") && code.includes("item.tier"),
    "Should handle both rarity and tier fields"
  );
  
  assert(
    code.includes("item.tier ?? item.rarity") || code.includes("item.rarity ?? item.tier"),
    "Should normalize rarity/tier into tier"
  );
  
  console.log("✓ Test 9 passed\n");
}

// Test 10: Confirm button disabled includes disabled/isPlaceholder
function testConfirmDisabledState() {
  console.log("Test 10: Confirm button disabled includes disabled/isPlaceholder");
  
  const entry: WritePlanEntry = {
    sourcePattern: "ui.selection_modal",
    sourceModule: "test_module",
    targetPath: "test_selection_modal.tsx",
    contentType: "tsx",
    parameters: {}
  };
  
  const code = generateSelectionModalComponent("TestModal", "test_feature", entry);
  
  // Verify isConfirmDisabled calculation
  assert(
    code.includes("isConfirmDisabled") || code.includes("confirmDisabled"),
    "Should have confirm disabled state variable"
  );
  
  // Verify check for selectedIndex === -1
  assert(
    code.includes("selectedIndex === -1"),
    "Should disable confirm when nothing selected"
  );
  
  // Verify check for disabled
  assert(
    code.includes("selectedItem?.disabled") || code.includes("item.disabled"),
    "Should check for disabled item"
  );
  
  // Verify check for isPlaceholder
  assert(
    code.includes("selectedItem?.isPlaceholder") || code.includes("item.isPlaceholder"),
    "Should check for placeholder item"
  );
  
  console.log("✓ Test 10 passed\n");
}

// Test 11: handleConfirm checks disabled/isPlaceholder
function testHandleConfirmChecks() {
  console.log("Test 11: handleConfirm checks disabled/isPlaceholder");
  
  const entry: WritePlanEntry = {
    sourcePattern: "ui.selection_modal",
    sourceModule: "test_module",
    targetPath: "test_selection_modal.tsx",
    contentType: "tsx",
    parameters: {}
  };
  
  const code = generateSelectionModalComponent("TestModal", "test_feature", entry);
  
  // Verify handleConfirm checks disabled
  assert(
    code.includes("if (item.disabled || item.isPlaceholder)") ||
    (code.includes("item.disabled") && code.includes("item.isPlaceholder") && code.includes("handleConfirm")),
    "handleConfirm should check for disabled or placeholder items"
  );

  assert(
    code.includes("if (!item)") && code.includes("return;"),
    "handleConfirm should guard missing selected item"
  );
  
  console.log("✓ Test 11 passed\n");
}

// Test 12: Event subscription effect has stable deps
function testStableEffectDeps() {
  console.log("Test 12: Event subscription effect has stable deps or uses refs");
  
  const entry: WritePlanEntry = {
    sourcePattern: "ui.selection_modal",
    sourceModule: "test_module",
    targetPath: "test_selection_modal.tsx",
    contentType: "tsx",
    parameters: {}
  };
  
  const code = generateSelectionModalComponent("TestModal", "test_feature", entry);
  
  // Verify useRef is imported
  assert(
    code.includes('useRef'),
    "Should import useRef for stable references"
  );
  
  // Verify refs are created for dynamic values
  assert(
    code.includes('const titleRef = useRef') || code.includes('const featureIdRef = useRef'),
    "Should use refs for stable effect dependencies"
  );
  
  // Verify effect has empty deps or stable deps (not dynamic objects/arrays)
  assert(
    code.includes('useEffect(() => {') && code.includes('}, []);'),
    "Event subscription effect should have stable empty dependency array"
  );
  
  console.log("✓ Test 12 passed\n");
}

// Test 13: Sparse debug logs for selected and confirmed item id
function testDebugLogs() {
  console.log("Test 13: Sparse debug logs for selected and confirmed item id");
  
  const entry: WritePlanEntry = {
    sourcePattern: "ui.selection_modal",
    sourceModule: "test_module",
    targetPath: "test_selection_modal.tsx",
    contentType: "tsx",
    parameters: {}
  };
  
  const code = generateSelectionModalComponent("TestModal", "test_feature", entry);
  
  // Verify selected item id log
  assert(
    code.includes('selected item id=') || code.includes('selected item id=${item.id}'),
    "Should log selected item id"
  );
  
  // Verify confirmed item id log
  assert(
    code.includes('confirmed item id=') || code.includes('confirmed item id=${item.id}'),
    "Should log confirmed item id"
  );
  
  console.log("✓ Test 13 passed\n");
}

// Test 14: No .less import in generated TSX
function testNoLessImport() {
  console.log("Test 14: No .less import in generated TSX");
  
  const entry: WritePlanEntry = {
    sourcePattern: "ui.selection_modal",
    sourceModule: "test_module",
    targetPath: "test_selection_modal.tsx",
    contentType: "tsx",
    parameters: {}
  };
  
  const code = generateSelectionModalComponent("TestModal", "test_feature", entry);
  
  // Verify no .less import
  assert(
    !code.includes('.less"'),
    "Generated TSX should not contain .less imports"
  );
  
  assert(
    !code.includes("import './") || !code.includes('.less'),
    "Generated TSX should not import LESS files"
  );
  
  console.log("✓ Test 14 passed\n");
}

// Test 15: Prevent disabled/placeholder selection at select time
function testPreventDisabledSelection() {
  console.log("Test 15: Prevent disabled/placeholder selection at select time");
  
  const entry: WritePlanEntry = {
    sourcePattern: "ui.selection_modal",
    sourceModule: "test_module",
    targetPath: "test_selection_modal.tsx",
    contentType: "tsx",
    parameters: {}
  };
  
  const code = generateSelectionModalComponent("TestModal", "test_feature", entry);
  
  // Verify handleSelect checks disabled/placeholder
  assert(
    code.includes("if (item.disabled || item.isPlaceholder)") ||
    (code.includes("item.disabled") && code.includes("item.isPlaceholder") && code.includes("handleSelect")),
    "handleSelect should prevent selection of disabled/placeholder items"
  );
  
  console.log("✓ Test 15 passed\n");
}

// Run all tests
console.log("=== Selection Modal Generator Tests ===\n");
testBasicGeneration();
testPlaceholderGeneration();
testPayloadShapes();
testDismissBehavior();
testNormalizeSelectionItemsUnknown();
testObjectValuesFallback();
testFilterNonObjectItems();
testDefaultFieldValues();
testRarityTierNormalization();
testConfirmDisabledState();
testHandleConfirmChecks();
testStableEffectDeps();
testDebugLogs();
testNoLessImport();
testPreventDisabledSelection();
console.log("=== All tests passed ===");
