import type { IntentRequirement, IntentSchema } from "../../schema/types.js";
import type { IntentOpenSemanticResidue, IntentSemanticSurface } from "./semantic-analysis.js";
import { isRecord } from "./shared.js";

export interface DefinitionOnlyProviderSemantics {
  matches: boolean;
  hasConsumerSideDrift: boolean;
}

const DEFINITION_ONLY_PATTERN =
  /(?:shell\s+only|definition\s+only|only\s+define(?:s)?|exists?\s+only\s+as\s+a?\s+definition|grant-only)/iu;
const NO_TRIGGER_OR_INPUT_PATTERN =
  /(?:no|without)\s+(?:activation\s+key|trigger\s+key|player\s+input)|do not assign any (?:activation|trigger) key|do not include player input|does not include player input/iu;
const NO_AUTO_ATTACH_PATTERN =
  /(?:do not|does not|must not|should not|without|no)\s+(?:auto-attach|automatic attachment)|not auto-attach/iu;
const NO_GRANT_LOGIC_PATTERN =
  /(?:do not|does not|must not|should not|without|no)\s+(?:include\s+)?grant\s+logic|grant logic is not included|feature includes no grant logic/iu;
const NO_MODIFIER_APPLICATION_PATTERN =
  /(?:do not|does not|must not|should not|without|no)\s+(?:apply\s+)?modifier(?:\s+application)?|modifier application is not included|feature includes no modifier application/iu;
const NO_SELECTION_OR_UI_PATTERN =
  /(?:do not|does not|must not|should not|without|no)\s+(?:include\s+)?(?:selection(?:\s+(?:ui|modal|dialog|panel|screen))?|follow[- ]up choice|player choice|candidate choice|ui)|(?:selection(?:\s+(?:ui|modal|dialog|panel|screen))?|follow[- ]up choice|player choice|candidate choice|ui)\s+is\s+not\s+included/iu;
const FUTURE_EXTERNAL_CONSUMPTION_PATTERN =
  /(?:later|future|external)\s+(?:grant(?:ing)?|consumer|use)|grant(?:ed)? later|for later external granting|future external granting|external grant(?:ing)? source/iu;
const RESOLVED_PROVIDER_BOUNDARY_RESIDUE_PATTERN =
  /(?:trigger|activation|hotkey|key binding|player input|auto-attach|follow[- ]up choice|selection ui|grant logic|modifier application|external consumer|later external grant|definition[- ]only|grant[- ]only)/iu;
const PROVIDER_SHELL_REQUIREMENT_PATTERN =
  /(?:primary\s+hero\s+ability|hero\s+ability|gameplay\s+ability|grantable\s+ability|ability\s+shell|provider\s+shell|shell\s+definition|feature-owned\s+shell)/iu;
const DEFINITION_ONLY_STATE_PATTERN =
  /(?:ability\s+shell|provider\s+shell|shell\s+definition|defined\s+ability\s+shell|definition\s+state|later\s+external\s+grant|external\s+consumer|grantable\s+ability|feature-owned\s+shell)/iu;

function dedupeStrings(values: string[]): string[] {
  return [...new Set(values.filter((value) => value.trim().length > 0))];
}

function getParameterRecord(candidate: Partial<IntentSchema>): Record<string, unknown> {
  return isRecord(candidate.parameters) ? candidate.parameters : {};
}

function readBooleanParameter(
  parameters: Record<string, unknown>,
  ...keys: string[]
): boolean | undefined {
  for (const key of keys) {
    if (typeof parameters[key] === "boolean") {
      return parameters[key] as boolean;
    }
  }
  return undefined;
}

function collectProviderEvidenceText(
  candidate: Partial<IntentSchema>,
  rawText?: string,
): string {
  const values: string[] = [];
  if (typeof rawText === "string" && rawText.trim()) {
    values.push(rawText);
  }
  values.push(candidate.request?.goal || "");
  values.push(...(candidate.requirements?.functional || []));
  values.push(...(candidate.requirements?.dataNeeds || []));
  values.push(...(candidate.requirements?.outputs || []));
  values.push(...(candidate.constraints?.nonFunctional || []));
  values.push(candidate.flow?.triggerSummary || "");
  values.push(...(candidate.flow?.sequence || []));
  values.push(...(candidate.resolvedAssumptions || []));

  for (const requirement of candidate.requirements?.typed || []) {
    values.push(requirement.summary);
    values.push(...(requirement.outputs || []));
    values.push(...(requirement.invariants || []));
  }

  for (const binding of candidate.integrations?.expectedBindings || []) {
    values.push(binding.id);
    values.push(binding.summary);
  }

  return values.filter(Boolean).join(" ");
}

function hasNoneLikeSelection(candidate: Partial<IntentSchema>): boolean {
  const selection = candidate.selection;
  if (!selection) {
    return true;
  }

  const sourceIsNone = !selection.source || selection.source === "none";
  const choiceModeIsNone = !selection.choiceMode || selection.choiceMode === "none";
  const modeIsNone =
    !selection.mode || selection.mode === "deterministic";

  return sourceIsNone && choiceModeIsNone && modeIsNone;
}

function collectRequirementEvidenceText(
  requirement: IntentRequirement,
): string {
  return [
    requirement.summary,
    ...(requirement.outputs || []),
    ...(requirement.inputs || []),
    ...(requirement.invariants || []),
  ]
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    .join(" ");
}

export function isDefinitionOnlyProviderShellRequirement(
  requirement: IntentRequirement,
): boolean {
  const text = collectRequirementEvidenceText(requirement);
  return (
    (requirement.kind === "resource" || requirement.kind === "generic")
    && PROVIDER_SHELL_REQUIREMENT_PATTERN.test(text)
    && (
      /\bshell\b/iu.test(text)
      || /\bdefinition\b/iu.test(text)
      || FUTURE_EXTERNAL_CONSUMPTION_PATTERN.test(text)
      || /laterGranting|externalGrantLater|shellOnly|definitionOnly/u.test(JSON.stringify(requirement.parameters || {}))
      || text.includes("定义")
      || text.includes("壳")
    )
  );
}

function normalizeDefinitionOnlyProviderRequirement(
  requirement: IntentRequirement,
): IntentRequirement {
  if (!isDefinitionOnlyProviderShellRequirement(requirement)) {
    return requirement;
  }

  return {
    ...requirement,
    kind: "generic",
    outputs: dedupeStrings([...(requirement.outputs || []), "ability shell definition"]),
  };
}

function stripDefinitionOnlyProviderParameters(
  candidate: Partial<IntentSchema>,
): Partial<IntentSchema>["parameters"] {
  if (!isRecord(candidate.parameters)) {
    return candidate.parameters;
  }

  const {
    triggerKey: _triggerKey,
    key: _key,
    toKey: _toKey,
    eventName: _eventName,
    ...rest
  } = candidate.parameters;

  return rest;
}

function isOutOfScopeDefinitionOnlyProviderRequirement(
  requirement: IntentRequirement,
): boolean {
  if (isDefinitionOnlyProviderShellRequirement(requirement)) {
    return false;
  }

  if (
    requirement.kind === "trigger" ||
    requirement.kind === "rule" ||
    requirement.kind === "ui" ||
    requirement.kind === "effect" ||
    requirement.kind === "integration"
  ) {
    return true;
  }

  return false;
}

export function isDefinitionOnlyProviderDerivedState(
  state: Pick<NonNullable<IntentSchema["stateModel"]>["states"][number], "id" | "summary" | "owner" | "lifetime" | "mutationMode">,
): boolean {
  const text = `${state.id || ""} ${state.summary || ""}`;
  const looksDerivedLifecycle =
    state.owner === "feature"
    && (state.lifetime === "session" || state.lifetime === "ephemeral")
    && (state.mutationMode === undefined || state.mutationMode === "create" || state.mutationMode === "update");

  return looksDerivedLifecycle && DEFINITION_ONLY_STATE_PATTERN.test(text);
}

function filterDefinitionOnlyProviderStateModel(
  stateModel: IntentSchema["stateModel"] | undefined,
): IntentSchema["stateModel"] | undefined {
  if (!stateModel?.states || stateModel.states.length === 0) {
    return undefined;
  }

  const filteredStates = stateModel.states.filter((state) => !isDefinitionOnlyProviderDerivedState(state));
  if (filteredStates.length === 0) {
    return undefined;
  }

  return {
    ...stateModel,
    states: filteredStates,
  };
}

function hasFeatureOwnedDefinitionSurface(candidate: Partial<IntentSchema>): boolean {
  const typedRequirements = candidate.requirements?.typed || [];
  const hasShellRequirement = typedRequirements.some((requirement) => isDefinitionOnlyProviderShellRequirement(requirement));
  const hasResourceRequirement = typedRequirements.some((requirement) => requirement.kind === "resource");
  const hasCreateState = (candidate.stateModel?.states || []).some(
    (state) =>
      !isDefinitionOnlyProviderDerivedState(state)
      && state.owner === "feature"
      && (state.lifetime === "session" || state.lifetime === "ephemeral")
      && (state.mutationMode === "create" || state.mutationMode === "update"),
  );
  const hasFeatureOwnedCollection = (candidate.contentModel?.collections || []).some(
    (collection) => collection.ownership === "feature" || collection.ownership === undefined,
  );

  return hasShellRequirement || hasResourceRequirement || hasCreateState || hasFeatureOwnedCollection;
}

function countTrue(values: Array<boolean | undefined>): number {
  return values.filter((value) => value === true).length;
}

function hasConsumerGrantDrift(candidate: Partial<IntentSchema>): boolean {
  return (
    (candidate.outcomes?.operations || []).includes("grant-feature")
    || (candidate.composition?.dependencies || []).some(
      (dependency) =>
        (dependency.kind === "cross-feature" || dependency.kind === "external-system")
        && dependency.relation === "grants",
    )
    || (candidate.integrations?.expectedBindings || []).some((binding) =>
      /grant/iu.test(`${binding.id} ${binding.summary}`),
    )
  );
}

function isOutOfScopeProviderIntegrationRequirement(
  requirement: NonNullable<IntentSchema["requirements"]["typed"]>[number],
): boolean {
  if (requirement.kind !== "integration") {
    return false;
  }

  const parameters = isRecord(requirement.parameters) ? requirement.parameters : {};
  const evidenceText = [
    requirement.summary,
    ...(requirement.outputs || []),
    ...(requirement.invariants || []),
  ].join(" ");

  return (
    readBooleanParameter(parameters, "implementedHere") === false ||
    /outside this feature|not part of this feature|does not implement|deferred to an external source|future external granting compatibility|later external granting|external consumer|granted later|this feature does not perform the grant|later external use/iu.test(
      evidenceText,
    )
  );
}

export function analyzeDefinitionOnlyProviderSemantics(
  candidate: Partial<IntentSchema>,
  rawText?: string,
): DefinitionOnlyProviderSemantics {
  const parameters = getParameterRecord(candidate);
  const evidenceText = collectProviderEvidenceText(candidate, rawText);
  const definitionOnlyRequested =
    readBooleanParameter(parameters, "shellOnly", "definitionOnly") === true ||
    DEFINITION_ONLY_PATTERN.test(evidenceText);
  const explicitNoInteractiveActivation =
    readBooleanParameter(parameters, "playerInput", "hasPlayerInput") === false ||
    NO_TRIGGER_OR_INPUT_PATTERN.test(evidenceText);
  const noInteractiveActivation = explicitNoInteractiveActivation || !(candidate.interaction?.activations || []).some(
    (activation) => activation.kind === "key" || activation.kind === "mouse",
  );
  const noSelectionOrUi =
    (
      hasNoneLikeSelection(candidate) &&
      candidate.uiRequirements?.needed !== true
    ) ||
    NO_SELECTION_OR_UI_PATTERN.test(evidenceText);
  const optOutCount = countTrue([
    readBooleanParameter(parameters, "playerInput", "hasPlayerInput") === false || NO_TRIGGER_OR_INPUT_PATTERN.test(evidenceText),
    readBooleanParameter(parameters, "autoAttach") === false || NO_AUTO_ATTACH_PATTERN.test(evidenceText),
    readBooleanParameter(parameters, "grantLogicIncluded", "includesGrantLogic", "hasGrantLogic") === false
      || NO_GRANT_LOGIC_PATTERN.test(evidenceText),
    readBooleanParameter(
      parameters,
      "modifierApplicationIncluded",
      "includesModifierApplication",
      "hasModifierApplication",
    ) === false || NO_MODIFIER_APPLICATION_PATTERN.test(evidenceText),
  ]);
  const futureExternalConsumption =
    readBooleanParameter(parameters, "externalGrantLater", "laterExternalGranting") === true ||
    FUTURE_EXTERNAL_CONSUMPTION_PATTERN.test(evidenceText) ||
    (candidate.composition?.dependencies || []).some(
      (dependency) =>
        (dependency.kind === "cross-feature" || dependency.kind === "external-system")
        && dependency.relation === "grants",
    );
  const matches =
    definitionOnlyRequested &&
    hasFeatureOwnedDefinitionSurface(candidate) &&
    noInteractiveActivation &&
    noSelectionOrUi &&
    optOutCount >= 3 &&
    futureExternalConsumption;

  return {
    matches,
    hasConsumerSideDrift: matches && hasConsumerGrantDrift(candidate),
  };
}

export function isDefinitionOnlyProviderBoundary(
  candidate: Partial<IntentSchema>,
  rawText?: string,
): boolean {
  return analyzeDefinitionOnlyProviderSemantics(candidate, rawText).matches;
}

export function isDefinitionOnlyProviderResolvedSemanticBoundary(
  surface: IntentSemanticSurface,
  summary?: string,
): boolean {
  if (
    surface === "activation" ||
    surface === "selection_flow" ||
    surface === "composition_boundary"
  ) {
    return true;
  }

  return typeof summary === "string" && RESOLVED_PROVIDER_BOUNDARY_RESIDUE_PATTERN.test(summary);
}

export function reconcileDefinitionOnlyProviderOpenSemanticResidue(
  openSemanticResidue: IntentOpenSemanticResidue,
): IntentOpenSemanticResidue {
  return openSemanticResidue.filter((item) =>
    item.disposition !== "open" ||
    !isDefinitionOnlyProviderResolvedSemanticBoundary(item.surface, item.summary)
  );
}

export function canonicalizeDefinitionOnlyProviderCandidate(
  candidate: Partial<IntentSchema>,
): Partial<IntentSchema> {
  const timing = candidate.timing;
  const normalizedTypedRequirements = (candidate.requirements?.typed || [])
    .filter((requirement) => !isOutOfScopeDefinitionOnlyProviderRequirement(requirement))
    .filter((requirement) => !isOutOfScopeProviderIntegrationRequirement(requirement))
    .map((requirement) => normalizeDefinitionOnlyProviderRequirement(requirement));
  const filteredStateModel = filterDefinitionOnlyProviderStateModel(candidate.stateModel);
  const shouldClearTiming =
    Boolean(timing)
    && timing?.duration?.kind === "persistent"
    && timing?.cooldownSeconds === undefined
    && timing?.intervalSeconds === undefined
    && timing?.delaySeconds === undefined;

  return {
    ...candidate,
    requirements: candidate.requirements
      ? {
          ...candidate.requirements,
          functional: [
            "Define one feature-owned shell definition that stays available for later external consumers.",
          ],
          typed: normalizedTypedRequirements,
        }
      : candidate.requirements,
    interaction: undefined,
    selection: undefined,
    stateModel: filteredStateModel,
    timing: shouldClearTiming ? undefined : candidate.timing,
    effects: undefined,
    outcomes: undefined,
    composition: undefined,
    integrations: undefined,
    normalizedMechanics: undefined,
    uiRequirements: candidate.uiRequirements?.needed === false ? { needed: false } : undefined,
    parameters: stripDefinitionOnlyProviderParameters(candidate),
  };
}
