/**
 * Configuration constants for Talent Draw Demo Evidence Pack
 * 
 * Supports dry-run evidence and optional host write execution.
 */

import type { CLIOptions } from "./types.js";

// ============================================================================
// Default Configuration
// ============================================================================

// Default host root for demo (can be overridden via --host)
export const DEFAULT_DEMO_HOST_ROOT = "D:\\tsetA";

// Output paths
export const EVIDENCE_DIR = "docs/talent-draw-case/demo-evidence";
export const ARTIFACT_FILE = "artifact.json";
export const MARKDOWN_FILE = "DEMO-GUIDE.md";

// Stable feature ID for Talent Draw Demo
export const TALENT_DRAW_FEATURE_ID = "talent_draw_demo";

// ============================================================================
// Pattern Requirements
// ============================================================================

// Five key patterns that must be selected for Talent Draw
export const REQUIRED_PATTERNS = [
  "input.key_binding",
  "data.weighted_pool",
  "rule.selection_flow",
  "ui.selection_modal",
];

// Expected blueprint module categories
export const REQUIRED_MODULE_CATEGORIES = ["trigger", "data", "rule", "ui"];

// Expected write target path patterns
export const EXPECTED_PATH_PATTERNS = {
  server: /server/,
  shared: /shared/,
  ui: /ui/,
};

// ============================================================================
// Talent Draw Specific Parameters
// ============================================================================

// Talent Draw specific params that Wizard should NOT extract (Finding B)
export const TALENT_DRAW_SPECIFIC_PARAMS = [
  "entries",
  "poolStateTracking",
  "postSelectionPoolBehavior",
  "effectApplication",
  "placeholderConfig",
  "drawMode",
  "duplicatePolicy",
  "payloadShape",
  "minDisplayCount",
];

// ============================================================================
// Known Limitations
// ============================================================================

export const KNOWN_LIMITATIONS = [
  "Generator produces real content but may need refinement for production use",
  "KV generation for talents produces basic structure - custom implementation may be needed",
  "UI card interaction logic is generated but may need manual tuning",
  "Pool state persistence is session-scoped only (no cross-game save)",
  "Host write readiness gate requires hostRoot to be set (defaults to not ready)",
];

// ============================================================================
// Write Mode Configuration
// ============================================================================

export const WRITE_MODE_CONFIG = {
  // Dry-run preview length
  dryRunPreviewLength: 200,
  
  // Supported file types for write
  supportedContentTypes: [
    "typescript",
    "lua",
    "kv",
    "xml",
    "json",
    "markdown",
  ] as const,
  
  // Host readiness requirements
  hostReadinessRequirements: {
    requireServerDir: true,
    requireSharedDir: true,
    requireUiDir: true,
    requireWorkspace: true,
  },
};

// ============================================================================
// CLI Argument Parsing
// ============================================================================

export function parseCLIOptions(): CLIOptions {
  const args = process.argv.slice(2);
  
  const options: CLIOptions = {
    host: DEFAULT_DEMO_HOST_ROOT,
    write: false,
    force: false,
    verbose: false,
  };
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    switch (arg) {
      case "--host":
        options.host = args[++i] || DEFAULT_DEMO_HOST_ROOT;
        break;
      case "--write":
        options.write = true;
        break;
      case "--force":
        options.force = true;
        break;
      case "--verbose":
      case "-v":
        options.verbose = true;
        break;
      case "--help":
      case "-h":
        showHelp();
        process.exit(0);
        break;
    }
  }
  
  return options;
}

function showHelp(): void {
  console.log(`
🎲 Talent Draw Demo Evidence Pack Generator

Usage:
  npm run demo:talent-draw [options]

Options:
  --host <path>     Host directory path (default: ${DEFAULT_DEMO_HOST_ROOT})
  --write           Enable write mode (actually write files to host)
  --force           Force write even if readiness gate blocks
  -v, --verbose     Enable verbose output
  -h, --help        Show this help message

Examples:
  # Fresh x-template host preflight
  npm run cli -- dota2 demo prepare --host D:\\testB --addon-name talent_draw_demo --map temp --write
  cd D:\\testB
  yarn install
  
  # Dry-run mode (default)
  npm run demo:talent-draw
  npm run demo:talent-draw -- --host D:\\tsetA

  # Write mode after prepare/install/init
  npm run demo:talent-draw -- --host D:\\tsetA --write

  # Force write mode
  npm run demo:talent-draw -- --host D:\\tsetA --write --force

Recommended host build and launch:
  cd <host>
  yarn dev
  yarn launch <addon_name> temp
`);
}

// ============================================================================
// Demo Guide Template Configuration
// ============================================================================

export const DEMO_GUIDE_SECTIONS = {
  overview: {
    title: "Overview",
    description: "Talent Draw Demo - F4-triggered three-choice talent selection system",
  },
  prerequisites: {
    title: "Prerequisites",
    items: [
      "Dota 2 Custom Game Tools installed",
      "Host directory initialized with dota2-x-template structure",
      "Node.js 18+ for running Rune Weaver",
    ],
  },
  dryRun: {
    title: "Step 1: Dry-Run Mode",
    description: "Preview the generated files without writing to host",
  },
  writeMode: {
    title: "Step 2: Write Mode",
    description: "Execute the full pipeline and write files to host",
  },
  dota2Testing: {
    title: "Step 3: Dota2 Tools Testing",
    description: "Test the generated feature in Dota 2 Custom Game Tools",
    steps: [
      "Launch Dota 2 Custom Game Tools",
      "Load your addon from the host directory",
      "Press F4 to trigger the talent draw UI",
      "Select one of the three presented talents",
      "Verify attribute bonuses are applied based on rarity",
    ],
  },
};
