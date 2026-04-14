import { mkdir, readFile, writeFile } from "fs/promises";
import { existsSync } from "fs";
import { join } from "path";
import { DEMO_GUIDE_PATH, LATEST_DIR, TMP_CLI_REVIEW_DIR } from "./constants.js";

export async function extractVConsoleCheckpoints(): Promise<string> {
  if (!existsSync(DEMO_GUIDE_PATH)) {
    return getDefaultVConsoleContent("DEMO-GUIDE.md not found");
  }

  try {
    const content = await readFile(DEMO_GUIDE_PATH, "utf-8");
    const checkpointLines = content
      .split("\n")
      .map((line) => line.trim())
      .filter((line) =>
        line.includes("[Rune Weaver]") ||
        line.includes("key F4") ||
        line.includes("featureId talent_draw_demo")
      )
      .map(extractCheckpointText);

    if (checkpointLines.length === 0) {
      return getDefaultVConsoleContent("no specific checkpoints found");
    }

    return `[VConsole Checkpoints]
Source: DEMO-GUIDE.md
Status: MANUAL EVIDENCE REQUIRED

Extracted expected log lines:
${checkpointLines.map((line) => `- ${line}`).join("\n")}

Note: These are expected log lines from Dota 2 VConsole.
Actual log capture must be done manually during demo execution.
`;
  } catch {
    return getDefaultVConsoleContent("read error");
  }
}

export async function writeScreenshotsReadme(): Promise<void> {
  const screenshotsDir = join(LATEST_DIR, "screenshots");
  await mkdir(screenshotsDir, { recursive: true });
  await writeFile(join(screenshotsDir, "README.md"), screenshotsReadme, "utf-8");
}

export async function createMissingReviewInstructions(hostPath: string): Promise<string> {
  return `[Review Artifact Missing]

No review artifact found in ${TMP_CLI_REVIEW_DIR}/

To generate a review artifact, run:
  npm run demo:talent-draw -- --host ${hostPath} --write --force

This will create a review file that can be copied to the evidence pack.
`;
}

function extractCheckpointText(line: string): string {
  const codeMatch = line.match(/`([^`]+)`/);
  return codeMatch ? codeMatch[1] : line;
}

function getDefaultVConsoleContent(reason: string): string {
  return `[VConsole Checkpoints]
Source: DEMO-GUIDE.md (${reason})
Status: MANUAL EVIDENCE REQUIRED

Expected checkpoints:
- [Rune Weaver] TalentDrawDemo... registered
- [Rune Weaver] Bound key: F4 for feature talent_draw_demo
- [Rune Weaver] Runtime wiring ready for feature talent_draw_demo
- key F4
- featureId talent_draw_demo
- [Rune Weaver] TalentDrawDemoRuleRuleSelectionFlow: Initialized session for player 0
- [Rune Weaver] Attached ability rw_modifier_applier_0 to hero at level 1

Note: These are expected log lines from Dota 2 VConsole.
Actual log capture must be done manually during demo execution.
`;
}

const screenshotsReadme = `# Screenshots Directory

This directory contains manual screenshot evidence for the Talent Draw demo.

## Required Screenshots

| # | Filename | Scene | Description |
|---|----------|-------|-------------|
| 1 | 01-initial.png | Initial | Phoenix at spawn, UI not triggered |
| 2 | 02-ui-open.png | F4 triggered | Three-card selection modal open |
| 3 | 03-card-detail.png | Card detail | Clear view of rarity/name/effect |
| 4 | 04-after-select.png | Post-selection | Hero attributes changed |
| 5 | 05-second-draw.png | Second draw | Previously selected talent absent |
| 6 | 06-gap-fill-review.png | Workbench | Canonical gap-fill review summary strip + readiness visible |
| 7 | 07-gap-fill-approval-unit.png | Workbench | Approval / confirmation unit visible |
| 8 | 08-gap-fill-continuation.png | Workbench | Continuation rail visible after apply + validate |

## Capture Instructions

1. Launch Dota 2 Custom Game Tools with the host addon
2. Load the test map, for example "temp"
3. Use F12 or Steam overlay to capture screenshots
4. Save to this directory with the filenames above
5. Save the runtime video beside latest/ as talent-draw-demo-runtime.mp4

Note: Screenshots are manual evidence and cannot be auto-generated.
`;
