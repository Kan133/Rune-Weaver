import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { Sidebar } from "./Sidebar";
import { useFeatureStore } from "@/hooks/useFeatureStore";
import { isWorkbenchDevMode } from "@/lib/runtimeMode";

function runTests(): void {
  (globalThis as typeof globalThis & { React?: typeof React }).React = React;

  useFeatureStore.setState({
    features: [],
    connectedHostRoot: null,
    isWorkspaceConnected: false,
  });

  const originalWindow = globalThis.window;
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      location: {
        search: "?debugSources=1",
      },
    },
  });

  try {
    assert.equal(isWorkbenchDevMode(), false);
    const html = renderToStaticMarkup(React.createElement(Sidebar));
    assert.equal(html.includes("Workspace Source"), false);
    assert.equal(html.includes("Connected Host / Workspace"), true);
  } finally {
    if (originalWindow === undefined) {
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete (globalThis as { window?: Window }).window;
    } else {
      Object.defineProperty(globalThis, "window", {
        configurable: true,
        value: originalWindow,
      });
    }
  }

  console.log("apps/workbench-ui/src/components/layout/Sidebar.debugSources.test.tsx: PASS");
}

try {
  runTests();
} catch (error) {
  console.error("Sidebar.debugSources.test.tsx failed:", error);
  process.exit(1);
}
