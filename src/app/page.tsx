import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles,
  MessageSquare,
  TrendingUp,
  Calendar,
  Dumbbell,
  Brain,
  Target,
  Zap,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-primary/10 via-primary/5 to-background pt-20 pb-32">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            {/* Badge */}
            <Badge className="px-4 py-1.5 text-sm" variant="secondary">
              <Sparkles className="w-3 h-3 mr-2" />
              Powered by AI • Personalized for You
            </Badge>

            {/* Headline */}
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight">
              Your Personal
              <span className="block text-primary mt-2">AI Fitness Coach</span>
            </h1>

            {/* Subheadline */}
            <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto">
              Get personalized workout plans, nutrition guidance, and real-time
              coaching that adapts to your progress—all powered by advanced AI.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Link href="/signup">
                <Button
                  size="lg"
                  className="text-lg px-8 py-6 w-full sm:w-auto"
                >
                  Start Free Today
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link href="/login">
                <Button
                  size="lg"
                  variant="outline"
                  className="text-lg px-8 py-6 w-full sm:w-auto"
                >
                  Sign In
                </Button>
              </Link>
            </div>

            {/* Social Proof */}
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground pt-4">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              <span>No credit card required</span>
              <span className="mx-2">•</span>
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              <span>Free forever</span>
            </div>
          </div>
        </div>

        {/* Decorative Elements */}
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
      </section>

      {/* Features Section */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            {/* Section Header */}
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Everything You Need to Succeed
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Advanced AI technology meets fitness expertise to deliver a
                truly personalized training experience
              </p>
            </div>

            {/* Features Grid */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Feature 1 */}
              <Card className="border-2 hover:border-primary/50 transition-colors">
                <CardHeader>
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                    <MessageSquare className="w-6 h-6 text-primary" />
                  </div>
                  <CardTitle>Conversational Onboarding</CardTitle>
                  <CardDescription>
                    Chat naturally with your AI coach. No boring forms—just tell
                    us about yourself and your goals.
                  </CardDescription>
                </CardHeader>
              </Card>

              {/* Feature 2 */}
              <Card className="border-2 hover:border-primary/50 transition-colors">
                <CardHeader>
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                    <Brain className="w-6 h-6 text-primary" />
                  </div>
                  <CardTitle>AI-Generated Plans</CardTitle>
                  <CardDescription>
                    Custom workout programs designed specifically for your
                    fitness level, goals, and available equipment.
                  </CardDescription>
                </CardHeader>
              </Card>

              {/* Feature 3 */}
              <Card className="border-2 hover:border-primary/50 transition-colors">
                <CardHeader>
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                    <TrendingUp className="w-6 h-6 text-primary" />
                  </div>
                  <CardTitle>Adaptive Training</CardTitle>
                  <CardDescription>
                    Your plan evolves with you. Weekly check-ins adjust
                    intensity based on your progress and feedback.
                  </CardDescription>
                </CardHeader>
              </Card>

              {/* Feature 4 */}
              <Card className="border-2 hover:border-primary/50 transition-colors">
                <CardHeader>
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                    <Dumbbell className="w-6 h-6 text-primary" />
                  </div>
                  <CardTitle>Detailed Exercise Library</CardTitle>
                  <CardDescription>
                    Every exercise includes sets, reps, rest periods, and form
                    cues to ensure safe, effective training.
                  </CardDescription>
                </CardHeader>
              </Card>

              {/* Feature 5 */}
              <Card className="border-2 hover:border-primary/50 transition-colors">
                <CardHeader>
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                    <Calendar className="w-6 h-6 text-primary" />
                  </div>
                  <CardTitle>Progress Tracking</CardTitle>
                  <CardDescription>
                    Monitor your journey with visual progress indicators and
                    celebrate every milestone you hit.
                  </CardDescription>
                </CardHeader>
              </Card>

              {/* Feature 6 */}
              <Card className="border-2 hover:border-primary/50 transition-colors">
                <CardHeader>
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                    <Target className="w-6 h-6 text-primary" />
                  </div>
                  <CardTitle>Injury Accommodation</CardTitle>
                  <CardDescription>
                    Tell us about any limitations, and we'll design workouts
                    that keep you safe while making progress.
                  </CardDescription>
                </CardHeader>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            {/* Section Header */}
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Get Started in Minutes
              </h2>
              <p className="text-lg text-muted-foreground">
                From signup to your first workout—it's that simple
              </p>
            </div>

            {/* Steps */}
            <div className="space-y-12">
              {/* Step 1 */}
              <div className="flex gap-6 items-start">
                <div className="flex-shrink-0 w-12 h-12 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xl font-bold">
                  1
                </div>
                <div>
                  <h3 className="text-2xl font-semibold mb-2">
                    Chat with Your AI Coach
                  </h3>
                  <p className="text-muted-foreground text-lg">
                    Have a natural conversation about your fitness goals,
                    experience level, available days, and equipment. No tedious
                    forms—just chat like you're talking to a real coach.
                  </p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex gap-6 items-start">
                <div className="flex-shrink-0 w-12 h-12 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xl font-bold">
                  2
                </div>
                <div>
                  <h3 className="text-2xl font-semibold mb-2">
                    Get Your Personalized Plan
                  </h3>
                  <p className="text-muted-foreground text-lg">
                    Our AI analyzes your profile and generates a custom Week 1
                    workout program tailored to your specific needs, goals, and
                    constraints. Every plan is unique.
                  </p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex gap-6 items-start">
                <div className="flex-shrink-0 w-12 h-12 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xl font-bold">
                  3
                </div>
                <div>
                  <h3 className="text-2xl font-semibold mb-2">
                    Start Training & Track Progress
                  </h3>
                  <p className="text-muted-foreground text-lg">
                    Follow your daily workouts with detailed exercise
                    instructions. Log your sessions and provide weekly feedback.
                    Your plan adapts automatically based on your progress.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Technology Section */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <Badge className="mb-6" variant="secondary">
              <Zap className="w-3 h-3 mr-2" />
              Cutting-Edge Technology
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              Built with Advanced AI
            </h2>
            <p className="text-lg text-muted-foreground mb-12">
              Powered by OpenAI's GPT-4o, our platform understands context,
              extracts meaningful data from conversations, and generates
              scientifically-backed training programs that actually work.
            </p>

            <div className="grid md:grid-cols-3 gap-6">
              <div className="p-6 bg-background rounded-lg border-2">
                <h3 className="font-semibold mb-2">
                  Natural Language Processing
                </h3>
                <p className="text-sm text-muted-foreground">
                  Understands your goals and preferences through conversation
                </p>
              </div>
              <div className="p-6 bg-background rounded-lg border-2">
                <h3 className="font-semibold mb-2">Intelligent Planning</h3>
                <p className="text-sm text-muted-foreground">
                  Creates workout programs based on exercise science principles
                </p>
              </div>
              <div className="p-6 bg-background rounded-lg border-2">
                <h3 className="font-semibold mb-2">Adaptive Learning</h3>
                <p className="text-sm text-muted-foreground">
                  Adjusts your plan based on your feedback and progress
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <Card className="max-w-4xl mx-auto border-2 bg-gradient-to-br from-primary/10 to-primary/5">
            <CardHeader className="text-center space-y-4 pb-8">
              <CardTitle className="text-3xl md:text-4xl">
                Ready to Transform Your Fitness?
              </CardTitle>
              <CardDescription className="text-lg">
                Join today and get your first personalized workout plan in
                minutes
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-4">
              <Link href="/signup" className="w-full sm:w-auto">
                <Button
                  size="lg"
                  className="w-full sm:w-auto text-lg px-12 py-6"
                >
                  Get Started Free
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <p className="text-sm text-muted-foreground">
                No credit card required • Start training today
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-12 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
            <div>
              <h3 className="font-bold text-xl mb-2">AI Fitness Trainer</h3>
              <p className="text-sm text-muted-foreground">
                Your personal AI-powered fitness coach
              </p>
            </div>
            <div className="flex gap-8 text-sm text-muted-foreground">
              <Link
                href="/login"
                className="hover:text-foreground transition-colors"
              >
                Login
              </Link>
              <Link
                href="/signup"
                className="hover:text-foreground transition-colors"
              >
                Sign Up
              </Link>
              <span>© 2025 AI Fitness Trainer</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
