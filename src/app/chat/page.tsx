"use client";

import { useState, useRef, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Loader2,
  Send,
  Dumbbell,
  Calendar,
  AlertTriangle,
  RefreshCw,
  MessageSquare,
  Sparkles,
  ArrowLeft,
  CheckCircle2,
} from "lucide-react";
import Link from "next/link";

type Message = {
  role: "user" | "assistant";
  content: string;
  planModified?: boolean;
  modifications?: string[];
};

const QUICK_ACTIONS = [
  {
    icon: <Calendar className="h-4 w-4" />,
    label: "Change workout day",
    prompt: "I need to move my workout to a different day this week",
  },
  {
    icon: <RefreshCw className="h-4 w-4" />,
    label: "Swap an exercise",
    prompt: "I'd like to swap out an exercise for something different",
  },
  {
    icon: <AlertTriangle className="h-4 w-4" />,
    label: "I have an injury",
    prompt: "I have an injury and need my workouts modified",
  },
  {
    icon: <Dumbbell className="h-4 w-4" />,
    label: "Adjust intensity",
    prompt: "I want to adjust the intensity of my workouts",
  },
];

export default function ChatPage() {
  const router = useRouter();
  const supabase = createClient();

  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: `Hey! 👋 I'm your AI fitness coach. I'm here to help you with anything related to your training:

• **Modify your workouts** - swap exercises, change days, adjust intensity
• **Work around injuries** - I'll adapt your plan to keep you training safely
• **Answer questions** - nutrition, form, recovery, motivation, anything!

What can I help you with today?`,
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Scroll to bottom when messages change
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Get user on mount
  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }
      setUserId(user.id);
      setInitialLoading(false);
    };
    getUser();
  }, [supabase, router]);

  const handleSend = async (messageText?: string) => {
    const textToSend = messageText || input.trim();
    if (!textToSend || isLoading || !userId) return;

    const userMessage: Message = { role: "user", content: textToSend };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMessage].map((m) => ({
            role: m.role,
            content: m.content,
          })),
          userId,
        }),
      });

      const data = await response.json();

      if (data.error) {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: "Sorry, I encountered an error. Please try again.",
          },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: data.message,
            planModified: data.planModified,
            modifications: data.modifications,
          },
        ]);
      }
    } catch (error) {
      console.error("Chat error:", error);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Sorry, something went wrong. Please try again.",
        },
      ]);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleQuickAction = (prompt: string) => {
    handleSend(prompt);
  };

  if (initialLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/dashboard">
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                  <Sparkles className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h1 className="font-semibold">AI Coach</h1>
                  <p className="text-xs text-muted-foreground">
                    Always here to help
                  </p>
                </div>
              </div>
            </div>
            <Badge variant="secondary" className="gap-1">
              <MessageSquare className="h-3 w-3" />
              {messages.length - 1} messages
            </Badge>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6 max-w-3xl">
        <div className="flex flex-col h-[calc(100vh-180px)]">
          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto space-y-4 pb-4">
            {messages.map((message, index) => (
              <div key={index}>
                <div
                  className={`flex ${
                    message.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                      message.role === "user"
                        ? "bg-primary text-primary-foreground rounded-br-md"
                        : "bg-muted rounded-bl-md"
                    }`}
                  >
                    <div
                      className="text-sm whitespace-pre-wrap prose prose-sm dark:prose-invert max-w-none"
                      dangerouslySetInnerHTML={{
                        __html: message.content
                          .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
                          .replace(/\*(.*?)\*/g, "<em>$1</em>")
                          .replace(/•/g, "<br/>•"),
                      }}
                    />
                  </div>
                </div>

                {/* Show modification indicator */}
                {message.planModified && (
                  <div className="flex justify-start mt-2 ml-2">
                    <div className="flex items-center gap-2 text-xs text-green-600 bg-green-500/10 px-3 py-1.5 rounded-full">
                      <CheckCircle2 className="h-3 w-3" />
                      <span>Workout plan updated</span>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* Loading indicator */}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm text-muted-foreground">
                      Thinking...
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Actions - Show only at start */}
          {messages.length <= 2 && !isLoading && (
            <div className="py-4">
              <p className="text-xs text-muted-foreground mb-3 text-center">
                Quick actions
              </p>
              <div className="grid grid-cols-2 gap-2">
                {QUICK_ACTIONS.map((action, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    className="h-auto py-3 px-4 justify-start gap-2 text-left"
                    onClick={() => handleQuickAction(action.prompt)}
                  >
                    {action.icon}
                    <span className="text-sm">{action.label}</span>
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Input Area */}
          <div className="sticky bottom-0 bg-background pt-4 border-t">
            <div className="flex gap-2">
              <Input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Ask your coach anything..."
                disabled={isLoading}
                className="flex-1 h-12 text-base"
              />
              <Button
                onClick={() => handleSend()}
                disabled={isLoading || !input.trim()}
                size="lg"
                className="h-12 px-6"
              >
                {isLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Send className="h-5 w-5" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground text-center mt-2">
              Your AI coach can modify workouts, answer questions, and help with
              injuries
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
