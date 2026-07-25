// Parse a "Score:" issue and fold the entry into scores.json (top-10, sorted).
// All untrusted input arrives via env vars (ISSUE_TITLE / ISSUE_BODY); every
// value written to GITHUB_OUTPUT is sanitized to [A-Z]/digits so it is safe to
// interpolate into later workflow steps.
import { readFileSync, writeFileSync, appendFileSync } from "node:fs";

const MAX = 10;
const CEILING = 1_000_000_000; // reject implausible/garbage scores

function out(key, value) {
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `${key}=${value}\n`);
  else console.log(`${key}=${value}`);
}

function done(fields) {
  for (const [k, v] of Object.entries(fields)) out(k, v);
  process.exit(0);
}

function cleanName(raw) {
  return (String(raw || "").toUpperCase().replace(/[^A-Z]/g, "") + "AAA").slice(0, 3);
}

const title = process.env.ISSUE_TITLE || "";
const body = process.env.ISSUE_BODY || "";

// Prefer the JSON object in the body; fall back to the title format.
let name;
let score;
const json = body.match(/\{[^{}]*"name"\s*:\s*"([^"]*)"[^{}]*"score"\s*:\s*(\d+)[^{}]*\}/);
if (json) {
  name = json[1];
  score = parseInt(json[2], 10);
} else {
  const t = title.match(/Score:\s*([A-Za-z]{1,3})\s+([\d,]+)/);
  if (!t) done({ changed: false, error: "could not find a score in the issue" });
  name = t[1];
  score = parseInt(t[2].replace(/,/g, ""), 10);
}

name = cleanName(name);
if (!Number.isFinite(score) || score <= 0) done({ changed: false, error: "score must be a positive whole number" });
if (score > CEILING) done({ changed: false, error: "score is implausibly high" });

let scores;
try {
  scores = JSON.parse(readFileSync("scores.json", "utf8"));
} catch {
  scores = [];
}
if (!Array.isArray(scores)) scores = [];

scores.push({ name, score });

// sanitize, drop exact duplicates, sort, cap
const seen = new Set();
scores = scores
  .filter(s => s && typeof s.name === "string" && Number.isFinite(s.score))
  .map(s => ({ name: cleanName(s.name), score: Math.max(0, Math.floor(s.score)) }))
  .sort((a, b) => b.score - a.score)
  .filter(s => {
    const key = `${s.name}:${s.score}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  })
  .slice(0, MAX);

const rank = scores.findIndex(s => s.name === name && s.score === score) + 1;
if (rank === 0) {
  done({ changed: false, entry: `${name} ${score.toLocaleString("en-US")}` });
}

writeFileSync("scores.json", JSON.stringify(scores, null, 2) + "\n");
done({ changed: true, entry: `${name} ${score.toLocaleString("en-US")}`, rank: String(rank) });
