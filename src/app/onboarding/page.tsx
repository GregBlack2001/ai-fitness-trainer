"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ChatInterface } from "@/components/chat-interface";
import { Loader2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function OnboardingPage() {
  const router = useRouter();
  const supabase = createClient();
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [generatingPlan, setGeneratingPlan] = useState(false);

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
      setLoading(false);
    };

    getUser();
  }, [router, supabase]);

  const handleComplete = async () => {
    console.log("Onboarding complete! Generating workout plan...");
    setGeneratingPlan(true);

    try {
      const response = await fetch("/api/plan/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });

      const data = await response.json();

      if (data.success) {
        console.log("✅ Workout plan generated!");
      }
    } catch (error) {
      console.error("Error generating plan:", error);
    } finally {
      // Redirect to dashboard regardless
      router.push("/dashboard");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (generatingPlan) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Creating Your Personalized Plan...</CardTitle>
            <CardDescription>
              Our AI coach is analyzing your profile and designing a workout
              plan just for you
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground text-center">
              This usually takes 10-15 seconds
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!userId) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">
            Welcome to Your Fitness Journey!
          </h1>
          <p className="text-muted-foreground">
            Let's have a quick chat to personalize your experience
          </p>
        </div>

        <ChatInterface userId={userId} onComplete={handleComplete} />
      </div>
    </div>
  );
}
