import assert from 'node:assert/strict';

import type { WorkbenchResult } from '../../../workbench/contract';
import type { Dota2GovernanceReadModelFeature, RuneWeaverFeatureRecord, RuneWeaverWorkspace } from '@/types/workspace';
import { adaptWorkbenchResultToFeature } from '@/data/featureAdapter';
import { deriveFeatureGroupFromIntentKind, deriveFeatureGroupFromWorkbenchResult, deriveFeatureGroupFromWorkspaceRecord } from '@/data/featureGroupProjection';
import { adaptWorkspaceRecordToFeature, loadWorkspaceWithMeta } from '@/data/workspaceAdapter';
import { loadWorkspaceFromSource } from '@/data/workspaceSource';

function buildWorkspaceRecord(intentKind: string): RuneWeaverFeatureRecord {
  return {
    featureId: 'standalone_system_kjki',
    featureName: 'Talent Draw Demo',
    intentKind,
    status: 'active',
    revision: 1,
    blueprintId: 'standalone_system_kjki',
    selectedPatterns: [],
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
      reasons: [],
    },
    groundingSummary: {
      status: 'partial',
      reviewRequired: true,
      verifiedSymbolCount: 1,
      allowlistedSymbolCount: 0,
      weakSymbolCount: 1,
      unknownSymbolCount: 0,
      warnings: ['weak grounding'],
      reasonCodes: ['verified_symbols_present', 'weak_symbols_present'],
    },
    createdAt: '2026-04-21T12:00:00.000Z',
    updatedAt: '2026-04-21T12:00:00.000Z',
  };
}

function buildWorkbenchResult(intentKind: string): WorkbenchResult {
  return {
    success: true,
    session: {
      id: 'session-1',
      createdAt: new Date('2026-04-21T12:00:00.000Z'),
      featureIdentity: {
        id: 'standalone_system_kjki',
        label: 'Talent Draw Demo',
        intentSummary: 'Three-choice weighted draw system',
        hostScope: 'dota2',
        createdAt: new Date('2026-04-21T12:00:00.000Z'),
      },
      featureOwnership: {
        featureId: 'standalone_system_kjki',
        expectedSurfaces: [],
        impactAreas: [],
        confidence: 'high',
        isComplete: true,
      },
      integrationPoints: {
        featureId: 'standalone_system_kjki',
        points: [],
      },
      status: 'review',
      wizardResult: {
        schema: {
          classification: {
            intentKind,
            confidence: 'high',
          },
        },
        issues: [],
        valid: true,
      },
    },
    featureCard: {
      id: 'standalone_system_kjki',
      displayLabel: 'Talent Draw Demo',
      systemLabel: 'standalone_system_kjki',
      summary: 'Three-choice weighted draw system',
      host: 'dota2',
      status: 'ready',
      riskLevel: 'low',
      needsConfirmation: false,
      createdAt: new Date('2026-04-21T12:00:00.000Z'),
      updatedAt: new Date('2026-04-21T12:00:00.000Z'),
    },
    featureDetail: {
      cardId: 'standalone_system_kjki',
      basicInfo: {
        id: 'standalone_system_kjki',
        displayLabel: 'Talent Draw Demo',
        systemLabel: 'standalone_system_kjki',
        intentSummary: 'Three-choice weighted draw system',
        hostScope: 'dota2',
        createdAt: new Date('2026-04-21T12:00:00.000Z'),
        updatedAt: new Date('2026-04-21T12:00:00.000Z'),
      },
      status: {
        status: 'ready',
        riskLevel: 'low',
        needsConfirmation: false,
        conflictCount: 0,
        lastConflictSummary: '',
      },
      editableParams: {
        knownInputs: {},
        missingParams: [],
        canEdit: false,
      },
      hostOutput: {
        host: 'dota2',
        expectedSurfaces: [],
        impactAreas: [],
        integrationPointCount: 0,
        outputSummary: 'Expected 0 integration point(s) on dota2',
      },
      patternBindings: {
        patterns: [],
        isBound: false,
      },
    },
  } as unknown as WorkbenchResult;
}

function buildWorkspacePayload(intentKind: string): RuneWeaverWorkspace {
  return {
    version: '0.1',
    hostType: 'dota2-x-template',
    hostRoot: 'D:\\test-host',
    addonName: 'talent_draw_demo',
    mapName: 'temp',
    initializedAt: '2026-04-21T12:00:00.000Z',
    features: [buildWorkspaceRecord(intentKind)],
  };
}

async function runTests(): Promise<void> {
  assert.equal(deriveFeatureGroupFromIntentKind('standalone-system'), 'system');
  assert.equal(deriveFeatureGroupFromIntentKind('cross-system-composition'), 'system');
  assert.equal(deriveFeatureGroupFromIntentKind('ui-surface'), 'system');
  assert.equal(deriveFeatureGroupFromIntentKind('micro-feature'), null);

  const workspaceRecord = buildWorkspaceRecord('standalone-system');
  assert.equal(deriveFeatureGroupFromWorkspaceRecord(workspaceRecord), 'system');
  const adaptedWorkspaceFeature = adaptWorkspaceRecordToFeature(workspaceRecord, 'dota2-x-template');
  assert.equal(adaptedWorkspaceFeature.group, 'system');
  assert.equal(adaptedWorkspaceFeature.reviewSignals.compatibilitySource, 'compatibility-only');
  assert.equal(adaptedWorkspaceFeature.reviewSignals.lifecycle?.commitOutcome, null);
  assert.equal(adaptedWorkspaceFeature.reviewSignals.lifecycle?.canWriteHost, null);
  assert.equal(adaptedWorkspaceFeature.reviewSignals.proposalStatus.ready, false);
  assert.equal(adaptedWorkspaceFeature.reviewSignals.proposalStatus.percentage, null);
  assert.equal(adaptedWorkspaceFeature.reviewSignals.reusableGovernance?.admittedCount, 0);
  assert.deepEqual(adaptedWorkspaceFeature.reviewSignals.reusableGovernance?.familyAdmissions, []);
  assert.deepEqual(adaptedWorkspaceFeature.reviewSignals.reusableGovernance?.patternAdmissions, []);
  assert.deepEqual(adaptedWorkspaceFeature.reviewSignals.reusableGovernance?.seamAdmissions, []);
  assert.equal(adaptedWorkspaceFeature.reviewSignals.grounding?.status, 'none_required');
  assert.equal(adaptedWorkspaceFeature.reviewSignals.grounding?.reviewRequired, false);
  assert.equal(adaptedWorkspaceFeature.reviewSignals.grounding?.verifiedSymbolCount, 0);
  assert.equal(adaptedWorkspaceFeature.reviewSignals.grounding?.allowlistedSymbolCount, 0);
  assert.equal(adaptedWorkspaceFeature.reviewSignals.grounding?.weakSymbolCount, 0);
  assert.equal(adaptedWorkspaceFeature.reviewSignals.grounding?.unknownSymbolCount, 0);
  assert.equal(adaptedWorkspaceFeature.reviewSignals.readiness.score, null);
  assert.equal(adaptedWorkspaceFeature.reviewSignals.repairability?.status, 'not_checked');
  assert.deepEqual(adaptedWorkspaceFeature.reviewSignals.repairability?.reasons, []);
  assert.equal(
    adaptedWorkspaceFeature.reviewSignals.readiness.warnings.includes(
      'Governance read-model is unavailable on this payload; UI is using the compatibility-only legacy display boundary.',
    ),
    true,
  );

  const governanceReadModel: Dota2GovernanceReadModelFeature = {
      featureId: workspaceRecord.featureId,
      status: 'active',
      revision: 1,
      updatedAt: '2026-04-21T12:00:00.000Z',
      lifecycle: {
        maturity: 'stabilized',
        implementationStrategy: 'family',
        commitOutcome: 'committable',
        requiresReview: false,
        reviewReasons: ['family admitted'],
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
        status: 'clean',
        reasons: [],
        summary: 'Validation passes cleanly.',
      },
      productVerdict: {
        label: 'Clean',
        reasons: ['Validation passes cleanly.'],
      },
  };
  const governanceFirstFeature = adaptWorkspaceRecordToFeature(workspaceRecord, 'dota2-x-template', governanceReadModel);
  assert.equal(governanceFirstFeature.reviewSignals.compatibilitySource, 'governance-read-model');
  assert.equal(governanceFirstFeature.reviewSignals.lifecycle?.commitOutcome, 'committable');
  assert.equal(governanceFirstFeature.reviewSignals.reusableGovernance?.admittedCount, 1);
  assert.equal(governanceFirstFeature.reviewSignals.grounding?.status, 'exact');
  assert.equal(governanceFirstFeature.reviewSignals.repairability?.status, 'clean');
  assert.equal(governanceFirstFeature.reviewSignals.readiness.score, 100);

  const workbenchResult = buildWorkbenchResult('standalone-system');
  assert.equal(deriveFeatureGroupFromWorkbenchResult(workbenchResult), 'system');
  const workbenchFeature = adaptWorkbenchResultToFeature(workbenchResult);
  assert.equal(workbenchFeature?.group, 'system');
  assert.equal(workbenchFeature?.reviewSignals.compatibilitySource, 'compatibility-only');
  assert.equal(workbenchFeature?.reviewSignals.lifecycle?.commitOutcome, null);
  assert.equal(workbenchFeature?.reviewSignals.lifecycle?.canWriteHost, null);
  assert.equal(workbenchFeature?.reviewSignals.proposalStatus.ready, true);
  assert.equal(workbenchFeature?.reviewSignals.proposalStatus.percentage, 100);
  assert.equal(workbenchFeature?.reviewSignals.reusableGovernance?.admittedCount, 0);
  assert.deepEqual(workbenchFeature?.reviewSignals.reusableGovernance?.familyAdmissions, []);
  assert.deepEqual(workbenchFeature?.reviewSignals.reusableGovernance?.patternAdmissions, []);
  assert.deepEqual(workbenchFeature?.reviewSignals.reusableGovernance?.seamAdmissions, []);
  assert.equal(workbenchFeature?.reviewSignals.grounding?.status, 'none_required');
  assert.equal(workbenchFeature?.reviewSignals.grounding?.reviewRequired, false);
  assert.equal(workbenchFeature?.reviewSignals.grounding?.verifiedSymbolCount, 0);
  assert.equal(workbenchFeature?.reviewSignals.grounding?.allowlistedSymbolCount, 0);
  assert.equal(workbenchFeature?.reviewSignals.grounding?.weakSymbolCount, 0);
  assert.equal(workbenchFeature?.reviewSignals.grounding?.unknownSymbolCount, 0);
  assert.equal(workbenchFeature?.reviewSignals.repairability?.status, 'not_checked');
  assert.equal(workbenchFeature?.reviewSignals.readiness.score, null);
  assert.equal(
    workbenchFeature?.reviewSignals.readiness.warnings.includes(
      'Legacy workbench result payload has no governance read-model; UI is using the compatibility-only display boundary.',
    ),
    true,
  );

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input) => {
    const path = String(input);
    if (path.includes('governed-bridge.json')) {
      return {
        ok: true,
        json: async () => ({
          _bridge: {
            exportedAt: '2026-04-21T12:00:00.000Z',
            exportedBy: 'rune-weaver-cli',
            sourceHostRoot: 'D:\\test-host',
            version: '0.1',
          },
          workspace: buildWorkspacePayload('standalone-system'),
          governanceReadModel: {
            schemaVersion: 'dota2-governance-read-model/v1',
            workspace: {
              hostRoot: 'D:\\test-host',
              featureCount: 1,
            },
            features: [governanceReadModel],
          },
        }),
      } as Response;
    }
    if (path.includes('legacy-bridge.json')) {
      return {
        ok: true,
        json: async () => ({
          _bridge: {
            exportedAt: '2026-04-21T12:00:00.000Z',
            exportedBy: 'rune-weaver-cli',
            sourceHostRoot: 'D:\\test-host',
            version: '0.1',
          },
          workspace: buildWorkspacePayload('standalone-system'),
        }),
      } as Response;
    }

    return {
      ok: true,
      json: async () => buildWorkspacePayload('standalone-system'),
    } as Response;
  };

  try {
    const governedBridgeResult = await loadWorkspaceWithMeta('/governed-bridge.json');
    assert.equal(governedBridgeResult.governanceReadModel?.schemaVersion, 'dota2-governance-read-model/v1');
    assert.deepEqual(governedBridgeResult.issues, []);

    const legacyBridgeResult = await loadWorkspaceWithMeta('/legacy-bridge.json');
    assert.equal(legacyBridgeResult.governanceReadModel, null);
    assert.equal(
      legacyBridgeResult.issues.includes(
        'Bridge payload is missing governanceReadModel; UI is using the compatibility-only legacy display boundary.',
      ),
      true,
    );
    const legacyBridgeFeature = adaptWorkspaceRecordToFeature(
      legacyBridgeResult.workspace?.features[0] ?? workspaceRecord,
      'dota2-x-template',
    );
    assert.equal(legacyBridgeFeature.reviewSignals.compatibilitySource, 'compatibility-only');
    assert.equal(legacyBridgeFeature.reviewSignals.lifecycle?.commitOutcome, null);
    assert.equal(legacyBridgeFeature.reviewSignals.lifecycle?.canWriteHost, null);
    assert.equal(legacyBridgeFeature.reviewSignals.proposalStatus.ready, false);
    assert.equal(legacyBridgeFeature.reviewSignals.reusableGovernance?.admittedCount, 0);
    assert.deepEqual(legacyBridgeFeature.reviewSignals.reusableGovernance?.familyAdmissions, []);
    assert.deepEqual(legacyBridgeFeature.reviewSignals.reusableGovernance?.patternAdmissions, []);
    assert.deepEqual(legacyBridgeFeature.reviewSignals.reusableGovernance?.seamAdmissions, []);
    assert.equal(legacyBridgeFeature.reviewSignals.grounding?.status, 'none_required');
    assert.equal(legacyBridgeFeature.reviewSignals.grounding?.reviewRequired, false);
    assert.equal(legacyBridgeFeature.reviewSignals.grounding?.verifiedSymbolCount, 0);
    assert.equal(legacyBridgeFeature.reviewSignals.grounding?.allowlistedSymbolCount, 0);
    assert.equal(legacyBridgeFeature.reviewSignals.grounding?.weakSymbolCount, 0);
    assert.equal(legacyBridgeFeature.reviewSignals.grounding?.unknownSymbolCount, 0);
    assert.equal(legacyBridgeFeature.reviewSignals.repairability?.status, 'not_checked');
    assert.deepEqual(legacyBridgeFeature.reviewSignals.repairability?.reasons, []);
    assert.equal(legacyBridgeFeature.reviewSignals.readiness.score, null);

    const rawWorkspaceResult = await loadWorkspaceWithMeta('/raw-workspace.json');
    assert.equal(rawWorkspaceResult.governanceReadModel, null);
    assert.equal(
      rawWorkspaceResult.issues.includes(
        'Raw workspace payload has no governanceReadModel; UI is using the compatibility-only legacy display boundary.',
      ),
      true,
    );
    const rawWorkspaceFeature = adaptWorkspaceRecordToFeature(
      rawWorkspaceResult.workspace?.features[0] ?? workspaceRecord,
      'dota2-x-template',
    );
    assert.equal(rawWorkspaceFeature.reviewSignals.compatibilitySource, 'compatibility-only');
    assert.equal(rawWorkspaceFeature.reviewSignals.lifecycle?.commitOutcome, null);
    assert.equal(rawWorkspaceFeature.reviewSignals.reusableGovernance?.admittedCount, 0);
    assert.deepEqual(rawWorkspaceFeature.reviewSignals.reusableGovernance?.familyAdmissions, []);
    assert.equal(rawWorkspaceFeature.reviewSignals.grounding?.status, 'none_required');
    assert.equal(rawWorkspaceFeature.reviewSignals.grounding?.verifiedSymbolCount, 0);
    assert.equal(rawWorkspaceFeature.reviewSignals.repairability?.status, 'not_checked');
    assert.equal(rawWorkspaceFeature.reviewSignals.readiness.score, null);

    const rawWorkspaceSourceResult = await loadWorkspaceFromSource({
      type: 'query-param',
      path: '/raw-workspace.json',
      label: 'Raw Workspace',
    });
    assert.equal(
      rawWorkspaceSourceResult.issues.includes(
        'Raw workspace payload has no governanceReadModel; UI is using the compatibility-only legacy display boundary.',
      ),
      true,
    );
  } finally {
    globalThis.fetch = originalFetch;
  }

  console.log('apps/workbench-ui/src/data/featureGroupProjection.test.ts: PASS');
}

void runTests();
