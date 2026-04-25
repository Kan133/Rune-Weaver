import type { BlueprintModule } from "../../core/schema/types.js";
import type { SelectionCaseSpec } from "../../adapters/dota2/cases/selection-demo-registry.js";
import {
  EXPECTED_PATH_PATTERNS,
  REQUIRED_MODULE_CATEGORIES,
} from "./config.js";
import type { CLIOptions, FullPipelineResult, SmokeResult, WriteExecutionResult } from "./types.js";

export interface SmokeInput {
  caseSpec: SelectionCaseSpec;
  result: FullPipelineResult;
  writeExecution: WriteExecutionResult | null;
  options: CLIOptions;
}

function contentContainsAnyToken(content: string, tokens: string[]): boolean {
  return tokens.some((token) => content.includes(token));
}

export function runSmokeAssertions(input: SmokeInput): SmokeResult {
  const { caseSpec, result, writeExecution, options } = input;
  const { smokeExpectations } = caseSpec;

  console.log("\n[Smoke] Running assertions...");
  const assertions: SmokeResult["assertions"] = [];

  function assert(name: string, condition: boolean, message?: string) {
    assertions.push({ name, passed: condition, message });
    console.log(`  ${condition ? "✓" : "✗"} ${name}${message && !condition ? `: ${message}` : ""}`);
  }

  const {
    schema,
    blueprint,
    resolution,
    assemblyPlan,
    hostRealizationPlan,
    generatorRoutingPlan,
    writePlan,
    generatedFiles,
    wizardExtractedParams,
  } = result;

  const wizardInjectedKeys = smokeExpectations.wizardSpecificParams.filter((param) => param in wizardExtractedParams);
  assert(
    "Wizard does not implicitly provide case-owned params",
    wizardInjectedKeys.length === 0,
    `Wizard unexpectedly extracted: ${wizardInjectedKeys.join(", ")}`,
  );

  assert(
    "Schema has case fixture parameters merged",
    schema.parameters?.triggerKey === caseSpec.authoringParameters.triggerKey &&
      schema.parameters?.choiceCount === caseSpec.authoringParameters.choiceCount &&
      schema.parameters?.objectKind === smokeExpectations.objectKind &&
      Array.isArray(schema.parameters?.poolEntries) &&
      Array.isArray(schema.parameters?.localCollections),
    `triggerKey=${schema.parameters?.triggerKey}, choiceCount=${schema.parameters?.choiceCount}, objectKind=${schema.parameters?.objectKind}`,
  );

  const moduleCategories = blueprint.modules.map((module) => module.category);
  const moduleRoles = blueprint.modules.map((module) => module.role);
  const hasAllCategories = REQUIRED_MODULE_CATEGORIES.every((category) =>
    moduleCategories.includes(category as BlueprintModule["category"]),
  );
  assert("Blueprint has trigger/data/rule/effect/ui modules", hasAllCategories, `Found: ${moduleCategories.join(", ")}`);
  assert(
    "Blueprint keeps the selection-first module skeleton",
    ["input_trigger", "weighted_pool", "selection_flow", "selection_outcome", "selection_modal"]
      .every((role) => moduleRoles.includes(role)),
    `Found: ${moduleRoles.join(", ")}`,
  );

  assert(
    "Blueprint modules have parameters",
    blueprint.modules.some((module) => module.parameters && Object.keys(module.parameters).length > 0),
  );

  const selectedPatternIds = resolution.patterns.map((pattern) => pattern.patternId);
  assert(
    "Selected patterns include the selection case pattern set",
    smokeExpectations.requiredPatternIds.every((id) => selectedPatternIds.includes(id)),
    `Missing: ${smokeExpectations.requiredPatternIds.filter((id) => !selectedPatternIds.includes(id)).join(", ")}`,
  );

  assert("AssemblyPlan exists", assemblyPlan !== null);
  if (assemblyPlan) {
    assert(
      "Assembly write targets include server paths",
      assemblyPlan.writeTargets.some((target) => EXPECTED_PATH_PATTERNS.server.test(target.path)),
    );
    assert(
      "Assembly write targets include shared paths",
      assemblyPlan.writeTargets.some((target) => EXPECTED_PATH_PATTERNS.shared.test(target.path)),
    );
    assert(
      "Assembly write targets include UI paths",
      assemblyPlan.writeTargets.some((target) => EXPECTED_PATH_PATTERNS.ui.test(target.path)),
    );
  }

  assert("HostRealizationPlan created", hostRealizationPlan !== null);
  if (hostRealizationPlan) {
    assert(
      "HostRealizationPlan includes selection_outcome unit",
      hostRealizationPlan.units.some((unit) => unit.id === "selection_outcome"),
    );
  }

  assert("GeneratorRoutingPlan created", generatorRoutingPlan !== null);
  assert("WritePlan created", writePlan !== null);

  if (writePlan) {
    assert("WritePlan has entries", writePlan.entries.length > 0);
    assert("WritePlan target project matches host option", writePlan.targetProject === options.host);
    assert(
      "WritePlan includes server paths",
      writePlan.entries.some((entry) => EXPECTED_PATH_PATTERNS.server.test(entry.targetPath)),
    );
    assert(
      "WritePlan includes shared paths",
      writePlan.entries.some((entry) => EXPECTED_PATH_PATTERNS.shared.test(entry.targetPath)),
    );
    assert(
      "WritePlan includes UI paths",
      writePlan.entries.some((entry) => EXPECTED_PATH_PATTERNS.ui.test(entry.targetPath)),
    );
  }

  assert("Generated files produced", generatedFiles.length > 0);
  assert(
    "Generated content includes drawForSelection",
    generatedFiles.some(({ code }) => code.content.includes("drawForSelection")),
  );
  assert(
    "Generated content includes configured outcome kinds",
    generatedFiles.some(({ code }) =>
      smokeExpectations.requiredOutcomeKinds.every((kind) => code.content.includes(kind)),
    ),
    `Outcome kinds: ${smokeExpectations.requiredOutcomeKinds.join(", ")}`,
  );
  assert(
    "Generated content includes configured realization tokens",
    generatedFiles.some(({ code, entry }) =>
      contentContainsAnyToken(code.content, smokeExpectations.generatedContentIndicators) ||
      contentContainsAnyToken(entry.contentSummary, smokeExpectations.generatedContentIndicators),
    ),
    `Tokens: ${smokeExpectations.generatedContentIndicators.join(", ")}`,
  );
  assert(
    "Generated content has placeholder evidence",
    generatedFiles.some(({ code }) =>
      code.content.includes("placeholder") ||
      code.content.includes("empty_slot") ||
      code.content.includes("isPlaceholder"),
    ),
  );

  assert("Write execution evidence created", writeExecution !== null);
  assert("Host root option recorded", options.host.length > 0);

  if (!options.write) {
    assert("Default mode is dry-run", writeExecution?.writeResult !== null);
    assert("Dry-run does not report created files", (writeExecution?.evidence.filesCreated.length || 0) === 0);
    assert("Dry-run includes write preview artifacts", (writeExecution?.evidence.dryRunArtifacts.length || 0) > 0);
  }

  const passed = assertions.every((assertion) => assertion.passed);
  return { passed, assertions };
}
