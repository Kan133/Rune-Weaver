#!/usr/bin/env node
/**
 * Rune Weaver - CLI Entry
 * 
 * 命令行入口，�?docs/SCHEMA.md 类型对齐
 * 
 * 使用方式:
 *   交互模式: npm run cli
 *   快速模�? npm run cli -- <command> [选项]
 * 
 * 命令:
 *   create    创建新功�?(默认)
 *   dota2     Dota2 宿主相关命令
 *   blueprint Wizard -> Blueprint 链路
 */

import { createInterface } from "readline";
import { existsSync, readFileSync } from "fs";
import { runWizardCLI, showWizardHelp } from "./wizard-cli.js";
import { runBlueprintCLI, showBlueprintHelp } from "./blueprint-cli.js";
import { runAssemblyCLI, showAssemblyHelp } from "./assembly-cli.js";
import { runDota2CLI, showDota2Help } from "./dota2-cli.js";
import { runPatternCLI, showPatternHelp } from "./pattern-cli.js";

// ============================================================================
// CLI 配置与参数解�?
// ============================================================================

interface CLIOptions {
  command: string;
  subcommand?: string;
  input?: string;
  inputBase64Env?: string;
  feature?: string;
  boundaryId?: string;
  instruction?: string;
  approve?: string;
  gapFillMode?: "review" | "apply" | "validate-applied";
  apply?: boolean;
  verbose: boolean;
  host?: string;
  run: boolean;
  dryRun: boolean;
  write: boolean;
  force: boolean;
  safe: boolean;
  json?: boolean;
  output?: string;
  temperature?: number;
  model?: string;
  addonName?: string;
  mapName?: string;
  scenario?: string;
  skipInstall?: boolean;
}

function parseArgs(): CLIOptions {
  const args = process.argv.slice(2);
  const options: CLIOptions = {
    command: "create",
    verbose: false,
    run: false,
    dryRun: false,
    write: false,
    force: false,
    safe: false,
  };

  if (args.length > 0 && !args[0].startsWith("-")) {
    options.command = args[0];
    args.shift();
  }

  if (options.command === "blueprint" && args.length > 0 && !args[0].startsWith("-")) {
    const firstArg = args[0];
    if (firstArg === "validate") {
      options.subcommand = firstArg;
      args.shift();
      if (args.length > 0 && !args[0].startsWith("-")) {
        options.input = args[0];
        args.shift();
      }
    } else {
      options.input = firstArg;
      args.shift();
    }
  }

  if (options.command === "assembly" && args.length > 0 && !args[0].startsWith("-")) {
    options.subcommand = args[0];
    args.shift();
  }

  if (options.command === "dota2" && args.length > 0 && !args[0].startsWith("-")) {
    options.subcommand = args[0];
    args.shift();
  }

  if (options.command === "pattern" && args.length > 0 && !args[0].startsWith("-")) {
    options.subcommand = args[0];
    args.shift();
    if (options.subcommand === "validate" && args.length > 0 && !args[0].startsWith("-")) {
      options.input = args[0];
      args.shift();
    }
  }

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case "--host":
        options.host = args[++i];
        break;
      case "--input":
      case "-i":
        options.input = args[++i];
        break;
      case "--input-base64-env":
        options.inputBase64Env = args[++i];
        break;
      case "--feature":
        options.feature = args[++i];
        break;
      case "--boundary":
        options.boundaryId = args[++i];
        break;
      case "--instruction":
        options.instruction = args[++i];
        break;
      case "--approve":
        options.approve = args[++i];
        break;
      case "--mode":
        options.gapFillMode = args[++i] as "review" | "apply" | "validate-applied";
        break;
      case "--apply":
        options.apply = true;
        break;
      case "--run":
        options.run = true;
        break;
      case "--dry-run":
        options.dryRun = true;
        break;
      case "--write":
        options.write = true;
        break;
      case "--force":
        options.force = true;
        break;
      case "--safe":
        options.safe = true;
        break;
      case "--json":
        options.json = true;
        break;
      case "--output":
      case "-o":
        options.output = args[++i];
        break;
      case "--temperature":
        options.temperature = parseFloat(args[++i]);
        break;
      case "--model":
        options.model = args[++i];
        break;
      case "--addon-name":
        options.addonName = args[++i];
        break;
      case "--map":
        options.mapName = args[++i];
        break;
      case "--skip-install":
        options.skipInstall = true;
        break;
      case "--verbose":
      case "-v":
        options.verbose = true;
        break;
      case "--help":
      case "-h":
        showHelp(options.command, options.subcommand);
        process.exit(0);
        break;
    }
  }

  return options;
}

function showHelp(command?: string, subcommand?: string): void {
  if (command === "wizard") {
    showWizardHelp();
    return;
  }

  if (command === "blueprint") {
    showBlueprintHelp();
    return;
  }

  if (command === "assembly") {
    showAssemblyHelp();
    return;
  }

  if (command === "dota2") {
    showDota2Help();
    return;
  }

  if (command === "pattern") {
    showPatternHelp();
    return;
  }

  console.log(`
🧙 Rune Weaver - 自然语言游戏功能编织引擎

使用方式:
  交互模式: npm run cli
  快速模�? npm run cli -- <命令> [选项]

命令:
  create                创建新功�?(默认)
  wizard <text>         运行 Wizard 生成 IntentSchema
  blueprint <text>      运行 Wizard -> Blueprint 完整链路
  dota2 run <prompt>    运行完整 Dota2 主链�?
  export-bridge         导出 workspace �?UI bridge

export-bridge 命令:
  npm run cli -- export-bridge --host <path>
  npm run cli -- export-bridge --host <path> --output <dir>

dota2 命令:
  npm run cli -- dota2 init --host <path> --skip-install
                        只初始化宿主，不执行 yarn install
  npm run cli -- dota2 init --host <path>
                        初始化宿主，创建 workspace 和命名空�?
  npm run cli -- dota2 check-host --host <path>
                        检查宿主状�?
  npm run cli -- dota2 launch --host <path>
                        启动 Dota2 Tools 进行测试
  npm run cli -- dota2 validate --host <path>
                        验证生成的文�?
  npm run cli -- dota2 repair --host <path> [--safe]
                        修复验证失败的问题（--safe 执行安全修复�?  npm run cli -- dota2 doctor --host <path>
                        检查宿主运行准备状�?  npm run cli -- dota2 demo prepare --host <path> --addon-name <name> --map <map>
                        输出 demo 准备 runbook
  npm run cli -- dota2 doctor --host <path>
                        运行健康检查（只读，安全）
  npm run cli -- dota2 demo prepare --host <path> --addon-name <name> --map <map>
                        生成演示准备运行手册（干运行模式�?
  npm run cli -- dota2 demo prepare --host <path> --addon-name <name> --map <map> --write
                        执行安全演示准备工作
  npm run cli -- dota2 run "<需求文�?" --host D:\\test1
  npm run cli -- dota2 run "<需求文�?" --host D:\\test1 --dry-run
  npm run cli -- dota2 run "<需求文�?" --host D:\\test1 --write
  npm run cli -- dota2 run "<需求文�?" --host D:\\test1 --write --force

pattern 命令:
  npm run cli -- pattern validate          验证所�?Pattern
  npm run cli -- pattern validate <id>     验证指定 Pattern
  npm run cli -- pattern check-draft       检�?draft pattern 对齐

blueprint 命令:
  npm run cli -- blueprint "<需求文�?"
  npm run cli -- blueprint --from <schema-file>
  npm run cli -- blueprint validate --from <blueprint-file>

assembly 命令:
  npm run cli -- assembly generate --from <blueprint-file>
  npm run cli -- assembly validate --from <assembly-file>
  npm run cli -- assembly review --from <blueprint-file>

选项:
  --host <path>         宿主项目根目�?
  --dry-run             预演模式，不写入文件 (默认)
  --write               正式写入模式
  --force               强制写入，覆�?readiness gate
  -o, --output <file>   输出到文�?
  --json                JSON 格式输出
  --temperature <num>   设置 LLM temperature
  --model <name>        指定模型名称
  -v, --verbose         详细输出
  -h, --help            显示帮助

示例:
  npm run cli -- dota2 run "做一个按Q键的冲刺技�? --host D:\\test1
  npm run cli -- dota2 run "做一个按Q键的冲刺技�? --host D:\\test1 --dry-run
  npm run cli -- dota2 run "做一个按Q键的冲刺技�? --host D:\\test1 --write
  npm run cli -- blueprint "做一个按Q键的冲刺技�?
  npm run cli -- blueprint "做一个按Q键的冲刺技�? --json
  npm run cli -- blueprint --from tmp/intent-schema.json
`);
}

// ============================================================================
// Command Routers
// ============================================================================

async function runWizardCommand(options: CLIOptions): Promise<boolean> {
  const wizardOptions = {
    rawText: options.input || "",
    json: options.json || false,
    output: options.output,
    verbose: options.verbose,
    temperature: options.temperature,
    model: options.model,
  };
  
  return await runWizardCLI(wizardOptions);
}

async function runBlueprintCommand(options: CLIOptions): Promise<boolean> {
  // �?args 中检�?--from 参数
  const args = process.argv.slice(2);
  let fromFile: string | undefined;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--from" || args[i] === "-f") {
      fromFile = args[i + 1];
      break;
    }
  }
  
  const blueprintOptions = {
    command: (options.subcommand || "generate") as "generate" | "validate",
    rawText: fromFile ? undefined : options.input,
    fromFile: fromFile,
    output: options.output,
    json: options.json || false,
    verbose: options.verbose,
    temperature: options.temperature,
    model: options.model,
  };
  
  return await runBlueprintCLI(blueprintOptions);
}

async function runAssemblyCommand(options: CLIOptions): Promise<boolean> {
  // �?args 中检�?--from �?--hostRoot 参数
  const args = process.argv.slice(2);
  let fromFile: string | undefined;
  let hostRoot: string | undefined;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--from" || args[i] === "-f") {
      fromFile = args[i + 1];
    }
    if (args[i] === "--hostRoot" || args[i] === "--host") {
      hostRoot = args[i + 1];
    }
  }
  
  const assemblyOptions = {
    command: (options.subcommand || "generate") as "generate" | "validate" | "review",
    fromFile: fromFile,
    output: options.output,
    json: options.json || false,
    verbose: options.verbose,
    hostRoot: hostRoot || options.host,
  };
  
  return await runAssemblyCLI(assemblyOptions);
}

// F011: Export bridge command - CLI �?UI bridge
async function runExportBridgeCommand(options: CLIOptions): Promise<boolean> {
  const args = process.argv.slice(2);
  let hostRoot: string | undefined;
  let outputDir: string | undefined;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--host") {
      hostRoot = args[i + 1];
    }
    if (args[i] === "--output" || args[i] === "-o") {
      outputDir = args[i + 1];
    }
  }

  if (!hostRoot) {
    hostRoot = options.host;
  }
  if (!outputDir) {
    outputDir = options.output;
  }

  if (!hostRoot) {
    console.error("�?Missing --host. Usage: npm run cli -- export-bridge --host <path>");
    return false;
  }

  console.log("=".repeat(60));
  console.log("🌉 Rune Weaver - Export Bridge for UI");
  console.log("=".repeat(60));
  console.log(`\n📁 Host: ${hostRoot}`);
  if (outputDir) {
    console.log(`📤 Output: ${outputDir}`);
  } else {
    console.log(`📤 Output: apps/workbench-ui/public (default)`);
  }

  const { exportHostToBridge } = await import("../../adapters/dota2/bridge/export.js");
  const result = await exportHostToBridge(hostRoot, outputDir);

  console.log("\n" + "=".repeat(60));
  console.log("Export Result");
  console.log("=".repeat(60));
  console.log(`Status: ${result.success ? "�?Success" : "�?Failed"}`);
  console.log(`Output Path: ${result.outputPath}`);

  if (result.workspace) {
    console.log(`Features: ${result.workspace.features.length}`);
    console.log(`Host: ${result.workspace.addonName}`);
  }

  if (result.issues.length > 0) {
    console.log("\nIssues:");
    for (const issue of result.issues) {
      console.log(`  - ${issue}`);
    }
  }

  console.log("\n💡 Tip: Run workbench-ui and select 'Local Bridge' source to view this workspace");

  return result.success;
}

async function runDota2Command(options: CLIOptions): Promise<boolean> {
  const args = process.argv.slice(2);
  let prompt: string | undefined;
  let hostRoot: string | undefined;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--host") {
      hostRoot = args[i + 1];
    }
    if (
      !args[i].startsWith("-") &&
      args[i] !== "dota2" &&
      args[i] !== "run" &&
      args[i] !== "dry-run" &&
      args[i] !== "review" &&
      args[i] !== "update" &&
      args[i] !== "regenerate" &&
      args[i] !== "rollback" &&
      args[i] !== "init" &&
      args[i] !== "check-host" &&
      args[i] !== "validate" &&
      args[i] !== "repair" &&
      args[i] !== "doctor" &&
      args[i] !== "gap-fill" &&
      args[i] !== "demo" &&
      args[i] !== "lifecycle" &&
      args[i] !== "prepare" &&
      args[i] !== "prove"
    ) {
      if (!prompt && !args[i - 1]?.startsWith("-")) {
        prompt = args[i];
      }
    }
  }

  if (!prompt) {
    prompt = options.input;
  }

  if (!prompt && options.inputBase64Env) {
    const encodedPrompt = process.env[options.inputBase64Env];
    if (!encodedPrompt) {
      console.error(`❌ Missing environment variable for --input-base64-env: ${options.inputBase64Env}`);
      return false;
    }

    try {
      prompt = Buffer.from(encodedPrompt, "base64").toString("utf8");
    } catch (error) {
      console.error(`❌ Failed to decode base64 prompt from environment variable: ${options.inputBase64Env}`);
      console.error(error);
      return false;
    }
  }

  if (prompt && existsSync(prompt)) {
    try {
      prompt = readFileSync(prompt, "utf8");
    } catch (error) {
      console.error(`❌ Failed to read prompt file: ${prompt}`);
      console.error(error);
      return false;
    }
  }

  if (!hostRoot) {
    hostRoot = options.host;
  }

  const subcommand = options.subcommand || "run";
  
  // T149: Handle init subcommand
  if (subcommand === "init") {
    if (!hostRoot) {
      console.error("�?Missing --host. Usage: npm run cli -- dota2 init --host <path>");
      return false;
    }
    
    // Check for --addon-name parameter
    let addonName: string | undefined;
    for (let i = 0; i < args.length; i++) {
      if (args[i] === "--addon-name" && args[i + 1]) {
        addonName = args[i + 1];
        break;
      }
    }
    
    const { initDota2Host, printInitResult } = await import("../../adapters/dota2/init/index.js");
    const result = await initDota2Host({ hostPath: hostRoot, addonName, skipInstall: options.skipInstall });
    printInitResult(result);
    return result.success;
  }
  
  // T149: Handle check-host subcommand
  if (subcommand === "check-host") {
    if (!hostRoot) {
      console.error("�?Missing --host. Usage: npm run cli -- dota2 check-host --host <path>");
      return false;
    }

    const { checkHostStatus, getHostStatusSummary } = await import("../../adapters/dota2/scanner/host-status.js");
    const result = checkHostStatus(hostRoot);
    console.log(getHostStatusSummary(result));
    return result.rwStatus.ready;
  }

  if (subcommand === "validate" || subcommand === "repair" || subcommand === "doctor" || subcommand === "demo" || subcommand === "lifecycle") {
    if (!hostRoot) {
      const usage = subcommand === "validate"
        ? "npm run cli -- dota2 validate --host <path>"
        : subcommand === "repair"
          ? "npm run cli -- dota2 repair --host <path> [--safe]"
          : subcommand === "doctor"
            ? "npm run cli -- dota2 doctor --host <path>"
            : subcommand === "demo"
              ? "npm run cli -- dota2 demo prepare --host <path> --addon-name <name> --map <map>"
              : "npm run cli -- dota2 lifecycle prove --host <path> --write";
      console.error(`�?Missing --host. Usage: ${usage}`);
      return false;
    }

    const dota2Options = {
      command: subcommand as "validate" | "repair" | "doctor" | "demo" | "lifecycle",
      prompt: "",
      hostRoot,
      featureId: options.feature,
      dryRun: subcommand === "repair"
        ? !options.safe
        : subcommand === "demo" || subcommand === "lifecycle"
          ? !options.write
          : true,
      write: subcommand === "repair"
        ? options.safe
        : subcommand === "demo" || subcommand === "lifecycle"
          ? options.write
          : false,
      force: false,
      output: options.output,
      verbose: options.verbose,
      safe: options.safe,
      addonName: options.addonName,
      mapName: options.mapName,
    };

    return await runDota2CLI(dota2Options);
  }

  // Handle launch subcommand
  if (subcommand === "launch") {
    if (!hostRoot) {
      console.error("�?Missing --host. Usage: npm run cli -- dota2 launch --host <path>");
      return false;
    }

    const { runLaunchCommand, printLaunchResult } = await import("../../adapters/dota2/launch/index.js");
    const result = await runLaunchCommand({
      hostRoot,
      addonName: options.addonName,
      mapName: options.mapName,
    });
    printLaunchResult(result);
    return result.dispatched;
  }

  if (subcommand === "rollback") {
    if (!hostRoot) {
      console.error("�?Missing --host. Usage: npm run cli -- dota2 rollback --host <path> --feature <id>");
      return false;
    }

    if (!options.feature) {
      console.error("�?Missing --feature. Usage: npm run cli -- dota2 rollback --host <path> --feature <id>");
      return false;
    }

    const dota2Options = {
      command: "rollback" as const,
      prompt: "",
      hostRoot,
      featureId: options.feature,
      dryRun: options.dryRun || (!options.write && !options.force),
      write: options.write,
      force: options.force,
      output: options.output,
      verbose: options.verbose,
      addonName: options.addonName,
      mapName: options.mapName,
      scenario: options.scenario,
    };

    return await runDota2CLI(dota2Options);
  }

  if (subcommand === "gap-fill") {
    if (!hostRoot) {
      console.error("�?Missing --host. Usage: npm run cli -- dota2 gap-fill --boundary <id> --host <path> --instruction \"...\"");
      return false;
    }

    if (options.approve) {
      const dota2Options = {
        command: "gap-fill" as const,
        prompt: "",
        hostRoot,
        approvalFile: options.approve,
        gapFillMode: options.gapFillMode || (options.apply ? "apply" : undefined),
        apply: true,
        dryRun: true,
        write: false,
        force: false,
        output: options.output,
        verbose: options.verbose,
      };

      return await runDota2CLI(dota2Options);
    }

    if (!options.boundaryId && !options.feature) {
      console.error("�?Missing --boundary or --feature. Usage: npm run cli -- dota2 gap-fill --boundary <id> --host <path> --instruction \"...\"");
      console.error("   Or resolve the boundary from a written feature: npm run cli -- dota2 gap-fill --feature <id> --host <path> --instruction \"...\"");
      return false;
    }

    if (!options.instruction) {
      console.error("�?Missing --instruction. Usage: npm run cli -- dota2 gap-fill --boundary <id> --host <path> --instruction \"...\"");
      return false;
    }

    const dota2Options = {
      command: "gap-fill" as const,
      prompt: options.instruction,
      hostRoot,
      featureId: options.feature,
      boundaryId: options.boundaryId,
      instruction: options.instruction,
      approvalFile: options.approve,
      gapFillMode: options.gapFillMode || (options.apply ? "apply" : undefined),
      apply: options.apply,
      dryRun: true,
      write: false,
      force: false,
      output: options.output,
      verbose: options.verbose,
    };

    return await runDota2CLI(dota2Options);
  }

  if (subcommand === "update") {
    if (!hostRoot) {
      console.error("�?Missing --host. Usage: npm run cli -- dota2 update \"<prompt>\" --host <path> --feature <id>");
      return false;
    }

    if (!options.feature) {
      console.error("�?Missing --feature. Usage: npm run cli -- dota2 update \"<prompt>\" --host <path> --feature <id>");
      return false;
    }

    if (!prompt) {
      console.error("�?Missing prompt. Usage: npm run cli -- dota2 update \"<prompt>\" --host <path> --feature <id>");
      return false;
    }

    const dota2Options = {
      command: "update" as const,
      prompt,
      hostRoot,
      featureId: options.feature,
      dryRun: options.dryRun || (!options.write && !options.force),
      write: options.write,
      force: options.force,
      output: options.output,
      verbose: options.verbose,
      addonName: options.addonName,
      mapName: options.mapName,
      scenario: options.scenario,
    };

    return await runDota2CLI(dota2Options);
  }

  if (!prompt) {
    console.error("�?Missing prompt. Usage: npm run cli -- dota2 run \"<prompt>\" --host <path>");
    return false;
  }

  if (!hostRoot) {
    console.error("�?Missing --host. Usage: npm run cli -- dota2 run \"<prompt>\" --host <path>");
    return false;
  }

  const dota2Options = {
    command: (subcommand || "run") as "run" | "dry-run" | "review" | "update" | "regenerate" | "rollback" | "gap-fill",
    prompt,
    hostRoot,
    featureId: options.feature,
    dryRun: options.dryRun || (!options.write && !options.force),
    write: options.write,
    force: options.force,
    output: options.output,
    verbose: options.verbose,
    addonName: options.addonName,
    mapName: options.mapName,
  };

  return await runDota2CLI(dota2Options);
}

// ============================================================================
// Interactive Mode
// ============================================================================

async function runInteractiveMode(): Promise<void> {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const ask = (prompt: string): Promise<string> => {
    return new Promise((resolve) => {
      rl.question(prompt, resolve);
    });
  };

  try {
    console.log("=".repeat(60));
    console.log("🧙 Rune Weaver - 自然语言游戏功能编织引擎");
    console.log("=".repeat(60));
    console.log();

    console.log("💬 请输入你的功能需求（例如：做一个按Q键的冲刺技能）");
    const rawText = await ask("> ");

    if (!rawText.trim()) {
      console.log("输入为空，退出");
      rl.close();
      return;
    }

    rl.close();

    // 使用 blueprint 命令运行
    const success = await runBlueprintCLI({
      command: "generate",
      rawText: rawText.trim(),
      json: false,
      verbose: false,
      temperature: 1, // Kimi k2.5 需�?temperature=1
    });

    process.exit(success ? 0 : 1);
  } catch (error) {
    console.error("�?发生错误:", error);
    rl.close();
    process.exit(1);
  }
}

// ============================================================================
// Main Entry
// ============================================================================

async function main() {
  const options = parseArgs();
  let exitCode = 0;

  try {
    if (options.command === "wizard") {
      const success = await runWizardCommand(options);
      exitCode = success ? 0 : 1;
    } else if (options.command === "blueprint") {
      const success = await runBlueprintCommand(options);
      exitCode = success ? 0 : 1;
    } else if (options.command === "assembly") {
      const success = await runAssemblyCommand(options);
      exitCode = success ? 0 : 1;
    } else if (options.command === "dota2") {
      const success = await runDota2Command(options);
      exitCode = success ? 0 : 1;
    } else if (options.command === "pattern") {
      const success = await runPatternCLI({
        command: options.subcommand || "validate",
        patternId: options.input,
        json: options.json || false,
        verbose: options.verbose,
      });
      exitCode = success ? 0 : 1;
    } else if (options.command === "export-bridge") {
      const success = await runExportBridgeCommand(options);
      exitCode = success ? 0 : 1;
    } else if (options.input) {
      const success = await runBlueprintCommand(options);
      exitCode = success ? 0 : 1;
    } else {
      await runInteractiveMode();
      return;
    }
  } catch (error) {
    console.error("�?未捕获的错误:", error);
    exitCode = 1;
  }

  process.exitCode = exitCode;
}

main();



