# Composite Blueprint Baseline

## Purpose

This document defines the minimal Blueprint baseline required before Rune Weaver can safely attempt composite feature work. It establishes what a composite feature Blueprint must contain at minimum, without claiming that composite features are fully implemented.

This is a planning baseline. It tells downstream implementation what structure to expect, but does not itself deliver the end-to-end capability.

## Current State

The system currently has:

- outputs migration early baseline with `outputs[]` in HostRealizationUnit
- `dota2.*` patterns surviving assembly construction
- minimal grouping contract via `BlueprintModule.patternIds[]`
- narrowed upstream grouping production rule (T152-R1)

The system does not yet have:

- complete composite feature implementation
- full grouping system beyond the contract
- cross-module dependency engine
- full CLI/host E2E for composite cases

## Problem Statement

### Why Single-Feature Blueprint Is Not Enough

A single-feature Blueprint assumes one module with one category and one set of outputs. This works for cases like "a dash ability" or "a selection modal".

Composite features like talent drafting require:

- Multiple modules (trigger, data, rule, ui, effect)
- Different category families in the same feature
- Potentially different outputs per module
- Explicit grouping to keep them as one logical unit

Without a Blueprint structure that supports multiple modules with explicit relationships, the system cannot express "these five patterns form one feature" reliably.

### Why Not Just Make "Talent Drafting" A Giant Pattern

The COMPOSITE-FEATURE-ARCHITECTURE document establishes that complex cases should be decomposed, not collapsed into one giant pattern.

If "talent drafting" becomes a single pattern, the system loses:

- Ability to reuse individual patterns in other contexts
- Clear routing to appropriate outputs per module
- Maintainable granularity for debugging and review
- Host portability (the pattern becomes Dota2-specific)

The correct approach is to decompose into modules that each map to existing core patterns.

## Minimal Composite Blueprint Structure

A composite feature Blueprint at minimum should contain:

### Multiple BlueprintModules

```ts
interface Blueprint {
  id: string;
  version: string;
  modules: BlueprintModule[];
  connections: BlueprintConnection[];
  patternHints: PatternHint[];
  // ... other fields
}
```

### Category Assignment

Each module has a category from the set:

- `trigger`: input handling
- `data`: data management
- `rule`: rule orchestration
- `ui`: user interface
- `effect`: game effect
- `resource`: resource management

For composite features, modules typically span multiple category families. A talent drafting example:

- Module A: category = "trigger" (key binding)
- Module B: category = "data" (weighted pool)
- Module C: category = "rule" (selection flow)
- Module D: category = "ui" (selection modal)
- Module E: category = "effect" (talent application)

### Explicit Grouping via patternIds[]

```ts
interface BlueprintModule {
  id: string;
  role: string;
  category: BlueprintModuleCategory;
  patternIds?: string[];
  responsibilities: string[];
}
```

The `patternIds[]` field declares which patterns belong to this module. This is the explicit grouping mechanism.

**Key rule**: `patternIds[]` is not a resolver override. It declares intent. The actual resolved patterns are the intersection of `patternIds[]` and the resolver's result. If `patternIds[]` is empty, category-based heuristics apply as fallback.

### Connections

```ts
interface BlueprintConnection {
  from: string;  // module id
  to: string;   // module id
  purpose: string;  // human-readable purpose
}
```

Connections express high-level relationships between modules. They are not a runtime dependency graph. They are documentation and orchestration hints.

Example connections for talent drafting:

- trigger -> rule: "activate selection flow"
- data -> rule: "provide weighted pool"
- rule -> ui: "drive modal display"
- rule -> effect: "apply selected talent"

## First Version Grouping Semantics

### What patternIds[] Means

When a module declares `patternIds: ["input.key_binding", "rule.selection_flow"]`:

- This module explicitly groups these two patterns
- Assembly will use this as the authoritative grouping
- Downstream layers (Realization, Routing) receive grouped patterns together

### Intersection Semantics

The grouping contract states:

```
finalPatterns = patternIds[] ∩ resolvedPatterns
```

This means:

- If module declares `patternIds: ["effect.dash"]` but resolver picks `effect.modifier_applier`, the module gets nothing (intersection is empty)
- This prevents Builder from overriding resolver decisions
- The safe pattern for polymorphic categories (effect, resource) is to leave patternIds empty, letting resolver decide

### Stable vs Polymorphic Categories

Categories divide into two groups:

**Stable (single-path)**:
- trigger -> input.key_binding
- data -> data.weighted_pool
- rule -> rule.selection_flow
- ui -> ui.selection_modal

**Polymorphic**:
- effect -> depends on semantic analysis (dash, buff, modifier, resource)
- resource -> depends on semantic analysis

For polymorphic categories, Builder should return `patternIds: []` (empty), allowing resolver to perform semantic disambiguation.

## First Version Connection Semantics

### What Connections Express

Connections are lightweight annotations:

- `from` / `to`: which modules relate
- `purpose`: human-readable intent (e.g., "trigger selection", "provide data")

### What Connections Do Not Express

Connections are NOT:

- A runtime dependency graph requiring topological sort
- A data flow contract
- A sequencing guarantee
- A dependency engine input

These are Phase 2+ concerns. The first version treats connections as documentation and orchestration hints only.

### Why This Is Enough

The first version needs to know "which modules belong together" and "what they do relative to each other". Connections provide this without requiring a full dependency system.

## In-Scope For First Version

The first version baseline should support:

- Blueprint with 2-5 modules from different category families
- Explicit grouping via `patternIds[]` at module level
- Category fallback when `patternIds[]` is not declared
- Connections as high-level orchestration hints
- Outputs-aware downstream compatibility (via HostRealizationUnit.outputs[])
- Single-layer grouping (no nested modules)

This is sufficient to:

- Express a composite feature like talent drafting structurally
- Provide grouping information to downstream layers
- Enable incremental improvement without rewriting

## Out-Scope For First Version

The first version explicitly does NOT support:

- Nested grouping (modules inside modules)
- Cross-module dependency graphs
- Dependency engine or topological ordering
- Full semantic entity models
- Pattern-level dependency declarations
- Complete composite feature E2E implementation
- Full CLI workflow for composite cases

These are Phase 2+ concerns. The baseline provides structure, not full capability.

## Why This Baseline Is Enough

This baseline does not implement composite features. It provides the structural foundation on which composite feature work can build.

The key value:

- **Structure**: Downstream implementation knows what Blueprint structure to expect
- **Grouping**: Explicit grouping mechanism is available without guessing
- **Compatibility**: Existing single-feature paths remain working
- **Extensibility**: Future enhancements build on this baseline, not around it

This is analogous to the relationship between COMPOSITE-FEATURE-ARCHITECTURE and actual implementation: the architecture says "how to think about composite features", and this baseline says "what the data structure looks like".

## Relationship To Other Documents

This document depends on:

- COMPOSITE-FEATURE-ARCHITECTURE: establishes that composite features should be decomposed
- BLUEPRINT-MODULE-GROUPING-CONTRACT: defines patternIds[] semantics
- MULTI-OUTPUT-REALIZATION-MIGRATION: establishes outputs[] model

This document provides:

- Concrete Blueprint structure expectations for composite cases
- Explicit in-scope / out-of-scope boundary
- Shared baseline for downstream implementation planning

## Boundary: What This Document Does Not Claim

This document does not claim:

- Composite features are implemented end-to-end
- Wizard produces composite Blueprints automatically
- Assembly fully handles multi-module cases
- Full E2E workflow exists for talent drafting

This document establishes:

- The minimum data structure a composite Blueprint should have
- What fields are available and what they mean
- What is explicitly not included in the first version

## Next Steps

Downstream work can use this baseline to:

- Plan Wizard enhancement for composite intent recognition
- Plan Assembly adaptation for multi-module handling
- Plan HostRealization evolution for multi-output per module
- Evaluate what additional fields, if any, the first version needs

This document is a shared reference point. It should not change frequently once accepted.
