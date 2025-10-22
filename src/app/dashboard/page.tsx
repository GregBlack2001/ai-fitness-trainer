"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import {
  Loader2,
  Dumbbell,
  Calendar,
  Target,
  TrendingUp,
  Clock,
  Play,
  SkipForward,
} from "lucide-react";
import Link from "next/link";

export default function DashboardPage() {
  const supabase = createClient();
  const [profile, setProfile] = useState<any>(null);
  const [plan, setPlan] = useState<any>(null);
  const [loading, setLoading] = useState(false);

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
      setLoading(false);
    };

    loadData();
  }, [supabase]);

  const handleStartWorkout = (workout: any) => {
    console.log("Starting workout:", workout.day);
    // TODO: Navigate to workout session page
    alert(
      `Starting ${workout.day} workout!\n\nThis will open the workout session page (coming soon)`
    );
  };

  const handleSkipWorkout = (workout: any) => {
    console.log("Skipping workout:", workout.day);
    // TODO: Mark as skipped in database
    alert(`Skipped ${workout.day} workout`);
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const workouts = plan?.exercises?.workouts || [];
  const totalWorkouts = workouts.length;
  const completedWorkouts = 0; // We'll add tracking later
  const progressPercentage =
    totalWorkouts > 0 ? (completedWorkouts / totalWorkouts) * 100 : 0;

  // Calculate stats
  const totalExercises = workouts.reduce(
    (sum: number, workout: any) => sum + (workout.exercises?.length || 0),
    0
  );
  const totalDuration = workouts.reduce(
    (sum: number, workout: any) => sum + (workout.duration_minutes || 0),
    0
  );

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Welcome Header */}
        <div>
          <h1 className="text-4xl font-bold mb-2">
            Welcome back, {profile?.full_name}! 💪
          </h1>
          <p className="text-muted-foreground">
            Let's crush your fitness goals together
          </p>
        </div>

        {/* Stats Overview */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Current Week
              </CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                Week {plan?.week_number || 1}
              </div>
              <p className="text-xs text-muted-foreground">
                {totalWorkouts} workouts scheduled
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Progress</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {completedWorkouts}/{totalWorkouts}
              </div>
              <p className="text-xs text-muted-foreground">
                workouts completed
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Exercises
              </CardTitle>
              <Dumbbell className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalExercises}</div>
              <p className="text-xs text-muted-foreground">
                across all workouts
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Weekly Volume
              </CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalDuration}min</div>
              <p className="text-xs text-muted-foreground">
                total training time
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Weekly Progress */}
        <Card>
          <CardHeader>
            <CardTitle>This Week's Progress</CardTitle>
            <CardDescription>
              Track your consistency and stay motivated
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Completion</span>
                <span className="font-medium">
                  {Math.round(progressPercentage)}%
                </span>
              </div>
              <Progress value={progressPercentage} className="h-2" />
            </div>
            <p className="text-sm text-muted-foreground">
              {completedWorkouts === 0 && "Ready to start? Let's get moving!"}
              {completedWorkouts > 0 &&
                completedWorkouts < totalWorkouts &&
                "Great progress! Keep it up!"}
              {completedWorkouts === totalWorkouts &&
                "Amazing! Week completed! 🎉"}
            </p>
          </CardContent>
        </Card>

        {/* Workout Carousel */}
        {workouts.length > 0 ? (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Week {plan.week_number} Workouts</CardTitle>
                  <CardDescription className="mt-2">
                    Swipe to see all workouts for this week
                  </CardDescription>
                </div>
                <Badge variant="secondary">{workouts.length} workouts</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <Carousel className="w-full">
                <CarouselContent>
                  {workouts.map((workout: any, index: number) => (
                    <CarouselItem key={index}>
                      <Card className="border-2">
                        <CardHeader className="bg-gradient-to-r from-primary/10 to-primary/5">
                          <div className="flex items-start justify-between">
                            <div>
                              <CardTitle className="text-2xl">
                                {workout.day}
                              </CardTitle>
                              <CardDescription className="mt-2 text-base">
                                {workout.focus}
                              </CardDescription>
                            </div>
                            <Badge className="text-sm px-3 py-1">
                              Day {index + 1}/{workouts.length}
                            </Badge>
                          </div>
                          <div className="flex gap-4 mt-4 text-sm">
                            <div className="flex items-center gap-1">
                              <Dumbbell className="h-4 w-4" />
                              <span>
                                {workout.exercises?.length || 0} exercises
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="h-4 w-4" />
                              <span>{workout.duration_minutes} min</span>
                            </div>
                          </div>
                        </CardHeader>

                        <CardContent className="pt-6">
                          {/* Workout Notes */}
                          {workout.notes && (
                            <div className="mb-6 p-3 bg-muted/50 rounded-lg">
                              <p className="text-sm text-muted-foreground">
                                <strong>Coach's Note:</strong> {workout.notes}
                              </p>
                            </div>
                          )}

                          {/* Exercise List */}
                          <div className="space-y-4">
                            <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                              Exercises
                            </h4>
                            {workout.exercises?.map(
                              (exercise: any, exIndex: number) => (
                                <div
                                  key={exIndex}
                                  className="flex gap-4 p-4 bg-muted/30 rounded-lg"
                                >
                                  <div className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold text-sm">
                                    {exIndex + 1}
                                  </div>
                                  <div className="flex-1 space-y-2">
                                    <h5 className="font-semibold">
                                      {exercise.name}
                                    </h5>

                                    {/* Sets and Reps */}
                                    <div className="flex flex-wrap gap-2">
                                      {exercise.sets && (
                                        <Badge variant="outline">
                                          {exercise.sets} sets
                                        </Badge>
                                      )}
                                      {exercise.reps && (
                                        <Badge variant="outline">
                                          {exercise.reps} reps
                                        </Badge>
                                      )}
                                      {exercise.duration_seconds && (
                                        <Badge variant="outline">
                                          {exercise.duration_seconds}s
                                        </Badge>
                                      )}
                                      {exercise.duration_minutes && (
                                        <Badge variant="outline">
                                          {exercise.duration_minutes} min
                                        </Badge>
                                      )}
                                      {exercise.rest_seconds && (
                                        <Badge variant="secondary">
                                          Rest: {exercise.rest_seconds}s
                                        </Badge>
                                      )}
                                    </div>

                                    {/* Exercise Notes */}
                                    {exercise.notes && (
                                      <p className="text-sm text-muted-foreground">
                                        💡 {exercise.notes}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              )
                            )}
                          </div>

                          {/* Action Buttons */}
                          <div className="flex gap-3 mt-6">
                            <Button
                              className="flex-1"
                              size="lg"
                              onClick={() => handleStartWorkout(workout)}
                            >
                              <Play className="mr-2 h-5 w-5" />
                              Start Workout
                            </Button>
                            <Button
                              variant="outline"
                              size="lg"
                              onClick={() => handleSkipWorkout(workout)}
                            >
                              <SkipForward className="mr-2 h-5 w-5" />
                              Skip
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    </CarouselItem>
                  ))}
                </CarouselContent>
                <CarouselPrevious />
                <CarouselNext />
              </Carousel>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <Dumbbell className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">
                No Active Workout Plan
              </h3>
              <p className="text-muted-foreground mb-4">
                Generate a personalized plan to get started
              </p>
              <Button>Generate Workout Plan</Button>
            </CardContent>
          </Card>
        )}

        {/* Quick Actions */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
            <Link href="/chat">
              <CardHeader>
                <CardTitle className="text-base">💬 Chat with Coach</CardTitle>
                <CardDescription>
                  Get instant answers and advice
                </CardDescription>
              </CardHeader>
            </Link>
          </Card>

          <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
            <Link href="/progress">
              <CardHeader>
                <CardTitle className="text-base">📊 Track Progress</CardTitle>
                <CardDescription>
                  Log workouts and see your gains
                </CardDescription>
              </CardHeader>
            </Link>
          </Card>

          <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
            <Link href="/settings">
              <CardHeader>
                <CardTitle className="text-base">⚙️ Settings</CardTitle>
                <CardDescription>
                  Update profile and preferences
                </CardDescription>
              </CardHeader>
            </Link>
          </Card>
        </div>
      </div>
    </div>
  );
}
