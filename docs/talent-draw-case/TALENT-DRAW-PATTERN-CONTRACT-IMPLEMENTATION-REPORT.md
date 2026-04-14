# Talent Draw Pattern Contract Actualization Plan

**Document Version**: 1.1  
**Date**: 2026-04-12  
**Status**: Corrected executable plan, not yet implemented catalog state  
**Case Truth**: [CANONICAL-CASE-TALENT-DRAW.md](./CANONICAL-CASE-TALENT-DRAW.md)

---

## 1. Executive Summary

This document replaces the earlier pattern contract report with a corrected, executable plan.

The previous report was directionally useful, but two points needed correction:

1. It claimed pattern contracts were ready even though the actual catalog and drafts were not updated.
2. It placed "permanent removal" on `data.weighted_pool.persistDrawnItems`, which encodes the wrong lifecycle boundary for this case.

The corrected plan is:

- do not add talent-specific patterns,
- actualize the existing core patterns,
- keep static talent definitions immutable,
- treat "permanent removal" as current-match/session state mutation after player selection,
- and complete the real catalog/draft update before generator work starts.

### Corrected Verdict

> Pattern contracts are ready to be actualized. Generator implementation should start only after the catalog and draft files are updated and validated.

### Minimum Work

| Area | Required work |
|---|---|
| Pattern catalog | Update 3 existing pattern definitions in `adapters/dota2/patterns/index.ts` |
| Pattern drafts | Sync 2 existing drafts and add 1 missing draft |
| Validation | Run pattern validation / draft checks |
| Generator | Start only after this actualization passes |

---

## 2. Corrected Runtime Semantics

### 2.1 Static Catalog vs Session State

Talent Draw has two different data layers.

#### Static Talent Catalog

This is immutable definition data.

It contains:

- `R001` to `R010`
- `SR001` to `SR010`
- `SSR001` to `SSR010`
- `UR001` to `UR010`

Each definition contains:

- id
- rarity
- name
- description
- effect definition

These entries must not be deleted or mutated during runtime.

#### Current Match / Session Pool State

This is mutable runtime state.

It contains:

- `remainingTalentIds`
- `ownedTalentIds`
- `currentChoiceIds`

For this MVP, persistence scope is only the current match/session.

Cross-match persistence is out of scope.

### 2.2 Correct Meaning Of "Permanent Removal"

In this case, "permanent removal" means:

- after the player selects one candidate,
- remove the selected talent id from current-session `remainingTalentIds`,
- add the selected talent id to current-session `ownedTalentIds`,
- keep unselected candidates eligible for later draws,
- never delete the static talent definition.

It does not mean:

- remove all drawn candidates,
- mutate static talent catalog data,
- persist across game restarts,
- or implement account-level progression.

### 2.3 Why `persistDrawnItems` Is Wrong

`persistDrawnItems` is rejected.

Reason:

- the draw step produces 3 candidates,
- but only 1 selected candidate should be removed,
- the 2 unselected candidates must remain eligible.

Persisting "drawn items" at draw time would remove the wrong items unless corrective logic is later added.

The correct lifecycle boundary is:

- `data.weighted_pool` tracks current-session remaining state,
- `rule.selection_flow` commits selected-item mutation after player confirmation.

---

## 3. Current Pattern Reality

### 3.1 `data.weighted_pool`

Current state:

- draft exists
- catalog exists
- draft and catalog are not fully synchronized

Existing draft already defines:

- `drawMode`
- `duplicatePolicy`

Catalog currently lacks those parameters.

Missing for Talent Draw:

- current-session pool state tracking
- clear remaining/owned/current-choice state outputs

### 3.2 `rule.selection_flow`

Current state:

- catalog exists
- draft file does not exist

Missing for Talent Draw:

- post-selection commit semantics
- selected item tracking
- effect application mapping
- clear dependency on a mutable pool state

### 3.3 `ui.selection_modal`

Current state:

- draft exists
- catalog exists
- draft and catalog are not fully synchronized

Existing draft already defines:

- `payloadShape`

Catalog currently lacks `payloadShape`.

Missing for Talent Draw:

- fixed minimum visible slot count
- placeholder slot config

---

## 4. Required Pattern Changes

### 4.1 `data.weighted_pool`

Responsibility:

- hold immutable candidate definitions,
- provide weighted draw,
- optionally track current-session pool state.

It should not decide selected/unselected commit behavior.

#### Catalog Parameters To Add Or Sync

| Parameter | Type | Required | Default | Purpose |
|---|---|---:|---|---|
| `drawMode` | enum | false | `single` | Draw behavior: `single`, `multiple_without_replacement`, `multiple_with_replacement` |
| `duplicatePolicy` | enum | false | `allow` | Candidate duplicate handling: `allow`, `avoid_when_possible`, `forbid` |
| `poolStateTracking` | enum | false | `none` | Mutable pool tracking scope: `none`, `session` |

#### Inputs / Outputs To Clarify

When `poolStateTracking = "session"`, the pattern should expose current-session state outputs:

- `remainingTalentIds`
- `ownedTalentIds`
- `currentChoiceIds`

These are generic enough to represent other selection-pool systems later, but Talent Draw uses the names above as the canonical first case.

#### Validation

- `choiceCount > 0`
- if `duplicatePolicy = "forbid"`, the draw implementation must not produce duplicate candidates within one draw
- if `poolStateTracking = "session"`, generated code must create current-session mutable state
- static entries must remain immutable

### 4.2 `rule.selection_flow`

Responsibility:

- orchestrate draw -> present -> select -> apply -> commit lifecycle.

This is where selected-item commit semantics belong.

#### Draft File To Add

Create:

- `/D:/Rune Weaver/adapters/dota2/patterns/drafts/rule-selection-flow.pattern.md`

The draft must include:

- responsibilities
- non-goals
- parameters
- inputs
- outputs
- constraints
- dependencies
- Dota2 host binding
- validation / smoke hints

#### Catalog Parameters To Add

| Parameter | Type | Required | Default | Purpose |
|---|---|---:|---|---|
| `postSelectionPoolBehavior` | enum | false | `none` | Commit behavior after player selection |
| `trackSelectedItems` | boolean | false | `false` | Whether selected ids are tracked in owned/current-session list |
| `effectApplication` | object | false | `undefined` | Bounded selected-result effect mapping |

#### `postSelectionPoolBehavior` Values

Use these values:

- `none`
- `remove_selected_from_remaining`
- `remove_selected_and_keep_unselected_eligible`

For Talent Draw MVP, use:

- `remove_selected_and_keep_unselected_eligible`

This explicitly captures:

- selected talent removed from `remainingTalentIds`,
- selected talent added to `ownedTalentIds` if `trackSelectedItems = true`,
- unselected candidates remain eligible,
- static talent definitions unchanged.

#### `effectApplication` Shape

For the first runnable case:

```ts
effectApplication?: {
  enabled: boolean;
  rarityAttributeBonusMap: Record<
    "R" | "SR" | "SSR" | "UR",
    { attribute: "strength" | "agility" | "intelligence" | "all"; value: number }
  >;
}
```

Talent Draw MVP values:

- `R -> strength +10`
- `SR -> agility +10`
- `SSR -> intelligence +10`
- `UR -> all +10`

This is intentionally bounded.

Do not introduce a general talent-effect DSL in this phase.

#### Validation

- if `postSelectionPoolBehavior !== "none"`, a compatible pool state source must exist
- if `trackSelectedItems = true`, selected ids must be appended to the session owned list
- if `effectApplication.enabled = true`, the effect map must include all rarities present in the candidate entries
- unselected candidates must remain eligible in the Talent Draw MVP

### 4.3 `ui.selection_modal`

Responsibility:

- render a bounded set of selectable candidates,
- return a selected payload,
- support fixed visible slots and placeholder display.

#### Catalog Parameters To Add Or Sync

| Parameter | Type | Required | Default | Purpose |
|---|---|---:|---|---|
| `payloadShape` | enum | false | `card` | Presentation payload type: `simple_text`, `card`, `card_with_rarity`, `custom` |
| `minDisplayCount` | number | false | `0` | Minimum visible slot count |
| `placeholderConfig` | object | false | default placeholder | Placeholder item config for empty slots |

#### Talent Draw MVP Values

- `choiceCount = 3`
- `minDisplayCount = 3`
- `payloadShape = "card_with_rarity"`
- placeholder slots are disabled and not selectable

#### Validation

- `minDisplayCount >= 0`
- if `minDisplayCount > choiceCount`, warn unless fixed-slot display is intended
- placeholder config must include at least `id` and `name`
- placeholder items must not emit selection events

---

## 5. What Not To Add

Do not add these patterns:

- `talent_selection_flow`
- `talent_pool`
- `talent_modal`
- `effect.talent_apply`

Reason:

- they are domain-specific wrappers around existing reusable mechanics.

Do not add these semantics in this phase:

- cross-match persistence
- account-level talent ownership
- pity / guarantee system
- advanced talent-effect DSL
- multiplayer synchronization polish

---

## 6. Actualization Tasks

This report is not the implemented contract.

The following concrete tasks must be completed before generator implementation begins.

### Task 1: Update Pattern Catalog

File:

- `/D:/Rune Weaver/adapters/dota2/patterns/index.ts`

Required updates:

1. sync `data.weighted_pool` with:
   - `drawMode`
   - `duplicatePolicy`
   - `poolStateTracking`
2. sync `ui.selection_modal` with:
   - `payloadShape`
   - `minDisplayCount`
   - `placeholderConfig`
3. extend `rule.selection_flow` with:
   - `postSelectionPoolBehavior`
   - `trackSelectedItems`
   - `effectApplication`

### Task 2: Update Existing Drafts

Files:

- `/D:/Rune Weaver/adapters/dota2/patterns/drafts/data-weighted-pool.pattern.md`
- `/D:/Rune Weaver/adapters/dota2/patterns/drafts/ui-selection-modal.pattern.md`

Required updates:

- add corrected session-state language
- remove any implication that drawn items are committed at draw time
- add new parameters and validation notes

### Task 3: Add Missing Draft

File:

- `/D:/Rune Weaver/adapters/dota2/patterns/drafts/rule-selection-flow.pattern.md`

Required content:

- full draft per `PATTERN-SPEC.md`
- explicit selected-item commit semantics
- explicit unselected-remain-eligible semantics
- effect application mapping
- host binding notes
- validation / smoke hints

### Task 4: Validate

Run the available pattern validation commands after edits:

- `npm run cli -- pattern validate`
- `npm run cli -- pattern check-draft`

If validation command names differ, use the repository's existing pattern validation scripts.

---

## 7. Generator Compatibility Notes

Generator work should start only after actualization tasks pass.

The next generator phase should implement:

1. `generateWeightedPoolCode`
   - session `remainingTalentIds`
   - session `ownedTalentIds`
   - session `currentChoiceIds`
   - immutable static entries
2. `generateSelectionFlowCode`
   - post-selection selected commit
   - unselected remain eligible
   - bounded rarity attribute effect mapping
3. `generateSelectionModalComponent`
   - fixed 3 slots
   - disabled placeholder slots
   - `card_with_rarity` payload display

Do not start with:

- general talent-effect DSL
- cross-session persistence
- full multiplayer state architecture

---

## 8. Recommended Execution Order

### Phase 1: Pattern Contract Actualization

1. update catalog
2. update existing drafts
3. create `rule-selection-flow.pattern.md`
4. run pattern validation

### Phase 2: Generator Implementation

1. implement session pool state generation
2. implement selection commit generation
3. implement effect mapping generation
4. implement placeholder UI generation

### Phase 3: First Runnable Case

1. generate Talent Draw artifacts
2. write into Dota2 host
3. launch host
4. validate runtime acceptance bar

---

## 9. Acceptance Criteria For This Contract Round

This contract round is complete only when:

1. catalog contains all required parameters,
2. drafts are synchronized with catalog,
3. `rule-selection-flow.pattern.md` exists,
4. pattern validation passes,
5. required parameter lists no longer propose `persistDrawnItems`,
6. the current-match/session-only semantics are explicit.

---

## 10. Final Verdict

> Pattern contracts still require actualization before generator implementation.

This is a corrected executable plan.

Rune Weaver should not proceed directly to generator implementation until the catalog and draft files are updated and validated.

Once actualized, the next phase can move into generator implementation without another broad contract round.

---

## Appendix A: Corrected Parameter Summary

### `data.weighted_pool`

```ts
interface WeightedPoolParams {
  entries: Array<unknown>;
  weights?: Record<string, number>;
  tiers?: string[];
  choiceCount?: number;
  drawMode?: "single" | "multiple_without_replacement" | "multiple_with_replacement";
  duplicatePolicy?: "allow" | "avoid_when_possible" | "forbid";
  poolStateTracking?: "none" | "session";
}
```

### `rule.selection_flow`

```ts
interface SelectionFlowParams {
  choiceCount: number;
  selectionPolicy?: "single" | "multi";
  applyMode?: "immediate" | "deferred";
  postSelectionPoolBehavior?:
    | "none"
    | "remove_selected_from_remaining"
    | "remove_selected_and_keep_unselected_eligible";
  trackSelectedItems?: boolean;
  effectApplication?: {
    enabled: boolean;
    rarityAttributeBonusMap: Record<
      "R" | "SR" | "SSR" | "UR",
      { attribute: "strength" | "agility" | "intelligence" | "all"; value: number }
    >;
  };
}
```

### `ui.selection_modal`

```ts
interface SelectionModalParams {
  choiceCount: number;
  layoutPreset?: "card_tray" | "list" | "grid";
  selectionMode?: "single" | "multi";
  dismissBehavior?: "selection_only" | "manual" | "auto";
  payloadShape?: "simple_text" | "card" | "card_with_rarity" | "custom";
  minDisplayCount?: number;
  placeholderConfig?: {
    id: string;
    name: string;
    description?: string;
    disabled?: boolean;
  };
}
```

---

## Appendix B: Reference Documents

- [CANONICAL-CASE-TALENT-DRAW.md](./CANONICAL-CASE-TALENT-DRAW.md)
- [TALENT-DRAW-IMPLEMENTATION-PLAN.md](./TALENT-DRAW-IMPLEMENTATION-PLAN.md)
- [TALENT-DRAW-IMPLEMENTATION-PLANNING-REPORT.md](./TALENT-DRAW-IMPLEMENTATION-PLANNING-REPORT.md)
- [PATTERN-SPEC.md](../PATTERN-SPEC.md)
- [PATTERN-MODEL.md](../PATTERN-MODEL.md)
- [PATTERN-PIPELINE.md](../PATTERN-PIPELINE.md)
