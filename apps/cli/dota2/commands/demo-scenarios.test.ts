import assert from "assert";
import { getDemoScenarioById, listDemoScenarios, resolveDemoScenario } from "./demo-scenarios.js";

const scenarios = listDemoScenarios();
assert(scenarios.length >= 2, "scenario registry should expose at least two scenarios");
assert.strictEqual(getDemoScenarioById("talent-draw")?.maturity, "ready");
assert.strictEqual(getDemoScenarioById("talent-draw-inventory-update")?.maturity, "ready");
assert.strictEqual(getDemoScenarioById("dash-strike")?.maturity, "planned");

const resolved = resolveDemoScenario({
  command: "demo",
  prompt: "",
  hostRoot: "D:\\test",
  addonName: "dash_strike_demo",
  dryRun: true,
  write: false,
  force: false,
  verbose: false,
});

assert.strictEqual(resolved.id, "talent-draw", "planned scenarios should not silently become the runnable default");

const explicitlyResolved = resolveDemoScenario({
  command: "lifecycle",
  prompt: "",
  hostRoot: "D:\\test",
  featureId: "talent_draw_demo",
  scenario: "talent-draw-inventory-update",
  dryRun: true,
  write: false,
  force: false,
  verbose: false,
});

assert.strictEqual(
  explicitlyResolved.id,
  "talent-draw-inventory-update",
  "ready scenarios should be selectable explicitly",
);

console.log("Demo scenarios tests passed");
