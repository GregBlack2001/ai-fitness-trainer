import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";
import { validateCheckinData, validateWorkoutPlan } from "@/lib/validation";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

export async function POST(request: Request) {
  try {
    const { userId, checkinData } = await request.json();

    if (!userId || !checkinData) {
      return NextResponse.json(
        { error: "User ID and check-in data required" },
        { status: 400 },
      );
    }

    // Validate and sanitize check-in data
    const { sanitized: validatedCheckin, errors: checkinErrors } =
      validateCheckinData(checkinData);
    if (checkinErrors.length > 0) {
      console.warn("⚠️ Check-in validation warnings:", checkinErrors);
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    // Get current workout plan
    const { data: currentPlan, error: planError } = await supabase
      .from("workout_plans")
      .select("*")
      .eq("user_id", userId)
      .eq("is_active", true)
      .single();

    if (planError || !currentPlan) {
      return NextResponse.json(
        { error: "No active plan found" },
        { status: 404 },
      );
    }

    // Get previous check-ins for context
    const { data: previousCheckins } = await supabase
      .from("weekly_checkins")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(4);

    // Store the check-in with validated data
    const { data: newCheckin, error: checkinError } = await supabase
      .from("weekly_checkins")
      .insert({
        user_id: userId,
        plan_id: currentPlan.id,
        week_number: (previousCheckins?.length || 0) + 1,
        energy_level: validatedCheckin.energyLevel,
        soreness_level: validatedCheckin.sorenessLevel,
        workout_difficulty: validatedCheckin.workoutDifficulty,
        completed_workouts: validatedCheckin.completedWorkouts,
        total_workouts: validatedCheckin.totalWorkouts,
        weight_kg: validatedCheckin.currentWeight,
        notes: validatedCheckin.notes,
        goals_progress: validatedCheckin.goalsProgress,
        want_harder: validatedCheckin.wantHarder,
        want_easier: validatedCheckin.wantEasier,
        problem_exercises: validatedCheckin.problemExercises,
        favorite_exercises: validatedCheckin.favoriteExercises,
      })
      .select()
      .single();

    if (checkinError) {
      console.error("Check-in error:", checkinError);
      return NextResponse.json(
        { error: "Failed to save check-in" },
        { status: 500 },
      );
    }

    // Build context for AI adaptation
    const checkinHistory =
      previousCheckins?.map((c) => ({
        week: c.week_number,
        energy: c.energy_level,
        soreness: c.soreness_level,
        difficulty: c.workout_difficulty,
        completion: `${c.completed_workouts}/${c.total_workouts}`,
        wantedHarder: c.want_harder,
        wantedEasier: c.want_easier,
      })) || [];

    // Generate adapted workout plan
    const adaptationPrompt = `You are a fitness coach adapting a workout plan based on weekly check-in feedback.

USER PROFILE:
- Goal: ${profile.fitness_goal}
- Level: ${profile.fitness_level}
- Equipment: ${profile.equipment_access}
- Available days: ${profile.available_days?.join(", ") || "Not specified"}
- Injuries/limitations: ${profile.injuries?.join(", ") || "None"}

CURRENT WEEK CHECK-IN:
- Energy level: ${checkinData.energyLevel}/5
- Soreness level: ${checkinData.sorenessLevel}/5
- Workout difficulty rating: ${checkinData.workoutDifficulty}/5
- Workouts completed: ${checkinData.completedWorkouts}/${checkinData.totalWorkouts}
- User wants workouts HARDER: ${checkinData.wantHarder ? "YES" : "No"}
- User wants workouts EASIER: ${checkinData.wantEasier ? "YES" : "No"}
- Problem exercises (struggled with): ${checkinData.problemExercises || "None mentioned"}
- Favorite exercises: ${checkinData.favoriteExercises || "None mentioned"}
- User notes: ${checkinData.notes || "None"}
- Progress toward goals: ${checkinData.goalsProgress || "Not specified"}

PREVIOUS CHECK-IN HISTORY:
${checkinHistory.length > 0 ? JSON.stringify(checkinHistory, null, 2) : "No previous check-ins"}

CURRENT PLAN STRUCTURE:
${JSON.stringify(
  currentPlan.exercises?.workouts?.map((w: any) => ({
    day: w.day,
    focus: w.focus,
    exerciseCount: w.exercises?.length || 0,
    isRestDay: w.isRestDay,
  })),
  null,
  2,
)}

ADAPTATION RULES:
1. If user wants HARDER and energy is high (4-5): Increase sets/reps by 10-20%, add 1-2 exercises
2. If user wants EASIER or soreness is high (4-5): Reduce volume by 10-20%, add more rest
3. If completion rate < 70%: Simplify exercises, reduce time commitment
4. If problem exercises mentioned: Replace with alternatives targeting same muscles
5. If favorite exercises mentioned: Include more of these or similar movements
6. Always maintain the same workout days structure
7. Progressive overload: Slightly increase difficulty each week unless user struggling

Generate a new 7-day workout plan with appropriate adaptations. Return ONLY valid JSON matching this structure:
{
  "adaptations_made": ["list of changes made and why"],
  "workouts": [
    {
      "day": "Monday",
      "focus": "Upper Body",
      "duration_minutes": 45,
      "isRestDay": false,
      "exercises": [
        {
          "name": "Exercise Name",
          "sets": 3,
          "reps": 12,
          "rest_seconds": 60,
          "notes": "Optional form tips"
        }
      ]
    }
  ]
}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content:
            "You are a fitness expert. Return ONLY valid JSON, no markdown or explanation.",
        },
        { role: "user", content: adaptationPrompt },
      ],
      temperature: 0.7,
    });

    let newPlanData;
    try {
      const content = completion.choices[0].message.content || "";
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("No JSON found");
      newPlanData = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError);
      return NextResponse.json(
        { error: "Failed to generate adapted plan" },
        { status: 500 },
      );
    }

    // Validate the new workout plan
    const { valid, errors, sanitized } = validateWorkoutPlan({
      workouts: newPlanData.workouts,
    });
    if (!valid) {
      console.warn("⚠️ Adapted plan validation warnings:", errors);
    }
    if (sanitized) {
      newPlanData.workouts = sanitized.workouts;
    }

    // Deactivate old plan
    await supabase
      .from("workout_plans")
      .update({ is_active: false })
      .eq("id", currentPlan.id);

    // Create new adapted plan
    const { data: newPlan, error: newPlanError } = await supabase
      .from("workout_plans")
      .insert({
        user_id: userId,
        exercises: { workouts: newPlanData.workouts },
        is_active: true,
        week_number: (currentPlan.week_number || 1) + 1,
        adaptations: newPlanData.adaptations_made,
        based_on_checkin: newCheckin.id,
      })
      .select()
      .single();

    if (newPlanError) {
      console.error("New plan error:", newPlanError);
      return NextResponse.json(
        { error: "Failed to create new plan" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      checkin: newCheckin,
      newPlan: newPlan,
      adaptations: newPlanData.adaptations_made,
    });
  } catch (error) {
    console.error("Weekly check-in error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// GET endpoint to retrieve check-in history
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "User ID required" }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    const { data, error } = await supabase
      .from("weekly_checkins")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ checkins: data });
  } catch (error) {
    console.error("Get check-ins error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
