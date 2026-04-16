# Rune Weaver Agent Rules

This file is the repo-level permanent rule set for agents working in this workspace.

It is intentionally short.
Use it as a guardrail layer, not as a replacement for the authoritative docs.

## 1. Current Truth And Read Order

Same-day current truth comes from:

- [RW-SHARED-PLAN.md](/D:/Rune%20Weaver/docs/session-sync/RW-SHARED-PLAN.md)
- the latest relevant session-sync note under `D:\Rune Weaver\docs\session-sync\`

Do not treat README, HANDOFF, roadmap docs, or planning docs as the freshest blocker truth.

Current baseline truth comes from:

- [README.md](/D:/Rune%20Weaver/README.md)
- [AGENT-EXECUTION-BASELINE.md](/D:/Rune%20Weaver/docs/AGENT-EXECUTION-BASELINE.md)
- [CURRENT-EXECUTION-PLAN.md](/D:/Rune%20Weaver/docs/CURRENT-EXECUTION-PLAN.md)
- [ARCHITECTURE.md](/D:/Rune%20Weaver/docs/ARCHITECTURE.md)
- [WORKSPACE-MODEL.md](/D:/Rune%20Weaver/docs/WORKSPACE-MODEL.md)

Planning docs must not override baseline truth unless the baseline docs are explicitly updated.

## 2. High-Signal Docs Rule

If you touch a high-signal doc, first read:

- [DOCUMENT-GOVERNANCE.md](/D:/Rune%20Weaver/docs/DOCUMENT-GOVERNANCE.md)
- [DOC-STATUS-REGISTRY.md](/D:/Rune%20Weaver/docs/DOC-STATUS-REGISTRY.md)
- [AGENT-DOC-ROUTING.md](/D:/Rune%20Weaver/docs/AGENT-DOC-ROUTING.md)
- [RW-SHARED-PLAN.md](/D:/Rune%20Weaver/docs/session-sync/RW-SHARED-PLAN.md)

If a high-signal doc changes, evaluate these companion deltas in the same task:

- registry delta
- routing delta
- index delta
- archive or redirect delta when relevant

Do not leave a root-level `docs/*.md` high-signal file unregistered.

Do not create a new root-level `docs/*.md` file unless you can explain why it cannot live under:

- `docs/hosts/**`
- `docs/planning/**`
- `archive/**`

## 3. Session-Sync Discipline

After meaningful Dota2 or War3 progress, update the relevant session-sync note.

If current step or blocker truth changed, refresh:

1. [RW-SHARED-PLAN.md](/D:/Rune%20Weaver/docs/session-sync/RW-SHARED-PLAN.md)
2. lower-frequency control docs that still summarize that truth

Do not update low-frequency control docs first and hope session-sync catches up later.

The live `docs/session-sync/` set should contain only:

- latest Dota2 mainline note
- latest War3 mainline note
- [RW-SHARED-PLAN.md](/D:/Rune%20Weaver/docs/session-sync/RW-SHARED-PLAN.md)
- [SESSION-SYNC-PROTOCOL.md](/D:/Rune%20Weaver/docs/session-sync/SESSION-SYNC-PROTOCOL.md)

## 4. Reporting Rule

If a task touches high-signal docs, the report must include:

- `decisions made`
- `files changed`
- `status/freshness/action decision`
- `registry/routing/index impact`
- `archive or redirect impact`
- `what remains planning-only`

If these fields are missing, treat the docs work as incomplete.

## 5. Validation Rule

If you changed docs governance, doc placement, routing, registry, session-sync control docs, or other high-signal docs, run:

- `npm run check:docs`

If you changed architecture planning docs or shared planning seams, also run:

- `npm run check:plans`

## 6. Windows And Subagent Safety

When reading files in Windows PowerShell, assume UTF-8 output can be mis-decoded unless explicitly configured.

If file contents appear garbled, re-read the file in an explicitly UTF-8-configured PowerShell session before trusting the result.

Do not report formatting or documentation corruption based on garbled PowerShell output.

When using subagents in Codex Desktop on Windows:

- prefer file reads and bounded file edits only
- do not use subagents for shell commands, builds, package managers, git push/pull, or external CLIs unless explicitly asked

Default split:

- main agent: shell commands, builds, tests, git, long-running processes, external tools
- subagents: code reading, narrow analysis, and bounded file edits inside the workspace
