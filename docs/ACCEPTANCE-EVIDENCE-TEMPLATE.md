# Acceptance Evidence Template

> Status: active-reference
> Audience: agents
> Doc family: contract
> Update cadence: on-phase-change
> Last verified: 2026-04-14
> Read when: writing or reviewing acceptance evidence reports
> Do not use for: deciding product scope, architecture, or execution priority

## Status

This document provides a uniform evidence template for Rune Weaver canonical case execution reports.

All subsequent agent reports for Packet A/B/C/D verification must use this template.

---

## Template: Canonical Case Execution Report

```
====================================================================
RUNE WEAVER — CANONICAL CASE EXECUTION REPORT
====================================================================

## 1. Case Identification

Case ID:           <e.g., C-01>
Case Name:         <e.g., Micro-Feature Create (Dash Skill)>
Canonical Case:    <link to CANONICAL-ACCEPTANCE-CASES.md#C-XX>
Packet:            <A | B | C | D | E>
Agent:             <name or ID of agent executing>
Execution Date:    <YYYY-MM-DD HH:MM:SS>

====================================================================
## 2. Commands Run

Command 1: <full command string>
  Working directory: <cwd>
  Exit code: <0 | non-zero>
  Output (last 50 lines):
  <stdout/stderr excerpt>

Command 2: <full command string>
  Working directory: <cwd>
  Exit code: <0 | non-zero>
  Output (last 50 lines):
  <stdout/stderr excerpt>

====================================================================
## 3. Workspace State

### 3.1 Workspace File Path
  <absolute path to workspace JSON>

### 3.2 Feature Record (relevant excerpt)

  Feature ID:       <featureId>
  Blueprint ID:      <blueprintId>
  Status:            <active | disabled | archived>
  Revision:          <number>
  Created At:        <ISO timestamp>
  Updated At:        <ISO timestamp>

  Selected Patterns (<count>):
    - <patternId 1>
    - <patternId 2>
    ...

  Generated Files (<count>):
    - <file path 1>
    - <file path 2>
    ...

  Entry Bindings (<count>):
    - target: <server | ui | config>
      file:   <file path>
      kind:   <import | register | mount | append_index>
      symbol: <symbol name if applicable>
    ...

====================================================================
## 4. Generated Files Evidence

File: <absolute path 1>
  Exists:    <yes | no>
  Size:      <bytes>
  Modified:  <YYYY-MM-DD HH:MM:SS>

File: <absolute path 2>
  Exists:    <yes | no>
  Size:      <bytes>
  Modified:  <YYYY-MM-DD HH:MM:SS>

====================================================================
## 5. Bridge Evidence

### 5.1 Bridge Export
  File: apps/workbench-ui/public/bridge-workspace.json
  Feature bindings present: <yes | no>
  Relevant excerpt:
  <JSON excerpt showing this feature's bindings>

### 5.2 Approved Bridge Points Modified

  File: <e.g., content/panorama/src/hud/script.tsx>
  Modified: <yes | no>
  Relevant change:
  <diff or excerpt>

====================================================================
## 6. Host Truth Verification

  Rune Weaver-owned directories changed: <list of directories>
  Non-owned directories changed:         <list — must be EMPTY>
  Approved bridge points modified:      <yes | no — must be YES if UI involved>
  Unapproved paths touched:             <list — must be EMPTY>

====================================================================
## 7. Governance (if applicable)

  Conflict detected:    <yes | no | not applicable>
  Conflict kind:        <ownership_overlap | bridge_contention | ambiguous_target | delete_dependency | none>
  Recommended action:   <proceed | confirm | block>
  Block enforced:       <yes | no | not applicable>
  Confirmation provided: <yes | no | not applicable>

====================================================================
## 8. Comparison with Previous State (for update/delete)

  Previous featureId:  <id or N/A>
  Current featureId:   <id or N/A>
  ID preserved:        <yes | no | not applicable>
  Revision changed:    <N → N+1 | not applicable>
  Files unchanged:     <yes | no | not applicable>

====================================================================
## 9. Canonical Case Requirements Check

  [ ] featureId is non-empty stable string
  [ ] selectedPatterns is non-empty array
  [ ] generatedFiles is non-empty array
  [ ] entryBindings is non-empty array
  [ ] revision is correct for operation type
  [ ] status is correct for operation type
  [ ] timestamps are valid ISO strings
  [ ] All generatedFiles exist on disk
  [ ] All generatedFiles are non-empty
  [ ] All generatedFiles are in Rune Weaver-owned directories
  [ ] entryBindings reference only approved bridge points
  [ ] Bridge export reflects new/changed feature
  [ ] No non-owned paths were modified
  [ ] Governance enforced correctly

====================================================================
## 10. Final Conclusion

  OVERALL RESULT:  <PASS | FAIL>

  Pass conditions:
    - All [ ] items in section 9 are checked
    - No FAIL conditions from ACCEPTANCE-CHECKLISTS.md triggered
    - No non-owned paths touched
    - Governance result is consistent with actual behavior

  Summary: <one sentence stating the outcome>

  Blocking issues (if any):
    - <issue 1>
    - <issue 2>

  Deferred items (if any):
    - <item 1>

====================================================================
```

---

## Usage Instructions

### When to Use This Template

- After running any canonical case (C-01 through C-05)
- After completing any Packet A/B/C/D verification
- Before claiming a feature `create`/`update`/`delete` is complete

### How to Fill It

1. **Case Identification**: Copy from the canonical case definition.
2. **Commands Run**: Record every command executed. Include exit codes. Truncate long output but keep the last 50 lines.
3. **Workspace State**: Extract from `rune-weaver.workspace.json`. Include the relevant feature record excerpt.
4. **Generated Files Evidence**: List every file in `generatedFiles`. Mark `Exists: yes/no` and record `Size`.
5. **Bridge Evidence**: Show the bridge export content and which approved bridge points were modified.
6. **Host Truth**: Confirm that only Rune Weaver-owned directories were changed.
7. **Governance**: Record conflict detection results and whether the recommended action was enforced.
8. **Comparison**: For update/delete, show before/after state.
9. **Requirements Check**: Tick every box. Any unchecked item is a FAIL condition.
10. **Final Conclusion**: State PASS or FAIL with a one-sentence summary.

### Output Format

- File naming: `<case-id>-evidence-<YYYYMMDD>.txt` or embed in the agent's final report
- Location: Store alongside the session output in the agent's working directory
- Linking: Always link to the workspace file path used in section 3.1

---

## Quick Reference: PASS Conditions by Operation

| Operation | Critical Pass Conditions |
|-----------|-------------------------|
| `create` | featureId stable, generatedFiles non-empty + on disk, entryBindings non-empty, workspace record complete, no non-owned paths touched |
| `update` | featureId unchanged, revision incremented, generatedFiles paths unchanged, entryBindings unchanged, no cross-feature pollution |
| `delete` | feature absent/archived from workspace, generatedFiles removed from disk, bridge cleaned, no orphaned files |
| governance | conflict detected when present, no false negatives, recommendedAction enforced correctly |
