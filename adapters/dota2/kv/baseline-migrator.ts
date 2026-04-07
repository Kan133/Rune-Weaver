/**
 * T121-R6-R5-R12 + T123: Baseline Ability KV Migration into DOTAAbilities
 *
 * Minimal, reusable utility that grafts baseline abilities from
 * abilities.txt (XLSXContent root) into npc_abilities_custom.txt (DOTAAbilities root).
 *
 * Root cause: Dota2 engine only reads ability definitions under "DOTAAbilities"
 * in npc_abilities_custom.txt. The x-template's abilities.txt stores baseline
 * abilities under "XLSXContent" which is NOT loaded by the engine.
 *
 * Entry point: Exported via adapters/dota2/kv/index.ts
 * Formalized by: T123 (Host Repair Mainline Formalization)
 *
 * Scope: v1 - baseline ability load path repair only
 * NOT: full KV migration platform, arbitrary host patching, or pattern expansion
 */

import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";

export interface ParsedAbilityBlock {
  name: string;
  kvText: string;
}

export interface BaselineMigrationInput {
  hostRoot: string;
  abilityNames?: string[];
  dryRun?: boolean;
}

export interface BaselineMigrationResult {
  success: boolean;
  sourceFile: string;
  targetFile: string;
  migratedAbilities: string[];
  skippedAbilities: string[];
  targetContent: string;
  errors: string[];
  warnings: string[];
}

const DEFAULT_BASELINE_ABILITIES = [
  "crystal_nova_x",
  "counter_helix_x",
  "tiny_toss_x",
];

const ABILITIES_TXT_PATH = "game/scripts/npc/abilities.txt";
const NPC_ABILITIES_CUSTOM_PATH = "game/scripts/npc/npc_abilities_custom.txt";

function stripComments(line: string): string {
  const idx = line.indexOf("//");
  return idx >= 0 ? line.substring(0, idx) : line;
}

function parseXLSXContentAbilities(content: string): ParsedAbilityBlock[] {
  const abilities: ParsedAbilityBlock[] = [];

  const xlsxCMatch = content.indexOf('"XLSXContent"');
  if (xlsxCMatch === -1) return abilities;

  const afterHeader = content.substring(xlsxCMatch);
  const openBrace = afterHeader.indexOf('{');
  if (openBrace === -1) return abilities;

  const bodyStart = openBrace + 1;
  let depth = 0;
  let i = bodyStart;
  const len = afterHeader.length;

  while (i < len) {
    const ch = afterHeader[i];

    if (ch === '/' && i + 1 < len && afterHeader[i + 1] === '/') {
      const eol = afterHeader.indexOf('\n', i);
      i = eol >= 0 ? eol + 1 : len;
      continue;
    }

    if (ch === '{') {
      depth++;
      i++;
      continue;
    }

    if (ch === '}') {
      depth--;
      if (depth === 0) break;
      i++;
      continue;
    }

    if (depth === 0 && ch === '"') {
      const endQuote = afterHeader.indexOf('"', i + 1);
      if (endQuote === -1) { i++; continue; }
      const abilityName = afterHeader.substring(i + 1, endQuote);
      let j = endQuote + 1;
      while (j < len && (afterHeader[j] === ' ' || afterHeader[j] === '\t')) j++;
      if (j < len && afterHeader[j] === '{') {
        j++;
        let blockDepth = 1;
        const blockStart = j;
        while (j < len && blockDepth > 0) {
          const cj = afterHeader[j];
          if (cj === '/' && j + 1 < len && afterHeader[j + 1] === '/') {
            const eol2 = afterHeader.indexOf('\n', j);
            j = eol2 >= 0 ? eol2 + 1 : len;
            continue;
          }
          if (cj === '{') blockDepth++;
          else if (cj === '}') blockDepth--;
          j++;
        }
        const kvText = afterHeader.substring(blockStart, j - 1);
        abilities.push({
          name: abilityName,
          kvText: `"${abilityName}"\n{\n${kvText}\n}`,
        });
        i = j;
        continue;
      }
    }

    i++;
  }

  return abilities;
}

function buildDOTAAbilitiesEntry(ability: ParsedAbilityBlock): string {
  return ability.kvText;
}

function wrapInDOTAAbilities(abilityBlocks: string[], existingContent: string): string {
  let existingAbilities = parseExistingDOTAAbilities(existingContent);

  if (existingAbilities.length === 0 && existingContent.trim().length > 0) {
    existingAbilities = parseUnwrappedAbilities(existingContent);
  }

  const existingNames = new Set(existingAbilities.map(a => a.name));
  const mergedBlocks: string[] = [];

  for (const block of existingAbilities) {
    mergedBlocks.push(block.kvText);
  }

  for (const block of abilityBlocks) {
    const nameMatch = block.match(/^"([^"]+)"/);
    if (nameMatch && !existingNames.has(nameMatch[1])) {
      mergedBlocks.push(block);
    }
  }

  let result = '"DOTAAbilities"\n{\n';
  for (const block of mergedBlocks) {
    const blockLines = block.split("\n");
    for (const blockLine of blockLines) {
      result += "	" + blockLine + "\n";
    }
    result += "\n";
  }
  result += "}\n";

  return result;
}

function parseUnwrappedAbilities(content: string): ParsedAbilityBlock[] {
  const abilities: ParsedAbilityBlock[] = [];
  const lines = content.split("\n");
  let depth = 0;
  let currentAbility: { name: string; lines: string[] } | null = null;

  for (const rawLine of lines) {
    const line = stripComments(rawLine).trim();

    if (line === "{") {
      depth++;
      if (depth === 1 && currentAbility !== null) {
        currentAbility.lines.push("{");
      }
      continue;
    }

    if (line === "}") {
      depth--;
      if (depth === 0 && currentAbility !== null) {
        currentAbility.lines.push("}");
        abilities.push({
          name: currentAbility.name,
          kvText: currentAbility.lines.join("\n"),
        });
        currentAbility = null;
      } else if (currentAbility !== null) {
        currentAbility.lines.push("}");
      }
      continue;
    }

    if (depth === 0 && line.startsWith('"') && !line.includes("=")) {
      const nameMatch = line.match(/^"([^"]+)"$/);
      if (nameMatch) {
        currentAbility = { name: nameMatch[1], lines: [`"${nameMatch[1]}"`] };
      }
      continue;
    }

    if (currentAbility !== null && depth >= 1) {
      currentAbility.lines.push(rawLine);
    }
  }

  return abilities;
}

function parseExistingDOTAAbilities(content: string): ParsedAbilityBlock[] {
  const abilities: ParsedAbilityBlock[] = [];
  if (!content.includes('"DOTAAbilities"')) return abilities;

  const lines = content.split("\n");
  let inDOTAAbilities = false;
  let braceDepth = 0;
  let currentAbility: { name: string; lines: string[] } | null = null;

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (!inDOTAAbilities) {
      if (line === '"DOTAAbilities"') {
        inDOTAAbilities = true;
      }
      continue;
    }

    if (line === "{") {
      braceDepth++;
      continue;
    }

    if (line === "}") {
      braceDepth--;
      if (braceDepth === 0) {
        break;
      }
      if (braceDepth === 1 && currentAbility !== null) {
        abilities.push({
          name: currentAbility.name,
          kvText: currentAbility.lines.join("\n"),
        });
        currentAbility = null;
        continue;
      }
    }

    if (braceDepth === 1 && line.startsWith('"') && !line.includes("=")) {
      const nameMatch = line.match(/^"([^"]+)"$/);
      if (nameMatch) {
        currentAbility = { name: nameMatch[1], lines: [`"${nameMatch[1]}"`] };
        continue;
      }
    }

    if (currentAbility !== null && braceDepth >= 2) {
      currentAbility.lines.push(rawLine);
    }
  }

  return abilities;
}

export function migrateBaselineAbilities(input: BaselineMigrationInput): BaselineMigrationResult {
  const result: BaselineMigrationResult = {
    success: false,
    sourceFile: join(input.hostRoot, ABILITIES_TXT_PATH),
    targetFile: join(input.hostRoot, NPC_ABILITIES_CUSTOM_PATH),
    migratedAbilities: [],
    skippedAbilities: [],
    targetContent: "",
    errors: [],
    warnings: [],
  };

  const targetNames = input.abilityNames || DEFAULT_BASELINE_ABILITIES;

  if (!existsSync(result.sourceFile)) {
    result.errors.push(`Source file not found: ${result.sourceFile}`);
    return result;
  }

  let sourceContent: string;
  try {
    sourceContent = readFileSync(result.sourceFile, "utf-8");
  } catch (e) {
    result.errors.push(`Failed to read source file: ${e instanceof Error ? e.message : String(e)}`);
    return result;
  }

  const allAbilities = parseXLSXContentAbilities(sourceContent);

  if (allAbilities.length === 0) {
    result.warnings.push("No abilities found in XLSXContent section of abilities.txt");
    return result;
  }

  const targetAbilityMap = new Map<string, ParsedAbilityBlock>();
  for (const ability of allAbilities) {
    targetAbilityMap.set(ability.name, ability);
  }

  const foundAbilities: ParsedAbilityBlock[] = [];
  const missingAbilities: string[] = [];

  for (const name of targetNames) {
    const ability = targetAbilityMap.get(name);
    if (ability) {
      foundAbilities.push(ability);
    } else {
      missingAbilities.push(name);
    }
  }

  if (missingAbilities.length > 0) {
    result.warnings.push(`Abilities not found in source: ${missingAbilities.join(", ")}`);
  }

  if (foundAbilities.length === 0) {
    result.errors.push("None of the target abilities were found in the source file");
    return result;
  }

  const dotaAbilityBlocks = foundAbilities.map(buildDOTAAbilitiesEntry);

  let existingContent = "";
  if (existsSync(result.targetFile)) {
    try {
      existingContent = readFileSync(result.targetFile, "utf-8");
    } catch (e) {
      result.errors.push(`Failed to read target file: ${e instanceof Error ? e.message : String(e)}`);
      return result;
    }
  }

  const finalContent = wrapInDOTAAbilities(dotaAbilityBlocks, existingContent);

  result.migratedAbilities = foundAbilities.map(a => a.name);
  result.skippedAbilities = missingAbilities;
  result.targetContent = finalContent;
  result.success = true;

  if (!input.dryRun) {
    try {
      const targetDir = join(input.hostRoot, "game/scripts/npc");
      writeFileSync(result.targetFile, finalContent, "utf-8");
    } catch (e) {
      result.success = false;
      result.errors.push(`Failed to write target file: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  return result;
}

export function printBaselineMigrationResult(result: BaselineMigrationResult): void {
  console.log("=".repeat(60));
  console.log("Baseline Ability KV Migration Result (T121)");
  console.log("=".repeat(60));
  console.log();
  console.log(`Status: ${result.success ? "✅ Success" : "❌ Failed"}`);
  console.log(`Source: ${result.sourceFile}`);
  console.log(`Target: ${result.targetFile}`);
  console.log();
  console.log(`Migrated abilities (${result.migratedAbilities.length}):`);
  for (const name of result.migratedAbilities) {
    console.log(`  ✅ ${name}`);
  }
  if (result.skippedAbilities.length > 0) {
    console.log();
    console.log(`Skipped (not found in source):`);
    for (const name of result.skippedAbilities) {
      console.log(`  ⚠️  ${name}`);
    }
  }
  if (result.warnings.length > 0) {
    console.log();
    console.log("Warnings:");
    for (const w of result.warnings) {
      console.log(`  ⚠️  ${w}`);
    }
  }
  if (result.errors.length > 0) {
    console.log();
    console.log("Errors:");
    for (const e of result.errors) {
      console.log(`  ❌ ${e}`);
    }
  }
  console.log();
  console.log("=".repeat(60));
}
