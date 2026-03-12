"use client";

import { useState, useRef, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Loader2,
  Send,
  Dumbbell,
  Sparkles,
  CheckCircle2,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  ArrowRight,
  AlertCircle,
  Bot,
  User,
} from "lucide-react";
import { logEventClient } from "@/lib/events";

type Message = {
  role: "user" | "assistant";
  content: string;
};

export default function OnboardingPage() {
  const router = useRouter();
  const supabase = createClient();

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [planCreated, setPlanCreated] = useState(false);
  const [progress, setProgress] = useState(0);

  // Voice states
  const [isListening, setIsListening] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);

  const progressStages = [
    "Getting started",
    "Your goals",
    "Your schedule",
    "Equipment",
    "Nutrition",
    "Creating plan",
  ];

  useEffect(() => {
    if (typeof window !== "undefined") {
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
          setInput((fullTranscript + interimTranscript).trim());
        };

        recognitionRef.current.onend = () => {
          setIsListening(false);
          fullTranscript = "";
        };

        recognitionRef.current.onerror = (event: any) => {
          console.error("Speech recognition error:", event.error);
          setIsListening(false);
          fullTranscript = "";
        };

        setSpeechSupported(true);
      }

      if ("speechSynthesis" in window) {
        synthRef.current = window.speechSynthesis;
      }
    }

    return () => {
      if (recognitionRef.current) recognitionRef.current.stop();
      if (synthRef.current) synthRef.current.cancel();
    };
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const init = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      const { data: existingPlans } = await supabase
        .from("workout_plans")
        .select("id")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .limit(1);

      if (existingPlans && existingPlans.length > 0) {
        router.push("/dashboard");
        return;
      }

      setUserId(user.id);

      const greeting = `Hey! 👋 I'm your AI fitness coach. Let's create a personalized workout and nutrition plan for you.

I'll ask you a few quick questions about your goals, schedule, and preferences.

**What's your main fitness goal?**
• Lose weight
• Build muscle
• Get stronger
• Improve overall fitness`;

      setMessages([{ role: "assistant", content: greeting }]);
      setInitialLoading(false);
      logEventClient("onboarding_started");
    };

    init();
  }, [supabase, router]);

  const speakText = (text: string) => {
    if (!synthRef.current || !voiceEnabled) return;
    synthRef.current.cancel();
    const plainText = text
      .replace(/\*\*/g, "")
      .replace(/\*/g, "")
      .replace(/•/g, "-");
    const utterance = new SpeechSynthesisUtterance(plainText);
    utterance.rate = 1;
    utterance.pitch = 1;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    synthRef.current.speak(utterance);
  };

  const stopSpeaking = () => {
    if (synthRef.current) {
      synthRef.current.cancel();
      setIsSpeaking(false);
    }
  };

  const toggleListening = () => {
    if (!recognitionRef.current) return;
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      setInput("");
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading || !userId) return;

    const userMessage = input.trim();
    setInput("");

    // Create new message object
    const newUserMessage = { role: "user" as const, content: userMessage };

    // Update UI immediately
    setMessages((prev) => [...prev, newUserMessage]);
    setIsLoading(true);

    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }

    try {
      // Include the new message in conversation history
      const updatedHistory = [...messages, newUserMessage];

      const response = await fetch("/api/chat/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage,
          userId,
          conversationHistory: updatedHistory,
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
          { role: "assistant", content: data.message },
        ]);

        if (data.profileUpdated) {
          setProgress((prev) => Math.min(prev + 15, 85));
        }

        if (data.planCreated) {
          setPlanCreated(true);
          setProgress(100);
          logEventClient("onboarding_completed");
          logEventClient("plan_generated", { source: "onboarding" });
        }

        if (voiceEnabled && data.message) {
          speakText(data.message);
        }
      }
    } catch (error) {
      console.error("Onboarding error:", error);
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

  if (initialLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center mx-auto animate-pulse">
            <Dumbbell className="h-8 w-8 text-white" />
          </div>
          <Loader2 className="h-5 w-5 animate-spin mx-auto mt-4 text-violet-400" />
          <p className="mt-2 text-slate-400 text-sm">Preparing your coach...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-slate-950/90 backdrop-blur-lg border-b border-slate-800/50 px-4 py-3">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center">
              <Dumbbell className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="font-semibold text-white text-sm">
                Create Your Plan
              </h1>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider">
                {progressStages[Math.floor(progress / 20)] || "Getting started"}
              </p>
            </div>
          </div>

          {speechSupported && (
            <button
              onClick={() => {
                if (isSpeaking) stopSpeaking();
                setVoiceEnabled(!voiceEnabled);
              }}
              className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${
                voiceEnabled
                  ? "bg-violet-600 text-white"
                  : "bg-slate-800 text-slate-400"
              }`}
            >
              {voiceEnabled ? (
                <Volume2 className="h-4 w-4" />
              ) : (
                <VolumeX className="h-4 w-4" />
              )}
            </button>
          )}
        </div>

        {/* Progress */}
        <div className="max-w-lg mx-auto mt-3">
          <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-violet-500 to-indigo-500 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="max-w-lg mx-auto space-y-4">
          {/* Disclaimer */}
          {messages.length <= 1 && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 mb-4">
              <div className="flex gap-2">
                <AlertCircle className="h-4 w-4 text-amber-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-200/80">
                  This app provides general fitness guidance only. Consult a
                  healthcare provider before starting any new exercise program.
                </p>
              </div>
            </div>
          )}

          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {message.role === "assistant" && (
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center flex-shrink-0">
                  <Bot className="h-4 w-4 text-white" />
                </div>
              )}

              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                  message.role === "user"
                    ? "bg-violet-600 text-white rounded-br-sm"
                    : "bg-slate-800 text-slate-100 rounded-bl-sm"
                }`}
              >
                <div
                  className="text-sm leading-relaxed"
                  dangerouslySetInnerHTML={{
                    __html: (message.content || "")
                      .replace(
                        /\*\*(.*?)\*\*/g,
                        "<strong class='font-semibold'>$1</strong>",
                      )
                      .replace(/\n/g, "<br/>")
                      .replace(/•/g, "<span class='text-violet-400'>•</span>"),
                  }}
                />
              </div>

              {message.role === "user" && (
                <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center flex-shrink-0">
                  <User className="h-4 w-4 text-slate-300" />
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center flex-shrink-0">
                <Bot className="h-4 w-4 text-white" />
              </div>
              <div className="bg-slate-800 rounded-2xl rounded-bl-sm px-4 py-3">
                <div className="flex gap-1">
                  <div
                    className="w-2 h-2 bg-slate-500 rounded-full animate-bounce"
                    style={{ animationDelay: "0ms" }}
                  />
                  <div
                    className="w-2 h-2 bg-slate-500 rounded-full animate-bounce"
                    style={{ animationDelay: "150ms" }}
                  />
                  <div
                    className="w-2 h-2 bg-slate-500 rounded-full animate-bounce"
                    style={{ animationDelay: "300ms" }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Plan Created Success */}
          {planCreated && (
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-6 text-center">
              <div className="w-14 h-14 rounded-full bg-emerald-500 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="h-7 w-7 text-white" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">
                Your Plan is Ready! 🎉
              </h3>
              <p className="text-slate-400 text-sm mb-4">
                Your personalized workout and nutrition plan has been created.
              </p>
              <Button
                onClick={() => router.push("/dashboard")}
                className="bg-emerald-600 hover:bg-emerald-500 text-white"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                View My Plan
              </Button>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      {!planCreated && (
        <div className="sticky bottom-0 bg-slate-950 border-t border-slate-800/50 px-4 py-4">
          <div className="max-w-lg mx-auto">
            <div className="flex items-center gap-2">
              {speechSupported && (
                <button
                  onClick={toggleListening}
                  disabled={isLoading}
                  className={`w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${
                    isListening
                      ? "bg-red-500 text-white animate-pulse"
                      : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                  }`}
                >
                  {isListening ? (
                    <MicOff className="h-5 w-5" />
                  ) : (
                    <Mic className="h-5 w-5" />
                  )}
                </button>
              )}

              <div className="flex-1 relative">
                <Input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder={
                    isListening ? "Listening..." : "Type your answer..."
                  }
                  disabled={isLoading}
                  className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 pr-12 h-11 rounded-full"
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || isLoading}
                  className="absolute right-1 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-violet-600 hover:bg-violet-500 disabled:bg-slate-700 disabled:text-slate-500 flex items-center justify-center text-white transition-colors"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {isListening && (
              <p className="text-center text-xs text-red-400 mt-2 animate-pulse">
                🎤 Listening... Tap mic to stop
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
