export type MidZoneShopSkeletonRectBounds = {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
};

export type MidZoneShopSkeletonGeneratorInput = {
  moduleName: string;
  triggerCenterX: number;
  triggerCenterY: number;
  triggerRadius: number;
  triggerAreaSourceAnchorSemanticName: string;
  triggerAreaSourceAnchorRawId: string;
  hintText: string;
  hintDurationSeconds: number;
  shopOrderId: number;
  shopTargetSymbol: string;
  shopTargetSourceAnchorSemanticName: string;
  shopTargetSourceAnchorRawId: string;
  runtimeHookPathHint?: string;
  featureModulePathHint?: string;
  hostBindingReviewPathHint?: string;
  rectBoundsOverride?: MidZoneShopSkeletonRectBounds;
  emitExplicitUnresolvedBounds?: boolean;
};

function escapeTsString(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\r/g, "\\r")
    .replace(/\n/g, "\\n");
}

function formatNumber(value: number): string {
  if (!Number.isFinite(value)) {
    throw new Error(`Expected a finite number, received ${value}.`);
  }

  if (Number.isInteger(value)) {
    return String(value);
  }

  return value.toFixed(3).replace(/\.?0+$/, "");
}

function sanitizeModuleName(value: string): string {
  const trimmed = value.trim();
  const collapsed = trimmed.replace(/[^A-Za-z0-9_]+/g, "_");
  const withoutLeadingDigits = collapsed.replace(/^[^A-Za-z_]+/, "");
  return withoutLeadingDigits || "setupMidZoneShopSlice";
}

function buildRectBoundsLines(input: MidZoneShopSkeletonGeneratorInput): string[] {
  if (input.rectBoundsOverride) {
    const { minX, minY, maxX, maxY } = input.rectBoundsOverride;
    return [
      `  const rect = Rect(${formatNumber(minX)}, ${formatNumber(minY)}, ${formatNumber(maxX)}, ${formatNumber(maxY)});`,
    ];
  }

  if (input.emitExplicitUnresolvedBounds) {
    return [
      "  const rect = Rect(",
      "    UNSPECIFIED IN PROMPT,",
      "    UNSPECIFIED IN PROMPT,",
      "    UNSPECIFIED IN PROMPT,",
      "    UNSPECIFIED IN PROMPT,",
      "  );",
    ];
  }

  const minX = formatNumber(input.triggerCenterX - input.triggerRadius);
  const minY = formatNumber(input.triggerCenterY - input.triggerRadius);
  const maxX = formatNumber(input.triggerCenterX + input.triggerRadius);
  const maxY = formatNumber(input.triggerCenterY + input.triggerRadius);

  return [
    `  const rect = Rect(${minX}, ${minY}, ${maxX}, ${maxY});`,
  ];
}

export function generateMidZoneShopSkeletonModuleDraft(
  input: MidZoneShopSkeletonGeneratorInput,
): string {
  const setupFunctionName = sanitizeModuleName(input.moduleName);
  const hintText = escapeTsString(input.hintText);
  const triggerRadius = formatNumber(input.triggerRadius);
  const hintDuration = formatNumber(input.hintDurationSeconds);
  const shopOrderId = formatNumber(input.shopOrderId);
  const rectBoundsLines = buildRectBoundsLines(input);

  const lines = [
    `const TRIGGER_RADIUS = ${triggerRadius};`,
    `const HINT_TEXT = "${hintText}";`,
    `const HINT_DURATION = ${hintDuration};`,
    `const SHOP_ORDER_ID = ${shopOrderId};`,
    "",
    `export function ${setupFunctionName}(): void {`,
    ...rectBoundsLines,
    "  const region = CreateRegion();",
    "  RegionAddRect(region, rect);",
    "",
    "  const trig = CreateTrigger();",
    "  TriggerRegisterEnterRegion(trig, region, null);",
    "  TriggerAddAction(trig, () => {",
    "    const u = GetEnteringUnit();",
    "    const p = GetOwningPlayer(u);",
    "    if (GetPlayerController(p) !== MAP_CONTROL_USER) {",
    "      return;",
    "    }",
    "    if (GetPlayerSlotState(p) !== PLAYER_SLOT_STATE_PLAYING) {",
    "      return;",
    "    }",
    "    DisplayTimedTextToPlayer(p, 0, 0, HINT_DURATION, HINT_TEXT);",
    `    IssueNeutralTargetOrderById(p, ${input.shopTargetSymbol}, SHOP_ORDER_ID, u); // ${input.shopTargetSymbol}: UNSPECIFIED IN PROMPT binding/declaration site`,
    "  });",
    "}",
    "",
  ];

  return lines.join("\n");
}

export function generateMidZoneShopTstlBootstrapDraft(
  input: MidZoneShopSkeletonGeneratorInput,
): string {
  const setupFunctionName = sanitizeModuleName(input.moduleName);
  const runtimeHookPathHint = escapeTsString(input.runtimeHookPathHint || "src/host/bootstrap.ts");
  const featureModulePathHint = escapeTsString(input.featureModulePathHint || `src/features/${setupFunctionName}.ts`);

  return [
    `import { ${setupFunctionName} } from "../features/${setupFunctionName}";`,
    "",
    "export interface HostBootstrapContext {",
    '  hostKind: "war3-classic";',
    '  platform: "kk";',
    '  warcraftVersion: "1.29";',
    '  scriptMode: "typescript-to-lua";',
    "  hostCapabilities: {",
    "    luaRuntime: true;",
    "    japi: true;",
    "  };",
    "}",
    "",
    "function createBootstrapContext(): HostBootstrapContext {",
    "  return {",
    '    hostKind: "war3-classic",',
    '    platform: "kk",',
    '    warcraftVersion: "1.29",',
    '    scriptMode: "typescript-to-lua",',
    "    hostCapabilities: {",
    "      luaRuntime: true,",
    "      japi: true,",
    "    },",
    "  };",
    "}",
    "",
    "export function bootstrapHost(): void {",
    "  const context = createBootstrapContext();",
    "  // Review-only TSTL bootstrap draft.",
    "  // Future work should attach actual runtime registration here rather than writing directly from this draft.",
    `  // runtimeHookPathHint: ${runtimeHookPathHint}`,
    `  // featureModulePathHint: ${featureModulePathHint}`,
    `  ${setupFunctionName}(context);`,
    "}",
    "",
  ].join("\n");
}

export function generateMidZoneShopTstlFeatureModuleDraft(
  input: MidZoneShopSkeletonGeneratorInput,
): string {
  const setupFunctionName = sanitizeModuleName(input.moduleName);
  const hintText = escapeTsString(input.hintText);
  const triggerRadius = formatNumber(input.triggerRadius);
  const hintDuration = formatNumber(input.hintDurationSeconds);
  const shopOrderId = formatNumber(input.shopOrderId);
  const triggerCenterX = formatNumber(input.triggerCenterX);
  const triggerCenterY = formatNumber(input.triggerCenterY);
  const triggerAreaSourceAnchorSemanticName = escapeTsString(input.triggerAreaSourceAnchorSemanticName);
  const triggerAreaSourceAnchorRawId = escapeTsString(input.triggerAreaSourceAnchorRawId);
  const shopTargetSourceAnchorSemanticName = escapeTsString(input.shopTargetSourceAnchorSemanticName);
  const shopTargetSourceAnchorRawId = escapeTsString(input.shopTargetSourceAnchorRawId);
  const featureModulePathHint = escapeTsString(input.featureModulePathHint || `src/features/${setupFunctionName}.ts`);
  const runtimeHookPathHint = escapeTsString(input.runtimeHookPathHint || "src/host/bootstrap.ts");
  const hostBindingReviewPathHint = escapeTsString(
    input.hostBindingReviewPathHint || "rune_weaver/generated/host-binding/current-slice.json",
  );

  return [
    'import type { HostBootstrapContext } from "../host/bootstrap";',
    "",
    `const TRIGGER_RADIUS = ${triggerRadius};`,
    `const HINT_TEXT = "${hintText}";`,
    `const HINT_DURATION = ${hintDuration};`,
    `const SHOP_ORDER_ID = ${shopOrderId};`,
    "",
    "export interface MidZoneShopFeatureDraft {",
    '  featureId: "setup-mid-zone-shop";',
    '  status: "review-only-draft";',
    "  hintedBindings: {",
    "    triggerArea: {",
    '      mode: "generated-radius";',
    "      radius: number;",
    "    };",
    "    shopTarget: {",
    "      bindingSymbol: string;",
    "      orderId: number;",
    "    };",
    "  };",
    "  hostBindingDraft: {",
    "    triggerArea: {",
    '      kind: "trigger-area";',
    '      status: "review-only";',
    '      mode: "generated-radius";',
    "      sourceAnchorSemanticName: string;",
    "      sourceAnchorRawId: string;",
    "      center: {",
    "        x: number;",
    "        y: number;",
    "      };",
    "      radius: number;",
    '      realizationSitePathHint: string;',
    '      realizationStatus: "needs-host-project";',
    "    };",
    "    shopTarget: {",
    '      kind: "shop-target";',
    '      status: "review-only";',
    '      mode: "existing-anchor";',
    "      sourceAnchorSemanticName: string;",
    "      sourceAnchorRawId: string;",
    "      bindingSymbol: string;",
    '      declarationSitePathHint: string;',
    '      declarationStatus: "needs-host-project";',
    "    };",
    "    runtimeHook: {",
    '      kind: "runtime-hook";',
    '      status: "review-only";',
    '      hookKind: "unit-enters-generated-radius-area";',
    '      targetPathHint: string;',
    '      integrationStatus: "needs-host-project";',
    "    };",
    '    reviewPathHint: string;',
    "  };",
    "  unresolved: string[];",
    "}",
    "",
    `export function ${setupFunctionName}(_context: HostBootstrapContext): MidZoneShopFeatureDraft {`,
    "  return {",
    '    featureId: "setup-mid-zone-shop",',
    '    status: "review-only-draft",',
    "    hintedBindings: {",
    "      triggerArea: {",
    '        mode: "generated-radius",',
    "        radius: TRIGGER_RADIUS,",
    "      },",
    "      shopTarget: {",
    `        bindingSymbol: "${input.shopTargetSymbol}",`,
    "        orderId: SHOP_ORDER_ID,",
    "      },",
    "    },",
    "    hostBindingDraft: {",
    "      triggerArea: {",
    '        kind: "trigger-area",',
    '        status: "review-only",',
    '        mode: "generated-radius",',
    `        sourceAnchorSemanticName: "${triggerAreaSourceAnchorSemanticName}",`,
    `        sourceAnchorRawId: "${triggerAreaSourceAnchorRawId}",`,
    "        center: {",
    `          x: ${triggerCenterX},`,
    `          y: ${triggerCenterY},`,
    "        },",
    "        radius: TRIGGER_RADIUS,",
    `        realizationSitePathHint: "${featureModulePathHint}",`,
    '        realizationStatus: "needs-host-project",',
    "      },",
    "      shopTarget: {",
    '        kind: "shop-target",',
    '        status: "review-only",',
    '        mode: "existing-anchor",',
    `        sourceAnchorSemanticName: "${shopTargetSourceAnchorSemanticName}",`,
    `        sourceAnchorRawId: "${shopTargetSourceAnchorRawId}",`,
    `        bindingSymbol: "${input.shopTargetSymbol}",`,
    `        declarationSitePathHint: "${featureModulePathHint}",`,
    '        declarationStatus: "needs-host-project",',
    "      },",
    "      runtimeHook: {",
    '        kind: "runtime-hook",',
    '        status: "review-only",',
    '        hookKind: "unit-enters-generated-radius-area",',
    `        targetPathHint: "${runtimeHookPathHint}",`,
    '        integrationStatus: "needs-host-project",',
    "      },",
    `      reviewPathHint: "${hostBindingReviewPathHint}",`,
    "    },",
    "    unresolved: [",
    '      "Real trigger registration is intentionally omitted in this TSTL draft.",',
    '      "Shop target declaration/binding site is still unresolved review work.",',
    '      "Runtime hook integration remains a bootstrap-level host project concern.",',
    `      "Hint text remains review data only: ${hintText} (${hintDuration}s).",`,
    "    ],",
    "  };",
    "}",
    "",
  ].join("\n");
}
