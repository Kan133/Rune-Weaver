import type { IntentSchema } from "../../schema/types.js";
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
const FUTURE_EXTERNAL_CONSUMPTION_PATTERN =
  /(?:later|future|external)\s+(?:grant(?:ing)?|consumer|use)|grant(?:ed)? later|for later external granting|future external granting|external grant(?:ing)? source/iu;

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

function hasFeatureOwnedDefinitionSurface(candidate: Partial<IntentSchema>): boolean {
  const typedRequirements = candidate.requirements?.typed || [];
  const hasResourceRequirement = typedRequirements.some((requirement) => requirement.kind === "resource");
  const hasCreateState = (candidate.stateModel?.states || []).some(
    (state) =>
      state.owner === "feature"
      && (state.lifetime === "session" || state.lifetime === "ephemeral")
      && (state.mutationMode === "create" || state.mutationMode === "update"),
  );
  const hasFeatureOwnedCollection = (candidate.contentModel?.collections || []).some(
    (collection) => collection.ownership === "feature" || collection.ownership === undefined,
  );

  return hasResourceRequirement || hasCreateState || hasFeatureOwnedCollection;
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
    /outside this feature|not part of this feature|does not implement|deferred to an external source|future external granting compatibility|later external granting/iu.test(
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
  const noInteractiveActivation = !(candidate.interaction?.activations || []).some(
    (activation) => activation.kind === "key" || activation.kind === "mouse",
  );
  const noSelectionOrUi =
    hasNoneLikeSelection(candidate) &&
    candidate.uiRequirements?.needed !== true;
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

export function canonicalizeDefinitionOnlyProviderCandidate(
  candidate: Partial<IntentSchema>,
): Partial<IntentSchema> {
  const timing = candidate.timing;
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
          typed: (candidate.requirements.typed || []).filter(
            (requirement) => !isOutOfScopeProviderIntegrationRequirement(requirement),
          ),
        }
      : candidate.requirements,
    interaction: undefined,
    selection: undefined,
    timing: shouldClearTiming ? undefined : candidate.timing,
    effects: undefined,
    outcomes: undefined,
    composition: undefined,
    integrations: undefined,
    uiRequirements: candidate.uiRequirements?.needed === false ? { needed: false } : undefined,
  };
}
