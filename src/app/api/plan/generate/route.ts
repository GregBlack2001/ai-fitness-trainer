import OpenAI from "openai";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

export async function POST(request: Request) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: "User ID required" }, { status: 401 });
    }

    console.log("=== GENERATING WORKOUT PLAN ===");
    console.log("User ID:", userId);

    // Create Supabase admin client
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Fetch user profile
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (profileError || !profile) {
      console.error("Profile fetch error:", profileError);
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    console.log("📋 Profile loaded:", {
      name: profile.full_name,
      goal: profile.fitness_goal,
      level: profile.fitness_level,
      days: profile.available_days,
    });

    // Build prompt for AI
    const prompt = `Create a personalized Week 1 workout plan for this user:

Profile:
- Name: ${profile.full_name}
- Age: ${profile.age}
- Gender: ${profile.gender}
- Height: ${profile.height_cm}cm
- Weight: ${profile.weight_kg}kg
- Fitness Goal: ${profile.fitness_goal}
- Fitness Level: ${profile.fitness_level}
- Available Training Days: ${
      profile.available_days?.join(", ") || "Not specified"
    }
- Equipment Access: ${
      profile.equipment_access?.description || "Basic equipment"
    }
- Injuries/Limitations: ${
      profile.injuries?.length > 0 ? profile.injuries.join(", ") : "None"
    }

Instructions:
1. Create a workout plan ONLY for the days they're available
2. Match exercises to their equipment access
3. Avoid exercises that could aggravate their injuries
4. Match intensity to their fitness level
5. Align exercises with their fitness goal
6. Include proper warm-up exercises
7. Provide specific sets, reps, and rest periods
8. Add coaching notes for each workout

Return a JSON object with this EXACT structure:
{
  "week_number": 1,
  "overview": "Brief description of this week's focus",
  "workouts": [
    {
      "day": "Monday",
      "focus": "Upper Body Strength",
      "duration_minutes": 45,
      "exercises": [
        {
          "name": "Bench Press",
          "sets": 3,
          "reps": 10,
          "rest_seconds": 90,
          "notes": "Focus on controlled movement, don't lock out elbows"
        }
      ],
      "notes": "Remember to warm up for 5-10 minutes before starting"
    }
  ]
}

IMPORTANT: Only create workouts for the days they specified. Return valid JSON only, no markdown formatting.`;

    console.log("🤖 Calling OpenAI to generate plan...");

    // Call OpenAI to generate the plan
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content:
            "You are an expert fitness coach creating personalized workout plans. Always return valid JSON.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.7,
      response_format: { type: "json_object" }, // Force JSON response
    });

    const planText = response.choices[0].message.content;
    console.log("📄 Raw AI response:", planText);

    if (!planText) {
      return NextResponse.json(
        { error: "Failed to generate plan" },
        { status: 500 }
      );
    }

    // Parse the AI's JSON response
    let planData;
    try {
      planData = JSON.parse(planText);
    } catch (parseError) {
      console.error("❌ Failed to parse AI response as JSON:", parseError);
      return NextResponse.json(
        { error: "Invalid plan format" },
        { status: 500 }
      );
    }

    console.log("✅ Plan generated:", planData);

    // Save to workout_plans table
    const { data: savedPlan, error: saveError } = await supabaseAdmin
      .from("workout_plans")
      .insert([
        {
          user_id: userId,
          week_number: 1,
          exercises: planData, // Store the entire plan as JSON
          is_active: true,
          created_at: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (saveError) {
      console.error("❌ Failed to save plan:", saveError);
      return NextResponse.json(
        { error: "Failed to save plan" },
        { status: 500 }
      );
    }

    console.log("💾 Plan saved to database:", savedPlan.id);

    return NextResponse.json({
      success: true,
      plan: savedPlan,
    });
  } catch (error) {
    console.error("❌ Plan generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate workout plan" },
      { status: 500 }
    );
  }
}
