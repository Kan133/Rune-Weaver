import type { AnchorKind, SceneReference } from "./types.js";

const SCENE_ANCHOR_KEYWORDS: Record<AnchorKind, string[]> = {
  trigger_zone: ["zone", "area", "region", "区域", "范围"],
  spawn_point: ["spawn", "生成", "出生点", "start point"],
  area_anchor: ["area", "location", "position", "位置", "地点"],
  marker: ["marker", "标记", "flag", "旗帜"],
  waypoint: ["waypoint", "path", "路径", "路线", "路点"],
};

export function detectSceneAnchors(userRequest: string, host: string): SceneReference[] {
  const references: SceneReference[] = [];
  const requestLower = userRequest.toLowerCase();

  for (const [kind, keywords] of Object.entries(SCENE_ANCHOR_KEYWORDS) as [AnchorKind, string[]][]) {
    for (const keyword of keywords) {
      if (requestLower.includes(keyword)) {
        const anchorName = extractAnchorName(userRequest, keyword);
        if (anchorName) {
          references.push({
            id: `scene_ref_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            anchorName,
            anchorKind: kind,
            host,
            notes: [`Detected ${kind} reference from user request`],
            confidence: "medium",
          });
        }
        break;
      }
    }
  }

  return references.slice(0, 5);
}

function extractAnchorName(request: string, keyword: string): string | null {
  const requestLower = request.toLowerCase();
  const keywordIndex = requestLower.indexOf(keyword);
  if (keywordIndex === -1) return null;

  const beforeKeyword = request.substring(0, keywordIndex).trim();
  const afterKeyword = request.substring(keywordIndex + keyword.length).trim();

  const nameMatch = beforeKeyword.match(/(?:at|near|at\s+(?:the\s+)?|in\s+(?:the\s+)?|from\s+(?:the\s+)?)(\w+)$/i) ||
    afterKeyword.match(/^(\w+)/i);

  if (nameMatch) {
    return nameMatch[1].charAt(0).toUpperCase() + nameMatch[1].slice(1).toLowerCase();
  }

  return `Anchor_${keyword.charAt(0).toUpperCase() + keyword.slice(1)}`;
}
