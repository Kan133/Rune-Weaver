---
name: pattern-author
description: Draft and normalize Rune Weaver patterns through a three-stage process: candidate identification, draft creation, and admission validation.
---

# Pattern Author

## Overview

Use this skill to turn a candidate mechanic, tutorial fragment, or system idea into a Rune Weaver pattern proposal through a **three-stage sequential process**:

1. `PatternCandidate`
2. `PatternDraft`
3. `AdmissionChecklist`

This skill **does not** write directly into the catalog. It produces a draft that is ready for admission review.

## Required Project Context

Read before starting:

- `/D:/Rune Weaver/docs/PATTERN-MODEL.md`
- `/D:/Rune Weaver/docs/PATTERN-SPEC.md`
- `/D:/Rune Weaver/docs/PATTERN-PIPELINE.md`
- `/D:/Rune Weaver/docs/PATTERN-AUTHORING-GUIDE.md`
- `/D:/Rune Weaver/PATTERN-BACKLOG.md`
- `/D:/Rune Weaver/skills/pattern-author/references/pattern-draft-checklist.md`

Read when needed:

- `/D:/Rune Weaver/docs/HOST-INTEGRATION-DOTA2.md`
- `/D:/Rune Weaver/docs/SCHEMA.md`
- `/D:/Rune Weaver/docs/UI-PATTERN-STRATEGY.md`
- `/D:/Rune Weaver/knowledge/dota2-host/api/README.md`

## Core Rules

- Extract mechanic first, not domain flavor first.
- Prefer extending existing patterns over inventing new ones.
- Do not treat API, KV, enum, helper function, or host path as a pattern.
- `parameters`, `nonGoals`, and `hostBindings` are hard requirements.
- Host details belong in `hostBindings`, not in the semantic core.
- UI patterns follow the same pipeline and are still core patterns.

## Stage 1: PatternCandidate

### Goal

Identify whether the input is a real candidate worth drafting.

### Output Format

```yaml
PatternCandidate:
  proposedId: "effect.dash"
  repeatedMechanic: "parameterized displacement"
  likelyCategory: "effect"
  sourceRefs:
    - "references/dota2/docs/moddota_scripting_typescript.md"
  backlogFit: "strong" # strong | partial | weak
  candidateNotes:
    whyMechanic: "Solves a repeatable displacement mechanic, not a single ability skin."
    domainSkin: "dash / blink / leap may be different skins over related movement mechanics."
    similarPatterns:
      - "effect.modifier_applier"
  goNoGo: "go" # go | revise | reject
  rejectionReason: null
```

### Stage 1 Gates

You must reject or revise if any of these fail:

- Is it a repeatable mechanic rather than a single host API wrapper?
- Is it more than a KV snippet or enum collection?
- Is it reusable beyond one domain skin?
- Is it not already covered by an existing pattern or obvious pattern combination?

### Stage 1 Notes

- `proposedId` should follow current project naming, such as:
  - `effect.dash`
  - `ui.resource_bar`
  - `rule.selection_flow`
- Do not switch to kebab-case IDs.

## Stage 2: PatternDraft

### Goal

Write the complete pattern draft following current Rune Weaver rules.

### Output Format

```yaml
PatternDraft:
  id: "effect.dash"
  category: "effect"
  summary: "Provide parameterized displacement with host-bindable movement behavior."
  responsibilities:
    - "Compute displacement direction and movement envelope."
    - "Expose configurable movement parameters for assembly."
  nonGoals:
    - "Does not implement every ability around the dash."
    - "Does not encode domain-specific hero rules."
  parameters:
    - name: "distance"
      type: "number"
      required: true
      description: "Maximum movement distance."
    - name: "duration"
      type: "number"
      required: true
      description: "Movement duration in seconds."
  dependencies:
    - "input.key_binding (optional upstream trigger)"
  validationHints:
    - "distance > 0"
    - "duration > 0"
  hostBindings:
    - hostType: "dota2-x-template"
      targetArea: "game/scripts/src/rune_weaver/generated/server"
      implementationNotes:
        - "Generated as RW-owned server file."
  examples:
    - "Short combat dash"
    - "Long traversal dash"
```

### Stage 2 Hard Requirements

The draft must contain:

- `id`
- `summary`
- `responsibilities`
- `nonGoals`
- `parameters`
- `hostBindings`

### Stage 2 Notes

- `nonGoals` must be explicit.
- `parameters` must express the main variations.
- `hostBindings` must use the current host model, not legacy `vscripts`-first paths.

## Stage 3: AdmissionChecklist

### Goal

Check whether the draft is ready for catalog admission.

### Output Format

```yaml
AdmissionChecklist:
  draftId: "effect.dash"
  overallVerdict: "accept" # accept | revise | reject
  checks:
    - item: "Is a reusable mechanic rather than a domain skin"
      status: "pass"
      notes: "Dash remains reusable across multiple movement scenarios."
    - item: "Not duplicate of existing catalog entry"
      status: "pass"
      notes: "No existing pattern fully covers parameterized displacement."
    - item: "Has required fields"
      status: "pass"
      notes: "id, summary, responsibilities, nonGoals, parameters, hostBindings present."
    - item: "Host binding matches current host model"
      status: "pass"
      notes: "Uses rune_weaver generated areas."
  revisionNeeded: []
  admissionReady: true
  reviewerNotes: "Ready for catalog review."
```

### Verdict Meaning

- `accept`: ready for catalog admission
- `revise`: valid direction but needs fixes
- `reject`: not suitable as a pattern

## What This Skill Does Not Do

- It does **not** write directly into the catalog.
- It does **not** replace admission review.
- It does **not** replace a future dedicated extractor or reviewer skill.
- It does **not** reclassify host API/KV/enum data as patterns.
- It does **not** invent domain-specific patterns when a core pattern or combination already exists.

## Anti-Patterns

Reject or revise candidates that are:

- full systems disguised as a single pattern
- domain-specific skins like `ui.talent_screen`
- raw API wrappers
- raw KV snippets
- enum collections
- host hacks presented as mechanic abstractions

## Usage Reminder

This skill currently remains a **single skill with a three-stage output flow**.

That is intentional:

- lower coordination overhead
- stable sequential reasoning
- explicit gates before admission

If the project later needs large-scale candidate mining or independent expert review, the flow can be split into:

- extractor
- author
- reviewer

But not yet.
