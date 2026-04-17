/**
 * Dota2 Adapter - Post-Generation Validator (P0)
 *
 * Validates the state of generated files after code generation.
 * Based on Talent Draw runtime bugs - these are critical checks
 * that must pass before the game can run correctly.
 */

import { existsSync, readFileSync, readdirSync, statSync } from "fs";
import { join, dirname } from "path";
import { loadWorkspace } from "../../../core/workspace/index.js";
import type { RuneWeaverFeatureRecord } from "../../../core/workspace/types.js";

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

/**
 * Main validation function - runs all P0 checks
 */
export function validatePostGeneration(hostRoot: string): PostGenerationValidationResult {
  const checks: PostGenerationCheck[] = [];
  const issues: string[] = [];

  // Run all P0 checks
  checks.push(checkNpcAbilitiesStructure(hostRoot));
  checks.push(checkLuaScriptFilePaths(hostRoot));
  checks.push(checkWorkspaceGeneratedFilesExist(hostRoot));
  checks.push(checkServerIndexReferences(hostRoot));
  checks.push(checkUIGeneratedIndexMounts(hostRoot));
  checks.push(checkLessImports(hostRoot));
  checks.push(checkRuneWeaverRootCss(hostRoot));
  checks.push(checkActiveKeyBindingConflicts(hostRoot));
  checks.push(checkSelectionPoolSeedData(hostRoot));

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
  for (const feature of workspaceResult.workspace.features) {
    if (feature.status !== "active") {
      continue;
    }

    const keyBindingFile = findFeatureGeneratedFile(feature, isGeneratedKeyBindingFile);
    if (!keyBindingFile) {
      continue;
    }

    const content = readFileSync(join(hostRoot, keyBindingFile), "utf8");
    const match = content.match(/configuredKey:\s*string\s*=\s*"([^"]+)"/);
    if (!match) {
      continue;
    }

    const key = match[1];
    const featureIds = keyToFeatures.get(key) || [];
    featureIds.push(feature.featureId);
    keyToFeatures.set(key, featureIds);
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

    const content = readFileSync(join(hostRoot, poolFile), "utf8");
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

  if (emptySeedFeatures.length > 0) {
    return {
      check: checkName,
      passed: false,
      message: `${emptySeedFeatures.length} active selection features have empty weighted pools`,
      details: emptySeedFeatures,
      suggestion: "Regenerate the feature with seeded entries or use the canonical Talent Draw demo fixture before launching the host.",
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
