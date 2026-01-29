import OpenAI from "openai";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { validateProfileData, validateWorkoutPlan } from "@/lib/validation";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

const SYSTEM_PROMPT = `You are an AI fitness coach collecting user information. Be BRIEF and conversational.

IMPORTANT: The user's name is already known - DO NOT ask for their name.

RULES:
- Keep responses SHORT (1-2 sentences max)
- Ask ONE question at a time
- NO bullet points or lists in responses
- NO previews of workout/meal plans
- NO markdown headers (###)
- Just ask the next question directly
- Call update_profile immediately when user provides data
- NEVER ask for the user's name - it's already collected

Example good responses:
- "Got it! How old are you?"
- "Nice! And what's your main fitness goal?"
- "Perfect! Which days do you prefer to work out?"

Example BAD responses (too long):
- "Great choice! Here's what your plan might look like: Day 1: Upper Body, Day 2: Lower Body..." ❌
- "### Your Goals\nI'll create a personalized plan with..." ❌

Data to collect (in order - DO NOT ask for name):
1. age
2. gender
3. height_cm
4. weight_kg
5. fitness_goal (lose weight, build muscle, maintain, etc.)
6. fitness_level (beginner, intermediate, advanced)
7. activity_level (sedentary, light, moderate, active, very_active)
8. preferred_workout_days - Ask "Which days do you PREFER to work out?" (the plan will show all 7 days with rest days, but workouts will be on their preferred days)
9. equipment_access (gym, home equipment, etc.)
10. injuries (any injuries to work around)
11. dietary_restrictions (vegetarian, vegan, gluten-free, etc.)
12. food_allergies
13. disliked_foods
14. meals_per_day (how many meals they prefer)

After ALL data collected, call complete_onboarding.`;

const tools: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "update_profile",
      description:
        "Update user profile with any extracted information. Call immediately when you get ANY data.",
      parameters: {
        type: "object",
        properties: {
          full_name: { type: "string" },
          age: { type: "number" },
          gender: { type: "string" },
          height_cm: { type: "number" },
          weight_kg: { type: "number" },
          fitness_goal: { type: "string" },
          fitness_level: {
            type: "string",
            enum: ["beginner", "intermediate", "advanced"],
          },
          activity_level: {
            type: "string",
            enum: ["sedentary", "light", "moderate", "active", "very_active"],
          },
          available_days: { type: "array", items: { type: "string" } },
          equipment_access: { type: "string" },
          injuries: { type: "array", items: { type: "string" } },
          dietary_restrictions: { type: "array", items: { type: "string" } },
          food_allergies: { type: "array", items: { type: "string" } },
          disliked_foods: { type: "array", items: { type: "string" } },
          meals_per_day: { type: "number" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "complete_onboarding",
      description:
        "Call when ALL information is collected including nutrition preferences",
      parameters: {
        type: "object",
        properties: { ready: { type: "boolean" } },
        required: ["ready"],
      },
    },
  },
];

export async function POST(request: Request) {
  try {
    const { messages, userId } = await request.json();

    console.log("=== ONBOARDING CHAT REQUEST ===");
    console.log("User ID:", userId);
    console.log("Message count:", messages.length);

    if (!userId) {
      return NextResponse.json({ error: "User ID required" }, { status: 401 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    // Get the last user message
    const lastMessage = messages[messages.length - 1]?.content || "";

    // Detect if user likely provided data
    const seemsLikeData =
      /\d+|kg|cm|lb|feet|foot|tall|weigh|male|female|man|woman|beginner|intermediate|advanced|sedentary|active|monday|tuesday|wednesday|thursday|friday|saturday|sunday|gym|dumbbell|barbell|equipment|injury|injure|vegetarian|vegan|gluten|dairy|allergy|allergic|halal|kosher|meals|breakfast|lunch|dinner/i.test(
        lastMessage,
      );

    console.log("Last message:", lastMessage);
    console.log("Seems like data?", seemsLikeData);

    let toolChoice: any = "auto";
    if (seemsLikeData && messages.length > 1) {
      toolChoice = { type: "function", function: { name: "update_profile" } };
      console.log("🔧 Forcing update_profile function call");
    }

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "system", content: SYSTEM_PROMPT }, ...messages],
      tools,
      tool_choice: toolChoice,
      temperature: 0.7,
    });

    const assistantMessage = response.choices[0].message;
    const toolCalls = assistantMessage.tool_calls;

    console.log("Tool calls:", toolCalls ? toolCalls.length : 0);

    if (toolCalls?.length) {
      for (const toolCall of toolCalls) {
        if (toolCall.type !== "function") continue;

        const functionName = toolCall.function.name;
        let functionArgs: any = {};

        try {
          functionArgs = JSON.parse(toolCall.function.arguments);
        } catch (parseError) {
          console.warn(
            "Failed to parse function arguments:",
            toolCall.function.arguments,
          );
          continue;
        }

        console.log(`✅ ${functionName}:`, functionArgs);

        if (functionName === "update_profile") {
          let equipmentData = functionArgs.equipment_access;
          if (typeof equipmentData === "string") {
            equipmentData = { description: equipmentData };
          }

          // Validate and sanitize the profile data
          const { sanitized, errors } = validateProfileData({
            ...functionArgs,
            equipment_access: equipmentData,
          });

          if (errors.length > 0) {
            console.warn("⚠️ Validation warnings:", errors);
          }

          const updates: Record<string, any> = {
            updated_at: new Date().toISOString(),
            ...sanitized,
          };

          // Remove undefined values
          Object.keys(updates).forEach((key) => {
            if (updates[key] === undefined) delete updates[key];
          });

          console.log("📝 Updating profile with validated data:", updates);

          const { data, error } = await supabase
            .from("profiles")
            .update(updates)
            .eq("id", userId)
            .select();

          if (error) {
            console.error("❌ Supabase error:", error);
          } else {
            console.log("✅ Update successful");
          }
        }

        if (functionName === "complete_onboarding") {
          console.log("🎉 Onboarding complete! Generating workout plan...");

          // Fetch complete profile
          const { data: profile } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", userId)
            .single();

          if (!profile) {
            return NextResponse.json({
              message: "Error: Could not load your profile. Please try again.",
              completed: false,
            });
          }

          // Generate workout plan
          const preferredDays = profile.available_days || [
            "Monday",
            "Wednesday",
            "Friday",
          ];
          const allDays = [
            "Monday",
            "Tuesday",
            "Wednesday",
            "Thursday",
            "Friday",
            "Saturday",
            "Sunday",
          ];
          const restDays = allDays.filter((d) => !preferredDays.includes(d));

          const planPrompt = `Create a week 1 workout plan for:
- Age: ${profile.age}
- Gender: ${profile.gender}
- Goal: ${profile.fitness_goal}
- Fitness Level: ${profile.fitness_level}
- Preferred Workout Days: ${preferredDays.join(", ")}
- Rest Days: ${restDays.join(", ")}
- Equipment: ${profile.equipment_access?.description || profile.equipment_access || "Full gym"}
- Injuries to work around: ${profile.injuries?.length > 0 ? profile.injuries.join(", ") : "None"}

IMPORTANT: Create ALL 7 days of the week. 
- Workout days (${preferredDays.join(", ")}): Full workouts with exercises
- Rest days (${restDays.join(", ")}): Mark as rest/recovery days

Each workout should be ${profile.fitness_level === "beginner" ? "30-40" : profile.fitness_level === "advanced" ? "50-70" : "40-55"} minutes.

Return a JSON object with ALL 7 days:
{
  "workouts": [
    {
      "day": "Monday",
      "focus": "Upper Body",
      "isRestDay": false,
      "duration_minutes": 45,
      "exercises": [
        {
          "name": "Bench Press",
          "sets": 3,
          "reps": 10,
          "rest_seconds": 90,
          "notes": "Keep core tight"
        }
      ]
    },
    {
      "day": "Tuesday",
      "focus": "Rest & Recovery",
      "isRestDay": true,
      "duration_minutes": 0,
      "exercises": []
    }
  ]
}

Include warmup at the start of each workout day (not rest days). Return valid JSON only with all 7 days.`;

          const planResponse = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
              {
                role: "system",
                content: "You are a fitness expert. Return only valid JSON.",
              },
              { role: "user", content: planPrompt },
            ],
            response_format: { type: "json_object" },
            temperature: 0.7,
          });

          let workoutPlan;
          try {
            workoutPlan = JSON.parse(
              planResponse.choices[0].message.content || "{}",
            );
          } catch (e) {
            console.error("Failed to parse workout plan");
            return NextResponse.json({
              message: "Error creating your workout plan. Please try again.",
              completed: false,
            });
          }

          // Validate the workout plan
          const { valid, errors, sanitized } = validateWorkoutPlan(workoutPlan);
          if (!valid) {
            console.warn("⚠️ Workout plan validation warnings:", errors);
          }
          if (sanitized) {
            workoutPlan = sanitized;
          }

          // Save workout plan
          const { error: planError } = await supabase
            .from("workout_plans")
            .insert({
              user_id: userId,
              week_number: 1,
              exercises: workoutPlan,
              is_active: true,
              created_at: new Date().toISOString(),
            });

          if (planError) {
            console.error("Failed to save plan:", planError);
            return NextResponse.json({
              message: "Error saving your workout plan. Please try again.",
              completed: false,
            });
          }

          console.log("✅ Workout plan created and validated!");

          return NextResponse.json({
            message: `🎉 Your personalized plan is ready!

I've created a ${profile.available_days?.length || 3}-day workout plan tailored to your ${profile.fitness_goal} goal.

Your plan includes:
${workoutPlan.workouts?.map((w: any) => `• **${w.day}**: ${w.focus} (${w.duration_minutes} min)`).join("\n") || "Custom workouts for your schedule"}

Click "Go to Dashboard" to see your full plan and start training!`,
            completed: true,
            planCreated: true,
            profileUpdated: true,
          });
        }
      }
    }

    if (!assistantMessage.content && toolCalls?.length) {
      console.log(
        "AI called function but no message. Making follow-up call...",
      );

      const followUpMessages = [
        ...messages,
        {
          role: "assistant" as const,
          tool_calls: toolCalls,
        },
        ...toolCalls.map((toolCall) => ({
          role: "tool" as const,
          tool_call_id: toolCall.id,
          content: "Data saved successfully",
        })),
      ];

      const followUpResponse = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...followUpMessages,
        ],
        temperature: 0.7,
      });

      const followUpMessage = followUpResponse.choices[0].message.content;
      console.log("Follow-up response:", followUpMessage);

      return NextResponse.json({
        message: followUpMessage || "Got it! What else can you tell me?",
        completed: false,
        profileUpdated: true,
      });
    }

    return NextResponse.json({
      message: assistantMessage.content || "I'm listening, tell me more!",
      completed: false,
    });
  } catch (error) {
    console.error("❌ Onboarding error:", error);
    return NextResponse.json(
      { error: "Failed to process chat" },
      { status: 500 },
    );
  }
}
