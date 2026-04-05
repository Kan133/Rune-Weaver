# Pattern Draft: data.weighted_pool

## Basic

- id: `data.weighted_pool`
- name: `Weighted Pool`
- category: `data_pool`
- host: `dota2`
- version: `0.1`
- backlog-fit: `strong`

## Summary

This Pattern provides a reusable weighted selection pool that can produce one or more candidates from a structured collection, optionally grouped by rarity or tier, for use in Rune Weaver data-driven gameplay flows.

## Responsibilities

- Hold a candidate collection that can be sampled by weight.
- Support weighted random selection for draw-like systems.
- Support tier-aware or rarity-aware organization when needed.
- Expose a stable output contract for downstream rule or selection modules.
- Serve as the data-side backbone for systems such as talent draws, card draws, loot selection, or reward pools.

## Non-goals

- Do not render UI for the selected candidates.
- Do not own the final player selection step; that belongs to a selection flow Pattern.
- Do not directly apply selected results to heroes, inventories, or progression systems.
- Do not implement a full economy or persistence layer.
- Do not attempt to model every possible advanced drop-table behavior in the first MVP.

## Parameters

- `entries`
  - type: `array`
  - required: `true`
  - description: Candidate item list or item descriptors available to the pool.
- `weights`
  - type: `object`
  - required: `false`
  - description: Explicit weight map for entries or tiers.
- `tiers`
  - type: `array`
  - required: `false`
  - description: Optional rarity or grouping labels such as `R`, `SR`, `SSR`, `UR`.
- `choiceCount`
  - type: `number`
  - required: `false`
  - description: Number of candidates to draw in one operation.
  - default: `1`
- `drawMode`
  - type: `enum`
  - required: `false`
  - description: Pool draw behavior.
  - enumValues: `single`, `multiple_without_replacement`, `multiple_with_replacement`
  - default: `single`
- `duplicatePolicy`
  - type: `enum`
  - required: `false`
  - description: How duplicate selections are handled in a multi-draw flow.
  - enumValues: `allow`, `avoid_when_possible`, `forbid`
  - default: `allow`

## Inputs

- `entries`
  - kind: `config`
  - type: `array`
  - description: Items or descriptors available to be drawn.
- `weights`
  - kind: `config`
  - type: `object`
  - description: Optional explicit weighting information.
- `draw_request`
  - kind: `event`
  - type: `event`
  - description: A request to perform a weighted draw.

## Outputs

- `selected_candidates`
  - kind: `data`
  - type: `array`
  - description: Draw result returned to downstream modules.
- `selection_metadata`
  - kind: `data`
  - type: `object`
  - description: Optional metadata such as tier, weight source, or draw mode.
- `pool_state`
  - kind: `state`
  - type: `object`
  - description: Optional current pool state if the implementation tracks mutation.

## Constraints

- The pool must contain at least one valid entry.
- `choiceCount` must be greater than zero.
- If `duplicatePolicy=forbid`, the available entry count must be compatible with the requested draw mode.
- If tiers are declared, every relevant entry should map cleanly to a tier.
- The first MVP should prefer deterministic data contracts over highly dynamic custom pool mutation behavior.

## Dependencies

- Often pairs with:
  - `rule.selection_flow`
  - `ui.selection_modal`
  - future reward or talent application Patterns
- May depend on a host-side random selection utility or standard weighted roll implementation.
- May feed into UI and rule flows, but should not embed them internally.

## Dota2 Host Binding

### Host target

- primary target: `dota2.server`
- optional companion target: `dota2.config`

### Likely implementation assets

- Server-side TypeScript module for pool state and weighted selection
- Optional config or generated data fragment for pool definitions
- Optional event bridge for triggering draw requests

### Expected output forms

- TypeScript
- Optional KV or JSON-style data definition, depending on later adapter choices

### Notes

- The current Dota2 MVP should keep the implementation server-oriented.
- Tier metadata should stay semantic and not hardcode UI rarity display logic.
- Advanced pity systems, rerolls, and progression-aware balancing should remain outside the first Pattern revision unless promoted into explicit parameters or sibling Patterns.

## Example

### Standard case

Use `data.weighted_pool` to store a talent pool with tiers `R`, `SR`, `SSR`, `UR`, draw three weighted candidates, and feed them into `rule.selection_flow`.

### Another valid case

Use `data.weighted_pool` as a loot candidate source where one or more rewards are drawn from a weighted list after a trigger event.

### Not suitable for

Do not use this Pattern as a replacement for a full progression economy system with pity counters, persistence, seasonal rules, and cross-session balancing.

## Validation

### Required checks

- Ensure `entries` is present and not empty.
- Ensure `choiceCount` is valid.
- Ensure the selected draw mode is compatible with duplicate policy and entry count.
- Ensure weight definitions, if present, are structurally valid.

### Host checks

- Verify the generated Dota2 server target is present.
- Verify the pool can be consumed by downstream rule modules without manual reshaping.
- Verify tier metadata is available where later systems expect it.

### Smoke hints

- A simple test should confirm a single draw returns a valid candidate.
- A multi-draw test should confirm `choiceCount=3` can produce three candidates under the selected duplicate policy.
- A tier-aware test should confirm metadata survives the draw result.

## Notes For Next Revision

- Decide whether pity or guarantee behavior belongs here or in a sibling rule Pattern.
- Decide whether pool mutation should stay internal or be modeled as a separate stateful Pattern.
- Align this draft with the future structured `PatternMeta` upgrade in code.
