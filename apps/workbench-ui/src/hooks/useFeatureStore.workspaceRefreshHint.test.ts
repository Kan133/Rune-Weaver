import assert from 'node:assert/strict';

import { useFeatureStore } from '@/hooks/useFeatureStore';
import type { HostStatusResult } from '@/hooks/useHostScanner';
import type { RuneWeaverFeatureRecord, RuneWeaverWorkspace } from '@/types/workspace';

function buildWorkspaceRecord(): RuneWeaverFeatureRecord {
  return {
    featureId: 'talent_draw_demo',
    featureName: 'Talent Draw Demo',
    intentKind: 'standalone-system',
    status: 'active',
    revision: 1,
    blueprintId: 'standalone_system_talent_draw_demo',
    selectedPatterns: [],
    generatedFiles: [],
    entryBindings: [],
    createdAt: '2026-04-23T00:00:00.000Z',
    updatedAt: '2026-04-23T00:00:00.000Z',
  };
}

function buildWorkspace(hostRoot = 'D:\\test-host'): RuneWeaverWorkspace {
  return {
    version: '0.1',
    hostType: 'dota2-x-template',
    hostRoot,
    addonName: 'talent_draw_demo',
    mapName: 'temp',
    initializedAt: '2026-04-23T00:00:00.000Z',
    features: [buildWorkspaceRecord()],
  };
}

function buildHostStatus(governanceReadModel?: object): HostStatusResult {
  return {
    hostRoot: 'D:\\connected-host',
    supported: true,
    hostType: 'dota2-x-template',
    rwStatus: {
      initialized: true,
      namespaceReady: true,
      workspaceReady: true,
      serverBridge: {
        entryExists: true,
        indexExists: true,
        hostEntryInjected: true,
        ready: true,
      },
      uiBridge: {
        entryExists: true,
        indexExists: true,
        hostEntryInjected: true,
        ready: true,
      },
      ready: true,
    },
    workspace: buildWorkspace('D:\\connected-host'),
    governanceReadModel: governanceReadModel as HostStatusResult['governanceReadModel'],
    issues: [],
    checkedAt: '2026-04-23T00:00:00.000Z',
  };
}

function resetStore(): void {
  useFeatureStore.getState().clearConnectedWorkspace();
}

async function runTests(): Promise<void> {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input) => {
    const requestPath = String(input);
    if (requestPath.includes('governed-bridge.json')) {
      return {
        ok: true,
        json: async () => ({
          _bridge: {
            exportedAt: '2026-04-23T00:00:00.000Z',
            exportedBy: 'rune-weaver-cli',
            sourceHostRoot: 'D:\\bridge-host',
            version: '0.1',
          },
          workspace: buildWorkspace('D:\\bridge-host'),
          governanceReadModel: {
            schemaVersion: 'dota2-governance-read-model/v1',
            workspace: {
              hostRoot: 'D:\\bridge-host',
              featureCount: 1,
            },
            features: [],
          },
        }),
      } as Response;
    }

    if (requestPath.includes('legacy-bridge.json')) {
      return {
        ok: true,
        json: async () => ({
          _bridge: {
            exportedAt: '2026-04-23T00:00:00.000Z',
            exportedBy: 'rune-weaver-cli',
            sourceHostRoot: 'D:\\bridge-host',
            version: '0.1',
          },
          workspace: buildWorkspace('D:\\bridge-host'),
        }),
      } as Response;
    }

    if (requestPath.includes('raw-workspace.json')) {
      return {
        ok: true,
        json: async () => buildWorkspace('D:\\raw-host'),
      } as Response;
    }

    if (requestPath.includes('legacy-compatibility-probe.json')) {
      return {
        ok: true,
        json: async () => buildWorkspace('D:\\probe-host'),
      } as Response;
    }

    return {
      ok: false,
      status: 404,
      json: async () => ({}),
    } as Response;
  };

  try {
    resetStore();
    await useFeatureStore.getState().switchWorkspaceSource({
      type: 'bridge',
      path: '/governed-bridge.json',
      label: 'Governed Bridge',
      purpose: 'product',
    });
    assert.equal(useFeatureStore.getState().workspaceRefreshHint, null);

    resetStore();
    await useFeatureStore.getState().switchWorkspaceSource({
      type: 'bridge',
      path: '/legacy-bridge.json',
      label: 'CLI Bridge Artifact',
      purpose: 'product',
    });
    assert.equal(useFeatureStore.getState().workspaceRefreshHint?.command, 'npm run cli -- export-bridge --host D:\\bridge-host');
    assert.equal(
      useFeatureStore.getState().workspaceRefreshHint?.summary.includes('not doctor, repair, or validate'),
      true,
    );

    resetStore();
    await useFeatureStore.getState().switchWorkspaceSource({
      type: 'query-param',
      path: '/raw-workspace.json',
      label: 'Raw Workspace',
      purpose: 'product',
    });
    assert.equal(useFeatureStore.getState().workspaceRefreshHint?.command, 'npm run cli -- export-bridge --host D:\\raw-host');

    resetStore();
    await useFeatureStore.getState().switchWorkspaceSource({
      type: 'sample',
      path: '/legacy-compatibility-probe.json',
      label: 'Legacy Compatibility Probe',
      purpose: 'legacy-regression',
    });
    assert.equal(useFeatureStore.getState().workspaceRefreshHint, null);

    resetStore();
    useFeatureStore.getState().connectHostWorkspace(buildHostStatus());
    assert.equal(useFeatureStore.getState().workspaceRefreshHint, null);
  } finally {
    globalThis.fetch = originalFetch;
    resetStore();
  }

  console.log('apps/workbench-ui/src/hooks/useFeatureStore.workspaceRefreshHint.test.ts: PASS');
}

void runTests();
