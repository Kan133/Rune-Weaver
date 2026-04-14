import { spawnSync } from "child_process";
import { log, logVerbose } from "./cli.js";
import type { CLIOptions } from "./types.js";

export async function runCommand(
  command: string[],
  label: string,
  options: CLIOptions
): Promise<{ output: string; exitCode: number }> {
  log(`Running: ${label}...`);
  logVerbose(options, `Command: ${command.join(" ")}`);

  const [rawCmd, ...rawArgs] = command;
  const cmd = process.platform === "win32" ? "cmd.exe" : rawCmd;
  const args = process.platform === "win32"
    ? ["/d", "/s", "/c", command.map(quoteWindowsArg).join(" ")]
    : rawArgs;

  const result = spawnSync(cmd, args, {
    encoding: "utf-8",
    cwd: process.cwd(),
    shell: false,
  });

  const outputParts = [
    result.stdout ?? "",
    result.stderr ?? "",
    result.error ? `${result.error.name}: ${result.error.message}` : "",
  ].filter(Boolean);
  const output = outputParts.join("\n");
  const exitCode = result.status ?? (result.error ? 1 : 0);
  logVerbose(options, `${label} exited with code ${exitCode}`);
  return { output, exitCode };
}

function quoteWindowsArg(value: string): string {
  if (!/[\s"&<>|^]/.test(value)) {
    return value;
  }
  return `"${value.replace(/"/g, '\\"')}"`;
}
