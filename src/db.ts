// ===========================================================================
// STEP 2 — Postgres + pgvector
// ---------------------------------------------------------------------------
// pgvector is a Postgres extension that adds a real `vector` column type plus
// distance operators (<=> cosine, <-> L2, <#> inner product) and indexes (HNSW,
// IVFFlat). That means we can store an embedding next to a row and let Postgres
// do the nearest-neighbour math — no separate vector database needed.
// ===========================================================================

import pg from "pg";

const { Pool } = pg;

// One shared connection pool for the whole app. `max: 5` is plenty for a demo
// and stays well under Postgres' default 100-connection ceiling.
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 5,
  // Managed hosts (Render, Supabase, Neon...) require TLS; localhost doesn't.
  ssl: /localhost|127\.0\.0\.1/.test(process.env.DATABASE_URL ?? "")
    ? false
    : { rejectUnauthorized: false },
});

// all-MiniLM-L6-v2 (our embedding model in STEP 3) outputs 384 numbers per text.
// The vector column dimension MUST match the model exactly, so we keep it in one
// place and import it everywhere.
export const EMBEDDING_DIMS = 384;

// Run once at startup. `CREATE EXTENSION IF NOT EXISTS vector` is the line that
// "turns on" pgvector for this database. Everything after it is ordinary SQL.
export async function initSchema(): Promise<void> {
  await pool.query(`CREATE EXTENSION IF NOT EXISTS vector`);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS articles (
      id        SERIAL PRIMARY KEY,
      title     TEXT NOT NULL,
      url       TEXT NOT NULL,
      summary   TEXT NOT NULL,
      -- The star of the show: a 384-dimension vector living in the same row.
      embedding vector(${EMBEDDING_DIMS}) NOT NULL
    )
  `);

  // An approximate-nearest-neighbour index. Without it, a search scans every
  // row (fine for a few hundred). With it, search stays fast into the millions.
  // vector_cosine_ops tells the index we'll query with the <=> cosine operator.
  await pool.query(`
    CREATE INDEX IF NOT EXISTS articles_embedding_idx
    ON articles USING hnsw (embedding vector_cosine_ops)
  `);
}

// Helper: turn a JS number[] into the text literal pgvector expects: '[0.1,0.2]'.
export function toVectorLiteral(vec: number[]): string {
  return `[${vec.join(",")}]`;
}
