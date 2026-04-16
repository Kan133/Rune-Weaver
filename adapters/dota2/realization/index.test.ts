import assert from "node:assert/strict";

import { realizeDota2Host } from "./index.js";

{
  const plan = realizeDota2Host({
    blueprintId: "bp_dash",
    selectedPatterns: [{ patternId: "effect.dash", role: "dash", parameters: {} }],
    modules: [
      {
        id: "dash_module",
        role: "gameplay-core",
        selectedPatterns: ["effect.dash"],
        outputKinds: ["server"],
        outputs: [
          { kind: "ts", target: "server_ts", rationale: ["runtime"] },
          { kind: "kv", target: "ability_kv", rationale: ["static config"] },
        ],
        realizationHints: {
          runtimeHeavy: true,
          kvCapable: true,
        },
      },
    ],
    connections: [],
    writeTargets: [],
    bridgeUpdates: [],
    validations: [],
    readyForHostWrite: false,
  });

  assert.equal(plan.units[0].realizationType, "kv+ts");
  assert.deepEqual(plan.units[0].hostTargets, ["ability_kv", "server_ts"]);
}

{
  const plan = realizeDota2Host({
    blueprintId: "bp_ui",
    selectedPatterns: [{ patternId: "ui.selection_modal", role: "modal", parameters: {} }],
    modules: [
      {
        id: "ui_module",
        role: "ui-surface",
        selectedPatterns: ["ui.selection_modal"],
        outputKinds: ["ui"],
        outputs: [
          { kind: "ui", target: "panorama_tsx", rationale: ["ui"] },
          { kind: "ui", target: "panorama_less", rationale: ["style"] },
        ],
        realizationHints: {
          uiRequired: true,
        },
      },
    ],
    connections: [],
    writeTargets: [],
    bridgeUpdates: [],
    validations: [],
    readyForHostWrite: false,
  });

  assert.equal(plan.units[0].realizationType, "ui");
}

console.log("adapters/dota2/realization/index.test.ts passed");
