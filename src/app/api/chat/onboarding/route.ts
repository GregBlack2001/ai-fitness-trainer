import OpenAI from "openai";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

const SYSTEM_PROMPT = `You are an AI fitness and nutrition coach. Your ONLY job is to:
1. Ask the user for information
2. Call update_profile with ANY data they provide
3. Ask the next question

YOU MUST call update_profile every single time the user gives you information.

Example:
User: "I weigh 75kg"
You: Call update_profile(weight_kg=75) AND say "Got it! What's your fitness goal?"

Required data to collect (in this order):
1. full_name (string)
2. age (number)
3. gender (string)  
4. height_cm (number - height in centimeters)
5. weight_kg (number - weight in kilograms)
6. fitness_goal (string - e.g., "lose weight", "build muscle", "maintain")
7. fitness_level (string - must be "beginner", "intermediate", or "advanced")
8. activity_level (string - must be "sedentary", "light", "moderate", "active", or "very_active". Explain: sedentary=desk job little exercise, light=light exercise 1-3 days/week, moderate=moderate exercise 3-5 days/week, active=hard exercise 6-7 days/week, very_active=very hard exercise & physical job)
9. available_days (array of day names for workouts - e.g., ["Monday", "Wednesday", "Friday"])
10. equipment_access (string - description of available equipment)
11. injuries (array of strings - list any injuries, or empty array if none)
12. dietary_restrictions (array of strings - e.g., ["vegetarian", "vegan", "gluten-free", "dairy-free", "halal", "kosher", "none"])
13. food_allergies (array of strings - e.g., ["peanuts", "shellfish", "eggs"] or empty array if none)
14. disliked_foods (array of strings - foods they don't like to eat, or empty array)
15. meals_per_day (number - how many meals they prefer eating, typically 3-6)

Be conversational and friendly. After collecting ALL the data above, call complete_onboarding.`;

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
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get the last user message
    const lastMessage = messages[messages.length - 1]?.content || "";

    // Detect if user likely provided data
    const seemsLikeData =
      /\d+|kg|cm|lb|feet|foot|tall|weigh|male|female|man|woman|beginner|intermediate|advanced|sedentary|active|monday|tuesday|wednesday|thursday|friday|saturday|sunday|gym|dumbbell|barbell|equipment|injury|injure|vegetarian|vegan|gluten|dairy|allergy|allergic|halal|kosher|meals|breakfast|lunch|dinner/i.test(
        lastMessage
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
            toolCall.function.arguments
          );
          continue;
        }

        console.log(`✅ ${functionName}:`, functionArgs);

        if (functionName === "update_profile") {
          let equipmentData = functionArgs.equipment_access;
          if (typeof equipmentData === "string") {
            equipmentData = { description: equipmentData };
          }

          const updates: Record<string, any> = {
            updated_at: new Date().toISOString(),
          };

          if (functionArgs.full_name)
            updates.full_name = functionArgs.full_name;
          if (functionArgs.age) updates.age = functionArgs.age;
          if (functionArgs.gender) updates.gender = functionArgs.gender;
          if (functionArgs.height_cm)
            updates.height_cm = functionArgs.height_cm;
          if (functionArgs.weight_kg)
            updates.weight_kg = functionArgs.weight_kg;
          if (functionArgs.fitness_goal)
            updates.fitness_goal = functionArgs.fitness_goal;
          if (functionArgs.fitness_level)
            updates.fitness_level = functionArgs.fitness_level;
          if (functionArgs.activity_level)
            updates.activity_level = functionArgs.activity_level;
          if (functionArgs.available_days)
            updates.available_days = functionArgs.available_days;
          if (equipmentData) updates.equipment_access = equipmentData;
          if (functionArgs.injuries) updates.injuries = functionArgs.injuries;
          if (functionArgs.dietary_restrictions)
            updates.dietary_restrictions = functionArgs.dietary_restrictions;
          if (functionArgs.food_allergies)
            updates.food_allergies = functionArgs.food_allergies;
          if (functionArgs.disliked_foods)
            updates.disliked_foods = functionArgs.disliked_foods;
          if (functionArgs.meals_per_day)
            updates.meals_per_day = functionArgs.meals_per_day;

          console.log("📝 Updating profile with:", updates);

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
          const planPrompt = `Create a week 1 workout plan for:
- Name: ${profile.full_name}
- Age: ${profile.age}
- Gender: ${profile.gender}
- Goal: ${profile.fitness_goal}
- Fitness Level: ${profile.fitness_level}
- Available Days: ${
            profile.available_days?.join(", ") || "Monday, Wednesday, Friday"
          }
- Equipment: ${profile.equipment_access?.description || "Full gym"}
- Injuries to work around: ${
            profile.injuries?.length > 0 ? profile.injuries.join(", ") : "None"
          }

Create ${
            profile.available_days?.length || 3
          } workout days. Each workout should be ${
            profile.fitness_level === "beginner"
              ? "30-40"
              : profile.fitness_level === "advanced"
              ? "50-70"
              : "40-55"
          } minutes.

Return a JSON object:
{
  "workouts": [
    {
      "day": "Monday",
      "focus": "Upper Body",
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
    }
  ]
}

Include warmup at the start of each workout. Return valid JSON only.`;

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
              planResponse.choices[0].message.content || "{}"
            );
          } catch (e) {
            console.error("Failed to parse workout plan");
            return NextResponse.json({
              message: "Error creating your workout plan. Please try again.",
              completed: false,
            });
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

          console.log("✅ Workout plan created!");

          return NextResponse.json({
            message: `🎉 Your personalized plan is ready!

I've created a ${
              profile.available_days?.length || 3
            }-day workout plan tailored to your ${profile.fitness_goal} goal.

Your plan includes:
${
  workoutPlan.workouts
    ?.map((w: any) => `• **${w.day}**: ${w.focus} (${w.duration_minutes} min)`)
    .join("\n") || "Custom workouts for your schedule"
}

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
        "AI called function but no message. Making follow-up call..."
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
      { status: 500 }
    );
  }
}
