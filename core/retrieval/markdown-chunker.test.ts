import assert from "node:assert/strict";

import { chunkMarkdownByHeadings } from "./markdown-chunker.js";

const markdown = `Intro paragraph explains the overall context and should remain retrievable.

# Gameplay
High-level gameplay notes.

## Trigger
Press Q to trigger a directional dash.

\`\`\`ts
// Heading-like text in code should not split chunks.
const text = "# not a heading";
\`\`\`

## Effects
Apply a short movement burst and then grant a timed buff.

### Tuning
Speed and distance should be balanced with cooldown.
`;

const chunks = chunkMarkdownByHeadings(markdown, {
  sourceId: "doc-abilities",
  sourcePath: "knowledge/dota2-host/slices/scripting-typescript/abilities-and-casting.md",
  maxChunkChars: 120,
  minChunkChars: 40,
});

assert.ok(chunks.length >= 4, "expected heading-aware chunks to be emitted");

assert.deepEqual(chunks[0].headingPath, []);
assert.ok(chunks[0].content.includes("Intro paragraph"));

const triggerChunk = chunks.find((chunk) => chunk.headingPath.join(" > ") === "Gameplay > Trigger");
assert.ok(triggerChunk, "expected Trigger section chunk");
assert.ok(triggerChunk!.content.includes("Press Q to trigger"));
assert.ok(
  chunks.some(
    (chunk) =>
      chunk.headingPath.join(" > ") === "Gameplay > Trigger" &&
      chunk.content.includes("# not a heading"),
  ),
  "code fence should be preserved under the same heading scope",
);

const tuningChunk = chunks.find((chunk) => chunk.headingPath.join(" > ") === "Gameplay > Effects > Tuning");
assert.ok(tuningChunk, "expected nested heading path");
assert.ok(tuningChunk!.content.includes("Speed and distance"));

const uniqueIds = new Set(chunks.map((chunk) => chunk.id));
assert.equal(uniqueIds.size, chunks.length, "chunk ids should be unique");

console.log("core/retrieval/markdown-chunker.test.ts passed");
