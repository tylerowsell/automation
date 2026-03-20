// ─── Anthropic API Configuration ──────────────────────────────────────────────
// Get your key at: https://console.anthropic.com/api-keys
// ⚠️  For local testing only — do not commit a real key
export const ANTHROPIC_API_KEY = "YOUR_API_KEY_HERE";

const MODEL = "claude-sonnet-4-20250514";

// ─── Standard single-turn call ────────────────────────────────────────────────
export async function callClaude(systemPrompt, userPrompt, maxTokens = 4000) {
  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    }),
  });
  const data = await resp.json();
  if (data.error) throw new Error(data.error.message);
  return data.content[0].text;
}

// ─── Agentic tool-use loop ─────────────────────────────────────────────────────
// Drives the multi-turn tool-calling loop until the model reaches end_turn or
// the max-iterations guard fires.  The caller supplies:
//   toolDefinitions  – Anthropic tool schema objects
//   toolExecutor(name, input) → any  – synchronous or async tool handler
//   onToolCall(name, input)   – optional progress callback
export async function callClaudeWithTools({
  systemPrompt,
  userPrompt,
  toolDefinitions,
  toolExecutor,
  onToolCall,
  maxTokens = 4000,
  maxIterations = 10,
}) {
  const messages = [{ role: "user", content: userPrompt }];
  let iterations = 0;
  let finalText = "";

  while (iterations < maxIterations) {
    iterations++;

    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: maxTokens,
        system: systemPrompt,
        tools: toolDefinitions,
        messages,
      }),
    });

    const data = await resp.json();
    if (data.error) throw new Error(data.error.message);

    // Collect any text the model produced this turn
    const textBlocks = data.content.filter(b => b.type === "text");
    if (textBlocks.length) finalText = textBlocks.map(b => b.text).join("\n");

    // If no more tool calls, we're done
    if (data.stop_reason === "end_turn") break;

    // Process tool_use blocks
    const toolUseBlocks = data.content.filter(b => b.type === "tool_use");
    if (!toolUseBlocks.length) break;

    // Append assistant turn
    messages.push({ role: "assistant", content: data.content });

    // Execute each tool and collect results
    const toolResults = [];
    for (const block of toolUseBlocks) {
      onToolCall?.(block.name, block.input);
      let result;
      try {
        result = await toolExecutor(block.name, block.input);
      } catch (e) {
        result = { error: e.message };
      }
      toolResults.push({
        type: "tool_result",
        tool_use_id: block.id,
        content: JSON.stringify(result),
      });
    }

    // Append tool results as user turn
    messages.push({ role: "user", content: toolResults });
  }

  return finalText;
}
