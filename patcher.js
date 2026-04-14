const fs = require('fs');
const path = require('path');
const file = path.join('apps', 'cli', 'dota2', 'commands', 'demo-runbook.ts');
let content = fs.readFileSync(file, 'utf8');
const marker = "  console.log(`  ${runbook.summary.total} total steps`);\r\n  console.log();\r\n";
if (!content.includes(marker)) throw new Error('marker not found');
const addedLines = [
  '  const nextStep = findNextActionStep(runbook);',
  '  console.log("Next Action");',
  '  console.log("-".repeat(70));',
  '  if (nextStep) {',
  '    console.log(`  ${nextStep.name}: ${nextStep.command ?? nextStep.action ?? "Review step details above"}`);',
  '  } else {',
  '    console.log("  All steps marked READY. Launch the host once doctor/validate run.");',
  '  }',
  '  console.log();'
];
const newBlock = marker + addedLines.join('\r\n') + '\r\n';
content = content.replace(marker, newBlock);
const suffix = '}\r\nexport { executeSafeOperations, getStatusIcon } from "./demo-executor.js";';
if (!content.includes(suffix)) throw new Error('suffix not found');
const helperLines = [
  'function findNextActionStep(runbook: DemoRunbook): RunbookStep | null {',
  '  return runbook.steps.find((step) => step.status !== "OK" && step.status !== "READY") ?? null;',
  '}',
  ''
];
const helper = helperLines.join('\r\n') + '\r\n';
content = content.replace(suffix, '}\r\n' + helper + suffix);
fs.writeFileSync(file, content);
