# Technical Reference Layer

> Status: active-reference
> Audience: agents
> Doc family: control
> Update cadence: on-contract-change
> Last verified: 2026-04-14
> Read when: locating deeper implementation references after the baseline and routing docs are already understood
> Do not use for: top-level execution authority, replacing routing, or bypassing registry trust checks

## Purpose

This document groups the technical reference docs that remain active after the post-ABCD execution reset.

Use this layer when an agent already understands the current boundary and needs deeper implementation context for planning, realization, routing, generation, or host integration.

Read this only after:

1. [README.md](/D:/Rune%20Weaver/README.md)
2. [AGENT-EXECUTION-BASELINE.md](/D:/Rune%20Weaver/docs/AGENT-EXECUTION-BASELINE.md)
3. [AGENT-TASK-CONTRACT.md](/D:/Rune%20Weaver/docs/AGENT-TASK-CONTRACT.md)
4. [AUTONOMOUS-DEVELOPMENT-POLICY.md](/D:/Rune%20Weaver/docs/AUTONOMOUS-DEVELOPMENT-POLICY.md)
5. [HANDOFF.md](/D:/Rune%20Weaver/docs/HANDOFF.md)
6. [CURRENT-EXECUTION-PLAN.md](/D:/Rune%20Weaver/docs/CURRENT-EXECUTION-PLAN.md)

## Layer Roles

These docs are active technical references.

They are useful for:

- architectural boundaries
- stage responsibilities
- host realization policy
- generator ownership
- Dota2 host integration rules

They are not the current source of truth for:

- product completion status
- implementation priority
- acceptance scope

## Architecture

- [ARCHITECTURE.md](/D:/Rune%20Weaver/docs/ARCHITECTURE.md)
  - current layering and stage boundaries
- [SYSTEM-ARCHITECTURE-ZH.md](/D:/Rune%20Weaver/docs/SYSTEM-ARCHITECTURE-ZH.md)
  - higher-level product/system architecture reference

## Blueprint Layer

- [BLUEPRINT-ORCHESTRATION-CONTRACT.md](/D:/Rune%20Weaver/docs/BLUEPRINT-ORCHESTRATION-CONTRACT.md)
  - Blueprint stage responsibility and boundary
- [BLUEPRINT-PATTERN-RESOLUTION.md](/D:/Rune%20Weaver/docs/BLUEPRINT-PATTERN-RESOLUTION.md)
  - Blueprint-to-pattern resolution reference
- [BLUEPRINT-VALIDATION.md](/D:/Rune%20Weaver/docs/BLUEPRINT-VALIDATION.md)
  - Blueprint validation and review expectations
- [BLUEPRINT-CLI-USAGE.md](/D:/Rune%20Weaver/docs/BLUEPRINT-CLI-USAGE.md)
  - operator-facing CLI usage reference

## Host Realization Layer

- [HOST-REALIZATION-CONTRACT.md](/D:/Rune%20Weaver/docs/HOST-REALIZATION-CONTRACT.md)
  - realization-layer responsibility
- [HOST-REALIZATION-SCHEMA.md](/D:/Rune%20Weaver/docs/HOST-REALIZATION-SCHEMA.md)
  - realization data shape reference
- [DOTA2-HOST-REALIZATION-POLICY.md](/D:/Rune%20Weaver/docs/hosts/dota2/DOTA2-HOST-REALIZATION-POLICY.md)
  - Dota2-specific realization policy
- [ASSEMBLY-HOST-MAPPING.md](/D:/Rune%20Weaver/docs/hosts/dota2/ASSEMBLY-HOST-MAPPING.md)
  - Assembly-to-host mapping detail
- [ASSEMBLY-REALIZATION-NOTES.md](/D:/Rune%20Weaver/docs/ASSEMBLY-REALIZATION-NOTES.md)
  - Assembly-to-realization bridge notes

## Generator Layer

- [GENERATOR-ROUTING-CONTRACT.md](/D:/Rune%20Weaver/docs/GENERATOR-ROUTING-CONTRACT.md)
  - routing ownership and multi-generator rule
- [GENERATOR-ROUTING-SCHEMA.md](/D:/Rune%20Weaver/docs/GENERATOR-ROUTING-SCHEMA.md)
  - routing data shape reference
- [DOTA2-KV-GENERATOR-SCOPE.md](/D:/Rune%20Weaver/docs/hosts/dota2/DOTA2-KV-GENERATOR-SCOPE.md)
  - KV generator boundary
- [DOTA2-TS-GENERATOR-BOUNDARY.md](/D:/Rune%20Weaver/docs/hosts/dota2/DOTA2-TS-GENERATOR-BOUNDARY.md)
  - TS generator boundary
- [DOTA2-TS-LUA-AUTHORING-PATHS.md](/D:/Rune%20Weaver/docs/hosts/dota2/DOTA2-TS-LUA-AUTHORING-PATHS.md)
  - TS/Lua authoring-path distinction

## Host Integration Layer

- [HOST-INTEGRATION-DOTA2.md](/D:/Rune%20Weaver/docs/hosts/dota2/HOST-INTEGRATION-DOTA2.md)
  - Dota2 host detection, ownership, and bridge rules
- [BRIDGE-UPDATE-PLANNING.md](/D:/Rune%20Weaver/docs/BRIDGE-UPDATE-PLANNING.md)
  - bridge update model reference

## Reading Rule

When these docs disagree with execution-baseline docs:

1. keep the technical boundary
2. drop the stale status claim
3. prefer current code and the execution baseline
