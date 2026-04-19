import { existsSync, mkdirSync, writeFileSync } from "fs";
import { dirname, join, resolve } from "path";

import type { Dota2ReviewArtifact } from "../dota2-cli.js";

export function getDefaultReviewArtifactOutputDir(): string {
  return join(process.cwd(), "tmp", "cli-review");
}

export function resolveReviewArtifactOutputDir(outputPath?: string): string {
  if (!outputPath) {
    return getDefaultReviewArtifactOutputDir();
  }

  return dirname(resolve(process.cwd(), outputPath));
}

export function saveReviewArtifact(artifact: Dota2ReviewArtifact, outputDir: string): string {
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = `dota2-review-${artifact.cliOptions.command}-${timestamp}.json`;
  const outputPath = join(outputDir, filename);

  writeFileSync(outputPath, JSON.stringify(artifact, null, 2), "utf-8");

  return outputPath;
}

export function saveReviewArtifactToPath(artifact: Dota2ReviewArtifact, outputPath: string): string {
  const outputDir = dirname(outputPath);
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }

  writeFileSync(outputPath, JSON.stringify(artifact, null, 2), "utf-8");
  return outputPath;
}

export function saveDefaultReviewArtifact(artifact: Dota2ReviewArtifact): string {
  return saveReviewArtifact(artifact, getDefaultReviewArtifactOutputDir());
}
