import { createWritePlan } from "../adapters/dota2/assembler/index.js";
import { generateCode } from "../adapters/dota2/generator/index.js";
import { executeWritePlan } from "../adapters/dota2/executor/write-executor.js";
import type { AssemblyPlan, SelectedPattern } from "../core/schema/types.js";

const FEATURE_ID = "rw_write_verify";
const assemblyPlan: AssemblyPlan = {
  blueprintId: `${FEATURE_ID}_bp`,
  selectedPatterns: [{
    patternId: "dota2.short_time_buff",
    role: "ability",
    parameters: { abilityName: FEATURE_ID, duration: 6.0, movespeedBonus: 80 },
  } as SelectedPattern],
  hostWriteReadiness: { ready: true, blockers: [] },
  readyForHostWrite: true,
};

const writePlan = createWritePlan(assemblyPlan, "D:\\test1", FEATURE_ID);
const luaEntry = writePlan.entries.find((e) => e.contentType === "lua");
if (!luaEntry) { console.error("NO LUA ENTRY"); process.exit(1); }

const code = generateCode(luaEntry, FEATURE_ID);
const abilityName = luaEntry.metadata?.abilityName || FEATURE_ID;
const luaPath = `game/scripts/vscripts/rune_weaver/abilities/${abilityName}.lua`;

console.log("Writing lua to:", luaPath);
console.log("Content preview (first 200 chars):", code.content.slice(0, 200));

const result = await executeWritePlan({
  featureId: FEATURE_ID,
  actions: [{ type: "create", targetPath: luaPath, content: code.content, rwOwned: true, description: "Lua ability" }],
  filesToCreate: [luaPath],
  filesToModify: [],
  readyForHostWrite: true,
}, { hostRoot: "D:\\test1", dryRun: false, force: true });

console.log("Write result success:", result.success);
console.log("Created files:", result.createdFiles);
if (result.failed.length > 0) {
  console.error("FAILED:", result.failed);
  process.exit(1);
}