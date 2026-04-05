# Pattern Draft: ui.selection_modal

## Basic

- id: `ui.selection_modal`
- name: `Selection Modal`
- category: `ui_surface`
- host: `dota2`
- version: `0.1`
- backlog-fit: `strong`

## Summary

This Pattern provides a reusable UI surface for presenting one or more selectable candidates to the player and returning the player's choice back into a Rune Weaver flow.

## Responsibilities

- Render a bounded set of selectable candidates in a modal-style UI surface.
- Provide a clear interaction path for the player to choose one option.
- Return the selected result in a normalized way for downstream logic.
- Support being driven by a separate `UIDesignSpec` rather than hardcoded layout decisions in the Pattern itself.
- Serve as the UI counterpart for selection-oriented systems such as talent draws, card draws, reward picks, or choice prompts.

## Non-goals

- Do not decide what candidates should be shown; that belongs to a data or rule Pattern.
- Do not own weighted draw logic; that belongs to `data.weighted_pool`.
- Do not directly apply the selected gameplay effect.
- Do not hardcode final visual layout, spacing, anchor, or theme decisions into the semantic Pattern.
- Do not implement a full reusable window manager for all UI in the first MVP.

## Parameters

- `choiceCount`
  - type: `number`
  - required: `true`
  - description: Number of options expected to be displayed.
- `layoutPreset`
  - type: `enum`
  - required: `false`
  - description: Semantic layout preset for the modal content.
  - enumValues: `card_tray`, `list`, `grid`
  - default: `card_tray`
- `selectionMode`
  - type: `enum`
  - required: `false`
  - description: How many items the player can choose.
  - enumValues: `single`, `multi`
  - default: `single`
- `dismissBehavior`
  - type: `enum`
  - required: `false`
  - description: How the modal can be dismissed.
  - enumValues: `selection_only`, `manual`, `auto`
  - default: `selection_only`
- `payloadShape`
  - type: `enum`
  - required: `false`
  - description: Expected item presentation shape.
  - enumValues: `simple_text`, `card`, `card_with_rarity`, `custom`
  - default: `card`

## Inputs

- `candidates`
  - kind: `data`
  - type: `array`
  - description: Candidate items to display.
- `open_event`
  - kind: `event`
  - type: `event`
  - description: Event used to open or populate the modal.
- `ui_design_spec`
  - kind: `config`
  - type: `object`
  - description: Optional `UIDesignSpec` fragment that controls layout and style decisions.

## Outputs

- `selection_result`
  - kind: `event`
  - type: `event`
  - description: Normalized output emitted when the player makes a choice.
- `selected_payload`
  - kind: `data`
  - type: `object`
  - description: Selected item payload for downstream systems.
- `modal_state`
  - kind: `state`
  - type: `object`
  - description: Optional UI state such as open, closed, or awaiting selection.

## Constraints

- The modal must not assume candidate generation responsibility.
- `choiceCount` must be compatible with the incoming candidate list.
- The Pattern should remain semantically reusable even if the visual style changes by host spec.
- The first MVP should assume bounded candidate counts and avoid complex virtualized list behavior.
- Selection return flow must be explicit and machine-readable for downstream Blueprint wiring.

## Dependencies

- Commonly pairs with:
  - `data.weighted_pool`
  - `rule.selection_flow`
  - `ui.key_hint`
- Requires a Dota2 Panorama UI surface or equivalent host-side UI implementation.
- Strongly benefits from a separate `UIDesignSpec` generation step when non-default layout or styling is needed.

## Dota2 Host Binding

### Host target

- primary target: `dota2.panorama`
- optional companion target: `dota2.shared` or `dota2.server` for event typing and result routing

### Likely implementation assets

- Panorama TSX component for modal rendering
- LESS or equivalent style asset
- Host event bridge for opening the modal and sending results back
- Optional shared payload typings

### Expected output forms

- TSX
- LESS
- Optional TypeScript event declarations

### Notes

- This Pattern should consume `UIDesignSpec`, not replace it.
- Keep semantic modal behavior stable, while allowing Dota2-specific implementation details to vary.
- If later multiple modal families appear, prefer `layoutPreset` or sibling UI Patterns instead of bloating this one.

## Example

### Standard case

Use `ui.selection_modal` to display three candidate talents returned by `data.weighted_pool`, allow one selection, and emit the result back to `rule.selection_flow`.

### Another valid case

Use `ui.selection_modal` to present a small reward selection after a trigger event, with a `list` layout preset and single-choice interaction.

### Not suitable for

Do not use this Pattern as a general replacement for all HUD panels, inventory pages, or freeform draggable window systems.

## Validation

### Required checks

- Ensure `choiceCount` is present.
- Ensure incoming candidates can be represented by the declared `payloadShape`.
- Ensure the output result event is explicitly named or routable.
- Ensure the modal has a valid open and selection path.

### Host checks

- Verify the Panorama target artifacts are generated.
- Verify the result event can be consumed by downstream host logic.
- Verify `UIDesignSpec` integration does not require hardcoded layout fallback beyond acceptable defaults.

### Smoke hints

- A simple test should confirm a three-option modal can open and return one selected payload.
- A second test should confirm the same Pattern can render under a different `layoutPreset` without semantic changes.
- A UI-focused test should confirm host-side close behavior follows `dismissBehavior`.

## Notes For Next Revision

- Decide whether rarity visuals belong as a parameter here or should remain a `UIDesignSpec` concern.
- Decide whether a separate `ui.selection_overlay` or `ui.choice_panel` sibling Pattern is needed later.
- Align this draft with the future structured `PatternMeta` upgrade in code.
