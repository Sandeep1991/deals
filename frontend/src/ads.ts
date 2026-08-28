import type { Ad } from "./types";

export async function loadAds(): Promise<Ad[]> {
  const response = await fetch("/data/ads.txt");
  const text = await response.text();
  return parseAds(text);
}

function parseAds(text: string): Ad[] {
  const lines = text.trim().split("\n");
  const [, ...dataLines] = lines;

  return dataLines.map((line) => {
    const [id, title, description, category, keywords, price, url] =
      line.split("|");
    return { id, title, description, category, keywords, price, url };
  });
}
