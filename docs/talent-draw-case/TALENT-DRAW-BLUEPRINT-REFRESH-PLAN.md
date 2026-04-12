# Talent Draw Blueprint Refresh Plan

**Document Version**: 1.0
**Date**: 2026-04-12
**Status**: Executable implementation plan for BlueprintBuilder refactoring
**Case Truth**: [CANONICAL-CASE-TALENT-DRAW.md](./CANONICAL-CASE-TALENT-DRAW.md)

---

## 1. Executive Summary

### Can BlueprintBuilder be modified directly?

**Conditional GO** - BlueprintBuilder can be partially refactored now, but full validation requires Pattern Contract Actualization completion.

### Must Pattern Contract Actualization complete first?

**Yes, partially** - The catalog already contains the required patterns with correct parameters:
- `input.key_binding` - ready
- `data.weighted_pool` - ready (includes `poolStateTracking`, `drawMode`, `duplicatePolicy`)
- `rule.selection_flow` - ready (includes `postSelectionPoolBehavior`, `trackSelectedItems`, `effectApplication`)
- `ui.selection_modal` - ready (includes `minDisplayCount`, `placeholderConfig`, `payloadShape`)
- `effect.modifier_applier` - ready (generic effect application)

However, the builder must NOT hardcode `dota2.short_time_buff` for Talent Draw case.

### Does IntentSchema need structural field additions?

**Yes** - Current IntentSchema lacks explicit fields for:
- `pool.entries` with rarity/weight structure
- `selection.postSelectionBehavior`
- `effect.mapping` from rarity to attribute bonus

Builder should read from `schema.parameters` or fail gracefully if missing.

---

## 2. Blueprint Role Boundary

### Blueprint IS responsible for:

1. **Organizing IntentSchema into modules** - Partition feature into coherent structural units
2. **Proposing pattern hints** - From existing catalog only, never inventing new pattern IDs
3. **Expressing module relationships** - Via connections with purpose descriptions
4. **Passing through parameters** - From IntentSchema to downstream stages
5. **Expressing UI requirements** - Via `uiDesignSpec` when UI is needed

### Blueprint is NOT responsible for:

1. **Final pattern resolution** - That belongs to Pattern Resolver
2. **Code generation** - That belongs to Generator stage
3. **File path planning** - That belongs to AssemblyPlan / WritePlan
4. **Host-specific implementation details** - Blueprint is host-aware, not host-bound
5. **Guessing missing structures** - If IntentSchema lacks fields, Blueprint should fail or degrade gracefully
6. **Domain-specific naming** - No `talent_*` roles, no `talent.xxx` patterns

---

## 3. Canonical Talent Draw Blueprint

### 3.1 Blueprint Structure

```typescript
const talentDrawBlueprint: Blueprint = {
  id: "talent_draw_session",
  version: "1.0",
  summary: "Three-choice weighted selection with session pool state tracking",
  sourceIntent: {
    intentKind: "standalone-system",
    goal: "Talent draw system with rarity-weighted selection",
    normalizedMechanics: {
      trigger: true,
      candidatePool: true,
      weightedSelection: true,
      playerChoice: true,
      uiModal: true,
      outcomeApplication: true,
    },
  },
  modules: [
    // Module 1: Input Trigger
    {
      id: "mod_input_trigger",
      role: "input_trigger",
      category: "trigger",
      patternIds: ["input.key_binding"],
      responsibilities: ["Trigger selection flow on key press"],
      parameters: {
        key: "F4",
        eventName: "selection_requested",
      },
    },
    // Module 2: Weighted Pool
    {
      id: "mod_weighted_pool",
      role: "weighted_pool",
      category: "data",
      patternIds: ["data.weighted_pool"],
      responsibilities: [
        "Manage candidate pool with rarity weights",
        "Track session pool state (remaining/owned/currentChoice)",
        "Provide weighted random draw",
      ],
      parameters: {
        entries: [], // From IntentSchema - 40 talent entries
        weights: { R: 40, SR: 30, SSR: 20, UR: 10 },
        tiers: ["R", "SR", "SSR", "UR"],
        choiceCount: 3,
        drawMode: "multiple_without_replacement",
        duplicatePolicy: "forbid",
        poolStateTracking: "session",
      },
    },
    // Module 3: Selection Flow
    {
      id: "mod_selection_flow",
      role: "selection_flow",
      category: "rule",
      patternIds: ["rule.selection_flow"],
      responsibilities: [
        "Orchestrate draw -> present -> select -> apply -> commit lifecycle",
        "Commit selected item removal from remaining pool",
        "Keep unselected candidates eligible",
      ],
      parameters: {
        choiceCount: 3,
        selectionPolicy: "single",
        applyMode: "immediate",
        postSelectionPoolBehavior: "remove_selected_and_keep_unselected_eligible",
        trackSelectedItems: true,
        effectApplication: {
          enabled: true,
          rarityAttributeBonusMap: {
            R: { attribute: "strength", value: 10 },
            SR: { attribute: "agility", value: 10 },
            SSR: { attribute: "intelligence", value: 10 },
            UR: { attribute: "all", value: 10 },
          },
        },
      },
    },
    // Module 4: Selection Modal
    {
      id: "mod_selection_modal",
      role: "selection_modal",
      category: "ui",
      patternIds: ["ui.selection_modal"],
      responsibilities: [
        "Display selection UI with card layout",
        "Show rarity-styled cards",
        "Handle placeholder slots when pool is depleted",
      ],
      parameters: {
        choiceCount: 3,
        layoutPreset: "card_tray",
        selectionMode: "single",
        dismissBehavior: "selection_only",
        payloadShape: "card_with_rarity",
        minDisplayCount: 3,
        placeholderConfig: {
          id: "empty_slot",
          name: "Empty Slot",
          description: "No more candidates available",
          disabled: true,
        },
      },
    },
    // Module 5: Effect Application
    {
      id: "mod_effect_application",
      role: "effect_application",
      category: "effect",
      patternIds: [], // Polymorphic - let resolver decide
      responsibilities: [
        "Apply attribute bonus based on selected item rarity",
      ],
      parameters: {
        // Effect mapping is passed through for resolver/generator
        effectMapping: {
          R: { attribute: "strength", value: 10 },
          SR: { attribute: "agility", value: 10 },
          SSR: { attribute: "intelligence", value: 10 },
          UR: { attribute: "all", value: 10 },
        },
      },
    },
  ],
  connections: [
    { from: "mod_input_trigger", to: "mod_selection_flow", purpose: "Trigger selection flow activation" },
    { from: "mod_weighted_pool", to: "mod_selection_flow", purpose: "Provide weighted candidates" },
    { from: "mod_selection_flow", to: "mod_selection_modal", purpose: "Drive modal display" },
    { from: "mod_selection_flow", to: "mod_effect_application", purpose: "Apply selected effect" },
    { from: "mod_weighted_pool", to: "mod_selection_modal", purpose: "Provide display data" },
  ],
  patternHints: [
    { category: "trigger", suggestedPatterns: ["input.key_binding"], rationale: "Key press trigger" },
    { category: "data", suggestedPatterns: ["data.weighted_pool"], rationale: "Weighted candidate pool" },
    { category: "rule", suggestedPatterns: ["rule.selection_flow"], rationale: "Selection flow orchestration" },
    { category: "ui", suggestedPatterns: ["ui.selection_modal"], rationale: "Modal selection UI" },
  ],
  assumptions: [
    "Session-only persistence (no cross-match save)",
    "Static talent definitions are immutable",
    "Selected items removed from remaining pool only after player confirmation",
    "Unselected candidates remain eligible for future draws",
  ],
  validations: [
    { scope: "blueprint", rule: "All modules must have valid pattern hints", severity: "error" },
    { scope: "assembly", rule: "Effect application must resolve to valid pattern", severity: "error" },
  ],
  readyForAssembly: true,
};
```

### 3.2 Module Role Naming Convention

| Generic Role | Pattern Hint | Description |
|-------------|--------------|-------------|
| `input_trigger` | `input.key_binding` | Generic key/event input |
| `weighted_pool` | `data.weighted_pool` | Generic weighted candidate pool |
| `selection_flow` | `rule.selection_flow` | Generic selection orchestration |
| `selection_modal` | `ui.selection_modal` | Generic selection UI |
| `effect_application` | (polymorphic) | Generic effect applier |

### 3.3 Selected-Only Removal Semantics

The key semantic is expressed in `mod_selection_flow.parameters`:

```typescript
{
  postSelectionPoolBehavior: "remove_selected_and_keep_unselected_eligible",
  trackSelectedItems: true,
}
```

This means:
- **Selected item**: Removed from `remainingTalentIds`, added to `ownedTalentIds`
- **Unselected candidates**: Remain in pool, eligible for future draws
- **Static definitions**: Never mutated

This is NOT `persistDrawnItems` on the pool. The pool only tracks state; the commit happens in selection flow.

---

## 4. Current Builder Gap Analysis

### 4.1 Case-Specific Role Naming (CRITICAL)

**File**: `core/blueprint/builder.ts`

**Lines 127-137** - `talent_trigger` role:
```typescript
const triggerModule: BlueprintModule = {
  id: `${prefix}trigger_0`,
  role: 'talent_trigger',  // ❌ CASE-SPECIFIC
  category: 'trigger',
  patternIds: ['input.key_binding'],
  ...
};
```

**Lines 140-148** - `talent_pool` role:
```typescript
const poolModule: BlueprintModule = {
  id: `${prefix}pool_0`,
  role: 'talent_pool',  // ❌ CASE-SPECIFIC
  category: 'data',
  patternIds: ['data.weighted_pool'],
  ...
};
```

**Lines 176-189** - `talent_buff` role:
```typescript
const effectModule: BlueprintModule = {
  id: `${prefix}effect_0`,
  role: 'talent_buff',  // ❌ CASE-SPECIFIC
  category: 'effect',
  patternIds: ['dota2.short_time_buff'],  // ❌ HARDCODED DOTA2 PATTERN
  ...
};
```

### 4.2 Hardcoded Dota2 Pattern (CRITICAL)

**File**: `core/blueprint/builder.ts`

**Line 180**:
```typescript
patternIds: ['dota2.short_time_buff'],  // ❌ HARDCODED - should be polymorphic
```

This violates:
- Blueprint should not decide final pattern resolution
- Effect category is polymorphic - should use `patternIds: []`
- Talent Draw effect is attribute bonus, not short-time buff

### 4.3 Missing Weighted Pool Parameters

**File**: `core/blueprint/builder.ts`

**Lines 140-148** - Pool module lacks:
```typescript
// Missing parameters:
// - drawMode
// - duplicatePolicy
// - poolStateTracking
// - weights
// - tiers
```

### 4.4 Missing Selection Flow Commit Behavior

**File**: `core/blueprint/builder.ts`

**Lines 150-161** - Rule module lacks:
```typescript
// Missing parameters:
// - postSelectionPoolBehavior
// - trackSelectedItems
// - effectApplication
```

### 4.5 Missing UI Placeholder Configuration

**File**: `core/blueprint/builder.ts`

**Lines 163-174** - UI module lacks:
```typescript
// Missing parameters:
// - minDisplayCount
// - placeholderConfig
// - payloadShape
```

### 4.6 Over-Guessing Structure

**File**: `core/blueprint/builder.ts`

**Lines 119-192** - The entire `buildModules` method has a special case path that:
1. Checks for `schemaParams.choiceCount` or `schemaParams.entries`
2. If present, hardcodes Talent-specific module structure
3. Uses `talent_*` role names
4. Hardcodes `dota2.short_time_buff`

This is the core problem - the builder should NOT have case-specific logic.

---

## 5. Required Builder Changes

### 5.1 Remove Case-Specific Logic

**Function**: `buildModules()` (lines 116-223)

**Change**:
```typescript
// BEFORE (lines 119-192):
if (choiceCount !== undefined || talentEntries !== undefined || ...) {
  // Hardcoded talent modules
}

// AFTER:
// Remove this entire block. Use generic module construction only.
```

### 5.2 Generic Role Naming

**Function**: `createFunctionalModule()` (lines 228-243)

**Change**:
```typescript
// Add role inference based on category, not hardcoded strings
private inferRoleFromCategory(category: BlueprintModule["category"]): string {
  const roleMap: Record<BlueprintModule["category"], string> = {
    trigger: "input_trigger",
    data: "weighted_pool",
    rule: "selection_flow",
    effect: "effect_application",
    ui: "selection_modal",
    resource: "resource_pool",
    integration: "integration_bridge",
  };
  return roleMap[category] || "unknown";
}
```

### 5.3 Parameter Pass-Through

**Function**: `createFunctionalModule()` (lines 228-243)

**Change**:
```typescript
private createFunctionalModule(
  req: string,
  index: number,
  prefix: string,
  schemaParams: Record<string, unknown>  // Add this parameter
): BlueprintModule | null {
  const category = this.inferCategoryFromRequirement(req);
  const patternIds = this.getCanonicalPatternIds(category);
  const role = this.inferRoleFromCategory(category);
  
  // Extract category-specific parameters
  const moduleParams = this.extractModuleParameters(category, schemaParams);
  
  return {
    id: `${prefix}func_${index}`,
    role,
    category,
    patternIds,
    responsibilities: [req],
    parameters: Object.keys(moduleParams).length > 0 ? moduleParams : undefined,
  };
}
```

### 5.4 Add Parameter Extraction Helpers

**New functions needed**:

```typescript
private extractModuleParameters(
  category: BlueprintModule["category"],
  schemaParams: Record<string, unknown>
): Record<string, unknown> {
  switch (category) {
    case "trigger":
      return this.extractTriggerParams(schemaParams);
    case "data":
      return this.extractPoolParams(schemaParams);
    case "rule":
      return this.extractSelectionParams(schemaParams);
    case "ui":
      return this.extractUIParams(schemaParams);
    case "effect":
      return this.extractEffectParams(schemaParams);
    default:
      return {};
  }
}

private extractTriggerParams(params: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  if (params.triggerKey) result.key = params.triggerKey;
  if (params.eventName) result.eventName = params.eventName;
  return result;
}

private extractPoolParams(params: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  if (params.entries) result.entries = params.entries;
  if (params.weights) result.weights = params.weights;
  if (params.tiers) result.tiers = params.tiers;
  if (params.choiceCount) result.choiceCount = params.choiceCount;
  if (params.drawMode) result.drawMode = params.drawMode;
  if (params.duplicatePolicy) result.duplicatePolicy = params.duplicatePolicy;
  if (params.poolStateTracking) result.poolStateTracking = params.poolStateTracking;
  return result;
}

private extractSelectionParams(params: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  if (params.choiceCount) result.choiceCount = params.choiceCount;
  if (params.selectionPolicy) result.selectionPolicy = params.selectionPolicy;
  if (params.applyMode) result.applyMode = params.applyMode;
  if (params.postSelectionPoolBehavior) {
    result.postSelectionPoolBehavior = params.postSelectionPoolBehavior;
  }
  if (params.trackSelectedItems !== undefined) {
    result.trackSelectedItems = params.trackSelectedItems;
  }
  if (params.effectApplication) result.effectApplication = params.effectApplication;
  return result;
}

private extractUIParams(params: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  if (params.choiceCount) result.choiceCount = params.choiceCount;
  if (params.layoutPreset) result.layoutPreset = params.layoutPreset;
  if (params.selectionMode) result.selectionMode = params.selectionMode;
  if (params.dismissBehavior) result.dismissBehavior = params.dismissBehavior;
  if (params.payloadShape) result.payloadShape = params.payloadShape;
  if (params.minDisplayCount !== undefined) {
    result.minDisplayCount = params.minDisplayCount;
  }
  if (params.placeholderConfig) result.placeholderConfig = params.placeholderConfig;
  return result;
}

private extractEffectParams(params: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  if (params.effectMapping) result.effectMapping = params.effectMapping;
  // Do NOT hardcode dota2 patterns here
  return result;
}
```

### 5.5 Polymorphic Effect Handling

**Function**: `getCanonicalPatternIds()` (lines 278-297)

**Change**:
```typescript
private getCanonicalPatternIds(category: BlueprintModule["category"]): string[] {
  switch (category) {
    case "trigger":
      return [CORE_PATTERN_IDS.INPUT_KEY_BINDING];
    case "data":
      return [CORE_PATTERN_IDS.DATA_WEIGHTED_POOL];
    case "rule":
      return [CORE_PATTERN_IDS.RULE_SELECTION_FLOW];
    case "ui":
      return [CORE_PATTERN_IDS.UI_SELECTION_MODAL];
    case "effect":
      return [];  // Polymorphic - let resolver decide
    case "resource":
      return [];  // Polymorphic - let resolver decide
    case "integration":
      return [];
    default:
      return [];
  }
}
```

### 5.6 Graceful Degradation Rules

When IntentSchema lacks required parameters:

| Category | Required | Missing Behavior |
|----------|----------|------------------|
| trigger | `key` | Warning, use default "F4" |
| data | `entries` | Error - cannot build pool |
| rule | `choiceCount` | Error - cannot build selection |
| ui | `choiceCount` | Warning, inherit from rule |
| effect | `effectMapping` | Warning, pass empty |

---

## 6. IntentSchema Requirements

### 6.1 Minimum Structural Fields for Talent Draw

```typescript
interface TalentDrawIntentSchema extends IntentSchema {
  parameters: {
    // Trigger
    triggerKey: string;  // "F4"
    
    // Pool
    entries: Array<{
      id: string;
      label: string;
      description: string;
      weight: number;
      tier: string;  // "R" | "SR" | "SSR" | "UR"
    }>;
    weights: Record<string, number>;  // { R: 40, SR: 30, SSR: 20, UR: 10 }
    tiers: string[];  // ["R", "SR", "SSR", "UR"]
    choiceCount: number;  // 3
    drawMode: "multiple_without_replacement";
    duplicatePolicy: "forbid";
    poolStateTracking: "session";
    
    // Selection
    selectionPolicy: "single";
    applyMode: "immediate";
    postSelectionPoolBehavior: "remove_selected_and_keep_unselected_eligible";
    trackSelectedItems: true;
    
    // Effect Mapping
    effectApplication: {
      enabled: true;
      rarityAttributeBonusMap: {
        R: { attribute: "strength"; value: 10 };
        SR: { attribute: "agility"; value: 10 };
        SSR: { attribute: "intelligence"; value: 10 };
        UR: { attribute: "all"; value: 10 };
      };
    };
    
    // UI
    payloadShape: "card_with_rarity";
    minDisplayCount: 3;
    placeholderConfig: {
      id: "empty_slot";
      name: "Empty Slot";
      disabled: true;
    };
  };
}
```

### 6.2 Generation Responsibility

| Field | Wizard/LLM Generated | Strictly Structured |
|-------|---------------------|---------------------|
| `triggerKey` | ✅ | - |
| `entries` | - | ✅ (40 items with IDs, labels, descriptions) |
| `weights` | - | ✅ (R=40, SR=30, SSR=20, UR=10) |
| `tiers` | - | ✅ |
| `choiceCount` | ✅ | - |
| `drawMode` | - | ✅ (must be `multiple_without_replacement`) |
| `duplicatePolicy` | - | ✅ (must be `forbid`) |
| `poolStateTracking` | - | ✅ (must be `session`) |
| `postSelectionPoolBehavior` | - | ✅ (must be `remove_selected_and_keep_unselected_eligible`) |
| `trackSelectedItems` | - | ✅ (must be `true`) |
| `effectApplication` | - | ✅ (rarity -> attribute mapping) |
| `minDisplayCount` | ✅ | - |
| `placeholderConfig` | ✅ | - |

---

## 7. Validation Plan

### 7.1 Blueprint Unit Tests

```typescript
describe("BlueprintBuilder - Talent Draw Case", () => {
  it("should not use talent_* role names", () => {
    const result = buildBlueprint(talentDrawSchema);
    const roles = result.blueprint?.modules.map(m => m.role) || [];
    expect(roles).not.toContain("talent_trigger");
    expect(roles).not.toContain("talent_pool");
    expect(roles).not.toContain("talent_buff");
    expect(roles).not.toContain("talent_selection");
  });
  
  it("should not hardcode dota2.short_time_buff", () => {
    const result = buildBlueprint(talentDrawSchema);
    const effectModule = result.blueprint?.modules.find(m => m.category === "effect");
    expect(effectModule?.patternIds).not.toContain("dota2.short_time_buff");
    expect(effectModule?.patternIds).toEqual([]); // Polymorphic
  });
  
  it("should express selected-only removal in selection flow params", () => {
    const result = buildBlueprint(talentDrawSchema);
    const ruleModule = result.blueprint?.modules.find(m => m.category === "rule");
    expect(ruleModule?.parameters?.postSelectionPoolBehavior).toBe(
      "remove_selected_and_keep_unselected_eligible"
    );
  });
  
  it("should include pool session state tracking", () => {
    const result = buildBlueprint(talentDrawSchema);
    const poolModule = result.blueprint?.modules.find(m => m.category === "data");
    expect(poolModule?.parameters?.poolStateTracking).toBe("session");
  });
  
  it("should include UI placeholder config", () => {
    const result = buildBlueprint(talentDrawSchema);
    const uiModule = result.blueprint?.modules.find(m => m.category === "ui");
    expect(uiModule?.parameters?.minDisplayCount).toBe(3);
    expect(uiModule?.parameters?.placeholderConfig).toBeDefined();
  });
});
```

### 7.2 Pattern Hint Validation

```bash
# Grep for invalid pattern hints
grep -r "talent\." core/blueprint/ && exit 1
grep -r "dota2.short_time_buff" core/blueprint/builder.ts && exit 1
```

### 7.3 No Domain-Specific Module Role Grep

```bash
# Should return empty
grep -r "talent_trigger\|talent_pool\|talent_buff\|talent_selection" core/blueprint/
```

### 7.4 Talent Draw Canonical Fixture Snapshot

Create `tests/fixtures/talent-draw-blueprint.json` with expected structure for snapshot testing.

### 7.5 Downstream Compatibility Check

```typescript
describe("Blueprint -> Assembly compatibility", () => {
  it("should produce valid AssemblyPlan from Talent Draw Blueprint", () => {
    const blueprint = buildBlueprint(talentDrawSchema).blueprint!;
    const assembly = assemblePlan(blueprint);
    expect(assembly.readyForHostWrite).toBe(true);
  });
});
```

---

## 8. Final Verdict

### Status: **CONDITIONAL GO**

BlueprintBuilder implementation can proceed with the following conditions:

1. **Immediate**: Remove `talent_*` role naming from builder
2. **Immediate**: Remove hardcoded `dota2.short_time_buff` for effect modules
3. **Immediate**: Implement generic parameter pass-through
4. **Immediate**: Use `patternIds: []` for polymorphic categories (effect, resource)

### Pattern Contract Status

The Pattern Catalog already contains all required patterns with correct parameters:
- ✅ `input.key_binding` - ready
- ✅ `data.weighted_pool` - ready with `poolStateTracking`, `drawMode`, `duplicatePolicy`
- ✅ `rule.selection_flow` - ready with `postSelectionPoolBehavior`, `trackSelectedItems`, `effectApplication`
- ✅ `ui.selection_modal` - ready with `minDisplayCount`, `placeholderConfig`, `payloadShape`
- ✅ `effect.modifier_applier` - ready for generic effect application

### IntentSchema Status

IntentSchema requires `parameters` field population for Talent Draw case. This is a Wizard/Schema concern, not a Blueprint concern. Blueprint should read from `schema.parameters` and fail gracefully if missing required fields.

### Blocking Issues

None for Blueprint refactoring. The builder can be made generic now.

---

## 9. Acceptance Criteria

This plan is complete when:

- [x] Analysis of current builder gaps with file/line references
- [x] Canonical Blueprint shape without `talent_*` roles
- [x] No `talent.xxx` pattern proposals
- [x] Selected-only removal expressed via `rule.selection_flow` params
- [x] Session-only pool state (not cross-match persistence)
- [x] Identified hardcoded `dota2.short_time_buff` issue
- [x] Executable implementation checklist for next phase

---

## 10. Next Phase Implementation Checklist

### Phase 1: Builder Refactoring (Immediate)

| Task | File | Function/Line | Priority |
|------|------|---------------|----------|
| Remove talent_* roles | `core/blueprint/builder.ts` | Lines 127-189 | P0 |
| Remove dota2.short_time_buff hardcode | `core/blueprint/builder.ts` | Line 180 | P0 |
| Add generic role inference | `core/blueprint/builder.ts` | New function | P0 |
| Add parameter extraction helpers | `core/blueprint/builder.ts` | New functions | P0 |
| Update getCanonicalPatternIds | `core/blueprint/builder.ts` | Lines 278-297 | P0 |

### Phase 2: Validation (After Builder)

| Task | File | Priority |
|------|------|----------|
| Add unit tests for generic roles | `tests/core/blueprint/builder.test.ts` | P1 |
| Add snapshot test for Talent Draw | `tests/fixtures/talent-draw-blueprint.json` | P1 |
| Add grep-based validation | CI/CD pipeline | P1 |

### Phase 3: Integration (After Validation)

| Task | Priority |
|------|----------|
| Verify AssemblyPlan compatibility | P2 |
| Verify Generator routing | P2 |
| End-to-end Talent Draw case test | P2 |

---

## Appendix A: Reference Documents

- [CANONICAL-CASE-TALENT-DRAW.md](./CANONICAL-CASE-TALENT-DRAW.md)
- [TALENT-DRAW-PATTERN-CONTRACT-IMPLEMENTATION-REPORT.md](./TALENT-DRAW-PATTERN-CONTRACT-IMPLEMENTATION-REPORT.md)
- [PATTERN-SPEC.md](../PATTERN-SPEC.md)
- [PATTERN-MODEL.md](../PATTERN-MODEL.md)
- [BLUEPRINT-ORCHESTRATION-CONTRACT.md](../BLUEPRINT-ORCHESTRATION-CONTRACT.md)
- [BLUEPRINT-VALIDATION.md](../BLUEPRINT-VALIDATION.md)
- [WIZARD-BLUEPRINT-CHAIN.md](../WIZARD-BLUEPRINT-CHAIN.md)
- [COMPOSITE-BLUEPRINT-BASELINE.md](../COMPOSITE-BLUEPRINT-BASELINE.md)

---

## Appendix B: Key Semantic Clarifications

### persistDrawnItems is WRONG

The earlier report incorrectly suggested `persistDrawnItems` on `data.weighted_pool`. This is rejected because:

1. Draw step produces 3 candidates
2. Only 1 selected candidate should be removed
3. 2 unselected candidates must remain eligible

### Correct Lifecycle Boundary

- `data.weighted_pool` tracks current-session remaining state
- `rule.selection_flow` commits selected-item mutation after player confirmation
- Commit behavior: `remove_selected_and_keep_unselected_eligible`

### Session-Only Persistence

- MVP scope: current match/session only
- Cross-match persistence: out of scope
- Static talent definitions: immutable
