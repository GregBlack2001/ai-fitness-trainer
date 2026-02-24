import OpenAI from "openai";
import { NextResponse } from "next/server";
import { getAuthenticatedClient } from "@/lib/supabase/server";
import { validateProfileData, validateWorkoutPlan } from "@/lib/validation";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

const SYSTEM_PROMPT = `You're a friendly fitness coach getting to know a new client. Chat naturally — like meeting someone at the gym for the first time.

THE USER'S NAME IS ALREADY KNOWN — don't ask for it.

## YOUR VIBE
- Warm and welcoming, but not fake
- Quick and efficient — respect their time
- Genuinely curious about their goals
- React naturally to what they share ("Oh nice!", "That's a solid goal", "I can work with that")

## RULES
- Keep responses to 1-2 sentences
- ONE question at a time
- No lists, no bullet points, no markdown headers
- No previewing their plan — just collect info for now
- Call update_profile immediately when they give you data

## GOOD EXAMPLES
- "Sweet! How old are you?"
- "Awesome goal. What would you say your fitness level is right now — beginner, intermediate, or more advanced?"
- "Got it. Any injuries I should know about, or are you good to go?"
- "Last thing — any foods you absolutely hate? I'll make sure they don't show up in your meal plan."

## BAD EXAMPLES (don't do these)
- "Great! Here's what I'm thinking for your plan: Day 1 will be..." ❌
- "### Your Profile\n- Age: 25\n- Goal: Build muscle..." ❌
- "What is your name?" ❌

## INFO TO COLLECT (in this order, skip name)
1. age
2. gender  
3. height_cm
4. weight_kg
5. fitness_goal (lose weight, build muscle, get stronger, etc.)
6. fitness_level (beginner, intermediate, advanced)
7. activity_level (sedentary, light, moderate, active, very_active)
8. preferred_workout_days — "Which days work best for you to train?"
9. equipment_access (full gym, home setup, just bodyweight, etc.)
10. injuries (anything to work around)
11. dietary_restrictions (veg, vegan, gluten-free, etc.)
12. food_allergies
13. disliked_foods
14. meals_per_day (how many meals they like to eat)

Once you have everything, call complete_onboarding.`;

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
    const { messages } = await request.json();

    // Authenticate user via session
    const auth = await getAuthenticatedClient();
    if (!auth) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    const { supabase, user } = auth;
    const userId = user.id;

    console.log("=== ONBOARDING CHAT REQUEST ===");
    console.log("User ID:", userId);
    console.log("Message count:", messages.length);

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
      model: "gpt-4.1",
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

          // Import exercise database helper
          const { generateExerciseContext } = await import("@/lib/exercises");

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

          // Get equipment list
          const equipmentDesc =
            profile.equipment_access?.description ||
            profile.equipment_access ||
            "full gym";
          const equipmentList = equipmentDesc.toLowerCase().includes("home")
            ? ["dumbbells", "resistance_bands", "none"]
            : equipmentDesc.toLowerCase().includes("none") ||
                equipmentDesc.toLowerCase().includes("bodyweight")
              ? ["none"]
              : [
                  "dumbbells",
                  "barbell",
                  "cables",
                  "machine",
                  "bench",
                  "pull_up_bar",
                ];

          // Generate exercise context based on user profile
          const exerciseContext = generateExerciseContext(
            equipmentList,
            profile.injuries || [],
            profile.fitness_level || "intermediate",
            profile.fitness_goal || "general fitness",
          );

          // Determine training parameters based on goal
          const goalLower = (profile.fitness_goal || "").toLowerCase();
          let repGuidance = "8-12 reps for hypertrophy";
          let restGuidance = "60-90 seconds";
          let setsGuidance = "3-4 sets";

          if (
            goalLower.includes("strength") ||
            goalLower.includes("strong") ||
            goalLower.includes("power")
          ) {
            repGuidance = "3-6 reps for strength";
            restGuidance = "2-3 minutes";
            setsGuidance = "4-5 sets";
          } else if (
            goalLower.includes("endurance") ||
            goalLower.includes("tone") ||
            goalLower.includes("lean") ||
            goalLower.includes("weight loss")
          ) {
            repGuidance = "12-20 reps for endurance/toning";
            restGuidance = "30-60 seconds";
            setsGuidance = "3 sets";
          } else if (
            goalLower.includes("muscle") ||
            goalLower.includes("mass") ||
            goalLower.includes("bulk") ||
            goalLower.includes("hypertrophy")
          ) {
            repGuidance = "8-12 reps for muscle growth";
            restGuidance = "60-90 seconds";
            setsGuidance = "3-4 sets";
          }

          const planPrompt = `Create a scientifically-structured Week 1 workout plan.

USER PROFILE:
- Age: ${profile.age}
- Gender: ${profile.gender}
- Goal: ${profile.fitness_goal}
- Fitness Level: ${profile.fitness_level}
- Preferred Workout Days: ${preferredDays.join(", ")}
- Rest Days: ${restDays.join(", ")}
- Equipment Available: ${equipmentDesc}
- Injuries/Limitations: ${profile.injuries?.length > 0 ? profile.injuries.join(", ") : "None"}

TRAINING PARAMETERS FOR THIS GOAL:
- Rep Range: ${repGuidance}
- Rest Between Sets: ${restGuidance}
- Sets Per Exercise: ${setsGuidance}

${exerciseContext}

## PROGRAMMING PRINCIPLES (follow these for quality workouts)

**Exercise Selection:**
- Start each workout with 1-2 compound movements (squats, deadlifts, bench, rows, overhead press)
- Follow with 2-3 accessory/isolation exercises
- End with core or conditioning work if time allows
- Choose exercises that match their equipment and ability level

**Smart Programming:**
- Balance push/pull movements across the week
- Don't train the same muscle group on consecutive days
- ${profile.fitness_level === "beginner" ? "Keep it simple: 4-5 exercises, focus on learning movement patterns" : profile.fitness_level === "advanced" ? "Include intensity techniques: supersets, drop sets where appropriate" : "Build a solid foundation with proper progression"}
- Include mobility work in warmups, not just cardio

**Form Cues (make these specific and helpful):**
- Instead of "keep back straight" → "squeeze your lats and brace your core"
- Instead of "full range of motion" → "go until your thighs are parallel, then drive through your heels"
- Give 1-2 actionable cues per exercise

**Workout Structure:**
- Warmup: 5 min (dynamic stretches or light cardio targeting muscles used)
- Main lifts: Compound exercises, longer rest periods
- Accessories: Isolation work, shorter rest
- Total time: ${profile.fitness_level === "beginner" ? "30-40" : profile.fitness_level === "advanced" ? "50-70" : "40-55"} minutes

SPLIT STRUCTURE for ${preferredDays.length} workout days:
${
  preferredDays.length <= 3
    ? "Full Body each session — hit all major muscle groups"
    : preferredDays.length === 4
      ? "Upper/Lower split — 2 upper days, 2 lower days"
      : preferredDays.length >= 5
        ? "Push/Pull/Legs or Bro Split — dedicated focus areas"
        : ""
}

Return a JSON object with ALL 7 days:
{
  "workouts": [
    {
      "day": "Monday",
      "focus": "Upper Body Push",
      "isRestDay": false,
      "duration_minutes": 45,
      "exercises": [
        {
          "name": "Exercise Name",
          "sets": 3,
          "reps": 10,
          "rest_seconds": 90,
          "notes": "Specific form cue that actually helps"
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

Return valid JSON only with all 7 days. Create workouts that someone would actually enjoy doing.`;

          const planResponse = await openai.chat.completions.create({
            model: "gpt-4.1",
            messages: [
              {
                role: "system",
                content:
                  "You are an experienced personal trainer who creates effective, enjoyable workout programs. You understand progressive overload, proper exercise selection, and how to match workouts to individual goals. Return only valid JSON.",
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
        model: "gpt-4.1",
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
