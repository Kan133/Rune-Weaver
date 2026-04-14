import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { dirname, join } from "path";
import {
  computeCanonicalEvidenceCompleteness,
  REQUIRED_AUTO_EVIDENCE,
  REQUIRED_MANUAL_EVIDENCE,
} from "./refresh/completeness.js";

function assert(condition: unknown, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

function createTempLatestDir(): string {
  return mkdtempSync(join(tmpdir(), "rw-evidence-"));
}

function ensureFile(root: string, relativePath: string): void {
  const fullPath = join(root, relativePath);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, "ok", "utf8");
}

function testIncompleteWhenManualEvidenceIsMissing(): void {
  const latestDir = createTempLatestDir();
  try {
    for (const relativePath of REQUIRED_AUTO_EVIDENCE) {
      ensureFile(latestDir, relativePath);
    }

    const result = computeCanonicalEvidenceCompleteness(latestDir);
    assert(result.status === "incomplete", "missing manual evidence should keep completeness incomplete");
    assert(result.missingManualEvidence.includes("talent-draw-demo-runtime.mp4"), "runtime video should be reported missing");
    assert(result.missingAutoEvidence.length === 0, "auto evidence should be complete in this scenario");
  } finally {
    rmSync(latestDir, { recursive: true, force: true });
  }
}

function testIncompleteWhenAutoEvidenceIsMissing(): void {
  const latestDir = createTempLatestDir();
  try {
    for (const relativePath of REQUIRED_MANUAL_EVIDENCE) {
      ensureFile(latestDir, relativePath);
    }
    ensureFile(latestDir, "review-artifact-missing.txt");

    const result = computeCanonicalEvidenceCompleteness(latestDir);
    assert(result.status === "incomplete", "missing auto evidence should keep completeness incomplete");
    assert(result.missingAutoEvidence.includes("review-artifact.json"), "missing review artifact should be reported");
  } finally {
    rmSync(latestDir, { recursive: true, force: true });
  }
}

function testCompleteWhenAllEvidenceExists(): void {
  const latestDir = createTempLatestDir();
  try {
    for (const relativePath of REQUIRED_MANUAL_EVIDENCE) {
      ensureFile(latestDir, relativePath);
    }
    for (const relativePath of REQUIRED_AUTO_EVIDENCE) {
      ensureFile(latestDir, relativePath);
    }

    const result = computeCanonicalEvidenceCompleteness(latestDir);
    assert(result.status === "complete", "all evidence should mark completeness complete");
    assert(result.missingManualEvidence.length === 0, "no manual evidence should be missing");
    assert(result.missingAutoEvidence.length === 0, "no auto evidence should be missing");
  } finally {
    rmSync(latestDir, { recursive: true, force: true });
  }
}

function runTests(): boolean {
  const tests: Array<{ name: string; fn: () => void }> = [
    { name: "incomplete when manual evidence is missing", fn: testIncompleteWhenManualEvidenceIsMissing },
    { name: "incomplete when auto evidence is missing", fn: testIncompleteWhenAutoEvidenceIsMissing },
    { name: "complete when all evidence exists", fn: testCompleteWhenAllEvidenceExists },
  ];

  let passed = 0;
  let failed = 0;

  console.log("Running evidence completeness tests...\n");

  for (const test of tests) {
    try {
      test.fn();
      console.log(`PASS ${test.name}`);
      passed += 1;
    } catch (error) {
      console.log(`FAIL ${test.name}`);
      console.log(error instanceof Error ? error.message : error);
      failed += 1;
    }
  }

  console.log(`\nResults: ${passed} passed, ${failed} failed`);
  return failed === 0;
}

const success = runTests();
process.exit(success ? 0 : 1);
