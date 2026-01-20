"use client";

import { useState, useRef, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Utensils,
  AlertCircle,
} from "lucide-react";
import Link from "next/link";
import { logEventClient } from "@/lib/events";

type Message = {
  role: "user" | "assistant";
  content: string;
  planModified?: boolean;
  mealPlanModified?: boolean;
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
  {
    icon: <Utensils className="h-4 w-4" />,
    label: "Change a meal",
    prompt: "I'd like to change one of my meals in my nutrition plan",
  },
  {
    icon: <RefreshCw className="h-4 w-4" />,
    label: "Update diet preferences",
    prompt: "I need to update my dietary preferences",
  },
];

export default function ChatPage() {
  const router = useRouter();
  const supabase = createClient();

  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: `Hey! 👋 I'm your AI fitness & nutrition coach. I'm here to help you with:

• **Modify workouts** - swap exercises, change days, adjust intensity
• **Modify meals** - swap meals, adjust portions, update dietary preferences
• **Work around injuries** - I'll adapt your plan to keep you training safely
• **Answer questions** - nutrition, form, recovery, motivation, anything!

You can type or tap the 🎤 microphone to talk to me!

What can I help you with today?`,
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);

  // Voice states
  const [isListening, setIsListening] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);

  // Check for speech support on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      // Check for Speech Recognition support
      const SpeechRecognition =
        (window as any).SpeechRecognition ||
        (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = true;
        recognitionRef.current.interimResults = true;
        recognitionRef.current.lang = "en-US";

        let fullTranscript = "";

        recognitionRef.current.onresult = (event: any) => {
          let interimTranscript = "";

          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              fullTranscript += transcript;
            } else {
              interimTranscript = transcript;
            }
          }

          // Show full transcript + current interim
          setInput((fullTranscript + interimTranscript).trim());
        };

        recognitionRef.current.onend = () => {
          console.log("Speech recognition ended");
          setIsListening(false);
          fullTranscript = ""; // Reset for next session
        };

        recognitionRef.current.onerror = (event: any) => {
          console.error("Speech recognition error:", event.error);
          setIsListening(false);
          fullTranscript = ""; // Reset on error

          if (event.error === "not-allowed") {
            alert(
              "Microphone access denied. Please allow microphone access in your browser settings and refresh the page."
            );
          } else if (event.error === "no-speech") {
            // User didn't say anything, this is okay
          } else if (event.error === "network") {
            alert(
              "Network error. Speech recognition requires an internet connection."
            );
          }
        };

        setSpeechSupported(true);
      }

      // Check for Speech Synthesis support
      if ("speechSynthesis" in window) {
        synthRef.current = window.speechSynthesis;
      }
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (synthRef.current) {
        synthRef.current.cancel();
      }
    };
  }, []);

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

  // Toggle voice recognition
  const toggleListening = async () => {
    if (!recognitionRef.current) return;

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      // Request microphone permission explicitly
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });
        // Stop the stream immediately - we just needed permission
        stream.getTracks().forEach((track) => track.stop());

        setInput("");
        recognitionRef.current.start();
        setIsListening(true);

        // Log voice usage event
        logEventClient("voice_used", {
          context: "ai_coach",
          type: "speech_to_text",
        });
      } catch (err: any) {
        console.error("Microphone permission error:", err);
        if (
          err.name === "NotAllowedError" ||
          err.name === "PermissionDeniedError"
        ) {
          alert(
            "Microphone access is required for voice input. Please allow microphone access in your browser settings and try again."
          );
        } else if (err.name === "NotFoundError") {
          alert(
            "No microphone found. Please connect a microphone and try again."
          );
        } else {
          alert("Could not access microphone: " + err.message);
        }
      }
    }
  };

  // Speak text using TTS
  const speakText = (text: string) => {
    if (!synthRef.current || !voiceEnabled || !text) return;

    // Cancel any ongoing speech
    synthRef.current.cancel();

    // Clean text for speech (remove markdown)
    const cleanText = text
      .replace(/\*\*(.*?)\*\*/g, "$1")
      .replace(/\*(.*?)\*/g, "$1")
      .replace(/•/g, "")
      .replace(/\n+/g, ". ")
      .trim();

    if (!cleanText) return;

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    // Try to get a natural voice
    const voices = synthRef.current.getVoices();
    const preferredVoice = voices.find(
      (v) =>
        v.name.includes("Google") ||
        v.name.includes("Natural") ||
        v.name.includes("Samantha") ||
        v.lang.startsWith("en")
    );
    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    synthRef.current.speak(utterance);
  };

  // Stop speaking
  const stopSpeaking = () => {
    if (synthRef.current) {
      synthRef.current.cancel();
      setIsSpeaking(false);
    }
  };

  const handleSend = async (messageText?: string) => {
    const textToSend = messageText || input.trim();
    if (!textToSend || isLoading || !userId) return;

    // Stop listening if we were
    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }

    const userMessage: Message = { role: "user", content: textToSend };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    // Log user message event
    logEventClient("coach_message_sent", { message_length: textToSend.length });

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
        const errorMsg = "Sorry, I encountered an error. Please try again.";
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: errorMsg },
        ]);
        if (voiceEnabled) speakText(errorMsg);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: data.message,
            planModified: data.planModified,
            mealPlanModified: data.mealPlanModified,
            modifications: data.modifications,
          },
        ]);

        // Log coach response event
        logEventClient("coach_message_received", {
          response_length: data.message?.length || 0,
          plan_modified: data.planModified || false,
          meal_plan_modified: data.mealPlanModified || false,
        });

        // Log plan update if modified
        if (data.planModified) {
          logEventClient("plan_updated", {
            source: "ai_coach",
            modifications: data.modifications,
          });
        }

        // Speak the response
        if (voiceEnabled) {
          speakText(data.message);
        }
      }
    } catch (error) {
      console.error("Chat error:", error);
      const errorMsg = "Sorry, something went wrong. Please try again.";
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: errorMsg },
      ]);
      if (voiceEnabled) speakText(errorMsg);
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
                    {isSpeaking ? "Speaking..." : "Always here to help"}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Voice toggle */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  if (isSpeaking) stopSpeaking();
                  setVoiceEnabled(!voiceEnabled);
                }}
                title={
                  voiceEnabled
                    ? "Disable voice responses"
                    : "Enable voice responses"
                }
              >
                {voiceEnabled ? (
                  <Volume2 className="h-5 w-5 text-primary" />
                ) : (
                  <VolumeX className="h-5 w-5 text-muted-foreground" />
                )}
              </Button>
              <Badge variant="secondary" className="gap-1">
                <MessageSquare className="h-3 w-3" />
                {messages.length - 1}
              </Badge>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6 max-w-3xl">
        <div className="flex flex-col h-[calc(100vh-180px)]">
          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto space-y-4 pb-4">
            {/* Disclaimer - shows only at start */}
            {messages.length <= 1 && (
              <div className="bg-muted/50 border rounded-lg p-2 mb-2">
                <div className="flex gap-2 items-start">
                  <AlertCircle className="h-3 w-3 text-muted-foreground flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-muted-foreground">
                    AI Coach provides general fitness guidance only, not medical
                    advice. Consult a healthcare provider for health concerns.
                  </p>
                </div>
              </div>
            )}

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
                        __html: (message.content || "")
                          .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
                          .replace(/\*(.*?)\*/g, "<em>$1</em>")
                          .replace(/•/g, "<br/>•"),
                      }}
                    />

                    {/* Speak button for assistant messages */}
                    {message.role === "assistant" &&
                      index > 0 &&
                      message.content && (
                        <button
                          onClick={() => speakText(message.content)}
                          className="mt-2 text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                        >
                          <Volume2 className="h-3 w-3" />
                          Listen
                        </button>
                      )}
                  </div>
                </div>

                {/* Show modification indicators */}
                {(message.planModified || message.mealPlanModified) && (
                  <div className="flex justify-start mt-2 ml-2 gap-2 flex-wrap">
                    {message.planModified && (
                      <div className="flex items-center gap-2 text-xs text-green-600 bg-green-500/10 px-3 py-1.5 rounded-full">
                        <CheckCircle2 className="h-3 w-3" />
                        <span>Workout plan updated</span>
                      </div>
                    )}
                    {message.mealPlanModified && (
                      <div className="flex items-center gap-2 text-xs text-orange-600 bg-orange-500/10 px-3 py-1.5 rounded-full">
                        <CheckCircle2 className="h-3 w-3" />
                        <span>Meal plan updated</span>
                      </div>
                    )}
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
              {/* Voice input button */}
              {speechSupported && (
                <Button
                  variant={isListening ? "destructive" : "outline"}
                  size="lg"
                  className={`h-12 px-4 ${isListening ? "animate-pulse" : ""}`}
                  onClick={toggleListening}
                  title={isListening ? "Stop listening" : "Start voice input"}
                >
                  {isListening ? (
                    <MicOff className="h-5 w-5" />
                  ) : (
                    <Mic className="h-5 w-5" />
                  )}
                </Button>
              )}

              <Input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder={
                  isListening ? "Listening..." : "Ask your coach anything..."
                }
                disabled={isLoading}
                className={`flex-1 h-12 text-base ${
                  isListening
                    ? "border-red-500 bg-red-50 dark:bg-red-950/20"
                    : ""
                }`}
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
              {speechSupported
                ? "Tap 🎤 to speak or type • Tap 🔊 in header to toggle voice responses"
                : "Your AI coach can modify workouts, meals, and answer questions"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
