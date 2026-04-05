# Pattern Draft: input.key_binding

## Basic

- id: `input.key_binding`
- name: `Input Key Binding`
- category: `input_binding`
- host: `dota2`
- version: `0.1`
- backlog-fit: `strong`

## Summary

This Pattern provides a stable way to bind a player key input to a Rune Weaver event that can be consumed by Blueprint modules and later assembled into Dota2 host behavior.

## Responsibilities

- Capture a declared key binding from the Dota2 host side.
- Normalize the binding into a named event for the Rune Weaver pipeline.
- Expose a clear output contract for downstream modules such as `selection_flow`, `effect`, or `resource_system`.
- Keep key binding behavior reusable across micro-features, standalone systems, and cross-system compositions.

## Non-goals

- Do not implement the downstream game logic triggered by the key press.
- Do not own resource validation or resource consumption.
- Do not own UI hint rendering; that belongs to `ui.key_hint`.
- Do not define a full hotkey settings system.
- Do not handle advanced multi-key chord logic in the first MVP.

## Parameters

- `key`
  - type: `string`
  - required: `true`
  - description: Dota2 host key name to bind, such as `F4` or `D`.
- `triggerMode`
  - type: `enum`
  - required: `false`
  - description: Binding trigger mode.
  - enumValues: `keypress`, `keyrelease`, `hold`
  - default: `keypress`
- `eventName`
  - type: `string`
  - required: `true`
  - description: Emitted internal event name for downstream consumption.
- `targetingMode`
  - type: `enum`
  - required: `false`
  - description: Whether extra cursor or targeting context is attached.
  - enumValues: `none`, `cursor_position`, `cursor_target`
  - default: `none`
- `scope`
  - type: `enum`
  - required: `false`
  - description: Which player context the binding is intended for.
  - enumValues: `local_player`, `controlled_unit`
  - default: `local_player`

## Inputs

- `key`
  - kind: `config`
  - type: `string`
  - description: Host key to register.
- `eventName`
  - kind: `config`
  - type: `string`
  - description: Internal output event identifier.
- `targetingMode`
  - kind: `config`
  - type: `string`
  - description: Optional targeting payload mode.

## Outputs

- `binding_registered`
  - kind: `state`
  - type: `boolean`
  - description: Indicates registration succeeded.
- `input_event`
  - kind: `event`
  - type: `event`
  - description: Normalized event emitted when the binding fires.
- `input_payload`
  - kind: `data`
  - type: `object`
  - description: Optional payload including player context and targeting data.

## Constraints

- The declared key must be valid in the Dota2 host environment.
- The binding must not silently conflict with an already claimed critical binding.
- `eventName` must be explicit and stable enough for Blueprint connections.
- `hold` mode is not required for the first MVP implementation.
- Targeting payload collection should remain optional and bounded.

## Dependencies

- Requires a Dota2 host-side input registration mechanism.
- Often pairs with:
  - `ui.key_hint`
  - `effect.dash`
  - `rule.selection_flow`
  - `effect.resource_consume`
- May require downstream wiring into server-side logic depending on the feature.

## Dota2 Host Binding

### Host target

- primary target: `dota2.server`
- likely companion target: `dota2.panorama`

### Likely implementation assets

- Panorama-side keybinding registration or command hook
- Event bridge from local input to game logic
- Optional shared event typing or declaration update

### Expected output forms

- TypeScript
- Optional shared declaration update

### Notes

- For MVP, prefer a narrow implementation that emits a named event reliably.
- Keep host-specific key registration details out of the semantic Pattern summary.
- If cursor context is needed, treat that as parameterized payload shape, not as a separate Pattern yet.

## Example

### Standard case

Use `input.key_binding` to bind `F4` to `talent_draw.request_open`, which later feeds a `rule.selection_flow` and `ui.selection_modal`.

### Another valid case

Use `input.key_binding` to bind `D` to `psionic_dash.request_cast`, with `targetingMode=cursor_position`, then feed that into `effect.dash` and `effect.resource_consume`.

### Not suitable for

Do not use this Pattern as a replacement for a complete custom input framework with rebinding UI, profile persistence, and multi-device support.

## Validation

### Required checks

- Ensure `key` is present.
- Ensure `eventName` is present.
- Ensure `triggerMode` is within the allowed enum.
- Ensure Blueprint connections consuming this Pattern target an event-compatible input.

### Host checks

- Detect duplicate or conflicting key claims when possible.
- Verify the generated binding has a valid Dota2 host path.
- Verify targeting payload mode matches downstream usage expectations.

### Smoke hints

- A simple test should confirm pressing the configured key emits the configured event once.
- A second test should confirm the binding can feed a downstream module without manual patching.

## Notes For Next Revision

- Align this draft with a future structured `PatternMeta` shape in code.
- Decide whether cursor-position payload belongs here or in a sibling Pattern such as `input.key_binding_with_cursor`.
- Add a minimal example implementation once the Dota2 adapter assembly path is ready.
