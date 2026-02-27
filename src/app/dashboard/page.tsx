"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";
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
  Target,
  ArrowRight,
  Zap,
  Eye,
  SkipForward,
  AlertTriangle,
  TrendingUp,
  Coffee,
} from "lucide-react";
import Link from "next/link";
import { logEventClient } from "@/lib/events";
import { WeeklyCheckinModal } from "@/components/weekly-checkin-modal";
import { BottomNav } from "@/components/bottom-nav";

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

const DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

export default function DashboardPage() {
  const supabase = createClient();
  const router = useRouter();
  const searchParams = useSearchParams();
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

  // Check if we should show check-in modal from URL param
  useEffect(() => {
    if (searchParams.get("showCheckin") === "true") {
      setShowCheckinModal(true);
      // Clean up URL
      router.replace("/dashboard", { scroll: false });
    }
  }, [searchParams, router]);

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

      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (profileData) {
        setProfile(profileData);
      }

      const { data: planData } = await supabase
        .from("workout_plans")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .single();

      if (!planData) {
        router.push("/onboarding");
        return;
      }

      setPlan(planData);

      const { data: logsData } = await supabase
        .from("workout_logs")
        .select("*")
        .eq("plan_id", planData.id)
        .order("completed_at", { ascending: true });

      if (logsData) {
        setWorkoutLogs(logsData);
      }

      setLoading(false);
      logEventClient("plan_viewed", {});
    };

    loadData();
  }, [supabase, router]);

  // Build a full 7-day schedule, filling in rest days where no workout exists
  const buildWeekSchedule = () => {
    const workouts = plan?.exercises?.workouts || [];
    const schedule: any[] = [];

    DAYS.forEach((day, index) => {
      // Find workout for this day
      const workout = workouts.find((w: any) => w.day === day);

      if (workout && !workout.isRestDay && workout.exercises?.length > 0) {
        schedule.push({
          ...workout,
          dayIndex: workouts.indexOf(workout),
          isRestDay: false,
        });
      } else {
        // No workout for this day = rest day
        schedule.push({
          day,
          dayIndex: -1,
          isRestDay: true,
          focus: "Rest & Recovery",
          exercises: [],
        });
      }
    });

    return schedule;
  };

  const isWorkoutCompleted = (dayIndex: number) => {
    if (dayIndex < 0) return false;
    return workoutLogs.some(
      (log) => log.day_index === dayIndex && log.status !== "skipped",
    );
  };

  const isWorkoutSkipped = (dayIndex: number) => {
    if (dayIndex < 0) return false;
    return workoutLogs.some(
      (log) => log.day_index === dayIndex && log.status === "skipped",
    );
  };

  const getWorkoutLog = (dayIndex: number) => {
    return workoutLogs.find((log) => log.day_index === dayIndex);
  };

  const getDayStatus = (
    dayName: string,
    dayIndex: number,
    isRestDay: boolean,
  ) => {
    const today = new Date();
    const currentDayName = today.toLocaleDateString("en-US", {
      weekday: "long",
    });
    const todayIdx = DAYS.indexOf(currentDayName);
    const thisDayIdx = DAYS.indexOf(dayName);

    const completed = !isRestDay && isWorkoutCompleted(dayIndex);
    const skipped = !isRestDay && isWorkoutSkipped(dayIndex);

    const isPastDay = thisDayIdx < todayIdx;
    const isToday = thisDayIdx === todayIdx;
    const daysDiff = todayIdx - thisDayIdx;

    // Check if this day is BEFORE the plan was created (new week scenario)
    // If plan was created on Thursday, Mon/Tue/Wed should be "future" not "missed"
    let isBeforePlanStart = false;
    if (plan?.created_at) {
      const planCreatedAt = new Date(plan.created_at);
      const planCreatedDayName = planCreatedAt.toLocaleDateString("en-US", {
        weekday: "long",
      });
      const planCreatedDayIdx = DAYS.indexOf(planCreatedDayName);

      // If we're in the same week as plan creation, days before plan creation are not missed
      const daysSincePlanCreated = Math.floor(
        (today.getTime() - planCreatedAt.getTime()) / (1000 * 60 * 60 * 24),
      );
      if (daysSincePlanCreated < 7) {
        // Same week - check if this day is before plan was created
        isBeforePlanStart = thisDayIdx < planCreatedDayIdx;
      }
    }

    const withinGracePeriod = daysDiff <= 2 && daysDiff > 0;

    // Only mark as missed if it's a past day AND the plan existed on that day
    const isMissed =
      isPastDay &&
      !isRestDay &&
      !completed &&
      !skipped &&
      dayIndex >= 0 &&
      !isBeforePlanStart;
    const canStillComplete = isMissed && withinGracePeriod;
    const isExpired = isMissed && !withinGracePeriod;

    // Days before plan start should appear as upcoming/future
    const isFutureDay = !isPastDay || isBeforePlanStart;

    return {
      completed,
      skipped,
      isPastDay,
      isToday,
      isMissed,
      canStillComplete,
      isExpired,
      daysDiff,
      isBeforePlanStart,
      isFutureDay,
    };
  };

  const getNextWorkout = () => {
    const schedule = buildWeekSchedule();
    const today = new Date();
    const currentDayName = today.toLocaleDateString("en-US", {
      weekday: "long",
    });
    const todayIdx = DAYS.indexOf(currentDayName);

    // Get plan creation day to know where the week "starts"
    let planStartDayIdx = 0;
    if (plan?.created_at) {
      const planCreatedAt = new Date(plan.created_at);
      const daysSincePlanCreated = Math.floor(
        (today.getTime() - planCreatedAt.getTime()) / (1000 * 60 * 60 * 24),
      );
      if (daysSincePlanCreated < 7) {
        planStartDayIdx = DAYS.indexOf(
          planCreatedAt.toLocaleDateString("en-US", { weekday: "long" }),
        );
      }
    }

    // Look for today or future workouts first (starting from today)
    for (let i = todayIdx; i < 7; i++) {
      const item = schedule[i];
      if (
        !item.isRestDay &&
        item.dayIndex >= 0 &&
        !isWorkoutCompleted(item.dayIndex) &&
        !isWorkoutSkipped(item.dayIndex)
      ) {
        return { workout: item, index: item.dayIndex };
      }
    }

    // Then check days before today but after plan start (wrap around for next week logic)
    for (let i = planStartDayIdx; i < todayIdx; i++) {
      const item = schedule[i];
      const status = getDayStatus(item.day, item.dayIndex, item.isRestDay);
      if (status.canStillComplete) {
        return { workout: item, index: item.dayIndex };
      }
    }

    // Finally, check days before plan start (these are future workouts for this week)
    for (let i = 0; i < planStartDayIdx; i++) {
      const item = schedule[i];
      if (
        !item.isRestDay &&
        item.dayIndex >= 0 &&
        !isWorkoutCompleted(item.dayIndex) &&
        !isWorkoutSkipped(item.dayIndex)
      ) {
        return { workout: item, index: item.dayIndex };
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
    if (index < 0) return;
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

  const handleCheckinComplete = () => {
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

  const schedule = buildWeekSchedule();
  const workoutDays = schedule.filter((s) => !s.isRestDay);
  const totalWorkouts = workoutDays.length;
  const completedCount = workoutLogs.filter(
    (l) => l.status !== "skipped",
  ).length;
  const skippedCount = workoutLogs.filter((l) => l.status === "skipped").length;
  const handledCount = completedCount + skippedCount;
  const progressPercent =
    totalWorkouts > 0 ? (completedCount / totalWorkouts) * 100 : 0;
  const nextWorkout = getNextWorkout();
  const totalMinutes = workoutLogs.reduce(
    (sum, log) => sum + Math.round(log.duration_seconds / 60),
    0,
  );
  const isWeekComplete = handledCount >= totalWorkouts && totalWorkouts > 0;

  const todayName = new Date().toLocaleDateString("en-US", { weekday: "long" });

  return (
    <div className="min-h-screen bg-slate-950 pb-24">
      {/* Header */}
      <header className="bg-gradient-to-b from-violet-600/20 to-slate-950 pt-4 pb-6 px-4">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-violet-400 text-xs font-medium uppercase tracking-wider">
              Week {plan?.week_number || 1}
            </p>
            <h1 className="text-xl font-bold text-white mt-0.5">
              {getGreeting()}, {profile?.full_name?.split(" ")[0] || "there"}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/chat">
              <button className="w-10 h-10 rounded-full bg-slate-800/80 flex items-center justify-center hover:bg-slate-700 transition-colors">
                <MessageSquare className="h-5 w-5 text-slate-300" />
              </button>
            </Link>
            <Link href="/settings">
              <button className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white font-semibold text-sm">
                {profile?.full_name?.charAt(0) || "U"}
              </button>
            </Link>
          </div>
        </div>

        {/* Progress Overview */}
        <div className="bg-slate-800/60 backdrop-blur rounded-2xl p-4 border border-slate-700/50">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-slate-400">Weekly Progress</span>
            <span className="text-sm font-semibold text-white">
              {completedCount}/{totalWorkouts} workouts
            </span>
          </div>
          <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-violet-500 to-indigo-500 rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="flex items-center justify-between mt-3 text-xs text-slate-500">
            <span>{totalMinutes} min trained</span>
            {isWeekComplete && (
              <button
                onClick={() => setShowNextWeekDialog(true)}
                className="text-violet-400 font-medium flex items-center gap-1"
              >
                <Zap className="h-3 w-3" /> Next Week
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="px-4 space-y-6">
        {/* Next Workout CTA */}
        {nextWorkout && !isWeekComplete && (
          <div
            className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-700 p-5 cursor-pointer active:scale-[0.98] transition-transform -mt-2"
            onClick={() => handleStartWorkout(nextWorkout.index)}
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />

            <div className="relative flex items-center justify-between">
              <div>
                <p className="text-violet-200 text-xs font-medium mb-1 uppercase tracking-wider">
                  Today's Workout
                </p>
                <h3 className="text-white text-lg font-bold">
                  {nextWorkout.workout.focus}
                </h3>
                <div className="flex items-center gap-3 mt-2 text-sm text-violet-200">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    {nextWorkout.workout.duration_minutes}m
                  </span>
                  <span className="flex items-center gap-1">
                    <Dumbbell className="h-3.5 w-3.5" />
                    {nextWorkout.workout.exercises?.length || 0} exercises
                  </span>
                </div>
              </div>
              <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center">
                <Play className="h-6 w-6 text-white ml-0.5" />
              </div>
            </div>
          </div>
        )}

        {/* Week Complete Banner */}
        {isWeekComplete && (
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 p-5 text-center -mt-2">
            <div className="text-3xl mb-2">🎉</div>
            <h3 className="text-white text-lg font-bold">Week Complete!</h3>
            <p className="text-emerald-100 text-sm mt-1">
              You finished {completedCount} workouts
            </p>
            <Button
              onClick={() => setShowNextWeekDialog(true)}
              className="mt-4 bg-white text-emerald-700 hover:bg-emerald-50"
            >
              <Zap className="h-4 w-4 mr-2" />
              Start Week {(plan?.week_number || 1) + 1}
            </Button>
          </div>
        )}

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-slate-800/50 rounded-xl p-3 text-center border border-slate-700/40">
            <Flame className="h-5 w-5 text-orange-400 mx-auto mb-1" />
            <p className="text-xl font-bold text-white">{completedCount}</p>
            <p className="text-[10px] text-slate-500 uppercase tracking-wider">
              Done
            </p>
          </div>
          <div className="bg-slate-800/50 rounded-xl p-3 text-center border border-slate-700/40">
            <Clock className="h-5 w-5 text-emerald-400 mx-auto mb-1" />
            <p className="text-xl font-bold text-white">{totalMinutes}m</p>
            <p className="text-[10px] text-slate-500 uppercase tracking-wider">
              Trained
            </p>
          </div>
          <div className="bg-slate-800/50 rounded-xl p-3 text-center border border-slate-700/40">
            <Target className="h-5 w-5 text-violet-400 mx-auto mb-1" />
            <p className="text-xl font-bold text-white">
              {Math.round(progressPercent)}%
            </p>
            <p className="text-[10px] text-slate-500 uppercase tracking-wider">
              Progress
            </p>
          </div>
        </div>

        {/* Weekly Schedule - Grid Layout */}
        <div>
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">
            This Week
          </h2>

          <div className="grid grid-cols-7 gap-1 mb-3">
            {DAYS.map((day) => (
              <div
                key={day}
                className={`text-center text-[10px] font-medium py-1 ${day === todayName ? "text-violet-400" : "text-slate-600"}`}
              >
                {day.slice(0, 3)}
              </div>
            ))}
          </div>

          <div className="space-y-2">
            {schedule.map((item, idx) => {
              const status = getDayStatus(
                item.day,
                item.dayIndex,
                item.isRestDay,
              );
              const log = getWorkoutLog(item.dayIndex);
              const isNext = nextWorkout?.index === item.dayIndex;
              const isToday = item.day === todayName;

              // Rest Day
              if (item.isRestDay) {
                return (
                  <div
                    key={idx}
                    className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/30 border border-slate-800/50"
                  >
                    <div className="w-10 h-10 rounded-xl bg-slate-800/80 flex items-center justify-center">
                      <Coffee className="h-5 w-5 text-slate-600" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-slate-500">{item.day}</p>
                        {isToday && (
                          <span className="text-[10px] text-slate-600 bg-slate-800 px-1.5 py-0.5 rounded">
                            Today
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-600">Rest Day</p>
                    </div>
                  </div>
                );
              }

              // Expired missed
              if (status.isExpired) {
                return (
                  <div
                    key={idx}
                    className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/20 opacity-40"
                  >
                    <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center">
                      <Dumbbell className="h-5 w-5 text-slate-700" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-slate-600">{item.day}</p>
                      <p className="text-xs text-slate-700">{item.focus}</p>
                    </div>
                    <span className="text-[10px] text-slate-600 bg-slate-800/50 px-2 py-1 rounded">
                      Missed
                    </span>
                  </div>
                );
              }

              // Missed but can complete
              if (status.canStillComplete) {
                return (
                  <div
                    key={idx}
                    onClick={() => handleStartWorkout(item.dayIndex)}
                    className="flex items-center gap-3 p-3 rounded-xl bg-orange-500/10 border border-orange-500/30 cursor-pointer"
                  >
                    <div className="w-10 h-10 rounded-xl bg-orange-500 flex items-center justify-center">
                      <AlertTriangle className="h-5 w-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-white">{item.day}</p>
                        <span className="text-[10px] text-orange-400 bg-orange-500/20 px-1.5 py-0.5 rounded">
                          {status.daysDiff === 1
                            ? "Yesterday"
                            : `${status.daysDiff}d ago`}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400">{item.focus}</p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-orange-400" />
                  </div>
                );
              }

              // Completed
              if (status.completed) {
                return (
                  <div
                    key={idx}
                    className="flex items-center gap-3 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30"
                  >
                    <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center">
                      <CheckCircle2 className="h-5 w-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-white">{item.day}</p>
                        {isToday && (
                          <span className="text-[10px] text-emerald-400 bg-emerald-500/20 px-1.5 py-0.5 rounded">
                            Today
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400">{item.focus}</p>
                    </div>
                    <span className="text-sm font-medium text-emerald-400">
                      {log ? `${Math.round(log.duration_seconds / 60)}m` : "✓"}
                    </span>
                  </div>
                );
              }

              // Skipped
              if (status.skipped) {
                return (
                  <div
                    key={idx}
                    className="flex items-center gap-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30"
                  >
                    <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center">
                      <SkipForward className="h-5 w-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-white">{item.day}</p>
                      <p className="text-xs text-slate-400">{item.focus}</p>
                    </div>
                    <span className="text-[10px] text-amber-400 bg-amber-500/20 px-2 py-1 rounded">
                      Skipped
                    </span>
                  </div>
                );
              }

              // Today / Next / Future (including days before plan start)
              const isUpcoming =
                status.isBeforePlanStart &&
                !status.completed &&
                !status.skipped;

              return (
                <div
                  key={idx}
                  onClick={() => handleStartWorkout(item.dayIndex)}
                  className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all ${
                    isNext
                      ? "bg-violet-500/15 border border-violet-500/40"
                      : isToday
                        ? "bg-blue-500/10 border border-blue-500/30"
                        : "bg-slate-800/40 border border-slate-700/40"
                  }`}
                >
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      isNext
                        ? "bg-violet-500"
                        : isToday
                          ? "bg-blue-500"
                          : "bg-slate-700"
                    }`}
                  >
                    <Dumbbell className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-white">{item.day}</p>
                      {isToday && (
                        <span className="text-[10px] text-blue-400 bg-blue-500/20 px-1.5 py-0.5 rounded">
                          Today
                        </span>
                      )}
                      {isNext && !isToday && (
                        <span className="text-[10px] text-violet-400 bg-violet-500/20 px-1.5 py-0.5 rounded">
                          Next
                        </span>
                      )}
                      {isUpcoming && !isNext && (
                        <span className="text-[10px] text-slate-400 bg-slate-700 px-1.5 py-0.5 rounded">
                          Upcoming
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400">{item.focus}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-slate-400">
                      {item.duration_minutes}m
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
        <div className="grid grid-cols-2 gap-3 pb-4">
          <Link href="/nutrition">
            <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/40">
              <div className="w-9 h-9 rounded-lg bg-orange-500/20 flex items-center justify-center mb-2">
                <Flame className="h-4 w-4 text-orange-400" />
              </div>
              <p className="font-medium text-white text-sm">Nutrition</p>
              <p className="text-[10px] text-slate-500">Meal plans</p>
            </div>
          </Link>
          <Link href="/progress">
            <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/40">
              <div className="w-9 h-9 rounded-lg bg-emerald-500/20 flex items-center justify-center mb-2">
                <TrendingUp className="h-4 w-4 text-emerald-400" />
              </div>
              <p className="font-medium text-white text-sm">Progress</p>
              <p className="text-[10px] text-slate-500">Track results</p>
            </div>
          </Link>
        </div>
      </main>

      {/* Dialogs */}
      <Dialog open={showNextWeekDialog} onOpenChange={setShowNextWeekDialog}>
        <DialogContent className="bg-slate-900 border-slate-800">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Zap className="h-5 w-5 text-violet-400" />
              Generate Week {(plan?.week_number || 1) + 1}
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Ready for the next challenge?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="text-center p-3 bg-slate-800/50 rounded-xl">
                <p className="text-xl font-bold text-white">{completedCount}</p>
                <p className="text-[10px] text-slate-500">Completed</p>
              </div>
              <div className="text-center p-3 bg-slate-800/50 rounded-xl">
                <p className="text-xl font-bold text-white">{totalMinutes}m</p>
                <p className="text-[10px] text-slate-500">Trained</p>
              </div>
            </div>
            <Textarea
              placeholder="Any feedback? (optional)"
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              className="bg-slate-800 border-slate-700 text-white text-sm"
              rows={2}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowNextWeekDialog(false)}
              className="border-slate-700 text-slate-300"
            >
              Cancel
            </Button>
            <Button
              onClick={handleGenerateNextWeek}
              disabled={generatingNextWeek}
              className="bg-violet-600 hover:bg-violet-500"
            >
              {generatingNextWeek ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ArrowRight className="h-4 w-4 mr-1" />
              )}
              Generate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
        <DialogContent className="bg-slate-900 border-slate-800 max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white">
              {previewWorkout?.day} — {previewWorkout?.focus}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-4">
            {previewWorkout?.exercises?.map((ex: any, i: number) => (
              <div
                key={i}
                className="flex items-start gap-3 p-3 rounded-xl bg-slate-800/50"
              >
                <div className="w-6 h-6 rounded bg-violet-500/20 flex items-center justify-center text-xs font-bold text-violet-400">
                  {i + 1}
                </div>
                <div>
                  <p className="font-medium text-white text-sm">{ex.name}</p>
                  <p className="text-xs text-slate-400">
                    {ex.sets} × {ex.reps} • {ex.rest_seconds}s rest
                  </p>
                </div>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowPreviewDialog(false)}
              className="border-slate-700 text-slate-300"
            >
              Close
            </Button>
            <Button
              onClick={() => {
                setShowPreviewDialog(false);
                if (previewIndex !== null) handleStartWorkout(previewIndex);
              }}
              className="bg-violet-600"
            >
              <Play className="h-4 w-4 mr-1" />
              Start
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {userId && (
        <WeeklyCheckinModal
          open={showCheckinModal}
          onClose={() => setShowCheckinModal(false)}
          userId={userId}
          completedWorkouts={completedCount}
          skippedWorkouts={skippedCount}
          totalWorkouts={totalWorkouts}
          currentDays={profile?.available_days || []}
          currentGoal={profile?.fitness_goal || ""}
          onCheckinComplete={handleCheckinComplete}
        />
      )}

      <BottomNav />
    </div>
  );
}
