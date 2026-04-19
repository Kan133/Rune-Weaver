# LLM Integration

> Status: active-reference
> Audience: agents
> Doc family: contract
> Update cadence: on-contract-change
> Last verified: 2026-04-18
> Read when: aligning LLM placement, provider boundaries, and current governance limits
> Do not use for: granting LLM final authority over ownership, dependency, host routing, or write execution

## Purpose

This document defines the accepted LLM boundary in the ratified V2 baseline.

Rune Weaver does not treat LLM as the final authority.
Rune Weaver uses LLM where semantic exploration helps, while keeping governance deterministic.

## Current Accepted LLM Placement

LLM may assist:

1. Wizard / update wizard
2. optional proposal assistance inside blueprint stage
3. artifact synthesis for fixed owned targets
4. bounded local repair / muscle fill

LLM may not own:

1. final feature ownership
2. final dependency contract
3. final host target selection
4. final write authority
5. final commit gate

## Current Chain

Current accepted chain:

`Wizard -> IntentSchema -> Blueprint Stage -> ArtifactSynthesis (when selected) -> LocalRepair (when needed) -> Validation / CommitDecision`

Update mode complements it with:

`CurrentFeatureContext -> Update Wizard -> requestedChange + UpdateIntent -> Blueprint Stage -> downstream lifecycle`

## Wizard And Update Wizard

Wizard responsibility:

- interpret raw request
- return best-effort `IntentSchema`
- surface clarification questions when structure is still ambiguous

Update wizard responsibility:

- read workspace-backed `CurrentFeatureContext`
- return `requestedChange: IntentSchema`
- return `UpdateIntent`

Current rules:

- Wizard must not reject unfamiliar asks just because current reuse coverage is weak
- clarification sidecars do not become authority by themselves
- relation candidates are derived sidecars, not replacements for workspace truth or blueprint authority

## Blueprint Stage

LLM may assist proposal work inside blueprint stage, but current authority remains deterministic.

What blueprint stage decides:

- feature structure
- owned scope
- feature contract
- dependency edges
- implementation strategy

What LLM proposal must not decide by itself:

- final legality
- final pattern selection
- final host routing
- final write targets

## Artifact Synthesis

LLM may now assist artifact synthesis, but only after target surfaces are fixed upstream.

Current synthesis rules:

- synthesis may emit host-native owned candidate artifacts
- synthesis may not invent new owned scope
- synthesis may not invent undeclared bridge ownership
- synthesis may not change dependency graph or write authority

Current Dota2 synthesized surface:

- server Lua ability shell
- ability KV definition
- blueprint-declared UI owned skeleton

## Local Repair / Muscle Fill

Local repair is the current bounded successor to old gap-fill semantics.

LLM may assist repair only when:

- `fillContracts` or equivalent owned repair boundaries exist
- the failure is boundary-local
- host target selection and ownership are already fixed

Repair may not change:

- feature contract
- dependency edges
- strategy selection
- write ownership
- bridge/lifecycle wiring

## Grammar And Risk Labels

LLM should not be restricted by old grammar-v1 admission logic.

Current rule:

- unknown mechanics should still be modeled and may continue into guided-native / exploratory planning
- grammar/risk labels are advisory or safety-oriented, not broad pre-generation denial

## Provider Boundary

Rune Weaver still uses a thin provider model.

Application layers depend on internal `LLMClient`, not provider SDK objects directly.

Current provider guidance remains:

- thin provider layer
- environment-driven config
- workflow-specific execution config
- provider/model constraints validated centrally

## Current Summary

The accepted V2 LLM boundary is:

- use LLM to improve semantic capture and bounded owned-scope generation
- keep governance deterministic
- never let LLM become the final authority over lifecycle truth
