# Blueprint CLI Usage

> Status: active-reference
> Audience: agents
> Doc family: contract
> Update cadence: on-contract-change
> Last verified: 2026-04-20
> Read when: using the standalone `blueprint` CLI directly
> Do not use for: Dota2 mainline lifecycle truth or as a substitute for `apps/cli/dota2/*`

## Purpose

This document describes the standalone `blueprint` CLI module in
[blueprint-cli.ts](/D:/Rune%20Weaver/apps/cli/blueprint-cli.ts).

It is a narrow tool for:

- running Wizard -> Blueprint generation outside the full Dota2 pipeline
- loading an existing `IntentSchema` file and building a `Blueprint`
- validating an existing `Blueprint` file with the standalone validator

It is not the current Dota2 mainline entrypoint.
For Dota2 planning / write-path truth, prefer:

- [ARCHITECTURE.md](/D:/Rune%20Weaver/docs/ARCHITECTURE.md)
- [WIZARD-BLUEPRINT-CHAIN.md](/D:/Rune%20Weaver/docs/WIZARD-BLUEPRINT-CHAIN.md)
- [DOTA2-V2-GOVERNANCE-FIRST-ARCHITECTURE.md](/D:/Rune%20Weaver/docs/hosts/dota2/DOTA2-V2-GOVERNANCE-FIRST-ARCHITECTURE.md)

## Commands

```text
blueprint "<request>"
blueprint --from <intent-schema-file>
blueprint validate --from <blueprint-file>
```

Current meanings:

- `blueprint "<request>"`
  - runs Wizard, then builds a standalone `Blueprint`, then validates it
- `blueprint --from <intent-schema-file>`
  - skips Wizard and builds from an existing `IntentSchema`
- `blueprint validate --from <blueprint-file>`
  - validates an existing `Blueprint` file only

## Current Output Semantics

The standalone CLI currently returns these top-level statuses:

- `success`
  - build succeeded and standalone validation passed
- `validation_error`
  - a `Blueprint` was built or loaded, but validation did not pass cleanly
- `execution_error`
  - command execution failed before a usable result was produced

Important current truth:

- this CLI may still include `clarificationPlan` as a sidecar when Wizard surfaced questions
- it does not expose a separate `schema_not_ready` status in the current implementation
- it is therefore not a faithful model of the newer Dota2 staged clarification authority

## JSON Shape

The current JSON output is centered on these fields:

```json
{
  "status": "success | validation_error | execution_error",
  "schema": {},
  "clarificationPlan": {},
  "blueprint": {},
  "validation": {},
  "reviewArtifact": {},
  "message": "...",
  "issues": []
}
```

Field notes:

- `schema`
  - present for generate flows
- `clarificationPlan`
  - Wizard sidecar only; not final authority
- `blueprint`
  - standalone builder output
- `validation`
  - standalone validator result
- `reviewArtifact`
  - standalone review artifact emitted by the blueprint CLI

## Boundary Rules

- This CLI is a standalone inspection / generation tool.
- It does not run Pattern Resolution, Assembly, Host Realization, Generator Routing, WritePlan, LocalRepair, or Final CommitDecision.
- `readyForAssembly` or standalone validation success here must not be treated as equivalent to Dota2 write readiness.
- Clarification sidecars here are informative, but the current Dota2 mainline clarification authority lives in the staged `blocksBlueprint / blocksWrite` seam documented in [WIZARD-BLUEPRINT-CHAIN.md](/D:/Rune%20Weaver/docs/WIZARD-BLUEPRINT-CHAIN.md).

## Examples

```text
npm run cli -- blueprint "做一个按Q键触发的局内冲刺技能"
npm run cli -- blueprint --from tmp/intent-schema.json
npm run cli -- blueprint validate --from tmp/blueprint.json
```

## Compatibility Note

This doc intentionally describes the standalone `blueprint` CLI as it exists today.

It does not claim that the standalone CLI has already absorbed:

- `IntentGovernanceDecisions` downstream consumption
- Dota2 `WizardClarificationAuthority` staging
- Dota2 final commit / write-path gating

Those remain documented in the baseline and Dota2-specific docs listed above.
