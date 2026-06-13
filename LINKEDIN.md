Day 45 - How does AI "understand" what you mean? Today I built the answer from scratch.


🚀 TechFromZero Series - pgvectorFromZero


Type "animals that live in the ocean" into normal search and a page titled "Blue whale" — which never uses those words — is missed.


Today I fixed that. I built a search engine that matches on MEANING, not keywords. No API key, no cost, nothing leaves your machine.


This isn't a Hello World. It's the foundation under every "AI that knows your data" product:
📐 query text → embed into 384 numbers → Postgres ranks by cosine distance → results by meaning


🔗 The full code (with step-by-step commits you can follow):
https://github.com/dev48v/pgvector-from-zero


🧱 What I built (step by step):

1️⃣ Postgres with the pgvector extension + a real vector(384) column

2️⃣ Free, local embeddings with Transformers.js (no key, no cloud)

3️⃣ A searchable corpus pulled from the public Wikipedia API

4️⃣ A seed step: embed every article, store the vector next to the text

5️⃣ Semantic search with one operator — pgvector's <=> cosine distance

6️⃣ An HNSW index so it stays fast into the millions of rows

7️⃣ A tiny no-build UI that ranks results by similarity score

8️⃣ The takeaway: this IS the retrieval half of RAG


💡 The two ideas here — embeddings (meaning → numbers) and vector search (nearest = most similar) — are THE concepts to understand before anything else in AI. Get these and "chat with your docs" stops being magic. Every file has detailed comments explaining WHY, not just what.


👉 If you're new to AI, clone it and read the commits one by one. Each commit = one concept. Built from scratch, so nothing is hidden.


🔥 This is Day 45 of a 50-day series. A new technology every day. Follow along!


🌐 See all days: https://dev48v.infy.uk/techfromzero.php


#TechFromZero #Day45 #pgvector #LearnByDoing #OpenSource #BeginnerGuide #100DaysOfCode #CodingFromScratch
