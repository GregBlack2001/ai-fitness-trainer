"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ChatInterface } from "@/components/chat-interface";
import { Loader2 } from "lucide-react";

export default function OnboardingPage() {
  const router = useRouter();
  const supabase = createClient();
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Get the current user on page load
  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        // Not logged in, redirect to login
        router.push("/login");
        return;
      }

      setUserId(user.id);
      setLoading(false);
    };

    getUser();
  }, [router, supabase]);

  // Called when onboarding is complete
  const handleComplete = () => {
    router.push("/dashboard");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!userId) {
    return null; // Will redirect to login
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
