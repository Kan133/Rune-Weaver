# Documentation Governance Audit (2026-04-14)

> Status: planning
> Audience: agents
> Doc family: planning
> Update cadence: temporary
> Last verified: 2026-04-14
> Read when: auditing doc staleness, registry coverage, and routing gaps
> Do not use for: overriding the authoritative execution baseline or subsystem architecture truth

When this document conflicts with implementation or the authoritative set, prefer [README.md](/D:/Rune%20Weaver/README.md), [AGENT-EXECUTION-BASELINE.md](/D:/Rune%20Weaver/docs/AGENT-EXECUTION-BASELINE.md), [HANDOFF.md](/D:/Rune%20Weaver/docs/HANDOFF.md), [CURRENT-EXECUTION-PLAN.md](/D:/Rune%20Weaver/docs/CURRENT-EXECUTION-PLAN.md), [ARCHITECTURE.md](/D:/Rune%20Weaver/docs/ARCHITECTURE.md), and [WORKSPACE-MODEL.md](/D:/Rune%20Weaver/docs/WORKSPACE-MODEL.md).

## 1. Purpose

This audit answers three questions:

1. Which documents in `docs/` are already stale enough to archive or de-emphasize.
2. Which documents still matter, but need updating because the current implementation has moved.
3. Which documents should remain active reference for the current post-ABCD mainline.

The goal is to reduce parallel truths in `docs/`, especially around execution queue, wizard/blueprint chain, and LLM placement.

---

## 2. Current Governance Baseline

The current governance rule is already defined in [DOCUMENT-GOVERNANCE.md](/D:/Rune%20Weaver/docs/DOCUMENT-GOVERNANCE.md):

- `authoritative`: current execution truth
- `active reference`: useful technical context
- `planning`: future shape, must not override baseline
- `archive`: historical or superseded context only

The current authoritative set is:

1. [README.md](/D:/Rune%20Weaver/README.md)
2. [AGENT-EXECUTION-BASELINE.md](/D:/Rune%20Weaver/docs/AGENT-EXECUTION-BASELINE.md)
3. [AGENT-TASK-CONTRACT.md](/D:/Rune%20Weaver/docs/AGENT-TASK-CONTRACT.md)
4. [AUTONOMOUS-DEVELOPMENT-POLICY.md](/D:/Rune%20Weaver/docs/AUTONOMOUS-DEVELOPMENT-POLICY.md)
5. [HANDOFF.md](/D:/Rune%20Weaver/docs/HANDOFF.md)
6. [CURRENT-EXECUTION-PLAN.md](/D:/Rune%20Weaver/docs/CURRENT-EXECUTION-PLAN.md)
7. [ARCHITECTURE.md](/D:/Rune%20Weaver/docs/ARCHITECTURE.md)
8. [WORKSPACE-MODEL.md](/D:/Rune%20Weaver/docs/WORKSPACE-MODEL.md)

This audit uses that set as the reference point.

---

## 2.1 Governance Focus For Lane A

This audit is governance-only.

It should improve:

- agent routing speed
- trust/freshness labeling
- separation between baseline truth and planning docs
- redirect-stub visibility

It must not reopen:

- deterministic final `Blueprint`
- LLM authority over final host/write decisions
- policy-driven `HostRealization`
- `Pattern` evolution direction beyond existing frozen phrasing
- lifecycle scope truth

---

## 2.2 Current Mixed-Role Risk

The main remaining governance problem is not that too many docs are missing.
It is that some high-signal docs still combine more than one role from an agent's point of view.

Current examples:

| Document | Mixed-role risk | Governance treatment |
|----------|-----------------|----------------------|
| [CURRENT-STATE-VS-TARGET.md](/D:/Rune%20Weaver/docs/CURRENT-STATE-VS-TARGET.md) | narrative/product comparison can still be mistaken for status truth if not clearly marked | keep it planning-only and out of execution routing |
| [PRODUCT.md](/D:/Rune%20Weaver/docs/PRODUCT.md) | long-term thesis plus some phase/current-state language | keep as reference/planning support, not execution truth |
| [ROADMAP.md](/D:/Rune%20Weaver/docs/ROADMAP.md) | roadmap plus current-phase framing | treat as planning/reference, not active queue |
| [PHASE-ROADMAP-ZH.md](/D:/Rune%20Weaver/docs/PHASE-ROADMAP-ZH.md) | phase explanation plus current-position guidance | treat as explanatory reference, not execution control |

Lane A should reduce risk through registry/routing first, not by rewriting these docs in this wave.

---

## 3. Archive Candidates

### 3.1 Already superseded and should not appear as active work docs

| Document | Current reality | Recommended action | Reason |
|----------|-----------------|--------------------|--------|
| [MVP-EXECUTION-QUEUE.md](/D:/Rune%20Weaver/docs/MVP-EXECUTION-QUEUE.md) | already marked `Superseded` and points to archive | classify as archive-only; optionally remove from root `docs/` later or explicitly mark as redirect stub | it is no longer an execution queue |
| [TASK-COMPLETION.md](/D:/Rune%20Weaver/docs/TASK-COMPLETION.md) | already marked `Superseded` and points to archive | classify as archive-only; optionally remove from root `docs/` later or explicitly mark as redirect stub | it is no longer a current tracker |

### 3.1a Archived in the current control-plane pass

| Document set | Current reality | Applied action | Reason |
|--------------|-----------------|----------------|--------|
| superseded `docs/session-sync/dota2-mainline-*` and `docs/session-sync/war3-mainline-*` notes | older lane snapshots were still visible beside current live coordination docs | moved to [archive/docs/2026-04-session-sync-history/README.md](/D:/Rune%20Weaver/archive/docs/2026-04-session-sync-history/README.md) | prevents workers from treating older step/blocker notes as parallel live plans |

### 3.1b Root cleanup and host classification applied

| Change | Applied action | Reason |
|--------|----------------|--------|
| Dota2-only root docs | moved under [docs/hosts/dota2](/D:/Rune%20Weaver/docs/hosts/dota2) and registered through the control plane | keeps `docs/` root focused on cross-host control and baseline surfaces |
| War3-only root docs | moved under [docs/hosts/war3](/D:/Rune%20Weaver/docs/hosts/war3) and registered through the control plane | prevents host-specific planning/reference docs from competing with cross-host baseline docs in the root |
| superseded root planning docs | moved to [archive/docs/2026-04-root-doc-cleanup/README.md](/D:/Rune%20Weaver/archive/docs/2026-04-root-doc-cleanup/README.md) | removes obsolete secondary execution queues from the active root-doc surface |

### 3.2 Important nuance

These two files are not harmful because they already redirect readers away from old truth.
The problem is discoverability noise:

- they still live in `docs/`
- they still look like live docs in directory listings
- they can mislead future agents into believing there are multiple queue/tracker sources

Recommended rule:

- if the team wants redirect stubs, keep them but explicitly call them `redirect stub / archive shim`
- otherwise remove them from `docs/` and rely on archive README plus root [INDEX.md](/D:/Rune%20Weaver/INDEX.md)

---

## 4. Update Candidates

### 4.1 Must update soon

| Document | Current issue | Why it matters | Recommended treatment |
|----------|---------------|----------------|-----------------------|
| [WIZARD-BLUEPRINT-CHAIN.md](/D:/Rune%20Weaver/docs/WIZARD-BLUEPRINT-CHAIN.md) | refreshed under main-controller merge | old minimal chain no longer governs current reading risk | keep as current active reference and re-audit only if blueprint boundary changes again |
| [LLM-INTEGRATION.md](/D:/Rune%20Weaver/docs/LLM-INTEGRATION.md) | refreshed under main-controller merge | old provider-only framing no longer governs current reading risk | keep as current active reference and re-audit only if LLM authority boundary changes again |
| [ROADMAP.md](/D:/Rune%20Weaver/docs/ROADMAP.md) | planning doc now has metadata, but current-step language may still lag fresh session-sync truth | roadmap claims can still leak into worker heuristics if freshness is assumed | keep planning-only and mark `needs-refresh` in the registry until phase/current-state text is tightened |
| [PHASE-ROADMAP-ZH.md](/D:/Rune%20Weaver/docs/PHASE-ROADMAP-ZH.md) | planning doc now has metadata, but current-position language may still lag fresh session-sync truth | Chinese phase framing can still be misread as current-step truth | keep planning-only and mark `needs-refresh` in the registry until current-position wording is tightened |

### 4.1a Refreshed in the current control-plane pass

| Document | Refresh outcome | Governance note |
|----------|-----------------|-----------------|
| [CURRENT-EXECUTION-PLAN.md](/D:/Rune%20Weaver/docs/CURRENT-EXECUTION-PLAN.md) | refreshed against 2026-04-14 Dota2 session-sync truth | keep authoritative, but pair with fresh session-sync / shared plan when same-day status matters |
| [HANDOFF.md](/D:/Rune%20Weaver/docs/HANDOFF.md) | refreshed against the current Gap Fill productization slice | keep authoritative as operational entry, but not as the only current-step source |
| [RW-SHARED-PLAN.md](/D:/Rune%20Weaver/docs/session-sync/RW-SHARED-PLAN.md) | promoted into active control-plane discoverability | treat as the freshest cross-track coordination surface |
| [SESSION-SYNC-PROTOCOL.md](/D:/Rune%20Weaver/docs/session-sync/SESSION-SYNC-PROTOCOL.md) | promoted into active control-plane discoverability | treat as the rulebook for session-sync and shared-plan maintenance |

### 4.2 Update after architecture changes land

| Document | Why it will need follow-up |
|----------|----------------------------|
| [BLUEPRINT-CLI-USAGE.md](/D:/Rune%20Weaver/docs/BLUEPRINT-CLI-USAGE.md) | if blueprint gains proposal/normalization phases, CLI usage should explain deterministic final blueprint vs optional proposal aid |
| [SCHEMA.md](/D:/Rune%20Weaver/docs/SCHEMA.md) | intent schema and blueprint contracts will change if richer intent objects and normalizer contracts are added |
| [PATTERN-MODEL.md](/D:/Rune%20Weaver/docs/PATTERN-MODEL.md) | current pattern description likely needs capability/trait-based routing language |
| [BLUEPRINT-ORCHESTRATION-CONTRACT.md](/D:/Rune%20Weaver/docs/BLUEPRINT-ORCHESTRATION-CONTRACT.md) | if proposal/normalizer becomes official, the orchestration contract should say exactly where LLM is allowed to help |

---

## 5. Keep As Active Reference

These documents still look aligned with current work and should stay easy to discover:

- [DOCUMENT-GOVERNANCE.md](/D:/Rune%20Weaver/docs/DOCUMENT-GOVERNANCE.md)
- [AGENT-EXECUTION-BASELINE.md](/D:/Rune%20Weaver/docs/AGENT-EXECUTION-BASELINE.md)
- [HANDOFF.md](/D:/Rune%20Weaver/docs/HANDOFF.md)
- [CURRENT-EXECUTION-PLAN.md](/D:/Rune%20Weaver/docs/CURRENT-EXECUTION-PLAN.md)
- [ARCHITECTURE.md](/D:/Rune%20Weaver/docs/ARCHITECTURE.md)
- [WORKSPACE-MODEL.md](/D:/Rune%20Weaver/docs/WORKSPACE-MODEL.md)
- [RW-SHARED-PLAN.md](/D:/Rune%20Weaver/docs/session-sync/RW-SHARED-PLAN.md)
- [SESSION-SYNC-PROTOCOL.md](/D:/Rune%20Weaver/docs/session-sync/SESSION-SYNC-PROTOCOL.md)
- [HOST-REALIZATION-CONTRACT.md](/D:/Rune%20Weaver/docs/HOST-REALIZATION-CONTRACT.md)
- [GENERATOR-ROUTING-CONTRACT.md](/D:/Rune%20Weaver/docs/GENERATOR-ROUTING-CONTRACT.md)
- [PATTERN-PIPELINE.md](/D:/Rune%20Weaver/docs/PATTERN-PIPELINE.md)
- [PATTERN-SPEC.md](/D:/Rune%20Weaver/docs/PATTERN-SPEC.md)

These are not necessarily all authoritative, but they remain useful technical reference for the current implementation direction.

---

## 6. Recommended Cleanup Sequence

### Step 1

Reduce queue ambiguity first:

- keep [CURRENT-STATE-VS-TARGET.md](/D:/Rune%20Weaver/docs/CURRENT-STATE-VS-TARGET.md) out of execution routing until it is refreshed
- explicitly mark `MVP-EXECUTION-QUEUE.md` and `TASK-COMPLETION.md` as redirect stubs / ignore-for-execution in control docs
- make [INDEX.md](/D:/Rune%20Weaver/INDEX.md) point agents to registry/routing before broad reading
- make the session-sync control pair discoverable:
  - [RW-SHARED-PLAN.md](/D:/Rune%20Weaver/docs/session-sync/RW-SHARED-PLAN.md)
  - [SESSION-SYNC-PROTOCOL.md](/D:/Rune%20Weaver/docs/session-sync/SESSION-SYNC-PROTOCOL.md)

### Step 2

Normalize high-signal control metadata:

- add consistent header blocks to touched governance docs
- make registry freshness/action labels the place where `needs-refresh`, `planning-only`, and `ignore-for-execution` are decided
- make redirect stubs read as archive shims, not live docs

### Step 3

Fix architecture language next, under main-controller ownership:

- confirm refreshed [WIZARD-BLUEPRINT-CHAIN.md](/D:/Rune%20Weaver/docs/WIZARD-BLUEPRINT-CHAIN.md) still matches the accepted blueprint boundary after future baseline edits
- confirm refreshed [LLM-INTEGRATION.md](/D:/Rune%20Weaver/docs/LLM-INTEGRATION.md) still matches the accepted LLM authority boundary after future baseline edits

### Step 4

After the new intent/blueprint/pattern design is accepted:

- update [SCHEMA.md](/D:/Rune%20Weaver/docs/SCHEMA.md)
- update [PATTERN-MODEL.md](/D:/Rune%20Weaver/docs/PATTERN-MODEL.md)
- update [BLUEPRINT-CLI-USAGE.md](/D:/Rune%20Weaver/docs/BLUEPRINT-CLI-USAGE.md)

---

## 7. Lifecycle Actions To Apply

Use these governance actions when triaging docs in this audit:

| Action | When to use it | Current examples |
|--------|----------------|------------------|
| `create` | a new control/proposal doc is needed and no clean existing home exists | registry/routing/seam proposal docs |
| `promote` | a planning/reference doc becomes trusted current reference | future post-merge schema/pattern docs |
| `demote` | a doc remains useful but should no longer guide execution | [CURRENT-STATE-VS-TARGET.md](/D:/Rune%20Weaver/docs/CURRENT-STATE-VS-TARGET.md) until refreshed |
| `archive` | the doc no longer carries current execution value | old queue or tracker docs |
| `redirect-stub` | a navigation file is still useful but execution truth must be removed | [MVP-EXECUTION-QUEUE.md](/D:/Rune%20Weaver/docs/MVP-EXECUTION-QUEUE.md), [TASK-COMPLETION.md](/D:/Rune%20Weaver/docs/TASK-COMPLETION.md) |

Every action should update registry/routing in the same change when trust or read order changes.

---

## 8. Registry And Routing Coupling Rules

To keep docs from drifting apart again:

1. if a doc's trust changes, update [DOC-STATUS-REGISTRY.md](/D:/Rune%20Weaver/docs/DOC-STATUS-REGISTRY.md)
2. if a doc's task read order changes, update [AGENT-DOC-ROUTING.md](/D:/Rune%20Weaver/docs/AGENT-DOC-ROUTING.md)
3. if a doc becomes a redirect stub, remove it from must-read routes
4. if a doc is not in the registry, do not treat it as execution truth by default

This is the key anti-drift rule:

- routing tells agents where to go
- registry tells agents what they may trust there

Both have to move together.

---

## 9. Proposal Packet Coverage Status

The new proposal packet is now a governance concern because it increases the number of planning docs that can be mistaken for baseline truth.

Minimum control-plane rule:

- every proposal packet doc must be registered as `planning | current | planning-only`
- routing may mention proposal docs only inside planning-oriented task routes
- index may list proposal docs for discoverability, but must describe them as proposals rather than current execution truth

Current proposal packet families that need to stay coupled in control docs:

- intent / blueprint proposals
- pattern / realization / fill proposals
- cross-lane seam proposals

Planning caution:

- if future docs discuss merging Wizard UI intake/product flow into a larger Gap Fill surface, keep that as planning-only until a controller-owned baseline merge lands
- do not let exploratory Wizard UI / Gap Fill boundary changes leak into current execution truth by narrative drift alone

If any future proposal doc is added without registry coverage, treat that as a governance gap and stop before using it as task input.

---

## 10. Docs Health Check Requirement

Governance should not rely on memory alone.

A light docs health check should validate:

- required machine-readable headers exist on the minimum high-signal set
- registry links resolve to existing docs
- routing links resolve to existing docs
- routing does not send agents to redirect stubs as must-read execution truth

The current preferred machine-readable format is the existing blockquote header shape:

```md
> Status: ...
> Audience: ...
> Update cadence: ...
> Last verified: ...
> Read when: ...
> Do not use for: ...
```

No YAML frontmatter migration is required for this stage.

Current command:

- `npm run check:docs`

---

## 11. Current-State Demotion Recommendation

For [CURRENT-STATE-VS-TARGET.md](/D:/Rune%20Weaver/docs/CURRENT-STATE-VS-TARGET.md), the governance recommendation is now:

1. keep it only as a pure narrative comparison doc
2. keep it out of execution routing
3. archive it if packet-queue language or old execution authority leaks back in

Practical rule:

- do not let it drift back into a half-live state where humans read it as current status truth

Its allowed role is now:

- narrative comparison against target product shape

Its forbidden role remains:

- execution queue
- worker task ordering
- lifecycle baseline truth

---

## 11.1 Low-Frequency Staleness Rule

For high-signal low-frequency docs such as [CURRENT-EXECUTION-PLAN.md](/D:/Rune%20Weaver/docs/CURRENT-EXECUTION-PLAN.md) and [HANDOFF.md](/D:/Rune%20Weaver/docs/HANDOFF.md):

1. if the latest same-day session-sync changes the current step or blocker materially, refresh the low-frequency doc quickly
2. if the doc cannot be refreshed quickly, mark it `needs-refresh` in the registry rather than letting stale current-step language linger
3. if a doc keeps drifting and no longer adds unique control value, narrow it further or archive/split it instead of leaving a second stale queue surface

For the `docs/session-sync/` streams:

- only the latest Dota2 note and latest War3 note should guide orchestration freshness
- older notes are historical snapshots, not parallel live plans

---

## 12. Minimum Header Queue

The minimum machine-readable header set should cover:

- [README.md](/D:/Rune%20Weaver/README.md)
- [AGENT-EXECUTION-BASELINE.md](/D:/Rune%20Weaver/docs/AGENT-EXECUTION-BASELINE.md)
- [AGENT-TASK-CONTRACT.md](/D:/Rune%20Weaver/docs/AGENT-TASK-CONTRACT.md)
- [AUTONOMOUS-DEVELOPMENT-POLICY.md](/D:/Rune%20Weaver/docs/AUTONOMOUS-DEVELOPMENT-POLICY.md)
- [HANDOFF.md](/D:/Rune%20Weaver/docs/HANDOFF.md)
- [CURRENT-EXECUTION-PLAN.md](/D:/Rune%20Weaver/docs/CURRENT-EXECUTION-PLAN.md)
- [ARCHITECTURE.md](/D:/Rune%20Weaver/docs/ARCHITECTURE.md)
- [WORKSPACE-MODEL.md](/D:/Rune%20Weaver/docs/WORKSPACE-MODEL.md)
- [ACCEPTANCE-CHECKLISTS.md](/D:/Rune%20Weaver/docs/ACCEPTANCE-CHECKLISTS.md)
- [ACCEPTANCE-EVIDENCE-TEMPLATE.md](/D:/Rune%20Weaver/docs/ACCEPTANCE-EVIDENCE-TEMPLATE.md)

This is a minimum queue, not a ban on adding headers elsewhere.

---

## 13. Practical Decision

If only one cleanup wave can be afforded right now, the highest-value order is:

1. [CURRENT-STATE-VS-TARGET.md](/D:/Rune%20Weaver/docs/CURRENT-STATE-VS-TARGET.md)
2. [SCHEMA.md](/D:/Rune%20Weaver/docs/SCHEMA.md)
3. [PATTERN-MODEL.md](/D:/Rune%20Weaver/docs/PATTERN-MODEL.md)

That order first removes execution confusion, then removes architecture confusion, then aligns detailed contracts.

---

## 14. Header Normalization Queue

High-signal docs that should receive the compact governance header the next time they are meaningfully edited:

- [HANDOFF.md](/D:/Rune%20Weaver/docs/HANDOFF.md)
- [RW-MAINLINE-ORCHESTRATION-PLAN.md](/D:/Rune%20Weaver/docs/RW-MAINLINE-ORCHESTRATION-PLAN.md)
- [CURRENT-STATE-VS-TARGET.md](/D:/Rune%20Weaver/docs/CURRENT-STATE-VS-TARGET.md)
- [PRODUCT.md](/D:/Rune%20Weaver/docs/PRODUCT.md)
- [ROADMAP.md](/D:/Rune%20Weaver/docs/ROADMAP.md)
- [PHASE-ROADMAP-ZH.md](/D:/Rune%20Weaver/docs/PHASE-ROADMAP-ZH.md)

This is a governance queue, not a request to rewrite their architecture content in Lane A.
