# Gap Fill 2.0

> Status: planning
> Audience: agents
> Doc family: planning
> Update cadence: temporary
> Last verified: 2026-04-14
> Read when: evaluating future Gap Fill expansion, bounded completion policy, or Wizard UI / Gap Fill planning seams
> Do not use for: current baseline Gap Fill authority, final Blueprint authority, host realization authority, or write-path decisions

This document is a planning proposal only.
Current execution truth for bounded Gap Fill still lives in the accepted baseline docs and host-specific active references.
Do not treat this file as an active gap-fill baseline.

## Purpose

This document redefines Gap Fill for the next stage of Rune Weaver.

The old direction treated Gap Fill mainly as a constrained patch layer around `pattern + blueprint`.

The new direction treats Gap Fill as a **formal implementation layer** that sits after skeleton decisions and before final host-shaped code is validated and written.

This change is driven by one practical reality:

- trying to make `pattern + blueprint` carry too much semantic coverage is expensive
- early-stage host expansion is highly exposed to long-tail implementation detail
- pushing all of that into pattern coverage creates a cold-start trap

So the new goal is:

- keep a stable skeleton for feature management
- let Gap Fill carry controlled implementation detail
- let RAG / prompt-time generation help with host-specific muscle
- do not let Gap Fill take over structure, ownership, or lifecycle authority

## One-Sentence Definition

**Gap Fill 2.0 is the controlled implementation layer that fills in the muscle of a feature after the skeleton is fixed.**

Or more bluntly:

- skeleton belongs to the system
- muscle belongs to Gap Fill

## Why This Exists

Rune Weaver still wants:

- feature identity
- owned files
- entry bindings
- create / update / delete / validation
- host realization
- future multi-host support

But it should stop demanding that `pattern + blueprint` fully encode every implementation detail up front.

If we keep forcing that:

- pattern coverage becomes the main bottleneck
- every new host becomes a pattern cold-start problem
- "gap fill" turns into a hidden structure-invention backdoor
- the system gets defeated by long-tail feature variance

Gap Fill 2.0 exists to avoid that trap.

## New Placement In The Flow

Recommended shape:

`Prompt -> Intent / Feature Spec -> Skeleton Plan -> Host Realization -> Gap Fill -> Validation -> Write / Lifecycle`

Important:

- Gap Fill comes **after** skeleton decisions
- Gap Fill does **not** decide feature identity
- Gap Fill does **not** decide host ownership
- Gap Fill does **not** decide lifecycle scope

## What Counts As Skeleton

The skeleton is the minimum structure that must remain stable for feature management to work.

The skeleton should include:

1. feature identity
2. revision / status
3. module boundaries
4. module roles
5. module-to-module connections
6. host realization targets
7. owned artifact boundaries
8. entry bindings
9. lifecycle-relevant metadata

If a fact affects:

- what the feature is
- what files it owns
- where it mounts
- how it updates
- how it deletes
- how it validates

then it belongs in the skeleton, not in Gap Fill.

## What Counts As Muscle

The muscle is the implementation detail that makes a skeleton actually runnable inside a host.

The muscle may include:

- local function bodies
- host API call sequences
- object field filling
- boilerplate completion
- local glue code
- runtime branch details
- UI internal rendering details
- text / copy / minor presentation fill

If a fact mostly affects:

- how the code is written
- how a host API is used
- how a local implementation is shaped

then it is a candidate for Gap Fill.

## Core Boundary

Gap Fill may fill implementation.

Gap Fill may not invent structure.

This is the main boundary of Gap Fill 2.0.

## What Gap Fill 2.0 Is Allowed To Do

Gap Fill 2.0 may do the following:

1. Complete implementation inside an already-approved module boundary
2. Fill code into predefined template slots
3. Produce host-specific API usage inside an already-assigned host target
4. Fill object-data / config fields inside an already-assigned artifact
5. Complete local wrappers, adapters, callbacks, or registration snippets
6. Fill low-risk UI/internal presentation details
7. Use RAG / references / host docs to improve correctness of the implementation layer

## What Gap Fill 2.0 Must Not Do

Gap Fill 2.0 must not:

1. Add or remove modules
2. Change module roles
3. Change feature identity
4. Change host targets
5. Create new write points outside owned scope
6. Redefine lifecycle semantics
7. Invent new user-facing mechanics that the skeleton did not establish
8. Silence unresolved structural ambiguity by "just writing something plausible"

If any of those are required, the request should go back up to:

- intent clarification
- skeleton planning
- host realization
- or explicit human decision

## Two Modes Of Gap Fill

Gap Fill 2.0 should be split into two explicit modes.

### 1. Closed Gap Fill

Closed Gap Fill is the preferred default.

It fills only predeclared slots such as:

- function bodies
- config field values
- callback bodies
- local render fragments
- object-data parameters
- predefined glue hooks

Closed Gap Fill is preferred because:

- it preserves structure
- it is easier to validate
- it is safer for update/delete/lifecycle
- it reduces hidden drift

### 2. Open Gap Fill

Open Gap Fill allows freer implementation inside one existing module or artifact, but still under strict outer constraints.

Open Gap Fill is allowed only when:

- the module boundary is already fixed
- the write target is already fixed
- the owned file boundary is already fixed
- the implementation cannot reasonably fit a smaller slot model

Open Gap Fill must still not:

- create extra modules
- expand write scope
- redefine the skeleton

## Relationship To Pattern

Pattern should no longer be treated as the layer that must absorb all implementation variability.

Pattern should remain mainly responsible for:

- stable module labeling
- reusable mechanic family identity
- lifecycle-relevant module semantics
- host-routing-relevant semantics

Pattern should not try to encode every implementation variant.

A good rule:

- if it affects management, routing, or lifecycle, push it toward pattern/skeleton
- if it affects local implementation detail, keep it in Gap Fill

## Relationship To Blueprint

Blueprint, or its future lighter replacement, should answer:

- what modules exist
- what each module is for
- how they connect
- what each module needs from the host

Blueprint should not have to fully express:

- all local algorithm details
- all host API specifics
- every final code branch

Gap Fill 2.0 exists partly to remove that pressure.

## Relationship To RAG And Prompt-Time Vibe Coding

Gap Fill 2.0 is where RAG and prompt-time code generation can be used most safely.

Recommended usage:

- use RAG to bring in host docs, APIs, examples, and conventions
- use prompts to generate implementation inside fixed structural boundaries
- validate the output against the skeleton and host contracts

Not recommended:

- using RAG + prompt to decide feature structure on the fly while pretending the skeleton already exists

So:

- RAG is a knowledge source
- prompt-time generation is an implementation mechanism
- Gap Fill is the bounded layer that governs both

## What Must Stay Structured

These things should remain explicit and structured even in the new model:

- featureId
- host kind
- module list
- module role
- host target
- owned files
- entry bindings
- generated artifact inventory
- revision metadata
- validation checkpoints relevant to lifecycle

If these become freeform again, feature management will collapse.

## What Can Be Prompt-Filled

These are good candidates for prompt-time filling:

- local implementation bodies
- helper function internals
- event handler details
- host API wiring details inside one target file
- local render logic
- object/config field completion
- textual copy / labels / minor presentation details

## Validation Rules

Gap Fill output should be validated against at least four questions:

1. Did it stay inside the assigned module boundary?
2. Did it stay inside the assigned owned-file / write boundary?
3. Did it preserve the assigned host realization target?
4. Can the system still summarize what this artifact does for later update/delete/review?

If the answer to any is "no", then the Gap Fill result is not acceptable.

## Decision And Approval Contract

Gap Fill must use a shared decision gate before any generated patch is applied.

This gate lives in `core/gap-fill`, not in any host adapter. Host adapters provide boundaries and target files; the core gate decides whether the patch is safe to apply.

Current core flow:

```text
patch plan
  -> decision
  -> auto_apply | require_confirmation | reject
  -> optional approval record
  -> validated apply
  -> review artifact
```

### Decision Output

The decision result is host-generic and must include:

- `decision`: `auto_apply`, `require_confirmation`, or `reject`
- `riskLevel`: `low`, `medium`, or `high`
- `reasons`: machine-readable reason codes plus user-readable messages
- `userSummary`: a short explanation suitable for CLI or UI
- `canApplyDirectly`: whether the caller may apply without a confirmation step

### Core Rules

The current deterministic MVP is intentionally conservative:

- missing patch plans, failed runs, boundary mismatch, or target mismatch are rejected
- touching imports, exports, contracts, wiring, lifecycle, or boundary-forbidden topics is rejected
- small in-boundary replace/insert patches may auto-apply
- delete operations, broad edits, or large replacements require confirmation
- unclear situations should move upward to confirmation or rejection, not silent application

### Approval Records

When a patch requires confirmation, the caller should create a core approval record instead of forcing the user to inspect raw code.

Approval records bind:

- version and kind
- approval id and creation time
- host root
- boundary id
- original instruction and instruction summary
- target file path
- target file content hash
- patch plan summary
- patch plan hash
- decision and risk
- record hash

An approved patch may only apply if validation proves:

- the approval record is the expected kind/version
- the host and boundary still match
- the target file is unchanged since approval creation
- the patch plan payload has not been altered
- the record hash still matches the encoded record

This gives product surfaces a safe two-step path:

1. generate and review a plan
2. approve the exact recorded plan later

### Decision Summary For Humans

User-facing surfaces should not require users to read generated code to make a decision.

The review should explain:

- what boundary is being changed
- whether the patch is low, medium, or high risk
- why the patch can auto-apply, needs confirmation, or is rejected
- what will be applied if the user confirms
- what changed since approval, if approval validation fails

The machine-readable `reasons` remain the source of truth for UI grouping and automation.

### Host Reuse

Dota2 and War3 should share this decision and approval contract.

Host-specific code should only supply:

- boundary provider
- target file resolver
- approval record persistence, if file-based
- apply command wiring

Host-specific code should not redefine the decision semantics.

## Upgrade Rule: When A Gap Fill Should Become Structured

A recurring Gap Fill should be promoted upward when it becomes:

1. frequent
2. stable
3. host-routing-relevant
4. lifecycle-relevant
5. ownership-affecting
6. important to validation semantics

If a fill stays purely local and highly variable, it can remain Gap Fill.

If a fill starts affecting management or repeatability, it should move into:

- pattern
- skeleton schema
- host realization policy
- or host-specific template contracts

## Practical Decision Test

When a new requirement appears, ask:

### Question 1

Does this change what the feature is, what files it owns, where it mounts, or how it updates/deletes?

If yes, it is **not** Gap Fill.

### Question 2

Does this only change how one known module is implemented?

If yes, it is a good Gap Fill candidate.

### Question 3

Does it fit a predefined slot?

If yes, prefer Closed Gap Fill.

### Question 4

Does it need freer implementation but still inside one fixed module/file?

If yes, allow Open Gap Fill cautiously.

## Working Policy For The Next Stage

For the next stage of Rune Weaver:

1. keep the skeleton light
2. keep pattern count intentionally smaller
3. allow Gap Fill to become the formal implementation layer
4. prefer Closed Gap Fill by default
5. allow Open Gap Fill only when the outer boundary is already stable
6. keep lifecycle authority outside Gap Fill
7. route all apply decisions through the shared decision and approval gate

## Non-Goals

Gap Fill 2.0 is not:

- a return to unrestricted vibe coding
- a hidden replacement for blueprint
- a reason to stop tracking owned files and entry bindings
- a reason to stop doing host realization
- a reason to stop validating structure

## Immediate Planning Implication

Future planning should assume:

- the project is no longer trying to solve long-tail implementation detail mainly through pattern coverage
- the project still wants structure strong enough for feature management
- Gap Fill is now a first-class implementation stage, not an embarrassment layer

## Final Definition

Rune Weaver should now treat Gap Fill as:

**the bounded implementation stage that turns a stable skeleton into host-usable muscle, with RAG and prompt-time generation allowed inside explicit structural and lifecycle boundaries.**
