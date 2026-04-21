# Agent Doc Routing

> Status: authoritative
> Audience: agents
> Doc family: control
> Update cadence: on-contract-change
> Last verified: 2026-04-20
> Read when: deciding the minimum doc set for a task
> Do not use for: subsystem truth by itself; this file routes readers to the right docs

## Purpose

This file tells agents which docs to read for which task class.

Rules:

- start here before reading deep into `docs/`
- use [DOC-STATUS-REGISTRY.md](/D:/Rune%20Weaver/docs/DOC-STATUS-REGISTRY.md) to verify trust level
- prefer the smallest sufficient read set

## Routing guardrails

- confirm each doc's header block to read `Status`, `Audience`, `Update cadence`, `Last verified`, `Read when`, and `Do not use for` before treating it as a route milestone
- consult the registry first: only `must-read` or `read-by-task` entries should drive the canonical sequence, `planning-only` or `ignore-for-execution` docs should be skipped unless your task explicitly requests planning work, and `needs-refresh` docs need a cross-check before accepting new execution moves
- if a doc is absent from the registry, pause and escalate instead of assuming it carries current truth
- stop advancing a route as soon as you hit a doc tagged `planning`, `archive`, `redirect-stub`, or otherwise outside the current execution scope

---

## 1. Resume Active Work / Ask "What Next?"

Read in this order:

1. [HANDOFF.md](/D:/Rune%20Weaver/docs/HANDOFF.md)
2. [CURRENT-EXECUTION-PLAN.md](/D:/Rune%20Weaver/docs/CURRENT-EXECUTION-PLAN.md)
3. [AGENT-EXECUTION-BASELINE.md](/D:/Rune%20Weaver/docs/AGENT-EXECUTION-BASELINE.md)
4. [ARCHITECTURE.md](/D:/Rune%20Weaver/docs/ARCHITECTURE.md)

Stop reading this route once a doc's registry entry flags it `planning-only`, `needs-refresh`, or `ignore-for-execution`; escalate before proceeding.
Do not start with:

- roadmap-only docs
- old queue docs
- planning docs unless the task is explicitly architecture planning

Add when relevant:

- [RW-SHARED-PLAN.md](/D:/Rune%20Weaver/docs/session-sync/RW-SHARED-PLAN.md)
- the latest session-sync notes under `docs/session-sync/`
  - especially when same-day freshness matters more than low-frequency plan text

---

## 2. Scope Or Assign Worker Tasks

Read in this order:

1. [AGENT-TASK-CONTRACT.md](/D:/Rune%20Weaver/docs/AGENT-TASK-CONTRACT.md)
2. [AGENT-EXECUTION-BASELINE.md](/D:/Rune%20Weaver/docs/AGENT-EXECUTION-BASELINE.md)
3. [HANDOFF.md](/D:/Rune%20Weaver/docs/HANDOFF.md)
4. [CURRENT-EXECUTION-PLAN.md](/D:/Rune%20Weaver/docs/CURRENT-EXECUTION-PLAN.md)

Pause if a listed doc is tagged anything but `current` with a `must-read`/`read-by-task` action; the earlier docs should resolve task context before continuing.
Add when relevant:

- [AUTONOMOUS-DEVELOPMENT-POLICY.md](/D:/Rune%20Weaver/docs/AUTONOMOUS-DEVELOPMENT-POLICY.md)

---

## 3. Change Current Lifecycle / Workspace Behavior

Read in this order:

1. [AGENT-EXECUTION-BASELINE.md](/D:/Rune%20Weaver/docs/AGENT-EXECUTION-BASELINE.md)
2. [WORKSPACE-MODEL.md](/D:/Rune%20Weaver/docs/WORKSPACE-MODEL.md)
3. [ARCHITECTURE.md](/D:/Rune%20Weaver/docs/ARCHITECTURE.md)
4. [CURRENT-EXECUTION-PLAN.md](/D:/Rune%20Weaver/docs/CURRENT-EXECUTION-PLAN.md)

Stop advancing this sequence if a doc has `planning-only` or `needs-refresh` in the registry; escalate before letting lifecycle changes diverge from authoritative truth.
Add when relevant:

- [HOST-REALIZATION-CONTRACT.md](/D:/Rune%20Weaver/docs/HOST-REALIZATION-CONTRACT.md)
- [GENERATOR-ROUTING-CONTRACT.md](/D:/Rune%20Weaver/docs/GENERATOR-ROUTING-CONTRACT.md)

---

## 4. Intent Schema / Blueprint Architecture Work

Read baseline first:

1. [ARCHITECTURE.md](/D:/Rune%20Weaver/docs/ARCHITECTURE.md)
2. [SCHEMA.md](/D:/Rune%20Weaver/docs/SCHEMA.md)
3. [WIZARD-BLUEPRINT-CHAIN.md](/D:/Rune%20Weaver/docs/WIZARD-BLUEPRINT-CHAIN.md)
4. [LLM-INTEGRATION.md](/D:/Rune%20Weaver/docs/LLM-INTEGRATION.md)

If the task is Dota2-specific blueprint/synthesis/repair work or is checking whether older grammar-era wording still applies, add these before proposal docs:

- latest Dota2 mainline session-sync note under `docs/session-sync/`
- [RW-SHARED-PLAN.md](/D:/Rune%20Weaver/docs/session-sync/RW-SHARED-PLAN.md)
- [DOTA2-V2-GOVERNANCE-FIRST-ARCHITECTURE.md](/D:/Rune%20Weaver/docs/hosts/dota2/DOTA2-V2-GOVERNANCE-FIRST-ARCHITECTURE.md)
  - Dota2-specific implementation reference; do not let it override cross-host baseline docs by itself

Then read proposal docs only if the task is explicitly planning/proposal work:

- [INTENT-SCHEMA-BLUEPRINT-UPDATE-PLAN.md](/D:/Rune%20Weaver/docs/planning/intent-blueprint/INTENT-SCHEMA-BLUEPRINT-UPDATE-PLAN.md)
- [MODULE-NEED-SEAM-PROPOSAL.md](/D:/Rune%20Weaver/docs/MODULE-NEED-SEAM-PROPOSAL.md)
- [INTENT-SCHEMA-VNEXT-PROPOSAL.md](/D:/Rune%20Weaver/docs/planning/intent-blueprint/INTENT-SCHEMA-VNEXT-PROPOSAL.md)
- [BLUEPRINT-PROPOSAL-CONTRACT-PROPOSAL.md](/D:/Rune%20Weaver/docs/planning/intent-blueprint/BLUEPRINT-PROPOSAL-CONTRACT-PROPOSAL.md)
- [BLUEPRINT-NORMALIZER-PROPOSAL.md](/D:/Rune%20Weaver/docs/planning/intent-blueprint/BLUEPRINT-NORMALIZER-PROPOSAL.md)
- [ARCHITECTURE-UPDATE-THREE-LANE-WORKSPLIT.md](/D:/Rune%20Weaver/docs/ARCHITECTURE-UPDATE-THREE-LANE-WORKSPLIT.md)
  - only when checking lane boundaries or proposal merge ownership

Add when relevant:

- [BLUEPRINT-CLI-USAGE.md](/D:/Rune%20Weaver/docs/BLUEPRINT-CLI-USAGE.md)
- [BLUEPRINT-PATTERN-RESOLUTION.md](/D:/Rune%20Weaver/docs/BLUEPRINT-PATTERN-RESOLUTION.md)
- [BLUEPRINT-VALIDATION.md](/D:/Rune%20Weaver/docs/BLUEPRINT-VALIDATION.md)

Do not use redirect stubs such as [WIZARD-INTENT-CONTRACT.md](/D:/Rune%20Weaver/docs/WIZARD-INTENT-CONTRACT.md) or [BLUEPRINT-ORCHESTRATION-CONTRACT.md](/D:/Rune%20Weaver/docs/BLUEPRINT-ORCHESTRATION-CONTRACT.md) for execution work; they exist only to route archive readers.

Stop when you reach docs tagged `planning` or `needs-refresh`; this route exists to inspect proposal work, not to override the authoritative lifecycle truth specified in §3.

Do not use planning docs to override current lifecycle truth.
For Dota2 blueprint work, treat old grammar-era docs as historical or planning input only when they conflict with the current baseline.

---

## 5. Pattern / Host Realization / Generator Work

Read in this order:

1. [PATTERN-MODEL.md](/D:/Rune%20Weaver/docs/PATTERN-MODEL.md)
2. [PATTERN-SPEC.md](/D:/Rune%20Weaver/docs/PATTERN-SPEC.md)
3. [PATTERN-PIPELINE.md](/D:/Rune%20Weaver/docs/PATTERN-PIPELINE.md)
4. [HOST-REALIZATION-CONTRACT.md](/D:/Rune%20Weaver/docs/HOST-REALIZATION-CONTRACT.md)
5. [GENERATOR-ROUTING-CONTRACT.md](/D:/Rune%20Weaver/docs/GENERATOR-ROUTING-CONTRACT.md)
6. [MODULE-NEED-SEAM-PROPOSAL.md](/D:/Rune%20Weaver/docs/MODULE-NEED-SEAM-PROPOSAL.md)
7. [PATTERN-UPDATE-PLAN.md](/D:/Rune%20Weaver/docs/PATTERN-UPDATE-PLAN.md)

Add when relevant:

- [ARCHITECTURE.md](/D:/Rune%20Weaver/docs/ARCHITECTURE.md)
- [SCHEMA.md](/D:/Rune%20Weaver/docs/SCHEMA.md)
- [GENERATOR-ROUTING-SCHEMA.md](/D:/Rune%20Weaver/docs/GENERATOR-ROUTING-SCHEMA.md)
- [HOST-REALIZATION-SCHEMA.md](/D:/Rune%20Weaver/docs/HOST-REALIZATION-SCHEMA.md)
- [DOTA2-GAP-FILL-BOUNDARY.md](/D:/Rune%20Weaver/docs/hosts/dota2/DOTA2-GAP-FILL-BOUNDARY.md)
  - when the task changes Dota2 generator-side or source-backed muscle-fill boundaries
- [PATTERN-CONTRACT-VNEXT-PROPOSAL.md](/D:/Rune%20Weaver/docs/PATTERN-CONTRACT-VNEXT-PROPOSAL.md)
- [REALIZATION-FAMILY-PROPOSAL.md](/D:/Rune%20Weaver/docs/REALIZATION-FAMILY-PROPOSAL.md)
- [FILL-SLOT-CONTRACT-PROPOSAL.md](/D:/Rune%20Weaver/docs/FILL-SLOT-CONTRACT-PROPOSAL.md)
- [ARCHITECTURE-UPDATE-THREE-LANE-WORKSPLIT.md](/D:/Rune%20Weaver/docs/ARCHITECTURE-UPDATE-THREE-LANE-WORKSPLIT.md)
  - only when checking lane boundaries or proposal merge ownership

Stop if the pattern docs carry `needs-refresh` or `planning`; surface the inconsistency before relying on host or generator transitions.

---

## 6. Workbench / Product Entry / UI Shell Work

Read in this order:

1. [HANDOFF.md](/D:/Rune%20Weaver/docs/HANDOFF.md)
2. [CURRENT-EXECUTION-PLAN.md](/D:/Rune%20Weaver/docs/CURRENT-EXECUTION-PLAN.md)
3. [ARCHITECTURE.md](/D:/Rune%20Weaver/docs/ARCHITECTURE.md)
4. [WORKSPACE-MODEL.md](/D:/Rune%20Weaver/docs/WORKSPACE-MODEL.md)

Reference only:

- roadmap / product narrative docs

Rule:

- UI must follow authoritative CLI lifecycle truth, not invent a second execution model

---

## 7. Acceptance Evidence / Canonical Walkthrough Verification

Packet-era warning:

- [ACCEPTANCE-CHECKLISTS.md](/D:/Rune%20Weaver/docs/ACCEPTANCE-CHECKLISTS.md), [CANONICAL-ACCEPTANCE-CASES.md](/D:/Rune%20Weaver/docs/CANONICAL-ACCEPTANCE-CASES.md), [VALIDATION-PLAYBOOK.md](/D:/Rune%20Weaver/docs/VALIDATION-PLAYBOOK.md), [COMMAND-RECIPES.md](/D:/Rune%20Weaver/docs/COMMAND-RECIPES.md), and [DEMO-PATHS.md](/D:/Rune%20Weaver/docs/DEMO-PATHS.md) still contain packet-era wording and can lag same-day current-slice or blocker truth
- before using those docs to drive acceptance, validation, or demo decisions, cross-check against [CURRENT-EXECUTION-PLAN.md](/D:/Rune%20Weaver/docs/CURRENT-EXECUTION-PLAN.md), [RW-SHARED-PLAN.md](/D:/Rune%20Weaver/docs/session-sync/RW-SHARED-PLAN.md), and the latest relevant session-sync note under `docs/session-sync/`
- if the packet-era docs imply a different current blocker, current step, or authoritative acceptance entrance, stop and escalate instead of treating them as fresher than session-sync

Read in this order:

1. [CURRENT-EXECUTION-PLAN.md](/D:/Rune%20Weaver/docs/CURRENT-EXECUTION-PLAN.md)
2. [AGENT-EXECUTION-BASELINE.md](/D:/Rune%20Weaver/docs/AGENT-EXECUTION-BASELINE.md)
3. [ACCEPTANCE-EVIDENCE-TEMPLATE.md](/D:/Rune%20Weaver/docs/ACCEPTANCE-EVIDENCE-TEMPLATE.md)
4. [HANDOFF.md](/D:/Rune%20Weaver/docs/HANDOFF.md)

Add when relevant:

- [RW-SHARED-PLAN.md](/D:/Rune%20Weaver/docs/session-sync/RW-SHARED-PLAN.md)
- the latest relevant session-sync note under `docs/session-sync/`
- [ACCEPTANCE-CHECKLISTS.md](/D:/Rune%20Weaver/docs/ACCEPTANCE-CHECKLISTS.md)
- [DOTA2-GAP-FILL-E2E-CHECKLIST.md](/D:/Rune%20Weaver/docs/hosts/dota2/DOTA2-GAP-FILL-E2E-CHECKLIST.md)
  - when the task is the frozen Dota2 Talent Draw canonical skeleton-plus-fill acceptance pass rather than generic acceptance work
- [CANONICAL-ACCEPTANCE-CASES.md](/D:/Rune%20Weaver/docs/CANONICAL-ACCEPTANCE-CASES.md)
- [CANONICAL-WALKTHROUGH.md](/D:/Rune%20Weaver/docs/CANONICAL-WALKTHROUGH.md)
- [VALIDATION-PLAYBOOK.md](/D:/Rune%20Weaver/docs/VALIDATION-PLAYBOOK.md)
- [FAILURE-CLASSIFICATION.md](/D:/Rune%20Weaver/docs/FAILURE-CLASSIFICATION.md)
- [CLEAN-STATE-PROTOCOL.md](/D:/Rune%20Weaver/docs/CLEAN-STATE-PROTOCOL.md)
- [COMMAND-RECIPES.md](/D:/Rune%20Weaver/docs/COMMAND-RECIPES.md)
- [DEMO-PATHS.md](/D:/Rune%20Weaver/docs/DEMO-PATHS.md)

Do not start with:

- roadmap docs
- stale queue docs
- architecture update plans

---

## 8. Documentation Cleanup / Archive Sweep

Read in this order:

1. [DOCUMENT-GOVERNANCE.md](/D:/Rune%20Weaver/docs/DOCUMENT-GOVERNANCE.md)
2. [DOC-STATUS-REGISTRY.md](/D:/Rune%20Weaver/docs/DOC-STATUS-REGISTRY.md)
3. [DOC-GOVERNANCE-AUDIT-2026-04-14.md](/D:/Rune%20Weaver/docs/DOC-GOVERNANCE-AUDIT-2026-04-14.md)
4. [INDEX.md](/D:/Rune%20Weaver/INDEX.md)

Add when relevant:

- the specific docs being cleaned up
- [HANDOFF.md](/D:/Rune%20Weaver/docs/HANDOFF.md)
  - only to understand current operations; do not let it replace architecture or queue baselines by itself

---

## 9. Product Narrative / Roadmap Questions

Read in this order:

1. [AGENT-EXECUTION-BASELINE.md](/D:/Rune%20Weaver/docs/AGENT-EXECUTION-BASELINE.md)
2. [HANDOFF.md](/D:/Rune%20Weaver/docs/HANDOFF.md)
3. [PRODUCT.md](/D:/Rune%20Weaver/docs/PRODUCT.md)

Use with caution:

- [ROADMAP.md](/D:/Rune%20Weaver/docs/ROADMAP.md)
  - currently `needs-refresh`; use only for broader roadmap framing after fresh control docs
- [PHASE-ROADMAP-ZH.md](/D:/Rune%20Weaver/docs/PHASE-ROADMAP-ZH.md)
  - currently `needs-refresh`; use only for explanatory phase framing after fresh control docs
- [CURRENT-STATE-VS-TARGET.md](/D:/Rune%20Weaver/docs/CURRENT-STATE-VS-TARGET.md)
  - currently `planning-only`; use only for narrative comparison, not execution guidance

Rule:

- [README.md](/D:/Rune%20Weaver/README.md) may define the public product boundary and honest capability framing, but it is not the same-day execution queue
- narrative docs can explain direction, but they must not override active queue, lifecycle scope, or shipped architecture truth

---

## 10. Dota2 Host Work

Read in this order:

1. [AGENT-EXECUTION-BASELINE.md](/D:/Rune%20Weaver/docs/AGENT-EXECUTION-BASELINE.md)
2. [WORKSPACE-MODEL.md](/D:/Rune%20Weaver/docs/WORKSPACE-MODEL.md)
3. [HOST-INTEGRATION-DOTA2.md](/D:/Rune%20Weaver/docs/hosts/dota2/HOST-INTEGRATION-DOTA2.md)
4. [X-TEMPLATE-ONBOARDING.md](/D:/Rune%20Weaver/docs/hosts/dota2/X-TEMPLATE-ONBOARDING.md)
5. [DOTA2-HOST-REALIZATION-POLICY.md](/D:/Rune%20Weaver/docs/hosts/dota2/DOTA2-HOST-REALIZATION-POLICY.md)
6. [DOTA2-KV-GENERATOR-SCOPE.md](/D:/Rune%20Weaver/docs/hosts/dota2/DOTA2-KV-GENERATOR-SCOPE.md)
7. [DOTA2-TS-GENERATOR-BOUNDARY.md](/D:/Rune%20Weaver/docs/hosts/dota2/DOTA2-TS-GENERATOR-BOUNDARY.md)
8. [DOTA2-TS-LUA-AUTHORING-PATHS.md](/D:/Rune%20Weaver/docs/hosts/dota2/DOTA2-TS-LUA-AUTHORING-PATHS.md)

If the task is Dota2-specific synthesis, repair, dependency, or lifecycle behavior work, also read:

- latest Dota2 mainline session-sync note under `docs/session-sync/`
- [RW-SHARED-PLAN.md](/D:/Rune%20Weaver/docs/session-sync/RW-SHARED-PLAN.md)
- [DOTA2-V2-GOVERNANCE-FIRST-ARCHITECTURE.md](/D:/Rune%20Weaver/docs/hosts/dota2/DOTA2-V2-GOVERNANCE-FIRST-ARCHITECTURE.md)
  - use as the Dota2-specific implementation companion after reading root baseline docs

Add when relevant:

- [ASSEMBLY-HOST-MAPPING.md](/D:/Rune%20Weaver/docs/hosts/dota2/ASSEMBLY-HOST-MAPPING.md)
- [DOTA2-GAP-FILL-BOUNDARY.md](/D:/Rune%20Weaver/docs/hosts/dota2/DOTA2-GAP-FILL-BOUNDARY.md)
  - read when the task changes bounded local repair / muscle-fill behavior
- [DOTA2-GAP-FILL-E2E-CHECKLIST.md](/D:/Rune%20Weaver/docs/hosts/dota2/DOTA2-GAP-FILL-E2E-CHECKLIST.md)
  - use when executing the frozen Talent Draw acceptance pass or checking the expected evidence pack
- [TALENT-DRAW-E2E-LESSONS.md](/D:/Rune%20Weaver/docs/hosts/dota2/TALENT-DRAW-E2E-LESSONS.md)
  - `needs-refresh`; use only for Dota2 host/runtime debugging context after current host docs and session-sync confirm the active slice
- [UI-SAFER-PROFILE.md](/D:/Rune%20Weaver/docs/hosts/dota2/UI-SAFER-PROFILE.md)
- [PATTERN-AUTHORING-GUIDE.md](/D:/Rune%20Weaver/docs/hosts/dota2/PATTERN-AUTHORING-GUIDE.md)
- [DOTA-DATA-INGESTION.md](/D:/Rune%20Weaver/docs/hosts/dota2/DOTA-DATA-INGESTION.md)
- [DOTA2-CLI-SPLIT-PLAN.md](/D:/Rune%20Weaver/docs/hosts/dota2/DOTA2-CLI-SPLIT-PLAN.md)
  - planning-only; read only when explicitly planning Dota2 CLI refactors

Rule:

- Dota2 host docs are host-specific references, not cross-host baseline truth

---

## 11. War3 Host Work

Read in this order:

1. latest War3 mainline session-sync note
2. [RW-SHARED-PLAN.md](/D:/Rune%20Weaver/docs/session-sync/RW-SHARED-PLAN.md)
3. [WAR3-MAP-WORKSPACE-MODEL.md](/D:/Rune%20Weaver/docs/hosts/war3/WAR3-MAP-WORKSPACE-MODEL.md)
4. [WAR3-HANDOFF-PROBE.md](/D:/Rune%20Weaver/docs/hosts/war3/WAR3-HANDOFF-PROBE.md)
5. [WAR3-TSTL-SKELETON.md](/D:/Rune%20Weaver/docs/hosts/war3/WAR3-TSTL-SKELETON.md)

Add when relevant:

- [WAR3-KK-TSTL-PROVISIONAL-HOST-WORKSPACE-CONTRACT.md](/D:/Rune%20Weaver/docs/hosts/war3/WAR3-KK-TSTL-PROVISIONAL-HOST-WORKSPACE-CONTRACT.md)
  - planning-only; use when explicitly planning War3 workspace contract evolution
- [WAR3-LUA-EVALUATION-BRIEFING.md](/D:/Rune%20Weaver/docs/hosts/war3/WAR3-LUA-EVALUATION-BRIEFING.md)
  - planning-only; use for historical Lua-host feasibility/tooling context, not current write-ready or runtime-proven War3 truth
- [WAR3-SLICE-INTENT-HOST-BINDING.md](/D:/Rune%20Weaver/docs/hosts/war3/WAR3-SLICE-INTENT-HOST-BINDING.md)
  - planning-only; use when comparing War3 slice artifacts against shared seams
- [WAR3-UX-FLOW-DRAFT.md](/D:/Rune%20Weaver/docs/hosts/war3/WAR3-UX-FLOW-DRAFT.md)
  - planning-only; use when planning future War3 UX

Rule:

- same-day War3 freshness comes from session-sync first, then the host-specific reference set

---

## 12. Cross-Track Orchestration

Read in this order:

1. latest Dota2 mainline session-sync note
2. latest War3 mainline session-sync note
3. [RW-SHARED-PLAN.md](/D:/Rune%20Weaver/docs/session-sync/RW-SHARED-PLAN.md)
4. [RW-MAINLINE-ORCHESTRATION-PLAN.md](/D:/Rune%20Weaver/docs/RW-MAINLINE-ORCHESTRATION-PLAN.md)
5. [AGENT-EXECUTION-BASELINE.md](/D:/Rune%20Weaver/docs/AGENT-EXECUTION-BASELINE.md)
6. [HANDOFF.md](/D:/Rune%20Weaver/docs/HANDOFF.md)
7. [CURRENT-EXECUTION-PLAN.md](/D:/Rune%20Weaver/docs/CURRENT-EXECUTION-PLAN.md)

Add when relevant:

- [SESSION-SYNC-PROTOCOL.md](/D:/Rune%20Weaver/docs/session-sync/SESSION-SYNC-PROTOCOL.md)
  - when writing a fresh session-sync note or refreshing the shared plan

Rule:

- same-day session-sync notes are the freshness source for current step/blocker selection
- if low-frequency control docs disagree with fresh session-sync on current status, refresh the control docs before dispatching more worker tasks
- do not let orchestration docs silently override Dota2 mainline authoritative scope

---

## 13. Stop Conditions

Pause and escalate if:

1. the docs needed for a task disagree on current truth
2. the only supporting docs are marked `planning` or `needs-refresh`
3. a worker task would require reading a huge unrelated slice of `docs/`
4. a task wants to use archive or redirect-stub docs as current truth
5. the task appears to rely on a narrative/product doc for current execution instructions
6. [HANDOFF.md](/D:/Rune%20Weaver/docs/HANDOFF.md) is being used as the only source for queue, architecture, and governance at once

When this happens:

- prefer implementation reality
- then prefer authoritative docs
- then update the registry or governance docs if the routing is clearly wrong
