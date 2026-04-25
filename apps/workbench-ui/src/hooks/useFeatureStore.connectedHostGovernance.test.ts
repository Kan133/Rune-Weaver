import assert from 'node:assert/strict';

import { useFeatureStore } from '@/hooks/useFeatureStore';
import type { HostStatusResult } from '@/hooks/useHostScanner';
import type {
  Dota2GovernanceReadModel,
  Dota2GovernanceReadModelFeature,
  RuneWeaverFeatureRecord,
  RuneWeaverWorkspace,
} from '@/types/workspace';

function buildFeatureRecord(): RuneWeaverFeatureRecord {
  return {
    featureId: 'talent_draw_demo',
    featureName: 'Talent Draw Demo',
    intentKind: 'standalone-system',
    status: 'active',
    revision: 1,
    blueprintId: 'standalone_system_talent_draw_demo',
    selectedPatterns: ['rule.selection_flow'],
    generatedFiles: [],
    entryBindings: [],
    validationStatus: {
      status: 'needs_review',
      warnings: [],
      blockers: [],
    },
    commitDecision: {
      outcome: 'exploratory',
      canAssemble: true,
      canWriteHost: true,
      requiresReview: true,
      reasons: ['legacy workspace record would require compatibility review'],
    },
    groundingSummary: {
      status: 'partial',
      reviewRequired: true,
      verifiedSymbolCount: 1,
      allowlistedSymbolCount: 0,
      weakSymbolCount: 1,
      unknownSymbolCount: 0,
      warnings: ['legacy weak grounding'],
      reasonCodes: ['weak_symbols_present'],
    },
    createdAt: '2026-04-23T00:00:00.000Z',
    updatedAt: '2026-04-23T00:00:00.000Z',
  };
}

function buildWorkspace(): RuneWeaverWorkspace {
  return {
    version: '0.1',
    hostType: 'dota2-x-template',
    hostRoot: 'D:\\test-host',
    addonName: 'talent_draw_demo',
    mapName: 'temp',
    initializedAt: '2026-04-23T00:00:00.000Z',
    features: [buildFeatureRecord()],
  };
}

function buildGovernanceFeature(): Dota2GovernanceReadModelFeature {
  return {
    featureId: 'talent_draw_demo',
    status: 'active',
    revision: 1,
    updatedAt: '2026-04-23T00:00:00.000Z',
    lifecycle: {
      maturity: 'stabilized',
      implementationStrategy: 'family',
      commitOutcome: 'committable',
      requiresReview: false,
      reviewReasons: [],
    },
    reusableGovernance: {
      familyAdmissions: [{ assetId: 'selection_pool', status: 'admitted' }],
      patternAdmissions: [],
      seamAdmissions: [],
      admittedCount: 1,
      attentionCount: 0,
      summary: 'All referenced Dota2 reusable assets are admitted.',
    },
    grounding: {
      status: 'exact',
      reviewRequired: false,
      verifiedSymbolCount: 4,
      allowlistedSymbolCount: 0,
      weakSymbolCount: 0,
      unknownSymbolCount: 0,
      warningCount: 0,
      warnings: [],
      reasonCodes: ['exact_grounding'],
      summary: 'Grounding is exact.',
    },
    repairability: {
      status: 'not_checked',
      reasons: [],
      summary: 'This projection was built without running live post-generation validation.',
    },
    productVerdict: {
      label: 'Review required',
      reasons: ['This projection was built without running live post-generation validation.'],
    },
  };
}

function buildGovernanceReadModel(): Dota2GovernanceReadModel {
  return {
    schemaVersion: 'dota2-governance-read-model/v1',
    workspace: {
      hostRoot: 'D:\\test-host',
      featureCount: 1,
    },
    features: [buildGovernanceFeature()],
  };
}

function buildHostStatus(governanceReadModel?: Dota2GovernanceReadModel): HostStatusResult {
  return {
    hostRoot: 'D:\\test-host',
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
    workspace: buildWorkspace(),
    governanceReadModel,
    issues: [],
    checkedAt: '2026-04-23T00:00:00.000Z',
  };
}

function resetStore(): void {
  useFeatureStore.getState().clearConnectedWorkspace();
}

function runTests(): void {
  resetStore();
  useFeatureStore.getState().connectHostWorkspace(buildHostStatus(buildGovernanceReadModel()));
  assert.equal(useFeatureStore.getState().governanceReadModel?.features.length, 1);
  assert.deepEqual(useFeatureStore.getState().workspaceIssues, []);
  assert.equal(useFeatureStore.getState().workspaceRefreshHint, null);
  const governedFeature = useFeatureStore.getState().getSelectedFeature();
  assert.equal(governedFeature?.reviewSignals.compatibilitySource, 'governance-read-model');
  assert.equal(governedFeature?.reviewSignals.lifecycle?.commitOutcome, 'committable');
  assert.equal(governedFeature?.reviewSignals.reusableGovernance?.admittedCount, 1);
  assert.equal(governedFeature?.reviewSignals.repairability?.status, 'not_checked');
  assert.equal(governedFeature?.reviewSignals.readiness.score, null);

  resetStore();
  useFeatureStore.getState().connectHostWorkspace(buildHostStatus());
  assert.equal(useFeatureStore.getState().governanceReadModel, null);
  assert.equal(
    useFeatureStore.getState().workspaceIssues.includes(
      'Connected host-status payload is missing governanceReadModel; UI is using the compatibility-only legacy display boundary.',
    ),
    true,
  );
  assert.equal(
    useFeatureStore.getState().workspaceIssues.some((issue) => issue.includes('export-bridge')),
    false,
  );
  assert.equal(useFeatureStore.getState().workspaceRefreshHint, null);
  const legacyConnectedFeature = useFeatureStore.getState().getSelectedFeature();
  assert.equal(legacyConnectedFeature?.reviewSignals.compatibilitySource, 'compatibility-only');
  assert.equal(legacyConnectedFeature?.reviewSignals.lifecycle?.commitOutcome, null);
  assert.equal(legacyConnectedFeature?.reviewSignals.lifecycle?.canWriteHost, null);
  assert.equal(legacyConnectedFeature?.reviewSignals.proposalStatus.ready, false);
  assert.equal(legacyConnectedFeature?.reviewSignals.proposalStatus.percentage, null);
  assert.equal(legacyConnectedFeature?.reviewSignals.reusableGovernance?.admittedCount, 0);
  assert.deepEqual(legacyConnectedFeature?.reviewSignals.reusableGovernance?.familyAdmissions, []);
  assert.deepEqual(legacyConnectedFeature?.reviewSignals.reusableGovernance?.patternAdmissions, []);
  assert.deepEqual(legacyConnectedFeature?.reviewSignals.reusableGovernance?.seamAdmissions, []);
  assert.equal(legacyConnectedFeature?.reviewSignals.grounding?.status, 'none_required');
  assert.equal(legacyConnectedFeature?.reviewSignals.grounding?.reviewRequired, false);
  assert.equal(legacyConnectedFeature?.reviewSignals.grounding?.verifiedSymbolCount, 0);
  assert.equal(legacyConnectedFeature?.reviewSignals.grounding?.allowlistedSymbolCount, 0);
  assert.equal(legacyConnectedFeature?.reviewSignals.grounding?.weakSymbolCount, 0);
  assert.equal(legacyConnectedFeature?.reviewSignals.grounding?.unknownSymbolCount, 0);
  assert.equal(legacyConnectedFeature?.reviewSignals.repairability?.status, 'not_checked');
  assert.deepEqual(legacyConnectedFeature?.reviewSignals.repairability?.reasons, []);
  assert.equal(legacyConnectedFeature?.reviewSignals.readiness.score, null);

  console.log('apps/workbench-ui/src/hooks/useFeatureStore.connectedHostGovernance.test.ts: PASS');
}

runTests();
