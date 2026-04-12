import { isLLMConfigured, createLLMClientFromEnv } from "./core/llm/factory.js";

const projectRoot = process.cwd();
console.log("=== Gap Fill Runtime Test ===");
const configured = isLLMConfigured(projectRoot);
console.log("LLM Configured:", configured);

if (!configured) {
  console.log("ERROR: LLM not configured");
  process.exit(1);
}

const client = createLLMClientFromEnv(projectRoot);

console.log("\n=== Testing LLM Fill for Title (Category B) ===");
try {
  const result = await client.generateText({
    messages: [{ 
      role: "user", 
      content: `Suggest a concise title for a Dota2 talent selection feature. Respond with only the title, no explanation.` 
    }],
    maxTokens: 50,
  });
  console.log("✅ SUCCESS! Title:", result.text.trim());
} catch (error) {
  console.log("❌ FAILED:", error instanceof Error ? error.message : String(error));
}

console.log("\n=== Testing LLM Fill for Description (Category B) ===");
try {
  const result = await client.generateText({
    messages: [{ 
      role: "user", 
      content: `Describe what a talent selection modal does in Dota2. Respond with only a short description, no explanation.` 
    }],
    maxTokens: 50,
  });
  console.log("✅ SUCCESS! Description:", result.text.trim());
} catch (error) {
  console.log("❌ FAILED:", error instanceof Error ? error.message : String(error));
}

console.log("\n=== Test Complete ===");
