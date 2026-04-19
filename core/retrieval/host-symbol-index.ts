import { readdirSync, readFileSync } from "fs";
import { join, relative, sep } from "path";

import type { CorpusSource, RetrievalHit, RetrievalQuery } from "./types.js";

export type HostSymbolKind =
  | "api-type"
  | "api-function"
  | "api-member"
  | "api-constant"
  | "event"
  | "event-field"
  | "enum"
  | "enum-member";

export type HostSymbolDomain = "vscripts" | "panorama" | "engine" | "shared";

export interface HostSymbolEntry {
  id: string;
  name: string;
  normalizedName: string;
  kind: HostSymbolKind;
  domain: HostSymbolDomain;
  containerName?: string;
  description?: string;
  signature?: string;
  sourceFile: string;
  searchTokens: string[];
}

export interface HostSymbolLookupOptions {
  limit?: number;
  kinds?: HostSymbolKind[];
  domains?: HostSymbolDomain[];
}

export interface HostSymbolLookupHit {
  entry: HostSymbolEntry;
  score: number;
}

export interface DotaHostSymbolIndexLoadOptions {
  dataRoot: string;
}

export class HostSymbolIndex {
  readonly entries: HostSymbolEntry[];
  private readonly byNormalizedName = new Map<string, HostSymbolEntry[]>();

  constructor(entries: HostSymbolEntry[]) {
    this.entries = entries;
    for (const entry of entries) {
      const bucket = this.byNormalizedName.get(entry.normalizedName);
      if (bucket) {
        bucket.push(entry);
      } else {
        this.byNormalizedName.set(entry.normalizedName, [entry]);
      }
    }
  }

  lookup(query: string, options: HostSymbolLookupOptions = {}): HostSymbolLookupHit[] {
    const normalizedQuery = normalizeName(query);
    if (!normalizedQuery) {
      return [];
    }

    const queryTokens = tokenize(query);
    const limit = normalizeLimit(options.limit, 20);
    const kindSet = options.kinds && options.kinds.length > 0 ? new Set(options.kinds) : undefined;
    const domainSet = options.domains && options.domains.length > 0 ? new Set(options.domains) : undefined;

    const ranked = this.entries
      .filter((entry) => (kindSet ? kindSet.has(entry.kind) : true))
      .filter((entry) => (domainSet ? domainSet.has(entry.domain) : true))
      .map((entry) => ({
        entry,
        score: scoreEntry(entry, normalizedQuery, queryTokens),
      }))
      .filter((item) => item.score > 0)
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        if (a.entry.kind !== b.entry.kind) return a.entry.kind.localeCompare(b.entry.kind);
        return a.entry.name.localeCompare(b.entry.name);
      });

    return ranked.slice(0, limit);
  }

  lookupExact(query: string, options: HostSymbolLookupOptions = {}): HostSymbolLookupHit[] {
    const normalizedQuery = normalizeName(query);
    if (!normalizedQuery) {
      return [];
    }

    const limit = normalizeLimit(options.limit, 20);
    const kindSet = options.kinds && options.kinds.length > 0 ? new Set(options.kinds) : undefined;
    const domainSet = options.domains && options.domains.length > 0 ? new Set(options.domains) : undefined;
    const exact = (this.byNormalizedName.get(normalizedQuery) || this.entries)
      .filter((entry) => (kindSet ? kindSet.has(entry.kind) : true))
      .filter((entry) => (domainSet ? domainSet.has(entry.domain) : true))
      .filter((entry) => {
        const fullName = normalizeName(
          entry.containerName ? `${entry.containerName}.${entry.name}` : entry.name,
        );
        return entry.normalizedName === normalizedQuery || fullName === normalizedQuery;
      })
      .map((entry) => ({
        entry,
        score: entry.normalizedName === normalizedQuery ? 200 : 180,
      }))
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        if (a.entry.kind !== b.entry.kind) return a.entry.kind.localeCompare(b.entry.kind);
        return a.entry.name.localeCompare(b.entry.name);
      });

    return exact.slice(0, limit);
  }
}

export function loadDotaHostSymbolIndex(
  options: DotaHostSymbolIndexLoadOptions,
): HostSymbolIndex {
  const dataRoot = options.dataRoot;
  const jsonFiles = discoverTargetJsonFiles(dataRoot);
  const entries: HostSymbolEntry[] = [];

  for (const absolutePath of jsonFiles) {
    const sourceFile = normalizeSlashes(relative(dataRoot, absolutePath));
    const content = readFileSync(absolutePath, "utf-8");
    const parsed = JSON.parse(content) as unknown;
    const domain = inferDomain(sourceFile);
    entries.push(...extractEntriesFromJson(parsed, sourceFile, domain));
  }

  return new HostSymbolIndex(deduplicateEntries(entries));
}

export function createHostSymbolCorpusSource(
  index: HostSymbolIndex,
  sourceId = "dota2-host-symbols",
): CorpusSource {
  return {
    id: sourceId,
    kind: "dota2-host-symbol-index",
    search(query: RetrievalQuery): RetrievalHit[] {
      const hits = index.lookup(query.text, { limit: normalizeLimit(query.perSourceLimit, 8) });
      return hits.map((hit) => ({
        id: hit.entry.id,
        sourceId,
        sourceKind: "dota2-host-symbol-index",
        score: hit.score,
        title: formatEntryTitle(hit.entry),
        snippet: buildSnippet(hit.entry),
        reference: hit.entry.sourceFile,
        metadata: {
          symbol: hit.entry.containerName ? `${hit.entry.containerName}.${hit.entry.name}` : hit.entry.name,
          symbolKind: hit.entry.kind,
          domain: hit.entry.domain,
          containerName: hit.entry.containerName,
          signature: hit.entry.signature,
        },
      }));
    },
  };
}

function discoverTargetJsonFiles(root: string): string[] {
  const targets: string[] = [];
  const queue = [root];

  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const item of readdirSync(current, { withFileTypes: true })) {
      const absolutePath = join(current, item.name);
      if (item.isDirectory()) {
        queue.push(absolutePath);
        continue;
      }

      if (!item.isFile() || !item.name.endsWith(".json")) {
        continue;
      }

      targets.push(absolutePath);
    }
  }

  return targets.sort((a, b) => a.localeCompare(b));
}

function extractEntriesFromJson(
  value: unknown,
  sourceFile: string,
  domain: HostSymbolDomain,
): HostSymbolEntry[] {
  if (!Array.isArray(value)) {
    return [];
  }

  if (sourceFile.endsWith("events.json") || looksLikeEventArray(value)) {
    return extractEventEntries(value, sourceFile, domain);
  }

  if (sourceFile.includes("enums") || looksLikeEnumArray(value)) {
    return extractEnumEntries(value, sourceFile, domain);
  }

  if (sourceFile.includes("api") || looksLikeApiArray(value)) {
    return extractApiEntries(value, sourceFile, domain);
  }

  return [];
}

function looksLikeEventArray(values: unknown[]): boolean {
  return values.some((value) =>
    isObject(value)
    && typeof value.name === "string"
    && Array.isArray(value.fields),
  );
}

function looksLikeApiArray(values: unknown[]): boolean {
  return values.some((value) => {
    if (!isObject(value)) return false;
    if (typeof value.kind === "string") {
      return true;
    }
    return typeof value.name === "string" && Array.isArray(value.members);
  });
}

function looksLikeEnumArray(values: unknown[]): boolean {
  return values.some((value) => {
    if (!isObject(value)) return false;
    if (Array.isArray(value.members) && typeof value.name === "string") {
      return value.members.some((member) =>
        isObject(member)
        && typeof member.name === "string"
        && ("value" in member || "shortName" in member),
      );
    }
    return (
      typeof value.name === "string"
      && ("value" in value || "shortName" in value)
      && typeof value.kind !== "string"
    );
  });
}

function extractEventEntries(
  events: unknown[],
  sourceFile: string,
  domain: HostSymbolDomain,
): HostSymbolEntry[] {
  const entries: HostSymbolEntry[] = [];
  for (const event of events) {
    if (!isObject(event)) continue;
    const eventName = readString(event.name);
    if (!eventName) continue;

    const eventId = createEntryId(sourceFile, "event", eventName);
    entries.push(
      createEntry({
        id: eventId,
        name: eventName,
        kind: "event",
        domain,
        sourceFile,
        description: readString(event.description),
      }),
    );

    const fields = Array.isArray(event.fields) ? event.fields : [];
    for (const field of fields) {
      if (!isObject(field)) continue;
      const fieldName = readString(field.name);
      if (!fieldName) continue;

      entries.push(
        createEntry({
          id: createEntryId(sourceFile, "event-field", `${eventName}.${fieldName}`),
          name: fieldName,
          kind: "event-field",
          domain,
          sourceFile,
          containerName: eventName,
          description: readString(field.description),
          signature: readString(field.type),
        }),
      );
    }
  }
  return entries;
}

function extractApiEntries(
  symbols: unknown[],
  sourceFile: string,
  domain: HostSymbolDomain,
): HostSymbolEntry[] {
  const entries: HostSymbolEntry[] = [];
  for (const symbol of symbols) {
    if (!isObject(symbol)) continue;
    const name = readString(symbol.name);
    if (!name) continue;

    const kind = readString(symbol.kind);
    if (kind === "function") {
      entries.push(
        createEntry({
          id: createEntryId(sourceFile, "api-function", name),
          name,
          kind: "api-function",
          domain,
          sourceFile,
          description: readString(symbol.description),
          signature: buildFunctionSignature(symbol),
        }),
      );
      continue;
    }

    if (kind === "constant") {
      entries.push(
        createEntry({
          id: createEntryId(sourceFile, "api-constant", name),
          name,
          kind: "api-constant",
          domain,
          sourceFile,
          description: readString(symbol.description),
          signature: readString(symbol.value),
        }),
      );
      continue;
    }

    entries.push(
      createEntry({
        id: createEntryId(sourceFile, "api-type", name),
        name,
        kind: "api-type",
        domain,
        sourceFile,
        description: readString(symbol.description),
      }),
    );

    const members = Array.isArray(symbol.members) ? symbol.members : [];
    for (const member of members) {
      if (!isObject(member)) continue;
      const memberName = readString(member.name);
      if (!memberName) continue;

      entries.push(
        createEntry({
          id: createEntryId(sourceFile, "api-member", `${name}.${memberName}`),
          name: memberName,
          kind: "api-member",
          domain,
          sourceFile,
          containerName: name,
          description: readString(member.description),
          signature: buildFunctionSignature(member),
        }),
      );
    }
  }

  return entries;
}

function extractEnumEntries(
  values: unknown[],
  sourceFile: string,
  domain: HostSymbolDomain,
): HostSymbolEntry[] {
  const entries: HostSymbolEntry[] = [];
  for (const value of values) {
    if (!isObject(value)) continue;

    const enumName = readString(value.name);
    const members = Array.isArray(value.members) ? value.members : [];

    if (enumName && members.length > 0) {
      entries.push(
        createEntry({
          id: createEntryId(sourceFile, "enum", enumName),
          name: enumName,
          kind: "enum",
          domain,
          sourceFile,
          description: readString(value.description),
        }),
      );
      for (const member of members) {
        if (!isObject(member)) continue;
        const memberName = readString(member.name);
        if (!memberName) continue;
        entries.push(
          createEntry({
            id: createEntryId(sourceFile, "enum-member", `${enumName}.${memberName}`),
            name: memberName,
            kind: "enum-member",
            domain,
            sourceFile,
            containerName: enumName,
            description: readString(member.description),
            signature: readString(member.value) || readString(member.shortName),
          }),
        );
      }
      continue;
    }

    if (enumName) {
      entries.push(
        createEntry({
          id: createEntryId(sourceFile, "enum-member", enumName),
          name: enumName,
          kind: "enum-member",
          domain,
          sourceFile,
          description: readString(value.description),
          signature: readString(value.value),
        }),
      );
    }
  }

  return entries;
}

function createEntry(input: Omit<HostSymbolEntry, "normalizedName" | "searchTokens">): HostSymbolEntry {
  const searchSeed = [
    input.name,
    input.containerName,
    input.description,
    input.signature,
    input.kind,
    input.domain,
  ]
    .filter(Boolean)
    .join(" ");
  return {
    ...input,
    normalizedName: normalizeName(input.name),
    searchTokens: tokenize(searchSeed),
  };
}

function deduplicateEntries(entries: HostSymbolEntry[]): HostSymbolEntry[] {
  const unique = new Map<string, HostSymbolEntry>();
  for (const entry of entries) {
    unique.set(entry.id, entry);
  }
  return [...unique.values()];
}

function scoreEntry(
  entry: HostSymbolEntry,
  normalizedQuery: string,
  queryTokens: string[],
): number {
  const normalizedName = entry.normalizedName;
  const fullName = normalizeName(entry.containerName ? `${entry.containerName}.${entry.name}` : entry.name);
  let score = 0;

  if (normalizedName === normalizedQuery || fullName === normalizedQuery) {
    score += 120;
  } else if (normalizedName.startsWith(normalizedQuery) || fullName.startsWith(normalizedQuery)) {
    score += 90;
  } else if (normalizedName.includes(normalizedQuery) || fullName.includes(normalizedQuery)) {
    score += 65;
  }

  if (queryTokens.length > 0) {
    const tokenSet = new Set(entry.searchTokens);
    let matched = 0;
    for (const token of queryTokens) {
      if (tokenSet.has(token)) {
        matched += 1;
      }
    }
    score += matched * 12;
  }

  if (entry.kind === "event" || entry.kind === "api-function") {
    score += 3;
  }

  return score;
}

function formatEntryTitle(entry: HostSymbolEntry): string {
  if (entry.containerName) {
    return `${entry.containerName}.${entry.name}`;
  }
  return entry.name;
}

function buildSnippet(entry: HostSymbolEntry): string {
  const parts = [
    `[${entry.domain}] ${entry.kind}`,
    entry.signature ? `sig: ${entry.signature}` : undefined,
    entry.description,
  ].filter(Boolean);
  return parts.join(" | ");
}

function buildFunctionSignature(symbol: Record<string, unknown>): string | undefined {
  const args = Array.isArray(symbol.args)
    ? symbol.args
        .filter((item): item is Record<string, unknown> => isObject(item))
        .map((arg) => `${readString(arg.name) || "arg"}: ${readTypeLabel(arg.types) || "unknown"}`)
    : [];
  const returns = Array.isArray(symbol.returns)
    ? symbol.returns.filter((value): value is string => typeof value === "string")
    : [];

  const renderedArgs = args.join(", ");
  const renderedReturns = returns.join(" | ");
  if (renderedArgs.length === 0 && renderedReturns.length === 0) {
    return undefined;
  }
  if (renderedReturns.length === 0) {
    return `(${renderedArgs})`;
  }
  return `(${renderedArgs}) => ${renderedReturns}`;
}

function readTypeLabel(value: unknown): string | undefined {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    const labels = value.filter((item): item is string => typeof item === "string");
    return labels.join(" | ");
  }
  return undefined;
}

function createEntryId(sourceFile: string, kind: HostSymbolKind, symbolName: string): string {
  return `${sourceFile}::${kind}::${normalizeName(symbolName)}`;
}

function inferDomain(sourceFile: string): HostSymbolDomain {
  const normalized = sourceFile.toLowerCase().split(sep).join("/");
  if (normalized.startsWith("vscripts/")) return "vscripts";
  if (normalized.startsWith("panorama/")) return "panorama";
  if (normalized.startsWith("engine-")) return "engine";
  return "shared";
}

function normalizeSlashes(pathValue: string): string {
  return pathValue.split("\\").join("/");
}

function normalizeName(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_\.]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function tokenize(value: string): string[] {
  return value
    .toLowerCase()
    .split(/[^a-z0-9_]+/g)
    .map((token) => token.trim())
    .filter((token) => token.length > 1);
}

function readString(value: unknown): string | undefined {
  if (typeof value === "string" && value.trim().length > 0) {
    return value.trim();
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  return undefined;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function normalizeLimit(value: number | undefined, fallback: number): number {
  if (!Number.isFinite(value) || !value || value < 1) return fallback;
  return Math.floor(value);
}
