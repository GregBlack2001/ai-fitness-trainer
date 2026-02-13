import OpenAI from "openai";
import { NextResponse } from "next/server";
import { getAuthenticatedClient } from "@/lib/supabase/server";
import {
  checkRateLimit,
  getClientIp,
  rateLimitResponse,
} from "@/lib/rate-limit";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

export async function POST(request: Request) {
  try {
    // Rate limiting
    const clientIp = getClientIp(request);
    const rateLimitResult = checkRateLimit(clientIp, "api:workout");

    if (!rateLimitResult.success) {
      return rateLimitResponse(rateLimitResult);
    }

    const { feedback } = await request.json();

    // Authenticate user via session
    const auth = await getAuthenticatedClient();
    if (!auth) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    const { supabase, user } = auth;
    const userId = user.id;

    console.log("=== GENERATING NEXT WEEK ===");
    console.log("User ID:", userId);
    console.log("Feedback:", feedback);

    // Get user profile (RLS enforces user_id = auth.uid())
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    // Get current active plan
    const { data: currentPlan } = await supabase
      .from("workout_plans")
      .select("*")
      .eq("user_id", userId)
      .eq("is_active", true)
      .single();

    if (!currentPlan) {
      return NextResponse.json(
        { error: "No active workout plan found" },
        { status: 404 },
      );
    }

    // Get workout logs for current plan
    const { data: workoutLogs } = await supabase
      .from("workout_logs")
      .select("*")
      .eq("user_id", userId)
      .eq("plan_id", currentPlan.id)
      .order("completed_at", { ascending: true });

    // Count only actual workout days (exclude rest days)
    const allWorkouts = currentPlan.exercises?.workouts || [];
    const workoutDays = allWorkouts.filter(
      (w: any) => !w.isRestDay && w.exercises?.length > 0,
    );
    const totalWorkouts = workoutDays.length;
    const completedWorkouts = workoutLogs?.length || 0;

    // Check if week is complete
    if (completedWorkouts < totalWorkouts) {
      return NextResponse.json(
        {
          error: "Week not complete",
          message: `Complete all ${totalWorkouts} workouts first. You've done ${completedWorkouts}.`,
          completedWorkouts,
          totalWorkouts,
        },
        { status: 400 },
      );
    }

    // Calculate performance stats
    const avgCompletion =
      workoutLogs?.reduce((sum, log) => sum + log.completion_percentage, 0) /
        completedWorkouts || 0;
    const totalMinutes =
      workoutLogs?.reduce(
        (sum, log) => sum + Math.round(log.duration_seconds / 60),
        0,
      ) || 0;

    // Analyze performance to determine progression
    let progressionLevel = "maintain"; // maintain, increase, decrease
    if (avgCompletion >= 95) {
      progressionLevel = "increase";
    } else if (avgCompletion < 70) {
      progressionLevel = "decrease";
    }

    // Adjust based on feedback
    if (feedback) {
      const lowerFeedback = feedback.toLowerCase();
      if (
        lowerFeedback.includes("too easy") ||
        lowerFeedback.includes("more challenging") ||
        lowerFeedback.includes("increase")
      ) {
        progressionLevel = "increase";
      } else if (
        lowerFeedback.includes("too hard") ||
        lowerFeedback.includes("easier") ||
        lowerFeedback.includes("decrease") ||
        lowerFeedback.includes("struggling")
      ) {
        progressionLevel = "decrease";
      }
    }

    const nextWeekNumber = (currentPlan.week_number || 1) + 1;

    // Generate new workout plan
    const prompt = `Generate Week ${nextWeekNumber} workout plan for this user:

PROFILE:
- Fitness Level: ${profile.fitness_level}
- Goal: ${profile.fitness_goal}
- Available Days: ${profile.available_days?.join(", ") || "Monday, Wednesday, Friday"}
- Equipment: ${profile.equipment_access?.description || "Full gym"}
- Injuries: ${profile.injuries?.length > 0 ? profile.injuries.join(", ") : "None"}

LAST WEEK PERFORMANCE (Week ${currentPlan.week_number}):
- Workouts Completed: ${completedWorkouts}/${totalWorkouts}
- Average Completion: ${Math.round(avgCompletion)}%
- Total Time: ${totalMinutes} minutes
- Progression Level: ${progressionLevel.toUpperCase()}

${feedback ? `USER FEEDBACK: "${feedback}"` : ""}

LAST WEEK'S WORKOUTS (for reference):
${currentPlan.exercises?.workouts
  ?.map(
    (w: any) => `
${w.day} - ${w.focus}:
${w.exercises?.map((e: any) => `  - ${e.name}: ${e.sets}x${e.reps || e.duration_seconds + "s"}`).join("\n")}
`,
  )
  .join("\n")}

PROGRESSION GUIDELINES:
${
  progressionLevel === "increase"
    ? `
- Add 1 set OR 2 reps to main compound exercises
- Consider adding 1 new exercise per workout
- Can reduce rest periods by 10-15 seconds
- Introduce more challenging variations
`
    : progressionLevel === "decrease"
      ? `
- Reduce sets by 1 OR reps by 2-3
- Remove the most difficult exercise from each day
- Increase rest periods by 15-30 seconds
- Use easier exercise variations
`
      : `
- Keep similar volume with slight variations
- Swap 1-2 exercises for variety
- Maintain rest periods
- Focus on progressive overload cues in notes
`
}

REQUIREMENTS:
1. Create workouts for EXACTLY these days: ${profile.available_days?.join(", ") || "Monday, Wednesday, Friday"}
2. Each workout should be ${profile.fitness_level === "beginner" ? "30-40" : profile.fitness_level === "advanced" ? "50-70" : "40-55"} minutes
3. Include warmup (5 min) at the start of each workout
4. Apply the ${progressionLevel.toUpperCase()} progression
5. Keep exercises appropriate for: ${profile.injuries?.length > 0 ? "working around " + profile.injuries.join(", ") : "no injury limitations"}
6. Include rest_seconds for each exercise
7. Add helpful form notes

Return a JSON object with this exact structure:
{
  "workouts": [
    {
      "day": "Monday",
      "focus": "Upper Body Strength",
      "duration_minutes": 45,
      "exercises": [
        {
          "name": "Dynamic Warmup",
          "sets": 1,
          "duration_seconds": 300,
          "rest_seconds": 0,
          "notes": "Arm circles, shoulder rolls, light cardio"
        },
        {
          "name": "Bench Press",
          "sets": 4,
          "reps": 8,
          "rest_seconds": 90,
          "notes": "Control the descent, drive through chest"
        }
      ]
    }
  ],
  "weekly_notes": "Brief note about this week's focus and progression",
  "progression_applied": "${progressionLevel}"
}

Return valid JSON only.`;

    console.log(
      "🏋️ Generating Week",
      nextWeekNumber,
      "with",
      progressionLevel,
      "progression",
    );

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content:
            "You are an expert fitness coach creating progressive workout plans. Always return valid JSON.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.7,
      response_format: { type: "json_object" },
    });

    const planText = response.choices[0].message.content;

    if (!planText) {
      return NextResponse.json(
        { error: "Failed to generate plan" },
        { status: 500 },
      );
    }

    let newPlanData;
    try {
      newPlanData = JSON.parse(planText);
    } catch (e) {
      console.error("Failed to parse plan JSON:", e);
      return NextResponse.json(
        { error: "Invalid plan format" },
        { status: 500 },
      );
    }

    console.log(
      "✅ New plan generated with",
      newPlanData.workouts?.length,
      "workouts",
    );

    // IMPORTANT: Deactivate ALL existing active plans for this user FIRST
    // Use a direct update without any conditions that might fail silently
    const { data: existingPlans } = await supabase
      .from("workout_plans")
      .select("id")
      .eq("user_id", userId)
      .eq("is_active", true);

    console.log(
      "Found active plans to deactivate:",
      existingPlans?.length || 0,
    );

    if (existingPlans && existingPlans.length > 0) {
      for (const plan of existingPlans) {
        const { error: deactivateError } = await supabase
          .from("workout_plans")
          .update({ is_active: false })
          .eq("id", plan.id);

        if (deactivateError) {
          console.error(
            "Failed to deactivate plan",
            plan.id,
            ":",
            deactivateError,
          );
        } else {
          console.log("✅ Deactivated plan:", plan.id);
        }
      }
    }

    // Verify deactivation worked
    const { data: stillActive } = await supabase
      .from("workout_plans")
      .select("id")
      .eq("user_id", userId)
      .eq("is_active", true);

    if (stillActive && stillActive.length > 0) {
      console.error(
        "❌ Still have active plans after deactivation:",
        stillActive,
      );
      // Force deactivate again
      await supabase
        .from("workout_plans")
        .update({ is_active: false })
        .eq("user_id", userId);
    }

    console.log("✅ All old plans deactivated, creating new plan...");

    // Create new plan
    let savedPlan = null;
    let saveError = null;

    const { data: newPlan, error: insertError } = await supabase
      .from("workout_plans")
      .insert({
        user_id: userId,
        week_number: nextWeekNumber,
        exercises: newPlanData,
        is_active: true,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    savedPlan = newPlan;
    saveError = insertError;

    if (saveError) {
      console.error("Failed to save plan:", saveError);
      return NextResponse.json(
        { error: "Failed to save new plan" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      weekNumber: nextWeekNumber,
      progressionApplied: progressionLevel,
      plan: newPlanData,
      planId: savedPlan.id,
      previousWeekStats: {
        completedWorkouts,
        totalWorkouts,
        avgCompletion: Math.round(avgCompletion),
        totalMinutes,
      },
    });
  } catch (error) {
    console.error("❌ Next week generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate next week" },
      { status: 500 },
    );
  }
}

// GET endpoint to check if week is complete and eligible for next week
export async function GET(request: Request) {
  try {
    // Authenticate user via session
    const auth = await getAuthenticatedClient();
    if (!auth) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    const { supabase, user } = auth;
    const userId = user.id;

    // Get current plan
    const { data: currentPlan } = await supabase
      .from("workout_plans")
      .select("*")
      .eq("user_id", userId)
      .eq("is_active", true)
      .single();

    if (!currentPlan) {
      return NextResponse.json({
        eligible: false,
        reason: "No active workout plan",
      });
    }

    // Get workout logs for this plan
    const { data: workoutLogs } = await supabase
      .from("workout_logs")
      .select("*")
      .eq("user_id", userId)
      .eq("plan_id", currentPlan.id);

    const totalWorkouts = currentPlan.exercises?.workouts?.length || 0;
    const completedWorkouts = workoutLogs?.length || 0;
    const weekComplete = completedWorkouts >= totalWorkouts;

    // Calculate stats
    const avgCompletion = workoutLogs?.length
      ? workoutLogs.reduce(
          (sum: number, log: any) => sum + log.completion_percentage,
          0,
        ) / workoutLogs.length
      : 0;

    return NextResponse.json({
      eligible: weekComplete,
      weekNumber: currentPlan.week_number,
      completedWorkouts,
      totalWorkouts,
      avgCompletion: Math.round(avgCompletion),
      reason: weekComplete
        ? "Ready for next week!"
        : `Complete ${totalWorkouts - completedWorkouts} more workout(s)`,
    });
  } catch (error) {
    console.error("❌ Check eligibility error:", error);
    return NextResponse.json(
      { error: "Failed to check eligibility" },
      { status: 500 },
    );
  }
}
