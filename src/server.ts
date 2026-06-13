// ===========================================================================
// STEP 6 — The semantic search API
// ---------------------------------------------------------------------------
// The whole point. A user types a phrase ("animals that live in the ocean").
// We embed that phrase with the SAME model used to embed the articles, then ask
// Postgres for the rows whose vectors are closest. Matching is by MEANING, so
// an article titled "Blue whale" can rank top even if it never says "ocean".
//
// The magic operator is `<=>` — pgvector's cosine distance. Smaller = closer.
// `1 - (a <=> b)` converts that distance into a 0..1 similarity score.
// ===========================================================================

import "dotenv/config";
import express from "express";
import { pool, initSchema, toVectorLiteral } from "./db.js";
import { embed } from "./embeddings.js";

const app = express();
const PORT = Number(process.env.PORT ?? 3000);

// Serve the little search UI from /public (STEP 7).
app.use(express.static("public"));

// Health check — handy for uptime probes / deploy platforms.
app.get("/healthz", (_req, res) => res.json({ ok: true }));

// GET /api/search?q=...&limit=5
app.get("/api/search", async (req, res) => {
  const q = String(req.query.q ?? "").trim();
  const limit = Math.min(Number(req.query.limit ?? 5), 20);
  if (!q) return res.status(400).json({ error: "Pass ?q=your+search" });

  try {
    // 1. Turn the query text into a vector with the same model as the corpus.
    const queryVec = toVectorLiteral(await embed(q));

    // 2. Let Postgres rank rows by cosine distance to that vector.
    //    ORDER BY embedding <=> query  -> nearest neighbours first.
    const { rows } = await pool.query(
      `SELECT title, url, summary,
              1 - (embedding <=> $1::vector) AS similarity
       FROM articles
       ORDER BY embedding <=> $1::vector
       LIMIT $2`,
      [queryVec, limit],
    );

    res.json({ query: q, results: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "search failed" });
  }
});

// Bind the port first, then warm up the DB in the background so the process is
// reachable immediately (deploy platforms probe the port within seconds).
app.listen(PORT, () => {
  console.log(`▶ pgvector-from-zero on http://localhost:${PORT}`);
  initSchema()
    .then(() => console.log("✓ schema ready — run `npm run seed` if empty"))
    .catch((e) => console.error("schema init failed:", e));
});
