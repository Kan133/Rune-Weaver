# War3 Handoff Probe

> Status: active-reference
> Audience: agents
> Doc family: contract
> Update cadence: temporary
> Last verified: 2026-04-14
> Read when: reviewing the War3 handoff probe artifact or checking the current War3 probe boundary
> Do not use for: formal generation authority, final War3 product workflow, or cross-host baseline truth

## Purpose

War3 Handoff Probe is a validation step for the War3 host track.

It is not the formal generation path.

It exists to answer a narrower question:

- is the current War3 intake artifact expressive enough for a model to produce a useful implementation-oriented response

The probe is used to harden:

- intent schema
- blueprint boundary
- gap-fill boundary
- host-specific handoff contract

## One-Sentence Definition

**War3 Handoff Probe is a schema-and-boundary probe, not a code generator.**

## What The Probe Is For

The probe should be used to learn:

1. which inputs the model still has to guess
2. which modules or runtime pieces appear repeatedly and should become skeleton
3. which details should remain in gap fill or host-specific implementation muscle
4. whether the current handoff bundle is good enough for planning only, or strong enough for implementation drafting

## What The Probe Is Not For

The probe must not be treated as:

1. the canonical War3 generation path
2. a replacement for `intent schema -> blueprint`
3. proof that free-form TSTL generation is now the mainline
4. authority for writing directly into formal host realization outputs

If a probe output is used, it should be used as evidence, not as direct truth.

## Current Placement

Recommended placement in the War3 flow:

`real map inputs -> parser outputs -> intake artifact -> handoff bundle -> probe -> boundary review`

The probe sits before any claim that the current War3 chain is ready for formal generation.

## Expected Inputs

A useful probe should consume:

1. a real or realistic War3 intake artifact
2. the derived handoff bundle
3. a narrow task request
4. explicit host constraints

Minimum host constraints should include:

- KK platform
- Warcraft III 1.29
- TypeScript to Lua only
- no Jass

## Expected Outputs

A useful probe output should be constrained to one of these shapes:

1. implementation plan
2. module plan
3. runtime sketch
4. typed pseudo-implementation

It should not jump directly to final code unless the point of the probe is specifically to test whether code drafting is possible.

## Review Questions

Each probe should answer these questions:

1. What did the model still have to guess?
2. Which guessed inputs should be elevated into intent schema?
3. Which recurring modules or seams should be elevated into blueprint?
4. Which details still belong to gap fill or host-specific muscle?
5. Is the current handoff good enough for:
   - planning only
   - pseudo-implementation
   - real implementation draft

## Classification Heuristic

Use this heuristic when reviewing probe outputs:

- repeated structural outputs -> blueprint candidate
- repeated required input questions -> intent schema candidate
- repeated runtime/API glue details -> gap fill candidate
- unstable, context-heavy implementation variation -> keep out of skeleton

## Recommended Record Format

Each probe record should contain:

1. objective
2. input bundle summary
3. prompt shape
4. model output summary
5. inferred schema gaps
6. inferred blueprint candidates
7. inferred gap-fill candidates
8. confidence and next move

## Current Mainline Rule

War3 mainline may use probes to validate the handoff contract.

War3 mainline should not use probe outputs as final implementation truth without an explicit follow-up step.

The current recommended use is:

- planning-quality probe first
- implementation-draft probe second
- formal generation path only after those probes stabilize

Current note for the bounded TSTL skeleton lane:

- the skeleton now exposes a local review artifact chain and a bounded handoff-prep surface
- the canonical probe path now runs through the existing review-package/export/validate family first
- the recommended probe input is the exported bounded review package for `setup-mid-zone-shop`, reflected into a planning-only probe input file
- the recommended narrow local consumer loop is: review package export -> review package validation -> probe input build -> probe runner -> bounded result summary
- these can inform future probe input shaping and bounded evidence ledgers
- they are not validator integration, not final handoff authority, and not proof of runtime readiness

## Quick Probe Runner

`scripts/war3-probe-runner.ts` is a file-driven, zero-dep utility that pipes a prompt file to the `kimi` CLI and records:

- stdout
- stderr
- final output text
- JSON summary with status classification

Example:

```bash
tsx scripts/war3-probe-runner.ts tmp/war3-typed-probe-input-20260413-ascii.txt --label typed-probe --max-steps-per-turn 3
```

Status classifications:

- `tool-execution-failure` — non-zero exit, spawn error, or patterns like "Max number of steps reached"
- `unusable-output` — blank or whitespace-only final output
- `model-output-success` — final output present and not obviously a tool failure

## Current Recommended Demo Flow

For the current bounded War3 lane, the first recommended demo flow is:

1. `tsx scripts/war3-export-skeleton-demo-package.ts`
2. `tsx scripts/war3-validate-review-package.ts <review-package-dir>`
3. `tsx scripts/war3-build-skeleton-probe-input.ts --package-dir <review-package-dir>`
4. `tsx scripts/war3-probe-runner.ts <probe-input-file>`
5. `tsx scripts/war3-summarize-probe-result.ts <probe-summary-json>`

Or use the bounded wrapper:

```bash
tsx scripts/war3-run-skeleton-demo-probe.ts
```

This flow is still:

- planning-only / typed-pseudo-implementation oriented
- read-only with respect to the War3 host workspace
- not a validator-integrated path
- not runtime proof
- not a write-ready or shipping-ready path
