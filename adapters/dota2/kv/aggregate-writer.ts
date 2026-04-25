import { existsSync, readFileSync, readdirSync } from "fs";
import { join } from "path";

import {
  ABILITY_KV_FRAGMENT_ROOT,
  isAbilityKvFragmentPath,
  normalizeAbilityKvAggregateTargetPath,
} from "./contract.js";

export interface AbilityKvPendingFragment {
  fragmentPath: string;
  content: string;
  aggregateTargetPath?: string;
  abilityName?: string;
}

export interface AbilityKvAggregateMaterialization {
  aggregateTargetPath: string;
  content: string;
  fragmentPaths: string[];
  abilityNames: string[];
}

function normalizePath(path: string): string {
  return path.replace(/\\/g, "/");
}

function resolveFragmentPath(hostRoot: string, fragmentPath: string): string {
  return /^[A-Za-z]:[\\/]/.test(fragmentPath)
    ? fragmentPath
    : join(hostRoot, fragmentPath);
}

export function parseAbilityBlocks(content: string): Map<string, string> {
  const blocks = new Map<string, string>();
  const lines = content.split(/\r?\n/);

  let insideRoot = false;
  let rootDepth = 0;
  let currentName: string | null = null;
  let currentLines: string[] = [];
  let braceDepth = 0;

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (!insideRoot) {
      if (line === "\"DOTAAbilities\"") {
        insideRoot = true;
      }
      continue;
    }

    if (!currentName) {
      if (line === "{") {
        rootDepth += 1;
        continue;
      }

      if (line === "}") {
        rootDepth -= 1;
        if (rootDepth <= 0) {
          insideRoot = false;
        }
        continue;
      }
    }

    if (!currentName) {
      const nameMatch = line.match(/^"([^"]+)"$/);
      if (nameMatch && nameMatch[1] !== "DOTAAbilities") {
        currentName = nameMatch[1];
        currentLines = [line];
        braceDepth = 0;
        continue;
      }
      continue;
    }

    currentLines.push(rawLine);
    braceDepth += countChar(rawLine, "{");
    braceDepth -= countChar(rawLine, "}");
    if (braceDepth === 0) {
      blocks.set(currentName, currentLines.join("\n"));
      currentName = null;
      currentLines = [];
    }
  }

  return blocks;
}

export function wrapAbilityBlocks(blocks: string[]): string {
  const normalizedBlocks = blocks.map((block) =>
    block
      .split(/\r?\n/)
      .map((line) => `\t${line}`)
      .join("\n"),
  );

  return `"DOTAAbilities"\n{\n${normalizedBlocks.join("\n\n")}\n}\n`;
}

function countChar(value: string, needle: string): number {
  return value.split(needle).length - 1;
}

function listFragmentFiles(rootDir: string): string[] {
  if (!existsSync(rootDir)) {
    return [];
  }

  const results: string[] = [];
  const queue = [rootDir];
  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const fullPath = join(current, entry.name);
      if (entry.isDirectory()) {
        queue.push(fullPath);
      } else {
        results.push(fullPath);
      }
    }
  }

  return results;
}

function extractAbilityBlockName(content: string): string | undefined {
  const match = content.match(/^\s*"([^"]+)"\s*(?:\{|$)/m);
  return match?.[1];
}

function extractAbilityNameFromFragmentPath(fragmentPath: string): string | undefined {
  const normalized = normalizePath(fragmentPath);
  if (!normalized.endsWith(".kv.txt")) {
    return undefined;
  }
  return normalized.split("/").pop()?.replace(/\.kv\.txt$/i, "");
}

function collectManagedFragments(input: {
  hostRoot: string;
  pendingFragments?: AbilityKvPendingFragment[];
  removedFragmentPaths?: string[];
}): Map<string, { fragmentPath: string; content: string }> {
  const removedPaths = new Set((input.removedFragmentPaths || []).map((path) => normalizePath(path)));
  const fragments = new Map<string, { fragmentPath: string; content: string }>();
  const fragmentRoot = join(input.hostRoot, ABILITY_KV_FRAGMENT_ROOT);

  for (const absolutePath of listFragmentFiles(fragmentRoot)) {
    const relativePath = normalizePath(absolutePath.slice(input.hostRoot.length).replace(/^[/\\]+/, ""));
    if (removedPaths.has(relativePath) || !isAbilityKvFragmentPath(relativePath)) {
      continue;
    }
    const content = readFileSync(absolutePath, "utf-8");
    const abilityName = extractAbilityBlockName(content) || extractAbilityNameFromFragmentPath(relativePath);
    if (!abilityName) {
      continue;
    }
    fragments.set(abilityName, {
      fragmentPath: relativePath,
      content,
    });
  }

  for (const pending of input.pendingFragments || []) {
    const relativePath = normalizePath(pending.fragmentPath);
    if (removedPaths.has(relativePath)) {
      continue;
    }
    const abilityName = pending.abilityName || extractAbilityBlockName(pending.content) || extractAbilityNameFromFragmentPath(relativePath);
    if (!abilityName) {
      continue;
    }
    fragments.set(abilityName, {
      fragmentPath: relativePath,
      content: pending.content,
    });
  }

  return fragments;
}

function collectRemovedAbilityNames(removedFragmentPaths: string[]): Set<string> {
  return new Set(
    removedFragmentPaths
      .map((path) => extractAbilityNameFromFragmentPath(path))
      .filter((value): value is string => Boolean(value && value.trim().length > 0)),
  );
}

export function materializeAbilityKvAggregate(input: {
  hostRoot: string;
  pendingFragments?: AbilityKvPendingFragment[];
  removedFragmentPaths?: string[];
  removedAbilityNames?: string[];
}): AbilityKvAggregateMaterialization {
  const managedFragments = collectManagedFragments(input);
  const removedAbilityNames = new Set<string>([
    ...collectRemovedAbilityNames(input.removedFragmentPaths || []),
    ...((input.removedAbilityNames || []).filter((value): value is string => typeof value === "string" && value.trim().length > 0)),
  ]);
  const aggregateTargetPath = normalizeAbilityKvAggregateTargetPath(
    input.pendingFragments?.find((fragment) => typeof fragment.aggregateTargetPath === "string")?.aggregateTargetPath,
  );
  const aggregateFullPath = join(input.hostRoot, aggregateTargetPath);
  const existingAggregateContent = existsSync(aggregateFullPath)
    ? readFileSync(aggregateFullPath, "utf-8")
    : "\"DOTAAbilities\"\n{\n}\n";
  const existingBlocks = parseAbilityBlocks(existingAggregateContent);

  const unmanagedBlocks = Array.from(existingBlocks.entries())
    .filter(([abilityName]) => !managedFragments.has(abilityName) && !removedAbilityNames.has(abilityName))
    .map(([, block]) => block);
  const managedBlocks = Array.from(managedFragments.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([, fragment]) => fragment.content);

  return {
    aggregateTargetPath,
    content: wrapAbilityBlocks([...unmanagedBlocks, ...managedBlocks]),
    fragmentPaths: Array.from(managedFragments.values()).map((fragment) => fragment.fragmentPath),
    abilityNames: Array.from(managedFragments.keys()).sort(),
  };
}

export function readAbilityKvFragment(hostRoot: string, fragmentPath: string): string | undefined {
  const fullPath = resolveFragmentPath(hostRoot, fragmentPath);
  if (!existsSync(fullPath)) {
    return undefined;
  }
  return readFileSync(fullPath, "utf-8");
}
