import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { WorkspaceRefreshAdvisory } from "./WorkspaceRefreshAdvisory";

const hint = {
  summary: "Refresh this workspace payload with a governed bridge export.",
  command: 'npm run cli -- export-bridge --host "D:\\Rune Weaver"',
};

function runTests(): void {
  const fullHtml = renderToStaticMarkup(
    React.createElement(WorkspaceRefreshAdvisory, {
      hint,
      variant: "full",
    }),
  );
  assert.equal(fullHtml.includes("Workspace Source Advisory"), true);
  assert.equal(fullHtml.includes(hint.summary), true);
  assert.equal(fullHtml.includes("export-bridge"), true);
  assert.equal(fullHtml.includes("Rune Weaver"), true);
  assert.equal(fullHtml.includes("workspace-refresh-advisory-full"), true);

  const compactHtml = renderToStaticMarkup(
    React.createElement(WorkspaceRefreshAdvisory, {
      hint,
      variant: "compact",
    }),
  );
  assert.equal(compactHtml.includes(hint.summary), true);
  assert.equal(compactHtml.includes(hint.command), false);
  assert.equal(compactHtml.includes("Workspace Source Advisory"), false);
  assert.equal(compactHtml.includes("workspace-refresh-advisory-compact"), true);

  console.log("apps/workbench-ui/src/components/workspace/WorkspaceRefreshAdvisory.test.tsx: PASS");
}

try {
  runTests();
} catch (error) {
  console.error("WorkspaceRefreshAdvisory.test.tsx failed:", error);
  process.exit(1);
}
