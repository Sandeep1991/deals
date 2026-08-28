import { useEffect, useRef, useState } from "react";
import { loadAds } from "./ads";
import { buildAssistantReply, hybridSearch } from "./search";
import type { Ad, Message } from "./types";
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
  const [ads, setAds] = useState<Ad[]>([]);
  const [loading, setLoading] = useState(false);
  const [adsLoaded, setAdsLoaded] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadAds()
      .then(setAds)
      .finally(() => setAdsLoaded(true));
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

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

    await new Promise((r) => setTimeout(r, 400));

    const results = hybridSearch(ads, trimmed);
    const assistantMsg: Message = {
      id: uid(),
      role: "assistant",
      content: buildAssistantReply(trimmed, results),
      ads: results.map((r) => r.ad),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, assistantMsg]);
    setLoading(false);
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
            <span className={`status-dot ${adsLoaded ? "online" : ""}`} />
            {adsLoaded ? `${ads.length} deals indexed` : "Loading deals…"}
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
          <ChatInput onSend={handleSend} disabled={loading || !adsLoaded} />
        </div>
      </main>
    </div>
  );
}
