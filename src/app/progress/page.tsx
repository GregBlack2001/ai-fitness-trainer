"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Loader2,
  Scale,
  TrendingUp,
  TrendingDown,
  Minus,
  Plus,
  Dumbbell,
  Target,
  Calendar,
  Flame,
  Trophy,
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";

type WeightEntry = {
  id: string;
  weight_kg: number;
  recorded_at: string;
};

type WorkoutStats = {
  totalWorkouts: number;
  totalSets: number;
  totalMinutes: number;
  avgCompletion: number;
  currentStreak: number;
};

export default function ProgressPage() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<any>(null);

  // Weight tracking
  const [weightEntries, setWeightEntries] = useState<WeightEntry[]>([]);
  const [newWeight, setNewWeight] = useState("");
  const [addingWeight, setAddingWeight] = useState(false);
  const [showWeightDialog, setShowWeightDialog] = useState(false);

  // Workout stats
  const [workoutStats, setWorkoutStats] = useState<WorkoutStats>({
    totalWorkouts: 0,
    totalSets: 0,
    totalMinutes: 0,
    avgCompletion: 0,
    currentStreak: 0,
  });

  useEffect(() => {
    const loadData = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }
      setUserId(user.id);

      // Load profile
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      setProfile(profileData);

      // Load weight entries
      const { data: weights } = await supabase
        .from("weight_logs")
        .select("*")
        .eq("user_id", user.id)
        .order("recorded_at", { ascending: true });

      if (weights && weights.length > 0) {
        setWeightEntries(weights);
      } else if (profileData?.weight_kg) {
        // If no weight entries but profile has weight, create initial entry
        try {
          const response = await fetch("/api/progress/weight", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              userId: user.id,
              weight_kg: profileData.weight_kg,
            }),
          });
          const data = await response.json();
          if (data.success && data.entry) {
            setWeightEntries([data.entry]);
          }
        } catch (error) {
          console.log("Could not create initial weight entry");
        }
      }

      // Load workout stats
      try {
        const response = await fetch(
          `/api/workout/log?userId=${user.id}&limit=100`
        );
        const data = await response.json();
        if (data.stats) {
          setWorkoutStats({
            totalWorkouts: data.stats.totalWorkouts || 0,
            totalSets: data.stats.totalSets || 0,
            totalMinutes: data.stats.totalMinutes || 0,
            avgCompletion: data.stats.avgCompletion || 0,
            currentStreak: calculateStreak(data.logs || []),
          });
        }
      } catch (error) {
        console.log("No workout logs yet");
      }

      setLoading(false);
    };

    loadData();
  }, [supabase, router]);

  // Calculate current streak from workout logs
  const calculateStreak = (logs: any[]): number => {
    if (logs.length === 0) return 0;

    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Sort by date descending
    const sortedLogs = [...logs].sort(
      (a, b) =>
        new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime()
    );

    // Check consecutive days
    let checkDate = new Date(today);
    for (const log of sortedLogs) {
      const logDate = new Date(log.completed_at);
      logDate.setHours(0, 0, 0, 0);

      const diffDays = Math.floor(
        (checkDate.getTime() - logDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (diffDays <= 1) {
        streak++;
        checkDate = logDate;
      } else {
        break;
      }
    }

    return streak;
  };

  const handleAddWeight = async () => {
    if (!newWeight || !userId) return;

    const weight = parseFloat(newWeight);
    if (isNaN(weight) || weight <= 0) return;

    setAddingWeight(true);

    try {
      const response = await fetch("/api/progress/weight", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, weight_kg: weight }),
      });

      const data = await response.json();

      if (data.success) {
        setWeightEntries((prev) => [...prev, data.entry]);
        setNewWeight("");
        setShowWeightDialog(false);
      }
    } catch (error) {
      console.error("Failed to add weight:", error);
    } finally {
      setAddingWeight(false);
    }
  };

  // Calculate weight change
  const getWeightChange = () => {
    if (weightEntries.length < 2) return null;
    const first = weightEntries[0].weight_kg;
    const last = weightEntries[weightEntries.length - 1].weight_kg;
    return last - first;
  };

  // Get min/max for graph scaling
  const getWeightRange = () => {
    if (weightEntries.length === 0) return { min: 0, max: 100 };
    const weights = weightEntries.map((e) => e.weight_kg);
    const min = Math.min(...weights);
    const max = Math.max(...weights);
    const padding = (max - min) * 0.1 || 5;
    return { min: min - padding, max: max + padding };
  };

  const weightChange = getWeightChange();
  const { min: weightMin, max: weightMax } = getWeightRange();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center gap-3">
            <Link href="/dashboard">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="font-semibold text-xl">Progress</h1>
              <p className="text-xs text-muted-foreground">
                Track your fitness journey
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6 max-w-4xl space-y-6">
        {/* Stats Overview */}
        <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Workouts</p>
                  <p className="text-3xl font-bold">
                    {workoutStats.totalWorkouts}
                  </p>
                </div>
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                  <Dumbbell className="h-6 w-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Sets</p>
                  <p className="text-3xl font-bold">{workoutStats.totalSets}</p>
                </div>
                <div className="w-12 h-12 bg-blue-500/10 rounded-full flex items-center justify-center">
                  <Target className="h-6 w-6 text-blue-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Minutes</p>
                  <p className="text-3xl font-bold">
                    {workoutStats.totalMinutes}
                  </p>
                </div>
                <div className="w-12 h-12 bg-green-500/10 rounded-full flex items-center justify-center">
                  <Calendar className="h-6 w-6 text-green-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Streak</p>
                  <p className="text-3xl font-bold">
                    {workoutStats.currentStreak} 🔥
                  </p>
                </div>
                <div className="w-12 h-12 bg-orange-500/10 rounded-full flex items-center justify-center">
                  <Flame className="h-6 w-6 text-orange-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Weight Tracking Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Scale className="h-5 w-5" />
                  Weight Tracking
                </CardTitle>
                <CardDescription>Monitor your weight over time</CardDescription>
              </div>
              <Dialog
                open={showWeightDialog}
                onOpenChange={setShowWeightDialog}
              >
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Log Weight
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Log Your Weight</DialogTitle>
                    <DialogDescription>
                      Enter your current weight to track your progress
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="weight">Weight (kg)</Label>
                      <Input
                        id="weight"
                        type="number"
                        step="0.1"
                        placeholder="e.g., 75.5"
                        value={newWeight}
                        onChange={(e) => setNewWeight(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleAddWeight();
                        }}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setShowWeightDialog(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleAddWeight}
                      disabled={addingWeight || !newWeight}
                    >
                      {addingWeight ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : null}
                      Save
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            {weightEntries.length > 0 ? (
              <div className="space-y-6">
                {/* Current Weight & Change */}
                <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Current Weight
                    </p>
                    <p className="text-3xl font-bold">
                      {weightEntries[weightEntries.length - 1].weight_kg} kg
                    </p>
                  </div>
                  {weightChange !== null && (
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">
                        Total Change
                      </p>
                      <div
                        className={`flex items-center gap-1 text-2xl font-bold ${
                          weightChange < 0
                            ? "text-green-500"
                            : weightChange > 0
                            ? "text-red-500"
                            : "text-muted-foreground"
                        }`}
                      >
                        {weightChange < 0 ? (
                          <TrendingDown className="h-5 w-5" />
                        ) : weightChange > 0 ? (
                          <TrendingUp className="h-5 w-5" />
                        ) : (
                          <Minus className="h-5 w-5" />
                        )}
                        {Math.abs(weightChange).toFixed(1)} kg
                      </div>
                    </div>
                  )}
                </div>

                {/* Weight Graph */}
                <div className="h-64 relative">
                  <svg
                    viewBox="0 0 400 200"
                    className="w-full h-full"
                    preserveAspectRatio="none"
                  >
                    {/* Grid lines */}
                    <defs>
                      <linearGradient
                        id="weightGradient"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="0%"
                          stopColor="hsl(var(--primary))"
                          stopOpacity="0.3"
                        />
                        <stop
                          offset="100%"
                          stopColor="hsl(var(--primary))"
                          stopOpacity="0"
                        />
                      </linearGradient>
                    </defs>

                    {/* Horizontal grid lines */}
                    {[0, 1, 2, 3, 4].map((i) => (
                      <line
                        key={i}
                        x1="40"
                        y1={20 + i * 40}
                        x2="390"
                        y2={20 + i * 40}
                        stroke="hsl(var(--border))"
                        strokeWidth="1"
                      />
                    ))}

                    {/* Y-axis labels */}
                    {[0, 1, 2, 3, 4].map((i) => {
                      const value =
                        weightMax - ((weightMax - weightMin) / 4) * i;
                      return (
                        <text
                          key={i}
                          x="35"
                          y={25 + i * 40}
                          textAnchor="end"
                          className="text-xs fill-muted-foreground"
                        >
                          {value.toFixed(0)}
                        </text>
                      );
                    })}

                    {/* Area under line */}
                    {weightEntries.length > 1 && (
                      <path
                        d={`
                          M ${40 + (0 / (weightEntries.length - 1)) * 350} ${
                          20 +
                          ((weightMax - weightEntries[0].weight_kg) /
                            (weightMax - weightMin)) *
                            160
                        }
                          ${weightEntries
                            .map((entry, i) => {
                              const x =
                                40 + (i / (weightEntries.length - 1)) * 350;
                              const y =
                                20 +
                                ((weightMax - entry.weight_kg) /
                                  (weightMax - weightMin)) *
                                  160;
                              return `L ${x} ${y}`;
                            })
                            .join(" ")}
                          L ${40 + 350} 180
                          L 40 180
                          Z
                        `}
                        fill="url(#weightGradient)"
                      />
                    )}

                    {/* Line */}
                    {weightEntries.length > 1 && (
                      <polyline
                        points={weightEntries
                          .map((entry, i) => {
                            const x =
                              40 + (i / (weightEntries.length - 1)) * 350;
                            const y =
                              20 +
                              ((weightMax - entry.weight_kg) /
                                (weightMax - weightMin)) *
                                160;
                            return `${x},${y}`;
                          })
                          .join(" ")}
                        fill="none"
                        stroke="hsl(var(--primary))"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    )}

                    {/* Data points */}
                    {weightEntries.map((entry, i) => {
                      const x =
                        weightEntries.length === 1
                          ? 215
                          : 40 + (i / (weightEntries.length - 1)) * 350;
                      const y =
                        20 +
                        ((weightMax - entry.weight_kg) /
                          (weightMax - weightMin)) *
                          160;
                      return (
                        <g key={entry.id}>
                          <circle
                            cx={x}
                            cy={y}
                            r="6"
                            fill="hsl(var(--background))"
                            stroke="hsl(var(--primary))"
                            strokeWidth="2"
                          />
                          <circle
                            cx={x}
                            cy={y}
                            r="3"
                            fill="hsl(var(--primary))"
                          />
                        </g>
                      );
                    })}
                  </svg>
                </div>

                {/* Recent Entries */}
                <div>
                  <h4 className="font-medium mb-3 text-sm text-muted-foreground">
                    Recent Entries
                  </h4>
                  <div className="space-y-2">
                    {[...weightEntries]
                      .reverse()
                      .slice(0, 5)
                      .map((entry, index) => (
                        <div
                          key={entry.id}
                          className="flex items-center justify-between py-2 px-3 bg-muted/30 rounded-lg"
                        >
                          <span className="text-sm text-muted-foreground">
                            {new Date(entry.recorded_at).toLocaleDateString(
                              "en-US",
                              {
                                weekday: "short",
                                month: "short",
                                day: "numeric",
                              }
                            )}
                          </span>
                          <span className="font-medium">
                            {entry.weight_kg} kg
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <Scale className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="font-semibold mb-2">No Weight Entries Yet</h3>
                <p className="text-muted-foreground mb-4">
                  Start tracking your weight to see your progress over time
                </p>
                <Button onClick={() => setShowWeightDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Log Your First Weight
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Achievement/Milestone Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5" />
              Milestones
            </CardTitle>
            <CardDescription>Celebrate your achievements</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2">
              <div
                className={`p-4 rounded-lg border-2 ${
                  workoutStats.totalWorkouts >= 1
                    ? "border-green-500/50 bg-green-500/10"
                    : "border-dashed border-muted-foreground/30"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      workoutStats.totalWorkouts >= 1
                        ? "bg-green-500 text-white"
                        : "bg-muted"
                    }`}
                  >
                    {workoutStats.totalWorkouts >= 1 ? "✓" : "1"}
                  </div>
                  <div>
                    <p className="font-medium">First Workout</p>
                    <p className="text-xs text-muted-foreground">
                      Complete your first session
                    </p>
                  </div>
                </div>
              </div>

              <div
                className={`p-4 rounded-lg border-2 ${
                  workoutStats.totalWorkouts >= 5
                    ? "border-green-500/50 bg-green-500/10"
                    : "border-dashed border-muted-foreground/30"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      workoutStats.totalWorkouts >= 5
                        ? "bg-green-500 text-white"
                        : "bg-muted"
                    }`}
                  >
                    {workoutStats.totalWorkouts >= 5 ? "✓" : "5"}
                  </div>
                  <div>
                    <p className="font-medium">Getting Started</p>
                    <p className="text-xs text-muted-foreground">
                      Complete 5 workouts
                    </p>
                  </div>
                </div>
              </div>

              <div
                className={`p-4 rounded-lg border-2 ${
                  workoutStats.totalWorkouts >= 10
                    ? "border-green-500/50 bg-green-500/10"
                    : "border-dashed border-muted-foreground/30"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      workoutStats.totalWorkouts >= 10
                        ? "bg-green-500 text-white"
                        : "bg-muted"
                    }`}
                  >
                    {workoutStats.totalWorkouts >= 10 ? "✓" : "10"}
                  </div>
                  <div>
                    <p className="font-medium">Dedicated</p>
                    <p className="text-xs text-muted-foreground">
                      Complete 10 workouts
                    </p>
                  </div>
                </div>
              </div>

              <div
                className={`p-4 rounded-lg border-2 ${
                  workoutStats.totalSets >= 100
                    ? "border-green-500/50 bg-green-500/10"
                    : "border-dashed border-muted-foreground/30"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      workoutStats.totalSets >= 100
                        ? "bg-green-500 text-white"
                        : "bg-muted"
                    }`}
                  >
                    {workoutStats.totalSets >= 100 ? "✓" : "💯"}
                  </div>
                  <div>
                    <p className="font-medium">Century Club</p>
                    <p className="text-xs text-muted-foreground">
                      Complete 100 sets
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
