import { NextResponse } from "next/server";
import OpenAI from "openai";
import { getAuthenticatedClient } from "@/lib/supabase/server";
import { validateCheckinData, validateWorkoutPlan } from "@/lib/validation";

// Check if API key exists
if (!process.env.OPENAI_API_KEY) {
  console.error("❌ OPENAI_API_KEY is not set!");
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "",
});

export async function POST(request: Request) {
  console.log("=== CHECKIN API CALLED ===");

  try {
    // Check API key first
    if (!process.env.OPENAI_API_KEY) {
      console.error("❌ Missing OPENAI_API_KEY environment variable");
      return NextResponse.json(
        {
          error: "Server configuration error - missing API key",
        },
        { status: 500 },
      );
    }

    const body = await request.json();
    const { checkinData } = body;
    console.log(
      "📥 Received checkin data:",
      JSON.stringify(checkinData, null, 2),
    );

    // Authenticate user via session
    const auth = await getAuthenticatedClient();
    if (!auth) {
      console.log("❌ Not authenticated");
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    const { supabase, user } = auth;
    const userId = user.id;
    console.log("✅ Authenticated user:", userId);

    if (!checkinData) {
      return NextResponse.json(
        { error: "Check-in data required" },
        { status: 400 },
      );
    }

    // Validate and sanitize check-in data
    const { sanitized: validatedCheckin, errors: checkinErrors } =
      validateCheckinData(checkinData);
    if (checkinErrors.length > 0) {
      console.warn("⚠️ Check-in validation warnings:", checkinErrors);
    }
    console.log("✅ Validated checkin data");

    // Get user profile (RLS enforces user_id = auth.uid())
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (profileError || !profile) {
      console.error("❌ Profile error:", profileError);
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }
    console.log("✅ Found profile");

    // Get current workout plan
    const { data: currentPlan, error: planError } = await supabase
      .from("workout_plans")
      .select("*")
      .eq("user_id", userId)
      .eq("is_active", true)
      .single();

    if (planError || !currentPlan) {
      console.error("❌ Plan error:", planError);
      return NextResponse.json(
        { error: "No active plan found" },
        { status: 404 },
      );
    }
    console.log("✅ Found active plan:", currentPlan.id);

    // Get previous check-ins for context
    const { data: previousCheckins, error: prevCheckinError } = await supabase
      .from("weekly_checkins")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(4);

    if (prevCheckinError) {
      console.error("❌ Previous checkins error:", prevCheckinError);
      // Don't fail - just continue with empty array
    }
    console.log("✅ Previous checkins count:", previousCheckins?.length || 0);

    // Store the check-in with validated data
    console.log("📝 Inserting checkin...");
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
        weight_kg: validatedCheckin.currentWeight || null,
        notes: validatedCheckin.notes || "",
        goals_progress: validatedCheckin.goalsProgress || "",
        want_harder: validatedCheckin.wantHarder || false,
        want_easier: validatedCheckin.wantEasier || false,
        problem_exercises: validatedCheckin.problemExercises || "",
        favorite_exercises: validatedCheckin.favoriteExercises || "",
      })
      .select()
      .single();

    if (checkinError) {
      console.error("❌ Check-in insert error:", checkinError);
      return NextResponse.json(
        {
          error: "Failed to save check-in",
          details: checkinError.message,
        },
        { status: 500 },
      );
    }
    console.log("✅ Checkin saved:", newCheckin.id);

    // Handle profile updates if user changed days or goal
    const profileUpdates: any = {};
    let daysChanged = false;
    let goalChanged = false;

    if (
      checkinData.changeWorkoutDays &&
      checkinData.newWorkoutDays?.length > 0
    ) {
      profileUpdates.available_days = checkinData.newWorkoutDays;
      daysChanged = true;
      console.log(
        "📅 User changing workout days to:",
        checkinData.newWorkoutDays,
      );
    }

    if (checkinData.changeGoal && checkinData.newGoal) {
      profileUpdates.fitness_goal = checkinData.newGoal;
      goalChanged = true;
      console.log("🎯 User changing goal to:", checkinData.newGoal);
    }

    // Update profile if changes were made
    if (Object.keys(profileUpdates).length > 0) {
      const { error: profileUpdateError } = await supabase
        .from("profiles")
        .update(profileUpdates)
        .eq("id", userId);

      if (profileUpdateError) {
        console.error("Failed to update profile:", profileUpdateError);
      } else {
        console.log("✅ Profile updated with new preferences");
      }
    }

    // Use updated values for plan generation
    const effectiveDays = daysChanged
      ? checkinData.newWorkoutDays
      : profile.available_days;
    const effectiveGoal = goalChanged
      ? checkinData.newGoal
      : profile.fitness_goal;

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

    // Determine goal-specific training parameters
    const goalLower = (effectiveGoal || "").toLowerCase();
    let repGuidance = "8-12 reps for hypertrophy";
    let restGuidance = "60-90 seconds";
    let focusGuidance = "balanced muscle building";

    if (
      goalLower.includes("strength") ||
      goalLower.includes("strong") ||
      goalLower.includes("power")
    ) {
      repGuidance = "3-6 reps for strength";
      restGuidance = "2-3 minutes";
      focusGuidance = "heavy compound movements, progressive overload";
    } else if (
      goalLower.includes("endurance") ||
      goalLower.includes("tone") ||
      goalLower.includes("lean")
    ) {
      repGuidance = "12-20 reps for endurance/toning";
      restGuidance = "30-60 seconds";
      focusGuidance = "higher rep ranges, circuit-style training, more cardio";
    } else if (
      goalLower.includes("lose") ||
      goalLower.includes("weight loss") ||
      goalLower.includes("fat")
    ) {
      repGuidance = "10-15 reps with moderate weight";
      restGuidance = "30-60 seconds";
      focusGuidance = "metabolic conditioning, supersets, HIIT elements";
    } else if (
      goalLower.includes("muscle") ||
      goalLower.includes("mass") ||
      goalLower.includes("bulk")
    ) {
      repGuidance = "8-12 reps for muscle growth";
      restGuidance = "60-90 seconds";
      focusGuidance =
        "hypertrophy training, progressive overload, muscle isolation";
    }

    // Generate adapted workout plan
    const allDays = [
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
      "Sunday",
    ];
    const workoutDays = effectiveDays || ["Monday", "Wednesday", "Friday"];
    const restDays = allDays.filter((d) => !workoutDays.includes(d));

    const adaptationPrompt = `You are a fitness coach adapting a workout plan based on weekly check-in feedback.

USER PROFILE:
- Goal: ${effectiveGoal} ${goalChanged ? "(JUST CHANGED - adapt training style accordingly!)" : ""}
- Level: ${profile.fitness_level}
- Equipment: ${profile.equipment_access}
- Available days: ${workoutDays.join(", ")} ${daysChanged ? "(JUST CHANGED - restructure the week accordingly!)" : ""}
- Rest days: ${restDays.join(", ")}
- Injuries/limitations: ${profile.injuries?.join(", ") || "None"}

GOAL-SPECIFIC TRAINING PARAMETERS:
- Rep Range: ${repGuidance}
- Rest Periods: ${restGuidance}
- Training Focus: ${focusGuidance}

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

${
  daysChanged
    ? `
⚠️ USER CHANGED WORKOUT DAYS:
- Previous: ${profile.available_days?.join(", ") || "Unknown"}
- New: ${workoutDays.join(", ")}
- MUST restructure the plan to match the new schedule!
`
    : ""
}

${
  goalChanged
    ? `
⚠️ USER CHANGED FITNESS GOAL:
- Previous: ${profile.fitness_goal}
- New: ${effectiveGoal}
- MUST adjust training style, rep ranges, and exercise selection to match new goal!
`
    : ""
}

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

**Reading Their Feedback:**
- Energy 4-5 + wants harder = They're ready to push. Add volume or intensity.
- Energy 1-2 or soreness 4-5 = They're beat up. Reduce volume, maybe add a deload.
- Difficulty 5 + low completion = Workouts are too hard. Simplify.
- Difficulty 1-2 + high completion = Too easy. Time to progress.

**Making Smart Changes:**
- If they struggled with an exercise → Swap it for an easier variation OR reduce the weight/reps. Don't just remove it.
- If they loved certain exercises → Keep them and add similar movements.
- If completion rate < 70% → Shorter workouts, fewer exercises, or simpler movements.
- If they're crushing it → Add sets, reps, or a new challenging exercise.

**Goal-Specific Adjustments:**
${
  goalChanged
    ? `
🔄 GOAL CHANGED from "${profile.fitness_goal}" to "${effectiveGoal}"
This is a big shift! Restructure the entire program:
- New rep ranges: ${repGuidance}
- New rest periods: ${restGuidance}
- Training focus: ${focusGuidance}
- Select exercises that match the new goal
`
    : ""
}

${
  daysChanged
    ? `
📅 DAYS CHANGED from ${profile.available_days?.join(", ") || "unknown"} to ${workoutDays.join(", ")}
Restructure the split to work with their new schedule. Rest days: ${restDays.join(", ")}
`
    : ""
}

**Progressive Overload:**
- Week over week, slightly increase difficulty (unless they're struggling)
- Add 1 rep per set, OR add 1 set, OR slightly reduce rest
- Don't change too many things at once

**Quality Over Quantity:**
- Better to have 4 great exercises than 7 mediocre ones
- Form cues should be specific and actionable
- Match exercises to their equipment

Generate a new 7-day workout plan with thoughtful adaptations. In "adaptations_made", explain your reasoning like you're talking to them:
- "Added an extra set to your compound lifts since you said the workouts felt easy"
- "Swapped barbell rows for cable rows — easier on the lower back"
- "Reduced volume on leg day since you mentioned knee discomfort"

Return ONLY valid JSON:
{
  "adaptations_made": ["Conversational explanation of each change"],
  "workouts": [
    {
      "day": "Monday",
      "focus": "Upper Body Push",
      "duration_minutes": 45,
      "isRestDay": false,
      "exercises": [
        {
          "name": "Exercise Name",
          "sets": 3,
          "reps": 12,
          "rest_seconds": 60,
          "notes": "Specific, helpful form cue"
        }
      ]
    }
  ]
}`;

    console.log("🤖 Calling OpenAI to generate adapted plan...");
    let completion;
    try {
      completion = await openai.chat.completions.create({
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
      console.log("✅ OpenAI response received");
    } catch (openaiError: any) {
      console.error("❌ OpenAI API error:", openaiError);
      return NextResponse.json(
        {
          error: "Failed to generate plan - AI service error",
          details: openaiError?.message || "Unknown OpenAI error",
        },
        { status: 500 },
      );
    }

    let newPlanData;
    try {
      const content = completion.choices[0].message.content || "";
      console.log("📝 AI response length:", content.length);
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("No JSON found in AI response");
      newPlanData = JSON.parse(jsonMatch[0]);
      console.log("✅ Parsed AI response successfully");
    } catch (parseError) {
      console.error("❌ Failed to parse AI response:", parseError);
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

    // Create new adapted plan with plan_start_date for day alignment
    const planStartDate = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
    const { data: newPlan, error: newPlanError } = await supabase
      .from("workout_plans")
      .insert({
        user_id: userId,
        exercises: { workouts: newPlanData.workouts },
        is_active: true,
        week_number: (currentPlan.week_number || 1) + 1,
        adaptations: newPlanData.adaptations_made,
        based_on_checkin: newCheckin.id,
        plan_start_date: planStartDate,
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
    console.error("Error details:", JSON.stringify(error, null, 2));
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

// GET endpoint to retrieve check-in history
export async function GET(request: Request) {
  try {
    // Authenticate user via session
    const auth = await getAuthenticatedClient();
    if (!auth) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    const { supabase, user } = auth;

    const { data, error } = await supabase
      .from("weekly_checkins")
      .select("*")
      .eq("user_id", user.id)
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
