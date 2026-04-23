export function toGeneratedUiComponentName(value: string): string {
  const normalized = value
    .trim()
    .replace(/[^\p{L}\p{N}_-]+/gu, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toLowerCase();

  const componentName = normalized
    .split(/[_-]+/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join("");

  return componentName || "RuneWeaverSynthPanel";
}
