function safeJsonFromText(text) {
  const trimmed = String(text || "").trim();
  try { return JSON.parse(trimmed); } catch {}
  const match = trimmed.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("Meta response did not contain JSON");
  return JSON.parse(match[0]);
}

export async function analyzeWithMeta(items) {
  const endpoint = "https://api.meta.ai/v1/chat/completions";
  const model = process.env.META_MODEL || "muse-spark-1.3";

  const prompt = {
    task: "Classify phishing risk using only the supplied URL and heuristic evidence.",
    rules: [
      "Do not claim certainty from URL structure alone.",
      "Return valid JSON only.",
      "risk must be one of low, suspicious, high, unknown.",
      "score must be an integer from 0 to 100.",
      "explanation must be concise and evidence-based.",
      "Do not visit, fetch, or execute the URLs."
    ],
    output_schema: {
      results: [
        {
          url: "string",
          risk: "low|suspicious|high|unknown",
          score: "integer 0-100",
          explanation: "string",
          evidence: ["string"]
        }
      ]
    },
    candidates: items
  };

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.MODEL_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.1,
      messages: [
        {
          role: "system",
          content: "You are a defensive anti-phishing classifier. Output JSON only and base conclusions strictly on supplied evidence."
        },
        {
          role: "user",
          content: JSON.stringify(prompt)
        }
      ]
    }),
  });

  const body = await response.text();
  if (!response.ok) {
    throw new Error(`Meta API ${response.status}: ${body.slice(0, 300)}`);
  }

  const data = JSON.parse(body);
  const content = data?.choices?.[0]?.message?.content;
  return safeJsonFromText(content);
}
