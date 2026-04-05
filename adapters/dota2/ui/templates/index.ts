/**
 * UI Templates Registry
 */

import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { UITemplate } from "../types.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function loadTemplate(patternId: string): UITemplate {
  // Map pattern ID to directory name
  const dirMap: Record<string, string> = {
    "ui.selection_modal": "selection-modal",
    "ui.key_hint": "key-hint",
    "ui.resource_bar": "resource-bar",
  };
  
  const dirName = dirMap[patternId];
  if (!dirName) {
    throw new Error(`Unknown pattern ID: ${patternId}`);
  }
  
  const templateDir = join(__dirname, dirName);
  
  try {
    const tsxTemplate = readFileSync(
      join(templateDir, "component.tsx.template"),
      "utf-8"
    );
    const lessTemplate = readFileSync(
      join(templateDir, "styles.less.template"),
      "utf-8"
    );
    
    return {
      id: patternId,
      tsxTemplate,
      lessTemplate,
    };
  } catch (error) {
    throw new Error(`Failed to load template for ${patternId}: ${error}`);
  }
}

// Lazy-loaded templates
const templateCache: Map<string, UITemplate> = new Map();

export function getTemplate(patternId: string): UITemplate {
  if (!templateCache.has(patternId)) {
    templateCache.set(patternId, loadTemplate(patternId));
  }
  return templateCache.get(patternId)!;
}

export const templates = {
  "ui.selection_modal": () => getTemplate("ui.selection_modal"),
  "ui.key_hint": () => getTemplate("ui.key_hint"),
  "ui.resource_bar": () => getTemplate("ui.resource_bar"),
};
