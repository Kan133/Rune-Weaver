# UI Wizard Intake Contract

## Status

Phase 2+ future extension only.

Not implemented.

This document defines a possible future intake layer that may sit before the Wizard intent layer.

## Purpose

The UI Wizard is a structured intake layer.

Its job is to:

- reduce ambiguity in user requests
- collect a small set of high-value answers
- normalize user-facing clarification into stable intake data
- improve Wizard input quality without changing downstream contracts

It is not a replacement for the Wizard.

## Position In Pipeline

Target future shape:

`User Prompt -> UI Wizard Intake -> Wizard -> IntentSchema -> Blueprint -> Pattern Resolution -> AssemblyPlan -> Host Realization -> Generator Routing -> Generators -> Host Write / Run`

The UI Wizard sits before the Wizard.

It does not sit between Wizard and Blueprint.

## Responsibilities

The UI Wizard may:

- ask structured clarification questions
- collect explicit user choices
- provide normalized answer bundles to the Wizard
- expose whether clarification was used
- preserve unanswered uncertainty

The UI Wizard must not:

- emit Blueprint
- emit final pattern ids
- emit Host Realization decisions
- emit Generator Routing decisions
- emit file paths
- emit host API plans
- emit direct code generation plans

## Input Contract

The future UI Wizard may receive:

- raw user prompt
- host kind
- optional workspace context
- optional prior feature context for maintenance flows

The future UI Wizard should not require:

- full pattern catalog reasoning
- host realization policy reasoning
- generator family reasoning

## Output Contract

The UI Wizard should produce a small, explicit intake bundle.

Suggested future shape:

```ts
interface WizardIntakeBundle {
  version: "1.0";
  host?: string;
  rawPrompt: string;
  answers: Array<{
    key: string;
    value: string | boolean | number | string[];
    source: "user" | "wizard-default";
  }>;
  uncertainties: string[];
  clarificationUsed: boolean;
  notes: string[];
}
```

This bundle is an input to the Wizard.

It is not an `IntentSchema`.

## Questioning Policy

The UI Wizard should focus only on high-value structural questions.

Allowed future question categories:

- is this a micro-feature or a broader system
- whether UI is required
- whether user choice is involved
- trigger model
- main outcome model
- whether this targets a new feature or an existing feature

Disallowed question categories:

- host implementation details
- file layout
- final pattern selection
- TS vs KV vs UI realization decisions
- speculative extensibility planning

## Relationship To Wizard

The UI Wizard is an intake helper.

The Wizard remains the source of truth for:

- intent normalization
- conservative uncertainty handling
- final `IntentSchema` emission

The UI Wizard must not replace Wizard reasoning.

## Relationship To Gap Fill

The UI Wizard is not a global gap filler.

It only fills user-input gaps through explicit interaction.

It must not silently infer downstream structure.

## Auditability

If this layer is implemented later, the system should be able to show:

- whether clarification was used
- which answers were user-provided
- which answers used conservative defaults
- which uncertainties remained unresolved

## Non-Goals

The future UI Wizard is not:

- a Blueprint generator
- a pattern resolver
- a host realization planner
- a generator router
- a code generator

## Future Integration Notes

The safest future integration path is:

1. introduce a small intake bundle contract
2. allow Wizard to consume raw prompt plus intake bundle
3. expose `clarificationUsed` and unresolved uncertainty in artifact metadata

This should not require changing:

- Blueprint contract
- Pattern Resolution contract
- Host Realization contract
- Generator Routing contract

## Risks

If implemented incorrectly, this layer may cause:

- Wizard boundary drift
- product-manager-style over-questioning
- accidental implementation planning at intake time
- hidden defaults with poor auditability

## Guardrail

The UI Wizard must remain a pre-Wizard structured intake layer.

It must not become a second Wizard, a lightweight Blueprint, or a host planner.
