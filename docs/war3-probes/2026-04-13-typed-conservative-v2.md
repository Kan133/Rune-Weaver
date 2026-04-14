# War3 typed probe: short conservative v2

- Date: 2026-04-13
- Input: `D:/Rune Weaver/tmp/war3-typed-probe-input-20260413-short-conservative-v2-case.txt`
- Final result: `D:/Rune Weaver/tmp/kimi-war3/typed-conservative-v2-2026-04-13T13-04-33-598Z.final.txt`
- Summary: `D:/Rune Weaver/tmp/kimi-war3/typed-conservative-v2-2026-04-13T13-04-33-598Z.summary.json`
- Summary status: `model-output-success`

## What changed versus prior `typed-short`

This run is materially more conservative than the prior short typed probe.

- helper API invention was reduced substantially
- frame/UI invention was removed
- ownership-mutation unlock assumption was removed
- output became more skeletal and more honest about missing pieces
- unresolved pieces are now marked `UNSPECIFIED IN PROMPT`

## Trust-boundary read

This is a better-shaped result because the model exposed more of the actual boundary instead of filling it in with confident structure.

The remaining runtime gaps now show up explicitly as missing host-provided bindings for:

- trigger creation / registration
- timer start
- ownership query
- hint display
- shop unlock

That is an improvement in honesty, but it is not a full removal of structural invention.

## Remaining caveat

The model still introduced placeholder helper functions such as:

- `isHumanPlayer`
- `getOwningPlayer`
- `showWelcomeHint`
- `unlockShopForPlayer`
- `createEnterRegionTrigger`
- `registerUnitEntersTrigger`
- `startTimer`

These are now clearly stubbed placeholders rather than hidden assumptions, which is better. But they still show that the prompt boundary may need one more tightening pass if the goal is to reduce even this level of invented structure.

## Practical read for mainline

Short constrained prompts now appear able to produce a more honest conservative shape:

- keep the flow skeletal
- mark missing runtime pieces explicitly
- avoid silently inventing UI/frame logic
- avoid assuming ownership-mutation unlock behavior

The immediate decision is whether to:

1. tighten the prompt one more time to suppress placeholder helper structure further, or
2. start mapping the current placeholders to real host bindings and use that mapping to drive the next prompt iteration

At this point, the prompt/result boundary is readable enough that either path is defensible. The main judgment call is whether we want one more trust-boundary cleanup pass before binding work starts.
