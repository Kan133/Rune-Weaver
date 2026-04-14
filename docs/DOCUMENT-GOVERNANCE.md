# Document Governance

## Purpose

Rune Weaver docs should be treated as an agent execution surface, not a general knowledge pile.

The default question for every doc is not:

- "Is this a nice explanation for humans?"

The default question is:

- "Can an agent reliably decide whether to read it, trust it, ignore it, or archive it?"

This file defines the rules that keep `docs/` usable for agents even as the repo grows.

---

## 1. Default Audience

The default audience for `docs/` is now:

- `agents-first`

Human readability still matters, but it is secondary to:

- routing clarity
- trust level clarity
- low ambiguity
- low drift
- easy archival

If a document is primarily for humans, it should say so near the top.

---

## 2. Core Control Docs

Agents should not scan `docs/` blindly.

Use these control docs first:

1. [INDEX.md](/D:/Rune%20Weaver/INDEX.md)
   - high-level repo entry
2. [DOC-STATUS-REGISTRY.md](/D:/Rune%20Weaver/docs/DOC-STATUS-REGISTRY.md)
   - current doc status truth
3. [AGENT-DOC-ROUTING.md](/D:/Rune%20Weaver/docs/AGENT-DOC-ROUTING.md)
   - which docs to read for which task class
4. [HANDOFF.md](/D:/Rune%20Weaver/docs/HANDOFF.md)
   - operational entry for active work

Rule:

- if a document is not clearly routed by the registry or routing docs, do not treat it as execution truth by default

---

## 3. Status Classes

Every document should fit one status class:

1. `authoritative`
   - current execution truth
   - safe to direct agent work
2. `active-reference`
   - useful technical context
   - may constrain design or implementation details
   - not the top-level execution queue
3. `planning`
   - target shape, proposal, or upgrade path
   - must not override shipped behavior or active baseline
4. `archive`
   - historical or superseded context only

Do not invent extra truth classes in individual docs.
If a doc needs a nuance such as "needs refresh" or "redirect stub", record that in [DOC-STATUS-REGISTRY.md](/D:/Rune%20Weaver/docs/DOC-STATUS-REGISTRY.md), not by inventing a fifth status family.

---

## 4. Required Header For New Or Touched Docs

All new docs, and older docs when they are next meaningfully edited, should include a compact header block near the top:

```md
> Status: authoritative | active-reference | planning | archive
> Audience: agents | humans | mixed
> Doc family: control | baseline | contract | planning | archive
> Update cadence: low-frequency | on-contract-change | on-phase-change | temporary
> Last verified: YYYY-MM-DD
> Read when: <task or decision type>
> Do not use for: <what this doc must not be used to decide>
```

Optional fields when useful:

```md
> Supersedes: <doc>
> Superseded by: <doc>
> Owner: <team or lane>
```

Why this exists:

- agents need trust metadata without reading the whole file
- stale docs are easier to identify
- planning docs stop pretending to be baseline truth

Header interpretation rules:

- `Status` is the only truth-status field inside the doc body
- `Doc family` says what job the doc is allowed to perform
- `Read when` should name a task class, not a vague topic area
- `Do not use for` should name the most dangerous likely misuse
- if a touched high-signal doc still lacks this header, route through [DOC-STATUS-REGISTRY.md](/D:/Rune%20Weaver/docs/DOC-STATUS-REGISTRY.md) before trusting it

Do not add registry-only labels such as `needs-refresh`, `planning-only`, `ignore-for-execution`, or `redirect-stub` into the header.
Those labels belong in [DOC-STATUS-REGISTRY.md](/D:/Rune%20Weaver/docs/DOC-STATUS-REGISTRY.md).

---

## 5. Doc Families

To reduce chaos, each doc should belong to one job family.

### 5.1 Control Docs

Examples:

- [INDEX.md](/D:/Rune%20Weaver/INDEX.md)
- [DOC-STATUS-REGISTRY.md](/D:/Rune%20Weaver/docs/DOC-STATUS-REGISTRY.md)
- [AGENT-DOC-ROUTING.md](/D:/Rune%20Weaver/docs/AGENT-DOC-ROUTING.md)
- [HANDOFF.md](/D:/Rune%20Weaver/docs/HANDOFF.md)

Job:

- help agents decide what to read and trust

### 5.2 Baseline Truth Docs

Examples:

- [AGENT-EXECUTION-BASELINE.md](/D:/Rune%20Weaver/docs/AGENT-EXECUTION-BASELINE.md)
- [CURRENT-EXECUTION-PLAN.md](/D:/Rune%20Weaver/docs/CURRENT-EXECUTION-PLAN.md)
- [ARCHITECTURE.md](/D:/Rune%20Weaver/docs/ARCHITECTURE.md)
- [WORKSPACE-MODEL.md](/D:/Rune%20Weaver/docs/WORKSPACE-MODEL.md)

Job:

- define current scope, current architecture, or current queue

### 5.3 Contract / Reference Docs

Examples:

- host realization
- generator routing
- pattern model
- acceptance or validation references

Job:

- explain a subsystem used by current implementation

### 5.4 Planning Docs

Examples:

- architecture update plans
- migration plans
- phase proposals

Job:

- propose change without claiming it is already true

### 5.5 Archive Docs

Job:

- preserve history without confusing current execution

Rule:

- redirect stubs belong to the `archive` family, even if they remain physically located in `docs/`
- a redirect stub must say that it is not live execution truth and must point to the current authoritative replacement

---

## 6. Anti-Staleness Rules

The repo gets stale when a single doc tries to be:

- current truth
- design essay
- status log
- migration plan
- future vision

at the same time.

To reduce drift, enforce these rules:

### 6.1 One Doc, One Job

Each doc should answer one primary question.

Bad:

- a file that mixes current baseline, future architecture, historical notes, and queue updates

Good:

- one current queue doc
- one architecture baseline doc
- one plan doc
- one archive copy

### 6.2 Separate Stable Docs From Volatile Docs

Low-frequency docs:

- architecture baseline
- orchestration guardrails
- workspace model
- governance rules

Higher-frequency docs:

- current execution plan
- handoff
- session-sync
- shared plan

Do not put high-churn status into low-frequency docs.

### 6.3 Prefer Event-Driven Updates Over Calendar Churn

Docs should update when one of these changes:

- active milestone or phase
- contract shape
- ownership boundary
- task routing
- superseding document

Do not rewrite docs just to keep them feeling fresh.
Rewrite them when the triggering fact changed.

### 6.4 Planning Docs Must Be Explicitly Non-Baseline

Planning docs must say:

- what they propose
- what they do not override
- what current truth still remains authoritative

### 6.5 Archive Superseded Docs Fast

When a doc stops directing current work:

- move it to `archive/`, or
- reduce it to a short redirect stub

Do not leave two long docs in `docs/` claiming the same responsibility.

### 6.6 Registry Beats Directory Listing

Agents should trust [DOC-STATUS-REGISTRY.md](/D:/Rune%20Weaver/docs/DOC-STATUS-REGISTRY.md) over raw `docs/` file presence.

Just because a file exists in `docs/` does not mean it is live execution truth.

### 6.7 Registry Labels Carry Execution Warnings

The registry may add execution labels without changing the doc's core status class.

Use them this way:

- `needs-refresh`
  - useful context may remain, but an agent should verify against authoritative docs before acting
- `planning-only`
  - read only when explicitly doing planning, not execution
- `ignore-for-execution`
  - safe to skip for implementation work
- `redirect-stub`
  - do not read past the redirect unless doing archive research

### 6.8 Touched Docs Must Re-register

If a touched doc changes any of these:

- status
- freshness
- routing role
- superseding relationship

then the same change should also update:

- [DOC-STATUS-REGISTRY.md](/D:/Rune%20Weaver/docs/DOC-STATUS-REGISTRY.md)
- [AGENT-DOC-ROUTING.md](/D:/Rune%20Weaver/docs/AGENT-DOC-ROUTING.md), if task routing changed

Do not let trust metadata drift behind content.

### 6.9 Governance Automation Beats Memory

The repo should keep a light docs health check that validates:

- required metadata headers exist
- required high-signal docs are registered
- routed docs exist
- redirect stubs are not treated as must-read execution truth

The current preferred format remains the blockquote header pattern.
Do not require YAML frontmatter just to achieve machine-readable governance checks.

### 6.10 Root Docs Must Be Registered Or Relocated

The `docs/` root is reserved for:

- control docs
- baseline docs
- cross-host contract/reference docs
- a small current set of cross-host planning docs

Every `docs/*.md` root file must be one of:

- registered in [DOC-STATUS-REGISTRY.md](/D:/Rune%20Weaver/docs/DOC-STATUS-REGISTRY.md), or
- moved to `docs/hosts/**`, `docs/planning/**`, or `archive/**`

Do not leave unregistered root docs sitting in `docs/` just because they "might still be useful."

### 6.11 Session-Sync Live Set Must Stay Small

`docs/session-sync/` is a live freshness surface, not a history bucket.

It should keep only:

- the latest Dota2 mainline note
- the latest War3 mainline note
- [RW-SHARED-PLAN.md](/D:/Rune%20Weaver/docs/session-sync/RW-SHARED-PLAN.md)
- [SESSION-SYNC-PROTOCOL.md](/D:/Rune%20Weaver/docs/session-sync/SESSION-SYNC-PROTOCOL.md)

Older session-sync notes belong in archive history buckets, not beside the live set.

---

## 7. Authoring Rules

When adding or updating a doc:

1. decide the status class first
2. decide the doc family second
3. state audience and update cadence near the top
4. say what the doc is for and what it is not for
5. if it is high-signal, add or refresh its registry entry in the same change
6. if it changes task read order, update [AGENT-DOC-ROUTING.md](/D:/Rune%20Weaver/docs/AGENT-DOC-ROUTING.md) in the same change
7. if it replaces another doc, say so explicitly using header metadata or a redirect line
8. archive or demote superseded docs instead of leaving parallel truths
9. if discoverability changed, update [INDEX.md](/D:/Rune%20Weaver/INDEX.md) in the same change
10. if the change archives, redirects, or relocates a doc, record the archive or relocation impact in the same change
11. run the docs health check if governance metadata, registry coverage, routing, or root-doc placement changed

Prefer these formats for agent utility:

- short sections
- status tables
- read-order lists
- explicit non-goals
- decision rules
- handoff packets

Avoid long narrative prose unless it is necessary for a difficult concept.

---

## 8. Reading Rules For Agents

When deciding what to read:

1. start with [AGENT-DOC-ROUTING.md](/D:/Rune%20Weaver/docs/AGENT-DOC-ROUTING.md)
2. verify doc status in [DOC-STATUS-REGISTRY.md](/D:/Rune%20Weaver/docs/DOC-STATUS-REGISTRY.md)
3. prefer the smallest task-relevant set of docs
4. do not recursively read the whole `docs/` tree unless the task is explicitly a documentation audit

Pause if:

- the registry does not classify a high-signal doc that appears necessary
- the only task-relevant docs are marked `planning-only` or `needs-refresh`
- a doc header claims one role but the registry routes it as another

When docs disagree:

1. prefer implementation reality
2. prefer authoritative docs over all others
3. prefer the status registry over raw file presence
4. treat planning docs as proposal, not command
5. treat archive docs as history only

---

## 9. Current Authoritative Set

For the current post-ABCD execution phase, the main authoritative set remains:

1. [README.md](/D:/Rune%20Weaver/README.md)
2. [AGENT-EXECUTION-BASELINE.md](/D:/Rune%20Weaver/docs/AGENT-EXECUTION-BASELINE.md)
3. [AGENT-TASK-CONTRACT.md](/D:/Rune%20Weaver/docs/AGENT-TASK-CONTRACT.md)
4. [AUTONOMOUS-DEVELOPMENT-POLICY.md](/D:/Rune%20Weaver/docs/AUTONOMOUS-DEVELOPMENT-POLICY.md)
5. [HANDOFF.md](/D:/Rune%20Weaver/docs/HANDOFF.md)
6. [CURRENT-EXECUTION-PLAN.md](/D:/Rune%20Weaver/docs/CURRENT-EXECUTION-PLAN.md)
7. [ARCHITECTURE.md](/D:/Rune%20Weaver/docs/ARCHITECTURE.md)
8. [WORKSPACE-MODEL.md](/D:/Rune%20Weaver/docs/WORKSPACE-MODEL.md)

This list should change rarely.
If it changes, [DOC-STATUS-REGISTRY.md](/D:/Rune%20Weaver/docs/DOC-STATUS-REGISTRY.md) and [AGENT-DOC-ROUTING.md](/D:/Rune%20Weaver/docs/AGENT-DOC-ROUTING.md) should be updated in the same change.

---

## 10. Current Archive Buckets

Current archive buckets remain:

- [archive/docs/2026-04-session-sync-history/README.md](/D:/Rune%20Weaver/archive/docs/2026-04-session-sync-history/README.md)
- [archive/docs/2026-04-mvp-reset/README.md](/D:/Rune%20Weaver/archive/docs/2026-04-mvp-reset/README.md)
- [archive/docs/2026-04-post-abcd-plan-reset/README.md](/D:/Rune%20Weaver/archive/docs/2026-04-post-abcd-plan-reset/README.md)

Use archive for:

- superseded queues
- superseded trackers
- old phase plans
- historical architecture exploration
- migration plans that no longer govern current work

---

## 11. Maintenance Rule

To keep `docs/` from becoming noisy again:

1. do not add a new doc if an existing control doc or contract doc can be updated cleanly
2. do not leave old queue docs beside the new queue
3. do not leave old chain diagrams beside the new chain
4. do not let planning docs silently become pseudo-authoritative
5. when in doubt, prefer:
   - smaller doc
   - clearer status
   - explicit routing
   - easier archival

The target state is not "more docs."
The target state is:

- fewer surprises
- clearer trust levels
- faster agent routing
- less drift

## 12. Lifecycle Actions

Use these lifecycle actions when changing doc status:

| Action | Meaning | Required follow-up |
|--------|---------|--------------------|
| `create` | add a new doc with a defined job and status | add header, registry entry, and routing entry if task-relevant |
| `promote` | move a doc toward stronger trust, for example planning -> active-reference | update registry, routing, and any superseded docs |
| `demote` | reduce trust, for example active-reference -> planning or needs-refresh | update registry and remove from must-read paths |
| `archive` | move a doc out of current execution use | archive or turn into redirect stub; remove from routing |
| `redirect-stub` | keep a short navigation file with no execution truth | register as archive + ignore-for-execution |

If an action cannot state its required follow-up, it is underspecified.
