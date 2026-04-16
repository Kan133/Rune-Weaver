import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { commandRequiresPrompt, useCLIExecutor } from "./useCLIExecutor";

let capturedHook: ReturnType<typeof useCLIExecutor> | null = null;

function HookProbe() {
  capturedHook = useCLIExecutor();
  return React.createElement("div", null, "probe");
}

function runTests(): void {
  renderToStaticMarkup(React.createElement(HookProbe));

  assert.equal(commandRequiresPrompt("run"), true);
  assert.equal(commandRequiresPrompt("update"), true);
  assert.equal(commandRequiresPrompt("delete"), false);
  assert.equal(commandRequiresPrompt("doctor"), false);
  assert.equal(typeof capturedHook?.executeRun, "function");
  assert.equal(typeof capturedHook?.executeUpdate, "function");
  assert.equal(typeof capturedHook?.executeDelete, "function");

  console.log("apps/workbench-ui/src/hooks/useCLIExecutor.test.tsx: PASS");
}

runTests();
