import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../../..");
const coreRoot = join(repoRoot, "core");
const deniedTokens = [
  "adapters/dota2/governance/read-model",
  "adapters\\dota2\\governance\\read-model",
  "buildDota2GovernanceReadModel",
  "Dota2GovernanceReadModel",
  "DOTA2_GOVERNANCE_READ_MODEL_SCHEMA_VERSION",
  "dota2-governance-read-model/v1",
];

function collectSourceFiles(root: string): string[] {
  if (!existsSync(root)) {
    return [];
  }

  const files: string[] = [];
  for (const entry of readdirSync(root)) {
    const fullPath = join(root, entry);
    const stats = statSync(fullPath);
    if (stats.isDirectory()) {
      files.push(...collectSourceFiles(fullPath));
      continue;
    }
    if (/\.(?:ts|tsx|js|jsx|json|md)$/.test(entry)) {
      files.push(fullPath);
    }
  }
  return files;
}

const offenders: string[] = [];
for (const file of collectSourceFiles(coreRoot)) {
  const content = readFileSync(file, "utf-8");
  for (const token of deniedTokens) {
    if (content.includes(token)) {
      offenders.push(`${relative(repoRoot, file)} references ${token}`);
    }
  }
}

assert.deepEqual(
  offenders,
  [],
  [
    "Dota2 governance read-model must stay adapter-owned until second-host evidence justifies core genericization.",
    ...offenders,
  ].join("\n"),
);

console.log("adapters/dota2/governance/read-model-core-boundary.test.ts passed");
