/**
 * T121-R6-R5-R20: Modifier Apply Path Fix
 *
 * Blocker: modifier_rw_test_v2.apply is nil because toDotaClassInstance in registerModifier
 * only copies prototype (instance) methods, NOT static methods like apply().
 *
 * Fix: Replace modifier_rw_test_v2.apply() with native AddNewModifier() call.
 */
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

const ABILITY_PATH = "D:\\test1\\game\\scripts\\vscripts\\rune_weaver\\abilities\\rw_test_v2.lua";

let content = readFileSync(ABILITY_PATH, "utf-8");

const oldApplyCall = '    local modifier_applied = modifier_rw_test_v2.apply(caster, caster, self, {})';
const newAddNewModifierCall = `    -- Use native Dota2 API: AddNewModifier (BaseModifier.apply is static,
    -- not copied to _G by toDotaClassInstance in registerModifier)
    local modifier_applied = caster:AddNewModifier(caster, self, "modifier_rw_test_v2", {duration = duration})`;

if (!content.includes(oldApplyCall)) {
  if (content.includes("caster:AddNewModifier(caster, self, \"modifier_rw_test_v2\"")) {
    console.log("✅ Already using native AddNewModifier (skipping)");
    process.exit(0);
  } else {
    console.error("❌ Could not find .apply() call pattern");
    process.exit(1);
  }
}

content = content.replace(oldApplyCall, newAddNewModifierCall);

writeFileSync(ABILITY_PATH, content, "utf-8");

console.log("✅ Fixed modifier apply path:");
console.log("   OLD: modifier_rw_test_v2.apply(caster, caster, self, {}) — nil!");
console.log("   NEW: caster:AddNewModifier(caster, self, \"modifier_rw_test_v2\", {duration}) — native API");
