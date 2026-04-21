export type Dota2PipelineMode = "create" | "update";

export interface PipelineStageContext {
  id: string;
  label: string;
  mode: Dota2PipelineMode;
}

export interface PipelineStageResult<T> {
  ok: boolean;
  value?: T;
  error?: string;
}

function printStageBanner(label: string): void {
  console.log("\n" + "=".repeat(70));
  console.log(label);
  console.log("=".repeat(70));
}

export async function runPipelineStage<T>(
  context: PipelineStageContext,
  action: () => Promise<T> | T,
): Promise<PipelineStageResult<T>> {
  printStageBanner(context.label);

  try {
    return {
      ok: true,
      value: await action(),
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
