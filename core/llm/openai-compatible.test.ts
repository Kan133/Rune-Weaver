import assert from "assert";
import { createServer } from "http";

import { OpenAICompatibleClient } from "./providers/openai-compatible.js";

class TestableOpenAICompatibleClient extends OpenAICompatibleClient {
  lastPayload: Record<string, unknown> | undefined;
  lastTimeoutMs: number | undefined;

  constructor() {
    super({
      provider: "openai-compatible",
      baseUrl: "https://example.invalid/v1",
      apiKey: "sk-test",
      model: "kimi-k2.5",
    });
  }

  protected override async postChatCompletions(
    payload: Record<string, unknown>,
    timeoutMs?: number,
  ) {
    this.lastPayload = payload;
    this.lastTimeoutMs = timeoutMs;
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
  assert.strictEqual(client.lastTimeoutMs, undefined);
}

async function testProviderHonorsPerRequestTimeoutOverride(): Promise<void> {
  const server = createServer((_req, res) => {
    setTimeout(() => {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({
        choices: [
          {
            message: {
              content: "{\"ok\":true}",
            },
          },
        ],
      }));
    }, 200);
  });

  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Failed to start timeout test server");
  }

  const client = new OpenAICompatibleClient({
    provider: "openai-compatible",
    baseUrl: `http://127.0.0.1:${address.port}/v1`,
    apiKey: "sk-test",
    model: "gpt-5.4",
    timeoutMs: 1000,
  });

  try {
    await assert.rejects(
      () => client.generateObject<{ ok: boolean }>({
        messages: [{ role: "user", content: "test" }],
        schemaName: "timeout.test",
        schema: { type: "object" },
        timeoutMs: 50,
      }),
      /timed out after 50 ms/i,
    );
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    });
  }
}

async function main(): Promise<void> {
  await testStructuredJsonRecovery();
  await testProviderConsumesOnlyPassedProviderOptions();
  await testProviderHonorsPerRequestTimeoutOverride();
  console.log("openai-compatible structured JSON recovery test passed");
}

main().catch((error) => {
  console.error("Test failed:", error);
  process.exit(1);
});
