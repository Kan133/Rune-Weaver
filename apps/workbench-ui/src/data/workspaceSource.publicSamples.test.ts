import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildWorkspaceRefreshHint } from '@/data/workspaceRefreshHint';
import { loadWorkspaceWithMeta } from '@/data/workspaceAdapter';
import { BRIDGE_ARTIFACT_CONTRACT, buildWorkspaceSources, loadWorkspaceFromSource } from '@/data/workspaceSource';
import type { RuneWeaverWorkspace } from '@/types/workspace';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../../');

async function readPublicJson(filename: string): Promise<unknown> {
  const filePath = path.join(repoRoot, 'apps', 'workbench-ui', 'public', filename);
  return JSON.parse(await readFile(filePath, 'utf8'));
}

async function runTests(): Promise<void> {
  const allSources = buildWorkspaceSources(true);
  assert.equal(allSources[0]?.path, '/bridge-workspace.json');
  assert.equal(allSources.some((source) => source.label === 'Governed Sample Workspace'), true);
  assert.equal(allSources.some((source) => source.label === 'Legacy Compatibility Probe'), true);
  assert.equal(
    allSources.find((source) => source.path === '/sample-workspace.json')?.purpose,
    'product',
  );
  assert.equal(
    allSources.find((source) => source.path === '/legacy-compatibility-probe.json')?.purpose,
    'legacy-regression',
  );

  const productSources = buildWorkspaceSources(false);
  assert.deepEqual(productSources.map((source) => source.path), ['/bridge-workspace.json']);
  assert.deepEqual(productSources.map((source) => source.purpose), ['product']);
  assert.equal(productSources[0]?.description?.includes('export-bridge'), true);
  assert.equal(BRIDGE_ARTIFACT_CONTRACT.generationCommand.includes('export-bridge'), true);
  assert.equal(
    allSources.find((source) => source.path === '/sample-workspace.json')?.description?.includes('export-bridge') ?? false,
    false,
  );
  assert.equal(
    allSources.find((source) => source.path === '/legacy-compatibility-probe.json')?.description?.includes('export-bridge') ?? false,
    false,
  );

  const samplePayload = await readPublicJson('sample-workspace.json');
  const bridgePayload = await readPublicJson('bridge-workspace.json');
  const legacyPayload = await readPublicJson('legacy-compatibility-probe.json');
  const checkedInBridgePayload = bridgePayload as {
    workspace?: { features?: unknown[]; hostRoot?: string };
    governanceReadModel?: { workspace?: { featureCount?: number } };
    _bridge?: { exportedBy?: string; exportedAt?: string; sourceHostRoot?: string };
  };
  const checkedInLegacyPayload = legacyPayload as { _bridge?: unknown; governanceReadModel?: unknown; hostRoot?: string };
  const legacyBridgePayload = {
    ...(bridgePayload as Record<string, unknown>),
    governanceReadModel: undefined,
  };

  assert.equal(checkedInBridgePayload._bridge?.exportedBy, 'rune-weaver-cli');
  assert.equal(typeof checkedInBridgePayload._bridge?.exportedAt, 'string');
  assert.equal(checkedInBridgePayload.governanceReadModel?.workspace?.featureCount, checkedInBridgePayload.workspace?.features?.length);
  assert.equal(Array.isArray(checkedInBridgePayload.workspace?.features), true);
  assert.equal(Array.isArray(checkedInLegacyPayload._bridge as unknown[]), false);
  assert.equal(checkedInLegacyPayload._bridge ?? null, null);
  assert.equal(checkedInLegacyPayload.governanceReadModel ?? null, null);

  const legacyProbeRefreshHint = buildWorkspaceRefreshHint({
    source: {
      type: 'sample',
      path: '/legacy-compatibility-probe.json',
      label: 'Legacy Compatibility Probe',
      purpose: 'legacy-regression',
    },
    workspace: legacyPayload as RuneWeaverWorkspace,
    issues: ['Raw workspace payload has no governanceReadModel; UI is using the compatibility-only legacy display boundary.'],
    bridgeMeta: null,
  });
  assert.equal(legacyProbeRefreshHint, null);

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input) => {
    const requestPath = String(input);
    if (requestPath.includes('legacy-bridge-workspace.json')) {
      return {
        ok: true,
        json: async () => legacyBridgePayload,
      } as Response;
    }
    if (requestPath.includes('sample-workspace.json')) {
      return {
        ok: true,
        json: async () => samplePayload,
      } as Response;
    }
    if (requestPath.includes('bridge-workspace.json')) {
      return {
        ok: true,
        json: async () => bridgePayload,
      } as Response;
    }
    if (requestPath.includes('legacy-compatibility-probe.json')) {
      return {
        ok: true,
        json: async () => legacyPayload,
      } as Response;
    }

    return {
      ok: false,
      status: 404,
      json: async () => ({}),
    } as Response;
  };

  try {
    const governedSampleResult = await loadWorkspaceWithMeta('/sample-workspace.json');
    assert.equal(governedSampleResult.governanceReadModel?.schemaVersion, 'dota2-governance-read-model/v1');
    assert.deepEqual(governedSampleResult.issues, []);

    const governedBridgeResult = await loadWorkspaceWithMeta('/bridge-workspace.json');
    assert.equal(governedBridgeResult.governanceReadModel?.schemaVersion, 'dota2-governance-read-model/v1');
    assert.deepEqual(governedBridgeResult.issues, []);

    const governedSourceResult = await loadWorkspaceFromSource({
      type: 'sample',
      path: '/sample-workspace.json',
      label: 'Governed Sample Workspace',
    });
    assert.equal(governedSourceResult.governanceReadModel?.schemaVersion, 'dota2-governance-read-model/v1');
    assert.deepEqual(governedSourceResult.issues, []);

    const legacyBridgeSourceResult = await loadWorkspaceFromSource({
      type: 'bridge',
      path: '/legacy-bridge-workspace.json',
      label: 'CLI Bridge Artifact',
      description: productSources[0]?.description,
    });
    assert.equal(legacyBridgeSourceResult.governanceReadModel, null);
    assert.equal(
      legacyBridgeSourceResult.issues.includes(
        'Bridge payload is missing governanceReadModel; UI is using the compatibility-only legacy display boundary.',
      ),
      true,
    );
    assert.equal(legacyBridgeSourceResult.source.description?.includes('export-bridge'), true);

    const legacyProbeResult = await loadWorkspaceWithMeta('/legacy-compatibility-probe.json');
    assert.equal(legacyProbeResult.governanceReadModel, null);
    assert.equal(
      legacyProbeResult.issues.includes(
        'Raw workspace payload has no governanceReadModel; UI is using the compatibility-only legacy display boundary.',
      ),
      true,
    );

    const legacySourceResult = await loadWorkspaceFromSource({
      type: 'sample',
      path: '/legacy-compatibility-probe.json',
      label: 'Legacy Compatibility Probe',
    });
    assert.equal(legacySourceResult.governanceReadModel, null);
    assert.equal(
      legacySourceResult.issues.includes(
        'Raw workspace payload has no governanceReadModel; UI is using the compatibility-only legacy display boundary.',
      ),
      true,
    );
    assert.equal(legacySourceResult.source.description?.includes('export-bridge') ?? false, false);

    const rawWorkspaceSourceResult = await loadWorkspaceFromSource({
      type: 'query-param',
      path: '/legacy-compatibility-probe.json',
      label: 'Raw Workspace',
    });
    assert.equal(rawWorkspaceSourceResult.governanceReadModel, null);
    assert.equal(
      rawWorkspaceSourceResult.issues.includes(
        'Raw workspace payload has no governanceReadModel; UI is using the compatibility-only legacy display boundary.',
      ),
      true,
    );
  } finally {
    globalThis.fetch = originalFetch;
  }

  console.log('apps/workbench-ui/src/data/workspaceSource.publicSamples.test.ts: PASS');
}

void runTests();
