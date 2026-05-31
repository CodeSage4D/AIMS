"use client";

import React, { useState } from "react";
import { Send, Bot, User, Sparkles, Shield, AlertCircle, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface Message {
  sender: "user" | "ai";
  text: string;
  citations?: { id: string; title: string; category: string }[];
}

export default function AssistantPage() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      sender: "ai",
      text: "### Welcome to AURXON AIMS AI Assistant! 👋\n\nI am here to guide you regarding leave rules, daily check-in windows, late marking regulations, and dynamic NDA agreements.\n\nAsk me anything, or try one of the suggestions below!",
    },
  ]);

  const handleSend = async (textToSend: string) => {
    const activeText = textToSend || query;
    if (!activeText.trim()) return;

    setQuery("");
    setMessages((prev) => [...prev, { sender: "user", text: activeText }]);
    setLoading(true);

    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: activeText }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setMessages((prev) => [
          ...prev,
          { sender: "ai", text: data.response, citations: data.citations },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          { sender: "ai", text: `⚠️ Error: ${data.error || "Failed to retrieve policy response."}` },
        ]);
      }
    } catch (err) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        { sender: "ai", text: "⚠️ Technical Error: Unable to establish search session with the AIMS server." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/40 pb-5">
        <div>
          <h1 className="text-xl font-heading font-extrabold text-foreground tracking-tight flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <span>AI Compliance Assistant</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Query corporate policies, leaves rules, and employee guidelines securely &bull; Gated by Role Barriers
          </p>
        </div>
        <div className="flex items-center space-x-2 bg-secondary/25 border border-border/40 px-3 py-1.5 rounded-lg text-[10px] text-muted-foreground font-semibold">
          <Shield className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
          <span>Strictly Read-Only Policy Sandbox V1</span>
        </div>
      </div>

      {/* Chat Interface Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        {/* Left 3 Columns: Active Chat */}
        <div className="lg:col-span-3 flex flex-col h-[65vh] bg-card border border-border/80 rounded-xl shadow-xl overflow-hidden relative">
          
          {/* Messages Panel */}
          <div className="flex-1 p-6 overflow-y-auto space-y-4 bg-secondary/5">
            {messages.map((msg, index) => {
              const isAi = msg.sender === "ai";
              return (
                <div
                  key={index}
                  className={`flex items-start space-x-3.5 animate-fadeIn ${
                    isAi ? "justify-start" : "justify-end"
                  }`}
                >
                  {isAi && (
                    <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/25 text-primary flex items-center justify-center shadow-md shrink-0">
                      <Bot className="h-4.5 w-4.5" />
                    </div>
                  )}

                  <div
                    className={`max-w-[85%] p-4 rounded-xl shadow-sm text-xs leading-relaxed border ${
                      isAi
                        ? "bg-secondary/15 border-border/50 text-slate-350 dark:text-gray-350"
                        : "bg-primary text-primary-foreground border-primary"
                    }`}
                  >
                    {/* Render basic markdown syntax */}
                    <div className="space-y-2 whitespace-pre-wrap">
                      {msg.text.split("\n").map((line, lIdx) => {
                        if (line.startsWith("### ")) {
                          return <h3 key={lIdx} className="text-sm font-bold text-foreground mt-2 block">{line.substring(4)}</h3>;
                        }
                        if (line.startsWith("#### ")) {
                          return <h4 key={lIdx} className="text-xs font-bold text-foreground mt-1.5 block">{line.substring(5)}</h4>;
                        }
                        if (line.startsWith("* ")) {
                          return <li key={lIdx} className="ml-3 list-disc my-1 text-[11px]">{line.substring(2)}</li>;
                        }
                        if (line.startsWith("> ")) {
                          return <blockquote key={lIdx} className="border-l-2 border-primary/40 pl-3 italic my-1 text-[11px] text-muted-foreground bg-primary/5 py-1 rounded">{line.substring(2)}</blockquote>;
                        }
                        return <p key={lIdx}>{line}</p>;
                      })}
                    </div>

                    {/* Citations Box */}
                    {isAi && msg.citations && msg.citations.length > 0 && (
                      <div className="mt-3.5 pt-3.5 border-t border-border/30 space-y-1.5">
                        <span className="text-[9px] text-slate-500 font-bold block uppercase tracking-wider">CITED SOURCES</span>
                        <div className="flex flex-wrap gap-1.5">
                          {msg.citations.map((c) => (
                            <span
                              key={c.id}
                              className="text-[9px] font-bold bg-secondary/30 border border-border/40 text-muted-foreground px-2 py-0.5 rounded"
                            >
                              📄 {c.title} [{c.category}]
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {!isAi && (
                    <div className="w-8 h-8 rounded-lg bg-secondary border border-border text-foreground flex items-center justify-center shadow-md shrink-0">
                      <User className="h-4.5 w-4.5" />
                    </div>
                  )}
                </div>
              );
            })}

            {loading && (
              <div className="flex items-center space-x-3.5 animate-pulse">
                <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shrink-0">
                  <Bot className="h-4.5 w-4.5" />
                </div>
                <div className="bg-secondary/15 border border-border/50 text-slate-450 p-4 rounded-xl text-xs space-y-1.5 w-48">
                  <div className="h-2.5 bg-border/60 rounded-full w-24" />
                  <div className="h-2 bg-border/60 rounded-full w-36" />
                </div>
              </div>
            )}
          </div>

          {/* Prompt Entry Box */}
          <div className="p-4 border-t border-border/50 bg-secondary/10 flex items-center space-x-2">
            <input
              type="text"
              placeholder="Ask about leave application timelines or daily late rules..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend("")}
              disabled={loading}
              className="flex-1 h-11 rounded-md border border-border bg-input px-3.5 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all shadow-sm"
            />
            <Button
              variant="primary"
              size="sm"
              onClick={() => handleSend("")}
              disabled={loading || !query.trim()}
              className="h-11 px-4.5 font-bold flex items-center space-x-1.5"
            >
              <Send className="h-4 w-4" />
              <span className="hidden sm:inline">Ask</span>
            </Button>
          </div>
        </div>

        {/* Right 1 Column: Suggestions & Security guidelines */}
        <div className="space-y-6">
          {/* Quick Suggestions Card */}
          <div className="bg-card border border-border/80 rounded-xl p-5 shadow-sm space-y-4">
            <h3 className="text-xs font-heading font-extrabold text-foreground tracking-wider uppercase flex items-center space-x-2">
              <HelpCircle className="h-4 w-4 text-cyan-400 shrink-0" />
              <span>Suggested Queries</span>
            </h3>
            <div className="flex flex-col gap-2">
              {[
                "Check leave guidelines",
                "Late check-in rules",
                "Weekly off settings",
                "Tell me about NDA compliance",
              ].map((txt, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => !loading && handleSend(txt)}
                  className="w-full text-left p-3 rounded-lg border border-border/40 hover:border-cyan-500/35 bg-secondary/10 hover:bg-cyan-500/5 text-[11px] font-semibold text-slate-400 hover:text-cyan-400 transition-all cursor-pointer leading-normal"
                >
                  &rarr;&nbsp; {txt}
                </button>
              ))}
            </div>
          </div>

          {/* Role Barrier Warning Card */}
          <div className="bg-card border border-border/85 rounded-xl p-5 shadow-sm space-y-3.5">
            <h3 className="text-xs font-heading font-extrabold text-foreground tracking-wider uppercase flex items-center space-x-2">
              <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />
              <span>Role-Based Retrieval Gating</span>
            </h3>
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              All indexed policies within AIMS contain a mandatory <code className="text-cyan-400 font-bold bg-cyan-500/5 px-1 rounded border border-cyan-500/10">roleBarrier</code> security barrier. 
            </p>
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              Any indexing uploads by HR/Admins default to administrative review. Non-authorized personnel are strictly blocked from retrieving queries exceeding their clearance status.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
