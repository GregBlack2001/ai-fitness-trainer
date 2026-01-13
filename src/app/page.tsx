"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dumbbell,
  Brain,
  Utensils,
  TrendingUp,
  ChevronRight,
  Loader2,
  Sparkles,
  Target,
  Zap,
} from "lucide-react";
import Link from "next/link";

export default function HomePage() {
  const router = useRouter();
  const supabase = createClient();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        // User is logged in, redirect to dashboard
        router.push("/dashboard");
      } else {
        setChecking(false);
      }
    };
    checkAuth();
  }, [supabase, router]);

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl" />
        </div>

        <div className="container mx-auto px-4 py-20 md:py-32">
          <div className="max-w-4xl mx-auto text-center">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-8">
              <Sparkles className="h-4 w-4" />
              AI-Powered Fitness & Nutrition
            </div>

            {/* Headline */}
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6">
              Your Personal
              <span className="bg-gradient-to-r from-primary to-orange-500 bg-clip-text text-transparent">
                {" "}
                AI Fitness{" "}
              </span>
              Coach
            </h1>

            {/* Subheadline */}
            <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
              Get personalized workout plans, nutrition guidance with macro
              tracking, and real-time coaching — all powered by artificial
              intelligence.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/signup">
                <Button
                  size="lg"
                  className="text-lg px-8 h-14 rounded-full shadow-lg shadow-primary/25"
                >
                  Start Free
                  <ChevronRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link href="/login">
                <Button
                  size="lg"
                  variant="outline"
                  className="text-lg px-8 h-14 rounded-full"
                >
                  Sign In
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white/50 dark:bg-slate-900/50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Everything You Need to Transform
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Our AI analyzes your goals, body metrics, and preferences to
              create a completely personalized fitness journey.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            {/* Feature 1 */}
            <Card className="border-0 shadow-lg bg-white dark:bg-slate-800 hover:shadow-xl transition-shadow">
              <CardContent className="p-6">
                <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mb-4">
                  <Dumbbell className="h-7 w-7 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Smart Workouts</h3>
                <p className="text-muted-foreground">
                  AI-generated workout plans tailored to your fitness level,
                  goals, and available equipment.
                </p>
              </CardContent>
            </Card>

            {/* Feature 2 */}
            <Card className="border-0 shadow-lg bg-white dark:bg-slate-800 hover:shadow-xl transition-shadow">
              <CardContent className="p-6">
                <div className="w-14 h-14 bg-orange-500/10 rounded-2xl flex items-center justify-center mb-4">
                  <Utensils className="h-7 w-7 text-orange-500" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Nutrition Plans</h3>
                <p className="text-muted-foreground">
                  Personalized meal plans with macro targets. 2g protein per kg
                  for optimal results.
                </p>
              </CardContent>
            </Card>

            {/* Feature 3 */}
            <Card className="border-0 shadow-lg bg-white dark:bg-slate-800 hover:shadow-xl transition-shadow">
              <CardContent className="p-6">
                <div className="w-14 h-14 bg-violet-500/10 rounded-2xl flex items-center justify-center mb-4">
                  <Brain className="h-7 w-7 text-violet-500" />
                </div>
                <h3 className="text-xl font-semibold mb-2">AI Coach Chat</h3>
                <p className="text-muted-foreground">
                  Ask questions, modify workouts, get form tips, and stay
                  motivated with 24/7 AI coaching.
                </p>
              </CardContent>
            </Card>

            {/* Feature 4 */}
            <Card className="border-0 shadow-lg bg-white dark:bg-slate-800 hover:shadow-xl transition-shadow">
              <CardContent className="p-6">
                <div className="w-14 h-14 bg-emerald-500/10 rounded-2xl flex items-center justify-center mb-4">
                  <TrendingUp className="h-7 w-7 text-emerald-500" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Track Progress</h3>
                <p className="text-muted-foreground">
                  Log workouts, track weight, and visualize your fitness journey
                  with detailed stats.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              How It Works
            </h2>
            <p className="text-muted-foreground text-lg">
              Get started in minutes with our simple onboarding process.
            </p>
          </div>

          <div className="max-w-4xl mx-auto">
            <div className="grid md:grid-cols-3 gap-8">
              {/* Step 1 */}
              <div className="text-center">
                <div className="w-16 h-16 bg-primary text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                  1
                </div>
                <h3 className="text-xl font-semibold mb-2">
                  Tell Us About You
                </h3>
                <p className="text-muted-foreground">
                  Chat with our AI to share your goals, fitness level, dietary
                  needs, and preferences.
                </p>
              </div>

              {/* Step 2 */}
              <div className="text-center">
                <div className="w-16 h-16 bg-primary text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                  2
                </div>
                <h3 className="text-xl font-semibold mb-2">Get Your Plans</h3>
                <p className="text-muted-foreground">
                  Receive personalized workout routines and meal plans tailored
                  to your body and goals.
                </p>
              </div>

              {/* Step 3 */}
              <div className="text-center">
                <div className="w-16 h-16 bg-primary text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                  3
                </div>
                <h3 className="text-xl font-semibold mb-2">
                  Train & Transform
                </h3>
                <p className="text-muted-foreground">
                  Follow your plan, track progress, and chat with your AI coach
                  anytime you need help.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-primary to-primary/80">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Ready to Transform Your Fitness?
          </h2>
          <p className="text-white/80 text-lg mb-8 max-w-2xl mx-auto">
            Join thousands of users who are achieving their fitness goals with
            AI-powered coaching.
          </p>
          <Link href="/signup">
            <Button
              size="lg"
              variant="secondary"
              className="text-lg px-8 h-14 rounded-full"
            >
              Get Started Free
              <Zap className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t bg-white/50 dark:bg-slate-900/50">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <Dumbbell className="h-5 w-5 text-white" />
              </div>
              <span className="font-bold">FitAI</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © 2024 FitAI. Your AI-powered fitness companion.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
