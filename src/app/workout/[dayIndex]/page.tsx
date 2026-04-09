"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
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
  Play,
  Pause,
  SkipForward,
  CheckCircle2,
  Dumbbell,
  Clock,
  Flame,
  Trophy,
  X,
  Volume2,
  VolumeX,
  Zap,
  Timer,
  ChevronDown,
  Info,
} from "lucide-react";
import { logEventClient } from "@/lib/events";

type Exercise = {
  name: string;
  sets: number;
  reps?: number;
  duration_seconds?: number;
  duration_minutes?: number;
  rest_seconds: number;
  notes?: string;
};

type Workout = {
  day: string;
  focus: string;
  duration_minutes: number;
  exercises: Exercise[];
  notes?: string;
};

type ExerciseLog = {
  exerciseIndex: number;
  completedSets: number[];
  skipped: boolean;
};

export default function WorkoutSessionPage() {
  const params = useParams();
  const router = useRouter();
  const supabase = createClient();
  const dayIndex = parseInt(params.dayIndex as string);

  // Core state
  const [loading, setLoading] = useState(true);
  const [workout, setWorkout] = useState<Workout | null>(null);
  const [planId, setPlanId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  // Session state
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [currentSet, setCurrentSet] = useState(1);
  const [phase, setPhase] = useState<
    "warmup" | "exercise" | "rest" | "complete"
  >("warmup");
  const [exerciseLogs, setExerciseLogs] = useState<ExerciseLog[]>([]);

  // Timer state
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [totalElapsedTime, setTotalElapsedTime] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const elapsedRef = useRef<NodeJS.Timeout | null>(null);

  // UI state
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [showExerciseList, setShowExerciseList] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [saving, setSaving] = useState(false);

  // Load workout data
  useEffect(() => {
    const loadWorkout = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }
      setUserId(user.id);

      const { data: plan } = await supabase
        .from("workout_plans")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .single();

      if (!plan?.exercises?.workouts?.[dayIndex]) {
        router.push("/dashboard");
        return;
      }

      setPlanId(plan.id);
      setWorkout(plan.exercises.workouts[dayIndex]);

      // Initialize exercise logs
      const logs = plan.exercises.workouts[dayIndex].exercises.map(
        (_: Exercise, i: number) => ({
          exerciseIndex: i,
          completedSets: [],
          skipped: false,
        }),
      );
      setExerciseLogs(logs);
      setLoading(false);

      logEventClient("workout_started", {
        day_index: dayIndex,
        workout_day: plan.exercises.workouts[dayIndex].day,
        workout_focus: plan.exercises.workouts[dayIndex].focus,
      });
    };

    loadWorkout();
  }, [supabase, dayIndex, router]);

  // Start elapsed time tracker
  useEffect(() => {
    if (!loading && phase !== "complete") {
      elapsedRef.current = setInterval(() => {
        setTotalElapsedTime((prev) => prev + 1);
      }, 1000);
    }

    return () => {
      if (elapsedRef.current) clearInterval(elapsedRef.current);
    };
  }, [loading, phase]);

  // Timer logic
  useEffect(() => {
    if (isTimerRunning && timeRemaining > 0) {
      timerRef.current = setTimeout(() => {
        setTimeRemaining((prev) => prev - 1);
      }, 1000);
    } else if (isTimerRunning && timeRemaining === 0) {
      handleTimerComplete();
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isTimerRunning, timeRemaining]);

  const playSound = useCallback(
    (type: "complete" | "rest" | "finish") => {
      if (!soundEnabled) return;
      const audioContext = new (
        window.AudioContext || (window as any).webkitAudioContext
      )();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value =
        type === "finish" ? 880 : type === "complete" ? 660 : 440;
      oscillator.type = "sine";
      gainNode.gain.value = 0.3;

      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.15);

      if (type === "finish") {
        setTimeout(() => {
          const osc2 = audioContext.createOscillator();
          const gain2 = audioContext.createGain();
          osc2.connect(gain2);
          gain2.connect(audioContext.destination);
          osc2.frequency.value = 1100;
          osc2.type = "sine";
          gain2.gain.value = 0.3;
          osc2.start();
          osc2.stop(audioContext.currentTime + 0.2);
        }, 200);
      }
    },
    [soundEnabled],
  );

  const handleTimerComplete = useCallback(() => {
    setIsTimerRunning(false);
    playSound(phase === "rest" ? "complete" : "rest");

    if (phase === "warmup") {
      setPhase("exercise");
    } else if (phase === "rest") {
      const currentExercise = workout?.exercises[currentExerciseIndex];
      if (currentSet < (currentExercise?.sets || 1)) {
        setCurrentSet((prev) => prev + 1);
        setPhase("exercise");
      } else {
        moveToNextExercise();
      }
    }
  }, [phase, currentSet, currentExerciseIndex, workout, playSound]);

  const moveToNextExercise = () => {
    if (!workout) return;

    if (currentExerciseIndex < workout.exercises.length - 1) {
      setCurrentExerciseIndex((prev) => prev + 1);
      setCurrentSet(1);
      setPhase("exercise");
    } else {
      setPhase("complete");
      playSound("finish");
      if (elapsedRef.current) clearInterval(elapsedRef.current);
      setShowCompleteDialog(true);
    }
  };

  const startWarmup = () => {
    setPhase("warmup");
    setTimeRemaining(60);
    setIsTimerRunning(true);
  };

  const skipWarmup = () => {
    setPhase("exercise");
  };

  const completeSet = () => {
    if (!workout) return;

    setExerciseLogs((prev) => {
      const updated = [...prev];
      updated[currentExerciseIndex].completedSets.push(currentSet);
      return updated;
    });

    const currentExercise = workout.exercises[currentExerciseIndex];

    if (currentSet < currentExercise.sets) {
      setPhase("rest");
      setTimeRemaining(currentExercise.rest_seconds || 60);
      setIsTimerRunning(true);
    } else {
      moveToNextExercise();
    }
  };

  const skipExercise = () => {
    setExerciseLogs((prev) => {
      const updated = [...prev];
      updated[currentExerciseIndex].skipped = true;
      return updated;
    });
    moveToNextExercise();
  };

  const skipRest = () => {
    setIsTimerRunning(false);
    setTimeRemaining(0);

    const currentExercise = workout?.exercises[currentExerciseIndex];
    if (currentSet < (currentExercise?.sets || 1)) {
      setCurrentSet((prev) => prev + 1);
      setPhase("exercise");
    } else {
      moveToNextExercise();
    }
  };

  const toggleTimer = () => {
    setIsTimerRunning((prev) => !prev);
  };

  const addRestTime = (seconds: number) => {
    setTimeRemaining((prev) => Math.max(0, prev + seconds));
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const saveWorkout = async () => {
    if (!userId || !planId || !workout) return;

    setSaving(true);
    try {
      const completedExercises = exerciseLogs.filter(
        (log) => !log.skipped && log.completedSets.length > 0,
      ).length;
      const totalSetsCompleted = exerciseLogs.reduce(
        (sum, log) => sum + log.completedSets.length,
        0,
      );
      const completionPercentage = Math.round(
        (completedExercises / workout.exercises.length) * 100,
      );

      const response = await fetch("/api/workout/log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          planId,
          dayIndex,
          workout: {
            day: workout.day,
            focus: workout.focus,
          },
          duration_seconds: totalElapsedTime,
          exercises_completed: completedExercises,
          total_exercises: workout.exercises.length,
          sets_completed: totalSetsCompleted,
          exercise_logs: exerciseLogs,
        }),
      });

      const data = await response.json();

      logEventClient("workout_completed", {
        day_index: dayIndex,
        workout_day: workout.day,
        workout_focus: workout.focus,
        duration_seconds: totalElapsedTime,
        exercises_completed: completedExercises,
        total_exercises: workout.exercises.length,
        sets_completed: totalSetsCompleted,
        completion_percentage: completionPercentage,
      });

      if (data.isWeekComplete) {
        router.push("/dashboard?showCheckin=true");
      } else {
        router.push("/dashboard");
      }
    } catch (error) {
      console.error("Failed to save workout:", error);
      router.push("/dashboard");
    } finally {
      setSaving(false);
    }
  };

  const exitWorkout = () => {
    if (elapsedRef.current) clearInterval(elapsedRef.current);
    router.push("/dashboard");
  };

  const skipWorkout = async () => {
    if (!userId || !planId || !workout) return;

    setSaving(true);

    try {
      const response = await fetch("/api/workout/log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          planId,
          dayIndex,
          workout: {
            day: workout.day,
            focus: workout.focus,
          },
          duration_seconds: 0,
          exercises_completed: 0,
          total_exercises: workout.exercises.length,
          sets_completed: 0,
          exercise_logs: [],
          status: "skipped",
        }),
      });

      const data = await response.json();

      logEventClient("workout_skipped", {
        day_index: dayIndex,
        workout_day: workout.day,
        workout_focus: workout.focus,
        total_exercises: workout.exercises.length,
        reason: "user_skipped",
      });

      if (data.isWeekComplete) {
        router.push("/dashboard?showCheckin=true");
      } else {
        router.push("/dashboard");
      }
    } catch (error) {
      console.error("Failed to save skipped workout:", error);
      router.push("/dashboard");
    } finally {
      setSaving(false);
    }
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

  if (!workout) return null;

  const currentExercise = workout.exercises[currentExerciseIndex];
  const progressPercent =
    ((currentExerciseIndex + (currentSet - 1) / currentExercise.sets) /
      workout.exercises.length) *
    100;

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-slate-950/90 backdrop-blur-lg border-b border-slate-800/50">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setShowExitDialog(true)}
              className="w-10 h-10 rounded-full bg-slate-800/80 flex items-center justify-center"
            >
              <X className="h-5 w-5 text-slate-400" />
            </button>

            <div className="text-center">
              <p className="font-semibold text-white">{workout.focus}</p>
              <p className="text-xs text-slate-500">{workout.day}</p>
            </div>

            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="w-10 h-10 rounded-full bg-slate-800/80 flex items-center justify-center"
            >
              {soundEnabled ? (
                <Volume2 className="h-5 w-5 text-slate-400" />
              ) : (
                <VolumeX className="h-5 w-5 text-slate-600" />
              )}
            </button>
          </div>

          {/* Progress bar */}
          <div className="mt-3">
            <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-violet-500 to-indigo-500 rounded-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-slate-500 mt-1.5 uppercase tracking-wider">
              <span>
                {currentExerciseIndex + 1} of {workout.exercises.length}{" "}
                exercises
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatTime(totalElapsedTime)}
              </span>
            </div>
          </div>
        </div>
      </header>

      <main className="px-4 py-6 pb-32">
        {/* Pre-workout Start Screen */}
        {phase === "warmup" && timeRemaining === 0 && !isTimerRunning && (
          <div className="space-y-6">
            {/* Hero */}
            <div className="text-center pt-8 pb-4">
              <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center mb-6 shadow-lg shadow-violet-500/25">
                <Dumbbell className="h-10 w-10 text-white" />
              </div>
              <h1 className="text-3xl font-bold text-white mb-2">
                {workout.focus}
              </h1>
              <p className="text-slate-400">{workout.day}'s Workout</p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-slate-800/50 rounded-2xl p-4 text-center border border-slate-700/40">
                <Dumbbell className="h-5 w-5 text-violet-400 mx-auto mb-2" />
                <p className="text-2xl font-bold text-white">
                  {workout.exercises.length}
                </p>
                <p className="text-[10px] text-slate-500 uppercase tracking-wider">
                  Exercises
                </p>
              </div>
              <div className="bg-slate-800/50 rounded-2xl p-4 text-center border border-slate-700/40">
                <Clock className="h-5 w-5 text-emerald-400 mx-auto mb-2" />
                <p className="text-2xl font-bold text-white">
                  {workout.duration_minutes}
                </p>
                <p className="text-[10px] text-slate-500 uppercase tracking-wider">
                  Minutes
                </p>
              </div>
              <div className="bg-slate-800/50 rounded-2xl p-4 text-center border border-slate-700/40">
                <Flame className="h-5 w-5 text-orange-400 mx-auto mb-2" />
                <p className="text-2xl font-bold text-white">
                  {workout.exercises.reduce((sum, ex) => sum + ex.sets, 0)}
                </p>
                <p className="text-[10px] text-slate-500 uppercase tracking-wider">
                  Total Sets
                </p>
              </div>
            </div>

            {/* Exercise Preview */}
            <div className="bg-slate-800/30 rounded-2xl border border-slate-700/40 overflow-hidden">
              <button
                onClick={() => setShowExerciseList(!showExerciseList)}
                className="w-full flex items-center justify-between p-4"
              >
                <span className="text-sm font-medium text-slate-300">
                  Exercise List
                </span>
                <ChevronDown
                  className={`h-5 w-5 text-slate-500 transition-transform ${showExerciseList ? "rotate-180" : ""}`}
                />
              </button>
              {showExerciseList && (
                <div className="border-t border-slate-700/40 max-h-64 overflow-y-auto">
                  {workout.exercises.map((ex, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-3 p-3 border-b border-slate-800/50 last:border-0"
                    >
                      <div className="w-8 h-8 rounded-lg bg-slate-700/50 flex items-center justify-center text-xs font-bold text-slate-400">
                        {i + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">
                          {ex.name}
                        </p>
                        <p className="text-xs text-slate-500">
                          {ex.sets} × {ex.reps || `${ex.duration_seconds}s`}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Coach's Note */}
            {workout.notes && (
              <div className="bg-violet-500/10 rounded-2xl p-4 border border-violet-500/20">
                <div className="flex items-start gap-3">
                  <Info className="h-5 w-5 text-violet-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-violet-300 mb-1">
                      Coach's Note
                    </p>
                    <p className="text-sm text-slate-400">{workout.notes}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-3 pt-4">
              <Button
                onClick={startWarmup}
                className="w-full h-14 text-lg bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 rounded-2xl"
              >
                <Flame className="mr-2 h-5 w-5" />
                Start with Warmup
              </Button>
              <Button
                onClick={skipWarmup}
                variant="outline"
                className="w-full h-12 rounded-2xl border-slate-700 text-slate-300 hover:bg-slate-800"
              >
                Skip to Exercises
              </Button>
              <button
                onClick={skipWorkout}
                disabled={saving}
                className="w-full text-center text-sm text-slate-500 hover:text-slate-400 py-2"
              >
                {saving ? "Saving..." : "Skip Today's Workout"}
              </button>
            </div>
          </div>
        )}

        {/* Warmup Timer */}
        {phase === "warmup" && (timeRemaining > 0 || isTimerRunning) && (
          <div className="space-y-8 pt-8">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center mb-6 shadow-lg shadow-orange-500/25">
                <Flame className="h-8 w-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Warm Up</h2>
              <p className="text-slate-400">Get your body ready</p>
            </div>

            {/* Timer Display */}
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-b from-orange-500/20 to-transparent rounded-3xl blur-3xl" />
              <div className="relative bg-slate-800/50 rounded-3xl p-8 border border-slate-700/40">
                <div className="text-center">
                  <div className="text-8xl font-mono font-bold text-white tracking-tight">
                    {formatTime(timeRemaining)}
                  </div>
                </div>
              </div>
            </div>

            {/* Warmup Tips */}
            <div className="bg-slate-800/30 rounded-2xl p-4 border border-slate-700/40">
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-3">
                Quick Warmup
              </p>
              <div className="space-y-2 text-sm text-slate-400">
                <p>• Light cardio — jumping jacks, jogging in place</p>
                <p>• Dynamic stretches — arm circles, leg swings</p>
                <p>• Mobility work for today's target muscles</p>
              </div>
            </div>

            {/* Controls */}
            <div className="flex gap-3">
              <Button
                onClick={skipWarmup}
                variant="outline"
                className="flex-1 h-14 rounded-2xl border-slate-700 text-slate-300"
              >
                Skip
              </Button>
              <Button
                onClick={toggleTimer}
                className={`flex-1 h-14 rounded-2xl ${isTimerRunning ? "bg-slate-700" : "bg-orange-500 hover:bg-orange-400"}`}
              >
                {isTimerRunning ? (
                  <Pause className="mr-2 h-5 w-5" />
                ) : (
                  <Play className="mr-2 h-5 w-5" />
                )}
                {isTimerRunning ? "Pause" : "Resume"}
              </Button>
            </div>
          </div>
        )}

        {/* Exercise Phase */}
        {phase === "exercise" && (
          <div className="space-y-6">
            {/* Exercise Header */}
            <div className="bg-gradient-to-br from-violet-600/20 to-indigo-600/10 rounded-3xl p-6 border border-violet-500/20">
              <div className="flex items-start justify-between mb-4">
                <span className="text-xs font-medium text-violet-400 bg-violet-500/20 px-2.5 py-1 rounded-full">
                  Exercise {currentExerciseIndex + 1} of{" "}
                  {workout.exercises.length}
                </span>
                <span className="text-xs text-slate-500">
                  {currentExercise.rest_seconds}s rest
                </span>
              </div>
              <h2 className="text-2xl font-bold text-white mb-1">
                {currentExercise.name}
              </h2>
              <p className="text-slate-400">
                {currentExercise.reps
                  ? `${currentExercise.reps} reps`
                  : currentExercise.duration_seconds
                    ? `${currentExercise.duration_seconds} seconds`
                    : currentExercise.duration_minutes
                      ? `${currentExercise.duration_minutes} minutes`
                      : "Complete"}
              </p>
            </div>

            {/* Set Tracker */}
            <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700/40">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm text-slate-400">Set Progress</span>
                <span className="text-lg font-bold text-white">
                  {currentSet} / {currentExercise.sets}
                </span>
              </div>

              {/* Set Indicators */}
              <div className="flex justify-center gap-3 mb-6">
                {Array.from({ length: currentExercise.sets }).map((_, i) => {
                  const isCompleted = exerciseLogs[
                    currentExerciseIndex
                  ]?.completedSets.includes(i + 1);
                  const isCurrent = i + 1 === currentSet;

                  return (
                    <div
                      key={i}
                      className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold transition-all ${
                        isCompleted
                          ? "bg-emerald-500 text-white"
                          : isCurrent
                            ? "bg-violet-500 text-white ring-4 ring-violet-500/30"
                            : "bg-slate-700/50 text-slate-500"
                      }`}
                    >
                      {isCompleted ? (
                        <CheckCircle2 className="h-6 w-6" />
                      ) : (
                        i + 1
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Target Display */}
              <div className="text-center py-4">
                <div className="text-6xl font-bold text-white mb-2">
                  {currentExercise.reps ||
                    currentExercise.duration_seconds ||
                    currentExercise.duration_minutes}
                </div>
                <div className="text-slate-500 uppercase text-sm tracking-wider">
                  {currentExercise.reps
                    ? "reps"
                    : currentExercise.duration_seconds
                      ? "seconds"
                      : "minutes"}
                </div>
              </div>
            </div>

            {/* Notes */}
            {currentExercise.notes && (
              <div className="bg-amber-500/10 rounded-2xl p-4 border border-amber-500/20">
                <div className="flex items-start gap-3">
                  <Zap className="h-5 w-5 text-amber-400 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-slate-300">
                    {currentExercise.notes}
                  </p>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3">
              <Button
                onClick={skipExercise}
                variant="outline"
                className="flex-1 h-14 rounded-2xl border-slate-700 text-slate-300"
              >
                <SkipForward className="mr-2 h-5 w-5" />
                Skip
              </Button>
              <Button
                onClick={completeSet}
                className="flex-[2] h-14 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-lg font-semibold"
              >
                <CheckCircle2 className="mr-2 h-6 w-6" />
                Complete Set
              </Button>
            </div>

            {/* Up Next */}
            {currentExerciseIndex < workout.exercises.length - 1 && (
              <div className="bg-slate-800/30 rounded-2xl p-4 border border-slate-700/40">
                <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">
                  Up Next
                </p>
                <div className="flex items-center justify-between">
                  <span className="font-medium text-white">
                    {workout.exercises[currentExerciseIndex + 1].name}
                  </span>
                  <span className="text-sm text-slate-500">
                    {workout.exercises[currentExerciseIndex + 1].sets} sets
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Rest Phase */}
        {phase === "rest" && (
          <div className="space-y-8 pt-4">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center mb-6 shadow-lg shadow-blue-500/25">
                <Timer className="h-8 w-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Rest</h2>
              <p className="text-slate-400">
                {currentSet < currentExercise.sets
                  ? `Get ready for set ${currentSet + 1}`
                  : `Next: ${workout.exercises[currentExerciseIndex + 1]?.name || "Finish"}`}
              </p>
            </div>

            {/* Timer Display */}
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-b from-blue-500/20 to-transparent rounded-3xl blur-3xl" />
              <div className="relative bg-slate-800/50 rounded-3xl p-8 border border-slate-700/40">
                <div className="text-center">
                  <div
                    className={`text-8xl font-mono font-bold tracking-tight transition-colors ${
                      timeRemaining <= 5
                        ? "text-red-400"
                        : timeRemaining <= 10
                          ? "text-amber-400"
                          : "text-white"
                    }`}
                  >
                    {formatTime(timeRemaining)}
                  </div>
                </div>
              </div>
            </div>

            {/* Timer Controls */}
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={() => addRestTime(-15)}
                disabled={timeRemaining < 15}
                className="w-14 h-14 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 hover:bg-slate-700 disabled:opacity-50"
              >
                -15
              </button>
              <button
                onClick={toggleTimer}
                className="w-16 h-16 rounded-2xl bg-blue-500 flex items-center justify-center text-white hover:bg-blue-400"
              >
                {isTimerRunning ? (
                  <Pause className="h-7 w-7" />
                ) : (
                  <Play className="h-7 w-7 ml-1" />
                )}
              </button>
              <button
                onClick={() => addRestTime(15)}
                className="w-14 h-14 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 hover:bg-slate-700"
              >
                +15
              </button>
            </div>

            {/* Skip Rest */}
            <Button
              onClick={skipRest}
              className="w-full h-14 rounded-2xl bg-slate-800 hover:bg-slate-700 border border-slate-700"
            >
              <SkipForward className="mr-2 h-5 w-5" />
              Skip Rest
            </Button>
          </div>
        )}
      </main>

      {/* Exit Dialog */}
      <Dialog open={showExitDialog} onOpenChange={setShowExitDialog}>
        <DialogContent className="bg-slate-900 border-slate-800">
          <DialogHeader>
            <DialogTitle className="text-white">Exit Workout?</DialogTitle>
            <DialogDescription className="text-slate-400">
              Your progress will not be saved. Are you sure you want to exit?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setShowExitDialog(false)}
              className="border-slate-700 text-slate-300"
            >
              Continue Workout
            </Button>
            <Button
              onClick={exitWorkout}
              className="bg-red-500 hover:bg-red-400"
            >
              Exit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Complete Dialog */}
      <Dialog open={showCompleteDialog} onOpenChange={setShowCompleteDialog}>
        <DialogContent className="bg-slate-900 border-slate-800 sm:max-w-md">
          <DialogHeader className="text-center pt-4">
            <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center mb-4 shadow-lg shadow-emerald-500/25">
              <Trophy className="h-10 w-10 text-white" />
            </div>
            <DialogTitle className="text-2xl text-white">
              Workout Complete! 🎉
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Amazing work on your {workout.focus} session!
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-3 gap-3 py-6">
            <div className="bg-slate-800/50 rounded-xl p-3 text-center border border-slate-700/40">
              <Clock className="h-5 w-5 text-violet-400 mx-auto mb-1" />
              <p className="text-xl font-bold text-white">
                {formatTime(totalElapsedTime)}
              </p>
              <p className="text-[10px] text-slate-500 uppercase">Duration</p>
            </div>
            <div className="bg-slate-800/50 rounded-xl p-3 text-center border border-slate-700/40">
              <Dumbbell className="h-5 w-5 text-emerald-400 mx-auto mb-1" />
              <p className="text-xl font-bold text-white">
                {
                  exerciseLogs.filter(
                    (l) => !l.skipped && l.completedSets.length > 0,
                  ).length
                }
              </p>
              <p className="text-[10px] text-slate-500 uppercase">Exercises</p>
            </div>
            <div className="bg-slate-800/50 rounded-xl p-3 text-center border border-slate-700/40">
              <Flame className="h-5 w-5 text-orange-400 mx-auto mb-1" />
              <p className="text-xl font-bold text-white">
                {exerciseLogs.reduce(
                  (sum, l) => sum + l.completedSets.length,
                  0,
                )}
              </p>
              <p className="text-[10px] text-slate-500 uppercase">Sets</p>
            </div>
          </div>

          <DialogFooter>
            <Button
              onClick={saveWorkout}
              disabled={saving}
              className="w-full h-14 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-lg font-semibold"
            >
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-2 h-6 w-6" />
                  Save & Continue
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
