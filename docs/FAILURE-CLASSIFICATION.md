# Failure Classification

## Status

This document defines how subsequent agents should classify and report failures during Rune Weaver canonical case execution and Packet A/B/C/D verification.

Use this classification when a verification check fails or an operation does not produce the expected outcome.

---

## Classification Taxonomy

Every failure must be classified into exactly one of the following categories:

| Category Code | Category Name | Definition |
|--------------|--------------|------------|
| `F1` | implementation bug | Code exists but produces incorrect behavior |
| `F2` | validation gap | Code path lacks a required check or guard |
| `F3` | environment / config issue | Environment setup, dependencies, or configuration prevents correct behavior |
| `F4` | host limitation | The host (Dota2) has a constraint that blocks the expected behavior |
| `F5` | out of scope | The failure is about a feature not required for the current MVP |
| `F6` | blocked by Packet A | Cannot proceed because Packet A deliverable is not ready |

---

## F1: Implementation Bug

**Definition**: The code path exists and runs, but the output is incorrect or incomplete.

**Indicators**:
- Command exits with code 0 but output is wrong
- Workspace record is created but fields are incorrect (e.g., `selectedPatterns` is empty)
- Files are written but contents are wrong
- `featureId` changes unexpectedly during update
- `revision` does not increment on update

**Examples**:
- Create writes a workspace record but `generatedFiles` is an empty array despite files being written
- Update modifies the wrong file (cross-feature pollution)
- Delete removes the workspace record but leaves files on disk

**Required Action**:
- Document the incorrect behavior with evidence
- Do not claim the operation succeeded
- Assign to the team owning the implementation

---

## F2: Validation Gap

**Definition**: A required check is missing from the code path, allowing invalid state to be recorded or written.

**Indicators**:
- No error raised when a conflict exists
- No error raised when `featureId` would change
- No error raised when files would be written outside Rune Weaver-owned directories
- Governance returns `proceed` despite a detected conflict

**Examples**:
- Pre-write ownership check is absent — two features can claim the same file
- Bridge contention check is absent — duplicate key bindings are not detected
- Update does not verify `featureId` is preserved

**Required Action**:
- Document which validation check is missing
- Mark as blocking for the relevant packet
- Do not proceed until the gap is closed

---

## F3: Environment / Config Issue

**Definition**: The execution environment or project configuration prevents correct behavior.

**Indicators**:
- Missing dependencies (`npm install` not run)
- TypeScript compilation errors
- Host adapter not initialized
- Workspace file path does not exist or is not writable
- Permission errors on file writes

**Examples**:
- `npm run workbench` fails because `node_modules` is not installed
- Workspace file cannot be created because the directory does not exist
- Bridge export fails because `apps/workbench-ui/public/` does not exist

**Required Action**:
- Document the environment or config issue
- Distinguish from implementation bugs (the code is correct, environment is not)
- Provide reproduction steps including environment state

---

## F4: Host Limitation

**Definition**: The target host (Dota2) has a technical constraint that prevents the expected behavior, even though the code is correct.

**Indicators**:
- Rune Weaver code is correct but Dota2 rejects the output (e.g., KV format incompatibility)
- File written correctly but host cannot load it due to path/structure constraints
- UI component generated correctly but Panorama cannot render it due to host limitations

**Examples**:
- Generated KV file uses a Dota2-unsupported key name
- Lua file uses a Dota2 API not available in the current game version
- UI panel uses a Panorama feature not supported in the current workshop tools version

**Required Action**:
- Document the host limitation with evidence (e.g., Dota2 error message or documentation reference)
- Distinguish from implementation bugs (code is correct, host is the constraint)
- Mark as non-blocking for Rune Weaver implementation; escalate to host adapter team

---

## F5: Out of Scope

**Definition**: The failure involves functionality explicitly deferred for the current MVP.

**Indicators**:
- Failure involves `regenerate` or `rollback`
- Failure involves semantic incremental update
- Failure involves second host support
- Failure involves broad UI/workbench platformization

**Examples**:
- `regenerate` command does not work — deferred for future packet
- Update does not do semantic incremental diff — not in current scope
- Second host (Warcraft3) adapter is incomplete — not in current scope

**Required Action**:
- Classify as `F5: out of scope`
- Do not block Packet A/B/C/D progress
- Record in deferred backlog

---

## F6: Blocked by Packet A

**Definition**: Cannot proceed with verification because a prerequisite from Packet A is not yet complete.

**Indicators**:
- Workspace fields are not truthful after create (Packet A incomplete)
- `selectedPatterns` is always empty or mock (Packet A not connecting pattern resolution)
- `generatedFiles` is always empty (Packet A not connecting generation)

**Examples**:
- Running C-01 (create) but workspace shows empty `selectedPatterns` — Packet A pattern resolution not connected
- Running C-02 (update) but `featureId` is not preserved — Packet A identity tracking incomplete

**Required Action**:
- Classify as `F6: blocked by Packet A`
- Document which Packet A deliverable is missing
- Do not proceed with Packet B/C/D verification until Packet A is resolved
- Escalate to Packet A owner

---

## Report Format for Failures

When a failure occurs, the agent must report:

```
## Failure Report

Failure ID:       <unique sequential ID, e.g., F-001>
Case:             <C-01 through C-05 or ad-hoc>
Packet:           <A | B | C | D>
Timestamp:        <YYYY-MM-DD HH:MM:SS>

Classification:   <F1 | F2 | F3 | F4 | F5 | F6>
Category:         <implementation bug | validation gap | environment/config issue | host limitation | out of scope | blocked by Packet A>

Summary:          <one sentence describing the failure>

Evidence:
  - <evidence item 1>
  - <evidence item 2>

Expected behavior:
  <what should have happened>

Actual behavior:
  <what actually happened>

Impact:
  <does this block the current packet? does this block other packets?>

Required action:
  <what must be done to resolve>

Owner:
  <team or agent responsible for resolution>
```

---

## Non-Functional Failure Modes (Do Not Classify as Failures)

The following are **not** failures and do not need classification:

- `regenerate` not implemented — F5 (out of scope)
- `rollback` not implemented — F5 (out of scope)
- Semantic incremental update not implemented — F5 (out of scope)
- Second host support — F5 (out of scope)
- UI workbench platformization — F5 (out of scope)

Agents must not use vague expressions like "failed but not important" or "partial success" — every failure must be classified.

---

## Classification Decision Tree

```
Is the operation blocked by a missing Packet A deliverable?
  → YES: F6 (blocked by Packet A)

Is the failure about a feature explicitly deferred (regenerate, rollback, semantic update, second host)?
  → YES: F5 (out of scope)

Is the code path correct but the host (Dota2) cannot accept the output?
  → YES: F4 (host limitation)

Is the execution environment preventing correct behavior (missing deps, config, permissions)?
  → YES: F3 (environment/config issue)

Is a required validation check missing from the code path?
  → YES: F2 (validation gap)

Does the code exist and run but produce incorrect output?
  → YES: F1 (implementation bug)
```
