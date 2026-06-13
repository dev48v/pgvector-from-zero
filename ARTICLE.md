---
title: "I Built a Search Engine That Understands Meaning — in ~150 Lines, Zero API Keys"
published: false
description: "Embeddings + Postgres pgvector, explained from zero. Search Wikipedia by meaning, not keywords, with a free local model. Day 45 of TechFromZero."
tags: ai, postgres, beginners, tutorial
cover_image: ""
canonical_url: ""
---

Type **"animals that live in the ocean"** into a normal search box and it hunts
for the words *animals*, *live*, *ocean*. An article titled **"Blue whale"** that
never uses any of those words? Missed.

Today we fix that. We'll build a search engine that matches on **meaning**, so
*"animals that live in the ocean"* surfaces **Blue whale** and **Coral reef** —
no shared keywords required.

The whole thing is a few hundred lines, runs on free tooling, and needs **no API
key**. The two ideas you'll walk away understanding are the foundation under every
"AI that knows your data" product: **embeddings** and **vector search**.

This is Day 45 of my TechFromZero series — one new technology every day, built
from scratch, every line explained.

## The one idea: meaning becomes numbers

An **embedding** is a list of numbers that captures what a piece of text *means*.
A good embedding model places texts about similar ideas close together in that
number-space, even when they share no words:

- "king" sits near "queen"
- "ocean" sits near "sea"
- "Blue whale" sits near "animals that live in the ocean"

Our model, `all-MiniLM-L6-v2`, turns any text into **384 numbers**. It runs
locally through [Transformers.js](https://huggingface.co/docs/transformers.js) —
downloads once (~25 MB), then costs nothing and sends nothing to the cloud.

```ts
import { pipeline } from "@xenova/transformers";

const extractor = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2");

// pooling:"mean" -> one vector per sentence; normalize:true -> cosine-ready
const output = await extractor("Blue whale", { pooling: "mean", normalize: true });
const vector = Array.from(output.data); // [0.013, -0.05, ... ] 384 of them
```

## Where do you store 384 numbers per row? pgvector.

You *could* keep a separate vector database. But if your data already lives in
Postgres, [pgvector](https://github.com/pgvector/pgvector) adds a real `vector`
column type and the distance math right inside Postgres. One database, no extra
bill.

```sql
CREATE EXTENSION IF NOT EXISTS vector;   -- turn pgvector on

CREATE TABLE articles (
  id        SERIAL PRIMARY KEY,
  title     TEXT,
  summary   TEXT,
  embedding vector(384)                  -- <-- 384 must match the model
);

-- an approximate-nearest-neighbour index so search stays fast at scale
CREATE INDEX ON articles USING hnsw (embedding vector_cosine_ops);
```

The official `pgvector/pgvector:pg16` Docker image has the extension baked in, so
local setup is one line:

```bash
docker compose up -d
```

## Fill it with something to search

We need a pile of text. Wikipedia's REST API is public and keyless — its
`/page/random/summary` endpoint hands back a clean title + extract. We pull a few
hundred, embed each, and insert the row with its vector:

```ts
const vector = await embed(`${a.title}. ${a.summary}`);
await pool.query(
  `INSERT INTO articles (title, url, summary, embedding)
   VALUES ($1, $2, $3, $4::vector)`,
  [a.title, a.url, a.summary, `[${vector.join(",")}]`]
);
```

(pgvector accepts a vector as the text literal `[0.1,0.2,...]` — that's the
`$4::vector` cast.)

## The search itself

Here's the payoff. Embed the user's query with the **same** model, then let
Postgres rank rows by how close their vectors are. The magic operator is `<=>` —
**cosine distance**. Smaller means closer; `1 - distance` gives a tidy 0–1
similarity score.

```ts
const queryVec = `[${(await embed(userQuery)).join(",")}]`;

const { rows } = await pool.query(
  `SELECT title, url, summary,
          1 - (embedding <=> $1::vector) AS similarity
   FROM articles
   ORDER BY embedding <=> $1::vector      -- nearest neighbours first
   LIMIT 5`,
  [queryVec]
);
```

That's it. No keyword index, no synonyms list, no stemming rules. The model
already learned that whales live in oceans.

## Try it

Searching *"famous battles in history"* in my 300-article corpus returns
Napoleonic engagements and ancient sieges — articles that never contain the word
"famous". Searching *"how the brain works"* surfaces neuroscience pages that say
"neuron" and "cortex", not "brain works".

```
animals that live in the ocean
  92.1%  Blue whale
  88.4%  Coral reef
  85.0%  Sea otter
```

## Why this matters

This tiny project *is* the core of every "chat with your docs" / "AI that knows
your data" feature. Retrieval-Augmented Generation (RAG) is literally:

1. embed your documents → store the vectors (today's project)
2. embed the question → find the closest chunks (today's project)
3. hand those chunks to an LLM and ask it to answer using only them (one more step)

Get embeddings + vector search, and RAG stops being mysterious.

## Build it yourself

```bash
git clone https://github.com/dev48v/pgvector-from-zero.git
cd pgvector-from-zero
npm install
cp .env.example .env
docker compose up -d
npm run seed
npm run dev      # http://localhost:3000
```

Every file has STEP headers and WHY comments, and the commits are ordered one
concept at a time — clone it and read them top to bottom.

**Repo:** https://github.com/dev48v/pgvector-from-zero

This was Day 45 of TechFromZero. A new technology every day, built from scratch.
Follow along — tomorrow's pick lands next.
