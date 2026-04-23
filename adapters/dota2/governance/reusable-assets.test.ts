import assert from "node:assert/strict";

import {
  getDota2ReusableAssetAdmissionStatus,
  isDota2ReusableAssetFormallyAdmitted,
  validateDota2ReusableAssetGovernance,
} from "./reusable-assets.js";

{
  const result = validateDota2ReusableAssetGovernance();
  assert.equal(result.valid, true);
  assert.deepEqual(result.errors, []);
}

{
  assert.equal(
    getDota2ReusableAssetAdmissionStatus("pattern", "effect.outcome_realizer"),
    "admitted",
  );
  assert.equal(
    getDota2ReusableAssetAdmissionStatus("family", "selection_pool"),
    "admitted",
  );
  assert.equal(
    getDota2ReusableAssetAdmissionStatus("pattern", "input.key_binding"),
    "untracked",
  );
}

{
  assert.equal(isDota2ReusableAssetFormallyAdmitted("pattern", "effect.outcome_realizer"), true);
  assert.equal(isDota2ReusableAssetFormallyAdmitted("family", "selection_pool"), true);
  assert.equal(isDota2ReusableAssetFormallyAdmitted("pattern", "input.key_binding"), false);
}

console.log("adapters/dota2/governance/reusable-assets.test.ts passed");
