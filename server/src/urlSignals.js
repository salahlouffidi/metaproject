const BRANDS = ["facebook", "instagram", "meta", "paypal", "google", "microsoft", "apple", "amazon", "netflix"];

function entropyish(host) {
  const digits = (host.match(/\d/g) || []).length;
  const hyphens = (host.match(/-/g) || []).length;
  return digits + hyphens * 2;
}

export function analyzeUrlHeuristics(raw) {
  const reasons = [];
  let score = 0;

  let u;
  try {
    u = new URL(raw);
  } catch {
    return { score: 90, reasons: ["Invalid or malformed URL"] };
  }

  const host = u.hostname.toLowerCase();

  if (u.protocol !== "https:") {
    score += 15;
    reasons.push("Does not use HTTPS");
  }

  if (host.startsWith("xn--") || host.includes(".xn--")) {
    score += 25;
    reasons.push("Contains punycode / internationalized-domain encoding");
  }

  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) {
    score += 35;
    reasons.push("Uses a raw IP address instead of a normal hostname");
  }

  const weird = entropyish(host);
  if (weird >= 8) {
    score += 15;
    reasons.push("Hostname contains many digits/hyphens");
  }

  if (u.username || u.password) {
    score += 35;
    reasons.push("URL contains embedded credentials");
  }

  if (u.href.length > 180) {
    score += 10;
    reasons.push("Unusually long URL");
  }

  const suspiciousWords = ["login", "verify", "secure", "account", "update", "confirm", "password", "wallet"];
  const hits = suspiciousWords.filter((w) => u.href.toLowerCase().includes(w));
  if (hits.length >= 2) {
    score += 15;
    reasons.push(`Multiple credential-themed words: ${hits.join(", ")}`);
  }

  for (const brand of BRANDS) {
    if (host.includes(brand) && !host.endsWith(`.${brand}.com`) && host !== `${brand}.com`) {
      score += 25;
      reasons.push(`Hostname contains brand-like term "${brand}" but is not the canonical .com domain`);
      break;
    }
  }

  score = Math.min(100, score);
  return { score, reasons, hostname: host };
}
