# Rune Weaver Session Sync Protocol

> Status: active-reference
> Audience: agents
> Doc family: control
> Update cadence: low-frequency
> Last verified: 2026-04-14
> Read when: writing session-sync notes or refreshing the shared cross-track plan
> Do not use for: replacing code truth or stable subsystem contracts by itself

This protocol exists so parallel sessions can coordinate through files instead of relying on hidden session memory.

## Purpose

- let Dota2 mainline report current state clearly
- let War3 mainline report current state clearly
- let an orchestrator build a shared plan from real progress
- reduce duplicated work and accidental cross-track collisions

## Directory

Write session-sync notes into:

`docs/session-sync/`

## File Naming

Use this pattern:

- `dota2-mainline-YYYYMMDD-HHMM.md`
- `war3-mainline-YYYYMMDD-HHMM.md`
- `orchestrator-YYYYMMDD-HHMM.md`

Example:

- `dota2-mainline-20260413-2130.md`
- `war3-mainline-20260413-2145.md`
- `orchestrator-20260413-2200.md`

## Required Sections

Every Dota2 and War3 mainline session-sync note must contain these headings in this order:

# Current focus

State the current step and the exact slice being worked on.

# Done since last update

List the concrete things finished since the previous note.

# Next intended moves

List the next 1-3 moves that would keep honest progress going.

# Current blockers / risks

State the primary blocker first. Mention duplicated-work or collision risk if relevant.

# Notes for other sessions

State what another session or the orchestrator should know.

## Mainline Expectations

### Dota2 mainline notes should say

- which mainline step is active
- which real case, flow, or write path is being advanced
- whether the current confidence comes from real artifacts or only mocks

### War3 mainline notes should say

- which mainline step is active
- which inputs, parser outputs, or models were validated
- which assumptions are still unverified

## Orchestrator Workflow

The orchestrator should not produce a shared plan until it has:

1. one recent Dota2 mainline session-sync note
2. one recent War3 mainline session-sync note
3. the relevant project goals or roadmap docs

Then the orchestrator may write its own note using:

- current state of each mainline
- primary blocker of each mainline
- recommended near-term moves
- collision risks
- division of attention

## Shared Plan Maintenance

If a shared plan exists, the orchestrator should update it after reviewing fresh session-sync notes.

The preferred status markers are:

- `[todo]`
- `[doing]`
- `[blocked]`
- `[done]`

Rules:

- mark completed planned work as `[done]`
- do not silently delete completed items unless the user wants cleanup
- keep blocked items visible with the blocker reason
- only add new items when they are needed to reflect newly-discovered work
- avoid rewriting the whole plan when a small status update is enough

## Recommended Shared Plan File

Recommended path:

`docs/session-sync/RW-SHARED-PLAN.md`

Recommended shape:

- Dota2 mainline section
- War3 mainline section
- Cross-track risks / dependencies section
- Near-term attention split section

## Guardrails

- Do not use session-sync notes as a substitute for reading code when code truth matters.
- Do not write vague motivational summaries.
- Do not inflate progress.
- Do not merge Dota2 and War3 planning unless there is a real dependency.
- Prefer one fresh note per meaningful transition over constant noisy updates.
- If a fresh same-day session-sync note changes the current step or blocker materially, update [RW-SHARED-PLAN.md](/D:/Rune%20Weaver/docs/session-sync/RW-SHARED-PLAN.md) and any stale low-frequency control docs before sending more worker tasks.
