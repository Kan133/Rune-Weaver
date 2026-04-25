import type { Dota2CLIOptions } from "../../dota2-cli.js";
import {
  TALENT_DRAW_DEMO_INVENTORY_UPDATE_PROMPT,
} from "../../../../adapters/dota2/cases/selection-demo-registry.js";

export interface DemoScenario {
  id: string;
  displayName: string;
  maturity?: "ready" | "planned";
  defaultFeatureId: string;
  defaultAddonName: string;
  defaultMapName: string;
  updatePrompt: string;
  writeFeatureLabel: string;
  createStepLabel: string;
  deleteStepLabel: string;
  recreateStepLabel: string;
  createCommand: (options: Dota2CLIOptions) => string[];
  recreateCommand: (options: Dota2CLIOptions) => string[];
  updateCommand: (options: Dota2CLIOptions) => string[];
  deleteCommand: (options: Dota2CLIOptions) => string[];
  evidenceCommand?: (options: Dota2CLIOptions) => string[];
}

const talentDrawScenario: DemoScenario = {
  id: "talent-draw",
  displayName: "Talent Draw",
  maturity: "ready",
  defaultFeatureId: "talent_draw_demo",
  defaultAddonName: "talent_draw_demo",
  defaultMapName: "temp",
  updatePrompt: "把天赋抽取的触发键从 F4 改成 F5",
  writeFeatureLabel: "Write or refresh Talent Draw feature",
  createStepLabel: "Create/write Talent Draw",
  deleteStepLabel: "Delete Talent Draw",
  recreateStepLabel: "Recreate Talent Draw",
  createCommand: (options) => ["npm", "run", "demo:talent-draw", "--", "--host", options.hostRoot, "--write", "--force"],
  recreateCommand: (options) => ["npm", "run", "demo:talent-draw", "--", "--host", options.hostRoot, "--write", "--force"],
  updateCommand: (options) => [
    "npm",
    "run",
    "cli",
    "--",
    "dota2",
    "update",
    "把天赋抽取的触发键从 F4 改成 F5",
    "--host",
    options.hostRoot,
    "--feature",
    options.featureId || "talent_draw_demo",
    "--write",
  ],
  deleteCommand: (options) => [
    "npm",
    "run",
    "cli",
    "--",
    "dota2",
    "delete",
    "--host",
    options.hostRoot,
    "--feature",
    options.featureId || "talent_draw_demo",
    "--write",
  ],
  evidenceCommand: (options) => ["npm", "run", "demo:talent-draw:refresh", "--", "--host", options.hostRoot],
};

const talentDrawInventoryUpdateScenario: DemoScenario = {
  id: "talent-draw-inventory-update",
  displayName: "Talent Draw Inventory Update",
  maturity: "ready",
  defaultFeatureId: "talent_draw_demo",
  defaultAddonName: "talent_draw_demo",
  defaultMapName: "temp",
  updatePrompt: TALENT_DRAW_DEMO_INVENTORY_UPDATE_PROMPT,
  writeFeatureLabel: "Write or refresh Talent Draw v1 baseline",
  createStepLabel: "Create/write Talent Draw v1",
  deleteStepLabel: "Delete Talent Draw inventory demo",
  recreateStepLabel: "Recreate Talent Draw v1",
  createCommand: (options) => ["npm", "run", "demo:talent-draw", "--", "--host", options.hostRoot, "--write", "--force"],
  recreateCommand: (options) => ["npm", "run", "demo:talent-draw", "--", "--host", options.hostRoot, "--write", "--force"],
  updateCommand: (options) => [
    "npm",
    "run",
    "cli",
    "--",
    "dota2",
    "update",
    TALENT_DRAW_DEMO_INVENTORY_UPDATE_PROMPT,
    "--host",
    options.hostRoot,
    "--feature",
    options.featureId || "talent_draw_demo",
    "--write",
  ],
  deleteCommand: (options) => [
    "npm",
    "run",
    "cli",
    "--",
    "dota2",
    "delete",
    "--host",
    options.hostRoot,
    "--feature",
    options.featureId || "talent_draw_demo",
    "--write",
  ],
  evidenceCommand: (options) => ["npm", "run", "demo:talent-draw:refresh", "--", "--host", options.hostRoot],
};

const dashStrikeScenario: DemoScenario = {
  id: "dash-strike",
  displayName: "Dash Strike",
  maturity: "planned",
  defaultFeatureId: "dash_strike_demo",
  defaultAddonName: "dash_strike_demo",
  defaultMapName: "temp",
  updatePrompt: "把冲刺技能的按键从 Q 改成 W",
  writeFeatureLabel: "Write or refresh Dash Strike feature",
  createStepLabel: "Create/write Dash Strike",
  deleteStepLabel: "Delete Dash Strike",
  recreateStepLabel: "Recreate Dash Strike",
  createCommand: (options) => ["npm", "run", "cli", "--", "dota2", "review", "做一个按Q键触发的短距离冲刺技能", "--host", options.hostRoot],
  recreateCommand: (options) => ["npm", "run", "cli", "--", "dota2", "review", "做一个按Q键触发的短距离冲刺技能", "--host", options.hostRoot],
  updateCommand: (options) => ["npm", "run", "cli", "--", "dota2", "review", "把冲刺技能的按键从 Q 改成 W", "--host", options.hostRoot],
  deleteCommand: (options) => ["npm", "run", "cli", "--", "dota2", "delete", "--host", options.hostRoot, "--feature", options.featureId || "dash_strike_demo"],
};

const DEMO_SCENARIOS: DemoScenario[] = [
  talentDrawScenario,
  talentDrawInventoryUpdateScenario,
  dashStrikeScenario,
];

export function listDemoScenarios(): DemoScenario[] {
  return [...DEMO_SCENARIOS];
}

export function getDemoScenarioById(id: string): DemoScenario | undefined {
  return DEMO_SCENARIOS.find((scenario) => scenario.id === id);
}

export function resolveDemoScenario(options: Dota2CLIOptions): DemoScenario {
  const explicit = options.scenario ? getDemoScenarioById(options.scenario) : undefined;
  if (explicit && explicit.maturity !== "planned") {
    return explicit;
  }

  const inferred = DEMO_SCENARIOS.find((scenario) =>
    options.featureId === scenario.defaultFeatureId ||
    options.addonName === scenario.defaultAddonName,
  );

  return inferred && inferred.maturity !== "planned"
    ? inferred
    : DEMO_SCENARIOS.find((scenario) => scenario.maturity !== "planned") || DEMO_SCENARIOS[0];
}

export function getScenarioFeatureId(options: Dota2CLIOptions, scenario: DemoScenario): string {
  return options.featureId || scenario.defaultFeatureId;
}

export function getScenarioAddonName(options: Dota2CLIOptions, scenario: DemoScenario): string {
  return options.addonName || scenario.defaultAddonName;
}

export function getScenarioMapName(options: Dota2CLIOptions, scenario: DemoScenario): string {
  return options.mapName || scenario.defaultMapName;
}

export interface ScenarioContract {
  scenarioId: string;
  scenarioName: string;
  featureId: string;
  addonName: string;
  mapName: string;
  maturity: string;
  description: string;
}

export function getScenarioContract(options: Dota2CLIOptions, scenario: DemoScenario): ScenarioContract {
  return {
    scenarioId: scenario.id,
    scenarioName: scenario.displayName,
    featureId: getScenarioFeatureId(options, scenario),
    addonName: getScenarioAddonName(options, scenario),
    mapName: getScenarioMapName(options, scenario),
    maturity: scenario.maturity || "ready",
    description: `Launch ${scenario.displayName} on map ${getScenarioMapName(options, scenario)} with addon ${getScenarioAddonName(options, scenario)}.`,
  };
}

