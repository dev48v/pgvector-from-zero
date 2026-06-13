// ===========================================================================
// STEP 5 — Seed the database (fetch -> embed -> store)
// ---------------------------------------------------------------------------
// This script runs once to fill the `articles` table. For every Wikipedia
// summary it: (1) computes the embedding, (2) inserts the row with its vector.
// Run it with:  npm run seed
// ===========================================================================

import "dotenv/config"; // loads .env into process.env
import { pool, initSchema, toVectorLiteral } from "./db.js";
import { embed } from "./embeddings.js";
import { fetchArticles } from "./wikipedia.js";

async function main() {
  const limit = Number(process.env.SEED_LIMIT ?? 300);

  console.log("→ Ensuring schema + pgvector extension...");
  await initSchema();

  // Start clean so re-seeding doesn't pile up duplicates.
  await pool.query("TRUNCATE articles RESTART IDENTITY");

  console.log(`→ Fetching ${limit} Wikipedia articles...`);
  const articles = await fetchArticles(limit);

  console.log(`→ Embedding + inserting ${articles.length} articles...`);
  let i = 0;
  for (const a of articles) {
    // We embed title + summary together so the vector reflects both.
    const vector = await embed(`${a.title}. ${a.summary}`);
    await pool.query(
      `INSERT INTO articles (title, url, summary, embedding)
       VALUES ($1, $2, $3, $4::vector)`,
      [a.title, a.url, a.summary, toVectorLiteral(vector)],
    );
    if (++i % 25 === 0) console.log(`  stored ${i}/${articles.length}`);
  }

  const { rows } = await pool.query("SELECT COUNT(*)::int AS n FROM articles");
  console.log(`✓ Done. ${rows[0].n} articles are now searchable by meaning.`);
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
