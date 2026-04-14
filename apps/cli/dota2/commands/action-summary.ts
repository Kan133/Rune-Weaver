export type ActionSummaryStatus = "ready" | "action_required" | "blocked";

export interface ActionSummary {
  status: ActionSummaryStatus;
  headline: string;
  reason: string;
  command?: string;
  source: "demo-runbook" | "doctor";
}

export function formatActionSummary(summary: ActionSummary): string[] {
  const lines = [
    `Action Summary: ${summary.headline}`,
    `Reason: ${summary.reason}`,
  ];

  if (summary.command) {
    lines.push(`Command: ${summary.command}`);
  }

  return lines;
}
