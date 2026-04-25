import { existsSync, readdirSync, readFileSync } from "fs";
import { join } from "path";

import type { RuneWeaverFeatureRecord } from "../../../core/workspace/types.js";
import type { WritePlan, WritePlanEntry } from "../assembler/index.js";

interface PersistedWeightedPoolParameters {
  entries: Array<{
    id: string;
    label: string;
    description: string;
    weight: number;
    tier?: string;
  }>;
  choiceCount?: number;
  drawMode?: "single" | "multiple_without_replacement" | "multiple_with_replacement";
  duplicatePolicy?: "allow" | "avoid_when_possible" | "forbid";
  poolStateTracking?: "none" | "session";
}

function isWeightedPoolGeneratedFile(file: string): boolean {
  const normalized = file.replace(/\\/g, "/");
  return normalized.includes("/generated/shared/") && normalized.includes("weighted_pool") && normalized.endsWith(".ts");
}

function normalizeChoiceCount(value: unknown): number | undefined {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric < 1) {
    return undefined;
  }
  return Math.max(1, Math.floor(numeric));
}

function parseWeightedPoolEntries(content: string): PersistedWeightedPoolParameters["entries"] {
  const entries: PersistedWeightedPoolParameters["entries"] = [];
  const pattern = /\{\s*id:\s*"((?:\\.|[^"])*)",\s*label:\s*"((?:\\.|[^"])*)",\s*description:\s*"((?:\\.|[^"])*)",\s*weight:\s*([0-9.]+)(?:,\s*tier:\s*"((?:\\.|[^"])*)")?\s*\}/g;
  for (const match of content.matchAll(pattern)) {
    const weight = Number(match[4]);
    if (!Number.isFinite(weight)) {
      continue;
    }
    entries.push({
      id: match[1].replace(/\\"/g, '"'),
      label: match[2].replace(/\\"/g, '"'),
      description: match[3].replace(/\\"/g, '"'),
      weight,
      ...(match[5] ? { tier: match[5].replace(/\\"/g, '"') } : {}),
    });
  }
  return entries;
}

function parseWeightedPoolSource(content: string): PersistedWeightedPoolParameters | undefined {
  const entries = parseWeightedPoolEntries(content);
  if (entries.length === 0) {
    return undefined;
  }

  const choiceCountMatch = content.match(/drawForSelection\(count: number = (\d+)\)/);
  const drawModeMatch = content.match(/const configuredDrawMode: string = "([^"]+)";/);
  const duplicatePolicyMatch = content.match(/const configuredDuplicatePolicy: string = "([^"]+)";/);
  const poolStateTrackingMatch = content.match(/poolStateTracking:\s*([a-z_]+)/i);

  return {
    entries,
    ...(choiceCountMatch ? { choiceCount: normalizeChoiceCount(choiceCountMatch[1]) } : {}),
    ...(drawModeMatch
      ? {
          drawMode: drawModeMatch[1] as PersistedWeightedPoolParameters["drawMode"],
        }
      : {}),
    ...(duplicatePolicyMatch
      ? {
          duplicatePolicy: duplicatePolicyMatch[1] as PersistedWeightedPoolParameters["duplicatePolicy"],
        }
      : {}),
    ...(poolStateTrackingMatch
      ? {
          poolStateTracking: poolStateTrackingMatch[1].toLowerCase() as PersistedWeightedPoolParameters["poolStateTracking"],
        }
      : {}),
  };
}

function readPersistedWeightedPoolParameters(
  hostRoot: string,
  existingFeature: RuneWeaverFeatureRecord,
): PersistedWeightedPoolParameters | undefined {
  const generatedCandidates = existingFeature.generatedFiles.filter(isWeightedPoolGeneratedFile);
  const relativePath = generatedCandidates[0];
  if (relativePath) {
    const fullPath = join(hostRoot, relativePath);
    if (existsSync(fullPath)) {
      return parseWeightedPoolSource(readFileSync(fullPath, "utf-8"));
    }
  }

  const sharedDir = join(hostRoot, "game/scripts/src/rune_weaver/generated/shared");
  if (!existsSync(sharedDir)) {
    return undefined;
  }

  const fallbackFile = readdirSync(sharedDir).find(
    (file) => file.startsWith(`${existingFeature.featureId}_`) && file.includes("weighted_pool") && file.endsWith(".ts"),
  );
  if (!fallbackFile) {
    return undefined;
  }

  return parseWeightedPoolSource(readFileSync(join(sharedDir, fallbackFile), "utf-8"));
}

function mergeWeightedPoolParameters(
  entry: WritePlanEntry,
  persisted: PersistedWeightedPoolParameters,
): void {
  const current = (entry.parameters || {}) as Record<string, unknown>;
  const currentEntries = Array.isArray(current.entries) ? current.entries : undefined;
  entry.parameters = {
    ...persisted,
    ...current,
    entries: currentEntries && currentEntries.length > 0 ? currentEntries : persisted.entries,
    choiceCount: normalizeChoiceCount(current.choiceCount) || persisted.choiceCount,
    drawMode: typeof current.drawMode === "string" ? current.drawMode : persisted.drawMode,
    duplicatePolicy:
      typeof current.duplicatePolicy === "string" ? current.duplicatePolicy : persisted.duplicatePolicy,
    poolStateTracking:
      typeof current.poolStateTracking === "string" ? current.poolStateTracking : persisted.poolStateTracking,
  };
}

export function refreshWeightedPoolWritePlan(
  writePlan: WritePlan,
  options: {
    hostRoot: string;
    existingFeature?: RuneWeaverFeatureRecord | null;
  },
): void {
  if (!options.existingFeature) {
    return;
  }

  const persisted = readPersistedWeightedPoolParameters(options.hostRoot, options.existingFeature);
  if (!persisted) {
    return;
  }

  for (const entry of writePlan.entries) {
    if (entry.sourcePattern !== "data.weighted_pool") {
      continue;
    }
    mergeWeightedPoolParameters(entry, persisted);
  }
}
