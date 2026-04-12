# Document Governance

## Purpose

This document defines how Rune Weaver documentation should be governed so agents can safely use the repo as an execution surface, not just a knowledge pile.

## Status Classes

Every document should fit one of these classes:

1. authoritative
   - current execution truth
   - safe to direct agent work
2. active reference
   - useful technical context
   - not the single source of truth
3. planning
   - future shape or exploratory design
   - must not override current baseline
4. archive
   - historical, superseded, or phase-specific
   - retained only for context

## Current Authoritative Set

For the current post-ABCD execution phase, the main authoritative set is:

1. [README.md](/D:/Rune%20Weaver/README.md)
2. [AGENT-EXECUTION-BASELINE.md](/D:/Rune%20Weaver/docs/AGENT-EXECUTION-BASELINE.md)
3. [AGENT-TASK-CONTRACT.md](/D:/Rune%20Weaver/docs/AGENT-TASK-CONTRACT.md)
4. [AUTONOMOUS-DEVELOPMENT-POLICY.md](/D:/Rune%20Weaver/docs/AUTONOMOUS-DEVELOPMENT-POLICY.md)
5. [HANDOFF.md](/D:/Rune%20Weaver/docs/HANDOFF.md)
6. [CURRENT-EXECUTION-PLAN.md](/D:/Rune%20Weaver/docs/CURRENT-EXECUTION-PLAN.md)
7. [ARCHITECTURE.md](/D:/Rune%20Weaver/docs/ARCHITECTURE.md)
8. [WORKSPACE-MODEL.md](/D:/Rune%20Weaver/docs/WORKSPACE-MODEL.md)

## What Stays In `docs/`

Keep a document in `docs/` only if it does at least one of these:

- defines the current product boundary or execution order
- explains current pipeline/layering used by code
- constrains current host ownership or generator behavior
- supports current product-entry / lifecycle / evidence work
- is still an active technical reference for current implementation

## What Moves To `archive/`

Move a document to `archive/` when it is primarily:

- phase-specific planning that no longer drives execution
- future contract for not-yet-shipped capability
- remediation or migration planning already superseded
- historical implementation notes
- architecture exploration outside the current product path
- stale execution queues or completion trackers

## Current Archive Buckets

The current governance passes archive superseded docs here:

- [archive/docs/2026-04-mvp-reset/README.md](/D:/Rune%20Weaver/archive/docs/2026-04-mvp-reset/README.md)
- [archive/docs/2026-04-post-abcd-plan-reset/README.md](/D:/Rune%20Weaver/archive/docs/2026-04-post-abcd-plan-reset/README.md)

## Authoring Rules

When adding a new document:

1. decide its status class first
2. if it is not authoritative, say so near the top
3. link it from [INDEX.md](/D:/Rune%20Weaver/INDEX.md) only if it still helps current work
4. do not let planning docs claim shipped behavior
5. archive superseded docs instead of leaving parallel truths in `docs/`

## Reading Rule

When documents disagree:

1. prefer implementation reality
2. prefer the authoritative set above
3. treat planning docs as explanation, not command
4. treat archived docs as historical context only
