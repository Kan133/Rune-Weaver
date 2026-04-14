import type { Dota2CLIOptions } from "../../dota2-cli.js";
import {
  buildDoctorStep,
  buildValidateStep,
  printLifecycleProofPlan,
  runLifecycleHarness,
  type LifecycleHarnessConfig,
} from "./lifecycle-harness.js";
import {
  getScenarioAddonName,
  getScenarioFeatureId,
  getScenarioMapName,
  resolveDemoScenario,
} from "./demo-scenarios.js";

export async function runLifecycleProofCommand(options: Dota2CLIOptions): Promise<boolean> {
  if (!options.hostRoot) {
    console.error("Error: --host <path> is required");
    console.error("   Usage: npm run cli -- dota2 lifecycle prove --host <path> --write");
    return false;
  }

  const config = buildLifecycleProofConfig(options);
  printLifecycleProofPlan(config.plan);
  const result = await runLifecycleHarness(options, config);
  return result.success;
}

export function buildLifecycleProofConfig(options: Dota2CLIOptions): LifecycleHarnessConfig {
  const scenario = resolveDemoScenario(options);
  const featureId = getScenarioFeatureId(options, scenario);
  const addonName = getScenarioAddonName(options, scenario);
  const mapName = getScenarioMapName(options, scenario);

  let id = 1;
  return {
    scenarioId: scenario.id,
    displayName: scenario.displayName,
    featureId,
    addonName,
    mapName,
    narrative: `Scenario-driven lifecycle harness for ${scenario.displayName}`,
    plan: [
      {
        id: id++,
        name: scenario.createStepLabel,
        kind: "create",
        required: true,
        command: scenario.createCommand({ ...options, featureId, addonName, mapName }),
      },
      buildDoctorStep(id++, options.hostRoot, "Doctor after create"),
      buildValidateStep(id++, options.hostRoot, "Validate after create"),
      {
        id: id++,
        name: "Owned-scope update",
        kind: "update",
        required: true,
        command: scenario.updateCommand({ ...options, featureId, addonName, mapName }),
      },
      buildDoctorStep(id++, options.hostRoot, "Doctor after update"),
      buildValidateStep(id++, options.hostRoot, "Validate after update"),
      {
        id: id++,
        name: scenario.deleteStepLabel,
        kind: "delete",
        required: true,
        command: scenario.deleteCommand({ ...options, featureId, addonName, mapName }),
      },
      buildDoctorStep(id++, options.hostRoot, "Doctor after delete"),
      buildValidateStep(id++, options.hostRoot, "Validate after delete"),
      {
        id: id++,
        name: scenario.recreateStepLabel,
        kind: "recreate",
        required: true,
        command: scenario.recreateCommand({ ...options, featureId, addonName, mapName }),
      },
      buildDoctorStep(id++, options.hostRoot, "Doctor after recreate"),
      buildValidateStep(id++, options.hostRoot, "Validate after recreate"),
      ...(scenario.evidenceCommand
        ? [{
            id: id++,
            name: "Refresh canonical evidence pack",
            kind: "refresh-evidence" as const,
            required: false,
            command: scenario.evidenceCommand({ ...options, featureId, addonName, mapName }),
          }]
        : []),
      {
        id: id++,
        name: "Launch command for manual runtime proof",
        kind: "manual-runtime",
        required: false,
        command: ["yarn", "launch", addonName, mapName],
      },
    ],
  };
}
