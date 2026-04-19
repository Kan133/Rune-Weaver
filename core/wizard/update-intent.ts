/**
 * Rune Weaver - Workspace-backed Update Wizard
 */

import { existsSync, readFileSync } from "fs";
import { join } from "path";

import type {
  CurrentFeatureContext,
  HostDescriptor,
  IntentSchema,
  UpdateDeltaItem,
  UpdateDeltaKind,
  UpdateIntent,
} from "../schema/types";
import type { RuneWeaverFeatureRecord } from "../workspace/types.js";
import { DOTA2_X_TEMPLATE_HOST_KIND } from "../host/types.js";
import { buildWizardUpdatePromptPackage } from "../llm/prompt-packages.js";
import { buildDota2RetrievalBundle } from "../retrieval/index.js";
import { validateIntentSchema } from "../validation";
import type { UpdateWizardOptions, UpdateWizardResult } from "./types";
import { buildWizardClarificationPlan } from "./clarification-plan";
import { createFallbackIntentSchema, INTENT_SCHEMA_REFERENCE, normalizeIntentSchema } from "./intent-schema";

const DEFAULT_HOST: HostDescriptor = {
  kind: DOTA2_X_TEMPLATE_HOST_KIND,
};

const UPDATE_WIZARD_REFERENCE = {
  requestedChange: INTENT_SCHEMA_REFERENCE,
  delta: {
    preserve: [
      {
        path: "string",
        kind: "trigger | selection | state | ui | effect | content | integration | composition | generic",
        summary: "string",
      },
    ],
    add: [
      {
        path: "string",
        kind: "trigger | selection | state | ui | effect | content | integration | composition | generic",
        summary: "string",
      },
    ],
    modify: [
      {
        path: "string",
        kind: "trigger | selection | state | ui | effect | content | integration | composition | generic",
        summary: "string",
      },
    ],
    remove: [
      {
        path: "string",
        kind: "trigger | selection | state | ui | effect | content | integration | composition | generic",
        summary: "string",
      },
    ],
  },
  resolvedAssumptions: ["string"],
};

interface PartialUpdateWizardPayload {
  requestedChange?: Partial<IntentSchema>;
  delta?: Partial<Record<"preserve" | "add" | "modify" | "remove", Array<Partial<UpdateDeltaItem>>>>;
  resolvedAssumptions?: string[];
}

function dedupeStrings(values: Array<string | undefined>): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    if (!value) {
      continue;
    }
    const trimmed = value.trim();
    if (!trimmed || seen.has(trimmed)) {
      continue;
    }
    seen.add(trimmed);
    result.push(trimmed);
  }
  return result;
}

function getPreservedModuleBackbone(currentFeatureContext: CurrentFeatureContext): string[] {
  if ((currentFeatureContext.preservedModuleBackbone || []).length > 0) {
    return dedupeStrings(currentFeatureContext.preservedModuleBackbone);
  }
  return dedupeStrings(currentFeatureContext.admittedSkeleton || []);
}

function normalizeDeltaKind(value: unknown, fallbackPath: string): UpdateDeltaKind {
  if (
    value === "trigger" ||
    value === "selection" ||
    value === "state" ||
    value === "ui" ||
    value === "effect" ||
    value === "content" ||
    value === "integration" ||
    value === "composition" ||
    value === "generic"
  ) {
    return value;
  }

  const normalized = fallbackPath.toLowerCase();
  if (normalized.includes("trigger") || normalized.includes("key")) {
    return "trigger";
  }
  if (normalized.includes("selection")) {
    return "selection";
  }
  if (normalized.includes("inventory") || normalized.includes("ui")) {
    return "ui";
  }
  if (normalized.includes("content") || normalized.includes("object")) {
    return "content";
  }
  if (normalized.includes("effect")) {
    return "effect";
  }
  if (normalized.includes("integration")) {
    return "integration";
  }
  if (normalized.includes("composition")) {
    return "composition";
  }
  if (normalized.includes("state")) {
    return "state";
  }
  return "generic";
}

function normalizeDeltaList(items: unknown): UpdateDeltaItem[] {
  if (!Array.isArray(items)) {
    return [];
  }

  return items
    .filter((item): item is Partial<UpdateDeltaItem> => Boolean(item && typeof item === "object"))
    .map((item, index) => {
      const path = typeof item.path === "string" && item.path.trim() ? item.path : `delta.${index}`;
      return {
        path,
        kind: normalizeDeltaKind(item.kind, path),
        summary:
          typeof item.summary === "string" && item.summary.trim()
            ? item.summary
            : `Update ${path}`,
      };
    });
}

function dedupeDeltaItems(items: UpdateDeltaItem[]): UpdateDeltaItem[] {
  const seen = new Set<string>();
  const result: UpdateDeltaItem[] = [];
  for (const item of items) {
    const key = `${item.path}::${item.kind}::${item.summary}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push(item);
  }
  return result;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object");
}

function normalizePositiveInteger(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? Math.floor(value)
    : undefined;
}

function normalizeStringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function resolveSourceBackedSnapshot(
  existingFeature: RuneWeaverFeatureRecord,
  sourceArtifact?: Record<string, unknown>,
): Record<string, unknown> | undefined {
  const authoredParameters = isRecord(existingFeature.featureAuthoring?.parameters)
    ? existingFeature.featureAuthoring?.parameters
    : undefined;

  if (sourceArtifact && authoredParameters) {
    return {
      ...authoredParameters,
      ...sourceArtifact,
    };
  }

  return sourceArtifact || authoredParameters;
}

function extractGenericBoundedFields(
  existingFeature: RuneWeaverFeatureRecord,
  sourceArtifact?: Record<string, unknown>,
): Record<string, unknown> {
  const snapshot = resolveSourceBackedSnapshot(existingFeature, sourceArtifact);
  if (!snapshot) {
    return {};
  }

  const boundedFields: Record<string, unknown> = {};
  const triggerKey = normalizeStringValue(snapshot.triggerKey);
  const choiceCount = normalizePositiveInteger(snapshot.choiceCount);
  const objects = Array.isArray(snapshot.objects) ? snapshot.objects : undefined;
  const inventory = isRecord(snapshot.inventory) ? snapshot.inventory : undefined;

  if (triggerKey) {
    boundedFields.triggerKey = triggerKey;
  }
  if (typeof choiceCount === "number") {
    boundedFields.choiceCount = choiceCount;
  }
  if (Array.isArray(objects)) {
    boundedFields.objectCount = objects.length;
  }
  if (inventory) {
    if (typeof inventory.enabled === "boolean") {
      boundedFields.inventoryEnabled = inventory.enabled;
    }
    const inventoryCapacity = normalizePositiveInteger(inventory.capacity);
    if (typeof inventoryCapacity === "number") {
      boundedFields.inventoryCapacity = inventoryCapacity;
    }
    const fullMessage = normalizeStringValue(inventory.fullMessage);
    if (fullMessage) {
      boundedFields.inventoryFullMessage = fullMessage;
    }
  }

  return boundedFields;
}

function extractPreservedInvariants(existingFeature: RuneWeaverFeatureRecord): string[] {
  const invariants = existingFeature.featureAuthoring?.parameterSurface?.invariants;
  if (!Array.isArray(invariants)) {
    return [];
  }

  return dedupeStrings(
    invariants.map((item) => (typeof item === "string" ? item : undefined)),
  );
}

function readRequestedTriggerKey(requestedChange: IntentSchema): string | undefined {
  const fromParameters = requestedChange.parameters?.triggerKey;
  if (typeof fromParameters === "string" && fromParameters.trim()) {
    return fromParameters.trim().toUpperCase();
  }

  const activation = (requestedChange.interaction?.activations || []).find((item) => item.kind === "key");
  return typeof activation?.input === "string" && activation.input.trim()
    ? activation.input.trim().toUpperCase()
    : undefined;
}

function readRequestedChoiceCount(requestedChange: IntentSchema): number | undefined {
  const fromSelection = requestedChange.selection?.choiceCount;
  if (typeof fromSelection === "number" && Number.isFinite(fromSelection) && fromSelection > 0) {
    return Math.floor(fromSelection);
  }

  const fromParameters = requestedChange.parameters?.choiceCount;
  if (typeof fromParameters === "number" && Number.isFinite(fromParameters) && fromParameters > 0) {
    return Math.floor(fromParameters);
  }

  return undefined;
}

function readRequestedObjectCount(prompt: string): number | undefined {
  const match =
    prompt.match(/从\s*\d+\s*(?:个|项|张)?(?:[\p{Script=Han}A-Za-z_]+)?\s*(?:扩充|扩展|增加|提升|改成|改为|调整到|变成|变为)\s*(?:到|成|为)?\s*(\d+)\s*(?:个|项|张)?/iu)
    || prompt.match(/(?:扩充|扩展|增加|提升|改成|改为|调整到|变成|变为)(?:到|成|为)?\s*(\d+)\s*(?:个|项|张)?(?:对象|候选|条目|项目|cards?|objects?|items?)?/i)
    || prompt.match(/(\d+)\s*(?:个|项|张)?(?:对象|候选|条目|项目|cards?|objects?|items?).*(?:扩充|扩展|增加|提升)/i);
  if (!match) {
    return undefined;
  }
  const parsed = Number(match[1]);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : undefined;
}

function createPreserveDelta(currentFeatureContext: CurrentFeatureContext): UpdateDeltaItem[] {
  const backbone = getPreservedModuleBackbone(currentFeatureContext).map((item) => ({
    path: `backbone.${item}`,
    kind: "composition" as const,
    summary: `Preserve module backbone ${item}.`,
  }));
  const invariants = currentFeatureContext.preservedInvariants.map((item, index) => ({
    path: `invariant.${index + 1}`,
    kind: "generic" as const,
    summary: `Preserve invariant: ${item}`,
  }));
  return dedupeDeltaItems([...backbone, ...invariants]);
}

function collectDeterministicDelta(
  currentFeatureContext: CurrentFeatureContext,
  requestedChange: IntentSchema,
): Pick<UpdateIntent["delta"], "add" | "modify" | "remove"> {
  const add: UpdateDeltaItem[] = [];
  const modify: UpdateDeltaItem[] = [];
  const remove: UpdateDeltaItem[] = [];
  const rawPrompt = requestedChange.request.rawPrompt;
  const boundedFields = currentFeatureContext.boundedFields;

  if (requestedChange.selection?.inventory?.enabled === true) {
    const currentInventoryEnabled = boundedFields.inventoryEnabled === true;
    const requestedInventory = requestedChange.selection.inventory;
    const summary = currentInventoryEnabled
      ? "Refresh the existing session inventory contract on the current feature."
      : "Add the existing session inventory contract to the current feature.";
    (currentInventoryEnabled ? modify : add).push({
      path: "selection.inventory",
      kind: "ui",
      summary,
    });

    if (
      typeof requestedInventory.capacity === "number" &&
      requestedInventory.capacity !== boundedFields.inventoryCapacity
    ) {
      modify.push({
        path: "selection.inventory.capacity",
        kind: "ui",
        summary: `Change inventory capacity to ${Math.floor(requestedInventory.capacity)} within the existing bounded field.`,
      });
    }

    if (
      typeof requestedInventory.fullMessage === "string" &&
      requestedInventory.fullMessage.trim() &&
      requestedInventory.fullMessage !== boundedFields.inventoryFullMessage
    ) {
      modify.push({
        path: "selection.inventory.fullMessage",
        kind: "ui",
        summary: "Refresh the inventory-full message within the current inventory panel contract.",
      });
    }
  }

  const triggerKey = readRequestedTriggerKey(requestedChange);
  if (triggerKey && triggerKey !== boundedFields.triggerKey) {
    modify.push({
      path: "input.triggerKey",
      kind: "trigger",
      summary: `Rebind the current trigger key to ${triggerKey}.`,
    });
  }

  const choiceCount = readRequestedChoiceCount(requestedChange);
  if (typeof choiceCount === "number" && choiceCount !== boundedFields.choiceCount) {
    modify.push({
      path: "selection.choiceCount",
      kind: "selection",
      summary: `Change the current selection choiceCount to ${choiceCount}.`,
    });
  }

  const currentObjectCount =
    typeof boundedFields.objectCount === "number" && Number.isFinite(boundedFields.objectCount)
      ? Math.floor(boundedFields.objectCount)
      : undefined;
  const requestedObjectCount = readRequestedObjectCount(rawPrompt);
  if (
    typeof currentObjectCount === "number" &&
    typeof requestedObjectCount === "number" &&
    requestedObjectCount > currentObjectCount
  ) {
    modify.push({
      path: "content.collection.objectCount",
      kind: "content",
      summary: `Expand the same-feature owned object collection from ${currentObjectCount} to ${requestedObjectCount}.`,
    });
  }

  return {
    add: dedupeDeltaItems(add),
    modify: dedupeDeltaItems(modify),
    remove: dedupeDeltaItems(remove),
  };
}

function normalizeUpdateIntent(
  candidate: PartialUpdateWizardPayload | undefined,
  currentFeatureContext: CurrentFeatureContext,
  requestedChange: IntentSchema,
): UpdateIntent {
  const preserve = createPreserveDelta(currentFeatureContext);
  const modelDelta = candidate?.delta || {};
  const deterministicDelta = collectDeterministicDelta(currentFeatureContext, requestedChange);
  const delta: UpdateIntent["delta"] = {
    preserve: dedupeDeltaItems([
      ...preserve,
      ...normalizeDeltaList(modelDelta.preserve),
    ]),
    add: dedupeDeltaItems([
      ...normalizeDeltaList(modelDelta.add),
      ...deterministicDelta.add,
    ]),
    modify: dedupeDeltaItems([
      ...normalizeDeltaList(modelDelta.modify),
      ...deterministicDelta.modify,
    ]),
    remove: dedupeDeltaItems([
      ...normalizeDeltaList(modelDelta.remove),
      ...deterministicDelta.remove,
    ]),
  };

  return {
    version: "1.0",
    mode: "update",
    target: {
      featureId: currentFeatureContext.featureId,
      revision: currentFeatureContext.revision,
      profile: currentFeatureContext.featureAuthoring?.profile,
      sourceBacked: currentFeatureContext.sourceBacked,
    },
    currentFeatureContext,
    requestedChange,
    delta,
    resolvedAssumptions: dedupeStrings([
      ...(candidate?.resolvedAssumptions || []),
      ...(requestedChange.resolvedAssumptions || []),
      "Update preserves unspecified existing behavior from the current workspace feature context.",
    ]),
  };
}

function resolveArtifactPath(hostRoot: string, sourceModelPath: string): string {
  return /^[A-Za-z]:[\\/]/.test(sourceModelPath)
    ? sourceModelPath
    : join(hostRoot, sourceModelPath);
}

export function buildCurrentFeatureContext(
  existingFeature: RuneWeaverFeatureRecord,
  hostRoot: string,
): CurrentFeatureContext {
  let sourceArtifact: Record<string, unknown> | undefined;
  if (existingFeature.sourceModel?.path) {
    const fullPath = resolveArtifactPath(hostRoot, existingFeature.sourceModel.path);
    if (existsSync(fullPath)) {
      try {
        const parsed = JSON.parse(readFileSync(fullPath, "utf-8"));
        if (parsed && typeof parsed === "object") {
          sourceArtifact = parsed as Record<string, unknown>;
        }
      } catch {
        sourceArtifact = undefined;
      }
    }
  }

  const preservedModuleBackbone = dedupeStrings(
    (existingFeature.modules && existingFeature.modules.length > 0)
      ? existingFeature.modules.map((module) => module.role)
      : existingFeature.selectedPatterns,
  );

  return {
    featureId: existingFeature.featureId,
    revision: existingFeature.revision,
    intentKind: existingFeature.intentKind,
    selectedPatterns: [...existingFeature.selectedPatterns],
    ...(existingFeature.modules && existingFeature.modules.length > 0
      ? { moduleRecords: [...existingFeature.modules] }
      : {}),
    sourceBacked: !!(existingFeature.sourceModel || existingFeature.featureAuthoring),
    ...(existingFeature.sourceModel || sourceArtifact
      ? {
          sourceModel: {
            ...(existingFeature.sourceModel
              ? {
                  ref: {
                    adapter: existingFeature.sourceModel.adapter,
                    version: existingFeature.sourceModel.version,
                    path: existingFeature.sourceModel.path,
                  },
                }
              : {}),
            ...(sourceArtifact ? { artifact: sourceArtifact } : {}),
          },
        }
      : {}),
    ...(existingFeature.featureAuthoring ? { featureAuthoring: existingFeature.featureAuthoring } : {}),
    preservedModuleBackbone,
    admittedSkeleton: preservedModuleBackbone,
    preservedInvariants: extractPreservedInvariants(existingFeature),
    boundedFields: extractGenericBoundedFields(existingFeature, sourceArtifact),
  };
}

export async function runWizardToUpdateIntent(
  options: UpdateWizardOptions,
): Promise<UpdateWizardResult> {
  const host = options.input.host ?? DEFAULT_HOST;
  let raw: unknown;
  let requestedChange: IntentSchema;
  let updateIntent: UpdateIntent;
  const preValidationIssues = [];
  const retrievalBundle = await buildDota2RetrievalBundle({
    promptPackageId: "wizard.update",
    queryText: options.input.rawText,
    projectRoot: host.projectRoot || process.cwd(),
    currentFeatureContext: options.input.currentFeatureContext,
  });
  const promptPackage = buildWizardUpdatePromptPackage({
    rawText: options.input.rawText,
    currentFeatureContext: options.input.currentFeatureContext,
    hostSummary: JSON.stringify(host),
    retrievalBundle,
    refinementContext: options.input.refinementContext,
  });

  try {
    const result = await options.client.generateObject<PartialUpdateWizardPayload>({
      messages: promptPackage.messages,
      schemaName: "UpdateWizardInterpretation",
      schemaDescription:
        "Interpret an update request against the current workspace-backed feature context and return a requested-change IntentSchema plus compact delta notes.",
      schema: UPDATE_WIZARD_REFERENCE,
      model: options.input.model,
      temperature: options.input.temperature,
      providerOptions: options.input.providerOptions,
    });

    raw = result.raw;
    requestedChange = normalizeIntentSchema(
      result.object.requestedChange || {},
      options.input.rawText,
      host,
    );
    updateIntent = normalizeUpdateIntent(
      result.object,
      options.input.currentFeatureContext,
      requestedChange,
    );
  } catch (error) {
    requestedChange = createFallbackIntentSchema(options.input.rawText, host);
    updateIntent = normalizeUpdateIntent(
      undefined,
      options.input.currentFeatureContext,
      requestedChange,
    );
    preValidationIssues.push({
      code: "UPDATE_WIZARD_GENERIC_FALLBACK",
      scope: "schema" as const,
      severity: "warning" as const,
      message: `Update wizard fell back to generic semantic interpretation: ${error instanceof Error ? error.message : String(error)}`,
      path: "wizard.update",
    });
  }

  const clarificationPlan = buildWizardClarificationPlan({
    rawText: options.input.rawText,
    schema: requestedChange,
    currentFeatureContext: options.input.currentFeatureContext,
  });
  const issues = [...preValidationIssues, ...validateIntentSchema(requestedChange)];

  return {
    requestedChange,
    updateIntent,
    interpretation: {
      requestedChange,
      updateIntent,
      ...(clarificationPlan ? { clarificationPlan } : {}),
      promptPackageId: promptPackage.id,
      promptConstraints: promptPackage.promptConstraints,
      ...(promptPackage.retrievalBundle ? { retrievalBundle: promptPackage.retrievalBundle } : {}),
    },
    ...(clarificationPlan ? { clarificationPlan } : {}),
    issues,
    valid: !issues.some((issue) => issue.severity === "error"),
    raw,
  };
}

export function buildUpdateWizardMessages(
  rawText: string,
  currentFeatureContext: CurrentFeatureContext,
  host: HostDescriptor,
  refinementContext?: UpdateWizardOptions["input"]["refinementContext"],
): Array<{ role: "system" | "user" | "assistant"; content: string }> {
  return buildWizardUpdatePromptPackage({
    rawText,
    currentFeatureContext,
    hostSummary: JSON.stringify(host),
    refinementContext,
  }).messages;
}

export function createUpdateIntentFromRequestedChange(
  currentFeatureContext: CurrentFeatureContext,
  requestedChange: IntentSchema,
): UpdateIntent {
  return normalizeUpdateIntent(undefined, currentFeatureContext, requestedChange);
}
