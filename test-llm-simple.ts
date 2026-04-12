import { isLLMConfigured, createLLMClientFromEnv } from "./core/llm/factory.js";

const projectRoot = process.cwd();
console.log("=== LLM Config Test ===");
const configured = isLLMConfigured(projectRoot);
console.log("Configured:", configured);

if (configured) {
  console.log("Creating client...");
  const client = createLLMClientFromEnv(projectRoot);
  console.log("Testing API...");
  const result = await client.generateText({
    messages: [{ role: "user", content: "Reply with exactly: OK" }],
    maxTokens: 10,
  });
  console.log("Result:", result.text.trim());
  console.log("=== SUCCESS ===");
} else {
  console.log("LLM not configured");
}
