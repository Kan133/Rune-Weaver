/**
 * Dota2 Adapter - Post-Generation Validator (P0)
 *
 * Validates the state of generated files after code generation.
 * Based on selection_pool runtime bugs - these are critical checks
 * that must pass before the game can run correctly.
 */

import { existsSync, readFileSync, readdirSync, statSync } from "fs";
import { join, dirname } from "path";
import { loadWorkspace } from "../../../core/workspace/index.js";
import type { RuneWeaverFeatureRecord } from "../../../core/workspace/types.js";
import type { GroundingCheckResult } from "../../../core/schema/types.js";
import {
  aggregateModuleGroundingAssessments,
  buildGroundingReviewReason,
  validateGroundingAssessmentAgainstChecks,
} from "../../../core/governance/grounding.js";
import {
  GRANTABLE_PRIMARY_HERO_ABILITY_SURFACE_ID,
  readProviderAbilityExportArtifact,
} from "../cross-feature/grant-artifacts.js";
import { extractLuaAbilityRuntimeSymbol } from "../provider-ability-identity.js";

export interface PostGenerationValidationResult {
  valid: boolean;
  hostRoot: string;
  checks: PostGenerationCheck[];
  issues: string[];
  summary: {
    passed: number;
    failed: number;
    total: number;
  };
}

export interface PostGenerationCheck {
  check: string;
  passed: boolean;
  message: string;
  details?: string[];
  suggestion?: string;
}

interface ParsedAbilityBlock {
  name: string;
  lines: string[];
}

interface ProviderAbilityExportRecord {
  featureId: string;
  artifactPath: string;
  abilityName: string;
}

function countBraceDelta(line: string): number {
  let delta = 0;
  for (const char of line) {
    if (char === "{") delta++;
    if (char === "}") delta--;
  }
  return delta;
}

function parseDotaAbilityBlocks(content: string): {
  hasRoot: boolean;
  malformed: string[];
  abilities: ParsedAbilityBlock[];
} {
  const lines = content.split(/\r?\n/);
  const rootIndex = lines.findIndex((line) => /^"?DOTAAbilities"?/.test(line.trim()));
  if (rootIndex === -1) {
    return { hasRoot: false, malformed: [], abilities: [] };
  }

  let rootOpened = lines[rootIndex].includes("{");
  let rootDepth = rootOpened ? countBraceDelta(lines[rootIndex]) : 0;
  const abilities: ParsedAbilityBlock[] = [];
  const malformed: string[] = [];

  for (let index = rootIndex + 1; index < lines.length; index++) {
    const rawLine = lines[index];
    const line = rawLine.trim();
    if (!line || line.startsWith("//")) {
      continue;
    }

    if (!rootOpened) {
      if (line.startsWith("{")) {
        rootOpened = true;
        rootDepth += countBraceDelta(line);
        continue;
      }
      malformed.push("Expected '{' after DOTAAbilities");
      break;
    }

    if (rootDepth === 1) {
      const abilityMatch = line.match(/^"([^"]+)"(?:\s*\{)?$/);
      if (abilityMatch) {
        const abilityName = abilityMatch[1];
        const blockLines = [rawLine];
        let abilityDepth = line.includes("{") ? countBraceDelta(line) : 0;
        let cursor = index + 1;

        if (abilityDepth === 0) {
          while (cursor < lines.length && lines[cursor].trim() === "") {
            blockLines.push(lines[cursor]);
            cursor++;
          }
          if (cursor >= lines.length || !lines[cursor].trim().startsWith("{")) {
            malformed.push(`Ability '${abilityName}' missing opening brace`);
            index = cursor - 1;
            continue;
          }
          blockLines.push(lines[cursor]);
          abilityDepth += countBraceDelta(lines[cursor]);
          cursor++;
        }

        while (cursor < lines.length && abilityDepth > 0) {
          blockLines.push(lines[cursor]);
          abilityDepth += countBraceDelta(lines[cursor]);
          cursor++;
        }

        if (abilityDepth !== 0) {
          malformed.push(`Ability '${abilityName}' missing closing brace`);
        } else {
          abilities.push({ name: abilityName, lines: blockLines });
        }

        index = cursor - 1;
        continue;
      }
    }

    rootDepth += countBraceDelta(line);
    if (rootDepth <= 0) {
      break;
    }
  }

  return { hasRoot: true, malformed, abilities };
}

function collectProviderAbilityExports(hostRoot: string): {
  records: ProviderAbilityExportRecord[];
  issues: string[];
} {
  const featuresRoot = join(hostRoot, "game/scripts/src/rune_weaver/features");
  if (!existsSync(featuresRoot)) {
    return { records: [], issues: [] };
  }

  const records: ProviderAbilityExportRecord[] = [];
  const issues: string[] = [];

  for (const entry of readdirSync(featuresRoot, { withFileTypes: true })) {
    if (!entry.isDirectory()) {
      continue;
    }

    const artifactPath = join(featuresRoot, entry.name, "dota2-provider-ability-export.json");
    if (!existsSync(artifactPath)) {
      continue;
    }

    const artifact = readProviderAbilityExportArtifact(hostRoot, entry.name);
    if (!artifact) {
      issues.push(`${entry.name}: invalid provider export artifact shape`);
      continue;
    }
    const surface = artifact.surfaces.find(
      (candidate) => candidate.surfaceId === GRANTABLE_PRIMARY_HERO_ABILITY_SURFACE_ID,
    );
    if (!surface) {
      issues.push(`${entry.name}: expected one grantable provider surface`);
      continue;
    }

    records.push({
      featureId: entry.name,
      artifactPath,
      abilityName: surface.abilityName.trim(),
    });
  }

  return { records, issues };
}

/**
 * Main validation function - runs all P0 checks
 */
export function validatePostGeneration(hostRoot: string): PostGenerationValidationResult {
  const checks: PostGenerationCheck[] = [];
  const issues: string[] = [];

  // Run all P0 checks
  checks.push(checkNpcAbilitiesStructure(hostRoot));
  checks.push(checkLuaScriptFilePaths(hostRoot));
  checks.push(checkProviderAbilityExports(hostRoot));
  checks.push(checkWorkspaceGeneratedFilesExist(hostRoot));
  checks.push(checkServerIndexReferences(hostRoot));
  checks.push(checkUIGeneratedIndexMounts(hostRoot));
  checks.push(checkLessImports(hostRoot));
  checks.push(checkRuneWeaverRootCss(hostRoot));
  checks.push(checkActiveKeyBindingConflicts(hostRoot));
  checks.push(checkSelectionPoolSeedData(hostRoot));
  checks.push(checkSynthesizedGroundingGovernance(hostRoot));

  // Collect issues from failed checks
  for (const check of checks) {
    if (!check.passed) {
      issues.push(`[${check.check}] ${check.message}`);
      if (check.details) {
        for (const detail of check.details) {
          issues.push(`  - ${detail}`);
        }
      }
    }
  }

  const passed = checks.filter((c) => c.passed).length;
  const failed = checks.filter((c) => !c.passed).length;

  return {
    valid: failed === 0,
    hostRoot,
    checks,
    issues,
    summary: {
      passed,
      failed,
      total: checks.length,
    },
  };
}

/**
 * Check 1: npc_abilities_custom.txt structure validation
 * - Check that file has DOTAAbilities root
 * - Check that top-level ability blocks are braced {}
 */
function checkNpcAbilitiesStructure(hostRoot: string): PostGenerationCheck {
  const checkName = "npc_abilities_structure";
  const filePath = join(hostRoot, "game/scripts/npc/npc_abilities_custom.txt");

  if (!existsSync(filePath)) {
    return {
      check: checkName,
      passed: true, // No abilities file is OK (no custom abilities)
      message: "npc_abilities_custom.txt not found (no custom abilities)",
    };
  }

  try {
    const parsed = parseDotaAbilityBlocks(readFileSync(filePath, "utf-8"));
    if (!parsed.hasRoot) {
    return {
      check: checkName,
      passed: false,
      message: "Missing DOTAAbilities root in npc_abilities_custom.txt",
      details: ["File must have 'DOTAAbilities' as the root element"],
      suggestion: "Wrap custom abilities in a DOTAAbilities root block and close each ability with matching braces.",
    };
  }

    if (parsed.malformed.length > 0) {
    return {
      check: checkName,
      passed: false,
      message: `${parsed.malformed.length} ability blocks have structural issues`,
      details: parsed.malformed,
      suggestion: "Fix the ability block braces in npc_abilities_custom.txt before running runtime validation.",
    };
  }

    return {
      check: checkName,
      passed: true,
      message: `npc_abilities_custom.txt structure valid (${parsed.abilities.length} abilities)`,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      check: checkName,
      passed: false,
      message: `Failed to validate npc_abilities_custom.txt: ${message}`,
    };
  }
}

/**
 * Check 2: Lua ScriptFile path resolution
 * For abilities in KV, check ScriptFile paths resolve to existing Lua files
 */
function checkLuaScriptFilePaths(hostRoot: string): PostGenerationCheck {
  const checkName = "lua_scriptfile_paths";
  const kvPath = join(hostRoot, "game/scripts/npc/npc_abilities_custom.txt");
  const vscriptsPath = join(hostRoot, "game/scripts/vscripts");

  if (!existsSync(kvPath)) {
    return {
      check: checkName,
      passed: true,
      message: "No npc_abilities_custom.txt to validate",
    };
  }

  try {
    const content = readFileSync(kvPath, "utf-8");
    const missingScripts: string[] = [];

    const parsed = parseDotaAbilityBlocks(content);

    for (const ability of parsed.abilities) {
      const scriptFileMatch = ability.lines.join("\n").match(/"ScriptFile"\s+"([^"]+)"/);
      if (!scriptFileMatch) {
        continue;
      }

      const scriptPath = scriptFileMatch[1];
      const isRuneWeaverOwned =
        ability.name.startsWith("rw_") ||
        scriptPath.startsWith("rune_weaver/") ||
        scriptPath.startsWith("rune_weaver\\");

      if (!isRuneWeaverOwned) {
        continue;
      }

      const normalizedScriptPath = scriptPath.endsWith(".lua") ? scriptPath : `${scriptPath}.lua`;
      const fullPath = join(vscriptsPath, normalizedScriptPath);

      if (!existsSync(fullPath)) {
        missingScripts.push(`${ability.name}: ${normalizedScriptPath}`);
      }
    }

    if (missingScripts.length > 0) {
    return {
      check: checkName,
      passed: false,
      message: `${missingScripts.length} ScriptFile paths do not resolve to existing Lua files`,
      details: missingScripts.map((scriptPath) => `Missing: ${scriptPath}`),
      suggestion: "Create the missing Lua wrapper files under game/scripts/vscripts/rune_weaver/abilities or regenerate the feature.",
    };
  }

    return {
      check: checkName,
      passed: true,
      message: "All ScriptFile paths resolve correctly",
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      check: checkName,
      passed: false,
      message: `Failed to check ScriptFile paths: ${message}`,
    };
  }
}

function normalizeGroundingChecks(rawGrounding: unknown): GroundingCheckResult[] {
  if (!Array.isArray(rawGrounding)) {
    return [];
  }

  return rawGrounding.filter((item): item is GroundingCheckResult =>
    Boolean(item)
    && typeof item === "object"
    && typeof (item as Record<string, unknown>).artifactId === "string"
    && Array.isArray((item as Record<string, unknown>).verifiedSymbols)
    && Array.isArray((item as Record<string, unknown>).allowlistedSymbols)
    && Array.isArray((item as Record<string, unknown>).weakSymbols)
    && Array.isArray((item as Record<string, unknown>).unknownSymbols)
    && Array.isArray((item as Record<string, unknown>).warnings),
  );
}

function checkSynthesizedGroundingGovernance(hostRoot: string): PostGenerationCheck {
  const checkName = "synthesized_grounding_governance";
  const workspaceResult = loadWorkspace(hostRoot);
  if (!workspaceResult.success || !workspaceResult.workspace) {
    return {
      check: checkName,
      passed: true,
      message: "Workspace unavailable; grounding governance check skipped",
    };
  }

  const structuralIssues: string[] = [];
  const warnings: string[] = [];
  let synthesizedFeatureCount = 0;

  for (const feature of workspaceResult.workspace.features) {
    const synthesizedModules = (feature.modules || []).filter((module) => module.sourceKind === "synthesized");
    if (synthesizedModules.length === 0) {
      continue;
    }
    synthesizedFeatureCount += 1;

    if (!feature.groundingSummary) {
      structuralIssues.push(`${feature.featureId}: missing feature groundingSummary`);
    }

    const featureRawChecks = synthesizedModules.flatMap((module) =>
      normalizeGroundingChecks((module.metadata as Record<string, unknown> | undefined)?.grounding),
    );
    structuralIssues.push(
      ...validateGroundingAssessmentAgainstChecks(
        feature.groundingSummary,
        featureRawChecks,
        `feature '${feature.featureId}'`,
      ),
    );

    const aggregatedFromModules = aggregateModuleGroundingAssessments(synthesizedModules);
    if (
      feature.groundingSummary
      && (
        feature.groundingSummary.status !== aggregatedFromModules.status
        || feature.groundingSummary.verifiedSymbolCount !== aggregatedFromModules.verifiedSymbolCount
        || feature.groundingSummary.allowlistedSymbolCount !== aggregatedFromModules.allowlistedSymbolCount
        || feature.groundingSummary.weakSymbolCount !== aggregatedFromModules.weakSymbolCount
        || feature.groundingSummary.unknownSymbolCount !== aggregatedFromModules.unknownSymbolCount
      )
    ) {
      structuralIssues.push(`${feature.featureId}: feature groundingSummary does not match synthesized module assessments`);
    }

    for (const module of synthesizedModules) {
      const rawGrounding = normalizeGroundingChecks(
        (module.metadata as Record<string, unknown> | undefined)?.grounding,
      );
      structuralIssues.push(
        ...validateGroundingAssessmentAgainstChecks(
          module.groundingAssessment,
          rawGrounding,
          `feature '${feature.featureId}' module '${module.moduleId}'`,
        ),
      );

      const warning = buildGroundingReviewReason(
        `feature '${feature.featureId}' module '${module.moduleId}'`,
        module.groundingAssessment,
      );
      if (warning) {
        warnings.push(warning);
      }
    }
  }

  if (structuralIssues.length > 0) {
    return {
      check: checkName,
      passed: false,
      message: `${structuralIssues.length} synthesized grounding contract issues found`,
      details: structuralIssues,
      suggestion: "Recover canonical workspace grounding from preserved synthesized raw metadata when available; otherwise regenerate the synthesized feature so raw checks and canonical assessments are written together.",
    };
  }

  if (warnings.length > 0) {
    return {
      check: checkName,
      passed: true,
      message: `${warnings.length} synthesized grounding warning(s) require review`,
      details: warnings,
      suggestion: "Review the synthesized modules with partial or insufficient grounding before promotion.",
    };
  }

  return {
    check: checkName,
    passed: true,
    message:
      synthesizedFeatureCount > 0
        ? `Synthesized grounding governance valid across ${synthesizedFeatureCount} feature(s)`
        : "No synthesized modules require grounding governance validation",
  };
}

function checkProviderAbilityExports(hostRoot: string): PostGenerationCheck {
  const checkName = "provider_ability_exports";
  const collected = collectProviderAbilityExports(hostRoot);
  if (collected.records.length === 0 && collected.issues.length === 0) {
    return {
      check: checkName,
      passed: true,
      message: "No Dota2 provider exports to validate",
    };
  }

  const issues = [...collected.issues];
  const kvPath = join(hostRoot, "game/scripts/npc/npc_abilities_custom.txt");
  const vscriptsPath = join(hostRoot, "game/scripts/vscripts");

  if (!existsSync(kvPath)) {
    return {
      check: checkName,
      passed: false,
      message: "Provider exports exist but npc_abilities_custom.txt is missing",
      details: collected.records.map((record) => `${record.featureId}: ${record.abilityName}`),
      suggestion: "Regenerate the provider feature so its exported ability block is written to npc_abilities_custom.txt.",
    };
  }

  try {
    const parsed = parseDotaAbilityBlocks(readFileSync(kvPath, "utf-8"));
    if (!parsed.hasRoot || parsed.malformed.length > 0) {
      return {
        check: checkName,
        passed: false,
        message: "Cannot validate provider exports because npc_abilities_custom.txt is malformed",
        details: parsed.hasRoot ? parsed.malformed : ["Missing DOTAAbilities root"],
        suggestion: "Fix npc_abilities_custom.txt structure before relying on provider export validation.",
      };
    }

    const abilitiesByName = new Map(parsed.abilities.map((ability) => [ability.name, ability]));

    for (const record of collected.records) {
      const abilityBlock = abilitiesByName.get(record.abilityName);
      if (!abilityBlock) {
        issues.push(`${record.featureId}: exported ability '${record.abilityName}' not found in npc_abilities_custom.txt`);
        continue;
      }

      const blockContent = abilityBlock.lines.join("\n");
      const scriptFileMatch = blockContent.match(/"ScriptFile"\s+"([^"]+)"/);
      if (!scriptFileMatch?.[1]) {
        issues.push(`${record.featureId}: ability '${record.abilityName}' is missing ScriptFile in npc_abilities_custom.txt`);
        continue;
      }

      const scriptFile = scriptFileMatch[1];
      const normalizedScriptPath = scriptFile.endsWith(".lua") ? scriptFile : `${scriptFile}.lua`;
      const scriptLeaf = normalizedScriptPath.replace(/\\/g, "/").replace(/\.lua$/i, "").split("/").pop();
      if (scriptLeaf !== record.abilityName) {
        issues.push(
          `${record.featureId}: exported ability '${record.abilityName}' points to ScriptFile '${scriptFile}' instead of '${record.abilityName}'`,
        );
      }

      const fullScriptPath = join(vscriptsPath, normalizedScriptPath);
      if (!existsSync(fullScriptPath)) {
        issues.push(
          `${record.featureId}: ScriptFile '${normalizedScriptPath}' for exported ability '${record.abilityName}' does not exist`,
        );
        continue;
      }

      const runtimeSymbol = extractLuaAbilityRuntimeSymbol(readFileSync(fullScriptPath, "utf-8"));
      if (!runtimeSymbol) {
        issues.push(
          `${record.featureId}: Lua file '${normalizedScriptPath}' does not define a runtime symbol for exported ability '${record.abilityName}'`,
        );
        continue;
      }

      if (runtimeSymbol !== record.abilityName) {
        issues.push(
          `${record.featureId}: Lua runtime symbol '${runtimeSymbol}' does not match exported ability '${record.abilityName}'`,
        );
      }
    }

    if (issues.length > 0) {
      return {
        check: checkName,
        passed: false,
        message: `${issues.length} provider export identity issue(s) detected`,
        details: issues,
        suggestion: "Regenerate the provider feature so export, KV, and Lua all share one authoritative abilityName.",
      };
    }

    return {
      check: checkName,
      passed: true,
      message: `All ${collected.records.length} provider export(s) align with KV/Lua identity`,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      check: checkName,
      passed: false,
      message: `Failed to validate provider exports: ${message}`,
    };
  }
}

/**
 * Check 3: Workspace generatedFiles existence
 * Check all files listed in workspace generatedFiles array exist on disk
 */
function checkWorkspaceGeneratedFilesExist(hostRoot: string): PostGenerationCheck {
  const checkName = "workspace_generated_files_exist";

  const workspaceResult = loadWorkspace(hostRoot);
  if (!workspaceResult.success || !workspaceResult.workspace) {
    return {
      check: checkName,
      passed: false,
      message: "Cannot load workspace",
      details: workspaceResult.issues,
    };
  }

  const workspace = workspaceResult.workspace;
  const missingFiles: string[] = [];

  for (const feature of workspace.features) {
    if (feature.status !== "active") continue;

    for (const file of feature.generatedFiles) {
      const fullPath = join(hostRoot, file);
      if (!existsSync(fullPath)) {
        missingFiles.push(`${feature.featureId}: ${file}`);
      }
    }
  }

  if (missingFiles.length > 0) {
    return {
      check: checkName,
      passed: false,
      message: `${missingFiles.length} generated files are missing from disk`,
      details: missingFiles.slice(0, 10), // Limit to first 10
      suggestion: "Refresh or regenerate the feature so workspace.generatedFiles matches the files on disk.",
    };
  }

  const totalFiles = workspace.features.reduce(
    (sum, f) => (f.status === "active" ? sum + f.generatedFiles.length : sum),
    0
  );

  return {
    check: checkName,
    passed: true,
    message: `All ${totalFiles} generated files exist on disk`,
  };
}

/**
 * Check 4: Server index references validation
 * Check server generated index only requires existing server/shared modules and ability Lua wrappers
 */
function checkServerIndexReferences(hostRoot: string): PostGenerationCheck {
  const checkName = "server_index_references";
  const indexPath = join(hostRoot, "game/scripts/src/rune_weaver/generated/server/index.ts");

  if (!existsSync(indexPath)) {
    return {
      check: checkName,
      passed: true,
      message: "No generated server index found (no server features)",
    };
  }

  try {
    const content = readFileSync(indexPath, "utf-8");
    const importPattern = /from\s+['"]([^'"]+)['"]|require\(['"]([^'"]+)['"]\)|"rune_weaver\.(generated\.(server|shared)|abilities)\.([^"]+)"/g;
    const missingRefs: string[] = [];

    let match;
    while ((match = importPattern.exec(content)) !== null) {
      const runtimeKind = match[3];
      const runtimeScope = match[4];
      const runtimeName = match[5];

      if (runtimeKind === "abilities" && runtimeName) {
        const luaPath = join(hostRoot, "game/scripts/vscripts/rune_weaver/abilities", `${runtimeName}.lua`);
        if (!existsSync(luaPath)) {
          missingRefs.push(`rune_weaver.abilities.${runtimeName}`);
        }
        continue;
      }

      if (runtimeKind?.startsWith("generated") && runtimeScope && runtimeName) {
        const sourcePath = join(
          hostRoot,
          "game/scripts/src/rune_weaver/generated",
          runtimeScope,
          `${runtimeName}.ts`
        );
        if (!existsSync(sourcePath)) {
          missingRefs.push(`rune_weaver.generated.${runtimeScope}.${runtimeName}`);
        }
        continue;
      }

      const importPath = match[1] || match[2];
      if (!importPath) continue;

      // Skip node_modules and absolute imports
      if (!importPath.startsWith(".") && !importPath.startsWith("/")) {
        continue;
      }

      // Resolve relative to index.ts
      let resolvedPath: string;
      if (importPath.startsWith(".")) {
        resolvedPath = join(dirname(indexPath), importPath);
      } else {
        resolvedPath = join(hostRoot, importPath);
      }

      // Check if file exists (try .ts, .tsx, .js, /index.ts)
      const extensions = [".ts", ".tsx", ".js", "/index.ts", "/index.tsx"];
      const exists = extensions.some((ext) => existsSync(`${resolvedPath}${ext}`)) ||
        existsSync(resolvedPath);

      if (!exists) {
        missingRefs.push(importPath);
      }
    }

    if (missingRefs.length > 0) {
    return {
      check: checkName,
      passed: false,
      message: `${missingRefs.length} imports in server index reference non-existent files`,
      details: missingRefs.slice(0, 10),
      suggestion: "Refresh the bridge so generated/server/index.ts only requires files that exist.",
    };
  }

    return {
      check: checkName,
      passed: true,
      message: "All server index imports resolve correctly",
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      check: checkName,
      passed: false,
      message: `Failed to validate server index: ${message}`,
    };
  }
}

/**
 * Check 5: UI generated index mounts validation
 * Check UI generated index mounts only existing TSX components
 */
function checkUIGeneratedIndexMounts(hostRoot: string): PostGenerationCheck {
  const checkName = "ui_index_mounts";
  const indexPath = join(hostRoot, "content/panorama/src/rune_weaver/generated/ui/index.tsx");

  if (!existsSync(indexPath)) {
    return {
      check: checkName,
      passed: true,
      message: "No UI index.tsx found (no UI features)",
    };
  }

  try {
    const content = readFileSync(indexPath, "utf-8");
    const importPattern = /from\s+['"]([^'"]+)['"]/g;
    const missingComponents: string[] = [];

    let match;
    while ((match = importPattern.exec(content)) !== null) {
      const importPath = match[1];
      if (!importPath) continue;

      // Skip node_modules and absolute imports
      if (!importPath.startsWith(".") && !importPath.startsWith("/")) {
        continue;
      }

      // Resolve relative to index.tsx
      let resolvedPath: string;
      if (importPath.startsWith(".")) {
        resolvedPath = join(dirname(indexPath), importPath);
      } else {
        resolvedPath = join(hostRoot, importPath);
      }

      // Check if TSX component exists
      const extensions = [".tsx", ".ts", "/index.tsx", "/index.ts"];
      const exists = extensions.some((ext) => existsSync(`${resolvedPath}${ext}`)) ||
        existsSync(resolvedPath);

      if (!exists) {
        missingComponents.push(importPath);
      }
    }

    if (missingComponents.length > 0) {
    return {
      check: checkName,
      passed: false,
      message: `${missingComponents.length} UI imports reference non-existent components`,
      details: missingComponents.slice(0, 10),
      suggestion: "Refresh the bridge so generated/ui/index.tsx only imports existing UI components.",
    };
  }

    return {
      check: checkName,
      passed: true,
      message: "All UI index imports resolve correctly",
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      check: checkName,
      passed: false,
      message: `Failed to validate UI index: ${message}`,
    };
  }
}

/**
 * Check 6: LESS imports validation
 * Check generated UI LESS files are imported through content/panorama/src/hud/styles.less
 */
function checkLessImports(hostRoot: string): PostGenerationCheck {
  const checkName = "less_imports";
  const hudStylesPath = join(hostRoot, "content/panorama/src/hud/styles.less");
  const generatedUiDir = join(hostRoot, "content/panorama/src/rune_weaver/generated/ui");

  // If no Rune Weaver styles directory, nothing to check
  if (!existsSync(generatedUiDir)) {
    return {
      check: checkName,
      passed: true,
      message: "No generated Rune Weaver UI directory found",
    };
  }

  // If hud styles doesn't exist, that's a problem
  if (!existsSync(hudStylesPath)) {
    return {
      check: checkName,
      passed: false,
      message: "hud/styles.less not found - cannot import generated styles",
    };
  }

  try {
    const hudStylesContent = readFileSync(hudStylesPath, "utf-8");
    const generatedLessFiles: string[] = [];
    const unimportedFiles: string[] = [];

    // Find all generated LESS files in rune_weaver/generated/ui
    function findLessFiles(dir: string): void {
      if (!existsSync(dir)) return;

      const entries = readdirSync(dir);
      for (const entry of entries) {
        const fullPath = join(dir, entry);
        const stat = statSync(fullPath);

        if (stat.isDirectory()) {
          findLessFiles(fullPath);
        } else if (entry.endsWith(".less")) {
          generatedLessFiles.push(entry);
        }
      }
    }

    findLessFiles(generatedUiDir);

    if (generatedLessFiles.length === 0) {
      return {
        check: checkName,
        passed: true,
        message: "No generated LESS files found",
      };
    }

    // Check each generated file is imported in hud/styles.less
    for (const lessFile of generatedLessFiles) {
      const expectedImport = `@import "../rune_weaver/generated/ui/${lessFile}";`;
      if (!hudStylesContent.includes(expectedImport)) {
        unimportedFiles.push(lessFile);
      }
    }

    if (unimportedFiles.length > 0) {
    return {
      check: checkName,
      passed: false,
      message: `${unimportedFiles.length} generated LESS files are not imported in hud/styles.less`,
      details: unimportedFiles.slice(0, 10),
      suggestion: "Add the missing @import statements to content/panorama/src/hud/styles.less or refresh the UI bridge.",
    };
  }

    return {
      check: checkName,
      passed: true,
      message: `All ${generatedLessFiles.length} generated LESS files are properly imported`,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      check: checkName,
      passed: false,
      message: `Failed to validate LESS imports: ${message}`,
    };
  }
}

/**
 * Check 7: rune-weaver-root CSS validation
 * Check .rune-weaver-root has width: 100% and height: 100% in HUD styles pipeline
 */
function checkRuneWeaverRootCss(hostRoot: string): PostGenerationCheck {
  const checkName = "rune_weaver_root_css";

  // Check multiple possible locations for the root CSS
  const possiblePaths = [
    join(hostRoot, "content/panorama/src/hud/styles.less"),
    join(hostRoot, "content/panorama/src/rune_weaver/ui/styles/root.less"),
    join(hostRoot, "content/panorama/src/rune_weaver/ui/styles/index.less"),
  ];

  let foundFile: string | null = null;
  let fileContent = "";

  for (const path of possiblePaths) {
    if (existsSync(path)) {
      foundFile = path;
      fileContent = readFileSync(path, "utf-8");
      break;
    }
  }

  if (!foundFile) {
    // If no UI components exist, this is OK
    const uiDir = join(hostRoot, "content/panorama/src/rune_weaver/ui");
    if (!existsSync(uiDir)) {
      return {
        check: checkName,
        passed: true,
        message: "No UI components found, skipping CSS validation",
      };
    }

    return {
      check: checkName,
      passed: false,
      message: "Cannot find HUD styles file to validate .rune-weaver-root CSS",
    };
  }

  // Check for .rune-weaver-root selector
  const hasRuneWeaverRoot = /\.rune-weaver-root\s*\{/.test(fileContent);

  if (!hasRuneWeaverRoot) {
    // Check if it's in an imported file
    const uiStylesDir = join(hostRoot, "content/panorama/src/rune_weaver/ui/styles");
    if (existsSync(uiStylesDir)) {
      const lessFiles = findAllLessFiles(uiStylesDir);
      for (const lessFile of lessFiles) {
        const content = readFileSync(lessFile, "utf-8");
        if (/\.rune-weaver-root\s*\{/.test(content)) {
          // Check width and height in this file
          const rootBlockMatch = content.match(/\.rune-weaver-root\s*\{([^}]*)\}/s);
          if (rootBlockMatch) {
            const block = rootBlockMatch[1];
            const hasWidth100 = /width\s*:\s*100%\s*;?/.test(block);
            const hasHeight100 = /height\s*:\s*100%\s*;?/.test(block);

            if (hasWidth100 && hasHeight100) {
              return {
                check: checkName,
                passed: true,
                message: ".rune-weaver-root has width: 100% and height: 100%",
              };
            } else {
              return {
                check: checkName,
                passed: false,
                message: ".rune-weaver-root missing required CSS properties",
                details: [
                  hasWidth100 ? "✓ width: 100%" : "✗ Missing width: 100%",
                  hasHeight100 ? "✓ height: 100%" : "✗ Missing height: 100%",
                ],
              };
            }
          }
        }
      }
    }

    return {
      check: checkName,
      passed: false,
      message: ".rune-weaver-root CSS class not found in any LESS file",
    };
  }

  // Extract the .rune-weaver-root block and check properties
  const rootBlockMatch = fileContent.match(/\.rune-weaver-root\s*\{([^}]*)\}/s);
  if (!rootBlockMatch) {
    return {
      check: checkName,
      passed: false,
      message: "Cannot parse .rune-weaver-root CSS block",
    };
  }

  const block = rootBlockMatch[1];
  const hasWidth100 = /width\s*:\s*100%\s*;?/.test(block);
  const hasHeight100 = /height\s*:\s*100%\s*;?/.test(block);

  if (hasWidth100 && hasHeight100) {
    return {
      check: checkName,
      passed: true,
      message: ".rune-weaver-root has width: 100% and height: 100%",
    };
  }

  return {
    check: checkName,
    passed: false,
    message: ".rune-weaver-root missing required CSS properties",
    details: [
      hasWidth100 ? "✓ width: 100%" : "✗ Missing width: 100%",
      hasHeight100 ? "✓ height: 100%" : "✗ Missing height: 100%",
    ],
    suggestion: "Ensure .rune-weaver-root has width: 100% and height: 100% in the HUD styles pipeline.",
  };
}

function checkActiveKeyBindingConflicts(hostRoot: string): PostGenerationCheck {
  const checkName = "active_key_binding_conflicts";
  const workspaceResult = loadWorkspace(hostRoot);

  if (!workspaceResult.success || !workspaceResult.workspace) {
    return {
      check: checkName,
      passed: false,
      message: "Cannot load workspace for key binding conflict check",
      details: workspaceResult.issues,
    };
  }

  const keyToFeatures = new Map<string, string[]>();
  const missingBindingSources: string[] = [];
  for (const feature of workspaceResult.workspace.features) {
    if (feature.status !== "active") {
      continue;
    }

    const keyBindingFile = findFeatureGeneratedFile(feature, isGeneratedKeyBindingFile);
    if (!keyBindingFile) {
      continue;
    }

    const keyBindingPath = join(hostRoot, keyBindingFile);
    if (!existsSync(keyBindingPath)) {
      missingBindingSources.push(`${feature.featureId}: missing key binding source ${keyBindingFile}`);
      continue;
    }

    const content = readFileSync(keyBindingPath, "utf8");
    const match = content.match(/configuredKey:\s*string\s*=\s*"([^"]+)"/);
    if (!match) {
      continue;
    }

    const key = match[1];
    const featureIds = keyToFeatures.get(key) || [];
    featureIds.push(feature.featureId);
    keyToFeatures.set(key, featureIds);
  }

  if (missingBindingSources.length > 0) {
    return {
      check: checkName,
      passed: false,
      message: `${missingBindingSources.length} active features are missing their key binding sources`,
      details: missingBindingSources,
      suggestion: "Regenerate or clean the affected features so workspace.generatedFiles matches the on-disk key binding files.",
    };
  }

  const conflicts = Array.from(keyToFeatures.entries())
    .filter(([, featureIds]) => featureIds.length > 1)
    .map(([key, featureIds]) => `${key}: ${featureIds.join(", ")}`);

  if (conflicts.length > 0) {
    return {
      check: checkName,
      passed: false,
      message: `${conflicts.length} key binding collisions detected across active features`,
      details: conflicts,
      suggestion: "Delete, disable, or rebind duplicate active features before launching the host.",
    };
  }

  return {
    check: checkName,
    passed: true,
    message: "No key binding collisions detected across active features",
  };
}

function checkSelectionPoolSeedData(hostRoot: string): PostGenerationCheck {
  const checkName = "selection_pool_seed_data";
  const workspaceResult = loadWorkspace(hostRoot);

  if (!workspaceResult.success || !workspaceResult.workspace) {
    return {
      check: checkName,
      passed: false,
      message: "Cannot load workspace for selection pool seed validation",
      details: workspaceResult.issues,
    };
  }

  const emptySeedFeatures: string[] = [];
  const missingPoolSources: string[] = [];

  for (const feature of workspaceResult.workspace.features) {
    if (feature.status !== "active") {
      continue;
    }

    const hasSelectionFlow = feature.selectedPatterns.includes("rule.selection_flow");
    const hasWeightedPool = feature.selectedPatterns.includes("data.weighted_pool");
    if (!hasSelectionFlow || !hasWeightedPool) {
      continue;
    }

    const poolFile = findFeatureGeneratedFile(feature, isGeneratedWeightedPoolFile);
    if (!poolFile) {
      emptySeedFeatures.push(`${feature.featureId}: missing weighted pool source`);
      continue;
    }

    const poolPath = join(hostRoot, poolFile);
    if (!existsSync(poolPath)) {
      missingPoolSources.push(`${feature.featureId}: missing weighted pool source ${poolFile}`);
      continue;
    }

    const content = readFileSync(poolPath, "utf8");
    const hasTodoMarker = content.includes("TODO: Add initial talent entries");
    const initialEntriesMatch = content.match(/const initialEntries = \[([\s\S]*?)\]\s+as T\[];/);
    const initialEntryCount = initialEntriesMatch ? (initialEntriesMatch[1].match(/\{\s*id:/g) || []).length : 0;
    const addCallCount = (content.match(/\.add\(/g) || []).length;
    const usesSeedLoop = /for \(const entry of initialEntries\)/.test(content);
    const seededAddCalls = usesSeedLoop
      ? initialEntryCount
      : hasTodoMarker
        ? addCallCount
        : Math.max(0, addCallCount - 1);

    if (hasTodoMarker || seededAddCalls === 0) {
      emptySeedFeatures.push(`${feature.featureId}: weighted pool has no initial entries`);
    }
  }

  if (missingPoolSources.length > 0) {
    return {
      check: checkName,
      passed: false,
      message: `${missingPoolSources.length} active selection features are missing weighted pool sources`,
      details: missingPoolSources,
      suggestion: "Regenerate or clean the affected selection-pool features so workspace.generatedFiles matches the on-disk weighted pool files.",
    };
  }

  if (emptySeedFeatures.length > 0) {
    return {
      check: checkName,
      passed: false,
      message: `${emptySeedFeatures.length} active selection features have empty weighted pools`,
      details: emptySeedFeatures,
      suggestion: "Regenerate the feature with seeded entries or use a seeded selection_pool example fixture before launching the host.",
    };
  }

  return {
    check: checkName,
    passed: true,
    message: "All active selection features have seeded weighted pools",
  };
}

function findFeatureGeneratedFile(
  feature: Pick<RuneWeaverFeatureRecord, "generatedFiles">,
  matcher: (file: string) => boolean
): string | undefined {
  return feature.generatedFiles.find(matcher);
}

function isGeneratedKeyBindingFile(file: string): boolean {
  return file.includes("/generated/server/") && file.endsWith("_input_key_binding.ts");
}

function isGeneratedWeightedPoolFile(file: string): boolean {
  return file.includes("/generated/shared/") && file.endsWith("_data_weighted_pool.ts");
}

/**
 * Helper: Find all LESS files recursively in a directory
 */
function findAllLessFiles(dir: string): string[] {
  const files: string[] = [];

  if (!existsSync(dir)) return files;

  const entries = readdirSync(dir);
  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      files.push(...findAllLessFiles(fullPath));
    } else if (entry.endsWith(".less")) {
      files.push(fullPath);
    }
  }

  return files;
}

/**
 * Print a formatted validation report
 */
export function printPostGenerationReport(result: PostGenerationValidationResult): string {
  const lines: string[] = [];

  lines.push("=".repeat(60));
  lines.push("Post-Generation Validation Report (P0)");
  lines.push("=".repeat(60));
  lines.push(`Host Root: ${result.hostRoot}`);
  lines.push(`Result: ${result.valid ? "PASS" : "FAIL"}`);
  lines.push("");

  // Group checks by status
  const passedChecks = result.checks.filter((c) => c.passed);
  const failedChecks = result.checks.filter((c) => !c.passed);

  if (failedChecks.length > 0) {
    lines.push("--- Failed Checks ---");
    for (const check of failedChecks) {
      lines.push(`[FAIL] ${check.check}`);
      lines.push(`       ${check.message}`);
      if (check.details && check.details.length > 0) {
        for (const detail of check.details.slice(0, 5)) {
          lines.push(`         - ${detail}`);
        }
        if (check.details.length > 5) {
          lines.push(`         ... and ${check.details.length - 5} more`);
        }
      }
      if (check.suggestion) {
        lines.push(`       Fix: ${check.suggestion}`);
      }
      lines.push("");
    }
  }

  if (passedChecks.length > 0) {
    lines.push("--- Passed Checks ---");
    for (const check of passedChecks) {
      lines.push(`[PASS] ${check.check}: ${check.message}`);
      if (check.details && check.details.length > 0) {
        for (const detail of check.details.slice(0, 5)) {
          lines.push(`       - ${detail}`);
        }
        if (check.details.length > 5) {
          lines.push(`       ... and ${check.details.length - 5} more`);
        }
      }
    }
    lines.push("");
  }

  lines.push("--- Summary ---");
  lines.push(`Passed: ${result.summary.passed}/${result.summary.total}`);
  lines.push(`Failed: ${result.summary.failed}/${result.summary.total}`);

  if (result.issues.length > 0) {
    lines.push("");
    lines.push("--- All Issues ---");
    for (const issue of result.issues.slice(0, 20)) {
      lines.push(`  ${issue}`);
    }
    if (result.issues.length > 20) {
      lines.push(`  ... and ${result.issues.length - 20} more issues`);
    }
  }

  lines.push("");
  lines.push("=".repeat(60));

  return lines.join("\n");
}
