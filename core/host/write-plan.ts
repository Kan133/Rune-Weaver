export type HostWriteOperation = "create" | "update" | "append" | "delete";

export interface HostWritePlanEntry {
  operation: HostWriteOperation;
  targetPath: string;
  contentType: "typescript" | "tsx" | "less" | "css" | "json" | "kv" | "lua";
  contentSummary: string;
  sourcePattern: string;
  sourceModule: string;
  safe: boolean;
  conflicts?: string[];
  parameters?: Record<string, unknown>;
}

export interface HostWritePlanStats {
  total: number;
  create: number;
  update: number;
  conflicts: number;
  deferred: number;
}

export interface HostWritePlan {
  id: string;
  targetProject: string;
  generatedAt: string;
  entries: HostWritePlanEntry[];
  stats: HostWritePlanStats;
  executionOrder: number[];
  integrationPoints?: string[];
  readyForHostWrite?: boolean;
  readinessBlockers?: string[];
}

export function calculateHostWriteExecutionOrder(
  entries: Array<Pick<HostWritePlanEntry, "contentType">>
): number[] {
  const priority: Record<string, number> = {
    json: 1,
    typescript: 2,
    tsx: 3,
    less: 4,
    css: 5,
  };

  return entries
    .map((_, index) => index)
    .sort((a, b) => {
      const pa = priority[entries[a].contentType] || 99;
      const pb = priority[entries[b].contentType] || 99;
      return pa - pb;
    });
}
