# pgvector from zero — Semantic Wikipedia Search

Search a few hundred Wikipedia articles **by meaning, not keywords**, using
Postgres + the [pgvector](https://github.com/pgvector/pgvector) extension and a
**free, local** embedding model (no API key, nothing leaves your machine).

Type *"animals that live in the ocean"* and get back **Blue whale** and
**Coral reef** — even though your query shares no words with them.

```
query text ──embed──▶ [384 numbers] ──▶ Postgres: ORDER BY embedding <=> query ──▶ ranked articles
```

---

## Quick start

You need [Node 20+](https://nodejs.org) and [Docker](https://docker.com)
(Docker just runs Postgres — nothing else).

```bash
git clone https://github.com/dev48v/pgvector-from-zero.git
cd pgvector-from-zero
npm install

cp .env.example .env          # defaults already match docker-compose
docker compose up -d          # Postgres with pgvector, ready in ~5s

npm run seed                  # fetch + embed ~300 Wikipedia articles (first run downloads the 25 MB model)
npm run dev                   # http://localhost:3000
```

Open `http://localhost:3000`, type a *meaning*, and watch articles rank by a
similarity score.

---

## How it works (the whole idea in 4 steps)

1. **Embedding** — `all-MiniLM-L6-v2` turns any text into 384 numbers that
   capture its meaning. Similar meanings → nearby vectors. ([`src/embeddings.ts`](src/embeddings.ts))
2. **Storage** — pgvector adds a real `vector(384)` column type to Postgres, so
   each article keeps its embedding right next to its text. ([`src/db.ts`](src/db.ts))
3. **Seeding** — we pull random Wikipedia summaries, embed each, and insert the
   row + vector. ([`src/seed.ts`](src/seed.ts))
4. **Search** — embed the user's query with the *same* model, then
   `ORDER BY embedding <=> query` to get nearest neighbours by cosine distance.
   ([`src/server.ts`](src/server.ts))

The one operator that does the magic:

```sql
SELECT title, 1 - (embedding <=> $1::vector) AS similarity
FROM articles
ORDER BY embedding <=> $1::vector   -- <=> is cosine distance; smaller = closer
LIMIT 5;
```

## Step-by-step commits

Each commit on `main` adds exactly one concept — read them in order:

1. Project setup (Node, TypeScript via `tsx`, docker-compose for Postgres)
2. Postgres + pgvector schema (`CREATE EXTENSION vector`, `vector(384)`, HNSW index)
3. Embeddings with Transformers.js (free, local, no key)
4. Build a corpus from the public Wikipedia REST API
5. Seed: fetch → embed → store
6. The semantic search API (`<=>` cosine distance)
7. A no-build search UI
8. Docs

## Why these choices

- **Local embeddings** (Transformers.js) so anyone can run this for free, today.
  Swap in OpenAI / Cohere / Voyage later by changing one function — just keep the
  column dimension in sync with the model.
- **pgvector, not a dedicated vector DB.** If your data already lives in
  Postgres, you get vector search without adding Pinecone/Weaviate to the bill.
- **HNSW index** so search stays fast as the corpus grows past a few hundred rows.

## Going further

- Add an **answer** layer: take the top results and feed them to an LLM ("answer
  using only this context") — that's Retrieval-Augmented Generation (RAG).
- Chunk long documents before embedding instead of one summary per row.
- Try the `<#>` (inner product) or `<->` (L2) operators for different similarity
  notions.

## License

MIT
