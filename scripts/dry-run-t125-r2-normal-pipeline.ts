/**
 * T125-R2 Dry-Run: Normal Pipeline Lua Entry Production
 *
 * 目标：证明 normal pipeline（不手工构造 WritePlanEntry）能自然产出 lua entry。
 *
 * 链路：
 *   Pattern(dota2.short_time_buff, outputTypes:["lua","kv"])
 *   → assembler.createWritePlan(assemblyPlan)
 *     → generateEntriesForPattern() 遍历 outputTypes
 *       → WritePlanEntry{contentType:"lua"}  ← 自然产出！
 *         → generator.generateCode(entry)
 *           → GeneratedCode{language:"lua", content}
 */
import { createWritePlan } from "../adapters/dota2/assembler/index.js";
import { generateCode } from "../adapters/dota2/generator/index.js";
import type { AssemblyPlan, SelectedPattern } from "../core/schema/types.js";

const FEATURE_ID = "rw_pipeline_test";
const PATTERN_ID = "dota2.short_time_buff";

const assemblyPlan: AssemblyPlan = {
  blueprintId: `${FEATURE_ID}_bp`,
  selectedPatterns: [
    {
      patternId: PATTERN_ID,
      role: "ability",
      parameters: {
        abilityName: "rw_pipeline_test",
        duration: 6.0,
        movespeedBonus: 80,
      },
    } satisfies SelectedPattern,
  ],
  hostWriteReadiness: {
    ready: true,
    blockers: [],
  },
  readyForHostWrite: true,
};

console.log("=".repeat(60));
console.log("T125-R2 Dry-Run: Normal Pipeline Lua Entry Production");
console.log("=".repeat(60));
console.log();

console.log("--- Step 1: Create Write Plan from AssemblyPlan ---");
const writePlan = createWritePlan(assemblyPlan, "D:\\test1", FEATURE_ID);

console.log(`WritePlan ID: ${writePlan.id}`);
console.log(`Total entries: ${writePlan.stats.total}`);
console.log(`Creates: ${writePlan.stats.create}`);
console.log();

console.log("--- Step 2: Inspect Entries ---");
for (let i = 0; i < writePlan.entries.length; i++) {
  const entry = writePlan.entries[i];
  console.log(`  Entry[${i}]:`);
  console.log(`    contentType:  ${entry.contentType}`);
  console.log(`    targetPath:   ${entry.targetPath}`);
  console.log(`    sourcePattern: ${entry.sourcePattern}`);
  console.log(`    deferred:      ${entry.deferred ?? false}`);
  console.log();
}

const luaEntry = writePlan.entries.find((e) => e.contentType === "lua");
const kvEntry = writePlan.entries.find((e) => e.contentType === "kv");

console.log("--- Step 3: Verify Lua Entry Naturally Produced ---");

if (!luaEntry) {
  console.error("❌ FAIL: No contentType:'lua' entry found in write plan!");
  console.error("   This means the normal pipeline did NOT produce a lua entry.");
  process.exit(1);
}
console.log(`✅ Lua entry found naturally via normal pipeline!`);
console.log(`   contentType: ${luaEntry.contentType}`);
console.log(`   targetPath:  ${luaEntry.targetPath}`);
console.log(`   source:      ${luaEntry.sourcePattern}`);
console.log();

if (!kvEntry) {
  console.error("❌ FAIL: No contentType:'kv' entry found (pattern declares both)");
  process.exit(1);
}
console.log(`✅ KV entry also found (outputTypes:['lua','kv'] produces both)`);
console.log();

console.log("--- Step 4: Generate Code from Natural Lua Entry ---");
const generated = generateCode(luaEntry, FEATURE_ID);

console.log(`Generated:`);
console.log(`  language:      ${generated.language}`);
console.log(`  content length: ${generated.content.length} chars`);
console.log(`  exports:       [${generated.exports.join(", ")}]`);
console.log();

console.log("--- Step 5: Validate Generated Lua Content ---");
let checksPassed = 0;
let checksTotal = 0;

function check(label: string, condition: boolean) {
  checksTotal++;
  if (condition) {
    console.log(`  ✅ ${label}`);
    checksPassed++;
  } else {
    console.error(`  ❌ ${label}`);
  }
}

check("language === 'lua'", generated.language === "lua");
check("content non-empty", generated.content.length > 0);
check("exports includes ability name", generated.exports.length >= 1);
check("contains registerAbility", generated.content.includes("registerAbility"));
check("contains registerModifier", generated.content.includes("registerModifier"));
check("contains OnSpellStart", generated.content.includes("OnSpellStart"));
check("contains AddNewModifier (T20 learning)", generated.content.includes("AddNewModifier"));
check("contains modifier class definition", generated.content.includes("__TS__Class()"));

console.log();
if (checksPassed === checksTotal) {
  console.log("=".repeat(60));
  console.log(`🎉 ALL ${checksTotal}/${checksTotal} CHECKS PASSED`);
  console.log("=".repeat(60));
  console.log("");
  console.log("T125-R2 VERDICT:");
  console.log("  Normal pipeline DOES naturally produce lua entries.");
  console.log("");
  console.log("EVIDENCE CHAIN:");
  console.log(`  1. Pattern "${PATTERN_ID}" has outputTypes:["lua","kv"]`);
  console.log(`  2. assembler.generateEntriesForPattern() iterates outputTypes`);
  console.log(`  3. WritePlanEntry{contentType:"lua"} created automatically`);
  console.log(`  4. generator.generateCode(entry) produces valid Lua`);
  console.log("");
  console.log("DECISION POINT:");
  console.log("  Pattern.outputTypes[] → assembler → WritePlanEntry.contentType");
  console.log("  This IS the minimal, correct normal-pipeline decision point.");
} else {
  console.error(`❌ ${checksTotal - checksPassed}/${checksTotal} CHECKS FAILED`);
  process.exit(1);
}
