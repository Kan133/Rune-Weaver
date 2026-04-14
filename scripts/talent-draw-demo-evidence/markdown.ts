import { DEMO_GUIDE_SECTIONS } from "./config.js";
import type { EvidenceArtifact } from "./types.js";

export function generateMarkdown(artifact: EvidenceArtifact): string {
  const {
    fixture,
    schema,
    blueprint,
    patterns,
    writePlan,
    generatedContent,
    smokeAssertions,
    writeExecution,
    meta,
  } = artifact;

  const writePreviewRows = writeExecution?.evidence.dryRunArtifacts.map((item) =>
    `| ${item.path} | ${item.wouldCreate ? "yes" : "no"} | ${item.preview.substring(0, 80)} |`
  ).join("\n") || "| (none) | - | - |";

  return `# Talent Draw Demo Guide

**Generated:** ${meta.generatedAt}  
**Status:** ${smokeAssertions.passed ? "PASS" : "FAIL"}  
**Host:** ${meta.hostRoot}  
**Mode:** ${meta.writeMode}  
**Stable Feature ID:** ${meta.stableFeatureId}

## 1. Overview

${DEMO_GUIDE_SECTIONS.overview.description}

Prompt:

> ${fixture.prompt}

The demo uses an explicit workbench fixture. The generic Wizard is checked before fixture merge and must not inject Talent Draw-specific parameters.

## 2. Dry-Run

\`\`\`bash
npm run demo:talent-draw -- --host ${meta.hostRoot}
\`\`\`

Dry-run runs the full pipeline and the normal write executor with dry-run enabled. It should not create or modify host files.

For a fresh x-template host, do this first:

\`\`\`bash
# 1. edit scripts/addon.config.ts
#    change addon_name from x_template to your addon name

# 2. install host dependencies and create addon links
yarn install
\`\`\`

## 3. Host Write

\`\`\`bash
npm run demo:talent-draw -- --host ${meta.hostRoot} --write --force
\`\`\`

Use this only after the dry-run evidence passes. The write path uses the same write executor as the Dota2 CLI and writes generated files under the configured host.

Recommended launch after host write:

\`\`\`bash
cd ${meta.hostRoot}
yarn launch <addon_name> temp
\`\`\`

## 4. Evidence Pack

The refresh flow keeps the latest evidence under \`docs/talent-draw-case/demo-evidence/latest/\`:

| File | Purpose |
| --- | --- |
| \`demo-prepare-output.txt\` | Output from \`npm run cli -- dota2 demo prepare --host <host> --addon-name talent_draw_demo --map temp\` |
| \`doctor-output.txt\` | Output from \`npm run cli -- dota2 doctor --host <host>\` |
| \`validate-output.txt\` | Output from \`npm run cli -- dota2 validate --host <host>\` |
| \`generated-files.json\` | Workspace feature metadata and generated file list |
| \`review-artifact.json\` | Canonical pipeline review artifact |
| \`gap-fill-approvals/\` | Optional gap-fill approval records, when the demo used require_confirmation patches |
| \`vconsole-template.txt\` | Manual VConsole checkpoints to verify during runtime |
| \`screenshots/\` | Manual screenshot evidence instructions |

## 5. Dota2 Tools Check

1. Open Dota 2 Workshop Tools for the addon at \`${meta.hostRoot}\`.
2. Launch the correct addon and map with \`yarn launch <addon_name> temp\`.
3. Rebuild or refresh the addon scripts and Panorama assets.
4. Start the local test map.
5. Press F4.
6. Confirm the talent modal displays three card slots.
7. Confirm placeholder slots are disabled if the pool is short.
8. Select one talent and verify the rarity attribute bonus.
9. Trigger again and verify the selected talent does not reappear in the same session.

Note: if the addon still behaves like bare x-template, the most likely issue is missing Rune Weaver bridge wiring, not write failure.

## 6. Pipeline Evidence

Wizard pollution check: ${artifact.wizardExtraction.talentDrawParamsInjected ? "FAIL" : "PASS"}

| Stage | Evidence |
| --- | --- |
| Intent | ${schema.intentKind}, ready=${schema.isReadyForBlueprint} |
| Blueprint | ${blueprint.moduleCount} modules |
| Patterns | ${patterns.resolved.length} resolved, ${patterns.unresolved.length} unresolved |
| WritePlan | ${writePlan?.entryCount || 0} entries, target=${writePlan?.targetProject || "(none)"} |
| Generated | ${generatedContent.length} files |
| Smoke | ${smokeAssertions.passedCount}/${smokeAssertions.total} passed |

## 6. Blueprint Modules

| Module ID | Category | Role | Has Params |
| --- | --- | --- | --- |
${blueprint.modules.map((module) => `| ${module.id} | ${module.category} | ${module.role} | ${module.hasParameters ? "yes" : "no"} |`).join("\n")}

## 7. Patterns

| Pattern ID | Role | Priority |
| --- | --- | --- |
${patterns.resolved.map((pattern) => `| ${pattern.patternId} | ${pattern.role} | ${pattern.priority} |`).join("\n")}

## 8. Write Preview

Write success: ${writeExecution?.success ? "yes" : "no"}  
Files created: ${writeExecution?.evidence.filesCreated.length || 0}  
Files modified: ${writeExecution?.evidence.filesModified.length || 0}  
Files skipped: ${writeExecution?.evidence.filesSkipped.length || 0}

| Path | Would Create | Preview |
| --- | --- | --- |
${writePreviewRows}

## 9. Verification Commands

\`\`\`bash
npm run check-types
npm run demo:talent-draw
npm run demo:talent-draw -- --host ${meta.hostRoot}
npm run cli -- pattern validate rule.selection_flow
\`\`\`

## 10. Known Limits

${artifact.knownLimitations.map((item, index) => `${index + 1}. ${item}`).join("\n")}
`;
}
