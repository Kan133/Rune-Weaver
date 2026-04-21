import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");

const paths = {
  intentPlan: path.join(repoRoot, "docs", "planning", "intent-blueprint", "INTENT-SCHEMA-BLUEPRINT-UPDATE-PLAN.md"),
  blueprintProposal: path.join(repoRoot, "docs", "planning", "intent-blueprint", "BLUEPRINT-PROPOSAL-CONTRACT-PROPOSAL.md"),
  blueprintNormalizer: path.join(repoRoot, "docs", "planning", "intent-blueprint", "BLUEPRINT-NORMALIZER-PROPOSAL.md"),
  moduleNeed: path.join(repoRoot, "docs", "MODULE-NEED-SEAM-PROPOSAL.md"),
  patternPlan: path.join(repoRoot, "docs", "PATTERN-UPDATE-PLAN.md"),
  patternContract: path.join(repoRoot, "docs", "PATTERN-CONTRACT-VNEXT-PROPOSAL.md"),
  realizationFamily: path.join(repoRoot, "docs", "REALIZATION-FAMILY-PROPOSAL.md"),
  fillSlot: path.join(repoRoot, "docs", "FILL-SLOT-CONTRACT-PROPOSAL.md"),
} as const;

const requiredModuleNeedFields = [
  "moduleId",
  "semanticRole",
  "requiredCapabilities",
  "optionalCapabilities",
  "requiredOutputs",
  "stateExpectations",
  "integrationHints",
  "invariants",
  "boundedVariability",
  "explicitPatternHints",
  "prohibitedTraits",
];

const canonicalFamilies = [
  "static-config",
  "runtime-primary",
  "runtime-shared",
  "ui-surface",
  "modifier-runtime",
  "bridge-support",
  "composite-static-runtime",
];

async function readAll(): Promise<Record<keyof typeof paths, string>> {
  const entries = await Promise.all(
    Object.entries(paths).map(async ([key, filePath]) => [key, await fs.readFile(filePath, "utf8")] as const),
  );

  return Object.fromEntries(entries) as Record<keyof typeof paths, string>;
}

function assertIncludes(text: string, snippets: string[], label: string, failures: string[]): void {
  for (const snippet of snippets) {
    if (!text.includes(snippet)) {
      failures.push(`${label} is missing required content: ${snippet}`);
    }
  }
}

async function main(): Promise<void> {
  const failures: string[] = [];
  const docs = await readAll();

  assertIncludes(docs.moduleNeed, requiredModuleNeedFields, "MODULE-NEED-SEAM-PROPOSAL.md", failures);

  for (const label of ["intentPlan", "blueprintProposal", "blueprintNormalizer", "patternPlan", "patternContract", "realizationFamily"] as const) {
    if (!docs[label].includes("MODULE-NEED-SEAM-PROPOSAL.md")) {
      failures.push(`${label} does not reference the canonical ModuleNeed seam doc`);
    }
  }

  for (const label of ["intentPlan", "blueprintProposal", "blueprintNormalizer"] as const) {
    assertIncludes(docs[label], ["`off`", "`shadow`", "`assist`"], label, failures);
  }

  assertIncludes(
    docs.intentPlan + docs.blueprintProposal + docs.blueprintNormalizer,
    ["IntentSchema", "BlueprintProposal", "BlueprintNormalizationReport", "FinalBlueprint"],
    "Lane B rollout docs",
    failures,
  );

  for (const label of ["patternPlan", "realizationFamily"] as const) {
    assertIncludes(docs[label], canonicalFamilies.map((family) => `\`${family}\``), label, failures);
  }

  assertIncludes(
    docs.patternPlan,
    [
      "`requiredCapabilities`",
      "`prohibitedTraits`",
      "`requiredOutputs`",
      "`stateExpectations`",
      "`explicitPatternHints`",
      "`preferredFamily`",
      "stable tie-break",
    ],
    "PATTERN-UPDATE-PLAN.md",
    failures,
  );

  assertIncludes(
    docs.patternPlan + docs.patternContract,
    ["`reason`", "`owner`", "`sunsetCondition`"],
    "Pattern override guidance",
    failures,
  );

  assertIncludes(
    docs.fillSlot,
    [
      "`PatternContract`",
      "`HostBinding`",
      "generator template",
      "validator layer",
      "`accept`",
      "`reject`",
      "`escalate`",
      "deterministic default",
    ],
    "FILL-SLOT-CONTRACT-PROPOSAL.md",
    failures,
  );

  if (failures.length > 0) {
    console.error("Architecture plan consistency check failed:");
    for (const failure of failures) {
      console.error(`- ${failure}`);
    }
    process.exit(1);
  }

  console.log("Architecture plan consistency check passed.");
  console.log("- ModuleNeed seam is canonical and referenced.");
  console.log("- Rollout modes and retained artifacts are present.");
  console.log("- RealizationFamily taxonomy is aligned.");
  console.log("- FillSlot validator ownership is explicit.");
}

await main();
