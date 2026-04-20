import type { BlueprintModule, FeatureAuthoring as CoreFeatureAuthoring, FillContract } from "../../../../core/schema/types.js";
import { dota2GapFillBoundaryProvider } from "../../gap-fill/boundaries.js";
import {
  createSourceModelRef,
  deepClone,
  getDisplayDefaults,
  getPlaceholderDefaults,
  isSelectionPoolFeatureAuthoring,
  normalizeFeatureAuthoringParameters,
  resolveSelectionPoolObjectKind,
  type FeatureAuthoring,
  type SelectionPoolCompiledModuleParameters,
  type SelectionPoolFeatureSourceArtifactV1,
  type SelectionPoolLifecycleState,
} from "./shared.js";

function compileEffectApplication(
  effectProfile: FeatureAuthoring["parameters"]["effectProfile"],
): Record<string, unknown> | undefined {
  return effectProfile
    ? {
        enabled: true,
        rarityAttributeBonusMap: deepClone(effectProfile.rarityAttributeBonusMap),
      }
    : undefined;
}

export function compileSelectionPoolModuleParameters(
  featureAuthoring: FeatureAuthoring,
): SelectionPoolCompiledModuleParameters {
  const params = normalizeFeatureAuthoringParameters(
    featureAuthoring.parameters,
    resolveSelectionPoolObjectKind(featureAuthoring.parameters.objectKind)
      || resolveSelectionPoolObjectKind(featureAuthoring.objectKind),
  );
  const display = params.display || getDisplayDefaults();
  return {
    input_trigger: {
      triggerKey: params.triggerKey,
      key: params.triggerKey,
      eventName: "rune_weaver_selection_pool_triggered",
    },
    weighted_pool: {
      entries: params.objects.map((object) => ({
        id: object.id,
        label: object.label,
        description: object.description,
        weight: object.weight,
        tier: object.tier,
      })),
      choiceCount: params.choiceCount,
      drawMode: params.drawMode || "multiple_without_replacement",
      duplicatePolicy: params.duplicatePolicy || "forbid",
      poolStateTracking: params.poolStateTracking || "session",
    },
    selection_flow: {
      choiceCount: params.choiceCount,
      selectionPolicy: "single",
      applyMode: params.applyMode || "immediate",
      postSelectionPoolBehavior: params.postSelectionPoolBehavior || "remove_selected_from_remaining",
      trackSelectedItems: params.trackSelectedItems !== false,
      ...(compileEffectApplication(params.effectProfile)
        ? { effectApplication: compileEffectApplication(params.effectProfile) }
        : {}),
      ...(params.inventory ? { inventory: deepClone(params.inventory) } : {}),
    },
    selection_modal: {
      choiceCount: params.choiceCount,
      title: display.title,
      description: display.description,
      inventoryTitle: display.inventoryTitle,
      payloadShape: display.payloadShape || "card_with_rarity",
      minDisplayCount: Math.max(params.choiceCount, Number(display.minDisplayCount || params.choiceCount)),
      placeholderConfig: deepClone(params.placeholderConfig || getPlaceholderDefaults()),
      layoutPreset: "card_tray",
      selectionMode: "single",
      dismissBehavior: "selection_only",
      ...(params.inventory ? { inventory: deepClone(params.inventory) } : {}),
    },
  };
}

function createFillContract(
  boundaryId: "weighted_pool.selection_policy" | "selection_flow.effect_mapping" | "ui.selection_modal.payload_adapter",
  targetModuleId: string,
  targetPatternId: string,
  sourceBindings: string[],
  invariants: string[],
  expectedOutput: string,
): FillContract {
  const boundary = dota2GapFillBoundaryProvider.getBoundary(boundaryId);
  return {
    boundaryId,
    targetModuleId,
    targetPatternId,
    mode: "closed",
    sourceBindings,
    allowed: boundary?.allowed || [],
    forbidden: boundary?.forbidden || [],
    invariants,
    expectedOutput,
    fallbackPolicy: "deterministic-default",
  };
}

export function buildSelectionPoolFillContracts(modules: BlueprintModule[]): FillContract[] {
  const moduleByRole = new Map(modules.map((module) => [module.role, module] as const));
  const weightedPoolModule = moduleByRole.get("weighted_pool");
  const selectionFlowModule = moduleByRole.get("selection_flow");
  const selectionModalModule = moduleByRole.get("selection_modal");
  const contracts: FillContract[] = [];
  if (weightedPoolModule) {
    contracts.push(
      createFillContract(
        "weighted_pool.selection_policy",
        weightedPoolModule.id,
        "data.weighted_pool",
        [
          "featureAuthoring.parameters.objects",
          "featureAuthoring.parameters.choiceCount",
          "featureAuthoring.parameters.drawMode",
          "featureAuthoring.parameters.duplicatePolicy",
          "featureAuthoring.parameters.poolStateTracking",
        ],
        [
          "keep pool state ownership inside data.weighted_pool",
          "do not invent persistence or host routing changes",
        ],
        "Produce weighted candidate draw policy inside the existing weighted pool API.",
      ),
    );
  }
  if (selectionFlowModule) {
    contracts.push(
      createFillContract(
        "selection_flow.effect_mapping",
        selectionFlowModule.id,
        "rule.selection_flow",
        [
          "featureAuthoring.parameters.objects",
          "featureAuthoring.parameters.effectProfile",
          "featureAuthoring.parameters.inventory",
        ],
        [
          "do not move session ownership out of data.weighted_pool",
          "do not invent new event channels or cross-feature grants",
        ],
        "Translate the authored object/effect profile into the admitted selection confirmation and immediate-apply hook.",
      ),
    );
  }
  if (selectionModalModule) {
    contracts.push(
      createFillContract(
        "ui.selection_modal.payload_adapter",
        selectionModalModule.id,
        "ui.selection_modal",
        [
          "featureAuthoring.parameters.objects",
          "featureAuthoring.parameters.display",
          "featureAuthoring.parameters.placeholderConfig",
          "featureAuthoring.parameters.inventory",
        ],
        [
          "keep trigger ownership out of ui.selection_modal",
          "do not change transport events or root mount wiring",
        ],
        "Adapt authored object display fields into the admitted card tray payload.",
      ),
    );
  }
  return contracts;
}

export function materializeSelectionPoolSourceArtifact(
  featureId: string,
  featureAuthoring: FeatureAuthoring,
): SelectionPoolLifecycleState {
  const params = normalizeFeatureAuthoringParameters(
    featureAuthoring.parameters,
    resolveSelectionPoolObjectKind(featureAuthoring.parameters.objectKind)
      || resolveSelectionPoolObjectKind(featureAuthoring.objectKind),
  );
  const sourceArtifactRef = createSourceModelRef(featureId);
  const sourceArtifact: SelectionPoolFeatureSourceArtifactV1 = {
    adapter: "selection_pool",
    version: 1,
    featureId,
    ...(params.objectKind ? { objectKind: params.objectKind } : {}),
    triggerKey: params.triggerKey,
    choiceCount: params.choiceCount,
    drawMode: params.drawMode || "multiple_without_replacement",
    duplicatePolicy: params.duplicatePolicy || "forbid",
    poolStateTracking: params.poolStateTracking || "session",
    selectionPolicy: "single",
    applyMode: params.applyMode || "immediate",
    postSelectionPoolBehavior: params.postSelectionPoolBehavior || "remove_selected_from_remaining",
    trackSelectedItems: params.trackSelectedItems !== false,
    display: deepClone(params.display),
    placeholderConfig: deepClone(params.placeholderConfig),
    inventory: params.inventory ? deepClone(params.inventory) : undefined,
    effectProfile: params.effectProfile ? deepClone(params.effectProfile) : undefined,
    objects: params.objects.map((object) => ({ ...object })),
  };
  return {
    featureAuthoring: {
      mode: featureAuthoring.mode,
      profile: featureAuthoring.profile,
      ...(params.objectKind ? { objectKind: params.objectKind } : {}),
      parameters: params,
      parameterSurface: featureAuthoring.parameterSurface,
      sourceArtifactRef,
      notes: featureAuthoring.notes,
    },
    sourceArtifact,
    sourceArtifactRef,
  };
}

export function createSelectionPoolLifecycleState(
  featureId: string,
  featureAuthoring: CoreFeatureAuthoring | undefined,
): SelectionPoolLifecycleState | undefined {
  if (!isSelectionPoolFeatureAuthoring(featureAuthoring)) {
    return undefined;
  }
  return materializeSelectionPoolSourceArtifact(featureId, featureAuthoring);
}
