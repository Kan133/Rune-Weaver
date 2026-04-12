# Pattern Draft: rule.selection_flow

## Basic

- id: `rule.selection_flow`
- name: `Selection Flow`
- category: `rule`
- host: `dota2`
- version: `0.1`
- backlog-fit: `strong`

## Summary

This Pattern orchestrates the complete multi-choice-one flow: draw candidates, present UI, receive selection, apply effect, and commit pool state mutations. This is where selection-confirmed commit semantics belong.

## Responsibilities

- Orchestrate draw -> present -> select -> apply -> commit lifecycle.
- Receive player selection from UI Pattern.
- Apply selected result effects (bounded effect mapping).
- Commit pool state mutations after selection confirmation.
- Track selected items in owned list when configured.
- Ensure unselected candidates remain eligible for future draws.

## Non-goals

- Do not manage the candidate pool itself; that belongs to `data.weighted_pool`.
- Do not render UI; that belongs to `ui.selection_modal`.
- Do not handle cross-match persistence; MVP only requires current-match/session persistence.
- Do not implement a general talent-effect DSL; use bounded effect mapping for MVP.

## Parameters

- `choiceCount`
  - type: `number`
  - required: `true`
  - description: Number of candidates to present for selection.
- `selectionPolicy`
  - type: `enum`
  - required: `false`
  - description: Selection strategy.
  - enumValues: `single`, `multi`
  - default: `single`
- `applyMode`
  - type: `enum`
  - required: `false`
  - description: Effect application mode.
  - enumValues: `immediate`, `deferred`
  - default: `immediate`
- `postSelectionPoolBehavior`
  - type: `enum`
  - required: `false`
  - description: Pool state commit behavior after player selection.
  - enumValues: `none`, `remove_selected_from_remaining`, `remove_selected_and_keep_unselected_eligible`
  - default: `none`
- `trackSelectedItems`
  - type: `boolean`
  - required: `false`
  - description: Whether selected ids are tracked in session owned list.
  - default: `false`
- `effectApplication`
  - type: `object`
  - required: `false`
  - description: Bounded effect mapping configuration.
  - fields:
    - `enabled`: boolean - Whether effect application is enabled
    - `rarityAttributeBonusMap`: object - Maps rarity to attribute bonus
      - Key: `"R" | "SR" | "SSR" | "UR"`
      - Value: `{ attribute: "strength" | "agility" | "intelligence" | "all"; value: number }`

## Inputs

- `candidates`
  - kind: `data`
  - type: `array`
  - description: Candidate items from data pool.
- `pool_state`
  - kind: `state`
  - type: `object`
  - description: Mutable pool state (remainingTalentIds, ownedTalentIds) from data.weighted_pool.
- `selection_event`
  - kind: `event`
  - type: `event`
  - description: Player selection event from UI.

## Outputs

- `selected`
  - kind: `data`
  - type: `any`
  - description: The selected item.
- `unselected`
  - kind: `data`
  - type: `array`
  - description: Unselected candidates (remain eligible).
- `updated_pool_state`
  - kind: `state`
  - type: `object`
  - description: Updated pool state after commit.

## Constraints

- `choiceCount` must be greater than 0.
- Candidates length must be >= choiceCount.
- If `postSelectionPoolBehavior !== "none"`, a compatible pool state source must exist.
- If `trackSelectedItems = true`, selected ids must be appended to session owned list.
- If `effectApplication.enabled = true`, the effect map must include all rarities present in candidates.
- **CRITICAL**: Unselected candidates MUST remain eligible in the Talent Draw MVP.
- Static talent definitions must NOT be deleted; only session state is mutated.

## Dependencies

- Requires:
  - `data.weighted_pool` (optional, for pool state source)
  - `ui.selection_modal` (optional, for UI presentation)
- May require host-side event system for client-server communication.

## Dota2 Host Binding

### Host target

- primary target: `dota2.server`
- optional companion target: `dota2.shared` for event types

### Likely implementation assets

- Server-side TypeScript module for selection flow orchestration
- Event listeners for UI selection events (CustomGameEventManager.RegisterListener)
- Effect application logic (modifier application based on rarity)
- Pool state mutation callbacks (CustomNetTables updates)

### Expected output forms

- TypeScript

### Notes

- **IMPORTANT**: "Permanent removal" means:
  - Remove selected talent id from current-session `remainingTalentIds`
  - Add selected talent id to current-session `ownedTalentIds`
  - Keep unselected candidates eligible for later draws
  - NEVER delete static talent definitions
- This is the correct lifecycle boundary for commit behavior, NOT `data.weighted_pool`.
- For Talent Draw MVP, use `postSelectionPoolBehavior = "remove_selected_and_keep_unselected_eligible"`.
- Effect mapping for MVP:
  - R -> strength +10
  - SR -> agility +10
  - SSR -> intelligence +10
  - UR -> all attributes +10

## Example

### Standard case (Talent Draw MVP)

Use `rule.selection_flow` to orchestrate a three-choice talent selection:

```
choiceCount: 3
selectionPolicy: single
applyMode: immediate
postSelectionPoolBehavior: remove_selected_and_keep_unselected_eligible
trackSelectedItems: true
effectApplication:
  enabled: true
  rarityAttributeBonusMap:
    R: { attribute: strength, value: 10 }
    SR: { attribute: agility, value: 10 }
    SSR: { attribute: intelligence, value: 10 }
    UR: { attribute: all, value: 10 }
```

Flow:
1. Receive 3 candidates from `data.weighted_pool`
2. Present via `ui.selection_modal`
3. Player selects 1 talent
4. Apply effect based on rarity
5. Remove selected from `remainingTalentIds`
6. Add selected to `ownedTalentIds`
7. Unselected 2 candidates remain in pool

### Another valid case

Use `rule.selection_flow` for a simple reward selection without pool state mutation:

```
choiceCount: 2
postSelectionPoolBehavior: none
```

### Not suitable for

Do not use this Pattern for:
- Complex multi-stage progression systems
- Cross-session persistence
- General talent-effect DSL (use bounded mapping for MVP)

## Validation

### Required checks

- Ensure `choiceCount` is present and > 0.
- If `postSelectionPoolBehavior !== "none"`, verify pool state source exists.
- If `trackSelectedItems = true`, verify owned list tracking is implemented.
- If `effectApplication.enabled = true`, verify all rarities have mappings.

### Host checks

- Verify event listeners are correctly registered.
- Verify pool state mutations use CustomNetTables correctly.
- Verify effect application uses correct modifier application API.
- Verify unselected candidates are NOT removed from remaining pool.

### Smoke hints

- A test should confirm selected item is removed from remaining pool.
- A test should confirm selected item is added to owned list.
- A test should confirm unselected items remain in remaining pool.
- A test should confirm correct effect is applied based on rarity.
- A test should confirm static talent definitions are NOT modified.

## Notes For Next Revision

- Consider adding more sophisticated effect mapping patterns.
- Consider adding pity/guarantee system integration.
- Consider adding rollback/undo support.
- Align this draft with the future structured `PatternMeta` upgrade in code.
