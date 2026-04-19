import { existsSync, readFileSync } from "fs";
import { join } from "path";

import type {
  CurrentFeatureContext,
  CorpusSourceKind,
  Dota2CorpusRegistryEntry,
  EvidenceRef,
  PromptPackageId,
  RetrievalBundle,
  SynthesisTargetProfile,
} from "../schema/types.js";
import { createCuratedMarkdownCorpusSource } from "./markdown-chunker.js";
import {
  createHostSymbolCorpusSource,
  type HostSymbolIndex,
  type HostSymbolLookupHit,
  loadDotaHostSymbolIndex,
} from "./host-symbol-index.js";
import { RetrievalOrchestrator } from "./retrieval-orchestrator.js";
import type { RetrievalHit } from "./types.js";

interface CachedDota2RetrievalState {
  orchestrator: RetrievalOrchestrator;
  hostSymbolIndex?: HostSymbolIndex;
  corpusPlan: Dota2CorpusSourcePlan[];
}

interface WorkspaceEvidenceInput {
  title: string;
  snippet: string;
  metadata?: Record<string, unknown>;
}

export interface BuildDota2RetrievalBundleInput {
  promptPackageId: PromptPackageId;
  queryText: string;
  projectRoot?: string;
  currentFeatureContext?: CurrentFeatureContext;
  targetProfile?: SynthesisTargetProfile;
  diagnostics?: string[];
  workspaceEvidence?: WorkspaceEvidenceInput[];
  symbolQueries?: string[];
}

const cache = new Map<string, CachedDota2RetrievalState>();

export interface Dota2CorpusSourcePlan {
  entryId: string;
  sourceId: string;
  tier: 0 | 1 | 2 | 3;
  sourceKind: Dota2CorpusRegistryEntry["sourceKind"];
  runtimeSourceKind: "curated-markdown" | "dota2-host-symbol-index";
  canonicalPath: string;
  selectedPaths: string[];
  workflowConsumers: PromptPackageId[];
  stability: Dota2CorpusRegistryEntry["stability"];
  pathMode: "canonical" | "legacy_fallback" | "canonical_plus_legacy";
}

export const DOTA2_CORPUS_REGISTRY: Dota2CorpusRegistryEntry[] = [
  {
    id: "dota2-governance",
    tier: 0,
    sourceKind: "governance",
    canonicalPath: "docs/hosts/dota2/DOTA2-HOST-REALIZATION-POLICY.md",
    legacyPaths: [
      "docs/LLM-INTEGRATION.md",
      "docs/HOST-REALIZATION-CONTRACT.md",
    ],
    workflowConsumers: ["wizard.create", "wizard.update", "synthesis.module", "repair.local"],
    stability: "active",
  },
  {
    id: "dota2-curated-host",
    tier: 1,
    sourceKind: "curated_host",
    canonicalPath: "knowledge/dota2-host/README.md",
    legacyPaths: [
      "knowledge/dota2-host/api/README.md",
      "knowledge/dota2-host/api/abilities/README.md",
      "knowledge/dota2-host/api/events/README.md",
      "knowledge/dota2-host/api/panorama/README.md",
      "knowledge/dota2-host/slices/scripting-typescript/abilities-and-casting.md",
      "knowledge/dota2-host/slices/panorama/selection-modal-and-button-patterns.md",
      "knowledge/dota2-host/slices/scripting-systems/custom-events-and-networking.md",
      "knowledge/dota2-host/slices/scripting-systems/state-sync-and-tables.md",
    ],
    workflowConsumers: ["wizard.create", "wizard.update", "synthesis.module", "repair.local"],
    stability: "transitional",
  },
  {
    id: "dota2-raw-reference",
    tier: 2,
    sourceKind: "raw_reference",
    canonicalPath: "references/dota2/dota-data/files",
    workflowConsumers: ["synthesis.module", "repair.local"],
    stability: "transitional",
  },
];

function readExistingDocuments(projectRoot: string, relativePaths: string[]): Array<{ id: string; path: string; markdown: string }> {
  const documents: Array<{ id: string; path: string; markdown: string }> = [];

  for (const relativePath of relativePaths) {
    const absolutePath = join(projectRoot, relativePath);
    if (!existsSync(absolutePath)) {
      continue;
    }

    documents.push({
      id: relativePath.replace(/[\\/]/g, "::"),
      path: absolutePath,
      markdown: readFileSync(absolutePath, "utf-8"),
    });
  }

  return documents;
}

function toRuntimeSourceKind(
  sourceKind: Dota2CorpusRegistryEntry["sourceKind"],
): Dota2CorpusSourcePlan["runtimeSourceKind"] {
  return sourceKind === "raw_reference" ? "dota2-host-symbol-index" : "curated-markdown";
}

function resolveCorpusEntryPaths(
  projectRoot: string,
  entry: Dota2CorpusRegistryEntry,
): Pick<Dota2CorpusSourcePlan, "selectedPaths" | "pathMode"> {
  const canonicalExists = existsSync(join(projectRoot, entry.canonicalPath));
  const legacyPaths = (entry.legacyPaths || []).filter((relativePath) =>
    existsSync(join(projectRoot, relativePath))
  );

  if (canonicalExists) {
    if (entry.stability === "transitional" && legacyPaths.length > 0 && entry.sourceKind !== "raw_reference") {
      return {
        selectedPaths: [entry.canonicalPath, ...legacyPaths],
        pathMode: "canonical_plus_legacy",
      };
    }
    return {
      selectedPaths: [entry.canonicalPath],
      pathMode: "canonical",
    };
  }

  if (legacyPaths.length > 0) {
    return {
      selectedPaths: legacyPaths,
      pathMode: "legacy_fallback",
    };
  }

  return {
    selectedPaths: [],
    pathMode: "canonical",
  };
}

export function buildDota2CorpusSourcePlan(
  projectRoot: string,
  promptPackageId?: PromptPackageId,
): Dota2CorpusSourcePlan[] {
  return DOTA2_CORPUS_REGISTRY
    .filter((entry) => !promptPackageId || entry.workflowConsumers.includes(promptPackageId))
    .map((entry) => {
      const resolved = resolveCorpusEntryPaths(projectRoot, entry);
      return {
        entryId: entry.id,
        sourceId: entry.id,
        tier: entry.tier,
        sourceKind: entry.sourceKind,
        runtimeSourceKind: toRuntimeSourceKind(entry.sourceKind),
        canonicalPath: entry.canonicalPath,
        selectedPaths: resolved.selectedPaths,
        workflowConsumers: [...entry.workflowConsumers],
        stability: entry.stability,
        pathMode: resolved.pathMode,
      } satisfies Dota2CorpusSourcePlan;
    })
    .filter((entry) => entry.selectedPaths.length > 0);
}

function createDota2RetrievalState(projectRoot: string): CachedDota2RetrievalState {
  const orchestrator = new RetrievalOrchestrator();
  const corpusPlan = buildDota2CorpusSourcePlan(projectRoot);
  let hostSymbolIndex: HostSymbolIndex | undefined;

  for (const planEntry of corpusPlan) {
    if (planEntry.runtimeSourceKind === "curated-markdown") {
      const documents = readExistingDocuments(projectRoot, planEntry.selectedPaths);
      if (documents.length === 0) {
        continue;
      }
      orchestrator.registerSource(
        createCuratedMarkdownCorpusSource({
          id: planEntry.sourceId,
          documents,
        }),
      );
      continue;
    }

    const dataRoot = join(projectRoot, planEntry.selectedPaths[0]!);
    if (!existsSync(dataRoot)) {
      continue;
    }
    hostSymbolIndex = loadDotaHostSymbolIndex({ dataRoot });
    orchestrator.registerSource(
      createHostSymbolCorpusSource(hostSymbolIndex, planEntry.sourceId),
    );
  }

  return { orchestrator, hostSymbolIndex, corpusPlan };
}

function getDota2RetrievalState(projectRoot: string): CachedDota2RetrievalState {
  const existing = cache.get(projectRoot);
  if (existing) {
    return existing;
  }

  const next = createDota2RetrievalState(projectRoot);
  cache.set(projectRoot, next);
  return next;
}

function mapRetrievalHitToEvidenceRef(hit: RetrievalHit): EvidenceRef {
  return {
    id: hit.id,
    sourceKind: mapSourceKind(hit),
    title: hit.title,
    path: hit.reference,
    snippet: hit.snippet,
    symbol:
      typeof hit.metadata?.symbol === "string" && hit.metadata.symbol.length > 0
        ? hit.metadata.symbol
        : undefined,
    score: hit.score,
    metadata: hit.metadata,
  };
}

function mapExactHostSymbolHitToEvidenceRef(hit: HostSymbolLookupHit): EvidenceRef {
  return {
    id: hit.entry.id,
    sourceKind: "raw_reference",
    title: hit.entry.containerName ? `${hit.entry.containerName}.${hit.entry.name}` : hit.entry.name,
    path: hit.entry.sourceFile,
    snippet: [hit.entry.description, hit.entry.signature].filter(Boolean).join(" | "),
    symbol: hit.entry.containerName ? `${hit.entry.containerName}.${hit.entry.name}` : hit.entry.name,
    score: hit.score,
    metadata: {
      symbolKind: hit.entry.kind,
      domain: hit.entry.domain,
      containerName: hit.entry.containerName,
      signature: hit.entry.signature,
      exact: true,
    },
  };
}

function mapSourceKind(hit: RetrievalHit): CorpusSourceKind {
  if (hit.sourceId === "dota2-governance") {
    return "governance";
  }
  if (hit.sourceKind === "dota2-host-symbol-index") {
    return "raw_reference";
  }
  return "curated_host";
}

function getPreservedModuleBackbone(input: BuildDota2RetrievalBundleInput): string[] {
  const currentFeatureContext = input.currentFeatureContext;
  if (!currentFeatureContext) {
    return [];
  }
  if ((currentFeatureContext.sourceBackedInvariantRoles || []).length > 0) {
    return currentFeatureContext.sourceBackedInvariantRoles || [];
  }
  if ((currentFeatureContext.preservedModuleBackbone || []).length > 0) {
    return currentFeatureContext.preservedModuleBackbone;
  }
  return currentFeatureContext.admittedSkeleton || [];
}

function buildWorkspaceEvidenceRefs(input: BuildDota2RetrievalBundleInput): EvidenceRef[] {
  const refs: EvidenceRef[] = [];

  if (input.currentFeatureContext) {
    const preservedModuleBackbone = getPreservedModuleBackbone(input);
    refs.push({
      id: `workspace::feature::${input.currentFeatureContext.featureId}`,
      sourceKind: "workspace_evidence",
      title: `Current feature context: ${input.currentFeatureContext.featureId}`,
      snippet: [
        `preservedModuleBackbone=${preservedModuleBackbone.join(", ")}`,
        `preservedInvariants=${input.currentFeatureContext.preservedInvariants.join(", ")}`,
      ].join(" | "),
      metadata: {
        featureId: input.currentFeatureContext.featureId,
        revision: input.currentFeatureContext.revision,
      },
    });
  }

  for (const [index, item] of (input.workspaceEvidence || []).entries()) {
    refs.push({
      id: `workspace::evidence::${index + 1}`,
      sourceKind: "workspace_evidence",
      title: item.title,
      snippet: item.snippet,
      metadata: item.metadata,
    });
  }

  if ((input.diagnostics || []).length > 0) {
    refs.push({
      id: "workspace::diagnostics",
      sourceKind: "workspace_evidence",
      title: "Validation or runtime diagnostics",
      snippet: input.diagnostics!.join(" | "),
    });
  }

  return refs;
}

function tierForSourceKind(kind: CorpusSourceKind): 0 | 1 | 2 | 3 {
  switch (kind) {
    case "governance":
      return 0;
    case "curated_host":
      return 1;
    case "raw_reference":
      return 2;
    case "workspace_evidence":
      return 3;
  }
}

function dedupeEvidenceRefs(refs: EvidenceRef[]): EvidenceRef[] {
  const unique = new Map<string, EvidenceRef>();
  for (const ref of refs) {
    unique.set(`${ref.sourceKind}::${ref.symbol || ""}::${ref.title}::${ref.path || ""}::${ref.snippet || ""}`, ref);
  }
  return [...unique.values()];
}

export function lookupDota2HostSymbolsExact(
  projectRoot: string,
  queries: string[],
): EvidenceRef[] {
  const { hostSymbolIndex } = getDota2RetrievalState(projectRoot);
  if (!hostSymbolIndex) {
    return [];
  }

  const refs: EvidenceRef[] = [];
  for (const query of queries) {
    const hits = hostSymbolIndex.lookupExact(query, { limit: 4 });
    refs.push(...hits.map(mapExactHostSymbolHitToEvidenceRef));
  }
  return dedupeEvidenceRefs(refs);
}

function extractReasonableSymbolQueries(input: BuildDota2RetrievalBundleInput): string[] {
  const explicit = input.symbolQueries || [];
  const autoTerms = new Set<string>();
  const source = `${input.queryText}\n${input.diagnostics?.join("\n") || ""}`.toLowerCase();

  if (input.targetProfile === "lua_ability") {
    autoTerms.add("GetCaster");
    autoTerms.add("OnSpellStart");
  }
  if (input.targetProfile === "ability_kv") {
    autoTerms.add("DOTA_ABILITY_BEHAVIOR");
    autoTerms.add("AbilityBehavior");
  }
  if (input.targetProfile === "panorama_tsx") {
    autoTerms.add("Panel");
    autoTerms.add("Label");
  }
  if (input.targetProfile === "panorama_less") {
    autoTerms.add("style");
  }
  if (source.includes("nettable") || source.includes("sync")) {
    autoTerms.add("CustomNetTables");
  }
  if (source.includes("event")) {
    autoTerms.add("GameEvents");
  }

  return [...new Set([...explicit, ...autoTerms])];
}

export async function buildDota2RetrievalBundle(
  input: BuildDota2RetrievalBundleInput,
): Promise<RetrievalBundle> {
  const projectRoot = input.projectRoot || process.cwd();
  const { orchestrator, hostSymbolIndex, corpusPlan } = getDota2RetrievalState(projectRoot);
  const evidenceRefs: EvidenceRef[] = [];
  const workflowCorpusPlan = corpusPlan.filter((entry) =>
    entry.workflowConsumers.includes(input.promptPackageId)
  );
  const markdownSourceIds = workflowCorpusPlan
    .filter((entry) => entry.runtimeSourceKind === "curated-markdown")
    .map((entry) => entry.sourceId);
  const rawReferenceSourceIds = workflowCorpusPlan
    .filter((entry) => entry.runtimeSourceKind === "dota2-host-symbol-index")
    .map((entry) => entry.sourceId);

  const governanceAndCurated = await orchestrator.retrieve(input.queryText, {
    limit: input.promptPackageId.startsWith("wizard.") ? 6 : 8,
    perSourceLimit: input.promptPackageId.startsWith("wizard.") ? 3 : 4,
    sourceKinds: ["curated-markdown"],
    sourceIds: markdownSourceIds,
  });
  evidenceRefs.push(...governanceAndCurated.hits.map(mapRetrievalHitToEvidenceRef));

  if (
    (input.promptPackageId === "synthesis.module" || input.promptPackageId === "repair.local")
    && rawReferenceSourceIds.length > 0
  ) {
    const symbolQueries = extractReasonableSymbolQueries(input);
    if (hostSymbolIndex) {
      for (const query of symbolQueries) {
        const exactHits = hostSymbolIndex.lookupExact(query, { limit: 4 });
        if (exactHits.length > 0) {
          evidenceRefs.push(...exactHits.map(mapExactHostSymbolHitToEvidenceRef));
          continue;
        }
        const result = await orchestrator.retrieve(query, {
          limit: 2,
          perSourceLimit: 2,
          sourceKinds: ["dota2-host-symbol-index"],
          sourceIds: rawReferenceSourceIds,
        });
        evidenceRefs.push(...result.hits.map(mapRetrievalHitToEvidenceRef));
      }
    } else {
      for (const query of symbolQueries) {
        const result = await orchestrator.retrieve(query, {
          limit: 2,
          perSourceLimit: 2,
          sourceKinds: ["dota2-host-symbol-index"],
          sourceIds: rawReferenceSourceIds,
        });
        evidenceRefs.push(...result.hits.map(mapRetrievalHitToEvidenceRef));
      }
    }
  }

  evidenceRefs.push(...buildWorkspaceEvidenceRefs(input));
  const deduped = dedupeEvidenceRefs(evidenceRefs);
  const tiersUsed = [...new Set(deduped.map((ref) => tierForSourceKind(ref.sourceKind)))].sort();
  const sourceKinds = [...new Set(deduped.map((ref) => ref.sourceKind))];

  return {
    promptPackageId: input.promptPackageId,
    tiersUsed,
    summary: `Collected ${deduped.length} evidence refs for ${input.promptPackageId}.`,
    evidenceRefs: deduped,
    metadata: {
      targetProfile: input.targetProfile,
      sourceKinds,
      corpusRegistry: DOTA2_CORPUS_REGISTRY,
      registryPlan: workflowCorpusPlan,
    },
  };
}
