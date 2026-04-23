import assert from 'node:assert/strict';

import type { WorkbenchResult } from '../../../workbench/contract';
import type { RuneWeaverFeatureRecord } from '@/types/workspace';
import { adaptWorkbenchResultToFeature } from '@/data/featureAdapter';
import { deriveFeatureGroupFromIntentKind, deriveFeatureGroupFromWorkbenchResult, deriveFeatureGroupFromWorkspaceRecord } from '@/data/featureGroupProjection';
import { adaptWorkspaceRecordToFeature } from '@/data/workspaceAdapter';

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

function runTests(): void {
  assert.equal(deriveFeatureGroupFromIntentKind('standalone-system'), 'system');
  assert.equal(deriveFeatureGroupFromIntentKind('cross-system-composition'), 'system');
  assert.equal(deriveFeatureGroupFromIntentKind('ui-surface'), 'system');
  assert.equal(deriveFeatureGroupFromIntentKind('micro-feature'), null);

  const workspaceRecord = buildWorkspaceRecord('standalone-system');
  assert.equal(deriveFeatureGroupFromWorkspaceRecord(workspaceRecord), 'system');
  const adaptedWorkspaceFeature = adaptWorkspaceRecordToFeature(workspaceRecord, 'dota2-x-template');
  assert.equal(adaptedWorkspaceFeature.group, 'system');
  assert.equal(adaptedWorkspaceFeature.reviewSignals.grounding?.status, 'partial');
  assert.equal(adaptedWorkspaceFeature.reviewSignals.readiness.score, 65);

  const workbenchResult = buildWorkbenchResult('standalone-system');
  assert.equal(deriveFeatureGroupFromWorkbenchResult(workbenchResult), 'system');
  assert.equal(adaptWorkbenchResultToFeature(workbenchResult)?.group, 'system');

  console.log('apps/workbench-ui/src/data/featureGroupProjection.test.ts: PASS');
}

runTests();
