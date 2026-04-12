# Next-Stage Productization Plan

> Status
> This document defines the next-stage execution order after the A/B/C/D lifecycle spine, governance evidence closure, onboarding alignment, local API bridge, and document governance sweep.
> Use this file to sequence the final steps from "credible product prototype" to "coherent product entry and demo-ready product surface".

## Purpose

This plan exists to answer one practical question:

- what should agents do next, in what order, to turn the current CLI-backed prototype into a more complete product entry experience?

This is not a roadmap rewrite.
This is not a replacement for the active baseline.
This is a narrow productization sequence for the current stage.

Read together with:

1. [CURRENT-EXECUTION-PLAN.md](/D:/Rune%20Weaver/docs/CURRENT-EXECUTION-PLAN.md)
2. [AGENT-EXECUTION-BASELINE.md](/D:/Rune%20Weaver/docs/AGENT-EXECUTION-BASELINE.md)
3. [HANDOFF.md](/D:/Rune%20Weaver/docs/HANDOFF.md)

## Current Starting Point

Standing reality:

- CLI is the authoritative lifecycle path
- `create`, `update`, `delete`, and minimum governance exist on the CLI spine
- x-template onboarding contract is aligned
- document governance has largely been cleaned up
- local API bridge exists for `workbench-ui`

Still not fully closed:

- Product Entry Integration still needs one fully trustworthy UI-triggered success evidence
- launch is not yet productized through the product surface
- entry-shell UX is still more "working integration" than "smooth product"
- demo/walkthrough assets are serviceable but not yet fully frozen

## Execution Order

### Phase 1. Product Entry Evidence Closure

Goal:

- finish Product Entry Integration with one fully trustworthy UI-triggered success case

Required output:

- one real UI-triggered success case
- matching button state before/after
- real execution output visible in the entry shell
- status refresh that can be independently verified

Done when:

- Product Entry Integration can be accepted without caveats

Do not expand into:

- launch productization
- update/delete UI productization
- broader UI redesign

### Phase 2. Launch Path Closure

Goal:

- turn launch from a documented contract into a real, repeatable product path

Minimum scope:

- make launch parameters explicit and truthful
- define the product-surface launch trigger
- connect addonName/mapName sourcing cleanly
- show clear success/failure feedback

Done when:

- onboarding -> init -> launch is a repeatable path, not just a documented intention

Do not expand into:

- full Electron packaging
- second host support
- broader runtime management

### Phase 3. Entry UX Stabilization

Goal:

- make the product entry flow feel coherent and low-friction

Minimum scope:

- tighten error states
- improve success/failure feedback
- remove remaining misleading preview states from the entry shell
- ensure state refresh is obvious and trustworthy

Done when:

- a teammate can use the entry shell without hidden operator knowledge

Do not expand into:

- full redesign
- visual experimentation disconnected from the entry flow

### Phase 4. Demo / Walkthrough Freeze

Goal:

- freeze one repeatable, trustworthy product walkthrough

Minimum scope:

- one onboarding path
- one create case
- one update case
- one delete case
- one governance case
- one launch step if Phase 2 is complete

Done when:

- the team can run one canonical product walkthrough without improvising around missing or unclear steps

Do not expand into:

- broad marketing rewrite
- speculative future-product storytelling

## Agent Rules

Lead agents should:

- execute phases in order
- not start a later phase as if an earlier blocking phase were already accepted
- allow parallel research, but require lead synthesis before coding
- require validator evidence before claiming completion

Worker agents should:

- prefer narrow, evidence-backed slices
- avoid reviving old packet-era assumptions
- avoid treating workbench/UI as an independent lifecycle executor

## Current Recommended Priority

The immediate order is:

1. close Product Entry Integration with one trustworthy UI-triggered success evidence
2. productize launch
3. stabilize entry UX
4. freeze the canonical demo path

## Non-Goals For This Plan

Do not reopen these unless explicitly requested:

- productizing rollback
- productizing regenerate
- structure-level update expansion
- second host support
- full workbench backend platformization
- broad governance platform design
