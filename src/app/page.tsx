"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
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
  MessageSquare,
  BarChart3,
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
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center animate-pulse">
            <Dumbbell className="h-8 w-8 text-white" />
          </div>
          <Loader2 className="h-6 w-6 animate-spin text-violet-500" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Animated background */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-20 left-1/4 w-[500px] h-[500px] bg-violet-600/20 rounded-full blur-[120px] animate-pulse" />
          <div className="absolute bottom-20 right-1/4 w-[400px] h-[400px] bg-indigo-600/20 rounded-full blur-[120px]" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-[150px]" />
        </div>

        <div className="container mx-auto px-4 py-20 md:py-32">
          <div className="max-w-4xl mx-auto text-center animate-slide-up">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-violet-500/10 border border-violet-500/20 text-violet-300 px-4 py-2 rounded-full text-sm font-medium mb-8">
              <Sparkles className="h-4 w-4" />
              AI-Powered Fitness & Nutrition
            </div>

            {/* Headline */}
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6">
              <span className="text-white">Your Personal</span>
              <br />
              <span className="bg-gradient-to-r from-violet-400 via-purple-400 to-indigo-400 bg-clip-text text-transparent">
                AI Fitness Coach
              </span>
            </h1>

            {/* Subheadline */}
            <p className="text-xl text-slate-400 mb-10 max-w-2xl mx-auto leading-relaxed">
              Get personalized workout plans, nutrition guidance with macro
              tracking, and real-time coaching — all powered by artificial
              intelligence.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/signup">
                <Button className="btn-primary text-lg px-8 py-6 h-auto">
                  Start Free
                  <ChevronRight className="h-5 w-5 ml-2" />
                </Button>
              </Link>
              <Link href="/login">
                <Button className="btn-secondary text-lg px-8 py-6 h-auto">
                  Sign In
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 relative">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-white">
              Everything You Need to
              <span className="bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent">
                {" "}
                Transform
              </span>
            </h2>
            <p className="text-slate-400 text-lg max-w-2xl mx-auto">
              A complete fitness ecosystem designed to help you achieve your
              goals faster
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 stagger-children">
            {/* Feature 1 */}
            <div className="stat-card group hover:border-violet-500/50 transition-all duration-300">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Dumbbell className="h-7 w-7 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-3 text-white">
                Smart Workout Plans
              </h3>
              <p className="text-slate-400 leading-relaxed">
                AI-generated workout programs tailored to your goals, equipment,
                and fitness level. Progressive overload built-in.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="stat-card group hover:border-emerald-500/50 transition-all duration-300">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-600 to-green-600 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Utensils className="h-7 w-7 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-3 text-white">
                Nutrition & Macros
              </h3>
              <p className="text-slate-400 leading-relaxed">
                Personalized meal plans with calorie and macro targets.
                Accommodates dietary restrictions and preferences.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="stat-card group hover:border-amber-500/50 transition-all duration-300">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-600 to-orange-600 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <MessageSquare className="h-7 w-7 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-3 text-white">
                AI Coach Chat
              </h3>
              <p className="text-slate-400 leading-relaxed">
                Ask questions, get form tips, swap exercises, and adjust your
                plan anytime. Your coach is always available.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="stat-card group hover:border-blue-500/50 transition-all duration-300">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-600 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <BarChart3 className="h-7 w-7 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-3 text-white">
                Progress Tracking
              </h3>
              <p className="text-slate-400 leading-relaxed">
                Visual charts for weight, workout completion, and strength
                gains. See your transformation over time.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="stat-card group hover:border-rose-500/50 transition-all duration-300">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-rose-600 to-pink-600 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Zap className="h-7 w-7 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-3 text-white">
                Weekly Adaptations
              </h3>
              <p className="text-slate-400 leading-relaxed">
                Your plan evolves with you. Weekly check-ins trigger smart
                adjustments based on your feedback and progress.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="stat-card group hover:border-purple-500/50 transition-all duration-300">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-600 to-fuchsia-600 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Target className="h-7 w-7 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-3 text-white">
                Goal-Focused
              </h3>
              <p className="text-slate-400 leading-relaxed">
                Whether you want to build muscle, lose fat, or improve endurance
                — every recommendation is aligned with your goal.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 relative">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center glass rounded-3xl p-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-white">
              Ready to Start Your Transformation?
            </h2>
            <p className="text-slate-400 text-lg mb-8">
              Join thousands of users achieving their fitness goals with
              AI-powered coaching.
            </p>
            <Link href="/signup">
              <Button className="btn-primary text-lg px-10 py-6 h-auto">
                Get Started Free
                <Sparkles className="h-5 w-5 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-slate-800">
        <div className="container mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center">
              <Dumbbell className="h-4 w-4 text-white" />
            </div>
            <span className="font-bold text-white">FitAI</span>
          </div>
          <p className="text-slate-500 text-sm">
            © 2024 FitAI. AI-powered fitness coaching for everyone.
          </p>
        </div>
      </footer>
    </div>
  );
}
