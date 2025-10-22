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
import { Loader2 } from "lucide-react";

export default function DashboardPage() {
  const supabase = createClient();
  const [profile, setProfile] = useState<any>(null);
  const [plan, setPlan] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      // Get user
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

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Welcome Card */}
        <Card>
          <CardHeader>
            <CardTitle>Welcome back, {profile?.full_name}! 💪</CardTitle>
            <CardDescription>
              Your personalized fitness journey starts here
            </CardDescription>
          </CardHeader>
        </Card>

        {/* Workout Plan Card */}
        {plan ? (
          <Card>
            <CardHeader>
              <CardTitle>Week {plan.week_number} Workout Plan</CardTitle>
              <CardDescription>
                {plan.exercises?.overview ||
                  "Your personalized training program"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {plan.exercises?.workouts?.map(
                  (workout: any, index: number) => (
                    <div key={index} className="border-l-4 border-primary pl-4">
                      <h3 className="font-semibold">
                        {workout.day} - {workout.focus}
                      </h3>
                      <p className="text-sm text-muted-foreground mb-2">
                        Duration: {workout.duration_minutes} minutes
                      </p>
                      <div className="space-y-2">
                        {workout.exercises
                          ?.slice(0, 3)
                          .map((exercise: any, exIndex: number) => (
                            <div key={exIndex} className="text-sm">
                              <span className="font-medium">
                                {exercise.name}
                              </span>
                              <span className="text-muted-foreground">
                                {" "}
                                - {exercise.sets}x{exercise.reps}
                              </span>
                            </div>
                          ))}
                        {workout.exercises?.length > 3 && (
                          <p className="text-xs text-muted-foreground">
                            + {workout.exercises.length - 3} more exercises
                          </p>
                        )}
                      </div>
                    </div>
                  )
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-muted-foreground">
                No active workout plan found. Generate one to get started!
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
