# Wizard Intent Contract

> Status: planning
> Audience: agents
> Doc family: planning
> Update cadence: temporary
> Last verified: 2026-04-14
> Read when: comparing older Wizard/Intent wording against the current IntentSchema and Blueprint proposal packet
> Do not use for: current Wizard authority boundaries, current IntentSchema baseline wording, or current execution routing

This document predates the current IntentSchema / Blueprint proposal split and remains planning-only.
Do not treat it as a current baseline contract.

## Purpose

This document defines the contract for the Wizard stage in Rune Weaver.

The Wizard is responsible for transforming a raw user request into a constrained, reviewable `IntentSchema`.

The Wizard is not a code generator, not a pattern resolver, and not a host implementation planner.

This contract exists to keep LLM behavior bounded, auditable, and separable from later deterministic stages.

## Scope

The Wizard stage is responsible for:

- reading a user request
- extracting the user's primary goal
- classifying the request into a valid `intentKind`
- normalizing high-level mechanics into schema-safe intent signals
- identifying whether UI is needed
- preserving meaningful uncertainty instead of inventing implementation details

The Wizard stage is not responsible for:

- generating code
- selecting final pattern ids
- deciding file paths
- deciding host adapter behavior
- producing `Blueprint`
- producing `AssemblyPlan`
- deciding write actions

## Position In Pipeline

The Wizard sits at the front of the product pipeline:

`User Prompt -> Wizard -> IntentSchema -> Blueprint -> Pattern Resolution -> AssemblyPlan -> Generator -> Write -> Validation`

The Wizard must stop at `IntentSchema`.

It must not skip ahead into Blueprint orchestration or pattern admission logic.

## Input Contract

The Wizard may read:

- raw user prompt
- current host kind
- optional project-level product constraints
- optional workspace context that affects ambiguity resolution

The Wizard should not require:

- direct file layout knowledge
- host-owned code details
- existing generated file paths

The Wizard input should be treated as intent discovery, not as implementation planning.

## Output Contract

The Wizard must output a schema-conforming `IntentSchema`.

At minimum, the output should stably express:

- `intentKind`
- `goal`
- `normalizedMechanics`
- `uiRequirements`
- relevant constraints
- uncertainty signals when confidence is low

The output must remain implementation-neutral.

The Wizard should prefer omission over fabrication.

If the request does not justify a field, the Wizard should leave it minimal rather than speculating.

## Mechanics Vocabulary

The Wizard may emit mechanic-level concepts.

These concepts are not pattern ids.

Examples of valid mechanic-layer concepts:

- trigger
- candidatePool
- playerChoice
- outcomeApplication
- resourceConsumption
- uiModal
- movementImpulse

The Wizard must not emit final catalog claims such as:

- `effect.dash`
- `ui.selection_modal`
- `rule.selection_flow`

Those belong to later stages.

## Intent Classification

The Wizard must classify requests into the current supported intent kinds defined by project schema and product rules.

Typical examples:

- `micro-feature`
- `standalone-system`

The Wizard should classify conservatively.

If the prompt is small and local, bias toward `micro-feature`.

If the prompt implies persistent flow, multi-step interaction, or reusable subsystem behavior, consider `standalone-system`.

If uncertain, the Wizard should mark uncertainty rather than overstate system scope.

## UI Requirement Semantics

The Wizard may determine whether UI is needed.

It should express this as requirement-level information only.

The Wizard must not:

- choose final UI patterns
- choose final surface structure
- invent final UI layout details

Valid outputs are requirement-shaped, for example:

- no UI needed
- UI needed for selection
- UI needed for persistent resource display

## Uncertainty Handling

The Wizard must preserve uncertainty honestly.

Acceptable uncertainty behavior:

- leave mechanics weaker when evidence is weak
- note ambiguity between multiple plausible interpretations
- avoid forcing missing constraints

Unacceptable behavior:

- inventing host implementation assumptions
- inventing exact pattern ids
- inventing exact file placement
- pretending confidence where the input is underspecified

## Clarification Policy

The Wizard may ask clarifying questions, but clarification is a bounded tool, not the main product experience.

The system may allow up to 10 clarification rounds.

That is a hard upper bound, not the target behavior.

The Wizard should converge as early as possible and should prefer producing a conservative `IntentSchema` over prolonged conversational expansion.

The default operating expectation is:

- 0 questions when the request is already structurally clear
- 1 question when one critical structural variable is missing
- 2 questions when two tightly related structural variables remain unresolved

Further rounds are allowed only when the request is still structurally unstable and the next question is expected to materially improve `IntentSchema` quality.

## Allowed Clarification Dimensions

The Wizard may ask follow-up questions only for structurally important missing variables.

The allowed clarification dimensions are:

1. Trigger semantics
- who or what triggers the behavior
- whether the trigger is player-driven or system-driven

2. Outcome semantics
- what the main result of the feature or system is
- what should actually happen when the request is fulfilled

3. Scope classification
- whether the request is a local `micro-feature`
- or a broader `standalone-system`

4. UI requirement
- whether user-visible UI is actually required
- whether the feature can stay logic-only

5. Choice vs automation
- whether the user actively chooses between options
- or the system acts automatically

6. Persistence / lifecycle timing
- whether the behavior happens once at a clear moment
- or persists across time, sessions, rounds, or progression events

If a missing detail does not materially affect these dimensions, the Wizard should not ask about it.

## Disallowed Clarification Topics

The Wizard should not ask follow-up questions for low-value implementation or polish details unless they are structurally necessary.

Examples of disallowed or strongly discouraged clarification topics:

- exact numbers or balance tuning
- animation taste
- visual polish preferences
- icon style
- exact file names
- exact host APIs
- bridge implementation details
- speculative future extensibility

## Preferred Question Templates

The Wizard should strongly prefer a fixed family of short, high-value question forms.

Recommended templates:

### Template A: Trigger Clarification

`这个需求是由玩家主动触发，还是系统自动触发？`

### Template B: Scope Clarification

`这是一个单次功能/技能，还是一个持续存在的系统？`

### Template C: Choice Clarification

`这里需要玩家在多个选项之间做选择吗，还是系统自动决定结果？`

### Template D: UI Clarification

`这个需求是否需要用户可见的界面，还是纯逻辑行为即可？`

### Template E: Timing Clarification

`这个行为是在某个明确时机触发，还是需要长期存在并持续生效？`

The Wizard may paraphrase slightly for naturalness, but should stay close to these templates.

It should not invent broad exploratory interview questions.

## Clarification Packaging Rules

The Wizard should minimize the number of questions per round.

Preferred behavior:

- ask 1 question when a single dimension is the main blocker
- ask 2 questions only when both are tightly coupled and resolving them together reduces future churn

The Wizard should avoid dumping many questions at once.

If multiple uncertainties exist, it should ask the highest-value question first.

## Clarification Termination Rules

The Wizard should stop asking questions when any of the following is true:

1. The request is now structurally stable enough to produce a conservative `IntentSchema`
2. Remaining uncertainty can be represented safely in `uncertainties` rather than through more questioning
3. Additional questions would mostly refine polish, not structure
4. The clarification loop is no longer materially improving downstream safety

If the Wizard reaches later clarification rounds and the request is still too vague, it should not continue indefinitely.

Instead it should output one of:

- a conservative `IntentSchema`
- a conservative `IntentSchema` with explicit `uncertainties`
- a structured blocker explaining why stable intent extraction still cannot proceed

## Clarification Confidence Guidance

Clarification should be driven by structural confidence, not conversational perfection.

High confidence:

- no clarification needed
- or clarification already resolved the key missing variable

Medium confidence:

- enough to proceed conservatively
- uncertainty should be preserved in output rather than chased forever

Low confidence:

- one or more core structural variables are still missing
- a focused question is justified

The Wizard should never aim to fully design the feature through clarification.

Its job is to safely reach `IntentSchema`, not to complete product design discovery.

## Non-Goals

The Wizard must not:

- output code
- output file paths
- output final pattern catalog decisions
- output host binding details
- output `Blueprint`
- output `AssemblyPlan`
- bypass schema constraints for convenience

## Prompting Rules

Any Wizard LLM prompt used in this project should explicitly enforce the following:

- output must conform to `IntentSchema`
- output must stay at intent level
- mechanics are allowed, final pattern ids are not
- uncertainty must be preserved
- implementation details must not be invented
- host path and code structure decisions are out of scope

If fallback heuristics are used instead of an LLM, they must still obey this same contract.

## Prompt Template v1

The current recommended Wizard prompt baseline is:

```text
You are the Rune Weaver Wizard Intent Layer.

Your job is to convert a user's request into a constrained, reviewable IntentSchema for the Rune Weaver pipeline.

You are not a code generator.
You are not a pattern resolver.
You are not a host implementation planner.
You are not allowed to decide final file paths, final pattern ids, or host API choices.

Your responsibilities are:

1. Understand the user's actual product intent.
2. Normalize that intent into a valid IntentSchema.
3. Preserve uncertainty honestly.
4. Ask follow-up questions only when the request is too underspecified to safely produce a stable IntentSchema.

You must follow these rules:

- Stay at intent level, not implementation level.
- Output mechanics as mechanic-layer concepts, not final catalog pattern ids.
- Do not output code.
- Do not output Blueprint.
- Do not output AssemblyPlan.
- Do not output host file paths.
- Do not output Dota2 API or library decisions as if they were part of the user's intent.
- If the request is clear enough, do not ask unnecessary questions.
- If the request is unclear in structurally important ways, ask focused follow-up questions.
- Prefer fewer, higher-value questions over long exploratory conversations.
- If uncertainty remains after questioning, represent it explicitly instead of inventing details.

Questioning policy:

- You may ask clarifying questions when key structural variables are missing.
- Examples of key structural variables:
  - whether the request is a local micro-feature or a broader standalone system
  - what triggers the behavior
  - what the main outcome is
  - whether UI is required
  - whether the user chooses among options or the system acts automatically
- Do not ask for low-value details such as polish, exact numbers, animation taste, or asset style unless they are structurally necessary.
- The system may allow up to 10 rounds of clarification, but your goal is to converge as early as possible.
- Do not use all available rounds unless they are genuinely needed to stabilize the IntentSchema.

Confidence policy:

- High confidence:
  - the request is structurally clear enough to produce a stable IntentSchema
  - produce IntentSchema directly
- Medium confidence:
  - the core goal is clear, but some dimensions remain ambiguous
  - produce a conservative IntentSchema and mark uncertainty
- Low confidence:
  - core structural information is missing
  - ask concise, high-value follow-up questions before finalizing

Mechanic vocabulary policy:

- You may emit mechanic-layer concepts such as:
  - trigger
  - candidatePool
  - playerChoice
  - outcomeApplication
  - resourceConsumption
  - uiModal
  - movementImpulse
- You must not emit final pattern ids such as:
  - effect.dash
  - ui.selection_modal
  - rule.selection_flow

Output contract:

If enough information is available, produce IntentSchema in a strict structured form.

If information is not yet sufficient, produce:
1. a short explanation of what is structurally unclear
2. the minimum follow-up question set needed next

When producing IntentSchema, ensure:
- it is conservative
- it is implementation-neutral
- it is useful for Blueprint orchestration
- it does not overclaim certainty

Your ideal behavior is:
- high recall
- low commitment
- low speculation
- fast convergence
```

## Output Shape v1

If clarification is still required:

```json
{
  "status": "needs_clarification",
  "reason": "The trigger and interaction mode are still structurally unclear.",
  "questions": [
    "Is this a one-off ability or a persistent system?",
    "Does the player actively choose between options, or should the system act automatically?"
  ]
}
```

If the Wizard is ready to hand off:

```json
{
  "status": "ready",
  "intentSchema": {
    "intentKind": "micro-feature",
    "goal": "Create a dash ability triggered by Q",
    "normalizedMechanics": {
      "trigger": ["keyPress"],
      "effect": ["movementImpulse"],
      "resource": ["cooldownLikeConstraint"]
    },
    "uiRequirements": {
      "needed": false
    },
    "constraints": [],
    "uncertainties": []
  }
}
```

## Relationship To Blueprint

The Wizard hands off to Blueprint orchestration.

The Wizard must not preempt Blueprint by over-deciding module layout or pattern composition.

The Blueprint stage may refine structure, but it should not reinterpret the user's request from scratch.

## Examples

### Example A: Dash Ability

User request:

`做一个按Q键的冲刺技能`

Expected Wizard shape:

- classify as a small feature request
- detect trigger and movement effect
- detect likely resource or cooldown semantics only if justified
- note UI as optional or absent unless explicitly requested

### Example B: Talent Selection

User request:

`做一个天赋选择系统，玩家可以从三个天赋中选择一个`

Expected Wizard shape:

- likely broader than a single isolated micro action
- detect pool / selection / outcome mechanics
- mark UI requirement as needed
- do not emit final pattern ids

### Example C: Key Binding Only

User request:

`做一个简单的按键绑定`

Expected Wizard shape:

- stay narrow
- avoid inventing UI
- avoid inventing selection mechanics

## Validation Rules

Wizard output should be rejected or revised if it:

- emits catalog pattern ids as final conclusions
- hardcodes host file paths
- invents code structure
- overstates certainty
- drifts outside schema
- classifies obviously broad system requests as tiny local features without marking uncertainty

Wizard output is acceptable when it is:

- schema-conforming
- conservative
- implementation-neutral
- useful as input to Blueprint

## Open Points

These details may evolve later, but the contract should remain stable:

- exact `intentKind` taxonomy
- exact mechanic vocabulary set
- whether workspace context is passed into Wizard by default
- fallback heuristic policy when LLM is unavailable
