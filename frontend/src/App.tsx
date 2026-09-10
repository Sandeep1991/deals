import { useEffect, useRef, useState } from "react";
import { ApiError, fetchChat, fetchHealth } from "./api";
import type { Message, PreferenceSummary } from "./types";
import { AdCard } from "./components/AdCard";
import { ChatInput } from "./components/ChatInput";
import { ChatSidebar } from "./components/ChatSidebar";
import { ComparisonSummary } from "./components/ComparisonSummary";
import { MessageBubble } from "./components/MessageBubble";
import {
  clearSessionHistory,
  createSession,
  deleteSession,
  historyForApi,
  listSessionSummaries,
  loadOrCreateSession,
  loadSession,
  persistMessages,
  setActiveChatId,
} from "./session";

function messageId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2);
}

export default function App() {
  const bootRef = useRef<ReturnType<typeof loadOrCreateSession> | null>(null);
  if (!bootRef.current) {
    bootRef.current = loadOrCreateSession();
  }
  const [chatId, setChatId] = useState(bootRef.current.chatId);
  const [messages, setMessages] = useState<Message[]>(bootRef.current.messages);
  const [preferenceSummary, setPreferenceSummary] = useState<PreferenceSummary | null>(
    bootRef.current.preferenceSummary ?? null
  );
  const [sessions, setSessions] = useState(() => listSessionSummaries());
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [apiReady, setApiReady] = useState(false);
  const [statusText, setStatusText] = useState("Connecting to API…");
  const bottomRef = useRef<HTMLDivElement>(null);

  const refreshSessions = () => setSessions(listSessionSummaries());

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, loading]);

  useEffect(() => {
    persistMessages(chatId, messages, preferenceSummary);
    refreshSessions();
  }, [chatId, messages, preferenceSummary]);

  useEffect(() => {
    let cancelled = false;

    async function checkHealth() {
      try {
        const health = await fetchHealth();
        if (cancelled) return;

        if (health.search_configured) {
          setApiReady(true);
          const compareHint = health.decompose_configured
            ? " · meal planning ready"
            : " · set up LLM for meal planning";
          setStatusText(`Search ready${compareHint}`);
        } else {
          setApiReady(false);
          setStatusText("API online — search not configured");
        }
      } catch (error) {
        if (cancelled) return;
        setApiReady(false);
        if (error instanceof ApiError && error.message.includes("not configured")) {
          setStatusText("API URL not configured");
        } else {
          setStatusText("API offline");
        }
        console.error("Health check failed:", error);
      }
    }

    checkHealth();
    return () => {
      cancelled = true;
    };
  }, []);

  const applySession = (session: {
    chatId: string;
    messages: Message[];
    preferenceSummary?: PreferenceSummary | null;
  }) => {
    setChatId(session.chatId);
    setMessages(session.messages);
    setPreferenceSummary(session.preferenceSummary ?? null);
    setActiveChatId(session.chatId);
    refreshSessions();
  };

  const handleNewChat = () => {
    if (loading) return;
    persistMessages(chatId, messages, preferenceSummary);
    const session = createSession();
    applySession(session);
    setSidebarOpen(false);
  };

  const handleSelectChat = (id: string) => {
    if (loading || id === chatId) {
      setSidebarOpen(false);
      return;
    }
    persistMessages(chatId, messages, preferenceSummary);
    const session = loadSession(id);
    if (!session) return;
    applySession(session);
    setSidebarOpen(false);
  };

  const handleDeleteChat = (id: string) => {
    if (loading) return;
    const next = deleteSession(id, { activeChatId: chatId });
    if (next) {
      applySession(next);
    } else {
      refreshSessions();
    }
  };

  const handleClearHistory = () => {
    if (loading) return;
    const session = clearSessionHistory(chatId);
    setMessages(session.messages);
    setPreferenceSummary(null);
    refreshSessions();
  };

  const handleSend = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    const userMsg: Message = {
      id: messageId(),
      role: "user",
      content: trimmed,
      timestamp: new Date(),
    };

    const prior = messages;
    const nextMessages = [...prior, userMsg];
    setMessages(nextMessages);
    setLoading(true);

    try {
      const history = historyForApi(nextMessages);
      const { reply, ads, comparison, chat_id, preference_summary } = await fetchChat(trimmed, {
        chatId,
        messages: history,
        preferenceSummary,
      });
      if (chat_id && chat_id !== chatId) {
        setChatId(chat_id);
      }
      if (preference_summary) {
        setPreferenceSummary(preference_summary);
      }
      const assistantMsg: Message = {
        id: messageId(),
        role: "assistant",
        content: reply,
        ads,
        comparison,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
      setApiReady(true);
      setStatusText("Search ready");
    } catch (error) {
      const detail =
        error instanceof ApiError
          ? error.message
          : "Something went wrong while searching. Please try again.";

      const assistantMsg: Message = {
        id: messageId(),
        role: "assistant",
        content: `Sorry, I couldn't reach the deals API. ${detail}`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
      setApiReady(false);
      setStatusText("API offline");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-shell">
      <ChatSidebar
        chats={sessions}
        activeChatId={chatId}
        open={sidebarOpen}
        disabled={loading}
        onClose={() => setSidebarOpen(false)}
        onNewChat={handleNewChat}
        onSelectChat={handleSelectChat}
        onDeleteChat={handleDeleteChat}
        onClearActive={handleClearHistory}
      />

      <div className="app">
        <div className="app-main-inner">
        <header className="header">
          <div className="header-inner">
            <div className="header-left">
              <button
                type="button"
                className="sidebar-toggle"
                onClick={() => setSidebarOpen((v) => !v)}
                aria-label="Open chat history"
                title="Chat history"
              >
                ☰
              </button>
              <div className="logo">
                <span className="logo-icon">🏷️</span>
                <div>
                  <h1>DealFinder</h1>
                  <p className="tagline">Hybrid search across partner deals</p>
                </div>
              </div>
            </div>
            <div className="header-actions">
              <button
                type="button"
                className="new-chat-btn"
                onClick={handleNewChat}
                disabled={loading}
                title="Start a new chat"
              >
                New chat
              </button>
              <div className="status" title={`Chat ${chatId}`}>
                <span className={`status-dot ${apiReady ? "online" : ""}`} />
                {statusText}
              </div>
            </div>
          </div>
        </header>

        <main className="chat">
          <div className="messages">
            {messages.map((msg) => (
              <div key={msg.id} className={`message-row ${msg.role}`}>
                <MessageBubble message={msg} />
                {msg.comparison && <ComparisonSummary comparison={msg.comparison} />}
                {msg.ads && msg.ads.length > 0 && (
                  <div className="ad-grid">
                    {msg.ads.map((ad) => (
                      <AdCard key={ad.id} ad={ad} />
                    ))}
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="message-row assistant">
                <div className="bubble assistant loading-bubble">
                  <span className="typing">
                    <span />
                    <span />
                    <span />
                  </span>
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          <div className="input-area">
            <div className="suggestions">
              {["black tea", "PBJ party deals", "taco night for 4", "coffee deals"].map((s) => (
                <button
                  key={s}
                  className="suggestion-chip"
                  onClick={() => handleSend(s)}
                  disabled={loading}
                >
                  {s}
                </button>
              ))}
            </div>
            <ChatInput onSend={handleSend} disabled={loading} />
          </div>
        </main>
        </div>
      </div>
    </div>
  );
}
