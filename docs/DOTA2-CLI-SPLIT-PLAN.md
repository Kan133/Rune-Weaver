# Dota2 CLI Split Plan

> Status Note
> This is a planning document for future CLI refactoring.
> For current CLI authoritative path, see [AGENT-EXECUTION-BASELINE.md](/D:/Rune%20Weaver/docs/AGENT-EXECUTION-BASELINE.md).
> The current CLI implementation is working and should not be rewritten based on this plan alone.

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

## Concrete Low-Risk Split Sequence

This section maps the current large functions to extraction targets. Each step should be moved and verified independently. The first pass should be mechanical: move existing functions, preserve signatures, update imports, and run the same CLI smoke checks.

### Step 0. Keep The Public Surface Stable

Keep `apps/cli/dota2-cli.ts` exporting:

- `Dota2CLIOptions`
- `Dota2ReviewArtifact`
- `showDota2Help`
- `runDota2CLI`

Do not change caller behavior from `apps/cli/index.ts` during early splitting.

### Step 1. Extract Maintenance Command Files

Move these functions into `apps/cli/dota2/commands/`:

| Function | Target file | Notes |
| --- | --- | --- |
| `runUpdateCommand` | `commands/update.ts` | Depends on update classifier/executor, host validation, workspace state, and artifact save helper. |
| `runDeleteCommand` | `commands/delete.ts` | Depends on workspace ownership, delete governance, bridge refresh, and artifact save helper. |
| `runRollbackCommand` | `commands/rollback.ts` | Keep deferred/maintenance behavior intact; do not merge with delete. |
| `runRegenerateCommand` | `commands/regenerate.ts` | Keep separate from update; it has cleanup semantics. |

After this step, `runDota2CLI` should only dispatch command kind and call the command module.

### Step 2. Extract The Create Pipeline As A Single Module

Move the current creation path into `apps/cli/dota2/create-pipeline.ts`:

| Function | Target role |
| --- | --- |
| `runPipeline` | top-level create/review/dry-run pipeline |
| `createIntentSchema` | intent stage |
| `createFallbackIntentSchema` | fallback intent stage |
| `buildBlueprint` | blueprint stage |
| `resolvePatternsFromBlueprint` | pattern stage |
| `buildAssemblyPlan` | assembly stage |
| `createWritePlan` | create write-plan stage |
| `executeWrite` | create write execution stage |

This step should not split stage internals yet. The first win is removing the create pipeline from the command shell without changing behavior.

### Step 3. Extract Shared Artifact IO

Move artifact writing into `apps/cli/dota2/review-artifacts.ts`:

- save default review artifacts under `tmp/cli-review`
- save explicit `--output` paths exactly as today
- keep JSON formatting unchanged

This avoids each command creating its own artifact save behavior.

### Step 4. Extract Shared Command Context

Only after commands are separate, introduce a small context object:

- `options`
- `hostRoot`
- `workspace`
- `existingFeature`
- `artifact`

Do this after mechanical moves, not before. Creating a context object too early would make the first split harder to review.

### Step 5. Add Command Smoke Checks

Before and after each extraction, run:

- `npm run check-types`
- `npm run test`
- one dry-run create command
- one update dry-run command when a host fixture is available
- one delete dry-run command when a host fixture is available

The rule is simple: one moved command, one verification pass.

## Workbench Entry Split Recommendation

`apps/workbench/index.ts` should be split separately from `dota2-cli.ts`. It has different responsibilities and should not become a second CLI executor.

Recommended first-pass targets:

| Current functions/constants | Target file | Purpose |
| --- | --- | --- |
| `SCENE_ANCHOR_KEYWORDS`, `detectSceneAnchors`, `extractAnchorName` | `scene-anchors.ts` | Request text to scene reference extraction. |
| `BUILTIN_EXPERIENCES`, `findRelevantExperiences` | `experience-library.ts` | Reusable experience presets and matching. |
| `identifyGapsAndFill`, `identifyGapsAndFillAsync`, `detectModuleGaps`, `fillSingleGap`, `fillSingleGapWithLLM` | `gap-fill.ts` | Proposal gap detection and LLM/rule filling. |
| `generateFeatureId`, `extractFeatureLabel`, `generateSessionId`, `createFeatureIdentity`, `createFeatureOwnership` | `feature-intake.ts` | Intake identity and ownership construction. |
| `buildProposalMessages`, `generateBlueprintProposal`, `PROPOSAL_SCHEMA` | `proposal.ts` | Blueprint proposal generation. |
| `createIntegrationPointRegistry`, `extractIntegrationPoints`, `detectSharedIntegrationPointConflict` | `integration-points.ts` | Integration point extraction and conflict checks. |
| `createFeatureCard`, `createFeatureDetail`, `generateFeatureReview`, `printFeatureReview` | `feature-review.ts` | Presentation models and console review output. |
| `runList`, `runDelete`, `runInspect`, `main` | `cli.ts` | Workbench command-line entry only. |

Keep `runWorkbench` in `index.ts` until the helper modules are extracted. Then `index.ts` can become a thin public API that exports `runWorkbench`.

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
