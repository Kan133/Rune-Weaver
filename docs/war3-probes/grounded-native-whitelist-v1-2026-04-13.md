# Grounded native-whitelist probe v1 (2026-04-13)

## Inputs and result artifacts

- Input prompt: `D:/Rune Weaver/tmp/war3-grounded-probe-native-whitelist-v1.md`
- Final output: `D:/Rune Weaver/tmp/kimi-war3/grounded-native-v1-2026-04-13T13-08-42-997Z.final.txt`
- Summary JSON: `D:/Rune Weaver/tmp/kimi-war3/grounded-native-v1-2026-04-13T13-08-42-997Z.summary.json`
- Summary status: `model-output-success`

## Observed behavior

This run is the cleanest probe yet for native-grounded structure.

The returned snippet stays on direct native vocabulary:

- `CreateTrigger`
- `TriggerRegisterEnterRegion`
- `TriggerAddAction`
- `GetEnteringUnit`
- `GetOwningPlayer`
- `GetPlayerController`
- `GetPlayerSlotState`
- `DisplayTimedTextToPlayer`

It does not invent helper wrapper functions. That is a meaningful improvement over prior probes and suggests the whitelist-grounded prompt shape suppresses helper invention much better than earlier variants.

The model still introduces `mid_trigger_zone` as a referenced symbol/handle name from the prompt, but it leaves the actual source unresolved as:

- `UNSPECIFIED IN PROMPT: region handle source for mid_trigger_zone`

It also leaves the shop-unlock portion unresolved as:

- `UNSPECIFIED IN PROMPT: shop unlock native/mechanism`

## Judgment

This probe should be treated as the current best-quality signal for grounded native generation, not as final generation.

The remaining ambiguity is now concentrated in two places:

1. Trigger-zone handle source / area realization policy
2. Shop unlock native/mechanism

There is still a small uncontrolled fill tendency on literals. In particular, the model chooses a concrete message string and `5.0` duration even though the earlier scenario used 4 seconds, so the run is not fully boundary-clean yet.

## Takeaway for next probes

The prompt strategy is now good enough to isolate the real decision surface. The next step should focus on locking down:

1. how region/rect handles are supplied or named in grounded prompts
2. which exact native or mechanism is allowed for shop unlock behavior

Once those are explicit, reruns can test whether literal fill remains the only uncontrolled behavior.
