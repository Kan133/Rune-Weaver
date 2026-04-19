import { CorpusRegistry } from "./corpus-registry.js";
import type {
  CorpusSource,
  CorpusSourceKind,
  RetrievalQuery,
  RetrievalResult,
} from "./types.js";

export interface RetrieveOptions {
  limit?: number;
  perSourceLimit?: number;
  sourceKinds?: CorpusSourceKind[];
  sourceIds?: string[];
}

export class RetrievalOrchestrator {
  constructor(private readonly registry = new CorpusRegistry()) {}

  registerSource(source: CorpusSource): void {
    this.registry.register(source);
  }

  unregisterSource(sourceId: string): boolean {
    return this.registry.unregister(sourceId);
  }

  listSources(sourceKinds?: CorpusSourceKind[]): CorpusSource[] {
    return this.registry.list(sourceKinds);
  }

  async retrieve(text: string, options: RetrieveOptions = {}): Promise<RetrievalResult> {
    const query: RetrievalQuery = {
      text,
      limit: options.limit,
      perSourceLimit: options.perSourceLimit,
      sourceKinds: options.sourceKinds,
      sourceIds: options.sourceIds,
    };
    const hits = await this.registry.search(query);
    const sourceIds = Array.from(new Set(hits.map((hit) => hit.sourceId)));

    return {
      query,
      hits,
      sourceIds,
    };
  }
}
