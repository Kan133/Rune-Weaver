/**
 * Example: Generated Selection Flow Code
 * 
 * This file demonstrates the output of the enhanced selection flow generator
 * with GP-2: Selection Flow Commit/Events support.
 */

import { generateSelectionFlowCode } from "./selection-flow.js";
import { WritePlanEntry } from "../../assembler/index.js";

// Example 1: Talent Draw MVP configuration
const talentDrawEntry: WritePlanEntry = {
  sourcePattern: "rule.selection_flow",
  sourceModule: "talent-draw",
  targetPath: "server/talent-draw-selection-flow.ts",
  contentType: "typescript",
  operation: "create",
  contentSummary: "Talent draw selection flow",
  safe: true,
  parameters: {
    choiceCount: 3,
    selectionPolicy: "single",
    applyMode: "immediate",
    postSelectionPoolBehavior: "remove_selected_and_keep_unselected_eligible",
    trackSelectedItems: true,
    effectApplication: {
      enabled: true,
      rarityAttributeBonusMap: {
        R: { attribute: "strength", value: 10 },
        SR: { attribute: "agility", value: 10 },
        SSR: { attribute: "intelligence", value: 10 },
        UR: { attribute: "all", value: 10 },
      },
    },
  },
};

// Generate the code
const code = generateSelectionFlowCode(
  "TalentDrawSelectionFlow",
  "talent-draw",
  talentDrawEntry
);

console.log("=".repeat(80));
console.log("Generated Selection Flow Code (Talent Draw MVP)");
console.log("=".repeat(80));
console.log(code);
console.log("=".repeat(80));

// Example 2: Simple reward selection without pool state
const simpleRewardEntry: WritePlanEntry = {
  sourcePattern: "rule.selection_flow",
  sourceModule: "reward-system",
  targetPath: "server/reward-selection-flow.ts",
  contentType: "typescript",
  operation: "create",
  contentSummary: "Reward selection flow",
  safe: true,
  parameters: {
    choiceCount: 2,
    postSelectionPoolBehavior: "none",
  },
};

const simpleCode = generateSelectionFlowCode(
  "RewardSelectionFlow",
  "reward-system",
  simpleRewardEntry
);

console.log("\n" + "=".repeat(80));
console.log("Generated Selection Flow Code (Simple Reward)");
console.log("=".repeat(80));
console.log(simpleCode);
console.log("=".repeat(80));
