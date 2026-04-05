/**
 * Simple Template Engine for UI Generation
 * 
 * Supports:
 * - {{VARIABLE}} placeholder replacement
 * - {{#CONDITION}}...{{/CONDITION}} conditional blocks
 */

export interface TemplateData {
  [key: string]: string | number | boolean | undefined;
}

/**
 * Fill template with data
 */
export function fillTemplate(template: string, data: TemplateData): string {
  let result = template;

  // Handle conditional blocks {{#CONDITION}}...{{/CONDITION}}
  const conditionalRegex = /\{\{#(\w+)\}\}([\s\S]*?)\{\{\/\1\}\}/g;
  result = result.replace(conditionalRegex, (match, condition, content) => {
    const value = data[condition];
    // Include content if condition is truthy
    if (value && value !== "false" && value !== "0") {
      return fillTemplate(content, data);
    }
    return "";
  });

  // Handle simple placeholders {{VARIABLE}}
  const placeholderRegex = /\{\{(\w+)\}\}/g;
  result = result.replace(placeholderRegex, (match, key) => {
    const value = data[key];
    if (value === undefined || value === null) {
      return match; // Keep placeholder if not found
    }
    return String(value);
  });

  return result;
}

/**
 * Convert featureId to PascalCase component name
 * e.g., "rw_dash_q" -> "RwDashQ"
 */
export function toPascalCase(featureId: string): string {
  return featureId
    .split("_")
    .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join("");
}

/**
 * Extract dependencies from TSX content
 */
export function extractDependencies(tsxContent: string): string[] {
  const dependencies: string[] = [];
  
  // Check for common dependencies
  if (tsxContent.includes("useNetTable")) {
    dependencies.push("useNetTable");
  }
  if (tsxContent.includes("GameEvents")) {
    dependencies.push("GameEvents");
  }
  if (tsxContent.includes("useState") || tsxContent.includes("useEffect")) {
    dependencies.push("React hooks");
  }
  
  return dependencies;
}
