# Doc Status Registry

> Status: authoritative
> Audience: agents
> Doc family: control
> Update cadence: on-contract-change
> Last verified: 2026-04-25
> Read when: deciding whether a doc is safe to trust, ignore, or archive
> Do not use for: architecture design by itself; this is a routing/trust registry, not a subsystem spec

## Purpose

This file is the status truth for high-signal docs used by active work.

Rules:

- if a doc is listed here, trust the status/action recorded here
- if a doc is not listed here, do not treat it as execution truth by default
- use [AGENT-DOC-ROUTING.md](/D:/Rune%20Weaver/docs/AGENT-DOC-ROUTING.md) to decide read order

Freshness labels:

- `current`
- `needs-refresh`
- `redirect-stub`

Agent actions:

- `must-read`
- `read-by-task`
- `planning-only`
- `ignore-for-execution`

High-signal header requirement:

- every doc that sits in the registry must start with the same governance header block so agents can immediately see `Status`, `Audience`, `Update cadence`, `Last verified`, `Read when`, and `Do not use for`
- the header helps agents stop reading as soon as they detect the doc is `planning-only`, `needs-refresh`, or otherwise outside the current execution scope

Status and action definitions:

- `authoritative`: the doc drives current execution truth and should only change via policy updates
- `active-reference`: trusted context for specific behavior but still scoped to a subsystem; double-check lifecycle scope before using
- `planning`: papers that explore possible futures or audits and must never override `authoritative` truth without ratification
- `archive`: retired/redirect stubs that exist for navigation but carry no execution truth
- `planning-only` action documents the same: read them only when explicitly planning or validating planning signals
- `ignore-for-execution` keeps work queues from accidentally following archived or stubbed narratives

Minimum machine-readable header automation scope:

- [README.md](/D:/Rune%20Weaver/README.md)
- [AGENT-EXECUTION-BASELINE.md](/D:/Rune%20Weaver/docs/AGENT-EXECUTION-BASELINE.md)
- [AGENT-TASK-CONTRACT.md](/D:/Rune%20Weaver/docs/AGENT-TASK-CONTRACT.md)
- [AUTONOMOUS-DEVELOPMENT-POLICY.md](/D:/Rune%20Weaver/docs/AUTONOMOUS-DEVELOPMENT-POLICY.md)
- [HANDOFF.md](/D:/Rune%20Weaver/docs/HANDOFF.md)
- [CURRENT-EXECUTION-PLAN.md](/D:/Rune%20Weaver/docs/CURRENT-EXECUTION-PLAN.md)
- [ARCHITECTURE.md](/D:/Rune%20Weaver/docs/ARCHITECTURE.md)
- [WORKSPACE-MODEL.md](/D:/Rune%20Weaver/docs/WORKSPACE-MODEL.md)
- [PATTERN-SPEC.md](/D:/Rune%20Weaver/docs/PATTERN-SPEC.md)
- [ACCEPTANCE-CHECKLISTS.md](/D:/Rune%20Weaver/docs/ACCEPTANCE-CHECKLISTS.md)
- [ACCEPTANCE-EVIDENCE-TEMPLATE.md](/D:/Rune%20Weaver/docs/ACCEPTANCE-EVIDENCE-TEMPLATE.md)
- [RW-SHARED-PLAN.md](/D:/Rune%20Weaver/docs/session-sync/RW-SHARED-PLAN.md)
- [SESSION-SYNC-PROTOCOL.md](/D:/Rune%20Weaver/docs/session-sync/SESSION-SYNC-PROTOCOL.md)
---

## Control Docs

| Document | Status | Freshness | Agent action | Use |
|----------|--------|-----------|--------------|-----|
| [INDEX.md](/D:/Rune%20Weaver/INDEX.md) | active-reference | current | read-by-task | repo entry and top-level navigation |
| [DOCUMENT-GOVERNANCE.md](/D:/Rune%20Weaver/docs/DOCUMENT-GOVERNANCE.md) | authoritative | current | must-read | doc rules and anti-staleness policy |
| [DOC-STATUS-REGISTRY.md](/D:/Rune%20Weaver/docs/DOC-STATUS-REGISTRY.md) | authoritative | current | must-read | doc trust/status source |
| [AGENT-DOC-ROUTING.md](/D:/Rune%20Weaver/docs/AGENT-DOC-ROUTING.md) | authoritative | current | must-read | task-based doc read routing |
| [HANDOFF.md](/D:/Rune%20Weaver/docs/HANDOFF.md) | authoritative | current | must-read | operational entry for active work |

---

## Current Authoritative Set

| Document | Status | Freshness | Agent action | Use |
|----------|--------|-----------|--------------|-----|
| [README.md](/D:/Rune%20Weaver/README.md) | authoritative | current | must-read | public product boundary, target outcome, and honest current capability statement |
| [AGENT-EXECUTION-BASELINE.md](/D:/Rune%20Weaver/docs/AGENT-EXECUTION-BASELINE.md) | authoritative | current | must-read | current lifecycle truth and scope |
| [AGENT-TASK-CONTRACT.md](/D:/Rune%20Weaver/docs/AGENT-TASK-CONTRACT.md) | authoritative | current | must-read | worker task packet and review rules |
| [AUTONOMOUS-DEVELOPMENT-POLICY.md](/D:/Rune%20Weaver/docs/AUTONOMOUS-DEVELOPMENT-POLICY.md) | authoritative | current | read-by-task | autonomy / escalation behavior |
| [CURRENT-EXECUTION-PLAN.md](/D:/Rune%20Weaver/docs/CURRENT-EXECUTION-PLAN.md) | authoritative | current | must-read | active Dota2 V2 execution queue |
| [ARCHITECTURE.md](/D:/Rune%20Weaver/docs/ARCHITECTURE.md) | authoritative | current | must-read | current governance-first execution layering |
| [WORKSPACE-MODEL.md](/D:/Rune%20Weaver/docs/WORKSPACE-MODEL.md) | authoritative | current | must-read | workspace truth, ownership, dependency, and lifecycle model |

---

## Active Reference Docs

| Document | Status | Freshness | Agent action | Use |
|----------|--------|-----------|--------------|-----|
| [HOST-REALIZATION-CONTRACT.md](/D:/Rune%20Weaver/docs/HOST-REALIZATION-CONTRACT.md) | active-reference | current | read-by-task | host realization contract |
| [GENERATOR-ROUTING-CONTRACT.md](/D:/Rune%20Weaver/docs/GENERATOR-ROUTING-CONTRACT.md) | active-reference | current | read-by-task | generator routing contract |
| [PATTERN-PIPELINE.md](/D:/Rune%20Weaver/docs/PATTERN-PIPELINE.md) | active-reference | current | read-by-task | current pattern pipeline behavior |
| [PATTERN-MODEL.md](/D:/Rune%20Weaver/docs/PATTERN-MODEL.md) | active-reference | current | read-by-task | current pattern reference model |
| [PATTERN-SPEC.md](/D:/Rune%20Weaver/docs/PATTERN-SPEC.md) | active-reference | current | read-by-task | current pattern admission baseline for `PatternContract`, `HostBinding`, and `FillSlot` |
| [SCHEMA.md](/D:/Rune%20Weaver/docs/SCHEMA.md) | active-reference | current | read-by-task | current Wizard/Blueprint/Assembly contract truth |
| [RW-MAINLINE-ORCHESTRATION-PLAN.md](/D:/Rune%20Weaver/docs/RW-MAINLINE-ORCHESTRATION-PLAN.md) | active-reference | current | read-by-task | cross-track orchestration guardrail |
| [RW-SHARED-PLAN.md](/D:/Rune%20Weaver/docs/session-sync/RW-SHARED-PLAN.md) | active-reference | current | read-by-task | freshest cross-track current state, blockers, and attention split |
| [SESSION-SYNC-PROTOCOL.md](/D:/Rune%20Weaver/docs/session-sync/SESSION-SYNC-PROTOCOL.md) | active-reference | current | read-by-task | session-sync note shape and shared-plan refresh rules |
| [ACCEPTANCE-CHECKLISTS.md](/D:/Rune%20Weaver/docs/ACCEPTANCE-CHECKLISTS.md) | active-reference | needs-refresh | read-by-task | execution checklist for canonical acceptance work; packet-era wording may lag current shared truth, so cross-check same-day state against `CURRENT-EXECUTION-PLAN.md`, `RW-SHARED-PLAN.md`, and the latest relevant session-sync note |
| [ACCEPTANCE-EVIDENCE-TEMPLATE.md](/D:/Rune%20Weaver/docs/ACCEPTANCE-EVIDENCE-TEMPLATE.md) | active-reference | current | read-by-task | reporting template for acceptance evidence |
| [WIZARD-BLUEPRINT-CHAIN.md](/D:/Rune%20Weaver/docs/WIZARD-BLUEPRINT-CHAIN.md) | active-reference | current | read-by-task | current Wizard -> clarification -> Blueprint -> final-gate boundary, including staged `blocksBlueprint / blocksWrite` semantics |
| [LLM-INTEGRATION.md](/D:/Rune%20Weaver/docs/LLM-INTEGRATION.md) | active-reference | current | read-by-task | current LLM placement and non-authority boundary across Wizard, proposal, synthesis, and repair |

---

## Additional Active Reference Docs

| Document | Status | Freshness | Agent action | Use |
|----------|--------|-----------|--------------|-----|
| [ASSEMBLY-REALIZATION-NOTES.md](/D:/Rune%20Weaver/docs/ASSEMBLY-REALIZATION-NOTES.md) | active-reference | current | read-by-task | assembly-to-host-realization boundary notes |
| [BLUEPRINT-CLI-USAGE.md](/D:/Rune%20Weaver/docs/BLUEPRINT-CLI-USAGE.md) | active-reference | current | read-by-task | current blueprint CLI entry points and IO expectations |
| [BLUEPRINT-PATTERN-RESOLUTION.md](/D:/Rune%20Weaver/docs/BLUEPRINT-PATTERN-RESOLUTION.md) | active-reference | current | read-by-task | current `moduleNeeds` -> selected pattern / unresolved need / synthesis-forward continuation behavior |
| [BLUEPRINT-VALIDATION.md](/D:/Rune%20Weaver/docs/BLUEPRINT-VALIDATION.md) | active-reference | current | read-by-task | current layered validation chain from blueprint normalization to final commit gate |
| [CANONICAL-ACCEPTANCE-CASES.md](/D:/Rune%20Weaver/docs/CANONICAL-ACCEPTANCE-CASES.md) | active-reference | needs-refresh | read-by-task | canonical acceptance case definitions; packet-era case framing still helps, but same-day current slice and blocker truth must come from `CURRENT-EXECUTION-PLAN.md`, `RW-SHARED-PLAN.md`, and the latest relevant session-sync note |
| [CANONICAL-WALKTHROUGH.md](/D:/Rune%20Weaver/docs/CANONICAL-WALKTHROUGH.md) | active-reference | current | read-by-task | canonical demo / handoff walkthrough |
| [CLEAN-STATE-PROTOCOL.md](/D:/Rune%20Weaver/docs/CLEAN-STATE-PROTOCOL.md) | active-reference | current | read-by-task | clean-state preparation before verification |
| [COMMAND-RECIPES.md](/D:/Rune%20Weaver/docs/COMMAND-RECIPES.md) | active-reference | current | read-by-task | current CLI/workbench/export-bridge command surface and authority boundaries for lifecycle, validation, and product review |
| [DEVELOPMENT-GUIDE.md](/D:/Rune%20Weaver/docs/DEVELOPMENT-GUIDE.md) | active-reference | current | read-by-task | implementation-oriented development guide |
| [ENGINEERING-GUARDRAILS.md](/D:/Rune%20Weaver/docs/ENGINEERING-GUARDRAILS.md) | active-reference | current | read-by-task | engineering anti-drift guardrails |
| [FAILURE-CLASSIFICATION.md](/D:/Rune%20Weaver/docs/FAILURE-CLASSIFICATION.md) | active-reference | current | read-by-task | failure-classification vocabulary for validation work |
| [GENERATOR-ROUTING-SCHEMA.md](/D:/Rune%20Weaver/docs/GENERATOR-ROUTING-SCHEMA.md) | active-reference | current | read-by-task | generator-routing data shape |
| [HOST-REALIZATION-SCHEMA.md](/D:/Rune%20Weaver/docs/HOST-REALIZATION-SCHEMA.md) | active-reference | current | read-by-task | `HostRealizationPlan` data shape |
| [TECHNICAL-REFERENCE-LAYER.md](/D:/Rune%20Weaver/docs/TECHNICAL-REFERENCE-LAYER.md) | active-reference | current | read-by-task | entry point for deeper technical reference docs |
| [VALIDATION-AUTOMATION-BOUNDARY.md](/D:/Rune%20Weaver/docs/VALIDATION-AUTOMATION-BOUNDARY.md) | active-reference | current | read-by-task | validation automation boundary rules |
| [VALIDATION-PLAYBOOK.md](/D:/Rune%20Weaver/docs/VALIDATION-PLAYBOOK.md) | active-reference | current | read-by-task | current validation execution playbook for CLI lifecycle, governed bridge checks, connected-host product surfaces, and legacy compatibility boundary checks |

---

## Host-Specific Active Reference Docs

| Document | Status | Freshness | Agent action | Use |
|----------|--------|-----------|--------------|-----|
| [ASSEMBLY-HOST-MAPPING.md](/D:/Rune%20Weaver/docs/hosts/dota2/ASSEMBLY-HOST-MAPPING.md) | active-reference | needs-refresh | read-by-task | Dota2 assembly-to-host write-target mapping |
| [HOST-INTEGRATION-DOTA2.md](/D:/Rune%20Weaver/docs/hosts/dota2/HOST-INTEGRATION-DOTA2.md) | active-reference | current | read-by-task | Dota2 x-template host integration reference |
| [DOTA2-HOST-REALIZATION-POLICY.md](/D:/Rune%20Weaver/docs/hosts/dota2/DOTA2-HOST-REALIZATION-POLICY.md) | active-reference | current | read-by-task | Dota2 host realization routing policy |
| [DOTA2-KV-GENERATOR-SCOPE.md](/D:/Rune%20Weaver/docs/hosts/dota2/DOTA2-KV-GENERATOR-SCOPE.md) | active-reference | current | read-by-task | Dota2 KV generator boundary |
| [DOTA2-TS-GENERATOR-BOUNDARY.md](/D:/Rune%20Weaver/docs/hosts/dota2/DOTA2-TS-GENERATOR-BOUNDARY.md) | active-reference | current | read-by-task | Dota2 TS generator boundary |
| [DOTA2-TS-LUA-AUTHORING-PATHS.md](/D:/Rune%20Weaver/docs/hosts/dota2/DOTA2-TS-LUA-AUTHORING-PATHS.md) | active-reference | current | read-by-task | Dota2 TS/Lua authoring-path reference |
| [DOTA2-GAP-FILL-BOUNDARY.md](/D:/Rune%20Weaver/docs/hosts/dota2/DOTA2-GAP-FILL-BOUNDARY.md) | active-reference | current | read-by-task | Dota2 bounded local repair / muscle-fill boundary |
| [DOTA2-V2-GOVERNANCE-FIRST-ARCHITECTURE.md](/D:/Rune%20Weaver/docs/hosts/dota2/DOTA2-V2-GOVERNANCE-FIRST-ARCHITECTURE.md) | active-reference | current | read-by-task | current Dota2-specific source-backed update, cross-feature grant seam, and provider-identity reference |
| [DOTA-DATA-INGESTION.md](/D:/Rune%20Weaver/docs/hosts/dota2/DOTA-DATA-INGESTION.md) | active-reference | current | read-by-task | Dota2 reference-data ingestion model |
| [PATTERN-AUTHORING-GUIDE.md](/D:/Rune%20Weaver/docs/hosts/dota2/PATTERN-AUTHORING-GUIDE.md) | active-reference | needs-refresh | read-by-task | Dota2-oriented pattern authoring guide |
| [UI-SAFER-PROFILE.md](/D:/Rune%20Weaver/docs/hosts/dota2/UI-SAFER-PROFILE.md) | active-reference | current | read-by-task | Dota2 Panorama safer-generation profile |
| [X-TEMPLATE-ONBOARDING.md](/D:/Rune%20Weaver/docs/hosts/dota2/X-TEMPLATE-ONBOARDING.md) | active-reference | current | read-by-task | x-template onboarding flow for Dota2 |
| [DOTA2-GAP-FILL-E2E-CHECKLIST.md](/D:/Rune%20Weaver/docs/hosts/dota2/DOTA2-GAP-FILL-E2E-CHECKLIST.md) | active-reference | current | read-by-task | canonical Dota2 Talent Draw skeleton-plus-fill acceptance checklist and evidence-closure support |
| [TALENT-DRAW-E2E-LESSONS.md](/D:/Rune%20Weaver/docs/hosts/dota2/TALENT-DRAW-E2E-LESSONS.md) | active-reference | needs-refresh | read-by-task | Dota2 host/runtime lessons from the Talent Draw canonical case; useful for debugging and hardening, but cross-check generic claims against current host docs and session-sync |
| [WAR3-MAP-WORKSPACE-MODEL.md](/D:/Rune%20Weaver/docs/hosts/war3/WAR3-MAP-WORKSPACE-MODEL.md) | active-reference | current | read-by-task | War3 map-workspace model |
| [WAR3-HANDOFF-PROBE.md](/D:/Rune%20Weaver/docs/hosts/war3/WAR3-HANDOFF-PROBE.md) | active-reference | current | read-by-task | current War3 handoff probe boundary |
| [WAR3-TSTL-SKELETON.md](/D:/Rune%20Weaver/docs/hosts/war3/WAR3-TSTL-SKELETON.md) | active-reference | current | read-by-task | current War3 TSTL skeleton reference |

Volatile coordination note:

- the latest `docs/session-sync/dota2-mainline-*.md` and `docs/session-sync/war3-mainline-*.md` notes are current orchestration inputs for step/blocker freshness
- older notes in those streams are historical snapshots, not parallel live plans
- use them for orchestration freshness, not as replacements for stable subsystem contract docs

---

## Narrative / Product Reference Docs

| Document | Status | Freshness | Agent action | Use |
|----------|--------|-----------|--------------|-----|
| [DEMO-PATHS.md](/D:/Rune%20Weaver/docs/DEMO-PATHS.md) | active-reference | current | read-by-task | current demo-safe walkthroughs for CLI authoritative path plus governed bridge/workbench product surfaces |
| [PRODUCT-GUIDE-FOR-AI-PM-ZH.md](/D:/Rune%20Weaver/docs/PRODUCT-GUIDE-FOR-AI-PM-ZH.md) | active-reference | current | read-by-task | public AI-PM-facing product introduction, workflow framing, and feature-first explanation |
| [PRODUCT.md](/D:/Rune%20Weaver/docs/PRODUCT.md) | planning | current | planning-only | long-term product thesis and boundary framing |
| [ROADMAP.md](/D:/Rune%20Weaver/docs/ROADMAP.md) | planning | needs-refresh | planning-only | roadmap sequencing and product milestones; current-step language may lag fresh session-sync truth |
| [PHASE-ROADMAP-ZH.md](/D:/Rune%20Weaver/docs/PHASE-ROADMAP-ZH.md) | planning | needs-refresh | planning-only | Chinese explanation of phase model and milestone meaning; current-position language may lag fresh session-sync truth |

---

## Planning Docs In Current Use

| Document | Status | Freshness | Agent action | Use |
|----------|--------|-----------|--------------|-----|
| [DOC-GOVERNANCE-AUDIT-2026-04-14.md](/D:/Rune%20Weaver/docs/DOC-GOVERNANCE-AUDIT-2026-04-14.md) | planning | current | planning-only | documentation cleanup audit |
| [CURRENT-STATE-VS-TARGET.md](/D:/Rune%20Weaver/docs/CURRENT-STATE-VS-TARGET.md) | planning | current | planning-only | pure narrative state comparison only; not an execution queue or lifecycle baseline |
| [INTENT-SCHEMA-BLUEPRINT-UPDATE-PLAN.md](/D:/Rune%20Weaver/docs/planning/intent-blueprint/INTENT-SCHEMA-BLUEPRINT-UPDATE-PLAN.md) | planning | current | planning-only | residual intent/blueprint planning tracker after baseline ratification |
| [INTENT-SCHEMA-VNEXT-PROPOSAL.md](/D:/Rune%20Weaver/docs/planning/intent-blueprint/INTENT-SCHEMA-VNEXT-PROPOSAL.md) | planning | current | planning-only | residual typed IntentSchema vNext proposal details |
| [BLUEPRINT-PROPOSAL-CONTRACT-PROPOSAL.md](/D:/Rune%20Weaver/docs/planning/intent-blueprint/BLUEPRINT-PROPOSAL-CONTRACT-PROPOSAL.md) | planning | current | planning-only | residual `BlueprintProposal` contract planning notes |
| [BLUEPRINT-NORMALIZER-PROPOSAL.md](/D:/Rune%20Weaver/docs/planning/intent-blueprint/BLUEPRINT-NORMALIZER-PROPOSAL.md) | planning | current | planning-only | residual deterministic normalization planning details |
| [PATTERN-UPDATE-PLAN.md](/D:/Rune%20Weaver/docs/PATTERN-UPDATE-PLAN.md) | planning | current | planning-only | target pattern architecture |
| [PATTERN-CONTRACT-VNEXT-PROPOSAL.md](/D:/Rune%20Weaver/docs/PATTERN-CONTRACT-VNEXT-PROPOSAL.md) | planning | current | planning-only | proposed semantic `PatternContract` / `HostBinding` contract split |
| [REALIZATION-FAMILY-PROPOSAL.md](/D:/Rune%20Weaver/docs/REALIZATION-FAMILY-PROPOSAL.md) | planning | current | planning-only | proposed `RealizationFamily` taxonomy and family-first host realization policy |
| [FILL-SLOT-CONTRACT-PROPOSAL.md](/D:/Rune%20Weaver/docs/FILL-SLOT-CONTRACT-PROPOSAL.md) | planning | current | planning-only | proposed typed `FillSlot` contract and bounded gap-fill gating |
| [MODULE-NEED-SEAM-PROPOSAL.md](/D:/Rune%20Weaver/docs/MODULE-NEED-SEAM-PROPOSAL.md) | planning | current | planning-only | canonical cross-lane planning seam for normalized module needs |
| [ARCHITECTURE-UPDATE-THREE-LANE-WORKSPLIT.md](/D:/Rune%20Weaver/docs/ARCHITECTURE-UPDATE-THREE-LANE-WORKSPLIT.md) | planning | current | planning-only | main-controller boundary for parallel agent lanes |
| [BRIDGE-UPDATE-PLANNING.md](/D:/Rune%20Weaver/docs/BRIDGE-UPDATE-PLANNING.md) | planning | current | planning-only | future bridge update planning |
| [COMPOSITE-BLUEPRINT-BASELINE.md](/D:/Rune%20Weaver/docs/COMPOSITE-BLUEPRINT-BASELINE.md) | planning | current | planning-only | future composite-blueprint baseline |
| [COMPOSITE-FEATURE-ARCHITECTURE.md](/D:/Rune%20Weaver/docs/COMPOSITE-FEATURE-ARCHITECTURE.md) | planning | current | planning-only | future composite-feature architecture |
| [FEATURE-BOUNDARY-RELATIONSHIP-GUARDRAILS-ZH.md](/D:/Rune%20Weaver/docs/FEATURE-BOUNDARY-RELATIONSHIP-GUARDRAILS-ZH.md) | planning | current | planning-only | future feature-boundary / relationship governance guardrails |
| [FEATURE-CONFLICT-GOVERNANCE-GUARDRAILS-ZH.md](/D:/Rune%20Weaver/docs/FEATURE-CONFLICT-GOVERNANCE-GUARDRAILS-ZH.md) | planning | current | planning-only | future conflict-governance guardrails |
| [GAP-FILL-2.0.md](/D:/Rune%20Weaver/docs/GAP-FILL-2.0.md) | planning | needs-refresh | planning-only | future Gap Fill expansion proposal; not baseline truth |
| [MULTI-OUTPUT-REALIZATION-MIGRATION.md](/D:/Rune%20Weaver/docs/MULTI-OUTPUT-REALIZATION-MIGRATION.md) | planning | current | planning-only | future multi-output realization migration |
| [QA.md](/D:/Rune%20Weaver/docs/QA.md) | planning | current | planning-only | high-level product viability narrative |
| [STRUCTURED-EXPERIENCE-LAYER-GUARDRAILS-ZH.md](/D:/Rune%20Weaver/docs/STRUCTURED-EXPERIENCE-LAYER-GUARDRAILS-ZH.md) | planning | current | planning-only | future structured-experience-layer guardrails |
| [SYSTEM-ARCHITECTURE-ZH.md](/D:/Rune%20Weaver/docs/SYSTEM-ARCHITECTURE-ZH.md) | planning | needs-refresh | planning-only | long-range system architecture vision |
| [UIDESIGNSPEC-TO-TEMPLATE-MAPPING.md](/D:/Rune%20Weaver/docs/UIDESIGNSPEC-TO-TEMPLATE-MAPPING.md) | planning | current | planning-only | future UIDesignSpec-to-template mapping |
| [UI-PATTERN-STRATEGY.md](/D:/Rune%20Weaver/docs/UI-PATTERN-STRATEGY.md) | planning | current | planning-only | future UI pattern strategy |
| [UI-SPEC-GUIDE.md](/D:/Rune%20Weaver/docs/UI-SPEC-GUIDE.md) | planning | current | planning-only | future UI spec scope guide |
| [UI-WIZARD-GUARDRAILS-ZH.md](/D:/Rune%20Weaver/docs/UI-WIZARD-GUARDRAILS-ZH.md) | planning | needs-refresh | planning-only | future UI Wizard boundary guide |

---

## Host-Specific Planning Docs

| Document | Status | Freshness | Agent action | Use |
|----------|--------|-----------|--------------|-----|
| [DOTA2-CLI-SPLIT-PLAN.md](/D:/Rune%20Weaver/docs/hosts/dota2/DOTA2-CLI-SPLIT-PLAN.md) | planning | current | planning-only | future Dota2 CLI refactor planning |
| [DOTA2-CODEGEN-FEATURE-MANAGEMENT-PLAN-ZH.md](/D:/Rune%20Weaver/docs/hosts/dota2/DOTA2-CODEGEN-FEATURE-MANAGEMENT-PLAN-ZH.md) | planning | current | planning-only | historical Dota2 mainline planning context |
| [WAR3-KK-TSTL-PROVISIONAL-HOST-WORKSPACE-CONTRACT.md](/D:/Rune%20Weaver/docs/hosts/war3/WAR3-KK-TSTL-PROVISIONAL-HOST-WORKSPACE-CONTRACT.md) | planning | current | planning-only | provisional War3 KK workspace contract |
| [WAR3-LUA-EVALUATION-BRIEFING.md](/D:/Rune%20Weaver/docs/hosts/war3/WAR3-LUA-EVALUATION-BRIEFING.md) | planning | current | planning-only | historical War3 Lua-host feasibility and tooling briefing; planning context only, not current mainline truth |
| [WAR3-SLICE-INTENT-HOST-BINDING.md](/D:/Rune%20Weaver/docs/hosts/war3/WAR3-SLICE-INTENT-HOST-BINDING.md) | planning | current | planning-only | War3 slice comparison between intent-like meaning and host binding |
| [WAR3-UX-FLOW-DRAFT.md](/D:/Rune%20Weaver/docs/hosts/war3/WAR3-UX-FLOW-DRAFT.md) | planning | current | planning-only | War3 host UX draft |

---

## Redirect / Archive Shims

| Document | Status | Freshness | Agent action | Use |
|----------|--------|-----------|--------------|-----|
| [MVP-EXECUTION-QUEUE.md](/D:/Rune%20Weaver/docs/MVP-EXECUTION-QUEUE.md) | archive | redirect-stub | ignore-for-execution | historical queue redirect only |
| [TASK-COMPLETION.md](/D:/Rune%20Weaver/docs/TASK-COMPLETION.md) | archive | redirect-stub | ignore-for-execution | historical tracker redirect only |
| [WIZARD-INTENT-CONTRACT.md](/D:/Rune%20Weaver/docs/WIZARD-INTENT-CONTRACT.md) | archive | redirect-stub | ignore-for-execution | redirect stub to the archived comparison-era Wizard/Intent contract |
| [BLUEPRINT-ORCHESTRATION-CONTRACT.md](/D:/Rune%20Weaver/docs/BLUEPRINT-ORCHESTRATION-CONTRACT.md) | archive | redirect-stub | ignore-for-execution | redirect stub to the archived comparison-era Blueprint orchestration contract |

---

## Registry Maintenance

Update this file when:

1. the authoritative set changes
2. a planning doc becomes current reference
3. a current doc becomes stale enough to mark `needs-refresh`
4. a doc becomes a redirect stub or moves to archive
5. task routing changes enough that agents would read a different control set
