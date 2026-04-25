import assert from 'node:assert/strict';

import { mockFeatures } from '@/data/mockData';

function runTests(): void {
  for (const feature of mockFeatures) {
    assert.equal(feature.reviewSignals.compatibilitySource, 'compatibility-only');
    assert.equal(feature.reviewSignals.lifecycle?.commitOutcome, null);
    assert.equal(feature.reviewSignals.lifecycle?.canWriteHost, null);
    assert.equal(feature.reviewSignals.readiness.score, null);
    assert.equal(feature.reviewSignals.reusableGovernance?.admittedCount, 0);
    assert.equal(feature.reviewSignals.reusableGovernance?.familyAdmissions.length, 0);
    assert.equal(feature.reviewSignals.reusableGovernance?.patternAdmissions.length, 0);
    assert.equal(feature.reviewSignals.reusableGovernance?.seamAdmissions.length, 0);
    assert.equal(feature.reviewSignals.grounding?.status, 'none_required');
    assert.equal(feature.reviewSignals.grounding?.verifiedSymbolCount, 0);
    assert.equal(feature.reviewSignals.grounding?.allowlistedSymbolCount, 0);
    assert.equal(feature.reviewSignals.grounding?.weakSymbolCount, 0);
    assert.equal(feature.reviewSignals.grounding?.unknownSymbolCount, 0);
    assert.equal(feature.reviewSignals.repairability?.status, 'not_checked');
    assert.deepEqual(feature.reviewSignals.repairability?.reasons, []);
  }

  const activeFeature = mockFeatures.find((feature) => feature.id === '1');
  assert.equal(activeFeature?.reviewSignals.lifecycle?.featureStatus, 'active');

  const archivedFeature = mockFeatures.find((feature) => feature.id === '11');
  assert.equal(archivedFeature?.reviewSignals.lifecycle?.featureStatus, 'archived');

  const errorFeature = mockFeatures.find((feature) => feature.id === '10');
  assert.equal(errorFeature?.reviewSignals.lifecycle?.featureStatus, 'unknown');

  const warningFeature = mockFeatures.find((feature) => feature.id === '10');
  assert.deepEqual(warningFeature?.reviewSignals.readiness.warnings, ['Pattern 版本不匹配']);
  assert.equal(warningFeature?.reviewSignals.lifecycle?.requiresReview, true);

  console.log('apps/workbench-ui/src/data/mockData.test.ts: PASS');
}

runTests();
