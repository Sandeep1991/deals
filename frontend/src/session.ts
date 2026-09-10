import type { CompareResponse, Message, PreferenceSummary } from "./types";

const ACTIVE_KEY = "deals.activeChatId";
const CHATS_KEY = "deals.chats";
const MAX_CHATS = 20;
const MAX_HISTORY_TURNS = 12;

export interface ChatSession {
  chatId: string;
  title: string;
  updatedAt: string;
  messages: Message[];
  preferenceSummary?: PreferenceSummary | null;
}

type StoredMessage = Omit<Message, "timestamp"> & { timestamp: string };

type StoredSession = Omit<ChatSession, "messages" | "preferenceSummary"> & {
  messages: StoredMessage[];
  preferenceSummary?: PreferenceSummary | null;
};

function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `chat-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function createWelcomeMessage(): Message {
  return {
    id: "welcome",
    role: "assistant",
    content:
      "Hi! I'm DealFinder. Ask me about deals on anything — tea, soap, coffee, household items, and more. I'll search our partner offers and show you the best matches.",
    timestamp: new Date(),
  };
}

function serializeMessage(msg: Message): StoredMessage {
  return {
    ...msg,
    timestamp: msg.timestamp instanceof Date ? msg.timestamp.toISOString() : String(msg.timestamp),
  };
}

function deserializeMessage(msg: StoredMessage): Message {
  return {
    ...msg,
    timestamp: new Date(msg.timestamp),
  };
}

function readAll(): Record<string, StoredSession> {
  try {
    const raw = localStorage.getItem(CHATS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, StoredSession>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeAll(chats: Record<string, StoredSession>) {
  localStorage.setItem(CHATS_KEY, JSON.stringify(chats));
}

function titleFromMessages(messages: Message[]): string {
  const firstUser = messages.find((m) => m.role === "user" && m.content.trim());
  if (!firstUser) return "New chat";
  const text = firstUser.content.trim().replace(/\s+/g, " ");
  return text.length > 48 ? `${text.slice(0, 45)}…` : text;
}

export function getActiveChatId(): string | null {
  try {
    return localStorage.getItem(ACTIVE_KEY);
  } catch {
    return null;
  }
}

export function setActiveChatId(chatId: string) {
  localStorage.setItem(ACTIVE_KEY, chatId);
}

export function loadSession(chatId: string): ChatSession | null {
  const stored = readAll()[chatId];
  if (!stored) return null;
  return {
    chatId: stored.chatId,
    title: stored.title,
    updatedAt: stored.updatedAt,
    messages: (stored.messages || []).map(deserializeMessage),
    preferenceSummary: stored.preferenceSummary ?? null,
  };
}

export function saveSession(session: ChatSession): void {
  const chats = readAll();
  chats[session.chatId] = {
    chatId: session.chatId,
    title: session.title || titleFromMessages(session.messages),
    updatedAt: new Date().toISOString(),
    messages: session.messages.map(serializeMessage),
    preferenceSummary: session.preferenceSummary ?? null,
  };

  // Cap stored chats by recency
  const ordered = Object.values(chats).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const trimmed: Record<string, StoredSession> = {};
  for (const s of ordered.slice(0, MAX_CHATS)) {
    trimmed[s.chatId] = s;
  }
  writeAll(trimmed);
  setActiveChatId(session.chatId);
}

export function createSession(): ChatSession {
  const session: ChatSession = {
    chatId: newId(),
    title: "New chat",
    updatedAt: new Date().toISOString(),
    messages: [createWelcomeMessage()],
    preferenceSummary: null,
  };
  saveSession(session);
  return session;
}

/** Load active chat from the browser, or create a fresh UUID session. */
export function loadOrCreateSession(): ChatSession {
  const activeId = getActiveChatId();
  if (activeId) {
    const existing = loadSession(activeId);
    if (existing && existing.messages.length > 0) {
      return existing;
    }
  }
  return createSession();
}

export function listSessions(): ChatSession[] {
  return Object.values(readAll())
    .map((s) => ({
      chatId: s.chatId,
      title: s.title,
      updatedAt: s.updatedAt,
      messages: (s.messages || []).map(deserializeMessage),
      preferenceSummary: s.preferenceSummary ?? null,
    }))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

/** Text-only prior turns for the API (LangChain-style session memory payload). */
export function historyForApi(
  messages: Message[],
  opts?: { maxTurns?: number; excludeWelcome?: boolean }
): { role: "user" | "assistant"; content: string }[] {
  const maxTurns = opts?.maxTurns ?? MAX_HISTORY_TURNS;
  const excludeWelcome = opts?.excludeWelcome ?? true;
  const textTurns = messages.filter((m) => {
    if (!m.content?.trim()) return false;
    if (excludeWelcome && m.id === "welcome") return false;
    return m.role === "user" || m.role === "assistant";
  });
  return textTurns.slice(-maxTurns).map((m) => ({
    role: m.role,
    content: m.content.trim(),
  }));
}

export function persistMessages(
  chatId: string,
  messages: Message[],
  preferenceSummary?: PreferenceSummary | null
): ChatSession {
  const existing = loadSession(chatId);
  const session: ChatSession = {
    chatId,
    title: titleFromMessages(messages),
    updatedAt: new Date().toISOString(),
    messages,
    preferenceSummary:
      preferenceSummary !== undefined
        ? preferenceSummary
        : existing?.preferenceSummary ?? null,
  };
  saveSession(session);
  return session;
}

/** Reset one chat to the welcome message (keeps the same chatId). */
export function clearSessionHistory(chatId: string): ChatSession {
  const session: ChatSession = {
    chatId,
    title: "New chat",
    updatedAt: new Date().toISOString(),
    messages: [createWelcomeMessage()],
    preferenceSummary: null,
  };
  saveSession(session);
  return session;
}

/** Wipe all stored chats from the browser and start a fresh UUID session. */
export function clearAllSessionHistory(): ChatSession {
  try {
    localStorage.removeItem(CHATS_KEY);
    localStorage.removeItem(ACTIVE_KEY);
  } catch {
    // ignore quota / private-mode errors
  }
  return createSession();
}

export type { CompareResponse };
