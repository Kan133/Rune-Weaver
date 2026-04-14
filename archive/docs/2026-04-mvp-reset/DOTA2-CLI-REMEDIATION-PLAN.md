# Dota2 CLI Remediation Plan

## Purpose

This document turns the existing CLI split direction into a concrete remediation plan for
`apps/cli/dota2-cli.ts`.

It is not a rewrite proposal.

It exists to answer one practical question:

- how to reduce `dota2-cli.ts` risk without destabilizing the working Phase 1 mainline

## Current Assessment

`apps/cli/dota2-cli.ts` is now a confirmed high-risk file.

The project has already seen repeated pressure in this file from:

- lifecycle orchestration
- LLM fallback / configuration handling
- artifact and verdict construction
- validation staging
- workspace state integration
- command-specific maintenance flows

The file is still workable, but it is too large and too attractive as a place for local fixes.

The main risk is not style or file length by itself.

The main risk is ownership collapse.

## Current Rule

Until remediation starts, treat `dota2-cli.ts` as a frozen-risk surface:

- allow only minimal blocker fixes
- do not add new business semantics casually
- do not add new prompt interpretation logic here
- do not add new workspace policy logic here
- do not add new validation policy logic here

Every non-trivial change to this file should be reviewed against:

- [ENGINEERING-GUARDRAILS.md](/D:/Rune%20Weaver/docs/ENGINEERING-GUARDRAILS.md)
- [DOTA2-CLI-SPLIT-PLAN.md](/D:/Rune%20Weaver/docs/DOTA2-CLI-SPLIT-PLAN.md)

## Goals

The remediation plan should achieve four outcomes:

1. keep the current Phase 1 mainline working
2. stop further responsibility drift into the CLI
3. extract the most reusable and drift-prone semantics first
4. leave the CLI as a command shell, not a second execution system

## Non-Goals

This plan is not trying to:

- rewrite the full Dota2 command surface in one pass
- redesign the overall architecture
- introduce a new generic command framework
- change product direction
- perform Phase 2 semantic update work

## Recommended Sequence

The remediation should happen in small phases.

Do not start by rewriting command entry flow wholesale.

### Phase A: Freeze And Inventory

Before extracting anything:

- identify the major responsibility clusters still living in `dota2-cli.ts`
- note which ones are already duplicated across commands
- mark which ones are stable enough to extract safely

Expected output:

- one responsibility inventory
- one extraction order

### Phase B: Artifact And Verdict Extraction

Extract first:

- artifact building helpers
- stage result assembly helpers
- final verdict calculation helpers

Why first:

- these semantics should stay unified across commands
- they are highly reusable
- they are easy to drift when left inline

Success condition:

- CLI still triggers artifact creation
- artifact semantics no longer live inline across command branches

### Phase C: Validation Orchestration Extraction

Extract next:

- host validation orchestration
- runtime validation orchestration
- maintenance post-check orchestration

Why next:

- validation must remain comparable across create/update/regenerate/rollback
- CLI should trigger validation, not define its semantics

Success condition:

- validation policy lives outside the CLI
- command paths use the same orchestration surface where possible

### Phase D: Workspace Result Integration Extraction

Extract:

- workspace update integration
- workspace result summarization
- post-write workspace persistence glue

Why:

- workspace is lifecycle source of truth
- inconsistent workspace handling creates hidden lifecycle drift quickly

Success condition:

- CLI no longer owns workspace mutation semantics directly
- regenerate / rollback / update remain aligned on one workspace integration surface

### Phase E: Maintenance Command Flow Thinning

Only after earlier phases are stable:

- thin `update`
- thin `regenerate`
- thin `rollback`

This should mean:

- command shell stays in CLI
- lower flow steps move into command-specific adapters or orchestration helpers
- shared lower semantics remain shared

This phase must not create independent pipelines.

## Extraction Priority

If work must stop early, prefer extracting in this order:

1. artifact / verdict semantics
2. validation orchestration
3. workspace integration
4. command flow shells

## Review Checklist

For every remediation step, reviewers should ask:

1. Did the CLI become thinner in responsibility, not just shorter in lines?
2. Did the extraction preserve the current mainline behavior?
3. Did shared semantics become more unified, not more duplicated?
4. Did the change avoid creating a parallel pipeline?
5. Did any lower-layer policy accidentally remain in the CLI?

## Good First Candidate Extractions

The safest first candidates are:

- final verdict assembly
- artifact stage assembly
- validation result aggregation
- workspace post-write result integration

These are better first targets than rewriting the top-level command shell.

## Triggers To Start This Work

The project should start active remediation when any of the following is true:

- another non-trivial feature tries to add new semantics into `dota2-cli.ts`
- command-specific branching grows again
- validation/workspace/verdict logic drifts across commands
- the lead agent decides Phase 1 mainline is stable enough to spend effort on structural cleanup

## Current Recommendation

After the current mainline parameter-propagation work is verified cleanly, the next structural task
should be to begin Phase B of this remediation plan:

- extract artifact and verdict semantics first

Do not jump directly to broad command-flow rewrites unless a concrete blocker forces it.

## Summary

`dota2-cli.ts` should not be fixed by one large rewrite.

It should be improved by:

- freezing further drift
- extracting the most reusable semantics first
- preserving the working Phase 1 mainline while reducing future glue-code risk

## Current Status (2026-04)

### Completed Extractions

- **Phase B**: artifact / verdict semantics extracted
- **Phase C**: validation orchestration extracted
- **Phase D**: workspace integration extracted

### Phase E Review Result

- maintenance command flow thinning was reviewed
- conclusion: current maintenance flows are already "thin but visible"
- no further extraction accepted at this time

### Current Phase Status

- current CLI remediation phase is closed
- future re-evaluation is possible when Phase 1 stability further improves
