# Objective

Record the follow-up War3 probe reruns that used shorter ASCII prompt files and confirm whether the earlier typed probe failure was a runner issue, a model issue, or a prompt-shape issue.

This is still evidence work for the War3 handoff boundary only. It is not the formal generation path.

# Probe Inputs

Two shorter ASCII prompt files were used:

- `tmp/war3-planning-control-probe-20260413-ascii.txt`
- `tmp/war3-typed-probe-input-20260413-short-ascii.txt`

Both runs used the same constrained runner setting:

- `npx.cmd tsx scripts/war3-probe-runner.ts tmp/war3-planning-control-probe-20260413-ascii.txt --label planning-control --max-steps-per-turn 3`
- `npx.cmd tsx scripts/war3-probe-runner.ts tmp/war3-typed-probe-input-20260413-short-ascii.txt --label typed-short --max-steps-per-turn 3`

Recorded outputs:

- `tmp/kimi-war3/planning-control-2026-04-13T12-55-03-931Z.final.txt`
- `tmp/kimi-war3/planning-control-2026-04-13T12-55-03-931Z.summary.json`
- `tmp/kimi-war3/typed-short-2026-04-13T12-55-03-932Z.final.txt`
- `tmp/kimi-war3/typed-short-2026-04-13T12-55-03-932Z.summary.json`

# Execution Result

Both runs returned:

- `status: model-output-success`
- `exitCode: 0`

This matters because the earlier typed probe failure had returned a tool-layer step-limit stop rather than a usable model answer.

So the earlier failure should now be interpreted as execution-bounded evidence, not as proof that the model could not answer the typed probe shape.

# Output Quality Summary

## Planning control probe

The planning control output stayed at planning level and remained appropriately cautious.

Observed characteristics:

- returned an implementation plan
- suggested a plausible TS-to-Lua file split
- surfaced runtime cautions relevant to KK / Warcraft III `1.29`
- asked for missing implementation-shaping inputs instead of filling them in silently

Stable missing inputs still surfaced:

- player index / target player specificity
- exact welcome hint text and duration
- exact one-time interaction semantics
- whether the trigger is placed or created in script
- project TS-to-Lua framework alignment

## Typed-short probe

The typed-short output moved past planning into module-level pseudo-implementation structure.

Observed characteristics:

- returned a single-module file plan centered on a `shopWelcome` system module
- included typed pseudo-implementation with state shape, trigger registration, and flow
- included useful runtime guards around:
  - human-player filtering
  - one-time unlock state
  - timer cleanup
  - proxy existence checks

But it still improvised project-specific runtime details that are not yet trustworthy enough to treat as generation truth:

- lookup helpers like `GetRegionByName` / `GetUnitByTag`
- frame-based hint UI rather than a more conservative text-tag or timed-text path
- `SetUnitOwner` as a possible unlock mechanism

# Stable Signals

The strongest signal from these reruns is not "the model is ready for generation."

The strongest signal is:

- the probe runner is validated on short prompts
- the current blocker is not runner plumbing
- short constrained prompts can produce both planning evidence and pseudo-implementation evidence
- the remaining problem is prompt boundary and runtime-assumption control, not basic execution

This is useful progress because it narrows the failure mode.

# Remaining Trust Boundary

The stable missing inputs now look less like runner issues and more like boundary-control issues around host-specific runtime details.

Still-missing or still-untrusted areas include:

- whether project lookup helpers already exist, and under what names
- how human-player filtering is expressed in this codebase
- the exact approach-to-open shop unlock mechanism
- whether the welcome hint is per-player or shared
- whether unlock should integrate with a shop orchestrator rather than mutate ownership directly

# Decision

Current judgment:

- the runner path is now validated for short prompts
- the earlier typed probe failure should not be read as a model-quality failure
- short constrained prompts are good enough to gather planning and pseudo-implementation evidence
- this does **not** justify promoting War3 to formal generation yet

So the correct interpretation is:

- **runner-plumbing blocker: no**
- **prompt-boundary and runtime-assumption blocker: yes**
- **formal generation promotion: not yet**

# Recommended Next Move

1. Keep using short constrained probe shapes for the next War3 evidence pass.
2. Tighten prompt boundaries around allowed runtime assumptions and preferred conservative implementation paths.
3. Treat inferred helpers, UI choices, and unlock mechanics as untrusted until grounded in project/runtime evidence.
4. Do not promote this path to formal generation based on these reruns alone.
