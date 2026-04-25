import type { SelectionCaseSpec } from "../../adapters/dota2/cases/selection-demo-registry.js";
import {
  formatSelectionCaseTitle,
  formatSelectionObjectKindLabel,
} from "../../apps/workbench/fixtures/selection-case.fixture.js";
import { getDemoScriptName } from "./config.js";
import type { EvidenceArtifact } from "./types.js";

export function generateMarkdown(
  caseSpec: SelectionCaseSpec,
  artifact: EvidenceArtifact,
): string {
  const {
    blueprint,
    patterns,
    writePlan,
    generatedContent,
    smokeAssertions,
    writeExecution,
    meta,
  } = artifact;

  const objectKindLabel = formatSelectionObjectKindLabel(caseSpec.authoringParameters.objectKind);
  const caseTitle = formatSelectionCaseTitle(caseSpec);
  const scriptName = getDemoScriptName(caseSpec.caseId);
  const writePreviewRows = writeExecution?.evidence.dryRunArtifacts.map((item) =>
    `| ${item.path} | ${item.wouldCreate ? "yes" : "no"} | ${item.preview.substring(0, 80)} |`,
  ).join("\n") || "| (none) | - | - |";

  return `# ${caseTitle} Guide

**Generated:** ${meta.generatedAt}  
**Status:** ${smokeAssertions.passed ? "PASS" : "FAIL"}  
**Host:** ${meta.hostRoot}  
**Mode:** ${meta.writeMode}  
**Stable Feature ID:** ${meta.stableFeatureId}

## 1. Overview

${caseTitle} is an F4-triggered three-choice ${objectKindLabel} selection system built on the shared \`selection_pool + selection_outcome\` family seam.

Prompt:

> ${caseSpec.prompt}

The demo uses explicit source-backed authoring parameters. The generic Wizard is checked before fixture merge and must not inject case-owned selection parameters.

## 2. Dry-Run

\`\`\`bash
npm run ${scriptName} -- --host ${meta.hostRoot}
\`\`\`

Dry-run runs the full pipeline and the normal write executor with dry-run enabled. It should not create or modify host files.

For a fresh x-template host, do this first:

\`\`\`bash
yarn install
\`\`\`

## 3. Host Write

\`\`\`bash
npm run ${scriptName} -- --host ${meta.hostRoot} --write --force
\`\`\`

Use this only after the dry-run evidence passes. The write path uses the same write executor as the Dota2 CLI and writes generated files under the configured host.

Recommended launch after host write:

\`\`\`bash
cd ${meta.hostRoot}
yarn launch <addon_name> temp
\`\`\`

## 4. Evidence Output

This run writes evidence to:

\`\`\`
${meta.evidenceDir}
\`\`\`

Primary files:

| File | Purpose |
| --- | --- |
| \`${meta.evidenceDir}/artifact.json\` | Structured pipeline and write evidence |
| \`${meta.evidenceDir}/DEMO-GUIDE.md\` | Human-readable run guide and proof summary |

## 5. Dota2 Tools Check

1. Open Dota 2 Workshop Tools for the addon at \`${meta.hostRoot}\`.
2. Launch the correct addon and map with \`yarn launch <addon_name> temp\`.
3. Rebuild or refresh the addon scripts and Panorama assets.
4. Start the local test map.
${caseSpec.smokeExpectations.runtimeChecks.map((step, index) => `${index + 5}. ${step}`).join("\n")}

## 6. Pipeline Evidence

Wizard pollution check: ${artifact.wizardExtraction.caseSpecificParamsInjected ? "FAIL" : "PASS"}

| Stage | Evidence |
| --- | --- |
| Intent | ${artifact.schema.intentKind}, ready=${artifact.schema.isReadyForBlueprint} |
| Blueprint | ${blueprint.moduleCount} modules |
| Patterns | ${patterns.resolved.length} resolved, ${patterns.unresolved.length} unresolved |
| WritePlan | ${writePlan?.entryCount || 0} entries, target=${writePlan?.targetProject || "(none)"} |
| Generated | ${generatedContent.length} files |
| Smoke | ${smokeAssertions.passedCount}/${smokeAssertions.total} passed |

## 7. Blueprint Modules

| Module ID | Category | Role | Has Params |
| --- | --- | --- | --- |
${blueprint.modules.map((module) => `| ${module.id} | ${module.category} | ${module.role} | ${module.hasParameters ? "yes" : "no"} |`).join("\n")}

## 8. Patterns

| Pattern ID | Role | Priority |
| --- | --- | --- |
${patterns.resolved.map((pattern) => `| ${pattern.patternId} | ${pattern.role} | ${pattern.priority} |`).join("\n")}

## 9. Write Preview

Write success: ${writeExecution?.success ? "yes" : "no"}  
Files created: ${writeExecution?.evidence.filesCreated.length || 0}  
Files modified: ${writeExecution?.evidence.filesModified.length || 0}  
Files skipped: ${writeExecution?.evidence.filesSkipped.length || 0}

| Path | Would Create | Preview |
| --- | --- | --- |
${writePreviewRows}

## 10. Verification Commands

\`\`\`bash
npm run check-types
npm run ${scriptName}
npm run ${scriptName} -- --host ${meta.hostRoot}
\`\`\`

## 11. Known Limits

${artifact.knownLimitations.map((item, index) => `${index + 1}. ${item}`).join("\n")}
`;
}
