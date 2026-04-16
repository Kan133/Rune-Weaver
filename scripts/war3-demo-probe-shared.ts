#!/usr/bin/env tsx

import { createRequire } from "module";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { basename, join, resolve } from "path";

import {
  buildWar3CurrentSliceReviewPackage,
  exportWar3ReviewPackage,
  readWar3ReviewPackageFromDir,
  validateWar3CurrentSliceReviewPackage,
  type War3ReviewPackage,
  type War3ReviewPackageValidationResult,
} from "../adapters/war3/intent/index.js";

const require = createRequire(import.meta.url);

const {
  createWar3SkeletonDemoArtifactInput,
}: {
  createWar3SkeletonDemoArtifactInput?: (hostRoot: string) => unknown;
} = require("../tmp/war3-tstl-skeleton/tools/demo-artifact-bridge.js");

const CANONICAL_FEATURE_ID = "setup-mid-zone-shop";
const DEFAULT_PROBE_OUTPUT_SHAPES = [
  "module plan",
  "typed pseudo-implementation",
  "runtime guards",
  "still-missing inputs",
] as const;
const BOUNDED_NON_GOALS = [
  "Do not write into maps/demo.w3x or any map workspace.",
  "Do not claim KK runtime proof or host-write readiness.",
  "Do not introduce warcraft.json adoption or toolchain wiring changes.",
  "Do not propose packaging, upload, launch, or runtime execution steps.",
  "Do not output final runnable code; stay at planning or typed pseudo-implementation level.",
] as const;

export type War3ProbePackageSource = {
  sourceKind: "skeleton-derived" | "exported-package";
  packageDir?: string;
  hostRoot: string;
  reviewPackage: War3ReviewPackage;
  validation: War3ReviewPackageValidationResult;
};

export type War3ProbeSummary = {
  schemaVersion: "war3-probe-review-summary/v1";
  generatedAt: string;
  featureId: typeof CANONICAL_FEATURE_ID;
  packageName: string;
  probeStatus: "tool-execution-failure" | "model-output-success" | "unusable-output";
  blockedByExternalProbe: boolean;
  usablePlanningEvidence: boolean;
  disposition:
    | "blocked-tool-failure"
    | "blocked-unusable-output"
    | "rejected-runnable-code"
    | "bounded-planning-only"
    | "bounded-pseudo-implementation-candidate"
    | "bounded-but-too-guessy";
  requestedOutputShapes: string[];
  respectsNoRunnableCode: boolean;
  guessedInputsStillPresent: string[];
  candidateBlueprintSignals: string[];
  candidateSchemaGaps: string[];
  nextMoveRecommendation:
    | "planning-good"
    | "pseudo-implementation-good"
    | "still-too-guessy";
  boundedLabels: string[];
  sourceFiles: {
    probeSummary: string;
    probeFinal: string;
    probeInput: string;
  };
};

type ProbeRunnerSummaryFile = {
  inputFile: string;
  label: string;
  status: War3ProbeSummary["probeStatus"];
  outputFiles: {
    final: string;
    summary: string;
  };
};

function timestampLabel() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function ensureDir(dir: string): string {
  mkdirSync(dir, { recursive: true });
  return dir;
}

function ensureSkeletonBridge() {
  if (!createWar3SkeletonDemoArtifactInput) {
    throw new Error(
      "tmp/war3-tstl-skeleton demo artifact bridge did not expose createWar3SkeletonDemoArtifactInput.",
    );
  }

  return createWar3SkeletonDemoArtifactInput;
}

function stringifyList(items: string[]): string[] {
  return items.length > 0 ? items.map((item) => `- ${item}`) : ["- none"];
}

export function getDefaultSkeletonHostRoot(): string {
  return resolve("tmp/war3-tstl-skeleton/maps/demo.w3x");
}

export function createSkeletonDerivedProbePackageSource(
  outDir?: string,
): War3ProbePackageSource {
  const hostRoot = getDefaultSkeletonHostRoot();
  const artifactFactory = ensureSkeletonBridge();
  const artifact = artifactFactory(hostRoot);
  const reviewPackage = buildWar3CurrentSliceReviewPackage(artifact);
  const validation = validateWar3CurrentSliceReviewPackage(reviewPackage);
  const packageDir = outDir ? exportWar3ReviewPackage(reviewPackage, outDir) : undefined;

  return {
    sourceKind: "skeleton-derived",
    packageDir,
    hostRoot,
    reviewPackage,
    validation,
  };
}

export function loadExportedProbePackageSource(packageDir: string): War3ProbePackageSource {
  const resolvedPackageDir = resolve(packageDir);
  const reviewPackage = readWar3ReviewPackageFromDir(resolvedPackageDir);
  const validation = validateWar3CurrentSliceReviewPackage(reviewPackage);

  return {
    sourceKind: "exported-package",
    packageDir: resolvedPackageDir,
    hostRoot: reviewPackage.bridge.hostBinding.host.hostRoot,
    reviewPackage,
    validation,
  };
}

function getOpenBindings(source: War3ProbePackageSource) {
  return Object.values(source.reviewPackage.bridge.hostBinding.bindingManifest.bindings).filter(
    (binding) => binding.status !== "resolved",
  );
}

export function buildWar3ProbeInputMarkdown(source: War3ProbePackageSource): string {
  const openBindings = getOpenBindings(source);
  const hostConstraints = source.reviewPackage.bridge.intentSchema.constraints.hostConstraints;
  const workspaceNotes = source.validation.workspaceValidation.notes;
  const unresolvedRuntimeFacts = [
    ...source.validation.runtimeHookValidation.notes,
    ...source.validation.shopTargetValidation.notes,
    ...source.validation.triggerAreaValidation.notes,
    ...openBindings.map((binding) => `${binding.kind}: ${binding.note}`),
  ];
  const uniqueRuntimeFacts = [...new Set(unresolvedRuntimeFacts.filter(Boolean))];
  const implementationDraftNotes = source.reviewPackage.implementationDraftPlan?.readiness.notes || [];
  const shadowSiteEvidenceLines = source.reviewPackage.shadowSiteEvidenceReview?.sites.map((site) => {
    const dependencyLabel =
      site.dependsOnSiteIds.length > 0 ? site.dependsOnSiteIds.join(", ") : "none";
    return (
      `${site.siteId} [${site.draftCheck.status}] -> ${site.targetPathHint} ` +
      `(markers ${site.draftCheck.presentMarkers.length}/${site.expectedMarkers.length}; depends on ${dependencyLabel})`
    );
  }) || [];

  return [
    "# War3 Skeleton Demo Probe Input",
    "",
    "Objective:",
    `- Consume the bounded War3 review package for \`${CANONICAL_FEATURE_ID}\`.`,
    "- Return a planning-only module plan or typed pseudo-implementation sketch.",
    "- Treat this as a demo/probe input, not as validator integration or runtime proof.",
    "",
    "Current bounded lane:",
    `- package source: ${source.sourceKind}`,
    `- package name: ${source.reviewPackage.packageName}`,
    `- feature probe: ${CANONICAL_FEATURE_ID}`,
    `- slice kind: ${source.reviewPackage.bridge.sliceKind}`,
    `- host root: ${source.hostRoot}`,
    `- workspace flavor: ${source.validation.workspaceValidation.flavor}`,
    `- workspace readiness: ${source.validation.workspaceValidation.readiness}`,
    "",
    "Host constraints:",
    ...stringifyList(hostConstraints),
    "",
    "Review package validation snapshot:",
    `- valid: ${source.validation.valid ? "yes" : "no"}`,
    `- ready for implementation draft: ${source.validation.readyForImplementationDraft ? "yes" : "no"}`,
    `- open bindings: ${source.validation.openBindingCount}`,
    `- runtime hook evidence: ${source.validation.runtimeHookValidation.status}`,
    `- shop target evidence: ${source.validation.shopTargetValidation.status}`,
    `- trigger area evidence: ${source.validation.triggerAreaValidation.status}`,
    `- shadow site evidence contracts: ${source.reviewPackage.shadowSiteEvidenceReview?.sites.length || 0}`,
    "",
    "Required bindings still open:",
    ...stringifyList(
      openBindings.map(
        (binding) => `${binding.kind} [${binding.status}] via ${binding.owner}: ${binding.note}`,
      ),
    ),
    "",
    "Unresolved runtime facts:",
    ...stringifyList(uniqueRuntimeFacts),
    "",
    "Shadow site evidence contracts:",
    ...stringifyList(shadowSiteEvidenceLines),
    "",
    "Explicit non-goals:",
    ...stringifyList([...BOUNDED_NON_GOALS]),
    "",
    "Requested output shape:",
    ...DEFAULT_PROBE_OUTPUT_SHAPES.map((shape, index) => `${index + 1}. ${shape}`),
    "",
    "Output constraints:",
    "- Keep the response review-oriented and bounded to the current War3 lane.",
    "- Do not output complete files or runnable final code.",
    "- Mark guessed or inferred inputs explicitly instead of silently filling them in.",
    "- Separate stable binding advice from unresolved KK/runtime facts.",
    "",
    "Helpful review signals from the current package:",
    ...stringifyList([
      ...workspaceNotes,
      ...implementationDraftNotes,
      ...source.validation.issues.map((issue) => `[${issue.severity}] ${issue.code}: ${issue.message}`),
    ]),
    "",
  ].join("\n");
}

export function writeWar3ProbeInputFile(options: {
  source: War3ProbePackageSource;
  outDir?: string;
}): string {
  const outDir = ensureDir(resolve(options.outDir || "tmp/war3-probe-inputs"));
  const filename = `${CANONICAL_FEATURE_ID}-${timestampLabel()}.md`;
  const filePath = join(outDir, filename);
  writeFileSync(filePath, buildWar3ProbeInputMarkdown(options.source), "utf-8");
  return filePath;
}

export function readProbeRunnerSummaryFile(summaryPath: string): ProbeRunnerSummaryFile {
  return JSON.parse(readFileSync(resolve(summaryPath), "utf-8")) as ProbeRunnerSummaryFile;
}

function inferRequestedOutputShapes(promptText: string): string[] {
  return DEFAULT_PROBE_OUTPUT_SHAPES.filter((shape) =>
    promptText.toLowerCase().includes(shape.toLowerCase()),
  );
}

function collectMatchingLines(text: string, patterns: RegExp[], limit = 6): string[] {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const matches: string[] = [];

  for (const line of lines) {
    if (patterns.some((pattern) => pattern.test(line))) {
      matches.push(line);
    }
    if (matches.length >= limit) {
      break;
    }
  }

  return matches;
}

function stripListPrefix(line: string): string {
  return line
    .replace(/^[-*]\s+/, "")
    .replace(/^\d+\.\s+/, "")
    .trim();
}

function normalizeHeadingText(line: string): string {
  return stripListPrefix(line.replace(/^#{1,6}\s+/, "").trim());
}

function isGenericHeadingOrNoise(line: string): boolean {
  const stripped = stripListPrefix(line);
  if (!stripped) {
    return true;
  }

  return (
    /^#{1,6}\s+/.test(line) ||
    /^```/.test(line) ||
    /^={3,}$/.test(line) ||
    /^-{3,}$/.test(line) ||
    /^(Implementation plan|Module-level file plan|Typed pseudo-implementation sketch|Runtime guards|Still-missing inputs|Missing inputs|Suggested TypeScript-to-Lua files)$/i.test(
      stripped,
    )
  );
}

function collectEvidenceLines(
  text: string,
  options: {
    patterns: RegExp[];
    limit?: number;
    extraFilter?: (line: string, stripped: string) => boolean;
  },
): string[] {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const matches: string[] = [];

  for (const line of lines) {
    const stripped = stripListPrefix(line);
    if (isGenericHeadingOrNoise(line)) {
      continue;
    }
    if (!options.patterns.some((pattern) => pattern.test(stripped))) {
      continue;
    }
    if (options.extraFilter && !options.extraFilter(line, stripped)) {
      continue;
    }
    matches.push(line);
    if (matches.length >= (options.limit || 6)) {
      break;
    }
  }

  return matches;
}

function collectSectionItems(
  text: string,
  sectionPatterns: RegExp[],
  limit = 6,
): string[] {
  const lines = text.split(/\r?\n/);
  const matches: string[] = [];
  let inTargetSection = false;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    const stripped = stripListPrefix(line);
    const isHeading =
      /^#{1,6}\s+/.test(line) ||
      /^\d+\.\s+/.test(line) ||
      /^##\s+/.test(line);

    if (isHeading) {
      const normalizedHeading = normalizeHeadingText(line);
      inTargetSection = sectionPatterns.some((pattern) => pattern.test(normalizedHeading));
      continue;
    }

    if (!inTargetSection) {
      continue;
    }

    if (!line || /^```/.test(line)) {
      continue;
    }

    if (!/^[-*]\s+/.test(line)) {
      continue;
    }

    const item = line.trim();
    if (isGenericHeadingOrNoise(item)) {
      continue;
    }

    matches.push(item);
    if (matches.length >= limit) {
      break;
    }
  }

  return matches;
}

function detectRunnableCode(finalText: string): boolean {
  const lower = finalText.toLowerCase();
  return (
    lower.includes("```ts") ||
    lower.includes("```typescript") ||
    lower.includes("```lua") ||
    lower.includes("function setupmidzoneshop") ||
    lower.includes("export function setupmidzoneshop") ||
    lower.includes("complete file") ||
    lower.includes("final code")
  );
}

function chooseNextMoveRecommendation(input: {
  status: War3ProbeSummary["probeStatus"];
  respectsNoRunnableCode: boolean;
  guessedInputsStillPresent: string[];
  finalText: string;
}): War3ProbeSummary["nextMoveRecommendation"] {
  if (input.status !== "model-output-success" || !input.respectsNoRunnableCode) {
    return "still-too-guessy";
  }

  const lower = input.finalText.toLowerCase();
  const pseudoSignals = ["typed pseudo", "signature", "state shape", "bootstrap", "binding"];
  const pseudoSignalCount = pseudoSignals.filter((signal) => lower.includes(signal)).length;

  if (pseudoSignalCount >= 2 && input.guessedInputsStillPresent.length <= 3) {
    return "pseudo-implementation-good";
  }

  return "planning-good";
}

function chooseDisposition(input: {
  status: War3ProbeSummary["probeStatus"];
  respectsNoRunnableCode: boolean;
  nextMoveRecommendation: War3ProbeSummary["nextMoveRecommendation"];
}): War3ProbeSummary["disposition"] {
  if (input.status === "tool-execution-failure") {
    return "blocked-tool-failure";
  }
  if (input.status === "unusable-output") {
    return "blocked-unusable-output";
  }
  if (!input.respectsNoRunnableCode) {
    return "rejected-runnable-code";
  }
  if (input.nextMoveRecommendation === "pseudo-implementation-good") {
    return "bounded-pseudo-implementation-candidate";
  }
  if (input.nextMoveRecommendation === "planning-good") {
    return "bounded-planning-only";
  }
  return "bounded-but-too-guessy";
}

function detectExternalProbeBlock(text: string): boolean {
  const lower = text.toLowerCase();
  return (
    lower.includes("membership benefits") ||
    lower.includes("invalid_request_error") ||
    lower.includes("rate limit") ||
    lower.includes("unauthorized") ||
    lower.includes("authentication") ||
    lower.includes("login required")
  );
}

export function buildWar3ProbeReviewSummary(summaryPath: string): War3ProbeSummary {
  const resolvedSummaryPath = resolve(summaryPath);
  const summary = readProbeRunnerSummaryFile(resolvedSummaryPath);
  const finalPath = resolve(summary.outputFiles.final);
  const inputPath = resolve(summary.inputFile);
  const finalText = existsSync(finalPath) ? readFileSync(finalPath, "utf-8") : "";
  const promptText = existsSync(inputPath) ? readFileSync(inputPath, "utf-8") : "";
  const requestedOutputShapes = inferRequestedOutputShapes(promptText);
  const respectsNoRunnableCode = !detectRunnableCode(finalText);
  const blockedByTool = summary.status !== "model-output-success";
  const blockedByExternalProbe = blockedByTool && detectExternalProbeBlock(finalText);
  const explicitMissingSectionItems = blockedByTool
    ? []
    : collectSectionItems(finalText, [/^still-missing inputs$/i, /^missing inputs$/i], 8);
  const guessedInputsStillPresent = blockedByTool
    ? []
    : [
        ...explicitMissingSectionItems.filter((line) =>
          /\bassum/i.test(line) ||
          /\bunknown\b/i.test(line) ||
          /\bunclear\b/i.test(line) ||
          /\bunverified\b/i.test(line) ||
          /\bunspecified\b/i.test(line),
        ),
        ...collectEvidenceLines(finalText, {
        patterns: [
          /\bmissing\b/i,
          /\bunknown\b/i,
          /\bunclear\b/i,
          /\bassum/i,
          /\bguess/i,
          /\bunverified\b/i,
          /\bambiguous\b/i,
          /\bunspecified\b/i,
        ],
        limit: 6,
        extraFilter: (_line, stripped) =>
          stripped.length > 20 &&
          !/^What\b/i.test(stripped) &&
          !/^Which\b/i.test(stripped),
        }),
      ].filter((value, index, all) => all.indexOf(value) === index).slice(0, 6);
  const candidateBlueprintSignals = blockedByTool
    ? []
    : collectEvidenceLines(finalText, {
        patterns: [
          /`src\/.+`/i,
          /\bbootstrap\b/i,
          /\bstate shape\b/i,
          /\btriggerregister/i,
          /\btriggeradd(action|condition)\b/i,
          /\btype\s+[A-Za-z_]/i,
          /\binterface\s+[A-Za-z_]/i,
          /\blet\s+[A-Za-z_].*:\s*(trigger|region|unit|framehandle)/i,
        ],
        limit: 6,
        extraFilter: (_line, stripped) => stripped.length > 12,
      });
  const candidateSchemaGaps = blockedByTool
    ? []
    : [
        ...explicitMissingSectionItems,
        ...collectEvidenceLines(finalText, {
          patterns: [
            /\bmissing input/i,
            /\bexact\b.+\b(binding|name|lookup|signature|duration|text)\b/i,
            /\bneeds?\b/i,
            /\bopen binding/i,
            /\bunresolved\b/i,
            /\bhost fact/i,
            /\bruntime fact/i,
            /\bwhether\b/i,
            /\bunspecified\b/i,
          ],
          limit: 8,
          extraFilter: (_line, stripped) =>
            stripped.length > 20 &&
            !/\bmodule\b/i.test(stripped) &&
            !/\bstate shape\b/i.test(stripped),
        }),
      ].filter((value, index, all) => all.indexOf(value) === index).slice(0, 8);
  const nextMoveRecommendation = chooseNextMoveRecommendation({
    status: summary.status,
    respectsNoRunnableCode,
    guessedInputsStillPresent,
    finalText,
  });
  const disposition = chooseDisposition({
    status: summary.status,
    respectsNoRunnableCode,
    nextMoveRecommendation,
  });
  const usablePlanningEvidence =
    summary.status === "model-output-success" &&
    respectsNoRunnableCode &&
    (nextMoveRecommendation === "planning-good" ||
      nextMoveRecommendation === "pseudo-implementation-good");

  return {
    schemaVersion: "war3-probe-review-summary/v1",
    generatedAt: new Date().toISOString(),
    featureId: CANONICAL_FEATURE_ID,
    packageName: basename(summary.outputFiles.summary).replace(/\.summary\.json$/i, ""),
    probeStatus: summary.status,
    blockedByExternalProbe,
    usablePlanningEvidence,
    disposition,
    requestedOutputShapes,
    respectsNoRunnableCode,
    guessedInputsStillPresent,
    candidateBlueprintSignals,
    candidateSchemaGaps,
    nextMoveRecommendation,
    boundedLabels: [
      "review-only",
      "demo-probe",
      "not-validator-integration",
      "not-runtime-proof",
      "not-write-ready",
    ],
    sourceFiles: {
      probeSummary: resolvedSummaryPath,
      probeFinal: finalPath,
      probeInput: inputPath,
    },
  };
}

export function writeWar3ProbeReviewSummary(options: {
  summaryPath: string;
  outDir?: string;
}): string {
  const outDir = ensureDir(resolve(options.outDir || "tmp/war3-probe-summaries"));
  const reviewSummary = buildWar3ProbeReviewSummary(options.summaryPath);
  const filePath = join(
    outDir,
    `${CANONICAL_FEATURE_ID}-${timestampLabel()}.review-summary.json`,
  );
  writeFileSync(filePath, JSON.stringify(reviewSummary, null, 2), "utf-8");
  return filePath;
}

export function writeWar3ProbeEvidenceLedger(options: {
  reviewSummaryPath: string;
  outDir?: string;
}): string {
  const reviewSummary = JSON.parse(
    readFileSync(resolve(options.reviewSummaryPath), "utf-8"),
  ) as War3ProbeSummary;
  const outDir = ensureDir(resolve(options.outDir || "tmp/war3-probe-summaries"));
  const filePath = join(
    outDir,
    `${CANONICAL_FEATURE_ID}-${timestampLabel()}.evidence-ledger.md`,
  );
  const content = [
    "# War3 Probe Evidence Ledger",
    "",
    `- feature: ${reviewSummary.featureId}`,
    `- probe status: ${reviewSummary.probeStatus}`,
    `- blocked by external probe: ${reviewSummary.blockedByExternalProbe ? "yes" : "no"}`,
    `- usable planning evidence: ${reviewSummary.usablePlanningEvidence ? "yes" : "no"}`,
    `- disposition: ${reviewSummary.disposition}`,
    `- respects no runnable code: ${reviewSummary.respectsNoRunnableCode ? "yes" : "no"}`,
    `- next move: ${reviewSummary.nextMoveRecommendation}`,
    "",
    "## Guessed Inputs Still Present",
    ...stringifyList(reviewSummary.guessedInputsStillPresent),
    "",
    "## Candidate Blueprint Signals",
    ...stringifyList(reviewSummary.candidateBlueprintSignals),
    "",
    "## Candidate Schema Gaps",
    ...stringifyList(reviewSummary.candidateSchemaGaps),
    "",
    "## Bounded Labels",
    ...stringifyList(reviewSummary.boundedLabels),
    "",
  ].join("\n");
  writeFileSync(filePath, content, "utf-8");
  return filePath;
}
