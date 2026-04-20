import type { WritePlan, WritePlanEntry } from "./assembler/index.js";

export interface Dota2ProviderAbilityBinding {
  abilityName: string;
  luaEntry: WritePlanEntry;
  kvEntry: WritePlanEntry;
}

export interface Dota2ProviderAbilityBindingResolution {
  binding?: Dota2ProviderAbilityBinding;
  issues: string[];
}

function dedupeStrings(values: Array<string | undefined>): string[] {
  return [...new Set(values.filter((value): value is string => Boolean(value && value.trim().length > 0)))];
}

export function sanitizeDotaAbilityName(value: string, fallback = "rw_feature"): string {
  const normalize = (input: string): string =>
    input
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_]+/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_+|_+$/g, "");

  let sanitized = normalize(value);
  if (!sanitized) {
    sanitized = normalize(fallback);
  }
  if (!sanitized) {
    sanitized = "rw_feature";
  }
  if (!/^[a-z_]/.test(sanitized)) {
    sanitized = `rw_${sanitized}`;
  }
  return sanitized;
}

export function isValidDotaAbilityName(value: string | undefined | null): value is string {
  return typeof value === "string" && /^[a-z_][a-z0-9_]*$/.test(value.trim());
}

export function extractLuaAbilityRuntimeSymbol(content: string): string | undefined {
  const patterns = [
    /if\s+([A-Za-z_][A-Za-z0-9_]*)\s*==\s*nil\b/,
    /\b([A-Za-z_][A-Za-z0-9_]*)\s*=\s*class\s*\(\s*\{\s*\}\s*\)/,
    /function\s+([A-Za-z_][A-Za-z0-9_]*)\s*:/,
  ];

  for (const pattern of patterns) {
    const match = content.match(pattern);
    if (match?.[1]) {
      return match[1];
    }
  }

  return undefined;
}

export function extractKvAbilityBlockName(content: string): string | undefined {
  const match = content.match(/^\s*"([^"]+)"\s*(?:\{|$)/m);
  return match?.[1];
}

export function extractKvAbilityScriptFile(content: string): string | undefined {
  const match = content.match(/"ScriptFile"\s+"([^"]+)"/);
  return match?.[1];
}

export function validateAbilityContentIdentity(
  contentType: "lua" | "kv",
  content: string,
  expectedAbilityName: string,
): string | undefined {
  if (contentType === "lua") {
    const runtimeSymbol = extractLuaAbilityRuntimeSymbol(content);
    if (!runtimeSymbol) {
      return "Lua content does not define a detectable runtime symbol";
    }
    if (runtimeSymbol !== expectedAbilityName) {
      return `Lua runtime symbol '${runtimeSymbol}' does not match authoritative abilityName '${expectedAbilityName}'`;
    }
    return undefined;
  }

  const blockName = extractKvAbilityBlockName(content);
  if (!blockName) {
    return "KV content does not define a detectable ability block";
  }
  if (blockName !== expectedAbilityName) {
    return `KV ability block '${blockName}' does not match authoritative abilityName '${expectedAbilityName}'`;
  }

  const scriptFile = extractKvAbilityScriptFile(content);
  if (!scriptFile) {
    return `KV ability '${expectedAbilityName}' is missing a ScriptFile binding`;
  }

  const normalizedScriptFile = scriptFile.replace(/\\/g, "/").replace(/\.lua$/i, "");
  const scriptFileLeaf = normalizedScriptFile.split("/").pop();
  if (scriptFileLeaf !== expectedAbilityName) {
    return `KV ScriptFile '${scriptFile}' does not match authoritative abilityName '${expectedAbilityName}'`;
  }

  return undefined;
}

function resolveEntryAbilityName(entry: WritePlanEntry): string | undefined {
  const metadataAbilityName = entry.metadata?.abilityName;
  if (typeof metadataAbilityName === "string" && metadataAbilityName.trim().length > 0) {
    return metadataAbilityName.trim();
  }

  const parameterAbilityName = entry.parameters?.abilityName;
  if (typeof parameterAbilityName === "string" && parameterAbilityName.trim().length > 0) {
    return parameterAbilityName.trim();
  }

  return undefined;
}

function getSynthesizedContent(entry: WritePlanEntry): string | undefined {
  const synthesizedContent = entry.metadata?.synthesizedContent;
  return typeof synthesizedContent === "string" && synthesizedContent.trim().length > 0
    ? synthesizedContent
    : undefined;
}

function looksLikeAbilityBearingEntry(entry: WritePlanEntry): boolean {
  if (entry.deferred) {
    return false;
  }

  if (entry.contentType === "lua") {
    return Boolean(
      resolveEntryAbilityName(entry)
      || /rune_weaver[\\/]+abilities[\\/].+\.lua$/i.test(entry.targetPath),
    );
  }

  if (entry.contentType === "kv") {
    return Boolean(
      resolveEntryAbilityName(entry)
      || /npc_abilities_custom\.txt$/i.test(entry.targetPath),
    );
  }

  return false;
}

export function resolveProviderAbilityBindingFromWritePlan(
  writePlan: Pick<WritePlan, "entries">,
): Dota2ProviderAbilityBindingResolution {
  const issues: string[] = [];
  const luaCandidates: Array<{ abilityName: string; entry: WritePlanEntry }> = [];
  const kvCandidates: Array<{ abilityName: string; entry: WritePlanEntry }> = [];

  for (const entry of writePlan.entries) {
    if (!looksLikeAbilityBearingEntry(entry)) {
      continue;
    }

    if (entry.contentType !== "lua" && entry.contentType !== "kv") {
      continue;
    }

    const authorityName = resolveEntryAbilityName(entry);
    if (!authorityName) {
      issues.push(`Entry '${entry.targetPath}' is missing authoritative abilityName metadata.`);
      continue;
    }
    if (!isValidDotaAbilityName(authorityName)) {
      issues.push(`Entry '${entry.targetPath}' has invalid authoritative abilityName '${authorityName}'.`);
      continue;
    }

    const synthesizedContent = getSynthesizedContent(entry);
    if (synthesizedContent) {
      const identityMismatch = validateAbilityContentIdentity(
        entry.contentType,
        synthesizedContent,
        authorityName,
      );
      if (identityMismatch) {
        issues.push(`Entry '${entry.targetPath}' ${identityMismatch}.`);
        continue;
      }
    }

    if (entry.contentType === "lua") {
      luaCandidates.push({ abilityName: authorityName, entry });
    } else {
      kvCandidates.push({ abilityName: authorityName, entry });
    }
  }

  if (luaCandidates.length !== 1) {
    issues.push(`Expected exactly one provider Lua ability entry, found ${luaCandidates.length}.`);
  }
  if (kvCandidates.length !== 1) {
    issues.push(`Expected exactly one provider KV ability entry, found ${kvCandidates.length}.`);
  }

  const candidateNames = dedupeStrings([
    ...luaCandidates.map((candidate) => candidate.abilityName),
    ...kvCandidates.map((candidate) => candidate.abilityName),
  ]);

  if (candidateNames.length !== 1) {
    issues.push(
      candidateNames.length === 0
        ? "Provider write-plan did not close any authoritative abilityName."
        : `Provider write-plan closed multiple ability names: ${candidateNames.join(", ")}.`,
    );
  }

  if (issues.length > 0) {
    return { issues: dedupeStrings(issues) };
  }

  return {
    binding: {
      abilityName: candidateNames[0],
      luaEntry: luaCandidates[0].entry,
      kvEntry: kvCandidates[0].entry,
    },
    issues: [],
  };
}
