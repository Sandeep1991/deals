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

export interface ProductQuote {
  item_name: string;
  merchant: string;
  ad: Ad;
  unit_price?: number | null;
  line_total?: number | null;
  source?: string;
}

export interface MerchantBasket {
  merchant: string;
  quotes: ProductQuote[];
  alternative_label?: string | null;
  subtotal?: number | null;
}

export interface CompareResponse {
  query: string;
  reply: string;
  ads: Ad[];
  event_summary?: string;
  recommended_merchant?: string | null;
  savings?: number | null;
  merchants?: MerchantBasket[];
}

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  ads?: Ad[];
  comparison?: CompareResponse;
  timestamp: Date;
}

export interface SearchResult {
  ad: Ad;
  score: number;
  keywordScore: number;
  semanticScore: number;
}
