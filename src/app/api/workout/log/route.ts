import { NextResponse } from "next/server";
import { getAuthenticatedClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      planId,
      dayIndex,
      workout,
      duration_seconds,
      exercises_completed,
      total_exercises,
      sets_completed,
      exercise_logs,
      status = "completed", // "completed" or "skipped"
    } = body;

    // Authenticate user via session
    const auth = await getAuthenticatedClient();
    if (!auth) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    const { supabase, user } = auth;
    const userId = user.id;

    if (!planId) {
      return NextResponse.json(
        { error: "Plan ID is required" },
        { status: 400 },
      );
    }

    console.log("=== LOGGING WORKOUT ===");
    console.log("User ID:", userId);
    console.log("Plan ID:", planId);
    console.log("Day Index:", dayIndex);
    console.log("Status:", status);
    console.log("Duration:", duration_seconds, "seconds");
    console.log(
      "Exercises completed:",
      exercises_completed,
      "/",
      total_exercises,
    );
    console.log("Total sets:", sets_completed);

    // Calculate completion percentage
    const completion_percentage =
      status === "skipped"
        ? 0
        : Math.round((exercises_completed / total_exercises) * 100);

    // Save workout log (RLS enforces user_id = auth.uid())
    const { data: workoutLog, error: logError } = await supabase
      .from("workout_logs")
      .insert([
        {
          user_id: userId,
          plan_id: planId,
          day_index: dayIndex,
          workout_day: workout.day,
          workout_focus: workout.focus,
          duration_seconds: duration_seconds || 0,
          exercises_completed: exercises_completed || 0,
          total_exercises: total_exercises || 0,
          sets_completed: sets_completed || 0,
          completion_percentage,
          exercise_details: exercise_logs || [],
          status,
          completed_at: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (logError) {
      console.error("❌ Failed to save workout log:", logError);

      // If the table doesn't exist yet, provide helpful error
      if (logError.code === "42P01") {
        return NextResponse.json(
          {
            error:
              "Workout logs table not found. Please run the database migration.",
            migration: `
CREATE TABLE workout_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  plan_id UUID REFERENCES workout_plans(id) ON DELETE CASCADE NOT NULL,
  day_index INTEGER NOT NULL,
  workout_day TEXT NOT NULL,
  workout_focus TEXT NOT NULL,
  duration_seconds INTEGER NOT NULL,
  exercises_completed INTEGER NOT NULL,
  total_exercises INTEGER NOT NULL,
  sets_completed INTEGER NOT NULL,
  completion_percentage INTEGER NOT NULL,
  exercise_details JSONB,
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE workout_logs ENABLE ROW LEVEL SECURITY;

-- Policy for users to read their own logs
CREATE POLICY "Users can view own workout logs" ON workout_logs
  FOR SELECT USING (auth.uid() = user_id);

-- Policy for inserting (we use service role, but good to have)
CREATE POLICY "Users can insert own workout logs" ON workout_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX idx_workout_logs_user_id ON workout_logs(user_id);
CREATE INDEX idx_workout_logs_completed_at ON workout_logs(completed_at);
            `,
          },
          { status: 500 },
        );
      }

      return NextResponse.json(
        { error: "Failed to save workout log" },
        { status: 500 },
      );
    }

    console.log("✅ Workout logged successfully:", workoutLog.id);

    // Update user stats (optional - for gamification)
    // You could track total workouts, streaks, etc.

    return NextResponse.json({
      success: true,
      log: workoutLog,
    });
  } catch (error) {
    console.error("❌ Workout log error:", error);
    return NextResponse.json(
      { error: "Failed to log workout" },
      { status: 500 },
    );
  }
}

// GET endpoint to fetch workout history
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "10");

    // Authenticate user via session
    const auth = await getAuthenticatedClient();
    if (!auth) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    const { supabase, user } = auth;
    const userId = user.id;

    // Fetch logs (RLS enforces user_id = auth.uid())
    const { data: logs, error } = await supabase
      .from("workout_logs")
      .select("*")
      .eq("user_id", userId)
      .order("completed_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("Failed to fetch workout logs:", error);
      return NextResponse.json(
        { error: "Failed to fetch workout logs" },
        { status: 500 },
      );
    }

    // Calculate stats
    const totalWorkouts = logs.length;
    const totalMinutes = logs.reduce(
      (sum, log) => sum + Math.round(log.duration_seconds / 60),
      0,
    );
    const totalSets = logs.reduce((sum, log) => sum + log.sets_completed, 0);
    const avgCompletion =
      logs.length > 0
        ? Math.round(
            logs.reduce((sum, log) => sum + log.completion_percentage, 0) /
              logs.length,
          )
        : 0;

    return NextResponse.json({
      logs,
      stats: {
        totalWorkouts,
        totalMinutes,
        totalSets,
        avgCompletion,
      },
    });
  } catch (error) {
    console.error("Workout logs fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch workout logs" },
      { status: 500 },
    );
  }
}
