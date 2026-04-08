"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";

interface Message {
  role: "user" | "assistant";
  content: string;
  articles?: { id: string; title: string; severity: string }[];
}

const SEVERITY_COLORS: Record<string, string> = {
  critical: "bg-error/20 text-error",
  high: "bg-tertiary/20 text-tertiary",
  medium: "bg-primary/20 text-primary",
  low: "bg-secondary/20 text-secondary",
  info: "bg-surface-container-high text-on-surface-variant",
};

function parseArticleLinks(text: string): React.ReactNode[] {
  // Convert [ARTICLE:id:title] to clickable links
  const parts = text.split(/\[ARTICLE:([^:]+):([^\]]+)\]/g);
  const nodes: React.ReactNode[] = [];

  for (let i = 0; i < parts.length; i++) {
    if (i % 3 === 0) {
      // Regular text — convert markdown-like formatting
      if (parts[i]) {
        nodes.push(
          <span key={i} dangerouslySetInnerHTML={{
            __html: parts[i]
              .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
              .replace(/\n/g, "<br/>")
          }} />
        );
      }
    } else if (i % 3 === 1) {
      // Article ID
      const id = parts[i];
      const title = parts[i + 1] || "";
      nodes.push(
        <Link
          key={`link-${i}`}
          href={`/article/${id}`}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors mx-0.5"
        >
          <span className="material-symbols-outlined text-xs">article</span>
          {title}
        </Link>
      );
    }
    // i % 3 === 2 is the title part, already consumed above
  }

  return nodes;
}

export function ChatBubble() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  async function handleSend() {
    const text = input.trim();
    if (!text || loading) return;

    const userMessage: Message = { role: "user", content: text };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          history: messages.slice(-10).map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: data.reply,
            articles: data.articles,
          },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: data.error || "Sorry, something went wrong. Please try again.",
          },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Network error. Please check your connection." },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* Chat Window */}
      {open && (
        <div className="fixed bottom-24 right-4 lg:right-8 w-[360px] max-w-[calc(100vw-2rem)] h-[520px] max-h-[calc(100vh-8rem)] rounded-2xl bg-surface-container border border-outline-variant/20 shadow-2xl z-50 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-surface-container-low border-b border-outline-variant/10">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                <span className="material-symbols-outlined text-primary text-lg">smart_toy</span>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-on-surface">Sentinel AI</h3>
                <p className="text-[10px] text-on-surface-variant">Cybersecurity Assistant</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setMessages([])}
                className="p-1.5 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors"
                title="Clear chat"
              >
                <span className="material-symbols-outlined text-sm">delete_sweep</span>
              </button>
              <button
                onClick={() => setOpen(false)}
                className="p-1.5 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors"
              >
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="material-symbols-outlined text-primary text-2xl">auto_awesome</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-on-surface">How can I help?</p>
                  <p className="text-xs text-on-surface-variant mt-1 max-w-[240px]">
                    Ask about threats in the platform, or get cybersecurity advice
                  </p>
                </div>
                <div className="flex flex-wrap justify-center gap-1.5 mt-2">
                  {[
                    "Recent ransomware threats?",
                    "Any critical vulnerabilities?",
                    "APT group activity",
                    "Zero-day this week?",
                  ].map((q) => (
                    <button
                      key={q}
                      onClick={() => { setInput(q); }}
                      className="px-2.5 py-1 rounded-full bg-surface-container-high text-[10px] text-on-surface-variant hover:text-on-surface hover:bg-surface-container-highest transition-colors"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "bg-primary text-[#263046] rounded-br-md"
                      : "bg-surface-container-high text-on-surface rounded-bl-md"
                  }`}
                >
                  {msg.role === "assistant" ? (
                    <div className="space-y-2">
                      <div className="text-xs leading-relaxed">
                        {parseArticleLinks(msg.content)}
                      </div>
                      {/* Article chips */}
                      {msg.articles && msg.articles.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-1 border-t border-outline-variant/10">
                          {msg.articles.map((a) => (
                            <Link
                              key={a.id}
                              href={`/article/${a.id}`}
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium transition-opacity hover:opacity-80 ${
                                SEVERITY_COLORS[a.severity] || SEVERITY_COLORS.info
                              }`}
                            >
                              <span className="material-symbols-outlined text-[10px]">arrow_outward</span>
                              {a.title.length > 30 ? a.title.slice(0, 30) + "..." : a.title}
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <span className="text-xs">{msg.content}</span>
                  )}
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-surface-container-high rounded-2xl rounded-bl-md px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-on-surface-variant/50 animate-bounce" style={{ animationDelay: "0ms" }} />
                    <div className="w-1.5 h-1.5 rounded-full bg-on-surface-variant/50 animate-bounce" style={{ animationDelay: "150ms" }} />
                    <div className="w-1.5 h-1.5 rounded-full bg-on-surface-variant/50 animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="px-3 py-3 border-t border-outline-variant/10 bg-surface-container-low">
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
                placeholder="Ask about threats, CVEs, or security..."
                disabled={loading}
                className="flex-1 px-3 py-2 rounded-xl bg-surface-container text-on-surface text-xs placeholder:text-on-surface-variant/50 border border-outline-variant/20 focus:border-primary focus:outline-none transition-colors disabled:opacity-50"
              />
              <button
                onClick={handleSend}
                disabled={loading || !input.trim()}
                className="w-9 h-9 rounded-xl bg-primary text-[#263046] flex items-center justify-center hover:opacity-90 transition-opacity disabled:opacity-30"
              >
                <span className="material-symbols-outlined text-lg">send</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FAB Button */}
      <button
        onClick={() => setOpen(!open)}
        className={`fixed bottom-6 right-4 lg:right-8 w-14 h-14 rounded-full flex items-center justify-center shadow-[0_4px_24px_rgba(74,225,131,0.3)] hover:scale-105 transition-all duration-200 z-50 ${
          open
            ? "bg-surface-container-high text-on-surface-variant rotate-0"
            : "bg-secondary text-[#263046]"
        }`}
      >
        <span className="material-symbols-outlined text-2xl">
          {open ? "close" : "auto_awesome"}
        </span>
      </button>
    </>
  );
}
