# Current Execution Plan

> Status
> This is the only active execution queue after the post-ABCD reset.
> It supersedes the historical packet queue and completion tracker archived under
> [archive/docs/2026-04-post-abcd-plan-reset/README.md](/D:/Rune%20Weaver/archive/docs/2026-04-post-abcd-plan-reset/README.md).

## Purpose

This document defines the current execution order for active work.

Use this file when:

- deciding the next implementation slice
- scoping worker-agent tasks
- checking whether a proposed task is on the critical path

This plan is intentionally narrower than the roadmap. It assumes the standing CLI lifecycle spine exists and focuses on turning that spine into a repeatable, demonstrable product path.

## Current Baseline

Standing baseline:

- authoritative CLI `create`
- authoritative CLI `update`
- authoritative CLI `delete`
- minimum workspace-backed governance
- workspace / bridge / host lifecycle tracking

Still true:

- UI remains a preview/onboarding shell, not the authoritative execution surface
- `rollback` remains deferred
- `regenerate` remains deferred
- structure-level update remains deferred
- x-template onboarding is only partially wired through the product entry flow

## Active Priorities

### 1. Evidence Closure

Goal:

- keep lifecycle claims backed by repeatable, reviewable evidence

Current focus:

- maintain real acceptance evidence for `create`, `update`, `delete`, and governance
- close any reopened proof gaps with concrete case execution, not summaries
- keep `delete` separate from `rollback`
- keep governance proof based on real conflict cases

Done when:

- canonical evidence for the standing lifecycle spine is easy to rerun and review

### 2. Product Entry Integration

Goal:

- connect the current UI/onboarding shell to the authoritative CLI paths

Current focus:

- host selection
- x-template detection
- project naming / addon naming
- map input / launch configuration shell
- status surfaces that reflect real CLI-backed state
- UI orchestration that calls CLI rather than inventing a second execution system

Done when:

- users can reach the standing lifecycle spine through one coherent product entry path

### 3. X-Template Onboarding Completion

Goal:

- finish the host setup path required before lifecycle actions

Current focus:

- hostRoot confirmation
- project naming flow
- mapName capture / persistence
- init state visibility
- launch parameter contract

Done when:

- project naming, map handling, init, and launch preparation are part of one repeatable onboarding flow

### 4. Canonical Walkthrough / Demo Gate

Goal:

- establish one repeatable end-to-end walkthrough that represents the product honestly

Current focus:

- one host onboarding flow
- one create case
- one update case
- one delete case
- one governance conflict case
- a demo path that clearly distinguishes standing product behavior from deferred behavior

Done when:

- the team can run one controlled walkthrough without relying on hidden tribal knowledge

## Non-Goals For The Current Plan

Do not treat these as current-plan work unless the user explicitly reopens them:

- productizing `rollback`
- productizing `regenerate`
- structure-level update that adds or removes pattern families
- second-host support
- turning workbench into the authoritative lifecycle executor
- broad UI redesign unrelated to product entry or lifecycle orchestration

## Working Rule

When choosing between tasks, prefer work that strengthens:

1. evidence quality for standing lifecycle claims
2. product entry integration into authoritative CLI paths
3. x-template onboarding completion
4. one repeatable walkthrough

If a task improves none of the above, it is probably not on the current critical path.

## Agent Rule

Lead agents should:

- treat this file as the active execution queue
- archive superseded plans instead of keeping parallel truths
- keep worker tasks narrow and evidence-driven
- avoid reviving the old A/B/C/D queue as if it were still the live plan

## Related Docs

Read alongside:

1. [README.md](/D:/Rune%20Weaver/README.md)
2. [AGENT-EXECUTION-BASELINE.md](/D:/Rune%20Weaver/docs/AGENT-EXECUTION-BASELINE.md)
3. [AGENT-TASK-CONTRACT.md](/D:/Rune%20Weaver/docs/AGENT-TASK-CONTRACT.md)
4. [AUTONOMOUS-DEVELOPMENT-POLICY.md](/D:/Rune%20Weaver/docs/AUTONOMOUS-DEVELOPMENT-POLICY.md)
5. [HANDOFF.md](/D:/Rune%20Weaver/docs/HANDOFF.md)

Reference only:

- [PRODUCT.md](/D:/Rune%20Weaver/docs/PRODUCT.md)
- [ROADMAP.md](/D:/Rune%20Weaver/docs/ROADMAP.md)
- [DEMO-PATHS.md](/D:/Rune%20Weaver/docs/DEMO-PATHS.md)
- [CURRENT-STATE-VS-TARGET.md](/D:/Rune%20Weaver/docs/CURRENT-STATE-VS-TARGET.md)
