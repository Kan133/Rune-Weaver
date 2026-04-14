# Talent Draw Blueprint Refresh Plan

**Document Version**: 1.1
**Date**: 2026-04-12
**Status**: Staged implementation plan and review checklist for BlueprintBuilder refactoring
**Case Truth**: [CANONICAL-CASE-TALENT-DRAW.md](./CANONICAL-CASE-TALENT-DRAW.md)

---

## 1. Executive Summary

### Can BlueprintBuilder be modified directly?

**Conditional GO for P0 only** - BlueprintBuilder can be refactored now to remove case-specific roles and hardcoded Dota2 effect patterns. Full Talent Draw acceptance must wait for Pattern Contract Actualization and IntentSchema parameter production to stabilize.

Blueprint work must be treated as a thin orchestration-layer cleanup, not as a place to implement Talent Draw semantics directly.

### Must Pattern Contract Actualization complete first?

**Yes for final acceptance, no for P0 cleanup**.

P0 Builder cleanup can proceed without waiting:
- Remove `talent_*` role names.
- Remove hardcoded `dota2.short_time_buff`.
- Keep `effect` and `resource` module pattern IDs polymorphic (`[]`).
- Pass through `schema.parameters` without inventing missing Talent Draw structures.

Final acceptance must wait until Pattern Contract Actualization freezes the exact parameter names and semantics for:
- `input.key_binding`
- `data.weighted_pool` (`poolStateTracking`, `drawMode`, `duplicatePolicy`)
- `rule.selection_flow` (`postSelectionPoolBehavior`, `trackSelectedItems`, `effectApplication`)
- `ui.selection_modal` (`minDisplayCount`, `placeholderConfig`, `payloadShape`)
- generic effect application (`effect.modifier_applier` or resolver-selected equivalent)

The builder must NOT hardcode `dota2.short_time_buff` for Talent Draw, and it must NOT replace that hardcode with a different concrete effect hardcode.

### Does IntentSchema need structural field additions?

**Yes** - Current IntentSchema lacks explicit fields for:
- `pool.entries` with rarity/weight structure
- `selection.postSelectionBehavior`
- `effect.mapping` from rarity to attribute bonus

Builder should read from `schema.parameters`, route known fields to the correct module category, and report missing required structures as validation issues once the Pattern Contract is frozen. Before contract freeze, missing fields should be treated as a known limitation, not silently reported as a completed Talent Draw blueprint.

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

### Execution Guardrails for Agents

Agents working from this plan must follow these gates:

| Gate | Allowed Now? | Scope | Completion Signal |
|------|--------------|-------|-------------------|
| P0 Builder cleanup | Yes | Remove case-specific roles/pattern hardcodes and add generic pass-through | Typecheck, grep checks, focused fixture smoke test |
| Blueprint validation hardening | Partially | Add no-duplicate-module checks and polymorphic-aware validation wording | Unit tests prove no duplicate trigger/ui/effect modules |
| Missing-parameter diagnostics | After Pattern Contract freeze | Emit warnings/errors for missing `entries`, `choiceCount`, effect mapping, UI placeholder shape | Tests use the frozen parameter contract |
| End-to-end Talent Draw acceptance | After Pattern Contract + IntentSchema production | Wizard/Schema -> Blueprint -> Assembly -> Routing | Canonical fixture and real CLI/workbench path pass |

Do not report "Talent Draw Blueprint complete" after only a hand-built smoke schema passes. Report P0 as complete and final acceptance as pending Pattern Contract Actualization.

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
    { scope: "blueprint", rule: "No duplicate module categories for canonical Talent Draw shape", severity: "error" },
    { scope: "assembly", rule: "All non-polymorphic modules must bind to available patterns", severity: "error" },
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

### 4.7 Duplicate Module Risk After Generic Refactor (CRITICAL)

When the builder constructs modules from both `requirements.functional` and `normalizedMechanics`, it can create duplicate category modules.

Example risk:
- `requirements.functional` contains "F4 key trigger" -> creates `input_trigger`
- `normalizedMechanics.trigger === true` -> creates another `input_trigger`
- `requirements.interactions` also contains "F4" -> creates a third trigger unless deduped by category/role

The same risk exists for `ui.selection_modal` when both `normalizedMechanics.uiModal` and `uiRequirements.surfaces` are present.

This matters because `buildConnections()` creates connections by category groups. Duplicate trigger/ui/rule modules multiply connections and make the blueprint diverge from the canonical 5-module Talent Draw shape.

Required behavior:
- Deduplicate by stable module role/category, not only by generated ID.
- Canonical Talent Draw should contain exactly one module for each category: `trigger`, `data`, `rule`, `ui`, `effect`.
- Resource modules may be present only when `normalizedMechanics.resourceConsumption` is true.

### 4.8 Missing-Parameter Diagnostics Not Yet Implemented (CRITICAL)

Parameter pass-through alone is not graceful degradation.

If `schema.parameters.entries` is absent, a `weighted_pool` module with no entries is structurally incomplete. If `choiceCount` is absent, `selection_flow` cannot express the three-choice contract. If `effectMapping` / `effectApplication` is absent, the effect application boundary is unresolved.

Required behavior after Pattern Contract freeze:
- Missing `entries` for data pool: blueprint error or `readyForAssembly: false`.
- Missing `choiceCount` for selection flow: blueprint error or `readyForAssembly: false`.
- Missing UI display count/placeholder fields: warning if UI can inherit from selection params; error only if downstream contract requires them.
- Missing effect mapping: warning before resolver; error only if the case contract says outcome application is mandatory and no resolver path can infer it.

Before Pattern Contract freeze, agents should document this as pending rather than inventing defaults in BlueprintBuilder.

### 4.9 Polymorphic Pattern Validation Conflict (HIGH)

The current validation wording "all modules must bind to available Pattern" conflicts with `effect` and `resource` modules using `patternIds: []` intentionally.

Required wording:
- Non-polymorphic modules (`trigger`, `data`, `rule`, `ui`) must bind to available patterns.
- Polymorphic modules (`effect`, `resource`, `integration`) may use empty `patternIds` in Blueprint and must resolve later in Pattern Resolver / Assembly.

### 4.10 Effect Pattern Hints Must Not Reintroduce Hardcoding (HIGH)

Even when `effect` module `patternIds` is empty, `patternHints` can still bias resolver behavior. Blueprint may suggest generic effect candidates only if the hint is clearly non-binding and resolver can reject it from module parameters.

For Talent Draw:
- Do not hint `dota2.short_time_buff`.
- Do not force `effect.resource_consume`.
- Prefer either no effect hint or a broad generic hint such as `effect.modifier_applier` only when Pattern Contract Actualization confirms it is the correct generic attribute-bonus carrier.

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

Implement these rules only after Pattern Contract Actualization freezes the required field names. Until then, add TODOs/tests marked pending rather than inventing Blueprint defaults.

When IntentSchema lacks required parameters:

| Category | Required | Missing Behavior |
|----------|----------|------------------|
| trigger | `key` / `triggerKey` | Warning; allow downstream default only if host policy defines one |
| data | `entries` | Error; data pool is incomplete |
| rule | `choiceCount` | Error; selection flow is incomplete |
| ui | `choiceCount` or inherited selection count | Warning if inheritance is available; otherwise error |
| effect | `effectMapping` or `effectApplication` | Warning before resolver; error only if case contract requires a concrete effect mapping |

### 5.7 Deduplicate Generic Modules

**Function**: `buildModules()`

When modules are created from multiple sources (`requirements.functional`, `normalizedMechanics`, `requirements.interactions`, `uiRequirements.surfaces`), merge or skip duplicates by category/role.

Required canonical behavior for Talent Draw:

```typescript
const categories = blueprint.modules.map((m) => m.category);
expect(categories.filter((c) => c === "trigger")).toHaveLength(1);
expect(categories.filter((c) => c === "data")).toHaveLength(1);
expect(categories.filter((c) => c === "rule")).toHaveLength(1);
expect(categories.filter((c) => c === "ui")).toHaveLength(1);
expect(categories.filter((c) => c === "effect")).toHaveLength(1);
```

Suggested implementation:
- Keep the first module for a category when it came from a more specific source.
- Merge responsibilities from duplicate sources.
- Merge compatible parameter pass-through results.
- Do not create a second UI module for the same `selection_modal` role.

### 5.8 Polymorphic-Aware Validation Contract

Update validation text and tests so empty `patternIds` is legal for polymorphic categories.

Required behavior:

```typescript
if (module.category === "effect" || module.category === "resource" || module.category === "integration") {
  // patternIds may be []
  // resolver/assembly must prove a concrete route later
} else {
  // patternIds must contain available catalog IDs
}
```

Do not keep validation rules that imply every Blueprint module must already have a concrete pattern ID.

### 5.9 Pattern Hint Scope

`buildPatternHints()` should not undermine polymorphic effect handling.

Acceptable options:
- Do not emit effect pattern hints for Talent Draw until effect contract is frozen.
- Or emit only resolver-safe generic hints confirmed by Pattern Contract Actualization.

Forbidden:
- Any `dota2.short_time_buff` hint from BlueprintBuilder for Talent Draw.
- Any required concrete effect pattern in Blueprint module `patternIds`.

---

## 6. IntentSchema Requirements

This section is a target contract for Wizard/IntentSchema agents. BlueprintBuilder must consume these fields when present, but it must not synthesize Talent Draw data itself.

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

### 6.3 Contract Freeze Dependency

Before final Blueprint acceptance, Pattern Contract Actualization must confirm:

1. The field names above are exactly the fields downstream generators/resolvers expect.
2. `effectApplication.rarityAttributeBonusMap` and `effectMapping` are either both required with distinct purposes, or one is chosen as canonical.
3. `poolStateTracking: "session"` means current match/session state only, not cross-match persistence.
4. `postSelectionPoolBehavior: "remove_selected_and_keep_unselected_eligible"` is owned by `rule.selection_flow`, not `data.weighted_pool`.
5. `ui.selection_modal` owns placeholder rendering only, not candidate draw logic.

---

## 7. Validation Plan

### 7.1 Blueprint Unit Tests

```typescript
describe("BlueprintBuilder - Talent Draw Case", () => {
  it("should produce one canonical module per Talent Draw category", () => {
    const result = buildBlueprint(talentDrawSchema);
    const modules = result.blueprint?.modules || [];
    expect(modules.filter((m) => m.category === "trigger")).toHaveLength(1);
    expect(modules.filter((m) => m.category === "data")).toHaveLength(1);
    expect(modules.filter((m) => m.category === "rule")).toHaveLength(1);
    expect(modules.filter((m) => m.category === "ui")).toHaveLength(1);
    expect(modules.filter((m) => m.category === "effect")).toHaveLength(1);
  });

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

  it("should allow empty patternIds only for polymorphic categories", () => {
    const result = buildBlueprint(talentDrawSchema);
    for (const module of result.blueprint?.modules || []) {
      if (["effect", "resource", "integration"].includes(module.category)) {
        continue;
      }
      expect(module.patternIds?.length).toBeGreaterThan(0);
    }
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

  it("should not report full readiness when frozen required parameters are missing", () => {
    const result = buildBlueprint(talentDrawSchemaWithoutEntries);
    expect(result.success).toBe(false);
    expect(result.issues.some((issue) => issue.code.includes("MISSING"))).toBe(true);
  });
});
```

The final missing-parameter test should be enabled only after Pattern Contract Actualization freezes the required field names. Before that point, mark it as pending/TODO in the test suite rather than forcing guessed defaults.

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

This check is not sufficient by itself. It must use the same canonical fixture generated by the Wizard/IntentSchema path, not only a hand-built smoke schema.

---

## 8. Final Verdict

### Status: **CONDITIONAL GO FOR P0, HOLD FINAL ACCEPTANCE**

BlueprintBuilder implementation can proceed with the following conditions:

1. **Immediate**: Remove `talent_*` role naming from builder
2. **Immediate**: Remove hardcoded `dota2.short_time_buff` for effect modules
3. **Immediate**: Implement generic parameter pass-through
4. **Immediate**: Use `patternIds: []` for polymorphic categories (effect, resource)
5. **Immediate**: Prevent duplicate canonical modules when multiple schema sources imply the same category
6. **Immediate**: Update validation wording so polymorphic empty `patternIds` is legal
7. **After Pattern Contract freeze**: Add missing-parameter diagnostics and final fixture tests

### Pattern Contract Status

Another agent group is actively performing Pattern Contract Actualization. Treat the following as target dependencies, not final acceptance evidence:

- `input.key_binding`
- `data.weighted_pool` with `poolStateTracking`, `drawMode`, `duplicatePolicy`
- `rule.selection_flow` with `postSelectionPoolBehavior`, `trackSelectedItems`, `effectApplication`
- `ui.selection_modal` with `minDisplayCount`, `placeholderConfig`, `payloadShape`
- generic effect application via resolver-selected pattern

Blueprint agents must not change these contracts unilaterally. If field names differ from this plan after actualization, update Blueprint extraction/tests to the frozen contract.

### IntentSchema Status

IntentSchema requires `parameters` field population for Talent Draw case. This is a Wizard/Schema concern, not a Blueprint concern. Blueprint should read from `schema.parameters` and fail gracefully if missing required fields.

### Blocking Issues

No blockers for P0 cleanup.

Final Talent Draw acceptance is blocked by:

1. Pattern Contract Actualization freeze.
2. Wizard/IntentSchema production of canonical `schema.parameters`.
3. Duplicate-module prevention tests.
4. Polymorphic-aware validation tests.
5. End-to-end canonical fixture from real schema path.

---

## 9. Acceptance Criteria

### 9.1 Plan Document Acceptance

This planning document is complete when:

- [x] Analysis of current builder gaps with file/line references
- [x] Canonical Blueprint shape without `talent_*` roles
- [x] No `talent.xxx` pattern proposals
- [x] Selected-only removal expressed via `rule.selection_flow` params
- [x] Session-only pool state (not cross-match persistence)
- [x] Identified hardcoded `dota2.short_time_buff` issue
- [x] Executable implementation checklist for next phase
- [x] Added review guardrails for duplicate modules, polymorphic validation, and Pattern Contract dependency

### 9.2 Implementation Acceptance

The BlueprintBuilder implementation is complete only when:

- [ ] `core/blueprint/builder.ts` contains no Talent Draw special-case branch
- [ ] `core/blueprint/builder.ts` contains no `talent_trigger`, `talent_pool`, `talent_buff`, or `talent_selection` roles
- [ ] `core/blueprint/builder.ts` contains no `dota2.short_time_buff`
- [ ] canonical Talent Draw fixture produces exactly one `trigger`, `data`, `rule`, `ui`, and `effect` module
- [ ] `effect` and `resource` modules may have empty `patternIds`; non-polymorphic modules may not
- [ ] pool, selection, UI, and effect parameters pass through from frozen `schema.parameters`
- [ ] missing required Talent Draw parameters produce validation issues after Pattern Contract freeze
- [ ] Pattern hints do not force a concrete Dota2 effect pattern
- [ ] downstream assembly/resolver tests pass using the real Wizard/IntentSchema-generated fixture

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
| Deduplicate category/role modules | `core/blueprint/builder.ts` | `buildModules()` | P0 |
| Update polymorphic validation wording | `core/blueprint/builder.ts` | `buildValidationContracts()` | P0 |
| Avoid concrete Dota2 effect hints | `core/blueprint/builder.ts` | `buildPatternHints()` | P1 |

### Phase 2: Validation (After Builder)

| Task | File | Priority |
|------|------|----------|
| Add unit tests for generic roles | `tests/core/blueprint/builder.test.ts` | P1 |
| Add no-duplicate-module test | `tests/core/blueprint/builder.test.ts` | P1 |
| Add polymorphic patternIds test | `tests/core/blueprint/builder.test.ts` | P1 |
| Add snapshot test for Talent Draw | `tests/fixtures/talent-draw-blueprint.json` | P1 |
| Add grep-based validation | CI/CD pipeline | P1 |

### Phase 3: Contract Freeze Follow-Up (After Pattern Contract Actualization)

| Task | File | Priority |
|------|------|----------|
| Align extracted parameter names to frozen Pattern Contract | `core/blueprint/builder.ts` | P0 |
| Add missing-parameter diagnostics | `core/blueprint/builder.ts` | P0 |
| Add canonical IntentSchema fixture from Wizard path | `tests/fixtures/talent-draw-intent-schema.json` | P1 |
| Update Talent Draw snapshot from real fixture | `tests/fixtures/talent-draw-blueprint.json` | P1 |

### Phase 4: Integration (After Validation)

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
