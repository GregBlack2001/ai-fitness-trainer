"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Loader2,
  Dumbbell,
  Clock,
  Play,
  CheckCircle2,
  Flame,
  ChevronRight,
  MessageSquare,
  BarChart3,
  Utensils,
  Sparkles,
  Calendar,
  Target,
  Trophy,
  ArrowRight,
  Zap,
  Eye,
  X,
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

  // Next week generation state
  const [showNextWeekDialog, setShowNextWeekDialog] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [generatingNextWeek, setGeneratingNextWeek] = useState(false);

  // Preview state
  const [previewWorkout, setPreviewWorkout] = useState<any>(null);
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

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
  }, [supabase, router]);

  const handleStartWorkout = (index: number) => {
    router.push(`/workout/${index}`);
  };

  const handlePreviewWorkout = (
    workout: any,
    index: number,
    e: React.MouseEvent
  ) => {
    e.stopPropagation(); // Don't trigger the card click
    setPreviewWorkout(workout);
    setPreviewIndex(index);
  };

  const closePreview = () => {
    setPreviewWorkout(null);
    setPreviewIndex(null);
  };

  const isWorkoutCompleted = (dayIndex: number) => {
    return workoutLogs.some((log) => log.day_index === dayIndex);
  };

  const getWorkoutLog = (dayIndex: number) => {
    return workoutLogs.find((log) => log.day_index === dayIndex);
  };

  // Find next workout to do (skip rest days)
  const getNextWorkout = () => {
    if (!plan?.exercises?.workouts) return null;
    const workouts = plan.exercises.workouts;
    for (let i = 0; i < workouts.length; i++) {
      const isRestDay =
        workouts[i].isRestDay || workouts[i].exercises?.length === 0;
      if (!isRestDay && !isWorkoutCompleted(i)) {
        return { workout: workouts[i], index: i };
      }
    }
    return null;
  };

  // Get greeting based on time
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  // Handle generating next week
  const handleGenerateNextWeek = async () => {
    if (!profile?.id) return;
    setGeneratingNextWeek(true);

    try {
      const response = await fetch("/api/workout/next-week", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: profile.id,
          feedback: feedback.trim() || undefined,
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Close dialog and reset
        setShowNextWeekDialog(false);
        setFeedback("");
        setWorkoutLogs([]); // Clear old logs

        // Update plan state directly with new data
        setPlan({
          ...plan,
          id: data.planId,
          week_number: data.weekNumber,
          exercises: data.plan,
        });

        // Also force a full page reload to ensure fresh data
        window.location.href = "/dashboard";
      } else {
        alert(data.message || data.error || "Failed to generate next week");
      }
    } catch (error) {
      console.error("Failed to generate next week:", error);
      alert("Failed to generate next week. Please try again.");
    } finally {
      setGeneratingNextWeek(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const workouts = plan?.exercises?.workouts || [];
  const workoutDays = workouts.filter(
    (w: any) => !w.isRestDay && w.exercises?.length > 0
  );
  const totalWorkouts = workoutDays.length;
  const completedWorkouts = workoutLogs.length;
  const progressPercentage =
    totalWorkouts > 0 ? (completedWorkouts / totalWorkouts) * 100 : 0;
  const nextWorkout = getNextWorkout();

  // Calculate stats
  const totalTimeSpent = workoutLogs.reduce(
    (sum, log) => sum + Math.round(log.duration_seconds / 60),
    0
  );
  const totalSets = workoutLogs.reduce((sum, log) => {
    const workout = workouts[log.day_index];
    if (!workout) return sum;
    return (
      sum +
      workout.exercises?.reduce((s: number, e: any) => s + (e.sets || 0), 0)
    );
  }, 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <main className="container mx-auto px-4 py-6 max-w-6xl">
        {/* Welcome Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-1">
            {getGreeting()}, {profile?.full_name?.split(" ")[0] || "there"}! 👋
          </h1>
          <p className="text-muted-foreground">
            {completedWorkouts === 0
              ? "Ready to start your fitness journey?"
              : completedWorkouts < totalWorkouts
              ? "Keep up the great work!"
              : "Amazing week! You crushed it! 🎉"}
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Content - Left 2 columns */}
          <div className="lg:col-span-2 space-y-6">
            {/* Next Workout Card */}
            {nextWorkout ? (
              <Card className="border-0 shadow-xl overflow-hidden bg-gradient-to-br from-primary via-primary to-primary/80">
                <CardContent className="p-6 text-white">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <Badge className="bg-white/20 text-white border-0 mb-3">
                        <Sparkles className="h-3 w-3 mr-1" />
                        Up Next
                      </Badge>
                      <h2 className="text-2xl font-bold mb-1">
                        {nextWorkout.workout.day}
                      </h2>
                      <p className="text-white/80">
                        {nextWorkout.workout.focus}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-4xl font-bold">
                        {nextWorkout.workout.duration_minutes}
                      </p>
                      <p className="text-white/80 text-sm">minutes</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 mb-6 text-sm text-white/80">
                    <span className="flex items-center gap-1">
                      <Dumbbell className="h-4 w-4" />
                      {nextWorkout.workout.exercises?.length || 0} exercises
                    </span>
                    <span className="flex items-center gap-1">
                      <Target className="h-4 w-4" />
                      {nextWorkout.workout.exercises?.reduce(
                        (s: number, e: any) => s + (e.sets || 0),
                        0
                      )}{" "}
                      sets
                    </span>
                    <button
                      className="flex items-center gap-1 hover:text-white transition-colors"
                      onClick={(e) =>
                        handlePreviewWorkout(
                          nextWorkout.workout,
                          nextWorkout.index,
                          e
                        )
                      }
                    >
                      <Eye className="h-4 w-4" />
                      Preview
                    </button>
                  </div>

                  <Button
                    size="lg"
                    className="w-full bg-white text-primary hover:bg-white/90 h-14 text-lg font-semibold"
                    onClick={() => handleStartWorkout(nextWorkout.index)}
                  >
                    <Play className="h-5 w-5 mr-2" />
                    Start Workout
                  </Button>
                </CardContent>
              </Card>
            ) : totalWorkouts > 0 ? (
              <Card className="border-0 shadow-xl overflow-hidden bg-gradient-to-br from-emerald-500 to-teal-500">
                <CardContent className="p-6 text-white">
                  <Trophy className="h-16 w-16 mx-auto mb-4 text-yellow-300" />
                  <h2 className="text-2xl font-bold mb-2 text-center">
                    Week {plan?.week_number} Complete! 🎉
                  </h2>
                  <p className="text-white/80 text-center mb-6">
                    You've finished all {totalWorkouts} workouts. Amazing work!
                  </p>
                  <Button
                    size="lg"
                    className="w-full bg-white text-emerald-600 hover:bg-white/90 h-14 text-lg font-semibold"
                    onClick={() => setShowNextWeekDialog(true)}
                  >
                    <Zap className="h-5 w-5 mr-2" />
                    Generate Week {(plan?.week_number || 1) + 1}
                  </Button>
                </CardContent>
              </Card>
            ) : null}

            {/* Weekly Schedule */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">
                  Week {plan?.week_number || 1} Schedule
                </h2>
                <Badge variant="secondary">
                  {completedWorkouts}/
                  {workouts.filter((w: any) => !w.isRestDay).length} done
                </Badge>
              </div>

              {workouts.length > 0 ? (
                <div className="space-y-3">
                  {workouts.map((workout: any, index: number) => {
                    const isRestDay =
                      workout.isRestDay || workout.exercises?.length === 0;
                    const completed = !isRestDay && isWorkoutCompleted(index);
                    const log = getWorkoutLog(index);
                    const isNext = nextWorkout?.index === index && !isRestDay;

                    // Rest day card
                    if (isRestDay) {
                      return (
                        <Card
                          key={index}
                          className="border-0 shadow-sm bg-slate-50 dark:bg-slate-800/50 opacity-75"
                        >
                          <CardContent className="p-4">
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 bg-slate-200 dark:bg-slate-700 text-muted-foreground">
                                <span className="text-xl">😴</span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <h3 className="font-semibold text-muted-foreground">
                                  {workout.day}
                                </h3>
                                <p className="text-sm text-muted-foreground">
                                  Rest & Recovery
                                </p>
                              </div>
                              <Badge
                                variant="outline"
                                className="text-muted-foreground"
                              >
                                Rest Day
                              </Badge>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    }

                    // Workout day card
                    return (
                      <Card
                        key={index}
                        className={`border-0 shadow-md transition-all cursor-pointer hover:shadow-lg ${
                          completed
                            ? "bg-emerald-50 dark:bg-emerald-950/30"
                            : isNext
                            ? "bg-primary/5 ring-2 ring-primary"
                            : "bg-white dark:bg-slate-800"
                        }`}
                        onClick={() => handleStartWorkout(index)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center gap-4">
                            {/* Status Circle */}
                            <div
                              className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
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
                                <Dumbbell className="h-5 w-5" />
                              )}
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-semibold">{workout.day}</h3>
                                {isNext && !completed && (
                                  <Badge className="bg-primary text-white text-xs">
                                    Next
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {workout.focus}
                              </p>
                              {completed && log && (
                                <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
                                  Completed in{" "}
                                  {Math.round(log.duration_seconds / 60)} min
                                </p>
                              )}
                            </div>

                            {/* Meta */}
                            <div className="text-right flex-shrink-0">
                              <p className="text-sm font-medium">
                                {workout.duration_minutes} min
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {workout.exercises?.length} exercises
                              </p>
                            </div>

                            {/* Preview button */}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="flex-shrink-0 h-8 w-8"
                              onClick={(e) =>
                                handlePreviewWorkout(workout, index, e)
                              }
                              title="Preview workout"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>

                            <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              ) : (
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
            </div>
          </div>

          {/* Sidebar - Right column */}
          <div className="space-y-6">
            {/* Progress Card */}
            <Card className="border-0 shadow-lg bg-white dark:bg-slate-800">
              <CardContent className="p-6">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-primary" />
                  Weekly Progress
                </h3>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-muted-foreground">Completion</span>
                      <span className="font-medium">
                        {Math.round(progressPercentage)}%
                      </span>
                    </div>
                    <Progress value={progressPercentage} className="h-3" />
                  </div>
                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <div className="text-center p-3 bg-muted/50 rounded-lg">
                      <p className="text-2xl font-bold text-primary">
                        {completedWorkouts}
                      </p>
                      <p className="text-xs text-muted-foreground">Workouts</p>
                    </div>
                    <div className="text-center p-3 bg-muted/50 rounded-lg">
                      <p className="text-2xl font-bold text-orange-500">
                        {totalTimeSpent}
                      </p>
                      <p className="text-xs text-muted-foreground">Minutes</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <Card className="border-0 shadow-lg bg-gradient-to-br from-orange-500 to-red-500 text-white">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Flame className="h-6 w-6" />
                  <span className="font-semibold">Current Streak</span>
                </div>
                <p className="text-5xl font-bold mb-1">{completedWorkouts}</p>
                <p className="text-white/80 text-sm">workouts this week</p>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <div className="space-y-3">
              <Link href="/chat" className="block">
                <Card className="border-0 shadow-md bg-white dark:bg-slate-800 hover:shadow-lg transition-shadow">
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
                      <MessageSquare className="h-5 w-5 text-violet-600 dark:text-violet-400" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">AI Coach</p>
                      <p className="text-xs text-muted-foreground">
                        Get advice & modify plan
                      </p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </CardContent>
                </Card>
              </Link>

              <Link href="/nutrition" className="block">
                <Card className="border-0 shadow-md bg-white dark:bg-slate-800 hover:shadow-lg transition-shadow">
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                      <Utensils className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">Nutrition</p>
                      <p className="text-xs text-muted-foreground">
                        Meal plans & macros
                      </p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </CardContent>
                </Card>
              </Link>

              <Link href="/progress" className="block">
                <Card className="border-0 shadow-md bg-white dark:bg-slate-800 hover:shadow-lg transition-shadow">
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                      <BarChart3 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">Progress</p>
                      <p className="text-xs text-muted-foreground">
                        Track weight & stats
                      </p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </CardContent>
                </Card>
              </Link>
            </div>
          </div>
        </div>

        {/* Next Week Generation Dialog */}
        <Dialog open={showNextWeekDialog} onOpenChange={setShowNextWeekDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                Generate Week {(plan?.week_number || 1) + 1}
              </DialogTitle>
              <DialogDescription>
                Your AI coach will create a progressive workout plan based on
                your performance.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Stats summary */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-muted/50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-primary">
                    {completedWorkouts}
                  </p>
                  <p className="text-xs text-muted-foreground">Workouts Done</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-orange-500">
                    {totalTimeSpent}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Minutes Trained
                  </p>
                </div>
              </div>

              {/* Feedback input */}
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  How was this week? (optional)
                </label>
                <Textarea
                  placeholder="e.g., 'Felt great, ready for more challenge' or 'Struggled with upper body exercises' or 'Need more rest days'"
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  rows={3}
                />
                <p className="text-xs text-muted-foreground">
                  Your feedback helps the AI adjust next week's difficulty and
                  focus.
                </p>
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                variant="outline"
                onClick={() => setShowNextWeekDialog(false)}
                disabled={generatingNextWeek}
              >
                Cancel
              </Button>
              <Button
                onClick={handleGenerateNextWeek}
                disabled={generatingNextWeek}
              >
                {generatingNextWeek ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <ArrowRight className="h-4 w-4 mr-2" />
                    Generate Week {(plan?.week_number || 1) + 1}
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Workout Preview Dialog */}
        <Dialog
          open={previewWorkout !== null}
          onOpenChange={(open) => !open && closePreview()}
        >
          <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Dumbbell className="h-5 w-5 text-primary" />
                {previewWorkout?.day} - {previewWorkout?.focus}
              </DialogTitle>
              <DialogDescription className="flex items-center gap-4">
                <span className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {previewWorkout?.duration_minutes} minutes
                </span>
                <span className="flex items-center gap-1">
                  <Target className="h-4 w-4" />
                  {previewWorkout?.exercises?.length} exercises
                </span>
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Exercise List */}
              {previewWorkout?.exercises?.map((exercise: any, idx: number) => (
                <div key={idx} className="border rounded-lg p-4 bg-muted/30">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                        {idx + 1}
                      </div>
                      <div>
                        <h4 className="font-semibold">{exercise.name}</h4>
                        <p className="text-sm text-muted-foreground">
                          {exercise.sets} sets × {exercise.reps} reps
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {exercise.rest_seconds}s rest
                    </Badge>
                  </div>
                  {exercise.notes && (
                    <p className="text-sm text-muted-foreground mt-2 pl-11">
                      💡 {exercise.notes}
                    </p>
                  )}
                </div>
              ))}
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={closePreview}>
                Close
              </Button>
              <Button
                onClick={() => {
                  closePreview();
                  if (previewIndex !== null) handleStartWorkout(previewIndex);
                }}
              >
                <Play className="h-4 w-4 mr-2" />
                Start Workout
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
