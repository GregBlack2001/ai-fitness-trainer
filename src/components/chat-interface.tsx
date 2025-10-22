"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Loader2, Send } from "lucide-react";

// Define the shape of a message
type Message = {
  role: "user" | "assistant";
  content: string;
};

type ChatInterfaceProps = {
  userId: string;
  onComplete: () => void;
};

export function ChatInterface({ userId, onComplete }: ChatInterfaceProps) {
  // State for all messages in the conversation
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Hey there! 👋 I'm your AI fitness coach, and I'm excited to help you reach your goals. Let's start by getting to know each other - what's your name?",
    },
  ]);

  // State for the current message being typed
  const [input, setInput] = useState("");

  // Loading state while waiting for AI response
  const [isLoading, setIsLoading] = useState(false);

  // Reference to the messages container for auto-scrolling
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]); // Run whenever messages change

  // Handle sending a message
  const handleSend = async () => {
    // Don't send empty messages
    if (!input.trim()) return;

    // Don't send if already loading
    if (isLoading) return;

    // Add user's message to the chat
    const userMessage: Message = { role: "user", content: input };
    setMessages((prev) => [...prev, userMessage]);

    // Clear input field
    setInput("");

    // Show loading state
    setIsLoading(true);

    try {
      // Send conversation to API
      const response = await fetch("/api/chat/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMessage], // Send full conversation history
          userId,
        }),
      });

      const data = await response.json();

      if (data.error) {
        // Handle error
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: "Sorry, I encountered an error. Please try again.",
          },
        ]);
        setIsLoading(false);
        return;
      }

      // Add AI's response to chat
      if (data.message) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: data.message },
        ]);
      }

      // Check if onboarding is complete
      if (data.completed) {
        // Wait a moment for user to read the final message
        setTimeout(() => {
          onComplete(); // Redirect to dashboard
        }, 2000);
      }

      setIsLoading(false);
    } catch (error) {
      console.error("Send message error:", error);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Sorry, something went wrong. Please try again.",
        },
      ]);
      setIsLoading(false);
    }
  };

  // Handle Enter key press
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-[600px] max-w-2xl mx-auto">
      {/* Messages container */}
      <Card className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${
              message.role === "user" ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`max-w-[80%] rounded-lg px-4 py-2 ${
                message.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted"
              }`}
            >
              <p className="text-sm whitespace-pre-wrap">{message.content}</p>
            </div>
          </div>
        ))}

        {/* Loading indicator */}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-muted rounded-lg px-4 py-2">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
          </div>
        )}

        {/* Invisible element for auto-scroll */}
        <div ref={messagesEndRef} />
      </Card>

      {/* Input area */}
      <div className="flex gap-2 mt-4">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Type your message..."
          disabled={isLoading}
          className="flex-1"
        />
        <Button onClick={handleSend} disabled={isLoading || !input.trim()}>
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
}
