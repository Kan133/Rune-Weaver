from pathlib import Path

path = Path('apps/cli/dota2/commands/demo-runbook.ts')
content = path.read_text()
marker = "  console.log(   total steps);\r\n  console.log();\r\n"
if marker not in content:
    raise SystemExit('marker not found')

lines = [
    '  const nextStep = findNextActionStep(runbook);',
    '  console.log("Next Action");',
    '  console.log("-".repeat(70));',
    '  if (nextStep) {',
    '    console.log(  : );',
    '  } else {',
    '    console.log("  All steps marked READY. Launch the host once doctor/validate run.");',
    '  }',
    '  console.log();'
]
new_block = marker + "\r\n".join(lines) + "\r\n"
content = content.replace(marker, new_block, 1)

suffix = '}' + "\r\n" + 'export { executeSafeOperations, getStatusIcon } from "./demo-executor.js";'
if suffix not in content:
    raise SystemExit('suffix not found')

helper_lines = [
    'function findNextActionStep(runbook: DemoRunbook): RunbookStep | null {',
    '  return runbook.steps.find((step) => step.status !== "OK" && step.status !== "READY") ?? null;',
    '}',
    ''
]
helper = "\r\n".join(helper_lines) + "\r\n"
content = content.replace(suffix, "}\r\n" + helper + suffix, 1)
path.write_text(content)
