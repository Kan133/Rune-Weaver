import type { CLIActionSummary, CLICommand, CLIExecutionResult } from './types';

export function localizeVisibleText(text: string): string {
  const replacements: Array<[string, string]> = [
    ['Prepare the host before runtime checks', '请先准备宿主，再进行运行检查'],
    ['The addon configuration or install outputs are not ready yet.', '当前 addon 配置或安装产物还没有准备好。'],
    ['Initialize or repair the Rune Weaver workspace', '请初始化或修复 Rune Weaver 工作区'],
    ['The workspace record is missing or out of sync with this host.', '工作区记录缺失，或与当前宿主不同步。'],
    ['Repair generated/runtime wiring', '修复生成物与运行时接线'],
    ['Generated files or bridge wiring are inconsistent with a runnable host.', '生成文件或桥接接线与可运行宿主不一致。'],
    ['Rebuild host scripts and Panorama assets', '重新构建宿主脚本和 Panorama 资源'],
    ['The host is missing compiled build artifacts needed at runtime.', '宿主缺少运行时所需的构建产物。'],
    ['Launch the prepared host', '启动已准备好的宿主'],
    ['Doctor did not find any blocking runtime issues.', '运行诊断没有发现阻塞性的运行时问题。'],
    ['Validation passed', '生成校验已通过'],
    ['Post-generation validation completed without blocking issues.', '生成校验已完成，且没有阻塞性问题。'],
    ['Repair generated/runtime inconsistencies', '修复生成物与运行时不一致问题'],
    ['Validation reported post-generation issues that should be repaired before launch.', '生成校验发现了启动前需要修复的问题。'],
    ['Fix addon.config name', '修正 addon.config 名称'],
    ['Install dependencies', '安装依赖'],
    ['Prepare install outputs', '准备安装产物'],
    ['Check package scripts', '检查 package scripts'],
    ['Initialize workspace', '初始化工作区'],
    ['Write demo feature', '写入演示功能'],
    ['Build host', '构建宿主'],
    ['Launch Dota2', '启动 Dota2'],
    ['Follow the next runbook step.', '请执行 runbook 建议的下一步。'],
    ['Runtime Doctor', '运行诊断'],
    ['Post-Generation Validation', '生成校验'],
  ];

  let localized = text;
  for (const [source, target] of replacements) {
    localized = localized.split(source).join(target);
  }
  return localized;
}

export function parseActionSummary(
  output: string[],
  command: CLICommand,
  success: boolean,
): CLIActionSummary | undefined {
  let headline: string | undefined;
  let reason: string | undefined;
  let recommendedCommand: string | undefined;
  let nextCommand: string | undefined;

  for (const line of output) {
    const trimmed = line.trim();
    if (!headline && trimmed.startsWith('Action Summary:')) {
      headline = trimmed.replace(/^Action Summary:\s*/, '');
      continue;
    }
    if (!reason && trimmed.startsWith('Reason:')) {
      reason = trimmed.replace(/^Reason:\s*/, '');
      continue;
    }
    if (!recommendedCommand && trimmed.startsWith('Command:')) {
      recommendedCommand = trimmed.replace(/^Command:\s*/, '');
      continue;
    }
    if (!nextCommand && trimmed.startsWith('Next Command:')) {
      nextCommand = trimmed.replace(/^Next Command:\s*/, '');
    }
  }

  if (headline && reason) {
    return {
      headline: localizeVisibleText(headline),
      reason: localizeVisibleText(reason),
      command: recommendedCommand || nextCommand,
    };
  }

  if (command === 'validate') {
    const repairCommand = output.find((line) => line.includes('npm run cli -- dota2 repair --host'));
    if (!success && repairCommand) {
      return {
        headline: 'Repair generated/runtime inconsistencies',
        reason: 'Validation reported post-generation issues that should be repaired before launch.',
        command: repairCommand.trim(),
      };
    }
    if (success) {
      return {
        headline: 'Validation passed',
        reason: 'Post-generation validation completed without blocking issues.',
      };
    }
  }

  const byCommand: Partial<Record<CLICommand, { success: CLIActionSummary; failure: CLIActionSummary }>> = {
    install: {
      success: {
        headline: '依赖安装完成',
        reason: '宿主依赖已经就绪。下一步更适合先运行诊断，再决定是直接启动还是继续演示准备。',
      },
      failure: {
        headline: '依赖安装失败',
        reason: '请检查主机目录中的 package manager 配置和输出日志。',
      },
    },
    dev: {
      success: {
        headline: '开发构建已启动',
        reason: 'Workbench 已在宿主目录后台启动 yarn dev。接下来等它完成首次构建，再启动宿主。',
      },
      failure: {
        headline: '开发构建启动失败',
        reason: '请检查宿主目录、依赖安装状态和输出日志，再重新尝试启动 yarn dev。',
      },
    },
    'repair-build': {
      success: {
        headline: '修复并构建完成',
        reason: '安全修复和一次性宿主构建都已完成。现在应该可以重新进行启动前检查并启动宿主。',
      },
      failure: {
        headline: '修复并构建失败',
        reason: '请先处理输出里的阻塞问题，再重新执行修复并构建。',
      },
    },
    init: {
      success: {
        headline: '初始化完成',
        reason: '宿主骨架和 Rune Weaver 工作区已经写好。下一步请先安装依赖，再做运行检查。',
      },
      failure: {
        headline: '初始化失败',
        reason: '请先修正宿主路径、addon 名称或输出里的阻塞项，再重新初始化。',
      },
    },
    'demo-prepare': {
      success: {
        headline: '演示准备完成',
        reason: '宿主已经按演示路径完成准备。现在可以运行诊断，或者直接启动进入地图验证。',
      },
      failure: {
        headline: '演示准备未完成',
        reason: '请先按输出修复宿主状态，再重新执行演示准备。',
      },
    },
    doctor: {
      success: {
        headline: '运行诊断完成',
        reason: '如果没有新的阻塞项，下一步可以直接启动宿主验证真实运行效果。',
      },
      failure: {
        headline: '运行诊断发现问题',
        reason: '请先按诊断结果修复阻塞项，再尝试启动宿主。',
      },
    },
    launch: {
      success: {
        headline: '启动命令已派发',
        reason: 'Workbench 已把启动请求交给宿主。现在请回到 Dota2 Tools 确认是否成功进入 addon。',
      },
      failure: {
        headline: '启动失败',
        reason: '请先检查初始化、依赖安装和宿主配置，再重新尝试启动。',
      },
    },
    'gap-fill': {
      success: {
        headline: 'Gap Fill 计划已生成',
        reason: '这一步已经拿到边界内的 patch plan。请先检查 review、decision 和 approval/apply 建议，再决定是否继续。',
      },
      failure: {
        headline: 'Gap Fill 未完成',
        reason: '请先处理边界解析、LLM 配置或 approval/apply 阻塞项，再重新生成计划。',
      },
    },
  };

  const summary = byCommand[command];
  return summary ? (success ? summary.success : summary.failure) : undefined;
}

export function enrichExecutionResult(
  result: CLIExecutionResult,
  output: string[],
  command: CLICommand,
): CLIExecutionResult {
  return {
    ...result,
    actionSummary: parseActionSummary(output, command, result.success),
  };
}
