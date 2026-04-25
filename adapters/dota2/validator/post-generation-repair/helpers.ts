/**
 * Post-Generation Repair - Helpers
 *
 * Internal utility functions used by the repair system.
 */

import { existsSync, readFileSync, readdirSync, statSync } from "fs";
import { join } from "path";

/**
 * Generate a unique repair action ID
 */
export function generateActionId(checkName: string, index: number): string {
  return `repair_${checkName}_${index}_${Date.now()}`;
}

/**
 * Find missing LESS imports in hud/styles.less
 */
export function findMissingLessImports(hostRoot: string): string[] {
  const hudStylesPath = join(hostRoot, "content/panorama/src/hud/styles.less");
  const generatedUiDir = join(hostRoot, "content/panorama/src/rune_weaver/generated/ui");
  const missingImports: string[] = [];

  if (!existsSync(generatedUiDir)) {
    return missingImports;
  }

  try {
    const hudStylesContent = existsSync(hudStylesPath)
      ? readFileSync(hudStylesPath, "utf-8")
      : "";
    const generatedLessFiles: string[] = [];

    // Find all generated LESS files
    const findLessFilesRecursive = (dir: string): void => {
      if (!existsSync(dir)) return;

      const entries = readdirSync(dir);
      for (const entry of entries) {
        const fullPath = join(dir, entry);
        const stat = statSync(fullPath);

        if (stat.isDirectory()) {
          findLessFilesRecursive(fullPath);
        } else if (entry.endsWith(".less")) {
          generatedLessFiles.push(entry);
        }
      }
    };

    findLessFilesRecursive(generatedUiDir);

    // Check which imports are missing
    for (const lessFile of generatedLessFiles) {
      const expectedImport = `@import "../rune_weaver/generated/ui/${lessFile}";`;
      if (!hudStylesContent.includes(expectedImport)) {
        missingImports.push(expectedImport);
      }
    }
  } catch {
    // Ignore errors and return empty array
  }

  return missingImports;
}
