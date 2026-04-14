 = "apps/cli/dota2/commands/demo-runbook.ts"
 = Get-Content  -Raw
 = "  console.log(   total steps);\r\n  console.log();\r\n"
if (-not .Contains()) { throw 'marker not found'; }
 = @'
  console.log(   total steps);
  console.log();
  const nextStep = findNextActionStep(runbook);
  console.log("Next Action");
  console.log("-".repeat(70));
  if (nextStep) {
    console.log(  : );
  } else {
    console.log("  All steps marked READY. Launch the host once doctor/validate run.");
  }
  console.log();
'@
 = .Replace(, )
 = '}
export { executeSafeOperations, getStatusIcon } from "./demo-executor.js";'
if (-not .Contains()) { throw 'suffix not found'; }
 = @'
function findNextActionStep(runbook: DemoRunbook): RunbookStep | null {
  return runbook.steps.find((step) => step.status !== "OK" && step.status !== "READY") ?? null;
}

'@
 = .Replace(, "}
" +  + )
Set-Content  
