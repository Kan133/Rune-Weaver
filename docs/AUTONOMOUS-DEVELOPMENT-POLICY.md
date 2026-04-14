# Autonomous Development Policy

> Status: authoritative
> Audience: agents
> Doc family: baseline
> Update cadence: on-phase-change
> Last verified: 2026-04-14
> Read when: deciding what agents may assume or execute without asking the user
> Do not use for: changing lifecycle scope truth or task priority by itself

## Purpose

This document defines how agents should work autonomously during the current post-ABCD execution phase.

Its goal is to minimize unnecessary user clarification while keeping product boundaries, host safety, and acceptance criteria intact.

Read this after:

1. [AGENT-EXECUTION-BASELINE.md](/D:/Rune%20Weaver/docs/AGENT-EXECUTION-BASELINE.md)
2. [AGENT-TASK-CONTRACT.md](/D:/Rune%20Weaver/docs/AGENT-TASK-CONTRACT.md)
3. [HANDOFF.md](/D:/Rune%20Weaver/docs/HANDOFF.md)
4. [CURRENT-EXECUTION-PLAN.md](/D:/Rune%20Weaver/docs/CURRENT-EXECUTION-PLAN.md)

## Default Working Rule

Agents should assume the user wants end-to-end progress unless the user explicitly pauses, redirects, or asks for discussion only.

Default behavior:

- inspect current code and docs
- make reasonable scope-safe assumptions
- implement the next critical-path improvement
- verify what can be verified
- report remaining gaps clearly

Agents should not stop just to ask for confirmation when the decision is already bounded by the current execution contract.

## What Agents May Assume Without Asking

For the current phase, agents may assume all of the following:

### 1. Product Scope

The active goal is:

- release-grade evidence for the standing CLI lifecycle spine
- product entry integration into the authoritative CLI path
- x-template onboarding completion
- one repeatable walkthrough for create/update/delete/governance

Agents must not ask whether they should reopen `regenerate`, `rollback`, second-host support, structure-level update, or broad workbench productization unless the user explicitly reopens those scopes.

### 2. Source Of Truth

Agents may assume:

- workspace state is the canonical truth
- fixture data is weaker than real workspace state
- mock workbench outputs are weaker than real persisted feature state
- CLI lifecycle paths are stronger than preview UI surfaces

### 3. Host Safety

Agents may assume:

- they must stay inside Rune Weaver-owned directories
- they may use only approved bridge points
- they must avoid arbitrary host-file edits

### 4. Execution Order

Agents may assume the default priority order is:

1. evidence closure for standing lifecycle claims
2. product entry integration into the authoritative CLI path
3. x-template onboarding completion
4. canonical walkthrough / demo gate

## What Agents Must Decide Themselves

Agents are expected to decide, without asking the user:

- the smallest critical-path implementation slice
- whether a doc is authoritative, reference, planning, or archive
- which technical-reference docs are needed for a task
- whether a proposal is out of current scope
- whether current code and current docs disagree
- whether a task should be split into smaller worker packets

## What Agents Must Verify Before Claiming Progress

Agents must verify, from code or artifacts, before claiming a capability is standing:

- workspace state is actually persisted
- selected patterns/files/bindings are truthful
- update keeps the same `featureId`
- delete truly unloads owned artifacts and bridge exposure
- governance checks are workspace-backed rather than fixture-backed
- UI integration claims are backed by real CLI wiring, not preview-only state

Agents must not convert design intent into delivered status without code or verification evidence.

## When Agents Should Pause And Ask

Agents should ask the user only when one of these is true:

1. a change would expand host ownership boundary
2. a task requires destructive action outside normal development cleanup
3. a task would pick between multiple materially different product directions
4. a missing external dependency blocks progress and no reasonable local fallback exists
5. current user edits conflict directly with the required task outcome

If none of the above is true, agents should continue.

## How Agents Should Handle Missing Details

When a detail is missing, agents should prefer this order:

1. infer from code
2. infer from authoritative docs
3. infer from the current execution plan
4. use the most conservative assumption that preserves host safety and current scope

Agents should document the assumption after acting, not stop before acting, unless the assumption would create hidden product risk.

## Worker Delegation Rule

Lead agents should delegate only bounded tasks with:

- one clear mission
- explicit write scope
- explicit acceptance
- explicit non-goals

Workers should not be asked to:

- redefine milestone scope
- pick the product roadmap
- widen host ownership
- improvise acceptance criteria

## Review Rule

A change is acceptable only if it improves at least one of these:

1. repeatable lifecycle evidence
2. truthful workspace persistence
3. product entry integration
4. x-template onboarding completion
5. canonical walkthrough quality

If a change improves none of these, it is probably not on the current critical path.

## Output Rule

When agents finish a task, they should always report:

1. what changed
2. what was verified
3. what remains incomplete
4. what assumptions were made

## Reading Rule

When autonomy-related docs disagree:

1. prefer [AGENT-EXECUTION-BASELINE.md](/D:/Rune%20Weaver/docs/AGENT-EXECUTION-BASELINE.md)
2. then [AGENT-TASK-CONTRACT.md](/D:/Rune%20Weaver/docs/AGENT-TASK-CONTRACT.md)
3. then [CURRENT-EXECUTION-PLAN.md](/D:/Rune%20Weaver/docs/CURRENT-EXECUTION-PLAN.md)
4. then [HANDOFF.md](/D:/Rune%20Weaver/docs/HANDOFF.md)
