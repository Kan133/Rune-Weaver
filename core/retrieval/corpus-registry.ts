import type {
  CorpusSource,
  CorpusSourceKind,
  RetrievalHit,
  RetrievalQuery,
} from "./types.js";

export interface RegisterCorpusSourceOptions {
  replace?: boolean;
}

export class CorpusRegistry {
  private readonly sources = new Map<string, CorpusSource>();

  register(
    source: CorpusSource,
    options: RegisterCorpusSourceOptions = {},
  ): void {
    const exists = this.sources.has(source.id);
    if (exists && !options.replace) {
      throw new Error(`Corpus source '${source.id}' is already registered.`);
    }
    this.sources.set(source.id, source);
  }

  unregister(sourceId: string): boolean {
    return this.sources.delete(sourceId);
  }

  get(sourceId: string): CorpusSource | undefined {
    return this.sources.get(sourceId);
  }

  list(sourceKinds?: CorpusSourceKind[], sourceIds?: string[]): CorpusSource[] {
    const kindSet = sourceKinds && sourceKinds.length > 0 ? new Set(sourceKinds) : undefined;
    const sourceIdSet = sourceIds && sourceIds.length > 0 ? new Set(sourceIds) : undefined;

    return [...this.sources.values()].filter((source) => {
      const kindAllowed = kindSet ? kindSet.has(source.kind) : true;
      const idAllowed = sourceIdSet ? sourceIdSet.has(source.id) : true;
      return kindAllowed && idAllowed;
    });
  }

  async search(query: RetrievalQuery): Promise<RetrievalHit[]> {
    const sources = this.list(query.sourceKinds, query.sourceIds);
    if (sources.length === 0) {
      return [];
    }

    const perSourceLimit = normalizePositiveNumber(query.perSourceLimit, query.limit ?? 8);
    const scopedQuery: RetrievalQuery = {
      ...query,
      perSourceLimit,
    };
    const hitsBySource = await Promise.all(
      sources.map(async (source) => {
        const hits = await source.search(scopedQuery);
        return hits.slice(0, perSourceLimit);
      }),
    );

    return flattenAndRank(hitsBySource, normalizePositiveNumber(query.limit, 8));
  }
}

function flattenAndRank(hitsBySource: RetrievalHit[][], limit: number): RetrievalHit[] {
  return hitsBySource
    .flat()
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (a.sourceId !== b.sourceId) return a.sourceId.localeCompare(b.sourceId);
      return a.id.localeCompare(b.id);
    })
    .slice(0, limit);
}

function normalizePositiveNumber(value: number | undefined, fallback: number): number {
  if (!Number.isFinite(value) || !value || value < 1) return fallback;
  return Math.floor(value);
}
