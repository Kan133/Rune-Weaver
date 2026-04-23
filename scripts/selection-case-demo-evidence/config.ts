import type { CLIOptions } from "./types.js";

export const DEFAULT_DEMO_HOST_ROOT = "D:\\tsetA";
export const ARTIFACT_FILE = "artifact.json";
export const MARKDOWN_FILE = "DEMO-GUIDE.md";

export const REQUIRED_MODULE_CATEGORIES = ["trigger", "data", "rule", "effect", "ui"];

export const EXPECTED_PATH_PATTERNS = {
  server: /server/,
  shared: /shared/,
  ui: /ui/,
};

export const KNOWN_LIMITATIONS = [
  "Generator produces real content but may need refinement for production use",
  "Selection outcome realization is still partially deferred when it would require broad generic modifier/KV synthesis",
  "UI card interaction logic is generated but may need manual tuning",
  "Pool state persistence is session-scoped only",
  "Host write readiness gate requires hostRoot to be set (defaults to not ready)",
];

export function getDemoScriptName(caseId: string): string {
  return `demo:${caseId}`;
}

export function formatCaseDisplayName(caseId: string): string {
  return caseId
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function parseCLIOptions(scriptName: string): CLIOptions {
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
        showHelp(scriptName);
        process.exit(0);
        break;
    }
  }

  return options;
}

function showHelp(scriptName: string): void {
  const caseDisplayName = formatCaseDisplayName(scriptName.replace(/^demo:/, ""));
  console.log(`
Selection Case Demo Evidence Pack Generator

Usage:
  npm run ${scriptName} [options]

Options:
  --host <path>     Host directory path (default: ${DEFAULT_DEMO_HOST_ROOT})
  --write           Enable write mode (actually write files to host)
  --force           Force write even if readiness gate blocks
  -v, --verbose     Enable verbose output
  -h, --help        Show this help message

Examples:
  npm run ${scriptName}
  npm run ${scriptName} -- --host D:\\tsetA
  npm run ${scriptName} -- --host D:\\tsetA --write
  npm run ${scriptName} -- --host D:\\tsetA --write --force

Recommended host build and launch:
  cd <host>
  yarn dev
  yarn launch <addon_name> temp

Current case:
  ${caseDisplayName}
`);
}
