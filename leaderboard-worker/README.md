# Buck Fever leaderboard Worker

A tiny Cloudflare Worker + KV store that holds the shared high-score board so the
game can post scores automatically (no GitHub token, no Action, no repo commits).

- `GET  /` → the current top-10 board, JSON `[{ "name": "ABC", "score": 123 }, ...]`
- `POST /` with body `{ "name": "ABC", "score": 123 }` → validates, folds it into
  the board, returns the updated board.

## Deploy (one time, ~5 minutes)

You need a free Cloudflare account. From this folder:

1. Install + sign in:
   ```
   npm install -g wrangler
   wrangler login
   ```
2. Create the KV namespace and copy the printed `id` into `wrangler.toml`
   (replace `PASTE_KV_NAMESPACE_ID`):
   ```
   wrangler kv namespace create SCORES
   ```
3. Deploy:
   ```
   wrangler deploy
   ```
   Wrangler prints a URL like `https://buck-fever-scores.<your-subdomain>.workers.dev`.
4. Put that URL in the game: set `SCORES_API` near the top of the script in
   `index.html` to the deployed URL. That's it — scores now post automatically.

## Notes

- **CORS**: the Worker allows any origin by default. To lock it to your site,
  change `Access-Control-Allow-Origin` in `worker.js` to your Pages origin.
- **Seed**: the board starts with eight camp-name placeholders and replaces them
  as real scores come in.
- **Consistency**: KV is last-write-wins; two scores posted in the same instant
  could drop one entry. Fine for casual play.
- **Anti-cheat**: like any client-submitted leaderboard, scores can be forged by
  POSTing directly to the endpoint. Add a shared secret header or rate limiting
  if that ever matters.
