import type { RuneWeaverWorkspace } from '@/types/workspace';
import type { WorkspaceSourceConfig } from '@/data/workspaceSource';

export interface WorkspaceRefreshHint {
  summary: string;
  command?: string;
}

interface WorkspaceRefreshHintInput {
  source: WorkspaceSourceConfig | null;
  workspace: RuneWeaverWorkspace | null;
  issues: string[];
  bridgeMeta?: { sourceHostRoot: string } | null;
}

function isTrustedHostRoot(hostRoot: string | null | undefined): hostRoot is string {
  if (!hostRoot) {
    return false;
  }

  const trimmed = hostRoot.trim();
  return /^[A-Za-z]:[\\/]/.test(trimmed) || trimmed.startsWith('/');
}

function quoteHostRoot(hostRoot: string): string {
  return /[\s"]/u.test(hostRoot) ? `"${hostRoot.replace(/"/g, '\\"')}"` : hostRoot;
}

function hasLegacyGovernancePayloadIssue(issues: string[]): boolean {
  return issues.some(
    (issue) =>
      issue.includes('missing governanceReadModel')
      || issue.includes('has no governanceReadModel'),
  );
}

export function buildWorkspaceRefreshHint(input: WorkspaceRefreshHintInput): WorkspaceRefreshHint | null {
  const { source, workspace, issues, bridgeMeta } = input;
  if (!source || source.purpose === 'legacy-regression' || !hasLegacyGovernancePayloadIssue(issues)) {
    return null;
  }

  const hostRoot = bridgeMeta?.sourceHostRoot || workspace?.hostRoot || null;
  if (!isTrustedHostRoot(hostRoot)) {
    return null;
  }

  return {
    summary:
      'Refresh this legacy payload with `npm run cli -- export-bridge` to re-export a governed bridge artifact from host-backed workspace truth. This is the refresh lane only, not doctor, repair, or validate.',
    command: `npm run cli -- export-bridge --host ${quoteHostRoot(hostRoot)}`,
  };
}
