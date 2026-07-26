// Buck Fever — shared high-score leaderboard on Val.town (HTTP val + blob store).
//
//   GET  /   -> current top-10 board as JSON [{name, score}, ...]
//   POST /   -> body {name, score}; validates, folds it in, returns the board.
//
// Deploy: val.town → New → HTTP val → paste this whole file → Save. The URL it
// gives you is what goes in the game's SCORES_API. Storage is Val.town "blob";
// no setup or keys required.

import { blob } from "https://esm.town/v/std/blob";

const MAX = 10;
const CEILING = 1_000_000_000; // reject implausible/garbage scores
const KEY = "buck-fever-board";

// Shown until the first real score is posted.
const SEED = [
  { name: "BUK", score: 2000000 },
  { name: "YOO", score: 1500000 },
  { name: "UPP", score: 1200000 },
  { name: "DOE", score: 900000 },
  { name: "ELK", score: 700000 },
  { name: "PIN", score: 500000 },
  { name: "CMP", score: 350000 },
  { name: "FOX", score: 200000 },
];

// Allow the game (any origin) to read/write. Lock to your Pages origin if you
// prefer, e.g. "https://nick-portagecreektech.github.io".
const CORS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });

const cleanName = (raw: unknown) =>
  (String(raw ?? "").toUpperCase().replace(/[^A-Z]/g, "") + "AAA").slice(0, 3);

function normalize(list: Array<{ name: unknown; score: unknown }>) {
  const seen = new Set<string>();
  return list
    .filter((s) => s && typeof s.name === "string" && Number.isFinite(s.score))
    .map((s) => ({ name: cleanName(s.name), score: Math.max(0, Math.floor(Number(s.score))) }))
    .sort((a, b) => b.score - a.score)
    .filter((s) => {
      const k = `${s.name}:${s.score}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    })
    .slice(0, MAX);
}

export default async function (req: Request): Promise<Response> {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });

  let board: any;
  try {
    board = await blob.getJSON(KEY);
  } catch {
    board = undefined;
  }
  if (!Array.isArray(board)) board = SEED.slice();

  if (req.method === "GET") return json(board);

  if (req.method === "POST") {
    let body: any;
    try {
      body = await req.json();
    } catch {
      return json({ error: "invalid JSON" }, 400);
    }
    const name = cleanName(body?.name);
    const score = Math.floor(Number(body?.score));
    if (!name || !Number.isFinite(score) || score <= 0 || score > CEILING) {
      return json({ error: "invalid score" }, 400);
    }
    board = normalize([...board, { name, score }]);
    await blob.setJSON(KEY, board);
    return json(board);
  }

  return json({ error: "method not allowed" }, 405);
}
