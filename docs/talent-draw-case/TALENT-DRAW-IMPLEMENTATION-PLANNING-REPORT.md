# Talent Draw Generator Implementation Planning Report

**Document Version**: 2.0  
**Date**: 2026-04-12  
**Status**: Current generator implementation plan, aligned with refreshed Pattern and Blueprint contracts  
**Case Truth**: [CANONICAL-CASE-TALENT-DRAW.md](./CANONICAL-CASE-TALENT-DRAW.md)

---

## 1. Executive Summary

Talent Draw is the current composite proving case for Rune Weaver.

The goal is to make Rune Weaver generate and write a runnable Dota2 Talent Draw feature through the formal pipeline, not through hand-written runtime code.

Current contract state:

- Pattern Contract Actualization is effectively frozen, with one small CLI validation fix already handled.
- Blueprint Refresh P0/P1 is still in progress. Generator implementation may start with **research/planning only** while Blueprint finishes. Generator coding must wait until Blueprint produces the canonical module shape without duplicate modules.

### Current Generator Target

Generator work should implement support for the current contracts:

- `data.weighted_pool`
  - `drawMode`
  - `duplicatePolicy`
  - `poolStateTracking`
- `rule.selection_flow`
  - `postSelectionPoolBehavior`
  - `trackSelectedItems`
  - `effectApplication`
- `ui.selection_modal`
  - `payloadShape`
  - `minDisplayCount`
  - `placeholderConfig`
- effect application remains polymorphic at Blueprint stage and is resolved later by resolver/assembly/generator routing.

### Final Verdict

Generator implementation can begin after a short read-only research pass. Coding should start only after:

1. Pattern validation remains green,
2. Blueprint P0/P1 refresh is accepted,
3. the canonical Talent Draw Blueprint emits exactly one `trigger`, `data`, `rule`, `ui`, and `effect` module.

---

## 2. Correct Runtime Semantics

### 2.1 Static Definitions vs Session State

Talent Draw has two data layers.

Static definitions:

- immutable talent entries,
- rarity/tier metadata,
- display text,
- effect data.

Session state:

- `remainingTalentIds`,
- `ownedTalentIds`,
- `currentChoiceIds`.

Static definitions must not be deleted or mutated during runtime.

### 2.2 Selected-Only Commit

The draw step produces up to 3 candidates.

After player selection:

- selected id is removed from current-session `remainingTalentIds`,
- selected id is added to current-session `ownedTalentIds` when `trackSelectedItems = true`,
- unselected candidates remain eligible,
- static definitions remain immutable.

This lifecycle is expressed by:

```ts
postSelectionPoolBehavior: "remove_selected_and_keep_unselected_eligible"
trackSelectedItems: true
```

Do not implement or reintroduce `persistDrawnItems`.

### 2.3 Dota2 Runtime State Sync

For Dota2, session state may be synchronized through CustomNetTables or the existing host state/event bridge.

This is a host implementation detail. Pattern and Blueprint contracts should only express session state tracking, not force a specific transport.

---

## 3. Current Pipeline Shape

### 3.1 Canonical Blueprint Modules

The canonical Talent Draw Blueprint must contain these five categories:

| Module role | Category | Pattern contract |
|---|---|---|
| `input_trigger` | `trigger` | `input.key_binding` |
| `weighted_pool` | `data` | `data.weighted_pool` |
| `selection_flow` | `rule` | `rule.selection_flow` |
| `selection_modal` | `ui` | `ui.selection_modal` |
| `effect_application` | `effect` | polymorphic, resolver-selected |

Generator agents must not assume the old 4-module plan. `effect_application` is explicit, even if its final pattern is resolved later.

### 3.2 Required Parameters

`data.weighted_pool`:

```ts
{
  entries: Array<unknown>;
  weights?: Record<string, number>;
  tiers?: string[];
  choiceCount?: number;
  drawMode?: "single" | "multiple_without_replacement" | "multiple_with_replacement";
  duplicatePolicy?: "allow" | "avoid_when_possible" | "forbid";
  poolStateTracking?: "none" | "session";
}
```

`rule.selection_flow`:

```ts
{
  choiceCount: number;
  selectionPolicy?: "single" | "multi";
  applyMode?: "immediate" | "deferred";
  postSelectionPoolBehavior?: "none" | "remove_selected_from_remaining" | "remove_selected_and_keep_unselected_eligible";
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

`ui.selection_modal`:

```ts
{
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

Talent Draw MVP values:

```ts
{
  choiceCount: 3,
  drawMode: "multiple_without_replacement",
  duplicatePolicy: "forbid",
  poolStateTracking: "session",
  selectionPolicy: "single",
  applyMode: "immediate",
  postSelectionPoolBehavior: "remove_selected_and_keep_unselected_eligible",
  trackSelectedItems: true,
  payloadShape: "card_with_rarity",
  minDisplayCount: 3,
  placeholderConfig: {
    id: "empty_slot",
    name: "Empty Slot",
    description: "No talent available",
    disabled: true
  }
}
```

---

## 4. Generator Work Packages

### GP-1: Weighted Pool Session State

Target pattern:

- `data.weighted_pool`

Generator must support:

- immutable static entries,
- weighted draw by `weights` / `tiers`,
- `choiceCount`,
- `drawMode = "multiple_without_replacement"`,
- `duplicatePolicy = "forbid"`,
- `poolStateTracking = "session"`,
- runtime/session fields:
  - `remainingTalentIds`,
  - `ownedTalentIds`,
  - `currentChoiceIds`.

Acceptance:

- static entries are not mutated,
- selected-only removal can be called by selection flow,
- unselected candidates remain eligible,
- generated output exposes enough API/state for `rule.selection_flow`.

### GP-2: Selection Flow Commit And Events

Target pattern:

- `rule.selection_flow`

Generator must support:

- receive candidates from weighted pool,
- open/present selection UI through host event bridge,
- listen for selected payload from UI,
- apply `postSelectionPoolBehavior`,
- update pool state after confirmation,
- honor `trackSelectedItems`,
- leave unselected candidates eligible.

Acceptance:

- selected id leaves `remainingTalentIds`,
- selected id enters `ownedTalentIds` when configured,
- unselected ids are not removed,
- selection event is player-scoped where host APIs require it.

### GP-3: Effect Application Mapping

Target source:

- `rule.selection_flow.parameters.effectApplication`
- optional `effect_application` module parameters

Generator must support bounded MVP mapping:

- R -> strength +10
- SR -> agility +10
- SSR -> intelligence +10
- UR -> all attributes +10

Acceptance:

- generated code has a deterministic rarity-to-attribute map,
- no general talent-effect DSL is introduced,
- no `dota2.short_time_buff` hardcode is introduced for Talent Draw,
- implementation can later be routed through a generic effect pattern if resolver supports it.

### GP-4: Selection Modal Placeholder UI

Target pattern:

- `ui.selection_modal`

Generator must support:

- `payloadShape = "card_with_rarity"`,
- `minDisplayCount = 3`,
- fixed visible slots,
- disabled placeholder slots using `placeholderConfig`,
- result event emitted only for selectable candidate cards.

Acceptance:

- if fewer than 3 candidates exist, placeholders fill the remaining slots,
- placeholder card cannot be selected,
- selected payload includes enough id/rarity data for server handling.

### GP-5: Routing, Bridge, And Workspace Evidence

Generator work must integrate with current assembly/realization/routing/write-plan architecture.

Do not hardcode old output paths from earlier plans. Use the current routing policy and host write executor.

Acceptance:

- generatedFiles are recorded truthfully,
- entryBindings/bridge updates are recorded truthfully,
- server/shared/ui outputs are distinguishable,
- write preview/review can explain the generated artifacts.

---

## 5. Recommended Execution Order

### Phase A: Generator Research Only

Can run in parallel with Blueprint P0/P1.

Research current implementations:

- Dota2 TS generator,
- UI generator,
- assembly/realization routing,
- bridge/event helpers,
- workspace generatedFiles/entryBindings recording,
- existing generated output tests or examples.

Output:

- exact files/functions to modify,
- current generator capabilities,
- missing hooks,
- proposed minimal implementation slices.

### Phase B: Generator Coding

Start only after Blueprint P0/P1 is accepted.

Suggested order:

1. GP-1 weighted pool session state,
2. GP-2 selection flow commit/events,
3. GP-3 effect mapping,
4. GP-4 selection modal placeholders,
5. GP-5 routing/bridge/workspace evidence.

### Phase C: Generator Output Validation

Before runtime testing, validate generated output statically.

Required output checks:

- contains `remainingTalentIds`,
- contains `ownedTalentIds`,
- contains `currentChoiceIds`,
- contains selected-only commit logic,
- contains `remove_selected_and_keep_unselected_eligible` behavior,
- contains bounded rarity attribute mapping,
- contains placeholder `empty_slot`,
- contains UI result event path,
- no `persistDrawnItems`,
- no Talent Draw `dota2.short_time_buff` hardcode.

### Phase D: Host Write And Runtime Checklist

Run after generated output shape is stable.

Manual/runtime checklist:

- trigger opens UI,
- 3 cards or placeholders render,
- placeholder cannot be selected,
- selecting a card applies the correct effect,
- selected id removed from session remaining pool,
- unselected ids remain eligible,
- feature is recorded in workspace,
- list/inspect show truthful metadata.

---

## 6. LLM Assistance Boundary

LLM may help fill:

- talent names/descriptions,
- static talent entries,
- UI copy,
- non-semantic style text.

LLM must not decide:

- runtime state model,
- selected-only commit semantics,
- event transport semantics,
- module boundaries,
- ownership boundaries,
- host write paths,
- effect contract shape.

---

## 7. Risks

| Risk | Severity | Mitigation |
|---|---|---|
| Blueprint output still duplicates modules | High | Do not start coding until Blueprint P0/P1 validator passes |
| Pattern contract drifts from generator assumptions | High | Run pattern validate/check-draft before coding |
| Event bridge is host-specific | Medium | Research existing bridge helpers first |
| CustomNetTables assumptions may be wrong | Medium | Keep sync implementation localized and test with host checklist |
| UI output path assumptions are stale | Medium | Use current realization/write-plan policy, not old hardcoded paths |

---

## 8. Acceptance Criteria

This implementation round is complete when:

1. Pattern contract validation passes,
2. Blueprint canonical Talent Draw emits one trigger/data/rule/ui/effect module,
3. generator output contains required pool/session/selection/effect/UI structures,
4. write plan records truthful generated files and bridge updates,
5. Talent Draw can be written into a host,
6. runtime/manual checklist passes or blockers are explicitly documented,
7. no old contract names are reintroduced:
   - `removalPolicy`,
   - `returnPolicy`,
   - `effectMap`,
   - `persistState`,
   - `stateTrackingMode`,
   - `placeholderBehavior`,
   - `dynamicSlotCount`,
   - `persistDrawnItems`.

---

## 9. Final Verdict

Generator implementation should proceed in two steps:

1. start Generator Research now, even while Blueprint P0/P1 finishes;
2. start Generator Coding only after Blueprint P0/P1 is accepted.

The next milestone is not broad platform expansion. It is the Talent Draw runnable case and its evidence pack.
