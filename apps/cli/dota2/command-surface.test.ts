import assert from "node:assert/strict";

import { resolveDota2CommandSurface } from "./command-surface.js";

function testCreateAliasNormalizesToRun(): void {
  const surface = resolveDota2CommandSurface({
    rawArgs: ["dota2", "create", "Create a draw system", "--host", "D:\\rw-test6"],
    requestedSubcommand: "create",
    host: "D:\\rw-test6",
  });

  assert.equal(surface.requestedSubcommand, "create");
  assert.equal(surface.normalizedSubcommand, "run");
  assert.equal(surface.prompt, "Create a draw system");
  assert.equal(surface.inputProvenance.promptSource, "positional");
  assert.equal(surface.inputProvenance.normalizedCommand, "run");
  assert.ok(surface.inputProvenance.promptHash);
}

function testUnknownSubcommandFailsFast(): void {
  assert.throws(
    () => resolveDota2CommandSurface({
      rawArgs: ["dota2", "invent", "Create a draw system", "--host", "D:\\rw-test6"],
      requestedSubcommand: "invent",
      host: "D:\\rw-test6",
    }),
    /Unknown dota2 subcommand 'invent'/,
  );
}

function testInputFlagPreservesPromptSource(): void {
  const surface = resolveDota2CommandSurface({
    rawArgs: ["dota2", "run", "--input", "Create a draw system", "--host", "D:\\rw-test6"],
    requestedSubcommand: "run",
    input: "Create a draw system",
    host: "D:\\rw-test6",
  });

  assert.equal(surface.prompt, "Create a draw system");
  assert.equal(surface.inputProvenance.promptSource, "--input");
}

function testBase64EnvPromptPreservesPromptSource(): void {
  const surface = resolveDota2CommandSurface({
    rawArgs: ["dota2", "run", "--input-base64-env", "RW_PROMPT", "--host", "D:\\rw-test6"],
    requestedSubcommand: "run",
    inputBase64Env: "RW_PROMPT",
    host: "D:\\rw-test6",
    env: {
      RW_PROMPT: Buffer.from("Create a draw system", "utf8").toString("base64"),
    },
  });

  assert.equal(surface.prompt, "Create a draw system");
  assert.equal(surface.inputProvenance.promptSource, "base64-env");
}

testCreateAliasNormalizesToRun();
testUnknownSubcommandFailsFast();
testInputFlagPreservesPromptSource();
testBase64EnvPromptPreservesPromptSource();

console.log("apps/cli/dota2/command-surface.test.ts passed");
