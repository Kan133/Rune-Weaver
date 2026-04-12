# Feature Semantic State Contract

## Status

Phase 2 only.

Not implemented.

This document is a future contract, not a description of current shipped capability.

## Purpose

This document defines the future contract for `Feature Semantic State`.

Its purpose is to describe the missing foundation required for true semantic incremental update.

This is a Phase 2 contract.

It should guide architecture and planning now, even though the project should not yet claim full implementation.

## Problem Statement

Current workspace state can track:

- feature identity
- generated files
- entry bindings
- revision
- selected patterns

This is enough for:

- create
- update
- regenerate
- rollback

at a maintenance level.

It is not enough for semantic update requests such as:

- add one more talent to an existing talent system
- add a new inventory-style UI panel to an existing feature
- add a synthesis rule between existing entities

Those require the system to understand the internal semantic structure of a feature.

## Role In Future Pipeline

`Feature Semantic State` should become an additional structured input for maintenance and semantic update flows.

The intended future shape is:

`Prompt + Existing Feature Context + Feature Semantic State -> Update Intent -> Planning`

This does not replace workspace state.

It enriches it.

## Scope

Feature Semantic State should represent:

- what meaningful entities exist inside a feature
- what structural modules those entities belong to
- which entities are additive extension points
- which entities connect gameplay, UI, or rule logic

It should not become:

- a full arbitrary source-of-truth clone of all generated code
- a generic AST database
- a general-purpose project graph for every host file

## Core Principle

Feature Semantic State exists to support semantic addressing.

It should allow the system to answer questions such as:

- what is the main selection pool in this feature?
- does this feature already have a UI inventory surface?
- where should a new talent entry attach?
- where do synthesis rules belong?

without re-deriving the entire feature only from files each time.

## Required Capabilities

A useful Feature Semantic State should eventually support:

- stable entity identities
- entity kinds
- entity-to-module mapping
- entity-to-output mapping
- known extension points
- conservative semantic references for update planning

## Minimal Future Shape

The exact schema may evolve, but a useful v1 direction is:

```ts
interface FeatureSemanticState {
  featureId: string;
  revision: number;
  entities: FeatureSemanticEntity[];
  extensionPoints: FeatureExtensionPoint[];
  notes?: string[];
}

interface FeatureSemanticEntity {
  id: string;
  kind: string;
  moduleId?: string;
  relatedPatternIds?: string[];
  relatedOutputs?: string[];
  role?: string;
}

interface FeatureExtensionPoint {
  id: string;
  kind: string;
  targetEntityId?: string;
  allowedChanges: string[];
}
```

## Example Use Cases

### Talent System

A talent system might eventually expose semantic entities such as:

- `talent_pool_main`
- `talent_inventory_ui`
- `talent_fusion_rules`
- `talent_entry_fire_burst`

This would allow the update system to reason about:

- adding a new talent entry
- adding a new UI inventory surface
- adding a new synthesis rule

without pretending every change is just a file diff.

## Relationship To Workspace State

Workspace state and Feature Semantic State should remain distinct.

### Workspace State

Tracks:

- lifecycle ownership
- generated files
- bindings
- revision
- write-level maintenance information

### Feature Semantic State

Tracks:

- internal semantic structure
- stable feature entities
- additive extension points
- semantic update targets

Workspace state answers:

- what this feature owns

Feature semantic state answers:

- what this feature means internally

## Relationship To Update Intent

Feature Semantic State is not the same as update intent.

It provides context for update intent.

The future update pipeline should distinguish:

- what already exists
- what the user wants to add/change/remove
- where that change should attach

## Phase Boundary

This contract is intentionally Phase 2.

The project should not currently claim that Feature Semantic State is already implemented just because workspace state exists.

## Validation Guidance

A useful future Feature Semantic State should be:

- conservative
- stable enough for review
- explicitly scoped to one feature
- sufficient for semantic update planning

A bad Feature Semantic State would:

- duplicate arbitrary code structure without semantic meaning
- become too broad to maintain
- invent entity structure the system cannot actually track

## Non-Goals

This contract does not currently require:

- full implementation
- automatic semantic extraction for every existing feature
- full entity graph diffing
- complete update automation

Its role right now is to define the missing foundation that Phase 2 depends on.

## Open Points

These should be refined later:

- exact entity taxonomy
- how extension points are modeled
- how much of this should be persisted in workspace vs a separate semantic state file
- how semantic state is refreshed after regenerate
- how semantic state participates in rollback
