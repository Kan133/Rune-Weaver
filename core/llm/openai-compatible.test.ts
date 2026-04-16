import assert from "assert";

import { OpenAICompatibleClient } from "./providers/openai-compatible.js";

class TestableOpenAICompatibleClient extends OpenAICompatibleClient {
  lastPayload: Record<string, unknown> | undefined;

  constructor() {
    super({
      provider: "openai-compatible",
      baseUrl: "https://example.invalid/v1",
      apiKey: "sk-test",
      model: "kimi-k2.5",
    });
  }

  protected override async postChatCompletions(payload: Record<string, unknown>) {
    this.lastPayload = payload;
    return {
      choices: [
        {
          message: {
            content: `{"boundaryId":"weighted_pool.selection_policy","targetFile":"adapters/dota2/generator/server/weighted-pool.ts","summary":"test","operations":[{"kind":"replace","target":"lines 0123-0124","reason":"repair malformed tail","replacement":"const value = 1;"},]`,
          },
        },
      ],
    };
  }
}

async function testStructuredJsonRecovery(): Promise<void> {
  const client = new TestableOpenAICompatibleClient();
  const result = await client.generateObject<{
    boundaryId: string;
    targetFile: string;
    summary: string;
    operations: Array<{ kind: string; target: string; reason: string; replacement: string }>;
  }>({
    messages: [{ role: "user", content: "test" }],
    schemaName: "test.schema",
    schema: { type: "object" },
  });

  assert.strictEqual(result.object.boundaryId, "weighted_pool.selection_policy");
  assert.strictEqual(result.object.operations.length, 1);
  assert.strictEqual(result.object.operations[0].reason, "repair malformed tail");
}

async function testProviderConsumesOnlyPassedProviderOptions(): Promise<void> {
  const client = new TestableOpenAICompatibleClient();

  await client.generateText({
    messages: [{ role: "user", content: "hello" }],
    providerOptions: {
      thinking: { type: "enabled" },
    },
  });
  assert.deepStrictEqual(client.lastPayload?.thinking, { type: "enabled" });

  await client.generateText({
    messages: [{ role: "user", content: "hello" }],
  });
  assert.strictEqual(
    Object.prototype.hasOwnProperty.call(client.lastPayload ?? {}, "thinking"),
    false,
  );
}

async function main(): Promise<void> {
  await testStructuredJsonRecovery();
  await testProviderConsumesOnlyPassedProviderOptions();
  console.log("openai-compatible structured JSON recovery test passed");
}

main().catch((error) => {
  console.error("Test failed:", error);
  process.exit(1);
});
