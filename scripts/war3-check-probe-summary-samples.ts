#!/usr/bin/env tsx

import { existsSync } from "node:fs";
import { resolve } from "node:path";

import { buildWar3ProbeReviewSummary } from "./war3-demo-probe-shared.js";

type SampleExpectation = {
  label: string;
  summaryPath: string;
  assert(summary: ReturnType<typeof buildWar3ProbeReviewSummary>): void;
};

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

const samples: SampleExpectation[] = [
  {
    label: "blocked-tool-failure",
    summaryPath: resolve("tmp/kimi-war3/skeleton-demo-probe-2026-04-14T14-11-27-188Z.summary.json"),
    assert(summary) {
      assert(summary.probeStatus === "tool-execution-failure", "blocked sample must remain tool-execution-failure");
      assert(summary.blockedByExternalProbe === true, "blocked sample should be marked as externally blocked");
      assert(summary.usablePlanningEvidence === false, "blocked sample must not become usable planning evidence");
      assert(summary.disposition === "blocked-tool-failure", "blocked sample disposition must stay blocked-tool-failure");
      assert(summary.candidateSchemaGaps.length === 0, "blocked sample must not emit fake schema gaps");
    },
  },
  {
    label: "code-heavy-sample",
    summaryPath: resolve("tmp/kimi-war3/typed-short-2026-04-13T12-55-03-932Z.summary.json"),
    assert(summary) {
      assert(summary.probeStatus === "model-output-success", "code-heavy sample should stay model-output-success");
      assert(summary.respectsNoRunnableCode === false, "code-heavy sample must be rejected for runnable code");
      assert(summary.usablePlanningEvidence === false, "code-heavy sample must not become usable planning evidence");
      assert(summary.disposition === "rejected-runnable-code", "code-heavy sample disposition must be rejected-runnable-code");
      assert(
        !summary.guessedInputsStillPresent.some((line) => /still-missing inputs/i.test(line)),
        "section headers must not appear as guessed-input evidence",
      );
    },
  },
  {
    label: "host-binding-underspecified-sample",
    summaryPath: resolve("tmp/kimi-war3/host-binding-short-v1-2026-04-13T14-03-23-944Z.summary.json"),
    assert(summary) {
      assert(summary.probeStatus === "model-output-success", "host-binding sample should stay model-output-success");
      assert(summary.respectsNoRunnableCode === false, "host-binding sample should remain code-heavy");
      assert(summary.usablePlanningEvidence === false, "host-binding sample must not become usable planning evidence");
      assert(summary.disposition === "rejected-runnable-code", "host-binding sample should remain rejected-runnable-code");
      assert(
        summary.candidateSchemaGaps.some((line) => /UNSPECIFIED IN PROMPT/i.test(line)),
        "host-binding sample should retain explicit underspecified prompt evidence",
      );
    },
  },
  {
    label: "planning-only-sample",
    summaryPath: resolve("tmp/kimi-war3/planning-control-2026-04-13T12-55-03-931Z.summary.json"),
    assert(summary) {
      assert(summary.probeStatus === "model-output-success", "planning sample should stay model-output-success");
      assert(summary.respectsNoRunnableCode === true, "planning sample should stay non-runnable");
      assert(summary.usablePlanningEvidence === true, "planning sample should become usable planning evidence");
      assert(summary.disposition === "bounded-planning-only", "planning sample disposition must be bounded-planning-only");
      assert(
        summary.candidateSchemaGaps.length >= 3,
        "planning sample should retain multiple concrete missing-input gaps",
      );
      assert(
        !summary.candidateSchemaGaps.some((line) => /missing inputs/i.test(line)),
        "missing-input section headers must not appear as schema gaps",
      );
    },
  },
];

async function main(): Promise<void> {
  for (const sample of samples) {
    assert(existsSync(sample.summaryPath), `Missing probe sample: ${sample.summaryPath}`);
    const summary = buildWar3ProbeReviewSummary(sample.summaryPath);
    sample.assert(summary);
    console.log(`${sample.label}: ok`);
  }

  console.log("War3 probe summary sample checks passed");
}

main().catch((error) => {
  console.error("Failed to validate War3 probe summary samples:");
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
