// ─── Anthropic API Configuration ──────────────────────────────────────────────
// Get your key at: https://console.anthropic.com/api-keys
// ⚠️  For local testing only — do not commit a real key
export const ANTHROPIC_API_KEY = "YOUR_API_KEY_HERE";

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
      model: "claude-sonnet-4-20250514",
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    }),
  });
  const data = await resp.json();
  if (data.error) throw new Error(data.error.message);
  return data.content[0].text;
}
