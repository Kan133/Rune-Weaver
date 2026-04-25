import { toPascalCase } from "../generator/common/naming.js";

function normalizeGeneratedComponentName(value: string): string {
  return value
    .trim()
    .replace(/[^\p{L}\p{N}_-]+/gu, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toLowerCase();
}

function toCanonicalGeneratedComponentName(value: string): string {
  const normalized = normalizeGeneratedComponentName(value);
  return normalized ? toPascalCase(normalized) : "RuneWeaverSynthPanel";
}

export function toGeneratedUiComponentName(value: string): string {
  return toCanonicalGeneratedComponentName(value);
}

export function toGeneratedComponentExportName(value: string): string {
  return toCanonicalGeneratedComponentName(value);
}
