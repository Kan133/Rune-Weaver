# Objective

Run one narrower War3 probe that goes beyond the earlier planning-only probe and asks for typed pseudo-implementation or a narrow implementation draft.

This probe is still not the formal generation path. It is evidence work for the War3 handoff boundary only.

# Probe Input Shape

- Real sample map path: `tmp/war3-samples/PyWC3/maps/test.w3x`
- Host constraints:
  - classic Warcraft III
  - KK platform
  - version `1.29`
  - TypeScript to Lua only
  - no Jass
- Known parsed map facts included in the prompt:
  - map name `TRIGSTR_001`
  - tileset `L`
  - script type `Lua`
  - players `2`
  - terrain size `65 x 65`
  - terrain offset `(-4096, -4096)`
- Probe scenario anchors:
  1. `spawn_start` `[spawn]`, source=`unit`, region=`northwest`, pos=`(128, 128, 0)`, owner=`P0`
  2. `central_shop_proxy` `[shop]`, source=`manual`, region=`center`, pos=`(256, 256, 0)`
  3. `mid_trigger_zone` `[trigger]`, source=`doodad`, region=`center`, pos=`(384, 384, 0)`
- Feature sketch:
  - when player-controlled units first enter the center trigger zone, show a short welcome hint
  - enable interaction with the nearby central shop proxy
  - unlock once per player
- Extra structured inputs added on top of the planning probe:
  - `shopInteractionMode=approach-to-open`
  - `targetPlayers=human players only`
  - `hintDurationSeconds=4`
  - `shopObjectId=nmrk`

# Prompt Constraint

The prompt was intentionally narrower than the earlier planning probe.

The model was asked to output exactly:

1. module-level file plan
2. typed pseudo-implementation sketch
3. runtime guards
4. still-missing inputs

The prompt also explicitly forbade:

- full runnable code
- complete files
- Jass output

This means the probe design itself moved closer to a formal path than the planning probe, but only at the level of structure and runtime shape, not code generation.

# Output Quality Summary

## Execution attempt

- Tool path used: `kimi --no-thinking`
- Prompt encoding rule used: pure ASCII prompt only
- Prompt source: `tmp/war3-typed-probe-input-20260413-ascii.txt`

## Result

This attempt did **not** produce a usable model answer.

The CLI returned:

- `Max number of steps reached: 1`

That means this probe was blocked at the tool-execution layer before any typed pseudo-implementation response could be reviewed.

So, for this specific typed pseudo-implementation probe, there is **no valid model output evidence** yet.

# Stable Structural Signals

Even though the run did not yield model output, the probe design itself now carries stronger structural constraint than the planning probe.

The meaningful additions are:

- the target output shape was narrowed from planning-only to pseudo-implementation-level structure
- the expected answer format was fixed into four sections
- the feature input was more hardened through explicit structured fields
- runtime-level distinctions were forced into view:
  - module plan
  - state and trigger shape
  - runtime guards
  - remaining unknowns

These are stable probe-design signals, but not yet stable model-behavior signals.

# Remaining Schema Gaps

Because no usable model output was produced in this run, this probe cannot add new schema gaps beyond what the earlier planning probe already surfaced.

The still-relevant known gaps remain:

- whether `shopObjectId=nmrk` is definitely the correct interaction object or only a placeholder
- whether the shop should be a direct interaction target or a proxy/unit-backed interaction point on KK 1.29
- whether the welcome hint is per entering unit, per player, or globally per player slot
- whether there are additional player-filter rules beyond `human players only`

# Blueprint-Relevant Signals

This run does not add fresh blueprint evidence from model output.

What it does add is a stronger test shape for future blueprint evaluation:

- if later runs keep returning the same module plan under this tighter prompt, that would be stronger blueprint evidence than the earlier planning probe
- if later runs diverge heavily even under this tighter prompt, that would argue that the area is still runtime muscle rather than skeleton

So the blueprint value added here is procedural, not evidentiary.

# Gap-Fill-Relevant Signals

This run likewise does not add fresh gap-fill evidence from model output.

What it does add is a better separation boundary for future review:

- anything the model would still need to improvise under this tighter structured prompt is a stronger candidate for gap-fill or runtime muscle
- anything that becomes stable under this tighter structured prompt is a stronger candidate for skeleton or blueprint

Again, this is a better probe frame, not yet a stronger generation conclusion.

# Decision

Current judgment:

- this probe is **closer in design** to a formal path than the earlier planning probe
- this probe is **not yet evidence** that the War3 path can move toward formal generation
- this run was blocked by the tool layer before a typed pseudo-implementation answer was obtained

So the result is:

- **new probe-design evidence: yes**
- **new model-output evidence: no**

This is still useful, but it is not enough to conclude that the War3 handoff contract is already strong enough for implementation-draft generation.

# Recommended Next Move

1. Keep this probe design as the current narrow typed pseudo-implementation template.
2. Treat the result of this run as execution-blocked rather than model-negative.
3. When the tool path is stable again, rerun the same prompt shape instead of redesigning the probe again.
4. Do not promote War3 toward a formal generation path based on this run alone.
