#!/usr/bin/env node
/**
 * Rune Weaver - CLI Entry
 * 
 * 命令行入口，与 docs/SCHEMA.md 类型对齐
 * 
 * 使用方式:
 *   交互模式: npm run cli
 *   快速模式: npm run cli -- <command> [选项]
 * 
 * 命令:
 *   create    创建新功能 (默认)
 *   dota2     Dota2 宿主相关命令
 *   blueprint Wizard -> Blueprint 链路
 */

import { createInterface } from "readline";
import { runWizardCLI, showWizardHelp } from "./wizard-cli.js";
import { runBlueprintCLI, showBlueprintHelp } from "./blueprint-cli.js";
import { runAssemblyCLI, showAssemblyHelp } from "./assembly-cli.js";

// ============================================================================
// CLI 配置与参数解析
// ============================================================================

interface CLIOptions {
  command: string;
  subcommand?: string;
  input?: string;
  verbose: boolean;
  host?: string;
  run: boolean;
  // Wizard / Blueprint specific
  json?: boolean;
  output?: string;
  temperature?: number;
  model?: string;
}

function parseArgs(): CLIOptions {
  const args = process.argv.slice(2);
  const options: CLIOptions = {
    command: "create",
    verbose: false,
    run: false,
  };

  // 解析命令
  if (args.length > 0 && !args[0].startsWith("-")) {
    options.command = args[0];
    args.shift();
  }

  // Blueprint 命令: 第一个参数可能是子命令或输入文本
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

  // Assembly 命令: 捕获子命令
  if (options.command === "assembly" && args.length > 0 && !args[0].startsWith("-")) {
    options.subcommand = args[0];
    args.shift();
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
      case "--run":
        options.run = true;
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

  console.log(`
🧙 Rune Weaver - 自然语言游戏功能编织引擎

使用方式:
  交互模式: npm run cli
  快速模式: npm run cli -- <命令> [选项]

命令:
  create                创建新功能 (默认)
  wizard <text>         运行 Wizard 生成 IntentSchema
  blueprint <text>      运行 Wizard -> Blueprint 完整链路

blueprint 命令:
  npm run cli -- blueprint "<需求文本>"
  npm run cli -- blueprint --from <schema-file>
  npm run cli -- blueprint validate --from <blueprint-file>

assembly 命令:
  npm run cli -- assembly generate --from <blueprint-file>
  npm run cli -- assembly validate --from <assembly-file>
  npm run cli -- assembly review --from <blueprint-file>

选项:
  --from <file>         从文件读取输入
  -o, --output <file>   输出到文件
  --json                JSON 格式输出
  --temperature <num>   设置 LLM temperature
  --model <name>        指定模型名称
  -v, --verbose         详细输出
  -h, --help            显示帮助

示例:
  npm run cli -- blueprint "做一个按Q键的冲刺技能"
  npm run cli -- blueprint "做一个按Q键的冲刺技能" --json
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
  // 从 args 中检测 --from 参数
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
  // 从 args 中检测 --from 和 --hostRoot 参数
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

    console.log("💬 请输入你的功能需求（例如：做一个按Q键的冲刺技能）：");
    const rawText = await ask("> ");

    if (!rawText.trim()) {
      console.log("❌ 输入为空，退出");
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
      temperature: 1, // Kimi k2.5 需要 temperature=1
    });

    process.exit(success ? 0 : 1);
  } catch (error) {
    console.error("❌ 发生错误:", error);
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
    } else if (options.input) {
      // 默认使用 blueprint 命令
      const success = await runBlueprintCommand(options);
      exitCode = success ? 0 : 1;
    } else {
      // 交互模式
      await runInteractiveMode();
      return;
    }
  } catch (error) {
    console.error("❌ 未捕获的错误:", error);
    exitCode = 1;
  }

  process.exitCode = exitCode;
}

main();
