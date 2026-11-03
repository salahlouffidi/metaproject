/*
  Jev / TypeSafe adapter.

  The public material confirms Jev is designed for typed probabilistic decisions,
  but this MVP intentionally keeps the transport configurable because the exact
  account endpoint/schema can vary with the current TypeSafe API surface.

  Set JEV_API_URL to the exact endpoint shown by your TypeSafe console/docs.
  If their request schema differs, edit only this file; the rest of PHISHGUARD
  does not need to change.
*/
export async function analyzeWithJev(items) {
  const state = items.map((x) => ({
    url: x.url,
    hostname: x.signals.hostname,
    heuristicScore: x.signals.score,
    evidence: x.signals.reasons,
  }));

  const response = await fetch(process.env.JEV_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.JEV_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      state,
      questions: {
        phishing_risk: {
          type: "choice",
          choices: ["low", "suspicious", "high", "unknown"]
        }
      }
    }),
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Jev API ${response.status}: ${text.slice(0, 300)}`);
  }

  const data = JSON.parse(text);

  // Normalize here once the exact Jev response shape is confirmed.
  if (Array.isArray(data?.results)) return { results: data.results };

  return {
    results: [],
    warning: "Jev responded, but its response schema needs normalization in server/src/jev.js"
  };
}
