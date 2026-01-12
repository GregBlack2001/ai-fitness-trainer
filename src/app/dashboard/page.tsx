"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Loader2,
  Dumbbell,
  Calendar,
  TrendingUp,
  Clock,
  Play,
  CheckCircle2,
  Flame,
  ChevronRight,
  MessageSquare,
  BarChart3,
  Sparkles,
} from "lucide-react";
import Link from "next/link";

type WorkoutLog = {
  id: string;
  day_index: number;
  workout_day: string;
  workout_focus: string;
  duration_seconds: number;
  completion_percentage: number;
  completed_at: string;
};

export default function DashboardPage() {
  const supabase = createClient();
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [plan, setPlan] = useState<any>(null);
  const [workoutLogs, setWorkoutLogs] = useState<WorkoutLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      // Load profile
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      setProfile(profileData);

      // Load active workout plan
      const { data: planData } = await supabase
        .from("workout_plans")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .single();
      setPlan(planData);

      // Load workout logs
      if (planData) {
        try {
          const response = await fetch(
            `/api/workout/log?userId=${user.id}&limit=20`
          );
          const data = await response.json();
          if (data.logs) {
            const currentPlanLogs = data.logs.filter(
              (log: any) => log.plan_id === planData.id
            );
            setWorkoutLogs(currentPlanLogs);
          }
        } catch (error) {
          console.log("No workout logs yet");
        }
      }

      setLoading(false);
    };

    loadData();
  }, [supabase]);

  const handleStartWorkout = (index: number) => {
    router.push(`/workout/${index}`);
  };

  const isWorkoutCompleted = (dayIndex: number) => {
    return workoutLogs.some((log) => log.day_index === dayIndex);
  };

  const getWorkoutLog = (dayIndex: number) => {
    return workoutLogs.find((log) => log.day_index === dayIndex);
  };

  // Get initials for avatar
  const getInitials = (name: string) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  // Find next workout to do
  const getNextWorkout = () => {
    if (!plan?.exercises?.workouts) return null;
    const workouts = plan.exercises.workouts;
    for (let i = 0; i < workouts.length; i++) {
      if (!isWorkoutCompleted(i)) {
        return { workout: workouts[i], index: i };
      }
    }
    return null;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const workouts = plan?.exercises?.workouts || [];
  const totalWorkouts = workouts.length;
  const completedWorkouts = workoutLogs.length;
  const progressPercentage =
    totalWorkouts > 0 ? (completedWorkouts / totalWorkouts) * 100 : 0;
  const nextWorkout = getNextWorkout();

  // Calculate total time spent
  const totalTimeSpent = workoutLogs.reduce(
    (sum, log) => sum + Math.round(log.duration_seconds / 60),
    0
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      {/* Header Section */}
      <header className="border-b bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Avatar className="h-12 w-12 ring-2 ring-primary/20">
              <AvatarFallback className="bg-gradient-to-br from-primary to-primary/60 text-white font-semibold">
                {getInitials(profile?.full_name)}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-xl font-bold tracking-tight">
                Hey, {profile?.full_name?.split(" ")[0] || "there"}! 👋
              </h1>
              <p className="text-sm text-muted-foreground">
                Week {plan?.week_number || 1} •{" "}
                {profile?.fitness_goal || "Building strength"}
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-4xl space-y-6">
        {/* Weekly Progress Card */}
        <Card className="overflow-hidden border-0 shadow-lg bg-gradient-to-r from-primary/90 to-primary dark:from-primary/80 dark:to-primary/60">
          <CardContent className="p-6 text-white">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-white/80 text-sm font-medium">
                  This Week's Progress
                </p>
                <p className="text-3xl font-bold">
                  {completedWorkouts} of {totalWorkouts}
                </p>
              </div>
              <div className="h-16 w-16 rounded-full bg-white/20 flex items-center justify-center">
                <span className="text-2xl font-bold">
                  {Math.round(progressPercentage)}%
                </span>
              </div>
            </div>
            <Progress
              value={progressPercentage}
              className="h-2 bg-white/20 [&>div]:bg-white"
            />
            <p className="text-white/70 text-sm mt-3">
              {completedWorkouts === 0 &&
                "Let's get started! Your first workout awaits."}
              {completedWorkouts > 0 &&
                completedWorkouts < totalWorkouts &&
                `${
                  totalWorkouts - completedWorkouts
                } workouts left this week. Keep going!`}
              {completedWorkouts === totalWorkouts &&
                totalWorkouts > 0 &&
                "🎉 Week complete! Amazing work!"}
            </p>
          </CardContent>
        </Card>

        {/* Quick Stats Row */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="border-0 shadow-md bg-white dark:bg-slate-800">
            <CardContent className="p-4 text-center">
              <Flame className="h-6 w-6 mx-auto mb-1 text-orange-500" />
              <p className="text-2xl font-bold">{completedWorkouts}</p>
              <p className="text-xs text-muted-foreground">Streak</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-md bg-white dark:bg-slate-800">
            <CardContent className="p-4 text-center">
              <Clock className="h-6 w-6 mx-auto mb-1 text-blue-500" />
              <p className="text-2xl font-bold">{totalTimeSpent}</p>
              <p className="text-xs text-muted-foreground">Minutes</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-md bg-white dark:bg-slate-800">
            <CardContent className="p-4 text-center">
              <TrendingUp className="h-6 w-6 mx-auto mb-1 text-green-500" />
              <p className="text-2xl font-bold">
                {workoutLogs.length > 0
                  ? Math.round(
                      workoutLogs.reduce(
                        (sum, l) => sum + (l.completion_percentage || 100),
                        0
                      ) / workoutLogs.length
                    )
                  : 0}
                %
              </p>
              <p className="text-xs text-muted-foreground">Avg Complete</p>
            </CardContent>
          </Card>
        </div>

        {/* Next Workout - Featured */}
        {nextWorkout && (
          <Card className="border-0 shadow-lg overflow-hidden bg-white dark:bg-slate-800">
            <div className="bg-gradient-to-r from-emerald-500/10 to-teal-500/10 dark:from-emerald-500/20 dark:to-teal-500/20 px-6 py-3 border-b">
              <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                Up Next
              </p>
            </div>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <h3 className="text-xl font-bold">
                    {nextWorkout.workout.day}
                  </h3>
                  <p className="text-muted-foreground">
                    {nextWorkout.workout.focus}
                  </p>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground pt-1">
                    <span className="flex items-center gap-1">
                      <Dumbbell className="h-4 w-4" />
                      {nextWorkout.workout.exercises?.length || 0} exercises
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {nextWorkout.workout.duration_minutes} min
                    </span>
                  </div>
                </div>
                <Button
                  size="lg"
                  className="rounded-full px-6 shadow-lg"
                  onClick={() => handleStartWorkout(nextWorkout.index)}
                >
                  <Play className="h-5 w-5 mr-2" />
                  Start
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* All Workouts */}
        <div>
          <h2 className="text-lg font-semibold mb-3 px-1">
            Week {plan?.week_number || 1} Schedule
          </h2>
          <div className="space-y-2">
            {workouts.map((workout: any, index: number) => {
              const completed = isWorkoutCompleted(index);
              const log = getWorkoutLog(index);
              const isNext = nextWorkout?.index === index;

              return (
                <Card
                  key={index}
                  className={`border-0 shadow-sm transition-all hover:shadow-md cursor-pointer ${
                    completed
                      ? "bg-emerald-50 dark:bg-emerald-950/30"
                      : isNext
                      ? "bg-white dark:bg-slate-800 ring-2 ring-primary/50"
                      : "bg-white dark:bg-slate-800 opacity-75"
                  }`}
                  onClick={() => handleStartWorkout(index)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      {/* Status indicator */}
                      <div
                        className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
                          completed
                            ? "bg-emerald-500 text-white"
                            : isNext
                            ? "bg-primary text-white"
                            : "bg-slate-100 dark:bg-slate-700 text-muted-foreground"
                        }`}
                      >
                        {completed ? (
                          <CheckCircle2 className="h-6 w-6" />
                        ) : (
                          <span className="font-bold">{index + 1}</span>
                        )}
                      </div>

                      {/* Workout info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold truncate">
                            {workout.day}
                          </h3>
                          {isNext && !completed && (
                            <Badge className="bg-primary/10 text-primary border-0 text-xs">
                              Next
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground truncate">
                          {workout.focus}
                        </p>
                        {completed && log && (
                          <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
                            ✓ {Math.round(log.duration_seconds / 60)} min •{" "}
                            {log.completion_percentage}% complete
                          </p>
                        )}
                      </div>

                      {/* Duration & arrow */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-sm text-muted-foreground">
                          {workout.duration_minutes}m
                        </span>
                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          <Link href="/chat" className="block">
            <Card className="border-0 shadow-md bg-white dark:bg-slate-800 hover:shadow-lg transition-shadow h-full">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
                  <MessageSquare className="h-5 w-5 text-violet-600 dark:text-violet-400" />
                </div>
                <div>
                  <p className="font-medium">AI Coach</p>
                  <p className="text-xs text-muted-foreground">
                    Get advice & modify plan
                  </p>
                </div>
              </CardContent>
            </Card>
          </Link>
          <Link href="/progress" className="block">
            <Card className="border-0 shadow-md bg-white dark:bg-slate-800 hover:shadow-lg transition-shadow h-full">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                  <BarChart3 className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <p className="font-medium">Progress</p>
                  <p className="text-xs text-muted-foreground">
                    Track weight & stats
                  </p>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* No Plan State */}
        {workouts.length === 0 && (
          <Card className="border-0 shadow-lg bg-white dark:bg-slate-800">
            <CardContent className="py-12 text-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Dumbbell className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">
                No Workout Plan Yet
              </h3>
              <p className="text-muted-foreground mb-4">
                Complete the onboarding to get your personalized plan
              </p>
              <Link href="/onboarding">
                <Button>Create My Plan</Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
