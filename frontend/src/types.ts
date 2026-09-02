export interface Ad {
  id: string;
  title: string;
  description: string;
  category: string;
  keywords: string;
  price: string;
  url: string;
  merchant?: string;
}

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  ads?: Ad[];
  timestamp: Date;
}

export interface SearchResult {
  ad: Ad;
  score: number;
  keywordScore: number;
  semanticScore: number;
}
