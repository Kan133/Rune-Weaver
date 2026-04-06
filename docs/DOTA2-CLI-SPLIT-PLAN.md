# Dota2 CLI Split Plan

## Purpose

This document defines how `apps/cli/dota2-cli.ts` should be split over time.

The goal is not to rewrite it immediately.

The goal is to stop it from becoming the place where every layer of the system leaks together.

## Why This Matters

`dota2-cli.ts` currently sits close to:

- command dispatch
- planning orchestration
- validation
- maintenance command semantics
- artifact generation
- workspace reporting

That makes it a high-risk accumulation point.

If it keeps growing unchecked, it will become the codebase's main glue pile.

## Split Principle

The file should eventually become:

- a command entry and orchestration shell

not:

- the real home of planning logic
- the real home of maintenance execution
- the real home of validation policy
- the real home of artifact semantics

## Current Safe Role

In the current phase, `dota2-cli.ts` may still:

- parse command-level intent
- assemble a top-level command flow
- call lower layers
- collect final artifact output

But it should progressively stop owning:

- stage-specific business logic
- maintenance-specific execution details
- duplicated verdict logic
- host-specific mutation logic

## Recommended Future Extraction Targets

The file should gradually lose responsibility to dedicated modules in roughly this order.

### 1. Artifact And Verdict Builders

Move toward dedicated modules for:

- artifact construction
- stage result assembly
- verdict calculation

Reason:

- these semantics must stay unified across commands
- they are too easy to fork when kept inline in CLI code

### 2. Command Flow Adapters

Separate command-specific high-level flows such as:

- create/run
- update
- regenerate
- rollback

Reason:

- command branching is currently one of the main sources of drift

These should still call shared lower layers rather than becoming independent pipelines.

### 3. Validation Orchestration

Extract orchestration for:

- host validation
- runtime validation
- maintenance post-checks

Reason:

- validation should remain comparable across commands
- CLI should trigger it, not own its semantics

### 4. Workspace Result Integration

Extract workspace update reporting and integration glue into a thinner helper.

Reason:

- workspace semantics should stay consistent across create/update/regenerate/rollback

## What Should Stay In CLI

Even after splitting, the CLI file should still own:

- command parsing
- top-level mode selection
- user-facing command output
- final artifact save trigger
- high-level error boundaries

## What Should Not Stay In CLI

The CLI file should not keep long-term ownership of:

- realization policy
- generator routing policy
- selective update strategy internals
- regenerate cleanup internals
- rollback execution internals
- workspace mutation semantics
- validation policy semantics

## Phase-Oriented Split Recommendation

### During Phase 1

Do not perform a huge CLI rewrite.

Instead:

- keep the file working
- avoid adding new responsibilities casually
- extract only when a responsibility is clearly becoming reusable or dangerous

### After Phase 1

Once Host Realization and Generator Routing are integrated, prioritize splitting:

1. artifact / verdict builders
2. validation orchestration
3. maintenance command flow shells

## Review Rule

When changing `dota2-cli.ts`, reviewers should ask:

1. Is this logic truly command-shell logic?
2. Or does it belong to a lower contract-driven layer?

If it belongs lower, it should not permanently remain in the CLI file.

## Practical Guardrail For Coder Prompts

When asking coders to modify `dota2-cli.ts`, future prompts should explicitly warn:

- do not turn CLI into a second executor
- do not duplicate lifecycle semantics here
- do not place host policy logic here
- do not put realization routing logic here
- prefer extracting helpers when a new concern would otherwise deepen command-specific branching

## Summary

`dota2-cli.ts` should remain the shell of the Dota2 command surface.

If it becomes the place where planning, realization, generation, validation, workspace mutation, and maintenance logic all meet directly, it will become the highest-risk file in the repo.
