import "dotenv/config";
import express from "express";
import cors from "cors";
import { analyzeUrlHeuristics } from "./urlSignals.js";
import { analyzeWithMeta } from "./meta.js";
import { analyzeWithJev } from "./jev.js";

const app = express();
app.use(cors());
app.use(express.json({ limit: "256kb" }));

app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    metaConfigured: Boolean(process.env.MODEL_API_KEY),
    jevConfigured: Boolean(process.env.JEV_API_KEY && process.env.JEV_API_URL),
  });
});

app.post("/analyze", async (req, res) => {
  try {
    const urls = Array.isArray(req.body?.urls) ? req.body.urls.slice(0, 40) : [];
    if (urls.some(url => typeof url !== "string" || url.length > 4096 || !/^https?:\/\//i.test(url))) return res.status(400).json({ error: "Only HTTP(S) URLs up to 4096 characters are supported" });
    if (!urls.length) return res.status(400).json({ error: "No URLs supplied" });

    const base = urls.map((url) => ({
      url,
      signals: analyzeUrlHeuristics(url),
    }));

    // Ask Meta only about the most interesting links to save tokens/cost.
    const ranked = [...base]
      .sort((a, b) => b.signals.score - a.signals.score)
      .slice(0, 15);

    const meta = process.env.MODEL_API_KEY
      ? await analyzeWithMeta(ranked)
      : { results: [], warning: "Meta API key not configured" };

    let jev = { results: [], warning: "Jev adapter not configured" };
    if (process.env.JEV_API_KEY && process.env.JEV_API_URL) {
      try {
        jev = await analyzeWithJev(ranked);
      } catch (err) {
        jev = { results: [], warning: `Jev request failed: ${err.message}` };
      }
    }

    const metaMap = new Map((meta.results || []).map((x) => [x.url, x]));
    const jevMap = new Map((jev.results || []).map((x) => [x.url, x]));

    const results = base.map((item) => {
      const m = metaMap.get(item.url);
      const j = jevMap.get(item.url);

      const heuristicRisk =
        item.signals.score >= 70 ? "high" :
        item.signals.score >= 35 ? "suspicious" : "low";

      return {
        url: item.url,
        heuristic: { risk: heuristicRisk, ...item.signals },
        meta: m || null,
        jev: j || null,
      };
    });

    res.json({
      disclaimer: "Risk assessment only; not definitive proof that a URL is malicious.",
      analyzed: results.length,
      results,
      warnings: [meta.warning, jev.warning].filter(Boolean),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || "Analysis failed" });
  }
});

app.listen(Number(process.env.PORT || 8787), "127.0.0.1", () => {
  console.log(`PHISHGUARD AI server listening on http://localhost:${process.env.PORT || 8787}`);
});
