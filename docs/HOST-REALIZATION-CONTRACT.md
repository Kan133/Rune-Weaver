# Host Realization Contract

> Status: active-reference
> Audience: agents
> Doc family: contract
> Update cadence: on-contract-change
> Last verified: 2026-04-14
> Read when: changing or reviewing Host Realization layer boundaries
> Do not use for: current MVP completion truth, execution ordering, or host-specific policy by itself

## Purpose

This document defines the contract for the Host Realization layer in Rune Weaver.

The Host Realization layer is responsible for deciding how already-resolved feature structure should be realized inside a specific host.

Its purpose is not to reinterpret user intent and not to invent new mechanics.

Its purpose is to answer:

- what should be realized as host-native configuration
- what should be realized as runtime code
- what should be realized as UI
- what should be realized as a hybrid of multiple host mechanisms

## Position In Pipeline

The Host Realization layer sits after `AssemblyPlan` and before concrete generators.

The intended sequence is:

`User Prompt -> Wizard -> IntentSchema -> Blueprint -> Pattern Resolution -> AssemblyPlan -> HostRealizationPlan -> Generators -> Write -> Validation`

This means:

- Wizard understands user intent
- Blueprint organizes structure
- Pattern Resolution selects core patterns
- AssemblyPlan expresses what must be implemented
- Host Realization decides how the host should realize that implementation

## Scope

The Host Realization layer is responsible for:

- mapping resolved feature units into host realization classes
- deciding whether a unit is best realized as KV, TS, UI, hybrid, or other allowed host realization types
- attaching host-target routing information for downstream generators
- surfacing realization blockers when the host cannot safely realize a given unit

The Host Realization layer is not responsible for:

- reinterpreting raw user intent
- changing `IntentSchema`
- changing `Blueprint`
- inventing new core patterns
- final code emission
- final file writing
- arbitrary host refactoring

## Core Principle

Rune Weaver must keep `core pattern` separate from `host realization`.

Core pattern answers:

- what mechanic or structural behavior is needed

Host realization answers:

- how that mechanic is best materialized inside a specific host

This separation is required to prevent the pattern catalog from being polluted by host implementation details.

## Pattern vs Realization Boundary

Examples:

- `effect.dash` is a core pattern
- `resource.basic_pool` is a core pattern
- `rule.selection_flow` is a core pattern
- `ui.selection_modal` is a core pattern

These are not host realization classes.

Examples of host realization classes:

- `kv`
- `ts`
- `ui`
- `lua`
- `kv+lua`
- `kv+ts`
- `shared-ts`
- `bridge-only`

The system should not turn the catalog into:

- `dota2.kv.dash`
- `dota2.ts.dash`
- `dota2.ui.selection_modal`

That would incorrectly merge mechanic identity with host-specific implementation form.

## Input Contract

The Host Realization layer may read:

- `AssemblyPlan`
- host kind
- host capability rules
- realization policy rules
- workspace context when needed for maintenance safety

It should not need:

- raw user prompt
- freeform reinterpretation of intent
- unrestricted host code scanning

## Output Contract

The Host Realization layer must output a `HostRealizationPlan`.

That plan should:

- identify realizable units
- point each unit back to its source pattern and source module
- classify realization type
- identify downstream host targets
- record blockers and confidence

The output must be reviewable and deterministic enough for downstream generators.

## Realization Types

The current expected minimal realization types are:

- `kv`
- `ts`
- `ui`
- `lua`
- `kv+lua`
- `kv+ts`
- `shared-ts`
- `bridge-only`

These may evolve later, but they must remain host realization classes, not new pattern ids.

Important:

- `kv+ts` and `kv+lua` are acceptable transitional realization classes
- they should not be mistaken for the final long-term model if composite features require many output combinations
- see `COMPOSITE-FEATURE-ARCHITECTURE.md` for the next-stage direction

## Decision Rules

Host Realization must prefer rules over freeform model behavior.

For the current project stage, Host Realization v1 should be implemented as:

- host-specific
- rule-first
- deterministic
- reviewable

It should not initially depend on a separate realization LLM.

This does not mean the layer is host-agnostic.

It means:

- the logic is rule-driven
- the rules are allowed to encode host knowledge
- the rules should stay explicit and inspectable

In other words:

- no-host-knowledge pure rules are insufficient
- freeform LLM realization is too unstable
- host-aware rule policy is the current preferred design

It should answer questions like:

- can this unit be handled by host-native configuration alone?
- does this unit require runtime logic?
- does this unit require UI output?
- is this unit best expressed as a hybrid?

It should not answer:

- what exact code should be written
- what exact imports should be used
- what exact final file contents should be

## Knowledge Requirements

The Host Realization layer requires host knowledge.

However, it does not require broad freeform RAG as its default operating mode.

The expected knowledge source for v1 is:

- explicit host realization policy documents
- explicit host capability rules
- explicit routing tables

This means the layer should primarily rely on:

- project-local structured policy
- deterministic routing rules

It should not primarily rely on:

- unrestricted API retrieval
- broad implementation search
- freeform host planning by an LLM

## LLM Usage Policy

For Host Realization v1, the recommended policy is:

- no dedicated realization LLM
- no realization-agent autonomy
- no freeform host planning

If model assistance is introduced later, it should be:

- advisory
- bounded
- subordinate to explicit host policy rules

The final realization decision should remain explainable from policy and structured inputs.

## Failure Policy

If the host cannot safely realize a unit, the layer should:

- mark a blocker
- lower confidence
- leave rationale

It should not pretend the unit is fully realizable just to keep the pipeline moving.

## Non-Goals

The Host Realization layer must not:

- invent new mechanics
- invent new core patterns
- bypass pattern resolution
- output final code
- output final host writes
- merge user-owned host code

## Relationship To Pattern Resolution

Pattern Resolution must stay earlier in the pipeline.

Pattern Resolution answers:

- which core patterns best match the feature structure

Host Realization answers:

- how those selected patterns should be materialized in the current host

This order should not be reversed.

Host capability knowledge may influence feasibility and warnings, but it should not replace core pattern resolution.

## Relationship To Generators

Generators should consume `HostRealizationPlan`.

This means generators should no longer assume that every resolved unit automatically becomes TypeScript.

Examples:

- a Dota2 ability property may be realized as `kv`
- a custom event-driven rule may be realized as `ts`
- a user-facing surface may be realized as `ui`
- a gameplay feature may require `kv+ts`

## Validation Rules

A good Host Realization decision is:

- host-aware
- conservative
- reviewable
- consistent with current host capability rules
- clearly separated from core pattern identity

A bad Host Realization decision:

- turns host APIs into patterns
- decides code details too early
- hides blockers
- treats every feature as TS by default
- treats realization type as if it were pattern identity

## Open Points

These may evolve later:

- the exact realization class taxonomy
- how much workspace state is passed into this layer
- whether confidence is purely rule-derived or mixed with model assistance
- how cross-host realization policy will be represented
