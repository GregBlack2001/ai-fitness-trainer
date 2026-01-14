"use client";

import { useState, useRef, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
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
} from "lucide-react";

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
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);

  // Progress stages
  const progressStages = [
    "Getting to know you",
    "Understanding your goals",
    "Checking your schedule",
    "Equipment & limitations",
    "Nutrition preferences",
    "Creating your plan",
  ];

  // Check for speech support on mount
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

  // Scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Get user and start conversation
  useEffect(() => {
    const init = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      // Check if user already has a plan
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

      // Get user's name from profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single();

      const userName = profile?.full_name?.split(" ")[0] || "there";

      // Start the conversation
      const greeting = `Hey ${userName}! 👋 I'm your AI fitness coach, and I'm excited to create a personalized workout and nutrition plan just for you!

I'll ask you a few questions to understand your goals, schedule, and preferences. You can type your responses or tap the 🎤 microphone to speak to me!

Let's start simple: **What's your main fitness goal?** For example:
• Lose weight / Get leaner
• Build muscle / Get stronger
• Improve overall fitness
• Train for a specific sport or event`;

      setMessages([{ role: "assistant", content: greeting }]);
      setInitialLoading(false);

      // Speak the greeting
      setTimeout(() => {
        if (voiceEnabled) speakText(greeting);
      }, 500);
    };

    init();
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

    synthRef.current.cancel();

    const cleanText = text
      .replace(/\*\*(.*?)\*\*/g, "$1")
      .replace(/\*(.*?)\*/g, "$1")
      .replace(/•/g, "")
      .replace(/\n+/g, ". ")
      .replace(/👋|💪|🎯|✅|🎉/g, "")
      .trim();

    if (!cleanText) return;

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

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

    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }

    const userMessage: Message = { role: "user", content: textToSend };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat/onboarding", {
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
          { role: "assistant", content: data.message },
        ]);

        // Update progress based on data collection
        if (data.profileUpdated) {
          setProgress((prev) => Math.min(prev + 15, 85));
        }

        // Check if plan was created
        if (data.planCreated) {
          setPlanCreated(true);
          setProgress(100);
        }

        // Speak the response
        if (voiceEnabled && data.message) {
          speakText(data.message);
        }
      }
    } catch (error) {
      console.error("Onboarding error:", error);
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

  if (initialLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-primary/10">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
          <p className="mt-4 text-muted-foreground">Preparing your coach...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-primary/10">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
                <Dumbbell className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="font-semibold">Create Your Plan</h1>
                <p className="text-xs text-muted-foreground">
                  {isSpeaking
                    ? "Speaking..."
                    : progressStages[Math.floor(progress / 20)] ||
                      "Getting started"}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                if (isSpeaking) stopSpeaking();
                setVoiceEnabled(!voiceEnabled);
              }}
              title={voiceEnabled ? "Disable voice" : "Enable voice"}
            >
              {voiceEnabled ? (
                <Volume2 className="h-5 w-5 text-primary" />
              ) : (
                <VolumeX className="h-5 w-5 text-muted-foreground" />
              )}
            </Button>
          </div>

          {/* Progress bar */}
          <div className="mt-3">
            <Progress value={progress} className="h-2" />
            <p className="text-xs text-muted-foreground mt-1 text-right">
              {progress}% complete
            </p>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6 max-w-2xl">
        <div className="flex flex-col h-[calc(100vh-200px)]">
          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto space-y-4 pb-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${
                  message.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                    message.role === "user"
                      ? "bg-primary text-primary-foreground rounded-br-md"
                      : "bg-white dark:bg-slate-800 shadow-md rounded-bl-md"
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

                  {/* Listen button for assistant messages */}
                  {message.role === "assistant" && message.content && (
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
            ))}

            {/* Loading indicator */}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white dark:bg-slate-800 shadow-md rounded-2xl rounded-bl-md px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm text-muted-foreground">
                      {progress >= 85
                        ? "Creating your personalized plan..."
                        : "Thinking..."}
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Plan Created Success */}
          {planCreated && (
            <Card className="mb-4 border-0 shadow-lg bg-gradient-to-r from-green-500 to-emerald-500 text-white">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
                    <CheckCircle2 className="h-8 w-8" />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-xl font-bold mb-1">
                      Your Plan is Ready! 🎉
                    </h2>
                    <p className="text-white/80 text-sm">
                      I've created a personalized workout and nutrition plan
                      based on our conversation.
                    </p>
                  </div>
                </div>
                <Button
                  onClick={() => router.push("/dashboard")}
                  className="w-full mt-4 bg-white text-green-600 hover:bg-white/90 h-12 text-lg font-semibold"
                >
                  Go to Dashboard
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Input Area */}
          {!planCreated && (
            <div className="sticky bottom-0 bg-gradient-to-t from-background via-background pt-4">
              <div className="flex gap-2">
                {/* Voice input button */}
                {speechSupported && (
                  <Button
                    variant={isListening ? "destructive" : "outline"}
                    size="lg"
                    className={`h-12 px-4 ${
                      isListening ? "animate-pulse" : ""
                    }`}
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
                    isListening
                      ? "Listening..."
                      : "Type or speak your response..."
                  }
                  disabled={isLoading}
                  className={`flex-1 h-12 text-base bg-white dark:bg-slate-800 ${
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
                  ? "🎤 Tap microphone to speak • 🔊 Tap speaker in header to toggle voice"
                  : "Answer the questions to create your personalized plan"}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
