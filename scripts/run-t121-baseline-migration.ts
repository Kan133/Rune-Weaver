/**
 * T121 Runner: Execute baseline ability KV migration against test1
 */
import { migrateBaselineAbilities, printBaselineMigrationResult } from "../adapters/dota2/kv/baseline-migrator.js";

const HOST_ROOT = "D:\\test1";

console.log("T121-R6-R5-R12: Baseline Ability KV Migration");
console.log(`Target host: ${HOST_ROOT}`);
console.log();

const result = migrateBaselineAbilities({
  hostRoot: HOST_ROOT,
  dryRun: false,
});

printBaselineMigrationResult(result);

if (!result.success) {
  process.exit(1);
}
