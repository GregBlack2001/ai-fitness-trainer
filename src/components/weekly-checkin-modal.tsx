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
};

type Props = {
  open: boolean;
  onClose: () => void;
  userId: string;
  completedWorkouts: number;
  skippedWorkouts?: number;
  totalWorkouts: number;
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
        ? "bg-primary text-primary-foreground scale-110"
        : "bg-muted hover:bg-muted/80"
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
  onCheckinComplete,
}: Props) {
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [adaptations, setAdaptations] = useState<string[]>([]);

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
      }
    } catch (error) {
      console.error("Check-in error:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const totalSteps = 4;

  if (submitted) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              Week Complete!
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full mb-4">
                <TrendingUp className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="font-semibold text-lg">Your New Plan is Ready!</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Based on your feedback, I've adapted your workout plan.
              </p>
            </div>

            {adaptations.length > 0 && (
              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <h4 className="font-medium text-sm flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  Adaptations Made:
                </h4>
                <ul className="space-y-1">
                  {adaptations.map((adaptation, idx) => (
                    <li
                      key={idx}
                      className="text-sm text-muted-foreground flex items-start gap-2"
                    >
                      <span className="text-primary">•</span>
                      {adaptation}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <Button onClick={onClose} className="w-full">
              View New Plan
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Star className="h-5 w-5 text-yellow-500" />
            Weekly Check-in
          </DialogTitle>
          <DialogDescription>
            Step {step} of {totalSteps} — Help me adapt your next week's plan
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Progress bar */}
          <div className="w-full bg-muted rounded-full h-2">
            <div
              className="bg-primary h-2 rounded-full transition-all"
              style={{ width: `${(step / totalSteps) * 100}%` }}
            />
          </div>

          {/* Step 1: Energy & Soreness */}
          {step === 1 && (
            <div className="space-y-6">
              <div className="space-y-3">
                <Label className="flex items-center gap-2">
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
                      <span className="text-xs text-muted-foreground">
                        {val === 1 ? "Low" : val === 5 ? "High" : ""}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <Label className="flex items-center gap-2">
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
                      <span className="text-xs text-muted-foreground">
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
                <Label className="flex items-center gap-2">
                  <Dumbbell className="h-4 w-4 text-primary" />
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
                      <span className="text-xs text-muted-foreground">
                        {val === 1 ? "Easy" : val === 5 ? "Hard" : ""}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <Label>For next week, I want my workouts to be:</Label>
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
                    className={`p-4 rounded-lg border-2 transition-all flex flex-col items-center gap-2 ${
                      checkinData.wantHarder
                        ? "border-primary bg-primary/10"
                        : "border-muted hover:border-muted-foreground/30"
                    }`}
                  >
                    <ThumbsUp
                      className={`h-6 w-6 ${checkinData.wantHarder ? "text-primary" : ""}`}
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
                    className={`p-4 rounded-lg border-2 transition-all flex flex-col items-center gap-2 ${
                      checkinData.wantEasier
                        ? "border-primary bg-primary/10"
                        : "border-muted hover:border-muted-foreground/30"
                    }`}
                  >
                    <ThumbsDown
                      className={`h-6 w-6 ${checkinData.wantEasier ? "text-primary" : ""}`}
                    />
                    <span className="text-sm font-medium">A bit easier</span>
                  </button>
                </div>
                <p className="text-xs text-muted-foreground text-center">
                  Or leave both unselected to keep similar intensity
                </p>
              </div>
            </div>
          )}

          {/* Step 3: Exercises Feedback */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Any exercises you struggled with?</Label>
                <Textarea
                  placeholder="e.g., Burpees were too intense, pull-ups too hard..."
                  value={checkinData.problemExercises}
                  onChange={(e) =>
                    setCheckinData({
                      ...checkinData,
                      problemExercises: e.target.value,
                    })
                  }
                  className="resize-none"
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label>Any exercises you really enjoyed?</Label>
                <Textarea
                  placeholder="e.g., Loved the dumbbell exercises, squats felt great..."
                  value={checkinData.favoriteExercises}
                  onChange={(e) =>
                    setCheckinData({
                      ...checkinData,
                      favoriteExercises: e.target.value,
                    })
                  }
                  className="resize-none"
                  rows={2}
                />
              </div>
            </div>
          )}

          {/* Step 4: Goals & Notes */}
          {step === 4 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>How do you feel about your progress?</Label>
                <Textarea
                  placeholder="e.g., Feeling stronger, clothes fitting better, more energy..."
                  value={checkinData.goalsProgress}
                  onChange={(e) =>
                    setCheckinData({
                      ...checkinData,
                      goalsProgress: e.target.value,
                    })
                  }
                  className="resize-none"
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label>Any other notes for your coach?</Label>
                <Textarea
                  placeholder="e.g., Traveling next week, want to focus more on cardio..."
                  value={checkinData.notes}
                  onChange={(e) =>
                    setCheckinData({ ...checkinData, notes: e.target.value })
                  }
                  className="resize-none"
                  rows={2}
                />
              </div>

              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-sm text-muted-foreground">
                  <strong>This week:</strong> You completed {completedWorkouts}{" "}
                  of {totalWorkouts} workouts
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
                className="flex-1"
              >
                Back
              </Button>
            )}
            {step < totalSteps ? (
              <Button onClick={() => setStep(step + 1)} className="flex-1">
                Continue
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={submitting}
                className="flex-1"
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
