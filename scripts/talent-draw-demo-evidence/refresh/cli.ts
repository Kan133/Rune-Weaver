import type { CLIOptions } from "./types.js";

export function log(message: string): void {
  console.log(message);
}

export function logVerbose(options: CLIOptions, message: string): void {
  if (options.verbose) {
    console.log(`[verbose] ${message}`);
  }
}

export function logError(message: string): void {
  console.error(`[error] ${message}`);
}

export function parseArgs(): CLIOptions {
  const args = process.argv.slice(2);
  const options: CLIOptions = {
    host: "",
    verbose: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case "--host":
        options.host = args[++i] || "";
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
Canonical Evidence Pack Auto-Refresh

Refreshes docs/talent-draw-case/demo-evidence/latest/ from current host.
Captures demo prepare, doctor, validate, review artifact, and optional gap-fill approval evidence.

Usage:
  npm run demo:talent-draw:refresh -- --host <path> [options]

Options:
  --host <path>   Host directory path (required)
  -v, --verbose   Enable verbose output
  -h, --help      Show this help message

Example:
  npm run demo:talent-draw:refresh -- --host D:\\testB
`);
}
