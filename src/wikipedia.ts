// ===========================================================================
// STEP 4 — Build a corpus from Wikipedia (free, no API key)
// ---------------------------------------------------------------------------
// To search something, we first need a pile of text. Wikipedia exposes a public
// REST API with zero auth. We grab a batch of random article summaries and use
// those as our searchable corpus.
// ===========================================================================

export interface Article {
  title: string;
  url: string;
  summary: string;
}

// The REST summary endpoint returns a clean { title, extract, content_urls }.
// /page/random/summary gives a different random article every call.
const RANDOM_SUMMARY_URL =
  "https://en.wikipedia.org/api/rest_v1/page/random/summary";

// Fetch one random article summary. Returns null for the occasional empty /
// disambiguation page so the caller can just skip it.
async function fetchRandomArticle(): Promise<Article | null> {
  const res = await fetch(RANDOM_SUMMARY_URL, {
    headers: {
      // Wikipedia asks every client to identify itself in the User-Agent.
      "User-Agent": "pgvector-from-zero/1.0 (learning demo)",
      Accept: "application/json",
    },
  });
  if (!res.ok) return null;

  const data = (await res.json()) as {
    title?: string;
    extract?: string;
    type?: string;
    content_urls?: { desktop?: { page?: string } };
  };

  // Skip disambiguation pages and stubs with no real summary text.
  if (data.type === "disambiguation") return null;
  if (!data.title || !data.extract || data.extract.length < 40) return null;

  return {
    title: data.title,
    summary: data.extract,
    url: data.content_urls?.desktop?.page ?? "",
  };
}

// Collect `count` unique articles. We de-dupe on title because /random can
// repeat, and we cap attempts so a run of bad pages can't loop forever.
export async function fetchArticles(count: number): Promise<Article[]> {
  const seen = new Set<string>();
  const articles: Article[] = [];
  let attempts = 0;
  // /random returns plenty of stubs + disambiguation pages we skip, so give the
  // loop generous headroom to still reach `count` good articles.
  const maxAttempts = count * 8;

  while (articles.length < count && attempts < maxAttempts) {
    attempts++;
    const a = await fetchRandomArticle();
    if (!a || seen.has(a.title)) continue;
    seen.add(a.title);
    articles.push(a);
    if (articles.length % 25 === 0) {
      console.log(`  fetched ${articles.length}/${count} articles...`);
    }
  }

  return articles;
}
