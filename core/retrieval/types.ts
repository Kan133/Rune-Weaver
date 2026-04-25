export type CorpusSourceKind = "curated-markdown" | "dota2-host-symbol-index";

export interface RetrievalQuery {
  text: string;
  limit?: number;
  perSourceLimit?: number;
  sourceKinds?: CorpusSourceKind[];
  sourceIds?: string[];
}

export interface RetrievalHit {
  id: string;
  sourceId: string;
  sourceKind: CorpusSourceKind;
  score: number;
  title: string;
  snippet: string;
  reference?: string;
  metadata?: Record<string, unknown>;
}

export interface CorpusSource {
  id: string;
  kind: CorpusSourceKind;
  search(query: RetrievalQuery): RetrievalHit[] | Promise<RetrievalHit[]>;
}

export interface RetrievalResult {
  query: RetrievalQuery;
  hits: RetrievalHit[];
  sourceIds: string[];
}
