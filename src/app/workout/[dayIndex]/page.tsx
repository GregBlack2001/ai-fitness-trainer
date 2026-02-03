"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
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
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Dumbbell,
  Clock,
  Flame,
  Trophy,
  X,
  Volume2,
  VolumeX,
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

      // Log workout started event
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
      // Using Web Audio API for simple beeps
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
      // Move to next set or exercise
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
      // Workout complete!
      setPhase("complete");
      playSound("finish");
      if (elapsedRef.current) clearInterval(elapsedRef.current);
      setShowCompleteDialog(true);
    }
  };

  const startWarmup = () => {
    setPhase("warmup");
    setTimeRemaining(60); // 1 minute warmup
    setIsTimerRunning(true);
  };

  const skipWarmup = () => {
    setPhase("exercise");
  };

  const completeSet = () => {
    if (!workout) return;

    // Log the completed set
    setExerciseLogs((prev) => {
      const updated = [...prev];
      updated[currentExerciseIndex].completedSets.push(currentSet);
      return updated;
    });

    const currentExercise = workout.exercises[currentExerciseIndex];

    if (currentSet < currentExercise.sets) {
      // Start rest timer
      setPhase("rest");
      setTimeRemaining(currentExercise.rest_seconds || 60);
      setIsTimerRunning(true);
    } else {
      // All sets complete for this exercise
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
    setTimeRemaining((prev) => prev + seconds);
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

      await fetch("/api/workout/log", {
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

      // Log workout completed event
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
    } catch (error) {
      console.error("Failed to save workout:", error);
    } finally {
      setSaving(false);
      router.push("/dashboard");
    }
  };

  const exitWorkout = () => {
    if (elapsedRef.current) clearInterval(elapsedRef.current);
    router.push("/dashboard");
  };

  const skipWorkout = async () => {
    if (!userId || !planId || !workout) return;

    // Log the skip event
    logEventClient("workout_skipped", {
      day_index: dayIndex,
      workout_day: workout.day,
      workout_focus: workout.focus,
      total_exercises: workout.exercises.length,
      reason: "user_skipped",
    });

    // Navigate back to dashboard
    router.push("/dashboard");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted/30">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!workout) return null;

  const currentExercise = workout.exercises[currentExerciseIndex];
  const progressPercent =
    ((currentExerciseIndex + (currentSet - 1) / currentExercise.sets) /
      workout.exercises.length) *
    100;
  const completedSetsForCurrent =
    exerciseLogs[currentExerciseIndex]?.completedSets.length || 0;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-primary/5">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowExitDialog(true)}
            >
              <X className="h-4 w-4 mr-1" />
              Exit
            </Button>

            <div className="text-center">
              <p className="font-semibold">{workout.day}</p>
              <p className="text-xs text-muted-foreground">{workout.focus}</p>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSoundEnabled(!soundEnabled)}
            >
              {soundEnabled ? (
                <Volume2 className="h-4 w-4" />
              ) : (
                <VolumeX className="h-4 w-4" />
              )}
            </Button>
          </div>

          {/* Progress bar */}
          <div className="mt-3">
            <Progress value={progressPercent} className="h-2" />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>
                Exercise {currentExerciseIndex + 1}/{workout.exercises.length}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatTime(totalElapsedTime)}
              </span>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-2xl">
        {/* Warmup Phase */}
        {phase === "warmup" && (
          <Card className="border-2 border-orange-500/30 bg-gradient-to-br from-orange-500/10 to-yellow-500/5">
            <CardHeader className="text-center pb-2">
              <div className="mx-auto w-16 h-16 bg-orange-500/20 rounded-full flex items-center justify-center mb-4">
                <Flame className="h-8 w-8 text-orange-500" />
              </div>
              <CardTitle className="text-2xl">Warm Up</CardTitle>
              <p className="text-muted-foreground">
                Get your body ready for the workout
              </p>
            </CardHeader>
            <CardContent className="text-center space-y-6">
              {/* Timer Display */}
              <div className="text-7xl font-mono font-bold tracking-tight">
                {formatTime(timeRemaining)}
              </div>

              <div className="space-y-2 text-sm text-muted-foreground">
                <p>• Light cardio (jumping jacks, jogging in place)</p>
                <p>• Dynamic stretches (arm circles, leg swings)</p>
                <p>• Mobility work for today's target muscles</p>
              </div>

              <div className="flex gap-3 justify-center">
                <Button size="lg" variant="outline" onClick={skipWarmup}>
                  Skip Warmup
                </Button>
                <Button size="lg" onClick={toggleTimer}>
                  {isTimerRunning ? (
                    <Pause className="mr-2 h-5 w-5" />
                  ) : (
                    <Play className="mr-2 h-5 w-5" />
                  )}
                  {isTimerRunning ? "Pause" : "Start"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Exercise Phase */}
        {phase === "exercise" && (
          <div className="space-y-6">
            {/* Current Exercise Card */}
            <Card className="border-2 border-primary/30 overflow-hidden">
              <div className="bg-gradient-to-r from-primary/20 to-primary/5 px-6 py-4">
                <div className="flex items-start justify-between">
                  <div>
                    <Badge variant="secondary" className="mb-2">
                      Exercise {currentExerciseIndex + 1} of{" "}
                      {workout.exercises.length}
                    </Badge>
                    <h2 className="text-2xl font-bold">
                      {currentExercise.name}
                    </h2>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold text-primary">
                      Set {currentSet}/{currentExercise.sets}
                    </div>
                  </div>
                </div>
              </div>

              <CardContent className="pt-6 space-y-6">
                {/* Set indicators */}
                <div className="flex justify-center gap-2">
                  {Array.from({ length: currentExercise.sets }).map((_, i) => (
                    <div
                      key={i}
                      className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all ${
                        exerciseLogs[
                          currentExerciseIndex
                        ]?.completedSets.includes(i + 1)
                          ? "bg-green-500 text-white"
                          : i + 1 === currentSet
                            ? "bg-primary text-primary-foreground ring-4 ring-primary/30"
                            : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {exerciseLogs[
                        currentExerciseIndex
                      ]?.completedSets.includes(i + 1) ? (
                        <CheckCircle2 className="h-5 w-5" />
                      ) : (
                        i + 1
                      )}
                    </div>
                  ))}
                </div>

                {/* Rep/Duration info */}
                <div className="text-center">
                  <div className="text-5xl font-bold mb-2">
                    {currentExercise.reps ? (
                      <>{currentExercise.reps} reps</>
                    ) : currentExercise.duration_seconds ? (
                      <>{currentExercise.duration_seconds}s</>
                    ) : currentExercise.duration_minutes ? (
                      <>{currentExercise.duration_minutes} min</>
                    ) : (
                      "Complete"
                    )}
                  </div>
                  {currentExercise.notes && (
                    <p className="text-muted-foreground bg-muted/50 rounded-lg p-3 text-sm">
                      💡 {currentExercise.notes}
                    </p>
                  )}
                </div>

                {/* Action buttons */}
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={skipExercise}
                  >
                    <SkipForward className="mr-2 h-4 w-4" />
                    Skip Exercise
                  </Button>
                  <Button className="flex-1 h-14 text-lg" onClick={completeSet}>
                    <CheckCircle2 className="mr-2 h-5 w-5" />
                    Complete Set
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Up Next */}
            {currentExerciseIndex < workout.exercises.length - 1 && (
              <Card className="bg-muted/30">
                <CardContent className="py-4">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                    Up Next
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="font-medium">
                      {workout.exercises[currentExerciseIndex + 1].name}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {workout.exercises[currentExerciseIndex + 1].sets} sets
                    </span>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Rest Phase */}
        {phase === "rest" && (
          <Card className="border-2 border-blue-500/30 bg-gradient-to-br from-blue-500/10 to-cyan-500/5">
            <CardHeader className="text-center pb-2">
              <div className="mx-auto w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mb-4">
                <RotateCcw className="h-8 w-8 text-blue-500" />
              </div>
              <CardTitle className="text-xl">Rest Period</CardTitle>
              <p className="text-muted-foreground">
                {currentSet < currentExercise.sets
                  ? `Get ready for set ${currentSet + 1}`
                  : `Get ready for ${workout.exercises[currentExerciseIndex + 1]?.name || "the next exercise"}`}
              </p>
            </CardHeader>
            <CardContent className="text-center space-y-6">
              {/* Timer Display */}
              <div
                className={`text-8xl font-mono font-bold tracking-tight transition-colors ${
                  timeRemaining <= 5
                    ? "text-red-500"
                    : timeRemaining <= 10
                      ? "text-yellow-500"
                      : ""
                }`}
              >
                {formatTime(timeRemaining)}
              </div>

              {/* Timer controls */}
              <div className="flex gap-2 justify-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => addRestTime(-15)}
                  disabled={timeRemaining < 15}
                >
                  -15s
                </Button>
                <Button variant="outline" size="icon" onClick={toggleTimer}>
                  {isTimerRunning ? (
                    <Pause className="h-4 w-4" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => addRestTime(15)}
                >
                  +15s
                </Button>
              </div>

              <Button size="lg" onClick={skipRest} className="w-full">
                <SkipForward className="mr-2 h-5 w-5" />
                Skip Rest
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Pre-workout start screen */}
        {phase === "warmup" && timeRemaining === 0 && !isTimerRunning && (
          <div className="text-center space-y-6 py-12">
            <div className="mx-auto w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center">
              <Dumbbell className="h-12 w-12 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold mb-2">{workout.day} Workout</h1>
              <p className="text-muted-foreground text-lg">{workout.focus}</p>
            </div>

            <div className="flex justify-center gap-6 text-sm">
              <div className="text-center">
                <div className="text-2xl font-bold">
                  {workout.exercises.length}
                </div>
                <div className="text-muted-foreground">Exercises</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">
                  {workout.duration_minutes}
                </div>
                <div className="text-muted-foreground">Minutes</div>
              </div>
            </div>

            {workout.notes && (
              <Card className="bg-muted/50 text-left">
                <CardContent className="py-4">
                  <p className="text-sm">
                    <strong>Coach's Note:</strong> {workout.notes}
                  </p>
                </CardContent>
              </Card>
            )}

            <div className="flex flex-col gap-3 items-center pt-4">
              <div className="flex gap-3">
                <Button size="lg" variant="outline" onClick={skipWarmup}>
                  Skip Warmup
                </Button>
                <Button size="lg" onClick={startWarmup}>
                  <Play className="mr-2 h-5 w-5" />
                  Start Warmup
                </Button>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground"
                onClick={skipWorkout}
              >
                <SkipForward className="mr-2 h-4 w-4" />
                Skip Today's Workout
              </Button>
            </div>
          </div>
        )}
      </main>

      {/* Exit Confirmation Dialog */}
      <Dialog open={showExitDialog} onOpenChange={setShowExitDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Exit Workout?</DialogTitle>
            <DialogDescription>
              Your progress will not be saved. Are you sure you want to exit?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowExitDialog(false)}>
              Continue Workout
            </Button>
            <Button variant="destructive" onClick={exitWorkout}>
              Exit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Workout Complete Dialog */}
      <Dialog open={showCompleteDialog} onOpenChange={setShowCompleteDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="text-center">
            <div className="mx-auto w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mb-4">
              <Trophy className="h-10 w-10 text-green-500" />
            </div>
            <DialogTitle className="text-2xl">Workout Complete! 🎉</DialogTitle>
            <DialogDescription className="text-base">
              Amazing work! You crushed your {workout.day} workout.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-3 gap-4 py-4">
            <div className="text-center">
              <div className="text-2xl font-bold">
                {formatTime(totalElapsedTime)}
              </div>
              <div className="text-xs text-muted-foreground">Duration</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">
                {
                  exerciseLogs.filter(
                    (l) => !l.skipped && l.completedSets.length > 0,
                  ).length
                }
              </div>
              <div className="text-xs text-muted-foreground">Exercises</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">
                {exerciseLogs.reduce(
                  (sum, l) => sum + l.completedSets.length,
                  0,
                )}
              </div>
              <div className="text-xs text-muted-foreground">Sets</div>
            </div>
          </div>

          <DialogFooter>
            <Button
              className="w-full"
              size="lg"
              onClick={saveWorkout}
              disabled={saving}
            >
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-2 h-5 w-5" />
                  Save & Return to Dashboard
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
