# LLM Integration

> Status: active-reference
> Audience: agents
> Doc family: contract
> Update cadence: on-contract-change
> Last verified: 2026-04-20
> Read when: aligning LLM placement, prompt-package scope, and current non-authority boundaries
> Do not use for: granting LLM ownership over governance, write, or final lifecycle truth

## Purpose

Rune Weaver uses LLM as a bounded assistant inside a governed pipeline.

The current question is not “where can LLM speak?”
The current question is “what may LLM help produce before deterministic authority takes over?”

## Current Accepted Placement

LLM may assist:

1. Wizard / update wizard interpretation
2. optional proposal work inside Blueprint stage
3. artifact synthesis inside fixed owned scope
4. bounded local repair / muscle fill

LLM may not own:

1. clarification authority
2. `IntentGovernanceDecisions`
3. final `FeatureContract`
4. final dependency contract
5. host routing
6. write authority
7. final commit gate

## Wizard Boundary

Current Wizard responsibilities that may use LLM:

- semantic capture
- structured section filling
- clarification question drafting
- bounded assumption surfacing

What remains deterministic:

- clarification staging into `blocksBlueprint` / `blocksWrite`
- governance normalization such as runtime-persistence versus external-persistence boundaries
- downstream use of `IntentGovernanceDecisions`

Current rule:

- prompt packages reduce drift
- they do not replace code-side governance decisions

## Prompt Packages And Drift Reduction

Current create and update prompt packages both carry the same persistence rule:

- unless the ask explicitly requests cross-match retention, account/profile save, external storage, or named external ownership, interpret `persistent` as runtime/session-long existence only

This rule is there to reduce LLM drift.
It is not the authority seam.

Authority still lives in:

- normalization
- clarification-plan derivation
- governance-decision derivation

## Blueprint Assistance Boundary

LLM may assist proposal-style Blueprint work when present.

It may suggest:

- modules
- connections
- candidate decomposition
- uncertainties
- reusable hints

It may not decide by itself:

- final legality
- final pattern resolution
- final host target selection
- final write targets

The deterministic Blueprint stage remains the authority seam.

## Synthesis Boundary

LLM may help generate host-native artifacts only after owned scope is already fixed.

Current synthesis rules:

- synthesized artifacts must stay inside declared owned scope
- synthesis must not invent new dependency edges or bridge ownership
- synthesis must not widen host write authority

Current Dota2 examples:

- Lua ability shells
- KV ability definitions
- UI skeletons

## Repair Boundary

Current repair is bounded local repair, not freeform regeneration.

LLM may assist only when:

- owned scope is already fixed
- fill contracts or equivalent local boundaries exist
- the failure is implementation-local

Repair may not change:

- ownership
- dependency contract
- implementation strategy
- host routing
- lifecycle truth

## Source-Backed Family Boundary

LLM may contribute to source-backed family interpretation.

It does not own production write truth for those families.

Current examples:

- Dota2 `selection_pool` seeding/update merge is bounded by adapter-owned source truth
- cross-feature provider export must read authoritative host binding truth, not guess `abilityName` from paths or prompt words

This is why source-backed update merge, provider export, and sidecar preservation remain adapter-owned seams.

## Summary

The accepted LLM boundary is:

- let LLM help capture semantics and generate bounded owned-scope artifacts
- keep clarification staging, governance decisions, dependency contracts, host routing, write authority, and final commit truth deterministic
