// ===========================================================================
// STEP 3 — Embeddings (text -> vector) with a FREE local model
// ---------------------------------------------------------------------------
// An "embedding" is a list of numbers that captures the *meaning* of a piece of
// text. Texts about similar ideas land close together in that number-space,
// even when they share no words. "king" is near "queen"; "ocean" is near "sea".
//
// We use Transformers.js, which runs the model directly in Node — no API key,
// no per-call cost, no data leaving your machine. The model (all-MiniLM-L6-v2)
// downloads once (~25 MB) on first run, then is cached locally.
// ===========================================================================

import { pipeline, type FeatureExtractionPipeline } from "@xenova/transformers";

// Loading the model takes a couple seconds, so we do it ONCE and reuse it.
// This promise is created lazily on the first embed() call (a singleton).
let extractorPromise: Promise<FeatureExtractionPipeline> | null = null;

function getExtractor(): Promise<FeatureExtractionPipeline> {
  if (!extractorPromise) {
    // "feature-extraction" is the task name for turning text into a vector.
    extractorPromise = pipeline(
      "feature-extraction",
      "Xenova/all-MiniLM-L6-v2",
    );
  }
  return extractorPromise;
}

// Turn one string into a 384-number embedding.
export async function embed(text: string): Promise<number[]> {
  const extractor = await getExtractor();

  // pooling: "mean"  -> average the per-token vectors into one sentence vector.
  // normalize: true  -> scale to length 1, so cosine distance behaves cleanly
  //                     (a normalized dot product == cosine similarity).
  const output = await extractor(text, { pooling: "mean", normalize: true });

  // `output.data` is a Float32Array; spread it into a plain number[] for pg.
  return Array.from(output.data as Float32Array);
}

// Embed many texts. all-MiniLM is small, so a simple sequential loop is fine
// and keeps memory flat — important on a 512 MB free server.
export async function embedMany(texts: string[]): Promise<number[][]> {
  const out: number[][] = [];
  for (const t of texts) {
    out.push(await embed(t));
  }
  return out;
}
