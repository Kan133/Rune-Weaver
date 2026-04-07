/**
 * T121-R6-R5-R17: RW Fresh Ability Reachable Validation Path
 *
 * Mount rw_test_v2 into heroes.txt Ability4 slot so user can see and test it
 * without any console injection commands.
 */
import { readFileSync, writeFileSync } from "fs";

const HEROES_PATH = "D:\\test1\\game\\scripts\\npc\\heroes.txt";
const ABILITY_NAME = "rw_test_v2";

let content = readFileSync(HEROES_PATH, "utf-8");

const oldLine = '\t\t"Ability4" "generic_hidden"';
const newLine = `\t\t"Ability4" "${ABILITY_NAME}"`;

if (!content.includes(oldLine)) {
  if (content.includes(`"Ability4" "${ABILITY_NAME}"`)) {
    console.log(`✅ ${ABILITY_NAME} already mounted at Ability4 (skipping)`);
    process.exit(0);
  } else {
    console.error("❌ Could not find Ability4 generic_hidden line in heroes.txt");
    process.exit(1);
  }
}

content = content.replace(oldLine, newLine);
writeFileSync(HEROES_PATH, content, "utf-8");

console.log("✅ Hero attachment updated:");
console.log(`   Ability4: generic_hidden → ${ABILITY_NAME}`);
console.log("");
console.log("The hero will now have:");
console.log("   Q (Ability1): crystal_nova_x     [baseline]");
console.log("   W (Ability2): counter_helix_x    [baseline]");
console.log("   E (Ability3): tiny_toss_x        [baseline]");
console.log("   D (Ability4): rw_test_v2          [RW FRESH IDENTITY] ← NEW");
console.log("");
console.log("User can now enter game and press D key to cast rw_test_v2 directly.");
