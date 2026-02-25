"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
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
  Target,
  ArrowRight,
  Zap,
  Eye,
  X,
  SkipForward,
  AlertTriangle,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import { logEventClient } from "@/lib/events";
import { WeeklyCheckinModal } from "@/components/weekly-checkin-modal";

type WorkoutLog = {
  id: string;
  day_index: number;
  workout_day: string;
  workout_focus: string;
  duration_seconds: number;
  completion_percentage: number;
  completed_at: string;
  status?: "completed" | "skipped";
};

export default function DashboardPage() {
  const supabase = createClient();
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [plan, setPlan] = useState<any>(null);
  const [workoutLogs, setWorkoutLogs] = useState<WorkoutLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  // Modal states
  const [showCheckinModal, setShowCheckinModal] = useState(false);
  const [showNextWeekDialog, setShowNextWeekDialog] = useState(false);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [previewWorkout, setPreviewWorkout] = useState<any>(null);
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);

  // Form states
  const [feedback, setFeedback] = useState("");
  const [generatingNextWeek, setGeneratingNextWeek] = useState(false);

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

      setUserId(user.id);

      // Fetch profile
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (profileData) {
        setProfile(profileData);
        if (!profileData.onboarding_completed) {
          router.push("/onboarding");
          return;
        }
      }

      // Fetch active workout plan
      const { data: planData } = await supabase
        .from("workout_plans")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .single();

      if (planData) {
        setPlan(planData);

        // Fetch workout logs for this plan
        const { data: logsData } = await supabase
          .from("workout_logs")
          .select("*")
          .eq("plan_id", planData.id)
          .order("completed_at", { ascending: true });

        if (logsData) {
          setWorkoutLogs(logsData);
        }
      }

      setLoading(false);
      logEventClient("dashboard_viewed", {});
    };

    loadData();
  }, [supabase, router]);

  // Helper functions
  const isWorkoutCompleted = (dayIndex: number) => {
    return workoutLogs.some(
      (log) => log.day_index === dayIndex && log.status !== "skipped",
    );
  };

  const isWorkoutSkipped = (dayIndex: number) => {
    return workoutLogs.some(
      (log) => log.day_index === dayIndex && log.status === "skipped",
    );
  };

  const isWorkoutHandled = (dayIndex: number) => {
    return workoutLogs.some((log) => log.day_index === dayIndex);
  };

  const getWorkoutLog = (dayIndex: number) => {
    return workoutLogs.find((log) => log.day_index === dayIndex);
  };

  // Get day status for missed day logic
  const getDayStatus = (dayIndex: number, workout: any) => {
    const dayOrder = [
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
      "Sunday",
    ];
    const today = new Date();
    const currentDayName = today.toLocaleDateString("en-US", {
      weekday: "long",
    });
    const todayIndex = dayOrder.indexOf(currentDayName);
    const workoutDayIndex = dayOrder.indexOf(workout.day);

    const isRestDay = workout.isRestDay || workout.exercises?.length === 0;
    const completed = !isRestDay && isWorkoutCompleted(dayIndex);
    const skipped = !isRestDay && isWorkoutSkipped(dayIndex);

    const isPastDay = workoutDayIndex < todayIndex;
    const isToday = workoutDayIndex === todayIndex;
    const daysDiff = todayIndex - workoutDayIndex;
    const withinGracePeriod = daysDiff <= 2;

    const isMissed = isPastDay && !isRestDay && !completed && !skipped;
    const canStillComplete = isMissed && withinGracePeriod;
    const isExpired = isMissed && !withinGracePeriod;

    return {
      isRestDay,
      completed,
      skipped,
      isPastDay,
      isToday,
      isMissed,
      canStillComplete,
      isExpired,
      daysDiff,
    };
  };

  // Find next workout
  const getNextWorkout = () => {
    if (!plan?.exercises?.workouts) return null;
    const workouts = plan.exercises.workouts;
    const dayOrder = [
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
      "Sunday",
    ];
    const today = new Date();
    const currentDayName = today.toLocaleDateString("en-US", {
      weekday: "long",
    });
    const todayIndex = dayOrder.indexOf(currentDayName);

    // Look for today or future workouts first
    for (let i = 0; i < workouts.length; i++) {
      const workoutDayIndex = dayOrder.indexOf(workouts[i].day);
      const isRestDay =
        workouts[i].isRestDay || workouts[i].exercises?.length === 0;
      const isPastDay = workoutDayIndex < todayIndex;

      if (!isPastDay && !isRestDay && !isWorkoutHandled(i)) {
        return { workout: workouts[i], index: i };
      }
    }

    // Check for missed workouts within grace period
    for (let i = 0; i < workouts.length; i++) {
      const status = getDayStatus(i, workouts[i]);
      if (status.canStillComplete) {
        return { workout: workouts[i], index: i };
      }
    }

    return null;
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  const handleStartWorkout = (index: number) => {
    logEventClient("workout_started", { day_index: index });
    router.push(`/workout/${index}`);
  };

  const handlePreviewWorkout = (
    workout: any,
    index: number,
    e: React.MouseEvent,
  ) => {
    e.stopPropagation();
    setPreviewWorkout(workout);
    setPreviewIndex(index);
    setShowPreviewDialog(true);
  };

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
        setShowNextWeekDialog(false);
        setFeedback("");
        window.location.reload();
      } else {
        alert(data.message || "Failed to generate next week");
      }
    } catch (error) {
      console.error("Failed to generate next week:", error);
      alert("Failed to generate next week. Please try again.");
    } finally {
      setGeneratingNextWeek(false);
    }
  };

  const handleCheckinComplete = (adaptations: string[]) => {
    window.location.reload();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="flex flex-col items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center animate-pulse">
            <Dumbbell className="h-7 w-7 text-white" />
          </div>
          <Loader2 className="h-5 w-5 animate-spin text-violet-400" />
        </div>
      </div>
    );
  }

  const workouts = plan?.exercises?.workouts || [];
  const workoutDays = workouts.filter(
    (w: any) => !w.isRestDay && w.exercises?.length > 0,
  );
  const totalWorkouts = workoutDays.length;
  const completedCount = workoutLogs.filter(
    (l) => l.status !== "skipped",
  ).length;
  const progressPercent =
    totalWorkouts > 0 ? (completedCount / totalWorkouts) * 100 : 0;
  const nextWorkout = getNextWorkout();
  const totalMinutes = workoutLogs.reduce(
    (sum, log) => sum + Math.round(log.duration_seconds / 60),
    0,
  );
  const isWeekComplete =
    completedCount + workoutLogs.filter((l) => l.status === "skipped").length >=
      totalWorkouts && totalWorkouts > 0;

  return (
    <div className="min-h-screen bg-slate-950 pb-24">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-slate-950/90 backdrop-blur-lg border-b border-slate-800/50">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-violet-400 text-xs font-medium tracking-wide uppercase">
                Week {plan?.week_number || 1}
              </p>
              <h1 className="text-xl font-bold text-white mt-0.5">
                {getGreeting()}, {profile?.full_name?.split(" ")[0] || "there"}
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <Link href="/chat">
                <button className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center hover:bg-slate-700 transition-colors">
                  <MessageSquare className="h-5 w-5 text-slate-400" />
                </button>
              </Link>
              <Link href="/settings">
                <button className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white font-semibold text-sm">
                  {profile?.full_name?.charAt(0) || "U"}
                </button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="px-4 py-6 space-y-6 max-w-lg mx-auto">
        {/* Progress Card */}
        <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 rounded-3xl p-5 border border-slate-700/50">
          <div className="flex items-center gap-5">
            {/* Circular Progress */}
            <div className="relative w-20 h-20 flex-shrink-0">
              <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
                <circle
                  cx="40"
                  cy="40"
                  r="34"
                  stroke="#334155"
                  strokeWidth="6"
                  fill="none"
                />
                <circle
                  cx="40"
                  cy="40"
                  r="34"
                  stroke="url(#progressGradient)"
                  strokeWidth="6"
                  fill="none"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 34}`}
                  strokeDashoffset={`${2 * Math.PI * 34 * (1 - progressPercent / 100)}`}
                  className="transition-all duration-700 ease-out"
                />
                <defs>
                  <linearGradient
                    id="progressGradient"
                    x1="0%"
                    y1="0%"
                    x2="100%"
                    y2="0%"
                  >
                    <stop offset="0%" stopColor="#8b5cf6" />
                    <stop offset="100%" stopColor="#6366f1" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xl font-bold text-white">
                  {completedCount}
                  <span className="text-slate-500 text-sm">
                    /{totalWorkouts}
                  </span>
                </span>
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <h2 className="text-white font-semibold text-lg">
                {isWeekComplete
                  ? "Week Complete! 🎉"
                  : `${totalWorkouts - completedCount} workouts left`}
              </h2>
              <p className="text-slate-400 text-sm mt-0.5">
                {totalMinutes > 0
                  ? `${totalMinutes} minutes this week`
                  : "Let's get moving!"}
              </p>
              {isWeekComplete && (
                <button
                  onClick={() => setShowNextWeekDialog(true)}
                  className="mt-3 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium rounded-xl transition-colors inline-flex items-center gap-2"
                >
                  <Zap className="h-4 w-4" />
                  Next Week
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Next Workout Card */}
        {nextWorkout && !isWeekComplete && (
          <div
            className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-violet-600 via-violet-600 to-indigo-700 p-6 cursor-pointer active:scale-[0.98] transition-transform"
            onClick={() => handleStartWorkout(nextWorkout.index)}
          >
            {/* Background decoration */}
            <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-indigo-400/20 rounded-full blur-2xl translate-y-1/2 -translate-x-1/4" />

            <div className="relative">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-violet-200 text-sm font-medium mb-1">
                    Up Next
                  </p>
                  <h3 className="text-white text-xl font-bold mb-1">
                    {nextWorkout.workout.focus}
                  </h3>
                  <p className="text-violet-200/80 text-sm">
                    {nextWorkout.workout.day}
                  </p>
                </div>
                <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <Play className="h-7 w-7 text-white ml-0.5" />
                </div>
              </div>

              <div className="flex items-center gap-4 mt-5 text-sm text-violet-100">
                <span className="flex items-center gap-1.5">
                  <Clock className="h-4 w-4 opacity-70" />
                  {nextWorkout.workout.duration_minutes} min
                </span>
                <span className="flex items-center gap-1.5">
                  <Dumbbell className="h-4 w-4 opacity-70" />
                  {nextWorkout.workout.exercises?.length || 0} exercises
                </span>
                <button
                  className="ml-auto flex items-center gap-1.5 text-white/80 hover:text-white transition-colors"
                  onClick={(e) =>
                    handlePreviewWorkout(
                      nextWorkout.workout,
                      nextWorkout.index,
                      e,
                    )
                  }
                >
                  <Eye className="h-4 w-4" />
                  Preview
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-slate-800/60 rounded-2xl p-4 border border-slate-700/40">
            <Flame className="h-5 w-5 text-orange-400 mb-2" />
            <p className="text-2xl font-bold text-white">{completedCount}</p>
            <p className="text-xs text-slate-500 mt-0.5">Workouts</p>
          </div>
          <div className="bg-slate-800/60 rounded-2xl p-4 border border-slate-700/40">
            <Clock className="h-5 w-5 text-emerald-400 mb-2" />
            <p className="text-2xl font-bold text-white">{totalMinutes}</p>
            <p className="text-xs text-slate-500 mt-0.5">Minutes</p>
          </div>
          <div className="bg-slate-800/60 rounded-2xl p-4 border border-slate-700/40">
            <Target className="h-5 w-5 text-violet-400 mb-2" />
            <p className="text-2xl font-bold text-white">
              {Math.round(progressPercent)}%
            </p>
            <p className="text-xs text-slate-500 mt-0.5">Complete</p>
          </div>
        </div>

        {/* Weekly Schedule */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">This Week</h2>
            {completedCount > 0 && !isWeekComplete && (
              <button
                onClick={() => setShowCheckinModal(true)}
                className="text-sm text-violet-400 hover:text-violet-300 flex items-center gap-1.5"
              >
                <BarChart3 className="h-4 w-4" />
                Check-in
              </button>
            )}
          </div>

          <div className="space-y-2">
            {workouts.map((workout: any, index: number) => {
              const status = getDayStatus(index, workout);
              const log = getWorkoutLog(index);
              const isNext = nextWorkout?.index === index && !status.isRestDay;

              // Rest Day
              if (status.isRestDay) {
                return (
                  <div
                    key={index}
                    className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-slate-800/30 border border-slate-800/50"
                  >
                    <div className="w-11 h-11 rounded-xl bg-slate-800 flex items-center justify-center text-lg">
                      😴
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-slate-500">
                        {workout.day}
                      </p>
                      <p className="text-sm text-slate-600">Rest Day</p>
                    </div>
                  </div>
                );
              }

              // Expired (missed past grace period)
              if (status.isExpired) {
                return (
                  <div
                    key={index}
                    className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-slate-800/20 opacity-50"
                  >
                    <div className="w-11 h-11 rounded-xl bg-slate-800 flex items-center justify-center">
                      <X className="h-5 w-5 text-slate-600" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-slate-600">
                        {workout.day}
                      </p>
                      <p className="text-sm text-slate-700">{workout.focus}</p>
                    </div>
                    <span className="text-xs text-slate-600 bg-slate-800/50 px-2 py-1 rounded-lg">
                      Missed
                    </span>
                  </div>
                );
              }

              // Missed but can still complete
              if (status.canStillComplete) {
                return (
                  <div
                    key={index}
                    onClick={() => handleStartWorkout(index)}
                    className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-orange-500/10 border border-orange-500/30 cursor-pointer hover:bg-orange-500/15 transition-colors"
                  >
                    <div className="w-11 h-11 rounded-xl bg-orange-500 flex items-center justify-center">
                      <AlertTriangle className="h-5 w-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-white">{workout.day}</p>
                        <span className="text-xs text-orange-400 bg-orange-500/20 px-1.5 py-0.5 rounded">
                          {status.daysDiff === 1
                            ? "Yesterday"
                            : `${status.daysDiff}d ago`}
                        </span>
                      </div>
                      <p className="text-sm text-slate-400">{workout.focus}</p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-orange-400" />
                  </div>
                );
              }

              // Completed
              if (status.completed) {
                return (
                  <div
                    key={index}
                    className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30"
                  >
                    <div className="w-11 h-11 rounded-xl bg-emerald-500 flex items-center justify-center">
                      <CheckCircle2 className="h-5 w-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-white">{workout.day}</p>
                      <p className="text-sm text-slate-400">{workout.focus}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-emerald-400">
                        {log
                          ? `${Math.round(log.duration_seconds / 60)}m`
                          : "✓"}
                      </p>
                    </div>
                  </div>
                );
              }

              // Skipped
              if (status.skipped) {
                return (
                  <div
                    key={index}
                    className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-amber-500/10 border border-amber-500/30"
                  >
                    <div className="w-11 h-11 rounded-xl bg-amber-500 flex items-center justify-center">
                      <SkipForward className="h-5 w-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-white">{workout.day}</p>
                      <p className="text-sm text-slate-400">{workout.focus}</p>
                    </div>
                    <span className="text-xs text-amber-400 bg-amber-500/20 px-2 py-1 rounded-lg">
                      Skipped
                    </span>
                  </div>
                );
              }

              // Today / Next / Future
              return (
                <div
                  key={index}
                  onClick={() => handleStartWorkout(index)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-2xl cursor-pointer transition-all ${
                    isNext
                      ? "bg-violet-500/10 border border-violet-500/40 hover:bg-violet-500/15"
                      : status.isToday
                        ? "bg-blue-500/10 border border-blue-500/40 hover:bg-blue-500/15"
                        : "bg-slate-800/50 border border-slate-700/40 hover:bg-slate-800/70"
                  }`}
                >
                  <div
                    className={`w-11 h-11 rounded-xl flex items-center justify-center ${
                      isNext
                        ? "bg-violet-500"
                        : status.isToday
                          ? "bg-blue-500"
                          : "bg-slate-700"
                    }`}
                  >
                    <Dumbbell className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-white">{workout.day}</p>
                      {status.isToday && (
                        <span className="text-xs text-blue-400 bg-blue-500/20 px-1.5 py-0.5 rounded">
                          Today
                        </span>
                      )}
                      {isNext && !status.isToday && (
                        <span className="text-xs text-violet-400 bg-violet-500/20 px-1.5 py-0.5 rounded">
                          Next
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-400">{workout.focus}</p>
                  </div>
                  <div className="text-right mr-1">
                    <p className="text-sm text-slate-400">
                      {workout.duration_minutes}m
                    </p>
                  </div>
                  <ChevronRight
                    className={`h-5 w-5 ${isNext ? "text-violet-400" : "text-slate-600"}`}
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          <Link href="/nutrition">
            <div className="bg-slate-800/50 rounded-2xl p-4 border border-slate-700/40 hover:bg-slate-800/70 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center mb-3">
                <Utensils className="h-5 w-5 text-orange-400" />
              </div>
              <p className="font-medium text-white">Nutrition</p>
              <p className="text-xs text-slate-500 mt-0.5">
                Meal plans & macros
              </p>
            </div>
          </Link>
          <Link href="/progress">
            <div className="bg-slate-800/50 rounded-2xl p-4 border border-slate-700/40 hover:bg-slate-800/70 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center mb-3">
                <TrendingUp className="h-5 w-5 text-emerald-400" />
              </div>
              <p className="font-medium text-white">Progress</p>
              <p className="text-xs text-slate-500 mt-0.5">
                Track your results
              </p>
            </div>
          </Link>
        </div>
      </main>

      {/* Next Week Dialog */}
      <Dialog open={showNextWeekDialog} onOpenChange={setShowNextWeekDialog}>
        <DialogContent className="sm:max-w-md bg-slate-900 border-slate-800">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-white">
              <Zap className="h-5 w-5 text-violet-400" />
              Generate Week {(plan?.week_number || 1) + 1}
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Ready for the next challenge? We'll create your plan based on this
              week's progress.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="text-center p-4 bg-slate-800/50 rounded-xl">
                <p className="text-2xl font-bold text-white">
                  {completedCount}
                </p>
                <p className="text-xs text-slate-500">Completed</p>
              </div>
              <div className="text-center p-4 bg-slate-800/50 rounded-xl">
                <p className="text-2xl font-bold text-white">{totalMinutes}m</p>
                <p className="text-xs text-slate-500">Trained</p>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">
                Feedback (optional)
              </label>
              <Textarea
                placeholder="How did this week feel? Any adjustments needed?"
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                rows={3}
                className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 resize-none"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setShowNextWeekDialog(false)}
              disabled={generatingNextWeek}
              className="border-slate-700 text-slate-300 hover:bg-slate-800"
            >
              Cancel
            </Button>
            <Button
              onClick={handleGenerateNextWeek}
              disabled={generatingNextWeek}
              className="bg-violet-600 hover:bg-violet-500 text-white"
            >
              {generatingNextWeek ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <ArrowRight className="h-4 w-4 mr-2" />
                  Generate
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
        <DialogContent className="sm:max-w-md bg-slate-900 border-slate-800 max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white">
              {previewWorkout?.day} — {previewWorkout?.focus}
            </DialogTitle>
            <DialogDescription className="text-slate-400 flex items-center gap-3">
              <span className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {previewWorkout?.duration_minutes}m
              </span>
              <span className="flex items-center gap-1">
                <Dumbbell className="h-4 w-4" />
                {previewWorkout?.exercises?.length} exercises
              </span>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 py-4">
            {previewWorkout?.exercises?.map((ex: any, i: number) => (
              <div
                key={i}
                className="flex items-start gap-3 p-3 rounded-xl bg-slate-800/50 border border-slate-700/50"
              >
                <div className="w-7 h-7 rounded-lg bg-violet-500/20 flex items-center justify-center text-xs font-bold text-violet-400 flex-shrink-0 mt-0.5">
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-white text-sm">{ex.name}</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {ex.sets} × {ex.reps} • {ex.rest_seconds}s rest
                  </p>
                  {ex.notes && (
                    <p className="text-xs text-slate-500 mt-1">💡 {ex.notes}</p>
                  )}
                </div>
              </div>
            ))}
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setShowPreviewDialog(false)}
              className="border-slate-700 text-slate-300 hover:bg-slate-800"
            >
              Close
            </Button>
            <Button
              onClick={() => {
                setShowPreviewDialog(false);
                if (previewIndex !== null) handleStartWorkout(previewIndex);
              }}
              className="bg-violet-600 hover:bg-violet-500 text-white"
            >
              <Play className="h-4 w-4 mr-2" />
              Start
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Weekly Check-in Modal */}
      {userId && (
        <WeeklyCheckinModal
          open={showCheckinModal}
          onClose={() => setShowCheckinModal(false)}
          userId={userId}
          completedWorkouts={
            workoutLogs.filter((log) => log.status !== "skipped").length
          }
          skippedWorkouts={
            workoutLogs.filter((log) => log.status === "skipped").length
          }
          totalWorkouts={totalWorkouts}
          currentDays={profile?.available_days || []}
          currentGoal={profile?.fitness_goal || ""}
          onCheckinComplete={handleCheckinComplete}
        />
      )}
    </div>
  );
}
