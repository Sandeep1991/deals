import adsText from "./data/ads.txt?raw";
import type { Ad } from "./types";

export function loadAds(): Ad[] {
  return parseAds(adsText);
}

function parseAds(text: string): Ad[] {
  const lines = text.trim().split("\n");
  const [, ...dataLines] = lines;

  return dataLines
    .filter((line) => line.trim().length > 0)
    .map((line) => {
      const [id, title, description, category, keywords, price, url] =
        line.split("|");
      return { id, title, description, category, keywords, price, url };
    });
}
