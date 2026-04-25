import assert from 'node:assert/strict';

import { buildWorkspaceRefreshHint } from '@/data/workspaceRefreshHint';
import type { WorkspaceSourceConfig } from '@/data/workspaceSource';
import type { RuneWeaverWorkspace } from '@/types/workspace';

function buildWorkspace(hostRoot = 'D:\\test-host'): RuneWeaverWorkspace {
  return {
    version: '0.1',
    hostType: 'dota2-x-template',
    hostRoot,
    addonName: 'test_addon',
    mapName: 'temp',
    initializedAt: '2026-04-23T00:00:00.000Z',
    features: [],
  };
}

function buildSource(overrides: Partial<WorkspaceSourceConfig> = {}): WorkspaceSourceConfig {
  return {
    type: 'bridge',
    path: '/bridge-workspace.json',
    label: 'CLI Bridge Artifact',
    purpose: 'product',
    ...overrides,
  };
}

function runTests(): void {
  const legacyBridgeHint = buildWorkspaceRefreshHint({
    source: buildSource(),
    workspace: buildWorkspace(),
    issues: ['Bridge payload is missing governanceReadModel; UI is using the compatibility-only legacy display boundary.'],
    bridgeMeta: { sourceHostRoot: 'D:\\bridge-host' },
  });
  assert.equal(legacyBridgeHint?.command, 'npm run cli -- export-bridge --host D:\\bridge-host');
  assert.equal(legacyBridgeHint?.summary.includes('export-bridge'), true);
  assert.equal(legacyBridgeHint?.summary.includes('not doctor, repair, or validate'), true);
  assert.equal(legacyBridgeHint?.command?.includes('doctor'), false);
  assert.equal(legacyBridgeHint?.command?.includes('validate'), false);
  assert.equal(legacyBridgeHint?.command?.includes('repair'), false);

  const rawWorkspaceHint = buildWorkspaceRefreshHint({
    source: buildSource({ type: 'query-param', path: '/raw-workspace.json', label: 'Raw Workspace' }),
    workspace: buildWorkspace('D:\\raw-host'),
    issues: ['Raw workspace payload has no governanceReadModel; UI is using the compatibility-only legacy display boundary.'],
    bridgeMeta: null,
  });
  assert.equal(rawWorkspaceHint?.command, 'npm run cli -- export-bridge --host D:\\raw-host');

  const governedPayloadHint = buildWorkspaceRefreshHint({
    source: buildSource(),
    workspace: buildWorkspace(),
    issues: [],
    bridgeMeta: { sourceHostRoot: 'D:\\bridge-host' },
  });
  assert.equal(governedPayloadHint, null);

  const legacyRegressionHint = buildWorkspaceRefreshHint({
    source: buildSource({
      type: 'sample',
      path: '/legacy-compatibility-probe.json',
      label: 'Legacy Compatibility Probe',
      purpose: 'legacy-regression',
    }),
    workspace: buildWorkspace(),
    issues: ['Raw workspace payload has no governanceReadModel; UI is using the compatibility-only legacy display boundary.'],
    bridgeMeta: null,
  });
  assert.equal(legacyRegressionHint, null);

  const untrustedHostHint = buildWorkspaceRefreshHint({
    source: buildSource(),
    workspace: buildWorkspace('bridge-host'),
    issues: ['Bridge payload is missing governanceReadModel; UI is using the compatibility-only legacy display boundary.'],
    bridgeMeta: null,
  });
  assert.equal(untrustedHostHint, null);

  const connectedHostHint = buildWorkspaceRefreshHint({
    source: null,
    workspace: buildWorkspace(),
    issues: ['Connected host-status payload is missing governanceReadModel; UI is using the compatibility-only legacy display boundary.'],
    bridgeMeta: null,
  });
  assert.equal(connectedHostHint, null);

  const legacyWorkbenchHint = buildWorkspaceRefreshHint({
    source: null,
    workspace: null,
    issues: ['Legacy workbench result payload has no governance read-model; UI is using the compatibility-only display boundary.'],
    bridgeMeta: null,
  });
  assert.equal(legacyWorkbenchHint, null);

  console.log('apps/workbench-ui/src/data/workspaceRefreshHint.test.ts: PASS');
}

runTests();
