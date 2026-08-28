import type { Ad } from "./types";

const STOP_WORDS = new Set([
  "a", "an", "the", "is", "are", "was", "were", "be", "been", "being",
  "have", "has", "had", "do", "does", "did", "will", "would", "could",
  "should", "may", "might", "must", "shall", "can", "need", "dare",
  "ought", "used", "to", "of", "in", "for", "on", "with", "at", "by",
  "from", "as", "into", "through", "during", "before", "after", "above",
  "below", "between", "out", "off", "over", "under", "again", "further",
  "then", "once", "here", "there", "when", "where", "why", "how", "all",
  "each", "few", "more", "most", "other", "some", "such", "no", "nor",
  "not", "only", "own", "same", "so", "than", "too", "very", "just",
  "don", "now", "and", "but", "or", "if", "while", "about", "what",
  "which", "who", "whom", "this", "that", "these", "those", "am", "i",
  "you", "he", "she", "it", "we", "they", "me", "him", "her", "us", "them",
  "my", "your", "his", "its", "our", "their", "any", "good", "best",
  "deal", "deals", "find", "show", "get", "looking", "want", "like",
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1 && !STOP_WORDS.has(t));
}

function keywordScore(queryTokens: string[], ad: Ad): number {
  const searchable = [
    ad.title,
    ad.description,
    ad.category,
    ad.keywords,
  ]
    .join(" ")
    .toLowerCase();

  let score = 0;
  for (const token of queryTokens) {
    if (searchable.includes(token)) {
      score += 1;
    }
    if (ad.keywords.toLowerCase().includes(token)) {
      score += 0.5;
    }
    if (ad.title.toLowerCase().includes(token)) {
      score += 0.3;
    }
  }
  return score / Math.max(queryTokens.length, 1);
}

function semanticScore(queryTokens: string[], ad: Ad): number {
  const adTokens = new Set(
    tokenize([ad.title, ad.description, ad.keywords, ad.category].join(" "))
  );

  if (queryTokens.length === 0 || adTokens.size === 0) return 0;

  let overlap = 0;
  for (const token of queryTokens) {
    if (adTokens.has(token)) overlap++;
    for (const adToken of adTokens) {
      if (adToken.includes(token) || token.includes(adToken)) {
        overlap += 0.3;
      }
    }
  }

  return overlap / queryTokens.length;
}

export function hybridSearch(ads: Ad[], query: string, limit = 5) {
  const queryTokens = tokenize(query);
  if (queryTokens.length === 0) return [];

  const results = ads
    .map((ad) => {
      const kw = keywordScore(queryTokens, ad);
      const sem = semanticScore(queryTokens, ad);
      const score = kw * 0.6 + sem * 0.4;
      return { ad, score, keywordScore: kw, semanticScore: sem };
    })
    .filter((r) => r.score > 0.1)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return results;
}

export function buildAssistantReply(
  query: string,
  results: ReturnType<typeof hybridSearch>
): string {
  if (results.length === 0) {
    return `I couldn't find deals matching "${query}". Try searching for things like tea, soap, coffee, or household items.`;
  }

  const top = results[0];
  const count = results.length;
  const plural = count === 1 ? "deal" : "deals";

  return `I found ${count} ${plural} for "${query}". ${
    top.score > 0.5
      ? `The best match looks like **${top.ad.title}** at ${top.ad.price}.`
      : "Here are the closest matches I found:"
  } Click any deal below to visit the offer site.`;
}
