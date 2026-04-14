# Blueprint Module Grouping Contract

## Purpose

This document defines the minimal grouping contract for future composite features. It establishes how multiple patterns can explicitly declare belonging to the same module, at the Blueprint layer, without requiring complex dependency systems.

This is a planning document, not an implementation claim. Current Phase 1 does not yet support explicit grouping.

## Current State

Rune Weaver currently uses category-based heuristics to group patterns into modules. This approach:

- Works for simple single-pattern cases
- Does not scale well for composite features that require multiple patterns from different category families
- Creates ambiguity when patterns cross category boundaries

The COMPOSITE-FEATURE-ARCHITECTURE document establishes that composite features like talent drafting should be decomposed into multiple modules, each containing one or more core patterns. This requires a more stable grouping mechanism.

## Problem Statement

### Why Category-Only Grouping Is Insufficient

Category-based grouping relies on pattern metadata like `category: "data"` or `category: "rule"`. This works when:

- Each module contains patterns from a single category family
- The mapping from user intent to category is unambiguous

This breaks down for composite features because:

- A talent drafting UI might combine `ui.selection_modal` (category: "ui") with `rule.selection_flow` (category: "rule") and `data.weighted_pool` (category: "data")
- Category heuristics cannot express "these three patterns form one logical feature"
- The heuristic approach treats grouping as a side effect, not an explicit decision

### Why Composite Features Need Explicit Grouping

When a user requests a complex feature like "talent drafting with weighted pool selection", the system needs to:

- Recognize this as a composite feature requiring multiple patterns
- Group those patterns into coherent modules
- Route each module to appropriate outputs
- Maintain the grouping through assembly and realization

Without explicit grouping, the system cannot reliably distinguish "three unrelated patterns" from "three patterns that form one feature".

## Minimal Contract: BlueprintModule.patternIds

The first version of explicit grouping should be simple:

```ts
interface BlueprintModule {
  id: string;
  purpose: string;
  patternIds?: string[];
  categoryFallback?: string;
}
```

The key field is `patternIds?: string[]`.

If `patternIds` is declared, assembly should:

- Use this array as the authoritative list of patterns belonging to this module
- Not infer grouping from category heuristics when patternIds is present

If `patternIds` is not declared, assembly should:

- Fall back to category-based heuristics
- Maintain current behavior for backward compatibility

### Why This Is Minimal

This contract adds only one optional field. It does not:

- Introduce a new entity type
- Create a grouping graph between modules
- Add dependency declarations
- Define complex nesting structures

It simply allows a BlueprintModule to say "these patterns belong to me" rather than relying on inference.

## In-Scope For First Version

The first version should support:

- A single module can explicitly own multiple patterns
- Patterns can come from different category families
- Grouping is declared at the BlueprintModule level, not derived later
- Category fallback remains functional for modules that do not declare patternIds
- The grouping is single-layer: modules do not nest inside other modules
- Note: polymorphic effect resolution may currently surface both generic and specialized patterns; this should not be treated as intended long-term layering; specialized pattern should be preferred over generic fallback when semantics overlap

This is sufficient for composite features like talent drafting where you need 2-5 patterns grouped into one logical feature unit.

## Out-Of-Scope For First Version

The first version should explicitly NOT support:

- Cross-module grouping graphs or dependencies between modules
- Nested grouping (modules inside modules)
- Dependency engine or topological ordering
- Full semantic entity models
- Pattern-level dependency declarations
- Complex constraint systems

These are Phase 2+ concerns. Getting grouping right first is more important than adding complexity.

## Why BlueprintModule Is The Right Layer

Grouping belongs at the Blueprint layer, not later in the pipeline, for several reasons:

### 1. Intent Is Captured Early

The user expresses intent in the Wizard, which flows to the Blueprint. The Blueprint already decides what patterns to use. Adding grouping at this layer keeps the decision with the intent.

### 2. Assembly Can Use It Directly

AssemblyPlan consumes Blueprint output. If grouping is already declared in BlueprintModule, Assembly does not need to reverse-engineer grouping from category heuristics.

### 3. Downstream Layers Benefit Automatically

HostRealization and Generator Routing receive the grouping information. They can make routing decisions based on module coherence, not just individual patterns.

### 4. Avoiding Double Derivation

If grouping is not declared until AssemblyModule, the system must derive it from Blueprint patterns. This creates a second inference step that can diverge from original intent. Declaring at BlueprintModule is more direct.

## Relationship To Other Documents

This document builds on:

- COMPOSITE-FEATURE-ARCHITECTURE: establishes that composite features should be decomposed
- MULTI-OUTPUT-REALIZATION-MIGRATION: establishes that outputs[] enables multi-output routing
- PATTERN-MODEL: defines what patterns are
- BLUEPRINT-ORCHESTRATION-CONTRACT: defines Blueprint structure

This document does not replace those. It adds a grouping perspective that enables composite features to work.

## Boundary: What This Document Does Not Claim

This document does not claim:

- The grouping contract is already implemented
- Composite features are now fully supported
- Cross-module dependencies are handled
- Complex nested grouping is available

This document establishes that:

- Current category-based grouping is insufficient for composite features
- A minimal explicit grouping contract at BlueprintModule layer is the recommended next step
- The contract should be simple: patternIds[] with category fallback

## Next Steps

The project should:

- Consider this contract as the baseline for composite feature planning
- Not implement cross-module dependencies until grouping is stable
- Evaluate where patternIds[] would be populated in the Wizard-to-Blueprint flow
- Keep category fallback working for backward compatibility
