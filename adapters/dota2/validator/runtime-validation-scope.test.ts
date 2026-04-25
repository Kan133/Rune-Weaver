import assert from "node:assert/strict";

import {
  buildExternalRuntimeDiagnosticLimitation,
  extractDiagnosticFileFromMessage,
  isRuntimeValidationDiagnosticInScope,
  normalizeValidationDiagnosticFile,
  partitionRuntimeValidationDiagnostics,
} from "./runtime-validation-scope.js";

const HOST_ROOT = "D:\\rw-test4";

function testExtractsTstlSourceFileFromDiagnosticMessage(): void {
  const message =
    "Could not resolve lua source files for require path '../json/round_settings.json' in file src\\examples\\round_settings.ts.";
  assert.equal(extractDiagnosticFileFromMessage(message), "src\\examples\\round_settings.ts");
}

function testTreatsExternalServerDiagnosticsAsOutOfScope(): void {
  const diagnostics = [
    {
      file: "src\\examples\\round_settings.ts",
      message: "Host example compile error",
    },
    {
      file: "src\\rune_weaver\\generated\\server\\feature_demo.ts",
      message: "Rune Weaver compile error",
    },
    {
      file: "src\\modules\\index.ts",
      message: "Bridge entry compile error",
    },
  ];

  const partitioned = partitionRuntimeValidationDiagnostics(diagnostics, "server", HOST_ROOT);
  assert.equal(partitioned.relevant.length, 2);
  assert.equal(partitioned.external.length, 1);
  assert.equal(
    normalizeValidationDiagnosticFile(partitioned.external[0].file, HOST_ROOT),
    "src/examples/round_settings.ts",
  );
}

function testKeepsUnknownDiagnosticsInScope(): void {
  assert.equal(
    isRuntimeValidationDiagnosticInScope(
      {
        file: "",
        message: "Unknown compile failure",
      },
      "server",
      HOST_ROOT,
    ),
    true,
  );
}

function testTreatsUiBridgeEntryAsInScope(): void {
  assert.equal(
    isRuntimeValidationDiagnosticInScope(
      {
        file: "content/panorama/src/hud/script.tsx",
      },
      "ui",
      HOST_ROOT,
    ),
    true,
  );
  assert.equal(
    isRuntimeValidationDiagnosticInScope(
      {
        file: "content/panorama/src/examples/demo.tsx",
      },
      "ui",
      HOST_ROOT,
    ),
    false,
  );
}

function testBuildsLimitationForExternalDiagnostics(): void {
  const limitation = buildExternalRuntimeDiagnosticLimitation(
    [
      { file: "src\\examples\\round_settings.ts" },
    ],
    "server",
    HOST_ROOT,
  );

  assert.ok(limitation?.includes("outside runtime validation scope"));
  assert.ok(limitation?.includes("src/examples/round_settings.ts"));
}

function runTests(): void {
  testExtractsTstlSourceFileFromDiagnosticMessage();
  testTreatsExternalServerDiagnosticsAsOutOfScope();
  testKeepsUnknownDiagnosticsInScope();
  testTreatsUiBridgeEntryAsInScope();
  testBuildsLimitationForExternalDiagnostics();
  console.log("adapters/dota2/validator/runtime-validation-scope.test.ts: PASS");
}

runTests();
