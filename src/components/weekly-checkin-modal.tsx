"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Loader2,
  Sparkles,
  Battery,
  Flame,
  Dumbbell,
  ThumbsUp,
  ThumbsDown,
  Star,
  TrendingUp,
  CheckCircle2,
  Calendar,
  Target,
  Plus,
  Minus,
} from "lucide-react";
import { logEventClient } from "@/lib/events";

type CheckinData = {
  energyLevel: number;
  sorenessLevel: number;
  workoutDifficulty: number;
  completedWorkouts: number;
  skippedWorkouts: number;
  totalWorkouts: number;
  currentWeight?: number;
  notes: string;
  goalsProgress: string;
  wantHarder: boolean;
  wantEasier: boolean;
  problemExercises: string;
  favoriteExercises: string;
  // New fields for plan changes
  changeWorkoutDays: boolean;
  newWorkoutDays: string[];
  changeGoal: boolean;
  newGoal: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  userId: string;
  completedWorkouts: number;
  skippedWorkouts?: number;
  totalWorkouts: number;
  currentDays?: string[];
  currentGoal?: string;
  onCheckinComplete: (adaptations: string[]) => void;
};

const RatingButton = ({
  value,
  selected,
  onClick,
  label,
}: {
  value: number;
  selected: boolean;
  onClick: () => void;
  label?: string;
}) => (
  <button
    type="button"
    onClick={onClick}
    className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-all ${
      selected
        ? "bg-violet-500 text-white scale-110"
        : "bg-slate-700 text-slate-300 hover:bg-slate-600"
    }`}
  >
    {value}
  </button>
);

export function WeeklyCheckinModal({
  open,
  onClose,
  userId,
  completedWorkouts,
  skippedWorkouts = 0,
  totalWorkouts,
  currentDays = [],
  currentGoal = "",
  onCheckinComplete,
}: Props) {
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [adaptations, setAdaptations] = useState<string[]>([]);

  const allDays = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
  ];
  const goalOptions = [
    {
      value: "lose weight",
      label: "Lose Weight",
      description: "Burn fat, calorie deficit",
    },
    {
      value: "build muscle",
      label: "Build Muscle",
      description: "Gain mass, hypertrophy",
    },
    {
      value: "get stronger",
      label: "Get Stronger",
      description: "Increase strength, lift heavier",
    },
    {
      value: "improve endurance",
      label: "Improve Endurance",
      description: "Better stamina, cardio fitness",
    },
    {
      value: "general fitness",
      label: "General Fitness",
      description: "Overall health and wellness",
    },
    {
      value: "tone up",
      label: "Tone Up",
      description: "Lean muscle, definition",
    },
  ];

  const [checkinData, setCheckinData] = useState<CheckinData>({
    energyLevel: 3,
    sorenessLevel: 3,
    workoutDifficulty: 3,
    completedWorkouts,
    skippedWorkouts,
    totalWorkouts,
    notes: "",
    goalsProgress: "",
    wantHarder: false,
    wantEasier: false,
    problemExercises: "",
    favoriteExercises: "",
    changeWorkoutDays: false,
    newWorkoutDays: currentDays,
    changeGoal: false,
    newGoal: currentGoal,
  });

  const handleSubmit = async () => {
    setSubmitting(true);

    try {
      const response = await fetch("/api/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ checkinData }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error("Check-in API error:", data);
        alert(
          `Error: ${data.error || "Failed to submit check-in"}${data.details ? `\n\nDetails: ${data.details}` : ""}`,
        );
        return;
      }

      if (data.success) {
        setAdaptations(data.adaptations || []);
        setSubmitted(true);

        // Log check-in event
        logEventClient("checkin_submitted", {
          week_number: data.checkin?.week_number,
          energy_level: checkinData.energyLevel,
          completion_rate: Math.round(
            (completedWorkouts / totalWorkouts) * 100,
          ),
        });

        onCheckinComplete(data.adaptations || []);
      } else {
        alert(`Error: ${data.error || "Unknown error occurred"}`);
      }
    } catch (error) {
      console.error("Check-in error:", error);
      alert("Network error - please check your connection and try again");
    } finally {
      setSubmitting(false);
    }
  };

  const totalSteps = 5;

  if (submitted) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md bg-slate-900 border-slate-700">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-white">
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              Week Complete!
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-500/20 rounded-full mb-4">
                <TrendingUp className="h-8 w-8 text-emerald-400" />
              </div>
              <h3 className="font-semibold text-lg text-white">
                Your New Plan is Ready!
              </h3>
              <p className="text-sm text-slate-400 mt-1">
                Based on your feedback, I've adapted your workout plan.
              </p>
            </div>

            {adaptations.length > 0 && (
              <div className="bg-slate-800 rounded-xl p-4 space-y-2 border border-slate-700">
                <h4 className="font-medium text-sm flex items-center gap-2 text-white">
                  <Sparkles className="h-4 w-4 text-violet-400" />
                  Adaptations Made:
                </h4>
                <ul className="space-y-1">
                  {adaptations.map((adaptation, idx) => (
                    <li
                      key={idx}
                      className="text-sm text-slate-300 flex items-start gap-2"
                    >
                      <span className="text-violet-400">•</span>
                      {adaptation}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <Button
              onClick={onClose}
              className="w-full bg-violet-600 hover:bg-violet-500 text-white"
            >
              View New Plan
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-slate-900 border-slate-700 text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <Star className="h-5 w-5 text-yellow-500" />
            Weekly Check-in
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            Step {step} of {totalSteps} — Help me adapt your next week's plan
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Progress bar */}
          <div className="w-full bg-slate-700 rounded-full h-2">
            <div
              className="bg-violet-500 h-2 rounded-full transition-all"
              style={{ width: `${(step / totalSteps) * 100}%` }}
            />
          </div>

          {/* Step 1: Energy & Soreness */}
          {step === 1 && (
            <div className="space-y-6">
              <div className="space-y-3">
                <Label className="flex items-center gap-2 text-slate-200">
                  <Battery className="h-4 w-4 text-green-500" />
                  How was your energy this week?
                </Label>
                <div className="flex justify-between">
                  {[1, 2, 3, 4, 5].map((val) => (
                    <div key={val} className="flex flex-col items-center gap-1">
                      <RatingButton
                        value={val}
                        selected={checkinData.energyLevel === val}
                        onClick={() =>
                          setCheckinData({ ...checkinData, energyLevel: val })
                        }
                      />
                      <span className="text-xs text-slate-500">
                        {val === 1 ? "Low" : val === 5 ? "High" : ""}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <Label className="flex items-center gap-2 text-slate-200">
                  <Flame className="h-4 w-4 text-orange-500" />
                  How sore are you feeling?
                </Label>
                <div className="flex justify-between">
                  {[1, 2, 3, 4, 5].map((val) => (
                    <div key={val} className="flex flex-col items-center gap-1">
                      <RatingButton
                        value={val}
                        selected={checkinData.sorenessLevel === val}
                        onClick={() =>
                          setCheckinData({ ...checkinData, sorenessLevel: val })
                        }
                      />
                      <span className="text-xs text-slate-500">
                        {val === 1 ? "None" : val === 5 ? "Very" : ""}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Difficulty & Preference */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="space-y-3">
                <Label className="flex items-center gap-2 text-slate-200">
                  <Dumbbell className="h-4 w-4 text-violet-400" />
                  How difficult were the workouts?
                </Label>
                <div className="flex justify-between">
                  {[1, 2, 3, 4, 5].map((val) => (
                    <div key={val} className="flex flex-col items-center gap-1">
                      <RatingButton
                        value={val}
                        selected={checkinData.workoutDifficulty === val}
                        onClick={() =>
                          setCheckinData({
                            ...checkinData,
                            workoutDifficulty: val,
                          })
                        }
                      />
                      <span className="text-xs text-slate-500">
                        {val === 1 ? "Easy" : val === 5 ? "Hard" : ""}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <Label className="text-slate-200">
                  For next week, I want my workouts to be:
                </Label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      setCheckinData({
                        ...checkinData,
                        wantHarder: !checkinData.wantHarder,
                        wantEasier: false,
                      })
                    }
                    className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${
                      checkinData.wantHarder
                        ? "border-violet-500 bg-violet-500/20 text-white"
                        : "border-slate-700 bg-slate-800 text-slate-300 hover:border-slate-600"
                    }`}
                  >
                    <ThumbsUp
                      className={`h-6 w-6 ${checkinData.wantHarder ? "text-violet-400" : "text-slate-400"}`}
                    />
                    <span className="text-sm font-medium">
                      More challenging
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setCheckinData({
                        ...checkinData,
                        wantEasier: !checkinData.wantEasier,
                        wantHarder: false,
                      })
                    }
                    className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${
                      checkinData.wantEasier
                        ? "border-violet-500 bg-violet-500/20 text-white"
                        : "border-slate-700 bg-slate-800 text-slate-300 hover:border-slate-600"
                    }`}
                  >
                    <ThumbsDown
                      className={`h-6 w-6 ${checkinData.wantEasier ? "text-violet-400" : "text-slate-400"}`}
                    />
                    <span className="text-sm font-medium">A bit easier</span>
                  </button>
                </div>
                <p className="text-xs text-slate-500 text-center">
                  Or leave both unselected to keep similar intensity
                </p>
              </div>
            </div>
          )}

          {/* Step 3: Exercises Feedback */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-slate-200">
                  Any exercises you struggled with?
                </Label>
                <Textarea
                  placeholder="e.g., Burpees were too intense, pull-ups too hard..."
                  value={checkinData.problemExercises}
                  onChange={(e) =>
                    setCheckinData({
                      ...checkinData,
                      problemExercises: e.target.value,
                    })
                  }
                  className="resize-none bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-slate-200">
                  Any exercises you really enjoyed?
                </Label>
                <Textarea
                  placeholder="e.g., Loved the dumbbell exercises, squats felt great..."
                  value={checkinData.favoriteExercises}
                  onChange={(e) =>
                    setCheckinData({
                      ...checkinData,
                      favoriteExercises: e.target.value,
                    })
                  }
                  className="resize-none bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
                  rows={2}
                />
              </div>
            </div>
          )}

          {/* Step 4: Change Days & Goals */}
          {step === 4 && (
            <div className="space-y-6">
              {/* Change Workout Days */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2 text-slate-200">
                    <Calendar className="h-4 w-4 text-blue-500" />
                    Change workout days?
                  </Label>
                  <button
                    type="button"
                    onClick={() =>
                      setCheckinData({
                        ...checkinData,
                        changeWorkoutDays: !checkinData.changeWorkoutDays,
                        newWorkoutDays: checkinData.changeWorkoutDays
                          ? currentDays
                          : checkinData.newWorkoutDays,
                      })
                    }
                    className={`px-3 py-1 rounded-full text-sm font-medium transition-all ${
                      checkinData.changeWorkoutDays
                        ? "bg-violet-500 text-white"
                        : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                    }`}
                  >
                    {checkinData.changeWorkoutDays ? "Yes" : "No"}
                  </button>
                </div>

                {checkinData.changeWorkoutDays && (
                  <div className="space-y-2 p-3 bg-slate-800 rounded-xl border border-slate-700">
                    <p className="text-sm text-slate-400 mb-2">
                      Select your workout days (
                      {checkinData.newWorkoutDays.length} selected):
                    </p>
                    <div className="grid grid-cols-4 gap-2">
                      {allDays.map((day) => {
                        const isSelected =
                          checkinData.newWorkoutDays.includes(day);
                        return (
                          <button
                            key={day}
                            type="button"
                            onClick={() => {
                              const newDays = isSelected
                                ? checkinData.newWorkoutDays.filter(
                                    (d) => d !== day,
                                  )
                                : [...checkinData.newWorkoutDays, day];
                              setCheckinData({
                                ...checkinData,
                                newWorkoutDays: newDays,
                              });
                            }}
                            className={`px-2 py-2 rounded-lg text-xs font-medium transition-all ${
                              isSelected
                                ? "bg-violet-500 text-white"
                                : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                            }`}
                          >
                            {day.slice(0, 3)}
                          </button>
                        );
                      })}
                    </div>
                    <p className="text-xs text-slate-500 mt-2">
                      Current:{" "}
                      {currentDays.map((d) => d.slice(0, 3)).join(", ") ||
                        "None"}
                    </p>
                  </div>
                )}
              </div>

              {/* Change Fitness Goal */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2 text-slate-200">
                    <Target className="h-4 w-4 text-green-500" />
                    Change fitness goal?
                  </Label>
                  <button
                    type="button"
                    onClick={() =>
                      setCheckinData({
                        ...checkinData,
                        changeGoal: !checkinData.changeGoal,
                        newGoal: checkinData.changeGoal
                          ? currentGoal
                          : checkinData.newGoal,
                      })
                    }
                    className={`px-3 py-1 rounded-full text-sm font-medium transition-all ${
                      checkinData.changeGoal
                        ? "bg-violet-500 text-white"
                        : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                    }`}
                  >
                    {checkinData.changeGoal ? "Yes" : "No"}
                  </button>
                </div>

                {checkinData.changeGoal && (
                  <div className="space-y-2 p-3 bg-slate-800 rounded-xl border border-slate-700">
                    <p className="text-sm text-slate-400 mb-2">
                      Select your new goal:
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {goalOptions.map((goal) => {
                        const isSelected =
                          checkinData.newGoal
                            .toLowerCase()
                            .includes(goal.value.toLowerCase()) ||
                          goal.value
                            .toLowerCase()
                            .includes(checkinData.newGoal.toLowerCase());
                        return (
                          <button
                            key={goal.value}
                            type="button"
                            onClick={() =>
                              setCheckinData({
                                ...checkinData,
                                newGoal: goal.value,
                              })
                            }
                            className={`p-3 rounded-xl text-left transition-all border-2 ${
                              checkinData.newGoal === goal.value
                                ? "border-violet-500 bg-violet-500/20"
                                : "border-slate-700 bg-slate-800 hover:border-slate-600"
                            }`}
                          >
                            <span className="text-sm font-medium block text-white">
                              {goal.label}
                            </span>
                            <span className="text-xs text-slate-400">
                              {goal.description}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                    <p className="text-xs text-slate-500 mt-2">
                      Current: {currentGoal || "Not set"}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 5: Goals & Notes */}
          {step === 5 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-slate-200">
                  How do you feel about your progress?
                </Label>
                <Textarea
                  placeholder="e.g., Feeling stronger, clothes fitting better, more energy..."
                  value={checkinData.goalsProgress}
                  onChange={(e) =>
                    setCheckinData({
                      ...checkinData,
                      goalsProgress: e.target.value,
                    })
                  }
                  className="resize-none bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-slate-200">
                  Any other notes for your coach?
                </Label>
                <Textarea
                  placeholder="e.g., Traveling next week, want to focus more on cardio..."
                  value={checkinData.notes}
                  onChange={(e) =>
                    setCheckinData({ ...checkinData, notes: e.target.value })
                  }
                  className="resize-none bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
                  rows={2}
                />
              </div>

              <div className="bg-slate-800 rounded-xl p-3 border border-slate-700">
                <p className="text-sm text-slate-300">
                  <strong className="text-white">This week:</strong> You
                  completed {completedWorkouts} of {totalWorkouts} workouts
                  {skippedWorkouts > 0 && ` (${skippedWorkouts} skipped)`} (
                  {Math.round((completedWorkouts / totalWorkouts) * 100)}%
                  completion rate)
                </p>
              </div>
            </div>
          )}

          {/* Navigation buttons */}
          <div className="flex gap-3">
            {step > 1 && (
              <Button
                variant="outline"
                onClick={() => setStep(step - 1)}
                className="flex-1 border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white"
              >
                Back
              </Button>
            )}
            {step < totalSteps ? (
              <Button
                onClick={() => setStep(step + 1)}
                className="flex-1 bg-violet-600 hover:bg-violet-500 text-white"
              >
                Continue
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={submitting}
                className="flex-1 bg-violet-600 hover:bg-violet-500 text-white"
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating plan...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Generate New Plan
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
