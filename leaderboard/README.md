# Buck Fever leaderboard (Val.town)

A tiny HTTP val that holds the shared high-score board so the game can post
scores automatically — no backend to run, no terminal, no keys.

- `GET  /` → the current top-10 board, JSON `[{ "name": "ABC", "score": 123 }, ...]`
- `POST /` with body `{ "name": "ABC", "score": 123 }` → validates, folds it in,
  returns the updated board.

Storage is Val.town's built-in `blob` store, so there's nothing to provision.

## Deploy (browser only, ~2 minutes)

1. Go to **val.town** and sign in (GitHub works).
2. Click **New → HTTP val**.
3. Delete the starter code and paste the entire contents of
   [`valtown.ts`](./valtown.ts).
4. It deploys on save. Click the val's **URL** (the `…web.val.run` link) and copy
   it — that's your endpoint.
5. Send that URL back and it gets set as `SCORES_API` in the game. Done — every
   finished game posts automatically.

## Notes

- **CORS**: open to any origin by default. To lock it to your site, change
  `Access-Control-Allow-Origin` in `valtown.ts` to your Pages origin.
- **Seed**: the board starts with eight camp-name placeholders and replaces them
  as real scores arrive.
- **Anti-cheat**: like any client-submitted leaderboard, scores can be forged by
  POSTing straight to the endpoint. Add a shared-secret header if it ever matters.
