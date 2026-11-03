const scan = document.getElementById("scan");
const statusEl = document.getElementById("status");
const resultsEl = document.getElementById("results");
const summaryEl = document.getElementById("summary");

scan.addEventListener("click", async () => {
  scan.disabled = true;
  resultsEl.innerHTML = "";
  summaryEl.innerHTML = "";
  statusEl.textContent = "Collecting visible links…";

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    const [{ result: urls }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        const raw = [...document.querySelectorAll("a[href]")]
          .map((a) => a.href)
          .filter((href) => /^https?:\/\//i.test(href));
        return [...new Set(raw)].slice(0, 40);
      },
    });

    statusEl.textContent = `Analyzing ${urls.length} unique links…`;

    const response = await fetch("http://localhost:8787/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ urls }),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Backend request failed");

    const rows = data.results || [];
    const counts = { high: 0, suspicious: 0, low: 0, unknown: 0 };

    for (const row of rows) {
      const candidateRisk = row.meta?.risk || row.heuristic?.risk;
      const risk = ["low", "suspicious", "high", "unknown"].includes(candidateRisk) ? candidateRisk : "unknown";
      counts[risk] = (counts[risk] || 0) + 1;
    }

    summaryEl.innerHTML = `
      <span class="pill">High ${counts.high}</span>
      <span class="pill">Suspicious ${counts.suspicious}</span>
      <span class="pill">Low ${counts.low}</span>
      <span class="pill">Unknown ${counts.unknown}</span>
    `;

    rows
      .sort((a, b) => (b.meta?.score ?? b.heuristic?.score ?? 0) - (a.meta?.score ?? a.heuristic?.score ?? 0))
      .forEach((row) => {
        const candidateRisk = row.meta?.risk || row.heuristic?.risk;
      const risk = ["low", "suspicious", "high", "unknown"].includes(candidateRisk) ? candidateRisk : "unknown";
        const score = row.meta?.score ?? row.heuristic?.score ?? 0;
        const explanation =
          row.meta?.explanation ||
          (row.heuristic?.reasons?.length ? row.heuristic.reasons.join(" • ") : "No strong structural indicators.");

        const div = document.createElement("div");
        div.className = "item";
        div.innerHTML = `
          <div class="row">
            <span class="risk ${risk}">${risk}</span>
            <span>${score}/100</span>
          </div>
          <div class="url"></div>
          <div class="explain"></div>
        `;
        div.querySelector(".url").textContent = row.url;
        div.querySelector(".explain").textContent = explanation;
        resultsEl.appendChild(div);
      });

    statusEl.textContent = `Done — ${rows.length} links assessed.`;
    if (data.warnings?.length) {
      statusEl.textContent += ` ${data.warnings.join(" ")}`;
    }
  } catch (err) {
    statusEl.textContent = `Error: ${err.message}`;
  } finally {
    scan.disabled = false;
  }
});
