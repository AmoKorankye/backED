"use client";

import { useState, useRef, useEffect } from "react";
import { MessageCircle, Send, X, Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Message {
  role: "user" | "model";
  content: string;
}

export default function AIChatbot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open]);

  const sendMessage = async () => {
    const trimmed = input.trim();
    if (!trimmed || loading) return;

    const userMessage: Message = { role: "user", content: trimmed };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages }),
      });

      const data = await response.json();
      
      // Handle both success and fallback messages
      if (data.message) {
        setMessages([
          ...newMessages,
          { role: "model", content: data.message },
        ]);
      } else {
        throw new Error("No message in response");
      }
    } catch (err) {
      console.error("Chat error:", err);
      setMessages([
        ...newMessages,
        {
          role: "model",
          content:
            "I'm having trouble connecting right now. Please try again in a moment, or browse the feed to discover projects.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const suggestedQuestions = [
    "What projects match my interests?",
    "How does donating work?",
    "Show me projects that need urgent funding",
  ];

  return (
    <>
      {/* Floating chat button */}
      <button
        onClick={() => setOpen(!open)}
        className={`absolute bottom-20 right-4 z-50 h-14 w-14 rounded-full shadow-lg flex items-center justify-center transition-all ${
          open
            ? "bg-foreground/80 hover:bg-foreground/70 scale-90"
            : "bg-foreground hover:bg-foreground/90 scale-100"
        }`}
        aria-label={open ? "Close chat" : "Open AI assistant"}
      >
        {open ? (
          <X className="h-6 w-6 text-background" />
        ) : (
          <div className="relative">
            <MessageCircle className="h-6 w-6 text-background" />
            <Sparkles className="h-3 w-3 text-background/70 absolute -top-1 -right-1" />
          </div>
        )}
      </button>

      {/* Chat window */}
      {open && (
        <div className="absolute bottom-36 right-3 left-3 z-50 bg-background rounded-2xl shadow-2xl border border-border flex flex-col overflow-hidden" style={{ height: "min(480px, calc(100vh - 180px))" }}>
          {/* Header */}
          <div className="bg-foreground px-4 py-3 flex items-center gap-3 flex-shrink-0">
            <div className="h-8 w-8 rounded-full bg-background/15 flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-background" />
            </div>
            <div>
              <h3 className="text-background font-semibold text-sm">
                BackED Assistant
              </h3>
              <p className="text-background/60 text-xs">
                AI-powered • Ask me anything
              </p>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 ? (
              <div className="space-y-4">
                <div className="bg-muted rounded-lg p-3 max-w-[85%]">
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    Hi! 👋 I&apos;m your BackED AI assistant. I can help you
                    discover projects, answer questions about donating, or
                    recommend campaigns based on your interests.
                  </p>
                </div>

                {/* Suggested questions */}
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">
                    Try asking:
                  </p>
                  {suggestedQuestions.map((q) => (
                    <button
                      key={q}
                      onClick={() => {
                        setInput(q);
                        // Auto-send after a brief moment
                        setTimeout(() => {
                          const userMessage: Message = {
                            role: "user",
                            content: q,
                          };
                          const newMessages = [userMessage];
                          setMessages(newMessages);
                          setLoading(true);
                          fetch("/api/chat", {
                            method: "POST",
                            headers: {
                              "Content-Type": "application/json",
                            },
                            body: JSON.stringify({ messages: newMessages }),
                          })
                            .then((r) => r.json())
                            .then((data) => {
                              setMessages([
                                ...newMessages,
                                { role: "model", content: data.message },
                              ]);
                            })
                            .catch(() => {
                              setMessages([
                                ...newMessages,
                                {
                                  role: "model",
                                  content:
                                    "Sorry, something went wrong. Please try again.",
                                },
                              ]);
                            })
                            .finally(() => {
                              setLoading(false);
                              setInput("");
                            });
                        }, 100);
                      }}
                      className="block w-full text-left text-xs bg-muted border border-border rounded-lg px-3 py-2 text-foreground hover:bg-muted/80 transition-colors"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${
                    msg.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[85%] px-3 py-2 rounded-2xl text-sm ${
                      msg.role === "user"
                        ? "bg-foreground text-background rounded-br-md"
                        : "bg-muted text-foreground rounded-bl-md"
                    }`}
                  >
                    <p className="whitespace-pre-wrap leading-relaxed">
                      {msg.content}
                    </p>
                  </div>
                </div>
              ))
            )}

            {loading && (
              <div className="flex justify-start">
                <div className="bg-muted px-4 py-3 rounded-2xl rounded-bl-md">
                  <div className="flex items-center gap-1.5">
                    <div className="h-2 w-2 bg-foreground/40 rounded-full animate-bounce [animation-delay:0ms]" />
                    <div className="h-2 w-2 bg-foreground/40 rounded-full animate-bounce [animation-delay:150ms]" />
                    <div className="h-2 w-2 bg-foreground/40 rounded-full animate-bounce [animation-delay:300ms]" />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-3 border-t border-border flex-shrink-0">
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about projects..."
                className="flex-1 bg-muted rounded-full px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-foreground/20"
                disabled={loading}
              />
              <button
                onClick={sendMessage}
                disabled={!input.trim() || loading}
                className="h-10 w-10 rounded-full bg-foreground text-background flex items-center justify-center hover:bg-foreground/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex-shrink-0"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </button>
            </div>
            <p className="text-[10px] text-muted-foreground text-center mt-1.5">
              Powered by Gemini AI
            </p>
          </div>
        </div>
      )}
    </>
  );
}
