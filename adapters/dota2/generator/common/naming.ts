/**
 * Common naming utilities
 */

/**
 * Convert a string to PascalCase
 */
export function toPascalCase(str: string): string {
  return str
    .replace(/^[a-z]/, (c) => c.toUpperCase())
    .replace(/_([a-z])/g, (_, c) => c.toUpperCase())
    .replace(/-([a-z])/g, (_, c) => c.toUpperCase());
}
