import { existsSync, mkdirSync, writeFileSync } from "fs";
import { join } from "path";

import type {
  GapFillArtifact,
  GapFillArtifactInput,
} from "../../../core/gap-fill/index.js";
import { buildGapFillArtifact } from "../../../core/gap-fill/index.js";

export function saveGapFillArtifact(artifact: GapFillArtifact): string {
  const outputDir = join(process.cwd(), "tmp", "cli-review");
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = `gap-fill-${timestamp}.json`;
  const outputPath = join(outputDir, filename);
  writeFileSync(outputPath, JSON.stringify(artifact, null, 2), "utf-8");
  return outputPath;
}

export function persistGapFillArtifact(input: GapFillArtifactInput): string {
  return saveGapFillArtifact(buildGapFillArtifact(input));
}
