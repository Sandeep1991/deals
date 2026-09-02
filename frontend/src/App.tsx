import { useEffect, useRef, useState } from "react";
import { ApiError, fetchChat, fetchHealth } from "./api";
import type { Message } from "./types";
import { AdCard } from "./components/AdCard";
import { ChatInput } from "./components/ChatInput";
import { MessageBubble } from "./components/MessageBubble";

const WELCOME: Message = {
  id: "welcome",
  role: "assistant",
  content:
    "Hi! I'm DealFinder. Ask me about deals on anything — tea, soap, coffee, household items, and more. I'll search our partner offers and show you the best matches.",
  timestamp: new Date(),
};

function uid() {
  return Math.random().toString(36).slice(2);
}

export default function App() {
  const [messages, setMessages] = useState<Message[]>([WELCOME]);
  const [loading, setLoading] = useState(false);
  const [apiReady, setApiReady] = useState(false);
  const [statusText, setStatusText] = useState("Connecting to API…");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, loading]);

  useEffect(() => {
    let cancelled = false;

    async function checkHealth() {
      try {
        const health = await fetchHealth();
        if (cancelled) return;

        if (health.search_configured) {
          setApiReady(true);
          setStatusText("Search ready");
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

  const handleSend = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    const userMsg: Message = {
      id: uid(),
      role: "user",
      content: trimmed,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const { reply, ads } = await fetchChat(trimmed);
      const assistantMsg: Message = {
        id: uid(),
        role: "assistant",
        content: reply,
        ads,
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
        id: uid(),
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
    <div className="app">
      <header className="header">
        <div className="header-inner">
          <div className="logo">
            <span className="logo-icon">🏷️</span>
            <div>
              <h1>DealFinder</h1>
              <p className="tagline">Hybrid search across partner deals</p>
            </div>
          </div>
          <div className="status">
            <span className={`status-dot ${apiReady ? "online" : ""}`} />
            {statusText}
          </div>
        </div>
      </header>

      <main className="chat">
        <div className="messages">
          {messages.map((msg) => (
            <div key={msg.id} className={`message-row ${msg.role}`}>
              <MessageBubble message={msg} />
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
            {["black tea", "soap", "coffee deals", "household"].map((s) => (
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
  );
}
