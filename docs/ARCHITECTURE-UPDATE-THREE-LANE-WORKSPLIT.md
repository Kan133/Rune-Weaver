# Architecture Update Three-Lane Worksplit

> Status: planning
> Audience: agents
> Doc family: planning
> Update cadence: temporary
> Last verified: 2026-04-14
> Read when: running the doc-governance, intent-blueprint, and pattern update plans in parallel
> Do not use for: current shipped architecture truth; this is a coordination boundary for parallel planning work

## Purpose

This document defines the boundary a main controller should enforce if three agent groups run in parallel on:

1. doc governance cleanup
2. intent-schema / blueprint architecture update
3. pattern architecture update

The goal is to gain parallelism without:

- duplicate work
- conflicting terminology
- accidental scope widening
- simultaneous edits to the same source-of-truth docs

---

## 1. Frozen Shared Truths

All three lanes must treat these as fixed unless the main controller explicitly reopens them:

1. final executable `Blueprint` remains deterministic
2. LLM may assist with proposal, but not with final host/write decisions
3. `HostRealization` remains policy-driven
4. `Pattern` should evolve toward semantic contract plus host binding
5. `Gap Fill` must not absorb architecture-level decision making
6. current authoritative lifecycle scope is not reopened by this planning wave

If a lane wants to break one of these, it must stop and escalate to the main controller.

---

## 2. Lane Ownership

| Lane | Mission | Primary files | Must not redefine |
|------|---------|---------------|-------------------|
| Lane A: Doc Governance | make docs more agent-readable, routable, and less stale | governance, registry, routing, index, audit | architecture contracts, pattern semantics |
| Lane B: Intent/Blueprint | improve intent-schema richness and blueprint-stage control/generalization | intent-schema / blueprint plan docs, later schema proposal docs | pattern taxonomy, host realization families |
| Lane C: Pattern | improve pattern scale, routing, and bounded fill model | pattern plan docs, later pattern proposal docs | intent-schema core fields, blueprint readiness semantics |

---

## 3. Main Controller Ownership

The main controller owns:

- shared vocabulary freeze
- seam definitions between lanes
- merge order
- conflict resolution
- final updates to cross-cutting baseline docs

The main controller is the only lane allowed to decide final wording for shared seam terms such as:

- `BlueprintProposal`
- `FinalBlueprint`
- `PatternContract`
- `HostBinding`
- `RealizationFamily`
- `FillSlot`
- `GapFill`

---

## 4. Write Scope Rule

To avoid collision:

### Lane A may edit

- [DOCUMENT-GOVERNANCE.md](/D:/Rune%20Weaver/docs/DOCUMENT-GOVERNANCE.md)
- [DOC-STATUS-REGISTRY.md](/D:/Rune%20Weaver/docs/DOC-STATUS-REGISTRY.md)
- [AGENT-DOC-ROUTING.md](/D:/Rune%20Weaver/docs/AGENT-DOC-ROUTING.md)
- [DOC-GOVERNANCE-AUDIT-2026-04-14.md](/D:/Rune%20Weaver/docs/DOC-GOVERNANCE-AUDIT-2026-04-14.md)
- [INDEX.md](/D:/Rune%20Weaver/INDEX.md)

### Lane B may edit

- [INTENT-SCHEMA-BLUEPRINT-UPDATE-PLAN.md](/D:/Rune%20Weaver/docs/INTENT-SCHEMA-BLUEPRINT-UPDATE-PLAN.md)
- proposal docs specifically created for schema / blueprint changes

### Lane C may edit

- [PATTERN-UPDATE-PLAN.md](/D:/Rune%20Weaver/docs/PATTERN-UPDATE-PLAN.md)
- proposal docs specifically created for pattern / realization evolution

### Only the main controller may edit during merge

- [ARCHITECTURE.md](/D:/Rune%20Weaver/docs/ARCHITECTURE.md)
- [SCHEMA.md](/D:/Rune%20Weaver/docs/SCHEMA.md)
- [PATTERN-MODEL.md](/D:/Rune%20Weaver/docs/PATTERN-MODEL.md)
- [PATTERN-SPEC.md](/D:/Rune%20Weaver/docs/PATTERN-SPEC.md)
- [LLM-INTEGRATION.md](/D:/Rune%20Weaver/docs/LLM-INTEGRATION.md)
- [WIZARD-BLUEPRINT-CHAIN.md](/D:/Rune%20Weaver/docs/WIZARD-BLUEPRINT-CHAIN.md)

This keeps shared contracts from being patched by multiple lanes at once.

---

## 5. Shared Interface Seams

The lanes must coordinate through a small set of seam questions.

### Seam 1: Blueprint consumes what from intent?

Owned by:

- Lane B

Input expected from other lanes:

- none required for the first draft

Deliverable:

- proposed `IntentSchema vNext` fields
- readiness / weak / blocked semantics
- `BlueprintProposal -> Normalizer -> FinalBlueprint` contract
- canonical [MODULE-NEED-SEAM-PROPOSAL.md](/D:/Rune%20Weaver/docs/MODULE-NEED-SEAM-PROPOSAL.md) ownership on the semantic side

### Seam 2: Pattern resolves what kind of blueprint need?

Owned by:

- Lane C

Input expected from Lane B:

- a stable concept of `module need` or `module contract`

Deliverable:

- capability / trait model
- realization family model
- fill slot model
- consumption of the canonical [MODULE-NEED-SEAM-PROPOSAL.md](/D:/Rune%20Weaver/docs/MODULE-NEED-SEAM-PROPOSAL.md) seam without redefining it

### Seam 3: What can agents trust and read?

Owned by:

- Lane A

Deliverable:

- status registry
- routing rules
- anti-staleness policy

---

## 6. Handoff Contract Per Lane

Each lane should return:

1. decisions made
2. files touched
3. frozen terms introduced
4. unresolved seams
5. non-goals preserved
6. what the main controller must merge next

If a lane cannot produce those six items, it is not ready for merge.

---

## 7. Non-Goals Per Lane

### Lane A must not

- redesign architecture contracts
- settle blueprint/LLM placement
- settle pattern capability taxonomy

### Lane B must not

- redesign the entire pattern catalog
- choose final host realization taxonomy alone
- patch governance docs beyond local references

### Lane C must not

- redefine intent understanding boundaries
- move host realization authority into LLM
- patch baseline schema docs directly during the parallel wave

---

## 8. Collision Policy

If two lanes discover the same issue:

1. the owning lane records the decision
2. the non-owning lane records only a dependency note
3. the main controller resolves wording at merge time

Examples:

- if Lane B wants a new `moduleNeed` vocabulary and Lane C also needs it, Lane B drafts it and Lane C consumes it provisionally
- if Lane C wants a new realization-family name that affects blueprint wording, Lane C proposes it and the main controller decides the final shared term

---

## 9. Recommended Parallel Order

Use this order:

### Wave 1

- Lane A builds governance scaffolding
- Lane B refines intent/blueprint plan
- Lane C refines pattern plan

### Wave 2

- main controller freezes seam vocabulary
- Lane B and Lane C adjust plans to that seam

### Wave 3

- main controller updates cross-cutting baseline docs

This is better than letting all three lanes edit baseline docs simultaneously.

---

## 10. Main Controller Checklist

Before merge, the main controller should verify:

1. all three lanes preserved the frozen truths
2. no lane widened current lifecycle scope
3. shared terms are consistent across documents
4. no planning doc now reads like shipped baseline truth
5. the registry/routing docs point agents at the correct new plan docs

If any of these fail, do not merge the wave as final architecture guidance yet.
