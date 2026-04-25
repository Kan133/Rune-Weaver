import assert from "node:assert/strict";
import { basename } from "path";

import {
  isExplicitReviewArtifactFilePath,
  resolveReviewArtifactOutputDir,
  resolveReviewArtifactOutputPath,
} from "./review-artifacts.js";

function testTreatsJsonPathAsExplicitArtifactFile(): void {
  const outputPath = "D:\\Rune Weaver\\tmp\\cli-review\\artifact.json";
  assert.equal(isExplicitReviewArtifactFilePath(outputPath), true);
  assert.equal(
    resolveReviewArtifactOutputDir(outputPath),
    "D:\\Rune Weaver\\tmp\\cli-review",
  );
  assert.equal(
    resolveReviewArtifactOutputPath(outputPath, "dota2-review"),
    "D:\\Rune Weaver\\tmp\\cli-review\\artifact.json",
  );
}

function testTreatsDirectoryPathAsArtifactDirectory(): void {
  const outputPath = "D:\\Rune Weaver\\tmp\\cli-review\\proof-talent";
  assert.equal(isExplicitReviewArtifactFilePath(outputPath), false);
  assert.equal(
    resolveReviewArtifactOutputDir(outputPath),
    "D:\\Rune Weaver\\tmp\\cli-review\\proof-talent",
  );
  const resolvedFile = resolveReviewArtifactOutputPath(outputPath, "dota2-review");
  assert.equal(
    resolvedFile.startsWith("D:\\Rune Weaver\\tmp\\cli-review\\proof-talent\\dota2-review-"),
    true,
  );
  assert.equal(basename(resolvedFile).endsWith(".json"), true);
}

testTreatsJsonPathAsExplicitArtifactFile();
testTreatsDirectoryPathAsArtifactDirectory();

console.log("apps/cli/dota2/review-artifacts.test.ts passed");
