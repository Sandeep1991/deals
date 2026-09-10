import type { Ad, ChatHistoryTurn, CompareResponse, PreferenceSummary } from "./types";

const PRODUCTION_API_URL =
  "https://deals-backend-h0czfaf0c0cjbmh5.canadacentral-01.azurewebsites.net";

const API_URL = (
  import.meta.env.VITE_API_URL?.replace(/\/$/, "") ||
  (import.meta.env.PROD ? PRODUCTION_API_URL : "")
).replace(/\/$/, "");

export class ApiError extends Error {
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export interface HealthResponse {
  status: string;
  search_configured: boolean;
  reply_provider: string;
  decompose_configured?: boolean;
  decompose_provider?: string;
}

export interface ChatResponse {
  query: string;
  reply: string;
  ads: Ad[];
  mode?: string;
  comparison?: CompareResponse;
  chat_id?: string | null;
  preference_summary?: PreferenceSummary | null;
}

export interface ChatRequestBody {
  query: string;
  limit?: number;
  mode?: string;
  chat_id?: string;
  messages?: ChatHistoryTurn[];
  preference_summary?: PreferenceSummary | null;
}

function ensureApiUrl(): string {
  if (!API_URL) {
    throw new ApiError(
      "API URL is not configured. Set VITE_API_URL in frontend/.env.development or frontend/.env.production."
    );
  }
  return API_URL;
}

export async function fetchHealth(): Promise<HealthResponse> {
  const base = ensureApiUrl();
  const response = await fetch(`${base}/health`);
  if (!response.ok) {
    throw new ApiError(`Health check failed (${response.status})`, response.status);
  }
  return response.json() as Promise<HealthResponse>;
}

export async function fetchChat(
  query: string,
  options?: {
    limit?: number;
    chatId?: string;
    messages?: ChatHistoryTurn[];
    mode?: string;
    preferenceSummary?: PreferenceSummary | null;
  }
): Promise<ChatResponse> {
  const base = ensureApiUrl();
  const body: ChatRequestBody = {
    query,
    limit: options?.limit ?? 5,
  };
  if (options?.mode) body.mode = options.mode;
  if (options?.chatId) body.chat_id = options.chatId;
  if (options?.messages?.length) body.messages = options.messages;
  if (options?.preferenceSummary) body.preference_summary = options.preferenceSummary;

  const response = await fetch(`${base}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    let detail = `Request failed (${response.status})`;
    try {
      const errBody = (await response.json()) as { detail?: string };
      if (errBody.detail) detail = errBody.detail;
    } catch {
      // ignore JSON parse errors
    }
    throw new ApiError(detail, response.status);
  }

  return response.json() as Promise<ChatResponse>;
}

export async function fetchCompare(query: string): Promise<CompareResponse> {
  const base = ensureApiUrl();
  const response = await fetch(`${base}/api/compare`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });

  if (!response.ok) {
    let detail = `Request failed (${response.status})`;
    try {
      const errBody = (await response.json()) as { detail?: string };
      if (errBody.detail) detail = errBody.detail;
    } catch {
      // ignore JSON parse errors
    }
    throw new ApiError(detail, response.status);
  }

  return response.json() as Promise<CompareResponse>;
}
