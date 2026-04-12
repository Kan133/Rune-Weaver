# Agent Task Contract

## Purpose

This document defines how lead agents should scope, assign, and evaluate work for Rune Weaver during the current README-target MVP milestone.

Use this file when:

- decomposing work for worker agents
- deciding whether a task is in scope
- writing implementation prompts
- reviewing whether a change is acceptable

This is an execution contract, not a long-term product vision document.

## Read Order

Before assigning work, read in this order:

1. [README.md](/D:/Rune%20Weaver/README.md)
2. [AGENT-EXECUTION-BASELINE.md](/D:/Rune%20Weaver/docs/AGENT-EXECUTION-BASELINE.md)
3. [AGENT-TASK-CONTRACT.md](/D:/Rune%20Weaver/docs/AGENT-TASK-CONTRACT.md)
4. [HANDOFF.md](/D:/Rune%20Weaver/docs/HANDOFF.md)
5. [ARCHITECTURE.md](/D:/Rune%20Weaver/docs/ARCHITECTURE.md)
6. [WORKSPACE-MODEL.md](/D:/Rune%20Weaver/docs/WORKSPACE-MODEL.md)

## Current Work Envelope

Worker agents may advance only the current README-target MVP:

- strict host separation
- workspace-backed feature management
- product-grade `create`
- product-grade `update`
- product-grade `delete`
- minimum cross-feature governance

Out of scope for current acceptance:

- `regenerate`
- `rollback`
- semantic incremental update
- second host support
- broad workbench platformization
- full future frontend/result contracts

## Required Task Packet

Every worker task should include all of the following:

1. mission
   - one narrow objective
2. write scope
   - exact files or modules the worker may change
3. source-of-truth docs
   - usually [AGENT-EXECUTION-BASELINE.md](/D:/Rune%20Weaver/docs/AGENT-EXECUTION-BASELINE.md), [AGENT-TASK-CONTRACT.md](/D:/Rune%20Weaver/docs/AGENT-TASK-CONTRACT.md), and [WORKSPACE-MODEL.md](/D:/Rune%20Weaver/docs/WORKSPACE-MODEL.md)
4. non-goals
   - what the worker must not expand into
5. acceptance check
   - concrete behavior or test that proves the task is done
6. boundary reminder
   - worker must not widen host ownership or redefine milestone scope

If a task packet is missing these fields, it is underspecified.

For default autonomy behavior, also pair this file with [AUTONOMOUS-DEVELOPMENT-POLICY.md](/D:/Rune%20Weaver/docs/AUTONOMOUS-DEVELOPMENT-POLICY.md).

## Allowed Task Classes

The preferred worker task classes are:

### 1. Host Separation Hardening

Examples:

- reduce writes outside Rune Weaver-owned directories
- narrow bridge mutations to approved entry points
- make ownership checks explicit before write

### 2. Workspace Truth Hardening

Examples:

- ensure workspace state records the real `selectedPatterns`
- ensure workspace state records actual generated files
- ensure workspace state records actual bridge bindings and revision changes

### 3. Product-Grade Create

Definition:

- create a feature
- persist its workspace record
- materialize owned artifacts
- register approved bridge exposure
- leave reviewable evidence

### 4. Product-Grade Update

Definition:

- keep the same `featureId`
- stay inside owned files and approved bridge points
- update persisted registry state
- preserve explainability of what changed

For the current milestone, `update` means lifecycle update of the same managed feature. It does not mean open-ended semantic rewrite.

### 5. Product-Grade Delete

Definition:

- remove the feature from workspace state
- unload its owned artifacts from host-owned directories
- remove or repair approved bridge exposure
- leave the host in a consistent post-delete state

Delete is not complete if it only removes the workspace record.

### 6. Minimum Governance

Required minimum checks before write:

- ownership overlap
- bridge-point contention
- ambiguous target feature match
- delete risk when another feature depends on the target

Nice-to-have governance must not block the MVP.

## Required Acceptance Scenarios

The current milestone should always be judged against these scenarios:

1. create one new feature in a clean host and persist truthful workspace state
2. update the same feature without changing `featureId` or touching unrelated host code
3. delete the same feature and fully unload Rune Weaver-owned artifacts and bridge exposure
4. detect at least the minimum obvious conflict when a second feature overlaps ownership or bridge points

If a proposed change does not improve one of these scenarios, it is probably not on the critical path.

## Review Rules

Reject or re-scope tasks that:

- turn planning docs into claimed shipped behavior
- optimize regenerate or rollback ahead of create/update/delete
- expand to new host support
- rely on fixtures as stronger truth than workspace state
- merge unrelated scopes into one worker task
- leave acceptance vague

## Escalation Rules

Pause and re-scope when:

- a task needs to change ownership boundaries
- a task needs to touch arbitrary host files
- a task mixes product semantics and UI speculation
- a task cannot state how success will be verified

## Recommended Worker Output

Each worker should return:

1. what changed
2. what files were touched
3. what acceptance check was run
4. what is still incomplete or intentionally deferred

## Prompt Skeleton

Use this template when assigning work:

```md
Mission:
<one narrow MVP objective>

Write Scope:
- <file/module>
- <file/module>

Source Of Truth:
- AGENT-EXECUTION-BASELINE.md
- AGENT-TASK-CONTRACT.md
- WORKSPACE-MODEL.md

Non-Goals:
- no regenerate / rollback work
- no host boundary expansion
- no unrelated UI contract work

Acceptance:
- <specific scenario or command>

Reminder:
Stay inside the current README-target MVP. Do not redefine scope or revert unrelated user changes.
```
