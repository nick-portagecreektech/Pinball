// Buck Fever — shared high-score leaderboard on a Cloudflare Worker + KV.
//
//   GET  /   -> current top-10 board as a JSON array [{name, score}, ...]
//   POST /   -> body {name, score}; validates, folds into the board, returns it
//
// Bind a KV namespace as `SCORES` (see wrangler.toml). No GitHub token needed —
// the board lives entirely in KV. See README.md for deploy steps.

const MAX = 10;
const CEILING = 1_000_000_000; // reject implausible/garbage scores
const KEY = "board";

// Shown until the first real score is posted.
const SEED = [
  { name: "BUK", score: 2000000 },
  { name: "YOO", score: 1500000 },
  { name: "UPP", score: 1200000 },
  { name: "DOE", score: 900000 },
  { name: "ELK", score: 700000 },
  { name: "PIN", score: 500000 },
  { name: "CMP", score: 350000 },
  { name: "FOX", score: 200000 }
];

// Allow the game (on any origin) to read/write. Restrict to your Pages origin
// if you prefer, e.g. "https://nick-portagecreektech.github.io".
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type"
};

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...CORS }
  });

const cleanName = raw =>
  (String(raw || "").toUpperCase().replace(/[^A-Z]/g, "") + "AAA").slice(0, 3);

function normalize(list) {
  const seen = new Set();
  return list
    .filter(s => s && typeof s.name === "string" && Number.isFinite(s.score))
    .map(s => ({ name: cleanName(s.name), score: Math.max(0, Math.floor(s.score)) }))
    .sort((a, b) => b.score - a.score)
    .filter(s => {
      const k = `${s.name}:${s.score}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    })
    .slice(0, MAX);
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") return new Response(null, { headers: CORS });

    let board = await env.SCORES.get(KEY, "json");
    if (!Array.isArray(board)) board = SEED.slice();

    if (request.method === "GET") return json(board);

    if (request.method === "POST") {
      let body;
      try {
        body = await request.json();
      } catch {
        return json({ error: "invalid JSON" }, 400);
      }
      const name = cleanName(body.name);
      const score = Math.floor(Number(body.score));
      if (!name || !Number.isFinite(score) || score <= 0 || score > CEILING) {
        return json({ error: "invalid score" }, 400);
      }
      board = normalize([...board, { name, score }]);
      await env.SCORES.put(KEY, JSON.stringify(board));
      return json(board);
    }

    return json({ error: "method not allowed" }, 405);
  }
};
