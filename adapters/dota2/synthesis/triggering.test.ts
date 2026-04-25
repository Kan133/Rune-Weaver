import assert from "node:assert/strict";

import { shouldUseArtifactSynthesis } from "./index.js";

function testGuidedNativeFallsBackToTemplatedWhenResolutionIsComplete(): void {
  const blueprint = {
    implementationStrategy: "guided_native",
  } as any;

  const resolutionResult = {
    patterns: [
      {
        patternId: "input.key_binding",
        priority: "required",
      },
      {
        patternId: "data.weighted_pool",
        priority: "required",
      },
    ],
    unresolved: [],
    unresolvedModuleNeeds: [],
    complete: true,
  } as any;

  assert.equal(shouldUseArtifactSynthesis(blueprint, resolutionResult), false);
}

function testGuidedNativeSynthesizesWhenUnresolvedModulesRemain(): void {
  const blueprint = {
    implementationStrategy: "guided_native",
  } as any;

  const resolutionResult = {
    patterns: [],
    unresolved: [
      {
        requestedId: "<module:gameplay_core>",
        reason: "missing reusable module",
      },
    ],
    unresolvedModuleNeeds: [
      {
        moduleId: "gameplay_core",
        semanticRole: "gameplay-core",
        reason: "missing reusable module",
        requiredCapabilities: ["effect.unspecified"],
      },
    ],
    complete: false,
  } as any;

  assert.equal(shouldUseArtifactSynthesis(blueprint, resolutionResult), true);
}

function testExploratoryDoesNotSynthesizeWhenEverythingIsResolved(): void {
  const blueprint = {
    implementationStrategy: "exploratory",
  } as any;

  const resolutionResult = {
    patterns: [
      {
        patternId: "input.key_binding",
        priority: "required",
      },
    ],
    unresolved: [],
    unresolvedModuleNeeds: [],
    complete: true,
  } as any;

  assert.equal(shouldUseArtifactSynthesis(blueprint, resolutionResult), false);
}

testGuidedNativeFallsBackToTemplatedWhenResolutionIsComplete();
testGuidedNativeSynthesizesWhenUnresolvedModulesRemain();
testExploratoryDoesNotSynthesizeWhenEverythingIsResolved();

console.log("adapters/dota2/synthesis/triggering.test.ts: PASS");
