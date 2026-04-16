import type { BlueprintModule } from "../../core/schema/types.js";
import {
  EXPECTED_PATH_PATTERNS,
  REQUIRED_MODULE_CATEGORIES,
  REQUIRED_PATTERNS,
  TALENT_DRAW_SPECIFIC_PARAMS,
} from "./config.js";
import type { CLIOptions, FullPipelineResult, SmokeResult, WriteExecutionResult } from "./types.js";

export interface SmokeInput {
  result: FullPipelineResult;
  writeExecution: WriteExecutionResult | null;
  options: CLIOptions;
}

export function runSmokeAssertions(input: SmokeInput): SmokeResult {
  const { result, writeExecution, options } = input;

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

  const wizardHasTalentDrawParams = TALENT_DRAW_SPECIFIC_PARAMS.some((param) => param in wizardExtractedParams);
  assert(
    "Wizard does not implicitly provide Talent Draw params",
    !wizardHasTalentDrawParams,
    `Wizard unexpectedly extracted: ${TALENT_DRAW_SPECIFIC_PARAMS.filter((p) => p in wizardExtractedParams).join(", ")}`
  );

  assert(
    "Schema has fixture parameters merged",
    schema.parameters?.triggerKey === "F4" && schema.parameters?.choiceCount === 3,
    `triggerKey=${schema.parameters?.triggerKey}, choiceCount=${schema.parameters?.choiceCount}`
  );

  const moduleCategories = blueprint.modules.map((module) => module.category);
  const hasAllCategories = REQUIRED_MODULE_CATEGORIES.every((category) =>
    moduleCategories.includes(category as BlueprintModule["category"])
  );
  assert("Blueprint has trigger/data/rule/ui modules", hasAllCategories, `Found: ${moduleCategories.join(", ")}`);

  assert(
    "Blueprint modules have parameters",
    blueprint.modules.some((module) => module.parameters && Object.keys(module.parameters).length > 0)
  );

  const selectedPatternIds = resolution.patterns.map((pattern) => pattern.patternId);
  assert(
    "Selected patterns include the current Talent Draw pattern set",
    REQUIRED_PATTERNS.every((id) => selectedPatternIds.includes(id)),
    `Missing: ${REQUIRED_PATTERNS.filter((id) => !selectedPatternIds.includes(id)).join(", ")}`
  );

  assert("AssemblyPlan exists", assemblyPlan !== null);
  if (assemblyPlan) {
    assert("Assembly write targets include server paths", assemblyPlan.writeTargets.some((target) => EXPECTED_PATH_PATTERNS.server.test(target.path)));
    assert("Assembly write targets include shared paths", assemblyPlan.writeTargets.some((target) => EXPECTED_PATH_PATTERNS.shared.test(target.path)));
    assert("Assembly write targets include UI paths", assemblyPlan.writeTargets.some((target) => EXPECTED_PATH_PATTERNS.ui.test(target.path)));
  }

  assert("HostRealizationPlan created", hostRealizationPlan !== null);
  assert("GeneratorRoutingPlan created", generatorRoutingPlan !== null);
  assert("WritePlan created", writePlan !== null);

  if (writePlan) {
    assert("WritePlan has entries", writePlan.entries.length > 0);
    assert("WritePlan target project matches host option", writePlan.targetProject === options.host);
    assert("WritePlan includes server paths", writePlan.entries.some((entry) => EXPECTED_PATH_PATTERNS.server.test(entry.targetPath)));
    assert("WritePlan includes shared paths", writePlan.entries.some((entry) => EXPECTED_PATH_PATTERNS.shared.test(entry.targetPath)));
    assert("WritePlan includes UI paths", writePlan.entries.some((entry) => EXPECTED_PATH_PATTERNS.ui.test(entry.targetPath)));
  }

  assert("Generated files produced", generatedFiles.length > 0);
  assert("Generated content includes drawForSelection", generatedFiles.some(({ code }) => code.content.includes("drawForSelection")));
  assert(
    "Generated content references rarity/bonus mapping",
    generatedFiles.some(({ code, entry }) =>
      code.content.includes("rarityAttributeBonusMap") ||
      code.content.includes("rarity") ||
      code.content.includes("tier") ||
      entry.contentSummary.includes("effectApplication")
    )
  );
  assert(
    "Generated content has placeholder evidence",
    generatedFiles.some(({ code }) =>
      code.content.includes("placeholder") ||
      code.content.includes("empty_slot") ||
      code.content.includes("isPlaceholder")
    )
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
