import type { War3IntakeArtifact } from "./war3-intake";

export interface War3LLMMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface War3HandoffBundle {
  schemaVersion: "war3-handoff/v1";
  generatedAt: string;
  systemPrompt: string;
  userPrompt: string;
  checks: string[];
  llmMessages: War3LLMMessage[];
  summary: {
    mapName?: string;
    tileset?: string;
    scriptType?: string;
    confirmedAnchors: number;
    hasFeatureDescription: boolean;
  };
}

function describeScriptType(scriptType: number | undefined): string {
  if (scriptType === 1) {
    return "Lua";
  }
  if (scriptType === 0) {
    return "Jass";
  }
  return "Unknown";
}

export function buildWar3HandoffBundle(artifact: War3IntakeArtifact): War3HandoffBundle {
  const mapName = artifact.map.summary?.name || "未命名地图";
  const tileset = artifact.map.summary?.tileset || "unknown";
  const scriptType = describeScriptType(artifact.map.summary?.scriptType);

  const systemPrompt = [
    "你是 Rune Weaver 的 Warcraft III 宿主生成助手。",
    "目标宿主固定为经典 War3，运行环境是中国 KK 对战平台的 1.29。",
    "脚本模式固定为 TypeScript to Lua。",
    "禁止输出或依赖 Jass 方案。",
    "优先复用地图里已经确认的位置语义，避免发明不存在的地标。",
    "如果输入里存在不确定项，先按保守假设生成，再明确标注假设点。",
  ].join("\n");

  const anchorLines = artifact.anchors.length > 0
    ? artifact.anchors.map((anchor) => {
        const ownerText = anchor.owner !== undefined ? `, owner=P${anchor.owner}` : "";
        return `${anchor.order}. ${anchor.semanticName} [${anchor.role}] source=${anchor.source}, region=${anchor.regionHint}, pos=(${anchor.position.x}, ${anchor.position.y}, ${anchor.position.z})${ownerText}`;
      })
    : ["（暂无已确认锚点）"];

  const userPrompt = [
    `宿主: ${artifact.host.hostKind} / ${artifact.host.platform} / War3 ${artifact.host.warcraftVersion}`,
    `地图: ${mapName}`,
    `Tileset: ${tileset}`,
    `脚本类型: ${scriptType}`,
    `玩家数: ${artifact.map.summary?.playersCount ?? "unknown"}`,
    "",
    "已确认锚点:",
    ...anchorLines,
    "",
    "用户需求:",
    artifact.feature.description || "（未填写）",
    "",
    "补充约束输入:",
    `shopInteractionMode: ${artifact.feature.inputs.shopInteractionMode || "unknown"}`,
    `shopUnlockMechanism: ${artifact.feature.inputs.shopUnlockMechanism || "unknown"}`,
    `targetPlayers: ${artifact.feature.inputs.targetPlayers || "unknown"}`,
    `hintDurationSeconds: ${artifact.feature.inputs.hintDurationSeconds ?? "unknown"}`,
    `explicitHintText: ${artifact.feature.inputs.explicitHintText || "unknown"}`,
    `shopObjectId: ${artifact.feature.inputs.shopObjectId || "unknown"}`,
    `shopTargetMode: ${artifact.feature.inputs.shopTargetMode}`,
    `shopTargetSourceId: ${artifact.feature.inputs.shopTargetSourceId || "unknown"}`,
    `shopOrderMode: ${artifact.feature.inputs.shopOrderMode}`,
    `shopOrderId: ${artifact.feature.inputs.shopOrderId || "unknown"}`,
    `triggerAreaMode: ${artifact.feature.inputs.triggerAreaMode}`,
    `triggerAreaSourceId: ${artifact.feature.inputs.triggerAreaSourceId || "unknown"}`,
    `triggerAreaRadius: ${artifact.feature.inputs.triggerAreaRadius ?? "unknown"}`,
    `triggerAreaWidth: ${artifact.feature.inputs.triggerAreaWidth ?? "unknown"}`,
    `triggerAreaHeight: ${artifact.feature.inputs.triggerAreaHeight ?? "unknown"}`,
    "",
    "现有上下文草稿:",
    artifact.feature.contextDraft || "（空）",
  ].join("\n");

  const checks = [
    artifact.host.scriptMode === "typescript-to-lua"
      ? "PASS: host script mode is TypeScript to Lua"
      : "FAIL: host script mode mismatch",
    artifact.host.jassSupported === false
      ? "PASS: jass is disabled"
      : "FAIL: jass must remain disabled",
    artifact.anchors.length > 0
      ? `PASS: ${artifact.anchors.length} confirmed anchors available`
      : "WARN: no confirmed anchors",
    artifact.feature.description.trim()
      ? "PASS: feature description present"
      : "WARN: feature description is empty",
    artifact.feature.inputs.shopInteractionMode.trim()
      ? "PASS: shop interaction mode present"
      : "WARN: shop interaction mode missing",
    artifact.feature.inputs.shopUnlockMechanism !== "unknown"
      ? `PASS: shop unlock mechanism is ${artifact.feature.inputs.shopUnlockMechanism}`
      : "WARN: shop unlock mechanism is unknown",
    artifact.feature.inputs.targetPlayers.trim()
      ? "PASS: target players present"
      : "WARN: target players missing",
    artifact.feature.inputs.hintDurationSeconds !== null
      ? "PASS: hint duration present"
      : "WARN: hint duration missing",
    artifact.feature.inputs.explicitHintText.trim()
      ? "PASS: explicit hint text present"
      : "WARN: explicit hint text missing",
    artifact.feature.inputs.shopObjectId.trim()
      ? "PASS: shop object id present"
      : "WARN: shop object id missing",
    artifact.feature.inputs.shopTargetMode !== "unknown"
      ? `PASS: shop target mode is ${artifact.feature.inputs.shopTargetMode}`
      : "WARN: shop target mode is unknown",
    artifact.feature.inputs.shopTargetMode !== "existing-anchor" ||
    artifact.feature.inputs.shopTargetSourceId.trim()
      ? "PASS: shop target source id is acceptable for current mode"
      : "WARN: shop target source id missing for existing-anchor mode",
    artifact.feature.inputs.shopOrderMode !== "unknown"
      ? `PASS: shop order mode is ${artifact.feature.inputs.shopOrderMode}`
      : "WARN: shop order mode is unknown",
    artifact.feature.inputs.shopOrderMode === "unknown" ||
    artifact.feature.inputs.shopOrderId.trim()
      ? "PASS: shop order id presence is acceptable for current mode"
      : "WARN: shop order id missing for explicit order mode",
    artifact.feature.inputs.triggerAreaMode !== "unknown"
      ? `PASS: trigger area mode is ${artifact.feature.inputs.triggerAreaMode}`
      : "WARN: trigger area mode is unknown",
    artifact.feature.inputs.triggerAreaMode !== "existing-region" ||
    artifact.feature.inputs.triggerAreaSourceId.trim()
      ? "PASS: trigger area source id is acceptable for current mode"
      : "WARN: trigger area source id missing for existing-region mode",
    artifact.feature.inputs.triggerAreaMode !== "generated-radius" ||
    artifact.feature.inputs.triggerAreaRadius !== null
      ? "PASS: trigger area radius is acceptable for current mode"
      : "WARN: trigger area radius missing for generated-radius mode",
    artifact.feature.inputs.triggerAreaMode !== "generated-rect" ||
    (artifact.feature.inputs.triggerAreaWidth !== null &&
      artifact.feature.inputs.triggerAreaHeight !== null)
      ? "PASS: trigger area width/height are acceptable for current mode"
      : "WARN: trigger area width/height missing for generated-rect mode",
  ];

  return {
    schemaVersion: "war3-handoff/v1",
    generatedAt: new Date().toISOString(),
    systemPrompt,
    userPrompt,
    checks,
    llmMessages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    summary: {
      mapName: artifact.map.summary?.name,
      tileset: artifact.map.summary?.tileset,
      scriptType,
      confirmedAnchors: artifact.anchors.length,
      hasFeatureDescription: artifact.feature.description.trim().length > 0,
    },
  };
}
